// utils/parseRoundTrip.js
export const parseRoundTrip = (segments = []) => {
  // if (!Array.isArray(segments) || segments.length < 2) return null;
  if (!Array.isArray(segments) || segments.length === 0) return null;


  const parseLeg = (legSegments) => {
    if (!legSegments?.length) return null;

    const first = legSegments[0];
    const last = legSegments[legSegments.length - 1];

    const totalDuration = legSegments.reduce(
      (sum, s) => sum + (s?.Duration || 0),
      0
    );

    return {
      airline: first?.Airline?.AirlineName || "—",
      airlineCode: first?.Airline?.AirlineCode,
      flightNumber: `${first?.Airline?.AirlineCode}-${first?.Airline?.FlightNumber}`,
      fromCode: first?.Origin?.Airport?.AirportCode,
      toCode: last?.Destination?.Airport?.AirportCode,
      departure: first?.Origin?.DepTime,
      arrival: last?.Destination?.ArrTime,
      duration: totalDuration,
      stops: legSegments.length - 1,
      segments: legSegments,
    };
  };

  return {
    onward: parseLeg(segments[0]),
    return: parseLeg(segments[1]),
  };
};
