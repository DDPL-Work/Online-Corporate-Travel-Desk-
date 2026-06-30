function normalizeRows(rows) {
  const referenceRow = rows.reduce((a, b) =>
    a.Seats.length > b.Seats.length ? a : b
  );

  const referenceSeatNos = referenceRow.Seats.map(s => s.SeatNo);

  return rows.map(row => {
    const seatMap = new Map(
      row.Seats.map(seat => [seat.SeatNo, seat])
    );

    const normalizedSeats = referenceSeatNos.map(seatNo =>
      seatMap.get(seatNo) || {
        Code: "NoSeat",
        SeatNo: seatNo,
        SeatType: 0,
        AvailablityType: 0,
        Price: 0
      }
    );

    return {
      ...row,
      Seats: normalizedSeats
    };
  });
}

module.exports = { normalizeRows };
