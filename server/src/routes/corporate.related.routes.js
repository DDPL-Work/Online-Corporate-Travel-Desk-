const express = require("express");
const router = express.Router();

const corporateController = require("../controllers/corporate.related.controller");
const revenueController = require("../controllers/revenue.controller");

// Middleware
const {
  verifyToken,
  authorizeRoles,
} = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");
const sanitizeBody = require("../middleware/sanitize.middleware");
const { uploadMultiple } = require("../middleware/upload.middleware");
const { requireOpsPermission } = require("../middleware/requireOpsPermission.middleware");

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
  authorizeRoles("super-admin", "ops-member"),
  requireOpsPermission("View Bookings"),
  corporateController.getAllFlightBookings,
);

// Get all hotel bookings (Super Admin)
router.get(
  "/corporate-bookings/hotels",
  authorizeRoles("super-admin", "ops-member"),
  requireOpsPermission("View Bookings"),
  corporateController.getAllHotelBookings,
);

// --------------------------------------------------
// SUPER ADMIN : CANCELLATIONS
// --------------------------------------------------

router.get(
  "/corporate-bookings/flights/cancellations",
  authorizeRoles("super-admin", "ops-member"),
  requireOpsPermission("Manage Cancellations"),
  corporateController.getCancelledOrRequestedFlights
);

router.get(
  "/corporate-bookings/hotels/cancellations",
  authorizeRoles("super-admin", "ops-member"),
  requireOpsPermission("Manage Cancellations"),
  corporateController.getCancelledOrRequestedHotels
);

router.get(
  "/corporate-bookings/flights/:id",
  authorizeRoles("super-admin", "ops-member"),
  requireOpsPermission("View Bookings"),
  corporateController.getFlightBookingById,
);

router.get(
  "/corporate-bookings/hotels/:id",
  authorizeRoles("super-admin", "ops-member"),
  requireOpsPermission("View Bookings"),
  corporateController.getHotelBookingById,
);

// Get All Corporates (Super Admin)
router.get(
  "/",
  authorizeRoles("super-admin", "ops-member"),
  requireOpsPermission("Manage Corporates"),
  corporateController.getAllCorporates,
);


// --------------------------------------------------
// SUPER ADMIN : CANCELLATION QUERIES
// --------------------------------------------------

// Get all cancellation queries
router.get(
  "/cancellation-queries",
  authorizeRoles("super-admin", "ops-member", "employee", "manager", "travel-admin"),
  requireOpsPermission("Manage Cancellations"),
  corporateController.fetchCancellationQueries
);

// Get single cancellation query details
router.get(
  "/cancellation-queries/:id",
  authorizeRoles("super-admin", "ops-member", "employee", "manager", "travel-admin"),
  requireOpsPermission("Manage Cancellations"),
  corporateController.fetchCancellationQueryById
);

// --------------------------------------------------
// SUPER ADMIN : REVENUE
// --------------------------------------------------

router.get(
  "/revenue/summary",
  authorizeRoles("super-admin", "ops-member"),
  requireOpsPermission("View Finance"),
  revenueController.getRevenueSummary
);

router.get(
  "/revenue/company-wise",
  authorizeRoles("super-admin", "ops-member"),
  requireOpsPermission("View Finance"),
  revenueController.getCompanyWiseRevenue
);

router.get(
  "/revenue/monthly",
  authorizeRoles("super-admin", "ops-member"),
  requireOpsPermission("View Finance"),
  revenueController.getMonthlyRevenue
);

router.get(
  "/revenue/quarterly",
  authorizeRoles("super-admin", "ops-member"),
  requireOpsPermission("View Finance"),
  revenueController.getQuarterlyRevenue
);

router.get(
  "/revenue/half-yearly",
  authorizeRoles("super-admin", "ops-member"),
  requireOpsPermission("View Finance"),
  revenueController.getHalfYearlyRevenue
);

router.get(
  "/revenue/yearly",
  authorizeRoles("super-admin", "ops-member"),
  requireOpsPermission("View Finance"),
  revenueController.getYearlyRevenue
);

router.get(
  "/revenue/daily",
  authorizeRoles("super-admin", "ops-member"),
  requireOpsPermission("View Finance"),
  revenueController.getDailyRevenue
);

router.get(
  "/revenue/corporate-details/:id",
  authorizeRoles("super-admin", "ops-member"),
  requireOpsPermission("View Finance"),
  revenueController.getCorporateDetailedBookings
);

// Update cancellation query status
router.patch(
  "/cancellation-queries/:id/status",
  authorizeRoles("super-admin", "ops-member", "travel-admin"),
  requireOpsPermission("Manage Cancellations"),
  corporateController.updateCancellationQueryStatus
);

// --------------------------------------------------
// SUPER ADMIN : TBO COMMISSIONS & TAXES
// --------------------------------------------------
router.get(
  "/tbo-commissions",
  authorizeRoles("super-admin", "ops-member"),
  requireOpsPermission("View Finance"),
  corporateController.getTboCommissionsAndTaxes
);

// Get Single Corporate
router.get(
  "/:id",
  authorizeRoles("super-admin", "ops-member"),
  requireOpsPermission("Manage Corporates"),
  corporateController.getCorporate
);

// Update Corporate
router.put(
  "/:id",
  authorizeRoles("super-admin", "travel-admin", "ops-member"),
  requireOpsPermission("Manage Corporates"),
  sanitizeBody(["corporateName", "primaryContact.email"]),
  validate(corporateValidation.updateCorporate),
  corporateController.updateCorporate,
);

// Approve Corporate
router.put(
  "/:id/approve",
  authorizeRoles("super-admin", "ops-member"),
  requireOpsPermission("Manage Corporates"),
  corporateController.approveCorporate,
);

// Toggle Status
router.patch(
  "/:id/toggle-status",
  authorizeRoles("super-admin", "ops-member"),
  requireOpsPermission("Manage Corporates"),
  corporateController.toggleCorporateStatus,
);

module.exports = router;
