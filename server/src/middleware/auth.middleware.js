const jwt = require("jsonwebtoken");
const User = require("../models/User");
const SuperAdmin = require("../models/SuperAdmin.model"); // ✅ REQUIRED
const ApiError = require("../utils/ApiError");

const SECRET = process.env.JWT_SECRET;

exports.verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized or missing token",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, SECRET);

    if (!decoded?.id || !decoded?.role) {
      return res.status(401).json({
        success: false,
        message: "Invalid token payload",
      });
    }

    let account = null;

    // ✅ ✅ HANDLE SUPER ADMIN SEPARATELY
    if (decoded.role === "super-admin") {
      account = await SuperAdmin.findById(decoded.id);

      if (!account) {
        return res.status(401).json({
          success: false,
          message: "Super Admin not found",
        });
      }

      req.user = {
        _id: account._id,
        id: account._id.toString(),
        role: "super-admin",
        roles: ["super-admin"],
        email: account.email,
        name: account.name,
      };

      return next(); // ✅ IMPORTANT: STOP HERE
    }

    // ✅ ✅ HANDLE OPS MEMBER
    if (decoded.role === "ops-member") {
      const OpsMember = require("../models/OpsMember");
      account = await OpsMember.findById(decoded.id);

      if (!account || account.status !== "Active" || account.isDeleted) {
        return res.status(401).json({
          success: false,
          message: "OPS Member not found, inactive, or suspended",
        });
      }

      req.user = {
        _id: account._id,
        id: account._id.toString(),
        role: "ops-member",
        specificRole: account.role,
        department: account.department,
        permissions: account.permissions,
        email: account.email,
        name: account.name,
      };

      return next();
    }

    // ✅ ✅ NORMAL USER FLOW (Travel Admin / Employee)
    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "User not found or inactive",
      });
    }

    req.user = {
      _id: user._id,
      id: user._id.toString(),
      role: user.role,
      roles: [user.role],
      corporateId: user.corporateId ? user.corporateId.toString() : null,
      managerRequestStatus: user.managerRequestStatus || "none",
      email: user.email,
      name: user.name,
    };

    return next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized or expired token",
      error: err.message,
    });
  }
};

// ✅ ROLE AUTHORIZATION (UNCHANGED – VALID)
exports.authorizeRoles = (...allowedRoles) => {
  const normalize = (r) => r?.toString().replace(/[-_ ]/g, "").toLowerCase();
  const wanted = allowedRoles.map(normalize);

  return (req, res, next) => {
    const role = normalize(req.user?.role);
    if (!role || !wanted.includes(role)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to perform this action",
      });
    }
    next();
  };
};

// ✅ SUPER ADMIN GUARD (UNCHANGED – VALID)
exports.verifySuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "super-admin") {
    return res.status(403).json({
      success: false,
      message: "Super Admin access only",
    });
  }
  next();
};
exports.verifyCorporateSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "corporate-super-admin") {
    return res.status(403).json({
      success: false,
      message: "corporate Super Admin access only",
    });
  }
  next();
};
