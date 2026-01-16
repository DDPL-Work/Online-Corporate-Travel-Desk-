// selectRTSeatReady.js

export const selectRTSeatReady = (ssrRT, journeyType) => {
  const rows =
    ssrRT?.[journeyType]?.Response?.Results?.SeatDynamic?.[0]?.SegmentSeat?.[0]
      ?.RowSeats;

  return Array.isArray(rows) && rows.length > 0;
};
