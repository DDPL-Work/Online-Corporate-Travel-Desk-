const express = require("express");
const router = express.Router();
const walletController = require("../controllers/wallet.controller");
const {
  verifyToken,
  authorizeRoles,
} = require("../middleware/auth.middleware");
const { validateJoi } = require("../middleware/validateJoi.middleware");
const { walletValidation } = require("../validations");
const rateLimitMiddleware = require("../middleware/rateLimit.middleware");

router.post("/webhooks/phonepe", walletController.handlePhonePeWebhook);

router.use(verifyToken);
router.use(authorizeRoles("travel-admin", "super-admin", "ops-member"));

router.get("/balance", walletController.getWalletBalance);
router.get("/transactions", walletController.getWalletTransactions);
router.get("/transactions/recharge", walletController.getRechargeHistory);
router.get("/transactions/booking", walletController.getBookingTransactions);
router.get("/payment-options", walletController.getPaymentOptions);
router.get(
  "/payment-status/:orderId",
  rateLimitMiddleware.apiLimiter,
  walletController.getPaymentStatus,
);
router.post(
  "/recharge",
  rateLimitMiddleware.apiLimiter,
  validateJoi(walletValidation.initiateRecharge),
  walletController.initiateRecharge,
);
router.post(
  "/verify-phonepe",
  rateLimitMiddleware.apiLimiter,
  validateJoi(walletValidation.verifyPhonePePayment),
  walletController.verifyPhonePePayment,
);
router.post(
  "/verify-payment",
  rateLimitMiddleware.apiLimiter,
  validateJoi(walletValidation.verifyPayment),
  walletController.verifyPayment,
);

module.exports = router;
