// server/src/routes/auth.sso.routes.js
const express = require('express');
const passport = require('../config/sso.config');
const { generateSSOToken } = require('../utils/jwt');

const router = express.Router();

// Start Google SSO - Public route
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false
  })
);

// Google callback - Public route, returns JWT
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/api/v1/auth/sso/failure', session: false }),
  generateSSOToken
);

// Microsoft SSO - Start
router.get(
  '/microsoft',
  passport.authenticate('azuread-openidconnect', { session: false, prompt: 'login' })
);

// Microsoft callback (POST from Azure)
router.post(
  '/microsoft/callback',
  passport.authenticate('azuread-openidconnect', { failureRedirect: '/api/v1/auth/sso/failure', session: false }),
  generateSSOToken
);

// SSO Failure
router.get('/failure', (req, res) => res.status(401).json({ success: false, message: 'SSO failed' }));

// Logout (optional)
// SSO Logout (JWT + Optional Provider Logout)
router.post('/logout', (req, res) => {
  try {
    // If you're using cookies in future:
    res.clearCookie('token');

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Logout failed',
      error: err.message
    });
  }
});


module.exports = router;
