/**
 * fareClassifier.js
 *
 * Centralized NDC / supplier-direct fare detection and badge mapping layer.
 *
 * ── DESIGN RULES ────────────────────────────────────────────────────────────
 *  1. Never hardcode a single source as "NDC" — use multi-signal detection.
 *  2. Always return safe defaults (never throw) — this runs in hot search path.
 *  3. Keep pure: no database calls, no network calls, no side effects.
 *  4. Do NOT modify ResultIndex, fare pricing, or booking flow.
 * ────────────────────────────────────────────────────────────────────────────
 */

"use strict";

// ── NDC/Supplier-direct source identifiers (TBO) ────────────────────────────
const NDC_SOURCES = new Set([25, 28, 30, 36]);

// ── Supplier fare class → human-readable badge ──────────────────────────────
const FARE_BADGE_MAP = {
  saver: "ECONOMY SAVER",
  "saver (regular)": "ECONOMY SAVER",
  regular: "REGULAR",
  upfront: "PREMIUM FLEX",
  flexi: "FLEXIBLE",
  "super flexi": "SUPER FLEXIBLE",
  corporate: "CORPORATE",
  lite: "BASIC",
  value: "VALUE PLUS",
  business: "BUSINESS",
  "business lite": "BUSINESS LITE",
  "business flexi": "BUSINESS FLEXIBLE",
  first: "FIRST CLASS",
  eco: "ECONOMY",
  economy: "ECONOMY",
};

// ── Fare class keywords that hint at branded / supplier-direct fares ─────────
const BRANDED_KEYWORDS = [
  "upfront", "flexi", "lite", "saver", "value", "corporate",
  "plus", "smart", "go", "special",
];

/**
 * detectNdcFare(result)
 *
 * Returns true when the search result appears to be an NDC / supplier-direct fare.
 * Uses multi-signal detection — no single field is authoritative.
 */
function detectNdcFare(result) {
  if (!result || typeof result !== "object") return false;

  // Signal 1: TBO Source field
  if (NDC_SOURCES.has(Number(result.Source))) return true;

  // Signal 2: SupplierFareClass present (only set for supplier-direct inventory)
  if (result.SupplierFareClass && typeof result.SupplierFareClass === "string") return true;

  // Signal 3: FareClassification type
  if (result.FareClassification?.Type) return true;

  // Signal 4: ResultFareType contains branded keywords
  const fareType = String(result.ResultFareType || "").toLowerCase();
  if (BRANDED_KEYWORDS.some((kw) => fareType.includes(kw))) return true;

  // Signal 5: Rich ancillary / SSR data present (indicates supplier-direct inventory)
  const hasRichAnc =
    Array.isArray(result.FareInclusionsList) && result.FareInclusionsList.length > 0;
  if (hasRichAnc) return true;

  return false;
}

/**
 * detectBrandedFare(result)
 *
 * Returns true when the result carries branded fare family data.
 */
function detectBrandedFare(result) {
  if (!result || typeof result !== "object") return false;
  if (result.SupplierFareClass) return true;
  if (result.FareClassification?.Type) return true;
  const fareType = String(result.ResultFareType || "").toLowerCase();
  return BRANDED_KEYWORDS.some((kw) => fareType.includes(kw));
}

/**
 * getFareBadge(result)
 *
 * Returns a human-readable badge string for the fare, e.g. "ECONOMY SAVER".
 * Falls back to "REGULAR" when no mapping is found.
 */
function getFareBadge(result) {
  if (!result || typeof result !== "object") return "REGULAR";

  // Priority 1: SupplierFareClass (most descriptive)
  if (result.SupplierFareClass) {
    const key = String(result.SupplierFareClass).toLowerCase().trim();
    if (FARE_BADGE_MAP[key]) return FARE_BADGE_MAP[key];
    // Partial match
    for (const [mapKey, badge] of Object.entries(FARE_BADGE_MAP)) {
      if (key.includes(mapKey) || mapKey.includes(key)) return badge;
    }
  }

  // Priority 2: FareClassification.Type
  if (result.FareClassification?.Type) {
    const key = String(result.FareClassification.Type).toLowerCase().trim();
    if (FARE_BADGE_MAP[key]) return FARE_BADGE_MAP[key];
  }

  // Priority 3: ResultFareType
  if (result.ResultFareType) {
    const key = String(result.ResultFareType).toLowerCase().trim();
    if (FARE_BADGE_MAP[key]) return FARE_BADGE_MAP[key];
    for (const [mapKey, badge] of Object.entries(FARE_BADGE_MAP)) {
      if (key.includes(mapKey)) return badge;
    }
  }

  return "REGULAR";
}

/**
 * getFareBenefits(result)
 *
 * Returns a normalised benefits object from whatever inclusion fields TBO returns.
 */
function getFareBenefits(result) {
  if (!result || typeof result !== "object") return buildEmptyBenefits();

  // Pull from FareInclusions (object) or FareInclusionsList (array)
  const inclusions = result.FareInclusions || {};
  const inclusionList = Array.isArray(result.FareInclusionsList)
    ? result.FareInclusionsList
    : [];

  // Baggage: prefer FareInclusions, fallback to Segments[0][0].Baggage
  const firstSeg = result.Segments?.[0]?.[0] || result.Segments?.[0] || null;
  const checkinBaggage =
    inclusions.Baggage ||
    inclusions.CheckinBaggage ||
    firstSeg?.Baggage ||
    null;
  const cabinBaggage =
    inclusions.CabinBaggage ||
    firstSeg?.CabinBaggage ||
    null;

  const isRefundable =
    inclusions.Refundable === true ||
    inclusions.IsRefundable === true ||
    String(result.RefundableType || "").toUpperCase() === "REFUNDABLE";

  const isChangeable =
    inclusions.ChangeAllowed === true ||
    inclusions.Changeable === true ||
    false;

  const mealIncluded =
    inclusions.MealIncluded === true ||
    inclusions.Meal === true ||
    inclusionList.some((i) => /meal/i.test(String(i.Name || i.Type || "")));

  const seatIncluded =
    inclusions.SeatIncluded === true ||
    inclusionList.some((i) => /seat/i.test(String(i.Name || i.Type || "")));

  const loungeIncluded =
    inclusions.LoungeAccess === true ||
    inclusionList.some((i) => /lounge/i.test(String(i.Name || i.Type || "")));

  const noOfSeatAvailable = result.NoOfSeatAvailable ?? null;

  return {
    checkinBaggage: checkinBaggage || null,
    cabinBaggage: cabinBaggage || null,
    isRefundable,
    isChangeable,
    mealIncluded,
    seatIncluded,
    loungeIncluded,
    noOfSeatAvailable,
    lowSeatWarning:
      noOfSeatAvailable !== null && Number(noOfSeatAvailable) <= 3,
  };
}

function buildEmptyBenefits() {
  return {
    checkinBaggage: null,
    cabinBaggage: null,
    isRefundable: false,
    isChangeable: false,
    mealIncluded: false,
    seatIncluded: false,
    loungeIncluded: false,
    noOfSeatAvailable: null,
    lowSeatWarning: false,
  };
}

/**
 * getFarePriority(result)
 *
 * Returns a numeric sort priority (lower = higher priority in results list).
 * Used for front-end sorting.
 */
function getFarePriority(result) {
  if (!result || typeof result !== "object") return 100;

  const isCorporate = /corporate/i.test(result.ResultFareType || result.SupplierFareClass || "");
  const isNdc = detectNdcFare(result);
  const stops = Number(result.Stops ?? 99);
  const fare = Number(result.Fare?.OfferedFare ?? result.Fare?.PublishedFare ?? 9999999);

  // Priority order: Cheapest → Non-stop → Corporate → NDC → Others
  let priority = fare / 1000;
  if (stops === 0) priority -= 20;
  if (isCorporate) priority -= 15;
  if (isNdc) priority -= 5;

  return priority;
}

/**
 * classifyFare(result)
 *
 * Convenience method: returns the full classification object for a single result.
 */
function classifyFare(result) {
  const isNdc = detectNdcFare(result);
  const isBranded = detectBrandedFare(result);
  const isCorporate = /corporate/i.test(
    result?.ResultFareType || result?.SupplierFareClass || "",
  );

  return {
    isNdc,
    isBranded,
    isCorporate,
    fareType: result?.ResultFareType || result?.SupplierFareClass || "Regular",
    badge: getFareBadge(result),
    sourceType: NDC_SOURCES.has(Number(result?.Source))
      ? "NDC"
      : isNdc
        ? "SUPPLIER_DIRECT"
        : "GDS",
    benefits: getFareBenefits(result),
    priority: getFarePriority(result),
  };
}

module.exports = {
  detectNdcFare,
  detectBrandedFare,
  getFareBadge,
  getFareBenefits,
  getFarePriority,
  classifyFare,
};
