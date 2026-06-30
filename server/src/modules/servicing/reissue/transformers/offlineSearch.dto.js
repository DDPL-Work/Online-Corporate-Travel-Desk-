/**
 * toOfflineSearchDto
 *
 * Shapes the normalised offline search results before sending them to the client.
 * Every timing field (departureTime / arrivalTime) must pass through so that the
 * FlightOptionCard can render actual schedule data instead of "--".
 */
function toOfflineSearchDto({ searchId, results = [], total = 0, page = 1, limit = 10 }) {
  return {
    searchId,
    results: results.map((item) => ({
      resultIndex: item.resultIndex,

      // ── Airline identity ──────────────────────────────────────────────────
      airlineCode: item.airlineCode,
      airlineName: item.airlineName,
      flightNumber: item.flightNumber,

      // ── Route ────────────────────────────────────────────────────────────
      origin: item.origin,
      destination: item.destination,

      // ── Schedule (populated after the Origin.DepTime / Destination.ArrTime fix) ──
      departureTime: item.departureTime,
      arrivalTime: item.arrivalTime,

      // ── Journey metadata ─────────────────────────────────────────────────
      duration: item.duration,
      stops: item.stops,
      cabinClass: item.cabinClass,

      // ── Pricing ──────────────────────────────────────────────────────────
      fare: item.fare,
      offeredFare: item.offeredFare ?? item.fare,
      oldFare: item.oldFare,
      fareDifference: item.fareDifference ?? item.fareDifferenceEstimate ?? null,
      reissueCharge: item.reissueCharge ?? 0,
      totalEstimate: item.totalEstimate ?? null,
      refundEstimate: item.refundEstimate ?? 0,
      currency: item.currency || "INR",

      // ── Pricing provenance ───────────────────────────────────────────────
      pricingVersion: item.pricingVersion || null,
      pricingBreakdown: item.pricingBreakdown || null,
      pricingSource: item.pricingSource || null,

      // ── Segments (each segment also carries departureTime / arrivalTime) ─
      segments: (item.segments || []).map((seg) => ({
        origin: seg.origin,
        destination: seg.destination,
        departureTime: seg.departureTime,
        arrivalTime: seg.arrivalTime,
        duration: seg.duration,
        airlineCode: seg.airlineCode,
        airlineName: seg.airlineName,
        flightNumber: seg.flightNumber,
        fareClass: seg.fareClass,
        supplierFareClass: seg.supplierFareClass,
        availableSeats: seg.availableSeats,
        stops: seg.stops,
      })),
    })),
    pagination: {
      total,
      page,
      limit,
      pages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

module.exports = {
  toOfflineSearchDto,
};
