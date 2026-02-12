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
const { getAgencyBalance } = require("../services/tboBalance.service");
const logger = require("../utils/logger");
const paymentService = require("../services/payment.service");
const BookingIntent = require("../models/BookingIntent");

// @desc    Create booking request (Approval-first)
// @route   POST /api/v1/bookings
// @access  Private

const sanitizeFlightRequest = (flightRequest) => ({
  traceId: flightRequest.traceId,
  resultIndex: flightRequest.resultIndex,

  // resultIndex:
  //   typeof flightRequest.resultIndex === "string"
  //     ? flightRequest.resultIndex
  //     : flightRequest.fareQuote?.Results?.[0]?.ResultIndex,

  segments: flightRequest.segments,
  fareQuote: {
    Results: Array.isArray(flightRequest.fareQuote.Results)
      ? flightRequest.fareQuote.Results
      : [flightRequest.fareQuote.Results],
  },
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

  const leadPassenger =
    travellers.find((t) => t.isLeadPassenger) || travellers[0];

  if (!leadPassenger?.phoneWithCode) {
    throw new ApiError(400, "Lead passenger phone number is required");
  }

  if (!leadPassenger?.email) {
    throw new ApiError(400, "Lead passenger email is required");
  }

  const fareResult = Array.isArray(flightRequest.fareQuote?.Results)
    ? flightRequest.fareQuote.Results[0]
    : flightRequest.fareQuote?.Results;

  if (!fareResult?.FareBreakdown || !fareResult.FareBreakdown.length) {
    throw new ApiError(400, "Valid FareQuote is required");
  }

  /* ================= BALANCE CHECK ================= */
  const env = process.env.TBO_ENV || "live";

  const balance = await getAgencyBalance(env);

  const availableBalance = balance.availableBalance;
  const requiredAmount = Number(pricingSnapshot.totalAmount);

  if (availableBalance < requiredAmount) {
    throw new ApiError(
      400,
      `Insufficient agency balance. Available ₹${availableBalance}, Required ₹${requiredAmount}`,
    );
  }

  let bookingSnapshot;

  if (bookingType === "flight" && Array.isArray(flightRequest?.segments)) {
    const segments = flightRequest.segments;

    // <<<<<<< HEAD
    // ONE-WAY (existing behavior preserved)
    if (segments.length === 1) {
      const s = segments[0];

      bookingSnapshot = {
        sectors: [`${s.origin.airportCode}-${s.destination.airportCode}`],
        airline: s.airlineName,
        travelDate: new Date(s.departureDateTime),
        returnDate: null,
        cabinClass:
          s.cabinClass === 1
            ? "Economy"
            : s.cabinClass === 2
              ? "Premium Economy"
              : s.cabinClass === 3
                ? "Business"
                : "Economy",
        amount: pricingSnapshot.totalAmount,
        purposeOfTravel,
        city: s.destination.city,
      };
    }

    // ROUND-TRIP (NEW)
    else {
      const onward = segments.find((s) => s.journeyType === "onward");
      const ret = segments.find((s) => s.journeyType === "return");

      if (!onward || !ret) {
        throw new ApiError(400, "Invalid round-trip segments");
      }

      bookingSnapshot = {
        sectors: [
          `${onward.origin.airportCode}-${onward.destination.airportCode}`,
          `${ret.origin.airportCode}-${ret.destination.airportCode}`,
        ],
        airline: [...new Set(segments.map((s) => s.airlineName))].join(", "),
        travelDate: new Date(onward.departureDateTime),
        returnDate: new Date(ret.departureDateTime),
        cabinClass: "Economy", // frontend controlled
        amount: pricingSnapshot.totalAmount,
        purposeOfTravel,
        city: ret.destination.city,
      };
    }

    // =======
    //     bookingSnapshot = {
    //       sectors: [
    //         `${segment.origin.airportCode}-${segment.destination.airportCode}`,
    //       ],
    //       airline: segment.airlineName,
    //       travelDate: segment.departureDateTime,
    //       returnDate: segment.arrivalDateTime,
    //       cabinClass:
    //         segment.cabinClass === 1
    //           ? "Economy"
    //           : segment.cabinClass === 2
    //           ? "Premium Economy"
    //           : segment.cabinClass === 3
    //           ? "Business"
    //           : "Economy",
    //       amount: pricingSnapshot.totalAmount,
    //       purposeOfTravel,
    //       city: segment.destination.city,
    //     };
    // >>>>>>> d5de6b9290f0417c8d6b38e9aa73e68f776f4f0f
  }

  /* ================= CREATE BOOKING REQUEST ================= */

  // const freshFareQuote = await tboService.getFareQuote(
  //   flightRequest.traceId,
  //   flightRequest.resultIndex,
  // );
  // const finalResultIndex =
  //   typeof flightRequest.resultIndex === "string"
  //     ? flightRequest.resultIndex
  //     : flightRequest.resultIndex?.onward; // fallback safety

  // const freshFareQuote = await tboService.getFareQuote(
  //   flightRequest.traceId,
  //   finalResultIndex,
  // );

  let freshFareQuote;

  if (typeof flightRequest.resultIndex === "object") {
    const onwardFare = await tboService.getFareQuote(
      flightRequest.traceId,
      flightRequest.resultIndex.onward,
    );

    const returnFare = await tboService.getFareQuote(
      flightRequest.traceId,
      flightRequest.resultIndex.return,
    );

    freshFareQuote = {
      Results: [onwardFare.Response.Results, returnFare.Response.Results],
    };
  } else {
    freshFareQuote = await tboService.getFareQuote(
      flightRequest.traceId,
      flightRequest.resultIndex,
    );
  }

  const bookingRequest = await BookingRequest.create({
    bookingReference: generateBookingReference(),
    bookingType,
    corporateId: corporate._id,
    userId: user._id,

    requestStatus: "pending_approval",
    executionStatus: "not_started",

    fareQuote: freshFareQuote,

    purposeOfTravel,
    travellers,
    flightRequest:
      bookingType === "flight"
        ? {
            ...sanitizeFlightRequest(flightRequest),
            segments: flightRequest.segments, // ✅ FULL SEGMENTS
          }
        : undefined,

    hotelRequest: bookingType === "hotel" ? hotelRequest : undefined,

    pricingSnapshot: {
      totalAmount: pricingSnapshot.totalAmount,
      currency: pricingSnapshot.currency || "INR",
      capturedAt: new Date(),
    },
    bookingSnapshot,
    // bookingSnapshot: req.body.bookingSnapshot,
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
      "Booking request submitted for approval",
    ),
  );
});

// @desc    Get logged-in user's approved / pending approval flight requests (not ticketed)
// @route   GET /api/v1/bookings/my
// @access  Private (Employee)
exports.getMyRequests = asyncHandler(async (req, res) => {
  const bookings = await BookingRequest.find({
    userId: req.user._id, // 🔐 ownership enforced
    bookingType: "flight",

    // ✅ approved OR pending_approval
    requestStatus: { $in: ["approved", "pending_approval"] },

    // ✅ exclude ticketed
    executionStatus: { $ne: "ticketed" },
  })
    .populate("approvedBy", "name email role")
    .sort({ createdAt: -1 })
    .select(
      "bookingType requestStatus executionStatus flightRequest pricingSnapshot createdAt",
    );

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        bookings,
        "Approved and pending approval requests pending booking fetched",
      ),
    );
});

// @desc    Get single booking request (Employee)
// @route   GET /api/v1/bookings/my/:id
// @access  Private (Employee)
exports.getMyRequestById = asyncHandler(async (req, res) => {
  // const bookingRequest = await BookingRequest.findById(req.params.id);
  const bookingRequest = await BookingRequest.findById(req.params.id)
    .populate("approvedBy", "name email role")
    .populate("rejectedBy", "name email role");

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
        "Booking request fetched successfully",
      ),
    );
});

// @desc    Get my rejected booking requests
// @route   GET /api/v1/bookings/my/rejected
// @access  Private (Employee)
exports.getMyRejectedRequests = asyncHandler(async (req, res) => {
  const requests = await BookingRequest.find({
    userId: req.user._id,
    requestStatus: "rejected",
  })
    .populate("rejectedBy", "name email")
    .sort({ rejectedAt: -1 });

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        requests,
        "My rejected requests fetched successfully",
      ),
    );
});

// @desc    Confirm booking after approval
// @route   POST /api/v1/bookings/:bookingId/execute-flight
// @access  Private

const isTraceExpiredError = (err) => {
  const msg =
    err?.message?.toLowerCase() ||
    err?.response?.Error?.ErrorMessage?.toLowerCase() ||
    "";

  return (
    msg.includes("trace id") ||
    msg.includes("traceid") ||
    msg.includes("session expired") ||
    msg.includes("session timeout") ||
    msg.includes("invalid trace") ||
    msg.includes("search again")
  );
};

const toTboDateTime = (value) => {
  if (!value) {
    throw new Error("Invalid date value");
  }

  // Case 1: already correct TBO format
  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(value)
  ) {
    return value;
  }

  // Case 2: ISO string from Mongo / JS
  if (typeof value === "string" && !isNaN(Date.parse(value))) {
    return new Date(value).toISOString().slice(0, 19);
  }

  // Case 3: Date object
  if (value instanceof Date) {
    return value.toISOString().slice(0, 19);
  }

  throw new Error(`Invalid TBO date format: ${value}`);
};

const cabinClassToCode = (cabin) =>
  ({
    Economy: 2,
    "Premium Economy": 3,
    Business: 4,
    "Premium Business": 5,
    First: 6,
  })[cabin] || 2;

const buildTboRevalidationSearchPayload = (booking, intent) => {
  const segments = booking.flightRequest.segments;
  const isRoundTrip = segments.length === 2;

  const adultCount = 1;

  if (adultCount < 1) {
    throw new ApiError(400, "At least one adult is required for TBO search");
  }

  const basePayload = {
    AdultCount: adultCount,
    ChildCount: booking.travellers.filter((t) => t.paxType === "CHILD").length,
    InfantCount: booking.travellers.filter((t) => t.paxType === "INFANT")
      .length,
    DirectFlight: false,
    OneStopFlight: false,
    JourneyType: isRoundTrip ? 2 : 1,
    Segments: [],
    Sources: intent.airlineCodes?.length ? intent.airlineCodes : null,
  };

  // ✅ ONE-WAY (UNCHANGED BEHAVIOR)
  if (!isRoundTrip) {
    basePayload.Segments.push({
      Origin: intent.origin,
      Destination: intent.destination,
      FlightCabinClass: cabinClassToCode(intent.cabinClass),
      PreferredDepartureTime: toTboDateTime(intent.travelDate),
    });

    return basePayload;
  }

  // ✅ ROUND-TRIP (TBO COMPLIANT)
  basePayload.Segments.push(
    {
      Origin: intent.origin,
      Destination: intent.destination,
      FlightCabinClass: cabinClassToCode(intent.cabinClass),
      PreferredDepartureTime: toTboDateTime(intent.travelDate),
    },
    {
      Origin: intent.destination,
      Destination: intent.origin,
      FlightCabinClass: cabinClassToCode(intent.cabinClass),
      PreferredDepartureTime: toTboDateTime(intent.returnDate),
    },
  );

  return basePayload;
};

const performBooking = async ({ booking, passengers, corporate, isLCC }) => {
  const rawResultIndex = booking.flightRequest.resultIndex;

  booking.executionStatus = "booking_initiated";
  await booking.save();

  /* ===================================================
     ROUND TRIP
  =================================================== */
  // if (typeof rawResultIndex === "object") {
  //   const onwardIndex = rawResultIndex.onward;
  //   const returnIndex = rawResultIndex.return;

  //   /* -------- BOOK ONWARD -------- */
  //   const onwardResp = await tboService.bookFlight({
  //     IsLCC: isLCC,
  //     traceId: booking.flightRequest.traceId,
  //     resultIndex: onwardIndex,
  //     result: booking.flightRequest.fareQuote.Results[0],
  //     passengers,
  //     ssr: booking.flightRequest.ssrSnapshot,
  //   });

  //   const onwardPNR =
  //     onwardResp?.raw?.Response?.Response?.PNR ||
  //     onwardResp?.raw?.Response?.Response?.FlightItinerary?.PNR;

  //   if (!onwardPNR) {
  //     throw new ApiError(500, "Onward booking failed");
  //   }

  //   /* -------- BOOK RETURN -------- */
  //   const returnResp = await tboService.bookFlight({
  //     IsLCC: isLCC,
  //     traceId: booking.flightRequest.traceId,
  //     resultIndex: returnIndex,
  //     result: booking.flightRequest.fareQuote.Results[1],
  //     passengers,
  //     ssr: booking.flightRequest.ssrSnapshot,
  //   });

  //   const returnPNR =
  //     returnResp?.raw?.Response?.Response?.PNR ||
  //     returnResp?.raw?.Response?.Response?.FlightItinerary?.PNR;

  //   if (!returnPNR) {
  //     throw new ApiError(500, "Return booking failed");
  //   }

  //   /* -------- SAVE BOTH -------- */
  //   booking.bookingResult = {
  //     pnr: `${onwardPNR} / ${returnPNR}`, // ✅ unified field
  //     onwardPNR,
  //     returnPNR,
  //     onwardResponse: onwardResp.raw,
  //     returnResponse: returnResp.raw,
  //   };

  //   booking.executionStatus = "booked";
  //   await booking.save();

  //   await paymentService.processBookingPayment({ booking, corporate });

  //   booking.executionStatus = "ticketed";
  //   await booking.save();

  //   return {
  //     bookingId: booking._id,
  //     onwardPNR,
  //     returnPNR,
  //   };
  // }

  if (typeof rawResultIndex === "object") {
    const onwardIndex = rawResultIndex.onward;
    const returnIndex = rawResultIndex.return;

    /* ================= LCC FLOW ================= */
    if (isLCC) {
      const onwardResp = await tboService.ticketFlight({
        traceId: booking.flightRequest.traceId,
        resultIndex: onwardIndex,
        result: booking.flightRequest.fareQuote.Results[0],
        passengers,
        ssr: booking.flightRequest.ssrSnapshot,
        isLCC: true,
      });

      const returnResp = await tboService.ticketFlight({
        traceId: booking.flightRequest.traceId,
        resultIndex: returnIndex,
        result: booking.flightRequest.fareQuote.Results[1],
        passengers,
        ssr: booking.flightRequest.ssrSnapshot,
        isLCC: true,
      });

      console.log(
        "🟡 LCC ONWARD TICKET RESPONSE:",
        JSON.stringify(onwardResp, null, 2),
      );

      console.log(
        "🟡 LCC RETURN TICKET RESPONSE:",
        JSON.stringify(returnResp, null, 2),
      );

      const onwardPNR =
        onwardResp?.Response?.Response?.PNR ||
        onwardResp?.Response?.Response?.FlightItinerary?.PNR;

      const returnPNR =
        returnResp?.Response?.Response?.PNR ||
        returnResp?.Response?.Response?.FlightItinerary?.PNR;

      if (!onwardPNR || !returnPNR) {
        throw new ApiError(500, "LCC Ticketing failed");
      }

      booking.bookingResult = {
        pnr: `${onwardPNR} / ${returnPNR}`,
        onwardPNR,
        returnPNR,
        onwardResponse: onwardResp.raw,
        returnResponse: returnResp.raw,
      };

      booking.executionStatus = "ticketed";
      await booking.save();

      await paymentService.processBookingPayment({ booking, corporate });

      return {
        bookingId: booking._id,
        onwardPNR,
        returnPNR,
      };
    }

    /* ================= NON-LCC (UNCHANGED) ================= */

    const onwardResp = await tboService.bookFlight({
      IsLCC: false,
      traceId: booking.flightRequest.traceId,
      resultIndex: onwardIndex,
      result: booking.flightRequest.fareQuote.Results[0],
      passengers,
      ssr: booking.flightRequest.ssrSnapshot,
    });

    const returnResp = await tboService.bookFlight({
      IsLCC: false,
      traceId: booking.flightRequest.traceId,
      resultIndex: returnIndex,
      result: booking.flightRequest.fareQuote.Results[1],
      passengers,
      ssr: booking.flightRequest.ssrSnapshot,
    });

    const onwardPNR =
      onwardResp?.raw?.Response?.Response?.PNR ||
      onwardResp?.raw?.Response?.Response?.FlightItinerary?.PNR;

    const returnPNR =
      returnResp?.raw?.Response?.Response?.PNR ||
      returnResp?.raw?.Response?.Response?.FlightItinerary?.PNR;

    if (!onwardPNR || !returnPNR) {
      throw new ApiError(500, "Booking failed");
    }

    booking.bookingResult = {
      pnr: `${onwardPNR} / ${returnPNR}`,
      onwardPNR,
      returnPNR,
      onwardResponse: onwardResp.raw,
      returnResponse: returnResp.raw,
    };

    booking.executionStatus = "booked";
    await booking.save();

    await paymentService.processBookingPayment({ booking, corporate });

    booking.executionStatus = "ticketed";
    await booking.save();

    return {
      bookingId: booking._id,
      onwardPNR,
      returnPNR,
    };
  }

  /* ===================================================
     ONE WAY (Existing Logic)
  =================================================== */

  if (isLCC) {
    const ticketResp = await tboService.ticketFlight({
      traceId: booking.flightRequest.traceId,
      resultIndex: rawResultIndex,
      result: booking.flightRequest.fareQuote.Results[0],
      passengers,
      ssr: booking.flightRequest.ssrSnapshot,
      isLCC: true,
    });

    console.log(
      "🟡 LCC  TICKET RESPONSE:",
      JSON.stringify(ticketResp, null, 1),
    );

    const extractedPNR =
      ticketResp?.Response?.Response?.PNR ||
      ticketResp?.Response?.Response?.FlightItinerary?.PNR;

    if (!extractedPNR) {
      throw new ApiError(500, "LCC Ticketing failed");
    }

    booking.bookingResult = {
      pnr: extractedPNR,
      providerResponse: ticketResp.raw,
    };

    booking.executionStatus = "ticketed";
    await booking.save();

    await paymentService.processBookingPayment({ booking, corporate });

    return {
      bookingId: booking._id,
      pnr: extractedPNR,
    };
  }

  /* ================= NON-LCC (UNCHANGED) ================= */

  const bookResp = await tboService.bookFlight({
    IsLCC: isLCC,
    traceId: booking.flightRequest.traceId,
    resultIndex: rawResultIndex,
    result: booking.flightRequest.fareQuote.Results[0],
    passengers,
    ssr: booking.flightRequest.ssrSnapshot,
  });

  const extractedPNR =
    bookResp?.raw?.Response?.Response?.PNR ||
    bookResp?.raw?.Response?.Response?.FlightItinerary?.PNR;

  if (!extractedPNR) {
    throw new ApiError(500, "Booking failed");
  }

  booking.bookingResult = {
    pnr: extractedPNR,
    providerResponse: bookResp.raw,
  };

  booking.executionStatus = "booked";
  await booking.save();

  await paymentService.processBookingPayment({ booking, corporate });

  booking.executionStatus = "ticketed";
  await booking.save();

  return {
    bookingId: booking._id,
    pnr: extractedPNR,
  };
};

const normalizeSearchResults = (searchResp) => {
  if (!searchResp || !Array.isArray(searchResp.Results)) return [];

  // Case 1: Results = [ [ {...}, {...} ] ]
  if (Array.isArray(searchResp.Results[0])) {
    return searchResp.Results.flat();
  }

  // Case 2: Results = [ {...}, {...} ]
  return searchResp.Results;
};

const findBestMatchingFlight = ({ searchResp, intent }) => {
  const results = normalizeSearchResults(searchResp);

  if (!results.length) {
    throw new ApiError(409, "No flights found during revalidation");
  }

  const matched = results.filter((r) => {
    const seg = r.Segments?.[0]?.[0];
    if (!seg) return false;

    return (
      intent.airlineCodes.includes(seg.Airline?.AirlineCode) &&
      seg.CabinClass === cabinClassToCode(intent.cabinClassCode) &&
      r.Fare.PublishedFare <= intent.maxApprovedPrice
    );
  });

  if (!matched.length) {
    throw new ApiError(
      409,
      "Flights found but airline/cabin mismatch during revalidation",
    );
  }

  matched.sort((a, b) => a.Fare.PublishedFare - b.Fare.PublishedFare);
  return matched[0];
};

exports.executeApprovedFlightBooking = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;

  const booking = await BookingRequest.findById(bookingId);
  if (!booking) throw new ApiError(404, "Booking not found");

  const intent = await BookingIntent.findOne({
    bookingRequestId: booking._id,
    approvalStatus: "approved",
  });
  if (!intent) throw new ApiError(400, "No approved booking intent found");

  if (booking.requestStatus !== "approved")
    throw new ApiError(400, "Booking not approved");

  const corporate = await Corporate.findById(booking.corporateId);
  if (!corporate) throw new ApiError(404, "Corporate not found");

  const leadPassenger =
    booking.travellers.find((t) => t.isLeadPassenger) || booking.travellers[0];

  // const passengers = booking.travellers.map((t) => ({
  //   title: t.title,
  //   firstName: t.firstName,
  //   lastName: t.lastName,
  //   paxType: t.paxType || "ADULT",
  //   dateOfBirth: t.dateOfBirth,
  //   gender: t.gender,
  //   passportNo: t.passportNumber,
  //   passportExpiry: t.passportExpiry,
  //   email: t.email || leadPassenger.email,
  //   contactNo: t.phoneWithCode || leadPassenger.phoneWithCode,
  // }));

  const fare = booking.flightRequest.fareQuote.Results[0].Fare;

const passengers = booking.travellers.map((t) => ({
  title:
    t.gender?.toUpperCase() === "MALE"
      ? "Mr"
      : "Ms",

  firstName: t.firstName?.trim(),
  lastName: t.lastName?.trim(),

  paxType: 1, // always adult

  dateOfBirth: t.dateOfBirth,
  gender: t.gender,

  passportNo: t.passportNumber,
  passportExpiry: t.passportExpiry,

  email: t.email || leadPassenger.email,
  contactNo: t.phoneWithCode || leadPassenger.phoneWithCode,

  isLeadPax: true,
}));


  const fareResult = booking.flightRequest.fareQuote.Results[0];
  const isLCC = fareResult?.IsLCC === true;

  try {
    const result = await performBooking({
      booking,
      passengers,
      corporate,
      isLCC,
    });

    return res
      .status(200)
      .json(new ApiResponse(200, result, "Flight booked successfully"));
  } catch (err) {
    logger.error("BOOKING FAILED", {
      bookingId: booking._id,
      message: err.message,
      providerError: err?.response?.data,
      traceId: booking.flightRequest.traceId,
    });

    if (isTraceExpiredError(err)) {
      logger.warn("TRACE EXPIRED → REVALIDATING", {
        bookingId: booking._id,
        oldTraceId: booking.flightRequest.traceId,
      });

      const searchPayload = buildTboRevalidationSearchPayload(booking, intent);

      logger.info("TBO REVALIDATION SEARCH PAYLOAD", searchPayload);

      const searchResp = await tboService.searchFlights(searchPayload);
      logger.info("REVALIDATION SEARCH RESULT COUNT", {
        count: Array.isArray(searchResp.Results)
          ? searchResp.Results.length
          : 0,
      });

      const matched = findBestMatchingFlight({
        searchResp,
        // booking,
        intent,
      });

      const fareQuote = await tboService.getFareQuote(
        searchResp.TraceId,
        matched.ResultIndex,
      );

      booking.flightRequest.traceId = searchResp.TraceId;
      booking.flightRequest.resultIndex = matched.ResultIndex;
      // booking.flightRequest.resultIndex =
      //   typeof matched.ResultIndex === "object"
      //     ? matched.ResultIndex.onward
      //     : matched.ResultIndex;

      booking.flightRequest.fareQuote = fareQuote;
      await booking.save();

      const result = await performBooking({
        booking,
        passengers,
        corporate,
        isLCC,
      });

      return res
        .status(200)
        .json(new ApiResponse(200, result, "Flight revalidated & booked"));
    }

    booking.executionStatus = "failed";
    await booking.save();
    throw err;
  }
});

// @desc    Download ticket PDF
// @route   GET /api/v1/bookings/:id/ticket-pdf
// @access  Private (Employee)
exports.downloadTicketPdf = asyncHandler(async (req, res) => {
  const { journeyType } = req.query;
  const booking = await BookingRequest.findById(req.params.id);

  if (!booking) {
    throw new ApiError(404, "Booking not found");
  }

  // 🔐 ownership check
  if (booking.userId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not authorized");
  }

  if (booking.executionStatus !== "ticketed") {
    throw new ApiError(400, "Ticket not available yet");
  }

  const pnr = booking.bookingResult?.pnr;
  if (!pnr) {
    throw new ApiError(400, "PNR missing");
  }

  // ✅ fetch booking details from TBO
  const details = await tboService.getBookingDetails(pnr);

  // ✅ generate PDF
  const pdfPath = await pdfService.generateFlightTicketPdf({
    booking,
    journeyType,
    tboDetails: details,
  });

  return res.download(pdfPath);
});

// @desc    Employee - Get my bookings (all statuses)
// @route   GET /api/v1/bookings/my
// @access  Private (Employee)
exports.getMyBookings = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, bookingType = "flight" } = req.query;

  const query = {
    userId: req.user._id,
    bookingType,
    executionStatus: ["ticketed", "ticket_pending"],
  };

  const skip = (Number(page) - 1) * Number(limit);

  const [rawBookings, total] = await Promise.all([
    BookingRequest.find(query)
      .select(
        "bookingReference bookingType requestStatus executionStatus bookingSnapshot pricingSnapshot createdAt bookingResult",
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(), // IMPORTANT for safe mutation
    BookingRequest.countDocuments(query),
  ]);

  const bookings = rawBookings.map((booking) => {
    const providerResponse =
      booking?.bookingResult?.providerResponse?.Response?.Response;

    const flightItinerary = providerResponse?.FlightItinerary;

    // PNR resolution priority
    // const pnr =
    //   providerResponse?.PNR ||
    //   flightItinerary?.PNR ||
    //   flightItinerary?.Segments?.[0]?.AirlinePNR ||
    //   null;

    let pnr = null;

    if (booking.bookingResult?.pnr) {
      pnr = booking.bookingResult.pnr;
    } else if (booking.bookingResult?.onwardPNR) {
      pnr = `${booking.bookingResult.onwardPNR} / ${booking.bookingResult.returnPNR}`;
    }

    return {
      ...booking,
      pnr,
    };
  });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        bookings,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / limit),
        },
      },
      "Ticketed flight bookings fetched successfully",
    ),
  );
});

// @desc    Employee - Get my booking by ID
// @route   GET /api/v1/bookings/my/:id
// @access  Private (Employee)
exports.getMyBookingById = asyncHandler(async (req, res) => {
  const booking = await BookingRequest.findById(req.params.id).lean();

  if (!booking) {
    throw new ApiError(404, "Booking not found");
  }

  // 🔐 Ownership check
  if (booking.userId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not authorized to view this booking");
  }

  // ✅ DERIVE PAYMENT STATUS FROM WALLET
  const paymentTxn = await WalletTransaction.findOne({
    bookingId: booking._id,
    type: "debit",
    status: "completed",
  })
    .sort({ createdAt: -1 })
    .select("_id amount createdAt");

  booking.payment = paymentTxn
    ? {
        status: "completed",
        method: "wallet",
        amount: paymentTxn.amount,
        paidAt: paymentTxn.createdAt,
        transactionId: paymentTxn._id,
      }
    : {
        status: "pending",
      };

  return res
    .status(200)
    .json(
      new ApiResponse(200, booking, "Booking details fetched successfully"),
    );
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
      "Bookings fetched successfully",
    ),
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
      new ApiResponse(200, booking, "Booking details fetched successfully"),
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
      "Only confirmed or approved bookings can be cancelled",
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

module.exports = {
  createBookingRequest: exports.createBookingRequest,
  getMyRequests: exports.getMyRequests,
  getMyRequestById: exports.getMyRequestById,
  getMyRejectedRequests: exports.getMyRejectedRequests,
  executeApprovedFlightBooking: exports.executeApprovedFlightBooking,
  downloadTicketPdf: exports.downloadTicketPdf,
  getMyBookings: exports.getMyBookings,
  getMyBookingById: exports.getMyBookingById,
  getAllBookings: exports.getAllBookings,
  getBooking: exports.getBooking,
  cancelBooking: exports.cancelBooking,
};
