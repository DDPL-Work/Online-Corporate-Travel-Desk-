const Queue = require("bull");
const { getConnections } = require("../config/redisConnections");

/**
 * Legacy Bull email queue.
 * Now routes through the centralized Redis connection pool.
 */
const emailQueue = new Queue("email", {
  redis: { connection: getConnections().general },
});

emailQueue.on("error", (err) => {
  console.error("[Email Queue Redis Error]", err);
});

module.exports = { emailQueue };
