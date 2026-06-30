module.exports = async function checkApprovedFlightPriceService(booking) {
  const { traceId, resultIndex } = booking.flightRequest || {};

  // If trace missing → silently skip
  if (!traceId || !resultIndex) {
    return {
      skipped: true,
      message: "Price validation skipped (missing search reference)",
    };
  }

  try {
    const fareQuote = await FlightService.getFareQuote(traceId, resultIndex);

    if (
      fareQuote?.Status !== 1 ||
      !Array.isArray(fareQuote.Results) ||
      !fareQuote.Results.length
    ) {
      return {
        skipped: true,
        message:
          "Price validation skipped (fare no longer available, proceeding with booking)",
      };
    }

    const latestFare = fareQuote.Results[0].Fare;

    const newTotal =
      Number(latestFare.PublishedFare) || Number(latestFare.OfferedFare);

    if (!newTotal) {
      return {
        skipped: true,
        message:
          "Price validation skipped (invalid fare received from supplier)",
      };
    }

    const oldTotal = booking.pricingSnapshot?.totalAmount;

    if (Number(oldTotal) !== Number(newTotal)) {
      booking.pricingSnapshot = {
        totalAmount: newTotal,
        currency: latestFare.Currency || "INR",
        capturedAt: new Date(),
        source: "fare_quote",
      };

      booking.priceAudit = {
        previousAmount: oldTotal,
        newAmount: newTotal,
        difference: newTotal - oldTotal,
        checkedAt: new Date(),
      };

      await booking.save();

      return {
        priceChanged: true,
        oldPrice: oldTotal,
        newPrice: newTotal,
        difference: newTotal - oldTotal,
        currency: latestFare.Currency || "INR",
        message: `Fare updated from ₹${oldTotal} to ₹${newTotal}. Booking will continue with updated price.`,
      };
    }

    return {
      priceChanged: false,
      oldPrice: oldTotal,
      newPrice: oldTotal,
      currency: latestFare.Currency || "INR",
      message: "Fare verified. No change detected.",
    };
  } catch (err) {
    // 🔐 NEVER BLOCK BOOKING
    return {
      skipped: true,
      message:
        "Price validation could not be completed. Booking will proceed with last approved fare.",
    };
  }
};
