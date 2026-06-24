const Redis = require("ioredis");
const logger = require("../utils/logger");

const createBullConnection = () => {
  const options = {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: (times) => {
      if (times > 5) return null;
      return Math.min(times * 500, 3000);
    }
  };

  const conn = process.env.NODE_ENV === "production"
    ? new Redis(process.env.REDIS_URL, options)
    : new Redis({
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        ...options
      });
      
  conn.on("error", (err) => logger.error("[BullMQ Redis] Error:", err.message));
  return conn;
};

module.exports = createBullConnection;
