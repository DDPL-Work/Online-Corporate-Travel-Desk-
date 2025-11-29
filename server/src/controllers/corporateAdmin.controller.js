const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const CorporateAdmin = require("../models/CorporateAdmin");
const Employee = require("../models/Employee");
const { ApiError } = require("../middleware/error.middleware");




// =============================
// CREATE EMPLOYEE (CORPORATE ADMIN ONLY)
// =============================
exports.createEmployee = async (req, res, next) => {
  try {
    const { name, email, mobile, department, designation, password } = req.body;

    // Required fields validation
    if (!name || !email || !mobile || !department || !designation || !password) {
      return next(new ApiError(400, "All fields are required"));
    }

    // Check duplicate employee email
    const exists = await Employee.findOne({ email });
    if (exists) return next(new ApiError(409, "Employee already exists"));

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create employee under the logged-in Corporate Admin
    const employee = await Employee.create({
      corporateAdminId: req.user.id,   // comes from JWT middleware
      name,
      email,
      mobile,
      department,
      designation,
      password: hashedPassword,
      role: "employee"
    });

    return res.status(201).json({
      success: true,
      message: "Employee created successfully",
      employee,
      createdBy: {
        corporateAdminId: req.user.id,
        corporateAdminRole: req.user.role
      }
    });

  } catch (err) {
    next(err);
  }
};


// =============================
// DEACTIVATE EMPLOYEE
// =============================
exports.deactivateEmployee = async (req, res, next) => {
  try {
    const emp = await Employee.findById(req.params.id);

    if (!emp) return next(new ApiError(404, "Employee not found"));

    emp.status = "inactive";
    await emp.save();

    res.json({
      success: true,
      message: "Employee deactivated successfully",
    });

  } catch (err) {
    next(err);
  }
};
// =============================
// ACTIVATE EMPLOYEE
// =============================
exports.activateEmployee = async (req, res, next) => {
  try {
    const emp = await Employee.findById(req.params.id);

    if (!emp) return next(new ApiError(404, "Employee not found"));

    emp.status = "active";
    await emp.save();

    res.json({
      success: true,
      message: "Employee activated successfully",
    });

  } catch (err) {
    next(err);
  }
};

// =============================
// REMOVE EMPLOYEE
// =============================
exports.removeEmployee = async (req, res, next) => {
  try {
    const emp = await Employee.findById(req.params.id);

    if (!emp) return next(new ApiError(404, "Employee not found"));

    await Employee.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Employee deleted successfully",
    });

  } catch (err) {
    next(err);
  }
};
