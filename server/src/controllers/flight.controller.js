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
exports.getFareRule = asyncHandler(async (req, res) => {
  const { traceId, resultIndex } = req.body;

  const data = await tboService.getFareRule({
    TraceId: traceId,
    ResultIndex: resultIndex,
  });

  res
    .status(200)
    .json(new ApiResponse(200, data, "Fare rules fetched successfully"));
});

/* --------------------------------------------------
 * 4️⃣ SSR (Seat / Meal / Baggage)
 * -------------------------------------------------- */
/* ---------------- SSR (Dummy – Updated) ---------------- */
exports.getSSR = async (req, res) => {
  try {
    const { traceId, resultIndex } = req.body;

    return res.status(200).json({
      statusCode: 200,
      success: true,
      data: {
        Status: 1,
        TraceId: traceId,
        Results: {
          Baggage: [
            {
              AirlineCode: "AI",
              Weight: "15KG",
              Price: 1200,
              Currency: "INR",
            },
          ],
          Meal: [
            {
              Code: "VGML",
              Description: "Vegetarian Meal",
              Price: 450,
              Currency: "INR",
            },
          ],
          Seat: [
            {
              RowNo: "12",
              SeatNo: "A",
              Price: 350,
              Currency: "INR",
            },
          ],
        },
      },
      message: "SSR fetched successfully",
    });
  } catch (error) {
    console.error("SSR Error:", error);
    return res.status(500).json({
      statusCode: 500,
      success: false,
      message: "Failed to fetch SSR",
    });
  }
};

/* --------------------------------------------------
 * 5️⃣ Book Flight
 * -------------------------------------------------- */
exports.bookFlight = asyncHandler(async (req, res) => {
    console.log('BOOK REQUEST BODY:', JSON.stringify(req.body, null, 2));

 const { traceId, resultIndex, fareQuote, passengers } = req.body;

if (
  typeof traceId !== 'string' ||
  typeof resultIndex !== 'string' ||
  typeof fareQuote !== 'object' ||
  !Array.isArray(passengers) ||
  passengers.length === 0
) {
  throw new ApiError(
    400,
    'traceId, resultIndex, fareQuote and passengers are required'
  );
}


  const paxTypeMap = {
    ADULT: 1,
    CHILD: 2,
    INFANT: 3
  };

  const formattedPassengers = passengers.map((p, index) => ({
    ...p,
    paxType: paxTypeMap[p.paxType], // ✅ convert string → number
    isLeadPax: index === 0
  }));

const data = await tboService.bookFlight({
  traceId,
  resultIndex,
  fareQuote,
  passengers: formattedPassengers
});

  res.status(200).json(
    new ApiResponse(200, data, 'Flight booking successful')
  );
});


/* --------------------------------------------------
 * 6️⃣ Ticket Flight
 * -------------------------------------------------- */
exports.ticketFlight = asyncHandler(async (req, res) => {
  const { bookingId, pnr } = req.body;

  const data = await tboService.ticketFlight({
    BookingId: bookingId,
    PNR: pnr,
  });

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
