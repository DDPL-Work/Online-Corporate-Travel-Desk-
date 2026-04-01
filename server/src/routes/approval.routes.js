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

// ✅ Get single approval (admin OR requester can view)
router.get(
  '/:id',
  approvalController.getApproval
);

// ✅ Approve booking request (ADMIN ONLY)
router.post(
  '/:id/approve',
  authorizeRoles('travel-admin'),
  approvalController.approveRequest
);

// ✅ Reject booking request (ADMIN ONLY)
router.post(
  '/:id/reject',
  authorizeRoles('travel-admin'),
  approvalController.rejectRequest
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
  authorizeRoles("travel-admin"),
  approvalController.approveHotelRequest
);

// ✅ Reject HOTEL request
router.post(
  "/hotel/:id/reject",
  authorizeRoles("travel-admin"),
  approvalController.rejectHotelRequest
);

module.exports = router;
