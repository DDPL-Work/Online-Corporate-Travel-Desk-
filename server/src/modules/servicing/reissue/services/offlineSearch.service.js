const crypto = require("crypto");
const BookingRequest = require("../../../../models/BookingRequest");
const ApiError = require("../../../../utils/ApiError");
const logger = require("../../../../utils/logger");
const tboService = require("../../../../services/tektravels/flight.service");
const offlineSearchRepository = require("../repositories/offlineSearch.repository");
const { validateOfflineSearchPayload } = require("../validators/offlineSearch.validator");
const { toOfflineSearchDto } = require("../transformers/offlineSearch.dto");
const { resolvePassengerCounts } = require("../../../../utils/bookingResolver.util");
const { resolveReissueRoute } = require("../../../../utils/reissueRouteResolver.util");
const { calculateOfflineReissueEstimate } = require("./reissuePricing.service");
const reissueFinancialLedgerService = require("../../../../services/reissue/reissueFinancialLedger.service");

const MAX_SEARCH_WINDOW_DAYS = 30;
const CACHE_TTL_SECONDS = 1800;

const cabinClassMap = {
  all: 1,
  economy: 2,
  premium_economy: 3,
  premiumbusiness: 5,
  premium_business: 5,
  business: 4,
  first_class: 6,
  first: 6,
  1: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 6,
};

const normalizeCabinClass = (value) => {
  if (value === undefined || value === null) return 2;
  if (typeof value === "number") return Number(value) >= 1 && Number(value) <= 6 ? Number(value) : 2;
  const key = String(value).trim().toLowerCase().replace(/\s+/g, "_");
  return cabinClassMap[key] || 2;
};

const toArray = (value) => {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
};

const parseDate = (value) => {
  if (!value) return null;
  const candidate = new Date(value);
  return Number.isNaN(candidate.getTime()) ? null : candidate;
};

const formatAsIsoDate = (value) => {
  const date = parseDate(value);
  if (!date) return null;
  return date.toISOString().slice(0, 10);
};

const combineDateAndTime = (dateValue, timeValue) => {
  const date = formatAsIsoDate(dateValue);
  if (!date) return null;
  if (!timeValue) return `${date}T00:00:00`;
  const parts = String(timeValue).trim().split(":");
  if (parts.length < 2) return `${date}T00:00:00`;
  const hours = String(Number(parts[0] || 0)).padStart(2, "0");
  const minutes = String(Number(parts[1] || 0)).padStart(2, "0");
  return `${date}T${hours}:${minutes}:00`;
};

const getBookingOriginalDates = (booking) => {
  const travelDate = booking?.bookingSnapshot?.travelDate || booking?.travelDate || booking?.flightRequest?.departureDate;
  const returnDate = booking?.bookingSnapshot?.returnDate || booking?.returnDate || booking?.flightRequest?.returnDate;
  return {
    departureDate: formatAsIsoDate(travelDate),
    returnDate: formatAsIsoDate(returnDate),
  };
};

const extractAirportCode = (value) => {
  if (!value) return null;
  if (typeof value === "string") return value.trim().toUpperCase() || null;
  if (typeof value !== "object") return null;
  const candidate =
    value?.Airport?.AirportCode ||
    value?.Airport?.Code ||
    value?.AirportCode ||
    value?.Code ||
    value?.airport ||
    value?.iata ||
    value?.origin ||
    value?.destination ||
    null;
  if (typeof candidate === "string") return candidate.trim().toUpperCase() || null;
  return null;
};

const extractAirportName = (value) => {
  if (!value || typeof value !== "object") return null;
  return (
    value?.Airport?.AirportName ||
    value?.Airport?.Name ||
    value?.AirportName ||
    value?.Name ||
    value?.airportName ||
    value?.name ||
    null
  );
};

const extractTerminal = (value) => {
  if (!value || typeof value !== "object") return null;
  return (
    value?.Airport?.Terminal ||
    value?.Terminal ||
    value?.terminal ||
    null
  );
};

const extractResultSegments = (result) => {
  const rawSegments = [];
  const collectSegments = (value) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(collectSegments);
      return;
    }
    if (Array.isArray(value?.Segment)) {
      collectSegments(value.Segment);
      return;
    }
    rawSegments.push(value);
  };

  collectSegments(result?.Segments);
  collectSegments(result?.Segment);

  return rawSegments
    .map((segment) => {
      const origin = extractAirportCode(segment?.Origin || segment?.origin || segment?.OriginAirport);
      const destination = extractAirportCode(segment?.Destination || segment?.destination || segment?.DestinationAirport);
      const originAirportName = extractAirportName(segment?.Origin || segment?.origin || segment?.OriginAirport);
      const destinationAirportName = extractAirportName(segment?.Destination || segment?.destination || segment?.DestinationAirport);
      const departureTerminal = extractTerminal(segment?.Origin || segment?.origin || segment?.OriginAirport);
      const arrivalTerminal = extractTerminal(segment?.Destination || segment?.destination || segment?.DestinationAirport);
      // TBO FlightSearch response stores timings inside the nested Origin/Destination objects:
      //   segment.Origin.DepTime    (e.g. "2026-05-20T08:45:00")
      //   segment.Destination.ArrTime (e.g. "2026-05-20T10:35:00")
      // Flat fields (DepTime, ArrTime at top-level) exist only in some legacy/LCC responses.
      const departureTime =
        segment?.Origin?.DepTime ||
        segment?.Origin?.DepDateTime ||
        segment?.DepTime ||
        segment?.DepartureTime ||
        segment?.DepartureDateTime ||
        segment?.departureDateTime ||
        null;
      const arrivalTime =
        segment?.Destination?.ArrTime ||
        segment?.Destination?.ArrDateTime ||
        segment?.ArrTime ||
        segment?.ArrivalTime ||
        segment?.ArrivalDateTime ||
        segment?.arrivalDateTime ||
        null;
      // TBO puts flight number inside the Airline sub-object
      const flightNumber =
        segment?.Airline?.FlightNumber ||
        segment?.FlightNo ||
        segment?.FlightNumber ||
        segment?.flightNumber ||
        null;
      const stops = Number(segment?.Stops || segment?.StopCount || 0);
      const airlineCode =
        segment?.Airline?.AirlineCode ||
        segment?.AirlineCode ||
        segment?.OperatingCarrier?.AirlineCode ||
        null;
      const airlineName =
        segment?.Airline?.AirlineName ||
        segment?.AirlineName ||
        segment?.OperatingCarrier?.AirlineName ||
        null;
      const duration = Number(
        segment?.Duration ?? segment?.JourneyDuration ?? segment?.SegmentDuration ?? 0,
      );

      if (!origin || !destination) return null;
      return {
        origin,
        destination,
        originAirportName,
        destinationAirportName,
        departureTerminal,
        arrivalTerminal,
        departureTime,
        arrivalTime,
        flightNumber,
        airlineCode,
        airlineName,
        stops,
        duration: Number.isFinite(duration) && duration > 0 ? duration : null,
        cabinClass: segment?.CabinClass || segment?.CabinClassName || segment?.cabinClass || null,
        fareFamily:
          segment?.SupplierFareClass ||
          segment?.FareClass ||
          segment?.fareClass ||
          result?.SupplierFareClass ||
          result?.ResultFareType ||
          result?.FareClassification?.Type ||
          null,
        baggage:
          segment?.Baggage ||
          segment?.CabinBaggage ||
          segment?.IncludedBaggage ||
          segment?.baggage ||
          null,
        mealInfo: segment?.Meal || segment?.MealInfo || segment?.mealInfo || null,
        seatInfo: segment?.Seat || segment?.SeatInfo || segment?.seatInfo || null,
      };
    })
    .filter(Boolean);
};

const extractResultFare = (result) => {
  const fare = result?.Fare || result?.fare || {};
  const offeredFare = Number(
    fare?.OfferedFare ??
      fare?.PublishedFare ??
      fare?.TotalFare ??
      fare?.BaseFare ??
      result?.OfferedFare ??
      result?.PublishedFare ??
      result?.TotalFare ??
      0,
  );
  return Number.isNaN(offeredFare) ? null : offeredFare;
};

const formatDuration = (value) => {
  if (value == null || value === "") return null;
  if (typeof value === "string" && /^P/i.test(value)) {
    const match = value.match(/P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?/i);
    if (!match) return value;
    const days = Number(match[1] || 0);
    const hours = Number(match[2] || 0);
    const minutes = Number(match[3] || 0);
    const parts = [];
    if (days) parts.push(`${days}d`);
    if (hours) parts.push(`${hours}h`);
    if (minutes) parts.push(`${minutes}m`);
    return parts.join(" ") || value;
  }

  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric >= 0) {
    const hours = Math.floor(numeric / 60);
    const minutes = Math.round(numeric % 60);
    if (!hours) return `${minutes}m`;
    if (!minutes) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  }

  return String(value);
};

const getOriginalFareAmount = (booking) => {
  const fare = Number(
    booking?.flightRequest?.fareSnapshot?.offeredFare ??
      booking?.pricingSnapshot?.totalAmount ??
      booking?.bookingSnapshot?.amount ??
      booking?.pricing?.totalAmount ??
      0,
  );
  return Number.isNaN(fare) ? null : fare;
};

const extractResultDuration = (result, segments = []) => {
  const explicitDuration = result?.Duration ?? result?.JourneyDuration ?? result?.duration ?? null;
  if (explicitDuration != null) return formatDuration(explicitDuration);

  const summedSegmentDuration = segments.reduce(
    (total, segment) => total + (Number(segment.duration) || 0),
    0,
  );
  if (summedSegmentDuration > 0) return formatDuration(summedSegmentDuration);

  const departure = segments[0]?.departureTime || result?.DepartureTime || result?.DepartureDateTime;
  const arrival =
    segments[segments.length - 1]?.arrivalTime || result?.ArrivalTime || result?.ArrivalDateTime;
  if (!departure || !arrival) return null;

  const durationMinutes = Math.round(
    (new Date(arrival).getTime() - new Date(departure).getTime()) / 60000,
  );
  return Number.isFinite(durationMinutes) && durationMinutes > 0
    ? formatDuration(durationMinutes)
    : null;
};

const extractResultStops = (result, segments = []) => {
  const explicitStops = Number(result?.Stops ?? result?.StopCount);
  if (Number.isFinite(explicitStops)) return explicitStops;
  return Math.max((segments?.length || 1) - 1, 0);
};

const enrichResultPricing = async ({ booking, result, traceId }) => {
  let fareRuleResponse = result?.fareRuleResponse || null;

  if (traceId && result?.resultIndex !== undefined && result?.resultIndex !== null) {
    try {
      fareRuleResponse = await tboService.getFareRule(traceId, result.resultIndex);
    } catch (error) {
      logger.warn("offline_reissue_fare_rule_fetch_failed", {
        traceId,
        resultIndex: result.resultIndex,
        error: error.message,
      });
    }
  }

  const ledger = await reissueFinancialLedgerService.getLedgerForBooking(booking);
  const estimate = calculateOfflineReissueEstimate({
    originalBooking: booking,
    selectedFlight: result,
    fareRuleResponse,
    ledger,
  });

  return {
    ...result,
    oldFare: estimate.oldFare,
    fareDifference: estimate.fareDifference,
    fareDifferenceEstimate: estimate.fareDifference,
    reissueCharge: estimate.reissueCharge,
    totalEstimate: estimate.totalEstimate,
    refundEstimate: estimate.refundEstimate,
    currency: estimate.currency,
    pricingVersion: estimate.pricingVersion,
    pricingSource: estimate.source,
    pricingBreakdown: estimate.breakdown,
    fareRuleResponse,
    matchedReissueRule: estimate.matchedRule,
  };
};

const normalizeSearchResults = async (searchResponse, booking) => {
  const rawResults = [];
  if (Array.isArray(searchResponse?.Response?.Results)) {
    searchResponse.Response.Results.forEach((item) => {
      if (Array.isArray(item)) {
        rawResults.push(...item.filter(Boolean));
      } else if (item) {
        rawResults.push(item);
      }
    });
  } else if (searchResponse?.Response?.Results?.Result) {
    rawResults.push(...toArray(searchResponse.Response.Results.Result));
  } else if (Array.isArray(searchResponse?.Results)) {
    searchResponse.Results.forEach((item) => {
      if (Array.isArray(item)) {
        rawResults.push(...item.filter(Boolean));
      } else if (item) {
        rawResults.push(item);
      }
    });
  } else if (searchResponse?.Results?.Result) {
    rawResults.push(...toArray(searchResponse.Results.Result));
  }

  const originalFare = getOriginalFareAmount(booking);
  const traceId = searchResponse?.Response?.TraceId || searchResponse?.TraceId || null;
  const normalizedResults = rawResults.map((result, index) => {
    const segments = extractResultSegments(result);
    const origin = segments[0]?.origin || null;
    const destination = segments[segments.length - 1]?.destination || null;
    const firstSegment = segments[0] || {};
    const lastSegment = segments[segments.length - 1] || firstSegment;
    // Primary: pull from normalised segment data (already fixed to read TBO nested fields)
    // Fallback: try top-level result fields and TBO nested Origin/Destination
    const departureTime =
      segments[0]?.departureTime ||
      result?.Origin?.DepTime ||
      result?.DepartureTime ||
      result?.DepartureDateTime ||
      null;
    const arrivalTime =
      segments[segments.length - 1]?.arrivalTime ||
      result?.Destination?.ArrTime ||
      result?.ArrivalTime ||
      result?.ArrivalDateTime ||
      null;
    const flightNumber =
      segments.length === 1
        ? segments[0]?.flightNumber
        : segments.map((seg) => seg.flightNumber).filter(Boolean).join(", ");
    const airlineCode =
      result?.Airline?.AirlineCode || result?.AirlineCode || result?.FlightAirlineCode || segments[0]?.airlineCode || null;
    const airlineName =
      result?.Airline?.AirlineName || result?.AirlineName || result?.FlightAirlineName || segments[0]?.airlineName || null;
    const fare = extractResultFare(result);
    const fareDifferenceEstimate =
      originalFare != null && fare != null ? Math.max(fare - originalFare, 0) : null;

    return {
      resultIndex: result?.ResultIndex || result?.resultIndex || index,
      origin,
      destination,
      originAirportName: firstSegment.originAirportName || null,
      destinationAirportName: lastSegment.destinationAirportName || null,
      departureTerminal: firstSegment.departureTerminal || null,
      arrivalTerminal: lastSegment.arrivalTerminal || null,
      airlineCode,
      airlineName,
      flightNumber,
      departureTime,
      arrivalTime,
      duration: extractResultDuration(result, segments),
      stops: extractResultStops(result, segments),
      fare,
      offeredFare: fare,
      cabinClass: result?.CabinClass || result?.CabinClassName || result?.FlightCabinClass || null,
      fareFamily:
        result?.SupplierFareClass ||
        result?.ResultFareType ||
        result?.FareClassification?.Type ||
        firstSegment.fareFamily ||
        null,
      baggage: firstSegment.baggage || result?.Baggage || result?.CabinBaggage || null,
      mealInfo: firstSegment.mealInfo || result?.Meal || result?.MealInfo || null,
      seatInfo:
        firstSegment.seatInfo ||
        result?.Seat ||
        result?.SeatInfo ||
        (result?.NoOfSeatAvailable != null ? `${result.NoOfSeatAvailable} seat(s) available` : null),
      segments,
      fareDifference: fareDifferenceEstimate,
      fareDifferenceEstimate,
      currency: result?.Fare?.Currency || "INR",
      traceId,
    };
  });

  const pricedResults = await Promise.all(
    normalizedResults.map(async (result) => {
      try {
        return await enrichResultPricing({ booking, result, traceId });
      } catch (error) {
        logger.warn("offline_reissue_result_pricing_failed", {
          bookingId: booking?._id?.toString?.(),
          traceId,
          resultIndex: result?.resultIndex,
          error: error.message,
        });
        return null;
      }
    }),
  );

  return pricedResults.filter(Boolean);
};

const buildAirlineFilterCode = (payload = {}, resolvedRoute = {}) =>
  String(payload.preferredAirline || resolvedRoute.airlineCode || "")
    .trim()
    .toUpperCase();

const filterResultsByAirline = (results = [], airlineCode) => {
  if (!airlineCode) return results;
  const filtered = results.filter(
    (item) => String(item.airlineCode || "").trim().toUpperCase() === airlineCode,
  );
  return filtered.length ? filtered : results;
};

const buildSearchPayloadFromResolvedRoute = ({
  booking,
  payload,
  resolvedRoute,
}) => {
  const departureDate = formatAsIsoDate(payload.departureDate);
  const originalDates = getBookingOriginalDates(booking);
  const fallbackReturnDate =
    formatAsIsoDate(payload.returnDate) ||
    resolvedRoute.journeyGroups?.[1]?.[0]?.departureDate ||
    originalDates.returnDate ||
    null;

  const passengerCounts = resolvePassengerCounts(booking);
  const normalizedCabinClass = normalizeCabinClass(
    payload.cabinClass || resolvedRoute.cabinClass || booking.bookingSnapshot?.cabinClass || "economy",
  );

  if (resolvedRoute.journeyType === 3) {
    const multiCitySegments = (resolvedRoute.journeyGroups?.length
      ? resolvedRoute.journeyGroups
      : [resolvedRoute.segments]
    )
      .map((group, index) => {
        const firstSegment = group[0];
        const lastSegment = group[group.length - 1];

        return {
          origin: firstSegment?.origin,
          destination: lastSegment?.destination,
          departureDate:
            index === 0
              ? departureDate
              : firstSegment?.departureDate || departureDate,
        };
      })
      .filter((segment) => segment.origin && segment.destination && segment.departureDate);

    return {
      origin: multiCitySegments[0]?.origin || resolvedRoute.resolvedOrigin,
      destination:
        multiCitySegments[multiCitySegments.length - 1]?.destination ||
        resolvedRoute.resolvedDestination,
      adults: passengerCounts.adults,
      children: passengerCounts.children,
      infants: passengerCounts.infants,
      journeyType: 3,
      departureDate,
      returnDate: null,
      cabinClass: normalizedCabinClass,
      directFlight: Boolean(payload.directFlightOnly),
      oneStop: false,
      preferredTime: payload.preferredTime || null,
      preferredDepartureTime: combineDateAndTime(departureDate, payload.preferredTime),
      segments: multiCitySegments,
    };
  }

  if (resolvedRoute.journeyType === 2) {
    const onwardGroup = resolvedRoute.journeyGroups?.[0] || resolvedRoute.segments;
    const returnGroup = resolvedRoute.journeyGroups?.[1] || [];

    return {
      origin: onwardGroup[0]?.origin || resolvedRoute.resolvedOrigin,
      destination:
        onwardGroup[onwardGroup.length - 1]?.destination || resolvedRoute.resolvedDestination,
      adults: passengerCounts.adults,
      children: passengerCounts.children,
      infants: passengerCounts.infants,
      journeyType: 2,
      departureDate,
      returnDate: fallbackReturnDate,
      cabinClass: normalizedCabinClass,
      directFlight: Boolean(payload.directFlightOnly),
      oneStop: false,
      preferredTime: payload.preferredTime || null,
      preferredDepartureTime: combineDateAndTime(departureDate, payload.preferredTime),
      preservedReturnOrigin: returnGroup[0]?.origin || null,
      preservedReturnDestination:
        returnGroup[returnGroup.length - 1]?.destination || null,
    };
  }

  return {
    origin: resolvedRoute.resolvedOrigin,
    destination: resolvedRoute.resolvedDestination,
    adults: passengerCounts.adults,
    children: passengerCounts.children,
    infants: passengerCounts.infants,
    journeyType: 1,
    departureDate,
    returnDate: null,
    cabinClass: normalizedCabinClass,
    directFlight: Boolean(payload.directFlightOnly),
    oneStop: false,
    preferredTime: payload.preferredTime || null,
    preferredDepartureTime: combineDateAndTime(departureDate, payload.preferredTime),
  };
};

const validateSearchWindow = (booking, requestedDepartureDate, requestedReturnDate) => {
  const originalDates = getBookingOriginalDates(booking);
  const originalDeparture = parseDate(originalDates.departureDate);
  if (!originalDeparture) return;

  const maxAllowedDate = new Date(originalDeparture);
  maxAllowedDate.setDate(maxAllowedDate.getDate() + MAX_SEARCH_WINDOW_DAYS);

  const checkDate = (dateValue, fieldName) => {
    if (!dateValue) return;
    const candidate = parseDate(dateValue);
    if (!candidate) {
      throw new ApiError(400, `${fieldName} is not a valid date`);
    }
    if (candidate < originalDeparture) {
      throw new ApiError(400, `${fieldName} cannot be earlier than original departure date`);
    }
    if (candidate > maxAllowedDate) {
      throw new ApiError(400, `${fieldName} must be within ${MAX_SEARCH_WINDOW_DAYS} days of original departure date`);
    }
  };

  checkDate(requestedDepartureDate, "departureDate");
  checkDate(requestedReturnDate, "returnDate");
};

class OfflineSearchService {
  async loadBookingOrThrow(bookingId) {
    const booking = await BookingRequest.findById(bookingId);
    if (!booking) {
      throw new ApiError(404, "Booking not found");
    }
    return booking;
  }

  async searchOptions({ actor, payload }) {
    validateOfflineSearchPayload(payload);

    const booking = await this.loadBookingOrThrow(payload.bookingId);
    if (booking.executionStatus !== "ticketed") {
      throw new ApiError(409, "Only ticketed bookings can be reissued");
    }
    if (booking.bookingType !== "flight") {
      throw new ApiError(400, "Reissue is only supported for flight bookings");
    }

    this.validateOwner(actor, booking);

    validateSearchWindow(booking, payload.departureDate, payload.returnDate);

    logger.info("offline_reissue_route_resolution_started", {
      bookingId: booking._id?.toString(),
      provider: booking?.provider || booking?.providerData?.provider || "unknown",
    });

    let resolvedRoute;
    try {
      resolvedRoute = resolveReissueRoute(booking);
    } catch (error) {
      logger.error("offline_reissue_route_resolution_failed", {
        bookingId: booking._id?.toString(),
        provider: booking?.provider || booking?.providerData?.provider || "unknown",
        code: error.code || "REISSUE_ROUTE_RESOLUTION_FAILED",
        message: error.message,
        data: error.data || null,
      });

      const wrapped = new ApiError(
        error.statusCode || 422,
        error.message || "Original itinerary could not be resolved for offline reissue search.",
      );
      wrapped.code = error.code || "REISSUE_ROUTE_NOT_FOUND";
      wrapped.data = error.data || null;
      throw wrapped;
    }

    logger.info("offline_reissue_route_resolution_success", {
      bookingId: booking._id?.toString(),
      provider: resolvedRoute.provider,
      itineraryPathUsed: resolvedRoute.itineraryPathUsed,
      segmentCount: resolvedRoute.segments.length,
      resolvedOrigin: resolvedRoute.resolvedOrigin,
      resolvedDestination: resolvedRoute.resolvedDestination,
    });

    const searchPayload = buildSearchPayloadFromResolvedRoute({
      booking,
      payload,
      resolvedRoute,
    });

    const searchResponse = await tboService.searchFlights(searchPayload);
    const airlineFilterCode = buildAirlineFilterCode(payload, resolvedRoute);
    const normalizedResults = filterResultsByAirline(
      await normalizeSearchResults(searchResponse, booking),
      airlineFilterCode,
    );

    if (!normalizedResults.length) {
      throw new ApiError(404, "No alternative flights found for the selected search criteria");
    }

    const searchId = crypto.randomUUID();
    const cachePayload = {
      searchId,
      bookingId: booking._id.toString(),
      createdAt: new Date().toISOString(),
      payload: {
        origin: searchPayload.origin,
        destination: searchPayload.destination,
        departureDate: searchPayload.departureDate,
        returnDate: searchPayload.returnDate,
        preferredAirline: payload.preferredAirline || null,
        preferredTime: payload.preferredTime || null,
        cabinClass: searchPayload.cabinClass,
        directFlightOnly: Boolean(payload.directFlightOnly),
        journeyType: resolvedRoute.journeyType,
        traceId: searchResponse?.Response?.TraceId || searchResponse?.TraceId || null,
        itineraryPathUsed: resolvedRoute.itineraryPathUsed,
        provider: resolvedRoute.provider,
        preservedSegments: resolvedRoute.segments,
      },
      results: normalizedResults,
    };

    await offlineSearchRepository.save(searchId, cachePayload, CACHE_TTL_SECONDS);
    logger.info("OFFLINE_SEARCH_OPTION_CACHED", {
      searchId,
      bookingId: booking._id.toString(),
      ttl: CACHE_TTL_SECONDS,
      resultCount: normalizedResults.length,
    });

    const page = Number(payload.page || 1);
    const limit = Number(payload.limit || 10);
    const start = (page - 1) * limit;
    const paginatedResults = normalizedResults.slice(start, start + limit);

    return toOfflineSearchDto({
      searchId,
      results: paginatedResults,
      total: normalizedResults.length,
      page,
      limit,
    });
  }

  validateOwner(actor, booking) {
    if (["super-admin", "ops-member"].includes(actor.role)) return;
    if (booking.userId?.toString() === actor.id) return;
    if (booking.corporateId?.toString() === actor.corporateId) return;
    throw new ApiError(403, "You are not authorized to search offline reissue options for this booking");
  }
}

module.exports = new OfflineSearchService();
