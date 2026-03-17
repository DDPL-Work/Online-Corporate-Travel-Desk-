const hotelService = require("../services/tektravels/hotel.service");
const ApiError = require("../utils/ApiError");
// uuid import removed: traceId comes from supplier response, not generated client-side.

/* ======================================================
   HOTEL SEARCH
====================================================== */
exports.searchHotels = async (req, res, next) => {
  try {
    const body = req.body || {};

    // Support both legacy keys (checkInDate/cityId/roomGuests) and validated UI payload keys (CheckIn/CityCode/PaxRooms).
    const checkInDate = body.CheckIn || body.checkInDate || body.checkIn;
    const checkOutDate = body.CheckOut || body.checkOutDate || body.checkOut;
    const cityCode = body.CityCode || body.cityCode || body.CityId || body.cityId;

    if (!checkInDate || !checkOutDate || !cityCode) {
      throw new ApiError(
        400,
        "CheckIn, CheckOut and CityCode/CityId are required",
      );
    }

    const GuestNationality =
      body.GuestNationality || body.guestNationality || body.nationality;
    const NoOfRooms = body.NoOfRooms || body.noOfRooms;
    const PaxRooms = body.PaxRooms || body.roomGuests;
    const IsDetailedResponse = body.IsDetailedResponse;
    const Filters = body.Filters;

    if (!NoOfRooms || !Array.isArray(PaxRooms) || PaxRooms.length === 0) {
      throw new ApiError(400, "Valid room configuration is required");
    }

    if (Number(NoOfRooms) !== PaxRooms.length) {
      throw new ApiError(400, "NoOfRooms must match PaxRooms length");
    }

    // TBO HotelAPI/Search requires HotelCodes (comma-separated). Generate it from CityCode via static API.
    const hotelCodeResponse = await hotelService.getTBOHotelCodeList(cityCode);

    if (!hotelCodeResponse?.Hotels?.length) {
      throw new ApiError(404, "No hotels found for this city");
    }

    const hotelCodes = hotelCodeResponse.Hotels.slice(0, 300)
      .map((h) => h.HotelCode)
      .join(",");

    if (!hotelCodes) {
      throw new ApiError(404, "No searchable hotel codes found for this city");
    }

    const result = await hotelService.searchHotels({
      CheckIn: checkInDate,
      CheckOut: checkOutDate,
      HotelCodes: hotelCodes,
      GuestNationality,
      NoOfRooms,
      PaxRooms,
      IsDetailedResponse,
      Filters,
    });

    const providerTraceId =
      result?.TraceId ||
      result?.HotelSearchResult?.TraceId ||
      result?.SearchResult?.TraceId ||
      null;

    const hotelResult =
      result?.HotelResult ||
      result?.HotelSearchResult?.HotelResult ||
      result?.SearchResult?.HotelResult ||
      [];
    return res.status(200).json({
      success: true,
      message: "Hotels fetched successfully",
      data: {
        HotelResult: Array.isArray(hotelResult) ? hotelResult : [],
        TraceId: providerTraceId,
      },
    });
  } catch (err) {
    next(err);
  }
};

/* ======================================================
   HOTEL DETAILS
====================================================== */
exports.getHotelDetails = async (req, res, next) => {
  try {
    const { hotelCode, traceId, resultIndex } = req.body;

    if (!hotelCode || !traceId || !resultIndex) {
      throw new ApiError(400, "hotelCode, resultIndex and traceId are required");
    }

    const result = await hotelService.getHotelDetails(hotelCode, traceId, resultIndex);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/* ======================================================
   ROOM INFO
====================================================== */
exports.getRoomInfo = async (req, res, next) => {
  try {
    const { hotelCode, traceId, resultIndex } = req.body;

    if (!hotelCode || !traceId || !resultIndex) {
      throw new ApiError(400, "hotelCode, resultIndex and traceId are required");
    }

    const result = await hotelService.getRoomInfo(hotelCode, traceId, resultIndex);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/* ======================================================
   GET BOOKING DETAILS
====================================================== */
exports.getBookingDetails = async (req, res, next) => {
  try {
    const payload = req.body;

    if (!payload.BookingId && !payload.TraceId && !payload.ConfirmationNo) {
      throw new ApiError(400, "BookingId, TraceId or ConfirmationNo is required");
    }

    const result = await hotelService.getBookingDetails(payload);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};
