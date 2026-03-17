// server/src/routes/bookings.routes.js

const router = require("express").Router();
const { verifyToken } = require("../middleware/auth.middleware");
const corporateContext = require("../middleware/corporate.middleware");
const bookingsController = require("../controllers/booking.controller");

// 🔐 all routes protected
router.use(verifyToken);

// create booking request
router.post("/", corporateContext, bookingsController.createBookingRequest);

// employee routes
router.get("/my/rejected", bookingsController.getMyRejectedRequests);
router.get("/my-bookings", bookingsController.getMyBookings);
router.get("/my-requests", bookingsController.getMyRequests);
router.get("/my-booking/:id", bookingsController.getMyBookingById);
router.get("/my-request/:id", bookingsController.getMyRequestById);

// execute approved flight
router.post(
  "/:bookingId/execute-flight",
  bookingsController.executeApprovedFlightBooking
);

// <<<<<<< HEAD
// =======
// execute approved hotel
router.post(
  "/:bookingId/execute-hotel",
  bookingsController.executeApprovedHotelBooking
);

// >>>>>>> 6c93c2a6864064eee402edb2e2c40c889dc71d90
router.get(
  "/:id/ticket-pdf",
  bookingsController.downloadTicketPdf
)

// common / admin
// router.get("/", bookingsController.getAllBookings);
// router.get("/:id", bookingsController.getBooking);
router.post("/:id/cancel", bookingsController.cancelBooking);

module.exports = router;
