//server\src\controllers\hotelBooking.controller.js
const Corporate = require("../models/Corporate");
const HotelBookingRequest = require("../models/hotelBookingRequest.model");
const paymentService = require("../services/payment.service");
const pdfService = require("../services/pdf.service");
const hotelService = require("../services/tektravels/hotel.service");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { generateBookingReference } = require("../utils/helpers");

/* ======================================================
   CREATE HOTEL BOOKING REQUEST (Approval First)
====================================================== */
exports.createHotelBookingRequest = asyncHandler(async (req, res) => {
  const {
    hotelRequest,
    travellers,
    purposeOfTravel,
    pricingSnapshot,
    gstDetails,
    projectName,
    projectId,
    projectClient,
    approverId,
    approverEmail,
    approverName,
    approverRole,
  } = req.body;

  const user = req.user;
  const corporate = req.corporate;

  /* ================= DEFENSIVE CHECKS ================= */

  if (!user) throw new ApiError(401, "User not authenticated");
  if (!corporate) throw new ApiError(400, "Corporate context missing");

  if (!hotelRequest) throw new ApiError(400, "Hotel request data missing");

  if (!travellers?.length)
    throw new ApiError(400, "At least one guest required");

  /* ================= TRANSFORM DATA ================= */

  // ✅ STRICT STRING BASED (MATCHES YOUR DB)

  const totalAdults = travellers.filter(
    (t) =>
      (t.paxType || t.PaxType || "")
        .toString()
        .toLowerCase()
        .startsWith("adult") ||
      (t.paxType || t.PaxType || "").toString().toLowerCase() === "lead" ||
      (t.paxType || t.PaxType || "") === 1,
  ).length;

  const totalChildren = travellers.filter(
    (t) =>
      (t.paxType || t.PaxType || "").toString().toLowerCase() === "child" ||
      (t.paxType || t.PaxType || "") === 2,
  ).length;

  // const roomsCount =
  // hotelRequest?.allRooms?.length ||
  // hotelRequest.noOfRooms ||
  // 1;

  console.log("Travellers:", travellers);
  console.log("Rooms:", hotelRequest.rooms);

  // ✅ ALWAYS TRUST FRONTEND PaxRooms
  const paxRooms = hotelRequest?.PaxRooms || hotelRequest?.paxRooms || [];

  if (!paxRooms.length) {
    throw new ApiError(400, "PaxRooms is required from frontend");
  }

  // ✅ derive correct room count
  const roomsCount = paxRooms.length;

  // ✅ build exact roomGuests
  const roomGuests = paxRooms.map((r) => ({
    noOfAdults: Number(r.Adults || 0),
    noOfChild: Number(r.Children || 0),
    childAge: r.ChildrenAges || [],
  }));

  // build default if missing
  if (!roomGuests) {
    roomGuests = Array.from({ length: roomsCount }).map((_, index) => ({
      noOfAdults:
        Math.floor(totalAdults / roomsCount) +
        (index < totalAdults % roomsCount ? 1 : 0),
      noOfChild:
        Math.floor(totalChildren / roomsCount) +
        (index < totalChildren % roomsCount ? 1 : 0),
      childAge: [],
    }));
  }

  const transformedHotelRequest = {
    checkInDate: hotelRequest.checkIn,
    checkOutDate: hotelRequest.checkOut,

    noOfRooms: roomsCount,
    noOfNights: hotelRequest?.nights || 1,

    guestNationality: hotelRequest.guestNationality || "IN",

    roomGuests,
    paxRooms,

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

  const transformedTravellers = travellers.map((t, index) => {
    const incomingPaxType = (t.paxType || t.PaxType || "")
      .toString()
      .toLowerCase();
    const isChild =
      incomingPaxType === "child" ||
      incomingPaxType === "2" ||
      (t.age != null && Number(t.age) < 12);
    const paxType = isChild ? "child" : index === 0 ? "lead" : "adult";

    return {
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

      panCard: t.panCard || "",
      PassportNo: t.PassportNo || "",
      PassportIssueDate: t.PassportIssueDate || "",
      PassportExpDate: t.PassportExpDate || "",

      isLeadPassenger: paxType === "lead",
      paxType,

      raw: t,
    };
  });

  const bookingRequest = await HotelBookingRequest.create({
    bookingReference: generateBookingReference(),
    corporateId: corporate._id,
    userId: user._id,

    bookingType: "hotel",

    requestStatus: "pending_approval",

    purposeOfTravel,

    projectName,
    projectId,
    projectClient,
    approverId,
    approverEmail,
    approverName,
    approverRole,

    gstDetails: {
      gstin: gstDetails?.gstin || "",
      legalName: gstDetails?.legalName || "",
      address: gstDetails?.address || "",
    },
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

    const selectedRooms = booking.hotelRequest?.allRooms || [];

    // derive booking codes and room count safely
    const bookingCodes = selectedRooms
      .map((r) => r.bookingCode)
      .filter(Boolean);

    if (!bookingCodes.length) {
      throw new ApiError(400, "BookingCode missing");
    }

    if (!bookingCodes) {
      throw new ApiError(400, "BookingCode missing");
    }

    console.log("INITIAL BOOKING CODE:", bookingCodes);

    /* ================= STEP 2: PREBOOK ================= */

    const preBookResp = await hotelService.preBookHotel({
      BookingCode: bookingCodes.join(","), // 🔥 MULTI ROOM FIX
      EndUserIp: process.env.TBO_END_USER_IP,
    });

    console.log("PREBOOK RESPONSE:", JSON.stringify(preBookResp, null, 2));

    const preBookRooms = preBookResp?.HotelResult?.[0]?.Rooms || [];

    const isPriceChanged =
      preBookResp?.HotelResult?.[0]?.IsPriceChanged || false;

    const isPolicyChanged =
      preBookResp?.HotelResult?.[0]?.IsCancellationPolicyChanged || false;

    if (isPriceChanged) {
      throw new ApiError(400, "Price changed. Please refresh booking.");
    }

    if (isPolicyChanged) {
      throw new ApiError(400, "Cancellation policy changed. Please review.");
    }

    const freshBookingCode = preBookRooms
      .map((r) => r.BookingCode)
      .filter(Boolean);

    if (!freshBookingCode.length) {
      throw new ApiError(500, "PreBook failed - BookingCode missing");
    }

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

    // if (preBookResult?.IsPriceChanged) {
    //   throw new ApiError(400, "Price changed. Please refresh booking.");
    // }

    // if (preBookResult?.IsCancellationPolicyChanged) {
    //   throw new ApiError(400, "Cancellation policy changed. Please review.");
    // }

    /* ================= STEP 4: GET FRESH BOOKING CODE ================= */

    // const freshBookingCode = preBookResult?.BookingCode || bookingCodes;

    console.log("FRESH BOOKING CODE:", freshBookingCode);

    /* ================= STEP 5: BOOK ================= */

    // const selectedRooms = booking.hotelRequest?.allRooms || [];
    // const travellers = booking.travellers || [];

    // const selectedRooms = booking.hotelRequest?.allRooms || [];

    const travellers = booking.travellers || [];

    // 🔥 STEP 1: GET LEAD PASSENGER PAN
const leadTraveller = travellers.find((t) => t.isLeadPassenger);

if (!leadTraveller || !leadTraveller.panCard) {
  throw new ApiError(400, "Lead passenger PAN is required to proceed booking");
}

const leadPhoneRaw = String(leadTraveller?.phoneWithCode || "").replace(/\D/g, "");
const leadPhone = leadPhoneRaw.slice(-10);

if (!leadTraveller?.email) {
  throw new ApiError(400, "Lead passenger email is required");
}

if (leadPhone.length !== 10) {
  throw new ApiError(400, "Lead passenger must have valid 10 digit phone");
}



const bookingPAN = leadTraveller.panCard;

    // derive room count from booking codes (handle comma-combined codes)
    const countCodes = (codes) =>
      (codes || []).reduce(
        (sum, code) => sum + code.split(",").filter(Boolean).length,
        0,
      );

    const roomsCount =
      countCodes(freshBookingCode) ||
      countCodes(bookingCodes) ||
      selectedRooms.length ||
      1;

    // split travellers into adults/children
    const adultTravellers = travellers.filter((t) => {
      const pax = (t.paxType || t.PaxType || "").toString().toLowerCase();
      const age = t.age != null ? Number(t.age) : null;
      return !(pax === "child" || pax === "2" || (age != null && age < 12));
    });

    const childTravellers = travellers.filter((t) => {
      const pax = (t.paxType || t.PaxType || "").toString().toLowerCase();
      const age = t.age != null ? Number(t.age) : null;
      return pax === "child" || pax === "2" || (age != null && age < 12);
    });

    // 🔥 AUTO FIX roomGuests
  let paxRooms =
  booking.hotelRequest?.paxRooms || booking.hotelRequest?.PaxRooms || [];

// ✅ fallback for OLD bookings
let roomGuests = booking.hotelRequest?.roomGuests || [];

// ✅ PRIORITY 1 → use saved correct data
if (roomGuests.length === roomsCount) {
  // perfect → do nothing
} else {
  // fallback ONLY if completely broken
  console.warn("⚠️ roomGuests invalid → fallback");

  roomGuests = Array.from({ length: roomsCount }).map(() => ({
    noOfAdults: Math.floor(adultTravellers.length / roomsCount),
    noOfChild: Math.floor(childTravellers.length / roomsCount),
    childAge: [],
  }));

  for (let i = 0; i < adultTravellers.length % roomsCount; i++) {
    roomGuests[i].noOfAdults += 1;
  }

  for (let i = 0; i < childTravellers.length % roomsCount; i++) {
    roomGuests[i].noOfChild += 1;
  }
}

    // const roomGuests = paxRooms.map((r) => ({
    //   noOfAdults: Number(r.Adults || 0),
    //   noOfChild: Number(r.Children || 0),
    //   childAge: r.ChildrenAges || [],
    // }));


    // ✅ ADD THIS BLOCK HERE (EXACT PLACE)

// 🔥 VALIDATION (CRITICAL FIX)
const totalGuestsFromRooms = roomGuests.reduce(
  (sum, r) => sum + r.noOfAdults + r.noOfChild,
  0
);

const totalTravellers =
  adultTravellers.length + childTravellers.length;

if (totalGuestsFromRooms !== totalTravellers) {
  throw new ApiError(
    400,
    `Mismatch: roomGuests=${totalGuestsFromRooms}, travellers=${totalTravellers}`
  );
}
    let adultIdx = 0;
    let childIdx = 0;

    const HotelRoomsDetails = roomGuests.map((room, idx) => {
      const passengers = [];

      // Adults first
      for (let i = 0; i < room.noOfAdults; i++) {
        const traveller = adultTravellers[adultIdx];

        if (!traveller) {
          throw new ApiError(400, "Adult traveller count mismatch with rooms");
        }

        const rawPhone = String(traveller.phoneWithCode || "").replace(/\D/g, "");
const phone = rawPhone.slice(-10);

        const passenger = {
          Title: traveller.title,
          FirstName: traveller.firstName,
          MiddleName: traveller.middleName || "",
          LastName: traveller.lastName,
          Email: traveller.email || leadTraveller.email,
          // Phoneno: String(traveller.phoneWithCode || "").replace(/\D/g, ""),
          Phoneno: phone,

          PaxType: 1,

          // ✅ Lead per room (first passenger)
          LeadPassenger: passengers.length === 0,

          // 🔥 PAN Card for domestic bookings
          PAN: traveller.panCard || bookingPAN,
          PassportNo: traveller.PassportNo || null,
          PassportIssueDate: traveller.PassportIssueDate || null,
          PassportExpDate: traveller.PassportExpDate || null,
        };

        if (traveller.age) passenger.Age = parseInt(traveller.age);

        passengers.push(passenger);
        adultIdx++;
      }

      // Children
      for (let i = 0; i < room.noOfChild; i++) {
        const traveller = childTravellers[childIdx];
        if (!traveller) break;

        const passenger = {
          Title: traveller.title || "Master",
          FirstName: traveller.firstName,
          MiddleName: traveller.middleName || "",
          LastName: traveller.lastName,
          PaxType: 2,
          LeadPassenger: false,
          Email: null,
          Phoneno: String(leadTraveller.phoneWithCode || "").replace(/\D/g, "").slice(-10),
          PAN: bookingPAN,
          PassportNo: traveller.PassportNo || null,
          PassportIssueDate: traveller.PassportIssueDate || null,
          PassportExpDate: traveller.PassportExpDate || null,
        };

        const ages = room.childAge || [];
        if (ages[i]) passenger.Age = parseInt(ages[i]);
        else if (traveller.age) passenger.Age = parseInt(traveller.age);
        else passenger.Age = 10; // safe default

        passengers.push(passenger);
        childIdx++;
      }

      return {
        // TBO expects RoomIndex (1-based) alongside passengers
        RoomIndex: idx + 1,
        HotelPassenger: passengers,
      };
    });

    const bookResp = await hotelService.bookHotel({
      BookingCode: freshBookingCode.join(","),
      IsVoucherBooking: true,
      GuestNationality: booking.hotelRequest?.guestNationality || "IN",
      EndUserIp: process.env.TBO_END_USER_IP,
      // RequestedBookingMode: 5, // optional; omit to mirror Postman success cases
      NetAmount: netAmount,
      ClientReferenceId: booking.bookingReference,
      TraceId:
        preBookResp?.TraceId ||
        booking.hotelRequest?.traceId ||
        booking.hotelRequest?.TraceId,

      HotelRoomsDetails,
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

    // 🔥 FIX: Ensure pricingSnapshot has totalAmount
    if (!booking.pricingSnapshot?.totalAmount) {
      const totalFare =
        booking.hotelRequest?.allRooms?.[0]?.price?.totalFare ||
        booking.hotelRequest?.selectedRoom?.rawRoomData?.[0]?.TotalFare ||
        0;

      const roomCount = booking.hotelRequest?.noOfRooms || 1;

      booking.pricingSnapshot = {
        ...booking.pricingSnapshot,
        totalAmount: totalFare * roomCount,
        currency: booking.pricingSnapshot?.currency || "INR",
      };

      await booking.save();
    }

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
  // const { page = 1, limit = 10 } = req.query;

  const query = {
    userId: req.user._id,
    // bookingType: "hotel",
    executionStatus: { $in: ["voucher_generated"] }, // ✅ FIXED
  };

  // const skip = (Number(page) - 1) * Number(limit);

  const [rawBookings, total] = await Promise.all([
    HotelBookingRequest.find(query)
      .select(
        `
  bookingReference
  bookingType
  requestStatus
  executionStatus
  bookingSnapshot
  pricingSnapshot
  createdAt
  bookingResult
  hotelRequest.selectedRoom
  hotelRequest.selectedHotel
  amendment
  `,
      )
      .sort({ createdAt: -1 })
      // .skip(skip)
      // .limit(Number(limit))
      .lean(),
    HotelBookingRequest.countDocuments(query),
  ]);

  const bookings = rawBookings.map((booking) => {
    const result =
      booking?.bookingResult?.providerResponse?.BookResult ||
      booking?.bookingResult?.providerResponse;

    const selectedRoom = booking?.hotelRequest?.selectedRoom || {};
    const rawRoom = selectedRoom?.rawRoomData || {};

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

      // ✅ ROOM DETAILS (IMPORTANT)
      roomType: rawRoom?.Name?.[0] || selectedRoom?.roomTypeName || null,

      mealType: selectedRoom?.mealType || rawRoom?.MealType || null,

      isRefundable: selectedRoom?.isRefundable ?? rawRoom?.IsRefundable ?? null,

      cancelPolicies:
        rawRoom?.CancelPolicies || selectedRoom?.cancelPolicies || [],

      // ✅ NEW: images
      images,

      // ✅ NEW: hero image (first image)
      heroImage: images?.[0] || null,

      amendment: booking.amendment || null,
    };
  });

  // const pagination = {
  //   total,
  //   // page: Number(page),
  //   // pages: Math.ceil(total / limit),
  // };

  res.status(200).json({
    success: true,
    message: "Hotel bookings fetched successfully",
    data: {
      bookings,
      // pagination,
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

  const amendment = booking.amendment || null;

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

  /* ================= ROOMS NORMALIZATION ================= */

  // ✅ TBO rooms
  const tboRooms = Array.isArray(result?.Rooms) ? result.Rooms : [];

  // ✅ DB rooms (rawRoomData can be array or object)
  const dbRoomsRaw = booking?.hotelRequest?.selectedRoom?.rawRoomData;

  const dbRooms = Array.isArray(dbRoomsRaw)
    ? dbRoomsRaw
    : dbRoomsRaw
      ? [dbRoomsRaw]
      : [];

  // ✅ FINAL ROOMS (TBO priority)
  let rooms = [];

  if (tboRooms.length > 0 && dbRooms.length > 0) {
    // 🔥 MERGE TBO + DB (KEEP ORIGINAL ROOM TYPES)
    rooms = tboRooms.map((tboRoom, index) => {
      const dbRoom = dbRooms[index] || {};

      return {
        ...tboRoom,

        // ✅ FIX ROOM NAME FROM DB
        RoomTypeName: dbRoom?.Name?.[0]?.split(",")[0] || tboRoom.RoomTypeName,

        // ✅ FIX MEAL
        Inclusion: dbRoom?.Inclusion || tboRoom.Inclusion,

        // ✅ FIX REFUNDABLE
        IsRefundable: dbRoom?.IsRefundable ?? tboRoom.IsRefundable,
      };
    });
  } else {
    rooms = tboRooms.length > 0 ? tboRooms : dbRooms;
  }

  /* ================= IMAGES ================= */

  const images = rooms.flatMap((r) => r?.images || r?.Images || []);

  const heroImage = images[0] || null;

  /* ================= GUESTS ================= */

  const guests =
    rooms.flatMap((room) => room?.HotelPassenger || []) || travellers || [];

  /* ================= PRICING ================= */

  const totalFare = result?.InvoiceAmount || pricingSnapshot?.totalAmount || 0;

  const currency = result?.Currency || pricingSnapshot?.currency || "INR";

  /* ================= DATES ================= */

  const checkIn = result?.CheckInDate || bookingSnapshot?.checkInDate;

  const checkOut = result?.CheckOutDate || bookingSnapshot?.checkOutDate;

  /* ================= HOTEL INFO ================= */

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

      // ✅ NEW (CRITICAL FIX)
      rooms,

      // ✅ MEDIA
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

      amendment,

      // ✅ audit fields
      createdAt: booking.createdAt,
      approvedAt: booking.approvedAt,
      approvedBy: booking.approvedBy,
      rejectedAt: booking.rejectedAt,
      rejectedBy: booking.rejectedBy,
    },
  });
});

// @desc    Generate Voucher for booked hotel
// @route   POST /api/v1/hotel-bookings/:id/voucher
// @access  Private

exports.generateHotelVoucher = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const booking = await HotelBookingRequest.findById(id);

  if (!booking) throw new ApiError(404, "Booking not found");

  if (booking.userId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not authorized");
  }

  /* =====================================================
     ✅ STEP 1: IF PDF ALREADY EXISTS → DIRECT DOWNLOAD
  ====================================================== */

  if (booking.voucher?.filePath) {
    return res.download(booking.voucher.filePath);
  }

  /* =====================================================
     ✅ STEP 2: ALLOW BOTH STATES
  ====================================================== */

  if (!["booked", "voucher_generated"].includes(booking.executionStatus)) {
    throw new ApiError(400, "Booking not ready for voucher");
  }

  /* =====================================================
     ✅ STEP 3: CALL TBO ONLY IF NOT VOUCHERED
  ====================================================== */

  let voucherResp = booking.voucher?.raw || null;

  if (!voucherResp) {
    const rawResponse = booking.bookingResult?.providerResponse || {};
    // const bookResult = rawResponse.BookResult || rawResponse;
    const bookResult =
      booking.bookingResult?.providerResponse?.BookResult || {};

    const bookingIdTBO = bookResult?.BookingId;

    if (!bookingIdTBO) {
      throw new ApiError(400, "TBO BookingId not found");
    }

    voucherResp = await hotelService.generateVoucher({
      BookingId: bookingIdTBO,
      EndUserIp: process.env.TBO_END_USER_IP,
    });

    const result = voucherResp?.GenerateVoucherResult || voucherResp;

    if (!result?.VoucherStatus) {
      throw new ApiError(500, result?.Error?.ErrorMessage || "Voucher failed");
    }

    // ✅ HANDLE ALREADY GENERATED CASE
    if (result?.ResponseStatus !== 1) {
      console.warn("⚠️ Voucher already generated, continuing...");
    }
    /* ================= SAVE TBO RESPONSE ================= */

    booking.voucher = {
      bookingRefNo: result.BookingRefNo || bookResult.BookingRefNo,
      confirmationNo: result.ConfirmationNo || bookResult.ConfirmationNo,
      invoiceNumber: result.InvoiceNumber || null,
      raw: result,
    };
  }

  /* =====================================================
     ✅ STEP 4: GENERATE PDF (ONLY IF NOT EXISTS)
  ====================================================== */

  const filePath = await pdfService.generateHotelVoucher(booking);

  booking.voucher.filePath = filePath;
  booking.executionStatus = "voucher_generated";

  await booking.save();

  /* =====================================================
     ✅ STEP 5: DIRECT DOWNLOAD (BEST UX)
  ====================================================== */

  return res.download(filePath);
});
