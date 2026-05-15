function toOfflineSearchDto({ searchId, results = [], total = 0, page = 1, limit = 10 }) {
  return {
    searchId,
    results: results.map((item) => ({
      resultIndex: item.resultIndex,
      airlineCode: item.airlineCode,
      airlineName: item.airlineName,
      flightNumber: item.flightNumber,
      origin: item.origin,
      destination: item.destination,
      departureTime: item.departureTime,
      arrivalTime: item.arrivalTime,
      duration: item.duration,
      stops: item.stops,
      fare: item.fare,
      oldFare: item.oldFare,
      fareDifference: item.fareDifference ?? item.fareDifferenceEstimate ?? null,
      reissueCharge: item.reissueCharge ?? 0,
      totalEstimate: item.totalEstimate ?? null,
      refundEstimate: item.refundEstimate ?? 0,
      currency: item.currency || "INR",
      pricingVersion: item.pricingVersion || null,
      pricingBreakdown: item.pricingBreakdown || null,
      cabinClass: item.cabinClass,
      segments: item.segments,
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
