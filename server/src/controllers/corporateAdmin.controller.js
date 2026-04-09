//corporateAdmin.controller.js


const bcrypt = require("bcryptjs");
const Employee = require("../models/Employee");
const User = require("../models/User"); // TravelAdmin
const { ApiError } = require("../utils/ApiError");
const mongoose = require("mongoose"); // <- add this
const asyncHandler = require("../utils/asyncHandler");
const Corporate = require("../models/Corporate");
const ApiResponse = require("../utils/ApiResponse");




// -----------------------------------------------------
// GET LOGGED-IN TRAVEL ADMIN CORPORATE PROFILE
// -----------------------------------------------------
exports.getMyCorporateProfile = asyncHandler(async (req, res) => {
  const corporateId = req.user.corporateId;

  if (!corporateId) {
    throw new ApiError(403, "Corporate context not found");
  }

  const corporate = await Corporate.findById(corporateId);

  if (!corporate) {
    throw new ApiError(404, "Corporate not found");
  }

  res.status(200).json(
    new ApiResponse(200, corporate, "Corporate profile fetched successfully")
  );
});

// -----------------------------------------------------
// UPDATE CORPORATE PROFILE (FULL FLEXIBLE UPDATE)
// -----------------------------------------------------
exports.updateMyCorporateProfile = asyncHandler(async (req, res) => {
  const corporateId = req.user.corporateId;

  if (!corporateId) {
    throw new ApiError(403, "Corporate context not found");
  }

  if (!req.body || Object.keys(req.body).length === 0) {
    throw new ApiError(400, "No data provided for update");
  }

  // ❗ Prevent critical fields overwrite
  const restrictedFields = [
    "_id",
    "createdAt",
    "updatedAt",
    "__v",
  ];

  restrictedFields.forEach((field) => {
    if (req.body[field]) {
      delete req.body[field];
    }
  });

  /**
   * ✅ Direct update (supports nested fields automatically)
   * Example:
   * {
   *   "gstDetails": { verified: true },
   *   "ssoConfig": { domain: "newdomain.com" }
   * }
   */
  const updatedCorporate = await Corporate.findByIdAndUpdate(
    corporateId,
    { $set: req.body },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!updatedCorporate) {
    throw new ApiError(404, "Corporate not found");
  }

  res.status(200).json(
    new ApiResponse(
      200,
      updatedCorporate,
      "Corporate profile updated successfully"
    )
  );
});

