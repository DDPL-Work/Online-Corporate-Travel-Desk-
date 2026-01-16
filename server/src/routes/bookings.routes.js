// server/src/routes/bookings.routes.js

const router = require("express").Router();
const {
  verifyToken,
  authorizeRoles,
} = require("../middleware/auth.middleware");
const corporateContext = require("../middleware/corporate.middleware");
const bookingsController = require("../controllers/booking.controller");

// All booking routes are private
router.use(verifyToken);

// Create booking
// router.post("/", bookingsController.createBookingRequest);

router.post(
  "/",
  verifyToken,
  corporateContext, // ensures req.corporate
  bookingsController.createBookingRequest
);

// Confirm booking after approval
router.post("/:id/confirm", bookingsController.confirmBooking);

router.get("/my", bookingsController.getMyRequests);

router.get("/my/:id", bookingsController.getMyRequestById);

// Get all bookings
router.get("/", bookingsController.getAllBookings);

// Get single booking
router.get("/:id", bookingsController.getBooking);

// Cancel booking
router.post("/:id/cancel", bookingsController.cancelBooking);

module.exports = router;
