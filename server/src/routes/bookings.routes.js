// server/src/routes/bookings.routes.js

const router = require("express").Router();
const { verifyToken } = require("../middleware/auth.middleware");
const corporateContext = require("../middleware/corporate.middleware");
const bookingsController = require("../controllers/booking.controller");

// 🔐 all routes protected
router.use(verifyToken);

// create booking request
router.post("/", corporateContext, bookingsController.createBookingRequest);

router.post(
  "/instant-flight-book",
  corporateContext,
  bookingsController.instantFlightBooking,
);

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

router.post(
  "/:bookingId/manual-ticket",
  bookingsController.manualTicketNonLcc
);

router.get(
  "/:id/ticket-pdf",
  bookingsController.downloadTicketPdf
)

// common / admin
// router.get("/", bookingsController.getAllBookings);
// router.get("/:id", bookingsController.getBooking);
router.get("/get-project-flight-expenses/:projectId", bookingsController.getProjectFlightExpenses);

router.post("/:id/cancel", bookingsController.cancelBooking);

router.get(
  "/:id/lifecycle-timeline",
  bookingsController.getBookingLifecycleTimeline,
);

module.exports = router;
