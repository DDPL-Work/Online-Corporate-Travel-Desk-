/* ======================================================
   ROUND TRIP PAIRING UTILS (TBO COMPATIBLE)
   ====================================================== */

/* -------- Extract route & time from a flight -------- */
export const getRouteMeta = (flight) => {
  const segs = flight?.Segments?.[0];
  if (!Array.isArray(segs) || segs.length === 0) return null;

  const first = segs[0];
  const last = segs[segs.length - 1];

  return {
    from: first.Origin.Airport.AirportCode,
    to: last.Destination.Airport.AirportCode,
    depTime: first.Origin.DepTime,
    arrTime: last.Destination.ArrTime,
  };
};

/* -------- Classify flights -------- */
export const splitOnwardAndReturn = (
  flights,
  searchFrom,
  searchTo
) => {
  const onward = [];
  const returns = [];

  flights.forEach((f) => {
    const meta = getRouteMeta(f);
    if (!meta) return;

    if (meta.from === searchFrom && meta.to === searchTo) {
      onward.push(f);
    }

    if (meta.from === searchTo && meta.to === searchFrom) {
      returns.push(f);
    }
  });

  return { onward, returns };
};

/* -------- Compatibility rule -------- */
export const isCompatibleRoundTrip = (onward, ret) => {
  const o = getRouteMeta(onward);
  const r = getRouteMeta(ret);

  if (!o || !r) return false;

  // Route reversal
  if (o.from !== r.to) return false;
  if (o.to !== r.from) return false;

  // Return must depart AFTER onward arrives
  if (new Date(r.depTime) <= new Date(o.arrTime)) return false;

  return true;
};

/* -------- Final pairing algorithm -------- */
export const buildRoundTripPairs = (
  flights,
  searchFrom,
  searchTo
) => {
  const { onward, returns } = splitOnwardAndReturn(
    flights,
    searchFrom,
    searchTo
  );

  const pairs = [];

  onward.forEach((o) => {
    returns.forEach((r) => {
      if (isCompatibleRoundTrip(o, r)) {
        pairs.push({
          onward: o,
          return: r,
          totalFare:
            (o?.Fare?.PublishedFare || 0) +
            (r?.Fare?.PublishedFare || 0),
        });
      }
    });
  });

  return pairs;
};
