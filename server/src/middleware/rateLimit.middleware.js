// server/src/middleware/rateLimit.middleware.js

const rateLimit = require('express-rate-limit');
const config = require('../config');

const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many requests from this IP, please try again after 15 minutes.'
    });
  }
});

// Specific limiters for different endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15000,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    error: 'Too many login attempts, please try again after 15 minutes.'
  }
});

const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1300,
  message: {
    success: false,
    error: 'Too many search requests, please slow down.'
  }
});

const bookingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1500,
  message: {
    success: false,
    error: 'Too many booking requests, please try again later.'
  }
});

module.exports = {
  limiter,
  authLimiter,
  searchLimiter,
  bookingLimiter
};