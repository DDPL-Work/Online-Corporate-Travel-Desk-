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
/**
 * Resolves whether online reissue is allowed from raw TBO MiniFareRules.
 *
 * CORRECT BUSINESS LOGIC (per TBO documentation):
 *   - For REISSUE eligibility → ONLY evaluate Type=="Reissue" + OnlineReissueAllowed
 *   - For CANCELLATION/REFUND → ONLY evaluate Type=="Cancellation" + OnlineRefundAllowed
 *
 * NEVER cross-check OnlineRefundAllowed to determine reissue eligibility.
 * That was a merge-corruption bug that caused valid online reissues to fall
 * back to offline when OnlineRefundAllowed=false.
 */
function resolveOnlineReissueAllowed(rawMiniFareRules) {
  // ── Direct boolean flag on parent object (legacy/flat format from some TBO responses) ──
  if (rawMiniFareRules?.OnlineReissueAllowed === true) return true;
  if (rawMiniFareRules?.OnlineReissueAllowed === false) return false;

  // ── NOTE: Do NOT fall back to OnlineRefundAllowed here. ──
  // OnlineRefundAllowed belongs to Type=Cancellation rules only.
  // Using it as a reissue fallback was a bug that blocked valid online reissues.

  // ── Check individual rules: ONLY Type="Reissue" rules matter here ──
  const rules = toArray(rawMiniFareRules);
  if (rules.length > 0) {
    // Check if any Reissue-type rule explicitly permits online reissue
    const hasExplicitAllow = rules.some(
      (r) =>
        (r.Type === "Reissue" || r.Type === 1 || r.Type === "1") &&
        r.OnlineReissueAllowed === true,
    );
    if (hasExplicitAllow) return true;

    // Check if any Reissue-type rule explicitly denies online reissue
    const hasExplicitDenial = rules.some(
      (r) =>
        (r.Type === "Reissue" || r.Type === 1 || r.Type === "1") &&
        r.OnlineReissueAllowed === false,
    );
    if (hasExplicitDenial) return false;

    // Rules exist but none are Type=Reissue — no restriction, allow by default
  }

  // Default: true when no rules exist (no restriction = allowed)
  return rules.length === 0;
}

/**
 * Resolves whether online refund is allowed from raw TBO MiniFareRules.
 *
 * CORRECT BUSINESS LOGIC:
 *   - ONLY evaluate Type=="Cancellation" + OnlineRefundAllowed
 *   - Never uses OnlineReissueAllowed
 */
function resolveOnlineRefundAllowed(rawMiniFareRules) {
  // Direct boolean flag on parent object
  if (rawMiniFareRules?.OnlineRefundAllowed === true) return true;
  if (rawMiniFareRules?.OnlineRefundAllowed === false) return false;

  const rules = toArray(rawMiniFareRules);
  if (rules.length > 0) {
    const hasExplicitAllow = rules.some(
      (r) =>
        (r.Type === "Cancellation" || r.Type === 0 || r.Type === "0") &&
        r.OnlineRefundAllowed === true,
    );
    if (hasExplicitAllow) return true;

    const hasExplicitDenial = rules.some(
      (r) =>
        (r.Type === "Cancellation" || r.Type === 0 || r.Type === "0") &&
        r.OnlineRefundAllowed === false,
    );
    if (hasExplicitDenial) return false;
  }

  return rules.length === 0;
}

function parseMiniFareRules(rawMiniFareRules) {
  const rules = toArray(rawMiniFareRules).map(buildRule);

  // Correctly separated: reissue uses OnlineReissueAllowed, refund uses OnlineRefundAllowed
  const onlineReissueAllowed = resolveOnlineReissueAllowed(rawMiniFareRules);
  const onlineRefundAllowed = resolveOnlineRefundAllowed(rawMiniFareRules);

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
    onlineRefundAllowed: Boolean(onlineRefundAllowed),
    raw: rawMiniFareRules || null,
  };
}

module.exports = {
  parseMiniFareRules,
  resolveOnlineReissueAllowed,
  resolveOnlineRefundAllowed,
};
