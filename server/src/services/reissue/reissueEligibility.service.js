"use strict";

const logger = require("../../utils/logger");
const {
  REISSUE_MODES,
  SUPPORTED_ONLINE_REISSUE,
} = require("../../modules/servicing/reissue/constants/reissue.constants");
const {
  parseMiniFareRules,
} = require("../../modules/servicing/reissue/utils/miniFareRuleParser");
const providerReferenceService = require("./providerReference.service");

const SUPPORTED_GDS_CODES = new Set(SUPPORTED_ONLINE_REISSUE.GDS);
const SUPPORTED_NDC_CODES = new Set(SUPPORTED_ONLINE_REISSUE.NDC);
const SUPPORTED_LCC_CODES = new Set(SUPPORTED_ONLINE_REISSUE.LCC);
const INVALID_EXECUTION_STATUSES = new Set([
  "cancelled",
  "failed",
  "expired",
  "cancel_requested",
  "session_timeout",
  "payment_failed",
  "provider_failed",
  "abandoned",
]);

const normalizeText = (value) => {
  if (value === undefined || value === null) return null;
  if (typeof value === "object") return null;
  const normalized = String(value).trim();
  return normalized ? normalized : null;
};

const toArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.flat(Infinity).filter(Boolean);
  return [value].filter(Boolean);
};

const getFlightItinerary = (booking = {}, providerResponse = null) =>
  providerResponse ||
  booking?.bookingResult?.providerResponse?.Response?.Response?.FlightItinerary ||
  booking?.bookingResult?.providerResponse?.raw?.Response?.Response?.FlightItinerary ||
  booking?.bookingResult?.providerResponse?.raw?.Response?.FlightItinerary ||
  booking?.bookingResult?.providerResponse?.Response?.FlightItinerary ||
  booking?.bookingResult?.onwardResponse?.raw?.Response?.Response?.FlightItinerary ||
  booking?.bookingResult?.returnResponse?.raw?.Response?.Response?.FlightItinerary ||
  null;

const getSourceText = (booking = {}) =>
  normalizeText(
    booking?.flightRequest?.source ||
      booking?.bookingSnapshot?.providerReferences?.source ||
      booking?.originalBookingSnapshot?.providerReferences?.source ||
      booking?.metadata?.source,
  ) || "";

const deriveSupplierType = (booking = {}, providerResponse = null) => {
  const source = getSourceText(booking).toUpperCase();
  const itinerary = getFlightItinerary(booking, providerResponse);

  if (providerResponse?.IsNDC || itinerary?.IsNDC || source.includes("NDC")) {
    return "NDC";
  }
  if (providerResponse?.IsLCC || itinerary?.IsLCC || source.includes("LCC")) {
    return "LCC";
  }
  return "GDS";
};

const deriveSupplierSource = (booking = {}) => {
  const source = getSourceText(booking).toUpperCase();
  if (source.includes("GALILEO") || source.includes("1G")) return "GALILEO";
  if (source.includes("AMADEUS") || source.includes("1A")) return "AMADEUS";
  if (source.includes("NDC")) return source;
  if (source.includes("LCC")) return source;
  return source || "UNKNOWN";
};

const resolveAirlineCode = (booking = {}, providerResponse = null) =>
  normalizeText(
    providerResponse?.Segments?.[0]?.[0]?.Airline?.AirlineCode ||
      providerResponse?.Segments?.[0]?.Airline?.AirlineCode ||
      providerResponse?.Segments?.[0]?.airlineCode ||
      booking?.flightRequest?.segments?.[0]?.airlineCode ||
      booking?.originalBookingSnapshot?.segments?.[0]?.airlineCode ||
      booking?.bookingSnapshot?.providerReferences?.validatingAirline,
  )?.toUpperCase() || null;

const collectSegments = (booking = {}, providerResponse = null) => {
  const fromSnapshots = [
    ...toArray(booking?.originalBookingSnapshot?.onwardSegments),
    ...toArray(booking?.originalBookingSnapshot?.returnSegments),
  ];
  if (fromSnapshots.length) return fromSnapshots;

  const requestSegments = toArray(booking?.flightRequest?.segments);
  if (requestSegments.length) return requestSegments;

  const itinerary = getFlightItinerary(booking, providerResponse);
  return toArray(itinerary?.Segments);
};

const getSegmentDeparture = (segment = {}) => {
  const value =
    segment?.departureTime ||
    segment?.departureDateTime ||
    segment?.Origin?.DepTime ||
    segment?.DepartureTime ||
    null;
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizeJourneyLabel = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (["return", "inbound", "2", "way2"].includes(normalized)) return "return";
  return "onward";
};

const resolveTicketStatus = (booking = {}) => {
  if (booking?.cancellation?.cancelledAt || booking?.cancelledAt) return "CANCELLED";
  if (booking?.executionStatus === "ticketed") return "TICKETED";
  if (INVALID_EXECUTION_STATUSES.has(String(booking?.executionStatus || "").toLowerCase())) {
    return String(booking.executionStatus || "").toUpperCase();
  }
  if (booking?.executionStatus === "completed") return "FLOWN";
  return String(booking?.executionStatus || booking?.status || "").toUpperCase() || "UNKNOWN";
};

const evaluateJourneyState = (booking = {}, providerResponse = null) => {
  const segments = collectSegments(booking, providerResponse);
  const now = new Date();
  const reasons = [];

  if (booking?.servicing?.reissue?.partiallyUsedTicket) {
    reasons.push("Partially travelled ticket cannot be reissued online.");
  }

  const flownSegment = segments.some((segment) => {
    const status = String(
      segment?.status ||
        segment?.segmentStatus ||
        segment?.providerReferences?.status ||
        "",
    ).toUpperCase();
    return ["FLOWN", "COMPLETED", "USED"].includes(status);
  });
  if (flownSegment) {
    reasons.push("Flown segments exist on this ticket, so online reissue is not allowed.");
  }

  const checkedInSegment = segments.some((segment) => {
    const status = String(
      segment?.status ||
        segment?.checkInStatus ||
        segment?.providerReferences?.checkInStatus ||
        "",
    ).toUpperCase();
    return segment?.checkedIn === true || status.includes("CHECKED");
  });
  if (checkedInSegment) {
    reasons.push("Check-in completed tickets cannot be reissued online.");
  }

  const hasPastDeparture = segments.some((segment) => {
    const departure = getSegmentDeparture(segment);
    return departure && departure.getTime() <= now.getTime();
  });
  if (hasPastDeparture) {
    reasons.push("Past departure or partially travelled journeys require offline servicing.");
  }

  const journeyCoverage = {
    onward: segments.some((segment) => normalizeJourneyLabel(segment?.journeyType) === "onward"),
    return: segments.some((segment) => normalizeJourneyLabel(segment?.journeyType) === "return"),
  };

  return {
    reasons,
    journeyCoverage,
  };
};

const evaluateMiniFareRules = (miniFareRules, booking = {}) => {
  const rawMiniFareRules =
    miniFareRules?.raw ||
    miniFareRules ||
    getFlightItinerary(booking)?.MiniFareRules ||
    booking?.fareSnapshot?.miniFareRules ||
    booking?.bookingResult?.miniFareRules ||
    null;

  if (!rawMiniFareRules) {
    return {
      allowed: false,
      onlineReissueAllowed: false,
      onlineRefundAllowed: false,
      source: "MiniFareRules",
      reason: "Supplier fare rules for online reissue are missing.",
      parsed: parseMiniFareRules(null, {
        strictEligibility: true,
        acceptRefundAsReissue: true,
      }),
    };
  }

  const parsed =
    miniFareRules?.rules && Object.prototype.hasOwnProperty.call(miniFareRules, "onlineReissueAllowed")
      ? miniFareRules
      : parseMiniFareRules(rawMiniFareRules, {
          strictEligibility: true,
          acceptRefundAsReissue: true,
        });

  const allowed = parsed.onlineReissueAllowed === true || parsed.onlineRefundAllowed === true;
  const reason = allowed
    ? null
    : "Supplier fare rules do not permit online reissue for this booking.";

  return {
    allowed,
    onlineReissueAllowed: parsed.onlineReissueAllowed === true,
    onlineRefundAllowed: parsed.onlineRefundAllowed === true,
    source: "MiniFareRules",
    reason,
    parsed,
  };
};

class ReissueEligibilityService {
  async checkOnlineReissueEligibility(input = {}) {
    const booking = input.booking || {};
    const providerResponse = input.providerResponse || getFlightItinerary(booking);
    const bookingSnapshot = input.bookingSnapshot || booking?.bookingSnapshot || {};
    const airlineCode = resolveAirlineCode(booking, providerResponse);
    const supplierType = deriveSupplierType(booking, providerResponse);
    const supplierSource = deriveSupplierSource(booking);
    const reasons = [];

    const providerReferences = await providerReferenceService.resolveProviderReferences({
      request: booking,
      booking,
      throwOnMissing: false,
      saveBackfilledBooking: false,
    });

    if (!providerReferences.isResolved) {
      reasons.push("Legacy booking missing provider references.");
    }

    const ticketStatus = resolveTicketStatus(booking);
    if (ticketStatus !== "TICKETED") {
      reasons.push(`Ticket status ${ticketStatus || "UNKNOWN"} is not eligible for online reissue.`);
    }

    let airlineSupported = false;
    if (supplierType === "GDS") {
      airlineSupported = SUPPORTED_GDS_CODES.has(supplierSource);
    } else if (supplierType === "NDC") {
      airlineSupported = SUPPORTED_NDC_CODES.has(airlineCode || "");
    } else if (supplierType === "LCC") {
      airlineSupported = SUPPORTED_LCC_CODES.has(airlineCode || "");
    }

    if (!airlineSupported) {
      reasons.push(
        supplierType === "GDS"
          ? "Supplier does not support online reissue."
          : "This airline currently supports offline servicing only.",
      );
    }

    const journeyState = evaluateJourneyState(booking, providerResponse);
    reasons.push(...journeyState.reasons);

    const miniFareRuleDecision = evaluateMiniFareRules(input.miniFareRules, booking);
    if (!miniFareRuleDecision.allowed && miniFareRuleDecision.reason) {
      reasons.push(miniFareRuleDecision.reason);
    }

    const uniqueReasons = Array.from(new Set(reasons.filter(Boolean)));
    const eligible = uniqueReasons.length === 0;
    const supplierSupport = {
      onlineReissueAllowed: miniFareRuleDecision.allowed,
      airlineSupported,
      source: miniFareRuleDecision.source || bookingSnapshot?.providerReferences?.source || supplierSource,
      supplierType,
      airlineCode,
      providerReferencesResolved: providerReferences.isResolved,
      onlineRefundAllowed: miniFareRuleDecision.onlineRefundAllowed,
      supportedAirline: airlineSupported,
      ndc: supplierType === "NDC",
      manualRestriction: false,
      supplierRestriction: !airlineSupported,
      groupBooking: false,
      partiallyUsedTicket: booking?.servicing?.reissue?.partiallyUsedTicket === true,
      sandboxTestingAllowed: false,
      sandboxOverrideApplied: false,
    };

    logger.info("ONLINE_REISSUE_ELIGIBILITY_CHECK", {
      bookingId: booking?._id?.toString?.() || input.activeBookingId || null,
      pnr: providerReferences.pnr || input.pnr || null,
      airline: airlineCode,
      lineage: booking?.bookingLineage || null,
      references: {
        providerBookingReference: providerReferences.providerBookingReference,
        supplierBookingReference: providerReferences.supplierBookingReference,
        traceId: providerReferences.traceId,
        resolutionPath: providerReferences.resolutionPath,
      },
      miniFareRules: {
        onlineReissueAllowed: miniFareRuleDecision.onlineReissueAllowed,
        onlineRefundAllowed: miniFareRuleDecision.onlineRefundAllowed,
        source: miniFareRuleDecision.source,
      },
      result: {
        eligible,
        mode: eligible ? REISSUE_MODES.ONLINE : REISSUE_MODES.OFFLINE,
        reasons: uniqueReasons,
      },
    });

    return {
      eligible,
      mode: eligible ? REISSUE_MODES.ONLINE : REISSUE_MODES.OFFLINE,
      reasons: uniqueReasons,
      shouldCreateOfflineRequest: false,
      supplierSupport,
      support: supplierSupport,
      supplier: supplierType,
      code: eligible ? "ONLINE_REISSUE_ALLOWED" : "OFFLINE_REQUIRED",
      message: eligible
        ? "This booking supports online reissue."
        : uniqueReasons[0] || "This booking requires offline reissue.",
    };
  }

  async evaluate(input = {}) {
    return this.checkOnlineReissueEligibility(input);
  }
}

async function isOnlineReissueAllowed(booking) {
  const result = await module.exports.checkOnlineReissueEligibility({ booking });
  return result?.supplierSupport?.onlineReissueAllowed === true;
}

function isSandboxTestingAllowed() {
  return false;
}

module.exports = new ReissueEligibilityService();
module.exports.isOnlineReissueAllowed = isOnlineReissueAllowed;
module.exports.isSandboxTestingAllowed = isSandboxTestingAllowed;
