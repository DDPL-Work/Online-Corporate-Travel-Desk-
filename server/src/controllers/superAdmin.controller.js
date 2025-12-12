// server/src/controllers/superAdmin.controller.js

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const SuperAdmin = require("../models/SuperAdmin.model.js");
const CorporateAdmin = require("../models/Corporate.js");
const ApiError = require("../utils/ApiError.js");

// ---------------------------------------------------------
// REGISTER SUPER ADMIN  (One-time or limited access)
// ---------------------------------------------------------
exports.registerSuperAdmin = async (req, res) => {
  try {
    const { name, email, mobile, password } = req.body;

    if (!name || !email || !mobile || !password)
      throw new ApiError(400, "All fields are required");

    const existing = await SuperAdmin.findOne({ email });
    if (existing) throw new ApiError(400, "Super Admin already exists");

    const hashedPass = await bcrypt.hash(password, 10);

    const admin = await SuperAdmin.create({
      name,
      email,
      mobile,
      password: hashedPass,
    });

    res.status(201).json({
      success: true,
      message: "Super Admin registered successfully",
      data: { id: admin._id, email: admin.email },
    });
  } catch (err) {
    console.error("Registration Error:", err);
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Internal Server Error",
    });
  }
};


// ---------------------------------------------------------
// LOGIN SUPER ADMIN
// ---------------------------------------------------------
exports.loginSuperAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      throw new ApiError(400, "Email & password required");

    const admin = await SuperAdmin.findOne({ email }).select("+password");
    if (!admin) throw new ApiError(404, "Super Admin not found");

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) throw new ApiError(401, "Invalid credentials");

    const token = jwt.sign(
      { id: admin._id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      message: "Login successful",
      token,
      data: { id: admin._id, email: admin.email, name: admin.name },
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message,
    });
  }
};


// ---------------------------------------------------------
// GET PROFILE
// ---------------------------------------------------------
exports.getProfile = async (req, res) => {
  try {
    const admin = await SuperAdmin.findById(req.user.id).select("-password");

    res.status(200).json({
      success: true,
      data: admin,
    });
  } catch (err) {
    console.error("Get Profile Error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};


// ---------------------------------------------------------
// UPDATE PROFILE
// ---------------------------------------------------------
exports.updateProfile = async (req, res) => {
  try {
    const updates = {};

    if (req.body.name) updates.name = req.body.name;
    if (req.body.mobile) updates.mobile = req.body.mobile;

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
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};


// ---------------------------------------------------------
// DEACTIVATE CORPORATE ADMIN
// ---------------------------------------------------------
exports.deactivateCorporateAdmin = async (req, res, next) => {
  try {
    const admin = await CorporateAdmin.findById(req.params.id);
    if (!admin) return next(new ApiError(404, "Corporate Admin not found"));

    admin.active = false;
    await admin.save();

    res.json({ success: true, message: "Corporate Admin deactivated" });
  } catch (err) {
    next(err);
  }
};


// ---------------------------------------------------------
// ACTIVATE CORPORATE ADMIN
// ---------------------------------------------------------
exports.activateCorporateAdmin = async (req, res, next) => {
  try {
    const admin = await CorporateAdmin.findById(req.params.id);
    if (!admin) return next(new ApiError(404, "Corporate Admin not found"));

    admin.active = true;
    await admin.save();

    res.json({ success: true, message: "Corporate Admin activated" });
  } catch (err) {
    next(err);
  }
};


// ---------------------------------------------------------
// REMOVE CORPORATE ADMIN
// ---------------------------------------------------------
exports.removeCorporateAdmin = async (req, res, next) => {
  try {
    const admin = await CorporateAdmin.findById(req.params.id);
    if (!admin) return next(new ApiError(404, "Corporate Admin not found"));

    await CorporateAdmin.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: "Corporate Admin removed" });
  } catch (err) {
    next(err);
  }
};
