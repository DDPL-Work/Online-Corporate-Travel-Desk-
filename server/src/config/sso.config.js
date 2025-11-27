const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const OIDCStrategy = require('passport-azure-ad').OIDCStrategy;

const User = require('../models/User');
const Corporate = require('../models/Corporate');
const logger = require('../utils/logger');

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
    passReqToCallback: true
  }, async (req, accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails[0].value;
      const domain = email.split('@')[1];

      // Find corporate by domain
      const corporate = await Corporate.findOne({
        'ssoConfig.domain': domain,
        'ssoConfig.type': 'google',
        'ssoConfig.verified': true,
        isActive: true
      });

      if (!corporate) {
        return done(null, false, { message: 'Domain not authorized' });
      }

      // Find or create user
      let user = await User.findOne({ email, corporateId: corporate._id });

      if (!user) {
        user = await User.create({
          email,
          name: {
            firstName: profile.name.givenName,
            lastName: profile.name.familyName
          },
          corporateId: corporate._id,
          ssoProvider: 'google',
          ssoId: profile.id,
          profilePicture: profile.photos[0]?.value,
          role: 'employee',
          isActive: true
        });
      } else {
        user.lastLogin = new Date();
        await user.save();
      }

      return done(null, user);
    } catch (error) {
      logger.error('Google OAuth Error:', error);
      return done(error, null);
    }
  }));
}

// Microsoft Azure AD Strategy
if (process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET) {
  passport.use(new OIDCStrategy({
    identityMetadata: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0/.well-known/openid-configuration`,
    clientID: process.env.AZURE_CLIENT_ID,
    clientSecret: process.env.AZURE_CLIENT_SECRET,
    responseType: 'code id_token',
    responseMode: 'form_post',
    redirectUrl: process.env.AZURE_CALLBACK_URL,
    allowHttpForRedirectUrl: process.env.NODE_ENV === 'development',
    validateIssuer: true,
    passReqToCallback: true,
    scope: ['profile', 'email', 'openid']
  }, async (req, iss, sub, profile, accessToken, refreshToken, done) => {
    try {
      const email = profile._json.email || profile._json.preferred_username;
      const domain = email.split('@')[1];

      const corporate = await Corporate.findOne({
        'ssoConfig.domain': domain,
        'ssoConfig.type': 'microsoft',
        'ssoConfig.verified': true,
        isActive: true
      });

      if (!corporate) {
        return done(null, false, { message: 'Domain not authorized' });
      }

      let user = await User.findOne({ email, corporateId: corporate._id });

      if (!user) {
        user = await User.create({
          email,
          name: {
            firstName: profile._json.given_name || profile.displayName.split(' ')[0],
            lastName: profile._json.family_name || profile.displayName.split(' ')[1] || ''
          },
          corporateId: corporate._id,
          ssoProvider: 'microsoft',
          ssoId: profile._json.oid,
          role: 'employee',
          isActive: true
        });
      } else {
        user.lastLogin = new Date();
        await user.save();
      }

      return done(null, user);
    } catch (error) {
      logger.error('Microsoft OAuth Error:', error);
      return done(error, null);
    }
  }));
}

module.exports = passport;