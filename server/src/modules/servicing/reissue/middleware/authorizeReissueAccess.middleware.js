/**
 * Middleware to authorize reissue access based on centralized RBAC
 * 
 * This middleware replaces hard-coded role checks with a unified,
 * permission-based authorization system that's easy to maintain and audit.
 */

const {
  PERMISSION_MATRIX,
  hasPermission,
  hasAnyPermission,
  OFFLINE_REISSUE_ADMIN_ROLES,
  OFFLINE_REISSUE_OPS_ROLES,
  OFFLINE_REISSUE_EMPLOYEE_ROLES,
} = require("../constants/reissuePermissions.constants");

/**
 * Middleware factory to authorize access based on required permissions
 * 
 * @param {...string} requiredPermissions - One or more permissions required for access
 * @returns {Function} Express middleware
 */
exports.authorizeReissueAccess = (...requiredPermissions) => {
  return (req, res, next) => {
    try {
      const user = req.user;

      if (!user || !user.role) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: No valid user context",
        });
      }

      const userRole = user.role;

      // Check if user has any of the required permissions
      const hasAccess = hasAnyPermission(userRole, requiredPermissions);

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to perform this action",
          details: {
            requiredPermissions,
            userRole,
          },
        });
      }

      // Attach permission info to request for later use
      req.userPermissions = PERMISSION_MATRIX[userRole] || [];

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Authorization check failed",
        error: error.message,
      });
    }
  };
};

/**
 * Middleware to restrict access to offline reissue admin endpoints
 * Allows: Super Admin, Master Admin, OPS Admin
 * 
 * @returns {Function} Express middleware
 */
exports.authorizeOfflineReissueAdmin = (req, res, next) => {
  try {
    const user = req.user;

    if (!user || !user.role) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: No valid user context",
      });
    }

    if (!OFFLINE_REISSUE_ADMIN_ROLES.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only admins can perform this action",
        allowedRoles: OFFLINE_REISSUE_ADMIN_ROLES,
      });
    }

    req.userPermissions = PERMISSION_MATRIX[user.role] || [];
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Authorization check failed",
      error: error.message,
    });
  }
};

/**
 * Middleware to restrict access to offline reissue ops endpoints
 * Allows: OPS Admin, OPS Agent, Super Admin
 * 
 * @returns {Function} Express middleware
 */
exports.authorizeOfflineReissueOps = (req, res, next) => {
  try {
    const user = req.user;

    if (!user || !user.role) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: No valid user context",
      });
    }

    const allowedRoles = [
      ...OFFLINE_REISSUE_OPS_ROLES,
      "super-admin", // Super admin can do anything
      "master-admin", // Master admin can do anything
    ];

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only ops team members can perform this action",
        allowedRoles,
      });
    }

    req.userPermissions = PERMISSION_MATRIX[user.role] || [];
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Authorization check failed",
      error: error.message,
    });
  }
};

/**
 * Middleware to restrict access to offline reissue employee endpoints
 * Allows: Employee, Manager, Travel Admin, Ops, Admins
 * 
 * @returns {Function} Express middleware
 */
exports.authorizeOfflineReissueEmployee = (req, res, next) => {
  try {
    const user = req.user;

    if (!user || !user.role) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: No valid user context",
      });
    }

    const allowedRoles = [
      ...OFFLINE_REISSUE_EMPLOYEE_ROLES,
      ...OFFLINE_REISSUE_OPS_ROLES,
      "super-admin",
      "master-admin",
    ];

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to access this resource",
        allowedRoles,
      });
    }

    req.userPermissions = PERMISSION_MATRIX[user.role] || [];
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Authorization check failed",
      error: error.message,
    });
  }
};

/**
 * Middleware to check if user can access all offline reissue resources
 * This includes admins, ops, and employees
 * 
 * @returns {Function} Express middleware
 */
exports.authorizeOfflineReissueAccess = (req, res, next) => {
  try {
    const user = req.user;

    if (!user || !user.role) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: No valid user context",
      });
    }

    const allowedRoles = [
      ...OFFLINE_REISSUE_EMPLOYEE_ROLES,
      ...OFFLINE_REISSUE_OPS_ROLES,
      ...OFFLINE_REISSUE_ADMIN_ROLES,
    ];

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to access offline reissue resources",
        allowedRoles,
      });
    }

    req.userPermissions = PERMISSION_MATRIX[user.role] || [];
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Authorization check failed",
      error: error.message,
    });
  }
};
