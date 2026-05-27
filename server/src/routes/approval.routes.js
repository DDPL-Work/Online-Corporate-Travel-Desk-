const express = require('express');
const router = express.Router();

const approvalController = require('../controllers/approval.controller');
const { verifyToken, authorizeRoles } = require('../middleware/auth.middleware');

// 🔐 All approval routes are protected
router.use(verifyToken);

/**
 * ================================
 * ADMIN (CORPORATE) APPROVAL FLOW
 * ================================
 */

/**
 * ================================
 * FLIGHT APPROVAL FLOW
 * ================================
 */

// ✅ Get all approval requests (ALL employees under same corporate/domain)
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

// ✅ Approve booking request (ADMIN/MANAGER/SECOND APPROVER)
router.post(
  '/:id/approve',
  authorizeRoles('travel-admin', 'manager', 'employee'),
  approvalController.approveRequest
);

// ✅ Reject booking request (ADMIN/MANAGER/SECOND APPROVER)
router.post(
  '/:id/reject',
  authorizeRoles('travel-admin', 'manager', 'employee'),
  approvalController.rejectRequest
);

// ✅ Transfer booking request (ADMIN ONLY)
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
