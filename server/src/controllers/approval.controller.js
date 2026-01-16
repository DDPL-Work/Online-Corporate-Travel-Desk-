const Approval = require("../models/Approval");
const Booking = require("../models/Booking");
const BookingRequest = require("../models/BookingRequest");
const User = require("../models/User");
const notificationService = require("../services/notification.service");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");

// @desc    Get booking approvals (pending / approved / rejected)
// @route   GET /api/v1/approvals
// @access  Private (Travel Admin)
exports.getAllApprovals = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status = "pending_approval" } = req.query;

  if (req.user.role !== "travel-admin") {
    throw new ApiError(403, "Only admin can view approvals");
  }

  const skip = (Number(page) - 1) * Number(limit);

  // ==============================
  // 🔹 PENDING REQUESTS (QUEUE)
  // ==============================
  if (status === "pending_approval") {
    const query = {
      corporateId: req.user.corporateId,
      requestStatus: "pending_approval",
    };

    const requests = await BookingRequest.find(query)
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await BookingRequest.countDocuments(query);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          approvals: requests,
          pagination: {
            total,
            page: Number(page),
            pages: Math.ceil(total / limit),
          },
        },
        "Pending booking requests fetched successfully"
      )
    );
  }

  // ==============================
  // 🔹 APPROVED / REJECTED (HISTORY)
  // ==============================
  const query = {
    corporateId: req.user.corporateId,
    status, // approved | rejected
  };

  const approvals = await Approval.find(query)
    .populate("requesterId", "name email")
    .populate("approverId", "name email")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  const total = await Approval.countDocuments(query);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        approvals,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / limit),
        },
      },
      "Approval history fetched successfully"
    )
  );
});

// @desc    Get single approval (pending OR processed)
// @route   GET /api/v1/approvals/:id
// @access  Private
exports.getApproval = asyncHandler(async (req, res) => {
  // 1️⃣ Check pending queue first
  const bookingRequest = await BookingRequest.findById(req.params.id).populate(
    "userId",
    "name email"
  );

  if (bookingRequest) {
    const isAdmin = req.user.role === "travel-admin";
    const isOwner = bookingRequest.userId._id.toString() === req.user.id;

    if (!isAdmin && !isOwner) {
      throw new ApiError(403, "Not authorized");
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, bookingRequest, "Pending booking request fetched")
      );
  }

  // 2️⃣ Else check approval history
  const approval = await Approval.findOne({
    bookingRequestId: req.params.id,
    corporateId: req.user.corporateId,
  })
    .populate("requesterId", "name email")
    .populate("approverId", "name email");

  if (!approval) {
    throw new ApiError(404, "Approval record not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, approval, "Approval record fetched"));
});

// @desc    Approve booking request
// @route   POST /api/v1/approvals/:id/approve
// @access  Private (Travel Admin)
exports.approveRequest = asyncHandler(async (req, res) => {
  const { comments = "" } = req.body;

  if (req.user.role !== "travel-admin") {
    throw new ApiError(403, "Only admin can approve requests");
  }

  // 1️⃣ Find pending booking request
  const bookingRequest = await BookingRequest.findOne({
    _id: req.params.id,
    corporateId: req.user.corporateId,
    requestStatus: "pending_approval",
  });

  if (!bookingRequest) {
    throw new ApiError(404, "Booking request not found or already processed");
  }

  // 2️⃣ Create FULL approval snapshot
  const approval = await Approval.create({
    /* ================= REFERENCES ================= */
    bookingRequestId: bookingRequest._id,
    approvalReference: `APR-${Date.now()}`,

    corporateId: bookingRequest.corporateId,
    requesterId: bookingRequest.userId,
    approverId: req.user._id,

    /* ================= APPROVAL META ================= */
    status: "approved",
    approvedAt: new Date(),
    approverComments: comments || "",

    /* ================= FULL BOOKING REQUEST COPY ================= */
    bookingReference: bookingRequest.bookingReference,
    bookingType: bookingRequest.bookingType,
    purposeOfTravel: bookingRequest.purposeOfTravel,

    travellers: bookingRequest.travellers,

    flightRequest: bookingRequest.flightRequest,
    pricingSnapshot: bookingRequest.pricingSnapshot,
    bookingSnapshot: bookingRequest.bookingSnapshot,

    /* ================= POLICY SNAPSHOT ================= */
    policySnapshot: {
      policyType: "corporate-policy",
      maxAllowedAmount: null,
      violationFlags: [],
    },

    /* ================= NOTIFICATION ================= */
    notification: {
      initialSent: false,
      remindersSent: 0,
    },
  });

  // 3️⃣ Update booking request state
  bookingRequest.requestStatus = "approved";
  bookingRequest.approvalId = approval._id;

  // 3️⃣ Remove from BookingRequest (queue)
  // await BookingRequest.findByIdAndDelete(bookingRequest._id);
  await bookingRequest.save();

  res
    .status(200)
    .json(new ApiResponse(200, approval, "Booking approved successfully"));
});

// @desc    Reject booking request
// @route   POST /api/v1/approvals/:id/reject
// @access  Private (Travel Admin)
exports.rejectRequest = asyncHandler(async (req, res) => {
  const { comments } = req.body;

  if (!comments) {
    throw new ApiError(400, "Rejection comments are required");
  }

  if (req.user.role !== "travel-admin") {
    throw new ApiError(403, "Only admin can reject requests");
  }

  // 1️⃣ Find pending booking request
  const bookingRequest = await BookingRequest.findOne({
    _id: req.params.id,
    corporateId: req.user.corporateId,
    requestStatus: "pending_approval",
  });

  if (!bookingRequest) {
    throw new ApiError(404, "Booking request not found or already processed");
  }

  // 2️⃣ Create approval record (history)
  const approval = await Approval.create({
    bookingRequestId: bookingRequest._id,
    corporateId: bookingRequest.corporateId,
    requesterId: bookingRequest.userId,
    approverId: req.user._id,
    status: "rejected",
    rejectedAt: new Date(),
    approverComments: comments,

    bookingSnapshot: {
      bookingType: bookingRequest.bookingType,
      purposeOfTravel: bookingRequest.purposeOfTravel,
      amount: bookingRequest.totalAmount,
    },
  });

  // 3️⃣ Remove from BookingRequest (queue)
  await BookingRequest.findByIdAndDelete(bookingRequest._id);

  res
    .status(200)
    .json(new ApiResponse(200, approval, "Booking rejected successfully"));
});
