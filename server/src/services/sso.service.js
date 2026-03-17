
// server/src/services/sso.service.js

const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');
const Corporate = require('../models/Corporate');
const logger = require('../utils/logger');

class SSOService {
  generateToken(userId) {
    return jwt.sign({ id: userId }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn
    });
  }

  generateRefreshToken(userId) {
    return jwt.sign({ id: userId }, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn
    });
  }

  async verifyDomain(email, ssoType) {
    const domain = email.split('@')[1];
    
    const corporate = await Corporate.findOne({
      'ssoConfig.domain': domain,
      'ssoConfig.type': ssoType,
      'ssoConfig.verified': true,
      isActive: true,
      status: 'active'
    });

    return corporate;
  }

  async createOrUpdateUser(profile, corporate) {
    let user = await User.findOne({
      email: profile.email,
      corporateId: corporate._id
    });

    if (!user) {
      user = await User.create({
        email: profile.email,
        name: {
          firstName: profile.firstName,
          lastName: profile.lastName
        },
        corporateId: corporate._id,
        ssoProvider: profile.provider,
        ssoId: profile.id,
        profilePicture: profile.photo,
        role: 'employee',
        isActive: true
      });
    } else {
      user.lastLogin = new Date();
      user.ssoId = profile.id;
      await user.save();
    }

    return user;
  }
}

module.exports = new SSOService();