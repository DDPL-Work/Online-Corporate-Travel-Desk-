"use strict";

const toArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return [value].filter(Boolean);
};

const roundCurrency = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  return Number(amount.toFixed(2));
};

const toInteger = (value, fallback = null) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
};

const normalizeText = (value) => String(value || "").trim();

const normalizeJourneyType = (value, fallback = "onward") => {
  const text = normalizeText(value).toLowerCase();
  if (["return", "inbound", "rt", "2"].includes(text)) return "return";
  if (["onward", "outbound", "ow", "1"].includes(text)) return "onward";
  return fallback;
};

const resolveAirportCode = (value) =>
  normalizeText(
    value?.Airport?.AirportCode ||
      value?.AirportCode ||
      value?.airportCode ||
      value?.Code ||
      value?.code ||
      value,
  ).toUpperCase();

const resolveAirportName = (value, fallbackCode = "") =>
  normalizeText(
    value?.Airport?.AirportName ||
      value?.AirportName ||
      value?.airportName ||
      fallbackCode,
  );

const resolveCityName = (value, fallbackCode = "") =>
  normalizeText(
    value?.Airport?.CityName ||
      value?.CityName ||
      value?.city ||
      fallbackCode,
  );

const resolveTerminal = (value) =>
  normalizeText(value?.Airport?.Terminal || value?.Terminal || value?.terminal || "");

const resolveFlightNumber = (segment = {}, index = 0) =>
  normalizeText(
    segment?.flightNumber ||
      segment?.FlightNumber ||
      segment?.Airline?.FlightNumber ||
      segment?.Airline?.FlightNo ||
      `${index + 1}`,
  ).toUpperCase();

const uniqueValues = (values = []) => [...new Set(values.filter(Boolean).map((value) => normalizeText(value)))];

function normalizeSegment(segment = {}, index = 0) {
  const originCode = resolveAirportCode(segment?.origin || segment?.Origin || segment?.originAirport || null);
  const destinationCode = resolveAirportCode(
    segment?.destination || segment?.Destination || segment?.destinationAirport || null,
  );

  return {
    origin: originCode || null,
    destination: destinationCode || null,
    originCode: originCode || null,
    destinationCode: destinationCode || null,
    originAirportName:
      resolveAirportName(segment?.origin || segment?.Origin, originCode) || null,
    destinationAirportName:
      resolveAirportName(segment?.destination || segment?.Destination, destinationCode) || null,
    originCity: resolveCityName(segment?.origin || segment?.Origin, originCode) || null,
    destinationCity:
      resolveCityName(segment?.destination || segment?.Destination, destinationCode) || null,
    originTerminal: resolveTerminal(segment?.origin || segment?.Origin) || null,
    destinationTerminal: resolveTerminal(segment?.destination || segment?.Destination) || null,
    departureTime:
      segment?.departureTime ||
      segment?.departureDateTime ||
      segment?.Origin?.DepTime ||
      segment?.DepTime ||
      null,
    arrivalTime:
      segment?.arrivalTime ||
      segment?.arrivalDateTime ||
      segment?.Destination?.ArrTime ||
      segment?.ArrTime ||
      null,
    airlineCode: normalizeText(
      segment?.airlineCode || segment?.Airline?.AirlineCode || segment?.AirlineCode || "",
    ).toUpperCase() || null,
    airlineName:
      normalizeText(segment?.airlineName || segment?.Airline?.AirlineName || "") || null,
    flightNumber: resolveFlightNumber(segment, index) || null,
    duration: segment?.duration || segment?.Duration || null,
    baggage: segment?.baggage || segment?.Baggage || null,
    cabinBaggage: segment?.cabinBaggage || segment?.CabinBaggage || null,
    cabinClass: segment?.cabinClass || segment?.CabinClass || null,
    journeyType: normalizeJourneyType(segment?.journeyType, index > 0 ? "return" : "onward"),
    segmentIndex: index,
  };
}

function resolveSegmentIndex(item = {}, segments = []) {
  const directIndex = toInteger(item?.segmentIndex);
  if (directIndex != null && segments[directIndex]) return directIndex;

  const wantedJourneyType = item?.journeyType
    ? normalizeJourneyType(item.journeyType)
    : null;
  const wantedOrigin = normalizeText(item?.origin).toUpperCase();
  const wantedDestination = normalizeText(item?.destination).toUpperCase();
  const wantedFlightNumber = normalizeText(item?.flightNumber).toUpperCase();

  const matchedIndex = segments.findIndex((segment) => {
    if (wantedJourneyType && segment.journeyType !== wantedJourneyType) return false;
    if (wantedOrigin && segment.originCode !== wantedOrigin) return false;
    if (wantedDestination && segment.destinationCode !== wantedDestination) return false;
    if (wantedFlightNumber && segment.flightNumber !== wantedFlightNumber) return false;
    return Boolean(
      wantedJourneyType || wantedOrigin || wantedDestination || wantedFlightNumber,
    );
  });

  return matchedIndex >= 0 ? matchedIndex : 0;
}

function normalizeSeat(item = {}, segments = []) {
  const code = normalizeText(item?.seatCode || item?.seatNo || item?.code || item?.description);
  return {
    type: "seat",
    segmentIndex: resolveSegmentIndex(item, segments),
    paxIndex: toInteger(item?.paxIndex ?? item?.passengerIndex ?? item?.travellerIndex, 0),
    journeyType: normalizeJourneyType(
      item?.journeyType,
      segments[resolveSegmentIndex(item, segments)]?.journeyType || "onward",
    ),
    code: code || null,
    label: normalizeText(item?.label || item?.description || code) || null,
    amount: roundCurrency(item?.amount ?? item?.price),
    price: roundCurrency(item?.amount ?? item?.price),
    description: normalizeText(item?.label || item?.description || code) || null,
    currency: normalizeText(item?.currency || "INR") || "INR",
  };
}

function normalizeMeal(item = {}, segments = []) {
  const code = normalizeText(item?.code || item?.mealCode || item?.description);
  return {
    type: "meal",
    segmentIndex: resolveSegmentIndex(item, segments),
    paxIndex: toInteger(item?.paxIndex ?? item?.passengerIndex ?? item?.travellerIndex, 0),
    journeyType: normalizeJourneyType(
      item?.journeyType,
      segments[resolveSegmentIndex(item, segments)]?.journeyType || "onward",
    ),
    code: code || null,
    label: normalizeText(item?.label || item?.description || item?.AirlineDescription || code) || null,
    amount: roundCurrency(item?.amount ?? item?.price),
    price: roundCurrency(item?.amount ?? item?.price),
    description:
      normalizeText(item?.label || item?.description || item?.AirlineDescription || code) || null,
    currency: normalizeText(item?.currency || "INR") || "INR",
  };
}

function normalizeBaggage(item = {}, segments = []) {
  const weight = normalizeText(item?.weight || item?.Weight || "");
  const code = normalizeText(item?.code || item?.baggageCode || weight || item?.description);
  return {
    type: "baggage",
    segmentIndex: resolveSegmentIndex(item, segments),
    paxIndex: toInteger(item?.paxIndex ?? item?.passengerIndex ?? item?.travellerIndex, 0),
    journeyType: normalizeJourneyType(
      item?.journeyType,
      segments[resolveSegmentIndex(item, segments)]?.journeyType || "onward",
    ),
    code: code || null,
    label: normalizeText(item?.label || item?.description || weight || code) || null,
    weight: weight || null,
    amount: roundCurrency(item?.amount ?? item?.price),
    price: roundCurrency(item?.amount ?? item?.price),
    description: normalizeText(item?.label || item?.description || weight || code) || null,
    currency: normalizeText(item?.currency || "INR") || "INR",
  };
}

function normalizeSsrSnapshot(snapshot = {}, segments = []) {
  const normalizedSegments = segments.map((segment, index) => normalizeSegment(segment, index));

  const seats = toArray(snapshot?.seats || snapshot?.seat).map((item) =>
    normalizeSeat(item, normalizedSegments),
  );
  const meals = toArray(snapshot?.meals || snapshot?.meal).map((item) =>
    normalizeMeal(item, normalizedSegments),
  );
  const baggage = toArray(snapshot?.baggage || snapshot?.bags).map((item) =>
    normalizeBaggage(item, normalizedSegments),
  );

  const totalSeatAmount =
    roundCurrency(
      snapshot?.totalSeatAmount ??
        seats.reduce((total, item) => total + Number(item?.amount || 0), 0),
    ) || 0;
  const totalMealAmount =
    roundCurrency(
      snapshot?.totalMealAmount ??
        meals.reduce((total, item) => total + Number(item?.amount || 0), 0),
    ) || 0;
  const totalBaggageAmount =
    roundCurrency(
      snapshot?.totalBaggageAmount ??
        baggage.reduce((total, item) => total + Number(item?.amount || 0), 0),
    ) || 0;
  const totalSSRAmount = roundCurrency(
    snapshot?.totalSSRAmount ??
      snapshot?.totalAmount ??
      totalSeatAmount + totalMealAmount + totalBaggageAmount,
  );

  return {
    seats,
    meals,
    baggage,
    totalSeatAmount,
    totalMealAmount,
    totalBaggageAmount,
    totalAmount: totalSSRAmount,
    totalSSRAmount,
  };
}

function summarizeSegmentSelections(items = [], type) {
  if (!items.length) return null;

  return {
    code: uniqueValues(items.map((item) => item?.code)).join(", ") || null,
    label:
      uniqueValues(
        items.map((item) =>
          type === "seat" ? item?.label || item?.code : item?.label || item?.weight || item?.code,
        ),
      ).join(", ") || null,
    ...(type === "baggage"
      ? {
          weight: uniqueValues(items.map((item) => item?.weight)).join(", ") || null,
        }
      : {}),
    amount: roundCurrency(items.reduce((total, item) => total + Number(item?.amount || 0), 0)),
    selections: items,
  };
}

function buildSegmentsWithSsr(segments = [], ssrSnapshot = {}) {
  const normalizedSegments = segments.map((segment, index) => normalizeSegment(segment, index));
  const normalizedSsr = normalizeSsrSnapshot(ssrSnapshot, normalizedSegments);

  const enrichedSegments = normalizedSegments.map((segment, index) => {
    const seats = normalizedSsr.seats.filter((item) => item.segmentIndex === index);
    const meals = normalizedSsr.meals.filter((item) => item.segmentIndex === index);
    const baggage = normalizedSsr.baggage.filter((item) => item.segmentIndex === index);

    return {
      ...segment,
      ssr: {
        seat: summarizeSegmentSelections(seats, "seat"),
        meal: summarizeSegmentSelections(meals, "meal"),
        baggage: summarizeSegmentSelections(baggage, "baggage"),
      },
    };
  });

  return {
    segments: enrichedSegments,
    ssr: normalizedSsr,
  };
}

module.exports = {
  normalizeSegment,
  normalizeSsrSnapshot,
  buildSegmentsWithSsr,
  roundCurrency,
};
