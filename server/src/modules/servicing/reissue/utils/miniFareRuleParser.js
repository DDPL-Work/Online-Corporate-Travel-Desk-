const parseNumeric = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const toArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    if (value.length === 1 && Array.isArray(value[0])) {
      return value[0].filter(Boolean);
    }
    return value.filter(Boolean);
  }
  if (Array.isArray(value?.Rules)) return value.Rules.filter(Boolean);
  return [];
};

const inferType = (value) => {
  if (value === 0 || value === "0") return "Cancellation";
  if (value === 1 || value === "1") return "Reissue";
  return String(value || "").trim();
};

const buildRule = (rule = {}) => {
  const normalizedType = inferType(rule.Type);
  const from = rule.From ?? rule.FromDuration ?? "";
  const to = rule.To ?? rule.ToDuration ?? "";
  const unit = rule.Unit || "";
  const details = rule.Details ?? rule.Detail ?? rule.Description ?? "";
  const penalties = Array.isArray(rule.PaxPenalties) ? rule.PaxPenalties : [];
  const airlineFee = penalties[0]?.AirlineFee;

  return {
    journeyPoints: rule.JourneyPoints || [],
    type: normalizedType,
    from,
    to,
    unit,
    details,
    amount: airlineFee !== undefined ? parseNumeric(airlineFee) : parseNumeric(details),
    currency: rule.Currency || penalties[0]?.Currency || "INR",
  };
};

/**
 * Checks the raw MiniFareRules structure from TBO to determine
 * if online reissue is explicitly allowed.
 *
 * Per TBO documentation, eligibility depends on:
 *   MiniFareRules[].Type === "Reissue" && MiniFareRules[].OnlineReissueAllowed === true
 *
 * The parser handles both nested array formats and flat array formats.
 */
function resolveOnlineReissueAllowed(rawMiniFareRules) {
  // Direct boolean flags on the parent object (legacy formats)
  if (rawMiniFareRules?.OnlineReissueAllowed === true) return true;
  if (rawMiniFareRules?.OnlineReissueAllowed === false) return false;

  // Check OnlineRefundAllowed as fallback for backward compatibility
  if (rawMiniFareRules?.OnlineRefundAllowed === true) return true;
  if (rawMiniFareRules?.OnlineRefundAllowed === false) return false;

  // Check individual rules in the array for Type=Reissue + OnlineReissueAllowed
  const rules = toArray(rawMiniFareRules);
  if (rules.length > 0) {
    const hasReissueRule = rules.some(
      (r) =>
        (r.Type === "Reissue" || r.Type === 1 || r.Type === "1") &&
        r.OnlineReissueAllowed === true,
    );
    if (hasReissueRule) return true;

    // If any reissue rule explicitly sets OnlineReissueAllowed = false
    const hasExplicitDenial = rules.some(
      (r) =>
        (r.Type === "Reissue" || r.Type === 1 || r.Type === "1") &&
        r.OnlineReissueAllowed === false,
    );
    if (hasExplicitDenial) return false;
  }

  // Default: true only when no rules exist (no restrictions means allowed)
  return rules.length === 0;
}

function parseMiniFareRules(rawMiniFareRules) {
  const rules = toArray(rawMiniFareRules).map(buildRule);
  const onlineReissueAllowed = resolveOnlineReissueAllowed(rawMiniFareRules);

  const refundableType =
    rawMiniFareRules?.RefundableType ||
    rawMiniFareRules?.refundableType ||
    (rules.some((rule) => rule.type === "Cancellation" && rule.amount === 0)
      ? "REFUNDABLE"
      : "NON_REFUNDABLE");

  return {
    cancellationRules: rules.filter((rule) => rule.type === "Cancellation"),
    reissueRules: rules.filter((rule) => rule.type === "Reissue"),
    refundableType,
    onlineReissueAllowed: Boolean(onlineReissueAllowed),
    raw: rawMiniFareRules || null,
  };
}

module.exports = {
  parseMiniFareRules,
  resolveOnlineReissueAllowed,
};
