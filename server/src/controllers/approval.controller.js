const Approval = require("../models/Approval");
const Booking = require("../models/Booking");
const HotelBookingRequest = require("../models/hotelBookingRequest.model");
const BookingIntent = require("../models/BookingIntent");
const BookingRequest = require("../models/BookingRequest");
const Corporate = require("../models/Corporate");
const User = require("../models/User");
const notificationService = require("../services/notification.service");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");

// @desc    Get booking requests by status
// @route   GET /api/v1/approvals
// @access  Private (Travel Admin)
exports.getAllApprovals = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status = "pending_approval" } = req.query;

  if (req.user.role !== "travel-admin") {
    throw new ApiError(403, "Only admin can view requests");
  }

  const skip = (Number(page) - 1) * Number(limit);

  const query = {
    corporateId: req.user.corporateId,
    requestStatus: status, // pending_approval | approved | rejected
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
  const taggedFlights = flightRequests.map((r) => ({
    ...r.toObject(),
    bookingType: "flight",
  }));

  const taggedHotels = hotelRequests.map((r) => ({
    ...r.toObject(),
    bookingType: "hotel",
  }));

  // 🔹 Merge + sort
  const allRequests = [...taggedFlights, ...taggedHotels].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  );

  // 🔹 Apply pagination AFTER merge
  const paginated = allRequests.slice(skip, skip + Number(limit));

  const total = allRequests.length;

  res.status(200).json(
    new ApiResponse(
      200,
      {
        approvals: paginated,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / limit),
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

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        bookingRequest,
        "Booking request fetched successfully",
      ),
    );
});

// @desc    Approve booking request
// @route   POST /api/v1/approvals/:id/approve
// @access  Private (Travel Admin)
exports.approveRequest = asyncHandler(async (req, res) => {
  const { comments = "" } = req.body;

  if (!["travel-admin", "manager"].includes(req.user.role)) {
    throw new ApiError(403, "Only admin/manager can approve requests");
  }

  // 🔹 NEW: Block pending managers
  if (req.user.role === "manager" && req.user.managerRequestStatus !== "approved") {
    throw new ApiError(403, "Your manager account is pending travel-admin verification. You cannot approve bookings yet.");
  }

  const bookingRequest = await BookingRequest.findOne({
    _id: req.params.id,
    corporateId: req.user.corporateId,
    requestStatus: "pending_approval",
  });

  if (!bookingRequest) {
    throw new ApiError(404, "Booking request not found or already processed");
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

  if (!["travel-admin", "manager"].includes(req.user.role)) {
    throw new ApiError(403, "Only admin/manager can approve requests");
  }

  // 🔹 NEW: Block pending managers
  if (req.user.role === "manager" && req.user.managerRequestStatus !== "approved") {
    throw new ApiError(403, "Your manager account is pending travel-admin verification. You cannot reject bookings yet.");
  }

  const bookingRequest = await BookingRequest.findOne({
    _id: req.params.id,
    corporateId: req.user.corporateId,
    requestStatus: "pending_approval",
  });

  if (!bookingRequest) {
    throw new ApiError(404, "Booking request not found or already processed");
  }

  bookingRequest.$locals.previousStatus = bookingRequest.requestStatus;

  bookingRequest.requestStatus = "rejected";
  bookingRequest.rejectedAt = new Date();
  bookingRequest.rejectedBy = req.user._id;
  bookingRequest.approverComments = comments;

  await bookingRequest.save();

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

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        bookingRequest,
        "Hotel booking request fetched successfully",
      ),
    );
});

// @desc    Approve HOTEL booking request
// @route   POST /api/v1/approvals/hotel/:id/approve
// @access  Private (Travel Admin)
exports.approveHotelRequest = asyncHandler(async (req, res) => {
  const { comments = "" } = req.body;

  if (!["travel-admin", "manager"].includes(req.user.role)) {
    throw new ApiError(403, "Only admin/manager can approve requests");
  }

  // 🔹 NEW: Block pending managers
  if (req.user.role === "manager" && req.user.managerRequestStatus !== "approved") {
    throw new ApiError(403, "Your manager account is pending travel-admin verification. You cannot approve hotel bookings yet.");
  }

  const bookingRequest = await HotelBookingRequest.findOne({
    _id: req.params.id,
    corporateId: req.user.corporateId,
    requestStatus: "pending_approval",
  });

  if (!bookingRequest) {
    throw new ApiError(404, "Hotel request not found or already processed");
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

  bookingRequest.requestStatus = "approved";
  bookingRequest.approvedAt = new Date();
  bookingRequest.approvedBy = req.user._id;
  bookingRequest.approverComments = comments;

  await bookingRequest.save();

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

  if (!["travel-admin", "manager"].includes(req.user.role)) {
    throw new ApiError(403, "Only admin/manager can approve requests");
  }

  // 🔹 NEW: Block pending managers
  if (req.user.role === "manager" && req.user.managerRequestStatus !== "approved") {
    throw new ApiError(403, "Your manager account is pending travel-admin verification. You cannot reject hotel bookings yet.");
  }

  const bookingRequest = await HotelBookingRequest.findOne({
    _id: req.params.id,
    corporateId: req.user.corporateId,
    requestStatus: "pending_approval",
  });

  if (!bookingRequest) {
    throw new ApiError(404, "Hotel request not found or already processed");
  }

  bookingRequest.requestStatus = "rejected";
  bookingRequest.rejectedAt = new Date();
  bookingRequest.rejectedBy = req.user._id;
  bookingRequest.approverComments = comments;

  await bookingRequest.save();

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
