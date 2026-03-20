//server\src\controllers\hotelBooking.controller.js
const Corporate = require("../models/Corporate");
const HotelBookingRequest = require("../models/hotelBookingRequest.model");
const paymentService = require("../services/payment.service");
const hotelService = require("../services/tektravels/hotel.service");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { generateBookingReference } = require("../utils/helpers");

/* ======================================================
   CREATE HOTEL BOOKING REQUEST (Approval First)
====================================================== */
exports.createHotelBookingRequest = asyncHandler(async (req, res) => {
  const { hotelRequest, travellers, purposeOfTravel, pricingSnapshot } =
    req.body;

  const user = req.user;
  const corporate = req.corporate;

  /* ================= DEFENSIVE CHECKS ================= */

  if (!user) throw new ApiError(401, "User not authenticated");
  if (!corporate) throw new ApiError(400, "Corporate context missing");

  if (!hotelRequest) throw new ApiError(400, "Hotel request data missing");

  if (!travellers?.length)
    throw new ApiError(400, "At least one guest required");

  /* ================= TRANSFORM DATA ================= */

  const transformedHotelRequest = {
    checkInDate: hotelRequest.checkIn,
    checkOutDate: hotelRequest.checkOut,

    noOfRooms: hotelRequest.rooms?.length || 1,
    noOfNights: hotelRequest?.nights || 1,

    guestNationality: hotelRequest.guestNationality || "IN",

    roomGuests: (hotelRequest.rooms || []).map((r) => ({
      noOfAdults: r.Adults || r.adults || 0,
      noOfChild: r.Children || r.children || 0,
      childAge: r.ChildAge || [],
    })),

    selectedHotel: {
      hotelCode: hotelRequest.hotelCode,
      hotelName:
        hotelRequest.hotelName?.trim() ||
        hotelRequest.rawHotelData?.HotelName ||
        "Unknown Hotel",
      address: hotelRequest.address || hotelRequest.rawHotelData?.Address,
      city: hotelRequest.city || hotelRequest.rawHotelData?.CityName,
      country: hotelRequest.country || "",
      starRating: hotelRequest.starRating || 0,
      description: hotelRequest.description || "",
      images: hotelRequest.images?.length
        ? hotelRequest.images
        : hotelRequest.rawHotelData?.Images || [],
      amenities: hotelRequest.amenities || [],
      latitude: hotelRequest.latitude || "",
      longitude: hotelRequest.longitude || "",

      // 🔥 FULL RAW HOTEL OBJECT (IMPORTANT)
      rawHotelData: hotelRequest.rawHotelData || null,
    },

    allRooms: hotelRequest.rooms || [],

    selectedRoom: {
      roomIndex: hotelRequest.roomIndex,

      name: hotelRequest.selectedRoom?.Name || [],
      bookingCode: hotelRequest.selectedRoom?.BookingCode,

      inclusion: hotelRequest.selectedRoom?.Inclusion,
      mealType: hotelRequest.selectedRoom?.MealType,

      isRefundable: hotelRequest.selectedRoom?.IsRefundable,
      withTransfers: hotelRequest.selectedRoom?.WithTransfers,

      beddingGroup: hotelRequest.selectedRoom?.BeddingGroup,

      // 🔥 pricing
      totalFare:
        hotelRequest.selectedRoom?.Price?.TotalFare ||
        hotelRequest.selectedRoom?.TotalFare,

      totalTax:
        hotelRequest.selectedRoom?.Price?.Tax ||
        hotelRequest.selectedRoom?.TotalTax,
      dayRates: hotelRequest.selectedRoom?.DayRates,

      // 🔥 cancellation
      cancelPolicies: hotelRequest.selectedRoom?.CancelPolicies,

      // 🔥 promotions
      promotions: hotelRequest.selectedRoom?.RoomPromotion || [],

      currency: hotelRequest.currency || "INR",

      // 🔥 FULL RAW ROOM OBJECT
      rawRoomData: hotelRequest.selectedRoom || null,
    },

    providerBookingId: hotelRequest.bookingCode || null,
  };

  /* ================= SNAPSHOT ================= */

  const bookingSnapshot = {
    hotelName: transformedHotelRequest.selectedHotel.hotelName,
    city: transformedHotelRequest.selectedHotel.city,
    checkInDate: transformedHotelRequest.checkInDate,
    checkOutDate: transformedHotelRequest.checkOutDate,
    roomCount: transformedHotelRequest.noOfRooms,
    nights: transformedHotelRequest.noOfNights,
    amount: pricingSnapshot?.totalAmount || 0,
    currency: pricingSnapshot?.currency || "INR",
  };

  /* ================= SAVE ================= */

  const transformedTravellers = travellers.map((t, index) => ({
    title: t.title,
    firstName: t.firstName,
    lastName: t.lastName,

    gender: t.gender,
    dob: t.dob,
    age: t.age,

    email: t.email,
    phoneWithCode: t.phoneWithCode,

    nationality: t.nationality,
    countryCode: t.countryCode,

    isLeadPassenger: index === 0,
    paxType: index === 0 ? "lead" : "adult",

    raw: t,
  }));

  const bookingRequest = await HotelBookingRequest.create({
    bookingReference: generateBookingReference(),
    corporateId: corporate._id,
    userId: user._id,

    bookingType: "hotel",

    requestStatus: "pending_approval",

    purposeOfTravel,
    travellers: transformedTravellers,

    hotelRequest: transformedHotelRequest,
    pricingSnapshot: {
      ...pricingSnapshot,
      capturedAt: new Date(),
    },
    bookingSnapshot,
  });

  return res.status(201).json({
    success: true,
    data: {
      bookingRequestId: bookingRequest._id,
      bookingReference: bookingRequest.bookingReference,
      requestStatus: bookingRequest.requestStatus,
    },
    message: "Hotel booking request submitted for approval",
  });
});

// @desc    Get my hotel booking requests (pending + approved)
// @route   GET /api/v1/hotel-bookings/my
// @access  Private (Employee)

exports.getMyHotelRequests = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const requests = await HotelBookingRequest.find({
    userId,
    requestStatus: { $in: ["pending_approval", "approved"] },
    executionStatus: { $ne: "voucher_generated" }, // not completed yet
  })
    .populate("approvedBy", "name email role")
    .populate("rejectedBy", "name email role")
    .sort({ createdAt: -1 })
    .lean();

  return res.status(200).json({
    success: true,
    count: requests.length,
    data: requests,
    message: "Hotel booking requests fetched successfully",
  });
});

// @desc    Get single hotel booking request
// @route   GET /api/v1/hotel-bookings/my/:id
// @access  Private (Employee)

exports.getMyHotelRequestById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const booking = await HotelBookingRequest.findById(id)
    .populate("approvedBy", "name email role")
    .populate("rejectedBy", "name email role")
    .lean();

  if (!booking) {
    throw new ApiError(404, "Hotel booking request not found");
  }

  // 🔐 Ownership check
  if (booking.userId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not authorized to view this request");
  }

  return res.status(200).json({
    success: true,
    data: booking,
    message: "Hotel booking request fetched successfully",
  });
});

// @desc    Get my rejected hotel booking requests
// @route   GET /api/v1/hotel-bookings/my/rejected
// @access  Private

exports.getMyRejectedHotelRequests = asyncHandler(async (req, res) => {
  const requests = await HotelBookingRequest.find({
    userId: req.user._id,
    requestStatus: "rejected",
  })
    .populate("rejectedBy", "name email")
    .sort({ rejectedAt: -1 })
    .lean();

  return res.status(200).json({
    success: true,
    count: requests.length,
    data: requests,
    message: "Rejected hotel requests fetched successfully",
  });
});

/* ======================================================
   EXECUTE APPROVED HOTEL BOOKING
====================================================== */
exports.executeApprovedHotelBooking = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;

  if (!bookingId) {
    throw new ApiError(400, "Booking ID is required");
  }

  const booking = await HotelBookingRequest.findById(bookingId);

  if (!booking) throw new ApiError(404, "Booking not found");

  if (booking.requestStatus !== "approved") {
    throw new ApiError(400, "Booking not approved");
  }

  booking.executionStatus = "booking_initiated";
  await booking.save();

  try {
    /* ================= STEP 1: GET BOOKING CODE ================= */

    const bookingCode =
      booking.hotelRequest?.selectedRoom?.bookingCode ||
      booking.hotelRequest?.providerBookingId;

    if (!bookingCode) {
      throw new ApiError(400, "BookingCode missing");
    }

    console.log("INITIAL BOOKING CODE:", bookingCode);

    /* ================= STEP 2: PREBOOK ================= */

    const preBookResp = await hotelService.preBookHotel({
      BookingCode: bookingCode,
      EndUserIp: process.env.TBO_END_USER_IP,
    });

    console.log("PREBOOK RESPONSE:", JSON.stringify(preBookResp, null, 2));

    const preBookResult =
      preBookResp?.PreBookResult || preBookResp?.BookResult || preBookResp;

    const netAmount = preBookResp?.HotelResult?.[0]?.Rooms?.[0]?.NetAmount;

    // 🔥 TBO PREBOOK SUCCESS CHECK (CORRECT)
    if (preBookResp?.Status?.Code !== 200 && preBookResp?.Status !== 1) {
      console.error("PREBOOK FAILED:", preBookResp);

      throw new ApiError(
        500,
        preBookResp?.Status?.Description ||
          preBookResp?.Error?.ErrorMessage ||
          "PreBook failed",
      );
    }

    /* ================= STEP 3: HANDLE PRICE / POLICY CHANGE ================= */

    if (preBookResult?.IsPriceChanged) {
      throw new ApiError(400, "Price changed. Please refresh booking.");
    }

    if (preBookResult?.IsCancellationPolicyChanged) {
      throw new ApiError(400, "Cancellation policy changed. Please review.");
    }

    /* ================= STEP 4: GET FRESH BOOKING CODE ================= */

    const freshBookingCode = preBookResult?.BookingCode || bookingCode;

    console.log("FRESH BOOKING CODE:", freshBookingCode);

    /* ================= STEP 5: BOOK ================= */

    const bookResp = await hotelService.bookHotel({
      BookingCode: freshBookingCode,
      IsVoucherBooking: true,
      GuestNationality: booking.hotelRequest?.guestNationality || "IN",
      EndUserIp: process.env.TBO_END_USER_IP,
      RequestedBookingMode: 5,
      NetAmount: netAmount,
      ClientReferenceId: booking.bookingReference,

      HotelRoomsDetails: [
        {
          HotelPassenger: booking.travellers.map((t) => ({
            Title: t.title,
            FirstName: t.firstName,
            LastName: t.lastName,
            Email: t.email || null,
            Phoneno: String(t.phoneWithCode || "").replace(/\D/g, ""),
            PaxType: 1,
            LeadPassenger: t.isLeadPassenger,
          })),
        },
      ],
    });

    console.log("BOOK RESPONSE:", JSON.stringify(bookResp, null, 2));

    const bookResult = bookResp?.BookResult || bookResp;

    /* ================= STEP 6: VALIDATE BOOK ================= */

    if (bookResult?.Status !== 1) {
      throw new ApiError(
        500,
        bookResult?.Error?.ErrorMessage || "TBO hotel booking failed",
      );
    }

    /* ================= STEP 7: HANDLE PENDING ================= */

    if (bookResult?.HotelBookingStatus === "Pending") {
      console.warn("Booking is pending. Poll after 120 seconds.");
    }

    /* ================= STEP 8: EXTRACT CONFIRMATION ================= */

    const confirmationNumber =
      bookResult?.ConfirmationNo ||
      bookResult?.BookingRefNo ||
      bookResult?.BookingId;

    if (!confirmationNumber) {
      throw new ApiError(500, "Hotel booking failed - no confirmation number");
    }

    /* ================= STEP 9: SAVE RESULT ================= */

    booking.bookingResult = {
      hotelBookingId: confirmationNumber,
      providerResponse: bookResp,
    };

    booking.executionStatus = "booked";
    await booking.save();

    /* ================= STEP 10: PAYMENT ================= */

    const corporate = await Corporate.findById(booking.corporateId);

    if (!corporate) {
      throw new ApiError(404, "Corporate not found");
    }

    await paymentService.processBookingPayment({
      booking,
      corporate,
    });

    booking.executionStatus = "voucher_generated";
    await booking.save();

    /* ================= SUCCESS ================= */

    return res.status(200).json({
      success: true,
      message: "Hotel booked successfully",
      data: {
        bookingId: booking._id,
        confirmationNumber,
      },
    });
  } catch (err) {
    booking.executionStatus = "failed";
    await booking.save();

    console.error("BOOKING FAILED:", err.message);

    throw err;
  }
});

// @desc    Employee - Get my Hotel bookings (all statuses)
// @route   GET /api/v1/hotel-bookings/my
// @access  Private (Employee)
exports.getMyHotelBookings = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const query = {
    userId: req.user._id,
    bookingType: "hotel",
    executionStatus: { $in: ["voucher_generated"] }, // ✅ FIXED
  };

  const skip = (Number(page) - 1) * Number(limit);

  const [rawBookings, total] = await Promise.all([
    HotelBookingRequest.find(query)
      .select(
        "bookingReference bookingType requestStatus executionStatus bookingSnapshot pricingSnapshot createdAt bookingResult hotelRequest.selectedRoom.rawRoomData.images",
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    HotelBookingRequest.countDocuments(query),
  ]);

  const bookings = rawBookings.map((booking) => {
    const result =
      booking?.bookingResult?.providerResponse?.BookResult ||
      booking?.bookingResult?.providerResponse;

    // 🔥 Extract images safely (cover all cases)
    const images =
      booking?.hotelRequest?.selectedRoom?.rawRoomData?.images || [];

    return {
      ...booking,

      // existing fields
      hotelName: result?.HotelName,
      city: result?.City,
      checkIn: result?.CheckInDate,
      checkOut: result?.CheckOutDate,
      status: result?.HotelBookingStatus,
      confirmationNo: result?.ConfirmationNo,

      // ✅ NEW: images
      images,

      // ✅ NEW: hero image (first image)
      heroImage: images?.[0] || null,
    };
  });

  const pagination = {
    total,
    page: Number(page),
    pages: Math.ceil(total / limit),
  };

  res.status(200).json({
    success: true,
    message: "Hotel bookings fetched successfully",
    data: {
      bookings,
      pagination,
    },
  });
});

// @desc    Get booked hotel details (TBO)
// @route   GET /api/v1/hotel-bookings/:id/details
// @access  Private

exports.getBookedHotelDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const booking = await HotelBookingRequest.findById(id)
    .populate("approvedBy", "name email role")
    .populate("rejectedBy", "name email role")
    .lean();

  if (!booking) throw new ApiError(404, "Booking not found");

  // 🔐 Ownership check
  if (booking.userId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not authorized");
  }

  if (booking.executionStatus !== "voucher_generated") {
    throw new ApiError(400, "Booking not completed yet");
  }

  /* ================= DB DATA ================= */

  const {
    bookingReference,
    executionStatus,
    requestStatus,
    bookingSnapshot = {},
    pricingSnapshot = {},
    travellers = [],
    bookingResult = {},
  } = booking;

  // 🔥 Extract images from DB (IMPORTANT)
  const hotelReq = booking.hotelRequest || {};
  const selectedRoom = hotelReq.selectedRoom || {};
  const rawRoom = selectedRoom.rawRoomData || {};

  const images = rawRoom.images || [];
  const heroImage = images[0] || null;

  /* ================= EXTRACT IDENTIFIERS ================= */

  const rawResponse = bookingResult.providerResponse || {};
  const bookResult = rawResponse.BookResult || rawResponse;

  const bookingIdTBO = bookResult?.BookingId;
  const confirmationNo = bookResult?.ConfirmationNo;
  const traceId = bookResult?.TraceId;

  const leadPassenger = travellers.find((t) => t.isLeadPassenger);

  /* ================= CALL TBO ================= */

  let tboResponse = null;
  let result = null;

  try {
    tboResponse = await hotelService.getBookingDetails({
      bookingId: bookingIdTBO,
      confirmationNo,
      traceId,
      firstName: leadPassenger?.firstName,
      lastName: leadPassenger?.lastName,
    });

    result = tboResponse?.GetBookingDetailResult || tboResponse;
  } catch (err) {
    console.log("TBO FAILED → fallback to DB");
  }

  /* ================= MERGE LOGIC ================= */

  // 🔥 Guests (TBO > DB)
  const guests =
    result?.Rooms?.flatMap((room) => room?.HotelPassenger || []) ||
    travellers ||
    [];

  // 🔥 Pricing (TBO > DB)
  const totalFare = result?.InvoiceAmount || pricingSnapshot?.totalAmount || 0;

  const currency = result?.Currency || pricingSnapshot?.currency || "INR";

  // 🔥 Dates (TBO > DB)
  const checkIn = result?.CheckInDate || bookingSnapshot?.checkInDate;

  const checkOut = result?.CheckOutDate || bookingSnapshot?.checkOutDate;

  // 🔥 Hotel info (TBO > DB)
  const hotelName = result?.HotelName || bookingSnapshot?.hotelName;

  const city = result?.City || bookingSnapshot?.city;

  const status = result?.HotelBookingStatus || executionStatus;

  /* ================= FINAL RESPONSE ================= */

  return res.status(200).json({
    success: true,
    message: "Booking details fetched successfully",
    data: {
      bookingId: booking._id,
      bookingReference,

      purposeOfTravel: booking.purposeOfTravel,

      // ✅ DB (stable)
      executionStatus,
      requestStatus,
      bookingSnapshot,
      pricingSnapshot,
      travellers,

      images,
      heroImage,

      // ✅ TBO (live)
      confirmationNo: result?.ConfirmationNo || confirmationNo,
      hotelName,
      city,
      checkIn,
      checkOut,
      status,

      // ✅ merged
      guests,
      totalFare,
      currency,

      // ✅ raw (optional)
      raw: result || null,

      // ✅ audit fields (ADD THESE)
      createdAt: booking.createdAt,
      approvedAt: booking.approvedAt,
      approvedBy: booking.approvedBy,
      rejectedAt: booking.rejectedAt,
      rejectedBy: booking.rejectedBy,
    },
  });
});
