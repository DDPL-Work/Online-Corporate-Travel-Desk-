/**
 * Redis Health Service
 *
 * Centralized service for Redis health checks, metrics, and connection status.
 * Decoupled from route handlers — health route calls this service.
 *
 * Exposes:
 *   getRedisHealth()      — connection status for all 7 connections
 *   getRedisMetrics()     — metrics for Prometheus/Grafana export
 *   getConnectionStatus() — raw ioredis status per connection
 */

const { getConnections, getMetrics } = require("../config/redisConnections");

const CONNECTION_NAMES = [
  "general",
  "coordinator",
  "workers",
  "cache",
  "rateLimit",
  "socket",
  "queue",
];

/**
 * Maps ioredis connection.status to a simplified health state.
 * @param {import("ioredis").Redis} conn
 * @returns {"connected"|"reconnecting"|"disconnected"}
 */
function mapStatus(conn) {
  const s = conn.status;
  if (s === "ready") return "connected";
  if (s === "connect" || s === "reconnecting") return "reconnecting";
  return "disconnected";
}

/**
 * Returns health status for all Redis connections.
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
      const status = mapStatus(connections[name]);
      result[name] = { status };
      if (status !== "connected") allHealthy = false;
    }

    return {
      status: allHealthy ? "healthy" : "degraded",
      connections: result,
    };
  } catch (err) {
    return { status: "error", error: err.message };
  }
}

/**
 * Returns metrics for all connections.
 * Ready for Prometheus exporter or Grafana dashboard.
 *
 * @returns {Record<string, { connectCount, reconnectCount, errorCount, lastError, lastConnectTime }>}
 */
function getRedisMetrics() {
  return getMetrics();
}

/**
 * Returns raw ioredis status per connection.
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
      result[name] = {
        status: conn.status,
        ready: conn.status === "ready",
      };
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
