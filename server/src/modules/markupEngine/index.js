const markupRepository = require("../../repositories/markup.repository");

class MarkupEngine {
    /**
     * Apply flight markup dynamically at runtime during flight search.
     * This isolates runtime logic from admin setup.
     * 
     * @param {Object} flightDetails Details about the flight (airline, cabin, route)
     * @param {String} corporateId The ID of the corporate performing the search
     * @returns {Number} The final calculated markup to add to the base fare
     */
    async calculateFlightMarkup(flightDetails, corporateId) {
        // 1. Fetch active markups from repository
        const activeMarkupDoc = await markupRepository.getActiveCorporateMarkup(corporateId, "flight");
        
        if (!activeMarkupDoc || !activeMarkupDoc.rules || activeMarkupDoc.rules.length === 0) {
            return 0; // No markup configured
        }

        let totalMarkup = 0;

        // 2. Evaluate all rules against flightDetails
        for (const rule of activeMarkupDoc.rules) {
            if (this._isRuleApplicable(rule, flightDetails)) {
                totalMarkup += this._calculateRuleValue(rule, flightDetails.baseFare);
            }
        }

        return totalMarkup;
    }

    /**
     * Checks if a rule applies to the given flight/hotel context
     * @param {Object} rule 
     * @param {Object} searchContext 
     * @returns {Boolean}
     */
    _isRuleApplicable(rule, searchContext) {
        // Implementation stub for rule matching
        // e.g. if (rule.category === 'Airline Wise' && rule.criteria.airline === searchContext.airline) return true;
        return false;
    }

    /**
     * Calculates the exact markup value based on method
     * @param {Object} rule 
     * @param {Number} baseFare 
     * @returns {Number}
     */
    _calculateRuleValue(rule, baseFare) {
        if (rule.category === "Fare Slab Based") {
            // Fare slab logic
            return 0;
        }

        if (rule.markupMethod === "percentage") {
            return (baseFare * rule.markupValue) / 100;
        } else if (rule.markupMethod === "fixed") {
            return rule.markupValue;
        }

        return 0;
    }
}

module.exports = new MarkupEngine();
