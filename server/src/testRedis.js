const Redis = require("ioredis");

const redis = new Redis();

(async () => {
  await redis.set("test", "hello");
  const value = await redis.get("test");
  console.log("Redis value:", value);
})();