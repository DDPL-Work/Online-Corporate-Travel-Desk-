const ApiError = require("../../utils/ApiError");
const logger = require("../../utils/logger");
const paymentService = require("../payment.service");
const tboService = require("../tektravels/flight.service");

const extractPnr = (response = {}) =>
  response?.Response?.Response?.PNR ||
  response?.Response?.Response?.FlightItinerary?.PNR ||
  response?.raw?.Response?.Response?.PNR ||
  response?.raw?.Response?.Response?.FlightItinerary?.PNR ||
  null;

const getFareResults = (fareQuote = {}) => {
  if (Array.isArray(fareQuote?.Results)) return fareQuote.Results;
  if (fareQuote?.Results) return [fareQuote.Results];
  if (Array.isArray(fareQuote?.Response?.Results)) return fareQuote.Response.Results;
  if (fareQuote?.Response?.Results) return [fareQuote.Response.Results];
  return [];
};

const hasValidSSR = (ssr) => {
  if (!ssr) return false;

  try {
    const flatSeat = Array.isArray(ssr?.seats) && ssr.seats.length > 0;
    const flatMeal = Array.isArray(ssr?.meals) && ssr.meals.length > 0;
    const flatBaggage = Array.isArray(ssr?.baggage) && ssr.baggage.length > 0;

    const seat = ssr?.SeatDynamic?.[0]?.SegmentSeat?.some(
      (segment) => segment.Seat?.length > 0,
    );

    const meal = ssr?.MealDynamic?.[0]?.SegmentMeal?.some(
      (segment) => segment.Meal?.length > 0,
    );

    const baggage = ssr?.Baggage?.some((item) => item.Weight > 0);

    return flatSeat || flatMeal || flatBaggage || seat || meal || baggage;
  } catch {
    return false;
  }
};

const splitSSR = (snapshot, type) => {
  if (!snapshot) return null;

  return {
    seats: (snapshot.seats || []).filter((seat) => seat.journeyType === type),
    meals: (snapshot.meals || []).filter((meal) => meal.journeyType === type),
    baggage: (snapshot.baggage || []).filter(
      (bag) => bag.journeyType === type,
    ),
  };
};

const logLccTicketPayload = ({
  bookingId,
  traceId,
  resultIndex,
  passengers,
  ssr,
  segmentType,
}) => {
  logger.info("LCC direct ticketing initiated", {
    bookingId,
    segmentType,
    traceId,
    resultIndex,
    passengerCount: passengers.length,
  });

  logger.debug("LCC ticket payload preview", {
    bookingId,
    segmentType,
    payload: {
      TraceId: traceId,
      ResultIndex: resultIndex,
      Passengers: passengers.map((passenger) => ({
        title: passenger.title,
        firstName: passenger.firstName,
        lastName: passenger.lastName,
        paxType: passenger.paxType,
        isLeadPax: passenger.isLeadPax,
        city: passenger.city,
        countryCode: passenger.countryCode,
      })),
      SSR: ssr,
    },
  });
};

const buildCorporateAddress = (corporate) => ({
  AddressLine1: corporate?.registeredAddress?.street || "NA",
  City: corporate?.registeredAddress?.city || "DELHI",
  CountryCode: "IN",
  CountryName: corporate?.registeredAddress?.country || "India",
});

const buildPassengersFromBooking = ({ booking, corporate }) => {
  const leadPassenger =
    booking.travellers.find((traveller) => traveller.isLeadPassenger) ||
    booking.travellers[0];

  const corporateAddress = buildCorporateAddress(corporate);

  return booking.travellers.map((traveller, index) => ({
    title:
      traveller.title ||
      (traveller.gender?.toUpperCase() === "MALE" ? "Mr" : "Ms"),
    firstName: traveller.firstName?.trim(),
    lastName: traveller.lastName?.trim(),
    paxType:
      traveller.paxType === "CHILD"
        ? 2
        : traveller.paxType === "INFANT"
          ? 3
          : 1,
    linkedAdultIndex:
      traveller.paxType === "INFANT"
        ? (traveller.linkedAdultIndex ?? 0)
        : undefined,
    dateOfBirth: traveller.dateOfBirth,
    gender: traveller.gender,
    passportNo: traveller.passportNumber,
    PassportIssueDate: traveller.PassportIssueDate,
    passportExpiry: traveller.passportExpiry,
    nationality: (traveller.nationality || "IN")
      .toString()
      .slice(0, 2)
      .toUpperCase(),
    email: traveller.email || leadPassenger?.email,
    contactNo: traveller.phoneWithCode || leadPassenger?.phoneWithCode,
    isLeadPax: traveller.isLeadPassenger === true || index === 0,
    addressLine1: corporateAddress.AddressLine1,
    city: corporateAddress.City,
    countryCode: corporateAddress.CountryCode,
    countryName: corporateAddress.CountryName,
  }));
};

const persistBookedState = async ({
  booking,
  corporate,
  bookingResult,
  executionStatus,
}) => {
  booking.bookingResult = bookingResult;
  booking.executionStatus = executionStatus;
  await booking.save();

  if (["booked", "ticketed"].includes(executionStatus)) {
    await paymentService.processBookingPayment({ booking, corporate });
  }
};

const performBooking = async ({ booking, passengers, corporate, isLCC }) => {
  const rawResultIndex = booking.flightRequest.resultIndex;
  const segments = booking.flightRequest.segments || [];
  const fareResults = getFareResults(booking.flightRequest.fareQuote);

  const isRoundTrip = segments.some((segment) => segment.journeyType === "return");
  const isInternational = segments.some(
    (segment) => segment.origin.country !== "IN" || segment.destination.country !== "IN",
  );
  const isCombinedRoundTrip =
    typeof rawResultIndex === "object" && isRoundTrip && isInternational;

  booking.executionStatus = "booking_initiated";
  await booking.save();

  const fareBreakdown = fareResults[0]?.FareBreakdown || [];

  if (fareBreakdown.length) {
    const expected = fareBreakdown.reduce(
      (accumulator, fareItem) => {
        const type =
          fareItem.PassengerType === 1
            ? "ADULT"
            : fareItem.PassengerType === 2
              ? "CHILD"
              : "INFANT";

        accumulator[type] = (accumulator[type] || 0) + (fareItem.PassengerCount || 0);
        accumulator.total += fareItem.PassengerCount || 0;
        return accumulator;
      },
      { ADULT: 0, CHILD: 0, INFANT: 0, total: 0 },
    );

    const actual = passengers.reduce(
      (accumulator, passenger) => {
        const type =
          passenger.paxType === 2
            ? "CHILD"
            : passenger.paxType === 3
              ? "INFANT"
              : "ADULT";

        accumulator[type] = (accumulator[type] || 0) + 1;
        accumulator.total += 1;
        return accumulator;
      },
      { ADULT: 0, CHILD: 0, INFANT: 0, total: 0 },
    );

    if (
      expected.total !== actual.total ||
      expected.ADULT !== actual.ADULT ||
      expected.CHILD !== actual.CHILD ||
      expected.INFANT !== actual.INFANT
    ) {
      throw new ApiError(
        400,
        `Invalid passenger count: expected A${expected.ADULT}/C${expected.CHILD}/I${expected.INFANT}, got A${actual.ADULT}/C${actual.CHILD}/I${actual.INFANT}`,
      );
    }
  }

  if (isCombinedRoundTrip) {
    const combinedIndex =
      typeof rawResultIndex === "object" ? rawResultIndex.onward : rawResultIndex;

    if (isLCC) {
      logLccTicketPayload({
        bookingId: booking._id,
        traceId: booking.flightRequest.traceId,
        resultIndex: combinedIndex,
        passengers,
        ssr: booking.flightRequest.ssrSnapshot,
        segmentType: "combined",
      });

      const ssrPayload = hasValidSSR(booking.flightRequest.ssrSnapshot)
        ? booking.flightRequest.ssrSnapshot
        : undefined;

      const ticketResponse = await tboService.ticketFlight({
        traceId: booking.flightRequest.traceId,
        resultIndex: combinedIndex,
        result: fareResults[0],
        passengers,
        ...(ssrPayload && { ssr: ssrPayload }),
        isLCC: true,
        gstDetails: booking.gstDetails,
      });

      const pnr = extractPnr(ticketResponse);

      if (!pnr) {
        throw new ApiError(500, "International round-trip ticketing failed");
      }

      await persistBookedState({
        booking,
        corporate,
        bookingResult: {
          pnr,
          providerResponse: ticketResponse,
        },
        executionStatus: "ticketed",
      });

      return {
        bookingId: booking._id,
        pnr,
        executionStatus: booking.executionStatus,
      };
    }

    const bookingResponse = await tboService.bookFlight({
      IsLCC: false,
      traceId: booking.flightRequest.traceId,
      resultIndex: combinedIndex,
      result: fareResults[0],
      passengers,
      ssr: booking.flightRequest.ssrSnapshot,
      gstDetails: booking.gstDetails,
    });

    const supplierBookingId = bookingResponse?.raw?.Response?.Response?.BookingId;

    if (!supplierBookingId) {
      throw new ApiError(500, "Booking failed - BookingId missing");
    }

    const pnr = extractPnr(bookingResponse);

    await persistBookedState({
      booking,
      corporate,
      bookingResult: {
        pnr,
        providerResponse: bookingResponse,
      },
      executionStatus: "booked",
    });

    const ticketResponse = await tboService.ticketFlight({
      traceId: booking.flightRequest.traceId,
      bookingId: supplierBookingId,
      pnr,
      passengers,
      isLCC: false,
      gstDetails: booking.gstDetails,
    });

    const ticketStatus = ticketResponse?.Response?.Response?.TicketStatus;
    const responseStatus = ticketResponse?.Response?.ResponseStatus;

    if (ticketStatus !== 1 || responseStatus !== 1) {
      booking.executionStatus = "ticket_pending";
      booking.bookingResult.ticketError = ticketResponse;
      await booking.save();

      return {
        bookingId: booking._id,
        pnr,
        executionStatus: booking.executionStatus,
      };
    }

    booking.executionStatus = "ticketed";
    booking.bookingResult.providerResponse.ticketResponse = ticketResponse;
    await booking.save();

    return {
      bookingId: booking._id,
      pnr,
      executionStatus: booking.executionStatus,
    };
  }

  if (typeof rawResultIndex === "object" && !isCombinedRoundTrip) {
    const onwardIndex = rawResultIndex.onward;
    const returnIndex = rawResultIndex.return;

    if (isLCC) {
      const onwardResponse = await tboService.ticketFlight({
        traceId: booking.flightRequest.traceId,
        resultIndex: onwardIndex,
        result: fareResults[0],
        passengers,
        ssr: splitSSR(booking.flightRequest.ssrSnapshot, "onward"),
        isLCC: true,
        gstDetails: booking.gstDetails,
      });

      const returnResponse = await tboService.ticketFlight({
        traceId: booking.flightRequest.traceId,
        resultIndex: returnIndex,
        result: fareResults[1],
        passengers,
        ssr: splitSSR(booking.flightRequest.ssrSnapshot, "return"),
        isLCC: true,
        gstDetails: booking.gstDetails,
      });

      const onwardPNR = extractPnr(onwardResponse);
      const returnPNR = extractPnr(returnResponse);

      if (!onwardPNR || !returnPNR) {
        throw new ApiError(500, "LCC ticketing failed");
      }

      await persistBookedState({
        booking,
        corporate,
        bookingResult: {
          pnr: `${onwardPNR} / ${returnPNR}`,
          onwardPNR,
          returnPNR,
          onwardResponse,
          returnResponse,
        },
        executionStatus: "ticketed",
      });

      return {
        bookingId: booking._id,
        onwardPNR,
        returnPNR,
        executionStatus: booking.executionStatus,
      };
    }

    const onwardResponse = await tboService.bookFlight({
      IsLCC: false,
      traceId: booking.flightRequest.traceId,
      resultIndex: onwardIndex,
      result: fareResults[0],
      passengers,
      ssr: splitSSR(booking.flightRequest.ssrSnapshot, "onward"),
      gstDetails: booking.gstDetails,
    });

    const returnResponse = await tboService.bookFlight({
      IsLCC: false,
      traceId: booking.flightRequest.traceId,
      resultIndex: returnIndex,
      result: fareResults[1],
      passengers,
      ssr: splitSSR(booking.flightRequest.ssrSnapshot, "return"),
      gstDetails: booking.gstDetails,
    });

    const onwardPNR = extractPnr(onwardResponse);
    const returnPNR = extractPnr(returnResponse);

    if (!onwardPNR || !returnPNR) {
      throw new ApiError(500, "Booking failed");
    }

    booking.bookingResult = {
      pnr: `${onwardPNR} / ${returnPNR}`,
      onwardPNR,
      returnPNR,
      onwardResponse,
      returnResponse,
    };

    booking.executionStatus = "booked";
    await booking.save();

    await paymentService.processBookingPayment({ booking, corporate });

    const onwardSupplierBookingId =
      onwardResponse?.raw?.Response?.Response?.BookingId;
    const returnSupplierBookingId =
      returnResponse?.raw?.Response?.Response?.BookingId;

    const onwardTicketResponse = await tboService.ticketFlight({
      traceId: booking.flightRequest.traceId,
      bookingId: onwardSupplierBookingId,
      pnr: onwardPNR,
      passengers,
      isLCC: false,
      gstDetails: booking.gstDetails,
    });

    const returnTicketResponse = await tboService.ticketFlight({
      traceId: booking.flightRequest.traceId,
      bookingId: returnSupplierBookingId,
      pnr: returnPNR,
      passengers,
      isLCC: false,
      gstDetails: booking.gstDetails,
    });

    const onwardSuccess =
      onwardTicketResponse?.Response?.Response?.TicketStatus === 1 &&
      onwardTicketResponse?.Response?.ResponseStatus === 1;

    const returnSuccess =
      returnTicketResponse?.Response?.Response?.TicketStatus === 1 &&
      returnTicketResponse?.Response?.ResponseStatus === 1;

    if (!onwardSuccess || !returnSuccess) {
      throw new ApiError(500, "Round-trip ticketing failed");
    }

    booking.bookingResult.ticketResponse = {
      onward: onwardTicketResponse,
      return: returnTicketResponse,
    };
    booking.executionStatus = "ticketed";
    await booking.save();

    return {
      bookingId: booking._id,
      onwardPNR,
      returnPNR,
      executionStatus: booking.executionStatus,
    };
  }

  if (isLCC && segments.length > 1) {
    logger.warn("Multi-segment LCC detected, switching to fresh fare quote", {
      bookingId: booking._id,
    });

    const ssrPayload = hasValidSSR(booking.flightRequest.ssrSnapshot)
      ? booking.flightRequest.ssrSnapshot
      : undefined;

    const freshFare = await tboService.getFareQuote(
      booking.flightRequest.traceId,
      rawResultIndex,
    );

    const latestFare = Array.isArray(freshFare?.Response?.Results)
      ? freshFare.Response.Results[0]
      : freshFare?.Response?.Results;

    const ticketResponse = await tboService.ticketFlight({
      traceId: booking.flightRequest.traceId,
      resultIndex: rawResultIndex,
      result: latestFare,
      passengers,
      ...(ssrPayload && { ssr: ssrPayload }),
      isLCC: true,
      gstDetails: booking.gstDetails,
    });

    const pnr = extractPnr(ticketResponse);

    if (!pnr) {
      throw new ApiError(500, "LCC multi-segment ticketing failed");
    }

    await persistBookedState({
      booking,
      corporate,
      bookingResult: {
        pnr,
        providerResponse: ticketResponse,
      },
      executionStatus: "ticketed",
    });

    return {
      bookingId: booking._id,
      pnr,
      executionStatus: booking.executionStatus,
    };
  }

  if (isLCC) {
    logLccTicketPayload({
      bookingId: booking._id,
      traceId: booking.flightRequest.traceId,
      resultIndex: rawResultIndex,
      passengers,
      ssr: booking.flightRequest.ssrSnapshot,
      segmentType: "single",
    });

    const ssrPayload = hasValidSSR(booking.flightRequest.ssrSnapshot)
      ? booking.flightRequest.ssrSnapshot
      : undefined;

    const freshFare = await tboService.getFareQuote(
      booking.flightRequest.traceId,
      rawResultIndex,
    );

    const latestFare = freshFare?.Response?.Results;

    const ticketResponse = await tboService.ticketFlight({
      traceId: booking.flightRequest.traceId,
      resultIndex: rawResultIndex,
      result: latestFare,
      passengers,
      ...(ssrPayload && { ssr: ssrPayload }),
      isLCC: true,
      gstDetails: booking.gstDetails,
    });

    const pnr = extractPnr(ticketResponse);

    if (!pnr) {
      throw new ApiError(500, "LCC ticketing failed");
    }

    await persistBookedState({
      booking,
      corporate,
      bookingResult: {
        pnr,
        providerResponse: ticketResponse,
      },
      executionStatus: "ticketed",
    });

    return {
      bookingId: booking._id,
      pnr,
      executionStatus: booking.executionStatus,
    };
  }

  const bookingResponse = await tboService.bookFlight({
    IsLCC: false,
    traceId: booking.flightRequest.traceId,
    resultIndex: rawResultIndex,
    result: fareResults[0],
    passengers,
    ssr: booking.flightRequest.ssrSnapshot,
    gstDetails: booking.gstDetails,
  });

  const supplierBookingId = bookingResponse?.raw?.Response?.Response?.BookingId;

  if (!supplierBookingId) {
    throw new ApiError(500, "Booking failed - BookingId missing");
  }

  const pnr = extractPnr(bookingResponse);

  booking.bookingResult = {
    pnr,
    providerResponse: bookingResponse,
  };
  booking.executionStatus = "booked";
  await booking.save();

  await paymentService.processBookingPayment({ booking, corporate });

  const ticketResponse = await tboService.ticketFlight({
    traceId: booking.flightRequest.traceId,
    bookingId: supplierBookingId,
    pnr,
    passengers,
    isLCC: false,
    gstDetails: booking.gstDetails,
  });

  const ticketStatus = ticketResponse?.Response?.Response?.TicketStatus;
  const responseStatus = ticketResponse?.Response?.ResponseStatus;

  if (ticketStatus !== 1 || responseStatus !== 1 || !extractPnr(ticketResponse)) {
    booking.bookingResult.ticketError = ticketResponse;
    booking.executionStatus = "ticket_pending";
    await booking.save();

    return {
      bookingId: booking._id,
      pnr,
      executionStatus: booking.executionStatus,
    };
  }

  booking.bookingResult.providerResponse.ticketResponse = ticketResponse;
  booking.executionStatus = "ticketed";
  await booking.save();

  return {
    bookingId: booking._id,
    pnr,
    executionStatus: booking.executionStatus,
  };
};

module.exports = {
  buildPassengersFromBooking,
  extractPnr,
  getFareResults,
  hasValidSSR,
  performBooking,
};
