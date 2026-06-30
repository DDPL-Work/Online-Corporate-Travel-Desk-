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
      stopCities: segs.slice(0, -1).map(s => s.Destination?.Airport?.AirportCode).filter(Boolean),
      baggage: first.Baggage,
      refundable: true,
      logo: `https://images.kiwi.com/airlines/64/${first.Airline?.AirlineCode}.png`,
      fromTerminal: first.Origin.Airport?.Terminal,
      toTerminal: last.Destination.Airport?.Terminal,
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
    stopCities: segs.slice(0, -1).map(s => s.Destination?.Airport?.AirportCode).filter(Boolean),
    baggage: first.Baggage || first.BaggageAllowance || "—",

    refundable:
      typeof first.IsRefundable === "boolean" ? first.IsRefundable : false,
    cabinClassCode: first.CabinClass,

    logo: `https://images.kiwi.com/airlines/64/${first.Airline?.AirlineCode}.png`,
    fromTerminal: first.Origin.Airport?.Terminal,
    toTerminal: last.Destination.Airport?.Terminal,
  };
};

export const normalizeSSRBySegment = (ssr) => {
  if (!ssr) return [];

  // 🔍 Find the root object (Response or Results)
  // TBO sometimes wraps the response in a dynamic hash key
  let root = ssr.Response || ssr.Results;

  if (!root) {
    // Look into keys
    const firstKey = Object.keys(ssr)[0];
    if (firstKey && ssr[firstKey]) {
      root = ssr[firstKey].Response || ssr[firstKey].Results || ssr[firstKey];
    }
  }

  if (!root) root = ssr;

  // 🔍 Find Seat Data (SeatDynamic or Seat)
  const seatSource =
    root.SeatDynamic?.[0]?.SegmentSeat ||
    root.Seat?.[0]?.SegmentSeat ||
    root.SeatDynamic ||
    root.Seat ||
    [];

  // 🔍 Find Meal Data
  const mealDynamic = root.MealDynamic?.[0] || root.Meal?.[0] || [];

  // 🔍 Find Baggage Data
  const baggageDynamic = root.Baggage?.[0] || [];

  // If seatSource is not an array of segments, it might be the flat list itself?
  // TBO usually gives [ { Value: ..., SegmentSeat: [...] } ]
  // But if we found SegmentSeat directly, we are good.

  // If seatSource is empty, return empty
  if (!Array.isArray(seatSource)) return [];

  // If seatSource has SegmentSeat inside (it was the outer array), map it
  if (seatSource[0]?.SegmentSeat) {
    return seatSource[0].SegmentSeat.map((segmentSeat) => ({
      seats: Array.isArray(segmentSeat.RowSeats) ? segmentSeat.RowSeats : [],
      meals: mealDynamic,
      baggage: baggageDynamic,
    }));
  }

  // If seatSource IS the array of SegmentSeats (because we found it deep)
  return seatSource.map((segmentSeat) => ({
    seats: Array.isArray(segmentSeat.RowSeats) ? segmentSeat.RowSeats : [],
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

export const mapSSRData = (ssrResponse, selectedFlights) => {
  const result = {
    onward: { baggage: [], meals: [], seats: [] },
    return: { baggage: [], meals: [], seats: [] }
  };

  if (!ssrResponse) return result;

  let root = ssrResponse.Response || ssrResponse.Results || ssrResponse;

  const allBaggage = root.Baggage?.flat() || [];
  const allMeals = root.MealDynamic?.flat() || root.Meal?.flat() || [];
  const allSeats = root.SeatDynamic || root.Seat || [];

  const onwardSegs = selectedFlights?.onward?.Segments?.flat() || [];
  const returnSegs = selectedFlights?.return?.Segments?.flat() || [];

  const matchItemToLeg = (item, legSegs, expectedWayType) => {
    if (item.WayType && Number(item.WayType) === expectedWayType) return true;

    const itemAirline = item.AirlineCode;
    const itemFlightNumber = item.FlightNumber;
    const itemOrigin = item.Origin;
    const itemDestination = item.Destination;

    return legSegs.some(seg => {
      const matchAirline = !itemAirline || seg.Airline?.AirlineCode === itemAirline;
      const matchFlight = !itemFlightNumber || seg.Airline?.FlightNumber === itemFlightNumber;
      const matchOrg = !itemOrigin || seg.Origin?.Airport?.AirportCode === itemOrigin;
      const matchDest = !itemDestination || seg.Destination?.Airport?.AirportCode === itemDestination;
      return matchAirline && matchFlight && matchOrg && matchDest;
    });
  };

  const splitItems = (items) => {
    const onward = [];
    const ret = [];
    items.forEach(item => {
      if (item.WayType == 1) onward.push(item);
      else if (item.WayType == 2) ret.push(item);
      else {
        if (matchItemToLeg(item, onwardSegs, 1)) onward.push(item);
        else if (matchItemToLeg(item, returnSegs, 2)) ret.push(item);
      }
    });
    return { onward, ret };
  };

  const splitBag = splitItems(allBaggage);
  const splitMeal = splitItems(allMeals);

  result.onward.baggage = splitBag.onward;
  result.onward.meals = splitMeal.onward;
  result.return.baggage = splitBag.ret;
  result.return.meals = splitMeal.ret;

  const extractSeats = (wayType, legSegs) => {
    const seatsForLeg = [];
    const seatArray = Array.isArray(allSeats) ? allSeats : [allSeats];
    
    seatArray.forEach(seatObj => {
      const segSeats = seatObj.SegmentSeat || seatObj || [];
      const segArray = Array.isArray(segSeats) ? segSeats : [segSeats];
      
      segArray.forEach(seg => {
        if (!seg) return;
        let matches = false;
        if (seg.WayType) {
           matches = (Number(seg.WayType) === wayType);
        } else {
           matches = matchItemToLeg(seg, legSegs, wayType);
        }
        if (matches) seatsForLeg.push(seg);
      });
    });

    return seatsForLeg.map(seg => ({
      seats: Array.isArray(seg.RowSeats) ? seg.RowSeats : [],
      meals: result[wayType === 1 ? 'onward' : 'return'].meals,
      baggage: result[wayType === 1 ? 'onward' : 'return'].baggage,
    }));
  };

  result.onward.seats = extractSeats(1, onwardSegs);
  result.return.seats = extractSeats(2, returnSegs);

  return result;
};