const parseNumeric = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const toFlatArray = (value, seen = new WeakSet()) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.flatMap((item) => toFlatArray(item, seen)).filter(Boolean);
  }

  if (typeof value !== "object") return [];
  if (seen.has(value)) return [];
  seen.add(value);

  const directRules = [];
  if (Array.isArray(value.Rules)) {
    directRules.push(...toFlatArray(value.Rules, seen));
  }
  if (Array.isArray(value.MiniFareRules)) {
    directRules.push(...toFlatArray(value.MiniFareRules, seen));
  }
  if (Array.isArray(value.MiniFarRules)) {
    directRules.push(...toFlatArray(value.MiniFarRules, seen));
  }

  const looksLikeRule =
    value.Type !== undefined ||
    value.OnlineReissueAllowed !== undefined ||
    value.OnlineRefundAllowed !== undefined ||
    Array.isArray(value.PaxPenalties) ||
    value.Details ||
    value.Detail ||
    value.Description;

  if (looksLikeRule) {
    directRules.push(value);
  }

  return directRules.filter(Boolean);
};

const inferType = (value) => {
  if (value === 0 || value === "0") return "Cancellation";
  if (value === 1 || value === "1") return "Reissue";

  const text = String(value || "").trim().toLowerCase();
  if (!text) return "";
  if (text.includes("cancel")) return "Cancellation";
  if (text.includes("reissue") || text.includes("change") || text.includes("reschedule")) {
    return "Reissue";
  }
  return String(value || "").trim();
};

const parseAmountFromText = (value) => {
  const text = String(value || "").trim();
  if (!text) return 0;

  const percentMatch = text.match(/100\s*%/i);
  if (percentMatch) return 0;

  const normalizedText = text.replace(/,/g, "");
  const match =
    normalizedText.match(/(?:inr|rs\.?)\s*(\d+(?:\.\d+)?)/i) ||
    normalizedText.match(/(\d+(?:\.\d+)?)/);
  return match ? parseNumeric(match[1] || match[0]) : 0;
};

const buildRule = (rule = {}) => {
  const normalizedType = inferType(rule.Type);
  const penalties = Array.isArray(rule.PaxPenalties) ? rule.PaxPenalties : [];
  const airlineFee = penalties
    .map((penalty) => parseNumeric(penalty?.AirlineFee))
    .find((amount) => amount > 0);

  const amount =
    airlineFee ||
    parseNumeric(
      rule.SupplierReissueCharges ||
        rule.ReissueCharges ||
        rule.ChangeFee ||
        rule.AmendmentFee ||
        rule.RescheduleFee,
    ) ||
    parseAmountFromText(rule.Details ?? rule.Detail ?? rule.Description ?? "");

  return {
    journeyPoints: Array.isArray(rule.JourneyPoints) ? rule.JourneyPoints : [],
    type: normalizedType,
    from: rule.From ?? rule.FromDuration ?? "",
    to: rule.To ?? rule.ToDuration ?? "",
    unit: rule.Unit || "",
    details: rule.Details ?? rule.Detail ?? rule.Description ?? "",
    amount,
    currency: rule.Currency || penalties[0]?.Currency || "INR",
    onlineReissueAllowed:
      rule.OnlineReissueAllowed === undefined ? null : Boolean(rule.OnlineReissueAllowed),
    onlineRefundAllowed:
      rule.OnlineRefundAllowed === undefined ? null : Boolean(rule.OnlineRefundAllowed),
  };
};

function resolveOnlineReissueAllowed(rawMiniFareRules) {
  if (rawMiniFareRules?.OnlineReissueAllowed === true) return true;
  if (rawMiniFareRules?.OnlineReissueAllowed === false) return false;

  const rules = toFlatArray(rawMiniFareRules);
  const reissueRules = rules.filter((rule) => inferType(rule?.Type) === "Reissue");
  if (!reissueRules.length) return true;

  if (reissueRules.some((rule) => rule?.OnlineReissueAllowed === true)) return true;
  if (reissueRules.some((rule) => rule?.OnlineReissueAllowed === false)) return false;
  return true;
}

function resolveOnlineRefundAllowed(rawMiniFareRules) {
  if (rawMiniFareRules?.OnlineRefundAllowed === true) return true;
  if (rawMiniFareRules?.OnlineRefundAllowed === false) return false;

  const rules = toFlatArray(rawMiniFareRules);
  const refundRules = rules.filter((rule) => inferType(rule?.Type) === "Cancellation");
  if (!refundRules.length) return true;

  if (refundRules.some((rule) => rule?.OnlineRefundAllowed === true)) return true;
  if (refundRules.some((rule) => rule?.OnlineRefundAllowed === false)) return false;
  return true;
}

function parseMiniFareRules(rawMiniFareRules) {
  const rules = toFlatArray(rawMiniFareRules).map(buildRule);
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
