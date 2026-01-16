export const parseRoundTrip = (segments = []) => {
  if (!Array.isArray(segments) || segments.length < 1) {
    return null;
  }

  // TBO format:
  // Segments = [ [onwardSegments], [returnSegments] ]

  const onwardSegments = Array.isArray(segments[0]) ? segments[0] : [];
  const returnSegments = Array.isArray(segments[1]) ? segments[1] : [];

  const buildJourney = (segs) => {
    if (!segs.length) return null;

    const first = segs[0];
    const last = segs[segs.length - 1];

    return {
      airline: first.Airline?.AirlineName,
      flightNumber: `${first.Airline?.AirlineCode}-${first.Airline?.FlightNumber}`,
      fromCode: first.Origin.Airport?.AirportCode,
      toCode: last.Destination.Airport?.AirportCode,
      departure: first.Origin.DepTime,
      arrival: last.Destination.ArrTime,
      duration: segs.reduce((sum, s) => sum + (s.Duration || 0), 0),
      stops: segs.length - 1,
      baggage: first.Baggage,
      refundable: true,
      logo: `https://images.kiwi.com/airlines/64/${first.Airline?.AirlineCode}.png`,
    };
  };

  return {
    onward: buildJourney(onwardSegments),
    return: buildJourney(returnSegments),
  };
};

export const pairRoundTrips = (flights = []) => {
  const onward = [];
  const returns = [];

  flights.forEach((f) => {
    const firstSeg = Array.isArray(f?.Segments?.[0]) ? f.Segments[0][0] : null;

    const trip = firstSeg?.TripIndicator;

    if (trip === 1) onward.push(f);
    if (trip === 2) returns.push(f);
  });

  const pairs = [];

  onward.forEach((onwardFlight) => {
    returns.forEach((returnFlight) => {
      pairs.push({
        onward: onwardFlight,
        return: returnFlight,
        totalFare:
          (onwardFlight?.Fare?.PublishedFare || 0) +
          (returnFlight?.Fare?.PublishedFare || 0),
      });
    });
  });

  return pairs;
};

export const parseSingleJourney = (segs = []) => {
  if (!Array.isArray(segs) || segs.length === 0) return null;

  const first = segs[0];
  const last = segs[segs.length - 1];

  return {
    airline: first.Airline?.AirlineName,
    flightNumber: `${first.Airline?.AirlineCode}-${first.Airline?.FlightNumber}`,

    fromCode: first.Origin.Airport?.AirportCode,
    fromCity: first.Origin.Airport?.CityName,
    fromAirport: first.Origin.Airport?.AirportName,
    fromCountry: first.Origin.Airport?.CountryName,
    toCode: last.Destination.Airport?.AirportCode,
    toCity: last.Destination.Airport?.CityName,
    toAirport: last.Destination.Airport?.AirportName,
    toCountry: last.Destination.Airport?.CountryName,

    // ✅ FIXED NAMES
    depTime: first.Origin.DepTime,
    arrTime: last.Destination.ArrTime,

    // ✅ FIXED NAME
    durationMins: segs.reduce((s, x) => s + (x.Duration || 0), 0),

    stops: segs.length - 1,
    baggage: first.Baggage || first.BaggageAllowance || "—",

    refundable:
      typeof first.IsRefundable === "boolean" ? first.IsRefundable : false,
    cabinClassCode: first.CabinClass,

    logo: `https://images.kiwi.com/airlines/64/${first.Airline?.AirlineCode}.png`,
  };
};

export const normalizeSSRBySegment = (ssr) => {
  if (!ssr?.Response) return [];

  const seatDynamic = ssr.Response.SeatDynamic?.[0]?.SegmentSeat || [];
  const mealDynamic = ssr.Response.MealDynamic?.[0] || [];
  const baggageDynamic = ssr.Response.Baggage?.[0] || [];

  return seatDynamic.map((segmentSeat) => ({
    seats: Array.isArray(segmentSeat.RowSeats)
      ? segmentSeat.RowSeats
      : [],
    meals: mealDynamic,
    baggage: baggageDynamic,
  }));
};

export const normalizeSSRBySegmentOW = (ssr) => {
  if (!ssr?.Response) return [];

  const segmentSeats = ssr.Response.SeatDynamic?.[0]?.SegmentSeat || [];
  const meals = ssr.Response.MealDynamic?.[0] || [];
  const baggage = ssr.Response.Baggage?.[0] || [];

  return segmentSeats.map((segmentSeat, segmentIndex) => ({
    segmentIndex,
    seats: Array.isArray(segmentSeat.RowSeats)
      ? segmentSeat.RowSeats
      : [],
    meals,     // journey-level
    baggage,   // journey-level
  }));
};


