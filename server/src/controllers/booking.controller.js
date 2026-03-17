// server/src/controllers/booking.controller.js
const Booking = require("../models/Booking");
const BookingRequest = require("../models/BookingRequest");
const Approval = require("../models/Approval");
const Corporate = require("../models/Corporate");
const WalletTransaction = require("../models/Wallet");
const Ledger = require("../models/Ledger");
const tboService = require("../services/tektravels/flight.service");
const hotelTboService = require("../services/tektravels/hotel.service");
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

const logLccTicketPayload = ({
  bookingId,
  traceId,
  resultIndex,
  passengers,
  ssr,
  segmentType,
}) => {
  logger.info("🟢 LCC DIRECT TICKETING INITIATED", {
    bookingId,
    segmentType,
    traceId,
    resultIndex,
    passengerCount: passengers.length,
  });

  logger.debug("🟢 LCC TICKET PAYLOAD", {
    bookingId,
    segmentType,
    payload: {
      TraceId: traceId,
      ResultIndex: resultIndex,
      Passengers: passengers.map((p) => ({
        title: p.title,
        firstName: p.firstName,
        lastName: p.lastName,
        paxType: p.paxType,
        isLeadPax: p.isLeadPax,
        city: p.city,
        countryCode: p.countryCode,
      })),
      SSR: ssr,
    },
  });
};

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
    travellers.find((t) => t.isLeadPassenger || t.isLeadGuest) || travellers[0];

  if (!leadPassenger?.phoneWithCode) {
    throw new ApiError(400, "Lead passenger phone number is required");
  }

  if (!leadPassenger?.email) {
    throw new ApiError(400, "Lead passenger email is required");
  }

  if (bookingType === "flight") {
    const fareResult = Array.isArray(flightRequest.fareQuote?.Results)
      ? flightRequest.fareQuote.Results[0]
      : flightRequest.fareQuote?.Results;

    if (!fareResult?.FareBreakdown || !fareResult.FareBreakdown.length) {
      throw new ApiError(400, "Valid FareQuote is required");
    }
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
    // if (segments.length === 1) {
    //   const s = segments[0];

    //   bookingSnapshot = {
    //     sectors: [`${s.origin.airportCode}-${s.destination.airportCode}`],
    //     airline: s.airlineName,
    //     travelDate: s.departureDateTime,
    //     returnDate: null,
    //     cabinClass:
    //       s.cabinClass === 1
    //         ? "Economy"
    //         : s.cabinClass === 2
    //           ? "Premium Economy"
    //           : s.cabinClass === 3
    //             ? "Business"
    //             : "Economy",
    //     amount: pricingSnapshot.totalAmount,
    //     purposeOfTravel,
    //     city: s.destination.city,
    //   };
    // }

    // // ROUND-TRIP (NEW)
    // else {
    //   const onward = segments.find((s) => s.journeyType === "onward");
    //   const ret = segments.find((s) => s.journeyType === "return");

    //   if (!onward || !ret) {
    //     throw new ApiError(400, "Invalid round-trip segments");
    //   }

    //   bookingSnapshot = {
    //     sectors: [
    //       `${onward.origin.airportCode}-${onward.destination.airportCode}`,
    //       `${ret.origin.airportCode}-${ret.destination.airportCode}`,
    //     ],
    //     airline: [...new Set(segments.map((s) => s.airlineName))].join(", "),
    //     travelDate: onward.departureDateTime,
    //     returnDate: ret.departureDateTime,
    //     cabinClass: "Economy", // frontend controlled
    //     amount: pricingSnapshot.totalAmount,
    //     purposeOfTravel,
    //     city: ret.destination.city,
    //   };
    // }

    const hasReturn = segments.some((s) => s.journeyType === "return");

    if (!hasReturn) {
      // ✅ ONE WAY (even if multiple segments due to layover)

      const first = segments[0];
      const last = segments[segments.length - 1];

      bookingSnapshot = {
        sectors: [
          `${first.origin.airportCode}-${last.destination.airportCode}`,
        ],
        airline: [...new Set(segments.map((s) => s.airlineName))].join(", "),
        travelDate: first.departureDateTime,
        returnDate: null,
        cabinClass: "Economy",
        amount: pricingSnapshot.totalAmount,
        purposeOfTravel,
        city: last.destination.city,
      };
    } else {
      // ✅ TRUE ROUND TRIP

      const onward = segments.find((s) => s.journeyType === "onward");
      const ret = segments.find((s) => s.journeyType === "return");

      bookingSnapshot = {
        sectors: [
          `${onward.origin.airportCode}-${onward.destination.airportCode}`,
          `${ret.origin.airportCode}-${ret.destination.airportCode}`,
        ],
        airline: [...new Set(segments.map((s) => s.airlineName))].join(", "),
        travelDate: onward.departureDateTime,
        returnDate: ret.departureDateTime,
        cabinClass: "Economy",
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
  } else if (bookingType === "hotel") {
    // Hotel Snapshot is already well-defined in the request body from frontend
    bookingSnapshot = req.body.bookingSnapshot || {
      hotelName: hotelRequest?.hotelName,
      city: hotelRequest?.city,
      checkInDate: hotelRequest?.checkInDate,
      checkOutDate: hotelRequest?.checkOutDate,
      roomCount: hotelRequest?.rooms?.length || 1,
      amount: pricingSnapshot.totalAmount,
    };
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

  if (bookingType === "flight") {
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
  }

  const bookingRequest = new BookingRequest({
    bookingReference: generateBookingReference(),
    corporateId: corporate._id,
    userId: user._id,
    bookingType,
    flightRequest:
      bookingType === "flight"
        ? {
            ...sanitizeFlightRequest(flightRequest),
            segments: flightRequest.segments, // ✅ FULL SEGMENTS
            fareQuote: freshFareQuote, // Store the fresh quote
          }
        : undefined,

    hotelRequest: bookingType === "hotel" ? hotelRequest : undefined,

    travellers: travellers.map((t) => ({
      ...t,
      isLeadPassenger: t.isLeadGuest ?? t.isLeadPassenger,
    })),
    purposeOfTravel,

    pricingSnapshot: {
      totalAmount: pricingSnapshot.totalAmount,
      currency: pricingSnapshot.currency || "INR",
      capturedAt: new Date(),
    },
    bookingSnapshot,
    requestStatus: "pending_approval",
  });

  await bookingRequest.save();

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
    bookingType: { $in: ["flight", "hotel"] },

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

const cabinClassToCode = (cabin) =>
  ({
    Economy: 2,
    "Premium Economy": 3,
    Business: 4,
    "Premium Business": 5,
    First: 6,
  })[cabin] || 2;

const getCorporateAddressForPassenger = async (employeeEmail) => {
  const domain = employeeEmail.split("@")[1]?.toLowerCase();

  if (!domain) {
    throw new ApiError(400, "Invalid employee email domain");
  }

  const corporate = await Corporate.findOne({
    "ssoConfig.domain": domain,
    isActive: true,
  });

  if (!corporate) {
    throw new ApiError(404, `No corporate found for domain ${domain}`);
  }

  const addr = corporate.registeredAddress;

  if (!addr?.street || !addr?.city || !addr?.country) {
    throw new ApiError(400, "Corporate registered address incomplete");
  }

  return {
    AddressLine1: addr.street,
    City: addr.city,
    CountryCode: "IN", // map properly if multi-country later
    CountryName: addr.country,
  };
};

const buildTboRevalidationSearchPayload = (booking, intent) => {
  const segments = booking.flightRequest.segments;
  const isRoundTrip = segments.length === 2;

  const adultCount = 1;

  if (adultCount < 1) {
    throw new ApiError(400, "At least one adult is required for TBO search");
  }

  console.log("ORIGINAL STORED SEGMENT:", booking.flightRequest.segments[0]);

  const basePayload = {
    AdultCount: adultCount,
    ChildCount: booking.travellers.filter((t) => t.paxType === "CHILD").length,
    InfantCount: booking.travellers.filter((t) => t.paxType === "INFANT")
      .length,
    DirectFlight: false,
    OneStopFlight: false,
    JourneyType: isRoundTrip ? 2 : 1,
    Segments: [],
    // Sources: intent.airlineCodes?.length ? intent.airlineCodes : null,
  };

  // ✅ ONE-WAY (UNCHANGED BEHAVIOR)
  if (!isRoundTrip) {
    const segment = segments[0];

    basePayload.Segments.push({
      Origin: segment.origin.airportCode,
      Destination: segment.destination.airportCode,
      FlightCabinClass: segment.cabinClass,
      PreferredDepartureTime: segment.departureDateTime.slice(0, 19),
    });

    return basePayload;
  }

  // ✅ ROUND-TRIP (TBO COMPLIANT)
  const onward = segments[0];
  const ret = segments[1];

  basePayload.Segments.push(
    {
      Origin: onward.origin.airportCode,
      Destination: onward.destination.airportCode,
      FlightCabinClass: onward.cabinClass,
      PreferredDepartureTime: onward.departureDateTime.slice(0, 19),
    },
    {
      Origin: ret.origin.airportCode,
      Destination: ret.destination.airportCode,
      FlightCabinClass: ret.cabinClass,
      PreferredDepartureTime: ret.departureDateTime.slice(0, 19),
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
        onwardResponse: onwardResp,
        returnResponse: returnResp,
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
      onwardResponse: onwardResp,
      returnResponse: returnResp,
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
    logLccTicketPayload({
      bookingId: booking._id,
      traceId: booking.flightRequest.traceId,
      resultIndex: rawResultIndex,
      passengers,
      ssr: booking.flightRequest.ssrSnapshot,
      // segmentType: "onward",
    });

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
      providerResponse: ticketResp,
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
    providerResponse: bookResp,
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
      // intent.airlineCodes.includes(seg.Airline?.AirlineCode)
      intent.airlineCodes.includes(seg.Airline?.AirlineCode?.trim()) &&
      // seg.CabinClass === cabinClassToCode(intent.cabinClassCode)

      seg.CabinClass === cabinClassToCode(intent.cabinClass) &&
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

  const corporateAddress = await getCorporateAddressForPassenger(
    leadPassenger.email,
  );

  const passengers = booking.travellers.map((t) => ({
    title: t.gender?.toUpperCase() === "MALE" ? "Mr" : "Ms",

    firstName: t.firstName?.trim(),
    lastName: t.lastName?.trim(),

    paxType: 1, // always adult

    dateOfBirth: t.dateOfBirth,
    gender: t.gender,

    passportNo: t.passportNumber,
    passportExpiry: t.passportExpiry,

    nationality: t.nationality?.toUpperCase() || "IN",

    email: t.email || leadPassenger.email,
    contactNo: t.phoneWithCode || leadPassenger.phoneWithCode,

    isLeadPax: true,

    // 🔥 Inject corporate address for TBO validation
    addressLine1: corporateAddress.AddressLine1,
    city: corporateAddress.City,
    countryCode: corporateAddress.CountryCode,
    countryName: corporateAddress.CountryName,
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
      try {
        logger.warn("TRACE EXPIRED → REVALIDATING", {
          bookingId: booking._id,
          oldTraceId: booking.flightRequest.traceId,
        });

        const searchPayload = buildTboRevalidationSearchPayload(
          booking,
          intent,
        );

        logger.info("TBO REVALIDATION SEARCH PAYLOAD", searchPayload);

        const searchResp = await tboService.searchFlights(searchPayload);

        const matched = findBestMatchingFlight({
          searchResp,
          intent,
        });

        const fareQuote = await tboService.getFareQuote(
          searchResp.TraceId,
          matched.ResultIndex,
        );

        booking.flightRequest.traceId = searchResp.TraceId;
        booking.flightRequest.resultIndex = matched.ResultIndex;
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
      } catch (revalidationError) {
        logger.error("REVALIDATION FAILED", {
          bookingId: booking._id,
          error: revalidationError.message,
        });

        booking.executionStatus = "failed";
        await booking.save();

        throw new ApiError(
          409,
          "Flight session expired and revalidation failed. Please search again.",
        );
      }
    }

    booking.executionStatus = "failed";
    await booking.save();
    throw err;
  }
});

exports.executeApprovedHotelBooking = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;

  const booking = await BookingRequest.findById(bookingId);
  if (!booking) throw new ApiError(404, "Booking not found");

  if (booking.bookingType !== "hotel") {
    throw new ApiError(400, "This is not a hotel booking request");
  }

  if (booking.requestStatus !== "approved")
    throw new ApiError(400, "Booking not approved");

  const corporate = await Corporate.findById(booking.corporateId);
  if (!corporate) throw new ApiError(404, "Corporate not found");

  const hotelReq = booking.hotelRequest;
  if (!hotelReq) throw new ApiError(400, "Hotel request details missing");

  // Keep logs production-safe and consistent with the logger (avoid console noise).
  logger.info("HOTEL BOOKING REQUEST (DB)", {
    bookingId: booking._id,
    hotelCode: hotelReq?.hotelCode,
    hasTraceId: !!hotelReq?.traceId,
    hasBookingCode: !!(hotelReq?.bookingCode || hotelReq?.BookingCode),
  });

  const normalizeTitleWithDot = (title) => {
    const raw = String(title || "").trim();
    const base = raw.replace(/\./g, "").trim();
    if (!base) return "Mr.";
    const cased = base.charAt(0).toUpperCase() + base.slice(1).toLowerCase();
    return `${cased}.`;
  };

  // Supplier contract includes these fields; passport fields can be null for domestic travel.
  const passengers = (booking.travellers || []).map((t, idx) => ({
    Title: normalizeTitleWithDot(t?.title),
    FirstName: t?.firstName || "Guest",
    MiddleName: "",
    LastName: t?.lastName || "User",
    Email: t?.email || null,
    PaxType: 1,
    LeadPassenger: idx === 0,
    Age: 0,
    PassportNo: t?.passportNumber || null,
    PassportIssueDate: null,
    PassportExpDate: null,
    Phoneno: String(t?.phoneWithCode || "").replace(/\D/g, "").trim() || null,
    PaxId: 0,
    GSTCompanyAddress: null,
    GSTCompanyContactNumber: null,
    GSTCompanyName: null,
    GSTNumber: null,
    GSTCompanyEmail: null,
    PAN: null,
  }));

  if (!passengers.length) {
    throw new ApiError(400, "At least one traveller is required");
  }

  const hotelCode = hotelReq?.hotelCode;
  if (!hotelCode) throw new ApiError(400, "hotelCode missing in hotelRequest");

  const traceId = hotelReq?.traceId || null;
  const resultIndex = hotelReq?.resultIndex || hotelReq?.roomIndex || null;

  // Prefer already stored BookingCode from room info (best for long approval windows).
  const looksLikeBookingCode = (v) =>
    typeof v === "string" && v.includes("!TB!") && /!AFF!$/i.test(v);

  let bookingCode =
    hotelReq?.bookingCode ||
    hotelReq?.BookingCode ||
    (looksLikeBookingCode(hotelReq?.roomTypeCode) ? hotelReq.roomTypeCode : null) ||
    (looksLikeBookingCode(hotelReq?.ratePlanCode) ? hotelReq.ratePlanCode : null) ||
    null;

  const extractTraceId = (resp) =>
    resp?.TraceId ||
    resp?.TraceID ||
    resp?.HotelSearchResult?.TraceId ||
    resp?.HotelSearchResult?.TraceID ||
    resp?.SearchResult?.TraceId ||
    resp?.SearchResult?.TraceID ||
    resp?.GetHotelRoomResult?.TraceId ||
    resp?.GetHotelRoomResult?.TraceID ||
    resp?.BookResult?.TraceId ||
    resp?.BookResult?.TraceID ||
    // Some supplier variants include TraceId on the hotel result item(s)
    (Array.isArray(resp?.HotelResult) ? resp.HotelResult?.[0]?.TraceId : null) ||
    (Array.isArray(resp?.HotelResult) ? resp.HotelResult?.[0]?.TraceID : null) ||
    (resp?.HotelResult && !Array.isArray(resp.HotelResult)
      ? resp.HotelResult?.TraceId || resp.HotelResult?.TraceID
      : null) ||
    null;

  const extractHotelResults = (resp) =>
    (() => {
      const v =
        resp?.HotelResult ||
        resp?.HotelSearchResult?.HotelResult ||
        resp?.SearchResult?.HotelResult ||
        [];
      if (Array.isArray(v)) return v;
      if (v && typeof v === "object") return [v];
      return [];
    })();

  const extractRoomDetails = (resp) =>
    resp?.GetHotelRoomResult?.HotelRoomsDetails ||
    resp?.HotelRoomsDetails ||
    resp?.Rooms ||
    [];

  const pickRoom = (rooms, desiredRoomIndex, desiredRoomTypeName) => {
    if (!Array.isArray(rooms) || rooms.length === 0) return null;

    const idxMatch = rooms.find(
      (r) => String(r?.RoomIndex) === String(desiredRoomIndex),
    );
    if (idxMatch) return idxMatch;

    if (desiredRoomTypeName) {
      const name = String(desiredRoomTypeName).toLowerCase();
      const nameMatch = rooms.find((r) =>
        String(r?.RoomTypeName || r?.Name || "")
          .toLowerCase()
          .includes(name),
      );
      if (nameMatch) return nameMatch;
    }

    return rooms[0];
  };

  const getFreshBookingCode = async () => {
    const CheckIn = hotelReq?.checkIn || hotelReq?.CheckIn;
    const CheckOut = hotelReq?.checkOut || hotelReq?.CheckOut;
    const PaxRooms = hotelReq?.rooms || hotelReq?.PaxRooms;
    const NoOfRooms = hotelReq?.noOfRooms || hotelReq?.NoOfRooms || PaxRooms?.length;
    const GuestNationality = hotelReq?.guestNationality || hotelReq?.GuestNationality || "IN";

    if (!CheckIn || !CheckOut) {
      throw new ApiError(409, "Missing checkIn/checkOut. Please search again.");
    }
    if (!Array.isArray(PaxRooms) || PaxRooms.length === 0 || !NoOfRooms) {
      throw new ApiError(
        409,
        "Missing room configuration. Please search again and re-create the request.",
      );
    }

    const runSearch = async (HotelCodes) =>
      hotelTboService.searchHotels({
        CheckIn,
        CheckOut,
        HotelCodes,
        GuestNationality,
        NoOfRooms: Number(NoOfRooms),
        PaxRooms,
        IsDetailedResponse: true,
        Filters: { Refundable: false, MealType: "All" },
      });

    // First attempt: search with just the selected HotelCode.
    let searchResp = await runSearch(String(hotelCode));

    let freshTraceId = extractTraceId(searchResp);
    let results = extractHotelResults(searchResp);
    let matched =
      Array.isArray(results) &&
      results.find((h) => String(h?.HotelCode) === String(hotelCode));

    let freshResultIndex =
      matched?.ResultIndex ||
      matched?.resultIndex ||
      results?.[0]?.ResultIndex ||
      results?.[0]?.resultIndex;

    // Fallback: if TraceId/ResultIndex is missing, re-search using the city hotel-code list (static API).
    if (!freshTraceId || !freshResultIndex) {
      logger.warn("HOTEL BOOKING REFRESH SEARCH MISSING TRACE/INDEX -> FALLBACK", {
        bookingId: booking._id,
        hotelCode,
        hasTraceId: !!freshTraceId,
        hasResultIndex: !!freshResultIndex,
        searchKeys: searchResp && typeof searchResp === "object" ? Object.keys(searchResp) : typeof searchResp,
        hotelSearchKeys:
          searchResp?.HotelSearchResult && typeof searchResp.HotelSearchResult === "object"
            ? Object.keys(searchResp.HotelSearchResult)
            : null,
        status: searchResp?.Status || searchResp?.HotelSearchResult?.Status || null,
        error: searchResp?.Error || searchResp?.HotelSearchResult?.Error || null,
        hotelResultType: Array.isArray(searchResp?.HotelResult)
          ? "array"
          : typeof searchResp?.HotelResult,
        hotelResultCount: Array.isArray(searchResp?.HotelResult)
          ? searchResp.HotelResult.length
          : null,
        firstHotelSample: Array.isArray(searchResp?.HotelResult)
          ? {
              HotelCode: searchResp.HotelResult?.[0]?.HotelCode,
              ResultIndex: searchResp.HotelResult?.[0]?.ResultIndex,
              TraceId: searchResp.HotelResult?.[0]?.TraceId,
            }
          : null,
      });

      const staticDetails = await hotelTboService.getStaticHotelDetails(String(hotelCode));

      const cityCode =
        staticDetails?.Hotels?.[0]?.CityCode ||
        staticDetails?.Hotels?.[0]?.CityId ||
        staticDetails?.HotelDetails?.[0]?.CityCode ||
        staticDetails?.HotelDetails?.[0]?.CityId ||
        staticDetails?.CityCode ||
        staticDetails?.CityId ||
        null;

      if (!cityCode) {
        throw new ApiError(
          409,
          "Could not refresh hotel session (CityCode missing from static hotel details). Please search again.",
        );
      }

      const codeResp = await hotelTboService.getTBOHotelCodeList(cityCode);
      const codesRaw = Array.isArray(codeResp?.Hotels)
        ? codeResp.Hotels.map((h) => String(h?.HotelCode || "")).filter(Boolean)
        : [];

      const target = String(hotelCode);
      const codes = [target, ...codesRaw.filter((c) => c !== target)];
      const hotelCodes = codes.slice(0, 300).join(",");

      searchResp = await runSearch(hotelCodes);

      freshTraceId = extractTraceId(searchResp);
      results = extractHotelResults(searchResp);
      matched =
        Array.isArray(results) &&
        results.find((h) => String(h?.HotelCode) === String(hotelCode));
      freshResultIndex =
        matched?.ResultIndex ||
        matched?.resultIndex ||
        results?.[0]?.ResultIndex ||
        results?.[0]?.resultIndex;
    }

    if (!freshTraceId || !freshResultIndex) {
      logger.warn("HOTEL BOOKING REFRESH SEARCH STILL MISSING TRACE/INDEX", {
        bookingId: booking._id,
        hotelCode,
        hasTraceId: !!freshTraceId,
        hasResultIndex: !!freshResultIndex,
        status: searchResp?.Status || searchResp?.HotelSearchResult?.Status || null,
        hotelResultCount: Array.isArray(results) ? results.length : null,
      });
      throw new ApiError(
        409,
        "Could not refresh hotel session (TraceId/ResultIndex missing). Please search again.",
      );
    }

    const roomInfoResp = await hotelTboService.getRoomInfo(
      String(hotelCode),
      freshTraceId,
      String(freshResultIndex),
    );

    const rooms = extractRoomDetails(roomInfoResp);
    const selected = pickRoom(rooms, hotelReq?.roomIndex, hotelReq?.roomTypeName);

    const freshBookingCode =
      selected?.BookingCode || selected?.RoomTypeCode || selected?.RatePlanCode || null;

    if (!freshBookingCode) {
      throw new ApiError(
        409,
        "Could not refresh BookingCode for the selected room. Please select the room again.",
      );
    }

    // Persist refreshed BookingCode so the booking can proceed even if approval took time.
    // Do NOT persist TraceId (project requirement).
    booking.hotelRequest = booking.hotelRequest || {};
    booking.hotelRequest.resultIndex = String(freshResultIndex);
    booking.hotelRequest.bookingCode = freshBookingCode;
    if (selected?.RoomTypeCode) booking.hotelRequest.roomTypeCode = selected.RoomTypeCode;
    if (selected?.RatePlanCode) booking.hotelRequest.ratePlanCode = selected.RatePlanCode;
    if (selected?.RoomTypeName) booking.hotelRequest.roomTypeName = selected.RoomTypeName;
    booking.markModified("hotelRequest");

    await booking.save();

    return freshBookingCode;
  };

  try {
    booking.executionStatus = "booking_initiated";
    await booking.save();

    let didPrebook = false;

    // Only refresh BookingCode if it's missing. If it's stale, we will attempt booking first and
    // refresh only if the supplier explicitly responds with "Session Expired". This avoids blocking
    // bookings when supplier search doesn't return session refs (or when hotel availability changes).
    if (!bookingCode) {
      logger.info("HOTEL BOOKING -> REFRESH BOOKINGCODE", {
        bookingId: booking._id,
        hotelCode,
        reason: "missing_bookingCode",
      });
      bookingCode = await getFreshBookingCode();
    }

    if (!bookingCode) {
      if (!resultIndex) {
        throw new ApiError(
          409,
          "Missing session data (resultIndex/roomIndex). Please search and select the room again.",
        );
      }

      // PreBook generates BookingCode. Requirement: do not send TraceId in PreBook request.
      // Service strips TraceId and retries once with TraceId if supplier requires it.
      const prebookResp = await hotelTboService.preBookHotel({
        traceId,
        hotelCode,
        roomIndex: resultIndex,
      });

      bookingCode =
        prebookResp?.PreBookResult?.BookingCode || prebookResp?.BookingCode || null;

      if (!bookingCode) {
        throw new ApiError(502, "PreBook failed: BookingCode missing");
      }
      didPrebook = true;
    }

    const bookPayload = {
      BookingCode: bookingCode,
      IsVoucherBooking: true,
      GuestNationality: hotelReq?.guestNationality || "IN",
      ...(process.env.TBO_END_USER_IP
        ? { EndUserIp: process.env.TBO_END_USER_IP }
        : {}),
      RequestedBookingMode: 5,
      NetAmount: booking.pricingSnapshot?.totalAmount || 0,
      ClientReferenceId: booking.bookingReference || String(booking._id),
      HotelRoomsDetails: [
        {
          HotelPassenger: passengers,
        },
      ],
    };

    logger.info("HOTEL BOOKING (BOOKINGCODE FLOW)", {
      bookingId: booking._id,
      hotelCode,
      hasTraceId: !!traceId,
      hasBookingCode: !!bookingCode,
    });

    let bookResp;
    try {
      bookResp = await hotelTboService.bookHotel(bookPayload);
    } catch (err) {
      const msg = String(err?.message || "");
      const isSessionExpired =
        /session\\s*expired/i.test(msg) ||
        /session\\s*expired/i.test(String(err?.response?.data || ""));
      const isTraceExpired =
        (/trace\\s*id/i.test(msg) && /expired|session/i.test(msg)) ||
        isSessionExpired;

      // Session expired -> refresh BookingCode and retry once.
      if (isSessionExpired) {
        logger.warn("HOTEL BOOK SESSION EXPIRED -> REFRESH BOOKINGCODE", {
          bookingId: booking._id,
          hotelCode,
        });

        // Prefer PreBook refresh first (doesn't require TraceId) to avoid being blocked when search
        // doesn't return TraceId/ResultIndex for some suppliers.
        let refreshedCode = null;
        if (resultIndex) {
          try {
            const prebookResp = await hotelTboService.preBookHotel({
              traceId,
              hotelCode,
              roomIndex: resultIndex,
            });
            refreshedCode =
              prebookResp?.PreBookResult?.BookingCode ||
              prebookResp?.BookingCode ||
              null;
          } catch (prebookErr) {
            logger.warn("HOTEL BOOK SESSION EXPIRED -> PREBOOK REFRESH FAILED", {
              bookingId: booking._id,
              hotelCode,
              message: String(prebookErr?.message || ""),
            });
          }
        }

        if (!refreshedCode) {
          // Full revalidation (re-search + room-info) to get a fresh BookingCode.
          refreshedCode = await getFreshBookingCode();
        }

        try {
          bookResp = await hotelTboService.bookHotel({
            ...bookPayload,
            BookingCode: refreshedCode,
          });
        } catch (retryErr) {
          const retryMsg = String(retryErr?.message || "");
          if (/session\\s*expired/i.test(retryMsg)) {
            throw new ApiError(
              409,
              "Hotel session expired. Please search again and re-create the booking request.",
            );
          }
          throw retryErr;
        }
      }
      // If BookingCode was derived from cached room fields (or old PreBook), refresh it once via PreBook and retry.
      else if (!didPrebook && isTraceExpired && resultIndex) {
        logger.warn("HOTEL BOOK TRACE EXPIRED -> REPREBOOK", {
          bookingId: booking._id,
          hotelCode,
        });

        const prebookResp = await hotelTboService.preBookHotel({
          traceId,
          hotelCode,
          roomIndex: resultIndex,
        });

        const newCode =
          prebookResp?.PreBookResult?.BookingCode || prebookResp?.BookingCode || null;

        if (!newCode) throw err;

        bookResp = await hotelTboService.bookHotel({
          ...bookPayload,
          BookingCode: newCode,
        });
      } else {
        throw err;
      }
    }

    if (bookResp?.BookResult?.ResponseStatus !== 1) {
      const tboError =
        bookResp?.BookResult?.Error?.ErrorMessage ||
        bookResp?.BookResult?.Status?.Description ||
        "Unknown TBO error";
      throw new ApiError(502, `TBO Hotel booking failed: ${tboError}`);
    }

    booking.bookingResult = {
      providerResponse: bookResp,
      providerBookingId: bookResp?.BookResult?.BookingId,
      pnr: bookResp?.BookResult?.ConfirmationNo,
      bookingRefNo: bookResp?.BookResult?.BookingRefNo,
    };
    booking.executionStatus = "ticketed";
    booking.executedBy = req.user?._id;
    booking.executedByRole = req.user?.role;
    booking.executedAt = new Date();
    await booking.save();

    return res
      .status(200)
      .json(new ApiResponse(200, booking, "Hotel booked successfully"));
  } catch (err) {
    logger.error("HOTEL BOOKING FAILED", {
      bookingId: booking._id,
      message: err.message,
    });
    booking.executionStatus = "failed";
    await booking.save();
    throw err instanceof ApiError ? err : new ApiError(500, err.message);
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
  // const paymentTxn = await WalletTransaction.findOne({
  //   bookingId: booking._id,
  //   type: "debit",
  //   status: "completed",
  // })
  //   .sort({ createdAt: -1 })
  //   .select("_id amount createdAt");

  // booking.payment = paymentTxn
  //   ? {
  //       status: "completed",
  //       method: "wallet",
  //       amount: paymentTxn.amount,
  //       paidAt: paymentTxn.createdAt,
  //       transactionId: paymentTxn._id,
  //     }
  //   : {
  //       status: "pending",
  //     };

  // 🔎 Determine corporate type
  const corporate = await Corporate.findById(booking.corporateId).select(
    "classification",
  );

  // ================= PREPAID =================
  if (corporate?.classification === "prepaid") {
    const walletTxn = await WalletTransaction.findOne({
      bookingId: booking._id,
      type: "debit",
      status: "completed",
    })
      .sort({ createdAt: -1 })
      .select("_id amount createdAt");

    booking.payment = walletTxn
      ? {
          status: "completed",
          method: "wallet",
          amount: walletTxn.amount,
          paidAt: walletTxn.createdAt,
          transactionId: walletTxn._id,
        }
      : { status: "pending" };
  }

  // ================= POSTPAID =================
  else if (corporate?.classification === "postpaid") {
    const ledgerEntry = await Ledger.findOne({
      bookingId: booking._id,
      type: "booking",
      status: "paid",
    })
      .sort({ createdAt: -1 })
      .select("_id amount paidDate");

    booking.payment = ledgerEntry
      ? {
          status: "completed",
          method: "agency",
          amount: ledgerEntry.amount,
          paidAt: ledgerEntry.paidDate,
          transactionId: ledgerEntry._id,
        }
      : { status: "pending" };
  }

  // ================= FALLBACK (safety) =================
  else {
    booking.payment = { status: "pending" };
  }

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
  executeApprovedHotelBooking: exports.executeApprovedHotelBooking,
  downloadTicketPdf: exports.downloadTicketPdf,
  getMyBookings: exports.getMyBookings,
  getMyBookingById: exports.getMyBookingById,
  getAllBookings: exports.getAllBookings,
  getBooking: exports.getBooking,
  cancelBooking: exports.cancelBooking,
};
