const mongoose = require("mongoose");
const logger = require("../../utils/logger");
const {
  normalizeSsrSnapshot,
  roundCurrency,
} = require("../../modules/servicing/reissue/utils/ssrSnapshot.util");
const { classifySsrFinancials } = require("./reissueSSRFinancial.service");

function buildLastTicketedSnapshot({
  request = {},
  booking = {},
  ssrSnapshot = null,
  fare = null,
  bookingIdOverride = null,
} = {}) {
  const activeSnapshot =
    request?.lastTicketedSnapshot ||
    request?.financialLedger?.lastTicketedSnapshot ||
    request?.activeTicketSnapshot ||
    booking?.lastTicketedSnapshot ||
    booking?.activeTicketSnapshot ||
    {};
  const ticketData =
    request?.ticketData ||
    activeSnapshot?.ticketData ||
    booking?.ticketData ||
    booking?.originalBookingSnapshot?.ticketData ||
    null;
  const providerReferences =
    request?.bookingSnapshot?.providerReferences ||
    request?.onlineReissueContext?.providerReferences ||
    activeSnapshot?.providerReferences ||
    booking?.bookingSnapshot?.providerReferences ||
    booking?.providerReferences ||
    booking?.originalBookingSnapshot?.providerReferences ||
    null;

  const normalizedSsr = normalizeSsrSnapshot(
    ssrSnapshot || activeSnapshot?.ssrSnapshot || activeSnapshot?.ssr || {},
    activeSnapshot?.segments || booking?.flightRequest?.segments || [],
  );
  const resolvedFare = roundCurrency(
    fare ??
      activeSnapshot?.fare?.totalFare ??
      activeSnapshot?.fareSnapshot?.offeredFare ??
      activeSnapshot?.fareSnapshot?.publishedFare ??
      booking?.pricingSnapshot?.totalAmount ??
      0,
  );

  return {
    fare: {
      totalFare: resolvedFare,
      baseFare: roundCurrency(
        activeSnapshot?.fare?.baseFare ??
          activeSnapshot?.fareSnapshot?.baseFare ??
          booking?.flightRequest?.fareSnapshot?.baseFare ??
          0,
      ),
      taxes: roundCurrency(
        activeSnapshot?.fare?.taxes ??
          (resolvedFare -
            Number(
              activeSnapshot?.fare?.baseFare ??
                activeSnapshot?.fareSnapshot?.baseFare ??
                booking?.flightRequest?.fareSnapshot?.baseFare ??
                0,
            )) ??
          0,
      ),
    },
    ssr: normalizedSsr,
    segments: activeSnapshot?.segments || booking?.flightRequest?.segments || [],
    baggage: normalizedSsr.baggage,
    meals: normalizedSsr.meals,
    seats: normalizedSsr.seats,
    bookingId:
      bookingIdOverride ||
      request?.newBookingId ||
      activeSnapshot?.sourceBookingId?.toString?.() ||
      request?.bookingId?.toString?.() ||
      booking?._id?.toString?.() ||
      null,
    ticketNumber:
      providerReferences?.ticketNumbers?.[0] ||
      activeSnapshot?.ticketNumber ||
      activeSnapshot?.providerReferences?.ticketNumbers?.[0] ||
      null,
    providerReferences,
    ticketData,
    capturedAt: new Date(),
  };
}

function extractOriginalAmounts(booking = {}) {
  const originalTicketAmount = Number(
    booking?.bookingResult?.providerResponse?.Response?.Response?.FlightItinerary?.Fare?.OfferedFare ||
      booking?.bookingResult?.providerResponse?.Response?.Response?.FlightItinerary?.Fare?.PublishedFare ||
      booking?.pricingSnapshot?.totalAmount ||
      booking?.bookingSnapshot?.amount ||
      booking?.flightRequest?.fareSnapshot?.offeredFare ||
      booking?.flightRequest?.fareSnapshot?.publishedFare ||
      0,
  );

  const originalBaseFare = Number(
    booking?.bookingResult?.providerResponse?.Response?.Response?.FlightItinerary?.Fare?.BaseFare ||
      booking?.flightRequest?.fareSnapshot?.baseFare ||
      booking?.bookingSnapshot?.baseFare ||
      0,
  );

  const originalTaxes = Math.max(0, roundCurrency(originalTicketAmount - originalBaseFare));

  const normalizedSsr = normalizeSsrSnapshot(
    booking?.flightRequest?.ssrSnapshot || booking?.bookingSnapshot?.ssrSnapshot || {},
    booking?.flightRequest?.segments || [],
  );

  const originalSeatSSR = Number(normalizedSsr.totalSeatAmount || 0);
  const originalMealSSR = Number(normalizedSsr.totalMealAmount || 0);
  const originalBaggageSSR = Number(normalizedSsr.totalBaggageAmount || 0);
  const originalSSR = Number(normalizedSsr.totalSSRAmount || 0);
  const originalTotalPaid = roundCurrency(originalTicketAmount + originalSSR);

  return {
    originalTicketAmount: roundCurrency(originalTicketAmount),
    originalSSR,
    originalBaseFare: roundCurrency(originalBaseFare),
    originalTaxes,
    originalSeatSSR,
    originalMealSSR,
    originalBaggageSSR,
    originalTotalPaid,
  };
}

function initializeLedger(booking = {}) {
  const amounts = extractOriginalAmounts(booking);
  const initialSnapshot = buildLastTicketedSnapshot({ booking });

  return {
    originalTicketAmount: amounts.originalTicketAmount,
    originalSSR: amounts.originalSSR,
    cumulativeReissueCharges: 0,
    cumulativeSSR: amounts.originalSSR,
    cumulativeCollections: 0,
    cumulativeRefunds: 0,
    totalNetPaid: amounts.originalTotalPaid,

    originalBaseFare: amounts.originalBaseFare,
    originalTaxes: amounts.originalTaxes,
    originalSeatSSR: amounts.originalSeatSSR,
    originalMealSSR: amounts.originalMealSSR,
    originalBaggageSSR: amounts.originalBaggageSSR,
    originalTotalPaid: amounts.originalTotalPaid,
    cumulativePaid: amounts.originalTotalPaid,
    cumulativeRefund: 0,
    cumulativeCollection: 0,
    currentTicketValue: amounts.originalTicketAmount,
    currentSSRValue: amounts.originalSSR,
    currentTotalValue: amounts.originalTotalPaid,
    lastTicketedSnapshot: initialSnapshot,
    ssrFinancials: {
      refundableSSR: amounts.originalSSR,
      nonRefundableSSR: 0,
      previousSSR: amounts.originalSSR,
      newSSR: amounts.originalSSR,
      ssrDelta: 0,
    },
  };
}

async function getLedgerForBooking(booking) {
  const ReissueRequest = mongoose.models.ReissueRequest || mongoose.model("ReissueRequest");
  const OfflineReissueRequest =
    mongoose.models.OfflineReissueRequest || mongoose.model("OfflineReissueRequest");

  const [onlineRequest, offlineRequest] = await Promise.all([
    ReissueRequest.findOne({ bookingId: booking._id, status: "COMPLETED" }).sort({ createdAt: -1 }),
    OfflineReissueRequest.findOne({ bookingId: booking._id, status: "COMPLETED" }).sort({
      createdAt: -1,
    }),
  ]);

  let latestRequest = null;
  if (onlineRequest && offlineRequest) {
    latestRequest = onlineRequest.createdAt > offlineRequest.createdAt ? onlineRequest : offlineRequest;
  } else {
    latestRequest = onlineRequest || offlineRequest;
  }

  if (latestRequest?.financialLedger) {
    return latestRequest.financialLedger;
  }

  return initializeLedger(booking);
}

function resolvePreviousSnapshot(request = {}, booking = {}) {
  const ledger = request.financialLedger || initializeLedger(booking);
  const lastTicketedSnapshot =
    ledger.lastTicketedSnapshot || request.lastTicketedSnapshot || buildLastTicketedSnapshot({ request, booking });
  const lastCycle =
    Array.isArray(request.pricingHistory) && request.pricingHistory.length
      ? request.pricingHistory[request.pricingHistory.length - 1]
      : null;

  const previousFare = roundCurrency(
    lastTicketedSnapshot?.fare?.totalFare ??
      lastCycle?.newFare ??
      ledger.currentTicketValue ??
      ledger.originalTicketAmount ??
      0,
  );
  const previousSSR = roundCurrency(
    lastTicketedSnapshot?.ssr?.totalSSRAmount ??
      lastCycle?.newSSR ??
      ledger.currentSSRValue ??
      ledger.originalSSR ??
      0,
  );

  return {
    previousFare,
    previousSSR,
    previousTotalPaid: previousFare,
    lastTicketedSnapshot,
  };
}

function resolveOldSsrSnapshot(request = {}, booking = {}) {
  if (request?.financialLedger?.lastTicketedSnapshot?.ssr) {
    return request.financialLedger.lastTicketedSnapshot.ssr;
  }
  if (request?.lastTicketedSnapshot?.ssr) {
    return request.lastTicketedSnapshot.ssr;
  }
  if (request?.activeTicketSnapshot?.ssrSnapshot || request?.activeTicketSnapshot?.ssr) {
    return request.activeTicketSnapshot.ssrSnapshot || request.activeTicketSnapshot.ssr;
  }

  return booking?.flightRequest?.ssrSnapshot || booking?.bookingSnapshot?.ssrSnapshot || {};
}

function normalizeSelectedSsr(request = {}, booking = {}, selectedSSR) {
  const segments =
    request?.activeTicketSnapshot?.segments || booking?.flightRequest?.segments || [];
  const source =
    selectedSSR == null
      ? request?.activeTicketSnapshot?.ssrSnapshot ||
        request?.activeTicketSnapshot?.ssr ||
        booking?.flightRequest?.ssrSnapshot ||
        booking?.bookingSnapshot?.ssrSnapshot ||
        {}
      : selectedSSR;

  return normalizeSsrSnapshot(source, segments);
}

function calculateCumulativeReissueAmount({
  request = {},
  newFareQuote = {},
  selectedSSR = null,
  supplierReissueCharge = 0,
  booking = {},
  previousTicketedSnapshot = null,
  currentTicketedSnapshot = null,
}) {
  const ledger = request.financialLedger || initializeLedger(booking);
  const { previousFare, previousSSR, previousTotalPaid, lastTicketedSnapshot } = resolvePreviousSnapshot(
    request,
    booking,
  );

  const newFare = roundCurrency(
    newFareQuote?.Fare?.OfferedFare ||
      newFareQuote?.Fare?.PublishedFare ||
      newFareQuote?.offeredFare ||
      newFareQuote?.publishedFare ||
      newFareQuote?.newFare ||
      newFareQuote?.fare ||
      0,
  );
  const newBaseFare = roundCurrency(
    newFareQuote?.Fare?.BaseFare || newFareQuote?.baseFare || newFare || 0,
  );
  const newTaxes = Math.max(0, roundCurrency(newFare - newBaseFare));

  const normalizedSelectedSsr = normalizeSelectedSsr(request, booking, selectedSSR);
  const previousSnapshot =
    previousTicketedSnapshot ||
    lastTicketedSnapshot ||
    buildLastTicketedSnapshot({ request, booking });
  const comparisonSegments =
    previousSnapshot?.segments || request?.activeTicketSnapshot?.segments || booking?.flightRequest?.segments || [];
  const ssrFinancials = classifySsrFinancials({
    previousSnapshot: previousSnapshot?.ssr || resolveOldSsrSnapshot(request, booking),
    nextSnapshot: normalizedSelectedSsr,
    request,
    booking,
    segments: comparisonSegments,
  });

  const airlinePenalty = roundCurrency(supplierReissueCharge || 0);
  const newSSR = roundCurrency(normalizedSelectedSsr.totalSSRAmount || 0);
  const refundablePreviousSSR = roundCurrency(ssrFinancials.refundableSSR || 0);
  const nonRefundablePreviousSSR = roundCurrency(ssrFinancials.nonRefundableSSR || 0);
  const grossNewAmount = roundCurrency(newFare + newSSR + airlinePenalty);
  const reusablePreviousValue = roundCurrency(previousFare + refundablePreviousSSR);
  const netDelta = roundCurrency(grossNewAmount - reusablePreviousValue);

  const additionalCollection = netDelta > 0 ? netDelta : 0;
  const refundAmount = netDelta < 0 ? Math.abs(netDelta) : 0;
  const nextTicketedSnapshot =
    currentTicketedSnapshot ||
    buildLastTicketedSnapshot({
      request,
      booking,
      ssrSnapshot: normalizedSelectedSsr,
      fare: newFare,
      bookingIdOverride:
        request?.newBookingId ||
        request?.activeTicketSnapshot?.sourceBookingId?.toString?.() ||
        booking?._id?.toString?.() ||
        null,
    });

  return {
    alreadyPaid: reusablePreviousValue,
    previousFare,
    previousSSR,
    newFare,
    newSSR,
    airlinePenalty,
    newTotal: grossNewAmount,
    additionalCollection,
    refundAmount,
    refundDue: refundAmount,

    newBaseFare,
    newTaxes,
    newSeatSSR: roundCurrency(normalizedSelectedSsr.totalSeatAmount || 0),
    newMealSSR: roundCurrency(normalizedSelectedSsr.totalMealAmount || 0),
    newBaggageSSR: roundCurrency(normalizedSelectedSsr.totalBaggageAmount || 0),
    refundablePreviousSSR,
    nonRefundablePreviousSSR,
    reusableSSRValue: refundablePreviousSSR,
    refundSSRValue: refundablePreviousSSR,
    additionalSSRValue: roundCurrency(Math.max(newSSR - refundablePreviousSSR, 0)),
    reusableValue: reusablePreviousValue,
    netPayable: netDelta,
    netCollection: additionalCollection,
    seatsList: normalizedSelectedSsr.seats,
    mealsList: normalizedSelectedSsr.meals,
    baggageList: normalizedSelectedSsr.baggage,
    normalizedSelectedSsr,
    currentTicketValue: newFare,
    currentSSRValue: newSSR,
    currentTotalValue: roundCurrency(newFare + newSSR),
    ledgerSnapshot: ledger,
    ssrFinancials,
    previousTicketedSnapshot: previousSnapshot,
    currentTicketedSnapshot: nextTicketedSnapshot,
  };
}

function applyReissueCycle(request, calculation) {
  if (!request.financialLedger) {
    request.financialLedger = initializeLedger({});
  }

  const ledger = request.financialLedger;
  const cycle = (request.pricingHistory || []).length + 1;
  const previousFare = roundCurrency(
    calculation.previousFare ?? ledger.currentTicketValue ?? ledger.originalTicketAmount ?? 0,
  );
  const previousSSR = roundCurrency(
    calculation.previousSSR ?? ledger.currentSSRValue ?? ledger.originalSSR ?? 0,
  );

  if (!request.pricingHistory) {
    request.pricingHistory = [];
  }

  request.pricingHistory.push({
    cycle,
    previousTotalPaid: roundCurrency(previousFare + previousSSR),
    oldFare: previousFare,
    oldSSR: previousSSR,
    newFare: calculation.newFare,
    newSSR: calculation.newSSR,
    reissueCharge: calculation.airlinePenalty,
    additionalCollection: calculation.additionalCollection,
    refundAmount: calculation.refundAmount,
    totalPaidAfterCycle: roundCurrency(
      (ledger.totalNetPaid || ledger.originalTotalPaid || 0) +
        calculation.additionalCollection -
        calculation.refundAmount,
    ),
    createdAt: new Date(),

    newBaseFare: calculation.newBaseFare,
    newTaxes: calculation.newTaxes,
    newSeatSSR: calculation.newSeatSSR,
    newMealSSR: calculation.newMealSSR,
    newBaggageSSR: calculation.newBaggageSSR,
    newTotal: roundCurrency(calculation.newFare + calculation.newSSR),
    reusableSSRValue: calculation.reusableSSRValue,
    refundSSRValue: calculation.refundSSRValue,
    additionalSSRValue: calculation.additionalSSRValue,
    airlinePenalty: calculation.airlinePenalty,
    netPayable: calculation.netPayable,
    seats: calculation.seatsList,
    meals: calculation.mealsList,
    baggage: calculation.baggageList,
  });

  request.financialLedger = {
    originalTicketAmount: ledger.originalTicketAmount || 0,
    originalSSR: ledger.originalSSR || 0,
    cumulativeReissueCharges: roundCurrency(
      (ledger.cumulativeReissueCharges || 0) + calculation.airlinePenalty,
    ),
    cumulativeSSR: calculation.newSSR,
    cumulativeCollections: roundCurrency(
      (ledger.cumulativeCollections || 0) + calculation.additionalCollection,
    ),
    cumulativeRefunds: roundCurrency(
      (ledger.cumulativeRefunds || 0) + calculation.refundAmount,
    ),
    totalNetPaid: roundCurrency(
      (ledger.totalNetPaid || ledger.originalTotalPaid || 0) +
        calculation.additionalCollection -
        calculation.refundAmount,
    ),

    originalBaseFare: ledger.originalBaseFare || 0,
    originalTaxes: ledger.originalTaxes || 0,
    originalSeatSSR: ledger.originalSeatSSR || 0,
    originalMealSSR: ledger.originalMealSSR || 0,
    originalBaggageSSR: ledger.originalBaggageSSR || 0,
    originalTotalPaid: ledger.originalTotalPaid || 0,
    cumulativePaid: roundCurrency(
      (ledger.cumulativePaid || ledger.originalTotalPaid || 0) + calculation.additionalCollection,
    ),
    cumulativeRefund: roundCurrency(
      (ledger.cumulativeRefund || 0) + calculation.refundAmount,
    ),
    cumulativeCollection: roundCurrency(
      (ledger.cumulativeCollection || 0) + calculation.additionalCollection,
    ),
    currentTicketValue: calculation.currentTicketValue,
    currentSSRValue: calculation.currentSSRValue,
    currentTotalValue: calculation.currentTotalValue,
    lastTicketedSnapshot: calculation.currentTicketedSnapshot,
    ssrFinancials: calculation.ssrFinancials,
  };

  request.reissueCharges = request.financialLedger.cumulativeReissueCharges;
  request.fareDifference = roundCurrency(calculation.newFare - previousFare);
  request.totalAdjustment = calculation.additionalCollection;
  request.lastTicketedSnapshot = calculation.currentTicketedSnapshot;
  request.ssrFinancials = calculation.ssrFinancials;

  logger.info("REISSUE_LEDGER_UPDATED", {
    requestId: request?.reissueId || request?.requestId || request?._id?.toString?.() || null,
    cycle,
    previousFare,
    previousSSR,
    newFare: calculation.newFare,
    newSSR: calculation.newSSR,
    airlinePenalty: calculation.airlinePenalty,
    additionalCollection: calculation.additionalCollection,
    refundAmount: calculation.refundAmount,
    currentTicketValue: calculation.currentTicketValue,
    currentSSRValue: calculation.currentSSRValue,
    refundablePreviousSSR: calculation.refundablePreviousSSR,
    nonRefundablePreviousSSR: calculation.nonRefundablePreviousSSR,
  });

  if (calculation.refundAmount > 0) {
    logger.info("REISSUE_REFUND_DETECTED", {
      requestId: request?.reissueId || request?.requestId || request?._id?.toString?.() || null,
      refundAmount: calculation.refundAmount,
      currentTicketValue: calculation.currentTicketValue,
      currentSSRValue: calculation.currentSSRValue,
    });
  }
}

module.exports = {
  buildLastTicketedSnapshot,
  extractOriginalAmounts,
  initializeLedger,
  getLedgerForBooking,
  calculateCumulativeReissueAmount,
  applyReissueCycle,
};
