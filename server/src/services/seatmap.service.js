const { normalizeRows } = require('../utils/seatNormalizer');

function buildSeatMap(tboSeatMapResponse) {
  const segmentSeat =
    tboSeatMapResponse?.SeatDynamic?.[0]?.SegmentSeat?.[0];

  if (!segmentSeat) return [];

  const normalizedRows = normalizeRows(segmentSeat.RowSeats);

  return {
    airline: segmentSeat.RowSeats[1]?.Seats[0]?.AirlineCode,
    flightNumber: segmentSeat.RowSeats[1]?.Seats[0]?.FlightNumber,
    origin: segmentSeat.RowSeats[1]?.Seats[0]?.Origin,
    destination: segmentSeat.RowSeats[1]?.Seats[0]?.Destination,
    rows: normalizedRows
  };
}

module.exports = { buildSeatMap };
