const { getConnections } = require("../../config/redisConnections");
const redis = getConnections().coordinator;
const crypto = require("crypto");

/**
 * Lua script for safe lock release.
 * Only deletes the lock if the caller owns it (fencing token match).
 * Prevents a slow process from deleting another process's lock after TTL expiry.
 */
const RELEASE_LOCK_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`;

let releaseLockScriptSha = null;

/**
 * Acquires a distributed lock using Redis SET NX with a unique ownership token.
 * @param {string} key - The unique identifier for the lock
 * @param {number} ttlMs - Time to live in milliseconds
 * @returns {string|null} Ownership token if acquired, null otherwise
 */
async function acquireLock(key, ttlMs = 30000) {
  const lockKey = `lock:${key}`;
  const token = crypto.randomUUID();
  const result = await redis.set(lockKey, token, "NX", "PX", ttlMs);
  return result === "OK" ? token : null;
}

/**
 * Releases a distributed lock ONLY if the caller owns it.
 * Uses a Lua script for atomic compare-and-delete.
 * @param {string} key - The unique identifier for the lock
 * @param {string} token - The ownership token from acquireLock
 * @returns {boolean} True if lock was released, false if not owned or already expired
 */
async function releaseLock(key, token) {
  const lockKey = `lock:${key}`;
  try {
    // Use EVALSHA for performance if script is cached
    if (releaseLockScriptSha) {
      const result = await redis.evalsha(releaseLockScriptSha, 1, lockKey, token);
      return result === 1;
    }
    // Fallback to EVAL on first use
    const result = await redis.eval(RELEASE_LOCK_SCRIPT, 1, lockKey, token);
    releaseLockScriptSha = await redis.script("LOAD", RELEASE_LOCK_SCRIPT);
    return result === 1;
  } catch (err) {
    // If EVALSHA fails (script flushed from cache), retry with EVAL
    try {
      const result = await redis.eval(RELEASE_LOCK_SCRIPT, 1, lockKey, token);
      return result === 1;
    } catch (retryErr) {
      return false;
    }
  }
}

/**
 * Checks if a lock is still held by a specific token.
 * @param {string} key - The unique identifier for the lock
 * @param {string} token - The ownership token to check
 * @returns {boolean} True if the lock is held by this token
 */
async function isLockOwned(key, token) {
  const lockKey = `lock:${key}`;
  const current = await redis.get(lockKey);
  return current === token;
}

module.exports = {
  acquireLock,
  releaseLock,
  isLockOwned,
};
