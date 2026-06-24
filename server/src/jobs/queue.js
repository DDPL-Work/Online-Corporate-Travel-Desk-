const Queue = require("bull");

const redisConfig = {
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  password: process.env.REDIS_PASSWORD || undefined,
};

const emailQueue = new Queue("email", {
  redis: redisConfig,
});

emailQueue.on("error", (err) => {
  console.error("[Email Queue Redis Error]", err);
});

module.exports = { emailQueue };