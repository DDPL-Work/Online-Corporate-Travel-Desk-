const express = require("express");
const router = express.Router();
const {
  handleManagerSelection,
  getPendingHotelRequestsForApprover,
  getMyEmployees,
  getRejectedHotelRequestsForApprover,
  getApprovedHotelRequestsForApprover,
  getTeamBookedHotelRequests,
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

// 🔴 Rejected
router.get(
  "/hotel/rejected-requests",
  verifyToken,
  authorizeRoles("manager"),
  getRejectedHotelRequestsForApprover
);

// 🟢 Approved
router.get(
  "/hotel/approved-requests",
  verifyToken,
  authorizeRoles("manager"),
  getApprovedHotelRequestsForApprover
);

// 🟢 Booked
router.get(
  "/hotel/team-executed-requests",
  authorizeRoles("manager"),
  getTeamBookedHotelRequests
);

module.exports = router;
