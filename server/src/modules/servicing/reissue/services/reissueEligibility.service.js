const { REISSUE_MODES, REISSUE_TYPES } = require("../constants/reissue.constants");
const { validateNdcReissue } = require("../validators/ndcReissue.validator");
const { resolveOnlineReissueAllowed } = require("../utils/miniFareRuleParser");

// ── Sandbox override for QA: bypasses MiniFareRules gate on supported airlines ──
// Set ALLOW_SANDBOX_REISSUE_OVERRIDE=true in .env for dev/QA only. NEVER in production.
const SANDBOX_OVERRIDE_ENABLED = process.env.ALLOW_SANDBOX_REISSUE_OVERRIDE === "true";

// ── Supported airlines per TBO Online Reissue documentation ──
const SUPPORTED_GDS_CODES = new Set(["1G", "1A", "GALILEO", "AMADEUS"]);
const SUPPORTED_NDC_CODES = new Set(["EK", "LH", "EY", "AIR", "AMADEUS_NDC"]);
const SUPPORTED_LCC_CODES = new Set(["6E", "IX", "SG", "FZ", "QP"]);
const SUPPORTED_AIRLINE_CODES = new Set([
  ...SUPPORTED_GDS_CODES,
  ...SUPPORTED_NDC_CODES,
  ...SUPPORTED_LCC_CODES,
]);

const deriveSupplier = ({ providerResponse, booking }) => {
  const source = String(booking?.flightRequest?.source || "").toUpperCase();
  if (providerResponse?.IsNDC || source.includes("NDC")) return "NDC";
  if (providerResponse?.IsLCC) return "LCC";
  return "GDS";
};

const getAirlineCode = (booking, providerResponse) =>
  String(
    providerResponse?.Segments?.[0]?.[0]?.Airline?.AirlineCode ||
      providerResponse?.Segments?.[0]?.Airline?.AirlineCode ||
      booking?.flightRequest?.segments?.[0]?.airlineCode ||
      booking?.bookingSnapshot?.airline ||
      "",
  )
    .trim()
    .toUpperCase();

/**
 * Returns the RAW fare-rule truth for online reissue.
 * NEVER applies sandbox override — this is the production-safe airline capability check.
 *
 * Used by: eligibility UI, eligible/code determination, support.onlineReissueAllowed.
 */
function isOnlineReissueAllowed(booking) {
  const flightItinerary =
    booking?.bookingResult?.providerResponse?.Response?.Response?.FlightItinerary ||
    booking?.bookingResult?.onwardResponse?.raw?.Response?.Response?.FlightItinerary ||
    {};

  const rawMiniFareRules =
    flightItinerary?.MiniFareRules ||
    booking?.fareSnapshot?.miniFareRules ||
    booking?.bookingResult?.miniFareRules ||
    null;

  // No MiniFareRules present → cannot determine from fare rules → allow by default
  if (!rawMiniFareRules) return true;

  return resolveOnlineReissueAllowed(rawMiniFareRules);
}

/**
 * QA-only flag: true when sandbox override is active AND airline is supported
 * AND real fare rules say false. This allows QA to test the provider flow
 * while the real eligibility state is preserved.
 *
 * sandboxTestingAllowed = true means:
 *   "QA can attempt online search, but the real airline does NOT support online reissue."
 *   Provider rejection is expected — system will gracefully fall back to OFFLINE_REQUIRED.
 */
function isSandboxTestingAllowed(booking, airlineCode) {
  if (!SANDBOX_OVERRIDE_ENABLED) return false;
  if (!airlineCode || !SUPPORTED_AIRLINE_CODES.has(airlineCode)) return false;
  // Only grant sandbox bypass when fare rules actually say false
  const realFareRuleResult = isOnlineReissueAllowed(booking);
  return realFareRuleResult === false;
}

class ReissueEligibilityService {
  /**
   * Evaluates booking eligibility for online reissue.
   *
   * IMPORTANT SEPARATION:
   *  eligible / code / support.onlineReissue  = REAL airline capability (no sandbox override)
   *  support.sandboxTestingAllowed            = QA-only override flag
   *  support.sandboxOverrideApplied           = legacy alias for sandboxTestingAllowed
   *
   * Production users will NEVER see "Online Reissue Available"
   * when MiniFareRules.OnlineReissueAllowed === false.
   *
   * @param {Object} options.booking     - The booking document
   * @param {Object} options.newJourney  - Requested new journey details
   * @param {Object|null} options.miniFareRules - Parsed MiniFareRules from post-search
   */
  evaluate({ booking, newJourney = {}, miniFareRules = null }) {
    const providerResponse =
      booking?.bookingResult?.providerResponse?.Response?.Response?.FlightItinerary ||
      booking?.bookingResult?.onwardResponse?.raw?.Response?.Response?.FlightItinerary ||
      {};

    const supplier = deriveSupplier({ providerResponse, booking });
    const airlineCode = getAirlineCode(booking, providerResponse);
    const partiallyUsedTicket = Boolean(booking?.servicing?.reissue?.partiallyUsedTicket);

    const reasons = [];

    // ── Condition 1: Airline/provider supported ──
    if (!SUPPORTED_AIRLINE_CODES.has(airlineCode)) {
      reasons.push(`Airline ${airlineCode || "UNKNOWN"} is not enabled for online TBO reissue`);
    }

    // ── Condition 2: Real fare-rule gate (NO sandbox override applied here) ──
    // This is the authoritative production check. The sandbox flag is computed separately below.
    const realOnlineReissueAllowed = isOnlineReissueAllowed(booking);
    if (!realOnlineReissueAllowed) {
      reasons.push("Fare rules do not permit online reissue for this booking");
    }

    // ── Post-search MiniFareRules check (when available) ──
    if (miniFareRules) {
      const postSearchAllowed =
        miniFareRules?.onlineReissueAllowed ??
        miniFareRules?.OnlineReissueAllowed ??
        miniFareRules?.OnlineRefundAllowed ??
        miniFareRules?.onlineRefundAllowed ??
        true;

      if (!postSearchAllowed) {
        if (!reasons.some((r) => r.includes("Fare rules do not permit"))) {
          reasons.push("Fare rules do not permit online reissue for this booking");
        }
      }
    }

    // ── NDC-specific validations ──
    if (supplier === "NDC") {
      try {
        validateNdcReissue({
          travellers: booking?.travellers || [],
          newJourney,
        });
      } catch (error) {
        reasons.push(error.message);
      }
    }

    // ── Partially used ticket check ──
    if (partiallyUsedTicket) {
      reasons.push("Partially used tickets are not eligible for online reissue");
    }

    // ── Reissue type check ──
    if (
      (newJourney?.reissueType && newJourney.reissueType !== REISSUE_TYPES.FULL_REISSUE) ||
      (booking?.servicing?.reissue?.requestedType &&
        booking.servicing.reissue.requestedType !== REISSUE_TYPES.FULL_REISSUE)
    ) {
      reasons.push("Only FULL_REISSUE is supported");
    }

    // ── Real eligibility: ONLY based on real airline capability ──
    const reallyEligible = reasons.length === 0;

    // ── QA sandbox flag: completely isolated from real eligibility ──
    const sandboxTestingAllowed = isSandboxTestingAllowed(booking, airlineCode);

    const support = {
      // ── Production fields (real airline truth) ──
      onlineReissue: reallyEligible,              // used by workflow gate
      onlineReissueAllowed: realOnlineReissueAllowed, // used by frontend primary badge
      onlineRefundAllowed: Boolean(
        miniFareRules?.onlineReissueAllowed ??
          miniFareRules?.onlineRefundAllowed ??
          realOnlineReissueAllowed,
      ),
      ndc: supplier === "NDC",
      manualRestriction: false,
      supplierRestriction: reasons.some((reason) => reason.includes("not enabled")),
      groupBooking: false,
      partiallyUsedTicket,
      supportedAirline: SUPPORTED_AIRLINE_CODES.has(airlineCode),
      airlineCode,
      // ── QA-only flags (NEVER affect production eligibility) ──
      sandboxTestingAllowed,          // QA can attempt provider test even when ineligible
      sandboxOverrideApplied: sandboxTestingAllowed, // legacy alias kept for compatibility
    };

    return {
      // eligible / code = REAL production truth — sandbox never changes these
      eligible: reallyEligible,
      mode: REISSUE_MODES.ONLINE,
      code: reallyEligible ? "ONLINE_REISSUE_ALLOWED" : "ONLINE_REISSUE_NOT_SUPPORTED",
      message: reallyEligible
        ? "Online reissue is supported"
        : "Online reissue is not supported for this booking",
      supplier,
      reissueType: REISSUE_TYPES.FULL_REISSUE,
      support,
      reasons,
    };
  }
}

module.exports = new ReissueEligibilityService();
module.exports.isOnlineReissueAllowed = isOnlineReissueAllowed;
module.exports.isSandboxTestingAllowed = isSandboxTestingAllowed;
