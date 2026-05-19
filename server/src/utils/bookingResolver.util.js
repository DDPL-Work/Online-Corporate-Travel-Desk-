/**
 * bookingResolver.util.js
 *
 * Centralized, schema-safe resolver for extracting provider booking identifiers
 * from BookingRequest documents across all legacy shapes.
 *
 * Priority order for each field:
 *   1. Direct schema fields (most reliable — set explicitly by booking execution)
 *   2. Servicing overrides (set after reissue/amendment)
 *   3. Nested provider response paths (raw TBO/NDC responses)
 *   4. Legacy/migration paths
 *
 * CRITICAL: NEVER use booking._id as a provider BookingId.
 * TBO BookingId = the booking reference issued by TBO API, NOT the Mongo document id.
 */

const normalizeBookingIdentifier = (value, booking) => {
  if (value === undefined || value === null) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const normalized = normalizeBookingIdentifier(item, booking);
      if (normalized) return normalized;
    }
    return null;
  }

  if (typeof value === "object") return null;

  const normalized = String(value).trim();
  if (!normalized) return null;
  if (normalized === "null" || normalized === "undefined") return null;
  // Reject Mongo ObjectId — never a valid TBO provider reference
  if (booking?._id && normalized === booking._id.toString()) return null;
  return normalized;
};

const toArray = (value) => {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return [value].filter(Boolean);
};

/**
 * Resolve the TBO-issued supplier BookingId from a BookingRequest document.
 * @param {Object} booking - BookingRequest mongoose document or plain object
 * @returns {string|null}
 */
const resolveSupplierBookingId = (booking = {}) => {
  const candidates = [
    // ── Direct schema field set by booking execution (most reliable) ──
    booking?.bookingResult?.providerBookingId,

    // ── TBO wrapper object shape: { bookingId, pnr, raw } ──
    // flightBookingExecutor stores providerResponse = { bookingId, pnr, raw: tboResponse }
    booking?.bookingResult?.providerResponse?.bookingId,

    // ── TBO raw response — correct single-nesting path ──
    // TBO API response: { Response: { FlightItinerary: { BookingId, PNR } } }
    booking?.bookingResult?.providerResponse?.raw?.Response?.FlightItinerary?.BookingId,
    booking?.bookingResult?.providerResponse?.raw?.Response?.Response?.FlightItinerary?.BookingId,
    booking?.bookingResult?.providerResponse?.raw?.Response?.Response?.BookingId,

    // ── TBO response nested directly under providerResponse (some paths) ──
    booking?.bookingResult?.providerResponse?.Response?.FlightItinerary?.BookingId,
    booking?.bookingResult?.providerResponse?.Response?.Response?.FlightItinerary?.BookingId,
    booking?.bookingResult?.providerResponse?.Response?.Response?.BookingId,

    // ── TBO round-trip leg responses (same wrapper shape) ──
    booking?.bookingResult?.onwardResponse?.bookingId,
    booking?.bookingResult?.onwardResponse?.raw?.Response?.FlightItinerary?.BookingId,
    booking?.bookingResult?.onwardResponse?.raw?.Response?.Response?.FlightItinerary?.BookingId,
    booking?.bookingResult?.returnResponse?.bookingId,
    booking?.bookingResult?.returnResponse?.raw?.Response?.FlightItinerary?.BookingId,
    booking?.bookingResult?.returnResponse?.raw?.Response?.Response?.FlightItinerary?.BookingId,

    // ── Servicing overrides (set after prior reissue/amendment) ──
    booking?.servicing?.reissue?.activeBookingId,
    booking?.servicing?.reissue?.reissuedBookingId,
    booking?.servicing?.reissue?.originalBookingId,

    // ── Flight response legacy path ──
    booking?.flightResponse?.Response?.FlightItinerary?.BookingId,
    booking?.flightResponse?.Response?.BookingId,

    // ── Legacy / alternative paths ──
    booking?.bookingResult?.bookingId,
    booking?.tboResponse?.Response?.BookingId,
    booking?.tboResponse?.Response?.Response?.BookingId,
    booking?.bookingResponse?.BookingId,
    booking?.bookingResponse?.providerBookingId,
    booking?.providerData?.BookingId,
    booking?.bookingDetails?.BookingId,
    booking?.ticket?.BookingId,
    booking?.bookingId,
    booking?.bookingSnapshot?.bookingId,
    booking?.airlineBookingId,
    booking?.flight?.bookingId,
    booking?.segments?.[0]?.BookingId,
  ];

  for (const value of candidates) {
    const normalized = normalizeBookingIdentifier(value, booking);
    if (normalized) return normalized;
  }
  return null;
};

/**
 * Resolve the airline PNR from a BookingRequest document.
 * @param {Object} booking - BookingRequest mongoose document or plain object
 * @returns {string|null}
 */
const resolvePnr = (booking = {}) => {
  const candidates = [
    // ── Direct schema field — set by booking execution, most reliable ──
    booking?.bookingResult?.pnr,
    booking?.bookingResult?.onwardPNR,
    booking?.bookingResult?.returnPNR,

    // ── TBO wrapper object shape: { bookingId, pnr, raw } ──
    // flightBookingExecutor stores providerResponse = { bookingId, pnr, raw: tboResponse }
    booking?.bookingResult?.providerResponse?.pnr,

    // ── TBO raw response — correct single-nesting: raw.Response.FlightItinerary ──
    booking?.bookingResult?.providerResponse?.raw?.Response?.FlightItinerary?.PNR,
    // Also try double-nesting in case of different TBO env/endpoint responses
    booking?.bookingResult?.providerResponse?.raw?.Response?.Response?.FlightItinerary?.PNR,
    booking?.bookingResult?.providerResponse?.raw?.Response?.Response?.PNR,
    booking?.bookingResult?.providerResponse?.raw?.Response?.PNR,

    // ── TBO response directly under providerResponse (without .raw) ──
    booking?.bookingResult?.providerResponse?.Response?.FlightItinerary?.PNR,
    booking?.bookingResult?.providerResponse?.Response?.Response?.FlightItinerary?.PNR,
    booking?.bookingResult?.providerResponse?.Response?.Response?.PNR,
    booking?.bookingResult?.providerResponse?.Response?.PNR,

    // ── Servicing overrides (set after prior reissue/amendment) ──
    booking?.servicing?.reissue?.activePnr,
    booking?.servicing?.reissue?.originalPnr,

    // ── TBO round-trip leg responses (same wrapper shape) ──
    booking?.bookingResult?.onwardResponse?.pnr,
    booking?.bookingResult?.onwardResponse?.raw?.Response?.FlightItinerary?.PNR,
    booking?.bookingResult?.onwardResponse?.raw?.Response?.Response?.PNR,
    booking?.bookingResult?.onwardResponse?.raw?.Response?.Response?.FlightItinerary?.PNR,
    booking?.bookingResult?.returnResponse?.pnr,
    booking?.bookingResult?.returnResponse?.raw?.Response?.FlightItinerary?.PNR,
    booking?.bookingResult?.returnResponse?.raw?.Response?.Response?.PNR,
    booking?.bookingResult?.returnResponse?.raw?.Response?.Response?.FlightItinerary?.PNR,

    // ── Flight response legacy path ──
    booking?.flightResponse?.Response?.FlightItinerary?.PNR,
    booking?.flightResponse?.Response?.PNR,

    // ── Legacy / alternative paths ──
    booking?.pnr,
    booking?.PNR,
    booking?.airlinePnr,
    booking?.bookingSnapshot?.pnr,
    booking?.bookingResult?.PNR,
    booking?.bookingResponse?.PNR,
    booking?.providerData?.PNR,
    booking?.ticket?.PNR,
    booking?.flight?.pnr,
    booking?.bookingDetails?.PNR,
    booking?.tboResponse?.Response?.PNR,
    booking?.tboResponse?.Response?.Response?.PNR,
    booking?.trace?.PNR,
    booking?.segments?.[0]?.AirlinePNR,
  ];

  for (const value of candidates) {
    const normalized = normalizeBookingIdentifier(value, booking);
    if (normalized) return normalized;
  }
  return null;
};

/**
 * Resolve the airline code from a BookingRequest document.
 * @param {Object} booking
 * @returns {string|null}
 */
const resolveAirlineCode = (booking = {}) => {
  const candidates = [
    booking?.bookingSnapshot?.airline,
    booking?.airline,
    booking?.flightSnapshot?.airline,
    booking?.airlineCode,
    booking?.bookingResult?.providerResponse?.Response?.Response?.FlightItinerary?.AirlineCode,
    booking?.bookingResult?.providerResponse?.raw?.Response?.Response?.FlightItinerary?.AirlineCode,
    booking?.flightResponse?.Response?.FlightItinerary?.AirlineCode,
    booking?.flightResponse?.Response?.AirlineCode,
    booking?.flight?.airlineCode,
    booking?.providerData?.airlineCode,
    booking?.bookingDetails?.airlineCode,
    booking?.segments?.[0]?.airlineCode,
  ];

  for (const value of candidates) {
    const normalized = normalizeBookingIdentifier(value, booking);
    if (normalized) return normalized;
  }
  return null;
};

/**
 * Resolve the original TBO TraceId from a BookingRequest document.
 * @param {Object} booking
 * @returns {string|null}
 */
const resolveTraceId = (booking = {}) => {
  const candidates = [
    // ── TBO raw response — correct single-nesting path first ──
    booking?.bookingResult?.providerResponse?.raw?.Response?.TraceId,
    booking?.bookingResult?.providerResponse?.raw?.Response?.Response?.TraceId,
    // Double-nesting fallback
    booking?.bookingResult?.providerResponse?.Response?.TraceId,
    booking?.bookingResult?.providerResponse?.Response?.Response?.TraceId,

    // ── Round-trip legs ──
    booking?.bookingResult?.onwardResponse?.raw?.Response?.TraceId,
    booking?.bookingResult?.onwardResponse?.raw?.Response?.Response?.TraceId,
    booking?.bookingResult?.returnResponse?.raw?.Response?.TraceId,
    booking?.bookingResult?.returnResponse?.raw?.Response?.Response?.TraceId,

    // ── Direct fields ──
    booking?.flightRequest?.traceId,
    booking?.flightResponse?.Response?.TraceId,
    booking?.bookingResponse?.TraceId,
    booking?.providerData?.TraceId,
    booking?.tboResponse?.Response?.TraceId,
    booking?.tboResponse?.Response?.Response?.TraceId,
    booking?.traceId,
  ];

  for (const value of candidates) {
    const normalized = normalizeBookingIdentifier(value, booking);
    if (normalized) return normalized;
  }
  return null;
};

/**
 * Resolve original segments from a BookingRequest document.
 * @param {Object} booking
 * @returns {Array}
 */
const resolveSegments = (booking = {}) => {
  const candidates = [
    booking?.flightRequest?.segments,
    booking?.segments,
    booking?.bookingResult?.segments,
    booking?.flightResponse?.Response?.FlightItinerary?.Segments,
    booking?.flightResponse?.Response?.FlightItinerary?.Segment,
    booking?.bookingResult?.providerResponse?.Response?.Response?.FlightItinerary?.Segments,
    booking?.bookingResult?.providerResponse?.Response?.Response?.FlightItinerary?.Segment,
  ];

  for (const value of candidates) {
    const normalized = toArray(value);
    if (normalized.length) return normalized;
  }

  return [];
};

/**
 * Resolve ticket number from a BookingRequest document.
 * @param {Object} booking
 * @returns {string|null}
 */
const resolveTicketNumber = (booking = {}) => {
  const candidates = [
    booking?.ticket?.ticketNumber,
    booking?.bookingResult?.providerResponse?.Response?.Response?.FlightItinerary?.Passenger?.Ticket?.TicketNumber,
    booking?.bookingResult?.providerResponse?.raw?.Response?.Response?.FlightItinerary?.Passenger?.Ticket?.TicketNumber,
    booking?.bookingResult?.providerResponse?.Response?.Response?.FlightItinerary?.Passenger?.[0]?.Ticket?.TicketNumber,
    booking?.bookingResult?.providerResponse?.raw?.Response?.Response?.FlightItinerary?.Passenger?.[0]?.Ticket?.TicketNumber,
    booking?.bookingResponse?.ticketNumber,
    booking?.providerData?.ticketNumber,
    booking?.bookingSnapshot?.ticketNumber,
    booking?.ticketNumber,
  ];

  for (const value of candidates) {
    const normalized = normalizeBookingIdentifier(value, booking);
    if (normalized) return normalized;
  }
  return null;
};

/**
 * Resolve supplier reference from a BookingRequest document.
 * @param {Object} booking
 * @returns {string|null}
 */
const resolveSupplierReference = (booking = {}) => {
  const candidates = [
    booking?.providerData?.supplierReference,
    booking?.bookingResponse?.supplierReference,
    booking?.bookingSnapshot?.supplierReference,
    booking?.supplierReference,
    booking?.bookingResult?.providerResponse?.Response?.Response?.SupplierReference,
    booking?.bookingResult?.providerResponse?.raw?.Response?.Response?.SupplierReference,
  ];

  for (const value of candidates) {
    const normalized = normalizeBookingIdentifier(value, booking);
    if (normalized) return normalized;
  }
  return null;
};

/**
 * Resolve fare source code from a BookingRequest document.
 * @param {Object} booking
 * @returns {string|null}
 */
const resolveFareSourceCode = (booking = {}) => {
  const candidates = [
    booking?.flightRequest?.fareSourceCode,
    booking?.bookingResult?.fareSourceCode,
    booking?.providerData?.fareSourceCode,
    booking?.bookingDetails?.fareSourceCode,
    booking?.bookingSnapshot?.fareSourceCode,
  ];

  for (const value of candidates) {
    const normalized = normalizeBookingIdentifier(value, booking);
    if (normalized) return normalized;
  }
  return null;
};

/**
 * Resolve passenger counts from travellers array.
 * @param {Object} booking
 * @returns {{ adults: number, children: number, infants: number }}
 */
const resolvePassengerCounts = (booking = {}) => {
  const travellers = booking?.travellers || booking?.passengers || [];
  const adults = travellers.filter((p) => p?.paxType === "ADULT").length || 0;
  const children = travellers.filter((p) => p?.paxType === "CHILD").length || 0;
  const infants = travellers.filter((p) => p?.paxType === "INFANT").length || 0;
  return { adults, children, infants };
};

/**
 * Full booking data resolver — resolves all provider identifiers in one call
 * with source tracking for debug logging and structured validation.
 *
 * @param {Object} booking - BookingRequest document
 * @returns {{
 *   pnr: string|null,
 *   bookingId: string|null,
 *   traceId: string|null,
 *   airlineCode: string|null,
 *   segments: Array,
 *   passengerCounts: Object,
 *   resolvedFrom: Object,
 *   isValid: boolean,
 *   missingFields: string[],
 * }}
 */
const resolveBookingData = (booking = {}) => {
  const pnr = resolvePnr(booking);
  const bookingId = resolveSupplierBookingId(booking);
  const traceId = resolveTraceId(booking);
  const airlineCode = resolveAirlineCode(booking);
  const segments = resolveSegments(booking);
  const ticketNumber = resolveTicketNumber(booking);
  const supplierReference = resolveSupplierReference(booking);
  const fareSourceCode = resolveFareSourceCode(booking);
  const passengerCounts = resolvePassengerCounts(booking);

  // Source tracking: identify which path resolved each field
  const resolvedFrom = {
    pnr: pnr ? _identifyPnrSource(booking, pnr) : null,
    bookingId: bookingId ? _identifyBookingIdSource(booking, bookingId) : null,
    traceId: traceId ? _identifyTraceIdSource(booking, traceId) : null,
    airlineCode: airlineCode ? _identifyAirlineCodeSource(booking, airlineCode) : null,
    ticketNumber: ticketNumber ? _identifyTicketNumberSource(booking, ticketNumber) : null,
    supplierReference: supplierReference
      ? _identifySupplierReferenceSource(booking, supplierReference)
      : null,
    fareSourceCode: fareSourceCode
      ? _identifyFareSourceCodeSource(booking, fareSourceCode)
      : null,
  };

  const missingFields = [];
  if (!pnr) missingFields.push("pnr");
  if (!bookingId) missingFields.push("bookingId");
  if (!traceId) missingFields.push("traceId");

  return {
    pnr,
    bookingId,
    traceId,
    airlineCode,
    segments,
    ticketNumber,
    supplierReference,
    fareSourceCode,
    passengerCounts,
    resolvedFrom,
    isValid: missingFields.length === 0,
    missingFields,
  };
};

/**
 * Validate resolved booking data and throw a structured error if required fields are missing.
 * @param {Object} resolved - Result of resolveBookingData()
 * @param {string} mongoBookingId - Mongo _id of the booking (for error context)
 */
const assertBookingDataComplete = (resolved, mongoBookingId) => {
  if (resolved.isValid) return;

  const error = new Error(
    `Original booking provider data missing for reissue. Missing: [${resolved.missingFields.join(", ")}]. ` +
    `Booking: ${mongoBookingId}. Resolved from: ${JSON.stringify(resolved.resolvedFrom)}`,
  );
  error.code = "REISSUE_BOOKING_DATA_INCOMPLETE";
  error.status = 422;
  error.missingFields = resolved.missingFields;
  error.mongoBookingId = mongoBookingId;
  throw error;
};

// ── Internal source-tracking helpers (for debug/audit logging) ──

function _identifyPnrSource(booking, pnr) {
  if (booking?.bookingResult?.pnr === pnr) return "bookingResult.pnr";
  if (booking?.bookingResult?.onwardPNR === pnr) return "bookingResult.onwardPNR";
  if (booking?.bookingResult?.returnPNR === pnr) return "bookingResult.returnPNR";
  if (booking?.servicing?.reissue?.activePnr === pnr) return "servicing.reissue.activePnr";
  if (booking?.servicing?.reissue?.originalPnr === pnr) return "servicing.reissue.originalPnr";
  if (booking?.bookingResult?.providerResponse?.Response?.Response?.FlightItinerary?.PNR === pnr) return "providerResponse.Response.FlightItinerary.PNR";
  if (booking?.bookingResult?.providerResponse?.Response?.Response?.PNR === pnr) return "providerResponse.Response.PNR";
  if (booking?.bookingResult?.providerResponse?.raw?.Response?.Response?.FlightItinerary?.PNR === pnr) return "providerResponse.raw.Response.FlightItinerary.PNR";
  if (booking?.flightResponse?.Response?.FlightItinerary?.PNR === pnr) return "flightResponse.FlightItinerary.PNR";
  if (booking?.flightResponse?.Response?.PNR === pnr) return "flightResponse.PNR";
  if (booking?.bookingResponse?.PNR === pnr) return "bookingResponse.PNR";
  if (booking?.providerData?.PNR === pnr) return "providerData.PNR";
  if (booking?.bookingSnapshot?.pnr === pnr) return "bookingSnapshot.pnr";
  return "unknown_path";
}

function _identifyBookingIdSource(booking, bookingId) {
  if (booking?.bookingResult?.providerBookingId === bookingId) return "bookingResult.providerBookingId";
  if (booking?.servicing?.reissue?.activeBookingId === bookingId) return "servicing.reissue.activeBookingId";
  if (booking?.bookingResult?.providerResponse?.Response?.Response?.FlightItinerary?.BookingId === bookingId) return "providerResponse.Response.FlightItinerary.BookingId";
  if (booking?.bookingResult?.providerResponse?.Response?.Response?.BookingId === bookingId) return "providerResponse.Response.BookingId";
  if (booking?.bookingResult?.providerResponse?.raw?.Response?.Response?.FlightItinerary?.BookingId === bookingId) return "providerResponse.raw.Response.FlightItinerary.BookingId";
  if (booking?.flightResponse?.Response?.FlightItinerary?.BookingId === bookingId) return "flightResponse.FlightItinerary.BookingId";
  if (booking?.flightResponse?.Response?.BookingId === bookingId) return "flightResponse.BookingId";
  if (booking?.bookingResponse?.BookingId === bookingId) return "bookingResponse.BookingId";
  if (booking?.bookingReference === bookingId) return "bookingReference";
  return "unknown_path";
}

function _identifyTraceIdSource(booking, traceId) {
  if (booking?.bookingResult?.providerResponse?.Response?.TraceId === traceId) return "providerResponse.TraceId";
  if (booking?.bookingResult?.providerResponse?.Response?.Response?.TraceId === traceId) return "providerResponse.Response.TraceId";
  if (booking?.bookingResult?.providerResponse?.raw?.Response?.TraceId === traceId) return "providerResponse.raw.Response.TraceId";
  if (booking?.flightRequest?.traceId === traceId) return "flightRequest.traceId";
  if (booking?.flightResponse?.Response?.TraceId === traceId) return "flightResponse.TraceId";
  if (booking?.bookingResponse?.TraceId === traceId) return "bookingResponse.TraceId";
  if (booking?.providerData?.TraceId === traceId) return "providerData.TraceId";
  return "unknown_path";
}

function _identifyAirlineCodeSource(booking, airlineCode) {
  if (booking?.bookingSnapshot?.airline === airlineCode) return "bookingSnapshot.airline";
  if (booking?.airline === airlineCode) return "booking.airline";
  if (booking?.flightResponse?.Response?.FlightItinerary?.AirlineCode === airlineCode) return "flightResponse.FlightItinerary.AirlineCode";
  return "unknown_path";
}

function _identifyTicketNumberSource(booking, ticketNumber) {
  if (booking?.ticket?.ticketNumber === ticketNumber) return "ticket.ticketNumber";
  if (booking?.bookingResponse?.ticketNumber === ticketNumber) return "bookingResponse.ticketNumber";
  if (booking?.providerData?.ticketNumber === ticketNumber) return "providerData.ticketNumber";
  return "unknown_path";
}

function _identifySupplierReferenceSource(booking, supplierReference) {
  if (booking?.providerData?.supplierReference === supplierReference) return "providerData.supplierReference";
  if (booking?.bookingResponse?.supplierReference === supplierReference) return "bookingResponse.supplierReference";
  if (booking?.bookingSnapshot?.supplierReference === supplierReference) return "bookingSnapshot.supplierReference";
  return "unknown_path";
}

function _identifyFareSourceCodeSource(booking, fareSourceCode) {
  if (booking?.flightRequest?.fareSourceCode === fareSourceCode) return "flightRequest.fareSourceCode";
  if (booking?.bookingResult?.fareSourceCode === fareSourceCode) return "bookingResult.fareSourceCode";
  if (booking?.providerData?.fareSourceCode === fareSourceCode) return "providerData.fareSourceCode";
  if (booking?.bookingDetails?.fareSourceCode === fareSourceCode) return "bookingDetails.fareSourceCode";
  return "unknown_path";
}

module.exports = {
  resolvePnr,
  resolveSupplierBookingId,
  resolveAirlineCode,
  resolveTraceId,
  resolveSegments,
  resolveTicketNumber,
  resolveSupplierReference,
  resolveFareSourceCode,
  resolvePassengerCounts,
  resolveBookingData,
  assertBookingDataComplete,
};
