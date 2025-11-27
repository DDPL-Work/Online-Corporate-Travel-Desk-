const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const CorporateAdmin = require("../models/CorporateAdmin");
const Employee = require("../models/Employee");
const { ApiError } = require("../middleware/error.middleware");

// =============================
// REGISTER Corporate Admin
// =============================
exports.register = async (req, res, next) => {
  try {
    const { corporateName, domain, name, email, mobile, password } = req.body;

    // Email must be unique
    const exists = await CorporateAdmin.findOne({ email });
    if (exists) {
      return next(new ApiError(409, "Email already registered"));
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new Corporate Admin with default settings
    const admin = await CorporateAdmin.create({
      corporateName,
      domain,
      name,
      email,
      mobile,
      password: hashedPassword,
      corporateSettings: {
        classification: "postpaid",
        creditLimit: 0,
        billingCycleDays: 30,
        travelPolicy: {
          allowedCabin: ["Economy"],
          allowAncillaries: true,
        },
        walletBalance: 0,
        sso: { type: "none", enabled: false },
        kyc: { verified: false },
      }
    });

    res.status(201).json({
      success: true,
      message: "Corporate Admin registered successfully",
      admin: {
        id: admin._id,
        corporateName: admin.corporateName,
        name: admin.name,
        email: admin.email,
        mobile: admin.mobile,
        domain: admin.domain,
      }
    });

  } catch (err) {
    next(err);
  }
};

// =============================
// LOGIN Corporate Admin
// =============================
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Fetch admin with password
    const admin = await CorporateAdmin.findOne({ email }).select("+password");

    if (!admin) return next(new ApiError(401, "Invalid email or password"));

    // Check password
    const match = await bcrypt.compare(password, admin.password);
    if (!match) return next(new ApiError(401, "Invalid email or password"));

    // Admin disabled?
    if (!admin.active) return next(new ApiError(403, "Your account is disabled"));

    // Create token
    const token = jwt.sign(
      { id: admin._id, role: "CorporateAdmin" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      message: "Logged in successfully",
      token,
      admin: {
        id: admin._id,
        corporateName: admin.corporateName,
        name: admin.name,
        email: admin.email,
        mobile: admin.mobile,
        role: admin.role,
        domain: admin.domain,
        settings: admin.corporateSettings,
      }
    });

  } catch (err) {
    next(err);
  }
};

// =============================
// CREATE EMPLOYEE
// =============================
exports.createEmployee = async (req, res, next) => {
  try {
    const { name, email, mobile, department, designation, password } = req.body;

    // Validate password
    if (!password) {
      return next(new ApiError(400, "Password is required for employee"));
    }

    // Check duplicate email
    const exists = await Employee.findOne({ email });
    if (exists) return next(new ApiError(409, "Employee already exists"));

    // Hash employee password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create employee linked with CorporateAdmin
    const employee = await Employee.create({
      corporateAdminId: req.user.id,   // ⬅ FROM TOKEN
      name,
      email,
      mobile,
      department,
      designation,
      password: hashedPassword,
    });

    res.status(201).json({
      success: true,
      message: "Employee created successfully",
      createdBy: {
        corporateAdminId: req.user.id,
        corporateAdminRole: req.user.role,
        tokenUsed: req.headers.authorization   // ⬅ RETURN Token Used
      },
      employee,
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
