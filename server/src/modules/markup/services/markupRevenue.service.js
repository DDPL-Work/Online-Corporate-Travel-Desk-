const MarkupRevenue = require("../schemas/MarkupRevenue.model");
const logger = require("../../../utils/logger");

class MarkupRevenueService {
  /**
   * Track revenue from markup when a booking is confirmed.
   */
  static async trackRevenue({ bookingId, corporateId, serviceType, markupAmount, ruleId }) {
    if (!markupAmount || markupAmount <= 0) return; // No revenue to track

    try {
      await MarkupRevenue.create({
        bookingId,
        corporateId,
        serviceType,
        markupAmount,
        ruleId,
        status: "CONFIRMED"
      });
    } catch (error) {
      logger.error(`[MarkupRevenue] Failed to track revenue for booking ${bookingId}: ${error.message}`);
    }
  }

  /**
   * Update revenue status (e.g., when booking is cancelled or reissued).
   */
  static async updateStatus(bookingId, status) {
    try {
      await MarkupRevenue.updateMany({ bookingId }, { status });
    } catch (error) {
      logger.error(`[MarkupRevenue] Failed to update revenue status for booking ${bookingId}: ${error.message}`);
    }
  }
}

module.exports = MarkupRevenueService;
