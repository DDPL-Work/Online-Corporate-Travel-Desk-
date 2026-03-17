const HotelBookingRequest = require("../models/hotelBookingRequest.model");
const paymentService = require("../services/payment.service");
const hotelService = require("../services/tektravels/hotel.service");
const notificationService = require("../services/notification.service");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const Corporate = require("../models/Corporate");
const { generateBookingReference } = require("../utils/helpers");

function normalizeTitleWithDot(title) {
  const raw = String(title || "").trim();
  const base = raw.replace(/\./g, "").trim();
  if (!base) return "Mr.";
  const cased = base.charAt(0).toUpperCase() + base.slice(1).toLowerCase();
  return `${cased}.`;
}

function buildHotelPassengers(guests = []) {
  if (!Array.isArray(guests) || guests.length === 0) return [];

  return guests.map((g, idx) => ({
    Title: normalizeTitleWithDot(g?.title),
    FirstName: g?.firstName || "Guest",
    MiddleName: "",
    LastName: g?.lastName || "User",
    Email: g?.email || null,
    PaxType: 1,
    LeadPassenger: idx === 0,
    Age: 0,
    PassportNo: null,
    PassportIssueDate: null,
    PassportExpDate: null,
    Phoneno: String(g?.phoneWithCode || "")
      .replace(/\D/g, "")
      .trim() || null,
    PaxId: 0,
    GSTCompanyAddress: null,
    GSTCompanyContactNumber: null,
    GSTCompanyName: null,
    GSTNumber: null,
    GSTCompanyEmail: null,
    PAN: g?.pan || null,
  }));
}

/* ======================================================
   CREATE HOTEL BOOKING REQUEST (Approval First)
====================================================== */
exports.createHotelBookingRequest = asyncHandler(async (req, res) => {
  const { hotelRequest, travellers, purposeOfTravel, pricingSnapshot } =
    req.body;

  const user = req.user;
  const corporate = req.corporate;

  if (!hotelRequest) throw new ApiError(400, "Hotel request data missing");
  if (!travellers?.length)
    throw new ApiError(400, "At least one guest required");

  const bookingSnapshot = {
    hotelName: hotelRequest.selectedHotel?.hotelName,
    city: hotelRequest.selectedHotel?.city,
    checkInDate: hotelRequest.checkInDate,
    checkOutDate: hotelRequest.checkOutDate,
    roomCount: hotelRequest.noOfRooms,
    nights: hotelRequest.noOfNights,
    amount: pricingSnapshot.totalAmount,
    currency: pricingSnapshot.currency || "INR",
  };

  const bookingRequest = await HotelBookingRequest.create({
    bookingReference: generateBookingReference(),
    corporateId: corporate._id,
    userId: user._id,
    requestStatus: "pending_approval",
    purposeOfTravel,
    travellers,
    hotelRequest,
    pricingSnapshot,
    bookingSnapshot,
  });

  await notificationService.sendApprovalNotifications({
    bookingReference: bookingRequest.bookingReference,
    requester: user,
    corporateId: corporate._id,
  });

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        bookingRequestId: bookingRequest._id,
        bookingReference: bookingRequest.bookingReference,
        requestStatus: bookingRequest.requestStatus,
      },
      "Hotel booking request submitted for approval",
    ),
  );
});

/* ======================================================
   HOTEL BOOK
====================================================== */
exports.bookHotel = async (req, res, next) => {
  try {
    const {
      BookingCode,
      IsVoucherBooking,
      GuestNationality,
      EndUserIp,
      RequestedBookingMode,
      NetAmount,
      ClientReferenceId,
      HotelRoomsDetails,
      guests, // backwards compat
    } = req.body;

    let payload = {
      BookingCode,
      IsVoucherBooking,
      GuestNationality,
      EndUserIp,
      RequestedBookingMode,
      NetAmount,
      ClientReferenceId,
      HotelRoomsDetails,
    };

    // If old clients send `guests`, build the required structure.
    if (!payload.HotelRoomsDetails && Array.isArray(guests) && guests.length) {
      payload.HotelRoomsDetails = [
        {
          HotelPassenger: buildHotelPassengers(guests),
        },
      ];
    }

    if (!payload.BookingCode) {
      throw new ApiError(400, "BookingCode is required");
    }
    if (
      !Array.isArray(payload.HotelRoomsDetails) ||
      payload.HotelRoomsDetails.length === 0 ||
      !Array.isArray(payload.HotelRoomsDetails[0]?.HotelPassenger) ||
      payload.HotelRoomsDetails[0].HotelPassenger.length === 0
    ) {
      throw new ApiError(400, "HotelRoomsDetails.HotelPassenger is required");
    }

    // Defaults per supplier contract.
    if (payload.IsVoucherBooking === undefined) payload.IsVoucherBooking = true;
    if (!payload.GuestNationality) payload.GuestNationality = "IN";
    if (!payload.RequestedBookingMode) payload.RequestedBookingMode = 5;
    if (!payload.ClientReferenceId)
      payload.ClientReferenceId = `hotel-${Date.now()}`;

    const result = await hotelService.bookHotel(payload);

    return res.status(200).json({
      success: true,
      message: "Hotel booked successfully",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/* ======================================================
   EXECUTE APPROVED HOTEL BOOKING
====================================================== */
exports.executeApprovedHotelBooking = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;

  const booking = await HotelBookingRequest.findById(bookingId);
  if (!booking) throw new ApiError(404, "Booking not found");

  if (booking.requestStatus !== "approved")
    throw new ApiError(400, "Booking not approved");

  const corporate = await Corporate.findById(booking.corporateId);
  if (!corporate) throw new ApiError(404, "Corporate not found");

  booking.executionStatus = "booking_initiated";
  await booking.save();

  try {
    /* ================= HOTEL PREBOOK ================= */
    const prebookResp = await hotelService.preBookHotel({
      hotelCode: booking.hotelRequest.selectedHotel.hotelCode,
      roomIndex: booking.hotelRequest.selectedRoom.roomIndex,
      // If the supplier requires TraceId, the service will retry automatically when provided.
      traceId: booking.hotelRequest.providerTraceId,
    });

    const bookingCode =
      prebookResp?.PreBookResult?.BookingCode ||
      prebookResp?.BookingCode ||
      prebookResp?.bookingCode;

    if (!bookingCode) {
      throw new ApiError(502, "PreBook failed: BookingCode missing");
    }

    /* ================= HOTEL BOOK ================= */
    // Match supplier contract provided in the request: BookingCode based booking.
    const bookPayload = {
      BookingCode: bookingCode,
      IsVoucherBooking: true,
      GuestNationality: booking.hotelRequest.guestNationality || "IN",
      ...(process.env.TBO_END_USER_IP
        ? { EndUserIp: process.env.TBO_END_USER_IP }
        : {}),
      RequestedBookingMode: 5,
      NetAmount:
        prebookResp?.PreBookResult?.NetAmount ??
        booking.pricingSnapshot?.totalAmount ??
        0,
      ClientReferenceId: booking.bookingReference || String(booking._id),
      HotelRoomsDetails: [
        {
          HotelPassenger: buildHotelPassengers(booking.travellers),
        },
      ],
    };

    const bookResp = await hotelService.bookHotel(bookPayload);

    const bookResult = bookResp?.BookResult || bookResp;
    const confirmationNumber =
      bookResult?.ConfirmationNo || bookResult?.BookingId || bookResult?.BookingRefNo;

    if (!confirmationNumber) throw new ApiError(500, "Hotel booking failed");

    booking.bookingResult = {
      hotelBookingId: String(confirmationNumber),
      confirmationNumber: String(bookResult?.ConfirmationNo || ""),
      providerBookingId: String(bookResult?.BookingId || ""),
      providerResponse: bookResp,
    };

    booking.executionStatus = "booked";
    await booking.save();

    /* ================= PAYMENT ================= */
    await paymentService.processBookingPayment({
      booking,
      corporate,
    });

    booking.executionStatus = "voucher_generated";
    await booking.save();

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          bookingId: booking._id,
          confirmationNumber,
        },
        "Hotel booked successfully",
      ),
    );
  } catch (err) {
    booking.executionStatus = "failed";
    await booking.save();
    throw err;
  }
});
/* ======================================================
   BOOKING DETAILS
====================================================== */
exports.getBookingDetails = async (req, res, next) => {
  try {
    const { bookingId } = req.params;

    if (!bookingId) {
      throw new ApiError(400, "bookingId is required");
    }

    const result = await hotelService.getBookingDetails(bookingId);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/* ======================================================
   CANCEL HOTEL
====================================================== */
exports.cancelHotel = async (req, res, next) => {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      throw new ApiError(400, "bookingId is required");
    }

    const result = await hotelService.cancelHotel(bookingId);

    return res.status(200).json({
      success: true,
      message: "Hotel cancelled successfully",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};
