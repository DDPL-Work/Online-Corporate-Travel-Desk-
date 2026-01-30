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
const checkApprovedRequestPriceService = require("../services/tektravels/checkApprovedRequestPrice.service");

// @desc    Create booking request (Approval-first)
// @route   POST /api/v1/bookings
// @access  Private

const sanitizeFlightRequest = (flightRequest) => ({
  traceId: flightRequest.traceId,
  resultIndex: flightRequest.resultIndex,

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
        travelDate: s.departureDateTime,
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
      const fareResult = Array.isArray(flightRequest.fareQuote?.Results)
        ? flightRequest.fareQuote.Results[0]
        : flightRequest.fareQuote?.Results;

      // ONWARD segments (already present)
      const onwardSegments = fareResult?.Segments?.flat?.() || [];

      // RETURN segments MUST be fetched separately
      let returnSegments = [];

      if (flightRequest.resultIndex?.return) {
        const returnFare = await tboService.getFareQuote(
          flightRequest.traceId,
          flightRequest.resultIndex.return,
        );

        const returnResult = Array.isArray(returnFare?.Results)
          ? returnFare.Results[0]
          : returnFare?.Results;

        returnSegments = returnResult?.Segments?.flat?.() || [];
      }

      const allSegments = [...onwardSegments, ...returnSegments];

      if (!allSegments.length) {
        throw new ApiError(400, "Invalid RT fare segments");
      }

      const firstSeg = allSegments[0];
      const lastSeg = allSegments[allSegments.length - 1];

      bookingSnapshot = {
        sectors: allSegments.map(
          (s) =>
            `${s.Origin?.Airport?.AirportCode}-${s.Destination?.Airport?.AirportCode}`,
        ),

        airline: [
          ...new Set(
            allSegments.map((s) => s.Airline?.AirlineName).filter(Boolean),
          ),
        ].join(", "),

        travelDate: firstSeg.Origin?.DepTime,
        returnDate: lastSeg.Origin?.DepTime,

        cabinClass:
          firstSeg.CabinClass === 1
            ? "Economy"
            : firstSeg.CabinClass === 2
              ? "Premium Economy"
              : firstSeg.CabinClass === 3
                ? "Business"
                : "Economy",

        amount: pricingSnapshot.totalAmount,
        purposeOfTravel,
        city: lastSeg.Destination?.Airport?.CityName,
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

// @desc    Get logged-in user's approved flight requests pending booking
// @route   GET /api/v1/bookings/my
// @access  Private (Employee)
exports.getMyRequests = asyncHandler(async (req, res) => {
  const bookings = await BookingRequest.find({
    userId: req.user._id, // 🔐 ownership enforced
    bookingType: "flight",
    requestStatus: "approved", // ✅ only approved
    executionStatus: { $ne: "ticketed" }, // ✅ not booked
  })
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
        "Approved requests pending booking fetched",
      ),
    );
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
exports.executeApprovedFlightBooking = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;

  const booking = await BookingRequest.findById(bookingId);
  if (!booking) throw new ApiError(404, "Booking not found");
  if (booking.requestStatus !== "approved")
    throw new ApiError(400, "Booking not approved");
  if (booking.executionStatus === "ticketed")
    throw new ApiError(400, "Booking already completed");

  const corporate = await Corporate.findById(booking.corporateId);
  if (!corporate) throw new ApiError(404, "Corporate not found");

  const leadPassenger =
    booking.travellers.find((t) => t.isLeadPassenger) || booking.travellers[0];

  const passengers = booking.travellers.map((t) => ({
    title: t.title,
    firstName: t.firstName,
    lastName: t.lastName,
    paxType: t.paxType || "ADULT",
    dateOfBirth: t.dateOfBirth,
    gender: t.gender,
    passportNo: t.passportNumber,
    passportExpiry: t.passportExpiry,
    email: t.email || leadPassenger.email,
    contactNo: t.phoneWithCode || leadPassenger.phoneWithCode,
  }));

  const fareResult = Array.isArray(booking.flightRequest.fareQuote.Results)
    ? booking.flightRequest.fareQuote.Results[0]
    : booking.flightRequest.fareQuote.Results;

  const isLCC = fareResult?.IsLCC === true;
  const VALID_LCC_STATUSES = [1, 2, 3];

  try {
    /* =====================================================
       STEP 1 — BOOKING (PNR CREATION)
    ===================================================== */

    booking.executionStatus = "booking_initiated";
    await booking.save();

    // if (isLCC) {
    //   // LCC: Book + Ticket in ONE call
    //   const bookResp = await tboService.bookFlight({
    //     IsLCC: true,
    //     traceId: booking.flightRequest.traceId,
    //     resultIndex: booking.flightRequest.resultIndex,
    //     result: booking.flightRequest.fareQuote.Results[0],
    //     passengers,
    //     ssr: booking.flightRequest.ssrSnapshot,
    //   });

    //   const pnr =
    //     bookResp?.Response?.Response?.PNR ||
    //     bookResp?.Response?.Response?.FlightItinerary?.PNR ||
    //     bookResp?.pnr;

    //   if (!pnr) {
    //     booking.executionStatus = "failed";
    //     booking.bookingResult = { providerResponse: bookResp };
    //     await booking.save();
    //     throw new ApiError(500, "LCC booking failed: PNR not returned");
    //   }

    //   booking.bookingResult = {
    //     pnr,
    //     providerResponse: bookResp,
    //   };
    // } else {
    //   // NON-LCC: Booking only (PNR creation)
    //   const bookResp = await tboService.bookFlight({
    //     IsLCC: false,
    //     traceId: booking.flightRequest.traceId,
    //     resultIndex: booking.flightRequest.resultIndex,
    //     fareQuote: booking.flightRequest.fareQuote,
    //     result: booking.flightRequest.fareQuote.Results[0],
    //     passengers,
    //     ssr: booking.flightRequest.ssrSnapshot,
    //   });

    //   const extractedPNR =
    //     bookResp?.pnr ||
    //     bookResp?.raw?.Response?.Response?.PNR ||
    //     bookResp?.raw?.Response?.Response?.FlightItinerary?.PNR ||
    //     null;

    //   const extractedBookingId =
    //     bookResp?.bookingId ||
    //     bookResp?.raw?.Response?.Response?.BookingId ||
    //     bookResp?.raw?.Response?.Response?.FlightItinerary?.BookingId ||
    //     null;

    //   if (!extractedPNR || !extractedBookingId) {
    //     booking.executionStatus = "failed";
    //     booking.bookingResult = { providerResponse: bookResp.raw };
    //     await booking.save();
    //     throw new ApiError(
    //       500,
    //       "Non-LCC booking failed: PNR or BookingId missing",
    //     );
    //   }

    //   booking.bookingResult = {
    //     pnr: extractedPNR,
    //     bookingId: extractedBookingId,
    //     providerResponse: bookResp.raw,
    //   };
    // }

    if (isLCC) {
      /* ==========================================
     LCC FLOW — PAY → TICKET → FETCH PNR
  ========================================== */

      booking.executionStatus = "ticket_pending";
      await booking.save();

      // 💰 PAYMENT (ONCE)
      await paymentService.processBookingPayment({ booking, corporate });

      // 🎫 TICKET
      const ticketResp = await tboService.ticketFlight({
        isLCC: true,
        traceId: booking.flightRequest.traceId,
        resultIndex: booking.flightRequest.resultIndex,
      });

      const ticketStatus = ticketResp?.Response?.ResponseStatus;

      if (ticketStatus === 0) {
        booking.executionStatus = "failed";
        booking.bookingResult = { ticketResp };
        await booking.save();
        throw new ApiError(500, "LCC ticketing rejected by TBO");
      }

      // ⏳ FETCH BOOKING DETAILS TO GET PNR
      const detailsResp = await tboService.getBookingDetails(
        ticketResp?.Response?.PNR || booking.flightRequest.traceId,
      );

      const itinerary = detailsResp?.Response?.Response?.FlightItinerary;

      let pnr = null;

      if (ticketResp?.Response?.PNR) {
        pnr = ticketResp.Response.PNR;
      }

      booking.bookingResult = {
        ticketResponse: ticketResp,
      };

      booking.executionStatus =
        ticketStatus === 1 ? "ticketed" : "ticket_pending";

      await booking.save();

      return res.status(200).json(
        new ApiResponse(
          200,
          {
            bookingId: booking._id,
            status: booking.executionStatus,
          },
          "LCC ticketing initiated",
        ),
      );
    } else {
      //   // NON-LCC: Booking only (PNR creation)
      const bookResp = await tboService.bookFlight({
        IsLCC: false,
        traceId: booking.flightRequest.traceId,
        resultIndex: booking.flightRequest.resultIndex,
        fareQuote: booking.flightRequest.fareQuote,
        result: booking.flightRequest.fareQuote.Results[0],
        passengers,
        ssr: booking.flightRequest.ssrSnapshot,
      });

      const extractedPNR =
        bookResp?.pnr ||
        bookResp?.raw?.Response?.Response?.PNR ||
        bookResp?.raw?.Response?.Response?.FlightItinerary?.PNR ||
        null;

      const extractedBookingId =
        bookResp?.bookingId ||
        bookResp?.raw?.Response?.Response?.BookingId ||
        bookResp?.raw?.Response?.Response?.FlightItinerary?.BookingId ||
        null;

      if (!extractedPNR || !extractedBookingId) {
        booking.executionStatus = "failed";
        booking.bookingResult = { providerResponse: bookResp.raw };
        await booking.save();
        throw new ApiError(
          500,
          "Non-LCC booking failed: PNR or BookingId missing",
        );
      }

      booking.bookingResult = {
        pnr: extractedPNR,
        bookingId: extractedBookingId,
        providerResponse: bookResp.raw,
      };
    }

    booking.executionStatus = "booked";
    await booking.save();

    /* =====================================================
       STEP 2 — PAYMENT
    ===================================================== */

    await paymentService.processBookingPayment({ booking, corporate });

    /* =====================================================
       STEP 3 — TICKETING (NON-LCC ONLY)
    ===================================================== */

    if (!isLCC) {
      const ticketResp = await tboService.ticketFlight({
        bookingId: booking.bookingResult.bookingId,
        pnr: booking.bookingResult.pnr,
      });

      const ticketPNR =
        ticketResp?.Response?.Response?.PNR ||
        ticketResp?.Response?.Response?.FlightItinerary?.PNR ||
        booking.bookingResult.pnr; // fallback

      if (!ticketPNR) {
        booking.executionStatus = "failed";
        booking.bookingResult = {
          ...booking.bookingResult,
          ticketResponse: ticketResp,
        };
        await booking.save();
        throw new ApiError(500, "Ticketing failed: PNR not returned");
      }

      // DO NOT overwrite PNR
      booking.bookingResult = {
        ...booking.bookingResult,
        ticketResponse: ticketResp,
      };
    }

    /* =====================================================
       FINAL STATE
    ===================================================== */

    booking.executionStatus = "ticketed";
    await booking.save();

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          bookingId: booking._id,
          pnr: booking.bookingResult.pnr,
        },
        "Flight booked & ticketed successfully",
      ),
    );
  } catch (error) {
    booking.executionStatus = "failed";
    await booking.save();
    throw error;
  }
});

// @desc    Download ticket PDF
// @route   GET /api/v1/bookings/:id/ticket-pdf
// @access  Private (Employee)
exports.downloadTicketPdf = asyncHandler(async (req, res) => {
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
    const pnr =
      providerResponse?.PNR ||
      flightItinerary?.PNR ||
      flightItinerary?.Segments?.[0]?.AirlinePNR ||
      null;

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
