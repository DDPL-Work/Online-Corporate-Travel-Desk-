const Airline = require("../models/Airline");
const CountryList = require("../models/CountryList");
const TBOCity = require("../models/TBOCity");
const TBOHotel = require("../models/TBOHotel");
const Airport = require("../models/Airport");
// markupService removed
const asyncHandler = require("../utils/asyncHandler");

// ─────────────────────────────────────────────────────────────────────────────
// FETCH AIRLINES FROM DB
// ─────────────────────────────────────────────────────────────────────────────
exports.getAirlines = asyncHandler(async (req, res) => {
    const { search, limit = 100 } = req.query;
    const filter = {};

    if (search && search.trim() !== "") {
        const term = search.trim();
        const regex = new RegExp(term, "i");

        filter.$or = [
            { name: { $regex: regex } },
            { iata: { $regex: regex } },
            { icao: { $regex: regex } },
            { callsign: { $regex: regex } },
        ];
    }

    const airlines = await Airline.find(filter)
        .select("name iata icao callsign country")
        .sort({ name: 1 })
        .limit(Number(limit))
        .lean();

    return res.status(200).json({
        success: true,
        count: airlines.length,
        data: airlines,
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// FETCH COUNTRIES FROM DB
// ─────────────────────────────────────────────────────────────────────────────
exports.getCountries = asyncHandler(async (req, res) => {
    const { search, limit = 100 } = req.query;
    const filter = {};

    if (search && search.trim() !== "") {
        const regex = new RegExp(search.trim(), "i");
        filter.$or = [
            { Name: { $regex: regex } },
            { Code: { $regex: regex } },
        ];
    }

    const countries = await CountryList.find(filter)
        .select("Name Code")
        .sort({ Name: 1 })
        .limit(Number(limit))
        .lean();

    return res.status(200).json({
        success: true,
        count: countries.length,
        data: countries,
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// FETCH CITIES FROM DB
// ─────────────────────────────────────────────────────────────────────────────
exports.getCities = asyncHandler(async (req, res) => {
    const { search, limit = 100 } = req.query;
    const filter = {};

    if (search && search.trim() !== "") {
        const regex = new RegExp(search.trim(), "i");
        filter.$or = [
            { cityName: { $regex: regex } },
            { cityCode: { $regex: regex } },
            { countryName: { $regex: regex } },
        ];
    }

    const cities = await TBOCity.find(filter)
        .select("cityName cityCode countryName countryCode")
        .sort({ cityName: 1 })
        .limit(Number(limit))
        .lean();

    return res.status(200).json({
        success: true,
        count: cities.length,
        data: cities,
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// FETCH HOTELS FROM DB
// ─────────────────────────────────────────────────────────────────────────────
exports.getHotels = asyncHandler(async (req, res) => {
    const { search, cityCode, limit = 100 } = req.query;
    const filter = {};

    if (cityCode && cityCode.trim() !== "") {
        filter.cityCode = cityCode.trim();
    }

    if (search && search.trim() !== "") {
        const regex = new RegExp(search.trim(), "i");
        filter.$or = [
            { hotelName: { $regex: regex } },
            { hotelCode: { $regex: regex } },
            { cityName: { $regex: regex } },
        ];
    }

    const hotels = await TBOHotel.find(filter)
        .select("hotelName hotelCode cityName cityCode countryCode starRating")
        .sort({ hotelName: 1 })
        .limit(Number(limit))
        .lean();

    return res.status(200).json({
        success: true,
        count: hotels.length,
        data: hotels,
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// FETCH AIRPORTS FROM DB
// ─────────────────────────────────────────────────────────────────────────────
exports.getAirports = asyncHandler(async (req, res) => {
    const { search, limit = 100 } = req.query;
    const filter = {};

    if (search && search.trim() !== "") {
        const regex = new RegExp(search.trim(), "i");
        filter.$or = [
            { name: { $regex: regex } },
            { iata_code: { $regex: regex } },
            { city: { $regex: regex } },
            { country: { $regex: regex } },
        ];
    }

    const airports = await Airport.find(filter)
        .select("name iata_code city country")
        .sort({ name: 1 })
        .limit(Number(limit))
        .lean();

    return res.status(200).json({
        success: true,
        count: airports.length,
        data: airports,
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// SAVE / UPDATE CORPORATE MARKUP
// ─────────────────────────────────────────────────────────────────────────────
exports.saveCorporateMarkup = asyncHandler(async (req, res) => {
    try {
        const CorporateMarkup = require("../models/markup");
        const MarkupCacheService = require("../modules/markup/services/markupCache.service");
        const MarkupAuditService = require("../modules/markup/services/markupAudit.service");

        const { corporateId, productType, rules, isActive } = req.body;

        let markup = await CorporateMarkup.findOne({ corporateId, productType });
        
        let previousState = null;
        if (markup) {
            previousState = markup.toObject();
            markup.rules = rules;
            if (isActive !== undefined) markup.isActive = isActive;
        } else {
            markup = new CorporateMarkup({
                corporateId,
                productType,
                rules,
                isActive: isActive !== undefined ? isActive : true
            });
        }

        await markup.save();

        if (previousState) {
            await MarkupAuditService.logChange({
                action: 'UPDATE',
                corporateId,
                serviceType: productType,
                ruleId: markup._id,
                changedBy: req.user?._id,
                changes: { previous: previousState.rules, new: rules }
            });
        } else {
            await MarkupAuditService.logChange({
                action: 'CREATE',
                corporateId,
                serviceType: productType,
                ruleId: markup._id,
                changedBy: req.user?._id,
                changes: { new: rules }
            });
        }

        await MarkupCacheService.invalidateCache(corporateId, productType);

        return res.status(200).json({
            success: true,
            message: "Markup configuration saved successfully.",
            data: markup,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET SPECIFIC CORPORATE MARKUP
// ─────────────────────────────────────────────────────────────────────────────
exports.getCorporateMarkup = asyncHandler(async (req, res) => {
    try {
        const CorporateMarkup = require("../models/markup");
        const { corporateId, productType } = req.query;
        
        const query = {};
        if (corporateId) query.corporateId = corporateId;
        if (productType) query.productType = productType;
        
        const markup = await CorporateMarkup.findOne(query).populate('corporateId', 'companyName');

        if (!markup) {
            return res.status(404).json({
                success: false,
                message: "Markup configuration not found."
            });
        }

        return res.status(200).json({
            success: true,
            data: markup
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL CORPORATE MARKUPS (FOR A CORPORATE)
// ─────────────────────────────────────────────────────────────────────────────
exports.getAllCorporateMarkups = asyncHandler(async (req, res) => {
    try {
        const CorporateMarkup = require("../models/markup");
        const { corporateId } = req.query;
        
        const query = {};
        if (corporateId) query.corporateId = corporateId;
        
        const markups = await CorporateMarkup.find(query).populate('corporateId', 'companyName');

        return res.status(200).json({
            success: true,
            count: markups.length,
            data: markups
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE CORPORATE MARKUP
// ─────────────────────────────────────────────────────────────────────────────
exports.deleteCorporateMarkup = asyncHandler(async (req, res) => {
    try {
        const CorporateMarkup = require("../models/markup");
        const MarkupCacheService = require("../modules/markup/services/markupCache.service");
        const MarkupAuditService = require("../modules/markup/services/markupAudit.service");
        
        const { corporateId, productType } = req.body;
        
        const markup = await CorporateMarkup.findOneAndDelete({ corporateId, productType });

        if (markup) {
            await MarkupAuditService.logChange({
                action: 'DELETE',
                corporateId,
                serviceType: productType,
                ruleId: markup._id,
                changedBy: req.user?._id,
                changes: { deleted: true }
            });
            await MarkupCacheService.invalidateCache(corporateId, productType);
        }

        return res.status(200).json({
            success: true,
            message: "Markup configuration deleted successfully."
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
});
