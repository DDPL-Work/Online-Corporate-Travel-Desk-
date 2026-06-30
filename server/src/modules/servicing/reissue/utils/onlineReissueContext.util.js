"use strict";

const {
  resolvePnr,
  resolveSupplierBookingId,
  resolveTraceId,
} = require("../../../../utils/bookingResolver.util");

const toArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.flat(Infinity).filter(Boolean);
  return [value].filter(Boolean);
};

const normalizeText = (value) => {
  if (value === undefined || value === null) return null;
  if (typeof value === "object") return null;
  const normalized = String(value).trim();
  if (!normalized || normalized === "undefined" || normalized === "null") return null;
  return normalized;
};

const pickCandidate = (candidates = []) => {
  for (const candidate of candidates) {
    const value = normalizeText(candidate?.value);
    if (value) {
      return {
        value,
        source: candidate?.source || "unknown",
      };
    }
  }

  return {
    value: null,
    source: null,
  };
};

const normalizeJourneyLabel = (value, fallback = "onward") => {
  const normalized = String(value || fallback).trim().toLowerCase();
  if (["return", "inbound", "2", "way2"].includes(normalized)) return "return";
  return "onward";
};

const inferJourneyTypeFromSegments = (onwardSegments = [], returnSegments = []) => {
  if (returnSegments.length) return 2;
  if (onwardSegments.length > 1) return 3;
  return 1;
};

const extractAirportCode = (value) => {
  if (!value) return null;

  if (typeof value === "string") {
    return normalizeText(value)?.toUpperCase() || null;
  }

  if (typeof value === "object") {
    const nested =
      value?.Airport?.AirportCode ||
      value?.Airport?.Code ||
      value?.AirportCode ||
      value?.airportCode ||
      value?.Code ||
      value?.code ||
      value?.airport ||
      null;
    return normalizeText(nested)?.toUpperCase() || null;
  }

  return null;
};

const normalizeProviderSegment = (segment = {}, fallback = {}) => {
  const journeyType = normalizeJourneyLabel(
    segment?.journeyType ||
      segment?.JourneyType ||
      segment?.journeyRef ||
      fallback.journeyType,
    fallback.journeyType || "onward",
  );

  return {
    origin:
      extractAirportCode(segment?.origin) ||
      extractAirportCode(segment?.Origin) ||
      extractAirportCode(segment?.originAirport) ||
      extractAirportCode(fallback.origin) ||
      null,
    destination:
      extractAirportCode(segment?.destination) ||
      extractAirportCode(segment?.Destination) ||
      extractAirportCode(segment?.destinationAirport) ||
      extractAirportCode(fallback.destination) ||
      null,
    departureTime:
      segment?.departureTime ||
      segment?.departureDateTime ||
      segment?.Origin?.DepTime ||
      fallback.departureTime ||
      null,
    arrivalTime:
      segment?.arrivalTime ||
      segment?.arrivalDateTime ||
      segment?.Destination?.ArrTime ||
      fallback.arrivalTime ||
      null,
    airlineCode:
      normalizeText(
        segment?.airlineCode ||
          segment?.Airline?.AirlineCode ||
          segment?.OperatingCarrier?.AirlineCode ||
          fallback.airlineCode,
      ) || null,
    airlineName:
      normalizeText(
        segment?.airlineName ||
          segment?.Airline?.AirlineName ||
          fallback.airlineName,
      ) || null,
    flightNumber:
      normalizeText(
        segment?.flightNumber ||
          segment?.Airline?.FlightNumber ||
          segment?.FlightNumber ||
          fallback.flightNumber,
      ) || null,
    cabinClass:
      normalizeText(segment?.cabinClass || segment?.CabinClass || fallback.cabinClass) ||
      "Economy",
    baggage:
      normalizeText(segment?.baggage || segment?.Baggage || fallback.baggage) || null,
    journeyType,
    segmentReference:
      normalizeText(
        segment?.segmentReference ||
          segment?.SegmentReference ||
          segment?.SegmentIndicator ||
          segment?.SegmentId ||
          segment?.SegmentRef,
      ) || null,
    journeyReference:
      normalizeText(
        segment?.journeyReference ||
          segment?.JourneyReference ||
          segment?.GroupIndex,
      ) || journeyType,
  };
};

const extractSegmentsFromGroupedProviderResponse = (providerRoot, journeyType = "onward") =>
  toArray(providerRoot?.FlightItinerary?.Segments || providerRoot?.Segments || []).map((segment) =>
    normalizeProviderSegment(segment, { journeyType }),
  );

const extractRequestSegments = (booking = {}) =>
  toArray(
    booking?.originalBookingSnapshot?.segments ||
      booking?.flightRequest?.segments ||
      booking?.activeTicketSnapshot?.segments ||
      [],
  ).map((segment) => normalizeProviderSegment(segment));

const extractProviderPassengers = (booking = {}) => {
  const roots = [
    booking?.bookingResult?.providerResponse?.raw?.Response?.Response,
    booking?.bookingResult?.providerResponse?.raw?.Response,
    booking?.bookingResult?.providerResponse?.Response?.Response,
    booking?.bookingResult?.providerResponse?.Response,
    booking?.bookingResult?.onwardResponse?.raw?.Response?.Response,
    booking?.bookingResult?.onwardResponse?.raw?.Response,
    booking?.bookingResult?.returnResponse?.raw?.Response?.Response,
    booking?.bookingResult?.returnResponse?.raw?.Response,
  ].filter(Boolean);

  return roots.flatMap((root) => toArray(root?.FlightItinerary?.Passenger || root?.Passenger || []));
};

const normalizePassenger = (passenger = {}, fallback = {}) => ({
  firstName: normalizeText(passenger?.FirstName || passenger?.firstName || fallback.firstName) || null,
  lastName: normalizeText(passenger?.LastName || passenger?.lastName || fallback.lastName) || null,
  title: normalizeText(passenger?.Title || passenger?.title || fallback.title) || null,
  paxType:
    normalizeText(
      passenger?.PaxType ||
        passenger?.PassengerType ||
        passenger?.Type ||
        fallback.paxType,
    ) || null,
  ticketId:
    normalizeText(
      passenger?.Ticket?.TicketId ||
        passenger?.ticket?.ticketId ||
        passenger?.TicketId ||
        fallback.ticketId,
    ) || null,
  ticketNumber:
    normalizeText(
      passenger?.Ticket?.TicketNumber ||
        passenger?.ticket?.ticketNumber ||
        passenger?.TicketNumber ||
        fallback.ticketNumber,
    ) || null,
  paxId:
    normalizeText(passenger?.PaxId || passenger?.paxId || fallback.paxId) || null,
});

const resolveTicketData = (booking = {}) => {
  const candidates = [
    booking?.ticketData,
    booking?.originalBookingSnapshot?.ticketData,
    booking?.activeTicketSnapshot?.ticketData,
    booking?.bookingResult?.ticketData,
    booking?.bookingResult?.providerResponse?.ticketResponse?.Response?.Response?.TicketData,
    booking?.bookingResult?.providerResponse?.ticketResponse?.Response?.TicketData,
    booking?.bookingResult?.providerResponse?.ticketResponse?.Response?.Response?.FlightItinerary?.Ticket,
    booking?.bookingResult?.providerResponse?.raw?.Response?.Response?.FlightItinerary?.Ticket,
    booking?.bookingResult?.providerResponse?.Response?.Response?.FlightItinerary?.Ticket,
    booking?.bookingResult?.onwardResponse?.raw?.Response?.Response?.FlightItinerary?.Ticket,
    booking?.bookingResult?.returnResponse?.raw?.Response?.Response?.FlightItinerary?.Ticket,
  ];

  return candidates.find((item) => item && typeof item === "object") || null;
};

const resolveCorporateFareContext = (booking = {}, ticketData = {}) => ({
  pcc:
    normalizeText(
      booking?.bookingSnapshot?.providerReferences?.PCC ||
        booking?.metadata?.PCC ||
        booking?.flightRequest?.PCC ||
        ticketData?.PCC,
    ) || null,
  corporateCode:
    normalizeText(
      ticketData?.CorporateCode ||
        booking?.corporateCode ||
        booking?.metadata?.CorporateCode ||
        booking?.flightRequest?.CorporateCode,
    ) || null,
  corporateCodes:
    toArray(
      booking?.metadata?.CorporateCodes ||
        booking?.flightRequest?.CorporateCodes ||
        ticketData?.CorporateCodes,
    ),
  agentDealCode:
    normalizeText(
      ticketData?.AgentDealCode ||
        booking?.metadata?.AgentDealCode ||
        booking?.flightRequest?.AgentDealCode,
    ) || null,
  tourCode: normalizeText(ticketData?.TourCode) || null,
  endorsement: normalizeText(ticketData?.Endorsement) || null,
  airlineMappings:
    booking?.metadata?.AirlineCorporateMappings ||
    booking?.flightRequest?.AirlineCorporateMappings ||
    null,
});

const resolveProviderReferences = ({
  booking = {},
  supplierBookingReference = null,
  providerBookingReference = null,
  pnr = null,
  traceId = null,
  resultIndex = null,
  passengers = [],
  splitSegments = { onwardSegments: [], returnSegments: [] },
} = {}) => {
  const activeSnapshot = booking?.activeTicketSnapshot || {};
  const originalSnapshot = booking?.originalBookingSnapshot || {};
  const bookingSnapshotRefs = booking?.bookingSnapshot?.providerReferences || {};
  const metadataRefs = booking?.metadata?.providerReferences || {};
  const lineage = booking?.bookingLineage || {};
  const source =
    normalizeText(
      bookingSnapshotRefs?.source ||
        metadataRefs?.source ||
        booking?.flightRequest?.source,
    ) || null;
  const resolvedProviderBookingReference =
    normalizeText(
      providerBookingReference ||
        lineage?.activeBookingId ||
        bookingSnapshotRefs?.providerBookingReference ||
        metadataRefs?.providerBookingReference ||
        originalSnapshot?.providerReferences?.providerBookingReference ||
        activeSnapshot?.providerReferences?.providerBookingReference,
    ) || null;
  const finalSupplierBookingReference =
    normalizeText(
      supplierBookingReference ||
        bookingSnapshotRefs?.supplierBookingReference ||
        metadataRefs?.supplierBookingReference ||
        originalSnapshot?.providerReferences?.supplierBookingReference ||
        activeSnapshot?.providerReferences?.supplierBookingReference,
    ) ||
    resolvedProviderBookingReference;
  const finalPnr =
    normalizeText(
      pnr ||
        lineage?.activePnr ||
        bookingSnapshotRefs?.pnr ||
        metadataRefs?.pnr ||
        originalSnapshot?.providerReferences?.pnr ||
        activeSnapshot?.providerReferences?.pnr,
    ) || null;
  const finalTraceId =
    normalizeText(
      traceId ||
        bookingSnapshotRefs?.traceId ||
        metadataRefs?.traceId ||
        originalSnapshot?.providerReferences?.traceId ||
        activeSnapshot?.providerReferences?.traceId,
    ) || null;
  const ticketNumbers = Array.from(
    new Set(
      passengers
        .map((passenger) => normalizeText(passenger?.ticketNumber))
        .filter(Boolean),
    ),
  );

  return {
    bookingId: resolvedProviderBookingReference,
    supplierBookingReference: finalSupplierBookingReference,
    providerBookingReference: resolvedProviderBookingReference,
    pnr: finalPnr,
    traceId: finalTraceId,
    resultIndex:
      resultIndex ??
      bookingSnapshotRefs?.resultIndex ??
      metadataRefs?.resultIndex ??
      originalSnapshot?.providerReferences?.resultIndex ??
      activeSnapshot?.providerReferences?.resultIndex ??
      null,
    supplierLocator:
      normalizeText(
        metadataRefs?.supplierLocator ||
          booking?.metadata?.supplierLocator ||
          bookingSnapshotRefs?.supplierLocator,
      ) || null,
    providerLocator:
      normalizeText(
        metadataRefs?.providerLocator ||
          booking?.metadata?.providerLocator ||
          bookingSnapshotRefs?.providerLocator,
      ) || null,
    reservationId:
      normalizeText(
        bookingSnapshotRefs?.reservationId ||
          metadataRefs?.reservationId ||
          booking?.metadata?.reservationId,
      ) || null,
    source,
    gdsPcc:
      normalizeText(
        bookingSnapshotRefs?.gdsPcc ||
          bookingSnapshotRefs?.PCC ||
          metadataRefs?.gdsPcc ||
          booking?.metadata?.PCC,
      ) || null,
    validatingAirline:
      normalizeText(
        bookingSnapshotRefs?.validatingAirline ||
          metadataRefs?.validatingAirline ||
          splitSegments?.onwardSegments?.[0]?.airlineCode ||
          splitSegments?.returnSegments?.[0]?.airlineCode,
      ) || null,
    supplierName:
      normalizeText(
        bookingSnapshotRefs?.supplierName ||
          metadataRefs?.supplierName ||
          booking?.metadata?.supplierName,
      ) || null,
    providerName:
      normalizeText(
        bookingSnapshotRefs?.providerName ||
          metadataRefs?.providerName ||
          booking?.metadata?.providerName,
      ) || null,
    segmentReferences: {
      onward: splitSegments.onwardSegments.map((segment) => ({
        segmentReference: segment?.segmentReference || null,
        journeyReference: segment?.journeyReference || null,
        origin: segment?.origin || null,
        destination: segment?.destination || null,
      })),
      return: splitSegments.returnSegments.map((segment) => ({
        segmentReference: segment?.segmentReference || null,
        journeyReference: segment?.journeyReference || null,
        origin: segment?.origin || null,
        destination: segment?.destination || null,
      })),
    },
    journeyReferences: {
      outbound: splitSegments.onwardSegments.map((segment) => ({
        journeyReference: segment?.journeyReference || null,
        segmentReference: segment?.segmentReference || null,
      })),
      inbound: splitSegments.returnSegments.map((segment) => ({
        journeyReference: segment?.journeyReference || null,
        segmentReference: segment?.segmentReference || null,
      })),
    },
    ticketIds: Array.from(
      new Set(
        passengers
          .map((passenger) => normalizeText(passenger?.ticketId))
        .filter(Boolean),
      ),
    ),
    ticketNumbers,
    createdAt:
      originalSnapshot?.providerReferences?.createdAt ||
      activeSnapshot?.providerReferences?.createdAt ||
      new Date(),
  };
};

const splitSegmentsByJourney = (segments = [], booking = {}) => {
  const normalizedSegments = toArray(segments)
    .map((segment) => normalizeProviderSegment(segment))
    .filter((segment) => segment.origin && segment.destination);

  const onwardSegments = normalizedSegments.filter(
    (segment) => normalizeJourneyLabel(segment.journeyType) !== "return",
  );
  const returnSegments = normalizedSegments.filter(
    (segment) => normalizeJourneyLabel(segment.journeyType) === "return",
  );

  if (onwardSegments.length || returnSegments.length) {
    return { onwardSegments, returnSegments };
  }

  const groupedOnward = extractSegmentsFromGroupedProviderResponse(
    booking?.bookingResult?.onwardResponse?.raw?.Response?.Response ||
      booking?.bookingResult?.onwardResponse?.raw?.Response,
    "onward",
  );
  const groupedReturn = extractSegmentsFromGroupedProviderResponse(
    booking?.bookingResult?.returnResponse?.raw?.Response?.Response ||
      booking?.bookingResult?.returnResponse?.raw?.Response,
    "return",
  );

  return {
    onwardSegments: groupedOnward,
    returnSegments: groupedReturn,
  };
};

const buildOriginalBookingSnapshot = (booking = {}, overrides = {}) => {
  const providerBookingReference = pickCandidate([
    {
      value: overrides.providerBookingReference,
      source: "override.providerBookingReference",
    },
    {
      value: booking?.originalBookingSnapshot?.providerBookingReference,
      source: "originalBookingSnapshot.providerBookingReference",
    },
    {
      value: booking?.activeTicketSnapshot?.providerBookingReference,
      source: "activeTicketSnapshot.providerBookingReference",
    },
    {
      value: booking?.bookingResult?.providerBookingId,
      source: "bookingResult.providerBookingId",
    },
    {
      value: resolveSupplierBookingId(booking),
      source: "resolveSupplierBookingId",
    },
    {
      value: booking?.metadata?.providerBookingReference,
      source: "metadata.providerBookingReference",
    },
  ]);

  const supplierBookingReference = pickCandidate([
    {
      value: overrides.supplierBookingReference,
      source: "override.supplierBookingReference",
    },
    {
      value: booking?.originalBookingSnapshot?.supplierBookingReference,
      source: "originalBookingSnapshot.supplierBookingReference",
    },
    {
      value: booking?.activeTicketSnapshot?.supplierBookingReference,
      source: "activeTicketSnapshot.supplierBookingReference",
    },
    {
      value:
        booking?.bookingResult?.providerResponse?.raw?.Response?.Response?.SupplierBookingReference,
      source: "bookingResult.providerResponse.raw.Response.Response.SupplierBookingReference",
    },
    {
      value:
        booking?.bookingResult?.providerResponse?.raw?.Response?.SupplierBookingReference,
      source: "bookingResult.providerResponse.raw.Response.SupplierBookingReference",
    },
    {
      value:
        booking?.bookingResult?.onwardResponse?.raw?.Response?.Response?.SupplierBookingReference,
      source: "bookingResult.onwardResponse.raw.Response.Response.SupplierBookingReference",
    },
    {
      value:
        booking?.bookingResult?.returnResponse?.raw?.Response?.Response?.SupplierBookingReference,
      source: "bookingResult.returnResponse.raw.Response.Response.SupplierBookingReference",
    },
    {
      value: booking?.ticketData?.SupplierBookingReference,
      source: "ticketData.SupplierBookingReference",
    },
    {
      value: booking?.metadata?.supplierBookingReference,
      source: "metadata.supplierBookingReference",
    },
    {
      value: providerBookingReference.value,
      source: providerBookingReference.source,
    },
  ]);

  const pnr = pickCandidate([
    {
      value: overrides.pnr,
      source: "override.pnr",
    },
    {
      value: booking?.originalBookingSnapshot?.pnr,
      source: "originalBookingSnapshot.pnr",
    },
    {
      value: booking?.activeTicketSnapshot?.pnr,
      source: "activeTicketSnapshot.pnr",
    },
    {
      value: resolvePnr(booking),
      source: "resolvePnr",
    },
    {
      value: booking?.metadata?.pnr,
      source: "metadata.pnr",
    },
  ]);

  const traceId = pickCandidate([
    {
      value: overrides.traceId,
      source: "override.traceId",
    },
    {
      value: booking?.originalBookingSnapshot?.traceId,
      source: "originalBookingSnapshot.traceId",
    },
    {
      value: booking?.activeTicketSnapshot?.traceId,
      source: "activeTicketSnapshot.traceId",
    },
    {
      value: resolveTraceId(booking),
      source: "resolveTraceId",
    },
    {
      value: booking?.traceData?.traceId,
      source: "traceData.traceId",
    },
    {
      value: booking?.metadata?.traceId,
      source: "metadata.traceId",
    },
  ]);

  const resultIndex =
    overrides.resultIndex ??
    booking?.originalBookingSnapshot?.resultIndex ??
    booking?.activeTicketSnapshot?.resultIndex ??
    booking?.flightRequest?.resultIndex ??
    booking?.metadata?.resultIndex ??
    null;

  const requestSegments = extractRequestSegments(booking);
  const splitSegments = splitSegmentsByJourney(requestSegments, booking);
  const allSegments = [...splitSegments.onwardSegments, ...splitSegments.returnSegments];

  const bookingPassengers = toArray(booking?.travellers || booking?.passengers || []).map(
    (traveller) =>
      normalizePassenger(traveller, {
        firstName: traveller?.firstName,
        lastName: traveller?.lastName,
        title: traveller?.title,
        paxType: traveller?.paxType,
      }),
  );
  const providerPassengers = extractProviderPassengers(booking).map((passenger) =>
    normalizePassenger(passenger),
  );

  const passengers =
    providerPassengers.length >= bookingPassengers.length ? providerPassengers : bookingPassengers;
  const ticketIds = Array.from(
    new Set(
      passengers
        .map((passenger) => normalizeText(passenger?.ticketId))
        .filter(Boolean),
    ),
  );
  const ticketData = resolveTicketData(booking);
  const corporateFareContext = resolveCorporateFareContext(booking, ticketData || {});
  const providerReferences = resolveProviderReferences({
    booking,
    supplierBookingReference: supplierBookingReference.value,
    providerBookingReference: providerBookingReference.value,
    pnr: pnr.value,
    traceId: traceId.value,
    resultIndex,
    passengers,
    splitSegments,
  });

  return {
    bookingId:
      normalizeText(
        overrides.bookingId ||
          booking?._id?.toString?.() ||
          booking?.bookingId ||
          booking?.bookingReference,
      ) || null,
    pnr: pnr.value,
    supplierBookingReference: supplierBookingReference.value,
    providerBookingReference: providerBookingReference.value,
    traceId: traceId.value,
    resultIndex,
    ticketId: ticketIds,
    ticketData,
    providerReferences,
    corporateFareContext,
    journeyType:
      overrides.journeyType || inferJourneyTypeFromSegments(splitSegments.onwardSegments, splitSegments.returnSegments),
    segments: allSegments,
    onwardSegments: splitSegments.onwardSegments,
    returnSegments: splitSegments.returnSegments,
    passengers,
    capturedAt: new Date(),
    metadata: {
      sources: {
        pnr: pnr.source,
        supplierBookingReference: supplierBookingReference.source,
        providerBookingReference: providerBookingReference.source,
        traceId: traceId.source,
      },
    },
  };
};

const buildOnlineReissueContext = (booking = {}, overrides = {}) => {
  const originalBookingSnapshot =
    overrides.originalBookingSnapshot ||
    booking?.originalBookingSnapshot ||
    buildOriginalBookingSnapshot(booking, overrides);
  const providerReferences =
    originalBookingSnapshot?.providerReferences ||
    {
      supplierBookingReference:
        originalBookingSnapshot?.supplierBookingReference ||
        originalBookingSnapshot?.providerBookingReference ||
        null,
      providerBookingReference: originalBookingSnapshot?.providerBookingReference || null,
      pnr: originalBookingSnapshot?.pnr || null,
      traceId: originalBookingSnapshot?.traceId || null,
      resultIndex: originalBookingSnapshot?.resultIndex ?? null,
      ticketIds: toArray(originalBookingSnapshot?.ticketId).map((item) => String(item)),
      ticketNumbers: [],
    };

  return {
    originalBookingId:
      normalizeText(
        overrides.originalBookingId ||
          booking?._id?.toString?.() ||
          originalBookingSnapshot?.bookingId,
      ) || null,
    requestedBookingId:
      normalizeText(overrides.requestedBookingId || booking?._id?.toString?.()) || null,
    originalPnr: originalBookingSnapshot?.pnr || null,
    supplierBookingReference:
      originalBookingSnapshot?.supplierBookingReference ||
      originalBookingSnapshot?.providerBookingReference ||
      null,
    providerBookingReference: originalBookingSnapshot?.providerBookingReference || null,
    providerReferences,
    corporateFareContext: originalBookingSnapshot?.corporateFareContext || null,
    traceId: originalBookingSnapshot?.traceId || null,
    resultIndex: originalBookingSnapshot?.resultIndex ?? null,
    journeyType: originalBookingSnapshot?.journeyType || 1,
    onwardSegments: originalBookingSnapshot?.onwardSegments || [],
    returnSegments: originalBookingSnapshot?.returnSegments || [],
    passengers: originalBookingSnapshot?.passengers || [],
    ticketIds: toArray(originalBookingSnapshot?.ticketId).map((item) => String(item)),
    ticketData: originalBookingSnapshot?.ticketData || null,
    originalBookingSnapshot,
  };
};

const validateOnlineReissueContext = (context = {}) => {
  const missingFields = [];

  if (!normalizeText(context?.providerBookingReference)) {
    missingFields.push("providerBookingReference");
  }

  if (!normalizeText(context?.originalPnr)) {
    missingFields.push("originalPnr");
  }

  if (!normalizeText(context?.supplierBookingReference)) {
    missingFields.push("supplierBookingReference");
  }

  if (!normalizeText(context?.traceId)) {
    missingFields.push("traceId");
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
};

module.exports = {
  buildOriginalBookingSnapshot,
  buildOnlineReissueContext,
  validateOnlineReissueContext,
  normalizeProviderSegment,
  inferJourneyTypeFromSegments,
};
