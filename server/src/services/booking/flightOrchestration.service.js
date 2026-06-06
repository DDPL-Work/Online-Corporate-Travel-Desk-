const stringify = require("fast-json-stable-stringify");

const BookingIntent = require("../../models/BookingIntent");
const BookingRequest = require("../../models/BookingRequest");
const Corporate = require("../../models/Corporate");
const redis = require("../../config/redis");
const ApiError = require("../../utils/ApiError");
const logger = require("../../utils/logger");
const {
  resolvePnr,
  resolveSupplierBookingId,
} = require("../../utils/bookingResolver.util");
const tboService = require("../tektravels/flight.service");
const {
  buildPassengersFromBooking,
  extractPnr,
  getFareResults,
  performBooking,
} = require("./flightBookingExecutor.service");
const bookingReconstructionService = require("./bookingReconstruction.service");
const MarkupAccountingService = require("../../modules/markup/services/markupAccounting.service");

const SEARCH_CACHE_TTL_SECONDS = 90;
const LOCK_TTL_MS = 2 * 60 * 1000;
const RETRY_DELAY_MS = 1500;
const DUPLICATE_BLOCK_WINDOW_HOURS = 24;
const ACTIVE_DUPLICATE_EXECUTION_STATUSES = new Set([
  "ticketed",
  "completed",
  "confirmed",
  "active",
]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeDateMinute = (value) => {
  if (!value) return "";

  if (typeof value === "string") {
    const compact = value.trim();

    if (compact.length >= 16) {
      return compact.slice(0, 16);
    }

    const parsed = Date.parse(compact);
    if (!Number.isNaN(parsed)) {
      return new Date(parsed).toISOString().slice(0, 16);
    }

    return compact;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
};

const normalizeAirlineCode = (value) => String(value || "").trim().toUpperCase();
const normalizeFlightNumber = (value) => String(value || "").trim().toUpperCase();
const normalizeAirportCode = (value) => String(value || "").trim().toUpperCase();
const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
const normalizePhone = (value) => String(value || "").replace(/\D/g, "");

const toMoney = (value) => Number(Number(value || 0).toFixed(2));

const extractSearchTraceId = (response = {}) =>
  response.TraceId || response.Response?.TraceId || null;

const getSearchResultsRoot = (response = {}) =>
  response.Results || response.Response?.Results || [];

const getSupplierSegments = (result = {}) => {
  const rawSegments = Array.isArray(result?.Segments) ? result.Segments : [];
  return rawSegments.flat().filter(Boolean);
};

const buildStoredSegmentSignature = (segment = {}) =>
  [
    normalizeAirlineCode(segment.airlineCode),
    normalizeFlightNumber(segment.flightNumber),
    normalizeAirportCode(segment.origin?.airportCode),
    normalizeAirportCode(segment.destination?.airportCode),
    normalizeDateMinute(segment.departureDateTime),
    normalizeDateMinute(segment.arrivalDateTime),
  ].join("|");

const buildSupplierSegmentSignature = (segment = {}) =>
  [
    normalizeAirlineCode(segment.Airline?.AirlineCode),
    normalizeFlightNumber(segment.Airline?.FlightNumber || segment.FlightNumber),
    normalizeAirportCode(segment.Origin?.Airport?.AirportCode),
    normalizeAirportCode(segment.Destination?.Airport?.AirportCode),
    normalizeDateMinute(segment.Origin?.DepTime),
    normalizeDateMinute(segment.Destination?.ArrTime),
  ].join("|");

const buildLooseStoredSegmentSignature = (segment = {}) =>
  [
    normalizeAirlineCode(segment.airlineCode),
    normalizeFlightNumber(segment.flightNumber),
    normalizeDateMinute(segment.departureDateTime),
  ].join("|");

const buildLooseSupplierSegmentSignature = (segment = {}) =>
  [
    normalizeAirlineCode(segment.Airline?.AirlineCode),
    normalizeFlightNumber(segment.Airline?.FlightNumber || segment.FlightNumber),
    normalizeDateMinute(segment.Origin?.DepTime),
  ].join("|");

const normalizeDateDay = (value) => {
  const normalizedMinute = normalizeDateMinute(value);
  if (normalizedMinute.length >= 10) {
    return normalizedMinute.slice(0, 10);
  }

  return "";
};

const buildDuplicateSegmentSignature = (segment = {}) =>
  [
    normalizeAirportCode(segment.origin?.airportCode),
    normalizeAirportCode(segment.destination?.airportCode),
    normalizeDateDay(segment.departureDateTime),
    normalizeAirlineCode(segment.airlineCode),
    normalizeFlightNumber(segment.flightNumber),
  ].join("|");

const buildPassengerIdentityToken = (traveller = {}) => {
  const passportNumber = String(
    traveller.passportNumber ||
      traveller.passportNo ||
      traveller.idNumber ||
      traveller.identityNumber ||
      "",
  )
    .trim()
    .toUpperCase();

  if (passportNumber) {
    return `document:${passportNumber}`;
  }

  const dateOfBirth = normalizeDateDay(traveller.dateOfBirth || traveller.dob);
  const email = normalizeEmail(traveller.email);
  const phone = normalizePhone(traveller.phoneWithCode || traveller.phone);
  const paxType = String(traveller.paxType || "ADULT").trim().toUpperCase();

  if (dateOfBirth && (email || phone)) {
    return `profile:${dateOfBirth}:${email || phone}:${paxType}`;
  }

  return null;
};

const getDuplicateComparisonKey = (booking = {}) => {
  const segments = Array.isArray(booking.flightRequest?.segments)
    ? booking.flightRequest.segments
    : [];
  const travellers = Array.isArray(booking.travellers) ? booking.travellers : [];

  const segmentTokens = segments.map(buildDuplicateSegmentSignature).filter(Boolean);
  const passengerTokens = travellers.map(buildPassengerIdentityToken).filter(Boolean);

  return {
    segmentTokens,
    segmentKey: segmentTokens.join("::"),
    passengerTokens: passengerTokens.sort(),
    passengerKey: passengerTokens.sort().join("::"),
    departureDate: normalizeDateDay(segments[0]?.departureDateTime || booking.bookingSnapshot?.travelDate),
    hasStablePassengerIdentity:
      travellers.length > 0 && passengerTokens.length === travellers.length,
  };
};

const isBlockingDuplicateStatus = (status) =>
  ACTIVE_DUPLICATE_EXECUTION_STATUSES.has(String(status || "").trim().toLowerCase());

const isProviderDuplicateError = (error) => {
  const text = String(error?.message || error?.providerMessage || "").toLowerCase();

  return [
    "already done for the same criteria",
    "duplicate booking",
    "already booked",
    "confirmed booking already exists",
  ].some((token) => text.includes(token));
};

const createDuplicateBookingError = ({
  currentBooking,
  existingBooking,
  source,
  providerMessage,
}) => {
  const error = new ApiError(
    409,
    "You already have a confirmed booking for this flight.",
  );

  error.code = "DUPLICATE_CONFIRMED_BOOKING";
  error.providerMessage = providerMessage || null;
  error.data = {
    bookingId: currentBooking?._id || null,
    existingBookingId: existingBooking?._id || null,
    existingPnr: resolvePnr(existingBooking) || null,
    existingProviderBookingId: resolveSupplierBookingId(existingBooking) || null,
    duplicateSource: source,
  };

  return error;
};

const getStoredJourneyGroups = (booking) => {
  const segments = booking.flightRequest?.segments || [];
  const hasReturn = segments.some((segment) => segment.journeyType === "return");
  const isInternational = segments.some(
    (segment) => segment.origin?.country !== "IN" || segment.destination?.country !== "IN",
  );
  const hasObjectIndex = typeof booking.flightRequest?.resultIndex === "object";

  if (hasReturn && hasObjectIndex && isInternational) {
    return {
      mode: "combined_round_trip",
      groups: [segments],
    };
  }

  if (hasReturn) {
    return {
      mode: "split_round_trip",
      groups: [
        segments.filter((segment) => segment.journeyType === "onward"),
        segments.filter((segment) => segment.journeyType === "return"),
      ],
    };
  }

  return {
    mode: segments.length > 1 ? "multi_segment" : "single",
    groups: [segments],
  };
};

const getJourneySearchPayload = (booking) => {
  const segments = booking.flightRequest?.segments || [];
  const hasReturn = segments.some((segment) => segment.journeyType === "return");
  const multiCity = !hasReturn && segments.length > 1;

  const adultCount =
    booking.travellers.filter((traveller) => (traveller.paxType || "ADULT") === "ADULT")
      .length || 1;
  const childCount = booking.travellers.filter(
    (traveller) => (traveller.paxType || "ADULT") === "CHILD",
  ).length;
  const infantCount = booking.travellers.filter(
    (traveller) => (traveller.paxType || "ADULT") === "INFANT",
  ).length;

  const payload = {
    adults: adultCount,
    children: childCount,
    infants: infantCount,
    directFlight: false,
    oneStop: false,
  };

  if (multiCity) {
    return {
      ...payload,
      journeyType: 3,
      cabinClass: segments[0]?.cabinClass || 2,
      segments: segments.map((segment) => ({
        origin: segment.origin?.airportCode,
        destination: segment.destination?.airportCode,
        departureDate: segment.departureDateTime,
      })),
    };
  }

  if (hasReturn) {
    const onward = segments.filter((segment) => segment.journeyType === "onward");
    const returning = segments.filter((segment) => segment.journeyType === "return");

    return {
      ...payload,
      journeyType: 2,
      origin: onward[0]?.origin?.airportCode,
      destination: onward[onward.length - 1]?.destination?.airportCode,
      departureDate: onward[0]?.departureDateTime,
      returnDate: returning[0]?.departureDateTime,
      cabinClass: onward[0]?.cabinClass || 2,
    };
  }

  return {
    ...payload,
    journeyType: 1,
    origin: segments[0]?.origin?.airportCode,
    destination: segments[segments.length - 1]?.destination?.airportCode,
    departureDate: segments[0]?.departureDateTime,
    cabinClass: segments[0]?.cabinClass || 2,
  };
};

const searchResponseCacheKey = (payload) =>
  `flight:approved-revalidation:${stringify(payload)}`;

const getFareQuotePayload = (fareQuoteResponse) => {
  const results = getFareResults(fareQuoteResponse);

  const totalAmount = results.reduce((sum, result) => {
    const fare = result?.Fare || {};
    return sum + Number(fare.PublishedFare || fare.OfferedFare || 0);
  }, 0);

  const currency = results[0]?.Fare?.Currency || "INR";

  return {
    results,
    totalAmount: toMoney(totalAmount),
    currency,
    raw: fareQuoteResponse,
  };
};

const isSamePrice = (left, right) => Math.abs(toMoney(left) - toMoney(right)) < 0.01;

const isRetriableBookingError = (error) =>
  error?.statusCode >= 500 || /timeout|socket|network|temporarily/i.test(error?.message || "");

const isSilentRevalidationError = (error) => {
  const text = String(error?.message || "").toLowerCase();

  return [
    "trace",
    "session",
    "expired",
    "fare changed",
    "price changed",
    "result index",
    "fare quote",
    "no fare",
    "supplier",
  ].some((token) => text.includes(token));
};

const saveSystemMutation = async (booking) => {
  booking.$locals = booking.$locals || {};
  booking.$locals.allowSystemMutationOnApproved = true;

  try {
    await booking.save();
  } finally {
    delete booking.$locals.allowSystemMutationOnApproved;
  }
};

const buildRevalidationPayload = (booking, overrides = {}) =>
  overrides && Object.keys(overrides).length > 0
    ? overrides
    : booking.orchestration?.pendingRevalidation || null;

const buildBookingContextPayload = (context = {}) => ({
  flight: {
    traceId: context?.flight?.traceId || null,
    resultIndex: context?.flight?.resultIndex || null,
    segments: context?.flight?.segments || [],
    fareSnapshot: context?.flight?.fareSnapshot || null,
    fareQuote: context?.flight?.fareQuote || null,
  },
  passengers: context?.passengers || [],
  ssr: context?.ssr || {
    seats: [],
    meals: [],
    baggage: [],
  },
  fare: {
    details: context?.fareDetails || null,
    pricingSnapshot: context?.pricingSnapshot || null,
  },
  totalPrice:
    context?.pricingSnapshot?.totalAmount ??
    context?.fareDetails?.newTotalFare ??
    context?.fareDetails?.oldTotalFare ??
    0,
});

const buildSuccessResponse = (booking, bookingResult, metadata = {}) => ({
  status: "SUCCESS",
  bookingRequestId: booking._id,
  bookingId: booking._id,
  executionStatus: booking.executionStatus,
  pnr:
    bookingResult?.pnr ||
    booking.bookingResult?.pnr ||
    extractPnr(booking.bookingResult?.providerResponse),
  idempotent: metadata?.idempotent === true,
  metadata,
});

const buildExistingOutcomeResponse = (booking) => ({
  status: "SUCCESS",
  bookingRequestId: booking._id,
  bookingId: booking._id,
  executionStatus: booking.executionStatus,
  pnr:
    booking.bookingResult?.pnr ||
    booking.bookingResult?.onwardPNR ||
    extractPnr(booking.bookingResult?.providerResponse),
  idempotent: true,
  metadata: {
    replayed: true,
    idempotent: true,
  },
});

const buildRevalidatedResponse = (booking, bookingContext, metadata = {}) => ({
  status: "REVALIDATED",
  bookingRequestId: booking._id,
  executionStatus: booking.executionStatus,
  requiresUserAction: true,
  bookingContext,
  notifications:
    metadata?.notifications ||
    booking.orchestration?.lastOutcome?.notifications ||
    booking.orchestration?.pendingRevalidation?.notifications ||
    [],
  revalidation: buildRevalidationPayload(booking, metadata?.revalidation),
  nextAction: "CONFIRM_BOOKING",
  metadata,
});

const buildProcessingResponse = (booking, idempotencyKey) => ({
  status: "PROCESSING",
  bookingRequestId: booking._id,
  executionStatus: booking.executionStatus,
  queued: booking.orchestration?.lastOutcome?.queued === true,
  idempotencyKey,
});

const buildPriceChangedResponse = (booking, priceChange, metadata = {}) => ({
  status: "PRICE_CHANGED",
  bookingRequestId: booking._id,
  executionStatus: booking.executionStatus,
  requiresUserAction: true,
  bookingContext:
    metadata?.bookingContext ||
    booking.orchestration?.lastOutcome?.bookingContext ||
    booking.orchestration?.pendingRevalidation?.bookingContext ||
    null,
  priceChange,
  ssrChange: metadata?.ssrChange || booking.orchestration?.lastOutcome?.ssrChange || null,
  revalidation: buildRevalidationPayload(booking, metadata?.revalidation),
  notifications:
    metadata?.notifications ||
    booking.orchestration?.lastOutcome?.notifications ||
    booking.orchestration?.pendingRevalidation?.notifications ||
    [],
  nextAction: "REAPPROVAL_REQUIRED",
  metadata,
});

const buildSsrChangedResponse = (booking, priceChange, ssrChange, metadata = {}) => ({
  status: "SSR_CHANGED",
  bookingRequestId: booking._id,
  executionStatus: booking.executionStatus,
  requiresUserAction: true,
  bookingContext:
    metadata?.bookingContext ||
    booking.orchestration?.lastOutcome?.bookingContext ||
    booking.orchestration?.pendingRevalidation?.bookingContext ||
    null,
  priceChange,
  ssrChange,
  revalidation: buildRevalidationPayload(booking, metadata?.revalidation),
  notifications:
    metadata?.notifications ||
    booking.orchestration?.lastOutcome?.notifications ||
    booking.orchestration?.pendingRevalidation?.notifications ||
    [],
  nextAction: "REAPPROVAL_REQUIRED",
  metadata,
});

const buildFlightUnavailableResponse = (booking, metadata = {}) => ({
  status: "FLIGHT_UNAVAILABLE",
  bookingRequestId: booking._id,
  executionStatus: booking.executionStatus,
  requiresUserAction: true,
  revalidation: buildRevalidationPayload(booking, metadata?.revalidation),
  notifications:
    metadata?.notifications ||
    booking.orchestration?.lastOutcome?.notifications ||
    booking.orchestration?.pendingRevalidation?.notifications ||
    [],
  metadata,
});

const updateOutcome = async (booking, outcome) => {
  booking.orchestration = {
    ...(booking.orchestration || {}),
    processing: false,
    processingCompletedAt: new Date(),
    lockExpiresAt: null,
    lastOutcome: {
      ...outcome,
      executionStatus: booking.executionStatus,
      completedAt: new Date(),
    },
  };

  await saveSystemMutation(booking);
};

const markFailedAttempt = async (booking, error, idempotencyKey) => {
  booking.orchestration = {
    ...(booking.orchestration || {}),
    processing: false,
    processingCompletedAt: new Date(),
    lockExpiresAt: null,
    idempotencyKey,
    lastError: {
      message: error.message,
      code: String(error.statusCode || 500),
      at: new Date(),
    },
  };

  if (!["booked", "ticket_pending", "ticketed"].includes(booking.executionStatus)) {
    booking.executionStatus = "failed";
  }

  await saveSystemMutation(booking);
};

const markBusinessBlocked = async (
  booking,
  error,
  idempotencyKey,
  executionStatus = "not_started",
) => {
  booking.orchestration = {
    ...(booking.orchestration || {}),
    processing: false,
    processingCompletedAt: new Date(),
    lockExpiresAt: null,
    idempotencyKey,
    lastError: {
      message: error.message,
      code: error.code || String(error.statusCode || 409),
      at: new Date(),
      data: error.data || null,
    },
  };

  booking.executionStatus = executionStatus;
  await saveSystemMutation(booking);
};

const buildPendingRevalidation = ({ reconstructed, matchedFlight }) => ({
  status: reconstructed.status === "SUCCESS" ? "REVALIDATED" : reconstructed.status,
  generatedAt: new Date(),
  matchedTraceId: matchedFlight.traceId,
  matchedResultIndex: matchedFlight.resultIndex,
  reconstructedContext: reconstructed.reconstructedContext,
  bookingContext: buildBookingContextPayload(reconstructed.reconstructedContext),
  priceChange: reconstructed.priceChange,
  ssrChange: reconstructed.ssrChange,
  notifications: reconstructed.notifications || [],
});

const applyRevalidationAudits = ({ booking, reconstructed, matchedFlight }) => {
  booking.orchestration = {
    ...(booking.orchestration || {}),
    lastRevalidatedAt: new Date(),
  };

  if (reconstructed.priceChange) {
    booking.priceAudit = {
      previousAmount: reconstructed.priceChange.oldTotal,
      newAmount: reconstructed.priceChange.newTotal,
      difference: reconstructed.priceChange.difference,
      currency: reconstructed.priceChange.currency,
      checkedAt: new Date(),
      matchedTraceId: matchedFlight.traceId,
      matchedResultIndex: matchedFlight.resultIndex,
      status: reconstructed.priceChange.totalChanged ? "changed" : "unchanged",
    };
  }

  if (reconstructed.ssrChange) {
    booking.ssrAudit = {
      previousAmount: reconstructed.ssrChange.previousAmount,
      newAmount: reconstructed.ssrChange.newAmount,
      difference: reconstructed.ssrChange.difference,
      checkedAt: new Date(),
      status:
        reconstructed.ssrChange.availabilityChanged || reconstructed.ssrChange.priceChanged
          ? "changed"
          : "unchanged",
      removedSelections: reconstructed.ssrChange.removedSelections,
      repricedSelections: reconstructed.ssrChange.repricedSelections,
      mappedSelections: reconstructed.ssrChange.mappedSelections,
    };
  }
};

const applyRevalidatedContextToBooking = ({ booking, reconstructed, matchedFlight }) => {
  booking.flightRequest = reconstructed.reconstructedContext.flightRequest;
  booking.pricingSnapshot = reconstructed.reconstructedContext.pricingSnapshot;
  booking.bookingSnapshot = reconstructed.reconstructedContext.bookingSnapshot;
  booking.orchestration = {
    ...(booking.orchestration || {}),
    pendingRevalidation: null,
    lastRevalidatedAt: new Date(),
  };
  booking.priceAudit = {
    previousAmount: reconstructed.priceChange.oldTotal,
    newAmount: reconstructed.priceChange.newTotal,
    difference: reconstructed.priceChange.difference,
    currency: reconstructed.priceChange.currency,
    checkedAt: new Date(),
    matchedTraceId: matchedFlight.traceId,
    matchedResultIndex: matchedFlight.resultIndex,
    status: reconstructed.priceChange.totalChanged ? "changed" : "unchanged",
  };
  booking.ssrAudit = {
    previousAmount: reconstructed.ssrChange.previousAmount,
    newAmount: reconstructed.ssrChange.newAmount,
    difference: reconstructed.ssrChange.difference,
    checkedAt: new Date(),
    status:
      reconstructed.ssrChange.availabilityChanged || reconstructed.ssrChange.priceChanged
        ? "changed"
        : "unchanged",
    removedSelections: reconstructed.ssrChange.removedSelections,
    repricedSelections: reconstructed.ssrChange.repricedSelections,
    mappedSelections: reconstructed.ssrChange.mappedSelections,
  };
};

class FlightOrchestrationService {
  async inspectPotentialDuplicateBookings(
    booking,
    { includeOutsideWindow = false } = {},
  ) {
    const duplicateKey = getDuplicateComparisonKey(booking);

    if (!duplicateKey.segmentTokens.length || !duplicateKey.hasStablePassengerIdentity) {
      return {
        blockingBooking: null,
        retryableMatches: [],
        skipped: true,
      };
    }

    const travelDate = new Date(
      booking.bookingSnapshot?.travelDate ||
        booking.flightRequest?.segments?.[0]?.departureDateTime ||
        booking.createdAt,
    );

    if (Number.isNaN(travelDate.getTime())) {
      return {
        blockingBooking: null,
        retryableMatches: [],
        skipped: true,
      };
    }

    const dayStart = new Date(travelDate);
    dayStart.setUTCHours(0, 0, 0, 0);

    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

    const query = {
      _id: { $ne: booking._id },
      bookingType: "flight",
      corporateId: booking.corporateId,
      userId: booking.userId,
      requestStatus: { $in: ["approved"] },
      "bookingSnapshot.travelDate": {
        $gte: dayStart,
        $lt: dayEnd,
      },
    };

    if (!includeOutsideWindow) {
      query.createdAt = {
        $gte: new Date(Date.now() - DUPLICATE_BLOCK_WINDOW_HOURS * 60 * 60 * 1000),
      };
    }

    const candidates = await BookingRequest.find(query)
      .select(
        "_id corporateId userId requestStatus executionStatus travellers flightRequest bookingResult bookingSnapshot cancellation createdAt updatedAt",
      )
      .lean();

    const matches = candidates.filter((candidate) => {
      const candidateKey = getDuplicateComparisonKey(candidate);

      return (
        candidateKey.hasStablePassengerIdentity &&
        candidateKey.segmentKey === duplicateKey.segmentKey &&
        candidateKey.passengerKey === duplicateKey.passengerKey
      );
    });

    const blockingMatches = matches
      .filter(
        (candidate) =>
          isBlockingDuplicateStatus(candidate.executionStatus) &&
          !candidate.cancellation?.cancelledAt &&
          !!resolvePnr(candidate),
      )
      .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));

    return {
      blockingBooking: blockingMatches[0] || null,
      retryableMatches: matches.filter(
        (candidate) => !blockingMatches.some((blocking) => String(blocking._id) === String(candidate._id)),
      ),
      skipped: false,
    };
  }

  async searchFlights(booking) {
    const payload = getJourneySearchPayload(booking);
    const cacheKey = searchResponseCacheKey(payload);

    const cached = await redis.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        logger.warn("Failed to parse cached flight search response", {
          cacheKey,
        });
      }
    }

    const response = await tboService.searchFlights(payload);

    await redis.set(cacheKey, JSON.stringify(response), "EX", SEARCH_CACHE_TTL_SECONDS);
    return response;
  }

  matchFlight(searchResponse, booking) {
    const { mode, groups } = getStoredJourneyGroups(booking);
    const searchResults = getSearchResultsRoot(searchResponse);
    const buckets = Array.isArray(searchResults[0]) ? searchResults : [searchResults];

    const findCandidate = (candidates = [], targetSegments = []) => {
      if (!Array.isArray(candidates) || !candidates.length) return null;

      const targetSignature = targetSegments.map(buildStoredSegmentSignature).join("::");
      const looseTargetSignature = targetSegments
        .map(buildLooseStoredSegmentSignature)
        .join("::");

      const exactMatch = candidates.find((candidate) => {
        const candidateSignature = getSupplierSegments(candidate)
          .map(buildSupplierSegmentSignature)
          .join("::");

        return candidateSignature === targetSignature;
      });

      if (exactMatch) return exactMatch;

      return candidates.find((candidate) => {
        const looseCandidateSignature = getSupplierSegments(candidate)
          .map(buildLooseSupplierSegmentSignature)
          .join("::");

        return looseCandidateSignature === looseTargetSignature;
      });
    };

    if (mode === "split_round_trip") {
      const onwardBucket = Array.isArray(buckets[0]) ? buckets[0] : [];
      const returnBucket = Array.isArray(buckets[1]) ? buckets[1] : [];

      const onward = findCandidate(onwardBucket, groups[0]);
      const returning = findCandidate(returnBucket, groups[1]);

      if (!onward || !returning) {
        throw new ApiError(
          409,
          "Unable to find the same approved flight during silent re-search",
        );
      }

      return {
        traceId: extractSearchTraceId(searchResponse),
        resultIndex: {
          onward: onward.ResultIndex,
          return: returning.ResultIndex,
        },
        matchedResults: [onward, returning],
      };
    }

    const flatCandidates = buckets.flat();
    const matched = findCandidate(flatCandidates, groups[0]);

    if (!matched) {
      throw new ApiError(
        409,
        "Unable to find the same approved flight during silent re-search",
      );
    }

    return {
      traceId: extractSearchTraceId(searchResponse),
      resultIndex: matched.ResultIndex,
      matchedResults: [matched],
    };
  }

  async fareQuote(traceId, resultIndex) {
    if (typeof resultIndex === "object") {
      const onwardFare = await tboService.getFareQuote(traceId, resultIndex.onward);
      const returnFare = await tboService.getFareQuote(traceId, resultIndex.return);

      return getFareQuotePayload({
        Results: [
          getFareResults(onwardFare)[0],
          getFareResults(returnFare)[0],
        ],
      });
    }

    const fareQuoteResponse = await tboService.getFareQuote(traceId, resultIndex);
    return getFareQuotePayload(fareQuoteResponse);
  }

  async bookFlight({ booking, corporate }) {
    const passengers = buildPassengersFromBooking({ booking, corporate });
    const fareResults = getFareResults(booking.flightRequest?.fareQuote);
    const isLCC = fareResults.some((result) => result?.IsLCC === true);

    return performBooking({
      booking,
      passengers,
      corporate,
      isLCC,
    });
  }

  async withRetry(operation, retries = 1) {
    let attempt = 0;
    let lastError;

    while (attempt <= retries) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (attempt === retries || !isRetriableBookingError(error)) {
          break;
        }

        await sleep(RETRY_DELAY_MS * (attempt + 1));
      }

      attempt += 1;
    }

    throw lastError;
  }

  async getExecutionContext(bookingId) {
    const booking = await BookingRequest.findById(bookingId);
    if (!booking) {
      throw new ApiError(404, "Booking not found");
    }

    if (booking.requestStatus !== "approved") {
      throw new ApiError(400, "Booking is not approved");
    }

    const intent = await BookingIntent.findOne({
      bookingRequestId: booking._id,
      approvalStatus: "approved",
    });

    if (!intent) {
      throw new ApiError(400, "No approved booking intent found");
    }

    const corporate = await Corporate.findById(booking.corporateId);
    if (!corporate) {
      throw new ApiError(404, "Corporate not found");
    }

    return { booking, intent, corporate };
  }

  async tryAcquireLock(bookingId, idempotencyKey, actorId) {
    const now = new Date();
    const lockExpiresAt = new Date(now.getTime() + LOCK_TTL_MS);

    return BookingRequest.findOneAndUpdate(
      {
        _id: bookingId,
        $or: [
          { "orchestration.lockExpiresAt": { $exists: false } },
          { "orchestration.lockExpiresAt": null },
          { "orchestration.lockExpiresAt": { $lte: now } },
        ],
      },
      {
        $set: {
          "orchestration.processing": true,
          "orchestration.processingStartedAt": now,
          "orchestration.processingCompletedAt": null,
          "orchestration.lockedBy": actorId ? String(actorId) : "system",
          "orchestration.lockExpiresAt": lockExpiresAt,
          "orchestration.idempotencyKey": idempotencyKey,
        },
        $inc: {
          "orchestration.retryCount": 1,
        },
      },
      { new: true },
    );
  }

  async getBookingLifecycle(bookingId) {
    const booking = await BookingRequest.findById(bookingId);
    if (!booking) {
      throw new ApiError(404, "Booking not found");
    }

    const pendingRevalidation = booking.orchestration?.pendingRevalidation || null;
    const lastOutcome = booking.orchestration?.lastOutcome || null;
    const idempotencyKey =
      booking.orchestration?.idempotencyKey || lastOutcome?.idempotencyKey || null;

    if (booking.orchestration?.processing) {
      return {
        ...buildProcessingResponse(booking, idempotencyKey),
        message: lastOutcome?.message || "Booking is being processed",
        bookingContext: pendingRevalidation?.bookingContext || null,
        priceChange: pendingRevalidation?.priceChange || null,
        ssrChange: pendingRevalidation?.ssrChange || null,
        notifications: pendingRevalidation?.notifications || [],
        revalidation: pendingRevalidation,
      };
    }

    if (lastOutcome?.status === "SUCCESS") {
      return {
        ...buildSuccessResponse(booking, booking.bookingResult, lastOutcome.metadata),
        idempotencyKey,
      };
    }

    if (lastOutcome?.status === "REVALIDATED") {
      return {
        ...buildRevalidatedResponse(
          booking,
          lastOutcome.bookingContext || pendingRevalidation?.bookingContext || null,
          {
            ...lastOutcome.metadata,
            revalidation: lastOutcome.revalidation,
            notifications: lastOutcome.notifications,
          },
        ),
        idempotencyKey,
      };
    }

    if (lastOutcome?.status === "PRICE_CHANGED") {
      return {
        ...buildPriceChangedResponse(booking, lastOutcome.priceChange, {
          ...lastOutcome.metadata,
          bookingContext:
            lastOutcome.bookingContext || pendingRevalidation?.bookingContext || null,
          revalidation: lastOutcome.revalidation,
          notifications: lastOutcome.notifications,
          ssrChange: lastOutcome.ssrChange,
        }),
        idempotencyKey,
      };
    }

    if (lastOutcome?.status === "SSR_CHANGED") {
      return {
        ...buildSsrChangedResponse(
          booking,
          lastOutcome.priceChange,
          lastOutcome.ssrChange,
          {
            ...lastOutcome.metadata,
            bookingContext:
              lastOutcome.bookingContext || pendingRevalidation?.bookingContext || null,
            revalidation: lastOutcome.revalidation,
            notifications: lastOutcome.notifications,
          },
        ),
        idempotencyKey,
      };
    }

    if (lastOutcome?.status === "FLIGHT_UNAVAILABLE") {
      return {
        ...buildFlightUnavailableResponse(booking, {
          ...lastOutcome.metadata,
          revalidation: lastOutcome.revalidation,
          notifications: lastOutcome.notifications,
        }),
        idempotencyKey,
      };
    }

    if (pendingRevalidation?.status === "REVALIDATED") {
      return {
        ...buildRevalidatedResponse(booking, pendingRevalidation.bookingContext || null, {
          revalidation: pendingRevalidation,
          notifications: pendingRevalidation.notifications || [],
        }),
        idempotencyKey,
      };
    }

    if (pendingRevalidation?.status === "PRICE_CHANGED") {
      return {
        ...buildPriceChangedResponse(booking, pendingRevalidation.priceChange, {
          bookingContext: pendingRevalidation.bookingContext || null,
          ssrChange: pendingRevalidation.ssrChange || null,
          revalidation: pendingRevalidation,
          notifications: pendingRevalidation.notifications || [],
        }),
        idempotencyKey,
      };
    }

    if (pendingRevalidation?.status === "SSR_CHANGED") {
      return {
        ...buildSsrChangedResponse(
          booking,
          pendingRevalidation.priceChange,
          pendingRevalidation.ssrChange,
          {
            bookingContext: pendingRevalidation.bookingContext || null,
            revalidation: pendingRevalidation,
            notifications: pendingRevalidation.notifications || [],
          },
        ),
        idempotencyKey,
      };
    }

    if (pendingRevalidation?.status === "FLIGHT_UNAVAILABLE") {
      return {
        ...buildFlightUnavailableResponse(booking, {
          revalidation: pendingRevalidation,
          notifications: pendingRevalidation.notifications || [],
        }),
        idempotencyKey,
      };
    }

    if (
      ["booked", "ticket_pending", "ticketed"].includes(booking.executionStatus) &&
      (
        booking.bookingResult?.pnr ||
        booking.bookingResult?.onwardPNR ||
        extractPnr(booking.bookingResult?.providerResponse)
      )
    ) {
      return {
        ...buildExistingOutcomeResponse(booking),
        idempotencyKey,
      };
    }

    if (booking.orchestration?.lastError?.message) {
      return {
        status: "FAILED",
        bookingRequestId: booking._id,
        executionStatus: booking.executionStatus,
        message: booking.orchestration.lastError.message,
        idempotencyKey,
      };
    }

    return {
      status: "IDLE",
      bookingRequestId: booking._id,
      executionStatus: booking.executionStatus,
      idempotencyKey,
    };
  }

  async processBooking({
    bookingId,
    actorId,
    idempotencyKey,
    queued = false,
    confirmPendingRevalidation = false,
  }) {
    const initialContext = await this.getExecutionContext(bookingId);
    const pendingGeneratedAt =
      initialContext.booking.orchestration?.pendingRevalidation?.generatedAt?.getTime?.() ||
      initialContext.booking.orchestration?.pendingRevalidation?.generatedAt ||
      "none";
    const resolvedKey =
      idempotencyKey ||
      `${bookingId}:${confirmPendingRevalidation ? "confirm-revalidated" : "initial"}:${initialContext.booking.approvedAt?.getTime() || "approved"}:${confirmPendingRevalidation ? pendingGeneratedAt : toMoney(initialContext.booking.pricingSnapshot?.totalAmount)}`;

    const previousOutcome = initialContext.booking.orchestration?.lastOutcome;
    if (
      previousOutcome?.idempotencyKey === resolvedKey &&
      ["SUCCESS", "REVALIDATED", "PRICE_CHANGED", "SSR_CHANGED", "FLIGHT_UNAVAILABLE"].includes(
        previousOutcome.status,
      ) &&
      !(
        confirmPendingRevalidation &&
        ["REVALIDATED", "PRICE_CHANGED", "SSR_CHANGED"].includes(previousOutcome.status)
      )
    ) {
      if (previousOutcome.status === "REVALIDATED") {
        return buildRevalidatedResponse(initialContext.booking, previousOutcome.bookingContext, {
          ...previousOutcome.metadata,
          revalidation: previousOutcome.revalidation,
          notifications: previousOutcome.notifications,
        });
      }

      if (previousOutcome.status === "PRICE_CHANGED") {
        return buildPriceChangedResponse(
          initialContext.booking,
          previousOutcome.priceChange,
          {
            ...previousOutcome.metadata,
            bookingContext: previousOutcome.bookingContext,
            revalidation: previousOutcome.revalidation,
            notifications: previousOutcome.notifications,
            ssrChange: previousOutcome.ssrChange,
          },
        );
      }

      if (previousOutcome.status === "SSR_CHANGED") {
        return buildSsrChangedResponse(
          initialContext.booking,
          previousOutcome.priceChange,
          previousOutcome.ssrChange,
          {
            ...previousOutcome.metadata,
            bookingContext: previousOutcome.bookingContext,
            revalidation: previousOutcome.revalidation,
            notifications: previousOutcome.notifications,
          },
        );
      }

      if (previousOutcome.status === "FLIGHT_UNAVAILABLE") {
        return buildFlightUnavailableResponse(
          initialContext.booking,
          {
            ...previousOutcome.metadata,
            revalidation: previousOutcome.revalidation,
            notifications: previousOutcome.notifications,
          },
        );
      }

      logger.info("idempotent_booking_execution", {
        bookingId,
        idempotencyKey: resolvedKey,
        executionStatus: initialContext.booking.executionStatus,
      });

      return buildExistingOutcomeResponse(initialContext.booking);
    }

    if (
      ["booked", "ticket_pending", "ticketed"].includes(
        initialContext.booking.executionStatus,
      ) &&
      (
        initialContext.booking.bookingResult?.pnr ||
        initialContext.booking.bookingResult?.onwardPNR
      )
    ) {
      logger.info("idempotent_booking_execution", {
        bookingId,
        idempotencyKey: resolvedKey,
        executionStatus: initialContext.booking.executionStatus,
      });

      return buildExistingOutcomeResponse(initialContext.booking);
    }

    const duplicateInspection = await this.inspectPotentialDuplicateBookings(
      initialContext.booking,
    );

    if (duplicateInspection.retryableMatches.length) {
      logger.info("duplicate_booking_allowed_retry", {
        bookingId,
        matchingBookingIds: duplicateInspection.retryableMatches.map((candidate) =>
          String(candidate._id),
        ),
        executionStatuses: duplicateInspection.retryableMatches.map(
          (candidate) => candidate.executionStatus,
        ),
      });
    }

    if (duplicateInspection.blockingBooking) {
      logger.warn("duplicate_booking_detected", {
        bookingId,
        existingBookingId: duplicateInspection.blockingBooking._id,
        existingPnr: resolvePnr(duplicateInspection.blockingBooking),
        existingProviderBookingId: resolveSupplierBookingId(
          duplicateInspection.blockingBooking,
        ),
        executionStatus: duplicateInspection.blockingBooking.executionStatus,
      });

      throw createDuplicateBookingError({
        currentBooking: initialContext.booking,
        existingBooking: duplicateInspection.blockingBooking,
        source: "local_guard",
      });
    }

    const lockedBooking = await this.tryAcquireLock(
      bookingId,
      resolvedKey,
      actorId,
    );

    if (!lockedBooking) {
      const freshBooking = await BookingRequest.findById(bookingId);
      return buildProcessingResponse(freshBooking || initialContext.booking, resolvedKey);
    }

    const context = await this.getExecutionContext(bookingId);
    const { booking, corporate } = context;
    const pendingRevalidation = booking.orchestration?.pendingRevalidation || null;

    booking.orchestration = {
      ...(booking.orchestration || {}),
      lastOutcome: {
        status: "PROCESSING",
        message: queued ? "Booking queued for processing" : "Booking is being processed",
        queued,
        idempotencyKey: resolvedKey,
        metadata: {
          queued,
        },
      },
    };
    await saveSystemMutation(booking);

    if (confirmPendingRevalidation) {
      if (!pendingRevalidation?.reconstructedContext) {
        throw new ApiError(409, "No revalidated booking context is available to confirm");
      }

      applyRevalidatedContextToBooking({
        booking,
        reconstructed: pendingRevalidation,
        matchedFlight: {
          traceId: pendingRevalidation.matchedTraceId,
          resultIndex: pendingRevalidation.matchedResultIndex,
        },
      });
      booking.executionStatus = "not_started";
      await saveSystemMutation(booking);
    }

    try {
      const directBookingResult = await this.withRetry(
        () => this.bookFlight({ booking, corporate }),
        1,
      );

      booking.orchestration = {
        ...(booking.orchestration || {}),
        pendingRevalidation: null,
      };

      await MarkupAccountingService.recordBookingRevenue(booking, corporate).catch((err) => {
        logger.error("Failed to record markup revenue", {
          bookingId,
          error: err.message,
        });
      });

      const successPayload = buildSuccessResponse(booking, directBookingResult, {
        revalidated: false,
      });
      successPayload.idempotencyKey = resolvedKey;

      await updateOutcome(booking, successPayload);
      return successPayload;
    } catch (error) {
      logger.error("Direct approved booking failed", {
        bookingId,
        message: error.message,
      });

      if (isProviderDuplicateError(error)) {
        const providerDuplicate =
          (await this.inspectPotentialDuplicateBookings(booking, {
            includeOutsideWindow: true,
          })) || null;

        if (providerDuplicate?.blockingBooking) {
          logger.warn("duplicate_booking_detected", {
            bookingId,
            existingBookingId: providerDuplicate.blockingBooking._id,
            existingPnr: resolvePnr(providerDuplicate.blockingBooking),
            existingProviderBookingId: resolveSupplierBookingId(
              providerDuplicate.blockingBooking,
            ),
            executionStatus: providerDuplicate.blockingBooking.executionStatus,
            source: "provider_duplicate_error",
          });

          const duplicateError = createDuplicateBookingError({
            currentBooking: booking,
            existingBooking: providerDuplicate.blockingBooking,
            source: "provider_duplicate_error",
            providerMessage: error.message,
          });

          await markBusinessBlocked(
            booking,
            duplicateError,
            resolvedKey,
            "not_started",
          );
          throw duplicateError;
        }

        const duplicateError = createDuplicateBookingError({
          currentBooking: booking,
          existingBooking: null,
          source: "provider_duplicate_error_unresolved",
          providerMessage: error.message,
        });

        await markBusinessBlocked(
          booking,
          duplicateError,
          resolvedKey,
          "not_started",
        );
        throw duplicateError;
      }

      if (!isSilentRevalidationError(error)) {
        await markFailedAttempt(booking, error, resolvedKey);
        throw error;
      }
    }

    try {
      const refreshedSearch = await this.searchFlights(booking);
      let matchedFlight;

      try {
        matchedFlight = this.matchFlight(refreshedSearch, booking);
      } catch (matchError) {
        if (matchError instanceof ApiError && matchError.statusCode === 409) {
          booking.executionStatus = "failed";
          booking.orchestration = {
            ...(booking.orchestration || {}),
            pendingRevalidation: null,
          };
          await saveSystemMutation(booking);

          const unavailableResponse = buildFlightUnavailableResponse(booking, {
            revalidated: true,
            reason: "MATCH_NOT_FOUND",
          });
          unavailableResponse.idempotencyKey = resolvedKey;

          await updateOutcome(booking, unavailableResponse);
          return unavailableResponse;
        }

        throw matchError;
      }

      const reconstructed = await bookingReconstructionService.rebuildBookingContext({
        booking,
        corporate,
        traceId: matchedFlight.traceId,
        resultIndex: matchedFlight.resultIndex,
        matchedResults: matchedFlight.matchedResults,
      });

      if (reconstructed.status === "FLIGHT_UNAVAILABLE") {
        booking.executionStatus = "failed";
        booking.orchestration = {
          ...(booking.orchestration || {}),
          pendingRevalidation: {
            status: "FLIGHT_UNAVAILABLE",
            generatedAt: new Date(),
            matchedTraceId: matchedFlight.traceId,
            matchedResultIndex: matchedFlight.resultIndex,
            notifications: reconstructed.notifications || [],
          },
        };
        await saveSystemMutation(booking);

        const unavailableResponse = buildFlightUnavailableResponse(booking, {
          revalidated: true,
          matchedTraceId: matchedFlight.traceId,
          revalidation: booking.orchestration.pendingRevalidation,
          notifications: reconstructed.notifications,
        });
        unavailableResponse.idempotencyKey = resolvedKey;

        await updateOutcome(booking, unavailableResponse);
        return unavailableResponse;
      }

      applyRevalidationAudits({
        booking,
        reconstructed,
        matchedFlight,
      });

      booking.orchestration = {
        ...(booking.orchestration || {}),
        pendingRevalidation: buildPendingRevalidation({
          reconstructed,
          matchedFlight,
        }),
      };

      if (reconstructed.status === "SSR_CHANGED") {
        booking.executionStatus = "on_hold";
        await saveSystemMutation(booking);

        const ssrChangedResponse = buildSsrChangedResponse(
          booking,
          reconstructed.priceChange,
          reconstructed.ssrChange,
          {
            revalidated: true,
            matchedTraceId: matchedFlight.traceId,
            revalidation: booking.orchestration.pendingRevalidation,
            bookingContext: booking.orchestration.pendingRevalidation.bookingContext,
            notifications: reconstructed.notifications,
          },
        );
        ssrChangedResponse.idempotencyKey = resolvedKey;

        await updateOutcome(booking, ssrChangedResponse);
        return ssrChangedResponse;
      }

      if (reconstructed.status === "PRICE_CHANGED") {
        booking.executionStatus = "on_hold";
        await saveSystemMutation(booking);

        const priceChangedResponse = buildPriceChangedResponse(
          booking,
          reconstructed.priceChange,
          {
            revalidated: true,
            matchedTraceId: matchedFlight.traceId,
            ssrChange: reconstructed.ssrChange,
            revalidation: booking.orchestration.pendingRevalidation,
            bookingContext: booking.orchestration.pendingRevalidation.bookingContext,
            notifications: reconstructed.notifications,
          },
        );
        priceChangedResponse.idempotencyKey = resolvedKey;

        await updateOutcome(booking, priceChangedResponse);
        return priceChangedResponse;
      }

      booking.executionStatus = "not_started";
      await saveSystemMutation(booking);

      const revalidatedResponse = buildRevalidatedResponse(
        booking,
        booking.orchestration.pendingRevalidation.bookingContext,
        {
          revalidated: true,
          matchedTraceId: matchedFlight.traceId,
          revalidation: booking.orchestration.pendingRevalidation,
          notifications: reconstructed.notifications,
        },
      );
      revalidatedResponse.idempotencyKey = resolvedKey;

      await updateOutcome(booking, revalidatedResponse);
      return revalidatedResponse;
    } catch (error) {
      logger.error("Revalidated booking flow failed", {
        bookingId,
        message: error.message,
      });

      await markFailedAttempt(booking, error, resolvedKey);
      throw new ApiError(
        409,
        "Flight session expired and automatic revalidation could not complete. Please search again.",
      );
    }
  }
}

module.exports = new FlightOrchestrationService();
