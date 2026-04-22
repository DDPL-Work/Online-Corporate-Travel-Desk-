
const express = require("express");
const router = express.Router();

const landingPageCtrl = require("../controllers/landingPage.controller");

const {
  verifyToken,
  authorizeRoles,
} = require("../middleware/auth.middleware");

const { uploadMultiple, processImage } = require("../middleware/upload.middleware");

// 👋 BRANDING & LANDING PAGE MANAGEMENT (Move above /:id to avoid collision)
router.get("/branding", verifyToken, landingPageCtrl.getBrandingDetails);
router.put("/branding", verifyToken, uploadMultiple, processImage, landingPageCtrl.updateBrandingDetails);


// --------------------------------------------------
// PUBLIC BRANDING ROUTES
// --------------------------------------------------
router.get("/public-branding/:id", landingPageCtrl.getPublicBranding);
router.get("/public-branding/slug/:slug", landingPageCtrl.getPublicBrandingBySlug);

module.exports = router;