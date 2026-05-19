// src/utils/reissueResolvers.js
// ─── SINGLE SOURCE OF TRUTH for all reissue data field access ───
// NEVER read bookingSnapshot, snapshot, or requestData.booking directly.
// All consumers MUST go through these resolvers.

// ─── Safe primitives ─────────────────────────────────────────────
export const safeString = (val) => {
  if (val === null || val === undefined) return "N/A";
  if (typeof val === "string" && val.trim() === "") return "N/A";
  return String(val);
};

// Safe date formatter
export const safeDate = (dateVal) => {
  if (!dateVal) return "N/A";
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return "N/A";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const safeDateTime = (dateVal) => {
  if (!dateVal) return "N/A";
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return "N/A";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

// Safe money formatter
export const safeMoney = (val, currency = "INR") => {
  const num = Number(val);
  if (isNaN(num)) return "N/A";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(num);
};

// Safe array helper
export const safeArray = (val) => (Array.isArray(val) ? val : []);

// Shared response extractor — handles all API envelope shapes
export const extractRequestArray = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  return [];
};

// ─── Normalize top-level payload (handles nested request.request / request.data) ─
export const resolvePayload = (request) => {
  if (!request) return null;
  return request?.request || request?.data || request;
};

// ─── RESOLVERS ───────────────────────────────────────────────────

export const getRequestId = (req) => {
  if (!req) return "N/A";
  return safeString(req.requestId || req.id || req._id);
};

export const getPnr = (req) => {
  if (!req) return "N/A";
  return safeString(
    req.pnr ||
    req.originalPnr ||
    req.newPnr ||
    req.bookingResult?.pnr ||
    req.metadata?.originalPnr ||
    req.timeline?.[0]?.metadata?.originalPnr
  );
};

export const getUserName = (req) => {
  if (!req) return "Not Available";
  const name =
    req.requesterDetails?.name ||
    req.employee?.name ||
    req.user?.name;

  if (typeof name === "string" && name.trim()) return name.trim();
  if (name && typeof name === "object") {
    const fn = safeString(name.first || name.firstName);
    const ln = safeString(name.last || name.lastName);
    if (fn !== "N/A") return `${fn} ${ln === "N/A" ? "" : ln}`.trim();
  }
  // Fallback to metadata
  const metaName =
    req.metadata?.employeeName ||
    req.corporate?.employeeName ||
    req.requesterDetails?.fullName;
  if (metaName && typeof metaName === "string" && metaName.trim()) return metaName.trim();

  return "Not Available";
};

export const getUserEmail = (req) => {
  if (!req) return "N/A";
  return safeString(
    req.user?.email ||
    req.employee?.email ||
    req.requesterDetails?.email ||
    req.metadata?.employeeEmail
  );
};

/**
 * Journey type — reads from preferredJourney.metadata.searchParams.journeyType
 * Returns human-readable string. NEVER reads bookingSnapshot.
 */
export const getJourneyType = (req) => {
  if (!req) return "N/A";
  const type =
    req?.preferredJourney?.metadata?.searchParams?.journeyType ??
    req?.metadata?.journeyType ??
    req?.journeyType ??
    0;

  const mapping = {
    0: "Not Set",
    1: "One Way",
    2: "Round Trip",
    3: "Multi City",
  };

  return mapping[type] || safeString(type) || "Not Set";
};

export const resolvePrimarySegment = (req = {}) =>
  req?.selectedSegments?.[0] ||
  req?.segments?.[0] ||
  req?.preferredJourney?.segments?.[0] ||
  req?.bookingSnapshot?.segments?.[0] ||
  req?.preferredJourney ||
  req?.metadata?.selectedSegments?.[0] ||
  // Online DTO (toReissueDto) stores journey under newJourney / oldJourney
  req?.newJourney?.segments?.[0] ||
  req?.oldJourney?.segments?.[0] ||
  {};

const airlineCodeMap = {
  "6E": "Indigo",
  "UK": "Vistara",
  "AI": "Air India",
  "SG": "SpiceJet",
  "I5": "AirAsia India",
  "G8": "Go First",
  "QP": "Akasa Air",
};

export const resolveAirline = (req = {}) => {
  const segment = resolvePrimarySegment(req);

  return (
    segment?.airlineName ||
    segment?.airline ||
    req?.bookingSnapshot?.airlineName ||
    req?.selectedFlight?.airlineName ||
    req?.metadata?.airlineName ||
    req?.metadata?.selectedSegments?.[0]?.airlineName ||
    // Online DTO fallbacks
    req?.newJourney?.segments?.[0]?.airlineName ||
    req?.oldJourney?.segments?.[0]?.airlineName ||
    req?.airline ||
    airlineCodeMap[segment?.airlineCode || segment?.airline] ||
    "N/A"
  );
};

export const resolveDeparture = (req = {}) => {
  const segment = resolvePrimarySegment(req);

  return (
    segment?.departureTime ||
    req?.preferredJourney?.departureTime ||
    req?.departureTime ||
    req?.selectedFlight?.departureTime ||
    req?.newJourney?.segments?.[0]?.departureTime ||
    null
  );
};

export const resolveArrival = (req = {}) => {
  const segment = resolvePrimarySegment(req);

  return (
    segment?.arrivalTime ||
    req?.preferredJourney?.arrivalTime ||
    req?.arrivalTime ||
    req?.selectedFlight?.arrivalTime ||
    req?.newJourney?.segments?.[0]?.arrivalTime ||
    null
  );
};

export const resolveDuration = (req = {}) => {
  const segment = resolvePrimarySegment(req);

  const raw =
    segment?.duration ||
    req?.preferredJourney?.duration ||
    req?.duration ||
    req?.selectedFlight?.duration ||
    0;

  if (!raw) return "N/A";

  // Already formatted (e.g. "2h 10m", "1h 30m")
  if (typeof raw === "string" && /h\s*\d+m/.test(raw)) return raw;

  const mins = Number(raw);
  if (isNaN(mins) || mins <= 0) return typeof raw === "string" ? raw : "N/A";

  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;

  return `${hrs}h ${rem}m`;
};

export const resolveTotalFare = (req = {}) =>
  req?.pricingSnapshot?.totalAmount ||
  req?.pricingSnapshot?.totalFare ||
  req?.selectedFlight?.totalFare ||
  req?.selectedFlight?.totalEstimate ||
  req?.fareQuote?.totalFare ||
  req?.pricing?.grandTotal ||
  req?.reissuePricingSnapshot?.totalAmount ||
  req?.reissuePricingSnapshot?.totalEstimate ||
  req?.totalEstimate ||
  // Online DTO: totalAdjustment is the net billing amount
  req?.totalAdjustment ||
  0;

export const resolveOldFare = (req = {}) =>
  req?.oldFare ||
  req?.pricingSnapshot?.oldFare ||
  req?.fareAudit?.oldFare ||
  req?.bookingSnapshot?.oldFare ||
  // Online DTO: oldJourney may hold the original fare
  req?.oldJourney?.totalFare ||
  0;

export const resolveNewFare = (req = {}) =>
  req?.newFare ||
  req?.pricingSnapshot?.newFare ||
  req?.pricingSnapshot?.totalAmount ||
  req?.reissuePricingSnapshot?.newFare ||
  resolveTotalFare(req);

export const resolveFareDifference = (req = {}) => {
  const explicit =
    req?.fareDifference ||
    req?.pricingSnapshot?.fareDifference ||
    // Online DTO exposes fareDifference directly at top level
    req?.totalAdjustment;

  if (explicit != null) return explicit;

  return Math.max(resolveNewFare(req) - resolveOldFare(req), 0);
};

export const resolveReissueCharge = (req = {}) =>
  req?.reissueCharge ||
  req?.pricingSnapshot?.reissueCharge ||
  req?.penaltyAmount ||
  // Online DTO field name
  req?.reissueCharges ||
  0;

export const resolveRefund = (req = {}) =>
  req?.refundAmount ||
  req?.pricingSnapshot?.refundEstimate ||
  req?.refundEstimate ||
  0;

export const resolveBookingRef = (req = {}) =>
  req?.bookingReference ||
  req?.orderId ||
  req?.metadata?.orderId ||
  req?.bookingSnapshot?.bookingReference ||
  req?.bookingResult?.orderId ||
  req?.bookingRef ||
  "N/A";

export const resolveCabinClass = (req = {}) => {
  const raw =
    resolvePrimarySegment(req)?.cabinClass ||
    req?.metadata?.searchParams?.cabinClass ||
    req?.preferredJourney?.cabinClass ||
    "";
  
  const map = { 1: "Economy", 2: "Premium Economy", 3: "Business", 4: "First" };
  return map[raw] || raw || "Economy";
};

export const resolveJourneyType = (req = {}) => {
  const raw = req?.metadata?.searchParams?.journeyType ?? req?.journeyType;
  const map = { 0: "Not Set", 1: "One Way", 2: "Round Trip", 3: "Multi City" };
  return map[raw] || raw || "One Way";
};

/**
 * Airline — reads from selectedFlight, preferredJourney, selectedSegments, reissueHistory.
 * NEVER reads bookingSnapshot.airline.
 */
export const getAirline = (req) => {
  if (!req) return "N/A";
  return (
    req?.selectedSegments?.[0]?.airlineName ||
    req?.segments?.[0]?.airlineName ||
    req?.selectedFlight?.airlineName ||
    req?.preferredJourney?.airlineName ||
    req?.preferredFlight?.airlineName ||
    req?.reissueHistory?.[0]?.newFlight?.[0]?.airlineName ||
    req?.airlineName ||
    req?.airline ||
    "N/A"
  );
};

/**
 * Total fare — reads from preferredJourney.totalEstimate, reissuePricingSnapshot, etc.
 * NEVER reads bookingSnapshot.totalFare.
 * Returns formatted currency string.
 */
export const getTotalFare = (req) => {
  if (!req) return "N/A";
  const fare =
    req?.totalEstimate ??
    req?.preferredJourney?.totalEstimate ??
    req?.reissuePricingSnapshot?.totalEstimate ??
    req?.selectedFlight?.totalEstimate ??
    req?.preferredJourney?.fare ??
    req?.newFare ??
    0;

  const currency =
    req?.currency ||
    req?.preferredJourney?.currency ||
    "INR";

  if (!fare && fare !== 0) return "N/A";
  return `${currency} ${Number(fare).toLocaleString("en-IN")}`;
};

export const getCurrency = (req) => {
  if (!req) return "INR";
  return safeString(req.currency || req.preferredJourney?.currency || "INR");
};

/**
 * Route — reads from preferredJourney, selectedFlight, selectedSegments, oldJourney.
 * NEVER reads bookingSnapshot.
 */
export const getRoute = (req) => {
  if (!req) return "N/A";

  // Offline reissue schema
  if (req?.preferredJourney?.origin && req?.preferredJourney?.destination) {
    return `${req.preferredJourney.origin} → ${req.preferredJourney.destination}`;
  }
  if (req?.selectedFlight?.origin && req?.selectedFlight?.destination) {
    return `${req.selectedFlight.origin} → ${req.selectedFlight.destination}`;
  }

  // Online reissue DTO: oldJourney sectors or segments
  const oldJourney = req.oldJourney;
  if (oldJourney) {
    const sectors = Array.isArray(oldJourney.sectors) ? oldJourney.sectors : [];
    if (sectors.length) return sectors.join(" / ");
    const segs = Array.isArray(oldJourney.segments) ? oldJourney.segments : [];
    if (segs.length) {
      const first = segs[0];
      const last = segs[segs.length - 1];
      const o = first?.origin?.airportCode || first?.origin || "?";
      const d = last?.destination?.airportCode || last?.destination || "?";
      if (o !== "?" || d !== "?") return `${o} → ${d}`;
    }
  }

  // metadata.selectedRoute
  if (req?.metadata?.selectedRoute) {
    return req.metadata.selectedRoute.replace(/-/g, " → ");
  }

  // selectedSegments chain
  const segs = safeArray(req?.selectedSegments);
  if (segs.length) {
    const origins = segs.map((s) => s.origin || s.Origin || "?");
    const lastDest = segs[segs.length - 1]?.destination || segs[segs.length - 1]?.Destination || "?";
    return [...origins, lastDest].filter(Boolean).join(" → ");
  }

  // reissueHistory
  const histSegs = safeArray(req?.reissueHistory?.[0]?.newFlight);
  if (histSegs.length) {
    const first = histSegs[0];
    const last = histSegs[histSegs.length - 1];
    const o = first?.origin?.airportCode || first?.origin || "?";
    const d = last?.destination?.airportCode || last?.destination || "?";
    if (o !== "?" || d !== "?") return `${o} → ${d}`;
  }

  return "N/A";
};

/**
 * Booking reference — reads from metadata, bookingReference, bookingId.
 * NEVER reads bookingSnapshot.
 */
export const getBookingRef = (req) => {
  if (!req) return "N/A";
  return (
    req?.metadata?.orderId ||
    req?.bookingReference ||
    req?.orderId ||
    req?.bookingRef ||
    req?.booking?.orderId ||
    req?.bookingId ||
    "N/A"
  );
};

/**
 * Ticket URL — reads from revisedTicketUrl, generatedTicketUrl, timeline, reissueHistory.
 * Returns absolute URL or null.
 */
export const getTicketUrl = (req) => {
  if (!req) return null;
  const url =
    req?.generatedTicketUrl ||
    req?.revisedTicketUrl ||
    req?.reissuedTicketUrl ||
    req?.downloadEndpoints?.ticket ||
    req?.revisedTicket?.url ||
    req?.uploadedTicket?.url ||
    req?.timeline?.find((t) => t?.metadata?.generatedTicketUrl)
      ?.metadata?.generatedTicketUrl ||
    req?.reissueHistory?.[0]?.pdfUrl ||
    "";

  if (!url) return null;
  if (url.startsWith("http")) return url;

  // Remove local filesystem paths
  const cleaned = url
    .replace(/\\/g, "/")
    .replace(/^.*uploads\//, "/uploads/");

  // Resolve to actual API base url instead of dev server to avoid Vite catch-all
  const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";
  const serverHost = baseUrl.replace(/\/api\/v1\/?$/, ""); 

  return `${serverHost}${cleaned}`;
};

export const resolveTicketUrl = getTicketUrl;

export const getStatus = (req) => {
  if (!req) return "N/A";
  return safeString(req.status || "PENDING");
};

export const getRequestedDate = (req) => {
  if (!req) return "N/A";
  return safeDate(
    req.createdAt ||
    req.requestedAt ||
    req.timeline?.[0]?.at
  );
};

export const getFareDifference = (req) => {
  if (!req) return 0;
  return Number(
    req.fareDifference ??
    req.preferredJourney?.fareDifference ??
    req.selectedFlight?.fareDifference ??
    req.reissuePricingSnapshot?.fareDifference ??
    0
  );
};

export const getSegments = (req) => {
  if (!req) return [];
  return safeArray(
    req.selectedSegments ||
    req.preferredJourney?.segments ||
    req.preferredFlight?.segments ||
    req.selectedFlight?.segments ||
    req.reissueHistory?.[0]?.newFlight
  );
};

export const getStatusTone = (status) => {
  switch (status) {
    case "COMPLETED":
    case "TICKET_GENERATED":
    case "APPROVED":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "IN_PROGRESS":
    case "ASSIGNED":
    case "OFFLINE_REQUIRED":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "PENDING":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "REJECTED":
    case "FAILED":
      return "bg-rose-50 text-rose-700 border-rose-200";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
};

// ─── Backward-compat aliases (kept for any remaining imports) ─────
export const resolvePnr = getPnr;
export const safeFormatDate = safeDate;
export const safeFormatDateTime = safeDateTime;
export const resolveMoney = safeMoney;
