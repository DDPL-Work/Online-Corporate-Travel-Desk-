const tboService = require('../services/tbo.service');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Search flights
// @route   POST /api/v1/flights/search
// @access  Private
exports.searchFlights = asyncHandler(async (req, res) => {
  const searchParams = req.body;

  const results = await tboService.searchFlights(searchParams);

  res.status(200).json(
    new ApiResponse(200, results, 'Flight search completed successfully')
  );
});

// @desc    Get fare quote
// @route   POST /api/v1/flights/fare-quote
// @access  Private
exports.getFareQuote = asyncHandler(async (req, res) => {
  const { traceId, resultIndex } = req.body;

  const fareQuote = await tboService.getFareQuote(traceId, resultIndex);

  res.status(200).json(
    new ApiResponse(200, fareQuote, 'Fare quote fetched successfully')
  );
});

// @desc    Get fare rules
// @route   POST /api/v1/flights/fare-rules
// @access  Private
exports.getFareRules = asyncHandler(async (req, res) => {
  // Implement fare rules logic
  res.status(200).json(
    new ApiResponse(200, {}, 'Fare rules fetched successfully')
  );
});