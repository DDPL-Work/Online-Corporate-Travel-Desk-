const BookingRequest = require("../models/BookingRequest");
const CancellationQuery = require("../models/CancellationQuery");
const amendmentService = require("./tektravels/flightAmendment.service");
const hotelAmendmentService = require("./tektravels/hotelAmendment.service");

/* ─────────────────────────────────────────────
   🔧 HELPERS: TBO BookingId extraction
   Must match the comprehensive version in
   flightAmendment.controller.js to ensure all
   possible response shapes are covered.
───────────────────────────────────────────── */
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

  return [...new Set(bookingIds)];
};

/* ─────────────────────────────────────────────
   🔧 DB UPDATE HELPER
───────────────────────────────────────────── */
const updateBooking = async (bookingId, update = {}) => {
  try {
    const setQuery = {};
    const pushQuery = {};
    Object.entries(update).forEach(([key, value]) => {
      if (key === "amendmentHistory" || key === "approvalAudit") pushQuery[key] = value;
      else setQuery[key] = value;
    });
    const query = {};
    if (Object.keys(setQuery).length) query.$set = setQuery;
    if (Object.keys(pushQuery).length) query.$push = pushQuery;
    return await BookingRequest.findByIdAndUpdate(bookingId, query, { new: true });
  } catch (err) {
    console.error("DB UPDATE ERROR:", err.message);
  }
};

/**
 * Validate TBO API response.
 */
const validateTboResponse = (result) => {
  const responseStatus = result?.Response?.ResponseStatus;
  if (responseStatus !== 1) {
    const error = result?.Response?.Error;
    return {
      success: false,
      message: error?.ErrorMessage || "Unknown TBO error",
      code: error?.ErrorCode || responseStatus,
      traceId: result?.Response?.TraceId,
    };
  }
  return { success: true };
};

/**
 * Check if TBO online cancellation is available for a booking.
 * Uses TBO cancellation charges API to determine if supplier
 * supports online cancellation.
 *
 * Online cancellation is available when:
 *   - TBO GetCancellationCharges API succeeds
 *   - ResponseStatus === 1 (success)
 *   - ErrorCode is absent OR ErrorCode === 0
 *   - AND (RefundAmount > 0 OR CancellationCharge >= 0)
 *
 * Do NOT depend on CancelChargeDetails.
 */
const isOnlineCancellationAvailable = async (bookingId) => {
  try {
    const booking = await BookingRequest.findById(bookingId).select("bookingResult").lean();
    if (!booking) return false;

    const ids = getAllTboBookingIds(booking);
    if (!ids.length) return false;

    const result = await amendmentService.getCancellationCharges(ids[0]);
    const validation = validateTboResponse(result);

    if (!validation.success) return false;

    const responseStatus = result?.Response?.ResponseStatus;
    const errorCode = result?.Response?.Error?.ErrorCode;
    const refundAmount = result?.Response?.RefundAmount;
    const cancellationCharge = result?.Response?.CancellationCharge;

    if (responseStatus !== 1) return false;
    if (errorCode !== undefined && errorCode !== null && errorCode !== 0) return false;

    const hasRefund = typeof refundAmount === "number" && refundAmount > 0;
    const hasCharge = typeof cancellationCharge === "number" && cancellationCharge >= 0;

    return hasRefund || hasCharge;
  } catch (e) {
    return false;
  }
};

/**
 * Execute full cancellation with TBO provider.
 * Called ONLY when approvalStage reaches EXECUTED.
 */
exports.executeFullCancellation = async ({
  bookingId,
  cancellationQueryId,
  remarks,
  userId,
  userName,
}) => {
  const booking = await BookingRequest.findById(bookingId);
  if (!booking) throw new Error("Booking not found");

  const bookingIds = getAllTboBookingIds(booking);
  if (!bookingIds.length) throw new Error("No valid TBO BookingIds found");

  const responses = [];

  for (const id of bookingIds) {
    const result = await amendmentService.sendChangeRequest({
      BookingId: id,
      RequestType: 1,
      CancellationType: 1,
      Remarks: remarks || "Full cancellation",
    });

    const validation = validateTboResponse(result);
    if (!validation.success) {
      throw new Error(`Booking ${id}: ${validation.message}`);
    }

    responses.push({ bookingId: id, response: result });
  }

  const changeRequestIds = responses
    .flatMap((r) => {
      const info = r.response?.Response?.TicketCRInfo;
      if (Array.isArray(info)) return info.map((i) => i?.ChangeRequestId);
      if (info) return [info?.ChangeRequestId];
      return [r.response?.Response?.ChangeRequestId];
    })
    .filter(Boolean);

  const statuses = responses
    .flatMap((r) => {
      const info = r.response?.Response?.TicketCRInfo;
      if (Array.isArray(info)) return info.map((i) => i?.ChangeRequestStatus);
      if (info) return [info?.ChangeRequestStatus];
      return [r.response?.Response?.ChangeRequestStatus];
    })
    .filter((s) => s !== undefined && s !== null);

  let finalExecutionStatus = "cancel_requested";
  let finalCancelledAt;
  if (statuses.length && statuses.every((s) => s === 4 || s === 6)) {
    finalExecutionStatus = "cancelled";
    finalCancelledAt = new Date();
  } else if (statuses.some((s) => s === 5)) {
    finalExecutionStatus = "cancel_failed";
  }

  // Extract refund data from TBO response
  const tcrResponse = responses.find((r) => r?.response?.Response);
  const resp = tcrResponse?.response?.Response;
  const ticketCRInfo = resp?.TicketCRInfo;
  const firstCRInfo = Array.isArray(ticketCRInfo) ? ticketCRInfo[0] : (ticketCRInfo || {});
  const refundAmount = firstCRInfo?.RefundedAmount ?? resp?.RefundedAmount;
  const cancellationCharge = firstCRInfo?.CancellationCharge ?? resp?.CancellationCharge;
  const creditNoteNo = firstCRInfo?.CreditNoteNo ?? resp?.CreditNoteNo;
  const providerRemarks = firstCRInfo?.Remarks ?? resp?.Remarks;

  const isCompleted = finalExecutionStatus === "cancelled";

  await updateBooking(bookingId, {
    executionStatus: finalExecutionStatus,
    ...(isCompleted && { cancelledAt: finalCancelledAt }),
    amendment: {
      type: "FULL_CANCEL",
      changeRequestIds,
      status: isCompleted ? "completed" : "requested",
      ...(isCompleted && {
        completedAt: new Date(),
        refundAmount,
        cancellationCharge,
        creditNoteNo,
        providerRemarks,
      }),
      response: responses,
    },
    amendmentHistory: {
      type: "FULL_CANCEL",
      changeRequestIds,
      status: "requested",
      response: responses,
      createdAt: new Date(),
    },
  });

  // Push second amendmentHistory entry when completed
  if (isCompleted) {
    await updateBooking(bookingId, {
      amendmentHistory: {
        type: "FULL_CANCEL",
        status: "completed",
        completedAt: new Date(),
        refundAmount,
        cancellationCharge,
        creditNoteNo,
        providerRemarks,
        createdAt: new Date(),
      },
    });
  }

  // Record EXECUTED audit on CancellationQuery
  if (cancellationQueryId) {
    const auditUpdates = {
      $push: {
        approvalAudit: {
          action: "EXECUTED",
          user: userId,
          role: "system",
          timestamp: new Date(),
          remarks: "Cancellation executed via TBO",
        },
      },
    };
    await CancellationQuery.findByIdAndUpdate(cancellationQueryId, auditUpdates);
  }

  // Push audit trail to booking
  if (isCompleted) {
    await updateBooking(bookingId, {
      approvalAudit: {
        action: "ONLINE_CANCELLATION_EXECUTED",
        user: userId || "system",
        role: "system",
        timestamp: new Date(),
        remarks: `Refund ₹${refundAmount || 0}`,
      },
    });
    await updateBooking(bookingId, {
      approvalAudit: {
        action: "CREDIT_NOTE_GENERATED",
        user: userId || "system",
        role: "system",
        timestamp: new Date(),
        remarks: creditNoteNo || "",
      },
    });
    await updateBooking(bookingId, {
      approvalAudit: {
        action: "CANCELLATION_COMPLETED",
        user: userId || "system",
        role: "system",
        timestamp: new Date(),
        remarks: "Online cancellation completed successfully",
      },
    });
  }

  return {
    success: true,
    responses,
    finalExecutionStatus,
    changeRequestIds,
    refundAmount,
    cancellationCharge,
    creditNoteNo,
    providerRemarks,
  };
};

/**
 * Execute partial cancellation with TBO provider.
 */
exports.executePartialCancellation = async ({
  bookingId,
  passengerIds = [],
  segments,
  remarks,
  cancellationQueryId,
  userId,
}) => {
  let booking = null;
  try {
    booking = await BookingRequest.findById(bookingId);
  } catch (e) { /* ignore */ }

  const numericBookingId = Number(bookingId);
  if (!booking && !Number.isNaN(numericBookingId)) {
    booking = await BookingRequest.findOne({
      $or: [
        { "bookingResult.onwardResponse.raw.Response.Response.FlightItinerary.BookingId": { $in: [numericBookingId, bookingId] } },
        { "bookingResult.returnResponse.raw.Response.Response.FlightItinerary.BookingId": { $in: [numericBookingId, bookingId] } },
        { "bookingResult.bookingId": { $in: [numericBookingId, bookingId] } },
      ],
    });
  }

  if (!booking) throw new Error("Booking not found");

  const tboBookingId = Number(
    bookingId && !Number.isNaN(numericBookingId)
      ? numericBookingId
      : getAllTboBookingIds(booking)[0],
  );
  if (!tboBookingId) throw new Error("Invalid BookingId");

  const sectors = (segments || []).map((seg) => ({
    Origin: seg?.Origin || seg?.origin,
    Destination: seg?.Destination || seg?.destination,
  }));
  if (!sectors.length) throw new Error("At least one sector required");

  const onwardPassengers = booking?.bookingResult?.onwardResponse?.raw?.Response?.Response?.FlightItinerary?.Passenger || [];
  const returnPassengers = booking?.bookingResult?.returnResponse?.raw?.Response?.Response?.FlightItinerary?.Passenger || [];

  const selectPassengersByBookingId = (id) => {
    if (booking?.bookingResult?.onwardResponse?.raw?.Response?.Response?.FlightItinerary?.BookingId === id) return onwardPassengers;
    if (booking?.bookingResult?.returnResponse?.raw?.Response?.Response?.FlightItinerary?.BookingId === id) return returnPassengers;
    return [];
  };

  const selectedPassengers = passengerIds.length
    ? selectPassengersByBookingId(tboBookingId).filter((p) =>
        passengerIds.includes(p?.Ticket?.TicketId) || passengerIds.includes(p?.TicketId)
      )
    : [];

  const ticketIds = selectedPassengers.length
    ? selectedPassengers.map((p) => p?.Ticket?.TicketId || p?.TicketId).filter(Boolean)
    : [];

  const result = await amendmentService.sendChangeRequest({
    BookingId: tboBookingId,
    RequestType: 1,
    CancellationType: 2,
    TicketId: ticketIds.length ? ticketIds.join(",") : undefined,
    Sectors: sectors,
    Remarks: remarks || "Partial cancellation",
  });

  const validation = validateTboResponse(result);
  if (!validation.success) {
    throw new Error(validation.message);
  }

  let changeRequestIds = [];
  const info = result?.Response?.TicketCRInfo;
  if (Array.isArray(info)) changeRequestIds = info.map((i) => i?.ChangeRequestId);
  else if (info) changeRequestIds = [info?.ChangeRequestId];
  else changeRequestIds = [result?.Response?.ChangeRequestId];

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
      changeRequestIds,
      status: "requested",
      response: result,
      createdAt: new Date(),
    },
  });

  if (cancellationQueryId) {
    await CancellationQuery.findByIdAndUpdate(cancellationQueryId, {
      $push: {
        approvalAudit: {
          action: "EXECUTED",
          user: userId,
          role: "system",
          timestamp: new Date(),
          remarks: "Partial cancellation executed via TBO",
        },
      },
    });
  }

  return { success: true, result, changeRequestIds };
};

/**
 * Execute hotel cancellation with TBO provider.
 * Called ONLY when approvalStage reaches EXECUTED.
 */
exports.executeHotelCancellation = async ({
  bookingId,
  cancellationQueryId,
  remarks,
  userId,
}) => {
  const HotelBookingRequest = require("../models/hotelBookingRequest.model");
  const booking = await HotelBookingRequest.findById(bookingId);
  if (!booking) throw new Error("Hotel booking not found");

  const providerBookingId =
    booking.bookingResult?.providerResponse?.BookResult?.BookingId;
  if (!providerBookingId) throw new Error("Provider BookingId not found");

  const response = await hotelAmendmentService.sendChangeRequest({
    BookingId: Number(providerBookingId),
    Remarks: remarks || "Hotel cancellation via approval flow",
    RequestType: 4,
  });

  const isSuccess = response?.HotelChangeRequestResult?.ResponseStatus === 1;
  if (!isSuccess) {
    throw new Error(response?.HotelChangeRequestResult?.Error?.ErrorMessage || "TBO hotel cancellation failed");
  }

  const changeRequestId = response?.HotelChangeRequestResult?.ChangeRequestId;
  if (!changeRequestId) throw new Error("No ChangeRequestId received from TBO");

  if (!booking.bookingType) booking.bookingType = "hotel";
  booking.amendment = {
    changeRequestId,
    status: "requested",
    remarks,
    requestedAt: new Date(),
    providerResponse: response,
  };
  booking.executionStatus = "cancel_requested";
  await booking.save();

  if (cancellationQueryId) {
    await CancellationQuery.findByIdAndUpdate(cancellationQueryId, {
      $push: {
        approvalAudit: {
          action: "EXECUTED",
          user: userId,
          role: "system",
          timestamp: new Date(),
          remarks: "Hotel cancellation executed via TBO",
        },
      },
    });
  }

  return { success: true, changeRequestId, response };
};

exports.isOnlineCancellationAvailable = isOnlineCancellationAvailable;
