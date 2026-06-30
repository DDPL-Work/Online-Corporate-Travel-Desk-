export const CANCELLATION_REFERENCE_UNAVAILABLE_MESSAGE =
  "Booking reference unavailable. Please refresh booking details and try again.";

export const CANCELLATION_CHARGES_UNAVAILABLE_MESSAGE =
  "Airline has not provided cancellation charges. You may still raise a cancellation request. Final refund and charges will be confirmed during processing.";

const normalizeReference = (value) => {
  if (typeof value === "string") return value.trim();
  if (value == null) return "";
  return String(value).trim();
};

export const resolveCancellationBookingReference = (booking) => {
  const candidates = [
    booking?.bookingReference,
    booking?.booking?.bookingReference,
    booking?.bookingId?.bookingReference,
    booking?.bookingRecord?.bookingReference,
    booking?.bookingDetails?.bookingReference,
    booking?.bookingRequest?.bookingReference,
    booking?.request?.bookingReference,
    booking?.amendment?.bookingReference,
    booking?.amendmentContext?.bookingReference,
    booking?.cancellation?.bookingReference,
    booking?.metadata?.bookingReference,
    booking?.bookingSnapshot?.bookingReference,
    booking?.raw?.bookingReference,
    booking?.raw?.booking?.bookingReference,
  ];

  return candidates.map(normalizeReference).find(Boolean) || "";
};

export const isCancellationChargesUnavailableResponse = (response) => {
  const root = response?.Response || response || {};

  const responseStatus = root?.ResponseStatus;
  const errorCode = root?.Error?.ErrorCode;
  const refundAmount = root?.RefundAmount;
  const cancellationCharge = root?.CancellationCharge;

  if (responseStatus !== 1) return true;
  if (errorCode !== undefined && errorCode !== null && errorCode !== 0) return true;

  const isOnline =
    (typeof refundAmount === "number" && refundAmount > 0) ||
    (typeof cancellationCharge === "number" && cancellationCharge >= 0);

  return !isOnline;
};

export const isOnlineCancellationResponse = (response) => {
  return !isCancellationChargesUnavailableResponse(response);
};
