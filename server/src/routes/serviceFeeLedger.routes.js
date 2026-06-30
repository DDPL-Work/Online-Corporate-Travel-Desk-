const express = require("express");
const { getServiceFeeStats, getServiceFeeCollections } = require("../controllers/serviceFeeLedger.controller");
const { verifyToken, authorizeRoles } = require("../middleware/auth.middleware");

const router = express.Router();

// Apply auth middleware to all routes
router.use(verifyToken);
router.use(authorizeRoles("super-admin", "travel-admin"));

// Routes
router.get("/stats", getServiceFeeStats);
router.get("/", getServiceFeeCollections);

module.exports = router;
