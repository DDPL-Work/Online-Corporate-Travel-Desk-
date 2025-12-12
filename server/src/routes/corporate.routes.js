// server/src/routes/corporate.routes.js

const express = require('express');
const router = express.Router();

const corporateController = require('../controllers/corporate.controller');
const { verifyToken, authorizeRoles } = require('../middleware/auth.middleware');
const { validate, sanitizeBody } = require('../middleware/validate.middleware');
const corporateValidation = require('../validations/corporate.validation');
const { uploadMultiple } = require('../middleware/upload.middleware');

// --------------------------------------------------
// PUBLIC : ONBOARD CORPORATE
// --------------------------------------------------
router.post(
  "/onboard",
  uploadMultiple,
  validate(corporateValidation.corporateOnboarding),
  sanitizeBody([
    "corporateName",
    "primaryContact.email",
    "ssoConfig.domain"
  ]),
  corporateController.onboardCorporate
);


// --------------------------------------------------
// PROTECTED ROUTES
// --------------------------------------------------
router.use(verifyToken);

// Get All Corporates (Super Admin)
router.get(
  "/",
  authorizeRoles("super-admin"),
  corporateController.getAllCorporates
);

// Get Single Corporate
router.get(
  "/:id",
  corporateController.getCorporate
);

// Update Corporate
router.put(
  "/:id",
  authorizeRoles("super-admin", "travel-admin", "travel-admin"),
  corporateValidation.updateCorporate,
  sanitizeBody(["corporateName", "primaryContact.email"]),
  validate,
  corporateController.updateCorporate
);

// Approve Corporate
router.put(
  "/:id/approve",
  authorizeRoles("super-admin"),
  corporateController.approveCorporate
);

// Toggle Status
router.patch(
  "/:id/toggle-status",
  authorizeRoles("super-admin"),
  corporateController.toggleCorporateStatus
);

module.exports = router;
