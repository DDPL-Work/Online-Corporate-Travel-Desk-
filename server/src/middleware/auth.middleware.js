const jwt = require("jsonwebtoken");

// ===========================
// TOKEN VERIFICATION MIDDLEWARE
// ===========================
exports.verifyToken = async (req, res, next) => {
  try {
    let authHeader = req.headers.authorization;

    // No Authorization header
    if (!authHeader) {
      return res
        .status(401)
        .json({ success: false, message: "Authorization header missing" });
    }

    // Must begin with "Bearer "
    if (!authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid token format" });
    }

    const token = authHeader.split(" ")[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Extra validation (Recommended)
    if (!decoded.id || !decoded.role) {
      return res.status(401).json({
        success: false,
        message: "Invalid token payload",
      });
    }

    req.user = decoded; // { id, role, name, email }
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized or expired token",
      error: err.message,
    });
  }
};

// ===========================
// ROLE-BASED ACCESS CONTROL
// ===========================
module.exports.authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to perform this action",
      });
    }
    next();
  };
};

exports.verifySuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "super-admin") {
    return res.status(403).json({
      success: false,
      message: "Super Admin access only",
    });
  }
  next();
};
