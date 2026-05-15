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

const PERMISSION_MAP = {
  reissue: "MANAGE_REISSUES",
  cancellation: "MANAGE_CANCELLATIONS",
  refund: "VIEW_FINANCE",
  amendment: "MANAGE_CANCELLATIONS",
};

class RoundRobinAssignmentService {
  async getRequiredPermission(requestType) {
    return PERMISSION_MAP[requestType] || "MANAGE_REISSUES";
  }

  getQueueType(requestType) {
    const queueType = QUEUE_TYPES[requestType];
    if (!queueType) {
      throw new ApiError(400, `Unsupported request type for assignment: ${requestType}`);
    }
    return queueType;
  }

  async getEligibleOpsMembers({ requestType, department, session } = {}) {
    const permission = await this.getRequiredPermission(requestType);
    const onlineCutoff = new Date(Date.now() - 5 * 60 * 1000);
    const query = {
      status: "Active",
      isDeleted: false,
      autoAssignmentEnabled: true,
      availabilityStatus: "AVAILABLE",
      permissions: { $in: [permission] },
      $or: [
        { isOnline: true },
        { lastSeenAt: { $gte: onlineCutoff } },
        { isOnline: { $exists: false } },
      ],
    };
    if (department) {
      query.department = { $in: [department, "Both"] };
    }

    return OpsMember.find(query)
      .sort({ currentActiveAssignments: 1, lastAssignedAt: 1, name: 1 })
      .session(session || null);
  }

  async getOrCreateRotation(queueType, session) {
    const opts = { session, new: true, upsert: true, setDefaultsOnInsert: true };
    return AssignmentRotation.findOneAndUpdate(
      { queueType },
      { $setOnInsert: { currentIndex: 0 } },
      opts,
    );
  }

  async findNextEligibleAgent({ requestType, department, session } = {}) {
    const queueType = this.getQueueType(requestType);
    const eligibleAgents = await this.getEligibleOpsMembers({ requestType, department, session });
    if (!eligibleAgents.length) {
      logger.warn("ops_assignment_no_eligible_agents", {
        requestType,
        department,
      });
      return null;
    }

    const rotation = await this.getOrCreateRotation(queueType, session);
    const now = new Date();

    for (let i = 0; i < eligibleAgents.length; i += 1) {
      const index = (rotation.currentIndex + i) % eligibleAgents.length;
      const candidate = eligibleAgents[index];
      if (candidate.currentActiveAssignments >= candidate.maxConcurrentAssignments) {
        continue;
      }

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
      department,
      eligibleCount: eligibleAgents.length,
    });
    return null;
  }

  async incrementAgentCounters(agentId, requestType, session) {
    const agent = await OpsMember.findById(agentId).session(session);
    if (!agent) {
      throw new ApiError(404, "OPS agent not found");
    }
    agent.currentActiveAssignments = Math.max(0, (agent.currentActiveAssignments || 0) + 1);
    agent.lastAssignedAt = new Date();
    agent.lastAssignmentType = requestType ? requestType.toUpperCase() : agent.lastAssignmentType;
    agent.assignmentStats = agent.assignmentStats || {};
    agent.assignmentStats.totalAssigned = (agent.assignmentStats.totalAssigned || 0) + 1;
    await agent.save({ session });
    return agent;
  }

  async decrementAgentCounters(agentId, session) {
    const agent = await OpsMember.findById(agentId).session(session);
    if (!agent) {
      return null;
    }
    agent.currentActiveAssignments = Math.max(0, (agent.currentActiveAssignments || 0) - 1);
    await agent.save({ session });
    return agent;
  }

  async validateAgent(agentId, requestType, session) {
    const agent = await OpsMember.findById(agentId).session(session);
    if (!agent) {
      throw new ApiError(404, "OPS agent not found");
    }
    if (agent.status !== "Active" || agent.isDeleted) {
      throw new ApiError(400, "OPS agent is not currently active");
    }
    if (!agent.autoAssignmentEnabled || agent.availabilityStatus !== "AVAILABLE") {
      throw new ApiError(400, "OPS agent is not available for assignment");
    }
    if (agent.isOnline === false) {
      throw new ApiError(400, "OPS agent is not currently online");
    }
    const permission = await this.getRequiredPermission(requestType);
    if (!agent.permissions.includes(permission)) {
      throw new ApiError(403, "OPS agent does not have required permissions");
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

  async autoAssignRequest({
    request,
    requestType,
    department,
    assignedBy,
    reason,
    statusOnAssign,
  }) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const agent = await this.findNextEligibleAgent({ requestType, department, session });
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

      await request.save({ session });
      await this.incrementAgentCounters(agent._id, requestType, session);

      await session.commitTransaction();

      try {
        await sendNotification({
          recipient: agent._id,
          recipientRole: "ops-member",
          corporateId: request.corporateId,
          sender: assignedBy || null,
          title: "New assignment received",
          message: `You have been auto-assigned a ${requestType} request.`,
          type: "ops_assignment",
          relatedId: request._id,
          link: `/reissue/offline/${request._id}`,
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
        await this.decrementAgentCounters(oldAgentId, session);
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
