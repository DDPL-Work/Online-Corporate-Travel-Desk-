// server/src/controllers/booking.controller.js
const Booking = require("../models/Booking");
const BookingRequest = require("../models/BookingRequest");
const HotelBookingRequest = require("../models/hotelBookingRequest.model");
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
    gstDetails,
    projectCodeId,
    projectId,
    projectName,
    projectClient,
    approverId,
    approverEmail,
    approverName,
    approverRole,
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

  const leadIsChild =
    (
      leadPassenger?.paxType ||
      leadPassenger?.PaxType ||
      "ADULT"
    ).toUpperCase() === "CHILD";

  if (!leadIsChild) {
    if (!leadPassenger?.phoneWithCode) {
      throw new ApiError(400, "Lead passenger phone number is required");
    }

    if (!leadPassenger?.email) {
      throw new ApiError(400, "Lead passenger email is required");
    }
  }

  const ageFromDob = (dob) => {
    if (!dob) return null;
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const adultCount = travellers.filter(
    (t) => (t.paxType || "ADULT") === "ADULT",
  ).length;
  const infantCount = travellers.filter(
    (t) => (t.paxType || "ADULT") === "INFANT",
  ).length;

  if (infantCount > adultCount) {
    throw new ApiError(400, "Infants cannot exceed adults");
  }

  travellers.forEach((t, idx) => {
    const paxType = (t.paxType || "ADULT").toUpperCase();
    const age = ageFromDob(t.dateOfBirth || t.dob);

    // if (!t.dateOfBirth && !t.dob) {
    //   throw new ApiError(400, `Date of birth missing for traveler ${idx + 1}`);
    // }

    if (age != null) {
      if (paxType === "ADULT" && age < 12) {
        throw new ApiError(400, "Adult passengers must be 12+ years");
      }
      if (paxType === "CHILD" && (age < 2 || age > 11)) {
        throw new ApiError(400, "Child passengers must be 2-11 years");
      }
      if (paxType === "INFANT" && age >= 2) {
        throw new ApiError(400, "Infant passengers must be under 2 years");
      }
    }

    if (
      paxType === "INFANT" &&
      (typeof t.linkedAdultIndex !== "number" ||
        t.linkedAdultIndex < 0 ||
        t.linkedAdultIndex >= adultCount)
    ) {
      throw new ApiError(
        400,
        "Each infant must be linked to an adult traveler",
      );
    }

    // PAN required only for adults > 18
    // if (paxType === "ADULT" && (age == null || age > 18)) {
    //   if (!t.panCard) {
    //     throw new ApiError(400, `PAN card is required for adult traveler ${idx + 1}`);
    //   }
    // }
  });

  const fareResults = Array.isArray(flightRequest.fareQuote?.Results)
    ? flightRequest.fareQuote.Results
    : flightRequest.fareQuote?.Response?.Results
      ? [flightRequest.fareQuote.Response.Results]
      : flightRequest.fareQuote?.Results
        ? [flightRequest.fareQuote.Results]
        : [];

  const fareResult = fareResults.find(
    (fr) => fr?.FareBreakdown && fr.FareBreakdown.length,
  );

  if (!fareResult) {
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

  const mapCabinClass = (cabin) => {
    const mapping = {
      2: "Economy",
      3: "Premium Economy",
      4: "Business",
      5: "Business", // no premium_business in schema → fallback
      6: "First Class",

      // string fallback
      economy: "Economy",
      "premium economy": "Premium Economy",
      business: "Business",
      "premium business": "Business",
      first: "First Class",
      first_class: "First Class",
    };

    return mapping[String(cabin).toLowerCase()] || "Economy";
  };
  if (bookingType === "flight" && Array.isArray(flightRequest?.segments)) {
    const segments = flightRequest.segments;

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
        cabinClass: mapCabinClass(first.cabinClass),
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
        cabinClass: mapCabinClass(onward.cabinClass),
        amount: pricingSnapshot.totalAmount,
        purposeOfTravel,
        city: ret.destination.city,
      };
    }
  }

  /* ================= CREATE BOOKING REQUEST ================= */

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

  /* ================= SSR POLICY: AUTO-APPROVE CHECK ================= */
  const EmployeeSsrPolicy = require("../models/EmployeeSsrPolicy.model");

  let requestStatus = "pending_approval"; // default

  try {
    const ssrPolicy = await EmployeeSsrPolicy.findOne({
      corporateId: corporate._id,
      employeeEmail: user.email?.toLowerCase().trim(),
    }).lean();

    // If policy exists and approvalRequired is false → auto-approve
    if (ssrPolicy && ssrPolicy.approvalRequired === false) {
      requestStatus = "approved";
      logger.info("✅ SSR Policy: Auto-approving booking for employee", {
        email: user.email,
        corporateId: corporate._id,
      });
    }
  } catch (policyErr) {
    // If policy lookup fails, fall back to pending_approval (safe default)
    logger.warn("⚠️ SSR Policy lookup failed, defaulting to pending_approval", {
      error: policyErr.message,
    });
  }

  const bookingRequest = await BookingRequest.create({
    bookingReference: generateBookingReference(),
    bookingType,
    corporateId: corporate._id,
    userId: user._id,

    requestStatus,
    executionStatus: "not_started",

    fareQuote: freshFareQuote,

    purposeOfTravel,
    gstDetails,
    projectCodeId,
    projectId,
    projectName,
    projectClient,
    approverId,
    approverEmail,
    approverName,
    approverRole,
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

  // Only send approval notifications if still pending
  if (requestStatus === "pending_approval") {
    await notificationService.sendApprovalNotifications({
      bookingReference: bookingRequest.bookingReference,
      requester: user,
      corporateId: corporate._id,
    });
  }

  /* ================= AUTO-APPROVAL: CREATE BOOKING INTENT ================= */
  if (requestStatus === "approved" && bookingType === "flight") {
    try {
      const isRoundTrip =
        bookingSnapshot.sectors && bookingSnapshot.sectors.length === 2;
      const [origin, destination] = bookingSnapshot.sectors[0].split("-");

      const travelDate = new Date(bookingSnapshot.travelDate);
      const now = new Date();
      const validUntil = new Date(
        Math.min(
          travelDate.getTime() - 24 * 60 * 60 * 1000,
          now.getTime() + 24 * 60 * 60 * 1000,
        ),
      );

      const airlineCodes = [
        ...new Set(flightRequest.segments.map((s) => s.airlineCode)),
      ];

      const fareResult = freshFareQuote?.Results?.[0];
      const maxApprovedPrice = isRoundTrip
        ? pricingSnapshot.totalAmount
        : (Array.isArray(fareResult)
            ? fareResult[0]?.Fare?.PublishedFare
            : fareResult?.Fare?.PublishedFare) || pricingSnapshot.totalAmount;

      await BookingIntent.create({
        bookingRequestId: bookingRequest._id,
        corporateId: bookingRequest.corporateId,
        userId: bookingRequest.userId,
        origin,
        destination,
        travelDate: bookingSnapshot.travelDate,
        returnDate: bookingSnapshot.returnDate,
        journeyType: isRoundTrip ? "RT" : "OW",
        cabinClass: bookingSnapshot.cabinClass,
        airlineCodes,
        maxApprovedPrice,
        approvedAt: new Date(),
        validUntil,
        approvalStatus: "approved",
      });

      logger.info("✅ BookingIntent created for auto-approved request", {
        bookingRequestId: bookingRequest._id,
      });
    } catch (intentErr) {
      logger.error("❌ Failed to create BookingIntent for auto-approval", {
        error: intentErr.message,
        bookingRequestId: bookingRequest._id,
      });
    }
  }

  /* ================= RESPONSE ================= */

  const isAutoApproved = requestStatus === "approved";

  res.status(201).json(
    new ApiResponse(
      201,
      {
        bookingRequestId: bookingRequest._id,
        bookingReference: bookingRequest.bookingReference,
        requestStatus: bookingRequest.requestStatus,
        autoApproved: isAutoApproved,
      },
      isAutoApproved
        ? "Booking request auto-approved (no approval required per policy)"
        : "Booking request submitted for approval",
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
    msg.includes("trace") ||
    msg.includes("session") ||
    msg.includes("expired") ||
    msg.includes("invalid sessionid") ||
    msg.includes("session has been expired")
  );
};

const cabinClassToTboCode = (cabin) =>
  ({
    Economy: 2,
    "Premium Economy": 3,
    Business: 4,
    "Premium Business": 5,
    "First Class": 6,
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

  const adultCount =
    booking.travellers.filter((t) => (t.paxType || "ADULT") === "ADULT")
      .length || 1;
  const childCount = booking.travellers.filter(
    (t) => (t.paxType || "ADULT") === "CHILD",
  ).length;
  const infantCount = booking.travellers.filter(
    (t) => (t.paxType || "ADULT") === "INFANT",
  ).length;

  if (adultCount < 1) {
    throw new ApiError(400, "At least one adult is required for TBO search");
  }

  console.log("ORIGINAL STORED SEGMENT:", booking.flightRequest.segments[0]);

  const basePayload = {
    AdultCount: adultCount,
    ChildCount: childCount,
    InfantCount: infantCount,
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
      FlightCabinClass: cabinClassToTboCode(segment.cabinClass),
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

const hasValidSSR = (ssr) => {
  if (!ssr) return false;

  try {
    const flatSeat = Array.isArray(ssr?.seats) && ssr.seats.length > 0;
    const flatMeal = Array.isArray(ssr?.meals) && ssr.meals.length > 0;
    const flatBaggage = Array.isArray(ssr?.baggage) && ssr.baggage.length > 0;

    const seat = ssr?.SeatDynamic?.[0]?.SegmentSeat?.some(
      (s) => s.Seat?.length > 0,
    );

    const meal = ssr?.MealDynamic?.[0]?.SegmentMeal?.some(
      (m) => m.Meal?.length > 0,
    );

    const baggage = ssr?.Baggage?.some((b) => b.Weight > 0);

    return flatSeat || flatMeal || flatBaggage || seat || meal || baggage;
  } catch {
    return false;
  }
};

const performBooking = async ({ booking, passengers, corporate, isLCC }) => {
  const rawResultIndex = booking.flightRequest.resultIndex;

  const segments = booking.flightRequest.segments;

  // ✅ detect round trip
  const isRoundTrip = segments.some((s) => s.journeyType === "return");

  // ✅ detect international
  const isInternational = segments.some(
    (s) => s.origin.country !== "IN" || s.destination.country !== "IN",
  );

  // ✅ final condition
  const isCombinedRT =
    typeof rawResultIndex === "object" && isRoundTrip && isInternational;

  booking.executionStatus = "booking_initiated";
  await booking.save();

  /* ===== Validate passenger counts vs fare breakdown ===== */
  const fareResult = Array.isArray(booking.flightRequest.fareQuote?.Results)
    ? booking.flightRequest.fareQuote.Results[0]
    : booking.flightRequest.fareQuote?.Results;

  const fareBreakdown = fareResult?.FareBreakdown || [];
  if (fareBreakdown.length) {
    const expected = fareBreakdown.reduce(
      (acc, fb) => {
        const type =
          fb.PassengerType === 1
            ? "ADULT"
            : fb.PassengerType === 2
              ? "CHILD"
              : "INFANT";
        acc[type] = (acc[type] || 0) + (fb.PassengerCount || 0);
        acc.total += fb.PassengerCount || 0;
        return acc;
      },
      { ADULT: 0, CHILD: 0, INFANT: 0, total: 0 },
    );

    const actual = passengers.reduce(
      (acc, p) => {
        const type =
          p.paxType === 2 ? "CHILD" : p.paxType === 3 ? "INFANT" : "ADULT";
        acc[type] = (acc[type] || 0) + 1;
        acc.total += 1;
        return acc;
      },
      { ADULT: 0, CHILD: 0, INFANT: 0, total: 0 },
    );

    if (
      expected.total !== actual.total ||
      expected.ADULT !== actual.ADULT ||
      expected.CHILD !== actual.CHILD ||
      expected.INFANT !== actual.INFANT
    ) {
      throw new ApiError(
        400,
        `Invalid passenger count: expected A${expected.ADULT}/C${expected.CHILD}/I${expected.INFANT}, got A${actual.ADULT}/C${actual.CHILD}/I${actual.INFANT}`,
      );
    }
  }

  /* ===================================================
   🌍 INTERNATIONAL ROUND-TRIP (COMBINED)
=================================================== */

  if (isCombinedRT) {
    const combinedIndex =
      typeof rawResultIndex === "object"
        ? rawResultIndex.onward
        : rawResultIndex;

    booking.executionStatus = "booking_initiated";
    await booking.save();

    /* ================= LCC ================= */
    if (isLCC) {
      logLccTicketPayload({
        bookingId: booking._id,
        traceId: booking.flightRequest.traceId,
        resultIndex: combinedIndex,
        passengers,
        ssr: booking.flightRequest.ssrSnapshot,
      });

      const ssrPayload = hasValidSSR(booking.flightRequest.ssrSnapshot)
        ? booking.flightRequest.ssrSnapshot
        : undefined;

      const combinedFare = Array.isArray(
        booking.flightRequest.fareQuote.Results,
      )
        ? booking.flightRequest.fareQuote.Results[0]
        : booking.flightRequest.fareQuote.Results;

      const ticketResp = await tboService.ticketFlight({
        traceId: booking.flightRequest.traceId,
        resultIndex: combinedIndex, // ✅ SINGLE INDEX
        result: combinedFare, // ✅ combined fare
        passengers,
        ...(ssrPayload && { ssr: ssrPayload }),
        isLCC: true,
        gstDetails: booking.gstDetails,
      });

      const extractedPNR =
        ticketResp?.Response?.Response?.PNR ||
        ticketResp?.Response?.Response?.FlightItinerary?.PNR;

      if (!extractedPNR) {
        throw new ApiError(500, "International RT ticketing failed");
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

    /* ================= NON-LCC ================= */

    const bookResp = await tboService.bookFlight({
      IsLCC: false,
      traceId: booking.flightRequest.traceId,
      resultIndex: combinedIndex,
      result: booking.flightRequest.fareQuote.Results[0],
      passengers,
      ssr: booking.flightRequest.ssrSnapshot,
      gstDetails: booking.gstDetails,
    });

    const tboBookingId = bookResp?.raw?.Response?.Response?.BookingId;

    if (!tboBookingId) {
      throw new ApiError(500, "Booking failed - BookingId missing");
    }

    const extractedPNR =
      bookResp?.raw?.Response?.Response?.PNR ||
      bookResp?.raw?.Response?.Response?.FlightItinerary?.PNR;

    booking.bookingResult = {
      pnr: extractedPNR,
      providerResponse: bookResp,
    };

    booking.executionStatus = "booked";
    await booking.save();

    await paymentService.processBookingPayment({ booking, corporate });

    const ticketResp = await tboService.ticketFlight({
      traceId: booking.flightRequest.traceId,
      bookingId: tboBookingId,
      pnr: extractedPNR,
      passengers,
      isLCC: false,
      gstDetails: booking.gstDetails,
    });

    const ticketStatus = ticketResp?.Response?.Response?.TicketStatus;
    const responseStatus = ticketResp?.Response?.ResponseStatus;

    if (ticketStatus !== 1 || responseStatus !== 1) {
      booking.executionStatus = "ticket_pending";
      booking.bookingResult.ticketError = ticketResp;
      await booking.save();

      return {
        bookingId: booking._id,
        pnr: extractedPNR,
        status: "ticket_pending",
      };
    }

    booking.executionStatus = "ticketed";
    booking.bookingResult.providerResponse.ticketResponse = ticketResp;
    await booking.save();

    return {
      bookingId: booking._id,
      pnr: extractedPNR,
    };
  }

  if (typeof rawResultIndex === "object" && !isCombinedRT) {
    const onwardIndex = rawResultIndex.onward;
    const returnIndex = rawResultIndex.return;

    /* ================= LCC FLOW ================= */
    if (isLCC) {
      const splitSSR = (snapshot, type) => {
        if (!snapshot) return null;
        return {
          seats: (snapshot.seats || []).filter((s) => s.journeyType === type),
          meals: (snapshot.meals || []).filter((m) => m.journeyType === type),
          baggage: (snapshot.baggage || []).filter(
            (b) => b.journeyType === type,
          ),
        };
      };

      const onwardResp = await tboService.ticketFlight({
        traceId: booking.flightRequest.traceId,
        resultIndex: onwardIndex,
        result: booking.flightRequest.fareQuote.Results[0],
        passengers,
        ssr: splitSSR(booking.flightRequest.ssrSnapshot, "onward"),
        isLCC: true,
        gstDetails: booking.gstDetails,
      });

      const returnResp = await tboService.ticketFlight({
        traceId: booking.flightRequest.traceId,
        resultIndex: returnIndex,
        result: booking.flightRequest.fareQuote.Results[1],
        passengers,
        ssr: splitSSR(booking.flightRequest.ssrSnapshot, "return"),
        isLCC: true,
        gstDetails: booking.gstDetails,
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

    const splitSSR = (snapshot, type) => {
      if (!snapshot) return null;
      return {
        seats: (snapshot.seats || []).filter((s) => s.journeyType === type),
        meals: (snapshot.meals || []).filter((m) => m.journeyType === type),
        baggage: (snapshot.baggage || []).filter((b) => b.journeyType === type),
      };
    };

    const onwardResp = await tboService.bookFlight({
      IsLCC: false,
      traceId: booking.flightRequest.traceId,
      resultIndex: onwardIndex,
      result: booking.flightRequest.fareQuote.Results[0],
      passengers,
      ssr: splitSSR(booking.flightRequest.ssrSnapshot, "onward"),
      gstDetails: booking.gstDetails,
    });

    const returnResp = await tboService.bookFlight({
      IsLCC: false,
      traceId: booking.flightRequest.traceId,
      resultIndex: returnIndex,
      result: booking.flightRequest.fareQuote.Results[1],
      passengers,
      ssr: splitSSR(booking.flightRequest.ssrSnapshot, "return"),
      gstDetails: booking.gstDetails,
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

    const onwardBookingId = onwardResp?.raw?.Response?.Response?.BookingId;

    const returnBookingId = returnResp?.raw?.Response?.Response?.BookingId;

    /* ✅ CALL TICKET API FOR BOTH */
    const onwardTicketResp = await tboService.ticketFlight({
      traceId: booking.flightRequest.traceId,
      bookingId: onwardBookingId,
      pnr: onwardPNR,
      passengers,
      isLCC: false,
      gstDetails: booking.gstDetails,
    });

    const returnTicketResp = await tboService.ticketFlight({
      traceId: booking.flightRequest.traceId,
      bookingId: returnBookingId,
      pnr: returnPNR,
      passengers,
      isLCC: false,
      gstDetails: booking.gstDetails,
    });

    /* ✅ VALIDATE */
    const isOnwardSuccess =
      onwardTicketResp?.Response?.Response?.TicketStatus === 1 &&
      onwardTicketResp?.Response?.ResponseStatus === 1;

    const isReturnSuccess =
      returnTicketResp?.Response?.Response?.TicketStatus === 1 &&
      returnTicketResp?.Response?.ResponseStatus === 1;

    if (!isOnwardSuccess || !isReturnSuccess) {
      throw new ApiError(500, "Round trip ticketing failed");
    }

    /* ✅ SAVE */
    booking.bookingResult.ticketResponse = {
      onward: onwardTicketResp,
      return: returnTicketResp,
    };

    // booking.executionStatus = "ticketed";
    // await booking.save();

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

  // 🔥 FIX: MULTI-SEGMENT LCC (SpiceJet issue)
  if (isLCC && segments.length > 1) {
    logger.warn("⚠️ MULTI-SEGMENT LCC DETECTED → USING FRESH FARE");

    const ssrPayload = hasValidSSR(booking.flightRequest.ssrSnapshot)
      ? booking.flightRequest.ssrSnapshot
      : undefined;

    // ✅ STEP 1: GET FRESH FARE
    const freshFare = await tboService.getFareQuote(
      booking.flightRequest.traceId,
      rawResultIndex,
    );

    const latestFare = Array.isArray(freshFare.Response.Results)
      ? freshFare.Response.Results[0]
      : freshFare.Response.Results;

    // ✅ STEP 2: DIRECT TICKET (NO HOLD)
    const ticketResp = await tboService.ticketFlight({
      traceId: booking.flightRequest.traceId,
      resultIndex: rawResultIndex,
      result: latestFare, // 🔥 IMPORTANT CHANGE
      passengers,
      ...(ssrPayload && { ssr: ssrPayload }),
      isLCC: true,
      gstDetails: booking.gstDetails,
    });

    const extractedPNR =
      ticketResp?.Response?.Response?.PNR ||
      ticketResp?.Response?.Response?.FlightItinerary?.PNR;

    if (!extractedPNR) {
      throw new ApiError(500, "LCC Multi-segment ticketing failed");
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

  if (isLCC) {
    logLccTicketPayload({
      bookingId: booking._id,
      traceId: booking.flightRequest.traceId,
      resultIndex: rawResultIndex,
      passengers,
      ssr: booking.flightRequest.ssrSnapshot,
    });

    const ssrPayload = hasValidSSR(booking.flightRequest.ssrSnapshot)
      ? booking.flightRequest.ssrSnapshot
      : undefined;

    // ✅ STEP 1: ALWAYS FETCH FRESH FARE
    const freshFare = await tboService.getFareQuote(
      booking.flightRequest.traceId,
      rawResultIndex,
    );

    // ✅ STEP 2: USE FRESH RESULT
    const latestFare = freshFare.Response.Results;

    // ✅ STEP 3: PASS FRESH FARE TO TICKET
    const ticketResp = await tboService.ticketFlight({
      traceId: booking.flightRequest.traceId,
      resultIndex: rawResultIndex,
      result: latestFare, // ✅ FIXED
      passengers,
      ...(ssrPayload && { ssr: ssrPayload }),
      isLCC: true,
      gstDetails: booking.gstDetails,
    });

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
    IsLCC: false,
    traceId: booking.flightRequest.traceId,
    resultIndex: rawResultIndex,
    result: booking.flightRequest.fareQuote.Results[0],
    passengers,
    ssr: booking.flightRequest.ssrSnapshot,
    gstDetails: booking.gstDetails,
  });

  /* ✅ EXTRACT BOOKING ID (VERY IMPORTANT) */
  const tboBookingId = bookResp?.raw?.Response?.Response?.BookingId;

  if (!tboBookingId) {
    throw new ApiError(500, "Booking failed - BookingId missing");
  }

  /* ✅ SAVE BOOK RESPONSE */
  const extractedPNR =
    bookResp?.raw?.Response?.Response?.PNR ||
    bookResp?.raw?.Response?.Response?.FlightItinerary?.PNR;

  booking.bookingResult = {
    pnr: extractedPNR,
    providerResponse: bookResp,
  };

  booking.executionStatus = "booked";
  await booking.save();

  /* ✅ PAYMENT FIRST */
  await paymentService.processBookingPayment({ booking, corporate });

  /* =======================================================
   🔥 STEP 3 — CALL TICKET API (THIS WAS MISSING)
======================================================= */

  // const extractedPNR =
  //   bookResp?.raw?.Response?.Response?.PNR ||
  //   bookResp?.raw?.Response?.Response?.FlightItinerary?.PNR;

  const ticketResp = await tboService.ticketFlight({
    traceId: booking.flightRequest.traceId,
    bookingId: tboBookingId,
    pnr: extractedPNR,
    passengers,
    isLCC: false,
    gstDetails: booking.gstDetails,
  });

  /* ✅ VALIDATE TICKET RESPONSE */
  const ticketStatus = ticketResp?.Response?.Response?.TicketStatus;

  const responseStatus = ticketResp?.Response?.ResponseStatus;

  const pnr = ticketResp?.Response?.Response?.PNR;

  if (ticketStatus !== 1 || responseStatus !== 1 || !pnr) {
    console.error("❌ TICKET FAILED:", ticketResp);

    // ✅ SAVE FAILURE BUT DO NOT BREAK FLOW
    booking.bookingResult.ticketError = ticketResp;

    booking.executionStatus = "ticket_pending"; // 🔥 IMPORTANT
    await booking.save();

    return {
      bookingId: booking._id,
      pnr: extractedPNR,
      status: "ticket_pending",
    };
  }

  /* ✅ UPDATE DB AFTER SUCCESS */
  booking.bookingResult.providerResponse.ticketResponse = ticketResp;

  booking.executionStatus = "ticketed";
  await booking.save();

  /* ✅ RETURN */
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

      seg.CabinClass === cabinClassToTboCode(intent.cabinClass) &&
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

  const passengers = booking.travellers.map((t, idx) => ({
    title: t.gender?.toUpperCase() === "MALE" ? "Mr" : "Ms",

    firstName: t.firstName?.trim(),
    lastName: t.lastName?.trim(),

    paxType: t.paxType === "CHILD" ? 2 : t.paxType === "INFANT" ? 3 : 1,
    linkedAdultIndex:
      t.paxType === "INFANT" ? (t.linkedAdultIndex ?? 0) : undefined,

    dateOfBirth: t.dateOfBirth,
    gender: t.gender,

    passportNo: t.passportNumber,
    PassportIssueDate: t.PassportIssueDate,
    passportExpiry: t.passportExpiry,

    nationality: (t.nationality || "IN").toString().slice(0, 2).toUpperCase(),

    email: t.email || leadPassenger.email,
    contactNo: t.phoneWithCode || leadPassenger.phoneWithCode,

    isLeadPax: t.isLeadPassenger === true || idx === 0,

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

exports.manualTicketNonLcc = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;

  const booking = await BookingRequest.findById(bookingId);
  if (!booking) throw new ApiError(404, "Booking not found");

  if (!["ticket_pending", "on_hold"].includes(booking.executionStatus)) {
    throw new ApiError(400, "Booking is not eligible for manual ticketing");
  }

  const provider =
    booking?.bookingResult?.providerResponse?.raw?.Response?.Response;

  const bookingIdTbo = provider?.BookingId;
  const pnr = provider?.PNR;

  if (!bookingIdTbo || !pnr) {
    throw new ApiError(400, "BookingId or PNR missing");
  }

  const passengers = booking.travellers.map((t) => ({
    paxId: provider?.FlightItinerary?.Passenger?.[0]?.PaxId || 0,
    passportNo: t.passportNumber,
    PassportIssueDate: t.PassportIssueDate,
    passportExpiry: t.passportExpiry,
    dateOfBirth: t.dateOfBirth,
  }));

  /* 🔥 CALL TICKET AGAIN */
  const ticketResp = await tboService.ticketFlight({
    traceId: booking.flightRequest.traceId,
    bookingId: bookingIdTbo,
    pnr,
    passengers,
    isLCC: false,
  });

  const ticketStatus = ticketResp?.Response?.Response?.TicketStatus;

  const message = ticketResp?.Response?.Response?.Message;

  /* ================= HANDLE ================= */

  if (ticketStatus === 1) {
    booking.executionStatus = "ticketed";
  } else if (ticketStatus === 4) {
    booking.executionStatus = "on_hold";
    booking.bookingResult.ticketMessage = message;
  } else {
    booking.executionStatus = "ticket_pending";
  }

  booking.bookingResult.ticketResponse = ticketResp;

  await booking.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        bookingId: booking._id,
        status: booking.executionStatus,
      },
      "Manual ticket attempt completed",
    ),
  );
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
  const {
    // page = 1,
    // limit = 100,
    bookingType = "flight",
    executionStatus,
    requestStatus,
  } = req.query;

  /* ================= BUILD QUERY ================= */
  const query = {
    userId: req.user._id,
    bookingType,
  };

  // ✅ executionStatus filter (supports multiple)
  if (executionStatus) {
    query.executionStatus = {
      $in: executionStatus.split(","),
    };
  }

  // ✅ optional requestStatus filter
  if (requestStatus) {
    query.requestStatus = requestStatus;
  }

  // const skip = (Number(page) - 1) * Number(limit);

  /* ================= FETCH DATA ================= */
  const [rawBookings, total] = await Promise.all([
    BookingRequest.find(query)
      .select(
        `
        bookingReference
        bookingType
        requestStatus
        executionStatus
        bookingSnapshot
        pricingSnapshot
        createdAt
        updatedAt
        bookingResult
        amendment
        amendmentHistory
      `,
      )
      .sort({ createdAt: -1 })
      // .skip(skip)
      // .limit(Number(limit))
      .lean(),

    BookingRequest.countDocuments(query),
  ]);

  /* ================= TRANSFORM ================= */
  const bookings = rawBookings.map((booking) => {
    const providerResponse =
      booking?.bookingResult?.providerResponse?.Response?.Response;

    const flightItinerary = providerResponse?.FlightItinerary;

    /* ---------- PNR RESOLUTION ---------- */
    let pnr = null;

    if (booking.bookingResult?.pnr) {
      pnr = booking.bookingResult.pnr;
    } else if (booking.bookingResult?.onwardPNR) {
      pnr = `${booking.bookingResult.onwardPNR} / ${booking.bookingResult.returnPNR}`;
    } else if (providerResponse?.PNR) {
      pnr = providerResponse.PNR;
    } else if (flightItinerary?.PNR) {
      pnr = flightItinerary.PNR;
    }

    /* ---------- AMENDMENT NORMALIZATION ---------- */
    const amendment = booking.amendment
      ? {
          type: booking.amendment.type,
          status: booking.amendment.status,
          changeRequestId: booking.amendment.changeRequestId,
          requestedAt: booking.updatedAt,
        }
      : null;

    return {
      ...booking,
      pnr,
      amendment,
    };
  });

  /* ================= RESPONSE ================= */
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        bookings,
        pagination: {
          total,
          // page: Number(page),
          // pages: Math.ceil(total / limit),
        },
      },
      "Flight bookings fetched successfully",
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

  /* ================= PNR RESOLUTION ================= */
  const providerResponse =
    booking?.bookingResult?.providerResponse?.Response?.Response;

  const flightItinerary = providerResponse?.FlightItinerary;

  let pnr = null;

  if (booking.bookingResult?.pnr) {
    pnr = booking.bookingResult.pnr;
  } else if (booking.bookingResult?.onwardPNR) {
    pnr = `${booking.bookingResult.onwardPNR} / ${booking.bookingResult.returnPNR}`;
  } else if (providerResponse?.PNR) {
    pnr = providerResponse.PNR;
  } else if (flightItinerary?.PNR) {
    pnr = flightItinerary.PNR;
  }

  booking.pnr = pnr;

  /* ================= AMENDMENT NORMALIZATION ================= */
  booking.amendment = booking.amendment
    ? {
        type: booking.amendment.type,
        status: booking.amendment.status,
        changeRequestId: booking.amendment.changeRequestId,
        requestedAt: booking.updatedAt,
        raw: booking.amendment.response, // full TBO response (optional)
      }
    : null;

  booking.amendmentHistory =
    booking.amendmentHistory?.map((item) => ({
      type: item.type,
      status: item.status,
      changeRequestId: item.changeRequestId,
      createdAt: item.createdAt,
    })) || [];

  /* ================= PAYMENT LOGIC ================= */

  const corporate = await Corporate.findById(booking.corporateId).select(
    "classification",
  );

  // PREPAID
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

  // POSTPAID
  else if (corporate?.classification === "postpaid") {
    // 🔥 Check if we already have it marked in the document
    if (booking.payment?.status === "completed") {
      // already good
    } else {
      const ledgerEntry = await Ledger.findOne({
        bookingId: booking._id,
        type: "booking",
        status: { $in: ["paid", "billed"] }, // ✅ Recognize billed status
      })
        .sort({ createdAt: -1 })
        .select("_id amount paidDate");

      booking.payment = ledgerEntry
        ? {
            status: "completed",
            method: "agency",
            amount: ledgerEntry.amount,
            paidAt: ledgerEntry.paidDate || ledgerEntry.createdAt,
            transactionId: ledgerEntry._id,
          }
        : { status: "pending" };
    }
  }

  // FALLBACK
  else {
    booking.payment = { status: "pending" };
  }

  /* ================= RESPONSE ================= */

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
    // page = 1,
    // limit = 10,
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

  // const skip = (parseInt(page) - 1) * parseInt(limit);

  const bookings = await Booking.find(query)
    .populate("userId", "name email")
    // .skip(skip)
    // .limit(parseInt(limit))
    .sort({ createdAt: -1 });

  const total = await Booking.countDocuments(query);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        bookings,
        pagination: {
          total,
          // page: parseInt(page),
          // pages: Math.ceil(total / limit),
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
  manualTicketNonLcc: exports.manualTicketNonLcc,
  downloadTicketPdf: exports.downloadTicketPdf,
  getMyBookings: exports.getMyBookings,
  getMyBookingById: exports.getMyBookingById,
  getAllBookings: exports.getAllBookings,
  getBooking: exports.getBooking,
  cancelBooking: exports.cancelBooking,
};
