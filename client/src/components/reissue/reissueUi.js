export const REISSUE_STATUS_OPTIONS = [
  "ALL",
  "CREATED",
  "ELIGIBILITY_CHECKED",
  "SEARCH_COMPLETED",
  "QUOTE_RECEIVED",
  "BILLING_RESERVED",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
];

export const formatMoney = (value, currency = "INR") => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const prettifyLabel = (value) =>
  (value || "—").replace(/_/g, " ").toLowerCase();

export const getStatusTone = (status) => {
  switch (status) {
    case "COMPLETED":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "FAILED":
    case "CANCELLED":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "QUOTE_RECEIVED":
    case "BILLING_RESERVED":
    case "PROCESSING":
    case "SEARCH_COMPLETED":
      return "bg-blue-50 text-blue-700 border-blue-200";
    default:
      return "bg-amber-50 text-amber-700 border-amber-200";
  }
};

export const getModeTone = (mode) =>
  mode === "ONLINE"
    ? "bg-teal-50 text-teal-700 border-teal-200"
    : "bg-slate-100 text-slate-700 border-slate-200";

export const getJourneyLabel = (journey = {}) => {
  const sectors = Array.isArray(journey?.sectors) ? journey.sectors : [];
  if (sectors.length) return sectors.join(" / ");
  const segments = Array.isArray(journey?.segments) ? journey.segments : [];
  if (!segments.length) return "—";
  const first = segments[0];
  const last = segments[segments.length - 1];
  const origin = first?.origin?.airportCode || first?.origin || "?";
  const destination =
    last?.destination?.airportCode || last?.destination || "?";
  return `${origin} → ${destination}`;
};

export const canPreviewQuote = (request) =>
  request?.mode === "ONLINE" &&
  ["SEARCH_COMPLETED", "QUOTE_RECEIVED"].includes(request?.status);

export const canConfirmReissue = (request) =>
  request?.mode === "ONLINE" && request?.status === "BILLING_RESERVED";
