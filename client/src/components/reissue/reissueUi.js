/* ============================================================
   reissueUi.js — Backend-aligned UI helpers
   Backend model enum: PENDING | APPROVED | REJECTED | COMPLETED
   Offline statuses:   PENDING_ASSIGNMENT | ASSIGNED | IN_PROGRESS | WAITING_AIRLINE | TICKET_GENERATED | COMPLETED | FAILED | REJECTED | CANCELLED
   ============================================================ */

// ── Online reissue status filter options (matches FlightReissueRequest.status enum) ──
export const REISSUE_STATUS_OPTIONS = [
  "ALL",
  "PENDING",
  "APPROVED",
  "REJECTED",
  "COMPLETED",
];

// ── Safe date formatter — never shows "Invalid Date" ──
export const formatDate = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// ── Safe datetime formatter ──
export const formatDateTime = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// ── Safe money formatter ──
export const formatMoney = (value, currency = "INR") => {
  const amount = Number(value);
  if (Number.isNaN(amount)) return "N/A";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
};

// ── Prettify underscore labels — always returns a string ──
export const prettifyLabel = (value) => {
  if (!value) return "—";
  return String(value).replace(/_/g, " ").toLowerCase();
};

/* ── Resolve employee/user name from any backend structure ──
   Backend FlightReissueRequest.user = { id, name: String, email }
   corporate = { employeeName, employeeEmail, employeeId, ... }
*/
export const resolveUserName = (req) => {
  if (!req) return "N/A";

  // FlightReissueRequest.user.name is a plain String
  const userName = req.user?.name;
  if (typeof userName === "string" && userName.trim()) return userName.trim();

  // corporate sub-doc fallback
  if (req.corporate?.employeeName) return req.corporate.employeeName;

  // requestedBy (used in some offline reissue models)
  const rb = req.requestedBy;
  if (rb) {
    if (typeof rb === "string") return rb;
    if (typeof rb?.name === "string" && rb.name.trim()) return rb.name.trim();
    if (rb?.fullName) return rb.fullName;
    if (rb?.firstName) return `${rb.firstName} ${rb.lastName || ""}`.trim();
  }

  // employee sub-doc
  const emp = req.employee;
  if (emp) {
    if (typeof emp.name === "string" && emp.name.trim()) return emp.name.trim();
    if (emp.fullName) return emp.fullName;
    if (emp.firstName) return `${emp.firstName} ${emp.lastName || ""}`.trim();
  }

  return "Not Available";
};

/* ── Resolve PNR from any backend structure ──
   FlightReissueRequest.bookingSnapshot.pnr  (primary)
   FlightReissueRequest.bookingReference      (secondary)
*/
export const resolvePnr = (req) => {
  if (!req) return "N/A";
  return (
    req.bookingSnapshot?.pnr ||
    req.pnr ||
    req.booking?.pnr ||
    req.bookingReference ||
    req.booking?.bookingReference ||
    req.orderId ||
    "N/A"
  );
};

/* ── Resolve booking reference ──
   FlightReissueRequest.bookingReference (always present, required)
*/
export const resolveBookingRef = (req) => {
  if (!req) return "N/A";
  return (
    req.bookingReference ||
    req.booking?.bookingReference ||
    req.orderId ||
    "N/A"
  );
};

/* ── Resolve date — requestedAt is the correct field in the backend model ──
   Falls back to createdAt (timestamps:true adds it automatically)
*/
export const resolveRequestDate = (req) => {
  if (!req) return "N/A";
  return formatDate(req.requestedAt || req.createdAt);
};

/* ── Resolve reissue ID — reissueId (generated as RE-YYYY-NNNNN) ── */
export const resolveReissueId = (req) => {
  if (!req) return "N/A";
  return req.reissueId || req._id?.toString?.()?.slice(-8)?.toUpperCase() || "N/A";
};

/* ── Journey label from segments array (FlightReissueRequest.segments) ──
   segment = { origin, destination, departureTime, ... }
*/
export const getJourneyLabel = (req) => {
  // Support both old shape { oldJourney: { sectors/segments } } and new shape (array of segments)
  const journey = req?.oldJourney || req;
  const sectors = Array.isArray(journey?.sectors) ? journey.sectors : [];
  if (sectors.length) return sectors.join(" / ");

  // FlightReissueRequest.segments
  const segments = Array.isArray(journey?.segments)
    ? journey.segments
    : Array.isArray(req?.segments)
    ? req.segments
    : [];

  if (!segments.length) return "N/A";
  const first = segments[0];
  const last = segments[segments.length - 1];
  const origin = first?.origin || "?";
  const destination = last?.destination || "?";
  return `${origin} → ${destination}`;
};

/* ── Status badge tone — aligned to backend enum ──
   PENDING | APPROVED | REJECTED | COMPLETED
*/
export const getStatusTone = (status) => {
  switch (status) {
    case "COMPLETED":
    case "TICKET_GENERATED":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "APPROVED":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "REJECTED":
    case "FAILED":
    case "CANCELLED":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "PENDING":
    case "PENDING_ASSIGNMENT":
    case "RAISED":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "ASSIGNED":
    case "IN_PROGRESS":
    case "WAITING_AIRLINE":
    case "PROCESSING":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";
    default:
      return "bg-slate-50 text-slate-600 border-slate-200";
  }
};

/* ── Mode tone (online vs offline reissue) ──
   FlightReissueRequest uses reissueType: FULL_JOURNEY | PARTIAL_JOURNEY
   Online/offline mode not directly on this model — but used by the service layer
*/
export const getModeTone = (mode) =>
  mode === "ONLINE"
    ? "bg-teal-50 text-teal-700 border-teal-200"
    : "bg-slate-100 text-slate-700 border-slate-200";

/* ── canPreviewQuote / canConfirmReissue ──
   Only relevant when the service layer processes online reissue.
   For FlightReissueRequest the states are PENDING/APPROVED/REJECTED/COMPLETED.
*/
export const canPreviewQuote = (request) =>
  request?.mode === "ONLINE" &&
  ["SEARCH_COMPLETED", "QUOTE_RECEIVED"].includes(request?.status);

export const canConfirmReissue = (request) =>
  request?.mode === "ONLINE" && request?.status === "BILLING_RESERVED";
