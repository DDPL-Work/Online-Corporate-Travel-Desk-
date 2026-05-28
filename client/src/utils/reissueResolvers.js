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
  if (req.displayInfo?.pnr) return safeString(req.displayInfo.pnr);
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
  if (req.displayInfo?.userName) return req.displayInfo.userName;
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
  if (req.displayInfo?.userEmail) return safeString(req.displayInfo.userEmail);
  return safeString(
    req.user?.email ||
    req.employee?.email ||
    req.requesterDetails?.email ||
    req.metadata?.employeeEmail
  );
};

export const getCorporateName = (req) => {
  if (!req) return "N/A";
  if (req.displayInfo?.corporateName) return req.displayInfo.corporateName;
  return req.corporateName || req.corporateId?.corporateName || req.companyId?.corporateName || req.metadata?.corporateName || "N/A";
};

/**
 * Journey type — reads from preferredJourney.metadata.searchParams.journeyType
 * Returns human-readable string. NEVER reads bookingSnapshot.
 */
export const getJourneyType = (req) => {
  if (!req) return "N/A";
  if (req.displayInfo?.journeyType) {
    const mapping = {
      0: "Not Set",
      1: "One Way",
      2: "Round Trip",
      3: "Multi City",
    };
    const val = req.displayInfo.journeyType;
    return mapping[val] || safeString(val);
  }
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

export const resolvePrimarySegment = (req = {}) => {
  const segs = getSegments(req);
  if (segs.length > 0) return segs[0];
  // Fallback to preferredJourney if flat object
  if (req?.preferredJourney && (req.preferredJourney.origin || req.preferredJourney.destination)) {
    return req.preferredJourney;
  }
  return {};
};

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
  if (req?.displayInfo?.airline) return req.displayInfo.airline;
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
  if (req?.displayInfo?.departureTime) return req.displayInfo.departureTime;
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
  if (req?.displayInfo?.arrivalTime) return req.displayInfo.arrivalTime;
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
  if (req?.displayInfo?.duration) return req.displayInfo.duration;
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

export const resolveTotalFare = (req = {}) => {
  if (req?.displayInfo?.totalEstimate !== undefined && req?.displayInfo?.totalEstimate !== null) {
    return req.displayInfo.totalEstimate;
  }
  return (
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
    0
  );
};

export const resolveOldFare = (req = {}) => {
  if (req?.displayInfo?.oldFare !== undefined && req?.displayInfo?.oldFare !== null) {
    return req.displayInfo.oldFare;
  }
  return (
    req?.oldFare ||
    req?.reissuePricingSnapshot?.oldFare ||
    req?.pricingSnapshot?.oldFare ||
    req?.bookingId?.pricingSnapshot?.totalAmount ||
    req?.bookingId?.pricingSnapshot?.totalFare ||
    req?.booking?.pricingSnapshot?.totalAmount ||
    req?.booking?.pricingSnapshot?.totalFare ||
    req?.fareAudit?.oldFare ||
    req?.bookingSnapshot?.oldFare ||
    // Online DTO: oldJourney may hold the original fare
    req?.oldJourney?.totalFare ||
    0
  );
};

export const resolveNewFare = (req = {}) => {
  if (req?.displayInfo?.newFare !== undefined && req?.displayInfo?.newFare !== null) {
    return req.displayInfo.newFare;
  }
  return (
    req?.newFare ||
    req?.reissuePricingSnapshot?.newFare ||
    req?.pricingSnapshot?.newFare ||
    req?.selectedFlight?.newFare ||
    req?.selectedFlight?.fare ||
    req?.preferredJourney?.newFare ||
    req?.preferredJourney?.fare ||
    req?.pricingSnapshot?.totalAmount ||
    resolveTotalFare(req)
  );
};

export const resolveFareDifference = (req = {}) => {
  if (req?.displayInfo?.fareDifference !== undefined && req?.displayInfo?.fareDifference !== null) {
    return req.displayInfo.fareDifference;
  }
  const explicit =
    req?.fareDifference ||
    req?.pricingSnapshot?.fareDifference ||
    // Online DTO exposes fareDifference directly at top level
    req?.totalAdjustment;

  if (explicit != null) return explicit;

  return Math.max(resolveNewFare(req) - resolveOldFare(req), 0);
};

export const resolveReissueCharge = (req = {}) => {
  if (req?.displayInfo?.reissueCharge !== undefined && req?.displayInfo?.reissueCharge !== null) {
    return req.displayInfo.reissueCharge;
  }
  return (
    req?.normalizedPricing?.reissuePenalty ||
    req?.reissueCharge ||
    req?.pricingSnapshot?.reissueCharge ||
    req?.penaltyAmount ||
    // Online DTO field name
    req?.reissueCharges ||
    0
  );
};

export const resolveRefund = (req = {}) => {
  if (req?.displayInfo?.refundEstimate !== undefined && req?.displayInfo?.refundEstimate !== null) {
    return req.displayInfo.refundEstimate;
  }
  return (
    req?.refundAmount ||
    req?.pricingSnapshot?.refundEstimate ||
    req?.refundEstimate ||
    0
  );
};

export const resolveBookingRef = (req = {}) =>
  req?.bookingReference ||
  req?.orderId ||
  req?.metadata?.orderId ||
  req?.bookingId?.orderId ||
  req?.bookingId?.bookingReference ||
  req?.booking?.orderId ||
  req?.booking?.bookingReference ||
  req?.bookingSnapshot?.bookingReference ||
  req?.bookingResult?.orderId ||
  req?.bookingRef ||
  "N/A";

export const resolveCabinClass = (req = {}) => {
  if (req?.displayInfo?.cabinClass) return req.displayInfo.cabinClass;
  const raw =
    resolvePrimarySegment(req)?.cabinClass ||
    req?.metadata?.searchParams?.cabinClass ||
    req?.preferredJourney?.cabinClass ||
    "";
  
  const map = { 1: "Economy", 2: "Premium Economy", 3: "Business", 4: "First" };
  return map[raw] || raw || "Economy";
};

export const resolveJourneyType = (req = {}) => {
  if (req?.displayInfo?.journeyType) return req.displayInfo.journeyType;
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
  if (req.displayInfo?.airline) return req.displayInfo.airline;
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
  if (req.displayInfo?.totalEstimate !== undefined && req.displayInfo?.totalEstimate !== null) {
    const fare = req.displayInfo.totalEstimate;
    const currency = req.displayInfo.currency || "INR";
    return `${currency} ${Number(fare).toLocaleString("en-IN")}`;
  }
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
  if (req.displayInfo?.currency) return req.displayInfo.currency;
  return safeString(req.currency || req.preferredJourney?.currency || "INR");
};

const extractAirportCode = (value) => {
  if (!value) return null;

  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized || null;
  }

  if (typeof value !== "object") return null;

  return (
    value?.airportCode ||
    value?.AirportCode ||
    value?.code ||
    value?.iata ||
    value?.airport ||
    value?.Airport?.AirportCode ||
    value?.Airport?.Code ||
    value?.Airport?.airportCode ||
    null
  );
};

const normalizeRouteTokens = (value) => {
  if (!value) return [];

  if (typeof value === "string") {
    return value
      .split(/\s*(?:->|→|-|\/|,)\s*/g)
      .map((token) => token.trim())
      .filter(Boolean);
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => normalizeRouteTokens(item));
  }

  if (typeof value !== "object") return [];

  const directOrigin = extractAirportCode(
    value?.origin ||
      value?.from ||
      value?.Origin ||
      value?.originCode ||
      value?.OriginAirportCode ||
      value?.source,
  );
  const directDestination = extractAirportCode(
    value?.destination ||
      value?.to ||
      value?.Destination ||
      value?.destinationCode ||
      value?.DestinationAirportCode ||
      value?.target,
  );

  if (directOrigin || directDestination) {
    return [directOrigin, directDestination].filter(Boolean);
  }

  if (Array.isArray(value?.sectors) && value.sectors.length) {
    return value.sectors.flatMap((sector) =>
      normalizeRouteTokens(
        typeof sector === "string"
          ? sector
          : {
              origin: sector?.origin || sector?.from,
              destination: sector?.destination || sector?.to,
            },
      ),
    );
  }

  return normalizeRouteTokens(
    value?.segments ||
      value?.journeys ||
      value?.flights ||
      value?.newFlight ||
      value?.oldFlight ||
      [],
  );
};

const collapseRouteTokens = (tokens = []) =>
  tokens.reduce((accumulator, token) => {
    const normalized = String(token || "").trim();
    if (!normalized) return accumulator;
    if (accumulator[accumulator.length - 1] === normalized) return accumulator;
    accumulator.push(normalized);
    return accumulator;
  }, []);

export const resolveDisplayRoute = (req = {}) => {
  if (!req) return "N/A";
  if (req.displayInfo?.route && typeof req.displayInfo.route === "string") {
    return req.displayInfo.route.replace(/\s*->\s*/g, " → ");
  }

  const candidates = [
    req?.metadata?.selectedRoute,
    req?.preferredJourney,
    req?.selectedFlight,
    req?.preferredFlight,
    req?.selectedSegments,
    req?.segments,
    req?.newJourney,
    req?.newJourney?.segments,
    req?.oldJourney,
    req?.oldJourney?.segments,
    req?.oldJourney?.sectors,
    req?.reissueHistory?.[0]?.newFlight,
    req?.reissueHistory?.[0]?.oldFlight,
    req?.activeTicketSnapshot?.segments,
  ];

  for (const candidate of candidates) {
    const tokens = collapseRouteTokens(normalizeRouteTokens(candidate));
    if (tokens.length >= 2) {
      return tokens.join(" → ");
    }
  }

  return "N/A";
};

export const resolveWorkflowType = (req = {}) => {
  const explicitWorkflow = String(req?.creationSource?.workflow || "").toUpperCase();
  if (explicitWorkflow === "ONLINE_REISSUE") return "ONLINE_REISSUE";
  if (explicitWorkflow === "OFFLINE_REISSUE") return "OFFLINE_REISSUE";
  if (explicitWorkflow === "MANUAL_REISSUE") return "MANUAL_REISSUE";

  const discriminator = String(req?._type || req?.mode || "").toUpperCase();
  if (discriminator === "ONLINE") return "ONLINE_REISSUE";
  if (discriminator === "OFFLINE") return "OFFLINE_REISSUE";

  const rawType = String(req?.reissueType || req?.type || "").toUpperCase();
  if (rawType.includes("ONLINE")) return "ONLINE_REISSUE";
  if (rawType.includes("OFFLINE")) return "OFFLINE_REISSUE";
  if (rawType.includes("MANUAL")) return "MANUAL_REISSUE";

  return "MANUAL_REISSUE";
};

export const isVisibleLedgerRequest = (req = {}) => {
  if (!req) return false;
  if (req?.creationSource?.type === "AUTO_GENERATED") return false;
  if (String(req?.status || "").toUpperCase() === "OFFLINE_REQUIRED") return false;
  return true;
};

/**
 * Route — reads from preferredJourney, selectedFlight, selectedSegments, oldJourney.
 * NEVER reads bookingSnapshot.
 */
export const getRoute = (req) => {
  return resolveDisplayRoute(req);
  if (!req) return "N/A";
  if (req.displayInfo?.route) return req.displayInfo.route;

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
    req?.bookingReference ||
    req?.orderId ||
    req?.metadata?.orderId ||
    req?.bookingId?.orderId ||
    req?.bookingId?.bookingReference ||
    req?.booking?.orderId ||
    req?.booking?.bookingReference ||
    req?.bookingRef ||
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
  if (req.displayInfo?.fareDifference !== undefined && req.displayInfo?.fareDifference !== null) {
    return Number(req.displayInfo.fareDifference);
  }
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

  // 1. preferredJourney (preferred)
  if (req.preferredJourney) {
    if (Array.isArray(req.preferredJourney.segments)) {
      return req.preferredJourney.segments;
    }
    if (req.preferredJourney.origin || req.preferredJourney.destination) {
      return [req.preferredJourney];
    }
  }

  // 2. selectedSegments or segments
  if (Array.isArray(req.selectedSegments) && req.selectedSegments.length > 0) {
    return req.selectedSegments;
  }
  if (Array.isArray(req.segments) && req.segments.length > 0) {
    return req.segments;
  }

  // 3. Ticketed/reissued historical snapshot
  if (Array.isArray(req.reissueHistory) && req.reissueHistory.length > 0) {
    if (Array.isArray(req.reissueHistory[0].newFlight) && req.reissueHistory[0].newFlight.length > 0) {
      return req.reissueHistory[0].newFlight;
    }
    if (Array.isArray(req.reissueHistory[0].oldFlight) && req.reissueHistory[0].oldFlight.length > 0) {
      return req.reissueHistory[0].oldFlight;
    }
  }

  // 4. Original booking request segments (lowest priority fallback)
  if (req.bookingSnapshot && Array.isArray(req.bookingSnapshot.segments)) {
    return req.bookingSnapshot.segments;
  }
  if (req.bookingId && req.bookingId.flightRequest && Array.isArray(req.bookingId.flightRequest.segments)) {
    return req.bookingId.flightRequest.segments;
  }
  if (req.booking && req.booking.flightRequest && Array.isArray(req.booking.flightRequest.segments)) {
    return req.booking.flightRequest.segments;
  }
  if (req.bookingId && req.bookingId.bookingSnapshot && Array.isArray(req.bookingId.bookingSnapshot.segments)) {
    return req.bookingId.bookingSnapshot.segments;
  }
  if (req.booking && req.booking.bookingSnapshot && Array.isArray(req.booking.bookingSnapshot.segments)) {
    return req.booking.bookingSnapshot.segments;
  }

  return [];
};

export const resolveFinancialLedger = (req = {}) =>
  req?.financialLedger ||
  req?.pricingSnapshot?.financialLedger ||
  req?.reissuePricingSnapshot?.financialLedger ||
  req?.metadata?.financialLedger ||
  req?.bookingSnapshot?.financialLedger ||
  null;

const pickMoney = (...values) => {
  for (const value of values) {
    const num = Number(value);
    if (Number.isFinite(num)) return num;
  }
  return 0;
};

export const resolveFinancialBreakdown = (req = {}) => {
  const ledger = resolveFinancialLedger(req) || {};
  const ssrFinancials = req?.ssrFinancials || ledger?.ssrFinancials || {};
  const normalizedPricing = req?.normalizedPricing || {};
  const lastCycle = Array.isArray(req?.pricingHistory) && req.pricingHistory.length
    ? req.pricingHistory[req.pricingHistory.length - 1]
    : {};

  const previouslyPaid = pickMoney(
    lastCycle?.previousTotalPaid,
    ledger?.lastTicketedSnapshot?.fare?.totalFare,
    ledger?.currentTicketValue,
    ledger?.originalTicketAmount,
  );
  const newFlight = pickMoney(
    normalizedPricing?.newFlightBase,
    lastCycle?.newFare,
    req?.lastTicketedSnapshot?.fare?.totalFare,
    req?.newFare,
    req?.displayInfo?.newFare,
  );
  const newSSR = pickMoney(
    normalizedPricing?.newSSRTotal,
    lastCycle?.newSSR,
    ssrFinancials?.newSSR,
    ledger?.currentSSRValue,
  );
  const ssrRefund = pickMoney(
    ssrFinancials?.refundableSSR,
    lastCycle?.refundSSRValue,
  );
  const reissuePenalty = pickMoney(
    normalizedPricing?.reissuePenalty,
    lastCycle?.airlinePenalty,
    req?.reissueCharges,
    req?.reissueCharge,
  );
  const netCollection = pickMoney(
    req?.totalAdjustment,
    lastCycle?.additionalCollection,
    normalizedPricing?.netPayable > 0 ? normalizedPricing.netPayable : null,
  );
  const netRefund = pickMoney(
    normalizedPricing?.refundDue,
    lastCycle?.refundAmount,
  );
  const currency =
    req?.displayInfo?.currency ||
    req?.currency ||
    req?.reissuePricingSnapshot?.currency ||
    req?.pricingSnapshot?.currency ||
    "INR";

  return {
    ledger,
    previouslyPaid,
    newFlight,
    newSSR,
    ssrRefund,
    reissuePenalty,
    netCollection,
    netRefund,
    currency,
    ssrFinancials,
  };
};

const STATUS_PRIORITY = {
  PENDING_ASSIGNMENT: 125,
  ASSIGNED: 120,
  IN_PROGRESS: 115,
  WAITING_AIRLINE: 110,
  PROCESSING: 105,
  BILLING_RESERVED: 100,
  QUOTE_RECEIVED: 95,
  SEARCH_COMPLETED: 90,
  CREATED: 85,
  OFFLINE_REQUIRED: 80,
  TICKET_GENERATED: 70,
  COMPLETED: 60,
  FAILED: 20,
  REJECTED: 15,
  CANCELLED: 10,
};

export const dedupeLatestActionableRequests = (items = []) => {
  const sorted = [...safeArray(items)]
    .filter((item) => isVisibleLedgerRequest(item))
    .sort((left, right) => {
    const generationDiff =
      Number(right?.bookingLineage?.reissueGeneration || 0) -
      Number(left?.bookingLineage?.reissueGeneration || 0);
    if (generationDiff !== 0) return generationDiff;

    const statusDiff =
      (STATUS_PRIORITY[right?.status] || 0) - (STATUS_PRIORITY[left?.status] || 0);
    if (statusDiff !== 0) return statusDiff;
      return new Date(right?.updatedAt || right?.createdAt || 0) - new Date(left?.updatedAt || left?.createdAt || 0);
    });

  const seen = new Set();
  return sorted.filter((item) => {
    const key =
      item?.bookingLineage?.originalBookingId ||
      item?.bookingLineage?.originalMongoBookingId ||
      item?.originalPnr ||
      item?.displayInfo?.pnr ||
      item?.bookingId ||
      item?.id;
    if (!key || seen.has(String(key))) return false;
    seen.add(String(key));
    return true;
  });
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
    case "PENDING_ASSIGNMENT":
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
