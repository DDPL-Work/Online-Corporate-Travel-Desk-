const express = require("express");
const router = express.Router();

const adminBookingCtrl = require("../controllers/travelAdmin.controller");

const {
  verifyToken,
  authorizeRoles,
} = require("../middleware/auth.middleware");

/**
 * ============================================================
 * 🔐 AUTH MIDDLEWARE (ALL ROUTES PROTECTED)
 * ============================================================
 */
router.use(verifyToken);

/**
 * ============================================================
 * 🧑‍💼 ADMIN ACCESS ONLY (TRAVEL ADMIN / CORPORATE ADMIN)
 * ============================================================
 */
router.use(authorizeRoles("travel-admin", "corporate-admin", "employee"));

/**
 * ============================================================
 * ✈️ FLIGHT BOOKINGS (SSO BASED)
 * ============================================================
 */
router.get("/flights", adminBookingCtrl.getAllFlightBookingsAdmin);

/**
 * ============================================================
 * 🏨 HOTEL BOOKINGS (SSO BASED)
 * ============================================================
 */
router.get("/hotels", adminBookingCtrl.getAllHotelBookingsAdmin);
router.get(
  "/hotels/cancelled",
  adminBookingCtrl.getCancelledHotelBookingsAdmin,
);

router.post('/review', adminBookingCtrl.reviewManagerRequest);
router.post('/all/managers', adminBookingCtrl.getManagerRequests);


router.get("/all-employees",  adminBookingCtrl.getAllEmployees); // list all employees
router.get("/:id", adminBookingCtrl.getEmployee); // single employee
router.put("/:id", adminBookingCtrl.updateEmployee); // update employee
router.patch("/:id/toggle-status", adminBookingCtrl.toggleEmployeeStatus); // toggle status
router.delete("/:id", adminBookingCtrl.removeEmployee); // delete employee

//MANAGER ONBOARDING PROCESS (PROMOTION OF MANAGER)
router.put("/promote/:userId", adminBookingCtrl.promoteToManager);
router.put("/demote/:userId", adminBookingCtrl.demoteToEmployee);



module.exports = router;
