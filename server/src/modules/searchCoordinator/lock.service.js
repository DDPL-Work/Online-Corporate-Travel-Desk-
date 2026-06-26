const redis = require("../../config/redis");

/**
 * Acquires a distributed lock using Redis SET NX.
 * @param {string} key - The unique identifier for the lock
 * @param {number} ttlMs - Time to live in milliseconds
 * @returns {boolean} True if lock was acquired, false otherwise
 */
async function acquireLock(key, ttlMs = 30000) {
  const lockKey = `lock:${key}`;
  const result = await redis.set(lockKey, "1", "NX", "PX", ttlMs);
  return result === "OK";
}

/**
 * Releases a distributed lock.
 * @param {string} key - The unique identifier for the lock
 */
async function releaseLock(key) {
  const lockKey = `lock:${key}`;
  await redis.del(lockKey);
}

module.exports = {
  acquireLock,
  releaseLock
};
