const ApiError = require("../../../../utils/ApiError");
const { OFFLINE_STATUSES } = require("../constants/reissue.constants");

const isValidDate = (value) => {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
};

function validateCreateOfflineReissuePayload(payload = {}) {
  if (!payload.bookingId) {
    throw new ApiError(400, "bookingId is required");
  }

  const preferredSelection =
    payload.selectedFlight || payload.preferredJourney || payload.preferredFlight || null;
  const hasJourney = preferredSelection && typeof preferredSelection === "object";

  if (payload.preferredDate && !isValidDate(payload.preferredDate)) {
    throw new ApiError(400, "preferredDate must be a valid date");
  }

  if (!payload.preferredDate) {
    throw new ApiError(400, "preferredDate is required");
  }

  if (!hasJourney) {
    throw new ApiError(400, "Please select a replacement flight");
  }

  if (!preferredSelection.searchId) {
    throw new ApiError(400, "selectedFlight.searchId is required");
  }
  if (!preferredSelection.resultIndex && preferredSelection.resultIndex !== 0) {
    throw new ApiError(400, "selectedFlight.resultIndex is required");
  }
  if (preferredSelection.departureDate && !isValidDate(preferredSelection.departureDate)) {
    throw new ApiError(400, "selectedFlight.departureDate must be a valid date");
  }
  if (preferredSelection.returnDate && !isValidDate(preferredSelection.returnDate)) {
    throw new ApiError(400, "selectedFlight.returnDate must be a valid date");
  }
}

const OPS_ALLOWED_OFFLINE_STATUSES = new Set([
  OFFLINE_STATUSES.PENDING_ASSIGNMENT,
  OFFLINE_STATUSES.ASSIGNED,
  OFFLINE_STATUSES.IN_PROGRESS,
  OFFLINE_STATUSES.WAITING_AIRLINE,
  OFFLINE_STATUSES.TICKET_GENERATED,
  OFFLINE_STATUSES.COMPLETED,
  OFFLINE_STATUSES.FAILED,
  OFFLINE_STATUSES.REJECTED,
  OFFLINE_STATUSES.CANCELLED,
]);

function validateOfflineOpsStatusUpdate(payload = {}) {
  if (!payload.status || !OPS_ALLOWED_OFFLINE_STATUSES.has(payload.status)) {
    throw new ApiError(400, "Invalid offline reissue status");
  }
}

module.exports = {
  validateCreateOfflineReissuePayload,
  validateOfflineOpsStatusUpdate,
};
