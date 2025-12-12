// server/src/routes/bookings.routes.js

const router = require("express").Router();
const { verifyToken } = require("../middleware/auth.middleware");
const bookingsController = require("../controllers/booking.controller");

// All booking routes are private
router.use(verifyToken);

// Create booking
router.post("/", bookingsController.createBooking);

// Confirm booking after approval
router.post("/:id/confirm", bookingsController.confirmBooking);

// Get all bookings
router.get("/", bookingsController.getAllBookings);

// Get single booking
router.get("/:id", bookingsController.getBooking);

// Cancel booking
router.post("/:id/cancel", bookingsController.cancelBooking);

module.exports = router;
