const hasPermission = (permissions = [], requiredPermissions = []) => {
  if (!requiredPermissions.length) {
    return true;
  }

  if (!Array.isArray(permissions)) {
    return false;
  }

  return requiredPermissions.some((permission) => permissions.includes(permission));
};

const requireOpsPermission = (...requiredPermissions) => (req, res, next) => {
  if (req.user?.role !== "ops-member") {
    return next();
  }

  if (hasPermission(req.user?.permissions, requiredPermissions)) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: "You are not authorized to access this resource",
    requiredPermissions,
  });
};

module.exports = { requireOpsPermission };
