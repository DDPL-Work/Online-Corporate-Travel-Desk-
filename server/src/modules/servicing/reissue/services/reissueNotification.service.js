const { notify } = require("../../../../notifications/orchestrator");
const EVENTS = require("../../../../events/eventConstants");
const domainEventBus = require("../../shared/domainEventBus");
const reissueRepository = require("../repositories/reissue.repository");
const { DOMAIN_EVENTS } = require("../constants/reissue.constants");

let initialized = false;

function mapDomainEventToNotification(domainEvent) {
  switch (domainEvent) {
    // ── Online reissue events ──
    case DOMAIN_EVENTS.REISSUE_CREATED:
      return EVENTS.REISSUE_CREATED;
    case DOMAIN_EVENTS.REISSUE_ELIGIBILITY_CHECKED:
      return EVENTS.REISSUE_ELIGIBILITY_CHECKED;
    case DOMAIN_EVENTS.REISSUE_SEARCH_COMPLETED:
      return EVENTS.REISSUE_SEARCH_COMPLETED;
    case DOMAIN_EVENTS.REISSUE_QUOTE_RECEIVED:
      return EVENTS.REISSUE_QUOTE_RECEIVED;
    case DOMAIN_EVENTS.REISSUE_BILLING_RESERVED:
      return EVENTS.REISSUE_BILLING_RESERVED;
    case DOMAIN_EVENTS.REISSUE_PROCESSING_STARTED:
      return EVENTS.REISSUE_PROCESSING_STARTED;
    case DOMAIN_EVENTS.REISSUE_OPS_ASSIGNED:
      return EVENTS.REISSUE_OPS_ASSIGNED;
    case DOMAIN_EVENTS.REISSUE_TICKET_UPLOADED:
      return EVENTS.REISSUE_TICKET_UPLOADED;
    case DOMAIN_EVENTS.REISSUE_COMPLETED:
      return EVENTS.REISSUE_COMPLETED;
    case DOMAIN_EVENTS.REISSUE_FAILED:
      return EVENTS.REISSUE_FAILED;

    // ── Offline reissue events ──
    case DOMAIN_EVENTS.OFFLINE_REISSUE_CREATED:
      return EVENTS.OFFLINE_REISSUE_CREATED;
    case DOMAIN_EVENTS.OFFLINE_REISSUE_UPDATED:
      return EVENTS.OFFLINE_REISSUE_UPDATED;
    case DOMAIN_EVENTS.OFFLINE_TICKET_GENERATED:
      return EVENTS.OFFLINE_TICKET_GENERATED;

    default:
      return null;
  }
}

class ReissueNotificationService {
  async logPendingNotification(reissueRequestId, event) {
    // Only log to online ReissueRequest (offline uses separate collection)
    try {
      const request = await reissueRepository.findById(reissueRequestId);
      if (!request) return;

      request.notificationLogs.push({
        event,
        channel: "inapp",
        status: "pending",
        message: `Queued notification for ${event}`,
        sentAt: new Date(),
      });
      await request.save();
    } catch {
      // Offline requests don't have notificationLogs array — skip silently
    }
  }

  registerSubscribers() {
    if (initialized) return;
    initialized = true;

    Object.values(DOMAIN_EVENTS).forEach((domainEvent) => {
      domainEventBus.on(domainEvent, async (payload) => {
        const notificationEvent = mapDomainEventToNotification(domainEvent);
        if (!notificationEvent) return;

        await this.logPendingNotification(payload.reissueRequestId, notificationEvent);

        const passengerId = payload.userId || payload.metadata?.recipientId || null;
        if (!passengerId) return;

        notify(notificationEvent, {
          relatedId: payload.reissueRequestId,
          reissueId: payload.reissueId,
          bookingId: payload.bookingId,
          corporateId: payload.corporateId,
          employeeId: passengerId,
          recipientId: passengerId,
          recipientRole: "employee",
          employeeEmail: payload.metadata?.employeeEmail,
          employeeName: payload.metadata?.employeeName,
          orderId: payload.metadata?.orderId || payload.reissueId,
          changeDetails: payload.metadata?.changeDetails,
          requestedMode: payload.metadata?.mode,
          status: payload.metadata?.status,
          generatedTicketUrl: payload.metadata?.generatedTicketUrl || null,
          strictRecipients: [
            {
              userId: passengerId,
              email: payload.metadata?.employeeEmail || null,
              corporateId: payload.corporateId || null,
              role: "employee",
            },
          ],
        });
      });
    });
  }
}

module.exports = new ReissueNotificationService();
