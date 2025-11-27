const jwt = require("jsonwebtoken");



// ===========================
// TOKEN VERIFICATION MIDDLEWARE
// ===========================
exports.verifyToken = async (req, res, next) => {
  try {
    let token = req.headers.authorization;

    if (!token || !token.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized user" });
    }

    token = token.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded; // attach user id + role
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized user",
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
