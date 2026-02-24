const express = require("express");
const router = express.Router();
const { getMyTravelAdmin } = require("../controllers/travelAdmin.controller");
const {
  verifyToken,
  authorizeRoles,
} = require("../middleware/auth.middleware");

router.get(
  "/me",
  verifyToken,
  authorizeRoles("employee"), // only employees can fetch approver
  getMyTravelAdmin,
);

module.exports = router;
