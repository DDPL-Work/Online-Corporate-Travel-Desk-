const ApiError = require("../../../../utils/ApiError");
const { validateNdcRequirements } = require("../utils/ndcValidation.util");

function validateNdcReissue(payload = {}) {
  const result = validateNdcRequirements(payload);
  if (!result.valid) {
    throw new ApiError(422, result.errors.join("; "));
  }

  return result;
}

module.exports = {
  validateNdcReissue,
};
