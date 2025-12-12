// ==========================================
// FILE: src/routes/voucher.routes.js
// ==========================================
const express = require('express');
const router = express.Router();
const voucherController = require('../controllers/voucher.controller');
const { verifyToken, authorizeRoles } = require('../middleware/auth.middleware');

router.use(verifyToken);
router.use(authorizeRoles('travel-admin'));

router.post('/', voucherController.createOfflineVoucher);
router.get('/', voucherController.getAllVouchers);
router.get('/:id', voucherController.getVoucher);

module.exports = router;