// server/src/controllers/corporate.controller.js

const Corporate = require('../models/Corporate');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { calculateNextBillingDate } = require('../utils/helpers');
const emailService = require('../services/email.service');
const crypto = require('crypto');

// -----------------------------------------------------
// ONBOARD CORPORATE - PUBLIC (Pending Status)
// -----------------------------------------------------
exports.onboardCorporate = asyncHandler(async (req, res) => {
  const {
    corporateName,
    registeredAddress,
    gstCertificate,
    panCard,
    primaryContact,
    secondaryContact,
    billingDepartment,
    ssoConfig,
    classification,
    creditLimit,
    billingCycle,
    customBillingDays,
    travelPolicy,
    walletBalance,
    defaultApprover,
    creditTermsNotes,
    metadata
  } = req.body;

  // Required validations
  if (!corporateName || !primaryContact?.name || !primaryContact?.email || !primaryContact?.mobile)
    throw new ApiError(400, "Primary contact name, email & mobile are required");

  if (!ssoConfig?.type || !ssoConfig?.domain)
    throw new ApiError(400, "SSO config type & domain are required");

  if (!classification)
    throw new ApiError(400, "Corporate classification is required");

  // Prevent duplicate domain
  const existingDomain = await Corporate.findOne({ "ssoConfig.domain": ssoConfig.domain });
  if (existingDomain)
    throw new ApiError(400, "Domain already registered");

  // Create corporate in pending status
  const corporate = await Corporate.create({
    corporateName,
    registeredAddress,
    gstCertificate,
    panCard,
    primaryContact,
    secondaryContact,
    billingDepartment,
    ssoConfig: { ...ssoConfig, verified: false },
    classification,
    creditLimit: classification === "postpaid" ? creditLimit || 0 : 0,
    currentCredit: 0,
    billingCycle: billingCycle || "30days",
    customBillingDays: billingCycle === "custom" ? customBillingDays : null,
    travelPolicy: travelPolicy || { allowedCabinClass: ["Economy"], allowAncillaryServices: true },
    walletBalance: walletBalance || 0,
    defaultApprover: defaultApprover || "travel-admin",
    status: "pending",
    creditTermsNotes,
    metadata: metadata || {},
  });

  res.status(201).json(
    new ApiResponse(201, corporate, "Corporate onboarded (pending approval).")
  );
});

// -----------------------------------------------------
// APPROVE CORPORATE (SUPER ADMIN ONLY)
// -----------------------------------------------------
exports.approveCorporate = asyncHandler(async (req, res) => {
  const corporate = await Corporate.findById(req.params.id);
  if (!corporate) throw new ApiError(404, "Corporate not found");

  if (corporate.status === "inactive" || corporate.status === "disabled")
    throw new ApiError(400, "Corporate is inactive and cannot be approved");

  // Update corporate status and verify SSO
  corporate.status = "active";
  corporate.onboardedAt = new Date();
  corporate.ssoConfig.verified = true;
  corporate.ssoConfig.verifiedAt = new Date();
  corporate.nextBillingDate = calculateNextBillingDate(
    corporate.billingCycle,
    corporate.customBillingDays
  );

  await corporate.save();

  // -----------------------------
  // CREATE / UPDATE TRAVEL ADMIN
  // -----------------------------
  let adminUser = await User.findOne({ email: corporate.primaryContact.email });
  const [firstName, ...lastParts] = corporate.primaryContact.name.trim().split(" ");

  // Generate set-password token
  const token = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  if (!adminUser) {
    // Create new travel admin
    adminUser = await User.create({
      email: corporate.primaryContact.email,
      name: { firstName, lastName: lastParts.join(" ") || "Admin" },
      mobile: corporate.primaryContact.mobile,
      corporateId: corporate._id,
      role: "travel-admin",
      passwordResetToken: hashedToken,
      passwordResetExpires: Date.now() + 24 * 60 * 60 * 1000, // 24h
      isActive: true
    });

    console.log("Created new travel admin:", adminUser.email);
  } else {
    // Update reset token for existing admin
    adminUser.passwordResetToken = hashedToken;
    adminUser.passwordResetExpires = Date.now() + 24 * 60 * 60 * 1000;
    await adminUser.save();
    console.log("Updated token for existing travel admin:", adminUser.email);
  }

  // Send onboarding email
  try {
    await emailService.sendCorporateOnboarding(corporate, token);
    console.log("Onboarding email sent successfully");
  } catch (err) {
    console.error("Failed to send onboarding email:", err);
  }

  res.status(200).json(
    new ApiResponse(200, corporate, "Corporate approved successfully. Set-password email sent.")
  );
});

// -----------------------------------------------------
// GET ALL CORPORATES
// -----------------------------------------------------
exports.getAllCorporates = asyncHandler(async (req, res) => {
  const corporates = await Corporate.find().sort({ createdAt: -1 });
  res.status(200).json(new ApiResponse(200, corporates, "Corporate list"));
});

// -----------------------------------------------------
// GET SINGLE CORPORATE
// -----------------------------------------------------
exports.getCorporate = asyncHandler(async (req, res) => {
  const corporate = await Corporate.findById(req.params.id);
  if (!corporate) throw new ApiError(404, "Corporate not found");

  res.status(200).json(new ApiResponse(200, corporate, "Corporate details"));
});

// -----------------------------------------------------
// UPDATE CORPORATE
// -----------------------------------------------------
exports.updateCorporate = asyncHandler(async (req, res) => {
  const updated = await Corporate.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });

  if (!updated) throw new ApiError(404, "Corporate not found");

  res.status(200).json(new ApiResponse(200, updated, "Corporate updated"));
});

// -----------------------------------------------------
// TOGGLE CORPORATE STATUS (PRODUCTION SAFE)
// -----------------------------------------------------
exports.toggleCorporateStatus = asyncHandler(async (req, res) => {
  const corporate = await Corporate.findById(req.params.id);
  if (!corporate) throw new ApiError(404, "Corporate not found");

  corporate.status = corporate.status === "active" ? "inactive" : "active";

  // ✅ Sync isActive with status
  corporate.isActive = corporate.status === "active";

  await corporate.save();

  res.status(200).json(
    new ApiResponse(200, corporate, "Corporate status updated")
  );
});

