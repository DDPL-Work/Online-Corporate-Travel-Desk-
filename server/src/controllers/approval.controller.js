const Approval = require('../models/Approval');
const Booking = require('../models/Booking');
const User = require('../models/User');
const notificationService = require('../services/notification.service');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get all approval requests
// @route   GET /api/v1/approvals
// @access  Private (Manager/Travel Admin)
exports.getAllApprovals = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;

  const query = {
    corporateId: req.user.corporateId
  };

  if (req.user.role === 'travel-admin') {
    query.approverId = req.user.id;
  }

  if (status) query.status = status;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const approvals = await Approval.find(query)
    .populate('requesterId', 'name email department')
    .populate('bookingId')
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });

  const total = await Approval.countDocuments(query);

  res.status(200).json(
    new ApiResponse(200, {
      approvals,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    }, 'Approvals fetched successfully')
  );
});

// @desc    Get single approval
// @route   GET /api/v1/approvals/:id
// @access  Private
exports.getApproval = asyncHandler(async (req, res) => {
  const approval = await Approval.findById(req.params.id)
    .populate('requesterId', 'name email department')
    .populate('approverId', 'name email')
    .populate('bookingId');

  if (!approval) {
    throw new ApiError(404, 'Approval request not found');
  }

  res.status(200).json(
    new ApiResponse(200, approval, 'Approval details fetched successfully')
  );
});

// @desc    Approve booking request
// @route   POST /api/v1/approvals/:id/approve
// @access  Private (Travel Admin)
exports.approveRequest = asyncHandler(async (req, res) => {
  const { comments } = req.body;
  const approval = await Approval.findById(req.params.id);

  if (!approval) {
    throw new ApiError(404, 'Approval request not found');
  }

  if (approval.approverId.toString() !== req.user.id && req.user.role !== 'travel-admin') {
    throw new ApiError(403, 'Not authorized to approve this request');
  }

  if (approval.status !== 'pending') {
    throw new ApiError(400, 'This request has already been processed');
  }

  await approval.approve(req.user.id, comments);

  // Update booking status
  const booking = await Booking.findById(approval.bookingId);
  if (booking) {
    booking.status = 'approved';
    await booking.save();
  }

  // Send notification to requester
  const requester = await User.findById(approval.requesterId);
  await notificationService.sendApprovalNotifications(approval, requester, req.user, 'approve');

  res.status(200).json(
    new ApiResponse(200, approval, 'Request approved successfully')
  );
});

// @desc    Reject booking request
// @route   POST /api/v1/approvals/:id/reject
// @access  Private (Manager/Travel Admin)
exports.rejectRequest = asyncHandler(async (req, res) => {
  const { comments } = req.body;

  if (!comments) {
    throw new ApiError(400, 'Comments are required for rejection');
  }

  const approval = await Approval.findById(req.params.id);

  if (!approval) {
    throw new ApiError(404, 'Approval request not found');
  }

  if (approval.approverId.toString() !== req.user.id && req.user.role !== 'travel-admin') {
    throw new ApiError(403, 'Not authorized to reject this request');
  }

  if (approval.status !== 'pending') {
    throw new ApiError(400, 'This request has already been processed');
  }

  await approval.reject(req.user.id, comments);

  // Update booking status
  const booking = await Booking.findById(approval.bookingId);
  if (booking) {
    booking.status = 'rejected';
    await booking.save();
  }

  // Send notification to requester
  const requester = await User.findById(approval.requesterId);
  await notificationService.sendApprovalNotifications(approval, requester, req.user, 'reject');

  res.status(200).json(
    new ApiResponse(200, approval, 'Request rejected')
  );
});