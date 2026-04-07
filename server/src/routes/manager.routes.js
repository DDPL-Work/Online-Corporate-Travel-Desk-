const express = require("express");
const router = express.Router();
const {
  handleManagerSelection,
  getPendingHotelRequestsForApprover,
  getMyEmployees,
  getRejectedHotelRequestsForApprover,
  getApprovedHotelRequestsForApprover,
  getTeamBookedHotelRequests,
  getPendingFlightRequestsForApprover,
  getApprovedFlightRequestsForApprover,
  getRejectedFlightRequestsForApprover,
  getTeamBookedFlightRequests,
} = require("../controllers/manager.controller");
const {
  verifyToken,
  authorizeRoles,
} = require("../middleware/auth.middleware");

router.use(verifyToken);
router.post("/select", handleManagerSelection);

router.get("/my-team", verifyToken, authorizeRoles("manager"), getMyEmployees);

// 🟡 Pending
router.get(
  "/hotel/pending-requests",
  verifyToken,
  authorizeRoles("manager"),
  getPendingHotelRequestsForApprover,
);
router.get(
  "/flight/pending-requests",
  verifyToken,
  authorizeRoles("manager"),
  getPendingFlightRequestsForApprover
);

// 🔴 Rejected
router.get(
  "/hotel/rejected-requests",
  verifyToken,
  authorizeRoles("manager"),
  getRejectedHotelRequestsForApprover
);
router.get(
  "/flight/rejected-requests",
  verifyToken,
  authorizeRoles("manager"),
  getRejectedFlightRequestsForApprover
);

// 🟢 Approved
router.get(
  "/hotel/approved-requests",
  verifyToken,
  authorizeRoles("manager"),
  getApprovedHotelRequestsForApprover
);
router.get(
  "/flight/approved-requests",
  verifyToken,
  authorizeRoles("manager"),
  getApprovedFlightRequestsForApprover
);

// 🟢 Booked
router.get(
  "/hotel/team-executed-requests",
  authorizeRoles("manager"),
  getTeamBookedHotelRequests
);
router.get(
  "/flight/team-executed-requests",
  authorizeRoles("manager"),
  getTeamBookedFlightRequests
);

module.exports = router;
