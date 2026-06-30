export const REISSUE_STATUS_OPTIONS = [
  "ALL",
  "PENDING_ASSIGNMENT",
  "RAISED",
  "ASSIGNED",
  "IN_PROGRESS",
  "WAITING_AIRLINE",
  "TICKET_GENERATED",
  "COMPLETED",
  "FAILED",
  "REJECTED",
];

export const prettifyLabel = (value) =>
  (value || "—")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^\w/, (char) => char.toUpperCase());

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

export const formatMoney = (value, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export const getStatusTone = (status) => {
  switch (status) {
    case "PENDING_ASSIGNMENT":
    case "RAISED":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "ASSIGNED":
    case "IN_PROGRESS":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "WAITING_AIRLINE":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";
    case "TICKET_GENERATED":
    case "COMPLETED":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "FAILED":
    case "REJECTED":
    case "CANCELLED":
      return "bg-rose-50 text-rose-700 border-rose-200";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
};

export const getJourneyLabel = (flight = {}) => {
  const origin = flight?.origin || flight?.segments?.[0]?.origin || "—";
  const destination =
    flight?.destination ||
    flight?.segments?.[flight?.segments?.length - 1]?.destination ||
    "—";
  return `${origin} → ${destination}`;
};

export const getAllowedOpsTransitions = (status) => {
  switch (status) {
    case "PENDING_ASSIGNMENT":
      return ["ASSIGNED", "FAILED", "CANCELLED"];
    case "RAISED":
      return ["ASSIGNED", "REJECTED", "FAILED"];
    case "ASSIGNED":
      return ["IN_PROGRESS", "REJECTED", "FAILED"];
    case "IN_PROGRESS":
      return ["WAITING_AIRLINE", "FAILED"];
    case "WAITING_AIRLINE":
      return ["IN_PROGRESS", "FAILED"];
    case "TICKET_GENERATED":
      return ["COMPLETED", "FAILED"];
    case "COMPLETED":
    case "REJECTED":
      return [];
    case "FAILED":
      return ["IN_PROGRESS"];
    case "CANCELLED":
    default:
      return [];
  }
};
