const Corporate = require("../models/Corporate");
const WalletTransaction = require("../models/Wallet");
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

exports.getWalletTransactions = asyncHandler(async (req, res) => {
  const { type, dateFrom, dateTo, page = 1, limit = 10 } = req.query;
  const parsedPage = Number(page);
  const parsedLimit = Number(limit);

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

  const total = await WalletTransaction.countDocuments(query);
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
