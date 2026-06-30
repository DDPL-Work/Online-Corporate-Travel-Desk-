const crypto = require("crypto");
const { getConnections } = require("../../../../config/redisConnections");
const redis = getConnections().general;

class ReissueLockService {
  async acquire(reissueId, ttlMs = 30000) {
    const key = `lock:reissue:${reissueId}`;
    const token = crypto.randomUUID();
    const result = await redis.set(key, token, "PX", ttlMs, "NX");
    return {
      acquired: result === "OK",
      key,
      token,
    };
  }

  async release({ key, token }) {
    if (!key || !token) return false;
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1]
      then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    const result = await redis.eval(script, 1, key, token);
    return result === 1;
  }

  async rememberIdempotency(reissueId, action, payload, ttlSeconds = 1800) {
    const key = `idem:reissue:${reissueId}:${action}`;
    const result = await redis.set(key, JSON.stringify(payload), "EX", ttlSeconds, "NX");
    return result === "OK";
  }

  async getIdempotency(reissueId, action) {
    const key = `idem:reissue:${reissueId}:${action}`;
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async bumpRetry(reissueId, ttlSeconds = 86400) {
    const key = `retry:reissue:${reissueId}`;
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, ttlSeconds);
    }
    return count;
  }
}

module.exports = new ReissueLockService();
