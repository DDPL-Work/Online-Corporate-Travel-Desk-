/**
 * Redis Health Service
 *
 * Centralized service for Redis health checks, metrics, and connection status.
 * Decoupled from route handlers — health route calls this service.
 *
 * Architecture:
 *   Only checks the 5 application Redis connections (redisConnections.js).
 *   BullMQ connections are diagnostics-only — they do NOT affect health status.
 *
 * Health States:
 *   "healthy"  — all application connections are ready
 *   "degraded" — one or more connections are reconnecting/disconnected
 *   "error"    — only if this service itself crashes (should never happen)
 *
 * HTTP Status:
 *   Always 200 if the process is alive and this endpoint executes.
 *   500 only if this handler throws an uncaught exception.
 *
 * Exposes:
 *   getRedisHealth()      — connection status for all 5 application connections
 *   getRedisMetrics()     — metrics for Prometheus/Grafana export
 *   getConnectionStatus() — raw ioredis status per connection
 */

const { getConnections, getMetrics } = require("../config/redisConnections");

/**
 * The 5 application Redis connections.
 * BullMQ connections live in queues/connection.js and are NOT checked here.
 */
const CONNECTION_NAMES = [
  "general",
  "coordinator",
  "cache",
  "rateLimit",
  "socket",
];

/**
 * Maps ioredis connection.status to a simplified health state.
 * Never throws — if connection is missing or status is unknown, returns "disconnected".
 *
 * @param {import("ioredis").Redis|undefined|null} conn
 * @returns {"connected"|"reconnecting"|"disconnected"}
 */
function mapStatus(conn) {
  if (!conn || typeof conn.status !== "string") return "disconnected";

  switch (conn.status) {
    case "ready":
      return "connected";
    case "connect":
    case "reconnecting":
      return "reconnecting";
    default:
      return "disconnected";
  }
}

/**
 * Returns health status for all application Redis connections.
 * Safe to expose — does not include hosts, passwords, or ports.
 *
 * @returns {{ status: "healthy"|"degraded"|"error", connections: Record<string, { status: string }> }}
 */
function getRedisHealth() {
  try {
    const connections = getConnections();
    const result = {};
    let allHealthy = true;

    for (const name of CONNECTION_NAMES) {
      const conn = connections[name];
      const status = mapStatus(conn);
      result[name] = { status };
      if (status !== "connected") allHealthy = false;
    }

    return {
      status: allHealthy ? "healthy" : "degraded",
      connections: result,
    };
  } catch (err) {
    return { status: "error", connections: {}, error: err.message };
  }
}

/**
 * Returns metrics for all application connections.
 * Ready for Prometheus exporter or Grafana dashboard.
 *
 * @returns {Record<string, { connectCount, reconnectCount, errorCount, lastError, lastConnectTime }>}
 */
function getRedisMetrics() {
  try {
    return getMetrics();
  } catch (err) {
    return {};
  }
}

/**
 * Returns raw ioredis status per application connection.
 * More detailed than getRedisHealth() — includes ready boolean.
 *
 * @returns {Record<string, { status: string, ready: boolean }>}
 */
function getConnectionStatus() {
  try {
    const connections = getConnections();
    const result = {};

    for (const name of CONNECTION_NAMES) {
      const conn = connections[name];
      if (!conn) {
        result[name] = { status: "missing", ready: false };
      } else {
        result[name] = {
          status: conn.status,
          ready: conn.status === "ready",
        };
      }
    }

    return result;
  } catch (err) {
    return { error: err.message };
  }
}

module.exports = {
  getRedisHealth,
  getRedisMetrics,
  getConnectionStatus,
};
