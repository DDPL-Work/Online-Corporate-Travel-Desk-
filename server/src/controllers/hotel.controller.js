const tboService = require("../services/tektravels/hotel.service");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const Country = require("../models/CountryList");

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
  const {
    CheckIn,
    CheckOut,
    CityCode,
    GuestNationality,
    NoOfRooms,
    PaxRooms,
    IsDetailedResponse,
    Filters,
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

  /* =====================================================
     STEP 1: GET HOTEL CODE LIST BY CITY
  ===================================================== */

  const hotelCodeResponse = await tboService.getTBOHotelCodeList(CityCode);

  if (!hotelCodeResponse?.Hotels?.length) {
    throw new ApiError(404, "No hotels found for this city");
  }

  const hotelCodes = hotelCodeResponse.Hotels.slice(0, 300) // LIMIT TO 300 HOTELS
    .map((h) => h.HotelCode)
    .join(",");

  /* =====================================================
     STEP 2: SEARCH HOTELS USING HOTEL CODES
  ===================================================== */

  const searchResults = await tboService.searchHotels({
    CheckIn,
    CheckOut,
    HotelCodes: hotelCodes,
    GuestNationality,
    NoOfRooms,
    PaxRooms,
    IsDetailedResponse,
    Filters,
  });

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        searchResults,
        "Hotel search completed successfully",
      ),
    );
});
