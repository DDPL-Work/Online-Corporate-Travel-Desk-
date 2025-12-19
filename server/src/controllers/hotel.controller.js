const tboService = require('../services/tektravels/hotel.service');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Search hotels
// @route   POST /api/v1/hotels/search
// @access  Private
exports.searchHotels = asyncHandler(async (req, res) => {
  const searchParams = req.body;

  const results = await tboService.searchHotels(searchParams);

  res.status(200).json(
    new ApiResponse(200, results, 'Hotel search completed successfully')
  );
});

// @desc    Get hotel details
// @route   GET /api/v1/hotels/:hotelCode
// @access  Private
exports.getHotelDetails = asyncHandler(async (req, res) => {
  const { hotelCode } = req.params;
  const { traceId } = req.query;

  const hotelDetails = await tboService.getHotelDetails(hotelCode, traceId);

  res.status(200).json(
    new ApiResponse(200, hotelDetails, 'Hotel details fetched successfully')
  );
});
