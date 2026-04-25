// postPaid.corporate.routes.js
const express = require("express");
const router = express.Router();

const {
  createCreditUsage,
  getPostpaidBalance,
  getPostpaidTransactions,
  getPreviousCycles,
  getCycleTransactions,
} = require("../controllers/postPaid.corporate.controller");

const {
  verifyToken,
  authorizeRoles,
} = require("../middleware/auth.middleware");

// ✅ Protect financial routes
router.get(
  "/balance",
  verifyToken,
  authorizeRoles("travel-admin", "super-admin"),
  getPostpaidBalance,
);

router.get(
  "/transactions",
  verifyToken,
  authorizeRoles("travel-admin", "super-admin"),
  getPostpaidTransactions,
);

router.post(
  "/usage",
  verifyToken,
  authorizeRoles("travel-admin", "super-admin"),
  createCreditUsage,
);

router.get(
  "/cycles",
  verifyToken,
  authorizeRoles("travel-admin", "super-admin"),
  getPreviousCycles,
);

router.get(
  "/cycles/:cycleIndex/transactions",
  verifyToken,
  authorizeRoles("travel-admin", "super-admin"),
  getCycleTransactions,
);

module.exports = router;
