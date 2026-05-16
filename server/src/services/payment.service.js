const crypto = require("crypto");
const mongoose = require("mongoose");
const Corporate = require("../models/Corporate");
const WalletTransaction = require("../models/Wallet");
const WalletRechargeLog = require("../models/WalletActivityLog");
const Ledger = require("../models/Ledger");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const logger = require("../utils/logger");
const redis = require("../config/redis");
const { getAgencyBalance } = require("./tboBalance.service");
const { notify } = require("../notifications/orchestrator");
const EVENTS = require("../events/eventConstants");
const razorpayGateway = require("./payments/gateways/razorpay.gateway");
const phonepeGateway = require("./payments/gateways/phonepe.gateway");
const {
  PAYMENT_GATEWAYS,
  paymentConfig,
  normalizeGateway,
  isGatewayEnabled,
} = require("../config/payment.config");

const RECHARGE_LOG_STATUS = Object.freeze({
  PENDING: "PENDING",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
});

const RECHARGE_TRANSACTION_STATUS = Object.freeze({
  PENDING: "pending",
  COMPLETED: "completed",
  FAILED: "failed",
});

const PHONEPE_TERMINAL_STATES = new Set(["COMPLETED", "FAILED"]);
const SETTLEMENT_LOCK_TTL_MS = 30 * 1000;
const PHONEPE_VERIFY_ATTEMPTS = 5;
const PHONEPE_VERIFY_RETRY_MS = 2500;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class PaymentService {
  constructor() {
    this.gateways = {
      [PAYMENT_GATEWAYS.RAZORPAY]: razorpayGateway,
      [PAYMENT_GATEWAYS.PHONEPE]: phonepeGateway,
    };
  }

  getSettlementLockKey(gateway, orderId) {
    return `payment:settlement:${normalizeGateway(gateway)}:${orderId}`;
  }

  async acquireSettlementLock(gateway, orderId) {
    const key = this.getSettlementLockKey(gateway, orderId);
    const token = crypto.randomUUID();

    try {
      const acquired = await redis.set(
        key,
        token,
        "PX",
        SETTLEMENT_LOCK_TTL_MS,
        "NX",
      );

      if (acquired !== "OK") {
        logger.warn("Payment settlement lock is already held", {
          gateway,
          orderId,
          lockKey: key,
        });
        return null;
      }

      return { key, token };
    } catch (error) {
      logger.warn("Redis lock acquisition failed, proceeding without Redis lock", {
        gateway,
        orderId,
        message: error.message,
      });
      return { key: null, token: null };
    }
  }

  async releaseSettlementLock(lock) {
    if (!lock?.key || !lock?.token) {
      return;
    }

    try {
      const releaseScript = `
        if redis.call("get", KEYS[1]) == ARGV[1]
        then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;

      await redis.eval(releaseScript, 1, lock.key, lock.token);
    } catch (error) {
      logger.warn("Redis lock release failed", {
        key: lock.key,
        message: error.message,
      });
    }
  }

  getGateway(gatewayName) {
    const normalizedGateway = normalizeGateway(gatewayName);
    const gateway = this.gateways[normalizedGateway];

    if (!gateway || !isGatewayEnabled(normalizedGateway)) {
      throw new ApiError(
        400,
        `${normalizedGateway} payment gateway is not enabled`,
      );
    }

    return gateway;
  }

  getPaymentOptions() {
    const supportedGateways = [PAYMENT_GATEWAYS.PHONEPE]
      .filter((gateway) => isGatewayEnabled(gateway))
      .map((gateway) => ({
        code: gateway,
        label: gateway === PAYMENT_GATEWAYS.RAZORPAY ? "Razorpay" : "PhonePe",
      }));

    const defaultGateway = supportedGateways.some(
      (gateway) => gateway.code === normalizeGateway(paymentConfig.defaultGateway),
    )
      ? normalizeGateway(paymentConfig.defaultGateway)
      : supportedGateways[0]?.code || PAYMENT_GATEWAYS.PHONEPE;

    return {
      defaultGateway,
      supportedGateways,
      minRechargeAmount: paymentConfig.minRechargeAmount,
      currency: paymentConfig.currency,
    };
  }

  toPaise(amount) {
    return Math.round(Number(amount) * 100);
  }

  fromPaise(amountInPaise) {
    return Number(amountInPaise || 0) / 100;
  }

  validateRechargeAmount(amount) {
    const parsedAmount = Number(amount);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      throw new ApiError(400, "Invalid recharge amount");
    }

    if (parsedAmount < paymentConfig.minRechargeAmount) {
      throw new ApiError(
        400,
        `Minimum recharge amount is INR ${paymentConfig.minRechargeAmount}`,
      );
    }

    return Number(parsedAmount.toFixed(2));
  }

  generateMerchantOrderId(prefix = "WALLET") {
    const randomPart = crypto.randomBytes(6).toString("hex");
    return `${prefix}_${Date.now()}_${randomPart}`.slice(0, 63);
  }

  buildRechargeLogMetadata(existingMetadata = {}, nextMetadata = {}) {
    return {
      ...existingMetadata,
      ...nextMetadata,
      updatedAt: new Date().toISOString(),
    };
  }

  async upsertRechargeLog({
    gateway,
    orderId,
    corporateId,
    userId,
    amount,
    status,
    paymentId,
    lastKnownState,
    failureReason,
    metadata = {},
    providerOrderId,
    processedAt,
    webhookReceivedAt,
    lastStatusCheckAt,
  }) {
    const existingLog = await WalletRechargeLog.findOne({
      gateway,
      orderId,
    });

    const update = {
      corporateId: existingLog?.corporateId || corporateId,
      initiatedBy: existingLog?.initiatedBy || userId,
      amount: amount ?? existingLog?.amount,
      gateway,
      status,
      orderId,
      paymentId: paymentId || existingLog?.paymentId,
      providerOrderId: providerOrderId || existingLog?.providerOrderId,
      lastKnownState: lastKnownState || existingLog?.lastKnownState,
      failureReason: failureReason || existingLog?.failureReason,
      processedAt: processedAt || existingLog?.processedAt,
      webhookReceivedAt: webhookReceivedAt || existingLog?.webhookReceivedAt,
      lastStatusCheckAt:
        lastStatusCheckAt || existingLog?.lastStatusCheckAt || new Date(),
      metadata: this.buildRechargeLogMetadata(
        existingLog?.metadata,
        metadata,
      ),
    };

    return WalletRechargeLog.findOneAndUpdate(
      { gateway, orderId },
      { $set: update },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    );
  }

  async findRechargeLog({ orderId, gateway, corporateId }) {
    const query = { orderId };

    if (gateway) {
      query.gateway = normalizeGateway(gateway);
    }

    if (corporateId) {
      query.corporateId = corporateId;
    }

    return WalletRechargeLog.findOne(query);
  }

  async findRechargeTransaction({ gateway, orderId, session = null }) {
    return this.withOptionalSession(
      WalletTransaction.findOne({
        "paymentGateway.name": normalizeGateway(gateway),
        "paymentGateway.orderId": orderId,
      }).sort({ createdAt: -1 }),
      session,
    );
  }

  async upsertPendingRechargeTransaction({
    log,
    providerOrderId,
    state,
    session = null,
  }) {
    const corporate = await this.withOptionalSession(
      Corporate.findById(log.corporateId).select("walletBalance"),
      session,
    );

    if (!corporate) {
      throw new ApiError(404, "Corporate not found for pending wallet recharge");
    }

    const existingTransaction = await this.findRechargeTransaction({
      gateway: log.gateway,
      orderId: log.orderId,
      session,
    });

    if (existingTransaction) {
      existingTransaction.amount = log.amount;
      existingTransaction.balanceBefore = corporate.walletBalance;
      existingTransaction.balanceAfter = corporate.walletBalance;
      existingTransaction.status = RECHARGE_TRANSACTION_STATUS.PENDING;
      existingTransaction.description = "Wallet recharge initiated";
      existingTransaction.reference = log.orderId;
      existingTransaction.paymentGateway = {
        ...existingTransaction.paymentGateway,
        name: log.gateway,
        orderId: log.orderId,
        providerOrderId: providerOrderId || existingTransaction.paymentGateway?.providerOrderId,
        state: state || existingTransaction.paymentGateway?.state || "PENDING",
        eventType: "initiate",
      };
      existingTransaction.metadata = {
        ...(existingTransaction.metadata || {}),
        rechargeLogId: log._id,
        lastPendingAt: new Date().toISOString(),
      };

      await existingTransaction.save({ session });
      return existingTransaction;
    }

    const [transaction] = await WalletTransaction.create(
      [
        {
          corporateId: log.corporateId,
          type: "credit",
          amount: log.amount,
          balanceBefore: corporate.walletBalance,
          balanceAfter: corporate.walletBalance,
          description: "Wallet recharge initiated",
          reference: log.orderId,
          processedBy: log.initiatedBy,
          status: RECHARGE_TRANSACTION_STATUS.PENDING,
          paymentGateway: {
            name: log.gateway,
            orderId: log.orderId,
            providerOrderId,
            state: state || "PENDING",
            eventType: "initiate",
          },
          metadata: {
            rechargeLogId: log._id,
            source: "initiate",
          },
        },
      ],
      { session },
    );

    return transaction;
  }

  async getRechargeLogOrThrow({ orderId, gateway, corporateId }) {
    const log = await this.findRechargeLog({ orderId, gateway, corporateId });

    if (!log) {
      throw new ApiError(404, "Payment order not found");
    }

    return log;
  }

  buildStatusResponse({
    log,
    transaction,
    balance,
    state,
    failureReason,
    responseCode,
    debug = {},
  }) {
    return {
      gateway: log.gateway,
      orderId: log.orderId,
      providerOrderId: log.providerOrderId,
      paymentId: log.paymentId,
      status: log.status,
      state: state || log.lastKnownState,
      amount: log.amount,
      amountInPaise: this.toPaise(log.amount),
      currency: paymentConfig.currency,
      balance,
      transactionId: transaction?._id || null,
      transactionStatus: transaction?.status || null,
      failureReason: failureReason || log.failureReason || null,
      processedAt: log.processedAt || null,
      responseCode: responseCode || null,
      debug,
    };
  }

  getDisplayName(user) {
    if (!user) {
      return "";
    }

    if (typeof user.name === "string" && user.name.trim()) {
      return user.name.trim();
    }

    const parts = [user.name?.firstName, user.name?.lastName].filter(Boolean);
    if (parts.length) {
      return parts.join(" ");
    }

    return user.email || "";
  }

  async notifyWalletRechargeSuccess({ log, transaction, balance }) {
    try {
      const [corporate, initiator] = await Promise.all([
        Corporate.findById(log.corporateId).select("corporateName"),
        User.findById(log.initiatedBy).select("email name role"),
      ]);

      notify(EVENTS.WALLET_RECHARGED, {
        corporateId: log.corporateId,
        corporateName: corporate?.corporateName || "Corporate",
        amount: transaction?.amount ?? log.amount ?? 0,
        newBalance: balance ?? transaction?.balanceAfter ?? 0,
        transactionId: transaction?._id || null,
        paymentId: transaction?.transactionId || log.paymentId || null,
        orderId: log.orderId,
        rechargedBy: this.getDisplayName(initiator) || "Travel Admin",
        initiatorUserId: initiator?._id || log.initiatedBy || null,
        initiatorEmail: initiator?.email || null,
        initiatorRole: initiator?.role || "travel-admin",
        relatedId: transaction?._id || null,
      });
    } catch (error) {
      logger.warn("Wallet recharge success notification failed", {
        orderId: log.orderId,
        message: error.message,
      });
    }
  }

  async runWithTransaction(task) {
    const session = await mongoose.startSession();

    try {
      let result;
      await session.withTransaction(async () => {
        result = await task(session);
      });
      return result;
    } catch (error) {
      const message = error?.message || "";
      const transactionUnsupported =
        message.includes("Transaction numbers are only allowed") ||
        message.includes("replica set member or mongos");

      if (!transactionUnsupported) {
        throw error;
      }

      logger.warn(
        "Mongo transactions are unavailable, retrying wallet credit without a session",
        { message },
      );

      return task(null);
    } finally {
      await session.endSession();
    }
  }

  withOptionalSession(query, session) {
    return session ? query.session(session) : query;
  }

  async creditWalletForRecharge({
    log,
    normalizedStatus,
    processedBy,
    source,
  }) {
    const executeCredit = async (session) => {
      const existingTransaction = await this.withOptionalSession(
        WalletTransaction.findOne({
          $or: [
            { transactionId: normalizedStatus.paymentId },
            {
              "paymentGateway.name": log.gateway,
              "paymentGateway.orderId": log.orderId,
              status: RECHARGE_TRANSACTION_STATUS.COMPLETED,
            },
          ],
        }).sort({ createdAt: -1 }),
        session,
      );

      const corporateQuery = this.withOptionalSession(
        Corporate.findById(log.corporateId).select("walletBalance"),
        session,
      );
      const corporate = await corporateQuery;

      if (!corporate) {
        throw new ApiError(404, "Corporate not found for payment order");
      }

      if (existingTransaction) {
        const updatedLog = await this.updateRechargeLogSuccess({
          log,
          normalizedStatus,
          balanceBefore:
            existingTransaction.balanceBefore ?? corporate.walletBalance,
          balanceAfter:
            existingTransaction.balanceAfter ?? corporate.walletBalance,
          processedBy,
          source,
          session,
        });

        return {
          log: updatedLog,
          transaction: existingTransaction,
          balance: existingTransaction.balanceAfter ?? corporate.walletBalance,
          alreadyProcessed: true,
        };
      }

      const amount = this.fromPaise(normalizedStatus.amountInPaise);
      const balanceBefore = corporate.walletBalance;
      const updatedCorporate = await this.withOptionalSession(
        Corporate.findOneAndUpdate(
          { _id: log.corporateId },
          { $inc: { walletBalance: amount } },
          { new: true },
        ),
        session,
      );

      logger.info("Wallet balance increment applied", {
        corporateId: log.corporateId?.toString?.(),
        orderId: log.orderId,
        amount,
        balanceBefore,
        balanceAfter: updatedCorporate.walletBalance,
      });

      let transaction = await this.findRechargeTransaction({
        gateway: log.gateway,
        orderId: log.orderId,
        session,
      });

      if (transaction) {
        transaction.amount = amount;
        transaction.balanceBefore = balanceBefore;
        transaction.balanceAfter = updatedCorporate.walletBalance;
        transaction.description = "Wallet recharge";
        transaction.reference = log.orderId;
        transaction.transactionId = normalizedStatus.paymentId;
        transaction.processedBy = processedBy;
        transaction.status = RECHARGE_TRANSACTION_STATUS.COMPLETED;
        transaction.paymentGateway = {
          ...transaction.paymentGateway,
          name: log.gateway,
          orderId: log.orderId,
          paymentId: normalizedStatus.paymentId,
          signature: normalizedStatus.signature,
          providerOrderId: normalizedStatus.providerOrderId,
          state: normalizedStatus.state,
          eventType: normalizedStatus.eventType,
        };
        transaction.metadata = {
          ...(transaction.metadata || {}),
          source,
          rechargeLogId: log._id,
          errorCode: normalizedStatus.errorCode,
          detailedErrorCode: normalizedStatus.detailedErrorCode,
          gatewayResponse: normalizedStatus.raw,
          creditedAt: new Date().toISOString(),
        };
        await transaction.save({ session });
      } else {
        [transaction] = await WalletTransaction.create(
          [
            {
              corporateId: corporate._id,
              type: "credit",
              amount,
              balanceBefore,
              balanceAfter: updatedCorporate.walletBalance,
              description: "Wallet recharge",
              reference: log.orderId,
              transactionId: normalizedStatus.paymentId,
              paymentGateway: {
                name: log.gateway,
                orderId: log.orderId,
                paymentId: normalizedStatus.paymentId,
                signature: normalizedStatus.signature,
                providerOrderId: normalizedStatus.providerOrderId,
                state: normalizedStatus.state,
                eventType: normalizedStatus.eventType,
              },
              processedBy,
              status: RECHARGE_TRANSACTION_STATUS.COMPLETED,
              metadata: {
                source,
                rechargeLogId: log._id,
                errorCode: normalizedStatus.errorCode,
                detailedErrorCode: normalizedStatus.detailedErrorCode,
                gatewayResponse: normalizedStatus.raw,
              },
            },
          ],
          { session },
        );
      }

      const updatedLog = await this.updateRechargeLogSuccess({
        log,
        normalizedStatus,
        balanceBefore,
        balanceAfter: updatedCorporate.walletBalance,
        processedBy,
        source,
        session,
      });

        return {
          log: updatedLog,
          transaction,
          balance: updatedCorporate.walletBalance,
          alreadyProcessed: false,
        };
      };

    try {
      const result = await this.runWithTransaction(executeCredit);
      if (!result.alreadyProcessed) {
        await this.notifyWalletRechargeSuccess({
          log: result.log,
          transaction: result.transaction,
          balance: result.balance,
        });
      }
      return result;
    } catch (error) {
      if (error?.code !== 11000) {
        throw error;
      }

      logger.warn("Duplicate wallet credit prevented by unique transactionId", {
        orderId: log.orderId,
        paymentId: normalizedStatus.paymentId,
      });

      const corporate = await Corporate.findById(log.corporateId).select(
        "walletBalance",
      );
      const transaction = await WalletTransaction.findOne({
        transactionId: normalizedStatus.paymentId,
      });

      const updatedLog = await this.updateRechargeLogSuccess({
        log,
        normalizedStatus,
        balanceBefore: transaction?.balanceBefore,
        balanceAfter: transaction?.balanceAfter || corporate?.walletBalance,
        processedBy,
        source,
      });

      return {
        log: updatedLog,
        transaction,
        balance: transaction?.balanceAfter || corporate?.walletBalance || 0,
        alreadyProcessed: true,
      };
    }
  }

  async updateRechargeLogSuccess({
    log,
    normalizedStatus,
    balanceBefore,
    balanceAfter,
    processedBy,
    source,
    session = null,
  }) {
    const update = {
      status: RECHARGE_LOG_STATUS.SUCCESS,
      paymentId: normalizedStatus.paymentId,
      providerOrderId: normalizedStatus.providerOrderId,
      lastKnownState: normalizedStatus.state,
      balanceBefore,
      balanceAfter,
      processedAt: new Date(),
      lastStatusCheckAt: new Date(),
      failureReason: null,
      metadata: this.buildRechargeLogMetadata(log.metadata, {
        processedBy: processedBy?.toString?.() || null,
        source,
        gatewayResponse: normalizedStatus.raw,
        eventType: normalizedStatus.eventType,
      }),
    };

    return this.withOptionalSession(
      WalletRechargeLog.findByIdAndUpdate(log._id, { $set: update }, { new: true }),
      session,
    );
  }

  async syncRechargeTransactionState({
    log,
    normalizedStatus,
    status,
    description,
    session = null,
  }) {
    const transaction = await this.findRechargeTransaction({
      gateway: log.gateway,
      orderId: log.orderId,
      session,
    });

    if (!transaction) {
      return null;
    }

    transaction.status = status;
    transaction.description = description || transaction.description;
    transaction.paymentGateway = {
      ...transaction.paymentGateway,
      name: log.gateway,
      orderId: log.orderId,
      paymentId: normalizedStatus.paymentId || transaction.paymentGateway?.paymentId,
      providerOrderId:
        normalizedStatus.providerOrderId || transaction.paymentGateway?.providerOrderId,
      state: normalizedStatus.state || transaction.paymentGateway?.state,
      eventType: normalizedStatus.eventType || transaction.paymentGateway?.eventType,
      signature: normalizedStatus.signature || transaction.paymentGateway?.signature,
    };
    transaction.metadata = {
      ...(transaction.metadata || {}),
      errorCode: normalizedStatus.errorCode,
      detailedErrorCode: normalizedStatus.detailedErrorCode,
      gatewayResponse: normalizedStatus.raw,
      syncedAt: new Date().toISOString(),
    };

    await transaction.save({ session });
    return transaction;
  }

  async markRechargeFailed({
    log,
    normalizedStatus,
    source,
    webhook = false,
  }) {
    const failedLog = await WalletRechargeLog.findByIdAndUpdate(
      log._id,
      {
        $set: {
          status: RECHARGE_LOG_STATUS.FAILED,
          paymentId: normalizedStatus.paymentId || log.paymentId,
          providerOrderId:
            normalizedStatus.providerOrderId || log.providerOrderId,
          lastKnownState: normalizedStatus.state || log.lastKnownState,
          failureReason:
            normalizedStatus.failureReason ||
            normalizedStatus.detailedErrorCode ||
            normalizedStatus.errorCode ||
            "Payment failed",
          webhookReceivedAt: webhook ? new Date() : log.webhookReceivedAt,
          lastStatusCheckAt: new Date(),
          metadata: this.buildRechargeLogMetadata(log.metadata, {
            source,
            gatewayResponse: normalizedStatus.raw,
            eventType: normalizedStatus.eventType,
            errorCode: normalizedStatus.errorCode,
            detailedErrorCode: normalizedStatus.detailedErrorCode,
          }),
        },
      },
      { new: true },
    );

    await this.syncRechargeTransactionState({
      log: failedLog,
      normalizedStatus,
      status: RECHARGE_TRANSACTION_STATUS.FAILED,
      description: "Wallet recharge failed",
    });

    return failedLog;
  }

  async markRechargePending({
    log,
    normalizedStatus,
    source,
    webhook = false,
  }) {
    const pendingLog = await WalletRechargeLog.findByIdAndUpdate(
      log._id,
      {
        $set: {
          status: RECHARGE_LOG_STATUS.PENDING,
          paymentId: normalizedStatus.paymentId || log.paymentId,
          providerOrderId:
            normalizedStatus.providerOrderId || log.providerOrderId,
          lastKnownState: normalizedStatus.state || log.lastKnownState,
          webhookReceivedAt: webhook ? new Date() : log.webhookReceivedAt,
          lastStatusCheckAt: new Date(),
          metadata: this.buildRechargeLogMetadata(log.metadata, {
            source,
            gatewayResponse: normalizedStatus.raw,
            eventType: normalizedStatus.eventType,
          }),
        },
      },
      { new: true },
    );

    await this.syncRechargeTransactionState({
      log: pendingLog,
      normalizedStatus,
      status: RECHARGE_TRANSACTION_STATUS.PENDING,
      description: "Wallet recharge pending verification",
    });

    return pendingLog;
  }

  normalizePhonePeStatus(statusResponse, meta = {}) {
    const paymentDetails = Array.isArray(statusResponse?.paymentDetails)
      ? statusResponse.paymentDetails
      : [];
    const latestPayment = paymentDetails.sort(
      (left, right) => (right.timestamp || 0) - (left.timestamp || 0),
    )[0];

    const state = String(statusResponse?.state || latestPayment?.state || "")
      .trim()
      .toUpperCase();

    return {
      gateway: PAYMENT_GATEWAYS.PHONEPE,
      orderId: meta.orderId,
      providerOrderId: statusResponse?.orderId,
      paymentId: latestPayment?.transactionId || statusResponse?.orderId,
      amountInPaise: Number(statusResponse?.amount || latestPayment?.amount || 0),
      state,
      eventType: meta.eventType || null,
      errorCode: latestPayment?.errorCode || statusResponse?.errorCode || null,
      detailedErrorCode:
        latestPayment?.detailedErrorCode ||
        statusResponse?.detailedErrorCode ||
        null,
      failureReason:
        latestPayment?.detailedErrorCode ||
        latestPayment?.errorCode ||
        statusResponse?.detailedErrorCode ||
        statusResponse?.errorCode ||
        null,
      raw: {
        statusResponse,
        meta,
      },
      status:
        state === "COMPLETED"
          ? RECHARGE_LOG_STATUS.SUCCESS
          : state === "FAILED"
            ? RECHARGE_LOG_STATUS.FAILED
            : RECHARGE_LOG_STATUS.PENDING,
    };
  }

  normalizeRazorpayStatus({
    orderId,
    payment,
    signature,
    source = "status_check",
  }) {
    const paymentStatus = String(payment?.status || "").trim().toLowerCase();

    return {
      gateway: PAYMENT_GATEWAYS.RAZORPAY,
      orderId,
      providerOrderId: payment?.order_id || orderId,
      paymentId: payment?.id,
      amountInPaise: Number(payment?.amount || 0),
      state: paymentStatus.toUpperCase(),
      signature,
      eventType: source,
      errorCode: payment?.error_code || null,
      detailedErrorCode: payment?.error_description || null,
      failureReason: payment?.error_description || payment?.error_code || null,
      raw: payment,
      status:
        paymentStatus === "captured"
          ? RECHARGE_LOG_STATUS.SUCCESS
          : ["failed", "refunded"].includes(paymentStatus)
            ? RECHARGE_LOG_STATUS.FAILED
            : RECHARGE_LOG_STATUS.PENDING,
    };
  }

  async applyRechargeStatus({
    gateway,
    orderId,
    corporateId,
    userId,
    normalizedStatus,
    source,
    webhook = false,
  }) {
    const lock = await this.acquireSettlementLock(gateway, orderId);

    if (lock === null) {
      await sleep(1200);

      const existingLog = await this.getRechargeLogOrThrow({
        orderId,
        gateway,
        corporateId,
      });
      const existingCorporate = await Corporate.findById(
        existingLog.corporateId,
      ).select("walletBalance");
      const existingTransaction = await this.findRechargeTransaction({
        gateway: existingLog.gateway,
        orderId: existingLog.orderId,
      });

      return this.buildStatusResponse({
        log: existingLog,
        transaction: existingTransaction,
        balance:
          existingTransaction?.balanceAfter ||
          existingCorporate?.walletBalance ||
          0,
        state: existingLog.lastKnownState,
        failureReason: existingLog.failureReason,
        debug: {
          source,
          settlement: "lock_contended",
        },
      });
    }

    try {
      const log = await this.getRechargeLogOrThrow({
        orderId,
        gateway,
        corporateId,
      });

      logger.info("Applying recharge status", {
        gateway,
        orderId,
        status: normalizedStatus.status,
        state: normalizedStatus.state,
        paymentId: normalizedStatus.paymentId,
        amountInPaise: normalizedStatus.amountInPaise,
        source,
        webhook,
      });

      if (log.status === RECHARGE_LOG_STATUS.SUCCESS) {
        const corporate = await Corporate.findById(log.corporateId).select(
          "walletBalance",
        );
        const transaction = await this.findRechargeTransaction({
          gateway: log.gateway,
          orderId: log.orderId,
        });

        return this.buildStatusResponse({
          log,
          transaction,
          balance: transaction?.balanceAfter || corporate?.walletBalance || 0,
          state: normalizedStatus.state,
          responseCode: normalizedStatus.errorCode,
          debug: {
            source,
            settlement: "already_completed",
          },
        });
      }

      if (normalizedStatus.status === RECHARGE_LOG_STATUS.SUCCESS) {
        const result = await this.creditWalletForRecharge({
          log,
          normalizedStatus,
          processedBy: userId || log.initiatedBy,
          source,
        });

        logger.info("Recharge settled successfully", {
          gateway,
          orderId,
          paymentId: normalizedStatus.paymentId,
          balance: result.balance,
          alreadyProcessed: result.alreadyProcessed,
          source,
        });

        return this.buildStatusResponse({
          log: result.log,
          transaction: result.transaction,
          balance: result.balance,
          state: normalizedStatus.state,
          responseCode: normalizedStatus.errorCode,
          debug: {
            source,
            settlement: result.alreadyProcessed ? "duplicate_guarded" : "credited",
          },
        });
      }

      if (normalizedStatus.status === RECHARGE_LOG_STATUS.FAILED) {
        const failedLog = await this.markRechargeFailed({
          log,
          normalizedStatus,
          source,
          webhook,
        });
        const corporate = await Corporate.findById(failedLog.corporateId).select(
          "walletBalance",
        );
        const transaction = await this.findRechargeTransaction({
          gateway: failedLog.gateway,
          orderId: failedLog.orderId,
        });

        logger.warn("Recharge marked failed", {
          gateway,
          orderId,
          paymentId: normalizedStatus.paymentId,
          state: normalizedStatus.state,
          failureReason: failedLog.failureReason,
          source,
        });

        return this.buildStatusResponse({
          log: failedLog,
          transaction,
          balance: corporate?.walletBalance || 0,
          state: normalizedStatus.state,
          failureReason: failedLog.failureReason,
          responseCode: normalizedStatus.errorCode,
          debug: {
            source,
            settlement: "failed",
          },
        });
      }

      const pendingLog = await this.markRechargePending({
        log,
        normalizedStatus,
        source,
        webhook,
      });
      const corporate = await Corporate.findById(pendingLog.corporateId).select(
        "walletBalance",
      );
      const transaction = await this.findRechargeTransaction({
        gateway: pendingLog.gateway,
        orderId: pendingLog.orderId,
      });

      logger.info("Recharge remains pending", {
        gateway,
        orderId,
        paymentId: normalizedStatus.paymentId,
        state: normalizedStatus.state,
        source,
      });

      return this.buildStatusResponse({
        log: pendingLog,
        transaction,
        balance: corporate?.walletBalance || 0,
        state: normalizedStatus.state,
        responseCode: normalizedStatus.errorCode,
        debug: {
          source,
          settlement: "pending",
        },
      });
    } finally {
      await this.releaseSettlementLock(lock);
    }
  }

  async initiateWalletRecharge({
    amount,
    corporateId,
    userId,
    gateway,
    customerPhone,
    customerEmail,
  }) {
    const validAmount = this.validateRechargeAmount(amount);
    const normalizedGateway = normalizeGateway(
      gateway || paymentConfig.defaultGateway,
    );
    const gatewayClient = this.getGateway(normalizedGateway);
    const bookingReference = `RECHARGE-${Date.now()}`;

    const checkoutOrder =
      normalizedGateway === PAYMENT_GATEWAYS.PHONEPE
        ? await gatewayClient.createOrder({
            amount: validAmount,
            amountInPaise: this.toPaise(validAmount),
            merchantOrderId: this.generateMerchantOrderId("PHONEPE"),
            corporateId,
            userId,
            bookingReference,
            customerPhone,
            customerEmail,
          })
        : await gatewayClient.createOrder({
            amount: validAmount,
            bookingReference,
            corporateId,
            metadata: {
              userId: userId?.toString?.() || "",
              email: customerEmail || "",
            },
          });

    logger.info("Payment initiate response received", {
      gateway: normalizedGateway,
      merchantOrderId: checkoutOrder.merchantOrderId,
      providerOrderId: checkoutOrder.providerOrderId,
      state: checkoutOrder.state,
      amountInPaise: checkoutOrder.amount,
      amount: validAmount,
    });

    const rechargeLog = await this.upsertRechargeLog({
      gateway: normalizedGateway,
      orderId: checkoutOrder.merchantOrderId,
      corporateId,
      userId,
      amount: validAmount,
      status: RECHARGE_LOG_STATUS.PENDING,
      paymentId: null,
      lastKnownState: checkoutOrder.state || "PENDING",
      metadata: {
        bookingReference,
        providerResponse: checkoutOrder.raw,
      },
      providerOrderId: checkoutOrder.providerOrderId,
      lastStatusCheckAt: new Date(),
    });

    await this.upsertPendingRechargeTransaction({
      log: rechargeLog,
      providerOrderId: checkoutOrder.providerOrderId,
      state: checkoutOrder.state || "PENDING",
    });

    if (normalizedGateway === PAYMENT_GATEWAYS.RAZORPAY) {
      return {
        gateway: normalizedGateway,
        orderId: checkoutOrder.providerOrderId,
        merchantOrderId: checkoutOrder.merchantOrderId,
        amount: checkoutOrder.amount,
        currency: checkoutOrder.currency,
        keyId: checkoutOrder.keyId,
      };
    }

    return {
      gateway: normalizedGateway,
      orderId: checkoutOrder.merchantOrderId,
      merchantOrderId: checkoutOrder.merchantOrderId,
      providerOrderId: checkoutOrder.providerOrderId,
      amount: checkoutOrder.amount,
      currency: checkoutOrder.currency,
      redirectUrl: checkoutOrder.redirectUrl,
      state: checkoutOrder.state,
      expireAt: checkoutOrder.expireAt,
    };
  }

  async verifyRazorpayRecharge({
    orderId,
    paymentId,
    signature,
    corporateId,
    userId,
  }) {
    const gatewayClient = this.getGateway(PAYMENT_GATEWAYS.RAZORPAY);
    const log = await this.getRechargeLogOrThrow({
      orderId,
      gateway: PAYMENT_GATEWAYS.RAZORPAY,
      corporateId,
    });

    const signatureValid = gatewayClient.verifyClientCallback({
      orderId,
      paymentId,
      signature,
    });

    if (!signatureValid) {
      await this.markRechargeFailed({
        log,
        normalizedStatus: {
          gateway: PAYMENT_GATEWAYS.RAZORPAY,
          paymentId,
          state: "SIGNATURE_INVALID",
          status: RECHARGE_LOG_STATUS.FAILED,
          failureReason: "Invalid Razorpay payment signature",
          raw: { orderId, paymentId },
        },
        source: "client_verification",
      });
      throw new ApiError(400, "Invalid payment signature");
    }

    let payment = await gatewayClient.fetchPayment(paymentId);

    if (payment.order_id !== orderId) {
      throw new ApiError(400, "Payment does not belong to the supplied order");
    }

    if (payment.status === "authorized") {
      payment = await gatewayClient.capturePayment(paymentId, payment.amount);
    }

    const normalizedStatus = this.normalizeRazorpayStatus({
      orderId,
      payment,
      signature,
      source: "client_verification",
    });

    return this.applyRechargeStatus({
      gateway: PAYMENT_GATEWAYS.RAZORPAY,
      orderId,
      corporateId,
      userId,
      normalizedStatus,
      source: "client_verification",
    });
  }

  async verifyPhonePeRecharge({
    orderId,
    corporateId,
    userId,
    source = "client_verification",
    attempts = PHONEPE_VERIFY_ATTEMPTS,
  }) {
    const rechargeLog = await this.getRechargeLogOrThrow({
      orderId,
      gateway: PAYMENT_GATEWAYS.PHONEPE,
      corporateId,
    });

    let latestStatusResponse = null;
    let normalizedStatus = null;
    let performedAttempts = 0;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      performedAttempts = attempt;
      latestStatusResponse = await this.getGateway(
        PAYMENT_GATEWAYS.PHONEPE,
      ).getOrderStatus(orderId, true);

      normalizedStatus = this.normalizePhonePeStatus(latestStatusResponse, {
        orderId,
      });

      logger.info("PhonePe verify response received", {
        merchantOrderId: orderId,
        providerOrderId: latestStatusResponse?.orderId,
        transactionId: normalizedStatus.paymentId,
        state: normalizedStatus.state,
        responseCode: normalizedStatus.errorCode,
        amountInPaise: normalizedStatus.amountInPaise,
        attempt,
        source,
      });

      if (PHONEPE_TERMINAL_STATES.has(normalizedStatus.state)) {
        break;
      }

      if (attempt < attempts) {
        await sleep(PHONEPE_VERIFY_RETRY_MS);
      }
    }

    if (!normalizedStatus) {
      throw new ApiError(502, "Unable to verify PhonePe payment status");
    }

    const statusResult = await this.applyRechargeStatus({
      gateway: PAYMENT_GATEWAYS.PHONEPE,
      orderId,
      corporateId,
      userId,
      normalizedStatus,
      source,
    });

    return {
      ...statusResult,
      providerState: normalizedStatus.state,
      verifyAttempts: performedAttempts,
      logId: rechargeLog._id,
    };
  }

  async getRechargeStatus({ orderId, gateway, corporateId, userId }) {
    const rechargeLog = gateway
      ? await this.getRechargeLogOrThrow({ orderId, gateway, corporateId })
      : await this.getRechargeLogOrThrow({ orderId, corporateId });

    const resolvedGateway = normalizeGateway(gateway || rechargeLog.gateway);

    if (resolvedGateway === PAYMENT_GATEWAYS.PHONEPE) {
      return this.verifyPhonePeRecharge({
        orderId,
        corporateId,
        userId,
        source: "status_check",
        attempts: 1,
      });
    }

    const orderStatus = await this.getGateway(
      PAYMENT_GATEWAYS.RAZORPAY,
    ).getOrderStatus(orderId);

    if (!orderStatus.latestPayment) {
      return this.applyRechargeStatus({
        gateway: PAYMENT_GATEWAYS.RAZORPAY,
        orderId,
        corporateId,
        userId,
        normalizedStatus: {
          gateway: PAYMENT_GATEWAYS.RAZORPAY,
          orderId,
          paymentId: null,
          amountInPaise: orderStatus.order?.amount || 0,
          state: String(orderStatus.order?.status || "CREATED").toUpperCase(),
          status: RECHARGE_LOG_STATUS.PENDING,
          raw: orderStatus,
        },
        source: "status_check",
      });
    }

    const normalizedStatus = this.normalizeRazorpayStatus({
      orderId,
      payment: orderStatus.latestPayment,
      source: "status_check",
    });

    return this.applyRechargeStatus({
      gateway: PAYMENT_GATEWAYS.RAZORPAY,
      orderId,
      corporateId,
      userId,
      normalizedStatus,
      source: "status_check",
    });
  }

  async handlePhonePeWebhook({ authorization, rawBody }) {
    if (!authorization) {
      throw new ApiError(401, "Missing PhonePe authorization header");
    }

    if (!rawBody) {
      throw new ApiError(400, "Missing PhonePe callback payload");
    }

    const callback = this.getGateway(PAYMENT_GATEWAYS.PHONEPE).validateCallback({
      authorization,
      responseBody: rawBody,
    });

    logger.info("PhonePe webhook payload received", {
      authorizationPresent: Boolean(authorization),
      payload: rawBody,
    });

    const orderId =
      callback?.payload?.originalMerchantOrderId ||
      callback?.payload?.merchantOrderId;
    if (!orderId) {
      throw new ApiError(400, "PhonePe callback missing merchant order id");
    }

    const statusResponse = {
      orderId: callback.payload.orderId,
      amount: callback.payload.amount,
      state: callback.payload.state,
      errorCode: callback.payload.errorCode,
      detailedErrorCode: callback.payload.detailedErrorCode,
      paymentDetails: callback.payload.paymentDetails || [],
    };

    const normalizedStatus = this.normalizePhonePeStatus(statusResponse, {
      orderId,
      eventType: callback.type,
      callback,
    });

    logger.info("PhonePe webhook normalized", {
      merchantOrderId: orderId,
      transactionId: normalizedStatus.paymentId,
      state: normalizedStatus.state,
      responseCode: normalizedStatus.errorCode,
      amountInPaise: normalizedStatus.amountInPaise,
    });

    return this.applyRechargeStatus({
      gateway: PAYMENT_GATEWAYS.PHONEPE,
      orderId,
      normalizedStatus,
      source: "webhook",
      webhook: true,
    });
  }

  async recoverPendingPhonePeRecharges(limit = 25) {
    const pendingLogs = await WalletRechargeLog.find({
      gateway: PAYMENT_GATEWAYS.PHONEPE,
      status: RECHARGE_LOG_STATUS.PENDING,
      lastStatusCheckAt: {
        $lte: new Date(Date.now() - PHONEPE_VERIFY_RETRY_MS),
      },
    })
      .sort({ lastStatusCheckAt: 1 })
      .limit(limit);

    logger.info("Pending PhonePe recharge recovery started", {
      pendingCount: pendingLogs.length,
    });

    for (const log of pendingLogs) {
      try {
        await this.verifyPhonePeRecharge({
          orderId: log.orderId,
          corporateId: log.corporateId,
          userId: log.initiatedBy,
          source: "recovery_job",
          attempts: 1,
        });
      } catch (error) {
        logger.error("Pending PhonePe recharge recovery failed", {
          orderId: log.orderId,
          message: error.message,
        });
      }
    }
  }

  async createOrder(amount, bookingReference, corporateId) {
    return this.getGateway(PAYMENT_GATEWAYS.RAZORPAY).createOrder({
      amount,
      bookingReference,
      corporateId,
    });
  }

  verifyPaymentSignature(orderId, paymentId, signature) {
    return this.getGateway(PAYMENT_GATEWAYS.RAZORPAY).verifyClientCallback({
      orderId,
      paymentId,
      signature,
    });
  }

  async capturePayment(paymentId, amount) {
    return this.getGateway(PAYMENT_GATEWAYS.RAZORPAY).capturePayment(
      paymentId,
      this.toPaise(amount),
    );
  }

  async refundPayment(paymentId, amount) {
    return this.getGateway(PAYMENT_GATEWAYS.RAZORPAY).refundPayment(
      paymentId,
      this.toPaise(amount),
    );
  }

  async processBookingPayment({ booking, corporate }) {
    const amount = booking.pricingSnapshot.totalAmount;

    if (corporate.classification === "prepaid") {
      if (corporate.walletBalance < amount) {
        throw new ApiError(400, "Insufficient wallet balance");
      }

      const existingWalletDebit = await WalletTransaction.findOne({
        corporateId: corporate._id,
        bookingId: booking._id,
        type: "debit",
        status: "completed",
      });

      if (existingWalletDebit) {
        return { method: "wallet", alreadyProcessed: true };
      }

      const balanceBefore = corporate.walletBalance;
      corporate.walletBalance -= amount;
      await corporate.save();

      // ── WALLET LOW ALERT (e.g., if balance falls below 10,000 INR) ──
      const THRESHOLD = 10000;
      if (corporate.walletBalance < THRESHOLD && balanceBefore >= THRESHOLD) {
        notify(EVENTS.WALLET_LOW, {
          corporateId: corporate._id,
          corporateName: corporate.corporateName,
          currentBalance: corporate.walletBalance,
          threshold: THRESHOLD,
        });
      }

      await WalletTransaction.create({
        corporateId: corporate._id,
        bookingId: booking._id,
        bookingModel: booking.constructor.modelName || "BookingRequest",
        type: "debit",
        amount,
        balanceBefore,
        balanceAfter: corporate.walletBalance,
        description: booking.bookingType === 'flight' ? "Wallet debited for flight booking" : "Wallet debited for booking",
        status: "completed",
      });

      if (booking.payment !== undefined) {
        booking.payment = {
          ...booking.payment,
          method: "wallet",
          status: "completed",
          paidAt: new Date(),
        };
      }

      if (booking.paymentDetails !== undefined) {
        booking.paymentDetails = {
          ...booking.paymentDetails,
          method: "wallet",
          paymentStatus: "completed",
          paidAt: new Date(),
        };
      }

      await booking.save();
      return { method: "wallet" };
    }

    if (corporate.classification === "postpaid") {
      const existingLedgerEntry = await Ledger.findOne({
        bookingId: booking._id,
        type: "booking",
        transactionType: "debit",
      });

      if (existingLedgerEntry) {
        return { method: "agency", alreadyProcessed: true };
      }

      const env = process.env.TBO_ENV || "live";
      const balance = await getAgencyBalance(env);

      if (balance.availableBalance < amount) {
        throw new ApiError(400, "Insufficient agency balance");
      }
      
      // Update the local currentCredit in Corporate document to match Ledger
      corporate.currentCredit += amount;
      await corporate.save();

      const utilizationPercent = Math.round((corporate.currentCredit / corporate.creditLimit) * 100);

      if (utilizationPercent >= 100) {
        notify(EVENTS.CREDIT_LIMIT_EXCEEDED, {
          corporateId: corporate._id,
          corporateName: corporate.corporateName,
          totalLimit: corporate.creditLimit,
          usedAmount: corporate.currentCredit,
        });
      } else if (utilizationPercent >= 80) { // e.g. 80% threshold
        // We only notify if we just crossed 80%, to avoid spam. But doing it every time for now or we can assume it's okay.
        notify(EVENTS.CREDIT_LIMIT_LOW, {
          corporateId: corporate._id,
          corporateName: corporate.corporateName,
          totalLimit: corporate.creditLimit,
          usedAmount: corporate.currentCredit,
          availableCredit: corporate.creditLimit - corporate.currentCredit,
          utilizationPercent,
        });
      }

      await Ledger.create({
        corporateId: corporate._id,
        userId: booking.userId,
        bookingId: booking._id,
        bookingModel: booking.constructor.modelName || (booking.bookingType === "hotel" ? "HotelBookingRequest" : "BookingRequest"),
        bookingReference: booking.bookingReference,
        amount,
        type: "booking",
        transactionType: "debit",
        bookingDate: new Date(),
        status: "billed",
        description: `${
          booking.bookingType === "hotel" ? "Hotel" : "Flight"
        } booking on credit (postpaid)`,
        metadata: {
          bookingType: booking.bookingType,
          flightNumber: booking.flightNumber,
          sector: booking.route,
          hotelName:
            booking.hotelRequest?.HotelName || booking.hotelRequest?.hotelName,
          city: booking.hotelRequest?.CityName || booking.hotelRequest?.city,
        },
      });

      if (booking.payment !== undefined) {
        booking.payment = {
          ...booking.payment,
          method: "postpaid",
          status: "completed",
          paidAt: new Date(),
        };
      }

      if (booking.paymentDetails !== undefined) {
        booking.paymentDetails = {
          ...booking.paymentDetails,
          method: "postpaid",
          paymentStatus: "completed",
          paidAt: new Date(),
        };
      }

      await booking.save();
      return { method: "agency" };
    }

    throw new ApiError(400, "Invalid corporate classification");
  }
}

module.exports = new PaymentService();
