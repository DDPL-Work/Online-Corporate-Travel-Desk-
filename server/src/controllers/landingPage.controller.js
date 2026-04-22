const Corporate = require("../models/Corporate");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const cloudinary = require("../config/cloudinary");
const fs = require("fs");


/**
 * ============================================================
 * 🛡️ COMMON ADMIN VALIDATION
 * ============================================================
 */
const validateTravelAdmin = (req) => {
  if (!req.user || req.user.role !== "travel-admin") {
    const error = new Error("Access denied. Travel Admin only.");
    error.statusCode = 403;
    throw error;
  }

  if (!req.user.corporateId) {
    const error = new Error("Corporate context missing (SSO failure)");
    error.statusCode = 400;
    throw error;
  }

  return req.user.corporateId;
};


/**
 * ============================================================
 * 🎨 GET BRANDING & LANDING PAGE DETAILS (ADMIN)
 * ============================================================
 */
exports.getBrandingDetails = async (req, res) => {
  try {
    const corporateId = validateTravelAdmin(req);
    const corporate = await Corporate.findById(corporateId).select("corporateName branding classification ssoConfig registeredAddress");

    if (!corporate) {
      return res.status(404).json({ success: false, message: "Corporate not found" });
    }

    return res.status(200).json({
      success: true,
      data: corporate,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch branding details",
    });
  }
};

/**
 * ============================================================
 * 🎨 UPDATE BRANDING & LANDING PAGE DETAILS (ADMIN)
 * ============================================================
 */
exports.updateBrandingDetails = async (req, res) => {
  try {
    const corporateId = validateTravelAdmin(req);
    const corporate = await Corporate.findById(corporateId);

    if (!corporate) {
      return res.status(404).json({ success: false, message: "Corporate not found" });
    }

    const { 
      landingPageTitle, 
      welcomeMessage, 
      primaryColor, 
      secondaryColor, 
      companyType,
      supportEmail,
      supportPhone,
      corporateName 
    } = req.body;

    // Update basic branding info
    if (!corporate.branding) {
      corporate.branding = {
        logo: { url: "", publicId: "" },
        primaryColor: "#003580",
        secondaryColor: "#0057b8",
        welcomeMessage: "Welcome to our Travel Portal",
        landingPageTitle: "Corporate Travel Desk",
        companyType: "Private Limited",
        supportEmail: "support@traveldesk.com",
        supportPhone: "+1 800 123 4567",
      };
    }

    if (corporateName) corporate.corporateName = corporateName;
    if (landingPageTitle) corporate.branding.landingPageTitle = landingPageTitle;
    if (welcomeMessage) corporate.branding.welcomeMessage = welcomeMessage;
    if (primaryColor) corporate.branding.primaryColor = primaryColor;
    if (secondaryColor) corporate.branding.secondaryColor = secondaryColor;
    if (companyType) corporate.branding.companyType = companyType;
    if (supportEmail !== undefined) corporate.branding.supportEmail = supportEmail;
    if (supportPhone !== undefined) corporate.branding.supportPhone = supportPhone;

    // Handle Logo Upload
    if (req.files?.companyLogo?.[0]) {
      // Delete old logo from Cloudinary if exists
      if (corporate.branding?.logo?.publicId) {
        try { await cloudinary.uploader.destroy(corporate.branding.logo.publicId); } catch (e) { console.error("Cloudinary Delete Error:", e); }
      }

      const result = await cloudinary.uploader.upload(req.files.companyLogo[0].path, {
        folder: `corporates/${corporateId}/branding`,
        resource_type: "image",
      });

      corporate.branding.logo = {
        publicId: result.public_id,
        url: result.secure_url,
      };

      // Cleanup temp file
      fs.unlinkSync(req.files.companyLogo[0].path);
    }

    await corporate.save();

    return res.status(200).json({
      success: true,
      message: "Branding settings updated successfully",
      data: corporate.branding,
    });
  } catch (error) {
    console.error("Update Branding Error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to update branding settings",
    });
  }
};


// -----------------------------------------------------
// GET PUBLIC BRANDING (No Auth Required)
// -----------------------------------------------------
exports.getPublicBranding = asyncHandler(async (req, res) => {
  const corporate = await Corporate.findById(req.params.id).select("corporateName branding");
  if (!corporate) throw new ApiError(404, "Corporate not found");

  res.status(200).json(new ApiResponse(200, corporate, "Public branding data"));
});

// -----------------------------------------------------
// GET PUBLIC BRANDING BY SLUG (No Auth Required)
// slug = URL-safe version of corporateName, e.g. "iap-india"
// -----------------------------------------------------
exports.getPublicBrandingBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  // Convert slug back to a regex that matches the company name
  // e.g. "iap-india" -> /iap.india/i  (dots match any character including spaces or hyphens)
  const slugRegex = new RegExp(slug.replace(/-/g, "[\\s\\-_]"), "i");

  const corporate = await Corporate.findOne({
    corporateName: { $regex: slugRegex },
  }).select("corporateName branding _id");

  if (!corporate) throw new ApiError(404, `No company found for slug '${slug}'`);

  res.status(200).json(new ApiResponse(200, corporate, "Public branding data"));
});


