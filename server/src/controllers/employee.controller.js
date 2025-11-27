const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Employee = require("../models/Employee");

// ===============================
// EMPLOYEE LOGIN
// ===============================
exports.loginEmployee = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const employee = await Employee.findOne({ email }).select("+password");

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const match = await bcrypt.compare(password, employee.password);
    if (!match) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (employee.status === "inactive") {
      return res.status(403).json({
        success: false,
        message: "Your account is disabled. Contact Corporate Admin.",
      });
    }

    const token = jwt.sign(
      {
        id: employee._id,
        role: "Employee",
        corporateAdminId: employee.corporateAdminId
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      success: true,
      message: "Login successful",
      token,
      employee: {
        id: employee._id,
        name: employee.name,
        email: employee.email,
        mobile: employee.mobile,
        role: "Employee",
      },
    });

  } catch (err) {
    next(err);
  }
};

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
