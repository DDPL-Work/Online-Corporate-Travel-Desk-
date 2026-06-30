// server/src/controllers/auth.controller.js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const SuperAdmin = require("../models/SuperAdmin.model");
const User = require("../models/User");
const Employee = require("../models/Employee");
const Corporate = require("../models/Corporate");
const OpsMember = require("../models/OpsMember");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const emailService = require("../services/email.service");
const { notify } = require("../notifications/orchestrator");
const EVENTS = require("../events/eventConstants");
const { default: mongoose } = require("mongoose");
const { normalizeOpsMemberInput } = require("../utils/opsMember.util");

// Map collections to roles
const USER_TYPES = [
  { model: SuperAdmin, role: "super-admin" },
  { model: OpsMember, role: "ops-member" },
  { model: User, role: "travel-admin" },
  { model: User, role: "manager" },
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

    const normalizedEmail = email.toLowerCase().trim();

  console.log("Connected DB:", mongoose.connection.name);
  console.log("Searching email:", normalizedEmail);

  let foundUser = null;

  // Search in all tables
  for (const { model, role } of USER_TYPES) {
    const user = await model.findOne({ email: normalizedEmail }).select("+password");
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

  const tokenPayload = {
    id: foundUser.user._id,
    role: foundUser.role,
    name: foundUser.user.name || "User",
    email: foundUser.user.email,
    phone: foundUser.user.phone || foundUser.user.mobile || "",
  };

  if (foundUser.role === "ops-member") {
    const normalizedOpsFields = normalizeOpsMemberInput(foundUser.user.toObject());
    tokenPayload.permissions = foundUser.user.permissions;
    tokenPayload.department = normalizedOpsFields.department;
    tokenPayload.designation = normalizedOpsFields.designation;
    tokenPayload.servicingScope = normalizedOpsFields.servicingScope;
  }

  const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: "1d" });

  const userResponse = {
    id: foundUser.user._id,
    email: foundUser.user.email,
    name: foundUser.user.name || "User",
    phone: foundUser.user.phone || foundUser.user.mobile || "",
    managerRequestStatus: foundUser.user.managerRequestStatus || "none",
  };

  if (foundUser.role === "ops-member") {
    const normalizedOpsFields = normalizeOpsMemberInput(foundUser.user.toObject());
    userResponse.permissions = foundUser.user.permissions;
    userResponse.department = normalizedOpsFields.department;
    userResponse.designation = normalizedOpsFields.designation;
    userResponse.servicingScope = normalizedOpsFields.servicingScope;
  }

  if (foundUser.role === "ops-member") {
    foundUser.user.lastLoginAt = new Date();
    foundUser.user.lastSeenAt = new Date();
    foundUser.user.isOnline = true;
    await foundUser.user.save();
  }

  // Fire-and-forget login success email (never blocks the login response)
  const loginName =
    foundUser.user.name?.firstName
    ? `${foundUser.user.name.firstName} ${foundUser.user.name.lastName || ''}`.trim()
    : foundUser.user.name || 'User';

  emailService
    .sendLoginSuccessEmail({
      email: foundUser.user.email,
      name: loginName,
      role: foundUser.role,
      loginTime: new Date(),
      ipAddress: req.ip || req.headers['x-forwarded-for'] || 'Unknown',
    })
    .catch((err) => console.warn('Login email failed (non-critical):', err.message));

  // ── Notify Super Admin: OPS Login Alert ──────
  if (foundUser.role === "ops-member") {
    notify(EVENTS.OPS_LOGIN_ALERT, {
      opsMemberName:  loginName,
      opsMemberEmail: foundUser.user.email,
      loginTime:      new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      ipAddress:      req.ip || req.headers['x-forwarded-for'] || 'Unknown',
    });
  }

  res.status(200).json({
    success: true,
    token,
    role: foundUser.role,
    user: userResponse,
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
  const { name, mobile, newPassword, currentPassword } = req.body;

  let model;
  if (req.user.role === "super-admin") model = SuperAdmin;
  else if (req.user.role === "ops-member") {
     model = require("../models/OpsMember");
  }
  else if (req.user.role === "travel-admin") model = User;
  else if (req.user.role === "manager") model = User;
  else if (req.user.role === "employee") model = Employee;
  else throw new ApiError(400, "Invalid user role");

  const user = await model.findById(req.user.id).select("+password");
  if (!user) throw new ApiError(404, "User not found");

  // Update name if provided
  if (name) user.name = name;

  // Update mobile/phone
  if (req.user.role === "ops-member") {
    if (req.body.phone || mobile) user.phone = req.body.phone || mobile;
  } else if (req.user.role === "employee") {
    if (mobile) user.mobile = mobile;
  } else {
    // For travel-admin, manager, super-admin
    if (mobile || req.body.phone) user.phone = mobile || req.body.phone;
  }

  // Handle Password Update
  if (newPassword) {
    if (!currentPassword) {
      throw new ApiError(400, "Current password is required to change password");
    }
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw new ApiError(401, "Current password incorrect");
    }
    user.password = newPassword; // Hooks will hash this
  }

  const updated = await user.save();

  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    user: updated,
  });
});

// ----------------------
// REGISTER (OPTIONAL)
// ----------------------
exports.register = asyncHandler(async () => {
  throw new ApiError(400, "Public registration is disabled");
});

// ─────────────────────────────────────────────────────────────────────────────
// FORGOT PASSWORD — OTP via Redis (no DB storage)
// ─────────────────────────────────────────────────────────────────────────────
const { getConnections } = require("../config/redisConnections");

const ADMIN_MODELS = [
  { model: SuperAdmin, role: "super-admin" },
  { model: OpsMember,  role: "ops-member"  },
];

const OTP_TTL_SECONDS  = 15 * 60; // 15 minutes
const OTP_REDIS_PREFIX = "fp:otp:";

/** 6-character alphanumeric OTP (A-Z, 0-9) */
function generateOtp() {
  const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let otp = "";
  for (let i = 0; i < 6; i++) {
    otp += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return otp;
}

/** SHA-256 hash of a value (hex) */
function hashValue(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

// ── Step 1: Generate OTP → hash → Redis (TTL 15 min) → email ─────────────────
exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new ApiError(400, "Email is required");

  const normalizedEmail = email.toLowerCase().trim();

  // Locate the admin user (super-admin or ops-member only)
  let foundUser = null;
  for (const { model } of ADMIN_MODELS) {
    const u = await model.findOne({ email: normalizedEmail });
    if (u) { foundUser = u; break; }
  }

  // Always return 200 to prevent email enumeration
  if (!foundUser) {
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "If that email exists, an OTP has been sent."));
  }

  const otp       = generateOtp();
  const hashedOtp = hashValue(otp);

  // Store ONLY the hash in Redis — plain OTP lives only in the email
  const redis = getConnections().cache;
  await redis.setex(`${OTP_REDIS_PREFIX}${normalizedEmail}`, OTP_TTL_SECONDS, hashedOtp);

  const userName =
    typeof foundUser.name === "string"
      ? foundUser.name
      : `${foundUser.name?.firstName || ""} ${foundUser.name?.lastName || ""}`.trim() || "Admin";

  await emailService.sendForgotPasswordOtpEmail({ to: normalizedEmail, name: userName, otp });

  res.status(200).json(new ApiResponse(200, {}, "OTP sent to your registered email address."));
});

// ── Step 2: Verify OTP (compare hash in Redis) ────────────────────────────────
exports.verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) throw new ApiError(400, "Email and OTP are required");

  const normalizedEmail = email.toLowerCase().trim();
  const normalizedOtp   = otp.toUpperCase().trim();

  const redis      = getConnections().cache;
  const storedHash = await redis.get(`${OTP_REDIS_PREFIX}${normalizedEmail}`);

  if (!storedHash || storedHash !== hashValue(normalizedOtp)) {
    throw new ApiError(400, "Invalid or expired OTP");
  }

  // OTP is correct but keep the key alive — reset-password step will delete it
  res.status(200).json(new ApiResponse(200, {}, "OTP verified successfully."));
});

// ── Step 3: Reset password → delete Redis key → done ─────────────────────────
exports.resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) {
    throw new ApiError(400, "Email, OTP, and new password are required");
  }
  if (newPassword.length < 8) {
    throw new ApiError(400, "Password must be at least 8 characters");
  }

  const normalizedEmail = email.toLowerCase().trim();
  const normalizedOtp   = otp.toUpperCase().trim();

  // Re-verify OTP from Redis
  const redis      = getConnections().cache;
  const redisKey   = `${OTP_REDIS_PREFIX}${normalizedEmail}`;
  const storedHash = await redis.get(redisKey);

  if (!storedHash || storedHash !== hashValue(normalizedOtp)) {
    throw new ApiError(400, "Invalid or expired OTP");
  }

  // Find the user and update password
  let foundUser = null;
  for (const { model } of ADMIN_MODELS) {
    const u = await model.findOne({ email: normalizedEmail }).select("+password");
    if (u) { foundUser = u; break; }
  }

  if (!foundUser) throw new ApiError(404, "User not found");

  // Assign plain text — the model's pre("save") hook will hash it
  foundUser.password = newPassword;
  await foundUser.save();

  // Immediately invalidate the OTP — single-use guarantee
  await redis.del(redisKey);

  res.status(200).json(new ApiResponse(200, {}, "Password reset successfully. You may now sign in."));
});
