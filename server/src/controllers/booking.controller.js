// server/src/controllers/booking.controller.js
const Booking = require("../models/Booking");
const BookingRequest = require("../models/BookingRequest");
const Approval = require("../models/Approval");
const Corporate = require("../models/Corporate");
const WalletTransaction = require("../models/Wallet");
const Ledger = require("../models/Ledger");
const tboService = require("../services/tektravels/flight.service");
const pdfService = require("../services/pdf.service");
const notificationService = require("../services/notification.service");
const { generateBookingReference } = require("../utils/helpers");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");

// @desc    Create booking request (Approval-first)
// @route   POST /api/v1/bookings
// @access  Private

const sanitizeFlightRequest = (flightRequest) => ({
  traceId: flightRequest.traceId,
  resultIndex: flightRequest.resultIndex,

  segments: flightRequest.segments,
  fareSnapshot: flightRequest.fareSnapshot,
  ssrSnapshot: flightRequest.ssrSnapshot,

  fareExpiry: flightRequest.fareExpiry
    ? new Date(flightRequest.fareExpiry)
    : null,
});

exports.createBookingRequest = asyncHandler(async (req, res) => {
  const {
    bookingType,
    flightRequest,
    hotelRequest,
    travellers,
    purposeOfTravel,
    pricingSnapshot,
  } = req.body;

  const corporate = req.corporate;
  const user = req.user;

  /* ================= VALIDATIONS ================= */

  if (!user) {
    throw new ApiError(401, "User not authenticated");
  }

  if (!corporate) {
    throw new ApiError(400, "Corporate context missing");
  }

  if (!purposeOfTravel) {
    throw new ApiError(400, "Purpose of travel is required");
  }

  if (bookingType === "flight" && !flightRequest) {
    throw new ApiError(400, "Flight request data missing");
  }

  if (bookingType === "hotel" && !hotelRequest) {
    throw new ApiError(400, "Hotel request data missing");
  }

  if (!travellers?.length) {
    throw new ApiError(400, "At least one traveller is required");
  }

  /* ================= CREATE BOOKING REQUEST ================= */

  const bookingRequest = await BookingRequest.create({
    bookingReference: generateBookingReference(),
    bookingType,
    corporateId: corporate._id,
    userId: user._id,

    requestStatus: "pending_approval",
    executionStatus: "not_started",

    purposeOfTravel,
    travellers,

    flightRequest:
      bookingType === "flight"
        ? sanitizeFlightRequest(flightRequest)
        : undefined,

    hotelRequest: bookingType === "hotel" ? hotelRequest : undefined,

    pricingSnapshot: {
      totalAmount: pricingSnapshot.totalAmount,
      currency: pricingSnapshot.currency || "INR",
      capturedAt: new Date(),
    },
    bookingSnapshot: req.body.bookingSnapshot,
  });

  /* ================= NOTIFICATION ================= */

  await notificationService.sendApprovalNotifications({
    bookingReference: bookingRequest.bookingReference,
    requester: user,
    corporateId: corporate._id,
  });

  /* ================= RESPONSE ================= */

  res.status(201).json(
    new ApiResponse(
      201,
      {
        bookingRequestId: bookingRequest._id,
        bookingReference: bookingRequest.bookingReference,
        requestStatus: bookingRequest.requestStatus,
      },
      "Booking request submitted for approval"
    )
  );
});

// @desc    Get logged-in user's booking requests
// @route   GET /api/v1/bookings/my
// @access  Private (Employee)
exports.getMyRequests = asyncHandler(async (req, res) => {
  const bookings = await BookingRequest.find({
    userId: req.user._id, // 🔐 ownership enforced
    bookingType: "flight",
  })
    .sort({ createdAt: -1 })
    .select(
      "bookingType requestStatus flightRequest pricingSnapshot createdAt"
    );

  res
    .status(200)
    .json(new ApiResponse(200, bookings, "My bookings fetched successfully"));
});

// @desc    Get single booking request (Employee)
// @route   GET /api/v1/bookings/my/:id
// @access  Private (Employee)
exports.getMyRequestById = asyncHandler(async (req, res) => {
  const bookingRequest = await BookingRequest.findById(req.params.id);

  if (!bookingRequest) {
    throw new ApiError(404, "Booking request not found");
  }

  // 🔐 Ownership check
  if (bookingRequest.userId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not authorized to view this booking request");
  }

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        bookingRequest,
        "Booking request fetched successfully"
      )
    );
});

// @desc    Confirm booking after approval
// @route   POST /api/v1/bookings/:id/confirm
// @access  Private
// Confirm booking after approval
exports.confirmBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) throw new ApiError(404, "Booking not found");

  if (booking.userId.toString() !== req.user.id) {
    throw new ApiError(403, "Not authorized");
  }

  if (booking.status !== "approved") {
    throw new ApiError(400, "Booking must be approved first");
  }

  const corporate = await Corporate.findById(booking.corporateId);

  /**
   * 🔹 STEP 1: TBO Ticketing (Flight only)
   */
  if (booking.bookingType === "flight") {
    if (!booking.flightDetails?.traceId || !booking.flightDetails?.priceId) {
      throw new ApiError(400, "Missing TBO flight identifiers");
    }

    const ticketResponse = await tboService.ticketFlight({
      traceId: booking.flightDetails.traceId,
      priceId: booking.flightDetails.priceId,
      passengers: booking.travellers,
    });

    booking.flightDetails.ticketResponse = ticketResponse;
    booking.flightDetails.pnr = ticketResponse?.Response?.PNR;
    booking.flightDetails.ticketStatus = "issued";
  }

  /**
   * 🔹 STEP 2: Payment handling (your existing logic)
   */
  if (corporate.classification === "prepaid") {
    if (corporate.walletBalance < booking.pricing.totalAmount) {
      throw new ApiError(400, "Insufficient wallet balance");
    }

    corporate.walletBalance -= booking.pricing.totalAmount;
    await corporate.save();

    await WalletTransaction.create({
      corporateId: corporate._id,
      bookingId: booking._id,
      type: "debit",
      amount: booking.pricing.totalAmount,
      status: "completed",
      description: `Booking ${booking.bookingReference}`,
    });
  } else {
    corporate.currentCredit += booking.pricing.totalAmount;
    await corporate.save();

    await Ledger.create({
      corporateId: corporate._id,
      bookingId: booking._id,
      amount: booking.pricing.totalAmount,
      type: "booking",
    });
  }

  /**
   * 🔹 STEP 3: Voucher
   */
  booking.voucherUrl =
    booking.bookingType === "flight"
      ? await pdfService.generateFlightVoucher(booking, req.user, corporate)
      : await pdfService.generateHotelVoucher(booking, req.user, corporate);

  booking.status = "confirmed";
  booking.paymentDetails.paymentStatus = "completed";

  await booking.save();

  await notificationService.sendBookingNotification(
    booking,
    req.user,
    "confirmation"
  );

  res
    .status(200)
    .json(new ApiResponse(200, booking, "Booking confirmed successfully"));
});

// @desc    Get all bookings
// @route   GET /api/v1/bookings
// @access  Private
exports.getAllBookings = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    status,
    bookingType,
    dateFrom,
    dateTo,
  } = req.query;

  const query = { corporateId: req.user.corporateId };

  // Role-based filtering
  if (req.user.role === "employee") {
    query.userId = req.user.id;
  }

  if (status) query.status = status;
  if (bookingType) query.bookingType = bookingType;
  if (dateFrom || dateTo) {
    query.createdAt = {};
    if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
    if (dateTo) query.createdAt.$lte = new Date(dateTo);
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const bookings = await Booking.find(query)
    .populate("userId", "name email")
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });

  const total = await Booking.countDocuments(query);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        bookings,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit),
        },
      },
      "Bookings fetched successfully"
    )
  );
});

// @desc    Get single booking
// @route   GET /api/v1/bookings/:id
// @access  Private
exports.getBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate("userId", "name email mobile")
    .populate("corporateId", "corporateName")
    .populate("approvalId");

  if (!booking) {
    throw new ApiError(404, "Booking not found");
  }

  // Check authorization
  if (
    req.user.role === "employee" &&
    booking.userId.toString() !== req.user.id
  ) {
    throw new ApiError(403, "Not authorized to view this booking");
  }

  res
    .status(200)
    .json(
      new ApiResponse(200, booking, "Booking details fetched successfully")
    );
});

// @desc    Cancel booking
// @route   POST /api/v1/bookings/:id/cancel
// @access  Private
exports.cancelBooking = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    throw new ApiError(404, "Booking not found");
  }

  if (
    booking.userId.toString() !== req.user.id &&
    req.user.role !== "travel-admin"
  ) {
    throw new ApiError(403, "Not authorized to cancel this booking");
  }

  if (!["confirmed", "approved"].includes(booking.status)) {
    throw new ApiError(
      400,
      "Only confirmed or approved bookings can be cancelled"
    );
  }

  booking.status = "cancelled";
  booking.cancellationDetails = {
    cancelledAt: new Date(),
    cancelledBy: req.user.id,
    reason,
    refundAmount: booking.pricing.totalAmount * 0.8, // 80% refund example
    cancellationCharges: booking.pricing.totalAmount * 0.2,
    refundStatus: "pending",
  };

  await booking.save();

  res
    .status(200)
    .json(new ApiResponse(200, booking, "Booking cancelled successfully"));
});
