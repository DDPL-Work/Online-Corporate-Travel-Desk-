const Corporate = require("../models/Corporate");
const WalletTransaction = require("../models/Wallet");
const ServiceFeeLedger = require("../models/ServiceFeeLedger");
const paymentService = require("../services/payment.service");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const logger = require("../utils/logger");
const { PAYMENT_GATEWAYS } = require("../config/payment.config");

exports.getWalletBalance = asyncHandler(async (req, res) => {
  const corporate = await Corporate.findById(req.user.corporateId).select(
    "walletBalance",
  );

  if (!corporate) {
    throw new ApiError(404, "Corporate not found");
  }

  res.status(200).json(
    new ApiResponse(
      200,
      {
        balance: corporate.walletBalance,
        currency: "INR",
      },
      "Wallet balance fetched successfully",
    ),
  );
});

exports.getRechargeHistory = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo } = req.query;

  const query = { 
    corporateId: req.user.corporateId,
    type: "credit" 
  };

  if (dateFrom || dateTo) {
    query.createdAt = {};
    if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
    if (dateTo) query.createdAt.$lte = new Date(dateTo);
  }

  const transactions = await WalletTransaction.find(query)
    .populate("processedBy", "name email profilePicture")
    .sort({ createdAt: -1 });

  res.status(200).json(
    new ApiResponse(
      200,
      { transactions },
      "Recharge history fetched successfully",
    ),
  );
});

exports.getBookingTransactions = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo } = req.query;

  const query = { 
    corporateId: req.user.corporateId,
    type: { $in: ["debit", "refund"] }
  };

  if (dateFrom || dateTo) {
    query.createdAt = {};
    if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
    if (dateTo) query.createdAt.$lte = new Date(dateTo);
  }

  const transactions = await WalletTransaction.find(query)
    .populate("bookingId", "orderId status pricingSnapshot")
    .populate("processedBy", "name email profilePicture")
    .sort({ createdAt: -1 });

  res.status(200).json(
    new ApiResponse(
      200,
      { transactions },
      "Booking transactions fetched successfully",
    ),
  );
});

exports.getServiceChargeTransactions = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo } = req.query;

  logger.info("getServiceChargeTransactions request payload", {
    corporateId: req.user.corporateId,
    query: req.query
  });

  const query = { 
    corporateId: req.user.corporateId,
    type: "service_fee_deduction"
  };

  if (dateFrom || dateTo) {
    query.createdAt = {};
    if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
    if (dateTo) query.createdAt.$lte = new Date(dateTo);
  }

  const transactions = await WalletTransaction.find(query)
    .populate("bookingId", "orderId status pricingSnapshot")
    .populate("processedBy", "name email profilePicture")
    .sort({ createdAt: -1 });

  logger.info("getServiceChargeTransactions response", {
    count: transactions.length,
    transactions: transactions
  });

  res.status(200).json(
    new ApiResponse(
      200,
      { transactions },
      "Service charge transactions fetched successfully",
    ),
  );
});

exports.getServiceChargeDetails = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const { operationType } = req.query;
  
  if (!bookingId) {
    throw new ApiError(400, "Booking ID is required");
  }

  const query = { corporateId: req.user.corporateId, bookingId };
  if (operationType) {
    query.action = operationType;
  }

  const details = await ServiceFeeLedger.findOne(query);

  res.status(200).json(
    new ApiResponse(200, details, "Service charge details fetched successfully")
  );
});

exports.getWalletTransactions = asyncHandler(async (req, res) => {
  const { type, dateFrom, dateTo } = req.query;

  const query = { corporateId: req.user.corporateId };

  if (type) {
    query.type = type;
  }

  if (dateFrom || dateTo) {
    query.createdAt = {};
    if (dateFrom) {
      query.createdAt.$gte = new Date(dateFrom);
    }
    if (dateTo) {
      query.createdAt.$lte = new Date(dateTo);
    }
  }

  const transactions = await WalletTransaction.find(query)
    .populate("bookingId", "orderId status pricingSnapshot")
    .populate("processedBy", "name email profilePicture")
    .sort({ createdAt: -1 });

  res.status(200).json(
    new ApiResponse(
      200,
      { transactions },
      "Wallet transactions fetched successfully",
    ),
  );
});

exports.getPaymentOptions = asyncHandler(async (req, res) => {
  res.status(200).json(
    new ApiResponse(
      200,
      paymentService.getPaymentOptions(),
      "Payment options fetched successfully",
    ),
  );
});

exports.initiateRecharge = asyncHandler(async (req, res) => {
  const { amount } = req.body;
  const corporate = await Corporate.findById(req.user.corporateId).select(
    "classification",
  );

  if (!corporate) {
    throw new ApiError(404, "Corporate not found");
  }

  if (corporate.classification !== "prepaid") {
    throw new ApiError(400, "Wallet recharge is only for prepaid accounts");
  }

  const paymentSession = await paymentService.initiateWalletRecharge({
    amount,
    gateway: PAYMENT_GATEWAYS.PHONEPE,
    corporateId: req.user.corporateId,
    userId: req.user.id,
    customerPhone:
      req.user.mobile || req.user.phone || req.user.phoneWithCode || null,
    customerEmail: req.user.email || null,
    returnUrl: req.body.returnUrl,
  });

  logger.info("Wallet recharge initiated", {
    corporateId: req.user.corporateId,
    userId: req.user.id,
    gateway: paymentSession.gateway,
    orderId: paymentSession.orderId,
  });

  res.status(200).json(
    new ApiResponse(200, paymentSession, "Recharge order created successfully"),
  );
});

exports.verifyPayment = asyncHandler(async (req, res) => {
  const { orderId, paymentId, signature } = req.body;

  const result = await paymentService.verifyRazorpayRecharge({
    orderId,
    paymentId,
    signature,
    corporateId: req.user.corporateId,
    userId: req.user.id,
  });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        balance: result.balance,
        transaction: result.paymentId,
        orderId: result.orderId,
        status: result.status,
        gateway: result.gateway,
      },
      result.status === "SUCCESS"
        ? "Wallet recharged successfully"
        : "Payment verification completed",
    ),
  );
});

exports.verifyPhonePePayment = asyncHandler(async (req, res) => {
  const { orderId } = req.body;

  const result = await paymentService.verifyPhonePeRecharge({
    orderId,
    corporateId: req.user.corporateId,
    userId: req.user.id,
    source: "redirect_verification",
  });

  logger.info("PhonePe redirect verification completed", {
    orderId,
    paymentId: result.paymentId,
    status: result.status,
    state: result.state,
    balance: result.balance,
  });

  res.status(200).json(
    new ApiResponse(
      200,
      result,
      result.status === "SUCCESS"
        ? "PhonePe payment verified successfully"
        : "PhonePe payment verification completed",
    ),
  );
});

exports.getPaymentStatus = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { gateway } = req.query;

  const status = await paymentService.getRechargeStatus({
    orderId,
    gateway,
    corporateId: req.user.corporateId,
    userId: req.user.id,
  });

   // ✅ SUCCESS LOG
  res.status(200).json(
    new ApiResponse(
      200,
      status,
      "Payment status fetched successfully",
    ),
  );
});

exports.handlePhonePeWebhook = asyncHandler(async (req, res) => {
  try {
    const status = await paymentService.handlePhonePeWebhook({
      authorization: req.headers.authorization,
      rawBody: req.rawBody,
    });

    logger.info("PhonePe webhook processed", {
      orderId: status.orderId,
      paymentId: status.paymentId,
      status: status.status,
      gateway: status.gateway,
    });

    return res.status(200).json({
      success: true,
      orderId: status.orderId,
      status: status.status,
    });
  } catch (error) {
    logger.error("PhonePe webhook processing failed", {
      message: error.message,
      stack: error.stack,
    });
    throw error;
  }
});
