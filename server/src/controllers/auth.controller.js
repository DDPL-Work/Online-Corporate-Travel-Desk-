const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const SuperAdmin = require("../models/SuperAdmin.model");
const TravelCompany = require("../models/CorporateAdmin");
const Employee = require("../models/Employee");

// map collections to roles
const USER_TYPES = [
  { model: SuperAdmin, role: "super-admin" },
  { model: TravelCompany, role: "travel-company" },
  { model: Employee, role: "employee" },
];

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res
        .status(400)
        .json({ success: false, message: "Email & password required" });

    let foundUser = null;

    // Check each user type
    for (const { model, role } of USER_TYPES) {
      const user = await model.findOne({ email }).select("+password");
      if (user) {
        foundUser = { user, role };
        break;
      }
    }

    if (!foundUser)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const passwordMatch = await bcrypt.compare(
      password,
      foundUser.user.password
    );
    if (!passwordMatch)
      return res
        .status(401)
        .json({ success: false, message: "Invalid password" });

    // Generate token
    const token = jwt.sign(
      {
        id: foundUser.user._id,
        role: foundUser.role,
        name: foundUser.user.name,
        email: foundUser.user.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Response format ALWAYS same
    res.status(200).json({
      success: true,
      token,
      role: foundUser.role,
      user: {
        id: foundUser.user._id,
        email: foundUser.user.email,
        name: foundUser.user.name || "User",
      },
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

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
      },
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
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getProfile = async (req, res) => {
  try {
    const { id, role } = req.user;

    let modelMap = {
      "super-admin": SuperAdmin,
      "travel-company": TravelCompany,
      employee: Employee,
    };

    const Model = modelMap[role];

    if (!Model) {
      return res.status(400).json({ success: false, message: "Invalid role" });
    }

    const user = await Model.findById(id).select("-password");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    console.log("Incoming Update Payload:", req.body);
    console.log("Decoded User:", req.user);

    console.log("========== UPDATE PROFILE DEBUG ==========");
    console.log("Headers:", req.headers);
    console.log("Token:", req.headers.authorization);
    console.log("Body:", req.body);
    console.log("==========================================");

    const { id, role } = req.user;

    if (!id || !role) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Invalid token or missing user details",
        });
    }

    // Role → Model Mapping
    const MODEL_MAP = {
      "super-admin": SuperAdmin,
      "travel-company": TravelCompany,
      employee: Employee,
    };

    const Model = MODEL_MAP[role];

    if (!Model) {
      return res.status(400).json({
        success: false,
        message: "User role not supported for profile update",
      });
    }

    // Allowed fields per role
    const ALLOWED = {
      "super-admin": ["name", "mobile"],
      "travel-company": ["name", "mobile", "corporateName"],
      employee: ["name", "mobile", "department", "designation"],
    };

    const allowedFields = ALLOWED[role];

    // Build update object safely
    const updates = {};
    Object.keys(req.body).forEach((key) => {
      if (allowedFields.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields to update",
      });
    }

    // Update user
    const updatedUser = await Model.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (err) {
    console.log("Update Profile Error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
};
