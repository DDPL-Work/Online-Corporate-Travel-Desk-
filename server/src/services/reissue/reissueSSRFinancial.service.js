"use strict";

const { normalizeSsrSnapshot, roundCurrency } = require("../../modules/servicing/reissue/utils/ssrSnapshot.util");

const toArray = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

const inferProviderType = ({ request = {}, booking = {} }) => {
  const support = request?.supplierSupport || {};
  const providerMeta =
    booking?.bookingResult?.providerResponse?.Response?.Response?.FlightItinerary ||
    booking?.bookingResult?.providerResponse?.raw?.Response?.Response?.FlightItinerary ||
    {};

  return {
    isNdc:
      support.ndc === true ||
      Boolean(providerMeta?.IsNDC || booking?.flightRequest?.isNdc || booking?.metadata?.isNdc),
    isLcc:
      Boolean(
        providerMeta?.IsLCC ||
          booking?.flightRequest?.isLcc ||
          booking?.flightRequest?.isLCC ||
          booking?.metadata?.isLcc,
      ),
  };
};

const resolveRefundabilityOverrides = (request = {}, booking = {}) => ({
  seat:
    request?.metadata?.ssrRefundability?.seat ??
    booking?.flightRequest?.ssrSnapshot?.refundability?.seat ??
    null,
  meal:
    request?.metadata?.ssrRefundability?.meal ??
    booking?.flightRequest?.ssrSnapshot?.refundability?.meal ??
    null,
  baggage:
    request?.metadata?.ssrRefundability?.baggage ??
    booking?.flightRequest?.ssrSnapshot?.refundability?.baggage ??
    null,
  lounge:
    request?.metadata?.ssrRefundability?.lounge ?? null,
  priority:
    request?.metadata?.ssrRefundability?.priority ?? null,
  insurance:
    request?.metadata?.ssrRefundability?.insurance ?? null,
});

const classifyRefundable = ({ type, item = {}, providerType, overrides }) => {
  const explicitFlag =
    item?.refundable ??
    item?.isRefundable ??
    item?.allowRefund ??
    overrides?.[type] ??
    null;

  if (explicitFlag === true) return true;
  if (explicitFlag === false) return false;

  if (providerType.isNdc || providerType.isLcc) {
    return false;
  }

  return true;
};

const splitByRefundability = ({ items = [], type, providerType, overrides }) => {
  return items.reduce(
    (accumulator, item) => {
      const refundable = classifyRefundable({ type, item, providerType, overrides });
      const amount = roundCurrency(item?.amount ?? item?.price ?? 0);

      if (refundable) {
        accumulator.refundable.push({ ...item, refundable: true, amount });
        accumulator.refundableTotal = roundCurrency(accumulator.refundableTotal + amount);
      } else {
        accumulator.nonRefundable.push({ ...item, refundable: false, amount });
        accumulator.nonRefundableTotal = roundCurrency(accumulator.nonRefundableTotal + amount);
      }

      return accumulator;
    },
    {
      refundable: [],
      nonRefundable: [],
      refundableTotal: 0,
      nonRefundableTotal: 0,
    },
  );
};

function classifySsrFinancials({
  previousSnapshot = {},
  nextSnapshot = {},
  request = {},
  booking = {},
  segments = [],
}) {
  const normalizedPrevious = normalizeSsrSnapshot(previousSnapshot || {}, segments);
  const normalizedNext = normalizeSsrSnapshot(nextSnapshot || {}, segments);
  const providerType = inferProviderType({ request, booking });
  const overrides = resolveRefundabilityOverrides(request, booking);

  const previousSeats = splitByRefundability({
    items: toArray(normalizedPrevious.seats),
    type: "seat",
    providerType,
    overrides,
  });
  const previousMeals = splitByRefundability({
    items: toArray(normalizedPrevious.meals),
    type: "meal",
    providerType,
    overrides,
  });
  const previousBaggage = splitByRefundability({
    items: toArray(normalizedPrevious.baggage),
    type: "baggage",
    providerType,
    overrides,
  });

  const refundableSSR = roundCurrency(
    previousSeats.refundableTotal +
      previousMeals.refundableTotal +
      previousBaggage.refundableTotal,
  );
  const nonRefundableSSR = roundCurrency(
    previousSeats.nonRefundableTotal +
      previousMeals.nonRefundableTotal +
      previousBaggage.nonRefundableTotal,
  );
  const previousSSR = roundCurrency(normalizedPrevious.totalSSRAmount || 0);
  const newSSR = roundCurrency(normalizedNext.totalSSRAmount || 0);

  return {
    providerType,
    previousSSR,
    newSSR,
    refundableSSR,
    nonRefundableSSR,
    ssrDelta: roundCurrency(newSSR - refundableSSR),
    previousSnapshot: normalizedPrevious,
    newSnapshot: normalizedNext,
    refundableBreakdown: {
      seat: previousSeats,
      meal: previousMeals,
      baggage: previousBaggage,
    },
  };
}

module.exports = {
  classifySsrFinancials,
};
