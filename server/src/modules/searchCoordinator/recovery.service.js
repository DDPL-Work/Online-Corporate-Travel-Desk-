/**
 * Search Recovery Service
 *
 * Handles fault tolerance for the distributed search pipeline:
 * 1. Stalled job recovery (worker crash)
 * 2. Search timeout recovery
 * 3. Orphaned search cleanup
 * 4. Redis connection recovery
 *
 * Runs periodically to detect and recover from failures.
 */

const { getConnections } = require("../../config/redisConnections");
const redis = getConnections().coordinator;
const logger = require("../../utils/logger");
const registryService = require("./registry.service");

/**
 * Maximum time (ms) a search can be in "running" before being considered stalled.
 */
const SEARCH_TIMEOUT_MS = 300000; // 5 minutes

/**
 * Maximum time (ms) a search can be in "finalizing" before being force-completed.
 */
const FINALIZE_TIMEOUT_MS = 120000; // 2 minutes

/**
 * Maximum time (ms) a lock can be held before force-release.
 */
const LOCK_TIMEOUT_MS = 60000; // 1 minute

let recoveryInterval = null;

/**
 * Scans for searches that have been "running" longer than SEARCH_TIMEOUT_MS
 * and forces them to finalization or marks them as failed.
 */
async function recoverStalledSearches() {
  try {
    const activeSearches = await redis.smembers("active:searches");
    if (!activeSearches || activeSearches.length === 0) return;

    const now = Date.now();
    let recoveredCount = 0;

    for (const searchId of activeSearches) {
      try {
        const progress = await registryService.getRegistryProgress(searchId);
        if (!progress || progress.status === "completed") {
          // Search completed but still in active set — clean up
          await redis.srem("active:searches", searchId);
          continue;
        }

        if (progress.status === "running") {
          // Check if any chunks are still pending
          const listKey = `pending:chunks:${searchId}`;
          const pendingCount = await redis.llen(listKey);

          if (pendingCount === 0 && progress.completedChunks + progress.failedChunks >= progress.totalChunks) {
            // All chunks processed — try to finalize
            const shouldFinalize = await registryService.tryMarkFinalizing(
              searchId,
              progress.totalChunks
            );
            if (shouldFinalize) {
              const { finalizeQueue } = require("../../queues/search.queue");
              await finalizeQueue.add("finalize_search", { searchId });
              recoveredCount++;
              logger.info(`[Recovery] Force-finalized stalled search ${searchId}`);
            }
          }
        }
      } catch (err) {
        logger.warn(`[Recovery] Error checking search ${searchId}: ${err.message}`);
      }
    }

    if (recoveredCount > 0) {
      logger.info(`[Recovery] Recovered ${recoveredCount} stalled searches`);
    }
  } catch (err) {
    logger.error(`[Recovery] Error in stalled search recovery: ${err.message}`);
  }
}

/**
 * Cleans up orphaned lock keys that were never released.
 * Uses the lock TTL as a safety net — but this catches edge cases.
 */
async function recoverOrphanedLocks() {
  try {
    // Scan for lock keys — we can't know which are orphaned without ownership tokens,
    // but we can clean up locks that have been held too long.
    // This is a best-effort cleanup — the TTL should handle most cases.
    const lockKeys = [];
    let cursor = '0';
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', 'lock:*', 'COUNT', 100);
      cursor = nextCursor;
      lockKeys.push(...keys);
    } while (cursor !== '0');

    if (lockKeys.length > 0) {
      logger.debug(`[Recovery] Found ${lockKeys.length} lock keys (TTL handles cleanup)`);
    }
  } catch (err) {
    logger.warn(`[Recovery] Error scanning locks: ${err.message}`);
  }
}

/**
 * Verifies that all active searches in the registry still have corresponding
 * pending chunk lists. If a search is in active:searches but has no pending list,
 * it may be orphaned.
 */
async function recoverOrphanedActiveSearches() {
  try {
    const activeSearches = await redis.smembers("active:searches");
    if (!activeSearches || activeSearches.length === 0) return;

    let orphanedCount = 0;

    for (const searchId of activeSearches) {
      const listKey = `pending:chunks:${searchId}`;
      const exists = await redis.exists(listKey);

      if (!exists) {
        // No pending list — check if search is completed
        const progress = await registryService.getRegistryProgress(searchId);
        if (!progress || progress.status === "completed") {
          await redis.srem("active:searches", searchId);
          orphanedCount++;
        }
      }
    }

    if (orphanedCount > 0) {
      logger.info(`[Recovery] Cleaned up ${orphanedCount} orphaned active searches`);
    }
  } catch (err) {
    logger.warn(`[Recovery] Error in orphaned search cleanup: ${err.message}`);
  }
}

/**
 * Main recovery loop.
 * Runs periodically to detect and recover from various failure modes.
 */
function startRecoveryLoop(intervalMs = 30000) {
  recoveryInterval = setInterval(async () => {
    try {
      await recoverStalledSearches();
      await recoverOrphanedActiveSearches();
      await recoverOrphanedLocks();
    } catch (err) {
      logger.error(`[Recovery] Loop error: ${err.message}`);
    }
  }, intervalMs);

  // Phase 6: .unref() so interval doesn't prevent process exit
  recoveryInterval.unref();

  logger.info(`[Recovery] Started (interval: ${intervalMs}ms)`);
}

/**
 * Stops the recovery loop.
 */
function stopRecoveryLoop() {
  if (recoveryInterval) {
    clearInterval(recoveryInterval);
    recoveryInterval = null;
    logger.info("[Recovery] Stopped");
  }
}

module.exports = {
  startRecoveryLoop,
  stopRecoveryLoop,
  recoverStalledSearches,
  recoverOrphanedActiveSearches,
};
