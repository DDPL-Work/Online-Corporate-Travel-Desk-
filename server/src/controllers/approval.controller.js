const Approval = require("../models/Approval");
const Booking = require("../models/Booking");
const HotelBookingRequest = require("../models/hotelBookingRequest.model");
const BookingIntent = require("../models/BookingIntent");
const BookingRequest = require("../models/BookingRequest");
const Corporate = require("../models/Corporate");
const User = require("../models/User");
const notificationService = require("../services/notification.service");
const { notify } = require("../notifications/orchestrator");
const EVENTS = require("../events/eventConstants");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const logger = require("../utils/logger");

const flightService = require("../services/tektravels/flight.service");
const hotelService = require("../services/tektravels/hotel.service");
const { getAgencyBalance } = require("../services/tboBalance.service");

// @desc    Get booking requests by status
// @route   GET /api/v1/approvals
// @access  Private (Travel Admin)
exports.getAllApprovals = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status = "pending_approval" } = req.query;

  if (req.user.role !== "travel-admin") {
    throw new ApiError(403, "Only admin can view requests");
  }

  const skip = (Number(page) - 1) * Number(limit);

  const statuses = status === "pending_approval" ? ["pending_approval", "pending_second_approval", "manager_approved"] : [status];

  const query = {
    corporateId: req.user.corporateId,
    requestStatus: { $in: statuses },
  };

  // const requests = await BookingRequest.find(query)
  //   .populate("userId", "name email")
  //   .populate("approvedBy", "name email")
  //   .populate("rejectedBy", "name email")
  //   .sort({ createdAt: -1 })
  //   .skip(skip)
  //   .limit(Number(limit));

  // const total = await BookingRequest.countDocuments(query);

  // 🔹 Fetch flight requests
  const flightRequests = await BookingRequest.find(query)
    .populate("userId", "name email")
    .populate("approvedBy", "name email")
    .populate("rejectedBy", "name email")
    .populate("approverId", "name email role");

  // 🔹 Fetch hotel requests
  const hotelRequests = await HotelBookingRequest.find(query)
    .populate("userId", "name email")
    .populate("approvedBy", "name email")
    .populate("rejectedBy", "name email")
    .populate("approverId", "name email role");

  // 🔥 Add type (VERY IMPORTANT)
  const taggedFlights = flightRequests.map((r) => {
    const obj = r.toObject();
    return {
      ...obj,
      orderId: obj.orderId || "N/A",
      bookingType: "flight",
    };
  });

  const taggedHotels = hotelRequests.map((r) => {
    const obj = r.toObject();
    return {
      ...obj,
      orderId: obj.orderId || "N/A",
      bookingType: "hotel",
    };
  });

  // 🔹 Merge + sort
  const allRequests = [...taggedFlights, ...taggedHotels].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  );

  const total = allRequests.length;

  res.status(200).json(
    new ApiResponse(
      200,
      {
        approvals: allRequests,
        pagination: {
          total,
          page: 1,
          pages: 1,
        },
      },
      "Booking requests fetched successfully",
    ),
  );
});

// @desc    Get single booking request (any status)
// @route   GET /api/v1/approvals/:id
// @access  Private
exports.getApproval = asyncHandler(async (req, res) => {
  const bookingRequest = await BookingRequest.findById(req.params.id)
    .populate("userId", "name email")
    .populate("approvedBy", "name email")
    .populate("rejectedBy", "name email")
    .populate("approverId", "name email role");

  if (!bookingRequest) {
    throw new ApiError(404, "Booking request not found");
  }

  const isAdmin = req.user.role === "travel-admin";
  const isOwner = bookingRequest.userId._id.toString() === req.user.id;

  if (!isAdmin && !isOwner) {
    throw new ApiError(403, "Not authorized");
  }

  const responseData = bookingRequest.toObject();
  responseData.orderId = responseData.orderId || responseData.bookingReference;

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        responseData,
        "Booking request fetched successfully",
      ),
    );
});

// @desc    Check if user is a pending second approver for any requests
// @route   GET /api/v1/approvals/second-approver/check
// @access  Private
exports.checkSecondApproverPending = asyncHandler(async (req, res) => {
  const query = {
    corporateId: req.user.corporateId,
    requestStatus: "pending_second_approval",
    "secondApprover.userId": req.user._id,
  };

  const flightCount = await BookingRequest.countDocuments(query);
  const hotelCount = await HotelBookingRequest.countDocuments(query);

  const hasPending = (flightCount + hotelCount) > 0;

  res.status(200).json(
    new ApiResponse(
      200,
      { hasPending, count: flightCount + hotelCount },
      "Checked pending transferred requests successfully"
    )
  );
});

// @desc    Get all requests pending for second approver
// @route   GET /api/v1/approvals/second-approver/requests
// @access  Private
exports.getSecondApproverRequests = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const query = {
    corporateId: req.user.corporateId,
    requestStatus: "pending_second_approval",
    "secondApprover.userId": req.user._id,
  };

  const flightRequests = await BookingRequest.find(query)
    .populate("userId", "name email")
    .populate("approvedBy", "name email")
    .populate("rejectedBy", "name email")
    .populate("approverId", "name email role");

  const hotelRequests = await HotelBookingRequest.find(query)
    .populate("userId", "name email")
    .populate("approvedBy", "name email")
    .populate("rejectedBy", "name email")
    .populate("approverId", "name email role");

  const taggedFlights = flightRequests.map((r) => {
    const obj = r.toObject();
    return {
      ...obj,
      orderId: obj.orderId || "N/A",
      bookingType: "flight",
    };
  });

  const taggedHotels = hotelRequests.map((r) => {
    const obj = r.toObject();
    return {
      ...obj,
      orderId: obj.orderId || "N/A",
      bookingType: "hotel",
    };
  });

  const allRequests = [...taggedFlights, ...taggedHotels].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  );

  const total = allRequests.length;

  res.status(200).json(
    new ApiResponse(
      200,
      {
        approvals: allRequests,
        pagination: {
          total,
          page: 1,
          pages: 1,
        },
      },
      "Transferred requests fetched successfully",
    ),
  );
});

// @desc    Approve booking request
// @route   POST /api/v1/approvals/:id/approve
// @access  Private (Travel Admin)
exports.approveRequest = asyncHandler(async (req, res) => {
  const { comments = "" } = req.body;

  const bookingRequest = await BookingRequest.findOne({
    _id: req.params.id,
    corporateId: req.user.corporateId,
    requestStatus: { $in: ["pending_approval", "manager_approved", "pending_second_approval"] },
  });

  if (!bookingRequest) {
    throw new ApiError(404, "Booking request not found or already processed");
  }

  const isSecondApprover =
    bookingRequest.requestStatus === "pending_second_approval" &&
    bookingRequest.secondApprover?.userId?.toString() === req.user._id.toString();

  if (!["travel-admin", "manager"].includes(req.user.role) && !isSecondApprover) {
    throw new ApiError(403, "You are not authorized to approve this request");
  }

  // 🔹 NEW: Block pending managers
  if (req.user.role === "manager" && req.user.managerRequestStatus !== "approved") {
    throw new ApiError(403, "Your manager account is pending travel-admin verification. You cannot approve bookings yet.");
  }

  /* ================= BALANCE / CREDIT VALIDATION ================= */
  const corporate = await Corporate.findById(req.user.corporateId);
  if (!corporate) {
    throw new ApiError(404, "Corporate account not found");
  }

  const snapshot = bookingRequest.bookingSnapshot;
  const isRoundTrip = snapshot.sectors && snapshot.sectors.length === 2;
  const fareResult = bookingRequest.flightRequest?.fareQuote?.Results?.[0];

  const requiredAmount = isRoundTrip
    ? (bookingRequest.pricingSnapshot?.totalAmount || 0)
    : (fareResult?.Fare?.PublishedFare || bookingRequest.pricingSnapshot?.totalAmount || 0);

  if (corporate.classification === "prepaid") {
    if (corporate.walletBalance < requiredAmount) {
      throw new ApiError(400, "Insufficient wallet balance to approve this flight request.");
    }
  } else if (corporate.classification === "postpaid") {
    if (corporate.currentCredit + requiredAmount > corporate.creditLimit) {
      throw new ApiError(400, "Credit limit exceeded. Cannot approve this flight request.");
    }
  }
  /* ========================================================================= */

  if (req.user.role !== "travel-admin") {
    // Manager or Second Approver approval
    bookingRequest.managerApproval = {
      isApproved: true,
      approvedBy: req.user._id,
      approvedAt: new Date(),
      comments: comments,
    };

    bookingRequest.$locals.previousStatus = bookingRequest.requestStatus;
    bookingRequest.requestStatus = "manager_approved";

    await bookingRequest.save();

    return res.status(200).json(
      new ApiResponse(
        200,
        bookingRequest,
        "Booking request approved by manager, pending travel-admin approval",
      ),
    );
  }

  // Travel Admin full approval
  bookingRequest.$locals.previousStatus = bookingRequest.requestStatus;

  bookingRequest.requestStatus = "approved";
  bookingRequest.approvedAt = new Date();
  bookingRequest.approvedBy = req.user._id;
  bookingRequest.approverComments = comments;

  await bookingRequest.save();

  /* ================= CREATE BOOKING INTENT ================= */

  // ONE-WAY handling
  const [origin, destination] = snapshot.sectors[0].split("-");
  const [, returnDestination] = isRoundTrip
    ? snapshot.sectors[1].split("-")
    : [];

  const travelDate = new Date(snapshot.travelDate);
  const now = new Date();

  const validUntil = new Date(
    Math.min(
      travelDate.getTime() - 24 * 60 * 60 * 1000,
      now.getTime() + 24 * 60 * 60 * 1000, // at least 24h validity
    ),
  );

  const approvedSegment = bookingRequest.flightRequest.segments[0];

  // fareResult is already defined above

  // FIRST LEG, FIRST SEGMENT (OW / RT safe)
  const providerSegment = fareResult.Segments[0][0];

  const airlineCodes = [
    ...new Set(bookingRequest.flightRequest.segments.map((s) => s.airlineCode)),
  ];

  const maxApprovedPrice = isRoundTrip
    ? bookingRequest.pricingSnapshot.totalAmount
    : fareResult.Fare.PublishedFare;

  // const maxApprovedPrice = fareResult.Fare.PublishedFare;

  await BookingIntent.create({
    bookingRequestId: bookingRequest._id,
    corporateId: bookingRequest.corporateId,
    userId: bookingRequest.userId,

    origin,
    destination,

    travelDate: snapshot.travelDate,
    returnDate: snapshot.returnDate,

    journeyType: isRoundTrip ? "RT" : "OW",

    // ✅ EXACT DATA AS APPROVED (NO MAPPING)
    cabinClass: snapshot.cabinClass, // "Premium Economy"
    // airlineCodes: [approvedSegment.airlineCode], // ["6E"]
    airlineCodes,

    maxApprovedPrice,

    approvedAt: new Date(),
    validUntil,
  });

  // ── Notify Employee: booking approved ──────────────────────
  const _flightApproveUser = await User.findById(bookingRequest.userId).select('name email').lean();
  const _flightApproverName = req.user.name?.firstName
    ? `${req.user.name.firstName} ${req.user.name.lastName || ''}`.trim()
    : req.user.name || 'Admin';
  notify(EVENTS.BOOKING_APPROVED, {
    employeeId:   bookingRequest.userId,
    employeeEmail: _flightApproveUser?.email,
    employeeName: _flightApproveUser?.name?.firstName || 'Employee',
    corporateId:  bookingRequest.corporateId,
    orderId:      bookingRequest.orderId || bookingRequest.bookingReference,
    bookingType:  'flight',
    approverName: _flightApproverName,
    approverRole: req.user.role,
    relatedId:    bookingRequest._id,
    requesterId:  bookingRequest.requesterDetails?.userId || bookingRequest.userId,
    requesterEmail: bookingRequest.requesterDetails?.email || _flightApproveUser?.email,
  });



  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        bookingRequest,
        "Booking request approved successfully",
      ),
    );
});

// @desc    Reject booking request
// @route   POST /api/v1/approvals/:id/reject
// @access  Private (Travel Admin)
exports.rejectRequest = asyncHandler(async (req, res) => {
  const { comments } = req.body;

  if (!comments) {
    throw new ApiError(400, "Rejection comments are required");
  }

  const bookingRequest = await BookingRequest.findOne({
    _id: req.params.id,
    corporateId: req.user.corporateId,
    requestStatus: { $in: ["pending_approval", "manager_approved", "pending_second_approval"] },
  });

  if (!bookingRequest) {
    throw new ApiError(404, "Booking request not found or already processed");
  }

  const isSecondApprover =
    bookingRequest.requestStatus === "pending_second_approval" &&
    bookingRequest.secondApprover?.userId?.toString() === req.user._id.toString();

  if (!["travel-admin", "manager"].includes(req.user.role) && !isSecondApprover) {
    throw new ApiError(403, "You are not authorized to reject this request");
  }

  // 🔹 NEW: Block pending managers
  if (req.user.role === "manager" && req.user.managerRequestStatus !== "approved") {
    throw new ApiError(403, "Your manager account is pending travel-admin verification. You cannot reject bookings yet.");
  }

  bookingRequest.$locals.previousStatus = bookingRequest.requestStatus;

  bookingRequest.requestStatus = "rejected";
  bookingRequest.rejectedAt = new Date();
  bookingRequest.rejectedBy = req.user._id;
  bookingRequest.approverComments = comments;

  await bookingRequest.save();

  // ── Notify Employee: booking rejected ──────────────────────
  const _flightRejectUser = await User.findById(bookingRequest.userId).select('name email').lean();
  const _flightRejecterName = req.user.name?.firstName
    ? `${req.user.name.firstName} ${req.user.name.lastName || ''}`.trim()
    : req.user.name || 'Admin';
  notify(EVENTS.BOOKING_REJECTED, {
    employeeId:      bookingRequest.userId,
    employeeEmail:   _flightRejectUser?.email,
    employeeName:    _flightRejectUser?.name?.firstName || 'Employee',
    corporateId:     bookingRequest.corporateId,
    orderId:         bookingRequest.orderId || bookingRequest.bookingReference,
    bookingType:     'flight',
    approverName:    _flightRejecterName,
    rejectionReason: comments,
    relatedId:       bookingRequest._id,
  });



  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        bookingRequest,
        "Booking request rejected successfully",
      ),
    );
});

// @desc    Transfer booking request
// @route   POST /api/v1/approvals/:id/transfer
// @access  Private (Travel Admin)
exports.transferRequest = asyncHandler(async (req, res) => {
  const { secondApproverId, remark } = req.body;

  if (!["travel-admin"].includes(req.user.role)) {
    throw new ApiError(403, "Only admin can transfer requests");
  }

  const bookingRequest = await BookingRequest.findOne({
    _id: req.params.id,
    corporateId: req.user.corporateId,
    requestStatus: { $in: ["pending_approval", "manager_approved"] },
  });

  if (!bookingRequest) {
    throw new ApiError(404, "Booking request not found or already processed");
  }

  const newApprover = await User.findById(secondApproverId);
  if (!newApprover) {
    throw new ApiError(404, "Second approver not found");
  }

  bookingRequest.$locals.previousStatus = bookingRequest.requestStatus;
  bookingRequest.requestStatus = "pending_second_approval";
  bookingRequest.secondApprover = {
    userId: newApprover._id,
    email: newApprover.email,
    name: `${newApprover.name?.firstName || ""} ${newApprover.name?.lastName || ""}`.trim(),
    role: newApprover.role,
    transferRemark: remark,
    transferredAt: new Date(),
  };

  await bookingRequest.save();

  // ── Notify Second Approver: booking transferred ─────────────
  const _flightRequester = await User.findById(bookingRequest.userId).select('name email').lean();
  const _transferredByName = req.user.name?.firstName
    ? `${req.user.name.firstName} ${req.user.name.lastName || ''}`.trim()
    : req.user.name || 'Admin';

  notify(EVENTS.BOOKING_TRANSFERRED, {
    secondApproverId: newApprover._id,
    secondApproverEmail: newApprover.email,
    secondApproverName: newApprover.name?.firstName || 'Approver',
    employeeName: _flightRequester?.name?.firstName || 'Employee',
    transferredByName: _transferredByName,
    corporateId: bookingRequest.corporateId,
    orderId: bookingRequest.orderId || bookingRequest.bookingReference,
    bookingType: 'flight',
    amount: bookingRequest.pricingSnapshot?.totalAmount || 0,
    relatedId: bookingRequest._id,
  });

  res.status(200).json(
    new ApiResponse(
      200,
      bookingRequest,
      "Booking request transferred successfully"
    )
  );
});

// ======================================

// HOTEL REQUESTS

// ======================================

// @desc    Get single HOTEL booking request
// @route   GET /api/v1/approvals/hotel/:id
// @access  Private
exports.getHotelApproval = asyncHandler(async (req, res) => {
  const bookingRequest = await HotelBookingRequest.findById(req.params.id)
    .populate("userId", "name email")
    .populate("approvedBy", "name email")
    .populate("rejectedBy", "name email")
    .populate("approverId", "name email role");

  if (!["travel-admin", "manager"].includes(req.user.role)) {
    throw new ApiError(403, "Only admin/manager can approve requests");
  }

  const isAdmin = req.user.role === "travel-admin" || "manager";
  const isOwner = bookingRequest.userId._id.toString() === req.user.id;

  if (!isAdmin && !isOwner) {
    throw new ApiError(403, "Not authorized");
  }

  const responseData = bookingRequest.toObject();
  responseData.orderId = responseData.orderId || responseData.bookingReference;

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        responseData,
        "Hotel booking request fetched successfully",
      ),
    );
});

// @desc    Approve HOTEL booking request
// @route   POST /api/v1/approvals/hotel/:id/approve
// @access  Private (Travel Admin)
exports.approveHotelRequest = asyncHandler(async (req, res) => {
  const { comments = "" } = req.body;

  const bookingRequest = await HotelBookingRequest.findOne({
    _id: req.params.id,
    corporateId: req.user.corporateId,
    requestStatus: { $in: ["pending_approval", "manager_approved", "pending_second_approval"] },
  });

  if (!bookingRequest) {
    throw new ApiError(404, "Hotel request not found or already processed");
  }

  const isSecondApprover =
    bookingRequest.requestStatus === "pending_second_approval" &&
    bookingRequest.secondApprover?.userId?.toString() === req.user._id.toString();

  if (!["travel-admin", "manager"].includes(req.user.role) && !isSecondApprover) {
    throw new ApiError(403, "You are not authorized to approve this request");
  }

  // 🔹 NEW: Block pending managers
  if (req.user.role === "manager" && req.user.managerRequestStatus !== "approved") {
    throw new ApiError(403, "Your manager account is pending travel-admin verification. You cannot approve hotel bookings yet.");
  }

  /* ================= BALANCE / CREDIT VALIDATION ================= */
  const corporate = await Corporate.findById(req.user.corporateId);
  if (!corporate) {
    throw new ApiError(404, "Corporate account not found");
  }

  const requiredAmount = bookingRequest.pricingSnapshot?.totalAmount || bookingRequest.bookingSnapshot?.amount || 0;

  if (corporate.classification === "prepaid") {
    if (corporate.walletBalance < requiredAmount) {
      throw new ApiError(400, "Insufficient wallet balance to approve this hotel request.");
    }
  } else if (corporate.classification === "postpaid") {
    if (corporate.currentCredit + requiredAmount > corporate.creditLimit) {
      throw new ApiError(400, "Credit limit exceeded. Cannot approve this hotel request.");
    }
  }
  /* ========================================================================= */

  if (req.user.role !== "travel-admin") {
    // Manager or Second Approver approval
    bookingRequest.managerApproval = {
      isApproved: true,
      approvedBy: req.user._id,
      approvedAt: new Date(),
      comments: comments,
    };

    bookingRequest.$locals.previousStatus = bookingRequest.requestStatus;
    bookingRequest.requestStatus = "manager_approved";

    await bookingRequest.save();

    return res.status(200).json(
      new ApiResponse(
        200,
        bookingRequest,
        "Hotel booking request approved by manager, pending travel-admin approval",
      ),
    );
  }

  bookingRequest.requestStatus = "approved";
  bookingRequest.approvedAt = new Date();
  bookingRequest.approvedBy = req.user._id;
  await bookingRequest.save();

  // ── Notify Employee: hotel booking approved ─────────────────
  const _hotelApproveUser = await User.findById(bookingRequest.userId).select('name email').lean();
  const _hotelApproverName = req.user.name?.firstName
    ? `${req.user.name.firstName} ${req.user.name.lastName || ''}`.trim()
    : req.user.name || 'Admin';
  notify(EVENTS.BOOKING_APPROVED, {
    employeeId:   bookingRequest.userId,
    employeeEmail: _hotelApproveUser?.email,
    employeeName: _hotelApproveUser?.name?.firstName || 'Employee',
    corporateId:  bookingRequest.corporateId,
    orderId:      bookingRequest.orderId || bookingRequest.bookingReference,
    bookingType:  'hotel',
    approverName: _hotelApproverName,
    approverRole: req.user.role,
    relatedId:    bookingRequest._id,
    requesterId:  bookingRequest.requesterDetails?.userId || bookingRequest.userId,
    requesterEmail: bookingRequest.requesterDetails?.email || _hotelApproveUser?.email,
  });



  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        bookingRequest,
        "Hotel booking request approved successfully",
      ),
    );
});

// @desc    Approve HOTEL booking request
// @route   POST /api/v1/approvals/hotel/:id/reject
// @access  Private (Travel Admin)
exports.rejectHotelRequest = asyncHandler(async (req, res) => {
  const { comments } = req.body;

  if (!comments) {
    throw new ApiError(400, "Rejection comments are required");
  }

  const bookingRequest = await HotelBookingRequest.findOne({
    _id: req.params.id,
    corporateId: req.user.corporateId,
    requestStatus: { $in: ["pending_approval", "manager_approved", "pending_second_approval"] },
  });

  if (!bookingRequest) {
    throw new ApiError(404, "Hotel request not found or already processed");
  }

  const isSecondApprover =
    bookingRequest.requestStatus === "pending_second_approval" &&
    bookingRequest.secondApprover?.userId?.toString() === req.user._id.toString();

  if (!["travel-admin", "manager"].includes(req.user.role) && !isSecondApprover) {
    throw new ApiError(403, "You are not authorized to reject this request");
  }

  // 🔹 NEW: Block pending managers
  if (req.user.role === "manager" && req.user.managerRequestStatus !== "approved") {
    throw new ApiError(403, "Your manager account is pending travel-admin verification. You cannot reject hotel bookings yet.");
  }

  bookingRequest.requestStatus = "rejected";
  bookingRequest.rejectedAt = new Date();
  bookingRequest.rejectedBy = req.user._id;
  bookingRequest.approverComments = comments;

  await bookingRequest.save();

  // ── Notify Employee: hotel booking rejected ─────────────────
  const _hotelRejectUser = await User.findById(bookingRequest.userId).select('name email').lean();
  const _hotelRejecterName = req.user.name?.firstName
    ? `${req.user.name.firstName} ${req.user.name.lastName || ''}`.trim()
    : req.user.name || 'Admin';
  notify(EVENTS.BOOKING_REJECTED, {
    employeeId:      bookingRequest.userId,
    employeeEmail:   _hotelRejectUser?.email,
    employeeName:    _hotelRejectUser?.name?.firstName || 'Employee',
    corporateId:     bookingRequest.corporateId,
    orderId:         bookingRequest.orderId || bookingRequest.bookingReference,
    bookingType:     'hotel',
    approverName:    _hotelRejecterName,
    rejectionReason: comments,
    relatedId:       bookingRequest._id,
  });



  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        bookingRequest,
        "Hotel booking request rejected successfully",
      ),
    );
});

// @desc    Transfer HOTEL booking request
// @route   POST /api/v1/approvals/hotel/:id/transfer
// @access  Private (Travel Admin/Manager)
exports.transferHotelRequest = asyncHandler(async (req, res) => {
  const { secondApproverId, remark } = req.body;

  if (!["travel-admin", "manager"].includes(req.user.role)) {
    throw new ApiError(403, "Only admin/manager can transfer requests");
  }

  const bookingRequest = await HotelBookingRequest.findOne({
    _id: req.params.id,
    corporateId: req.user.corporateId,
    requestStatus: { $in: ["pending_approval", "manager_approved"] },
  });

  if (!bookingRequest) {
    throw new ApiError(404, "Hotel request not found or already processed");
  }

  const newApprover = await User.findById(secondApproverId);
  if (!newApprover) {
    throw new ApiError(404, "Second approver not found");
  }

  bookingRequest.requestStatus = "pending_second_approval";
  bookingRequest.secondApprover = {
    userId: newApprover._id,
    email: newApprover.email,
    name: `${newApprover.name?.firstName || ""} ${newApprover.name?.lastName || ""}`.trim(),
    role: newApprover.role,
    transferRemark: remark,
    transferredAt: new Date(),
  };

  await bookingRequest.save();

  // ── Notify Second Approver: booking transferred ─────────────
  const _hotelRequester = await User.findById(bookingRequest.userId).select('name email').lean();
  const _transferredByName = req.user.name?.firstName
    ? `${req.user.name.firstName} ${req.user.name.lastName || ''}`.trim()
    : req.user.name || 'Admin';

  notify(EVENTS.BOOKING_TRANSFERRED, {
    secondApproverId: newApprover._id,
    secondApproverEmail: newApprover.email,
    secondApproverName: newApprover.name?.firstName || 'Approver',
    employeeName: _hotelRequester?.name?.firstName || 'Employee',
    transferredByName: _transferredByName,
    corporateId: bookingRequest.corporateId,
    orderId: bookingRequest.orderId || bookingRequest.bookingReference,
    bookingType: 'hotel',
    amount: bookingRequest.pricingSnapshot?.totalAmount || bookingRequest.bookingSnapshot?.amount || 0,
    relatedId: bookingRequest._id,
  });

  res.status(200).json(
    new ApiResponse(
      200,
      bookingRequest,
      "Hotel booking request transferred successfully"
    )
  );
});

/* ==============================================================
   VALIDATE FLIGHT APPROVAL (AGENCY BALANCE + WALLET/CREDIT + FARE QUOTE)
============================================================== */
exports.validateFlightApproval = asyncHandler(async (req, res) => {
  const bookingRequest = await BookingRequest.findOne({
    _id: req.params.id,
    corporateId: req.user.corporateId,
    requestStatus: { $in: ["pending_approval", "manager_approved", "pending_second_approval"] },
  });

  if (!bookingRequest) {
    throw new ApiError(404, "Booking request not found or already processed");
  }

  const isSecondApprover =
    bookingRequest.requestStatus === "pending_second_approval" &&
    bookingRequest.secondApprover?.userId?.toString() === req.user._id.toString();

  if (!["travel-admin", "manager"].includes(req.user.role) && !isSecondApprover) {
    throw new ApiError(403, "You are not authorized to validate this request");
  }

  const corporate = await Corporate.findById(req.user.corporateId);
  if (!corporate) {
    throw new ApiError(404, "Corporate account not found");
  }

  const snapshot = bookingRequest.bookingSnapshot;
  const isRoundTrip = snapshot.sectors && snapshot.sectors.length === 2;
  const fareResultInit = bookingRequest.flightRequest?.fareQuote?.Results?.[0];
  const oldPrice = isRoundTrip
    ? (bookingRequest.pricingSnapshot?.totalAmount || 0)
    : (fareResultInit?.Fare?.PublishedFare || bookingRequest.pricingSnapshot?.totalAmount || 0);

  let errorMessages = [];

  // 1. Check Agency Balance
  const env = process.env.TBO_ENV || "live";
  try {
    const balance = await getAgencyBalance(env);
    if (balance.availableBalance < oldPrice) {
      errorMessages.push(`Insufficient agency balance. Available ₹${balance.availableBalance}, Required ₹${oldPrice}`);
    }
  } catch (err) {
    errorMessages.push("Failed to fetch agency balance.");
  }

  // 2. Check Corporate Wallet / Credit Limit
  if (corporate.classification === "prepaid") {
    if ((corporate.walletBalance || 0) < oldPrice) {
      errorMessages.push(`Insufficient corporate wallet balance. Available ₹${corporate.walletBalance || 0}, Required ₹${oldPrice}`);
    }
  } else if (corporate.classification === "postpaid") {
    const availableCredit = (corporate.creditLimit || 0) - (corporate.currentCredit || 0);
    if (availableCredit < oldPrice) {
      errorMessages.push(`Credit limit exceeded. Available ₹${availableCredit}, Required ₹${oldPrice}`);
    }
  }

  // 3. Re-validate Price via FareQuote
  let newPrice = oldPrice;
  let priceUpdated = false;

  try {
    const traceId = bookingRequest.flightRequest.traceId;
    const resultIndex = bookingRequest.flightRequest.resultIndex;
    
    // Call TBO fare quote
    const fareQuoteResponse = await flightService.getFareQuote(
      traceId,
      resultIndex,
      bookingRequest.corporateId,
      bookingRequest._id
    );

    if (fareQuoteResponse?.Response?.Results) {
      const results = fareQuoteResponse.Response.Results;
      const fareResult = results.IsLCC ? results : (results.Results ? results.Results[0] : results); 
      
      const publishedFare = fareResult?.Fare?.PublishedFare || 0;
      if (publishedFare > 0) {
        newPrice = isRoundTrip ? (bookingRequest.pricingSnapshot?.totalAmount || 0) : publishedFare;
        
        // Usually fare quote returns published fare
        newPrice = publishedFare;
        
        if (newPrice !== oldPrice && Math.abs(newPrice - oldPrice) > 1) {
          priceUpdated = true;
          // Update the DB with new price so that subsequent approval uses the new price
          if (bookingRequest.flightRequest.fareQuote && bookingRequest.flightRequest.fareQuote.Results) {
            bookingRequest.flightRequest.fareQuote = fareQuoteResponse;
          }
          if (!isRoundTrip) {
            bookingRequest.pricingSnapshot.totalAmount = newPrice;
          }
          await bookingRequest.save();
        }
      }
    }
  } catch (err) {
    logger.error("Fare Quote validation failed", { error: err.message });
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        isValid: errorMessages.length === 0,
        priceUpdated,
        oldPrice,
        newPrice,
        errorMessages
      },
      "Validation completed"
    )
  );
});

/* ==============================================================
   VALIDATE HOTEL APPROVAL
============================================================== */
exports.validateHotelApproval = asyncHandler(async (req, res) => {
  const bookingRequest = await HotelBookingRequest.findOne({
    _id: req.params.id,
    corporateId: req.user.corporateId,
    requestStatus: { $in: ["pending_approval", "manager_approved", "pending_second_approval"] },
  });

  if (!bookingRequest) {
    throw new ApiError(404, "Hotel request not found or already processed");
  }

  const isSecondApprover =
    bookingRequest.requestStatus === "pending_second_approval" &&
    bookingRequest.secondApprover?.userId?.toString() === req.user._id.toString();

  if (!["travel-admin", "manager"].includes(req.user.role) && !isSecondApprover) {
    throw new ApiError(403, "You are not authorized to validate this request");
  }

  const corporate = await Corporate.findById(req.user.corporateId);
  if (!corporate) {
    throw new ApiError(404, "Corporate account not found");
  }

  const oldPrice = bookingRequest.pricingSnapshot?.totalAmount || bookingRequest.bookingSnapshot?.amount || 0;
  let errorMessages = [];

  // 1. Check Agency Balance
  const env = process.env.TBO_ENV || "live";
  try {
    const balance = await getAgencyBalance(env);
    if (balance.availableBalance < oldPrice) {
      errorMessages.push(`Insufficient agency balance. Available ₹${balance.availableBalance}, Required ₹${oldPrice}`);
    }
  } catch (err) {
    errorMessages.push("Failed to fetch agency balance.");
  }

  // 2. Check Corporate Wallet / Credit Limit
  if (corporate.classification === "prepaid") {
    if ((corporate.walletBalance || 0) < oldPrice) {
      errorMessages.push(`Insufficient corporate wallet balance. Available ₹${corporate.walletBalance || 0}, Required ₹${oldPrice}`);
    }
  } else if (corporate.classification === "postpaid") {
    const availableCredit = (corporate.creditLimit || 0) - (corporate.currentCredit || 0);
    if (availableCredit < oldPrice) {
      errorMessages.push(`Credit limit exceeded. Available ₹${availableCredit}, Required ₹${oldPrice}`);
    }
  }

  // 3. Re-validate Price via PreBook
  let newPrice = oldPrice;
  let priceUpdated = false;

  try {
    const selectedRooms = bookingRequest.hotelRequest?.allRooms || [];
    const bookingCodes = selectedRooms.map((r) => r.bookingCode).filter(Boolean);

    if (bookingCodes.length > 0) {
      const preBookResp = await hotelService.preBookHotel({
        BookingCode: bookingCodes.join(","),
        EndUserIp: process.env.TBO_END_USER_IP,
      });

      const isPriceChanged = preBookResp?.HotelResult?.[0]?.IsPriceChanged || false;
      const updatedFare = preBookResp?.HotelResult?.[0]?.Rooms?.[0]?.TotalFare;

      if (isPriceChanged && updatedFare) {
        priceUpdated = true;
        newPrice = updatedFare;

        bookingRequest.hotelRequest.preBookResponse = preBookResp;
        bookingRequest.pricingSnapshot.totalAmount = newPrice;
        bookingRequest.bookingSnapshot.amount = newPrice;
        await bookingRequest.save();
      }
    }
  } catch (err) {
    logger.error("Hotel PreBook validation failed", { error: err.message });
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        isValid: errorMessages.length === 0,
        priceUpdated,
        oldPrice,
        newPrice,
        errorMessages
      },
      "Validation completed"
    )
  );
});
