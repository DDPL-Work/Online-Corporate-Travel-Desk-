const bcrypt = require("bcryptjs");
const Employee = require("../models/Employee");
const User = require("../models/User"); // TravelAdmin
const { ApiError } = require("../utils/ApiError");
const mongoose = require("mongoose"); // <- add this



// =============================
// TOGGLE EMPLOYEE STATUS (Activate/Deactivate)
// =============================
exports.toggleEmployeeStatus = async (req, res, next) => {
  try {
    let emp = null;
    const id = req.params.id;

    if (mongoose.Types.ObjectId.isValid(id)) {
      emp = await Employee.findById(id);
    }
    if (!emp) {
      emp = await Employee.findOne({ userId: id });
    }
    if (!emp) return next(new ApiError(404, 'Employee not found'));

    emp.status = emp.status === 'active' ? 'inactive' : 'active';
    await emp.save();

    res.json({ success: true, message: `Employee ${emp.status} successfully`, status: emp.status });
  } catch (err) {
    next(err);
  }
};
// =============================
// REMOVE EMPLOYEE
// =============================
exports.removeEmployee = async (req, res, next) => {
  try {
    let emp = null;
    const id = req.params.id;

    if (mongoose.Types.ObjectId.isValid(id)) {
      emp = await Employee.findById(id);
    }
    if (!emp) {
      emp = await Employee.findOne({ userId: id });
    }
    if (!emp) return next(new ApiError(404, 'Employee not found'));

    await Employee.findByIdAndDelete(emp._id);

    res.json({ success: true, message: 'Employee removed successfully' });
  } catch (err) {
    next(err);
  }
};

