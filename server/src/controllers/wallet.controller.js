/// controllers/wallet.controller.js

const Corporate = require("../models/Corporate");
const WalletTransaction = require("../models/Wallet");
const paymentService = require("../services/payment.service");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { createRechargeLog } = require("../utils/walletLogger");
const WalletRechargeLog = require("../models/WalletActivityLog")

// @desc    Get wallet balance
// @route   GET /api/v1/wallet/balance
// @access  Private (Travel Admin)
exports.getWalletBalance = asyncHandler(async (req, res) => {
  const corporate = await Corporate.findById(req.user.corporateId);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        balance: corporate.walletBalance,
        currency: "INR",
      },
      "Wallet balance fetched successfully"
    )
  );
});

// @desc    Get wallet transactions (paginated)
// @route   GET /api/v1/wallet/transactions
// @access  Private (Travel Admin)
exports.getWalletTransactions = asyncHandler(async (req, res) => {
  const {
    type,
    dateFrom,
    dateTo,
    page = 1,
    limit = 10,
  } = req.query;

  const parsedPage = Number(page);
  const parsedLimit = Number(limit);

  const query = { corporateId: req.user.corporateId };

  // 🔍 Filters
  if (type) query.type = type;

  if (dateFrom || dateTo) {
    query.createdAt = {};
    if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
    if (dateTo) query.createdAt.$lte = new Date(dateTo);
  }

  // 📊 Total count (for pagination meta)
  const total = await WalletTransaction.countDocuments(query);

  // 📦 Paginated fetch
  const transactions = await WalletTransaction.find(query)
    .populate("bookingId", "bookingReference")
    .sort({ createdAt: -1 })
    .skip((parsedPage - 1) * parsedLimit)
    .limit(parsedLimit);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        transactions,
        pagination: {
          total,
          page: parsedPage,
          limit: parsedLimit,
          hasMore: parsedPage * parsedLimit < total,
        },
      },
      "Wallet transactions fetched successfully"
    )
  );
});

// @desc    Initiate wallet recharge
// @route   POST /api/v1/wallet/recharge
// @access  Private (Travel Admin)
exports.initiateRecharge = asyncHandler(async (req, res) => {
  const { amount } = req.body;
  const corporate = await Corporate.findById(req.user.corporateId);

  if (corporate.classification !== "prepaid") {
    throw new ApiError(400, "Wallet recharge is only for prepaid accounts");
  }

  const order = await paymentService.createOrder(
    amount,
    `RECHARGE-${Date.now()}`,
    corporate._id
  );

  // 🔔 LOG: PENDING
  await createRechargeLog({
    corporateId: corporate._id,
    userId: req.user.id,
    amount,
    status: "PENDING",
    orderId: order.id,
  });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
      },
      "Recharge order created successfully"
    )
  );
});

// @desc    Verify payment and credit wallet
// @route   POST /api/v1/wallet/verify-payment
// @access  Private (Travel Admin)
// exports.verifyPayment = asyncHandler(async (req, res) => {
//   const { orderId, paymentId, signature } = req.body;

//   const isValid = paymentService.verifyPaymentSignature(orderId, paymentId, signature);

//   if (!isValid) {
//     throw new ApiError(400, 'Invalid payment signature');
//   }

//   const corporate = await Corporate.findById(req.user.corporateId);

//   // Capture payment
//   const capture = await paymentService.capturePayment(paymentId, req.body.amount / 100);

//   // Update wallet
//   const balanceBefore = corporate.walletBalance;
//   corporate.walletBalance += (req.body.amount / 100);
//   await corporate.save();

//   // Record transaction
//   await WalletTransaction.create({
//     corporateId: corporate._id,
//     type: 'credit',
//     amount: req.body.amount / 100,
//     balanceBefore,
//     balanceAfter: corporate.walletBalance,
//     description: 'Wallet recharge',
//     transactionId: paymentId,
//     paymentGateway: {
//       name: 'razorpay',
//       orderId,
//       paymentId,
//       signature
//     },
//     processedBy: req.user.id,
//     status: 'completed'
//   });

//   res.status(200).json(
//     new ApiResponse(200, {
//       balance: corporate.walletBalance,
//       transaction: paymentId
//     }, 'Wallet recharged successfully')
//   );
// });

exports.verifyPayment = asyncHandler(async (req, res) => {
  const { orderId, paymentId, signature, amount } = req.body;

  const isValid = paymentService.verifyPaymentSignature(
    orderId,
    paymentId,
    signature
  );

  if (!isValid) {
    // ❌ FAILED
    await WalletRechargeLog.findOneAndUpdate(
      { orderId },
      {
        status: "FAILED",
        failureReason: "Invalid payment signature",
      }
    );
    throw new ApiError(400, "Invalid payment signature");
  }

  const corporate = await Corporate.findById(req.user.corporateId);

  const existingTxn = await WalletTransaction.findOne({
    transactionId: paymentId,
  });

  if (existingTxn) {
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          balance: corporate.walletBalance,
        },
        "Payment already processed"
      )
    );
  }

  // ✅ PAYMENT IS ALREADY CAPTURED BY RAZORPAY
  const creditAmount = amount / 100;

  const balanceBefore = corporate.walletBalance;
  corporate.walletBalance += creditAmount;
  await corporate.save();

  await WalletTransaction.create({
    corporateId: corporate._id,
    type: "credit",
    amount: creditAmount,
    balanceBefore,
    balanceAfter: corporate.walletBalance,
    description: "Wallet recharge",
    transactionId: paymentId,
    paymentGateway: {
      name: "razorpay",
      orderId,
      paymentId,
      signature,
    },
    processedBy: req.user.id,
    status: "completed",
  });

   // ✅ SUCCESS LOG
  await WalletRechargeLog.findOneAndUpdate(
    { orderId },
    {
      status: "SUCCESS",
      paymentId,
      balanceBefore,
      balanceAfter: corporate.walletBalance,
    }
  );
  res.status(200).json(
    new ApiResponse(
      200,
      {
        balance: corporate.walletBalance,
        transaction: paymentId,
      },
      "Wallet recharged successfully"
    )
  );
});
