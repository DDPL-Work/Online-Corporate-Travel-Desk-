const express = require("express");
const router = express.Router();

const corporateController = require("../controllers/corporate.related.controller");

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

// --------------------------------------------------
// SUPER ADMIN : BOOKINGS (FLIGHT + HOTEL)
// --------------------------------------------------

// Get all flight bookings (Super Admin)
router.get(
  "/corporate-bookings/flights",
  authorizeRoles("super-admin"),
  corporateController.getAllFlightBookings,
);

// Get all hotel bookings (Super Admin)
router.get(
  "/corporate-bookings/hotels",
  authorizeRoles("super-admin"),
  corporateController.getAllHotelBookings,
);

// --------------------------------------------------
// SUPER ADMIN : CANCELLATIONS
// --------------------------------------------------

router.get(
  "/corporate-bookings/flights/cancellations",
  authorizeRoles("super-admin"),
  corporateController.getCancelledOrRequestedFlights
);

router.get(
  "/corporate-bookings/hotels/cancellations",
  authorizeRoles("super-admin"),
  corporateController.getCancelledOrRequestedHotels
);

// Get All Corporates (Super Admin)
router.get(
  "/",
  authorizeRoles("super-admin"),
  corporateController.getAllCorporates,
);


// --------------------------------------------------
// SUPER ADMIN : CANCELLATION QUERIES
// --------------------------------------------------

// Get all cancellation queries
router.get(
  "/cancellation-queries",
  authorizeRoles("super-admin"),
  corporateController.fetchCancellationQueries
);

// Update cancellation query status
router.patch(
  "/cancellation-queries/:id/status",
  authorizeRoles("super-admin"),
  corporateController.updateCancellationQueryStatus
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
