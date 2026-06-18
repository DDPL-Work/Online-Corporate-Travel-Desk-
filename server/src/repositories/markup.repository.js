const CorporateMarkup = require("../models/markup");

class MarkupRepository {
    /**
     * Upsert corporate markup configuration
     * @param {String} corporateId 
     * @param {String} productType 
     * @param {Object} payload 
     * @returns {Object} saved markup document
     */
    async upsertCorporateMarkup(corporateId, productType, payload) {
        return await CorporateMarkup.findOneAndUpdate(
            { corporateId, productType },
            { $set: payload },
            { new: true, upsert: true }
        );
    }

    /**
     * Get active corporate markup configuration
     * @param {String} corporateId 
     * @param {String} productType 
     * @returns {Object|null}
     */
    async getActiveCorporateMarkup(corporateId, productType) {
        return await CorporateMarkup.findOne({
            corporateId,
            productType,
            isActive: true
        }).lean();
    }

    /**
     * Get corporate markup configuration (active or inactive)
     * @param {String} corporateId 
     * @param {String} productType 
     * @returns {Object|null}
     */
    async getCorporateMarkup(corporateId, productType) {
        return await CorporateMarkup.findOne({ corporateId, productType }).lean();
    }

    /**
     * Get all corporate markup configurations for a corporate
     * @param {String} corporateId 
     * @returns {Array}
     */
    async getAllCorporateMarkups(corporateId) {
        return await CorporateMarkup.find({ corporateId }).lean();
    }

    /**
     * Delete corporate markup configuration
     * @param {String} corporateId 
     * @param {String} productType 
     * @returns {Object|null}
     */
    async deleteCorporateMarkup(corporateId, productType) {
        return await CorporateMarkup.findOneAndDelete({ corporateId, productType });
    }
}

module.exports = new MarkupRepository();
