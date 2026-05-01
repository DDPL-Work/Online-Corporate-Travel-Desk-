const stringify = require("fast-json-stable-stringify");

const BookingIntent = require("../../models/BookingIntent");
const BookingRequest = require("../../models/BookingRequest");
const Corporate = require("../../models/Corporate");
const redis = require("../../config/redis");
const ApiError = require("../../utils/ApiError");
const logger = require("../../utils/logger");
const tboService = require("../tektravels/flight.service");
const {
  buildPassengersFromBooking,
  extractPnr,
  getFareResults,
  performBooking,
} = require("./flightBookingExecutor.service");
const bookingReconstructionService = require("./bookingReconstruction.service");

const SEARCH_CACHE_TTL_SECONDS = 90;
const LOCK_TTL_MS = 2 * 60 * 1000;
const RETRY_DELAY_MS = 1500;

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
  executionStatus: booking.executionStatus,
  pnr:
    bookingResult?.pnr ||
    booking.bookingResult?.pnr ||
    extractPnr(booking.bookingResult?.providerResponse),
  metadata,
});

const buildExistingOutcomeResponse = (booking) => ({
  status: "SUCCESS",
  bookingRequestId: booking._id,
  executionStatus: booking.executionStatus,
  pnr:
    booking.bookingResult?.pnr ||
    booking.bookingResult?.onwardPNR ||
    extractPnr(booking.bookingResult?.providerResponse),
  metadata: {
    replayed: true,
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
      return buildExistingOutcomeResponse(initialContext.booking);
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

    booking.orchestration.lastOutcome = {
      status: "PROCESSING",
      message: queued ? "Booking queued for processing" : "Booking is being processed",
      queued,
      idempotencyKey: resolvedKey,
      metadata: {
        queued,
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
