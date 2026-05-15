const BookingRequest = require("../models/BookingRequest");

async function resolveActiveBookingDocument(booking, options = {}) {
  const { lean = false, visited = new Set() } = options;

  if (!booking) return null;

  const currentId = booking?._id?.toString?.() || null;
  if (currentId) {
    if (visited.has(currentId)) {
      return booking;
    }
    visited.add(currentId);
  }

  const nextBookingId =
    booking?.latestReissueBookingId?._id?.toString?.() ||
    booking?.latestReissueBookingId?.toString?.() ||
    null;

  if (!nextBookingId) {
    return booking;
  }

  const nextBooking = lean
    ? await BookingRequest.findById(nextBookingId).lean()
    : await BookingRequest.findById(nextBookingId);

  if (!nextBooking) {
    return booking;
  }

  return resolveActiveBookingDocument(nextBooking, { lean, visited });
}

async function resolveBookingContext(bookingId, options = {}) {
  const { lean = false } = options;
  const requestedBooking = lean
    ? await BookingRequest.findById(bookingId).lean()
    : await BookingRequest.findById(bookingId);

  if (!requestedBooking) return null;

  const activeBooking = await resolveActiveBookingDocument(requestedBooking, { lean });

  return {
    requestedBooking,
    activeBooking,
    isReissueRedirect:
      Boolean(
        requestedBooking?._id?.toString?.() &&
          activeBooking?._id?.toString?.() &&
          requestedBooking._id.toString() !== activeBooking._id.toString(),
      ),
  };
}

module.exports = {
  resolveActiveBookingDocument,
  resolveBookingContext,
};
