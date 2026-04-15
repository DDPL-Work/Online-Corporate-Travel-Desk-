// hotel.controller.js

const tboService = require("../services/tektravels/hotel.service");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const Country = require("../models/CountryList");
const redis = require("../config/redis");
const stringify = require("fast-json-stable-stringify");

/* =====================================================
   HELPERS
===================================================== */
const buildCacheKey = (payload = {}) => `hotel:${stringify(payload)}`;

const addIndex = (list = []) =>
  list.map((hotel, idx) =>
    hotel && typeof hotel === "object" && hotel._index !== undefined
      ? hotel
      : { ...hotel, _index: idx },
  );

const deduplicateHotels = (hotels = []) => {
  const seenKeys = new Set();
  const unique = [];

  hotels.forEach((hotel) => {
    const hotelCodeKey = hotel?.HotelCode
      ? String(hotel.HotelCode).trim()
      : "";
    const compositeKey = `${(hotel.HotelName || "")
      .trim()
      .toLowerCase()}|${(hotel.CityName || hotel.City || "")
      .trim()
      .toLowerCase()}|${(hotel.Address || "").trim().toLowerCase()}`;

    const key = hotelCodeKey || compositeKey || `row-${unique.length}`;

    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      unique.push(hotel);
    }
  });

  return unique;
};

/* =====================================================
   STATIC SERVICES
===================================================== */

/* ---------------- COUNTRY LIST ---------------- */
exports.getCountryList = asyncHandler(async (req, res) => {
  const data = await tboService.getCountryList();

  if (!data || data.Status?.Code !== 200) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Failed to fetch country list"));
  }

  const countries = data.CountryList;

  // Prepare bulk operations
  const bulkOps = countries.map((country) => ({
    updateOne: {
      filter: { Code: country.Code },
      update: {
        $set: {
          Code: country.Code,
          Name: country.Name,
        },
      },
      upsert: true,
    },
  }));

  if (bulkOps.length > 0) {
    await Country.bulkWrite(bulkOps);
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        data,
        "Country list fetched and synced successfully",
      ),
    );
});

exports.getCountriesFromDB = asyncHandler(async (req, res) => {
  const countries = await Country.find({})
    .sort({ Name: 1 }) // alphabetical order
    .select("Code Name -_id"); // return only needed fields

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        countries,
        "Country list fetched from database successfully",
      ),
    );
});

/* ---------------- CITY LIST ---------------- */
exports.getCityList = asyncHandler(async (req, res) => {
  const { countryCode } = req.query;

  if (!countryCode) {
    throw new ApiError(400, "countryCode query param is required");
  }

  const data = await tboService.getCityList(countryCode);

  res
    .status(200)
    .json(new ApiResponse(200, data, "City list fetched successfully"));
});

/* ---------------- STATIC HOTEL DETAILS ---------------- */
exports.getStaticHotelDetails = asyncHandler(async (req, res) => {
  const { hotelCode } = req.body;

  if (!hotelCode) {
    throw new ApiError(400, "hotelCode is required");
  }

  const data = await tboService.getStaticHotelDetails(hotelCode);

  res
    .status(200)
    .json(
      new ApiResponse(200, data, "Static hotel details fetched successfully"),
    );
});

/* =====================================================
   SEARCH HOTELS
   POST /api/v1/hotels/search
===================================================== */
exports.searchHotels = asyncHandler(async (req, res) => {
  const pageParam = Number(req.query.page) || 1;
  const limitParam = Number(req.query.limit) || 10;
  const page = pageParam > 0 ? pageParam : 1;
  const limit = limitParam > 0 ? limitParam : 10;

  const {
    CheckIn,
    CheckOut,
    CityCode,
    GuestNationality,
    NoOfRooms,
    PaxRooms,
    IsDetailedResponse,
    Filters,
    ResponseTime,
  } = req.body;

  /* ---------------- VALIDATION ---------------- */

  if (!CheckIn || !CheckOut) {
    throw new ApiError(400, "CheckIn and CheckOut are required");
  }

  if (!CityCode) {
    throw new ApiError(400, "CityCode is required");
  }

  if (!NoOfRooms || !Array.isArray(PaxRooms)) {
    throw new ApiError(400, "Valid room configuration is required");
  }

  if (Number(NoOfRooms) !== PaxRooms.length) {
    throw new ApiError(400, "NoOfRooms must match PaxRooms length");
  }

  const cacheKeyPayload = {
    CheckIn,
    CheckOut,
    CityCode,
    GuestNationality,
    NoOfRooms,
    PaxRooms,
    IsDetailedResponse,
    Filters,
    ResponseTime,
  };

  const cacheKey = buildCacheKey(cacheKeyPayload);

  let indexedHotels = null;
  let traceId = null;

  /* =====================================================
     TRY CACHE FIRST
  ===================================================== */
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      const cachedHotels = Array.isArray(parsed)
        ? parsed
        : parsed?.hotels;
      if (Array.isArray(cachedHotels)) {
        indexedHotels = addIndex(cachedHotels);
        traceId = parsed?.traceId || null;
      }
    }
  } catch (err) {
    console.error("[hotel-search] Redis read failed:", err?.message || err);
  }

  /* =====================================================
     CACHE MISS → CALL TBO
  ===================================================== */
  if (!indexedHotels) {
    const hotelCodeResponse = await tboService.getTBOHotelCodeList(CityCode);

    if (!hotelCodeResponse?.Hotels?.length) {
      console.log("[hotel-search] no hotel codes found for city", CityCode);
      indexedHotels = [];
    } else {
      const hotelCodesArray = hotelCodeResponse.Hotels.slice(0, 200);
      const hotelCodes = hotelCodesArray.map((h) => h.HotelCode).join(",");

      let searchResults = await tboService.searchHotels({
        CheckIn,
        CheckOut,
        HotelCodes: hotelCodes,
        GuestNationality,
        NoOfRooms,
        PaxRooms,
        IsDetailedResponse,
        Filters,
        ResponseTime
      });

      if (!searchResults?.HotelResult?.length) {
        console.log("[hotel-search] empty search result, retrying with defaults");
        searchResults = await tboService.searchHotels({
          CheckIn,
          CheckOut,
          HotelCodes: hotelCodes,
          GuestNationality: "IN",
          NoOfRooms,
          PaxRooms,
          IsDetailedResponse,
          Filters: {},
          ResponseTime,
        });
      }

      traceId = searchResults?.TraceId || null;

      const detailsResponse = await tboService.getStaticHotelDetails(
        hotelCodes,
      );

      const detailsList =
        detailsResponse?.HotelDetails ||
        detailsResponse?.HotelDetails?.HotelDetails ||
        [];

      const detailsMap = {};
      detailsList.forEach((hotel) => {
        detailsMap[hotel.HotelCode] = hotel;
      });

      const mergedHotels = (searchResults?.HotelResult || []).map((hotel) => {
        const details = detailsMap[hotel.HotelCode];

        return {
          ...hotel,
          HotelName: details?.HotelName || hotel.HotelName || "Hotel",
          Address: details?.Address || hotel.Address || "",
          CityName: details?.CityName || hotel.CityName || "",
          CountryName: details?.CountryName || hotel.CountryName || "",
          StarRating: details?.HotelRating || hotel.StarRating || 0,
          Description: details?.Description || hotel.Description || "",
          Images: details?.Images || hotel.Images || [],
          Amenities: details?.HotelFacilities || hotel.Amenities || [],
          Map: details?.Map || hotel.Map,
        };
      });

      const dedupedHotels = deduplicateHotels(mergedHotels);
      indexedHotels = addIndex(dedupedHotels);
    }

    try {
      await redis.set(
        cacheKey,
        JSON.stringify({ hotels: indexedHotels, traceId }),
        "EX",
        600,
      );
    } catch (err) {
      console.error("[hotel-search] Redis write failed:", err?.message || err);
    }
  }

  indexedHotels = indexedHotels || [];

  /* =====================================================
     STEP 9: PAGINATION (SERVER-SIDE)
  ===================================================== */
  const total = indexedHotels.length;
  const start = (page - 1) * limit;
  const paginatedHotels = indexedHotels.slice(start, start + limit);
  const pagination = {
    total,
    page,
    limit,
    hasMore: start + limit < total,
  };

  /* =====================================================
     FINAL RESPONSE
  ===================================================== */

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        hotels: paginatedHotels,
        HotelResult: paginatedHotels, // backward compatibility with existing consumers
        pagination,
        traceId,
      },
      "Hotel search completed with details",
    ),
  );
});
