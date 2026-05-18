const OpsMember = require("../../../../models/OpsMember");
const logger = require("../../../../utils/logger");

const ADMIN_ROLES = new Set(["super-admin", "master-admin", "ops-admin"]);

const requireOpsPermission = (permissionName) => async (req, res, next) => {
  try {
    if (!req.user?.role) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: missing user context",
      });
    }

    if (ADMIN_ROLES.has(req.user.role)) {
      return next();
    }

    if (req.user.role !== "ops-member") {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to manage offline reissues",
        requiredPermission: permissionName,
      });
    }

    const opsMember = await OpsMember.findById(req.user.id)
      .select("name email role permissions status isDeleted")
      .lean();

    const hasPermission =
      opsMember &&
      opsMember.status === "Active" &&
      !opsMember.isDeleted &&
      Array.isArray(opsMember.permissions) &&
      opsMember.permissions.includes(permissionName);

    logger.info("require_ops_permission", {
      route: req.originalUrl,
      method: req.method,
      permissionName,
      userRole: req.user.role,
      opsMemberId: req.user.id,
      allowed: Boolean(hasPermission),
    });

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to manage offline reissues",
        requiredPermission: permissionName,
      });
    }

    req.opsMember = {
      _id: opsMember._id,
      permissions: opsMember.permissions,
      status: opsMember.status,
      name: opsMember.name,
      email: opsMember.email,
      role: opsMember.role,
    };

    return next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to validate OPS permissions",
      error: error.message,
    });
  }
};

module.exports = { requireOpsPermission, ADMIN_ROLES };
