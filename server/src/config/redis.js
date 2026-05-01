const Redis = require("ioredis");
const logger = require("../utils/logger");

const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: 2,
  connectTimeout: 10000,
  enableReadyCheck: false,
  retryStrategy: (times) => {
    if (times > 5) return null;
    return Math.min(times * 500, 3000);
  }
});

// NO tls config here

redis.on("connect", () => logger.info("[Redis] Connected"));
redis.on("ready", () => logger.info("[Redis] Ready"));
redis.on("error", (err) => logger.error("[Redis] Error:", err.message));

module.exports = redis;