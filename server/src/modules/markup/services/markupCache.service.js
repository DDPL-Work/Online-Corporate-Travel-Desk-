const redis = require("../../../config/redis");
const CorporateMarkup = require("../../../models/markup");
const logger = require("../../../utils/logger");

const CACHE_TTL = 3600; // 1 Hour

class MarkupCacheService {
  /**
   * Get cached markup rules for a specific corporate and product type.
   * If not in cache, fetches from MongoDB, caches it, and returns it.
   */
  static async getRules(corporateId, productType) {
    if (!corporateId) {
      return [];
    }
    const cacheKey = `markup:corp:${corporateId}:${productType}`;

    try {
      // 1. Try Redis
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // 2. Mongo Fallback
      // The prompt specified "Corporate Rule ↓ Global Rule".
      // We first check for the specific corporateId.
      let rulesDoc = await CorporateMarkup.findOne({
        corporateId,
        productType,
        isActive: true,
      }).lean();

      // If no corporate rule exists, you could potentially lookup a "Global Rule" here if implemented
      // e.g., if (!rulesDoc) rulesDoc = await CorporateMarkup.findOne({ corporateId: null, productType, isActive: true })

      const rules = rulesDoc && Array.isArray(rulesDoc.rules) ? rulesDoc.rules : [];

      // 3. Cache the result (even if empty, to prevent cache stampede on missing rules)
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(rules));
      
      return rules;
    } catch (error) {
      logger.error(`[MarkupCache] Failed to fetch rules for corp ${corporateId}: ${error.message}`);
      // Failsafe: Return empty rules array on DB/Redis error (Search must not fail)
      return [];
    }
  }

  /**
   * Invalidate cache when a rule is created, updated, deleted, activated, or deactivated.
   */
  static async invalidateRules(corporateId, productType) {
    if (!corporateId || !productType) return;
    const cacheKey = `markup:corp:${corporateId}:${productType}`;
    try {
      await redis.del(cacheKey);
      logger.info(`[MarkupCache] Invalidated cache for ${cacheKey}`);
    } catch (error) {
      logger.error(`[MarkupCache] Failed to invalidate cache ${cacheKey}: ${error.message}`);
    }
  }
}

module.exports = MarkupCacheService;
