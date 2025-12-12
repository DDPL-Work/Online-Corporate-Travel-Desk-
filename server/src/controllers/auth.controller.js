// server/src/controllers/auth.controller.js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const SuperAdmin = require("../models/SuperAdmin.model");
const User = require("../models/User");
const Employee = require("../models/Employee");
const Corporate = require("../models/Corporate");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const emailService = require("../services/email.service");

// Map collections to roles
const USER_TYPES = [
  { model: SuperAdmin, role: "super-admin" },
  { model: User, role: "travel-admin" },
  { model: Employee, role: "employee" },
];

// ----------------------
// REQUEST SET PASSWORD
// ----------------------
exports.requestSetPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new ApiError(400, "Email is required");

  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, "User not found");

  // Create reset token
  const token = crypto.randomBytes(32).toString("hex");
  user.passwordResetToken = crypto.createHash("sha256").update(token).digest("hex");
  user.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
  await user.save();

  // Send email
  const setPasswordUrl = `${process.env.FRONTEND_URL}/set-password/${token}`;
  await emailService.sendEmail({
    to: user.email,
    subject: "Set your password",
    html: `
      <div>
        <p>Dear ${user.name.firstName || "User"},</p>
        <p>Please set your password by clicking the link below:</p>
        <a href="${setPasswordUrl}" style="padding:10px 20px; background:#4CAF50; color:white; text-decoration:none;">
          Set Password
        </a>
        <p>This link will expire in 1 hour.</p>
      </div>
    `,
  });

  res.status(200).json({ success: true, message: "Set password email sent" });
});

// ----------------------
// SET PASSWORD
// ----------------------
exports.setPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;
  if (!password) throw new ApiError(400, "Password is required");

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) throw new ApiError(400, "Invalid or expired password setup link");

  user.password = await bcrypt.hash(password, 10);
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();

  res.status(200).json(new ApiResponse(200, {}, "Password set successfully. You may now login."));
});

// ----------------------
// LOGIN
// ----------------------
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new ApiError(400, "Email & password required");

  let foundUser = null;

  // Search in all tables
  for (const { model, role } of USER_TYPES) {
    const user = await model.findOne({ email }).select("+password");
    if (user) {
      foundUser = { user, role };
      break;
    }
  }

  if (!foundUser) throw new ApiError(404, "User not found");

  // Check for forced SSO login
  if (foundUser.user.corporateId) {
    const corporate = await Corporate.findById(foundUser.user.corporateId);
    if (corporate?.ssoConfig?.forceSSO) {
      throw new ApiError(403, "Password login disabled. Use SSO.");
    }
  }

  const passwordMatch = await bcrypt.compare(password, foundUser.user.password);
  if (!passwordMatch) throw new ApiError(401, "Invalid password");

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
});

// ----------------------
// GET PROFILE
// ----------------------
exports.getProfile = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user, // comes from verifyToken
  });
});

// ----------------------
// UPDATE PROFILE
// ----------------------
exports.updateProfile = asyncHandler(async (req, res) => {
  const { name, mobile } = req.body;

  let model;
  if (req.user.role === "super-admin") model = SuperAdmin;
  else if (req.user.role === "travel-admin") model = User;
  else if (req.user.role === "employee") model = Employee;
  else throw new ApiError(400, "Invalid user role");

  const updated = await model.findByIdAndUpdate(
    req.user.id,
    { name, mobile },
    { new: true }
  );

  res.status(200).json({
    success: true,
    message: "Profile updated",
    user: updated,
  });
});

// ----------------------
// REGISTER (OPTIONAL)
// ----------------------
exports.register = asyncHandler(async () => {
  throw new ApiError(400, "Public registration is disabled");
});
