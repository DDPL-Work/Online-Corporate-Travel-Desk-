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

module.exports = router;
