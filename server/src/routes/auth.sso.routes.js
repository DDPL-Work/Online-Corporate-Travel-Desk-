// server/src/routes/auth.sso.routes.js
const express = require('express');
const passport = require('../config/sso.config');
const { generateSSOToken } = require('../utils/jwt');

const router = express.Router();
const FRONTEND_URL =
  process.env.FRONTEND_URL || 'http://localhost:5173';

/**
 * Build a safe redirect URL back to the frontend with error context
 */
const buildFailureRedirect = (info = {}) => {
  const url = new URL(`${FRONTEND_URL}/sso/callback`);
  url.searchParams.set('error', info.message || 'SSO failed');
  if (info.contactEmail) url.searchParams.set('admin', info.contactEmail);
  return url.toString();
};

/**
 * Shared callback handler to capture failure reasons and redirect accordingly
 */
const handleSSOCallback = (strategy) => (req, res, next) =>
  passport.authenticate(
    strategy,
    { session: false },
    (err, user, info) => {
      if (err || !user) {
        const redirectUrl = buildFailureRedirect(info || {});
        return res.redirect(redirectUrl);
      }
      req.user = user;
      return generateSSOToken(req, res);
    },
  )(req, res, next);

/* --------------------------------------------------
   GOOGLE SSO
-------------------------------------------------- */

// Start Google SSO
router.get(
  '/google',
  (req, res, next) => {
    const { slug } = req.query;
    passport.authenticate('google', {
      scope: ['profile', 'email'],
      session: false,
      state: slug || ''
    })(req, res, next);
  }
);

// Google callback → returns JWT
router.get('/google/callback', handleSSOCallback('google'));


/* --------------------------------------------------
   MICROSOFT SSO
-------------------------------------------------- */

// Start Microsoft SSO
router.get(
  '/microsoft',
  (req, res, next) => {
    const { slug } = req.query;
    passport.authenticate('azuread-openidconnect', {
      session: false,
      prompt: 'login',
      customState: slug || ''
    })(req, res, next);
  }
);

// Microsoft callback (POST from Azure)
router.post('/microsoft/callback', handleSSOCallback('azuread-openidconnect'));


/* --------------------------------------------------
   ZOHO SSO
-------------------------------------------------- */

// Start Zoho SSO
router.get(
  '/zoho',
  (req, res, next) => {
    const { slug } = req.query;
    passport.authenticate('zoho', {
      session: false,
      state: slug || ''
    })(req, res, next);
  }
);

// Zoho callback → returns JWT (consistent with others)
router.get('/zoho/callback', handleSSOCallback('zoho'));


/* --------------------------------------------------
   FAILURE HANDLER
-------------------------------------------------- */

router.get('/failure', (req, res) =>
  res.status(401).json({
    success: false,
    message: 'SSO failed'
  })
);


/* --------------------------------------------------
   LOGOUT
-------------------------------------------------- */

router.post('/logout', (req, res) => {
  try {
    res.clearCookie('token'); // if cookies used later

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
