// server/src/utils/jwt.js
const jwt = require('jsonwebtoken');

const ACCESS_EXP = process.env.JWT_EXP || '1d';
const SECRET = process.env.JWT_SECRET;

if (!SECRET) {
  console.warn('⚠️ JWT_SECRET not set! Tokens will not be secure.');
}

/**
 * Sign a standard access token for API authentication
 * @param {Object} user - User object
 * @returns {String} JWT token
 */
exports.signAccessToken = (user) => {
  const payload = {
    id: user._id.toString(),
    corporateId: user.corporateId ? user.corporateId.toString() : null,
    role: user.role,
    email: user.email,
    name: user.name || {}
  };
  return jwt.sign(payload, SECRET, { expiresIn: ACCESS_EXP });
};

/**
 * Generate JWT for SSO login
 * Returns JSON response by default, can be modified for frontend redirect
 * @param {Request} req
 * @param {Response} res
 */
exports.generateSSOToken = (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "SSO failed: No user returned"
      });
    }

    const payload = {
      id: user._id.toString(),
      corporateId: user.corporateId ? user.corporateId.toString() : null,
      role: user.role,
      email: user.email,
      name: user.name || {}
    };

    const token = jwt.sign(payload, SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

    // ✅ Option 1: JSON response (API)
    return res.status(200).json({
      success: true,
      message: "SSO Login Successful",
      token,
      user
    });

    // 🔹 Option 2: Frontend redirect (uncomment if needed)
    // res.redirect(`${process.env.FRONTEND_URL}/sso-success?token=${token}`);

  } catch (err) {
    console.error('SSO Token generation error:', err);
    return res.status(500).json({
      success: false,
      message: "SSO Token Generation Failed",
      error: err.message
    });
  }
};

/**
 * Verify JWT token (middleware helper)
 * @param {String} token
 * @returns {Object} decoded payload
 */
exports.verifyToken = (token) => {
  try {
    return jwt.verify(token, SECRET);
  } catch (err) {
    throw new Error('Invalid or expired token');
  }
};
