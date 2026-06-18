const mongoose = require("mongoose");
const OpsMember = require("../../../../models/OpsMember");
const ApiError = require("../../../../utils/ApiError");
const logger = require("../../../../utils/logger");
const { sendNotification } = require("../../../../utils/notificationService");
const {
  evaluateReissueAssignmentEligibility,
  isEligibleForReissueAssignment,
} = require("../../../../utils/reissueAssignmentEligibility.util");
const {
  OFFLINE_STATUSES,
  TERMINAL_OFFLINE_STATUSES,
} = require("../constants/reissue.constants");

const DEFAULT_MAX_CONCURRENT_ASSIGNMENTS = 10;

const toObjectId = (value) => {
  if (!value) return null;
  if (value instanceof mongoose.Types.ObjectId) return value;
  if (!mongoose.Types.ObjectId.isValid(value)) return null;
  return new mongoose.Types.ObjectId(value);
};

const isSameObjectId = (left, right) => {
  if (!left || !right) return false;
  return String(left) === String(right);
};

class ReissueAssignmentService {
  getEligibleOpsQuery() {
    return {
      isDeleted: false,
      isAvailableForReissues: true,
      autoAssignmentEnabled: true,
      $expr: {
        $lt: [
          { $ifNull: ["$currentWorkload", 0] },
          { $ifNull: ["$maxConcurrentAssignments", DEFAULT_MAX_CONCURRENT_ASSIGNMENTS] },
        ],
      },
    };
  }

  async listEligibleOpsMembers({ session } = {}) {
    const candidates = await OpsMember.find(this.getEligibleOpsQuery())
      .sort({ currentWorkload: 1, lastAssignedAt: 1, _id: 1 })
      .session(session || null);

    return candidates.filter((member) =>
      isEligibleForReissueAssignment(member, {
        context: {
          service: "reissueAssignmentService.listEligibleOpsMembers",
        },
      }),
    );
  }

  async findNextEligibleOpsMember({ session } = {}) {
    const candidates = await OpsMember.find(this.getEligibleOpsQuery())
      .sort({ currentWorkload: 1, lastAssignedAt: 1, _id: 1 })
      .session(session || null);

    return (
      candidates.find((member) =>
        isEligibleForReissueAssignment(member, {
          context: {
            service: "reissueAssignmentService.findNextEligibleOpsMember",
          },
        }),
      ) || null
    );
  }

  async validateAssignableOpsMember(opsMemberId, { session } = {}) {
    const normalizedId = toObjectId(opsMemberId);
    if (!normalizedId) {
      throw new ApiError(400, "A valid OPS member is required for reassignment");
    }

    const opsMember = await OpsMember.findById(normalizedId).session(session || null);

    const eligibility = evaluateReissueAssignmentEligibility(opsMember, {
      context: {
        service: "reissueAssignmentService.validateAssignableOpsMember",
        opsMemberId: String(normalizedId),
      },
    });

    if (!eligibility.eligible) {
      throw new ApiError(
        400,
        "Selected OPS member is not eligible for offline reissue assignment",
      );
    }

    return opsMember;
  }

  async incrementOpsWorkload(opsMemberId, { session, assignedAt = new Date() } = {}) {
    const opsMember = await OpsMember.findById(opsMemberId).session(session || null);
    if (!opsMember) {
      throw new ApiError(404, "Assigned OPS member not found");
    }

    opsMember.lastAssignedAt = assignedAt;
    opsMember.currentWorkload = Math.max(0, Number(opsMember.currentWorkload || 0) + 1);
    opsMember.currentActiveAssignments = Math.max(
      0,
      Number(opsMember.currentActiveAssignments || 0) + 1,
    );
    opsMember.lastAssignmentType = "REISSUE";
    opsMember.assignmentStats = opsMember.assignmentStats || {};
    opsMember.assignmentStats.totalAssigned =
      Number(opsMember.assignmentStats.totalAssigned || 0) + 1;

    await opsMember.save({ session });
    return opsMember;
  }

  async decrementOpsWorkload(opsMemberId, { session } = {}) {
    const normalizedId = toObjectId(opsMemberId);
    if (!normalizedId) return null;

    const opsMember = await OpsMember.findById(normalizedId).session(session || null);
    if (!opsMember) return null;

    opsMember.currentWorkload = Math.max(0, Number(opsMember.currentWorkload || 0) - 1);
    opsMember.currentActiveAssignments = Math.max(
      0,
      Number(opsMember.currentActiveAssignments || 0) - 1,
    );

    await opsMember.save({ session });
    return opsMember;
  }

  buildAssignmentHistory({ assignedTo, assignedBy, mode, remarks, assignedAt }) {
    return {
      assignedTo,
      assignedBy: toObjectId(assignedBy?._id || assignedBy?.id) || null,
      assignedAt: assignedAt || new Date(),
      mode,
      remarks: remarks || "",
    };
  }

  async notifyAssignedOpsMember({ request, assignedOpsMember, assignedBy, mode }) {
    if (!request || !assignedOpsMember?._id) return;

    try {
      await sendNotification({
        recipient: assignedOpsMember._id,
        recipientRole: "ops-member",
        corporateId: request.corporateId,
        sender: assignedBy?._id || assignedBy?.id || null,
        title: mode === "MANUAL" ? "Offline reissue reassigned" : "New offline reissue assigned",
        message:
          mode === "MANUAL"
            ? `Request ${request.requestId} has been reassigned to you.`
            : `Request ${request.requestId} has been assigned to you.`,
        type: "offline_reissue_assignment",
        relatedId: request._id,
        link: `/reissue/offline/${request._id}`,
      });
    } catch (notificationError) {
      logger.warn("offline_reissue_assignment_notification_failed", {
        requestId: request.requestId || request._id?.toString?.(),
        assignedOpsId: assignedOpsMember._id.toString(),
        error: notificationError.message,
      });
    }
  }

  async assignOfflineReissue({
    request,
    session,
    assignedBy = null,
    mode = "ROUND_ROBIN",
    remarks = "",
    opsMemberId = null,
    notify = true,
    persistRequest = true,
  } = {}) {
    if (!request) {
      throw new ApiError(400, "Offline reissue request is required for assignment");
    }

    const now = new Date();
    const previousAssigneeId = request.assignedOpsMember || null;
    const nextOpsMember = opsMemberId
      ? await this.validateAssignableOpsMember(opsMemberId, { session })
      : await this.findNextEligibleOpsMember({ session });

    request.assignmentHistory = Array.isArray(request.assignmentHistory)
      ? request.assignmentHistory
      : [];
    request.autoAssignmentAttempted = true;

    if (!nextOpsMember) {
      request.status = OFFLINE_STATUSES.PENDING_ASSIGNMENT;
      request.assignmentStatus = "UNASSIGNED";
      request.assignmentFailureReason = "NO_ELIGIBLE_OPS";
      request.assignedOpsMember = null;
      request.assignedAt = null;
      request.assignmentMethod = mode;

      logger.warn("offline_reissue_assignment_unavailable", {
        requestId: request.requestId || request._id?.toString?.(),
        bookingId: request.bookingId?.toString?.() || request.bookingId || null,
        mode,
      });

      if (persistRequest && typeof request.save === "function") {
        await request.save({ session });
      }

      return {
        request,
        assignedOpsMember: null,
        assignmentAvailable: false,
      };
    }

    if (previousAssigneeId && isSameObjectId(previousAssigneeId, nextOpsMember._id)) {
      throw new ApiError(409, "Offline reissue request is already assigned to this OPS member");
    }

    request.assignedOpsMember = nextOpsMember._id;
    request.assignedAt = now;
    request.assignmentMethod = mode;
    request.assignmentStatus = "ASSIGNED";
    request.assignmentFailureReason = null;
    request.assignmentHistory.push(
      this.buildAssignmentHistory({
        assignedTo: nextOpsMember._id,
        assignedBy,
        mode,
        remarks,
        assignedAt: now,
      }),
    );

    if (
      !request.status ||
      [
        OFFLINE_STATUSES.PENDING_ASSIGNMENT,
        OFFLINE_STATUSES.RAISED,
      ].includes(request.status)
    ) {
      request.status = OFFLINE_STATUSES.ASSIGNED;
    }

    if (previousAssigneeId) {
      await this.decrementOpsWorkload(previousAssigneeId, { session });
    }
    await this.incrementOpsWorkload(nextOpsMember._id, { session, assignedAt: now });

    if (persistRequest && typeof request.save === "function") {
      await request.save({ session });
    }

    logger.info(`[REISSUE ${mode} ASSIGN]`, {
      requestId: request.requestId || request._id?.toString?.(),
      assignedOpsId: nextOpsMember._id.toString(),
      assignedOpsName: nextOpsMember.name,
      previousAssigneeId: previousAssigneeId ? String(previousAssigneeId) : null,
    });

    if (notify) {
      await this.notifyAssignedOpsMember({
        request,
        assignedOpsMember: nextOpsMember,
        assignedBy,
        mode,
      });
    }

    return {
      request,
      assignedOpsMember: nextOpsMember,
      assignmentAvailable: true,
    };
  }

  async ensureOfflineReissueAssignment({ request, session, actor, remarks } = {}) {
    if (!request || request.assignedOpsMember) {
      return request;
    }

    const result = await this.assignOfflineReissue({
      request,
      session,
      assignedBy: actor || { id: null, _id: null },
      mode: "ROUND_ROBIN",
      remarks: remarks || "Auto-recovered assignment for unassigned offline reissue",
      notify: true,
    });

    return result?.request || request;
  }

  async releaseOfflineReissueAssignment({ request, session } = {}) {
    if (!request?.assignedOpsMember) return request;
    if (TERMINAL_OFFLINE_STATUSES.includes(request.status) === false) return request;

    const metadata = request.metadata && typeof request.metadata === "object"
      ? request.metadata
      : {};

    if (metadata.assignmentWorkloadReleasedAt) {
      return request;
    }

    await this.decrementOpsWorkload(request.assignedOpsMember, { session });

    request.metadata = {
      ...metadata,
      assignmentWorkloadReleasedAt: new Date(),
    };

    if (typeof request.save === "function") {
      await request.save({ session });
    }

    return request;
  }

  async getOfflineReissueMetrics({ baseQuery = {} } = {}) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [requestMetrics, workloadMetrics] = await Promise.all([
      mongoose.model("OfflineReissueRequest").aggregate([
        { $match: baseQuery },
        {
          $group: {
            _id: null,
            openRequests: {
              $sum: {
                $cond: [{ $in: ["$status", TERMINAL_OFFLINE_STATUSES] }, 0, 1],
              },
            },
            assignedRequests: {
              $sum: {
                $cond: [{ $ne: ["$assignedOpsMember", null] }, 1, 0],
              },
            },
            pendingAssignmentCount: {
              $sum: {
                $cond: [{ $eq: ["$assignmentStatus", "UNASSIGNED"] }, 1, 0],
              },
            },
            assignmentFailures: {
              $sum: {
                $cond: [{ $ne: ["$assignmentFailureReason", null] }, 1, 0],
              },
            },
            totalAssignmentWaitMs: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $ne: ["$assignedAt", null] },
                      { $ne: ["$createdAt", null] },
                    ],
                  },
                  { $subtract: ["$assignedAt", "$createdAt"] },
                  0,
                ],
              },
            },
            totalAssignedWithWait: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $ne: ["$assignedAt", null] },
                      { $ne: ["$createdAt", null] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            completedToday: {
              $sum: {
                $cond: [{ $gte: ["$completedAt", todayStart] }, 1, 0],
              },
            },
            overdue: {
              $sum: {
                $cond: [{ $eq: ["$overdue", true] }, 1, 0],
              },
            },
            slaBreached: {
              $sum: {
                $cond: [{ $eq: ["$breached", true] }, 1, 0],
              },
            },
          },
        },
      ]),
      OpsMember.find(this.getEligibleOpsQuery())
        .select("name email role currentWorkload lastAssignedAt")
        .sort({ currentWorkload: -1, lastAssignedAt: 1, name: 1 })
        .lean(),
    ]);

    const counters = requestMetrics[0] || {
      openRequests: 0,
      assignedRequests: 0,
      pendingAssignmentCount: 0,
      assignmentFailures: 0,
      totalAssignmentWaitMs: 0,
      totalAssignedWithWait: 0,
      completedToday: 0,
      overdue: 0,
      slaBreached: 0,
    };

    return {
      ...counters,
      avgAssignmentWaitTime:
        counters.totalAssignedWithWait > 0
          ? Math.round(counters.totalAssignmentWaitMs / counters.totalAssignedWithWait)
          : 0,
      perOpsWorkload: workloadMetrics,
    };
  }
}

module.exports = new ReissueAssignmentService();