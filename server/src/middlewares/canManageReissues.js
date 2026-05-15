const logger = require("../utils/logger");

const ADMIN_ROLES = ["super-admin", "master-admin", "ops-admin"];
const OPS_PERMISSION = "Manage Reissues";

const hasManageReissuesPermission = (req) => {
  // Check admin roles first
  if (req.user && ADMIN_ROLES.includes(req.user.role)) {
    return true;
  }

  // Check OPS member permissions
  if (req.opsMember && req.opsMember.status === "Active" && Array.isArray(req.opsMember.permissions) && req.opsMember.permissions.includes(OPS_PERMISSION)) {
    return true;
  }

  return false;
};

exports.canManageReissues = (req, res, next) => {
  const allowed = hasManageReissuesPermission(req);

  // Debug logging
  logger.info("canManageReissues auth check", {
    route: req.originalUrl,
    method: req.method,
    userRole: req.user?.role,
    opsMemberId: req.opsMember?._id?.toString(),
    opsMemberStatus: req.opsMember?.status,
    opsMemberPermissions: req.opsMember?.permissions,
    result: allowed ? "ALLOWED" : "DENIED",
  });

  if (!allowed) {
    return res.status(403).json({
      success: false,
      message: "You are not authorized to manage reissues",
      requiredPermission: OPS_PERMISSION,
      userRole: req.user?.role,
      opsMemberStatus: req.opsMember?.status,
    });
  }

  next();
};
