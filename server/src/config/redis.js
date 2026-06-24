const Redis = require("ioredis");
const logger = require("../utils/logger");

const options = {
  connectTimeout: 10000,
  enableReadyCheck: false,
  maxRetriesPerRequest: 2,

  retryStrategy(times) {
    const delay = Math.min(times * 500, 5000);

    logger.warn(
      `[Redis] Reconnecting attempt ${times}. Next retry in ${delay}ms`
    );

    return delay;
  },
};

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  password: process.env.REDIS_PASSWORD || undefined,
  ...options,
});

redis.on("connect", () => {
  logger.info("[Redis] Connected");
});

redis.on("ready", () => {
  logger.info("[Redis] Ready");
});

redis.on("close", () => {
  logger.warn("[Redis] Connection closed");
});

redis.on("reconnecting", () => {
  logger.warn("[Redis] Reconnecting...");
});

redis.on("error", (err) => {
  logger.error("[Redis] Error:", err.message);
});

module.exports = redis;