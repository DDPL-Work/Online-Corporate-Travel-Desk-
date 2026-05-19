const buildResolverError = (code, message, data = {}) => {
  const error = new Error(message);
  error.code = code;
  error.statusCode = 422;
  error.data = data;
  return error;
};

const toArray = (value) => {
  if (value == null) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
};

const normalizeCode = (value) => {
  if (value == null) return null;
  const normalized = String(value).trim().toUpperCase();
  return normalized || null;
};

const normalizeText = (value) => {
  if (value == null) return null;
  const normalized = String(value).trim();
  return normalized || null;
};

const parseDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toIsoDate = (value) => {
  const parsed = parseDate(value);
  return parsed ? parsed.toISOString().slice(0, 10) : null;
};

const toTime = (value) => {
  if (!value) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d{2}:\d{2}$/.test(trimmed)) return trimmed;
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(trimmed)) return trimmed.slice(11, 16);
  }

  const parsed = parseDate(value);
  return parsed ? parsed.toISOString().slice(11, 16) : null;
};

const extractAirportCode = (value) => {
  if (!value) return null;

  if (typeof value === "string") {
    return normalizeCode(value);
  }

  if (typeof value !== "object") {
    return null;
  }

  return normalizeCode(
    value?.Airport?.AirportCode ||
      value?.Airport?.Code ||
      value?.AirportCode ||
      value?.Code ||
      value?.airportCode ||
      value?.airport ||
      value?.iata ||
      value?.origin ||
      value?.destination ||
      value?.code ||
      null,
  );
};

const extractDateTime = (segment = {}) =>
  segment?.Origin?.DepTime ||
  segment?.DepartureTime ||
  segment?.DepartureDateTime ||
  segment?.DepTime ||
  segment?.departureDateTime ||
  segment?.departureTime ||
  segment?.departureDate ||
  null;

const extractSegmentAirlineCode = (segment = {}) =>
  normalizeCode(
    segment?.Airline?.AirlineCode ||
      segment?.AirlineCode ||
      segment?.OperatingCarrier?.AirlineCode ||
      segment?.airlineCode ||
      null,
  );

const extractSegmentAirlineName = (segment = {}) =>
  normalizeText(
    segment?.Airline?.AirlineName ||
      segment?.AirlineName ||
      segment?.OperatingCarrier?.AirlineName ||
      segment?.airlineName ||
      null,
  );

const extractSegmentCabinClass = (segment = {}) =>
  segment?.CabinClass ||
  segment?.FlightCabinClass ||
  segment?.CabinClassName ||
  segment?.cabinClass ||
  null;

const normalizeProviderSegment = (segment = {}, index, path) => {
  const origin = extractAirportCode(
    segment?.Origin || segment?.origin || segment?.OriginAirport || null,
  );
  const destination = extractAirportCode(
    segment?.Destination || segment?.destination || segment?.DestinationAirport || null,
  );

  if (!origin || !destination) {
    throw buildResolverError(
      "REISSUE_AIRPORT_CODE_MISSING",
      "Original itinerary is missing required airport codes for offline reissue.",
      {
        segmentIndex: index,
        path,
        originPresent: Boolean(origin),
        destinationPresent: Boolean(destination),
      },
    );
  }

  const departureDateTime = extractDateTime(segment);

  return {
    origin,
    destination,
    departureDate: toIsoDate(departureDateTime),
    departureTime: toTime(departureDateTime),
    departureDateTime,
    airlineCode: extractSegmentAirlineCode(segment),
    airlineName: extractSegmentAirlineName(segment),
    cabinClass: extractSegmentCabinClass(segment),
    raw: segment,
  };
};

const normalizeStoredSegment = (segment = {}, index, path) => {
  const origin = extractAirportCode(segment?.origin || segment?.Origin || null);
  const destination = extractAirportCode(
    segment?.destination || segment?.Destination || null,
  );

  if (!origin || !destination) {
    throw buildResolverError(
      "REISSUE_AIRPORT_CODE_MISSING",
      "Original itinerary is missing required airport codes for offline reissue.",
      {
        segmentIndex: index,
        path,
        originPresent: Boolean(origin),
        destinationPresent: Boolean(destination),
      },
    );
  }

  const departureDateTime =
    segment?.departureDateTime ||
    segment?.DepartureDateTime ||
    segment?.departureTime ||
    segment?.DepartureTime ||
    segment?.departureDate ||
    null;

  return {
    origin,
    destination,
    departureDate: toIsoDate(departureDateTime),
    departureTime: toTime(departureDateTime),
    departureDateTime,
    airlineCode: normalizeCode(segment?.airlineCode || null),
    airlineName: normalizeText(segment?.airlineName || null),
    cabinClass: segment?.cabinClass || null,
    journeyType: normalizeText(segment?.journeyType || null)?.toLowerCase() || null,
    raw: segment,
  };
};

const normalizeGroupedSegments = (rawSegments, path, normalizer) => {
  if (!rawSegments) {
    throw buildResolverError(
      "REISSUE_SEGMENTS_NOT_FOUND",
      "Original itinerary segments could not be resolved for offline reissue.",
      { path },
    );
  }

  const groups = [];

  if (Array.isArray(rawSegments) && rawSegments.some(Array.isArray)) {
    rawSegments.forEach((group, groupIndex) => {
      const normalizedGroup = toArray(group)
        .map((segment, segmentIndex) =>
          normalizer(segment, segmentIndex, `${path}.Segments[${groupIndex}]`),
        )
        .filter(Boolean);

      if (normalizedGroup.length) {
        groups.push(normalizedGroup);
      }
    });
  } else {
    const normalizedGroup = toArray(rawSegments)
      .map((segment, segmentIndex) => normalizer(segment, segmentIndex, `${path}.Segments`))
      .filter(Boolean);

    if (normalizedGroup.length) {
      groups.push(normalizedGroup);
    }
  }

  if (!groups.length || !groups.flat().length) {
    throw buildResolverError(
      "REISSUE_SEGMENTS_NOT_FOUND",
      "Original itinerary segments could not be resolved for offline reissue.",
      { path },
    );
  }

  return {
    journeyGroups: groups,
    segments: groups.flat(),
  };
};

const inferJourneyType = ({ booking, journeyGroups, segments }) => {
  const storedSegments = toArray(booking?.flightRequest?.segments);
  const storedJourneyTypes = storedSegments
    .map((segment) => normalizeText(segment?.journeyType || null)?.toLowerCase())
    .filter(Boolean);

  if (storedJourneyTypes.includes("return")) {
    return 2;
  }

  if (booking?.bookingSnapshot?.returnDate) {
    return 2;
  }

  if (journeyGroups.length > 1) {
    if (journeyGroups.length === 2) {
      const first = journeyGroups[0];
      const second = journeyGroups[1];
      const outwardOrigin = first[0]?.origin;
      const outwardDestination = first[first.length - 1]?.destination;
      const returnOrigin = second[0]?.origin;
      const returnDestination = second[second.length - 1]?.destination;

      if (
        outwardOrigin &&
        outwardDestination &&
        returnOrigin &&
        returnDestination &&
        outwardOrigin === returnDestination &&
        outwardDestination === returnOrigin
      ) {
        return 2;
      }
    }

    return 3;
  }

  if (segments.length === 2) {
    const first = segments[0];
    const second = segments[1];

    if (
      first?.origin &&
      first?.destination &&
      second?.origin &&
      second?.destination &&
      first.origin === second.destination &&
      first.destination === second.origin
    ) {
      return 2;
    }
  }

  if (segments.length > 1) {
    const isConnected = segments.every((segment, index) => {
      if (index === 0) return true;
      return segments[index - 1]?.destination === segment?.origin;
    });

    return isConnected ? 1 : 3;
  }

  return 1;
};

const buildResolvedRoute = ({
  booking,
  itineraryPathUsed,
  provider,
  journeyGroups,
  segments,
}) => {
  const firstSegment = segments[0] || null;
  const lastSegment = segments[segments.length - 1] || null;
  const journeyType = inferJourneyType({ booking, journeyGroups, segments });

  const airlineCode =
    firstSegment?.airlineCode ||
    normalizeCode(
      booking?.airlineCode ||
        booking?.bookingSnapshot?.airlineCode ||
        booking?.providerData?.airlineCode ||
        booking?.bookingResult?.providerResponse?.Response?.Response?.FlightItinerary?.Segments?.[0]?.Airline?.AirlineCode ||
        null,
    );

  const airlineName =
    firstSegment?.airlineName ||
    normalizeText(
      booking?.airlineName ||
        booking?.bookingSnapshot?.airline ||
        booking?.providerData?.airlineName ||
        null,
    );

  const cabinClass =
    firstSegment?.cabinClass ||
    booking?.flightRequest?.segments?.[0]?.cabinClass ||
    booking?.bookingSnapshot?.cabinClass ||
    null;

  return {
    journeyType,
    airlineCode,
    airlineName,
    cabinClass,
    segments: segments.map((segment) => ({
      origin: segment.origin,
      destination: segment.destination,
      departureDate: segment.departureDate,
      departureTime: segment.departureTime,
    })),
    journeyGroups: journeyGroups.map((group) =>
      group.map((segment) => ({
        origin: segment.origin,
        destination: segment.destination,
        departureDate: segment.departureDate,
        departureTime: segment.departureTime,
      })),
    ),
    itineraryPathUsed,
    provider,
    resolvedOrigin: firstSegment?.origin || null,
    resolvedDestination: lastSegment?.destination || null,
  };
};

const resolveFromItinerary = (booking = {}) => {
  const candidates = [
    {
      provider: "TBO_STANDARD",
      path: "booking.bookingResult.providerResponse.Response.Response.FlightItinerary",
      itinerary: booking?.bookingResult?.providerResponse?.Response?.Response?.FlightItinerary,
    },
    {
      provider: "TBO_WRAPPED_RAW",
      path: "booking.bookingResult.providerResponse.raw.Response.FlightItinerary",
      itinerary: booking?.bookingResult?.providerResponse?.raw?.Response?.FlightItinerary,
    },
    {
      provider: "TBO_WRAPPED_RAW_RESPONSE",
      path: "booking.bookingResult.providerResponse.raw.Response.Response.FlightItinerary",
      itinerary: booking?.bookingResult?.providerResponse?.raw?.Response?.Response?.FlightItinerary,
    },
    {
      provider: "TBO_STANDARD_ALT",
      path: "booking.bookingResult.providerResponse.Response.FlightItinerary",
      itinerary: booking?.bookingResult?.providerResponse?.Response?.FlightItinerary,
    },
    {
      provider: "DIRECT_ITINERARY",
      path: "booking.bookingResult.FlightItinerary",
      itinerary: booking?.bookingResult?.FlightItinerary,
    },
    {
      provider: "LEGACY_STORAGE",
      path: "booking.providerResponse.FlightItinerary",
      itinerary: booking?.providerResponse?.FlightItinerary,
    },
    {
      provider: "TBO_ONWARD_RESPONSE",
      path: "booking.bookingResult.onwardResponse.raw.Response.Response.FlightItinerary",
      itinerary: booking?.bookingResult?.onwardResponse?.raw?.Response?.Response?.FlightItinerary,
    },
    {
      provider: "TBO_RETURN_RESPONSE",
      path: "booking.bookingResult.returnResponse.raw.Response.Response.FlightItinerary",
      itinerary: booking?.bookingResult?.returnResponse?.raw?.Response?.Response?.FlightItinerary,
    },
  ];

  const resolvedGroups = [];
  let chosenProvider = null;
  let chosenPath = null;
  let lastError = null;

  candidates.forEach((candidate) => {
    if (!candidate.itinerary) return;

    try {
      const { journeyGroups } = normalizeGroupedSegments(
        candidate.itinerary?.Segments || candidate.itinerary?.Segment || null,
        candidate.path,
        normalizeProviderSegment,
      );

      if (journeyGroups.length) {
        resolvedGroups.push(...journeyGroups);
        if (!chosenProvider) chosenProvider = candidate.provider;
        if (!chosenPath) chosenPath = candidate.path;
      }
    } catch (error) {
      lastError = error;
    }
  });

  if (!resolvedGroups.length) {
    if (lastError) throw lastError;
    return null;
  }

  return buildResolvedRoute({
    booking,
    itineraryPathUsed: chosenPath,
    provider: chosenProvider,
    journeyGroups: resolvedGroups,
    segments: resolvedGroups.flat(),
  });
};

const resolveFromStoredSegments = (booking = {}) => {
  const candidates = [
    {
      provider: "BOOKING_FLIGHT_REQUEST",
      path: "booking.flightRequest.segments",
      segments: booking?.flightRequest?.segments,
    },
    {
      provider: "BOOKING_SEGMENTS",
      path: "booking.segments",
      segments: booking?.segments,
    },
    {
      provider: "BOOKING_SNAPSHOT_SEGMENTS",
      path: "booking.bookingSnapshot.segments",
      segments: booking?.bookingSnapshot?.segments,
    },
  ];

  let lastError = null;

  for (const candidate of candidates) {
    if (!candidate.segments) continue;

    try {
      const { journeyGroups, segments } = normalizeGroupedSegments(
        candidate.segments,
        candidate.path,
        normalizeStoredSegment,
      );

      return buildResolvedRoute({
        booking,
        itineraryPathUsed: candidate.path,
        provider: candidate.provider,
        journeyGroups,
        segments,
      });
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) throw lastError;
  return null;
};

const resolveFromFallbackFields = (booking = {}) => {
  const origin = extractAirportCode(
    booking?.origin ||
      booking?.bookingSnapshot?.origin ||
      booking?.flightRequest?.origin ||
      booking?.flight?.origin ||
      null,
  );
  const destination = extractAirportCode(
    booking?.destination ||
      booking?.bookingSnapshot?.destination ||
      booking?.flightRequest?.destination ||
      booking?.flight?.destination ||
      null,
  );

  if (!origin || !destination) {
    return null;
  }

  const departureDate =
    toIsoDate(
      booking?.bookingSnapshot?.travelDate ||
        booking?.travelDate ||
        booking?.flightRequest?.departureDate ||
        null,
    ) || null;

  const fallbackSegment = {
    origin,
    destination,
    departureDate,
    departureTime: null,
  };

  return {
    journeyType:
      Number(booking?.journeyType) ||
      (booking?.bookingSnapshot?.returnDate ? 2 : 1),
    airlineCode: normalizeCode(booking?.airlineCode || null),
    airlineName: normalizeText(booking?.airlineName || booking?.bookingSnapshot?.airline || null),
    cabinClass: booking?.cabinClass || booking?.bookingSnapshot?.cabinClass || null,
    segments: [fallbackSegment],
    journeyGroups: [[fallbackSegment]],
    itineraryPathUsed: "booking fallback fields",
    provider: "BOOKING_FALLBACK",
    resolvedOrigin: origin,
    resolvedDestination: destination,
  };
};

const resolveReissueRoute = (booking = {}) => {
  const itineraryResolved = resolveFromItinerary(booking);
  if (itineraryResolved) return itineraryResolved;

  const storedResolved = resolveFromStoredSegments(booking);
  if (storedResolved) return storedResolved;

  const fallbackResolved = resolveFromFallbackFields(booking);
  if (fallbackResolved) return fallbackResolved;

  throw buildResolverError(
    "REISSUE_ROUTE_NOT_FOUND",
    "Original itinerary could not be resolved for offline reissue search.",
    {
      bookingId: booking?._id?.toString?.() || null,
    },
  );
};

module.exports = {
  resolveReissueRoute,
};
