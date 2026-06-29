/**
 * Dedicated Redis Connection Pool — Application Only
 *
 * Architecture:
 *   5 isolated ioredis connections for application logic.
 *   BullMQ owns its own connections (see queues/connection.js).
 *
 * Connection Map:
 * ┌─────────────┬──────────────┬────────────┬────────────────────────────┐
 * │ Name        │ MaxRetries   │ Pipelining │ Purpose                    │
 * ├─────────────┼──────────────┼────────────┼────────────────────────────┤
 * │ general     │ 2            │ true       │ Payment locks, markup,     │
 * │             │              │            │ reissue, orchestration     │
 * │ coordinator │ 2            │ true       │ Search coordination,       │
 * │             │              │            │ registry, locks, cache     │
 * │ cache       │ 2            │ true       │ Application cache,         │
 * │             │              │            │ search results             │
 * │ rateLimit   │ 1            │ false      │ Rate limiter (atomic)      │
 * │ socket      │ 2            │ false      │ Socket.IO adapter          │
 * │             │              │            │ (pub/sub)                  │
 * └─────────────┴──────────────┴────────────┴────────────────────────────┘
 *
 * Shutdown: Call closeAll() on SIGTERM/SIGINT.
 * Monitoring: Call getMetrics() for Prometheus export.
 * Health: Use conn.status to check connection state.
 */

const Redis = require("ioredis");
const logger = require("../utils/logger");

const REDIS_HOST = process.env.REDIS_HOST;
const REDIS_PORT = Number(process.env.REDIS_PORT);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

/**
 * Metrics tracking per connection.
 * Exposed via getMetrics() for Prometheus/Grafana integration.
 */
const metrics = {
  general:     { connectCount: 0, reconnectCount: 0, errorCount: 0, lastError: null, lastConnectTime: null },
  coordinator: { connectCount: 0, reconnectCount: 0, errorCount: 0, lastError: null, lastConnectTime: null },
  cache:       { connectCount: 0, reconnectCount: 0, errorCount: 0, lastError: null, lastConnectTime: null },
  rateLimit:   { connectCount: 0, reconnectCount: 0, errorCount: 0, lastError: null, lastConnectTime: null },
  socket:      { connectCount: 0, reconnectCount: 0, errorCount: 0, lastError: null, lastConnectTime: null },
};

/**
 * Attaches lifecycle event listeners to a Redis connection.
 *
 * @param {Redis} conn - ioredis connection
 * @param {string} name - Connection name for logging and metrics
 */
function attachLifecycle(conn, name) {
  metrics[name] = {
    connectCount: 0,
    reconnectCount: 0,
    errorCount: 0,
    lastError: null,
    lastConnectTime: null,
  };

  conn.on("connect", () => {
    metrics[name].connectCount++;
    metrics[name].lastConnectTime = Date.now();
    logger.info(`[Redis:${name}] Connected`);
  });

  conn.on("ready", () => {
    logger.info(`[Redis:${name}] Ready`);
  });

  conn.on("reconnecting", (delay) => {
    metrics[name].reconnectCount++;
    logger.warn(`[Redis:${name}] Reconnecting in ${delay}ms`);
  });

  conn.on("close", () => {
    logger.warn(`[Redis:${name}] Connection closed`);
  });

  conn.on("end", () => {
    logger.warn(`[Redis:${name}] Connection ended — no more reconnections`);
  });

  conn.on("error", (err) => {
    metrics[name].errorCount++;
    metrics[name].lastError = { message: err.message, time: Date.now() };
    logger.error(`[Redis:${name}] Error: ${err.message}`);
  });
}

/**
 * Base options shared by all connections.
 */
const BASE_OPTIONS = {
  connectTimeout: 10000,
  enableReadyCheck: false,
  reconnectOnError(err) {
    const targetErrors = ["READONLY", "ECONNRESET", "ECONNREFUSED"];
    return targetErrors.some((e) => err.message.includes(e));
  },
  retryStrategy(times) {
    const delay = Math.min(times * 500, 5000);
    return delay;
  },
};

/**
 * Creates a single named Redis connection with lifecycle monitoring.
 *
 * @param {string} name - Human-readable name for logging and metrics
 * @param {object} overrides - ioredis option overrides per subsystem
 * @returns {Redis}
 */
function createConnection(name, overrides = {}) {
  const conn = new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD,
    ...BASE_OPTIONS,
    ...overrides,
  });

  attachLifecycle(conn, name);

  return conn;
}

/**
 * Lazy-initialized application connections.
 * BullMQ connections are NOT here — they live in queues/connection.js.
 */
let _connections = null;

function getConnections() {
  if (_connections) return _connections;

  _connections = {
    // Default connection for non-critical, general-purpose use.
    general: createConnection("general", {
      maxRetriesPerRequest: 2,
      commandTimeout: 5000,
      enableAutoPipelining: true,
    }),

    // Search coordinator: registry checks, lock acquisition,
    // pending list management, dispatcher polling.
    coordinator: createConnection("coordinator", {
      maxRetriesPerRequest: 2,
      commandTimeout: 5000,
      enableAutoPipelining: true,
    }),

    // Application cache: search results, hotel data, markup cache.
    cache: createConnection("cache", {
      maxRetriesPerRequest: 2,
      commandTimeout: 5000,
      enableAutoPipelining: true,
    }),

    // Rate limiter: atomic INCR/EXPIRE, fail fast.
    rateLimit: createConnection("rateLimit", {
      maxRetriesPerRequest: 1,
      commandTimeout: 2000,
      enableOfflineQueue: false,
      enableAutoPipelining: false,
    }),

    // Socket.IO Redis adapter: pub/sub for cross-process broadcasting.
    socket: createConnection("socket", {
      maxRetriesPerRequest: 2,
      commandTimeout: 5000,
      enableAutoPipelining: false,
    }),
  };

  logger.info("[RedisConnections] Application pool initialized (5 connections)");
  return _connections;
}

/**
 * Gracefully close all application connections.
 * BullMQ connections are closed separately via closeBullConnections().
 */
async function closeAll() {
  if (!_connections) return;

  const names = Object.keys(_connections);
  await Promise.all(
    names.map(async (name) => {
      try {
        await _connections[name].quit();
        logger.info(`[Redis:${name}] Closed gracefully`);
      } catch (err) {
        logger.warn(`[Redis:${name}] Close error: ${err.message}`);
      }
    })
  );
  _connections = null;
}

/**
 * Returns a deep copy of metrics for all connections.
 */
function getMetrics() {
  return JSON.parse(JSON.stringify(metrics));
}

module.exports = {
  getConnections,
  closeAll,
  getMetrics,
};
