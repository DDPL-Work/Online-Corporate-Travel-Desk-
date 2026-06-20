const MarkupCacheService = require("./markupCache.service");
const MarkupResolverService = require("./markupResolver.service");
const logger = require("../../../utils/logger");

class MarkupSimulatorService {
  /**
   * Internal tool to test markup logic without making TBO API calls.
   * Useful for debugging and for Ops/Admins.
   */
  static async simulateFlightMarkup(corporateId, payload) {
    if (!corporateId) {
       return { success: false, message: "Corporate ID is required" };
    }

    const rules = await MarkupCacheService.getRules(corporateId, "flight");
    if (!rules || rules.length === 0) {
       return {
          success: true,
          message: "No rules found for this corporate.",
          supplierFare: payload.Fare?.PublishedFare || 0,
          markupAmount: 0,
          finalFare: payload.Fare?.PublishedFare || 0,
          matchedRule: null
       };
    }

    const winningRule = MarkupResolverService.resolveRule(rules, payload, "flight");
    if (!winningRule) {
       return {
          success: true,
          message: "No matching rule for the provided payload.",
          supplierFare: payload.Fare?.PublishedFare || 0,
          markupAmount: 0,
          finalFare: payload.Fare?.PublishedFare || 0,
          matchedRule: null
       };
    }

    let markupAmount = 0;
    const supplierFare = Number(payload.Fare?.PublishedFare || payload.Fare?.OfferedFare || payload.Fare?.BaseFare || 0);

    if (winningRule.markupMethod === "fixed") {
      markupAmount = winningRule.markupValue || 0;
    } else if (winningRule.markupMethod === "percentage") {
      const pct = winningRule.markupValue || 0;
      markupAmount = (supplierFare * pct) / 100;
    }

    if (winningRule.fareSlabs && winningRule.fareSlabs.length > 0) {
       const slab = winningRule.fareSlabs.find(s => supplierFare >= s.from && supplierFare <= s.to);
       if (slab) {
         if (slab.method === "fixed") {
           markupAmount = slab.value || 0;
         } else if (slab.method === "percentage") {
           markupAmount = (supplierFare * (slab.value || 0)) / 100;
         }
       }
    }

    markupAmount = Math.ceil(markupAmount);

    return {
      success: true,
      message: "Rule matched successfully",
      supplierFare,
      markupAmount,
      finalFare: supplierFare + markupAmount,
      matchedRule: winningRule,
      priority: MarkupResolverService.getPriority(winningRule.category, "flight")
    };
  }
}

module.exports = MarkupSimulatorService;
