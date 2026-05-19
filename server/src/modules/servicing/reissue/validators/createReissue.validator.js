const ApiError = require("../../../../utils/ApiError");
const { REISSUE_TYPES } = require("../constants/reissue.constants");

function validateCreateReissuePayload(payload = {}) {
  if (!payload.bookingId) {
    throw new ApiError(400, "bookingId is required");
  }
  if (!payload.newJourney?.departureDate) {
    throw new ApiError(400, "newJourney.departureDate is required");
  }
  if (payload.onward || payload.return || payload.partialJourney) {
    throw new ApiError(400, "ONWARD, RETURN, and PARTIAL_JOURNEY flows are not supported");
  }
  if (payload.reissueType && payload.reissueType !== REISSUE_TYPES.FULL_REISSUE) {
    throw new ApiError(400, "Only FULL_REISSUE is supported");
  }
}

module.exports = { validateCreateReissuePayload };
