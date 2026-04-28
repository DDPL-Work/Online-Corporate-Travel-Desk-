// hotel.controller.js

const tboService = require("../services/tektravels/hotel.service");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const Country = require("../models/CountryList");
const redis = require("../config/redis");
const stringify = require("fast-json-stable-stringify");
const TBOCity = require("../models/TBOCity");
const TBOHotel = require("../models/TBOHotel");
const TBOHotelDetails = require("../models/TBOHotelDetails");

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
    const hotelCodeKey = hotel?.HotelCode ? String(hotel.HotelCode).trim() : "";
    const compositeKey = `${(hotel.HotelName || "").trim().toLowerCase()}|${(
      hotel.CityName ||
      hotel.City ||
      ""
    )
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
  const { countryCode, search } = req.query;

  if (!countryCode) {
    throw new ApiError(400, "countryCode query param is required");
  }

  // Build query
  const query = {
    countryCode: countryCode.toUpperCase(),
  };

  // Optional: search by city name (for autocomplete)
  if (search) {
    query.cityName = { $regex: search, $options: "i" };
  }

  const cities = await TBOCity.find(query)
    .select("cityCode cityName countryCode countryName -_id")
    .sort({ cityName: 1 });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        cities,
        "City list fetched from database successfully",
      ),
    );
});

/* ---------------- STATIC HOTEL DETAILS ---------------- */
exports.getStaticHotelDetails = asyncHandler(async (req, res) => {
  const { hotelCode } = req.body;

  if (!hotelCode) {
    throw new ApiError(400, "hotelCode is required");
  }

  // Fetch from DB instead of TBO API
  const hotel = await TBOHotelDetails.findOne({ hotelCode }).lean();

  if (!hotel) {
    throw new ApiError(404, "Hotel details not found in database");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        hotel,
        "Static hotel details fetched successfully from DB",
      ),
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
      const cachedHotels = Array.isArray(parsed) ? parsed : parsed?.hotels;
      if (Array.isArray(cachedHotels)) {
        indexedHotels = addIndex(cachedHotels);
        traceId = parsed?.traceId || null;
      }
    }
  } catch (err) {
    console.error("[hotel-search] Redis read failed:", err?.message || err);
  }

  /* =====================================================
     CACHE MISS → DB CODES → TBO SEARCH → DB DETAILS
  ===================================================== */
  if (!indexedHotels) {
    // 1. Fetch Hotel Codes from local DB
    const localHotels = await TBOHotel.find({ cityCode: CityCode })
      .select("hotelCode")
      .lean();

    if (!localHotels.length) {
      console.log(
        "[hotel-search] No hotel codes found in DB for city:",
        CityCode,
      );
      indexedHotels = [];
    } else {
      const hotelCodesArray = localHotels.map((h) => h.hotelCode);

      /* ---------------- CHUNKING LOGIC (100 per request) ---------------- */
      const chunkSize = 100;
      const chunks = [];
      for (let i = 0; i < hotelCodesArray.length; i += chunkSize) {
        chunks.push(hotelCodesArray.slice(i, i + chunkSize).join(","));
      }

      console.log(
        `[hotel-search] Total hotels in DB: ${hotelCodesArray.length}, Chunks for TBO search: ${chunks.length}`,
      );

      /* ---------------- PARALLEL SEARCH TO TBO ---------------- */
      const searchPromises = chunks.map((hotelCodesChunk, index) =>
        tboService
          .searchHotels({
            CheckIn,
            CheckOut,
            HotelCodes: hotelCodesChunk,
            GuestNationality,
            NoOfRooms,
            PaxRooms,
            IsDetailedResponse,
            Filters,
            ResponseTime,
          })
          .then((res) => {
            console.log(
              `[hotel-search] chunk ${index + 1} success: ${res?.HotelResult?.length || 0} hotels`,
            );
            return res;
          })
          .catch((err) => {
            console.error(
              `[hotel-search] chunk ${index + 1} failed:`,
              err?.message,
            );
            return null;
          }),
      );

      const searchResponses = await Promise.all(searchPromises);

      /* ---------------- MERGE SEARCH RESULTS ---------------- */
      const allSearchResults = searchResponses.flatMap(
        (res) => res?.HotelResult || [],
      );
      traceId = searchResponses.find((r) => r?.TraceId)?.TraceId || null;

      if (allSearchResults.length === 0) {
        indexedHotels = [];
      } else {
        /* ---------------- FETCH STATIC DETAILS FROM DB (INSTEAD OF API) ---------------- */
        const availableCodes = allSearchResults.map((h) => h.HotelCode);

        console.log(
          `[hotel-details] Fetching static details from DB for ${availableCodes.length} available hotels.`,
        );

        const localDetails = await TBOHotelDetails.find({
          hotelCode: { $in: availableCodes },
        }).lean();

        const detailsMap = {};
        localDetails.forEach((d) => {
          detailsMap[d.hotelCode] = d;
        });

        /* ---------------- MERGE DB DETAILS WITH TBO SEARCH RESULTS ---------------- */
        const mergedHotels = allSearchResults.map((hotel) => {
          const details = detailsMap[hotel.HotelCode];

          return {
            ...hotel,
            HotelName: details?.hotelName || hotel.HotelName || "Hotel",
            Address: details?.address || hotel.Address || "",
            CityName: details?.cityName || hotel.CityName || "",
            CountryName: details?.countryName || hotel.CountryName || "",
            StarRating: details?.hotelRating || hotel.StarRating || 0,
            Description: details?.description || hotel.Description || "",
            Images: details?.images || hotel.Images || [],
            Amenities: details?.hotelFacilities || hotel.Amenities || [],
            Map: details?.map || hotel.Map,
            // Fallback to thumbnail if no images
            Thumbnail: details?.image || hotel.HotelThumbnail || "",
          };
        });

        const dedupedHotels = deduplicateHotels(mergedHotels);
        indexedHotels = addIndex(dedupedHotels);
      }
    }

    /* ---------------- CACHE ---------------- */
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
