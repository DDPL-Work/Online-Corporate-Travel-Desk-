const ApiError = require("../../../../utils/ApiError");

const isValidDate = (value) => {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
};

function validateOfflineSearchPayload(payload = {}) {
  if (!payload.bookingId) {
    throw new ApiError(400, "bookingId is required");
  }

  if (!payload.departureDate || !isValidDate(payload.departureDate)) {
    throw new ApiError(400, "departureDate is required and must be a valid date");
  }

  if (payload.returnDate && !isValidDate(payload.returnDate)) {
    throw new ApiError(400, "returnDate must be a valid date");
  }

  if (payload.preferredTime && !/^\d{2}:\d{2}$/.test(String(payload.preferredTime).trim())) {
    throw new ApiError(400, "preferredTime must use HH:MM format");
  }

  if (payload.directFlightOnly != null && typeof payload.directFlightOnly !== "boolean") {
    throw new ApiError(400, "directFlightOnly must be a boolean");
  }

  if (payload.cabinClass != null && typeof payload.cabinClass !== "string" && typeof payload.cabinClass !== "number") {
    throw new ApiError(400, "cabinClass must be a string or number");
  }
}

module.exports = {
  validateOfflineSearchPayload,
};
