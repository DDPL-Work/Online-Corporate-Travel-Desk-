const rateLimit = require("express-rate-limit");

// ===========================
// GLOBAL RATE LIMITER
// ===========================
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 200,               // max 200 requests per window
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later."
  },
  standardHeaders: true,    // return rate limit info in headers
  legacyHeaders: false      // disable old headers
});


// ===========================
// STRICT LOGIN LIMITER
// Helps prevent brute force
// ===========================
const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,  // 10 minutes
  limit: 10,                 // 10 login attempts allowed
  message: {
    success: false,
    message: "Too many login attempts. Try again after 10 minutes."
  },
  skipSuccessfulRequests: true, // successful login resets counter
  standardHeaders: true,
  legacyHeaders: false
});


// ===========================
// STRICT OTP / SSO LIMITER
// Helpful for OTP or SSO calls
// ===========================
const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  limit: 5,                // 5 OTP/SSO hits allowed
  message: {
    success: false,
    message: "Too many OTP/SSO requests. Try again after 5 minutes."
  },
  standardHeaders: true,
  legacyHeaders: false
});


// EXPORT
module.exports = {
  apiLimiter,
  loginLimiter,
  otpLimiter
};
