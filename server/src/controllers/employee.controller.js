const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Employee = require("../models/Employee");


// ===============================
// GET EMPLOYEE PROFILE
// ===============================
exports.getProfile = async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.user.id);

    res.json({
      success: true,
      employee,
    });
  } catch (err) {
    next(err);
  }
};

// ===============================
// UPDATE EMPLOYEE PROFILE
// ===============================
exports.updateProfile = async (req, res, next) => {
  try {
    const allowed = ["name", "mobile", "department", "designation"];

    const updates = {};
    allowed.forEach((f) => {
      if (req.body[f]) updates[f] = req.body[f];
    });

    const emp = await Employee.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true }
    );

    res.json({
      success: true,
      message: "Profile updated successfully",
      employee: emp,
    });

  } catch (err) {
    next(err);
  }
};
