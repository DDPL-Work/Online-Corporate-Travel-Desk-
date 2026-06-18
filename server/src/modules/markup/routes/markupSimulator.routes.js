const express = require("express");
const router = express.Router();
const markupSimulatorController = require("../controllers/markupSimulator.controller");
const { verifyToken, authorizeRoles } = require("../../../middleware/auth.middleware");

// Simulator routes - accessible to Super Admins / Travel Admins or Ops
router.post(
  "/simulate/flight",
  verifyToken,
  authorizeRoles("super-admin", "travel-admin", "ops"),
  markupSimulatorController.simulateFlightMarkup
);

module.exports = router;
