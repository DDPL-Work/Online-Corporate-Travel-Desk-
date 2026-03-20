const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Employee = require("../models/Employee");
const User = require("../models/User"); // TravelAdmin
const Corporate = require("../models/Corporate");
const { ApiError } = require("../utils/ApiError");

// ===============================
// GET OWN PROFILE
// ===============================
exports.getProfile = async (req, res, next) => {
  try {
    const employee = await Employee.findOne({ userId: req.user.id }).select("-__v");
    if (!employee) return next(new ApiError(404, "Employee profile not found"));

    res.json({ success: true, employee });
  } catch (err) {
    next(err);
  }
};

// ===============================
// UPDATE OWN PROFILE
// ===============================
exports.updateProfile = async (req, res, next) => {
  try {
    const allowed = ["name", "mobile", "department", "designation", "employeeCode"];
    const updates = {};
    allowed.forEach((f) => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });

    if (!Object.keys(updates).length)
      return next(new ApiError(400, "No valid fields to update"));

    const emp = await Employee.findOneAndUpdate(
      { userId: req.user.id },
      { $set: updates },
      { new: true, runValidators: true }
    ).select("-__v");

    if (!emp) return next(new ApiError(404, "Employee profile not found"));

    res.json({ success: true, message: "Profile updated successfully", employee: emp });
  } catch (err) {
    next(err);
  }
};

// ===============================
// ADMIN: GET SINGLE EMPLOYEE
// ===============================
exports.getEmployee = async (req, res, next) => {
  try {
    const admin = await User.findById(req.user.id);
    if (!admin) return next(new ApiError(401, "Unauthorized"));

    const id = req.params.id;

    let emp = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      emp = await Employee.findOne({
        _id: id,
        corporateId: admin.corporateId,
      });
    }

    if (!emp) {
      emp = await Employee.findOne({
        userId: id,
        corporateId: admin.corporateId,
      });
    }

    if (!emp)
      return next(new ApiError(404, "Employee not found or not in your domain"));

    res.json({ success: true, employee: emp });
  } catch (err) {
    next(err);
  }
};

// ===============================
// ADMIN: GET ALL EMPLOYEES
// ===============================
exports.getAllEmployees = async (req, res, next) => {
  try {
    const admin = await User.findById(req.user.id);
    if (!admin) return next(new ApiError(401, "Unauthorized"));

    const employees = await Employee.find({
      corporateId: admin.corporateId,
    }).select("-__v");

    res.json({ success: true, employees });
  } catch (err) {
    next(err);
  }
};
// ===============================
// ADMIN: UPDATE EMPLOYEE
// ===============================
exports.updateEmployee = async (req, res, next) => {
  try {
    const allowed = ["name", "mobile", "department", "designation", "employeeCode", "status"];
    const updates = {};
    allowed.forEach((f) => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });

    if (!Object.keys(updates).length)
      return next(new ApiError(400, "No valid fields to update"));

    let emp = null;
    const id = req.params.id;

    if (mongoose.Types.ObjectId.isValid(id)) emp = await Employee.findById(id);
    if (!emp) emp = await Employee.findOne({ userId: id });
    if (!emp) return next(new ApiError(404, "Employee not found"));

    Object.assign(emp, updates);
    await emp.save();

    res.json({ success: true, message: "Employee updated successfully", employee: emp });
  } catch (err) {
    next(err);
  }
};

// ===============================
// ADMIN: TOGGLE ACTIVE/INACTIVE
// ===============================
exports.toggleEmployeeStatus = async (req, res, next) => {
  try {
    let emp = null;
    const id = req.params.id;

    if (mongoose.Types.ObjectId.isValid(id)) emp = await Employee.findById(id);
    if (!emp) emp = await Employee.findOne({ userId: id });
    if (!emp) return next(new ApiError(404, "Employee not found"));

    emp.status = emp.status === "active" ? "inactive" : "active";
    await emp.save();

    res.json({
      success: true,
      message: `Employee ${emp.status} successfully`,
      status: emp.status,
    });
  } catch (err) {
    next(err);
  }
};

// ===============================
// ADMIN: REMOVE EMPLOYEE
// ===============================
exports.removeEmployee = async (req, res, next) => {
  try {
    let emp = null;
    const id = req.params.id;

    if (mongoose.Types.ObjectId.isValid(id)) emp = await Employee.findById(id);
    if (!emp) emp = await Employee.findOne({ userId: id });
    if (!emp) return next(new ApiError(404, "Employee not found"));

    await Employee.findByIdAndDelete(emp._id);
    await User.findByIdAndDelete(emp.userId); // optionally delete user as well

    res.json({ success: true, message: "Employee removed successfully" });
  } catch (err) {
    next(err);
  }
};
