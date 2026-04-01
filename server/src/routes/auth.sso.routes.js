// server/src/routes/auth.sso.routes.js
const express = require('express');
const passport = require('../config/sso.config');
const { generateSSOToken } = require('../utils/jwt');

const router = express.Router();

/* --------------------------------------------------
   GOOGLE SSO
-------------------------------------------------- */

// Start Google SSO
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false
  })
);

// Google callback → returns JWT
router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/api/v1/auth/sso/failure',
    session: false
  }),
  generateSSOToken
);


/* --------------------------------------------------
   MICROSOFT SSO
-------------------------------------------------- */

// Start Microsoft SSO
router.get(
  '/microsoft',
  passport.authenticate('azuread-openidconnect', {
    session: false,
    prompt: 'login'
  })
);

// Microsoft callback (POST from Azure)
router.post(
  '/microsoft/callback',
  passport.authenticate('azuread-openidconnect', {
    failureRedirect: '/api/v1/auth/sso/failure',
    session: false
  }),
  generateSSOToken
);


/* --------------------------------------------------
   ZOHO SSO
-------------------------------------------------- */

// Start Zoho SSO
router.get(
  '/zoho',
  passport.authenticate('zoho', {
    session: false
  })
);

// Zoho callback → returns JWT (consistent with others)
router.get(
  '/zoho/callback',
  passport.authenticate('zoho', {
    failureRedirect: '/api/v1/auth/sso/failure',
    session: false
  }),
  generateSSOToken
);


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
