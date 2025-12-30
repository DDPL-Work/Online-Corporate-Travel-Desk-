// server/src/controllers/flight.controller.js

const tboService = require("../services/tektravels/flight.service");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
/* --------------------------------------------------
 * 1️⃣ Flight Search
 * -------------------------------------------------- */
exports.searchFlights = asyncHandler(async (req, res) => {
  const data = await tboService.searchFlights(req.body);
  res
    .status(200)
    .json(new ApiResponse(200, data, "Flights fetched successfully"));
});

/* --------------------------------------------------
 * 2️⃣ Fare Quote (MANDATORY)
 * -------------------------------------------------- */
exports.getFareQuote = asyncHandler(async (req, res) => {
  const { traceId, resultIndex } = req.body;

  const data = await tboService.getFareQuote(traceId, resultIndex);

  res.status(200).json(new ApiResponse(200, data, "Fare quote successful"));
});

/* --------------------------------------------------
 * 3️⃣ Fare Rule
 * -------------------------------------------------- */

exports.getFareRule = async (req, res, next) => {
  try {
    const { traceId, resultIndex } = req.body; // ✅ BODY, not query

    const data = await tboService.getFareRule(traceId, resultIndex);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};

/* --------------------------------------------------
 * 4️⃣ SSR (REAL)
 * -------------------------------------------------- */
exports.getSSR = asyncHandler(async (req, res) => {
  const { traceId, resultIndex } = req.body;

  const data = await tboService.getSSR(traceId, resultIndex);

  res.status(200).json(new ApiResponse(200, data, "SSR fetched successfully"));
});

/* --------------------------------------------------
 * 4️⃣.1 Fare Upsell (Fare Families)
 * -------------------------------------------------- */
exports.getFareUpsell = asyncHandler(async (req, res) => {
  const { traceId, resultIndex } = req.body;

  const data = await tboService.getFareUpsell(traceId, resultIndex);

  res
    .status(200)
    .json(new ApiResponse(200, data, "Fare upsell fetched successfully"));
});

/* --------------------------------------------------
 * 5️⃣ Book Flight
 * -------------------------------------------------- */
exports.bookFlight = asyncHandler(async (req, res) => {
  const { traceId, resultIndex, Fare, passengers, ssr = {} } = req.body;

  if (!traceId || !resultIndex || !Fare || !passengers?.length) {
    throw new ApiError(
      400,
      "traceId, resultIndex, Fare and passengers are required"
    );
  }

  const paxTypeMap = { ADULT: 1, CHILD: 2, INFANT: 3 };

  const formattedPassengers = passengers.map((p, index) => ({
    ...p,
    paxType: paxTypeMap[p.paxType],
    isLeadPax: index === 0,
  }));

  const fareQuote = {
    Fare,
  };

  const data = await tboService.bookFlight({
    traceId,
    resultIndex,
    fareQuote,
    passengers: formattedPassengers,
    ssr, // 🔥 THIS WAS MISSING
  });

  res.status(200).json(new ApiResponse(200, data, "Flight booking successful"));
});

/* --------------------------------------------------
 * 6️⃣ Ticket Flight
 * -------------------------------------------------- */
exports.ticketFlight = asyncHandler(async (req, res) => {
  const data = await tboService.ticketFlight(req.body);

  res
    .status(200)
    .json(new ApiResponse(200, data, "Ticket issued successfully"));
});

/* --------------------------------------------------
 * 7️⃣ Retrieve Booking
 * -------------------------------------------------- */
exports.getBookingDetails = asyncHandler(async (req, res) => {
  const { pnr } = req.params;

  const data = await tboService.getBookingDetails({ PNR: pnr });

  res
    .status(200)
    .json(new ApiResponse(200, data, "Booking details fetched successfully"));
});
