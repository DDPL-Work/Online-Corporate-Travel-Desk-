const router = require("express").Router();
const auth = require("../middleware/auth.middleware");
const bookingCtrl = require("../controllers/booking.controller");
const { validate } = require("../middleware/validate.middleware");
const bookingValidator = require("../validations/booking.validation");

// Create booking
router.post(
  "/create",
  auth.verifyToken,
  validate(bookingValidator.createBooking),
  bookingCtrl.createBooking
);

// User bookings
router.get("/my", auth.verifyToken, bookingCtrl.getMyBookings);

// Corporate admin bookings
router.get(
  "/corporate",
  auth.verifyToken,
  auth.authorizeRoles("corporate-admin", "travel-admin"),
  bookingCtrl.getCorporateBookings
);

// Approve booking
router.post(
  "/approve/:bookingId",
  auth.verifyToken,
  auth.authorizeRoles("corporate-admin", "approver", "travel-admin"),
  validate(bookingValidator.approveReject),
  bookingCtrl.approveBooking
);

// Reject booking
router.post(
  "/reject/:bookingId",
  auth.verifyToken,
  auth.authorizeRoles("corporate-admin", "approver", "travel-admin"),
  validate(bookingValidator.approveReject),
  bookingCtrl.rejectBooking
);

// Confirm booking
router.post(
  "/confirm/:bookingId",
  auth.verifyToken,
  validate(bookingValidator.confirmBooking),
  bookingCtrl.confirmBooking
);

// Cancel booking
router.post(
  "/cancel/:bookingId",
  auth.verifyToken,
  validate(bookingValidator.approveReject),
  bookingCtrl.cancelBooking
);

// Get booking by id
router.get("/:bookingId", auth.verifyToken, bookingCtrl.getBookingById);

module.exports = router;
