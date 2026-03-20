const hotelService = require("../services/tektravels/hotel.service");
const ApiError = require("../utils/ApiError");

/* ======================================================
   HOTEL SEARCH
====================================================== */
exports.searchHotels = async (req, res, next) => {
  try {
    const {
      checkInDate,
      checkOutDate,
      cityId,
      noOfRooms,
      adults,
      children,
      roomGuests,
      currency,
      nationality,
    } = req.body;

    if (!checkInDate || !checkOutDate || !cityId) {
      throw new ApiError(
        400,
        "checkInDate, checkOutDate and cityId are required"
      );
    }

    const result = await hotelService.searchHotels({
      checkInDate,
      checkOutDate,
      cityId,
      noOfRooms,
      adults,
      children,
      roomGuests,
      currency,
      nationality,
    });

    return res.status(200).json({
      success: true,
      message: "Hotels fetched successfully",
      data: result,
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

    if (!hotelCode || !traceId || ! resultIndex) {
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
