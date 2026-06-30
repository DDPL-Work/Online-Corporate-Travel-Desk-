const ApiError = require("../../utils/ApiError");
const logger = require("../../utils/logger");
const tboService = require("../tektravels/flight.service");
const {
  buildPassengersFromBooking,
  getFareResults,
} = require("./flightBookingExecutor.service");
const {
  calculateSnapshotTotals,
  mapSsrSnapshot,
} = require("./ssrMapping.service");

const toMoney = (value) => Number(Number(value || 0).toFixed(2));

const getFareTotal = (fareQuote = {}) =>
  getFareResults(fareQuote).reduce((sum, result) => {
    const fare = result?.Fare || {};
    return sum + Number(fare.PublishedFare || fare.OfferedFare || 0);
  }, 0);

const isSamePrice = (left, right) => Math.abs(toMoney(left) - toMoney(right)) < 0.01;

const isFareUnavailableError = (error) => {
  const text = String(error?.message || "").toLowerCase();

  return ["result index", "trace", "session", "fare quote", "no fare", "expired"].some(
    (token) => text.includes(token),
  );
};

const fetchSsrResponses = async ({ traceId, resultIndex }) => {
  if (typeof resultIndex === "object") {
    const [onward, returning] = await Promise.all([
      tboService.getSSR(traceId, resultIndex.onward),
      tboService.getSSR(traceId, resultIndex.return),
    ]);

    return [
      {
        journeyType: "onward",
        response: onward,
      },
      {
        journeyType: "return",
        response: returning,
      },
    ];
  }

  const response = await tboService.getSSR(traceId, resultIndex);

  return [
    {
      journeyType: "onward",
      response,
    },
  ];
};

const getFareQuotePayload = async ({ traceId, resultIndex }) => {
  if (typeof resultIndex === "object") {
    const [onwardFare, returnFare] = await Promise.all([
      tboService.getFareQuote(traceId, resultIndex.onward),
      tboService.getFareQuote(traceId, resultIndex.return),
    ]);

    const results = [getFareResults(onwardFare)[0], getFareResults(returnFare)[0]].filter(Boolean);

    return {
      results,
      raw: {
        onward: onwardFare,
        return: returnFare,
      },
      totalAmount: toMoney(getFareTotal({ Results: results })),
      currency: results[0]?.Fare?.Currency || "INR",
    };
  }

  const fareQuote = await tboService.getFareQuote(traceId, resultIndex);
  const results = getFareResults(fareQuote);

  return {
    results,
    raw: fareQuote,
    totalAmount: toMoney(getFareTotal({ Results: results })),
    currency: results[0]?.Fare?.Currency || "INR",
  };
};

const buildSegmentsFromMatchedResults = (matchedResults = [], storedSegments = []) => {
  const segments = [];

  matchedResults.forEach((result, resultIndex) => {
    const supplierSegments = Array.isArray(result?.Segments) ? result.Segments.flat() : [];

    supplierSegments.forEach((segment) => {
      const fallbackIndex = segments.length;
      const storedSegment = storedSegments[fallbackIndex] || {};
      const derivedJourneyType =
        storedSegment.journeyType || (matchedResults.length > 1 && resultIndex === 1 ? "return" : "onward");

      segments.push({
        segmentIndex: fallbackIndex,
        journeyType: derivedJourneyType,
        airlineCode: segment?.Airline?.AirlineCode || storedSegment.airlineCode || null,
        airlineName: segment?.Airline?.AirlineName || storedSegment.airlineName || null,
        flightNumber:
          segment?.Airline?.FlightNumber || segment?.FlightNumber || storedSegment.flightNumber || null,
        fareClass: segment?.Airline?.FareClass || storedSegment.fareClass || null,
        cabinClass: segment?.CabinClass || storedSegment.cabinClass || null,
        aircraft: segment?.Craft || storedSegment.aircraft || null,
        durationMinutes: segment?.Duration || storedSegment.durationMinutes || null,
        stopOver: segment?.StopOver || storedSegment.stopOver || false,
        origin: {
          airportCode:
            segment?.Origin?.Airport?.AirportCode || storedSegment.origin?.airportCode || null,
          airportName:
            segment?.Origin?.Airport?.AirportName || storedSegment.origin?.airportName || null,
          terminal: segment?.Origin?.Airport?.Terminal || storedSegment.origin?.terminal || null,
          city: segment?.Origin?.Airport?.CityName || storedSegment.origin?.city || null,
          country: segment?.Origin?.Airport?.CountryCode || storedSegment.origin?.country || null,
        },
        destination: {
          airportCode:
            segment?.Destination?.Airport?.AirportCode ||
            storedSegment.destination?.airportCode ||
            null,
          airportName:
            segment?.Destination?.Airport?.AirportName ||
            storedSegment.destination?.airportName ||
            null,
          terminal:
            segment?.Destination?.Airport?.Terminal || storedSegment.destination?.terminal || null,
          city: segment?.Destination?.Airport?.CityName || storedSegment.destination?.city || null,
          country:
            segment?.Destination?.Airport?.CountryCode || storedSegment.destination?.country || null,
        },
        departureDateTime: segment?.Origin?.DepTime || storedSegment.departureDateTime || null,
        arrivalDateTime: segment?.Destination?.ArrTime || storedSegment.arrivalDateTime || null,
        baggage: {
          checkIn: segment?.Baggage || storedSegment.baggage?.checkIn || null,
          cabin: segment?.CabinBaggage || storedSegment.baggage?.cabin || null,
        },
      });
    });
  });

  return segments;
};

const buildFareSnapshot = ({ existingFareSnapshot = {}, fareResults = [], matchedResults = [] }) => {
  const currency = fareResults[0]?.Fare?.Currency || existingFareSnapshot?.currency || "INR";
  const lastTicketDate =
    fareResults.find((item) => item?.LastTicketDate)?.LastTicketDate ||
    existingFareSnapshot?.lastTicketDate ||
    null;

  if (fareResults.length > 1) {
    return {
      currency,
      onwardFare: fareResults[0]?.Fare || existingFareSnapshot?.onwardFare || null,
      returnFare: fareResults[1]?.Fare || existingFareSnapshot?.returnFare || null,
      refundable: fareResults.every((item) => item?.IsRefundable !== false),
      fareType:
        existingFareSnapshot?.fareType ||
        matchedResults[0]?.ResultFareType ||
        matchedResults[1]?.ResultFareType ||
        null,
      miniFareRules:
        existingFareSnapshot?.miniFareRules ||
        matchedResults[0]?.MiniFareRules ||
        matchedResults[1]?.MiniFareRules ||
        [],
      lastTicketDate,
    };
  }

  const fare = fareResults[0]?.Fare || {};

  return {
    currency,
    baseFare: fare?.BaseFare || existingFareSnapshot?.baseFare || 0,
    tax: fare?.Tax || existingFareSnapshot?.tax || 0,
    publishedFare: fare?.PublishedFare || existingFareSnapshot?.publishedFare || 0,
    offeredFare: fare?.OfferedFare || existingFareSnapshot?.offeredFare || 0,
    refundable:
      typeof fareResults[0]?.IsRefundable === "boolean"
        ? fareResults[0].IsRefundable
        : existingFareSnapshot?.refundable,
    fareType:
      existingFareSnapshot?.fareType || matchedResults[0]?.ResultFareType || null,
    miniFareRules:
      existingFareSnapshot?.miniFareRules || matchedResults[0]?.MiniFareRules || [],
    lastTicketDate,
  };
};

const buildBookingSnapshot = ({
  existingBookingSnapshot = {},
  segments = [],
  totalAmount,
}) => {
  const firstSegment = segments[0] || {};
  const lastSegment = segments[segments.length - 1] || {};
  const onwardSegments = segments.filter((segment) => segment.journeyType === "onward");
  const returnSegments = segments.filter((segment) => segment.journeyType === "return");

  const sectors =
    segments.length > 0
      ? segments.map(
          (segment) =>
            `${segment.origin?.airportCode || "NA"}-${segment.destination?.airportCode || "NA"}`,
        )
      : existingBookingSnapshot?.sectors || [];

  return {
    ...existingBookingSnapshot,
    sectors,
    airline:
      [...new Set(segments.map((segment) => segment.airlineName).filter(Boolean))].join(", ") ||
      existingBookingSnapshot?.airline,
    travelDate:
      onwardSegments[0]?.departureDateTime ||
      firstSegment.departureDateTime ||
      existingBookingSnapshot?.travelDate,
    returnDate: returnSegments[0]?.departureDateTime || existingBookingSnapshot?.returnDate || null,
    cabinClass: existingBookingSnapshot?.cabinClass,
    amount: totalAmount,
    city: lastSegment.destination?.city || existingBookingSnapshot?.city,
  };
};

const determineStatus = ({ totalChanged, ssrChanged }) => {
  if (ssrChanged) return "SSR_CHANGED";
  if (totalChanged) return "PRICE_CHANGED";
  return "SUCCESS";
};

class BookingReconstructionService {
  buildFlightRequest({ booking, traceId, resultIndex, matchedResults, fareQuote, ssrSnapshot }) {
    const segments = buildSegmentsFromMatchedResults(
      matchedResults,
      booking.flightRequest?.segments || [],
    );
    const fareSnapshot = buildFareSnapshot({
      existingFareSnapshot: booking.flightRequest?.fareSnapshot || {},
      fareResults: fareQuote.results,
      matchedResults,
    });

    return {
      ...booking.flightRequest,
      traceId,
      resultIndex,
      segments,
      fareQuote: {
        Results: fareQuote.results,
      },
      fareSnapshot,
      ssrSnapshot,
      fareExpiry: null,
    };
  }

  buildPricingSnapshot({ booking, totalAmount, currency }) {
    return {
      ...(booking.pricingSnapshot || {}),
      totalAmount,
      currency: currency || booking.pricingSnapshot?.currency || "INR",
      capturedAt: new Date(),
    };
  }

  buildBookingSnapshot({ booking, segments, totalAmount }) {
    return buildBookingSnapshot({
      existingBookingSnapshot: booking.bookingSnapshot || {},
      segments,
      totalAmount,
    });
  }

  async rebuildBookingContext({
    booking,
    corporate,
    traceId,
    resultIndex,
    matchedResults = [],
  }) {
    logger.info("Booking reconstruction started", {
      bookingId: booking._id,
      traceId,
      resultIndex,
    });

    const oldSsrSnapshot = booking.flightRequest?.ssrSnapshot || {};
    const oldSsrTotals = calculateSnapshotTotals(oldSsrSnapshot);
    const oldBaseFareTotal = toMoney(getFareTotal(booking.flightRequest?.fareQuote));
    const oldTotalFare = toMoney(
      booking.pricingSnapshot?.totalAmount || oldBaseFareTotal + oldSsrTotals.totalAmount,
    );

    let ssrResponses = [];

    try {
      ssrResponses = await fetchSsrResponses({ traceId, resultIndex });
    } catch (error) {
      logger.warn("SSR fetch failed during reconstruction", {
        bookingId: booking._id,
        message: error.message,
      });

      if (
        (oldSsrSnapshot?.seats?.length || 0) +
          (oldSsrSnapshot?.meals?.length || 0) +
          (oldSsrSnapshot?.baggage?.length || 0) >
        0
      ) {
        throw new ApiError(409, "SSR could not be revalidated for the matched flight");
      }
    }

    const { mappedSnapshot, audit } = mapSsrSnapshot({
      oldSnapshot: oldSsrSnapshot,
      storedSegments: booking.flightRequest?.segments || [],
      ssrResponses,
    });

    let fareQuote;

    try {
      fareQuote = await getFareQuotePayload({ traceId, resultIndex });
    } catch (error) {
      logger.warn("Fare quote fetch failed during reconstruction", {
        bookingId: booking._id,
        message: error.message,
      });

      if (isFareUnavailableError(error)) {
        return {
          status: "FLIGHT_UNAVAILABLE",
          reconstructedContext: null,
          priceChange: null,
          ssrChange: null,
          notifications: [
            {
              type: "flight",
              resolution: "UNAVAILABLE",
              message: "Fare could not be reconstructed for the revalidated flight",
            },
          ],
        };
      }

      throw error;
    }

    if (!fareQuote?.results?.length) {
      return {
        status: "FLIGHT_UNAVAILABLE",
        reconstructedContext: null,
        priceChange: null,
        ssrChange: null,
        notifications: [
          {
            type: "flight",
            resolution: "UNAVAILABLE",
            message: "Matched flight no longer returned a valid fare quote",
          },
        ],
      };
    }

    const newBaseFareTotal = toMoney(fareQuote.totalAmount);
    const newSsrTotal = toMoney(mappedSnapshot.totalAmount || 0);
    const newTotalFare = toMoney(newBaseFareTotal + newSsrTotal);

    const baseFareChanged = !isSamePrice(oldBaseFareTotal, newBaseFareTotal);
    const totalChanged = !isSamePrice(oldTotalFare, newTotalFare);
    const ssrChanged = audit.hasChanges;

    const passengers = buildPassengersFromBooking({ booking, corporate });
    const flightRequest = this.buildFlightRequest({
      booking,
      traceId,
      resultIndex,
      matchedResults,
      fareQuote,
      ssrSnapshot: mappedSnapshot,
    });
    const pricingSnapshot = this.buildPricingSnapshot({
      booking,
      totalAmount: newTotalFare,
      currency: fareQuote.currency,
    });
    const bookingSnapshot = this.buildBookingSnapshot({
      booking,
      segments: flightRequest.segments,
      totalAmount: newTotalFare,
    });

    const notifications = audit.notifications.filter(
      (item) => item.resolution !== "APPLIED",
    );
    const status = determineStatus({
      totalChanged,
      ssrChanged,
    });

    return {
      status,
      reconstructedContext: {
        flight: {
          traceId,
          resultIndex,
          matchedResults,
          segments: flightRequest.segments,
          fareQuote: {
            Results: fareQuote.results,
          },
          fareSnapshot: flightRequest.fareSnapshot,
        },
        passengers,
        ssr: mappedSnapshot,
        fareDetails: {
          currency: fareQuote.currency,
          oldBaseFareTotal,
          newBaseFareTotal,
          oldSsrTotal: oldSsrTotals.totalAmount,
          newSsrTotal,
          oldTotalFare,
          newTotalFare,
        },
        pricingSnapshot,
        bookingSnapshot,
        flightRequest,
        notifications,
      },
      priceChange: {
        oldTotal: oldTotalFare,
        newTotal: newTotalFare,
        difference: toMoney(newTotalFare - oldTotalFare),
        currency: fareQuote.currency,
        baseFareChanged,
        totalChanged,
      },
      ssrChange: {
        previousAmount: oldSsrTotals.totalAmount,
        newAmount: newSsrTotal,
        difference: toMoney(newSsrTotal - oldSsrTotals.totalAmount),
        removedSelections: audit.removedSelections,
        repricedSelections: audit.repricedSelections,
        mappedSelections: audit.mappedSelections,
        selectionResolutions: audit.selectionResolutions,
        availabilityChanged: audit.availabilityChanged,
        priceChanged: audit.priceChanged,
        selectionCounts: audit.selectionCounts,
      },
      notifications,
    };
  }
}

module.exports = new BookingReconstructionService();
