/**
 * toReissueDto — Online ReissueRequest transformer
 *
 * After adding .populate("userId", "name email") to the repository,
 * item.userId is now a populated User object { _id, name: nameSchema, email }
 * where nameSchema = { firstName, lastName } (User model shape).
 *
 * We normalize it into a plain user: { name: String, email: String } so
 * the frontend never needs to know the User model internals.
 */

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

  // userId is populated → a User object; or raw ObjectId string if not populated
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

  return {
    id: item._id,
    reissueId: item.reissueId,
    bookingId: item.bookingId,
    originalBookingId: item.originalBookingId,
    originalPnr: item.originalPnr,
    newBookingId: item.newBookingId,
    newPnr: item.newPnr,
    userId: populatedUser ? populatedUser._id : item.userId,
    // Normalized user object — frontend reads req.user.name (always a String or null)
    user,
    corporateId: item.corporateId,
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
  };
}

module.exports = { toReissueDto };
