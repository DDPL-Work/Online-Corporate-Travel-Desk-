// server/src/utils/cache.js
/**
 * Redis Cache Utility
 * 
 * Usage:
 *   const cache = require('../utils/cache');
 *
 *   // set (TTL in seconds, default 5 min)
 *   await cache.set('key', data, 300);
 *
 *   // get
 *   const data = await cache.get('key');
 *
 *   // delete
 *   await cache.del('key');
 *
 *   // delete by pattern
 *   await cache.delPattern('flights:*');
 */

const redis = require("../config/redis");
const logger = require("./logger");

const DEFAULT_TTL = 300; // 5 minutes

const cache = {
  /**
   * Get a cached value. Returns parsed object or null.
   */
  async get(key) {
    try {
      const raw = await redis.get(key);
      if (raw === null) return null;
      return JSON.parse(raw);
    } catch (err) {
      logger.error(`[Cache] GET error for key "${key}": ${err.message}`);
      return null;
    }
  },

  /**
   * Set a value with optional TTL (seconds).
   */
  async set(key, value, ttl = DEFAULT_TTL) {
    try {
      const serialized = JSON.stringify(value);
      if (ttl > 0) {
        await redis.setex(key, ttl, serialized);
      } else {
        await redis.set(key, serialized);
      }
    } catch (err) {
      logger.error(`[Cache] SET error for key "${key}": ${err.message}`);
    }
  },

  /**
   * Delete a single key.
   */
  async del(key) {
    try {
      await redis.del(key);
    } catch (err) {
      logger.error(`[Cache] DEL error for key "${key}": ${err.message}`);
    }
  },

  /**
   * Delete all keys matching a glob pattern.
   * Uses SCAN to avoid blocking the server.
   */
  async delPattern(pattern) {
    try {
      let cursor = "0";
      do {
        const [nextCursor, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
        cursor = nextCursor;
        if (keys.length) {
          await redis.del(...keys);
          logger.info(`[Cache] Deleted ${keys.length} keys matching "${pattern}"`);
        }
      } while (cursor !== "0");
    } catch (err) {
      logger.error(`[Cache] delPattern error for "${pattern}": ${err.message}`);
    }
  },

  /**
   * Check if a key exists.
   */
  async exists(key) {
    try {
      return (await redis.exists(key)) === 1;
    } catch (err) {
      logger.error(`[Cache] EXISTS error for key "${key}": ${err.message}`);
      return false;
    }
  },

  /**
   * Increment a counter (useful for rate limiting or analytics).
   */
  async incr(key, ttl = 60) {
    try {
      const val = await redis.incr(key);
      if (val === 1) await redis.expire(key, ttl); // set TTL only on first creation
      return val;
    } catch (err) {
      logger.error(`[Cache] INCR error for key "${key}": ${err.message}`);
      return 0;
    }
  },

  /**
   * Cache-aside helper: get from cache or execute loader function.
   */
  async getOrSet(key, loaderFn, ttl = DEFAULT_TTL) {
    const cached = await this.get(key);
    if (cached !== null) return cached;
    const fresh = await loaderFn();
    if (fresh !== undefined && fresh !== null) {
      await this.set(key, fresh, ttl);
    }
    return fresh;
  },
};

module.exports = cache;
