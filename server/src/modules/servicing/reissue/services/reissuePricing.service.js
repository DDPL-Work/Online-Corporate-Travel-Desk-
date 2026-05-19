const ApiError = require("../../../../utils/ApiError");

const PRICING_VERSION = "offline-reissue-v1";

const toArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return [value].filter(Boolean);
};

const roundCurrency = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  return Number(amount.toFixed(2));
};

const sanitizeAmount = (value) => {
  const amount = roundCurrency(value);
  return amount == null ? null : amount;
};

const pickFirstFiniteNumber = (...values) => {
  for (const value of values) {
    const amount = sanitizeAmount(value);
    if (amount != null) return amount;
  }
  return null;
};

const normalizeRuleType = (value) => {
  if (value === 1 || value === "1") return "REISSUE";
  if (value === 0 || value === "0") return "CANCELLATION";

  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "";
  if (normalized.includes("cancel")) return "CANCELLATION";
  if (
    normalized.includes("reissue") ||
    normalized.includes("date change") ||
    normalized.includes("date-change") ||
    normalized.includes("change")
  ) {
    return "REISSUE";
  }
  return normalized.toUpperCase();
};

const parseAmountFromText = (value) => {
  if (value == null) return { amount: null, usesOldFare: false };
  if (typeof value === "number") {
    return { amount: sanitizeAmount(value), usesOldFare: false };
  }

  const text = String(value).trim();
  if (!text) return { amount: null, usesOldFare: false };
  if (text === "100%" || /^100\s*%$/i.test(text)) {
    return { amount: null, usesOldFare: true };
  }

  const normalized = text.replace(/,/g, "");
  const match = normalized.match(/-?\d+(?:\.\d+)?/);
  if (!match) return { amount: null, usesOldFare: false };

  return {
    amount: sanitizeAmount(match[0]),
    usesOldFare: false,
  };
};

const serializeRule = (rule = {}) => {
  try {
    return JSON.parse(JSON.stringify(rule));
  } catch (error) {
    return rule;
  }
};

const collectRuleGroups = (node, path = "root", groups = []) => {
  if (!node) return groups;

  if (Array.isArray(node)) {
    node.forEach((item, index) => collectRuleGroups(item, `${path}[${index}]`, groups));
    return groups;
  }

  if (typeof node !== "object") return groups;

  const miniFarRules = node?.MiniFarRules?.Rules;
  if (Array.isArray(miniFarRules) && miniFarRules.length) {
    groups.push({
      source: path === "root" ? "FareRules[].MiniFarRules.Rules" : `${path}.MiniFarRules.Rules`,
      rules: miniFarRules.filter(Boolean),
    });
  }

  const rawMiniFareRules = node?.MiniFareRules;
  if (Array.isArray(rawMiniFareRules) && rawMiniFareRules.length) {
    if (rawMiniFareRules.length === 1 && Array.isArray(rawMiniFareRules[0])) {
      groups.push({
        source: path === "root" ? "MiniFareRules" : `${path}.MiniFareRules[0]`,
        rules: rawMiniFareRules[0].filter(Boolean),
      });
    } else {
      groups.push({
        source: path === "root" ? "MiniFareRules" : `${path}.MiniFareRules`,
        rules: rawMiniFareRules.filter(Boolean),
      });
    }
  }

  Object.entries(node).forEach(([key, value]) => {
    if (key === "MiniFarRules" || key === "MiniFareRules") return;
    collectRuleGroups(value, `${path}.${key}`, groups);
  });

  return groups;
};

const extractReissueCharge = ({ fareRuleResponse, oldFare }) => {
  const ruleGroups = collectRuleGroups(fareRuleResponse);
  const candidates = [];

  ruleGroups.forEach(({ source, rules }) => {
    rules.forEach((rule) => {
      if (normalizeRuleType(rule?.Type) !== "REISSUE") return;

      const penalties = Array.isArray(rule?.PaxPenalties) ? rule.PaxPenalties : [];
      const validPenaltyFees = penalties
        .map((penalty) => sanitizeAmount(penalty?.AirlineFee))
        .filter((amount) => amount != null);

      if (validPenaltyFees.length) {
        candidates.push({
          reissueCharge: Math.max(...validPenaltyFees),
          source,
          matchedRule: serializeRule(rule),
        });
        return;
      }

      if (penalties.length > 0) {
        candidates.push({
          reissueCharge: oldFare,
          source,
          matchedRule: serializeRule(rule),
        });
        return;
      }

      const detailResult = parseAmountFromText(
        rule?.Details ?? rule?.Detail ?? rule?.Description ?? null,
      );

      if (detailResult.usesOldFare) {
        candidates.push({
          reissueCharge: oldFare,
          source,
          matchedRule: serializeRule(rule),
        });
        return;
      }

      if (detailResult.amount != null) {
        candidates.push({
          reissueCharge: detailResult.amount,
          source,
          matchedRule: serializeRule(rule),
        });
        return;
      }

      if (rule?.Details || rule?.Detail || rule?.Description) {
        candidates.push({
          reissueCharge: oldFare,
          source,
          matchedRule: serializeRule(rule),
        });
      }
    });
  });

  if (!candidates.length) {
    return {
      reissueCharge: 0,
      source: null,
      matchedRule: null,
    };
  }

  const bestMatch = candidates.reduce((highest, current) =>
    current.reissueCharge > highest.reissueCharge ? current : highest,
  );

  return {
    reissueCharge: roundCurrency(bestMatch.reissueCharge) || 0,
    source: bestMatch.source,
    matchedRule: bestMatch.matchedRule,
  };
};

const extractOldFare = (originalBooking = {}) =>
  pickFirstFiniteNumber(
    originalBooking?.flightRequest?.fareSnapshot?.offeredFare,
    originalBooking?.pricingSnapshot?.totalAmount,
    originalBooking?.bookingSnapshot?.amount,
  );

const extractNewFare = (selectedFlight = {}) =>
  pickFirstFiniteNumber(
    selectedFlight?.fare,
    selectedFlight?.offeredFare,
    selectedFlight?.newFare,
    selectedFlight?.Fare?.OfferedFare,
    selectedFlight?.Fare?.PublishedFare,
  );

function calculateOfflineReissueEstimate({
  originalBooking,
  selectedFlight,
  fareRuleResponse,
}) {
  const oldFare = extractOldFare(originalBooking);
  const newFare = extractNewFare(selectedFlight);

  if (oldFare == null) {
    throw new ApiError(422, "Original ticket fare is unavailable for reissue pricing");
  }
  if (newFare == null) {
    throw new ApiError(422, "Selected flight fare is unavailable for reissue pricing");
  }
  if (oldFare <= 0) {
    throw new ApiError(422, "Original ticket fare must be greater than zero for reissue pricing");
  }
  if (newFare <= 0) {
    throw new ApiError(422, "Selected flight fare must be greater than zero for reissue pricing");
  }

  const { reissueCharge, source, matchedRule } = extractReissueCharge({
    fareRuleResponse,
    oldFare,
  });

  const fareDifference = roundCurrency(Math.max(newFare - oldFare, 0)) || 0;
  const refundEstimate = roundCurrency(Math.max(oldFare - newFare, 0)) || 0;
  const totalEstimate = roundCurrency(fareDifference + reissueCharge) || 0;
  const currency =
    selectedFlight?.currency ||
    originalBooking?.pricingSnapshot?.currency ||
    originalBooking?.flightRequest?.fareSnapshot?.currency ||
    "INR";

  return {
    oldFare: roundCurrency(oldFare) || 0,
    newFare: roundCurrency(newFare) || 0,
    fareDifference,
    reissueCharge: roundCurrency(reissueCharge) || 0,
    totalEstimate,
    refundEstimate,
    currency,
    source,
    matchedRule,
    pricingVersion: PRICING_VERSION,
    breakdown: {
      currentTicketFare: roundCurrency(oldFare) || 0,
      newFlightFare: roundCurrency(newFare) || 0,
      airlineDateChangeFee: roundCurrency(reissueCharge) || 0,
      estimatedAdditionalCollection: totalEstimate,
    },
  };
}

module.exports = {
  calculateOfflineReissueEstimate,
};
