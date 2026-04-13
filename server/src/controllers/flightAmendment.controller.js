const amendmentService = require("../services/tektravels/flightAmendment.service");
const BookingRequest = require("../models/BookingRequest");

/* ======================================================
   🔥 HELPER: VALIDATE TBO RESPONSE
====================================================== */
const validateTboResponse = (result) => {
  const response = result?.Response;

  const isSuccess =
    response?.ResponseStatus === 1 &&
    (!response?.Error || response?.Error?.ErrorCode === 0);

  if (!isSuccess) {
    return {
      success: false,
      message: response?.Error?.ErrorMessage || "TBO request failed",
      code: response?.Error?.ErrorCode,
      traceId: response?.TraceId,
    };
  }

  return { success: true };
};

/* ======================================================
   🔧 HELPER: EXTRACT TBO BOOKING ID
====================================================== */
const getTboBookingId = (booking) => {
  const paths = [
    // ✅ PRIMARY (MOST RELIABLE)
    booking?.bookingResult?.onwardResponse?.raw?.Response?.Response?.FlightItinerary?.BookingId,
    booking?.bookingResult?.returnResponse?.raw?.Response?.Response?.FlightItinerary?.BookingId,

    // ✅ FALLBACKS
    booking?.bookingResult?.onwardResponse?.Response?.Response?.FlightItinerary?.BookingId,
    booking?.bookingResult?.returnResponse?.Response?.Response?.FlightItinerary?.BookingId,

    booking?.bookingResult?.providerResponse?.raw?.Response?.Response?.BookingId,
    booking?.bookingResult?.providerResponse?.raw?.Response?.BookingId,
    booking?.bookingResult?.providerResponse?.Response?.Response?.BookingId,

    booking?.bookingResult?.bookingId,
    booking?.bookingId,
  ];

  console.log("🔍 ALL BOOKING ID PATHS:", paths);

  const id = paths.find((val) => val !== undefined && val !== null);

  if (!id) {
    console.error("❌ CRITICAL: TBO BookingId NOT FOUND");
    return null;
  }

  const numericId = Number(id);

  if (!numericId || isNaN(numericId)) {
    console.error("❌ INVALID BookingId:", id);
    return null;
  }

  console.log("✅ SELECTED BOOKING ID:", numericId);

  return numericId;
};

/* ======================================================
   🔎 HELPER: FETCH TICKET IDS FROM TBO IF MISSING
====================================================== */
const tboService = require("../services/tektravels/flight.service");

const fetchTicketIdsFromTbo = async (pnr) => {
  if (!pnr) return [];
  try {
    const details = await tboService.getBookingDetails(pnr);
    const paxArr =
      details?.Response?.Response?.FlightItinerary?.Passenger ||
      details?.Response?.FlightItinerary?.Passenger ||
      [];
    return (
      paxArr
        .map((p) => p?.Ticket?.TicketId || p?.TicketId)
        .filter(Boolean) || []
    );
  } catch (err) {
    console.error("TBO fetch ticket IDs failed:", err.message);
    return [];
  }
};

/* ======================================================
   🔧 COMMON DB UPDATE HELPER (FIXED)
====================================================== */
const updateBooking = async (bookingId, update = {}) => {
  try {
    const setQuery = {};
    const pushQuery = {};

    Object.entries(update).forEach(([key, value]) => {
      if (key === "amendmentHistory") {
        pushQuery.amendmentHistory = value;
      } else {
        setQuery[key] = value;
      }
    });

    const query = {};
    if (Object.keys(setQuery).length) query.$set = setQuery;
    if (Object.keys(pushQuery).length) query.$push = pushQuery;

    return await BookingRequest.findByIdAndUpdate(
      bookingId, // ✅ FIXED
      query,
      { new: true },
    );
  } catch (err) {
    console.error("DB UPDATE ERROR:", err.message);
  }
};

/* ======================================================
   1️⃣ GET CANCELLATION CHARGES
====================================================== */
exports.getCancellationCharges = async (req, res) => {
  try {
    const { bookingId } = req.body;

    const booking = await BookingRequest.findById(bookingId);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    const tboBookingId = getTboBookingId(booking);

    if (!tboBookingId) {
  return res.status(400).json({
    message: "Invalid TBO BookingId. Cannot fetch cancellation charges.",
  });
}

    const result = await amendmentService.getCancellationCharges(tboBookingId);

    return res.json(result);
  } catch (error) {
    console.error("Cancellation Charges Error:", error.message);
    return res.status(500).json({ message: "Failed to fetch charges" });
  }
};

/* ======================================================
   2️⃣ FULL CANCELLATION
====================================================== */
exports.fullCancellation = async (req, res) => {
  try {
    const { bookingId, remarks } = req.body;

    const booking = await BookingRequest.findById(bookingId);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    const tboBookingId = getTboBookingId(booking);

    const result = await amendmentService.sendChangeRequest({
      BookingId: tboBookingId,
      RequestType: 1,
      CancellationType: 1,
      Remarks: remarks || "Full cancellation",
    });

    /* 🔥 VALIDATE RESPONSE */
    const validation = validateTboResponse(result);

    if (!validation.success) {
      console.error("❌ FULL CANCEL FAILED:", validation);

      return res.status(400).json({
        success: false,
        message: validation.message,
        code: validation.code,
        traceId: validation.traceId,
      });
    }

    /* ✅ SUCCESS ONLY */
    const changeRequestId =
      result?.Response?.TicketCRInfo?.[0]?.ChangeRequestId || null;

    await updateBooking(bookingId, {
      executionStatus: "cancel_requested",
      amendment: {
        type: "FULL_CANCEL",
        changeRequestId,
        status: "requested",
        response: result,
      },
      amendmentHistory: {
        type: "FULL_CANCEL",
        changeRequestId,
        status: "requested",
        response: result,
        createdAt: new Date(),
      },
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Full Cancellation Error:", error.message);
    return res.status(500).json({ message: "Cancellation failed" });
  }
};

/* ======================================================
   3️⃣ PARTIAL CANCELLATION
====================================================== */
exports.partialCancellation = async (req, res) => {
  try {
    const { bookingId, passengerIds = [], segments, remarks } = req.body;

    /* Support both internal Mongo _id and direct TBO BookingId */
    let booking = null;
    try {
      booking = await BookingRequest.findById(bookingId);
    } catch (err) {
      /* ignore cast errors - may be numeric TBO id */
    }

    /* If not found by _id, try to locate via TBO BookingId */
    const numericBookingId = Number(bookingId);
    if (!booking && !Number.isNaN(numericBookingId)) {
      booking = await BookingRequest.findOne({
        $or: [
          {
            "bookingResult.onwardResponse.raw.Response.Response.FlightItinerary.BookingId":
              { $in: [numericBookingId, bookingId] },
          },
          {
            "bookingResult.returnResponse.raw.Response.Response.FlightItinerary.BookingId":
              { $in: [numericBookingId, bookingId] },
          },
          { "bookingResult.bookingId": { $in: [numericBookingId, bookingId] } },
        ],
      });
    }

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const tboBookingId = Number(
      bookingId && !Number.isNaN(numericBookingId)
        ? numericBookingId
        : getTboBookingId(booking),
    );

    if (!tboBookingId) {
      return res.status(400).json({ message: "Invalid BookingId" });
    }

    const sectors = (segments || []).map((seg) => ({
      Origin: seg?.Origin || seg?.origin,
      Destination: seg?.Destination || seg?.destination,
    }));

    if (!sectors.length) {
      return res.status(400).json({ message: "At least one sector required" });
    }

    /*  Collect ticket ids from booking (preferred) */
    const onwardPassengers =
      booking?.bookingResult?.onwardResponse?.raw?.Response?.Response
        ?.FlightItinerary?.Passenger || [];
    const returnPassengers =
      booking?.bookingResult?.returnResponse?.raw?.Response?.Response
        ?.FlightItinerary?.Passenger || [];

    const selectPassengersByBookingId = (id) => {
      if (
        booking?.bookingResult?.onwardResponse?.raw?.Response?.Response
          ?.FlightItinerary?.BookingId === id
      )
        return onwardPassengers;
      if (
        booking?.bookingResult?.returnResponse?.raw?.Response?.Response
          ?.FlightItinerary?.BookingId === id
      )
        return returnPassengers;
      return [];
    };

    const chosenPassengers = selectPassengersByBookingId(tboBookingId);

    const ticketIdsFromBooking =
      chosenPassengers
        .map((p) => p?.Ticket?.TicketId || p?.TicketId)
        .filter(Boolean) || [];

    let ticketIds =
      ticketIdsFromBooking.length > 0 ? ticketIdsFromBooking : [];

    /* Fallback: fetch from TBO booking details using PNR */
    if (!ticketIds.length) {
      const pnrPrimary =
        tboBookingId ===
        booking?.bookingResult?.returnResponse?.raw?.Response?.Response
          ?.FlightItinerary?.BookingId
          ? booking?.bookingResult?.returnPNR
          : booking?.bookingResult?.onwardPNR ||
            booking?.bookingResult?.pnr ||
            null;

      const pnrFallback =
        tboBookingId ===
        booking?.bookingResult?.onwardResponse?.raw?.Response?.Response
          ?.FlightItinerary?.BookingId
          ? booking?.bookingResult?.returnPNR
          : booking?.bookingResult?.onwardPNR;

      const tried = new Set();
      const pnrList = [pnrPrimary, pnrFallback].filter(Boolean);
      for (const pnr of pnrList) {
        if (tried.has(pnr)) continue;
        tried.add(pnr);
        const fetched = await fetchTicketIdsFromTbo(pnr);
        if (fetched.length) {
          ticketIds = fetched;
          break;
        }
      }
    }

    if (!ticketIds.length) {
      return res.status(400).json({
        success: false,
        message:
          "TicketId missing for this booking. Please retry after ticketing is confirmed.",
      });
    }

    if (!ticketIds.length) {
      return res
        .status(400)
        .json({ message: "TicketId missing for selected journey" });
    }

    const result = await amendmentService.sendChangeRequest({
      BookingId: tboBookingId,
      RequestType: 2, // Partial cancellation as per TBO
      CancellationType: 3, // Partial
      Sectors: sectors,
      TicketId: ticketIds, // send as array for SOAP deserialization
      Remarks: remarks || "Partial cancellation",
    });

    const validation = validateTboResponse(result);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: validation.message,
      });
    }

    const changeRequestId =
      result?.Response?.TicketCRInfo?.[0]?.ChangeRequestId || null;

    await updateBooking(booking._id, {
      executionStatus: "cancel_requested",
      amendment: {
        type: "PARTIAL_CANCEL",
        changeRequestId,
        status: "requested",
        response: result,
      },
      amendmentHistory: {
        type: "PARTIAL_CANCEL",
        changeRequestId,
        status: "requested",
        response: result,
        createdAt: new Date(),
      },
    });

    return res.json(result);
  } catch (error) {
    console.error("Partial Cancellation Error:", error.message);
    return res.status(500).json({ message: "Partial cancellation failed" });
  }
};

/* ======================================================
   4️⃣ AMEND BOOKING
====================================================== */
exports.amendBooking = async (req, res) => {
  try {
    const { bookingId, remarks, segments } = req.body;

    const booking = await BookingRequest.findById(bookingId);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    const tboBookingId = getTboBookingId(booking);

    /* 🔥 EXTRACT TICKET IDs */
    const ticketIds =
      booking?.bookingResult?.providerResponse?.Response?.Response?.FlightItinerary?.Passenger?.map(
        (p) => p?.Ticket?.TicketId,
      ).filter(Boolean);

    if (!ticketIds?.length) {
      return res.status(400).json({ message: "TicketId missing" });
    }

    /* 🔥 BUILD SECTORS */
    const sectors =
      segments?.map((seg) => ({
        Origin: seg.origin || seg.Origin,
        Destination: seg.destination || seg.Destination,
      })) ||
      booking?.flightRequest?.segments?.map((seg) => ({
        Origin: seg.origin,
        Destination: seg.destination,
      }));

    /* 🔥 FINAL PAYLOAD */
    const result = await amendmentService.sendChangeRequest({
      BookingId: tboBookingId,
      RequestType: 3,
      TicketId: ticketIds.join(","), // ✅ MUST
      Sectors: sectors, // ✅ MUST
      Remarks: remarks || "Reissue request",
    });

    const changeRequestId =
      result?.Response?.ChangeRequestId ||
      result?.Response?.TicketCRInfo?.[0]?.ChangeRequestId;

    await updateBooking(bookingId, {
      amendment: {
        type: "REISSUE",
        changeRequestId,
        status: "requested",
        response: result,
      },
      amendmentHistory: {
        type: "REISSUE",
        changeRequestId,
        status: "requested",
        response: result,
        createdAt: new Date(),
      },
    });

    return res.json(result);
  } catch (error) {
    console.error("Amendment Error:", error.message);
    return res.status(500).json({ message: "Amendment failed" });
  }
};

/* ======================================================
   5️⃣ CHECK CHANGE STATUS (OPTIMIZED - NO DB SPAM)
====================================================== */
exports.getChangeStatus = async (req, res) => {
  try {
    const { changeRequestId, bookingId } = req.body;

    if (!changeRequestId) {
      return res.status(400).json({ message: "changeRequestId required" });
    }

    /* 🔹 FETCH BOOKING FIRST */
    const booking = await BookingRequest.findById(bookingId);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    /* 🔹 OPTIONAL: STOP IF ALREADY COMPLETED */
    if (booking?.amendment?.status === "completed") {
      return res.json({
        message: "Already completed",
        status: "completed",
      });
    }

    /* 🔹 CALL TBO STATUS API */
    const result = await amendmentService.getChangeRequestStatus({
      ChangeRequestId: changeRequestId,
    });

    const crStatus = result?.Response?.ChangeRequestStatus;

    let status = "failed";

    if ([1, 2, 3, 7].includes(crStatus)) status = "in_progress";
    else if (crStatus === 4) status = "completed";
    else if (crStatus === 5) status = "failed";

    /* 🔥 PREVENT DB SPAM */
    const prevStatus = booking?.amendment?.status;

    if (prevStatus === status) {
      return res.json(result); // 🚫 NO DB UPDATE
    }

    /* ✅ ONLY UPDATE WHEN STATUS CHANGES */
    await BookingRequest.findByIdAndUpdate(
      bookingId,
      {
        $set: {
          "amendment.status": status,
          ...(status === "completed" && {
            executionStatus: "cancelled",
            cancellation: {
              cancelledAt: new Date(),
              reason: "User cancellation",
              refundStatus: "processing",
            },
          }),
        },
        $push: {
          amendmentHistory: {
            type: "STATUS_UPDATE",
            changeRequestId,
            status,
            response: result,
            createdAt: new Date(),
          },
        },
      },
      { new: true },
    );

    return res.json(result);
  } catch (error) {
    console.error("Change Status Error:", error.message);
    return res.status(500).json({ message: "Failed to get status" });
  }
};

/* ======================================================
   6️⃣ RELEASE PNR
====================================================== */
exports.releasePNR = async (req, res) => {
  try {
    const { bookingId } = req.body;

    const booking = await BookingRequest.findById(bookingId);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    const tboBookingId = getTboBookingId(booking);

    const result = await amendmentService.releasePnr({
      BookingId: tboBookingId,
    });

    await updateBooking(bookingId, {
      executionStatus: "cancelled",
      amendment: {
        type: "RELEASE_PNR",
        status: "completed",
        response: result,
      },
      amendmentHistory: {
        type: "RELEASE_PNR",
        status: "completed",
        response: result,
        createdAt: new Date(),
      },
    });

    return res.json(result);
  } catch (error) {
    console.error("Release PNR Error:", error.message);
    return res.status(500).json({ message: "Release failed" });
  }
};
