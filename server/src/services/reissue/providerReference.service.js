"use strict";

const BookingRequest = require("../../models/BookingRequest");
const ApiError = require("../../utils/ApiError");
const logger = require("../../utils/logger");
const {
  resolveAirlineCode,
  resolvePnr,
  resolveSupplierBookingId,
  resolveTraceId,
} = require("../../utils/bookingResolver.util");
const {
  buildOriginalBookingSnapshot,
} = require("../../modules/servicing/reissue/utils/onlineReissueContext.util");

const normalizeText = (value) => {
  if (value === undefined || value === null) return null;
  if (typeof value === "object") return null;
  const normalized = String(value).trim();
  if (!normalized || normalized === "undefined" || normalized === "null") return null;
  return normalized;
};

const toArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.flat(Infinity).filter(Boolean);
  return [value].filter(Boolean);
};

const uniqueStrings = (values = []) =>
  Array.from(
    new Set(
      values
        .map((value) => normalizeText(value))
        .filter(Boolean),
    ),
  );

const toDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const buildSegmentProviderReferences = (segments = [], segmentReferences = { onward: [], return: [] }) => {
  const onward = toArray(segmentReferences?.onward);
  const inbound = toArray(segmentReferences?.return);
  const references = [...onward, ...inbound];

  return toArray(segments).map((segment, index) => ({
    ...segment,
    providerReferences: {
      segmentReference:
        normalizeText(segment?.providerReferences?.segmentReference) ||
        normalizeText(segment?.segmentReference) ||
        normalizeText(references[index]?.segmentReference),
      journeyReference:
        normalizeText(segment?.providerReferences?.journeyReference) ||
        normalizeText(segment?.journeyReference) ||
        normalizeText(references[index]?.journeyReference),
      origin:
        normalizeText(segment?.providerReferences?.origin) ||
        normalizeText(segment?.origin) ||
        normalizeText(references[index]?.origin),
      destination:
        normalizeText(segment?.providerReferences?.destination) ||
        normalizeText(segment?.destination) ||
        normalizeText(references[index]?.destination),
    },
  }));
};

const deriveSource = (value = {}, fallbackLabel = null) =>
  normalizeText(
    value?.source ||
      value?.providerName ||
      value?.supplierName ||
      value?.provider ||
      value?.supplier ||
      fallbackLabel,
  ) || null;

const toReferenceCandidate = (value = {}, label = null) => {
  if (!value || typeof value !== "object") return null;

  const providerReferences =
    value?.providerReferences && typeof value.providerReferences === "object"
      ? value.providerReferences
      : value;

  const providerBookingReference =
    normalizeText(
      providerReferences?.providerBookingReference ||
        providerReferences?.providerBookingId ||
        providerReferences?.bookingId ||
        value?.providerBookingReference ||
        value?.providerBookingId ||
        value?.bookingId,
    ) || null;
  const supplierBookingReference =
    normalizeText(
      providerReferences?.supplierBookingReference ||
        providerReferences?.supplierBookingId ||
        value?.supplierBookingReference ||
        value?.supplierBookingId,
    ) ||
    providerBookingReference;
  const pnr =
    normalizeText(providerReferences?.pnr || value?.pnr || value?.originalPnr || value?.activePnr) ||
    null;
  const traceId =
    normalizeText(providerReferences?.traceId || value?.traceId || value?.originalTraceId) || null;

  const ticketNumbers = uniqueStrings([
    ...toArray(providerReferences?.ticketNumbers),
    ...toArray(value?.ticketNumbers),
    ...toArray(value?.passengers).map((passenger) => passenger?.ticketNumber),
  ]);
  const ticketIds = uniqueStrings([
    ...toArray(providerReferences?.ticketIds),
    ...toArray(value?.ticketId),
    ...toArray(value?.ticketIds),
    ...toArray(value?.passengers).map((passenger) => passenger?.ticketId),
  ]);

  const candidate = {
    bookingId: providerBookingReference,
    providerBookingReference,
    supplierBookingReference,
    pnr,
    traceId,
    supplierLocator:
      normalizeText(providerReferences?.supplierLocator || value?.supplierLocator) || null,
    providerLocator:
      normalizeText(providerReferences?.providerLocator || value?.providerLocator) || null,
    ticketNumbers,
    ticketIds,
    reservationId:
      normalizeText(providerReferences?.reservationId || value?.reservationId) || null,
    source: deriveSource(providerReferences, deriveSource(value, label)),
    gdsPcc:
      normalizeText(
        providerReferences?.gdsPcc ||
          providerReferences?.PCC ||
          value?.gdsPcc ||
          value?.PCC,
      ) || null,
    validatingAirline:
      normalizeText(
        providerReferences?.validatingAirline ||
          value?.validatingAirline ||
          value?.airlineCode,
      ) || null,
    supplierName:
      normalizeText(providerReferences?.supplierName || value?.supplierName) || null,
    providerName:
      normalizeText(providerReferences?.providerName || value?.providerName) || null,
    resultIndex:
      providerReferences?.resultIndex ??
      value?.resultIndex ??
      null,
    segmentReferences: providerReferences?.segmentReferences || value?.segmentReferences || null,
    journeyReferences: providerReferences?.journeyReferences || value?.journeyReferences || null,
    createdAt:
      toDate(providerReferences?.createdAt) ||
      toDate(value?.capturedAt) ||
      toDate(value?.createdAt) ||
      null,
    _label: label || "unknown",
  };

  const hasValue = Object.entries(candidate).some(([key, item]) => {
    if (key.startsWith("_")) return false;
    if (Array.isArray(item)) return item.length > 0;
    return item !== null && item !== undefined;
  });

  return hasValue ? candidate : null;
};

const mergeCandidates = (candidates = []) => {
  const resolved = {
    bookingId: null,
    providerBookingReference: null,
    supplierBookingReference: null,
    pnr: null,
    traceId: null,
    supplierLocator: null,
    providerLocator: null,
    ticketNumbers: [],
    ticketIds: [],
    reservationId: null,
    source: null,
    gdsPcc: null,
    validatingAirline: null,
    supplierName: null,
    providerName: null,
    resultIndex: null,
    segmentReferences: null,
    journeyReferences: null,
    createdAt: null,
    resolutionPath: [],
  };

  for (const candidate of candidates.filter(Boolean)) {
    resolved.resolutionPath.push(candidate._label);
    if (!resolved.bookingId && candidate.bookingId) {
      resolved.bookingId = candidate.bookingId;
    }
    if (!resolved.providerBookingReference && candidate.providerBookingReference) {
      resolved.providerBookingReference = candidate.providerBookingReference;
    }
    if (!resolved.supplierBookingReference && candidate.supplierBookingReference) {
      resolved.supplierBookingReference = candidate.supplierBookingReference;
    }
    if (!resolved.pnr && candidate.pnr) {
      resolved.pnr = candidate.pnr;
    }
    if (!resolved.traceId && candidate.traceId) {
      resolved.traceId = candidate.traceId;
    }
    if (!resolved.supplierLocator && candidate.supplierLocator) {
      resolved.supplierLocator = candidate.supplierLocator;
    }
    if (!resolved.providerLocator && candidate.providerLocator) {
      resolved.providerLocator = candidate.providerLocator;
    }
    if (!resolved.reservationId && candidate.reservationId) {
      resolved.reservationId = candidate.reservationId;
    }
    if (!resolved.source && candidate.source) {
      resolved.source = candidate.source;
    }
    if (!resolved.gdsPcc && candidate.gdsPcc) {
      resolved.gdsPcc = candidate.gdsPcc;
    }
    if (!resolved.validatingAirline && candidate.validatingAirline) {
      resolved.validatingAirline = candidate.validatingAirline;
    }
    if (!resolved.supplierName && candidate.supplierName) {
      resolved.supplierName = candidate.supplierName;
    }
    if (!resolved.providerName && candidate.providerName) {
      resolved.providerName = candidate.providerName;
    }
    if (resolved.resultIndex == null && candidate.resultIndex != null) {
      resolved.resultIndex = candidate.resultIndex;
    }
    if (!resolved.segmentReferences && candidate.segmentReferences) {
      resolved.segmentReferences = candidate.segmentReferences;
    }
    if (!resolved.journeyReferences && candidate.journeyReferences) {
      resolved.journeyReferences = candidate.journeyReferences;
    }
    if (!resolved.createdAt && candidate.createdAt) {
      resolved.createdAt = candidate.createdAt;
    }
    resolved.ticketNumbers = uniqueStrings([...resolved.ticketNumbers, ...candidate.ticketNumbers]);
    resolved.ticketIds = uniqueStrings([...resolved.ticketIds, ...candidate.ticketIds]);
  }

  resolved.providerBookingReference =
    resolved.providerBookingReference || resolved.bookingId || resolved.supplierBookingReference;
  resolved.supplierBookingReference =
    resolved.supplierBookingReference || resolved.providerBookingReference;
  resolved.bookingId =
    resolved.bookingId || resolved.providerBookingReference || resolved.supplierBookingReference;
  resolved.createdAt = resolved.createdAt || new Date();

  if (!resolved.source && resolved.resolutionPath.length) {
    resolved.source = resolved.resolutionPath[0];
  }

  return resolved;
};

class ProviderReferenceService {
  buildProviderReferencesFromBooking(booking = {}) {
    const snapshot = buildOriginalBookingSnapshot(booking);
    const candidate = toReferenceCandidate(
      {
        ...snapshot,
        providerReferences: snapshot?.providerReferences,
        validatingAirline:
          resolveAirlineCode(booking) ||
          snapshot?.segments?.[0]?.airlineCode ||
          booking?.bookingSnapshot?.airline ||
          null,
        source:
          booking?.flightRequest?.source ||
          booking?.bookingSnapshot?.providerReferences?.source ||
          booking?.metadata?.source ||
          null,
        providerName:
          booking?.bookingSnapshot?.providerReferences?.providerName ||
          booking?.metadata?.providerName ||
          "TBO",
        supplierName:
          booking?.bookingSnapshot?.providerReferences?.supplierName ||
          booking?.metadata?.supplierName ||
          "TBO",
      },
      "bookingSnapshot.reconstructed",
    );

    return mergeCandidates([
      candidate,
      toReferenceCandidate(booking?.bookingSnapshot?.providerReferences, "bookingSnapshot.providerReferences"),
      toReferenceCandidate(booking?.originalBookingSnapshot, "originalBookingSnapshot"),
      toReferenceCandidate(booking?.metadata?.providerReferences, "metadata.providerReferences"),
      toReferenceCandidate(
        {
          providerBookingReference: resolveSupplierBookingId(booking),
          supplierBookingReference: resolveSupplierBookingId(booking),
          pnr: resolvePnr(booking),
          traceId: resolveTraceId(booking),
          validatingAirline: resolveAirlineCode(booking),
          ticketNumbers: toArray(booking?.bookingResult?.ticketNumbers),
          source: booking?.flightRequest?.source || null,
          providerName: "TBO",
          supplierName: "TBO",
        },
        "bookingResolver",
      ),
    ]);
  }

  async backfillProviderReferences(booking, options = {}) {
    const { save = true } = options;
    if (!booking || typeof booking !== "object") return null;

    const reconstructed = this.buildProviderReferencesFromBooking(booking);
    if (!reconstructed?.providerBookingReference || !reconstructed?.pnr) {
      return null;
    }

    const snapshot =
      booking?.originalBookingSnapshot && typeof booking.originalBookingSnapshot === "object"
        ? booking.originalBookingSnapshot
        : buildOriginalBookingSnapshot(booking);

    const segmentReferences =
      reconstructed.segmentReferences || snapshot?.providerReferences?.segmentReferences || null;
    const journeyReferences =
      reconstructed.journeyReferences ||
      snapshot?.providerReferences?.journeyReferences || {
        outbound: toArray(segmentReferences?.onward),
        inbound: toArray(segmentReferences?.return),
      };

    const providerReferences = {
      ...snapshot?.providerReferences,
      ...reconstructed,
      segmentReferences,
      journeyReferences,
    };

    booking.originalBookingSnapshot = {
      ...(booking.originalBookingSnapshot || {}),
      ...snapshot,
      bookingId:
        normalizeText(snapshot?.bookingId) ||
        normalizeText(booking?.bookingReference) ||
        booking?._id?.toString?.() ||
        null,
      pnr: providerReferences.pnr,
      supplierBookingReference: providerReferences.supplierBookingReference,
      providerBookingReference: providerReferences.providerBookingReference,
      traceId: providerReferences.traceId,
      ticketData:
        booking?.ticketData ||
        snapshot?.ticketData ||
        booking?.bookingSnapshot?.ticketData ||
        null,
      providerReferences,
      segments: buildSegmentProviderReferences(snapshot?.segments, providerReferences.segmentReferences),
      onwardSegments: buildSegmentProviderReferences(
        snapshot?.onwardSegments,
        { onward: toArray(providerReferences.segmentReferences?.onward) },
      ),
      returnSegments: buildSegmentProviderReferences(
        snapshot?.returnSegments,
        { return: toArray(providerReferences.segmentReferences?.return) },
      ),
      capturedAt: snapshot?.capturedAt || new Date(),
    };

    booking.bookingSnapshot = booking.bookingSnapshot || {};
    booking.bookingSnapshot.providerReferences = providerReferences;
    booking.bookingSnapshot.pnr =
      booking.bookingSnapshot.pnr || providerReferences.pnr;
    booking.bookingSnapshot.ticketData =
      booking.bookingSnapshot.ticketData ||
      booking.ticketData ||
      booking.originalBookingSnapshot?.ticketData ||
      null;

    if (booking?.flightRequest && Array.isArray(booking.flightRequest.segments)) {
      booking.flightRequest.segments = buildSegmentProviderReferences(
        booking.flightRequest.segments,
        providerReferences.segmentReferences,
      );
    }

    booking.ticketData =
      booking.ticketData ||
      booking.originalBookingSnapshot?.ticketData ||
      booking.bookingSnapshot?.ticketData ||
      null;

    if (save && typeof booking.save === "function") {
      await booking.save();
    }

    return providerReferences;
  }

  async resolveProviderReferences(options = {}) {
    const {
      request = null,
      booking = null,
      originalBooking = null,
      importedBooking = null,
      throwOnMissing = true,
      saveBackfilledBooking = true,
    } = options;

    let workingBooking = booking || originalBooking || null;
    let hydratedReferences = null;
    if (workingBooking) {
      hydratedReferences = await this.backfillProviderReferences(workingBooking, {
        save: saveBackfilledBooking,
      });
    }

    const bookingSource = originalBooking && originalBooking !== workingBooking
      ? originalBooking
      : workingBooking;

    const candidates = [
      toReferenceCandidate(
        {
          providerBookingReference: request?.bookingLineage?.activeBookingId,
          supplierBookingReference: request?.bookingLineage?.activeBookingId,
          bookingId: request?.bookingLineage?.activeBookingId,
          pnr: request?.bookingLineage?.activePnr,
          traceId: request?.metadata?.searchTraceId || request?.metadata?.originalTraceId,
          source: "bookingLineage",
        },
        "request.bookingLineage.active",
      ),
      toReferenceCandidate(request?.bookingSnapshot?.providerReferences, "request.bookingSnapshot.providerReferences"),
      toReferenceCandidate(request?.metadata?.providerReferences, "request.metadata.providerReferences"),
      toReferenceCandidate(request?.originalBookingSnapshot, "request.originalBookingSnapshot"),
      toReferenceCandidate(hydratedReferences, "booking.backfillProviderReferences"),
      toReferenceCandidate(bookingSource?.bookingSnapshot?.providerReferences, "booking.bookingSnapshot.providerReferences"),
      toReferenceCandidate(bookingSource?.originalBookingSnapshot, "booking.originalBookingSnapshot"),
      toReferenceCandidate(bookingSource?.metadata?.providerReferences, "booking.metadata.providerReferences"),
      toReferenceCandidate(importedBooking?.providerReferences, "importedBooking.providerReferences"),
      toReferenceCandidate(importedBooking, "importedBooking"),
    ].filter(Boolean);

    const resolved = mergeCandidates(candidates);
    const missingFields = [];

    if (!resolved.providerBookingReference) {
      missingFields.push("providerBookingReference");
    }
    if (!resolved.supplierBookingReference) {
      missingFields.push("supplierBookingReference");
    }
    if (!resolved.pnr) {
      missingFields.push("pnr");
    }
    if (!resolved.traceId) {
      missingFields.push("traceId");
    }

    const logPayload = {
      bookingId:
        workingBooking?._id?.toString?.() ||
        request?.bookingId?.toString?.() ||
        request?.bookingId ||
        null,
      pnr: resolved.pnr,
      providerBookingReference: resolved.providerBookingReference,
      supplierBookingReference: resolved.supplierBookingReference,
      resolutionPath: resolved.resolutionPath,
      missingFields,
    };

    if (missingFields.length) {
      logger.warn("ONLINE_REISSUE_REFERENCE_RESOLUTION", {
        ...logPayload,
        status: "INCOMPLETE",
      });

      if (throwOnMissing) {
        const error = new ApiError(
          422,
          `Provider references are incomplete. Missing: ${missingFields.join(", ")}`,
        );
        error.code = "ONLINE_REISSUE_REFERENCE_RESOLUTION_FAILED";
        error.details = {
          missingFields,
          resolutionPath: resolved.resolutionPath,
        };
        throw error;
      }
    } else {
      logger.info("ONLINE_REISSUE_REFERENCE_RESOLUTION", {
        ...logPayload,
        status: "RESOLVED",
      });
    }

    return {
      ...resolved,
      missingFields,
      isResolved: missingFields.length === 0,
    };
  }

  async loadOriginalBookingForRequest(request = {}) {
    const mongoBookingId =
      request?.bookingId?._id?.toString?.() ||
      request?.bookingId?.toString?.() ||
      null;
    if (!mongoBookingId) return null;
    return BookingRequest.findById(mongoBookingId);
  }
}

module.exports = new ProviderReferenceService();
