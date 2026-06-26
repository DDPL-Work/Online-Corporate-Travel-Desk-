/**
 * BullMQ Queue Definitions — Dedicated Connection Architecture
 *
 * Each Queue and QueueEvents instance owns its own Redis connection.
 * Zero shared sockets. No blocking command contention.
 *
 * Shutdown order (Phase 5):
 *   1. Workers.close()     — stop processing, finish active jobs
 *   2. QueueEvents.close() — stop listening for events
 *   3. Queues.close()      — stop accepting new jobs
 *   4. Redis.quit()        — close TCP connections
 */

const { Queue, QueueEvents } = require("bullmq");
const { createBullConnection } = require("./connection");
const logger = require("../utils/logger");

const SEARCH_QUEUE_NAME = "tbo-search-chunks";
const FINALIZE_QUEUE_NAME = "tbo-search-finalize";
const CLEANUP_QUEUE_NAME = "tbo-search-cleanup";

// ─── Default Job Options ───────────────────────────────────────────────

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 1000,
  },
  removeOnComplete: {
    age: 900,
    count: 500,
  },
  removeOnFail: {
    age: 86400,
    count: 1000,
  },
};

// ─── Queues (each with dedicated Redis) ───────────────────────────────

const searchQueue = new Queue(SEARCH_QUEUE_NAME, {
  connection: createBullConnection("search-queue"),
  defaultJobOptions,
});

const finalizeQueue = new Queue(FINALIZE_QUEUE_NAME, {
  connection: createBullConnection("finalize-queue"),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { age: 900, count: 100 },
    removeOnFail: { age: 86400, count: 500 },
  },
});

const cleanupQueue = new Queue(CLEANUP_QUEUE_NAME, {
  connection: createBullConnection("cleanup-queue"),
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "fixed", delay: 5000 },
    removeOnComplete: { age: 300, count: 50 },
    removeOnFail: { age: 3600, count: 100 },
  },
});

// ─── QueueSchedulers (BullMQ v5 — built into Queue) ───────────────────

function startQueueSchedulers() {
  logger.info("[QueueScheduler] BullMQ v5 — scheduling built into Queue, no separate scheduler needed");
}

// ─── QueueEvents (each with dedicated Redis) ───────────────────────────

let searchEvents = null;

function startQueueEvents() {
  try {
    searchEvents = new QueueEvents(SEARCH_QUEUE_NAME, {
      connection: createBullConnection("search-events"),
    });

    searchEvents.on("completed", ({ jobId }) => {
      logger.debug(`[QueueEvents] Job ${jobId} completed`);
    });

    searchEvents.on("failed", ({ jobId, failedReason }) => {
      logger.warn(`[QueueEvents] Job ${jobId} failed: ${failedReason}`);
    });

    searchEvents.on("stalled", ({ jobId }) => {
      logger.warn(`[QueueEvents] Job ${jobId} stalled — will be retried`);
    });

    logger.info(`[QueueEvents] Started for ${SEARCH_QUEUE_NAME}`);
  } catch (err) {
    logger.warn(`[QueueEvents] ${SEARCH_QUEUE_NAME} error: ${err.message}`);
  }
}

// ─── Graceful Shutdown (Phase 5 order) ─────────────────────────────────

/**
 * Shutdown order:
 *   1. QueueEvents.close() — stop listening
 *   2. Queue.close()       — stop accepting
 *
 * Workers must be closed by caller BEFORE this function.
 */
async function stopQueues() {
  // Step 1: Close QueueEvents first (stop blocking listeners)
  if (searchEvents) {
    try {
      await searchEvents.close();
    } catch (e) { /* already closed */ }
    searchEvents = null;
  }

  // Step 2: Close Queues (stop accepting new jobs)
  await Promise.all([
    searchQueue.close().catch(() => {}),
    finalizeQueue.close().catch(() => {}),
    cleanupQueue.close().catch(() => {}),
  ]);

  logger.info("[Queues] All queues and events closed");
}

module.exports = {
  SEARCH_QUEUE_NAME,
  FINALIZE_QUEUE_NAME,
  CLEANUP_QUEUE_NAME,
  searchQueue,
  finalizeQueue,
  cleanupQueue,
  startQueueSchedulers,
  startQueueEvents,
  stopQueues,
};
