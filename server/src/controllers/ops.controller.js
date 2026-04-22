// server/src/controllers/ops.controller.js

const OpsMember = require("../models/OpsMember");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const emailService = require("../services/email.service");

// @desc    Create new OPS team member
// @route   POST /ops/create
// @access  Super Admin
exports.createOpsMember = asyncHandler(async (req, res) => {
  const { name, email, phone, role, department, permissions, password } = req.body;

  // Validation
  if (!name || !email || !phone || !role || !department) {
    throw new ApiError(400, "All required fields must be filled");
  }

  // Check if email unique
  const existingMember = await OpsMember.findOne({ email: email.toLowerCase() });
  if (existingMember) {
    throw new ApiError(400, "OPS team member with this email already exists");
  }

  // Auto-generate password if not provided
  const actualPassword = password || crypto.randomBytes(4).toString("hex");

  const newMember = await OpsMember.create({
    name,
    email: email.toLowerCase(),
    phone,
    role,
    department,
    permissions: permissions || [],
    password: actualPassword,
  });

  // Send email with credentials
  try {
    await emailService.sendOpsWelcomeEmail(newMember, actualPassword);
  } catch (err) {
    console.error("Failed to send welcome email:", err);
  }

  res.status(201).json(
    new ApiResponse(
      201,
      {
        id: newMember._id,
        name: newMember.name,
        email: newMember.email,
        generatedPassword: password ? undefined : actualPassword,
      },
      "OPS team member created successfully"
    )
  );
});

// @desc    List all OPS members with search and filter
// @route   GET /ops/list
// @access  Super Admin
exports.listOpsMembers = asyncHandler(async (req, res) => {
  const { search, role, department, status } = req.query;

  let query = { isDeleted: false };

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  if (role) query.role = role;
  if (department) query.department = department;
  if (status) query.status = status;

  const members = await OpsMember.find(query)
    .sort({ createdAt: -1 })
    .select("-password");

  res.status(200).json(new ApiResponse(200, members, "OPS members fetched successfully"));
});

// @desc    Update OPS member details
// @route   PATCH /ops/update/:id
// @access  Super Admin
exports.updateOpsMember = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, phone, role, department, permissions, email } = req.body;

  const member = await OpsMember.findOne({ _id: id, isDeleted: false });
  if (!member) {
    throw new ApiError(404, "OPS team member not found");
  }

  // Check if email is being changed and if it's unique
  if (email && email.toLowerCase() !== member.email) {
    const existing = await OpsMember.findOne({ email: email.toLowerCase() });
    if (existing) {
      throw new ApiError(400, "Email already in use by another member");
    }
    member.email = email.toLowerCase();
  }

  if (name) member.name = name;
  if (phone) member.phone = phone;
  if (role) member.role = role;
  if (department) member.department = department;
  if (permissions) member.permissions = permissions;

  await member.save();

  res.status(200).json(new ApiResponse(200, member, "OPS team member updated successfully"));
});

// @desc    Update OPS member status
// @route   PATCH /ops/status/:id
// @access  Super Admin
exports.updateOpsStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!["Active", "Inactive"].includes(status)) {
    throw new ApiError(400, "Invalid status");
  }

  const member = await OpsMember.findByIdAndUpdate(
    id,
    { status },
    { new: true, runValidators: true }
  ).select("-password");

  if (!member) {
    throw new ApiError(404, "OPS team member not found");
  }

  res.status(200).json(new ApiResponse(200, member, `OPS team member is now ${status}`));
});

// @desc    Delete OPS member (Soft Delete)
// @route   DELETE /ops/delete/:id
// @access  Super Admin
exports.deleteOpsMember = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const member = await OpsMember.findByIdAndUpdate(
    id,
    { isDeleted: true, status: "Inactive" },
    { new: true }
  );

  if (!member) {
    throw new ApiError(404, "OPS team member not found");
  }

  res.status(200).json(new ApiResponse(200, null, "OPS team member deleted successfully"));
});

// @desc    Reset OPS member password
// @route   PATCH /ops/reset-password/:id
// @access  Super Admin
exports.resetPassword = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  const actualPassword = password || crypto.randomBytes(4).toString("hex");

  const member = await OpsMember.findById(id);
  if (!member) {
    throw new ApiError(404, "OPS team member not found");
  }

  member.password = actualPassword;
  await member.save();

  // Send email with new password
  try {
    await emailService.sendOpsWelcomeEmail(member, actualPassword);
  } catch (err) {
     console.error("Failed to send reset email:", err);
  }

  res.status(200).json(
    new ApiResponse(
      200,
      { generatedPassword: password ? undefined : actualPassword },
      "Password reset successfully"
    )
  );
});
