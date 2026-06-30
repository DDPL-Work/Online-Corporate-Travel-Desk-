const domainEventBus = require("../../shared/domainEventBus");
const { assertTransition } = require("../utils/reissueStatusMachine.util");
const { REISSUE_STATUSES } = require("../constants/reissue.constants");

class ReissueAuditService {
  transition(reissueRequest, nextStatus, context = {}) {
    assertTransition(reissueRequest.status, nextStatus, context);

    const now = new Date();
    reissueRequest.status = nextStatus;
    reissueRequest.timeline.push({
      status: nextStatus,
      title: context.title || nextStatus,
      description: context.description || "",
      actorId: context.actorId || null,
      actorRole: context.actorRole || null,
      at: now,
      metadata: context.metadata || {},
    });
    reissueRequest.auditLogs.push({
      action: context.eventName || nextStatus,
      actorId: context.actorId || null,
      actorRole: context.actorRole || null,
      message: context.auditMessage || context.description || nextStatus,
      at: now,
      metadata: context.metadata || {},
    });

    if (nextStatus === REISSUE_STATUSES.COMPLETED) {
      reissueRequest.completedAt = now;
    }
    if (nextStatus === REISSUE_STATUSES.FAILED) {
      reissueRequest.failedAt = now;
    }
    if (nextStatus === REISSUE_STATUSES.CANCELLED) {
      reissueRequest.cancelledAt = now;
    }

    if (context.eventName) {
      domainEventBus.emit(context.eventName, {
        reissueRequestId: reissueRequest._id.toString(),
        reissueId: reissueRequest.reissueId,
        bookingId: reissueRequest.bookingId?.toString?.() || reissueRequest.bookingId,
        corporateId:
          reissueRequest.corporateId?.toString?.() || reissueRequest.corporateId,
        userId: reissueRequest.userId?.toString?.() || reissueRequest.userId,
        actorId: context.actorId || null,
        actorRole: context.actorRole || null,
        metadata: context.metadata || {},
      });
    }
  }

  appendAudit(reissueRequest, action, context = {}) {
    reissueRequest.auditLogs.push({
      action,
      actorId: context.actorId || null,
      actorRole: context.actorRole || null,
      message: context.message || action,
      at: new Date(),
      metadata: context.metadata || {},
    });
  }
}

module.exports = new ReissueAuditService();
