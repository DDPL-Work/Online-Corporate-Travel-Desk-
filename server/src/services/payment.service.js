const { razorpay, config } = require("../config/payment.config");
const crypto = require("crypto");
const logger = require("../utils/logger");
const ApiError = require("../utils/ApiError");
const WalletTransaction = require("../models/Wallet");
const { getAgencyBalance } = require("./tboBalance.service");
const Ledger = require("../models/Ledger");
const { notify } = require("../notifications/orchestrator");
const EVENTS = require("../events/eventConstants");

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
        type: "debit",
        amount,
        balanceBefore,
        balanceAfter: corporate.walletBalance,
        description: "Wallet debited for booking",
        status: "completed",
      });

      // Update booking document (robustly)
      if (booking.payment !== undefined) {
        booking.payment = {
           ...booking.payment,
           method: "wallet",
           status: "completed",
           paidAt: new Date()
        };
      } 
      
      if (booking.paymentDetails !== undefined) {
        booking.paymentDetails = {
           ...booking.paymentDetails,
           method: "wallet",
           paymentStatus: "completed",
           paidAt: new Date()
        };
      }
      await booking.save();

      return { method: "wallet" };
    }

    // POSTPAID (Agency)
    if (corporate.classification === "postpaid") {
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
        userId: booking.userId, // 👈 IMPORTANT
        bookingId: booking._id,
        bookingReference: booking.bookingReference,

        amount,

        type: "booking",
        transactionType: "debit", // 👈 THIS IS KEY

        bookingDate: new Date(),

        status: "billed", // 👈 officially recorded as debt

        description: `${booking.bookingType === "hotel" ? "Hotel" : "Flight"} booking on credit (postpaid)`,

        metadata: {
          bookingType: booking.bookingType,
          flightNumber: booking.flightNumber,
          sector: booking.route,
          hotelName: booking.hotelRequest?.HotelName || booking.hotelRequest?.hotelName,
          city: booking.hotelRequest?.CityName || booking.hotelRequest?.city,
        },
      });

      // Update booking document (robustly)
      if (booking.payment !== undefined) {
        booking.payment = {
           ...booking.payment,
           method: "postpaid",
           status: "completed",
           paidAt: new Date()
        };
      } 
      
      if (booking.paymentDetails !== undefined) {
        booking.paymentDetails = {
           ...booking.paymentDetails,
           method: "postpaid",
           paymentStatus: "completed",
           paidAt: new Date()
        };
      }
      await booking.save();

      return { method: "agency" };
    }
    throw new ApiError(400, "Invalid corporate classification");
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
