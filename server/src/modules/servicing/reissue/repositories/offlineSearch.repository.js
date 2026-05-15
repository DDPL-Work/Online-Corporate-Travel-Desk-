const redis = require("../../../../config/redis");
const logger = require("../../../../utils/logger");

const CACHE_KEY_PREFIX = "offline_reissue_search:";

const getCacheKey = (searchId) => `${CACHE_KEY_PREFIX}${searchId}`;

class OfflineSearchRepository {
  async save(searchId, payload, ttlSeconds = 1800) {
    try {
      const key = getCacheKey(searchId);
      await redis.setex(key, ttlSeconds, JSON.stringify(payload));
      return true;
    } catch (error) {
      logger.error("OFFLINE_SEARCH_CACHE_SAVE_FAILED", {
        searchId,
        error: error.message,
      });
      return false;
    }
  }

  async get(searchId) {
    try {
      const key = getCacheKey(searchId);
      const raw = await redis.get(key);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      logger.error("OFFLINE_SEARCH_CACHE_GET_FAILED", {
        searchId,
        error: error.message,
      });
      return null;
    }
  }

  async getValid(searchId) {
    try {
      const key = getCacheKey(searchId);
      const raw = await redis.get(key);
      const ttl = await redis.ttl(key);
      if (!raw || ttl <= 0) {
        return null;
      }
      return JSON.parse(raw);
    } catch (error) {
      logger.error("OFFLINE_SEARCH_CACHE_VALIDATION_FAILED", {
        searchId,
        error: error.message,
      });
      return null;
    }
  }

  async delete(searchId) {
    try {
      const key = getCacheKey(searchId);
      await redis.del(key);
      return true;
    } catch (error) {
      logger.error("OFFLINE_SEARCH_CACHE_DELETE_FAILED", {
        searchId,
        error: error.message,
      });
      return false;
    }
  }
}

module.exports = new OfflineSearchRepository();
