// server/src/controllers/ops.controller.js

const OpsMember = require("../models/OpsMember");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const emailService = require("../services/email.service");
const { notify } = require("../notifications/orchestrator");
const EVENTS = require("../events/eventConstants");
const { normalizeOpsMemberInput } = require("../utils/opsMember.util");
const cache = require("../utils/cache");


// @desc    Create new OPS team member
// @route   POST /ops/create
// @access  Super Admin
exports.createOpsMember = asyncHandler(async (req, res) => {
  const { name, email, phone, permissions, password, maxConcurrentReissues, maxConcurrentCancellations } = req.body;
  const normalizedOpsFields = normalizeOpsMemberInput(req.body);

  if (
    !name ||
    !email ||
    !phone ||
    !normalizedOpsFields.role ||
    !normalizedOpsFields.department ||
    !normalizedOpsFields.designation
  ) {
    throw new ApiError(400, "All required fields must be filled");
  }

  const existingMember = await OpsMember.findOne({ email: email.toLowerCase() });
  if (existingMember) {
    throw new ApiError(400, "OPS team member with this email already exists");
  }

  const actualPassword = password || crypto.randomBytes(4).toString("hex");

  const newMember = await OpsMember.create({
    name,
    email: email.toLowerCase(),
    phone,
    role: normalizedOpsFields.role,
    department: normalizedOpsFields.department,
    designation: normalizedOpsFields.designation,
    servicingScope: normalizedOpsFields.servicingScope,
    permissions: permissions || [],
    password: actualPassword,
    maxConcurrentReissues: Math.max(1, Math.min(999, maxConcurrentReissues ?? 10)),
    maxConcurrentCancellations: Math.max(1, Math.min(999, maxConcurrentCancellations ?? 10)),
  });

  try {
    notify(EVENTS.OPS_MEMBER_CREATED, {
      userId: newMember._id,
      email: newMember.email,
      name: newMember.name,
      role: newMember.role,
      permissions: newMember.permissions,
      password: actualPassword,
      dashboardUrl: process.env.SUPER_ADMIN_URL || `${process.env.FRONTEND_URL}/ops-login`,
    });
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
        role: newMember.role,
        department: newMember.department,
        designation: newMember.designation,
        servicingScope: newMember.servicingScope,
        maxConcurrentReissues: newMember.maxConcurrentReissues,
        maxConcurrentCancellations: newMember.maxConcurrentCancellations,
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
  const { search, role, status, department, designation, availabilityStatus } = req.query;

  let query = { isDeleted: false };

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { department: { $regex: search, $options: "i" } },
      { designation: { $regex: search, $options: "i" } },
    ];
  }

  if (role) query.role = role;
  if (department) query.department = department;
  if (designation) query.designation = designation;
  if (status) query.status = status;
  if (availabilityStatus) query.availabilityStatus = availabilityStatus;

  const members = await OpsMember.find(query)
    .sort({ createdAt: -1 })
    .select("-password");

  const normalizedMembers = members.map((member) => {
    const normalizedOpsFields = normalizeOpsMemberInput(member.toObject());
    return {
      ...member.toObject(),
      ...normalizedOpsFields,
    };
  });

  res.status(200).json(
    new ApiResponse(200, normalizedMembers, "OPS members fetched successfully")
  );
});

// @desc    Update OPS member details
// @route   PATCH /ops/update/:id
// @access  Super Admin
exports.updateOpsMember = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, phone, permissions, email, maxConcurrentReissues, maxConcurrentCancellations, availabilityStatus, autoAssignmentEnabled } = req.body;

  const member = await OpsMember.findOne({ _id: id, isDeleted: false });
  if (!member) {
    throw new ApiError(404, "OPS team member not found");
  }

  const normalizedOpsFields = normalizeOpsMemberInput(req.body, member);

  if (email && email.toLowerCase() !== member.email) {
    const existing = await OpsMember.findOne({ email: email.toLowerCase() });
    if (existing) {
      throw new ApiError(400, "Email already in use by another member");
    }
    member.email = email.toLowerCase();
  }

  if (name) member.name = name;
  if (phone) member.phone = phone;
  member.role = normalizedOpsFields.role;
  member.department = normalizedOpsFields.department;
  member.designation = normalizedOpsFields.designation;
  member.servicingScope = normalizedOpsFields.servicingScope;

  if (maxConcurrentReissues != null) {
    member.maxConcurrentReissues = Math.max(1, Math.min(999, maxConcurrentReissues));
  }
  if (maxConcurrentCancellations != null) {
    member.maxConcurrentCancellations = Math.max(1, Math.min(999, maxConcurrentCancellations));
  }

  if (availabilityStatus) {
    const validStatuses = ["AVAILABLE", "BUSY", "BREAK", "OFFLINE", "ON_LEAVE"];
    if (!validStatuses.includes(availabilityStatus)) {
      throw new ApiError(400, "Invalid availability status");
    }
    member.availabilityStatus = availabilityStatus;
  }

  if (autoAssignmentEnabled != null) {
    member.autoAssignmentEnabled = autoAssignmentEnabled;
  }

  let permissionsChanged = false;
  let oldPermissions = [...member.permissions];

  if (Array.isArray(permissions)) {
    const nextPermissions = [...permissions];
    if (
      JSON.stringify([...nextPermissions].sort()) !==
      JSON.stringify([...oldPermissions].sort())
    ) {
      permissionsChanged = true;
    }
    member.permissions = nextPermissions;
  }

  await member.save();
  await cache.del(`user:ops-member:${member._id}`);

  if (permissionsChanged) {
    notify(EVENTS.OPS_PERMISSION_CHANGED, {
      userId: member._id,
      email: member.email,
      name: member.name,
      oldPermissions: oldPermissions,
      newPermissions: member.permissions,
      changedBy: req.user?.name?.firstName || req.user?.name || "Admin",
    });
  }

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

  await cache.del(`user:ops-member:${member._id}`);

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

  await cache.del(`user:ops-member:${member._id}`);

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
  await cache.del(`user:ops-member:${member._id}`);

  // Send email with new password via orchestrator
  try {
    notify(EVENTS.OPS_MEMBER_CREATED, {
      userId: member._id,
      email: member.email,
      name: member.name,
      role: member.role,
      permissions: member.permissions,
      password: actualPassword,
      dashboardUrl: process.env.SUPER_ADMIN_URL || `${process.env.FRONTEND_URL}/ops-login`,
    });
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

exports.opsHeartbeat = asyncHandler(async (req, res) => {
  if (req.user.role !== "ops-member") {
    throw new ApiError(403, "Only OPS members can update heartbeat");
  }

  const member = await OpsMember.findByIdAndUpdate(
    req.user.id,
    {
      lastSeenAt: new Date(),
      isOnline: true,
    },
    { new: true },
  );

  if (!member) {
    throw new ApiError(404, "OPS member not found");
  }

  res.status(200).json(new ApiResponse(200, member, "OPS heartbeat refreshed"));
});

// @desc    Update OPS member availability status
// @route   PATCH /ops/availability
// @access  Ops Member
exports.updateMyAvailability = asyncHandler(async (req, res) => {
  if (req.user.role !== "ops-member" && req.user.role !== "super-admin") {
    throw new ApiError(403, "Only OPS members can update their availability");
  }

  const { availabilityStatus } = req.body;
  const validStatuses = ["AVAILABLE", "BUSY", "BREAK", "OFFLINE", "ON_LEAVE"];
  if (!validStatuses.includes(availabilityStatus)) {
    throw new ApiError(400, `Invalid availability status. Must be one of: ${validStatuses.join(", ")}`);
  }

  const member = await OpsMember.findByIdAndUpdate(
    req.user.id,
    { availabilityStatus },
    { new: true },
  ).select("-password");

  if (!member) {
    throw new ApiError(404, "OPS member not found");
  }

  res.status(200).json(new ApiResponse(200, member, `Availability updated to ${availabilityStatus}`));
});

// @desc    Capacity diagnostics for Super Admin
// @route   GET /ops/diagnostics
// @access  Super Admin
exports.getAssignmentDiagnostics = asyncHandler(async (req, res) => {
  const OfflineReissueRequest = require("../modules/servicing/reissue/schemas/OfflineReissueRequest.schema");
  const CancellationQuery = require("../models/CancellationQuery.model");

  const ACTIVE_REISSUE_STATUSES = ["PENDING_ASSIGNMENT", "ASSIGNED", "IN_PROGRESS", "WAITING_AIRLINE", "TICKET_GENERATED"];
  const ACTIVE_CANCELLATION_STATUSES = ["OPEN", "OPS_ASSIGNED", "OPS_PROCESSING", "PENDING_APPROVAL"];

  const members = await OpsMember.find({ isDeleted: false }).select("-password").lean();

  const activeReissues = await OfflineReissueRequest.find({
    assignedOpsMember: { $ne: null },
    status: { $in: ACTIVE_REISSUE_STATUSES },
  }).lean();

  const activeCancellations = await CancellationQuery.find({
    assignedTo: { $ne: null },
    status: { $in: ACTIVE_CANCELLATION_STATUSES },
  }).lean();

  const diagnostics = members.map((member) => {
    const memberReissues = activeReissues.filter(
      (r) => String(r.assignedOpsMember) === String(member._id),
    );
    const memberCancellations = activeCancellations.filter(
      (c) => String(c.assignedTo) === String(member._id),
    );

    const actualActiveReissues = memberReissues.length;
    const actualActiveCancellations = memberCancellations.length;
    const reissueEligible = member.permissions.includes("Manage Reissues")
      && member.autoAssignmentEnabled
      && member.availabilityStatus === "AVAILABLE"
      && actualActiveReissues < member.maxConcurrentReissues;
    const cancellationEligible = member.permissions.includes("Manage Cancellations")
      && member.autoAssignmentEnabled
      && member.availabilityStatus === "AVAILABLE"
      && actualActiveCancellations < member.maxConcurrentCancellations;

    const reissueReasons = [];
    if (!member.permissions.includes("Manage Reissues")) reissueReasons.push("Permission Missing");
    if (!member.autoAssignmentEnabled) reissueReasons.push("Auto Assignment Disabled");
    if (member.availabilityStatus !== "AVAILABLE") reissueReasons.push(`Availability: ${member.availabilityStatus}`);
    if (actualActiveReissues >= member.maxConcurrentReissues) reissueReasons.push(`Capacity Full (${actualActiveReissues}/${member.maxConcurrentReissues})`);

    const cancellationReasons = [];
    if (!member.permissions.includes("Manage Cancellations")) cancellationReasons.push("Permission Missing");
    if (!member.autoAssignmentEnabled) cancellationReasons.push("Auto Assignment Disabled");
    if (member.availabilityStatus !== "AVAILABLE") cancellationReasons.push(`Availability: ${member.availabilityStatus}`);
    if (actualActiveCancellations >= member.maxConcurrentCancellations) cancellationReasons.push(`Capacity Full (${actualActiveCancellations}/${member.maxConcurrentCancellations})`);

    return {
      memberId: member._id,
      name: member.name,
      email: member.email,
      availabilityStatus: member.availabilityStatus,
      permissions: member.permissions,
      autoAssignmentEnabled: member.autoAssignmentEnabled,
      reissue: {
        eligible: reissueEligible,
        current: actualActiveReissues,
        max: member.maxConcurrentReissues,
        storedCounter: member.currentActiveReissues,
        reasons: reissueReasons,
      },
      cancellation: {
        eligible: cancellationEligible,
        current: actualActiveCancellations,
        max: member.maxConcurrentCancellations,
        storedCounter: member.currentActiveCancellations,
        reasons: cancellationReasons,
      },
    };
  });

  res.status(200).json(new ApiResponse(200, diagnostics, "Assignment diagnostics fetched"));
});
