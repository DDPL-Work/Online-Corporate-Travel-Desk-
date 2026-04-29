// server/src/middleware/rateLimit.middleware.js
const rateLimit = require("express-rate-limit");
const { RateLimiterRedis } = require("rate-limiter-flexible");
const config = require("../config");
const redis = require("../config/redis");
const logger = require("../utils/logger");

/* ─────────────────────────────────────────────
   Redis-backed distributed rate limiters
   ───────────────────────────────────────────── */

// General API limiter — 300 requests / 15 min per IP
const apiRateLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: "rl:api",
  points: config.rateLimit?.max || 300,
  duration: (config.rateLimit?.windowMs || 15 * 60 * 1000) / 1000, // convert ms → seconds
  blockDuration: 60, // block 1 min after limit hit
});

// Auth limiter — 20 attempts / 15 min per IP
const authRateLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: "rl:auth",
  points: 20,
  duration: 15 * 60,
  blockDuration: 5 * 60, // block 5 min after limit
});

// Search limiter — 60 requests / min per IP
const searchRateLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: "rl:search",
  points: 60,
  duration: 60,
  blockDuration: 30,
});

// Booking limiter — 50 requests / hour per user
const bookingRateLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: "rl:booking",
  points: 50,
  duration: 60 * 60,
  blockDuration: 10 * 60,
});

/* ─────────────────────────────────────────────
   Middleware factory from a RateLimiterRedis instance
   ───────────────────────────────────────────── */
function makeRedisLimiter(limiterInstance, label = "API") {
  return async (req, res, next) => {
    const key = req.user?.id || req.ip;
    try {
      const result = await limiterInstance.consume(key);
      // Attach rate limit headers
      res.setHeader("X-RateLimit-Remaining", result.remainingPoints);
      res.setHeader("X-RateLimit-Reset", Math.ceil(result.msBeforeNext / 1000));
      next();
    } catch (rej) {
      logger.warn(`[RateLimit:${label}] Blocked: ${key}`);
      return res.status(429).json({
        success: false,
        error: `Too many ${label.toLowerCase()} requests. Please try again later.`,
        retryAfter: Math.ceil(rej.msBeforeNext / 1000),
      });
    }
  };
}

/* ─────────────────────────────────────────────
   Fallback express-rate-limit (used if Redis fails)
   ───────────────────────────────────────────── */
const limiter = rateLimit({
  windowMs: config.rateLimit?.windowMs || 15 * 60 * 1000,
  max: config.rateLimit?.max || 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: "Too many requests from this IP, please try again after 15 minutes.",
    });
  },
});

const authLimiter = makeRedisLimiter(authRateLimiter, "Auth");
const searchLimiter = makeRedisLimiter(searchRateLimiter, "Search");
const bookingLimiter = makeRedisLimiter(bookingRateLimiter, "Booking");
const apiLimiter = makeRedisLimiter(apiRateLimiter, "API");

module.exports = {
  limiter,       // express-rate-limit fallback (used in app.js)
  apiLimiter,    // Redis-backed general limiter
  authLimiter,   // Redis-backed auth limiter
  searchLimiter, // Redis-backed search limiter
  bookingLimiter,// Redis-backed booking limiter
};