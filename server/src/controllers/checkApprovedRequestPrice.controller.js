const BookingRequest = require("../models/BookingRequest");
const FlightService = require("../services/tektravels/flight.service");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");

/**
 * @desc    Reverse price check for approved flight
 * @route   POST /api/v1/bookings/:id/check-price
 * @access  Private (Employee)
 */
exports.checkApprovedFlightPrice = async (req, res) => {
  const { id } = req.params;

  const booking = await BookingRequest.findById(id);

  if (!booking) {
    throw new ApiError(404, "Booking request not found");
  }

  if (booking.bookingType !== "flight") {
    throw new ApiError(400, "Only flight bookings are supported");
  }

  if (booking.requestStatus !== "approved") {
    throw new ApiError(400, "Booking must be approved to check price");
  }

  const { traceId, resultIndex } = booking.flightRequest || {};

  if (!traceId || !resultIndex) {
    throw new ApiError(400, "Missing traceId or resultIndex");
  }

  // -----------------------------
  // 1. CALL TBO FARE QUOTE
  // -----------------------------
  const fareQuote = await FlightService.getFareQuote(traceId, resultIndex);

  if (
    fareQuote?.Status !== 1 ||
    !fareQuote?.Results ||
    !fareQuote.Results.length
  ) {
    throw new ApiError(400, "FareQuote failed or returned no results");
  }

  const latestFare = fareQuote.Results[0].Fare;

  const newTotalPrice =
    Number(latestFare.PublishedFare) || Number(latestFare.OfferedFare);

  if (!newTotalPrice) {
    throw new ApiError(400, "Invalid fare returned by TBO");
  }

  // -----------------------------
  // 2. COMPARE PRICE
  // -----------------------------
  const oldTotalPrice = booking.pricingSnapshot?.totalAmount;

  let priceChanged = false;
  let priceDifference = 0;

  if (Number(oldTotalPrice) !== Number(newTotalPrice)) {
    priceChanged = true;
    priceDifference = newTotalPrice - oldTotalPrice;

    // -----------------------------
    // 3. UPDATE PRICE SNAPSHOT
    // -----------------------------
    booking.pricingSnapshot = {
      totalAmount: newTotalPrice,
      currency: latestFare.Currency || "INR",
      capturedAt: new Date(),
      source: "fare_quote",
    };

    booking.priceAudit = {
      previousAmount: oldTotalPrice,
      newAmount: newTotalPrice,
      difference: priceDifference,
      checkedAt: new Date(),
    };

    await booking.save();
  }

  // -----------------------------
  // 4. RESPONSE
  // -----------------------------
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        priceChanged,
        oldPrice: oldTotalPrice,
        newPrice: newTotalPrice,
        difference: priceDifference,
        currency: latestFare.Currency,
      },
      priceChanged
        ? "Fare updated based on latest availability"
        : "Fare unchanged, safe to proceed",
    ),
  );
};
