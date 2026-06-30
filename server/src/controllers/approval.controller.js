const mongoose = require("mongoose");
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
const cancellationExecution = require("../services/cancellationExecution.service");
const amendmentService = require("../services/tektravels/flightAmendment.service");

// @desc    Get booking requests by status (now includes cancellations & reissues)
// @route   GET /api/v1/approvals
// @access  Private (Travel Admin)
exports.getAllApprovals = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status = "pending_approval" } = req.query;

  if (req.user.role !== "travel-admin") {
    throw new ApiError(403, "Only admin can view requests");
  }

  const skip = (Number(page) - 1) * Number(limit);
  const corporateId = req.user.corporateId;

  const statuses = status === "pending_approval"
    ? ["pending_approval", "pending_second_approval", "manager_approved"]
    : [status];

  const unifiedPendingStatuses = ["PENDING_MANAGER_APPROVAL", "PENDING_TRAVEL_ADMIN_APPROVAL", "PENDING_ADMIN_APPROVAL"];

  // 🔹 Fetch flight booking requests
  const flightRequests = await BookingRequest.find({
    corporateId,
    requestStatus: { $in: statuses },
  })
    .populate("userId", "name email")
    .populate("approvedBy", "name email")
    .populate("rejectedBy", "name email")
    .populate("approverId", "name email role");

  // 🔹 Fetch hotel requests
  const hotelRequests = await HotelBookingRequest.find({
    corporateId,
    requestStatus: { $in: statuses },
  })
    .populate("userId", "name email")
    .populate("approvedBy", "name email")
    .populate("rejectedBy", "name email")
    .populate("approverId", "name email role");

  // 🔹 Fetch cancellation queries (unified approval)
  const CancellationQuery = require("../models/CancellationQuery");
  const cancellationQueries = await CancellationQuery.find({
    corporateId,
    requestStatus: { $in: unifiedPendingStatuses },
  }).lean();

  // 🔹 Fetch flight reissue requests (legacy)
  const FlightReissue = require("../models/FlightReissueRequest");
  const reissueRequests = await FlightReissue.find({
    "corporate.companyId": corporateId,
    requestStatus: { $in: unifiedPendingStatuses },
  }).lean();

  // 🔹 Fetch offline reissue requests
  let offlineReissues = [];
  try {
    const OfflineReissueRequest = require("../modules/servicing/reissue/schemas/OfflineReissueRequest.schema");
    offlineReissues = await OfflineReissueRequest.find({
      corporateId,
      requestStatus: { $in: unifiedPendingStatuses },
    }).lean();
  } catch (e) { /* model not available */ }

  // 🔹 Fetch online reissue requests (module)
  let onlineReissues = [];
  try {
    const ReissueRequest = require("../modules/servicing/reissue/schemas/ReissueRequest.schema");
    onlineReissues = await ReissueRequest.find({
      corporateId,
      requestStatus: { $in: unifiedPendingStatuses },
    }).lean();
  } catch (e) { /* model not available */ }

  // 🔥 Add type discriminator
  const taggedFlights = flightRequests.map((r) => ({
    ...r.toObject(),
    orderId: r.orderId || "N/A",
    bookingType: "flight",
    _requestModel: "BookingRequest",
  }));

  const taggedHotels = hotelRequests.map((r) => ({
    ...r.toObject(),
    orderId: r.orderId || "N/A",
    bookingType: "hotel",
    _requestModel: "HotelBookingRequest",
  }));

  const tagModel = (list, modelType) =>
    list.map((r) => ({ ...r, _requestModel: modelType, bookingType: modelType === "cancellation" ? "cancellation" : "reissue" }));

  // 🔹 Merge + sort all
  const allRequests = [
    ...taggedFlights,
    ...taggedHotels,
    ...tagModel(cancellationQueries, "cancellation"),
    ...tagModel(reissueRequests, "reissue"),
    ...tagModel(offlineReissues, "offline_reissue"),
    ...tagModel(onlineReissues, "online_reissue"),
  ].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

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
      "All approval requests fetched successfully",
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

    // 🔥 Populate unified approval field
    bookingRequest.managerId = req.user._id;
    bookingRequest.approvalStage = "MANAGER";
    bookingRequest.approvalAudit = bookingRequest.approvalAudit || [];
    bookingRequest.approvalAudit.push({
      action: "MANAGER_APPROVED",
      user: req.user._id,
      role: "manager",
      timestamp: new Date(),
      remarks: comments || "Booking approved by manager",
    });

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

  // 🔥 Populate unified approval fields
  if (!bookingRequest.managerId) {
    // If no manager approved (e.g. manager-skip flow), find from approverId
    bookingRequest.managerId = bookingRequest.managerApproval?.approvedBy || null;
  }
  bookingRequest.travelAdminId = req.user._id;
  bookingRequest.approvalStage = "EXECUTED";
  bookingRequest.travadminApprover = {
    userId: req.user._id,
    email: req.user.email,
    name: req.user.name?.firstName
      ? `${req.user.name.firstName} ${req.user.name.lastName || ''}`.trim()
      : req.user.name || '',
    role: req.user.role,
  };
  bookingRequest.approvalAudit = bookingRequest.approvalAudit || [];
  bookingRequest.approvalAudit.push({
    action: "TRAVEL_ADMIN_APPROVED",
    user: req.user._id,
    role: "travel-admin",
    timestamp: new Date(),
    remarks: comments || "Booking fully approved",
  });

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
  });

  if (!bookingRequest) {
    throw new ApiError(404, "Booking request not found or already processed");
  }

  // Terminal states
  const terminalStatuses = new Set(["approved", "rejected"]);
  if (terminalStatuses.has(String(bookingRequest.requestStatus))) {
    throw new ApiError(409, `Request already ${bookingRequest.requestStatus}`);
  }

  const stage = bookingRequest.approvalStage;

  const managerId = bookingRequest.approverId?.toString() || bookingRequest.managerId?.toString();
  const travelAdminId = bookingRequest.travelAdminId?.toString();
  const configuredApproverId = bookingRequest.travadminApprover?.userId?.toString();

  const isOwnerManager =
    stage === "MANAGER" && managerId && managerId === req.user._id.toString();

  const isOwnerTravelAdmin =
    stage === "TRAVEL_ADMIN" && travelAdminId && travelAdminId === req.user._id.toString();

  const isOwnerConfiguredApprover =
    stage === "TRAVEL_ADMIN_APPROVER" &&
    configuredApproverId &&
    configuredApproverId === req.user._id.toString();

  const isSecondApprover =
    bookingRequest.requestStatus === "pending_second_approval" &&
    bookingRequest.secondApprover?.userId?.toString() === req.user._id.toString();

  // Manager must be verified
  if (req.user.role === "manager" && req.user.managerRequestStatus !== "approved") {
    throw new ApiError(403, "Your manager account is pending travel-admin verification. You cannot reject bookings yet.");
  }

  // Block explicit cross-stage actions
  if (req.user.role === "travel-admin" && stage === "MANAGER") {
    throw new ApiError(403, "Travel admin cannot reject manager-stage requests");
  }

  if (req.user.role === "manager" && (stage === "TRAVEL_ADMIN" || stage === "TRAVEL_ADMIN_APPROVER")) {
    throw new ApiError(403, "Managers cannot act on travel-admin/configured-approver stages");
  }

  const isStageAllowed =
    isOwnerManager ||
    isOwnerTravelAdmin ||
    isOwnerConfiguredApprover ||
    isSecondApprover;

  if (!isStageAllowed) {
    throw new ApiError(403, "Not authorized for this approval stage");
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

    // 🔥 Populate unified approval field
    bookingRequest.managerId = req.user._id;
    bookingRequest.approvalStage = "MANAGER";
    bookingRequest.approvalAudit = bookingRequest.approvalAudit || [];
    bookingRequest.approvalAudit.push({
      action: "MANAGER_APPROVED",
      user: req.user._id,
      role: "manager",
      timestamp: new Date(),
      remarks: comments || "Hotel booking approved by manager",
    });

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

  // 🔥 Populate unified approval fields
  if (!bookingRequest.managerId) {
    bookingRequest.managerId = bookingRequest.managerApproval?.approvedBy || null;
  }
  bookingRequest.travelAdminId = req.user._id;
  bookingRequest.approvalStage = "EXECUTED";
  bookingRequest.travadminApprover = {
    userId: req.user._id,
    email: req.user.email,
    name: req.user.name?.firstName
      ? `${req.user.name.firstName} ${req.user.name.lastName || ''}`.trim()
      : req.user.name || '',
    role: req.user.role,
  };
  bookingRequest.approvalAudit = bookingRequest.approvalAudit || [];
  bookingRequest.approvalAudit.push({
    action: "TRAVEL_ADMIN_APPROVED",
    user: req.user._id,
    role: "travel-admin",
    timestamp: new Date(),
    remarks: comments || "Hotel booking fully approved",
  });

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

/* ======================================================
   UNIFIED APPROVAL: CANCELLATION & REISSUE REQUESTS
   Supports: CancellationQuery, FlightReissueRequest, OfflineReissueRequest
   Flow: MANAGER → TRAVEL_ADMIN → EXECUTED
====================================================== */

const CancellationQuery = require("../models/CancellationQuery");
const FlightReissue = require("../models/FlightReissueRequest");
const roundRobinAssignmentService = require("../modules/ops/services/roundRobinAssignment.service");
const reissueAssignmentService = require("../modules/servicing/reissue/services/reissueAssignment.service");

/**
 * Resolve the correct model by modelType.
 */
const resolveModel = (modelType) => {
  switch (modelType) {
    case "cancellation":
      return CancellationQuery;
    case "reissue":
      return FlightReissue;
    case "offline_reissue": {
      try {
        return require("../modules/servicing/reissue/schemas/OfflineReissueRequest.schema");
      } catch (e) {
        return null;
      }
    }
    case "online_reissue": {
      try {
        return require("../modules/servicing/reissue/schemas/ReissueRequest.schema");
      } catch (e) {
        return null;
      }
    }
    default:
      return null;
  }
};

/**
 * Helper: Push audit trail entry.
 */
const pushAudit = (doc, action, user, role, remarks = "") => {
  if (!doc.approvalAudit) doc.approvalAudit = [];
  doc.approvalAudit.push({
    action,
    user: user?._id || user,
    role: role || "system",
    timestamp: new Date(),
    remarks,
  });
};

// @desc    Get pending cancellation & reissue approvals (Travel Admin) - ONLY TRAVEL_ADMIN stage
// @route   GET /api/v1/approvals/cancellation-reissue
// @access  Private (Travel Admin)
exports.getAllCancellationReissueApprovals = asyncHandler(async (req, res) => {
  if (req.user.role !== "travel-admin") {
    throw new ApiError(403, "Only admin can view requests");
  }

  const corporateId = req.user.corporateId;
  const userId = req.user._id;

  // Travel Admin queue: approvalStage in PENDING_PARALLEL_APPROVAL, TRAVEL_ADMIN, MANAGER_APPROVED
  // Also shows items where Travel Admin is direct approver (no manager)
  const cancellationQueries = await CancellationQuery.find({
    corporateId,
    travelAdminId: userId,
    approvalStage: { $in: ["TRAVEL_ADMIN", "PENDING_PARALLEL_APPROVAL", "MANAGER_APPROVED"] },
    requestStatus: { $in: ["PENDING_TRAVEL_ADMIN_APPROVAL", "PENDING_MANAGER_APPROVAL"] },
  }).lean();

  const reissueRequests = await FlightReissue.find({
    "corporate.companyId": corporateId,
    travelAdminId: userId,
    approvalStage: { $in: ["TRAVEL_ADMIN", "PENDING_PARALLEL_APPROVAL", "MANAGER_APPROVED"] },
    requestStatus: { $in: ["PENDING_TRAVEL_ADMIN_APPROVAL", "PENDING_MANAGER_APPROVAL"] },
  }).lean();

  let offlineReissues = [];
  try {
    const OfflineReissueRequest = require("../modules/servicing/reissue/schemas/OfflineReissueRequest.schema");
    offlineReissues = await OfflineReissueRequest.find({
      corporateId,
      travelAdminId: userId,
      approvalStage: { $in: ["TRAVEL_ADMIN", "PENDING_PARALLEL_APPROVAL", "MANAGER_APPROVED"] },
      requestStatus: { $in: ["PENDING_TRAVEL_ADMIN_APPROVAL", "PENDING_MANAGER_APPROVAL"] },
    }).lean();
  } catch (e) { /* model not available */ }

  let onlineReissues = [];
  try {
    const ReissueRequest = require("../modules/servicing/reissue/schemas/ReissueRequest.schema");
    onlineReissues = await ReissueRequest.find({
      corporateId,
      travelAdminId: userId,
      approvalStage: { $in: ["TRAVEL_ADMIN", "PENDING_PARALLEL_APPROVAL", "MANAGER_APPROVED"] },
      requestStatus: { $in: ["PENDING_TRAVEL_ADMIN_APPROVAL", "PENDING_MANAGER_APPROVAL"] },
    }).lean();
  } catch (e) { /* model not available */ }

  const tagModel = (list, modelType) =>
    list.map((r) => ({ ...r, _modelType: modelType }));

  const all = [
    ...tagModel(cancellationQueries, "cancellation"),
    ...tagModel(reissueRequests, "reissue"),
    ...tagModel(offlineReissues, "offline_reissue"),
    ...tagModel(onlineReissues, "online_reissue"),
  ].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  res.status(200).json(
    new ApiResponse(200, {
      approvals: all,
      pagination: { total: all.length, page: 1, pages: 1 },
    }, "Cancellation & reissue approvals fetched"),
  );
});

// @desc    Get configured approver pending requests (ONLY TRAVEL_ADMIN_APPROVER stage)
// @route   GET /api/v1/approvals/configured-approver/cancellation-reissue
// @access  Private (Configured Approver)
exports.getConfiguredApproverRequests = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const cancellationQueries = await CancellationQuery.find({
    "travadminApprover.userId": userId,
    approvalStage: "TRAVEL_ADMIN_APPROVER",
    requestStatus: "PENDING_ADMIN_APPROVAL",
  }).lean();

  const reissueRequests = await FlightReissue.find({
    "travadminApprover.userId": userId,
    approvalStage: "TRAVEL_ADMIN_APPROVER",
    requestStatus: "PENDING_ADMIN_APPROVAL",
  }).lean();

  let offlineReissues = [];
  try {
    const OfflineReissueRequest = require("../modules/servicing/reissue/schemas/OfflineReissueRequest.schema");
    offlineReissues = await OfflineReissueRequest.find({
      "travadminApprover.userId": userId,
      approvalStage: "TRAVEL_ADMIN_APPROVER",
      requestStatus: "PENDING_ADMIN_APPROVAL",
    }).lean();
  } catch (e) { /* model not available */ }

  let onlineReissues = [];
  try {
    const ReissueRequest = require("../modules/servicing/reissue/schemas/ReissueRequest.schema");
    onlineReissues = await ReissueRequest.find({
      "travadminApprover.userId": userId,
      approvalStage: "TRAVEL_ADMIN_APPROVER",
      requestStatus: "PENDING_ADMIN_APPROVAL",
    }).lean();
  } catch (e) { /* model not available */ }

  const tagModel = (list, modelType) =>
    list.map((r) => ({ ...r, _modelType: modelType }));

  const all = [
    ...tagModel(cancellationQueries, "cancellation"),
    ...tagModel(reissueRequests, "reissue"),
    ...tagModel(offlineReissues, "offline_reissue"),
    ...tagModel(onlineReissues, "online_reissue"),
  ].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  res.status(200).json(
    new ApiResponse(200, {
      approvals: all,
      pagination: { total: all.length, page: 1, pages: 1 },
    }, "Configured approver requests fetched"),
  );
});

// @desc    Approve cancellation or reissue request
// @route   POST /api/v1/approvals/cancellation-reissue/:modelType/:id/approve
// @access  Private (Manager / Travel Admin)
exports.approveCancellationReissueRequest = asyncHandler(async (req, res) => {
  const { modelType, id } = req.params;
  const { comments = "" } = req.body;

  const Model = resolveModel(modelType);
  if (!Model) throw new ApiError(400, "Invalid model type");

  const doc = await Model.findById(id);
  if (!doc) throw new ApiError(404, "Request not found");

  if (doc.requestStatus === "approved" || doc.requestStatus === "rejected") {
    throw new ApiError(409, `Request already ${doc.requestStatus}`);
  }

  const stage = doc.approvalStage;
  const isManager =
    (stage === "MANAGER" || stage === "PENDING_PARALLEL_APPROVAL") &&
    doc.managerId?.toString() === req.user._id.toString() &&
    req.user.role === "manager";
  const isTravelAdmin =
    (stage === "TRAVEL_ADMIN" || stage === "PENDING_PARALLEL_APPROVAL" || stage === "MANAGER_APPROVED") &&
    doc.travelAdminId?.toString() === req.user._id.toString() &&
    req.user.role === "travel-admin";
  const isConfiguredApprover =
    stage === "TRAVEL_ADMIN_APPROVER" &&
    doc.travadminApprover?.userId?.toString() === req.user._id.toString();

  const isAllowed = isManager || isTravelAdmin || isConfiguredApprover;
  if (!isAllowed) {
    throw new ApiError(403, "Not authorized for this approval stage");
  }

  if (req.user.role === "manager" && req.user.managerRequestStatus !== "approved") {
    throw new ApiError(403, "Your manager account is pending verification.");
  }

  // ── Travel Admin approval (final authority) ──
  if (isTravelAdmin) {
    doc.travelAdminApprovedAt = new Date();
    doc.managerApprovedAt = doc.managerApprovedAt || null;
    doc.approvalStage = "EXECUTED";
    doc.requestStatus = "approved";
    pushAudit(doc, "TRAVEL_ADMIN_APPROVED", req.user, "travel-admin", comments);
  }
  // ── Manager approval ──
  else if (isManager && stage === "PENDING_PARALLEL_APPROVAL") {
    doc.managerApprovedAt = new Date();
    doc.approvalStage = "MANAGER_APPROVED";
    doc.requestStatus = "PENDING_TRAVEL_ADMIN_APPROVAL";
    pushAudit(doc, "MANAGER_APPROVED", req.user, "manager", comments);
  }
  else if (isManager && stage === "MANAGER") {
    doc.managerApprovedAt = new Date();
    doc.approvalStage = "TRAVEL_ADMIN";
    doc.requestStatus = "PENDING_TRAVEL_ADMIN_APPROVAL";
    pushAudit(doc, "MANAGER_APPROVED", req.user, "manager", comments);
  }
  else if (isConfiguredApprover) {
    doc.approvalStage = "EXECUTED";
    doc.requestStatus = "approved";
    pushAudit(doc, "CONFIGURED_APPROVER_APPROVED", req.user, "travel-admin", comments);
  }

  if (doc.logs && Array.isArray(doc.logs)) {
    doc.logs.push({
      action: doc.requestStatus === "approved" ? "APPROVED" : "MANAGER_APPROVED",
      by: req.user.name || "Approver",
      message: comments || `Approved at ${stage} stage`,
    });
  }

  await doc.save();

  // ── Notify relevant users ───────────────────────────────
  try {
    const isManagerApproved =
      (stage === "MANAGER" && doc.approvalStage === "TRAVEL_ADMIN") ||
      (stage === "PENDING_PARALLEL_APPROVAL" && doc.approvalStage === "MANAGER_APPROVED");

    if (isManagerApproved) {
      // Manager approved → notify travel admin
      notify(EVENTS.BOOKING_APPROVED, {
        employeeId: doc.user?.id,
        employeeEmail: doc.user?.email,
        employeeName: doc.user?.name || "Employee",
        corporateId: doc.corporateId,
        orderId: doc.bookingReference,
        bookingType: doc.bookingType || "flight",
        approverName: req.user.name?.firstName
          ? `${req.user.name.firstName} ${req.user.name.lastName || ""}`.trim()
          : req.user.name || "Approver",
        approverRole: req.user.role,
        relatedId: doc._id,
        requesterId: doc.user?.id,
        requesterEmail: doc.user?.email,
      });
    } else if (
      doc.approvalStage === "EXECUTED" &&
      (req.user.role === "travel-admin" || req.user.role === "configured-approver")
    ) {
      // Travel Admin / Configured Approver final approval → notify requester
      const eventType =
        modelType === "cancellation"
          ? EVENTS.BOOKING_CANCELLED
          : EVENTS.BOOKING_REISSUED;
      notify(eventType, {
        employeeId: doc.user?.id,
        employeeEmail: doc.user?.email,
        employeeName: doc.user?.name || "Employee",
        corporateId: doc.corporateId,
        orderId: doc.bookingReference,
        bookingType: doc.bookingType || "flight",
        approverName: req.user.name?.firstName
          ? `${req.user.name.firstName} ${req.user.name.lastName || ""}`.trim()
          : req.user.name || "Approver",
        approverRole: req.user.role,
        relatedId: doc._id,
        requesterId: doc.user?.id,
        requesterEmail: doc.user?.email,
      });
    }
  } catch (notifyErr) {
    console.error(`[NOTIFICATION] Failed to send approval notification:`, notifyErr.message);
  }

  // 🔥 Execute provider action when stage reaches EXECUTED
  if (doc.approvalStage === "EXECUTED" && doc.requestStatus === "approved") {
    // 🔒 IDEMPOTENCY CHECK: Skip if provider execution already completed
    if (doc.providerExecutionStatus === "COMPLETED") {
      console.log(`[IDEMPOTENCY] ${modelType} ${id} already executed, skipping`);
      return res.status(200).json(
        new ApiResponse(200, doc, "Request already executed"),
      );
    }
    if (doc.providerExecutionStatus === "OPS_ASSIGNED") {
      console.log(`[IDEMPOTENCY] ${modelType} ${id} already assigned to Ops, skipping`);
      return res.status(200).json(
        new ApiResponse(200, doc, "Request already assigned to Ops"),
      );
    }

    pushAudit(doc, "EXECUTED", req.user, "system", "Provider execution initiated");

    // Use MongoDB transaction for atomic status updates
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      await doc.save({ session });

      // Execute provider action (outside transaction — external API call)
      await session.commitTransaction();

      if (modelType === "cancellation") {
        // ── Determine if online cancellation is available ──────────────
        // Use stored isOnlineCancellation flag (set at query creation time)
        // Falls back to API check for backward compatibility
        let supportsOnlineCancellation = doc.isOnlineCancellation === true && doc.approvalType === "ONLINE";

        if (!supportsOnlineCancellation && doc.bookingType === "hotel") {
          const hotelDoc = await HotelBookingRequest.findById(doc.bookingId)
            .select("bookingResult")
            .lean();
          const providerBookingId =
            hotelDoc?.bookingResult?.providerResponse?.BookResult?.BookingId;
          supportsOnlineCancellation = !!providerBookingId;
        } else if (!supportsOnlineCancellation) {
          supportsOnlineCancellation = await cancellationExecution.isOnlineCancellationAvailable(doc.bookingId);
        }

          if (supportsOnlineCancellation) {
            // ⚡ ONLINE: Execute via provider API
            if (doc.bookingType === "hotel") {
              await cancellationExecution.executeHotelCancellation({
                bookingId: doc.bookingId,
                cancellationQueryId: doc._id,
                remarks: "Hotel cancelled via approval flow",
                userId: req.user?._id,
              });
            } else {
              const isPartial = doc.segments && Array.isArray(doc.segments) && doc.segments.length > 0;
              if (isPartial) {
                await cancellationExecution.executePartialCancellation({
                  bookingId: doc.bookingId,
                  segments: doc.segments.map(s => ({ origin: s.origin || s.Origin, destination: s.destination || s.Destination })),
                  cancellationQueryId: doc._id,
                  remarks: "Partial cancelled via approval flow",
                  userId: req.user?._id,
                });
              } else {
                await cancellationExecution.executeFullCancellation({
                  bookingId: doc.bookingId,
                  cancellationQueryId: doc._id,
                  remarks: "Cancelled via approval flow",
                  userId: req.user?._id,
                  userName: req.user?.name,
                });
              }
            }
            doc.providerExecutionStatus = "COMPLETED";
            doc.isOnlineCancellation = true;

            // Log Ops-is-not-needed audit
            doc.logs = doc.logs || [];
            doc.logs.push({
              action: "ONLINE_CANCELLATION",
              by: req.user.name || "System",
              message: "Cancellation executed via provider API — Ops not involved",
            });
          } else {
          // 🔄 OFFLINE: Assign to Ops team for manual processing
          doc.logs = doc.logs || [];
          doc.logs.push({
            action: "OPS_ASSIGNMENT_INITIATED",
            by: req.user.name || "System",
            message: "Online cancellation not available — assigning to Ops team",
          });

          try {
            const assignmentResult = await roundRobinAssignmentService.autoAssignRequest({
              request: doc,
              requestType: "cancellation",
              assignedBy: req.user?._id || null,
              reason: "Online cancellation not available — assigned to Ops for manual processing",
            });

            if (assignmentResult) {
              doc.providerExecutionStatus = "OPS_ASSIGNED";
              pushAudit(doc, "OPS_ASSIGNED", assignmentResult.agent._id, "OPS", `Assigned to ${assignmentResult.agent.name} via round-robin`);
              doc.logs.push({
                action: "AUTO_ASSIGNED",
                by: "SYSTEM",
                message: `Cancellation assigned to ${assignmentResult.agent.name} (Ops)`,
              });
            } else {
              doc.autoAssignmentAttempted = true;
              doc.assignmentFailureReason = "NO_ELIGIBLE_OPS";
              doc.providerExecutionStatus = "FAILED";
              doc.logs.push({
                action: "ASSIGNMENT_FAILED",
                by: "SYSTEM",
                message: "No eligible Ops member available for assignment",
              });
            }
          } catch (assignError) {
            console.error(`Ops assignment failed for cancellation ${id}:`, assignError.message);
            doc.providerExecutionStatus = "FAILED";
            doc.assignmentFailureReason = assignError.message;
            doc.logs = doc.logs || [];
            doc.logs.push({
              action: "ASSIGNMENT_FAILED",
              by: "SYSTEM",
              message: `Ops assignment error: ${assignError.message}`,
            });
          }
        }
      } else if (modelType === "offline_reissue") {
        // ── Offline Reissue: Assign to Ops via round robin ──
        try {
          const assignmentResult = await reissueAssignmentService.assignOfflineReissue({
            request: doc,
            mode: "ROUND_ROBIN",
            remarks: "Offline reissue approved — assigning to Ops",
            persistRequest: false,
            notify: true,
          });

          if (assignmentResult.assignmentAvailable) {
            pushAudit(doc, "AUTO_ASSIGNED", assignmentResult.assignedOpsMember, "OPS", "Assigned to Ops member via round robin");
            doc.logs = doc.logs || [];
            doc.logs.push({
              action: "AUTO_ASSIGNED",
              by: "SYSTEM",
              message: "Offline reissue assigned to Ops member via round robin",
            });
          } else {
            doc.autoAssignmentAttempted = true;
            doc.assignmentFailureReason = "NO_ELIGIBLE_OPS";
            doc.logs = doc.logs || [];
            doc.logs.push({
              action: "ASSIGNMENT_FAILED",
              by: "SYSTEM",
              message: "No eligible Ops member available for assignment",
            });
          }
        } catch (assignError) {
          console.error(`Offline reissue assignment failed for ${id}:`, assignError.message);
          doc.autoAssignmentAttempted = true;
          doc.assignmentFailureReason = assignError.message;
          doc.logs = doc.logs || [];
          doc.logs.push({
            action: "ASSIGNMENT_FAILED",
            by: "SYSTEM",
            message: `Ops assignment error: ${assignError.message}`,
          });
        }
      }

      // Reissue at EXECUTED — handled by the respective workflow service
      // Online reissue: confirmOnlineReissue() checks approvalStage === "EXECUTED"
      // Legacy FlightReissueRequest: executeReissue() checks approvalStage === "EXECUTED"

      await doc.save();
    } catch (execError) {
      console.error(`Provider execution failed for ${modelType} ${id}:`, execError.message);

      // Rollback transaction if still active
      try { await session.abortTransaction(); } catch (_) { /* ignore */ }

      // Set failure state — approvalStage stays EXECUTED, providerExecutionStatus = FAILED
      doc.providerExecutionStatus = "FAILED";
      pushAudit(doc, "EXECUTION_FAILED", req.user, "system", execError.message.slice(0, 200));
      await doc.save();
    } finally {
      session.endSession();
    }
  }

  res.status(200).json(
    new ApiResponse(200, doc, "Request approved successfully"),
  );
});

// @desc    Reject cancellation or reissue request
// @route   POST /api/v1/approvals/cancellation-reissue/:modelType/:id/reject
// @access  Private (Manager / Travel Admin / Configured Approver)
exports.rejectCancellationReissueRequest = asyncHandler(async (req, res) => {
  const { modelType, id } = req.params;
  const { comments } = req.body;

  if (!comments) throw new ApiError(400, "Rejection comments are required");

  const Model = resolveModel(modelType);
  if (!Model) throw new ApiError(400, "Invalid model type");

  const doc = await Model.findById(id);
  if (!doc) throw new ApiError(404, "Request not found");

  if (doc.requestStatus === "approved" || doc.requestStatus === "rejected") {
    throw new ApiError(409, `Request already ${doc.requestStatus}`);
  }

  const stage = doc.approvalStage;
  const isManager =
    (stage === "MANAGER" || stage === "PENDING_PARALLEL_APPROVAL") &&
    doc.managerId?.toString() === req.user._id.toString() &&
    req.user.role === "manager";
  const isTravelAdmin =
    (stage === "TRAVEL_ADMIN" || stage === "PENDING_PARALLEL_APPROVAL" || stage === "MANAGER_APPROVED") &&
    doc.travelAdminId?.toString() === req.user._id.toString() &&
    req.user.role === "travel-admin";
  const isConfiguredApprover =
    stage === "TRAVEL_ADMIN_APPROVER" &&
    doc.travadminApprover?.userId?.toString() === req.user._id.toString();

  const isAllowed = isManager || isTravelAdmin || isConfiguredApprover;
  if (!isAllowed) {
    throw new ApiError(403, "Not authorized for this approval stage");
  }

  if (req.user.role === "manager" && (stage === "TRAVEL_ADMIN" || stage === "TRAVEL_ADMIN_APPROVER" || stage === "MANAGER_APPROVED")) {
    throw new ApiError(403, "Managers cannot act on travel-admin/configured-approver stages");
  }

  let rejectAction, rejectRole;

  // ── Travel Admin rejection (immediate, final) ──
  if (isTravelAdmin) {
    doc.approvalStage = "REJECTED";
    doc.travelAdminApprovedAt = null;
    doc.requestStatus = "rejected";
    rejectAction = "TRAVEL_ADMIN_REJECTED";
    rejectRole = "travel-admin";
  }
  // ── Manager rejection (non-final, Travel Admin can override) ──
  else if (isManager) {
    // Don't change approvalStage or requestStatus — Travel Admin can still act
    rejectAction = "MANAGER_REJECTED";
    rejectRole = "manager";
  }
  else if (isConfiguredApprover) {
    doc.approvalStage = "REJECTED";
    doc.requestStatus = "rejected";
    rejectAction = "CONFIGURED_APPROVER_REJECTED";
    rejectRole = "travel-admin";
  }
  pushAudit(doc, rejectAction, req.user, rejectRole, comments);

  if (doc.logs && Array.isArray(doc.logs)) {
    doc.logs.push({
      action: "REJECTED",
      by: req.user.name || "Rejecter",
      message: comments,
    });
  }

  await doc.save();

  // ── Notify requester: request rejected ───────────────────
  try {
    notify(EVENTS.BOOKING_REJECTED, {
      employeeId: doc.user?.id,
      employeeEmail: doc.user?.email,
      employeeName: doc.user?.name || "Employee",
      corporateId: doc.corporateId,
      orderId: doc.bookingReference,
      bookingType: doc.bookingType || "flight",
      approverName: req.user.name?.firstName
        ? `${req.user.name.firstName} ${req.user.name.lastName || ""}`.trim()
        : req.user.name || "Admin",
      rejectionReason: comments,
      relatedId: doc._id,
    });
  } catch (notifyErr) {
    console.error(`[NOTIFICATION] Failed to send rejection notification:`, notifyErr.message);
  }

  res.status(200).json(
    new ApiResponse(200, doc, "Request rejected successfully"),
  );
});

// @desc    Transfer cancellation or reissue request (Travel Admin only)
// @route   POST /api/v1/approvals/cancellation-reissue/:modelType/:id/transfer
// @access  Private (Travel Admin)
exports.transferCancellationReissueRequest = asyncHandler(async (req, res) => {
  const { modelType, id } = req.params;
  const { secondApproverId, remark } = req.body;

  if (req.user.role !== "travel-admin") {
    throw new ApiError(403, "Only admin can transfer requests");
  }

  const Model = resolveModel(modelType);
  if (!Model) throw new ApiError(400, "Invalid model type");

  const doc = await Model.findById(id);
  if (!doc) throw new ApiError(404, "Request not found");

  if (doc.approvalStage !== "TRAVEL_ADMIN") {
    throw new ApiError(403, "Only travel-admin-stage requests can be transferred");
  }

  const newApprover = await User.findById(secondApproverId);
  if (!newApprover) throw new ApiError(404, "Second approver not found");

  doc.approvalStage = "TRAVEL_ADMIN_APPROVER";
  doc.requestStatus = "PENDING_ADMIN_APPROVAL";
  doc.travadminApprover = {
    userId: newApprover._id,
    email: newApprover.email,
    name: `${newApprover.name?.firstName || ""} ${newApprover.name?.lastName || ""}`.trim(),
    role: newApprover.role,
    transferRemark: remark,
    transferredAt: new Date(),
  };

  pushAudit(doc, "TRANSFERRED", req.user, "travel-admin", `Transferred to ${doc.travadminApprover.name}`);

  if (doc.logs && Array.isArray(doc.logs)) {
    doc.logs.push({
      action: "TRANSFERRED",
      by: req.user.name || "Admin",
      message: `Transferred to ${doc.travadminApprover.name}`,
    });
  }

  await doc.save();

  // ── Notify new approver: request transferred ─────────────
  try {
    notify(EVENTS.BOOKING_TRANSFERRED, {
      secondApproverId: newApprover._id,
      secondApproverEmail: newApprover.email,
      secondApproverName: newApprover.name?.firstName || "Approver",
      employeeName: doc.user?.name || "Employee",
      transferredByName: req.user.name?.firstName
        ? `${req.user.name.firstName} ${req.user.name.lastName || ""}`.trim()
        : req.user.name || "Admin",
      corporateId: doc.corporateId,
      orderId: doc.bookingReference,
      bookingType: doc.bookingType || "flight",
      amount: doc.bookingSnapshot?.totalFare || 0,
      relatedId: doc._id,
    });
  } catch (notifyErr) {
    console.error(`[NOTIFICATION] Failed to send transfer notification:`, notifyErr.message);
  }

  res.status(200).json(
    new ApiResponse(200, doc, "Request transferred successfully"),
  );
});

// @desc    Get manager's pending cancellation & reissue requests
// @route   GET /api/v1/approvals/manager/cancellation-reissue
// @access  Private (Manager)
exports.getManagerCancellationReissueRequests = asyncHandler(async (req, res) => {
  const managerId = req.user._id;

  // Manager queue: approvalStage in PENDING_PARALLEL_APPROVAL, MANAGER
  const cancellationQueries = await CancellationQuery.find({
    managerId,
    approvalStage: { $in: ["MANAGER", "PENDING_PARALLEL_APPROVAL"] },
    requestStatus: "PENDING_MANAGER_APPROVAL",
  }).lean();

  const reissueRequests = await FlightReissue.find({
    managerId,
    approvalStage: { $in: ["MANAGER", "PENDING_PARALLEL_APPROVAL"] },
    requestStatus: "PENDING_MANAGER_APPROVAL",
  }).lean();

  let offlineReissues = [];
  try {
    const OfflineReissueRequest = require("../modules/servicing/reissue/schemas/OfflineReissueRequest.schema");
    offlineReissues = await OfflineReissueRequest.find({
      managerId,
      approvalStage: { $in: ["MANAGER", "PENDING_PARALLEL_APPROVAL"] },
      requestStatus: "PENDING_MANAGER_APPROVAL",
    }).lean();
  } catch (e) { /* model not available */ }

  let onlineReissues = [];
  try {
    const ReissueRequest = require("../modules/servicing/reissue/schemas/ReissueRequest.schema");
    onlineReissues = await ReissueRequest.find({
      managerId,
      approvalStage: { $in: ["MANAGER", "PENDING_PARALLEL_APPROVAL"] },
      requestStatus: "PENDING_MANAGER_APPROVAL",
    }).lean();
  } catch (e) { /* model not available */ }

  const tagModel = (list, modelType) =>
    list.map((r) => ({ ...r, _modelType: modelType }));

  const all = [
    ...tagModel(cancellationQueries, "cancellation"),
    ...tagModel(reissueRequests, "reissue"),
    ...tagModel(offlineReissues, "offline_reissue"),
    ...tagModel(onlineReissues, "online_reissue"),
  ].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  res.status(200).json(
    new ApiResponse(200, {
      approvals: all,
      pagination: { total: all.length, page: 1, pages: 1 },
    }, "Manager cancellation & reissue requests fetched"),
  );
});
