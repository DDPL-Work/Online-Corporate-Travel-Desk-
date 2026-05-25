const mongoose = require("mongoose");
const logger = require("../../utils/logger");
const {
  normalizeSsrSnapshot,
  roundCurrency,
} = require("../../modules/servicing/reissue/utils/ssrSnapshot.util");

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
  const lastCycle =
    Array.isArray(request.pricingHistory) && request.pricingHistory.length
      ? request.pricingHistory[request.pricingHistory.length - 1]
      : null;

  const previousFare = roundCurrency(
    lastCycle?.newFare ?? ledger.currentTicketValue ?? ledger.originalTicketAmount ?? 0,
  );
  const previousSSR = roundCurrency(
    lastCycle?.newSSR ?? ledger.currentSSRValue ?? ledger.originalSSR ?? 0,
  );

  return {
    previousFare,
    previousSSR,
    previousTotalPaid: roundCurrency(previousFare + previousSSR),
  };
}

function resolveOldSsrSnapshot(request = {}, booking = {}) {
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
}) {
  const ledger = request.financialLedger || initializeLedger(booking);
  const { previousFare, previousSSR, previousTotalPaid } = resolvePreviousSnapshot(
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
  const oldSsrSnapshot = normalizeSsrSnapshot(
    resolveOldSsrSnapshot(request, booking),
    request?.activeTicketSnapshot?.segments || booking?.flightRequest?.segments || [],
  );
  const { reconcileSSRs } = require("./reissueSSRReconciliation.service");
  const reconciliation = reconcileSSRs(oldSsrSnapshot, normalizedSelectedSsr);

  const airlinePenalty = roundCurrency(supplierReissueCharge || 0);
  const newSSR = roundCurrency(normalizedSelectedSsr.totalSSRAmount || 0);
  const grossNewAmount = roundCurrency(newFare + newSSR + airlinePenalty);
  const netDelta = roundCurrency(grossNewAmount - previousTotalPaid);

  const additionalCollection = netDelta > 0 ? netDelta : 0;
  const refundAmount = netDelta < 0 ? Math.abs(netDelta) : 0;

  return {
    alreadyPaid: previousTotalPaid,
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
    reusableSSRValue: roundCurrency(reconciliation.reusableSSRValue || 0),
    refundSSRValue: roundCurrency(reconciliation.refundSSRValue || 0),
    additionalSSRValue: roundCurrency(reconciliation.additionalSSRValue || 0),
    reusableValue: previousTotalPaid,
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
  };

  request.reissueCharges = request.financialLedger.cumulativeReissueCharges;
  request.fareDifference = roundCurrency(calculation.newFare - previousFare);
  request.totalAdjustment = calculation.additionalCollection;

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
  extractOriginalAmounts,
  initializeLedger,
  getLedgerForBooking,
  calculateCumulativeReissueAmount,
  applyReissueCycle,
};
