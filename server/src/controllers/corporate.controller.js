// server/src/controllers/corporate.controller.js

const Corporate = require("../models/Corporate");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { calculateNextBillingDate } = require("../utils/helpers");
const emailService = require("../services/email.service");
const crypto = require("crypto");

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
    metadata,
  } = req.body;

  // Required validations
  if (
    !corporateName ||
    !primaryContact?.name ||
    !primaryContact?.email ||
    !primaryContact?.mobile
  )
    throw new ApiError(
      400,
      "Primary contact name, email & mobile are required",
    );

  if (!ssoConfig?.type || !ssoConfig?.domain)
    throw new ApiError(400, "SSO config type & domain are required");

  if (!classification)
    throw new ApiError(400, "Corporate classification is required");

  // Prevent duplicate domain
  const existingDomain = await Corporate.findOne({
    "ssoConfig.domain": ssoConfig.domain,
  });
  if (existingDomain) throw new ApiError(400, "Domain already registered");

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
    travelPolicy: travelPolicy || {
      allowedCabinClass: ["Economy"],
      allowAncillaryServices: true,
    },
    walletBalance: walletBalance || 0,
    defaultApprover: defaultApprover || "travel-admin",
    status: "pending",
    creditTermsNotes,
    metadata: metadata || {},
  });

  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        corporate,
        "Corporate onboarded (pending approval).",
      ),
    );
});

// -----------------------------------------------------
// APPROVE CORPORATE (SUPER ADMIN ONLY)
// -----------------------------------------------------
exports.approveCorporate = asyncHandler(async (req, res) => {
  const corporate = await Corporate.findById(req.params.id);
  if (!corporate) throw new ApiError(404, "Corporate not found");

  if (["inactive", "disabled"].includes(corporate.status))
    throw new ApiError(400, "Corporate cannot be approved");

  corporate.status = "active";
  corporate.onboardedAt = new Date();
  corporate.ssoConfig.verified = true;
  corporate.ssoConfig.verifiedAt = new Date();
  corporate.nextBillingDate = calculateNextBillingDate(
    corporate.billingCycle,
    corporate.customBillingDays,
  );

  corporate.primaryContact.role = "corporate-super-admin";

  if (corporate.secondaryContact?.email) {
    corporate.secondaryContact.role = "travel-admin";
  }

  await corporate.save();

  // Helper
  const createOrUpdateUserWithRole = async (contact, role) => {
    if (!contact?.email) return null;

    const email = contact.email.toLowerCase().trim();
    const [firstName, ...lastParts] = contact.name?.trim().split(" ") || [];

    const token = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    let user = await User.findOne({
      email,
      corporateId: corporate._id,
    });

    if (!user) {
      user = await User.create({
        email,
        name: {
          firstName: firstName || "",
          lastName: lastParts.join(" ") || "",
        },
        mobile: contact.mobile || "",
        corporateId: corporate._id,
        role,
        passwordResetToken: hashedToken,
        passwordResetExpires: Date.now() + 24 * 60 * 60 * 1000,
        isActive: true,
      });
    } else {
      // user.role = "travel-admin";
      user.role = role;
      user.passwordResetToken = hashedToken;
      user.passwordResetExpires = Date.now() + 24 * 60 * 60 * 1000;
      user.isActive = true;
      await user.save();
    }

    return { user, token };
  };

  // const primaryAdmin = await createOrUpdateTravelAdmin(
  //   corporate.primaryContact,
  // );
  // const secondaryAdmin = await createOrUpdateTravelAdmin(
  //   corporate.secondaryContact,
  // );

  const primaryAdmin = await createOrUpdateUserWithRole(
    corporate.primaryContact,
    "corporate-super-admin",
  );

  const secondaryAdmin = await createOrUpdateUserWithRole(
    corporate.secondaryContact,
    "travel-admin",
  );

  try {
    if (primaryAdmin) {
      await emailService.sendCorporateOnboarding(
        corporate,
        primaryAdmin.token,
        primaryAdmin.user,
      );
    }

    if (secondaryAdmin) {
      await emailService.sendCorporateOnboarding(
        corporate,
        secondaryAdmin.token,
        secondaryAdmin.user,
      );
    }
  } catch (err) {
    console.error("Email sending failed:", err);
  }

  res
    .status(200)
    .json(new ApiResponse(200, corporate, "Corporate approved successfully."));
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

  res
    .status(200)
    .json(new ApiResponse(200, corporate, "Corporate status updated"));
});
