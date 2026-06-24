const Redis = require("ioredis");
const logger = require("../utils/logger");

const createBullConnection = () => {
  const options = {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    connectTimeout: 10000,

    retryStrategy(times) {
      const delay = Math.min(times * 500, 5000);

      logger.warn(
        `[BullMQ Redis] Reconnecting attempt ${times}. Next retry in ${delay}ms`
      );

      return delay;
    },
  };

  const conn = new Redis({
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    password: process.env.REDIS_PASSWORD || undefined,
    ...options,
  });

  conn.on("connect", () => {
    logger.info("[BullMQ Redis] Connected");
  });

  conn.on("ready", () => {
    logger.info("[BullMQ Redis] Ready");
  });

  conn.on("close", () => {
    logger.warn("[BullMQ Redis] Connection closed");
  });

  conn.on("reconnecting", () => {
    logger.warn("[BullMQ Redis] Reconnecting...");
  });

  conn.on("error", (err) => {
    logger.error("[BullMQ Redis] Error:", err.message);
  });

  return conn;
};

module.exports = createBullConnection;