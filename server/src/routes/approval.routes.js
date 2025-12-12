const express = require('express');
const router = express.Router();

const approvalController = require('../controllers/approval.controller');
const { verifyToken, authorizeRoles } = require('../middleware/auth.middleware');

// Protect all routes
router.use(verifyToken);

// GET all approvals
router.get(
  '/',
  authorizeRoles('manager', 'travel-admin'),
  approvalController.getAllApprovals
);

// GET single approval
router.get('/:id', approvalController.getApproval);

// Approve request
router.post(
  '/:id/approve',
  authorizeRoles('manager', 'travel-admin'),
  approvalController.approveRequest
);

// Reject request
router.post(
  '/:id/reject',
  authorizeRoles('manager', 'travel-admin'),
  approvalController.rejectRequest
);

module.exports = router;
