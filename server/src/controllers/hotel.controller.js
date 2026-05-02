const tboService = require("../services/tektravels/hotel.service");
const tboSearchService = require("../services/tbo.service");
const cacheService = require("../services/cache.service");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const logger = require("../utils/logger");
const Country = require("../models/CountryList");
const TBOCity = require("../models/TBOCity");
const TBOHotel = require("../models/TBOHotel");
const TBOHotelDetails = require("../models/TBOHotelDetails");
const {
  buildHotelFilterMeta,
  prepareHotelsForFiltering,
  applyHotelFilters,
  sortPreparedHotels,
} = require("../utils/filterHotels");

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const DEFAULT_SORT_BY = "priceAsc";
const DEFAULT_TBO_FILTERS = {
  Refundable: false,
  MealType: "All",
};

const deduplicateHotels = (hotels = []) => {
  const seenKeys = new Set();
  const uniqueHotels = [];

  hotels.forEach((hotel) => {
    const hotelCodeKey = hotel?.HotelCode ? String(hotel.HotelCode).trim() : "";
    const compositeKey = `${String(hotel?.HotelName || "")
      .trim()
      .toLowerCase()}|${String(hotel?.CityName || hotel?.City || "")
      .trim()
      .toLowerCase()}|${String(hotel?.Address || "")
      .trim()
      .toLowerCase()}`;
    const key = hotelCodeKey || compositeKey || `row-${uniqueHotels.length}`;

    if (seenKeys.has(key)) return;

    seenKeys.add(key);
    uniqueHotels.push(hotel);
  });

  return uniqueHotels;
};

const normalizeSearchFilters = (filters = {}, tboFilters = {}) => {
  const normalized = {
    ...filters,
  };

  if (
    normalized.refundable === undefined &&
    normalized.refundable !== false &&
    tboFilters?.Refundable === true
  ) {
    normalized.refundable = true;
  }

  if (
    !normalized.mealType &&
    tboFilters?.MealType &&
    String(tboFilters.MealType).toLowerCase() !== "all"
  ) {
    normalized.mealType = String(tboFilters.MealType).replace(/_/g, " ");
  }

  return normalized;
};

const buildDetailsLookup = (details = []) =>
  details.reduce((lookup, detail) => {
    lookup[detail.hotelCode] = detail;
    return lookup;
  }, {});

const mergeSearchResultsWithStaticDetails = (searchResults = [], detailsMap = {}) =>
  deduplicateHotels(
    searchResults.map((hotel) => {
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
        Map: details?.map || hotel.Map || "",
        Thumbnail: details?.image || hotel.HotelThumbnail || "",
      };
    }),
  );

const fetchFullHotelSearchDataset = async ({
  CheckIn,
  CheckOut,
  CityCode,
  GuestNationality,
  NoOfRooms,
  PaxRooms,
  IsDetailedResponse,
  ResponseTime,
}) => {
  const localHotels = await TBOHotel.find({ cityCode: CityCode })
    .select("hotelCode")
    .lean();

  if (!localHotels.length) {
    logger.warn(`[hotel-search] No hotel codes found in DB for city ${CityCode}`);
    return {
      hotels: [],
      traceId: null,
      failedChunks: [],
      totalChunks: 0,
      elapsedMs: 0,
      totalHotelCodes: 0,
    };
  }

  const hotelCodes = localHotels
    .map((hotel) => String(hotel.hotelCode || "").trim())
    .filter(Boolean);

  // logger.info(
  //   `[hotel-search] Starting full search for ${hotelCodes.length} hotel codes in city ${CityCode}`,
  // );

  const tboResult = await tboSearchService.searchHotelsByCodeChunks({
    hotelCodes,
    searchPayload: {
      CheckIn,
      CheckOut,
      GuestNationality,
      NoOfRooms,
      PaxRooms,
      IsDetailedResponse,
      Filters: DEFAULT_TBO_FILTERS,
      ResponseTime,
    },
  });

  if (tboResult.hotels.length === 0) {
    return {
      ...tboResult,
      hotels: [],
      totalHotelCodes: hotelCodes.length,
    };
  }

  const hotelDetails = await TBOHotelDetails.find({
    hotelCode: { $in: tboResult.hotels.map((hotel) => hotel.HotelCode) },
  }).lean();

  return {
    ...tboResult,
    hotels: mergeSearchResultsWithStaticDetails(
      tboResult.hotels,
      buildDetailsLookup(hotelDetails),
    ),
    totalHotelCodes: hotelCodes.length,
  };
};

exports.getCountryList = asyncHandler(async (req, res) => {
  const data = await tboService.getCountryList();

  if (!data || data.Status?.Code !== 200) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Failed to fetch country list"));
  }

  const bulkOps = data.CountryList.map((country) => ({
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

  return res.status(200).json(
    new ApiResponse(
      200,
      data,
      "Country list fetched and synced successfully",
    ),
  );
});

exports.getCountriesFromDB = asyncHandler(async (req, res) => {
  const countries = await Country.find({})
    .sort({ Name: 1 })
    .select("Code Name -_id");

  return res.status(200).json(
    new ApiResponse(
      200,
      countries,
      "Country list fetched from database successfully",
    ),
  );
});

exports.getCityList = asyncHandler(async (req, res) => {
  const { countryCode, search } = req.query;

  if (!countryCode) {
    throw new ApiError(400, "countryCode query param is required");
  }

  const query = {
    countryCode: String(countryCode).toUpperCase(),
  };

  if (search) {
    query.cityName = { $regex: search, $options: "i" };
  }

  const cities = await TBOCity.find(query)
    .select("cityCode cityName countryCode countryName -_id")
    .sort({ cityName: 1 });

  return res.status(200).json(
    new ApiResponse(
      200,
      cities,
      "City list fetched from database successfully",
    ),
  );
});

exports.getStaticHotelDetails = asyncHandler(async (req, res) => {
  const { hotelCode } = req.body;

  if (!hotelCode) {
    throw new ApiError(400, "hotelCode is required");
  }

  const hotel = await TBOHotelDetails.findOne({ hotelCode }).lean();

  if (!hotel) {
    throw new ApiError(404, "Hotel details not found in database");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      hotel,
      "Static hotel details fetched successfully from DB",
    ),
  );
});

exports.searchHotels = asyncHandler(async (req, res) => {
  const pageParam = Number(req.query.page) || 1;
  const limitParam = Number(req.query.limit) || DEFAULT_LIMIT;
  const page = pageParam > 0 ? pageParam : 1;
  const limit =
    limitParam > 0 ? Math.min(limitParam, MAX_LIMIT) : DEFAULT_LIMIT;
  const offset = (page - 1) * limit;

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
    SearchFilters,
    forceRefresh,
  } = req.body;

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

  const baseSearchPayload = {
    CheckIn,
    CheckOut,
    CityCode,
    GuestNationality: GuestNationality || "IN",
    NoOfRooms: Number(NoOfRooms),
    PaxRooms,
    IsDetailedResponse:
      IsDetailedResponse === undefined ? true : Boolean(IsDetailedResponse),
    ResponseTime: ResponseTime === undefined ? undefined : Number(ResponseTime),
  };
  const searchFilters = normalizeSearchFilters(SearchFilters, Filters);
  const cacheKey = cacheService.buildSearchCacheKey(baseSearchPayload);
  let dataset = null;

  if (!forceRefresh) {
    dataset = await cacheService.getSearchResults(cacheKey);
  }

  const cacheHit = dataset && Array.isArray(dataset?.hotels);
  let backgroundRefreshTriggered = false;

  if (!cacheHit) {
    logger.info(`[hotel-search] CACHE MISS for key: ${cacheKey}. Fetching from TBO...`);
    dataset = await fetchFullHotelSearchDataset(baseSearchPayload);
    // Increase TTL to 20 minutes (1200s) to keep results alive longer
    await cacheService.setSearchResults(cacheKey, dataset, 1200);
  } else {
    logger.info(`[hotel-search] CACHE HIT for key: ${cacheKey}`);
    backgroundRefreshTriggered = await cacheService.refreshInBackground({
      cacheKey,
      refreshFn: async () => {
        const freshDataset = await fetchFullHotelSearchDataset(baseSearchPayload);
        await cacheService.setSearchResults(cacheKey, freshDataset);
      },
    });
  }

  const rawHotels = Array.isArray(dataset?.hotels) ? dataset.hotels : [];
  const preparedHotels = prepareHotelsForFiltering(rawHotels);
  const filterMeta = buildHotelFilterMeta(preparedHotels);
  const allHotels = preparedHotels.map(({ hotel }) => hotel);
  const total = allHotels.length;
  const failedChunks = Array.isArray(dataset?.failedChunks) ? dataset.failedChunks : [];

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        hotels: allHotels,
        HotelResult: allHotels,
        pagination: {
          total,
          page: 1,
          limit: total,
          offset: 0,
          hasMore: false,
        },
        filterMeta,
        traceId: dataset?.traceId || null,
        searchMeta: {
          cacheHit,
          backgroundRefreshTriggered,
          totalHotelCodes: dataset?.totalHotelCodes || 0,
          totalChunks: dataset?.totalChunks || 0,
          failedChunkCount: failedChunks.length,
          failedChunks,
          partialResults: failedChunks.length > 0,
          elapsedMs: dataset?.elapsedMs || 0,
        },
      },
      "Hotel search results returned with full data"
    )
  );
});
