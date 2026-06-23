const Redis = require("ioredis");
const logger = require("../utils/logger");

const createBullConnection = () => {
  const conn = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: (times) => {
      if (times > 5) return null;
      return Math.min(times * 500, 3000);
    }
  });
  conn.on("error", (err) => logger.error("[BullMQ Redis] Error:", err.message));
  return conn;
};

module.exports = createBullConnection;
