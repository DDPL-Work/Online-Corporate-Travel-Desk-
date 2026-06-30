"use strict";

const parseNumeric = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
};

const normalizeText = (value) => String(value || "").trim();

const normalizeBooleanFlag = (value) => {
  if (value === true || value === "true" || value === 1 || value === "1") return true;
  if (value === false || value === "false" || value === 0 || value === "0") return false;
  return null;
};

const sanitizeAmount = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  return Number(amount.toFixed(2));
};

const inferType = (value) => {
  if (value === 0 || value === "0") return "Cancellation";
  if (value === 1 || value === "1") return "Reissue";

  const text = normalizeText(value).toLowerCase();
  if (!text) return "";
  if (text.includes("cancel")) return "Cancellation";
  if (
    text.includes("reissue") ||
    text.includes("change") ||
    text.includes("reschedule") ||
    text.includes("amend")
  ) {
    return "Reissue";
  }
  return normalizeText(value);
};

const resolveCurrency = (rule = {}, text = "") => {
  const directCurrency =
    normalizeText(rule?.Currency || rule?.currency || rule?.PaxPenalties?.[0]?.Currency).toUpperCase();
  if (directCurrency) return directCurrency;

  const currencyMatch = normalizeText(text).match(/\b(INR|USD|AED|EUR|GBP|SAR|QAR|SGD)\b/i);
  return currencyMatch ? currencyMatch[1].toUpperCase() : "INR";
};

const parseApplicableWindow = (rule = {}) => {
  const from = normalizeText(rule?.From ?? rule?.FromDuration ?? "");
  const to = normalizeText(rule?.To ?? rule?.ToDuration ?? "");
  const unit = normalizeText(rule?.Unit ?? rule?.WindowUnit ?? "");

  if (!from && !to && !unit) return null;
  return {
    from: from || null,
    to: to || null,
    unit: unit || null,
  };
};

const parseTextPenalty = (value) => {
  const text = normalizeText(value);
  if (!text) {
    return {
      rawText: "",
      amount: null,
      percentage: null,
      currency: "INR",
      nonRefundable: false,
    };
  }

  const normalizedText = text.replace(/,/g, "");
  const percentMatch = normalizedText.match(/(\d+(?:\.\d+)?)\s*%/i);
  const amountMatch =
    normalizedText.match(/(?:INR|Rs\.?|₹)\s*(\d+(?:\.\d+)?)/i) ||
    normalizedText.match(/\b(\d+(?:\.\d+)?)\b/);
  const nonRefundable = /non[\s-]*refundable|non[\s-]*refund/i.test(normalizedText);

  return {
    rawText: text,
    amount: amountMatch ? sanitizeAmount(amountMatch[1] || amountMatch[0]) : null,
    percentage: percentMatch ? sanitizeAmount(percentMatch[1]) : null,
    currency: resolveCurrency({}, text),
    nonRefundable,
  };
};

const parseStructuredPenalty = (rule = {}) => {
  const textPenalty = parseTextPenalty(
    rule?.Details ?? rule?.Detail ?? rule?.Description ?? rule?.FareRuleDetail ?? "",
  );
  const penalties = Array.isArray(rule?.PaxPenalties) ? rule.PaxPenalties : [];

  const penaltyAmounts = penalties
    .map((penalty) =>
      sanitizeAmount(
        penalty?.AirlineFee ??
          penalty?.Amount ??
          penalty?.PenaltyAmount ??
          penalty?.Value,
      ),
    )
    .filter((amount) => amount != null);

  const directAmount = sanitizeAmount(
    rule?.SupplierReissueCharges ??
      rule?.ReissueCharges ??
      rule?.ChangeFee ??
      rule?.AmendmentFee ??
      rule?.RescheduleFee ??
      rule?.PenaltyAmount ??
      rule?.Amount,
  );

  const directPercent = sanitizeAmount(
    rule?.Percentage ?? rule?.PenaltyPercentage ?? rule?.ChargePercentage,
  );

  return {
    amount:
      penaltyAmounts.length > 0
        ? Math.max(...penaltyAmounts)
        : directAmount ?? textPenalty.amount,
    percentage: directPercent ?? textPenalty.percentage,
    currency: resolveCurrency(rule, textPenalty.rawText),
    rawText: textPenalty.rawText,
    nonRefundable:
      textPenalty.nonRefundable ||
      normalizeText(rule?.RefundableType).toUpperCase() === "NON_REFUNDABLE",
  };
};

const isRuleCandidate = (value = {}) =>
  value &&
  typeof value === "object" &&
  (
    value.Type !== undefined ||
    value.OnlineReissueAllowed !== undefined ||
    value.OnlineRefundAllowed !== undefined ||
    Array.isArray(value.PaxPenalties) ||
    value.Details ||
    value.Detail ||
    value.Description ||
    value.FareRuleDetail ||
    value.ReissueCharges !== undefined ||
    value.ChangeFee !== undefined ||
    value.AmendmentFee !== undefined ||
    value.RescheduleFee !== undefined
  );

const collectRules = (input, context = {}, seen = new WeakSet(), bucket = []) => {
  if (!input) return bucket;

  if (Array.isArray(input)) {
    input.forEach((item, index) => {
      const childContext = { ...context };
      if (Array.isArray(item)) {
        childContext.journeyIndex =
          context.journeyIndex != null ? context.journeyIndex : index;
      }
      collectRules(item, childContext, seen, bucket);
    });
    return bucket;
  }

  if (typeof input !== "object") return bucket;
  if (seen.has(input)) return bucket;
  seen.add(input);

  if (isRuleCandidate(input)) {
    bucket.push({
      rule: input,
      context: {
        journeyIndex:
          context.journeyIndex != null
            ? context.journeyIndex
            : Array.isArray(input?.JourneyPoints) && input.JourneyPoints.length > 1
              ? 0
              : null,
        source: context.source || "MiniFareRules",
      },
    });
  }

  [
    ["Rules", "Rules"],
    ["MiniFareRules", "MiniFareRules"],
    ["MiniFarRules", "MiniFarRules"],
  ].forEach(([key, source]) => {
    if (Array.isArray(input?.[key])) {
      input[key].forEach((item, index) => {
        collectRules(
          item,
          {
            journeyIndex:
              Array.isArray(item) && context.journeyIndex == null ? index : context.journeyIndex,
            source,
          },
          seen,
          bucket,
        );
      });
    }
  });

  Object.entries(input).forEach(([key, value]) => {
    if (["Rules", "MiniFareRules", "MiniFarRules"].includes(key)) return;
    collectRules(value, context, seen, bucket);
  });

  return bucket;
};

const buildRule = ({ rule = {}, context = {} }) => {
  const type = inferType(rule?.Type);
  const penalty = parseStructuredPenalty(rule);
  const journeyPoints = Array.isArray(rule?.JourneyPoints)
    ? rule.JourneyPoints.filter(Boolean)
    : [];

  return {
    type,
    amount: penalty.amount,
    percentage: penalty.percentage,
    currency: penalty.currency,
    rawText: penalty.rawText,
    source: context.source || "MiniFareRules",
    journeyPoints,
    applicableWindow: parseApplicableWindow(rule),
    from: normalizeText(rule?.From ?? rule?.FromDuration ?? "") || null,
    to: normalizeText(rule?.To ?? rule?.ToDuration ?? "") || null,
    unit: normalizeText(rule?.Unit ?? "") || null,
    details: penalty.rawText,
    journeyIndex: Number.isInteger(context.journeyIndex) ? context.journeyIndex : null,
    onlineReissueAllowed: normalizeBooleanFlag(rule?.OnlineReissueAllowed),
    onlineRefundAllowed: normalizeBooleanFlag(rule?.OnlineRefundAllowed),
    nonRefundable: penalty.nonRefundable,
  };
};

const extractRuleFlags = (rawMiniFareRules, type) =>
  collectRules(rawMiniFareRules)
    .map(buildRule)
    .filter((rule) => rule.type === type)
    .map((rule) =>
      type === "Cancellation" ? rule.onlineRefundAllowed : rule.onlineReissueAllowed,
    )
    .filter((flag) => flag !== null);

function resolveOnlineReissueAllowed(
  rawMiniFareRules,
  options = {},
) {
  const { strict = false, acceptRefundFlag = false } = options;
  const topLevelReissueFlag = normalizeBooleanFlag(rawMiniFareRules?.OnlineReissueAllowed);
  const topLevelRefundFlag = normalizeBooleanFlag(rawMiniFareRules?.OnlineRefundAllowed);

  if (topLevelReissueFlag !== null) return topLevelReissueFlag;
  if (acceptRefundFlag && topLevelRefundFlag !== null) return topLevelRefundFlag;

  const reissueFlags = extractRuleFlags(rawMiniFareRules, "Reissue");
  if (reissueFlags.includes(true)) return true;
  if (reissueFlags.includes(false)) return false;

  if (acceptRefundFlag) {
    const refundFlags = extractRuleFlags(rawMiniFareRules, "Cancellation");
    if (refundFlags.includes(true)) return true;
    if (refundFlags.includes(false)) return false;
  }

  return strict ? false : true;
}

function resolveOnlineRefundAllowed(rawMiniFareRules, options = {}) {
  const { strict = false } = options;
  const topLevelRefundFlag = normalizeBooleanFlag(rawMiniFareRules?.OnlineRefundAllowed);
  if (topLevelRefundFlag !== null) return topLevelRefundFlag;

  const cancellationFlags = extractRuleFlags(rawMiniFareRules, "Cancellation");
  if (cancellationFlags.includes(true)) return true;
  if (cancellationFlags.includes(false)) return false;
  return strict ? false : true;
}

function parseMiniFareRules(rawMiniFareRules, options = {}) {
  const { strictEligibility = false, acceptRefundAsReissue = false } = options;
  const normalizedRules = collectRules(rawMiniFareRules).map(buildRule);
  const reissueRules = normalizedRules.filter((rule) => rule.type === "Reissue");
  const cancellationRules = normalizedRules.filter((rule) => rule.type === "Cancellation");
  const onlineReissueAllowed = resolveOnlineReissueAllowed(rawMiniFareRules, {
    strict: strictEligibility,
    acceptRefundFlag: acceptRefundAsReissue,
  });
  const onlineRefundAllowed = resolveOnlineRefundAllowed(rawMiniFareRules, {
    strict: strictEligibility,
  });

  const highestJourneyIndex = normalizedRules.reduce(
    (max, rule) => (Number.isInteger(rule.journeyIndex) ? Math.max(max, rule.journeyIndex) : max),
    -1,
  );
  const journeyRules =
    highestJourneyIndex >= 0
      ? Array.from({ length: highestJourneyIndex + 1 }, (_, journeyIndex) =>
          normalizedRules.filter((rule) => rule.journeyIndex === journeyIndex),
        )
      : [normalizedRules];

  const refundableType =
    rawMiniFareRules?.RefundableType ||
    rawMiniFareRules?.refundableType ||
    (cancellationRules.some((rule) => rule.nonRefundable)
      ? "NON_REFUNDABLE"
      : "REFUNDABLE");

  return {
    rules: normalizedRules,
    journeyRules,
    cancellationRules,
    reissueRules,
    refundableType,
    onlineReissueAllowed: Boolean(onlineReissueAllowed),
    onlineRefundAllowed: Boolean(onlineRefundAllowed),
    hasExplicitOnlineReissueFlag:
      normalizeBooleanFlag(rawMiniFareRules?.OnlineReissueAllowed) !== null ||
      reissueRules.some((rule) => rule.onlineReissueAllowed !== null),
    hasExplicitOnlineRefundFlag:
      normalizeBooleanFlag(rawMiniFareRules?.OnlineRefundAllowed) !== null ||
      cancellationRules.some((rule) => rule.onlineRefundAllowed !== null),
    hasNestedJourneys: journeyRules.length > 1,
    raw: rawMiniFareRules || null,
  };
}

module.exports = {
  parseMiniFareRules,
  resolveOnlineReissueAllowed,
  resolveOnlineRefundAllowed,
};
