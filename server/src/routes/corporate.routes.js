const express = require("express");
const router = express.Router();

const corporateController = require("../controllers/corporate.controller");

// Middleware
const {
  verifyToken,
  authorizeRoles,
} = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");
const sanitizeBody = require("../middleware/sanitize.middleware");
const { uploadMultiple } = require("../middleware/upload.middleware");

// Validations (express-validator)
const corporateValidation = require("../validations/corporate.validation");

// --------------------------------------------------
// PUBLIC : ONBOARD CORPORATE
// --------------------------------------------------
router.post("/onboard", uploadMultiple, corporateController.onboardCorporate);

// --------------------------------------------------
// PROTECTED ROUTES
// --------------------------------------------------
router.use(verifyToken);

// Get All Corporates (Super Admin)
router.get(
  "/",
  authorizeRoles("super-admin"),
  corporateController.getAllCorporates,
);

// Get Single Corporate
router.get("/:id", corporateController.getCorporate);

// Update Corporate
router.put(
  "/:id",
  authorizeRoles("super-admin", "travel-admin", "travel-admin"),
  corporateValidation.updateCorporate,
  sanitizeBody(["corporateName", "primaryContact.email"]),
  validate,
  corporateController.updateCorporate,
);

// Approve Corporate
router.put(
  "/:id/approve",
  authorizeRoles("super-admin"),
  corporateController.approveCorporate,
);

// Toggle Status
router.patch(
  "/:id/toggle-status",
  authorizeRoles("super-admin"),
  corporateController.toggleCorporateStatus,
);

module.exports = router;
