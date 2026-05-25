"use strict";

const BookingRequest = require("../../../../models/BookingRequest");
const {
  resolvePnr,
  resolveSupplierBookingId,
  resolveSegments,
} = require("../../../../utils/bookingResolver.util");
const { buildSegmentsWithSsr } = require("./ssrSnapshot.util");

const ACTIVE_TICKET_STATUSES = new Set(["ticketed", "completed", "confirmed"]);

async function resolveActiveBooking(booking, visited = new Set()) {
  if (!booking) return null;

  const currentId = booking?._id?.toString?.() || null;
  if (currentId) {
    if (visited.has(currentId)) return booking;
    visited.add(currentId);
  }

  const nextId =
    booking?.latestReissueBookingId?._id?.toString?.() ||
    booking?.latestReissueBookingId?.toString?.() ||
    null;

  if (!nextId) return booking;

  const nextBooking = await BookingRequest.findById(nextId).lean();
  if (!nextBooking) return booking;

  if (!ACTIVE_TICKET_STATUSES.has(nextBooking.executionStatus)) {
    return booking;
  }

  return resolveActiveBooking(nextBooking, visited);
}

function buildActiveTicketSnapshotFromState(
  booking,
  {
    pnrOverride = null,
    supplierBookingIdOverride = null,
    segmentsOverride = null,
    fareSnapshotOverride = null,
    ssrSnapshotOverride = null,
    ticketDataOverride = null,
    revisedTicketOverride = undefined,
    revisedInvoiceOverride = undefined,
    sourceBookingIdOverride = null,
  } = {},
) {
  if (!booking) return null;

  const pnr = pnrOverride || resolvePnr(booking);
  const supplierBookingId =
    supplierBookingIdOverride || resolveSupplierBookingId(booking);
  const segments = Array.isArray(segmentsOverride) ? segmentsOverride : resolveSegments(booking);

  const fareSnapshot =
    fareSnapshotOverride ||
    booking?.flightRequest?.fareSnapshot ||
    booking?.bookingSnapshot?.fareSnapshot ||
    null;

  const rawSsrSnapshot =
    ssrSnapshotOverride ||
    booking?.flightRequest?.ssrSnapshot ||
    booking?.bookingSnapshot?.ssrSnapshot ||
    {};

  const { segments: normalizedSegments, ssr } = buildSegmentsWithSsr(segments, rawSsrSnapshot);

  const ticketData =
    ticketDataOverride ||
    booking?.ticketData ||
    booking?.bookingResult?.ticketData ||
    booking?.bookingResult?.providerResponse?.Response?.Response?.FlightItinerary?.Ticket ||
    booking?.bookingResult?.providerResponse?.raw?.Response?.Response?.FlightItinerary?.Ticket ||
    null;

  let revisedTicket = revisedTicketOverride === undefined ? null : revisedTicketOverride;
  if (revisedTicketOverride === undefined) {
    const revisedTicketUrl =
      booking?.servicing?.reissue?.revisedTicketUrl ||
      booking?.documents?.ticketUrl ||
      null;
    if (revisedTicketUrl) {
      revisedTicket = { url: revisedTicketUrl };
    }
  }

  let revisedInvoice = revisedInvoiceOverride === undefined ? null : revisedInvoiceOverride;
  if (revisedInvoiceOverride === undefined) {
    const revisedInvoiceUrl =
      booking?.servicing?.reissue?.revisedInvoiceUrl ||
      booking?.documents?.invoiceUrl ||
      null;
    if (revisedInvoiceUrl) {
      revisedInvoice = { url: revisedInvoiceUrl };
    }
  }

  return {
    pnr: pnr || null,
    supplierBookingId: supplierBookingId || null,
    segments: normalizedSegments || [],
    fareSnapshot,
    ssrSnapshot: ssr,
    ssr,
    ticketData,
    revisedTicket,
    revisedInvoice,
    capturedAt: new Date(),
    sourceBookingId: sourceBookingIdOverride || booking._id || null,
  };
}

function buildActiveTicketSnapshot(booking) {
  return buildActiveTicketSnapshotFromState(booking);
}

async function resolveAndBuildSnapshot(booking) {
  const activeBooking = await resolveActiveBooking(booking);
  return buildActiveTicketSnapshot(activeBooking);
}

module.exports = {
  resolveActiveBooking,
  buildActiveTicketSnapshot,
  buildActiveTicketSnapshotFromState,
  resolveAndBuildSnapshot,
};
