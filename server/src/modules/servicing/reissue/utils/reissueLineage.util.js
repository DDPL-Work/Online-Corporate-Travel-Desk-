"use strict";

const normalizeText = (value) => {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized || null;
};

const uniqueStrings = (values = []) =>
  Array.from(
    new Set(
      values
        .map((value) => normalizeText(value))
        .filter(Boolean),
    ),
  );

function buildInitialBookingLineage(booking = {}) {
  const providerBookingId =
    normalizeText(booking?.bookingLineage?.activeBookingId) ||
    normalizeText(booking?.bookingResult?.providerBookingId) ||
    normalizeText(booking?.originalBookingSnapshot?.providerBookingReference) ||
    normalizeText(booking?.servicing?.reissue?.activeBookingId) ||
    null;
  const pnr =
    normalizeText(booking?.bookingLineage?.activePnr) ||
    normalizeText(booking?.bookingResult?.pnr) ||
    normalizeText(booking?.originalBookingSnapshot?.pnr) ||
    normalizeText(booking?.servicing?.reissue?.activePnr) ||
    null;

  return {
    originalMongoBookingId:
      booking?.bookingLineage?.originalMongoBookingId?.toString?.() ||
      booking?.originalBookingId?.toString?.() ||
      booking?._id?.toString?.() ||
      null,
    activeMongoBookingId: booking?._id?.toString?.() || null,
    originalBookingId:
      normalizeText(booking?.bookingLineage?.originalBookingId) ||
      providerBookingId,
    activeBookingId: providerBookingId,
    originalPnr:
      normalizeText(booking?.bookingLineage?.originalPnr) ||
      pnr,
    activePnr: pnr,
    previousBookingIds: uniqueStrings(booking?.bookingLineage?.previousBookingIds || []),
    previousPnrHistory: uniqueStrings(booking?.bookingLineage?.previousPnrHistory || []),
    reissueGeneration: Number(booking?.bookingLineage?.reissueGeneration || 0),
    updatedAt: new Date(),
  };
}

function buildNextBookingLineage({
  sourceBooking = {},
  newMongoBookingId = null,
  newProviderBookingId = null,
  newPnr = null,
}) {
  const current = buildInitialBookingLineage(sourceBooking);
  return {
    ...current,
    activeMongoBookingId: newMongoBookingId?.toString?.() || newMongoBookingId || current.activeMongoBookingId,
    activeBookingId: normalizeText(newProviderBookingId) || current.activeBookingId,
    activePnr: normalizeText(newPnr) || current.activePnr,
    previousBookingIds: uniqueStrings([
      ...current.previousBookingIds,
      current.activeBookingId,
    ]),
    previousPnrHistory: uniqueStrings([
      ...current.previousPnrHistory,
      current.activePnr,
    ]),
    reissueGeneration: Number(current.reissueGeneration || 0) + 1,
    updatedAt: new Date(),
  };
}

module.exports = {
  buildInitialBookingLineage,
  buildNextBookingLineage,
};
