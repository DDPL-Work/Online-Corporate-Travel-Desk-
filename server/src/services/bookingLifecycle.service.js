const BookingRequest = require("../models/BookingRequest");
const CancellationQuery = require("../models/CancellationQuery");
const OfflineReissueRequest = require("../modules/servicing/reissue/schemas/OfflineReissueRequest.schema");

const LIFECYCLE_EVENT_TYPES = {
  BOOKING_CREATED: "BOOKING_CREATED",
  BOOKING_APPROVED: "BOOKING_APPROVED",
  BOOKING_REJECTED: "BOOKING_REJECTED",
  TICKET_ISSUED: "TICKET_ISSUED",
  CANCELLATION_REQUESTED: "CANCELLATION_REQUESTED",
  CANCELLATION_AUDIT: "CANCELLATION_AUDIT",
  CANCELLATION_EXECUTED: "CANCELLATION_EXECUTED",
  CANCELLED: "CANCELLED",
  AMENDMENT: "AMENDMENT",
  REISSUE_REQUEST_CREATED: "REISSUE_REQUEST_CREATED",
  REISSUE_FLIGHT_SELECTED: "REISSUE_FLIGHT_SELECTED",
  REISSUE_ASSIGNMENT_PENDING: "REISSUE_ASSIGNMENT_PENDING",
  REISSUE_AUTO_ASSIGNED: "REISSUE_AUTO_ASSIGNED",
  REISSUE_REASSIGNED: "REISSUE_REASSIGNED",
  REISSUE_STATUS_UPDATED: "REISSUE_STATUS_UPDATED",
  REISSUE_TICKET_GENERATED: "REISSUE_TICKET_GENERATED",
  REISSUE_PASSENGER_NOTIFIED: "REISSUE_PASSENGER_NOTIFIED",
  REISSUE_DOWNLOAD_READY: "REISSUE_DOWNLOAD_READY",
  REISSUE_COMPLETED: "REISSUE_COMPLETED",
  REISSUE_FAILED: "REISSUE_FAILED",
  REISSUE_REJECTED: "REISSUE_REJECTED",
  REISSUE_CANCELLED: "REISSUE_CANCELLED",
  REISSUE_AUDIT: "REISSUE_AUDIT",
};

const humanizeAction = (action) => {
  if (!action) return "";
  return action
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

const buildBookingLifecycleTimeline = async (bookingId) => {
  const events = [];

  const booking = await BookingRequest.findById(bookingId)
    .populate("userId", "name email")
    .lean();

  if (!booking) return events;

  const userName = booking.userId?.name
    ? `${booking.userId.name.firstName || ""} ${booking.userId.name.lastName || ""}`.trim()
    : "System";
  const userEmail = booking.userId?.email || "N/A";

  events.push({
    type: LIFECYCLE_EVENT_TYPES.BOOKING_CREATED,
    title: "Booking Created",
    description: `Booking created by ${userName} (${userEmail})`,
    actor: userName,
    actorRole: "employee",
    timestamp: booking.createdAt,
    source: "booking",
    sourceId: String(booking._id),
  });

  if (Array.isArray(booking.approvalAudit)) {
    for (const entry of booking.approvalAudit) {
      if (entry.action === "REQUEST_CREATED") continue;
      const isApproved = entry.action === "APPROVED" || entry.action === "EXECUTED";
      events.push({
        type: isApproved ? LIFECYCLE_EVENT_TYPES.BOOKING_APPROVED : LIFECYCLE_EVENT_TYPES.BOOKING_REJECTED,
        title: isApproved ? "Booking Approved" : "Booking Rejected",
        description: entry.remarks || `${isApproved ? "Approved" : "Rejected"} by ${entry.role || "System"}`,
        actor: entry.role || "System",
        actorRole: entry.role || "system",
        timestamp: entry.timestamp,
        source: "booking.approvalAudit",
        sourceId: String(booking._id),
        metadata: { action: entry.action },
      });
    }
  }

  if (booking.ticketedAt) {
    events.push({
      type: LIFECYCLE_EVENT_TYPES.TICKET_ISSUED,
      title: "Ticket Issued",
      description: "E-ticket generated",
      actor: "System",
      actorRole: "system",
      timestamp: booking.ticketedAt,
      source: "booking",
      sourceId: String(booking._id),
    });
  }

  if (Array.isArray(booking.amendmentHistory)) {
    for (const entry of booking.amendmentHistory) {
      events.push({
        type: LIFECYCLE_EVENT_TYPES.AMENDMENT,
        title: humanizeAction(entry.type || "Amendment"),
        description: `Status: ${entry.status || "N/A"}`,
        actor: "System",
        actorRole: "system",
        timestamp: entry.createdAt,
        source: "booking.amendmentHistory",
        sourceId: entry.changeRequestId || String(booking._id),
        metadata: { amendmentType: entry.type, status: entry.status },
      });
    }
  }

  if (booking.cancelledAt) {
    events.push({
      type: LIFECYCLE_EVENT_TYPES.CANCELLED,
      title: "Cancellation Done",
      description: "Booking has been cancelled",
      actor: "System",
      actorRole: "system",
      timestamp: booking.cancelledAt,
      source: "booking",
      sourceId: String(booking._id),
    });
  }

  const cancellationQuery = await CancellationQuery.findOne({ bookingId })
    .sort({ createdAt: -1 })
    .lean();

  if (cancellationQuery) {
    events.push({
      type: LIFECYCLE_EVENT_TYPES.CANCELLATION_REQUESTED,
      title: "Cancellation Requested",
      description: "Cancellation request was raised",
      actor: "System",
      actorRole: "system",
      timestamp: cancellationQuery.createdAt,
      source: "cancellationQuery",
      sourceId: String(cancellationQuery._id),
    });

    if (Array.isArray(cancellationQuery.approvalAudit)) {
      for (const entry of cancellationQuery.approvalAudit) {
        const isExecuted = entry.action === "EXECUTED";
        events.push({
          type: isExecuted
            ? LIFECYCLE_EVENT_TYPES.CANCELLATION_EXECUTED
            : LIFECYCLE_EVENT_TYPES.CANCELLATION_AUDIT,
          title: isExecuted ? "Cancellation Executed" : humanizeAction(entry.action),
          description: entry.remarks || `${humanizeAction(entry.action)} by ${entry.role || "System"}`,
          actor: entry.role || "System",
          actorRole: entry.role || "system",
          timestamp: entry.timestamp,
          source: "cancellationQuery.approvalAudit",
          sourceId: String(cancellationQuery._id),
          metadata: { action: entry.action },
        });
      }
    }
  }

  const reissueRequests = await OfflineReissueRequest.find({ bookingId })
    .sort({ createdAt: -1 })
    .lean();

  for (const reissueReq of reissueRequests) {
    if (Array.isArray(reissueReq.timeline)) {
      for (const entry of reissueReq.timeline) {
        const eventType = `REISSUE_${entry.eventType}`;
        events.push({
          type: eventType,
          title: entry.title || humanizeAction(entry.eventType),
          description: entry.description || "",
          actor: entry.actorRole || "System",
          actorRole: entry.actorRole || "system",
          timestamp: entry.at,
          source: "reissueRequest.timeline",
          sourceId: String(reissueReq._id),
          metadata: { eventType: entry.eventType, status: entry.status },
        });
      }
    }

    if (Array.isArray(reissueReq.approvalAudit)) {
      for (const entry of reissueReq.approvalAudit) {
        if (entry.action === "REQUEST_CREATED") continue;
        events.push({
          type: LIFECYCLE_EVENT_TYPES.REISSUE_AUDIT,
          title: `Reissue ${humanizeAction(entry.action)}`,
          description: entry.remarks || `${humanizeAction(entry.action)} by ${entry.role || "System"}`,
          actor: entry.role || "System",
          actorRole: entry.role || "system",
          timestamp: entry.timestamp,
          source: "reissueRequest.approvalAudit",
          sourceId: String(reissueReq._id),
          metadata: { action: entry.action },
        });
      }
    }
  }

  events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  return events;
};

module.exports = { buildBookingLifecycleTimeline, LIFECYCLE_EVENT_TYPES };
