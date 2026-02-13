const hotelBookingRequest = require("../models/hotelBookingRequest.model");
const paymentService = require("../services/payment.service");
const hotelService = require("../services/tektravels/hotel.service");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

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

  const bookingRequest = await hotelBookingRequest.create({
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
    const { traceId, hotelCode, roomIndex, guests } = req.body;

    if (!traceId || !hotelCode || !roomIndex || !guests?.length) {
      throw new ApiError(
        400,
        "traceId, hotelCode, roomIndex and guests are required",
      );
    }

    const result = await hotelService.bookHotel({
      traceId,
      hotelCode,
      roomIndex,
      guests,
    });

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
      traceId: booking.hotelRequest.providerTraceId,
      hotelCode: booking.hotelRequest.selectedHotel.hotelCode,
      roomIndex: booking.hotelRequest.selectedRoom.roomIndex,
    });

    /* ================= HOTEL BOOK ================= */
    const bookResp = await hotelService.bookHotel({
      traceId: booking.hotelRequest.providerTraceId,
      hotelCode: booking.hotelRequest.selectedHotel.hotelCode,
      roomIndex: booking.hotelRequest.selectedRoom.roomIndex,
      guests: booking.travellers,
    });

    const confirmationNumber = bookResp?.BookingId || bookResp?.ConfirmationNo;

    if (!confirmationNumber) throw new ApiError(500, "Hotel booking failed");

    booking.bookingResult = {
      hotelBookingId: confirmationNumber,
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
