// server/src/config/redis.js
const Redis = require("ioredis");
const logger = require("../utils/logger");

const REDIS_URL = process.env.REDIS_URL;

// Stop reconnecting on auth errors — no point retrying with wrong credentials
const reconnectStrategy = (times) => {
  if (times > 5) {
    logger.error("[Redis] Max reconnection attempts reached. Check REDIS_URL/password in .env");
    return null; // stop reconnecting
  }
  return Math.min(times * 500, 3000); // exponential backoff up to 3s
};

const commonOptions = {
  maxRetriesPerRequest: 2,
  connectTimeout: 10000,
  enableReadyCheck: true,
  retryStrategy: reconnectStrategy,
  // Prevent crashing the whole app on Redis failure
  lazyConnect: false,
};

let redis;

if (REDIS_URL) {
  redis = new Redis(REDIS_URL, commonOptions);
} else {
  redis = new Redis({
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    ...commonOptions,
  });
}

redis.on("connect", () => {
  logger.info(`[Redis] Connected → ${redis.options.host || "Redis Cloud"}:${redis.options.port || ""}`);
});

redis.on("ready", () => {
  logger.info("[Redis] ✓ Ready to accept commands");
});

redis.on("error", (err) => {
  // Suppress repeated WRONGPASS spam after first log
  if (err?.message?.includes("WRONGPASS")) {
    logger.error("[Redis] Auth failed — WRONGPASS. Check REDIS_URL password in .env");
  } else {
    logger.error(`[Redis] Error: ${err?.message || err}`);
  }
});

redis.on("close", () => {
  logger.warn("[Redis] Connection closed");
});

redis.on("reconnecting", (ms) => {
  logger.warn(`[Redis] Reconnecting in ${ms}ms...`);
});

redis.on("end", () => {
  logger.error("[Redis] Connection ended — Redis features will be unavailable");
});

module.exports = redis;

