// server/src/middlewares/corporate.middleware.js
const Corporate = require("../models/Corporate");
const ApiError = require("../utils/ApiError");

module.exports = async function corporateContext(req, res, next) {
  if (!req.user?.corporateId) {
    return next(
      new ApiError(400, "User is not associated with any corporate")
    );
  }

  const corporate = await Corporate.findById(req.user.corporateId);

  if (!corporate) {
    return next(
      new ApiError(404, "Corporate not found")
    );
  }

  req.corporate = corporate;
  next();
};
