const express = require('express');
const router = express.Router();

const approvalController = require('../controllers/approval.controller');
const { verifyToken, authorizeRoles } = require('../middleware/auth.middleware');

// 🔐 All approval routes are protected
router.use(verifyToken);

/**
 * ================================
 * CANCELLATION & REISSUE APPROVAL ROUTES
 * MUST be BEFORE /:id parameter routes to avoid CastError
 * ================================
 */

// ✅ Travel Admin: Get pending cancellation & reissue approvals
router.get(
  "/cancellation-reissue",
  authorizeRoles("travel-admin"),
  approvalController.getAllCancellationReissueApprovals
);

// ✅ Manager: Get pending cancellation & reissue requests
router.get(
  "/manager/cancellation-reissue",
  authorizeRoles("manager"),
  approvalController.getManagerCancellationReissueRequests
);

// ✅ Configured Approver: Get pending requests (only TRAVEL_ADMIN_APPROVER stage)
router.get(
  "/configured-approver/cancellation-reissue",
  authorizeRoles("travel-admin", "manager", "corporate-super-admin", "employee"),
  approvalController.getConfiguredApproverRequests
);

// ✅ Approve cancellation/reissue (Manager → Travel Admin → Executed)
router.post(
  "/cancellation-reissue/:modelType/:id/approve",
  authorizeRoles("travel-admin", "manager", "employee"),
  approvalController.approveCancellationReissueRequest
);

// ✅ Reject cancellation/reissue
router.post(
  "/cancellation-reissue/:modelType/:id/reject",
  authorizeRoles("travel-admin", "manager", "employee"),
  approvalController.rejectCancellationReissueRequest
);

// ✅ Transfer cancellation/reissue (Travel Admin only)
router.post(
  "/cancellation-reissue/:modelType/:id/transfer",
  authorizeRoles("travel-admin"),
  approvalController.transferCancellationReissueRequest
);

/**
 * ================================
 * ADMIN (CORPORATE) APPROVAL FLOW
 * ================================
 */

// ✅ Get all approval requests
router.get(
  '/',
  authorizeRoles('travel-admin'),
  approvalController.getAllApprovals
);

// ✅ Check for pending transferred requests
router.get(
  '/second-approver/check',
  authorizeRoles('travel-admin', 'manager', 'corporate-super-admin', 'finance_team','employee'),
  approvalController.checkSecondApproverPending
);

// ✅ Get all requests pending for second approver
router.get(
  '/second-approver/requests',
  authorizeRoles('travel-admin', 'manager', 'corporate-super-admin', 'finance_team','employee'),
  approvalController.getSecondApproverRequests
);

// ✅ Get single approval (admin OR requester can view)
router.get(
  '/:id',
  approvalController.getApproval
);

// ✅ Approve booking request
router.post(
  '/:id/approve',
  authorizeRoles('travel-admin', 'manager', 'employee'),
  approvalController.approveRequest
);

// ✅ Reject booking request
router.post(
  '/:id/reject',
  authorizeRoles('travel-admin', 'manager', 'employee'),
  approvalController.rejectRequest
);

// ✅ Transfer booking request
router.post(
  '/:id/transfer',
  authorizeRoles('travel-admin'),
  approvalController.transferRequest
);

/**
 * ================================
 * HOTEL APPROVAL FLOW
 * ================================
 */

// ✅ Get single HOTEL request
router.get(
  "/hotel/:id",
  approvalController.getHotelApproval
);

// ✅ Approve HOTEL request
router.post(
  "/hotel/:id/approve",
  authorizeRoles("travel-admin", "manager", "employee"),
  approvalController.approveHotelRequest
);

// ✅ Reject HOTEL request
router.post(
  "/hotel/:id/reject",
  authorizeRoles("travel-admin", "manager", "employee"),
  approvalController.rejectHotelRequest
);

// ✅ Transfer HOTEL request
router.post(
  "/hotel/:id/transfer",
  authorizeRoles("travel-admin","manager"),
  approvalController.transferHotelRequest
);

module.exports = router;
