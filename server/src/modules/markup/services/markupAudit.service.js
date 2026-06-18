const MarkupAudit = require("../schemas/MarkupAudit.model");
const logger = require("../../../utils/logger");

class MarkupAuditService {
  /**
   * Log an audit event when a markup rule is modified.
   */
  static async logChange({ action, corporateId, serviceType, ruleId, changedBy, changes, ipAddress }) {
    try {
      await MarkupAudit.create({
        userId: changedBy,
        corporateId,
        ruleId,
        action,
        oldValue: changes?.previous || null,
        newValue: changes?.new || null,
        ipAddress
      });
    } catch (error) {
      logger.error(`[MarkupAudit] Failed to log audit event: ${error.message}`);
    }
  }

  static async logAudit({ userId, corporateId, ruleId, action, oldValue, newValue, ipAddress }) {
    try {
      await MarkupAudit.create({
        userId,
        corporateId,
        ruleId,
        action,
        oldValue,
        newValue,
        ipAddress
      });
    } catch (error) {
      logger.error(`[MarkupAudit] Failed to log audit event: ${error.message}`);
    }
  }
}

module.exports = MarkupAuditService;
