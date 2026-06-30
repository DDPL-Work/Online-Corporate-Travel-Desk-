// server/src/middleware/cache.middleware.js
/**
 * Express Cache Middleware
 * 
 * Usage in routes:
 *   const { cacheMiddleware, clearCache } = require('../middleware/cache.middleware');
 *
 *   // Cache a GET route for 5 minutes
 *   router.get('/flights/search', cacheMiddleware(300), flightController.search);
 *
 *   // Clear cache for a pattern after mutation
 *   router.post('/bookings', clearCache('bookings:*'), bookingController.create);
 */

const cache = require("../utils/cache");
const logger = require("../utils/logger");

/**
 * Generates a cache key from the request.
 * Key format: {role}:{userId}:{method}:{path}:{queryString}
 */
function buildCacheKey(req) {
  const role = req.user?.role || "public";
  const userId = req.user?.id || "anon";
  const query = JSON.stringify(req.query || {});
  return `cache:${role}:${userId}:${req.method}:${req.path}:${query}`;
}

/**
 * Cache middleware for GET requests.
 * @param {number} ttl - TTL in seconds (default 5 min)
 * @param {function} keyFn - Optional custom key generator (req) => string
 */
const cacheMiddleware = (ttl = 300, keyFn = null) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== "GET") return next();

    const key = keyFn ? keyFn(req) : buildCacheKey(req);

    try {
      const cached = await cache.get(key);
      if (cached !== null) {
        logger.info(`[Cache HIT] ${key}`);
        return res.status(200).json({ ...cached, _fromCache: true });
      }
      logger.info(`[Cache MISS] ${key}`);
    } catch (err) {
      logger.warn(`[Cache] Middleware error, bypassing: ${err.message}`);
      return next();
    }

    // Intercept res.json to cache the response
    const originalJson = res.json.bind(res);
    res.json = async (body) => {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300 && body?.success !== false) {
        await cache.set(key, body, ttl);
      }
      return originalJson(body);
    };

    next();
  };
};

/**
 * Middleware to clear cache patterns after a mutation.
 * @param {...string} patterns - Glob patterns to invalidate
 */
const clearCache = (...patterns) => {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = async (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        await Promise.all(patterns.map((p) => cache.delPattern(p)));
        logger.info(`[Cache] Invalidated patterns: ${patterns.join(", ")}`);
      }
      return originalJson(body);
    };
    next();
  };
};

module.exports = { cacheMiddleware, clearCache, buildCacheKey };
