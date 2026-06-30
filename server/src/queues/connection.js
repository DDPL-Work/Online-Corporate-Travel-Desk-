/**
 * BullMQ Dedicated Connection Factory
 *
 * Creates NEW ioredis clients on every call. Each Queue, Worker, and QueueEvents
 * instance owns its own TCP connection. Zero sharing.
 *
 * BullMQ executes long-lived blocking commands (XREAD BLOCK, BZPOPMIN, BRPOP)
 * that MUST NOT share connections with normal commands.
 *
 * Configuration:
 *   maxRetriesPerRequest: null  (required by BullMQ)
 *   enableReadyCheck: false     (BullMQ default)
 *   lazyConnect: false          (connect immediately)
 *   connectTimeout: 10000       (10s)
 *   commandTimeout: NOT SET     (let BullMQ manage its own timeouts)
 *   reconnectOnError: NOT SET   (let BullMQ retry strategy handle it)
 */

const Redis = require("ioredis");
const logger = require("../utils/logger");

const REDIS_HOST = process.env.REDIS_HOST;
const REDIS_PORT = Number(process.env.REDIS_PORT);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

/**
 * Tracks all BullMQ Redis connections for monitoring and graceful shutdown.
 */
const bullConnections = new Set();

/**
 * Creates a dedicated ioredis connection for BullMQ.
 * Each call creates a NEW TCP connection — never shared.
 *
 * @param {string} label - Human-readable label for logging and CLIENT SETNAME
 * @returns {Redis}
 */
function createBullConnection(label = "bullmq") {
  const conn = new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD,
    maxRetriesPerRequest: null,     // REQUIRED by BullMQ
    enableReadyCheck: false,
    lazyConnect: false,
    connectTimeout: 10000,
    // No commandTimeout — let BullMQ manage blocking timeouts
    // No reconnectOnError — let BullMQ retry strategy handle it
    retryStrategy(times) {
      const delay = Math.min(times * 500, 5000);
      return delay;
    },
  });

  // ─── Metadata for monitoring ──────────────────────────────────────────
  const meta = {
    label,
    createdAt: Date.now(),
    errorCount: 0,
    reconnectCount: 0,
  };
  conn._bullMeta = meta;

  bullConnections.add(conn);

  // ─── Phase 2: CLIENT SETNAME on ready ─────────────────────────────────
  conn.on("ready", () => {
    logger.debug(`[BullMQ:${label}] Ready`);
    // Set Redis CLIENT LISTNAME for production debugging
    conn.client("SETNAME", label).catch(() => {});
  });

  // ─── Phase 4: Full event audit ────────────────────────────────────────
  conn.on("connect", () => {
    logger.debug(`[BullMQ:${label}] Connected`);
  });

  conn.on("reconnecting", (delay) => {
    meta.reconnectCount++;
    logger.warn(`[BullMQ:${label}] Reconnecting in ${delay}ms`);
  });

  conn.on("close", () => {
    logger.debug(`[BullMQ:${label}] Connection closed`);
    bullConnections.delete(conn);
  });

  conn.on("end", () => {
    logger.warn(`[BullMQ:${label}] Connection ended — no more reconnections`);
    bullConnections.delete(conn);
  });

  conn.on("error", (err) => {
    meta.errorCount++;
    // Log but do NOT crash — BullMQ handles retries internally
    logger.error(`[BullMQ:${label}] Error: ${err.message}`);
  });

  return conn;
}

/**
 * Closes all tracked BullMQ Redis connections gracefully.
 * Called during SIGTERM/SIGINT shutdown.
 * Must be called AFTER Queue.close(), QueueEvents.close(), Worker.close().
 */
async function closeBullConnections() {
  const conns = Array.from(bullConnections);
  await Promise.all(
    conns.map(async (conn) => {
      try {
        await conn.quit();
      } catch (err) {
        try { await conn.disconnect(); } catch (e) {}
      }
    })
  );
  bullConnections.clear();
  logger.info(`[BullMQ] Closed ${conns.length} Redis connections`);
}

/**
 * Returns status of all tracked BullMQ connections.
 * Includes age, uptime, error count, reconnect count for monitoring.
 */
function getBullConnectionStatus() {
  const now = Date.now();
  return Array.from(bullConnections).map((conn) => {
    const meta = conn._bullMeta || {};
    return {
      label: meta.label || "unknown",
      status: conn.status,
      host: conn.options?.host,
      port: conn.options?.port,
      createdAt: meta.createdAt || 0,
      ageMs: now - (meta.createdAt || now),
      errorCount: meta.errorCount || 0,
      reconnectCount: meta.reconnectCount || 0,
    };
  });
}

module.exports = {
  createBullConnection,
  closeBullConnections,
  getBullConnectionStatus,
};
