const Redis = require("ioredis");

const redis = new Redis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT) || 6379,
});

redis.on("connect", () => {
  console.log("[redis] connected to", redis.options.host, redis.options.port);
});

redis.on("error", (err) => {
  console.error("[redis] connection error:", err?.message || err);
});

module.exports = redis;
