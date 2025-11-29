const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const SuperAdmin = require("../models/SuperAdmin.model.js");
const CorporateAdmin = require("../models/CorporateAdmin.js");
const ApiError = require("../utils/ApiError.js");



// --------------------------------------
// GET SUPER ADMIN PROFILE
// --------------------------------------
exports.getProfile = async (req, res) => {
  try {
    const admin = await SuperAdmin.findById(req.user.id).select("-password");

    res.status(200).json({
      success: true,
      data: admin,
    });
  } catch (err) {
    console.error("Get Profile Error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
};


// --------------------------------------
// UPDATE SUPER ADMIN PROFILE
// --------------------------------------
exports.updateProfile = async (req, res) => {
  try {
    const allowedFields = ["name", "mobile"];
    const updates = {};

    for (let key of allowedFields) {
      if (req.body[key]) updates[key] = req.body[key];
    }

    const updated = await SuperAdmin.findByIdAndUpdate(req.user.id, updates, {
      new: true,
    }).select("-password");

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: updated,
    });
  } catch (err) {
    console.error("Update Profile Error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
};


// --------------------------------------
// DEACTIVATE CORPORATE ADMIN 
// --------------------------------------

exports.deactivateCorporateAdmin = async (req, res, next) => {
  try {
    const admin = await CorporateAdmin.findById(req.params.id);

    if (!admin) return next(new ApiError(404, "Corporate Admin not found"));

    admin.active = false;
    await admin.save();

    res.json({
      success: true,
      message: "Corporate Admin deactivated successfully",
    });
  } catch (err) {
    next(err);
  }
};

// --------------------------------------
// ACTIVATE CORPORATE ADMIN 
// --------------------------------------

exports.activateCorporateAdmin = async (req, res, next) => {
  try {
    const admin = await CorporateAdmin.findById(req.params.id);

    if (!admin) return next(new ApiError(404, "Corporate Admin not found"));

    admin.active = true;
    await admin.save();

    res.json({
      success: true,
      message: "Corporate Admin activated successfully",
    });
  } catch (err) {
    next(err);
  }
};



// --------------------------------------
// REMOVE CORPORATE ADMIN
// --------------------------------------
exports.removeCorporateAdmin = async (req, res, next) => {
  try {
    const admin = await CorporateAdmin.findById(req.params.id);

    if (!admin) return next(new ApiError(404, "Corporate Admin not found"));

    await CorporateAdmin.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Corporate Admin deleted successfully",
    });

  } catch (err) {
    next(err);
  }
};



