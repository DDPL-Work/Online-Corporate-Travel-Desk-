const express = require("express");
const { verifyToken } = require("../../../../middleware/auth.middleware");
const {
  authorizeOfflineReissueEmployee,
  authorizeOfflineReissueAccess,
} = require("../middleware/authorizeReissueAccess.middleware");
const { requireOpsPermission } = require("../middleware/requireOpsPermission.middleware");
const controller = require("../controllers/reissue.offline.controller");
const offlineSearchRoutes = require("./reissue.offlineSearch.routes");

const router = express.Router();

router.use("/", offlineSearchRoutes);

// ════════════════════════════════════════════════════════════════
// EMPLOYEE ENDPOINTS
// ════════════════════════════════════════════════════════════════
// Allows: Employee, Manager, Travel Admin, Ops, Super Admin, Master Admin

router.post(
  "/create",
  verifyToken,
  authorizeOfflineReissueEmployee,
  controller.create,
);

router.get(
  "/my-requests",
  verifyToken,
  authorizeOfflineReissueEmployee,
  controller.getMyRequests,
);

// ════════════════════════════════════════════════════════════════
// ADMIN / OPS ENDPOINTS (must come before /:id to avoid shadowing)
// ════════════════════════════════════════════════════════════════

/**
 * GET /admin/list
 * List all offline reissue requests
 * Allows: Super Admin, Master Admin, OPS Admin, OPS with Manage Reissues permission
 */
router.get(
  "/admin/list",
  verifyToken,
  requireOpsPermission("Re-issue Management"),
  controller.listAdmin,
);

/**
 * GET /:id
 * View a specific offline reissue request
 * Allows: Super Admin, Master Admin, OPS, Employee, Manager, Travel Admin
 */
router.get(
  "/:id",
  verifyToken,
  authorizeOfflineReissueAccess,
  controller.getById,
);

/**
 * PATCH /:id/status
 * Update status of an offline reissue request
 * Allows: Super Admin, Master Admin, OPS Admin, OPS Agent
 */
router.patch(
  "/:id/status",
  verifyToken,
  requireOpsPermission("Re-issue Management"),
  controller.updateStatus,
);

/**
 * PATCH /:id/reassign
 * Reassign an offline reissue request to another OPS member.
 * Allows: Super Admin, Master Admin, OPS Admin, OPS Agent
 */
router.patch(
  "/:id/reassign",
  verifyToken,
  requireOpsPermission("Re-issue Management"),
  controller.reassign,
);

router.post(
  "/:id/generate-ticket",
  verifyToken,
  requireOpsPermission("Re-issue Management"),
  controller.generateTicket,
);

/**
 * GET /:id/download-ticket
 * Download revised ticket
 * Allows: Super Admin, Master Admin, OPS, Employee (own only), Manager, Travel Admin
 */
router.get(
  "/:id/download-ticket",
  verifyToken,
  authorizeOfflineReissueAccess,
  controller.downloadTicket,
);

module.exports = router;
