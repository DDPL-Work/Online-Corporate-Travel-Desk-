/**
 * OPS Assignment Service
 *
 * Handles automatic round-robin assignment of servicing requests
 * to available OPS agents based on permissions and workload.
 */

const OpsMember = require("../../../../models/OpsMember");
const ApiError = require("../../../../utils/ApiError");
const logger = require("../../../../utils/logger");

class OpsAssignmentService {
  /**
   * Get next eligible OPS agent for reissue requests using round-robin
   * @param {Object} options
   * @param {string} options.requestType - Type of request (reissue, cancellation, etc.)
   * @param {string} options.department - Department filter (optional)
   * @param {number} options.maxActiveRequests - Max active requests per agent (optional)
   * @returns {Object|null} Next eligible OPS agent or null if none available
   */
  async getNextEligibleAgent({
    requestType = "reissue",
    department = null,
    maxActiveRequests = null
  }) {
    try {
      // Build query for eligible agents
      const query = {
        status: "Active",
        permissions: { $in: [this.getRequiredPermission(requestType)] }
      };

      if (department) {
        query.department = department;
      }

      // Get all eligible agents sorted by last assignment sequence
      const eligibleAgents = await OpsMember.find(query)
        .sort({ assignmentSequence: 1, createdAt: 1 })
        .lean();

      if (eligibleAgents.length === 0) {
        logger.warn("ops_assignment_no_eligible_agents", {
          requestType,
          department,
          requiredPermission: this.getRequiredPermission(requestType)
        });
        return null;
      }

      // Find next agent using round-robin, respecting max active requests
      for (const agent of eligibleAgents) {
        // Check active request count if limit specified
        if (maxActiveRequests !== null) {
          const activeCount = await this.getActiveRequestCount(agent._id, requestType);
          if (activeCount >= maxActiveRequests) {
            continue; // Skip overloaded agent
          }
        }

        // Update assignment sequence for round-robin
        await OpsMember.findByIdAndUpdate(agent._id, {
          $inc: { assignmentSequence: 1 }
        });

        logger.info("ops_assignment_selected_agent", {
          agentId: agent._id.toString(),
          agentName: agent.name,
          requestType,
          sequence: agent.assignmentSequence || 0
        });

        return agent;
      }

      // All agents are at capacity
      logger.warn("ops_assignment_all_agents_at_capacity", {
        requestType,
        department,
        maxActiveRequests,
        eligibleCount: eligibleAgents.length
      });

      return null;
    } catch (error) {
      logger.error("ops_assignment_error", {
        error: error.message,
        requestType,
        department
      });
      throw new ApiError(500, "Failed to find eligible OPS agent");
    }
  }

  /**
   * Assign request to OPS agent
   * @param {Object} options
   * @param {string} options.requestId - Request ID
   * @param {Object} options.agent - OPS agent to assign
   * @param {string} options.requestType - Type of request
   * @param {string} options.assignmentMethod - "AUTO" or "MANUAL"
   * @returns {Object} Assignment result
   */
  async assignRequest({
    requestId,
    agent,
    requestType,
    assignmentMethod = "AUTO"
  }) {
    try {
      const Model = this.getModelForRequestType(requestType);
      const now = new Date();

      const updateData = {
        assignedTo: agent._id,
        assignedAt: now,
        assignmentMethod,
        status: "ASSIGNED"
      };

      // Update assignment sequence if auto-assigned
      if (assignmentMethod === "AUTO") {
        updateData.assignmentSequence = agent.assignmentSequence || 0;
      }

      const request = await Model.findByIdAndUpdate(
        requestId,
        updateData,
        { new: true }
      ).populate("assignedTo", "name email");

      if (!request) {
        throw new ApiError(404, `${requestType} request not found`);
      }

      // Log assignment
      await this.logAssignment({
        requestId: request._id,
        requestType,
        agent,
        assignmentMethod,
        timestamp: now
      });

      logger.info("ops_request_assigned", {
        requestId: request._id.toString(),
        requestType,
        agentId: agent._id.toString(),
        agentName: agent.name,
        assignmentMethod
      });

      return {
        request,
        agent,
        assignmentMethod,
        assignedAt: now
      };
    } catch (error) {
      logger.error("ops_assignment_failed", {
        error: error.message,
        requestId,
        requestType,
        agentId: agent?._id?.toString()
      });
      throw error;
    }
  }

  /**
   * Auto-assign request to next available agent
   * @param {Object} options
   * @param {string} options.requestId - Request ID
   * @param {string} options.requestType - Type of request
   * @param {string} options.department - Department filter (optional)
   * @returns {Object|null} Assignment result or null if no agent available
   */
  async autoAssignRequest({
    requestId,
    requestType,
    department = null
  }) {
    const agent = await this.getNextEligibleAgent({
      requestType,
      department
    });

    if (!agent) {
      logger.warn("ops_auto_assignment_no_agent_available", {
        requestId,
        requestType,
        department
      });
      return null;
    }

    return await this.assignRequest({
      requestId,
      agent,
      requestType,
      assignmentMethod: "AUTO"
    });
  }

  /**
   * Manually assign request to specific agent
   * @param {Object} options
   * @param {string} options.requestId - Request ID
   * @param {string} options.agentId - OPS agent ID
   * @param {string} options.requestType - Type of request
   * @returns {Object} Assignment result
   */
  async manualAssignRequest({
    requestId,
    agentId,
    requestType
  }) {
    const agent = await OpsMember.findById(agentId);
    if (!agent) {
      throw new ApiError(404, "OPS agent not found");
    }

    if (agent.status !== "Active") {
      throw new ApiError(400, "OPS agent is not active");
    }

    if (!agent.permissions.includes(this.getRequiredPermission(requestType))) {
      throw new ApiError(403, "OPS agent does not have required permissions");
    }

    return await this.assignRequest({
      requestId,
      agent,
      requestType,
      assignmentMethod: "MANUAL"
    });
  }

  /**
   * Get active request count for an agent
   * @param {string} agentId - OPS agent ID
   * @param {string} requestType - Type of request
   * @returns {number} Count of active requests
   */
  async getActiveRequestCount(agentId, requestType) {
    const Model = this.getModelForRequestType(requestType);
    const activeStatuses = this.getActiveStatusesForRequestType(requestType);

    return await Model.countDocuments({
      assignedTo: agentId,
      status: { $in: activeStatuses }
    });
  }

  /**
   * Validate OPS agent exists and is eligible
   * @param {string} agentId - OPS agent ID
   * @param {string} requestType - Type of request
   * @returns {Object} Agent data
   */
  async validateAgent(agentId, requestType) {
    const agent = await OpsMember.findById(agentId);
    if (!agent) {
      throw new ApiError(404, "Assigned OPS agent not found");
    }

    if (agent.status !== "Active") {
      throw new ApiError(400, "Assigned OPS agent is inactive");
    }

    if (!agent.permissions.includes(this.getRequiredPermission(requestType))) {
      throw new ApiError(403, "Assigned OPS agent lacks required permissions");
    }

    return agent;
  }

  /**
   * Get required permission for request type
   * @param {string} requestType
   * @returns {string} Required permission
   */
  getRequiredPermission(requestType) {
    const permissionMap = {
      reissue: "Manage Reissues",
      cancellation: "Manage Cancellations",
      refund: "View Finance",
      amendment: "Manage Cancellations" // Using cancellation permission for amendments
    };

    return permissionMap[requestType] || "Manage Reissues";
  }

  /**
   * Get model for request type
   * @param {string} requestType
   * @returns {mongoose.Model} Mongoose model
   */
  getModelForRequestType(requestType) {
    const modelMap = {
      reissue: require("../../../../models/FlightReissueRequest"),
      cancellation: require("../../../../models/CancellationQuery"),
      // Add other models as needed
    };

    const Model = modelMap[requestType];
    if (!Model) {
      throw new ApiError(400, `Unsupported request type: ${requestType}`);
    }

    return Model;
  }

  /**
   * Get active statuses for request type
   * @param {string} requestType
   * @returns {string[]} Active status values
   */
  getActiveStatusesForRequestType(requestType) {
    // Define active statuses for each request type
    const statusMap = {
      reissue: ["ASSIGNED", "IN_PROGRESS", "WAITING_AIRLINE"],
      cancellation: ["ASSIGNED", "IN_PROGRESS", "PROCESSING"],
      refund: ["ASSIGNED", "IN_PROGRESS"],
      amendment: ["ASSIGNED", "IN_PROGRESS"]
    };

    return statusMap[requestType] || ["ASSIGNED", "IN_PROGRESS"];
  }

  /**
   * Log assignment event
   * @param {Object} options
   * @param {string} options.requestId
   * @param {string} options.requestType
   * @param {Object} options.agent
   * @param {string} options.assignmentMethod
   * @param {Date} options.timestamp
   */
  async logAssignment({
    requestId,
    requestType,
    agent,
    assignmentMethod,
    timestamp
  }) {
    try {
      // Use audit log service if available
      const auditLogService = require("./auditLog.service");
      await auditLogService.logReissueAction(
        {
          id: "SYSTEM", // System-generated assignment
          role: "SYSTEM",
          name: "OPS Assignment Service"
        },
        assignmentMethod === "AUTO" ? "AUTO_ASSIGNED" : "MANUAL_ASSIGNED",
        requestId,
        {
          assignedAgentId: agent._id.toString(),
          assignedAgentName: agent.name,
          assignedAgentEmail: agent.email,
          assignmentMethod,
          requestType,
          timestamp: timestamp.toISOString()
        }
      );
    } catch (error) {
      // Log but don't fail assignment
      logger.error("ops_assignment_audit_log_failed", {
        error: error.message,
        requestId,
        agentId: agent._id.toString()
      });
    }
  }
}

module.exports = new OpsAssignmentService();