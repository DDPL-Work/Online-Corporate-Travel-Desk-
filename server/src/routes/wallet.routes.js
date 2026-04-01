// ==========================================
// FILE: src/routes/wallet.routes.js
// ==========================================
const express = require('express');
const router = express.Router();
const walletController = require('../controllers/wallet.controller');
const { verifyToken, authorizeRoles } = require('../middleware/auth.middleware');

router.use(verifyToken);
router.use(authorizeRoles('travel-admin', 'super-admin'));

router.get('/balance', walletController.getWalletBalance);
router.get('/transactions', walletController.getWalletTransactions);
router.post('/recharge', walletController.initiateRecharge);
router.post('/verify-payment', walletController.verifyPayment);

module.exports = router;