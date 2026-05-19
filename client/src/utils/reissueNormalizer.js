/**
 * Canonical Normalizer for ALL Reissue Requests (Online, Offline, Legacy)
 * 
 * Ensures a single, stable UI shape for any reissue request regardless of origin.
 */

export const getJourneyTypeLabel = (type) => {
  if (type === 1 || type === "1") return "ONE WAY";
  if (type === 2 || type === "2") return "ROUND TRIP";
  if (type === 3 || type === "3") return "MULTI CITY";
  return "NOT SET";
};

export const hasTicket = (request) => {
  if (!request) return false;
  return !!(
    request.generatedTicketUrl ||
    request.reissuedTicketUrl ||
    request.revisedTicketUrl ||
    request.downloadEndpoints?.ticket ||
    request.reissueHistory?.[0]?.pdfUrl
  );
};

export const normalizeReissueRequest = (request) => {
  if (!request) return null;

  // 1. Core IDs
  const id = request._id || request.id;
  const requestId = request.requestId || request.requestID || id?.substring(0, 8)?.toUpperCase();

  // 2. Booking References
  const pnr = 
    request.originalPnr || 
    request.pnr || 
    request.bookingResult?.pnr || 
    request.bookingSnapshot?.pnr || 
    "PENDING";
    
  const bookingRef = 
    request.bookingRef || 
    request.bookingSnapshot?.bookingId || 
    request.bookingId || 
    "N/A";

  // 3. Employee Info
  const employeeName = 
    request.user?.name || 
    request.employee?.name || 
    request.metadata?.employeeName || 
    request.corporate?.name ||
    "Unknown Employee";

  const employeeEmail = 
    request.user?.email || 
    request.metadata?.employeeEmail || 
    request.corporate?.email ||
    "";

  // 4. Status & Dates
  const status = request.status || "UNKNOWN";
  
  const rawDate = request.createdAt || request.requestedAt || request.date;
  const requestedAt = rawDate 
    ? new Date(rawDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "Unknown Date";

  // 5. Journey Details
  const jTypeRaw = request.journeyType ?? request.selectedFlight?.journeyType ?? request.preferredJourney?.journeyType;
  const journeyType = getJourneyTypeLabel(jTypeRaw);

  const route = 
    request.preferredJourney ? `${request.preferredJourney.origin || 'Any'}-${request.preferredJourney.destination || 'Any'}` :
    request.selectedFlight ? `${request.selectedFlight.segments?.[0]?.[0]?.origin?.airport || ''}-${request.selectedFlight.segments?.[0]?.[request.selectedFlight.segments[0].length-1]?.destination?.airport || ''}` :
    request.metadata?.selectedRoute ||
    request.segments?.map(s => `${s.origin}-${s.destination}`).join(", ") ||
    "Unknown Route";

  const airline = 
    request.selectedFlight?.airlineName || 
    request.preferredJourney?.airlineName || 
    request.segments?.[0]?.airline ||
    "Unknown Airline";

  const flightNumber = 
    request.selectedFlight?.segments?.[0]?.[0]?.airline?.flightNumber || 
    request.segments?.[0]?.flightNumber ||
    "";

  // 6. Pricing & Estimates
  const oldFare = request.pricing?.oldFare || request.oldFare || 0;
  const newFare = request.pricing?.newFare || request.newFare || 0;
  const fareDifference = request.pricing?.fareDifference || request.fareDifference || request.estimatedCost || 0;
  const totalEstimate = request.totalEstimate || request.pricing?.totalEstimate || fareDifference;
  const currency = request.pricing?.currency || request.currency || "INR";

  // 7. Request Details
  const remarks = request.reason || request.remarks || request.metadata?.reason || "No remarks provided";

  // 8. Tickets
  const generatedTicketUrl = request.generatedTicketUrl || null;
  const revisedTicketUrl = request.reissuedTicketUrl || request.revisedTicketUrl || request.downloadEndpoints?.ticket || request.reissueHistory?.[0]?.pdfUrl || null;
  const downloadUrl = revisedTicketUrl || generatedTicketUrl;
  const ticketAvailable = hasTicket(request);

  // 9. Assignee
  const assignedOpsMember = request.assignedTo || request.opsAssignee || null;

  return {
    id,
    requestId,
    pnr,
    bookingRef,
    employeeName,
    employeeEmail,
    status,
    requestedAt,
    journeyType,
    route,
    airline,
    flightNumber,
    oldFare,
    newFare,
    fareDifference,
    totalEstimate,
    currency,
    remarks,
    generatedTicketUrl,
    revisedTicketUrl,
    downloadUrl,
    ticketAvailable,
    selectedFlight: request.selectedFlight || null,
    preferredJourney: request.preferredJourney || null,
    timeline: request.timeline || request.logs || [],
    assignedOpsMember,
    type: request.reissueType || request.type || "REISSUE", // Added type for completeness
    raw: request
  };
};

export const getStatusTone = (status) => {
  switch (status) {
    case "PENDING":
    case "IN_PROGRESS":
    case "PROCESSING":
      return "bg-amber-50 text-amber-600 border-amber-200";
    case "APPROVED":
    case "TICKET_GENERATED":
    case "COMPLETED":
      return "bg-emerald-50 text-emerald-600 border-emerald-200";
    case "REJECTED":
    case "CANCELLED":
    case "FAILED":
      return "bg-rose-50 text-rose-600 border-rose-200";
    default:
      return "bg-slate-50 text-slate-600 border-slate-200";
  }
};
