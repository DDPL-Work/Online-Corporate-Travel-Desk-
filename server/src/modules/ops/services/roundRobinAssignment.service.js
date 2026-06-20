const mongoose = require("mongoose");
const OpsMember = require("../../../models/OpsMember");
const AssignmentRotation = require("../../../models/AssignmentRotation");
const ApiError = require("../../../utils/ApiError");
const logger = require("../../../utils/logger");
const { sendNotification } = require("../../../utils/notificationService");

const QUEUE_TYPES = {
  reissue: "REISSUE",
  cancellation: "CANCELLATION",
  refund: "REFUND",
};

class RoundRobinAssignmentService {
  getEligibilityQuery(requestType) {
    const base = {
      isDeleted: false,
      autoAssignmentEnabled: true,
      availabilityStatus: "AVAILABLE",
      status: "Active",
    };

    if (requestType === "reissue") {
      base.permissions = "Manage Reissues";
      base.$expr = {
        $lt: [
          { $ifNull: ["$currentActiveReissues", 0] },
          { $ifNull: ["$maxConcurrentReissues", 10] },
        ],
      };
    } else if (requestType === "cancellation") {
      base.permissions = "Manage Cancellations";
      base.$expr = {
        $lt: [
          { $ifNull: ["$currentActiveCancellations", 0] },
          { $ifNull: ["$maxConcurrentCancellations", 10] },
        ],
      };
    }

    return base;
  }

  getQueueType(requestType) {
    const queueType = QUEUE_TYPES[requestType];
    if (!queueType) {
      throw new ApiError(400, `Unsupported request type for assignment: ${requestType}`);
    }
    return queueType;
  }

  async getEligibleOpsMembers({ requestType, session } = {}) {
    const query = this.getEligibilityQuery(requestType);
    const sort = { lastAssignedAt: 1, name: 1 };

    const candidates = await OpsMember.find(query)
      .sort(sort)
      .session(session || null);

    const currentField = requestType === "reissue" ? "currentActiveReissues" : "currentActiveCancellations";
    const maxField = requestType === "reissue" ? "maxConcurrentReissues" : "maxConcurrentCancellations";

    const eligible = candidates.filter((member) => {
      const permission = requestType === "reissue" ? "Manage Reissues" : "Manage Cancellations";
      if (!Array.isArray(member.permissions) || !member.permissions.includes(permission)) {
        return false;
      }
      if (member.availabilityStatus !== "AVAILABLE") return false;
      if (!member.autoAssignmentEnabled) return false;
      const current = member[currentField] ?? 0;
      const max = member[maxField] ?? 10;
      return current < max;
    });

    logger.info("ops_eligible_members", {
      requestType,
      candidatesCount: candidates.length,
      eligibleCount: eligible.length,
      eligibleNames: eligible.map((m) => m.name),
    });

    return eligible;
  }

  async getOrCreateRotation(queueType, session) {
    const opts = { session, new: true, upsert: true, setDefaultsOnInsert: true };
    return AssignmentRotation.findOneAndUpdate(
      { queueType },
      { $setOnInsert: { currentIndex: 0 } },
      opts,
    );
  }

  async findNextEligibleAgent({ requestType, session } = {}) {
    const queueType = this.getQueueType(requestType);
    const eligibleAgents = await this.getEligibleOpsMembers({ requestType, session });
    if (!eligibleAgents.length) {
      logger.warn("ops_assignment_no_eligible_agents", { requestType });
      return null;
    }

    const rotation = await this.getOrCreateRotation(queueType, session);
    const now = new Date();

    for (let i = 0; i < eligibleAgents.length; i += 1) {
      const index = (rotation.currentIndex + i) % eligibleAgents.length;
      const candidate = eligibleAgents[index];

      rotation.currentIndex = (index + 1) % eligibleAgents.length;
      rotation.lastAssignedUserId = candidate._id;
      rotation.lastAssignedAt = now;
      await rotation.save({ session });

      logger.info("ops_assignment_selected_agent", {
        agentId: String(candidate._id),
        agentName: candidate.name,
        requestType,
        queueType,
      });

      return candidate;
    }

    logger.warn("ops_assignment_all_agents_at_capacity", {
      requestType,
      eligibleCount: eligibleAgents.length,
    });
    return null;
  }

  async incrementAgentCounters(agentId, requestType, session) {
    const agent = await OpsMember.findById(agentId).session(session);
    if (!agent) {
      throw new ApiError(404, "OPS agent not found");
    }

    if (requestType === "reissue") {
      agent.currentActiveReissues = Math.max(0, (agent.currentActiveReissues || 0) + 1);
    } else if (requestType === "cancellation") {
      agent.currentActiveCancellations = Math.max(0, (agent.currentActiveCancellations || 0) + 1);
    }

    agent.currentActiveAssignments = Math.max(0, (agent.currentActiveAssignments || 0) + 1);
    agent.currentWorkload = Math.max(0, Number(agent.currentWorkload || 0) + 1);
    agent.lastAssignedAt = new Date();
    agent.lastAssignmentType = requestType ? requestType.toUpperCase() : agent.lastAssignmentType;
    agent.assignmentStats = agent.assignmentStats || {};
    agent.assignmentStats.totalAssigned = (agent.assignmentStats.totalAssigned || 0) + 1;
    await agent.save({ session });

    logger.info("ops_counter_incremented", {
      agentId: String(agentId),
      requestType,
      currentActiveReissues: agent.currentActiveReissues,
      currentActiveCancellations: agent.currentActiveCancellations,
    });

    return agent;
  }

  async decrementAgentCounters(agentId, requestType, session) {
    const agent = await OpsMember.findById(agentId).session(session);
    if (!agent) {
      return null;
    }

    if (requestType === "reissue") {
      agent.currentActiveReissues = Math.max(0, (agent.currentActiveReissues || 0) - 1);
    } else if (requestType === "cancellation") {
      agent.currentActiveCancellations = Math.max(0, (agent.currentActiveCancellations || 0) - 1);
    }

    agent.currentActiveAssignments = Math.max(0, (agent.currentActiveAssignments || 0) - 1);
    agent.currentWorkload = Math.max(0, Number(agent.currentWorkload || 0) - 1);
    await agent.save({ session });

    logger.info("ops_counter_decremented", {
      agentId: String(agentId),
      requestType,
      currentActiveReissues: agent.currentActiveReissues,
      currentActiveCancellations: agent.currentActiveCancellations,
    });

    return agent;
  }

  async validateAgent(agentId, requestType, session) {
    const agent = await OpsMember.findById(agentId).session(session);
    if (!agent) {
      throw new ApiError(404, "OPS agent not found");
    }

    const permission = requestType === "reissue" ? "Manage Reissues" : "Manage Cancellations";
    const currentField = requestType === "reissue" ? "currentActiveReissues" : "currentActiveCancellations";
    const maxField = requestType === "reissue" ? "maxConcurrentReissues" : "maxConcurrentCancellations";

    if (agent.status !== "Active" || agent.isDeleted) {
      throw new ApiError(400, "OPS agent is not currently active");
    }
    if (!agent.autoAssignmentEnabled || agent.availabilityStatus !== "AVAILABLE") {
      throw new ApiError(400, "OPS agent is not available for assignment");
    }
    if (!Array.isArray(agent.permissions) || !agent.permissions.includes(permission)) {
      throw new ApiError(403, `OPS agent does not have required permission: ${permission}`);
    }
    const current = agent[currentField] ?? 0;
    const max = agent[maxField] ?? 10;
    if (current >= max) {
      throw new ApiError(400, `OPS agent is at capacity (${current}/${max}) for ${requestType}`);
    }

    return agent;
  }

  buildAssignmentRecord({ from, to, method, assignedBy, reason, assignedAt }) {
    return {
      from,
      to,
      method,
      assignedBy,
      reason,
      assignedAt: assignedAt || new Date(),
    };
  }

  buildAuditMessage({ agent, requestType }) {
    const currentField = requestType === "reissue" ? "currentActiveReissues" : "currentActiveCancellations";
    const maxField = requestType === "reissue" ? "maxConcurrentReissues" : "maxConcurrentCancellations";
    const current = agent[currentField] ?? 0;
    const max = agent[maxField] ?? 10;
    const type = requestType === "reissue" ? "Reissue" : "Cancellation";
    return `Assigned to ${agent.name} via Round Robin — ${type} Capacity: ${current}/${max}`;
  }

  async autoAssignRequest({
    request,
    requestType,
    assignedBy,
    reason,
    statusOnAssign,
  }) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const agent = await this.findNextEligibleAgent({ requestType, session });
      if (!agent) {
        await session.abortTransaction();
        return null;
      }

      const previousAssignee = request.assignedTo;
      request.assignedTo = agent._id;
      request.assignedAt = new Date();
      request.assignmentMethod = "AUTO";
      if (statusOnAssign) {
        request.status = statusOnAssign;
      }
      request.assignmentHistory = request.assignmentHistory || [];
      request.assignmentHistory.push(
        this.buildAssignmentRecord({
          from: previousAssignee || null,
          to: agent._id,
          method: "AUTO",
          assignedBy,
          reason,
          assignedAt: request.assignedAt,
        }),
      );

      request.assignmentAudit = request.assignmentAudit || [];
      request.assignmentAudit.push({
        action: "AUTO_ASSIGNED",
        message: this.buildAuditMessage({ agent, requestType }),
        assignedBy: assignedBy || "SYSTEM",
        at: new Date(),
      });

      await request.save({ session });
      await this.incrementAgentCounters(agent._id, requestType, session);

      await session.commitTransaction();

      try {
        const link =
          requestType === "cancellation"
            ? `/cancellation-queries`
            : `/reissue/offline/${request._id}`;

        await sendNotification({
          recipient: agent._id,
          recipientRole: "ops-member",
          corporateId: request.corporateId,
          sender: assignedBy || null,
          title: "New assignment received",
          message: `You have been auto-assigned a ${requestType} request.`,
          type: "ops_assignment",
          relatedId: request._id,
          link,
        });
      } catch (notificationError) {
        logger.warn("ops_assignment_notification_failed", {
          error: notificationError.message,
          agentId: String(agent._id),
        });
      }

      return { request, agent };
    } catch (error) {
      await session.abortTransaction();
      logger.error("ops_auto_assign_failed", {
        error: error.message,
        requestId: request._id,
        requestType,
      });
      throw error;
    } finally {
      session.endSession();
    }
  }

  async reassignRequest({ request, newAgentId, requestType, assignedBy, reason }) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const oldAgentId = request.assignedTo;
      const newAgent = await this.validateAgent(newAgentId, requestType, session);

      if (oldAgentId && String(oldAgentId) === String(newAgent._id)) {
        throw new ApiError(400, "Request is already assigned to the selected agent");
      }

      request.assignmentHistory = request.assignmentHistory || [];
      request.assignmentHistory.push(
        this.buildAssignmentRecord({
          from: oldAgentId || null,
          to: newAgent._id,
          method: "MANUAL",
          assignedBy,
          reason,
          assignedAt: new Date(),
        }),
      );
      request.assignedTo = newAgent._id;
      request.assignedAt = new Date();
      request.assignmentMethod = "MANUAL";
      request.status = request.status === "RAISED" ? "ASSIGNED" : request.status;

      await request.save({ session });
      await this.incrementAgentCounters(newAgent._id, requestType, session);
      if (oldAgentId) {
        await this.decrementAgentCounters(oldAgentId, requestType, session);
      }

      await session.commitTransaction();

      try {
        await Promise.all([
          sendNotification({
            recipient: newAgent._id,
            recipientRole: "ops-member",
            corporateId: request.corporateId,
            sender: assignedBy || null,
            title: "Request reassigned to you",
            message: `You have been assigned request ${request.requestId}.`,
            type: "ops_reassignment",
            relatedId: request._id,
            link: `/reissue/offline/${request._id}`,
          }),
          oldAgentId
            ? sendNotification({
                recipient: oldAgentId,
                recipientRole: "ops-member",
                corporateId: request.corporateId,
                sender: assignedBy || null,
                title: "Request reassigned",
                message: `Request ${request.requestId} has been reassigned away from you.`,
                type: "ops_reassignment",
                relatedId: request._id,
                link: `/reissue/offline/${request._id}`,
              })
            : null,
        ]);
      } catch (notificationError) {
        logger.warn("ops_reassignment_notification_failed", {
          error: notificationError.message,
          newAgentId: String(newAgent._id),
          oldAgentId: oldAgentId ? String(oldAgentId) : null,
        });
      }

      return request;
    } catch (error) {
      await session.abortTransaction();
      logger.error("ops_reassignment_failed", {
        error: error.message,
        requestId: request._id,
        newAgentId,
      });
      throw error;
    } finally {
      session.endSession();
    }
  }
}

module.exports = new RoundRobinAssignmentService();
