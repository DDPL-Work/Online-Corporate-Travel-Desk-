function normalizeUserName(nameField) {
  if (!nameField) return null;
  if (typeof nameField === "string") return nameField.trim() || null;
  if (typeof nameField === "object") {
    const parts = [nameField.firstName, nameField.lastName].filter(Boolean);
    return parts.length ? parts.join(" ") : null;
  }
  return null;
}

function toOfflineReissueDto(doc) {
  if (!doc) return null;
  const item = doc.toObject ? doc.toObject() : doc;

  // employeeId is populated by repository: { _id, name: nameSchema, email, role, corporateId }
  const populatedEmployee =
    item.employeeId && typeof item.employeeId === "object" && item.employeeId.email
      ? item.employeeId
      : null;

  const user = populatedEmployee
    ? {
        id: populatedEmployee._id,
        name: normalizeUserName(populatedEmployee.name),
        email: populatedEmployee.email || null,
        role: populatedEmployee.role || null,
      }
    : null;
  const terminalStatuses = new Set(["COMPLETED", "FAILED", "REJECTED"]);
  const now = Date.now();
  const slaDeadline = item.slaDeadline ? new Date(item.slaDeadline).getTime() : null;
  const completedAt = item.completedAt ? new Date(item.completedAt).getTime() : null;
  const overdue = Boolean(
    slaDeadline &&
      !terminalStatuses.has(item.status) &&
      slaDeadline < now,
  );
  const breached = Boolean(
    item.breached ||
      (slaDeadline && completedAt && completedAt > slaDeadline) ||
      overdue,
  );
  const selectedFlight = item.preferredJourney
    ? {
        resultIndex: item.preferredJourney.resultIndex,
        airlineCode: item.preferredJourney.airlineCode,
        airlineName: item.preferredJourney.airlineName,
        flightNumber: item.preferredJourney.flightNumber,
        origin: item.preferredJourney.origin,
        destination: item.preferredJourney.destination,
        departureDate: item.preferredJourney.departureDate,
        returnDate: item.preferredJourney.returnDate,
        departureTime: item.preferredJourney.departureTime,
        arrivalTime: item.preferredJourney.arrivalTime,
        duration: item.preferredJourney.duration,
        stops: item.preferredJourney.stops,
        fare: item.preferredJourney.fare,
        oldFare: item.preferredJourney.oldFare,
        newFare: item.preferredJourney.newFare || item.preferredJourney.fare,
        fareDifference: item.preferredJourney.fareDifference,
        reissueCharge: item.preferredJourney.reissueCharge,
        totalEstimate: item.preferredJourney.totalEstimate,
        refundEstimate: item.preferredJourney.refundEstimate,
        currency: item.preferredJourney.currency || item.reissuePricingSnapshot?.currency || "INR",
        pricingBreakdown:
          item.preferredJourney.pricingBreakdown ||
          item.reissuePricingSnapshot?.breakdown ||
          null,
        cabinClass: item.preferredJourney.cabinClass,
        segments: item.preferredJourney.segments || [],
      }
    : item.selectedFlight || null;

  return {
    id: item._id,
    requestId: item.requestId,
    bookingId: item.bookingId,
    employeeId: populatedEmployee ? populatedEmployee._id : item.employeeId,
    // Normalized user object — always { name: String, email: String } or null
    user,
    corporateId: item.corporateId,
    pnr: item.pnr,
    originalPnr: item.originalPnr || item.pnr,
    airline: item.airline,
    preferredDate: item.preferredDate,
    remarks: item.remarks,
    status: item.status,
    assignedOpsMember: item.assignedOpsMember,
    assignedTo: item.assignedOpsMember,
    assignedAt: item.assignedAt,
    assignmentMode: item.assignmentMode,
    assignmentMethod: item.assignmentMode,
    assignmentHistory: item.assignmentHistory || [],
    opsRemarks: item.opsRemarks,
    reissuedTicketUrl: item.reissuedTicketUrl || item.generatedTicketUrl,
    generatedTicketUrl: item.generatedTicketUrl || item.reissuedTicketUrl,
    generatedAt: item.generatedAt || null,
    generatedBy: item.generatedBy || null,
    reissueHistory: item.reissueHistory || [],
    // Frontend-friendly aliases for download links
    revisedTicketUrl: item.generatedTicketUrl || item.reissuedTicketUrl,
    downloadEndpoints: {
      ticket: item.generatedTicketUrl || item.reissuedTicketUrl,
    },
    billingMode: item.billingMode,
    reissueCharges: item.reissueCharges,
    reissueCharge:
      item.reissuePricingSnapshot?.reissueCharge ??
      item.preferredJourney?.reissueCharge ??
      item.reissueCharges,
    fareDifference: item.fareDifference,
    totalAdjustment: item.totalAdjustment,
    totalEstimate:
      item.reissuePricingSnapshot?.totalEstimate ??
      item.preferredJourney?.totalEstimate ??
      item.totalAdjustment,
    oldFare:
      item.reissuePricingSnapshot?.oldFare ??
      item.preferredJourney?.oldFare ??
      null,
    newFare:
      item.reissuePricingSnapshot?.newFare ??
      item.preferredJourney?.newFare ??
      item.preferredJourney?.fare ??
      null,
    refundEstimate:
      item.reissuePricingSnapshot?.refundEstimate ??
      item.preferredJourney?.refundEstimate ??
      0,
    currency: item.reissuePricingSnapshot?.currency || item.preferredJourney?.currency || "INR",
    reissuePricingSnapshot: item.reissuePricingSnapshot || null,
    preferredJourney: item.preferredJourney || item.selectedFlight || null,
    preferredFlight: selectedFlight,
    selectedFlight,
    selectedSegments: item.selectedSegments || selectedFlight?.segments || [],
    metadata: item.metadata,
    correlationId: item.correlationId,
    timeline: item.timeline,
    auditLogs: item.auditLogs,
    slaDeadline: item.slaDeadline,
    firstResponseAt: item.firstResponseAt,
    overdue,
    breached,
    completedAt: item.completedAt,
    failedAt: item.failedAt,
    rejectedAt: item.rejectedAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

module.exports = { toOfflineReissueDto };
