const Redis = require("ioredis");
const logger = require("../utils/logger");

const options = {
  maxRetriesPerRequest: 2,
  connectTimeout: 10000,
  enableReadyCheck: false,
  retryStrategy: (times) => {
    if (times > 5) return null;
    return Math.min(times * 500, 3000);
  }
};

const redis = process.env.NODE_ENV === "production"
  ? new Redis(process.env.REDIS_URL, options)
  : new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      ...options
    });

// // NO tls config here

redis.on("connect", () => logger.info("[Redis] Connected"));
redis.on("ready", () => logger.info("[Redis] Ready"));
redis.on("error", (err) => logger.error("[Redis] Error:", err.message));

module.exports = redis;
