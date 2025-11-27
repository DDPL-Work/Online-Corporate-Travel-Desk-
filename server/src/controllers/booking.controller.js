const Booking = require("../models/Booking");
const CorporateAdmin = require("../models/CorporateAdmin");
const Employee = require("../models/Employee");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");

// 🔄 Helper: update status timestamps
const updateStatusTimestamp = (booking, status) => {
  const fieldMap = {
    approved: "approvedAt",
    booked: "bookedAt",
    cancelled: "cancelledAt",
    completed: "completedAt",
  };
  if (fieldMap[status]) {
    booking.statusTimestamps[fieldMap[status]] = new Date();
  }
};

// =========================================================
// 1️⃣  CREATE BOOKING REQUEST
// =========================================================
exports.createBooking = asyncHandler(async (req, res) => {
  const { type, provider, requestData, pricing } = req.body;

  if (!type) throw new ApiError(400, "Booking type is required");

  const booking = await Booking.create({
    corporate: req.user.corporateId,
    user: req.user._id,
    type,
    provider: provider || "TekTravels",
    requestData,
    pricing,
    createdBy: req.user._id,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, booking, "Booking request created"));
});

// =========================================================
// 2️⃣  GET USER BOOKINGS
// =========================================================
exports.getMyBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({ user: req.user._id })
    .populate("corporate")
    .sort({ createdAt: -1 });

  res.json(new ApiResponse(200, bookings, "My bookings fetched"));
});

// =========================================================
// 3️⃣  GET CORPORATE BOOKINGS (Admin Only)
// =========================================================
exports.getCorporateBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({ corporate: req.user.corporateId })
    .populate("user")
    .sort({ createdAt: -1 });

  res.json(new ApiResponse(200, bookings, "Corporate bookings fetched"));
});

// =========================================================
// 4️⃣  APPROVE BOOKING REQUEST (Approver Role)
// =========================================================
exports.approveBooking = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const { comment } = req.body;

  const booking = await Booking.findById(bookingId);
  if (!booking) throw new ApiError(404, "Booking not found");

  if (booking.status !== "requested")
    throw new ApiError(400, "Only requested bookings can be approved");

  booking.status = "approved";
  updateStatusTimestamp(booking, "approved");

  booking.approvers.push({
    approver: req.user._id,
    action: "approved",
    comment,
    actedAt: new Date(),
  });

  booking.updatedBy = req.user._id;

  await booking.save();

  res.json(new ApiResponse(200, booking, "Booking approved"));
});

// =========================================================
// 5️⃣  REJECT BOOKING REQUEST
// =========================================================
exports.rejectBooking = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const { comment } = req.body;

  const booking = await Booking.findById(bookingId);
  if (!booking) throw new ApiError(404, "Booking not found");

  if (booking.status !== "requested")
    throw new ApiError(400, "Only requested bookings can be rejected");

  booking.status = "cancelled";
  updateStatusTimestamp(booking, "cancelled");

  booking.approvers.push({
    approver: req.user._id,
    action: "rejected",
    comment,
    actedAt: new Date(),
  });

  booking.updatedBy = req.user._id;

  await booking.save();

  res.json(new ApiResponse(200, booking, "Booking rejected"));
});

// =========================================================
// 6️⃣  CONFIRM BOOKING (After Supplier/API success)
// (Use in TBO / Amadeus / Sabre integration)
// =========================================================
exports.confirmBooking = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const { responseData, voucherUrl } = req.body;

  const booking = await Booking.findById(bookingId);
  if (!booking) throw new ApiError(404, "Booking not found");

  if (booking.status !== "approved")
    throw new ApiError(400, "Only approved bookings can be confirmed");

  booking.status = "booked";
  updateStatusTimestamp(booking, "booked");

  booking.responseData = responseData;
  booking.voucherUrl = voucherUrl;
  booking.updatedBy = req.user._id;

  await booking.save();

  res.json(new ApiResponse(200, booking, "Booking confirmed"));
});

// =========================================================
// 7️⃣  CANCEL BOOKING
// =========================================================
exports.cancelBooking = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const { comment } = req.body;

  const booking = await Booking.findById(bookingId);
  if (!booking) throw new ApiError(404, "Booking not found");

  if (["cancelled", "completed"].includes(booking.status))
    throw new ApiError(400, `Cannot cancel booking already ${booking.status}`);

  booking.status = "cancelled";
  updateStatusTimestamp(booking, "cancelled");

  booking.approvers.push({
    approver: req.user._id,
    action: "rejected",
    comment,
    actedAt: new Date(),
  });

  booking.updatedBy = req.user._id;

  await booking.save();

  res.json(new ApiResponse(200, booking, "Booking cancelled"));
});

// =========================================================
// 8️⃣  GET SINGLE BOOKING DETAILS
// =========================================================
exports.getBookingById = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.bookingId)
    .populate("user corporate");

  if (!booking) throw new ApiError(404, "Booking not found");

  res.json(new ApiResponse(200, booking, "Booking details fetched"));
});
