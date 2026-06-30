function normalizeUserName(nameField) {
  if (!nameField) return null;
  if (typeof nameField === "string") return nameField.trim() || null;
  if (typeof nameField === "object") {
    const parts = [nameField.firstName, nameField.lastName].filter(Boolean);
    return parts.length ? parts.join(" ") : null;
  }
  return null;
}

function toReissueDto(doc) {
  if (!doc) return null;
  const item = doc.toObject ? doc.toObject() : doc;
  const activeTicketSnapshot = item.activeTicketSnapshot || null;

  const populatedUser =
    item.userId && typeof item.userId === "object" && item.userId.email
      ? item.userId
      : null;

  const user = populatedUser
    ? {
        id: populatedUser._id,
        name: normalizeUserName(populatedUser.name),
        email: populatedUser.email || null,
      }
    : null;

  const originCity =
    item.oldJourney?.sectors?.[0]?.origin ||
    item.oldJourney?.segments?.[0]?.origin ||
    item.oldJourney?.segments?.[0]?.Origin ||
    "";
  const destinationCity =
    item.oldJourney?.sectors?.[0]?.destination ||
    item.oldJourney?.segments?.[0]?.destination ||
    item.oldJourney?.segments?.[0]?.Destination ||
    "";

  const primaryNewSegment = item.newJourney?.segments?.[0] || {};
  const primaryOldSegment = item.oldJourney?.segments?.[0] || {};
  const activePrimarySegment = activeTicketSnapshot?.segments?.[0] || {};

  const displayInfo = {
    pnr: activeTicketSnapshot?.pnr || item.originalPnr || item.newPnr || null,
    route:
      (originCity && destinationCity
        ? `${originCity} -> ${destinationCity}`
        : activePrimarySegment?.originCode && activePrimarySegment?.destinationCode
          ? `${activePrimarySegment.originCode} -> ${activePrimarySegment.destinationCode}`
          : null),
    status: item.status,
    userEmail: user?.email || item.metadata?.employeeEmail || null,
    userName: user?.name || item.metadata?.employeeName || null,
    corporateName:
      item.corporateId?.corporateName ||
      item.companyId?.corporateName ||
      item.metadata?.corporateName ||
      null,
    airline:
      primaryNewSegment.airlineName ||
      activePrimarySegment.airlineName ||
      primaryOldSegment.airlineName ||
      item.airline ||
      null,
    flightNumber:
      primaryNewSegment.flightNumber ||
      activePrimarySegment.flightNumber ||
      primaryOldSegment.flightNumber ||
      null,
    departureTime:
      primaryNewSegment.departureTime ||
      activePrimarySegment.departureTime ||
      primaryOldSegment.departureTime ||
      null,
    arrivalTime:
      primaryNewSegment.arrivalTime ||
      activePrimarySegment.arrivalTime ||
      primaryOldSegment.arrivalTime ||
      null,
    duration:
      primaryNewSegment.duration ||
      activePrimarySegment.duration ||
      primaryOldSegment.duration ||
      null,
    stops: primaryNewSegment.stops ?? primaryOldSegment.stops ?? 0,
    cabinClass:
      primaryNewSegment.cabinClass ||
      activePrimarySegment.cabinClass ||
      primaryOldSegment.cabinClass ||
      "Economy",
    journeyType: item.newJourney?.journeyType || item.oldJourney?.journeyType || "One Way",
    oldFare: item.oldJourney?.totalFare || 0,
    newFare: item.newJourney?.totalFare || activeTicketSnapshot?.fareSnapshot?.offeredFare || 0,
    fareDifference: item.fareDifference || 0,
    reissueCharge: item.reissueCharges || 0,
    refundEstimate: item.normalizedPricing?.refundDue || 0,
    totalEstimate: item.totalAdjustment || 0,
    currency: item.newJourney?.currency || item.oldJourney?.currency || "INR",
  };

  return {
    _type: "ONLINE",
    id: item._id,
    reissueId: item.reissueId,
    bookingId: item.bookingId,
    originalBookingId: item.originalBookingId,
    originalPnr: item.originalPnr,
    newBookingId: item.newBookingId,
    newPnr: item.newPnr,
    userId: populatedUser ? populatedUser._id : item.userId,
    user,
    corporateId: item.corporateId,
    corporateName:
      item.corporateId?.corporateName ||
      item.companyId?.corporateName ||
      item.metadata?.corporateName ||
      null,
    companyId: item.companyId,
    supplier: item.supplier,
    airline: item.airline,
    provider: item.provider,
    mode: item.mode,
    status: item.status,
    reissueType: item.reissueType,
    supplierSupport: item.supplierSupport,
    oldJourney: item.oldJourney,
    newJourney: item.newJourney,
    fareDifference: item.fareDifference,
    reissueCharges: item.reissueCharges,
    totalAdjustment: item.totalAdjustment,
    activeTicketSnapshot,
    billingMode: item.billingMode,
    billingReservation: item.billingReservation,
    walletAdjustment: item.walletAdjustment,
    creditAdjustment: item.creditAdjustment,
    opsRemarks: item.opsRemarks,
    uploadedTicket: item.uploadedTicket,
    uploadedInvoice: item.uploadedInvoice,
    revisedTicket: item.revisedTicket || item.uploadedTicket || null,
    revisedInvoice: item.revisedInvoice || item.uploadedInvoice || null,
    ticketData: item.ticketData || null,
    miniFareRules: item.miniFareRules,
    normalizedPricing: item.normalizedPricing || null,
    supplierResponse: item.supplierResponse,
    metadata: item.metadata,
    correlationId: item.correlationId,
    timeline: item.timeline,
    auditLogs: item.auditLogs,
    notificationLogs: item.notificationLogs,
    assignedOpsUserId: item.assignedOpsUserId,
    assignedAt: item.assignedAt,
    completedAt: item.completedAt,
    failedAt: item.failedAt,
    cancelledAt: item.cancelledAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    displayInfo,
  };
}

module.exports = { toReissueDto };
