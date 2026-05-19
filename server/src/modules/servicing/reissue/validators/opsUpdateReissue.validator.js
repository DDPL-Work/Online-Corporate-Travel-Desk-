const ApiError = require("../../../../utils/ApiError");
const { REISSUE_STATUSES } = require("../constants/reissue.constants");

const OPS_ALLOWED_STATUSES = new Set([
  REISSUE_STATUSES.OPS_ASSIGNED,
  REISSUE_STATUSES.OPS_PROCESSING,
  REISSUE_STATUSES.AWAITING_INTERNAL_SETTLEMENT,
  REISSUE_STATUSES.TICKET_UPLOADED,
  REISSUE_STATUSES.COMPLETED,
  REISSUE_STATUSES.FAILED,
  REISSUE_STATUSES.CANCELLED,
]);

function validateOpsStatusUpdate(payload = {}) {
  if (!payload.status || !OPS_ALLOWED_STATUSES.has(payload.status)) {
    throw new ApiError(400, "Invalid ops reissue status");
  }
}

module.exports = { validateOpsStatusUpdate };
