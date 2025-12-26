
/// controllers/wallet.controller.js

const Corporate = require('../models/Corporate');
const WalletTransaction = require('../models/Wallet');
const paymentService = require('../services/payment.service');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get wallet balance
// @route   GET /api/v1/wallet/balance
// @access  Private (Travel Admin)
exports.getWalletBalance = asyncHandler(async (req, res) => {
  const corporate = await Corporate.findById(req.user.corporateId);

  res.status(200).json(
    new ApiResponse(200, {
      balance: corporate.walletBalance,
      currency: 'INR'
    }, 'Wallet balance fetched successfully')
  );
});

// @desc    Get wallet transactions
// @route   GET /api/v1/wallet/transactions
// @access  Private (Travel Admin)
exports.getWalletTransactions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, type, dateFrom, dateTo } = req.query;

  const query = { corporateId: req.user.corporateId };

  if (type) query.type = type;
  if (dateFrom || dateTo) {
    query.createdAt = {};
    if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
    if (dateTo) query.createdAt.$lte = new Date(dateTo);
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const transactions = await WalletTransaction.find(query)
    .populate('bookingId', 'bookingReference')
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });

  const total = await WalletTransaction.countDocuments(query);

  res.status(200).json(
    new ApiResponse(200, {
      transactions,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    }, 'Wallet transactions fetched successfully')
  );
});

// @desc    Initiate wallet recharge
// @route   POST /api/v1/wallet/recharge
// @access  Private (Travel Admin)
exports.initiateRecharge = asyncHandler(async (req, res) => {
  const { amount } = req.body;
  const corporate = await Corporate.findById(req.user.corporateId);

  if (corporate.classification !== 'prepaid') {
    throw new ApiError(400, 'Wallet recharge is only for prepaid accounts');
  }

  const order = await paymentService.createOrder(amount, `RECHARGE-${Date.now()}`, corporate._id);

  res.status(200).json(
    new ApiResponse(200, {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID
    }, 'Recharge order created successfully')
  );
});

// @desc    Verify payment and credit wallet
// @route   POST /api/v1/wallet/verify-payment
// @access  Private (Travel Admin)
exports.verifyPayment = asyncHandler(async (req, res) => {
  const { orderId, paymentId, signature } = req.body;

  const isValid = paymentService.verifyPaymentSignature(orderId, paymentId, signature);

  if (!isValid) {
    throw new ApiError(400, 'Invalid payment signature');
  }

  const corporate = await Corporate.findById(req.user.corporateId);

  // Capture payment
  const capture = await paymentService.capturePayment(paymentId, req.body.amount / 100);

  // Update wallet
  const balanceBefore = corporate.walletBalance;
  corporate.walletBalance += (req.body.amount / 100);
  await corporate.save();

  // Record transaction
  await WalletTransaction.create({
    corporateId: corporate._id,
    type: 'credit',
    amount: req.body.amount / 100,
    balanceBefore,
    balanceAfter: corporate.walletBalance,
    description: 'Wallet recharge',
    transactionId: paymentId,
    paymentGateway: {
      name: 'razorpay',
      orderId,
      paymentId,
      signature
    },
    processedBy: req.user.id,
    status: 'completed'
  });

  res.status(200).json(
    new ApiResponse(200, {
      balance: corporate.walletBalance,
      transaction: paymentId
    }, 'Wallet recharged successfully')
  );
});