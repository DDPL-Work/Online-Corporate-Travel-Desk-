const mongoose = require("mongoose");
const amendmentService = require("../services/tektravels/flightAmendment.service");
const cancellationExecution = require("../services/cancellationExecution.service");
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
const normalizeBookingId = (value) => {
  const numericId = Number(value);
  return Number.isFinite(numericId) && numericId > 0 ? numericId : null;
};

const extractBookingIdFromSource = (source) => {
  const candidates = [
    source?.bookingId,
    source?.BookingId,
    source?.raw?.Response?.Response?.FlightItinerary?.BookingId,
    source?.raw?.Response?.Response?.BookingId,
    source?.raw?.Response?.FlightItinerary?.BookingId,
    source?.raw?.Response?.BookingId,
    source?.Response?.Response?.FlightItinerary?.BookingId,
    source?.Response?.Response?.BookingId,
    source?.Response?.FlightItinerary?.BookingId,
    source?.Response?.BookingId,
  ];

  return candidates.map(normalizeBookingId).find(Boolean) || null;
};

const getAllTboBookingIds = (booking) => {
  const bookingIds = [
    extractBookingIdFromSource(booking?.bookingResult?.onwardResponse),
    extractBookingIdFromSource(booking?.bookingResult?.returnResponse),
    extractBookingIdFromSource(booking?.bookingResult?.providerResponse),
    normalizeBookingId(booking?.bookingResult?.bookingId),
    normalizeBookingId(booking?.bookingResult?.providerBookingId),
    normalizeBookingId(booking?.bookingId),
  ].filter(Boolean);

  const ids = [...new Set(bookingIds)];

  if (!ids.length) {
    console.error("❌ CRITICAL: TBO BookingId NOT FOUND", {
      bookingId: booking?._id,
      bookingReference: booking?.bookingReference,
    });
  }

  console.log("✅ FINAL BOOKING IDS:", ids);

  return ids;
};

const getTboBookingId = (booking) => getAllTboBookingIds(booking)[0] || null;

/* ======================================================
   🔎 HELPER: FETCH TICKET IDS FROM TBO IF MISSING
====================================================== */
const tboService = require("../services/tektravels/flight.service");
const CancellationQuery = require("../models/CancellationQuery");

const fetchTicketIdsFromTbo = async (pnr) => {
  if (!pnr) return [];
  try {
    const details = await tboService.getBookingDetails(pnr);
    const paxArr =
      details?.Response?.Response?.FlightItinerary?.Passenger ||
      details?.Response?.FlightItinerary?.Passenger ||
      [];
    return (
      paxArr.map((p) => p?.Ticket?.TicketId || p?.TicketId).filter(Boolean) ||
      []
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

    const bookingIds = getAllTboBookingIds(booking);

    if (!bookingIds.length) {
      return res.status(400).json({
        success: false,
        message: "Invalid TBO BookingId. Cannot fetch cancellation charges.",
      });
    }

    const responses = await Promise.all(
      bookingIds.map(async (id) => {
        const result = await amendmentService.getCancellationCharges(id);
        return {
          bookingId: id,
          response: result,
        };
      }),
    );

    const failedResponses = responses
      .map((item) => ({
        ...item,
        validation: validateTboResponse(item.response),
      }))
      .filter((item) => !item.validation.success);

    if (failedResponses.length) {
      const firstFailure = failedResponses[0];

      return res.status(400).json({
        success: false,
        message:
          failedResponses.length === 1
            ? firstFailure.validation.message
            : failedResponses
                .map(
                  (item) =>
                    `Booking ${item.bookingId}: ${item.validation.message}`,
                )
                .join("; "),
        traceId: firstFailure.validation.traceId,
        data: responses,
      });
    }

    const finalResponse =
      responses.length === 1
        ? responses[0].response // ✅ backward compatible
        : {
            success: true,
            isRoundTrip: true,
            data: responses,
          };

    return res.json(finalResponse);
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
    const { bookingId, remarks, cancellationQueryId } = req.body;

    // 🔒 EXECUTION GATING: Must have EXECUTED CancellationQuery
    if (cancellationQueryId) {
      const cancellationQuery = await CancellationQuery.findById(cancellationQueryId);
      if (cancellationQuery && cancellationQuery.approvalStage !== undefined && cancellationQuery.approvalStage !== "EXECUTED") {
        return res.status(400).json({ success: false, message: "Awaiting approval before execution" });
      }
    } else {
      // No cancellationQueryId provided — reject immediately to prevent unapproved execution
      return res.status(400).json({ success: false, message: "Cancellation query ID required. Request must be approved first." });
    }

    const result = await cancellationExecution.executeFullCancellation({
      bookingId,
      cancellationQueryId,
      remarks,
      userId: req.user?._id,
      userName: req.user?.name,
    });

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Full Cancellation Error:", error.message);
    return res.status(500).json({ message: "Cancellation failed", error: error.message });
  }
};

/* ======================================================
   3️⃣ PARTIAL CANCELLATION
====================================================== */
exports.partialCancellation = async (req, res) => {
  try {
    const { bookingId, passengerIds = [], segments, remarks, cancellationQueryId } = req.body;

    // 🔒 EXECUTION GATING: Must have EXECUTED CancellationQuery
    if (!cancellationQueryId) {
      return res.status(400).json({ success: false, message: "Cancellation query ID required. Request must be approved first." });
    }
    const cancellationQuery = await CancellationQuery.findById(cancellationQueryId);
    if (cancellationQuery && cancellationQuery.approvalStage !== undefined && cancellationQuery.approvalStage !== "EXECUTED") {
      return res.status(400).json({ success: false, message: "Awaiting approval before execution" });
    }

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

    let ticketIds = ticketIdsFromBooking.length > 0 ? ticketIdsFromBooking : [];

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

    const ticketCrInfo = result?.Response?.TicketCRInfo;
    let changeRequestIds = [];
    if (Array.isArray(ticketCrInfo)) {
      changeRequestIds = ticketCrInfo.map((info) => info?.ChangeRequestId).filter(Boolean);
    } else if (ticketCrInfo?.ChangeRequestId) {
      changeRequestIds = [ticketCrInfo.ChangeRequestId];
    } else if (result?.Response?.ChangeRequestId) {
      changeRequestIds = [result.Response.ChangeRequestId];
    }

    await updateBooking(booking._id, {
      executionStatus: "cancel_requested",
      amendment: {
        type: "PARTIAL_CANCEL",
        changeRequestIds,
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

    // 🔥 Record EXECUTED audit on CancellationQuery if present
    if (cancellationQueryId) {
      await CancellationQuery.findByIdAndUpdate(cancellationQueryId, {
        $push: {
          approvalAudit: {
            action: "EXECUTED",
            user: req.user?._id,
            role: "system",
            timestamp: new Date(),
            remarks: "Partial cancellation executed via TBO",
          },
        },
      });
    }

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
            cancelledAt: new Date(),
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
      cancelledAt: new Date(),
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

exports.createCancellationQuery = async (req, res) => {
  try {
    let {
      bookingId,
      bookingReference,
      priority,
      remarks,
      segments,
      corporate,
      bookingSnapshot,
      passengers,
      bookingType,
      user: requestUser,
      isOnlineCancellation,
      approvalType,
    } = req.body;

    console.log("[CancellationQuery] create payload identifiers", {
      receivedBookingId: bookingId,
      receivedBookingReference: bookingReference,
      isOnline: isOnlineCancellation,
    });

    /* ─────────────────────────────
       🔥 VALIDATION
    ───────────────────────────── */
    if (!bookingId || !bookingReference) {
      return res.status(400).json({
        success: false,
        message: "bookingId and bookingReference are required",
      });
    }

    /* ─────────────────────────────────────────────
       🔥 EXECUTION GUARD: booking already cancelled
    ───────────────────────────────────────────── */
    const existingBooking = await BookingRequest.findById(bookingId).select("executionStatus").lean();
    if (existingBooking && existingBooking.executionStatus === "cancelled") {
      return res.status(409).json({
        success: false,
        message: "This booking has already been cancelled.",
      });
    }

    /* ───────────────────────────────────────────────────────
       🔥 ONLINE CANCELLATION: Execute directly, NO CQ created
       When charges API confirms online availability:
       - ResponseStatus === 1
       - ErrorCode absent or 0
       - RefundAmount > 0 OR CancellationCharge >= 0
    ─────────────────────────────────────────────────────── */
    if (isOnlineCancellation === true || isOnlineCancellation === "true") {
      console.log(`[CancellationQuery] Online cancellation for ${bookingId} — executing directly, no CQ`);

      const result = await cancellationExecution.executeFullCancellation({
        bookingId,
        remarks: remarks || "Online cancellation",
        userId: req.user?._id,
        userName: req.user?.name,
      });

      return res.status(200).json({
        success: true,
        message: "Cancellation executed successfully",
        data: {
          ...result,
          requestStatus: "approved",
          approvalStage: "EXECUTED",
          providerExecutionStatus: "COMPLETED",
          isOnlineCancellation: true,
        },
      });
    }

    /* ─────────────────────────────
       🔥 DUPLICATE PREVENTION: Check active request exists
    ───────────────────────────── */
    const CancellationQuery = require("../models/CancellationQuery");
    const existingQuery = await CancellationQuery.findOne({
      bookingId,
      requestStatus: {
        $in: [
          "PENDING_MANAGER_APPROVAL",
          "PENDING_TRAVEL_ADMIN_APPROVAL",
          "PENDING_ADMIN_APPROVAL",
        ],
      },
    });

    if (existingQuery) {
      return res.status(409).json({
        success: false,
        message: "A cancellation request is already pending for this booking.",
        existingQueryId: existingQuery.queryId,
      });
    }

    /* ─────────────────────────────
       🔥 SAFE PARSE (VERY IMPORTANT)
    ───────────────────────────── */
    const safeParse = (val, fallback) => {
      if (typeof val === "string") {
        try {
          return JSON.parse(val); // normal case
        } catch {
          try {
            // 🔥 FIX INVALID JSON (single quotes → double quotes)
            const fixed = val
              .replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":') // keys
              .replace(/'/g, '"'); // quotes

            return JSON.parse(fixed);
          } catch {
            return fallback;
          }
        }
      }
      return val ?? fallback;
    };

    passengers = safeParse(passengers, []);
    corporate = safeParse(corporate, {});
    bookingSnapshot = safeParse(bookingSnapshot, {});
    segments = safeParse(segments, []);

    if (!Array.isArray(passengers)) {
      console.log("❌ INVALID PASSENGERS:", passengers);

      return res.status(400).json({
        success: false,
        message: "Passengers must be a valid array",
      });
    }

    console.log("RAW passengers:", req.body.passengers);

    /* ─────────────────────────────
       🔥 TYPE VALIDATION
    ───────────────────────────── */
    if (!Array.isArray(passengers)) {
      return res.status(400).json({
        success: false,
        message: "Passengers must be an array",
      });
    }

    if (!Array.isArray(segments)) {
      return res.status(400).json({
        success: false,
        message: "Segments must be an array",
      });
    }

    /* ───────────────────────────────────────────────────────
       🔥 RESOLVE APPROVERS FROM ORIGINAL BOOKING (Issue 29 fix)
       Read stored unified approval fields from the booking.
       Do NOT derive from employee profile or corporate defaults.
    ─────────────────────────────────────────────────────── */
    let managerId = null;
    let travelAdminId = null;
    let travadminApprover = null;

    try {
      if (bookingType === "hotel") {
        const HotelBookingRequest = require("../models/hotelBookingRequest.model");
        const hotelDoc = await HotelBookingRequest.findById(bookingId)
          .select("managerId travelAdminId travadminApprover approverId")
          .lean();

        if (hotelDoc) {
          // Prefer unified approval fields (populated during hotel booking approval)
          managerId = hotelDoc.managerId || null;
          travelAdminId = hotelDoc.travelAdminId || null;
          travadminApprover = hotelDoc.travadminApprover || null;

          // Fallback: read approverId (legacy ObjectId ref)
          if (!managerId && hotelDoc.approverId) {
            managerId = hotelDoc.approverId;
          }
        }
      } else {
        const bookingDoc = await BookingRequest.findById(bookingId)
          .select("managerId travelAdminId travadminApprover approverId")
          .lean();

        if (bookingDoc) {
          // Prefer unified approval fields (populated during booking approval)
          managerId = bookingDoc.managerId || null;
          travelAdminId = bookingDoc.travelAdminId || null;
          travadminApprover = bookingDoc.travadminApprover || null;

          // Fallback: read approverId (legacy String)
          if (!managerId && bookingDoc.approverId) {
            // bookingDoc.approverId is stored as String — convert to ObjectId
            try {
              const mgoId = new mongoose.Types.ObjectId(bookingDoc.approverId);
              managerId = mgoId;
            } catch (_) {
              // Not a valid ObjectId; skip
            }
          }
        }
      }
    } catch (e) {
      console.warn("[CancellationQuery] Failed to resolve booking approvers:", e.message);
    }

    /* ─────────────────────────────
       🔥 DETECT INITIATOR ROLE & APPROVAL STAGE
       Parallel flow: PENDING_PARALLEL_APPROVAL for simultaneous visibility
    ───────────────────────────── */
    const isTravelAdminInitiated = req.user?.role === "travel-admin";
    const hasManagerAssigned = !isTravelAdminInitiated && !!managerId;
    const hasTravelAdminAssigned = !!travelAdminId;

    const initialStage = isTravelAdminInitiated
      ? "TRAVEL_ADMIN_APPROVER"
      : hasManagerAssigned && hasTravelAdminAssigned
        ? "PENDING_PARALLEL_APPROVAL"
        : hasManagerAssigned
          ? "MANAGER"
          : "TRAVEL_ADMIN";
    const initialStatus = isTravelAdminInitiated
      ? "PENDING_ADMIN_APPROVAL"
      : hasManagerAssigned
        ? "PENDING_MANAGER_APPROVAL"
        : "PENDING_TRAVEL_ADMIN_APPROVAL";
    const initiatorRole = isTravelAdminInitiated ? "travel-admin" : "employee";

    /* ─────────────────────────────
       🔥 GENERATE QUERY ID
    ───────────────────────────── */
    const count = await CancellationQuery.countDocuments();

    const queryId = `CQ-${new Date().getFullYear()}-${String(
      count + 1,
    ).padStart(5, "0")}`;

    /* ─────────────────────────────
       🔥 CREATE QUERY (NO PROVIDER EXECUTION)
    ───────────────────────────── */
    const query = await CancellationQuery.create({
      bookingId,
      bookingReference,
      bookingType: bookingType || "flight",
      queryId,
      priority,
      remarks,

      passengers,
      corporate,
      corporateId: corporate?.companyId || req.user?.corporateId || undefined,
      bookingSnapshot,
      segments,

      user: {
        id: req.user?._id || requestUser?.id,
        name: typeof req.user?.name === "string"
          ? req.user.name
          : req.user?.name?.firstName
            ? `${req.user.name.firstName} ${req.user.name.lastName || ""}`.trim()
            : (requestUser?.name || "Employee"),
        email: req.user?.email || requestUser?.email,
        phone: req.user?.phone || requestUser?.phone,
      },

      // 🔥 APPROVAL FIELDS
      approvalStage: initialStage,
      requestStatus: initialStatus,
      managerId: isTravelAdminInitiated ? null : (managerId || null),
      travelAdminId: travelAdminId || null,
      travadminApprover: travadminApprover || undefined,
      isOnlineCancellation: isOnlineCancellation === true || isOnlineCancellation === "true",
      approvalType: approvalType === "ONLINE" ? "ONLINE" : "OFFLINE",
      providerExecutionStatus: isOnlineCancellation === true || isOnlineCancellation === "true" ? "PENDING" : "PENDING",
      approvalAudit: [
        {
          action: "REQUEST_CREATED",
          user: req.user?._id || requestUser?.id,
          role: initiatorRole,
          timestamp: new Date(),
          remarks: isTravelAdminInitiated ? "Cancellation query created by Travel Admin" : "Cancellation query created",
        },
      ],

      logs: [
        {
          action: "CREATED",
          by: "USER",
          message: "Cancellation query created",
        },
      ],
    });

    /* ─────────────────────────────
        ✅ SUCCESS RESPONSE (NO OPS ASSIGNMENT — approvals first)
    ───────────────────────────── */
    return res.status(201).json({
      success: true,
      message: "Cancellation query created successfully. Awaiting approval chain completion.",
      data: query,
    });
  } catch (error) {
    console.error("❌ createCancellationQuery:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create cancellation query",
      error: error.message,
    });
  }
};
