// postPaid.corporate.routes.js
const express = require("express");
const router = express.Router();

const {
  createCreditUsage,
  getPostpaidBalance,
  getPostpaidTransactions,
  getPreviousCycles,
  getCycleTransactions,
  updateCycleReceipt,
} = require("../controllers/postPaid.corporate.controller");

const {
  verifyToken,
  authorizeRoles,
} = require("../middleware/auth.middleware");

// ✅ Protect financial routes
router.get(
  "/balance",
  verifyToken,
  authorizeRoles("travel-admin","finance_team", "super-admin", "ops-member"),
  getPostpaidBalance,
);

router.get(
  "/transactions",
  verifyToken,
  authorizeRoles("travel-admin","finance_team", "super-admin", "ops-member"),
  getPostpaidTransactions,
);

router.post(
  "/usage",
  verifyToken,
  authorizeRoles("travel-admin","finance_team", "super-admin", "ops-member"),
  createCreditUsage,
);

router.get(
  "/cycles",
  verifyToken,
  authorizeRoles("travel-admin","finance_team", "super-admin", "ops-member"),
  getPreviousCycles,
);

router.get(
  "/cycles/:cycleIndex/transactions",
  verifyToken,
  authorizeRoles("travel-admin","finance_team", "super-admin", "ops-member"),
  getCycleTransactions,
);

router.post(
  "/cycles/receipt",
  verifyToken,
  authorizeRoles("travel-admin","finance_team", "super-admin", "ops-member"),
  updateCycleReceipt,
);

module.exports = router;
