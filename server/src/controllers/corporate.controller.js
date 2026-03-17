// server/src/controllers/corporate.controller.js

const Corporate = require("../models/Corporate");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { calculateNextBillingDate } = require("../utils/helpers");
const emailService = require("../services/email.service");
const crypto = require("crypto");
const cloudinary = require("../config/cloudinary");
const fs = require("fs");

// -----------------------------------------------------
// ONBOARD CORPORATE - PUBLIC (Pending Status)
// -----------------------------------------------------
exports.onboardCorporate = asyncHandler(async (req, res) => {
  console.log("BODY:", req.body);
  // 🟢 Keep original destructuring
  // BASIC
  const corporateName = req.body.corporateName;
  const classification = req.body.classification || "prepaid";
  const defaultApprover = req.body.defaultApprover || "travel-admin";
  const creditTermsNotes = req.body.creditTermsNotes;
  const metadata = req.body.metadata || {};

  // PRIMARY CONTACT
 const primaryContact = req.body.primaryContact || {};
const secondaryContact = req.body.secondaryContact || {};
const billingDepartment = req.body.billingDepartment || {};
const registeredAddress = req.body.registeredAddress || {};
const ssoConfig = req.body.ssoConfig || {};
const gstDetails = req.body.gstDetails || {};

  const travelPolicy = {
    allowedCabinClass: Array.isArray(
      req.body["travelPolicy[allowedCabinClass][]"],
    )
      ? req.body["travelPolicy[allowedCabinClass][]"]
      : req.body["travelPolicy[allowedCabinClass][]"]
        ? [req.body["travelPolicy[allowedCabinClass][]"]]
        : ["Economy"],

    allowAncillaryServices:
      req.body["travelPolicy[allowAncillaryServices]"] === "true",

    advanceBookingDays: Number(
      req.body["travelPolicy[advanceBookingDays]"] || 0,
    ),

    maxBookingAmount: Number(req.body["travelPolicy[maxBookingAmount]"] || 0),
  };

  // --------------------------------------------------
  // VALIDATIONS (UNCHANGED)
  // --------------------------------------------------
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

  const existingDomain = await Corporate.findOne({
    "ssoConfig.domain": ssoConfig.domain,
  });

  if (existingDomain) throw new ApiError(400, "Domain already registered");

  // --------------------------------------------------
  // 🟢 CLOUDINARY UPLOAD SECTION (NEW)
  // --------------------------------------------------

  let gstCertificate = {};
  let panCard = {};

  if (req.files?.gstCertificate?.[0]) {
    const result = await cloudinary.uploader.upload(
      req.files.gstCertificate[0].path,
      {
        folder: "corporates/gst",
        resource_type: "auto",
      },
    );

    gstCertificate = {
      publicId: result.public_id,
      url: result.secure_url,
      uploadedAt: new Date(),
      verified: false,
    };

    fs.unlinkSync(req.files.gstCertificate[0].path);
  }

  if (req.files?.panCard?.[0]) {
    const result = await cloudinary.uploader.upload(req.files.panCard[0].path, {
      folder: "corporates/pan",
      resource_type: "auto",
    });

    panCard = {
      publicId: result.public_id,
      url: result.secure_url,
      uploadedAt: new Date(),
      verified: false,
    };

    fs.unlinkSync(req.files.panCard[0].path);
  }

  // URL fallback
  if (req.body["gstCertificate[url]"]) {
    gstCertificate.url = req.body["gstCertificate[url]"];
  }

  if (req.body["panCard[url]"]) {
    panCard.url = req.body["panCard[url]"];
  }

  // --------------------------------------------------
  // CREATE CORPORATE (STRUCTURE SAME AS YOUR OLD)
  // --------------------------------------------------

  const corporate = await Corporate.create({
    corporateName,
    registeredAddress,
    primaryContact,
    secondaryContact,
    billingDepartment,

    ssoConfig: { ...ssoConfig, verified: false },

    gstDetails: {
      ...gstDetails,
      verified: false,
    },

    gstCertificate,
    panCard,

    classification,
    travelPolicy,

    defaultApprover,
    status: "pending",
    creditTermsNotes,
    metadata,
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

  // ----------------------------
  // 🔹 Extract Financial Config
  // ----------------------------
  const {
    classification,
    billingCycle,
    customBillingDays,
    creditLimit,
    walletBalance,
  } = req.body;

  if (!classification)
    throw new ApiError(400, "Account classification is required");

  if (!["prepaid", "postpaid"].includes(classification))
    throw new ApiError(400, "Invalid classification");

  // ----------------------------
  // 🔹 Financial Validation
  // ----------------------------
  if (classification === "postpaid") {
    if (!creditLimit || Number(creditLimit) <= 0)
      throw new ApiError(400, "Valid credit limit required for postpaid");

    if (!billingCycle)
      throw new ApiError(400, "Billing cycle required for postpaid");

    corporate.creditLimit = Number(creditLimit);
    corporate.walletBalance = 0;
    corporate.billingCycle = billingCycle;
    corporate.customBillingDays =
      billingCycle === "custom" ? Number(customBillingDays || 0) : null;

    corporate.nextBillingDate = calculateNextBillingDate(
      billingCycle,
      customBillingDays,
    );
  }

  if (classification === "prepaid") {
    corporate.walletBalance = Number(walletBalance || 0);
    corporate.creditLimit = 0;
    corporate.billingCycle = null;
    corporate.customBillingDays = null;
    corporate.nextBillingDate = null;
  }

  corporate.classification = classification;

  // ----------------------------
  // 🔹 Activate Corporate
  // ----------------------------
  corporate.status = "active";
  corporate.isActive = true;
  corporate.onboardedAt = new Date();

  corporate.ssoConfig.verified = true;
  corporate.ssoConfig.verifiedAt = new Date();

  corporate.primaryContact.role = "corporate-super-admin";

  if (corporate.secondaryContact?.email) {
    corporate.secondaryContact.role = "travel-admin";
  }

  await corporate.save();

  // ----------------------------
  // 🔹 Create / Update Users
  // ----------------------------
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
      user.role = role;
      user.passwordResetToken = hashedToken;
      user.passwordResetExpires = Date.now() + 24 * 60 * 60 * 1000;
      user.isActive = true;
      await user.save();
    }

    return { user, token };
  };

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

  res.status(200).json(
    new ApiResponse(200, corporate, "Corporate approved & activated"),
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

  res
    .status(200)
    .json(new ApiResponse(200, corporate, "Corporate status updated"));
});
