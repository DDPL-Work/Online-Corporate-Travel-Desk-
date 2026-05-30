const Airline = require("../models/Airline");
const CountryList = require("../models/CountryList");
const TBOCity = require("../models/TBOCity");
const TBOHotel = require("../models/TBOHotel");
const Airport = require("../models/Airport");
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
