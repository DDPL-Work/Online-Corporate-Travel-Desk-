const { razorpay, config } = require("../config/payment.config");
const crypto = require("crypto");
const logger = require("../utils/logger");
const ApiError = require("../utils/ApiError");
const WalletTransaction = require("../models/Wallet")

class PaymentService {
  async createOrder(amount, bookingReference, corporateId) {
    try {
      const options = {
        amount: Math.round(amount * 100),
        currency: config.currency,
        receipt: `${config.receiptPrefix}${bookingReference}`,
        notes: {
          corporateId: corporateId.toString(),
          bookingReference,
        },
      };

      return await razorpay.orders.create(options);
    } catch (error) {
      logger.error("Razorpay Create Order Error:", error);
      throw new ApiError(500, "Failed to create payment order");
    }
  }

  verifyPaymentSignature(orderId, paymentId, signature) {
    if (!process.env.RAZORPAY_KEY_SECRET) {
      throw new ApiError(500, "Razorpay key secret not configured");
    }

    const body = `${orderId}|${paymentId}`;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    return expectedSignature === signature;
  }

  async capturePayment(paymentId, amount) {
    try {
      return await razorpay.payments.capture(
        paymentId,
        Math.round(amount * 100),
      );
    } catch (error) {
      logger.error("Razorpay Capture Payment Error:", error);
      throw new ApiError(500, "Failed to capture payment");
    }
  }

  async processBookingPayment({ booking, corporate }) {
    const amount = booking.pricingSnapshot.totalAmount;

    // PREPAID (Wallet)
    if (corporate.classification === "prepaid") {
      if (corporate.walletBalance < amount) {
        throw new ApiError(400, "Insufficient wallet balance");
      }

      const balanceBefore = corporate.walletBalance;
      corporate.walletBalance -= amount;
      await corporate.save();

      await WalletTransaction.create({
        corporateId: corporate._id,
        bookingId: booking._id,
        type: "debit",
        amount,
        balanceBefore,
        balanceAfter: corporate.walletBalance,
        description: "Wallet debited for flight booking",
        status: "completed",
      });

      return { method: "wallet" };
    }

    // POSTPAID (Agency)
    if (corporate.classification === "postpaid") {
      const balance = await getAgencyBalance("live");

      if (balance.availableBalance < amount) {
        throw new ApiError(400, "Insufficient agency balance");
      }

      await Ledger.create({
        bookingId: booking._id,
        amount,
        type: "debit_confirmed",
      });

      return { method: "agency" };
    }
  }

  async refundPayment(paymentId, amount) {
    try {
      return await razorpay.payments.refund(paymentId, {
        amount: Math.round(amount * 100),
      });
    } catch (error) {
      logger.error("Razorpay Refund Error:", error);
      throw new ApiError(500, "Failed to process refund");
    }
  }
}

module.exports = new PaymentService();
