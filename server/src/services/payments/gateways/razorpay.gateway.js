const crypto = require("crypto");
const ApiError = require("../../../utils/ApiError");
const logger = require("../../../utils/logger");
const {
  razorpay,
  razorpayConfig,
  PAYMENT_GATEWAYS,
} = require("../../../config/payment.config");

class RazorpayGateway {
  assertConfigured() {
    if (!razorpay || !razorpayConfig.enabled) {
      throw new ApiError(503, "Razorpay gateway is not configured");
    }
  }

  async createOrder({ amount, bookingReference, corporateId, metadata = {} }) {
    this.assertConfigured();

    const options = {
      amount: Math.round(amount * 100),
      currency: razorpayConfig.currency,
      receipt: `${razorpayConfig.receiptPrefix}${bookingReference}`,
      notes: {
        corporateId: corporateId?.toString?.() || "",
        bookingReference,
        ...metadata,
      },
    };

    const order = await razorpay.orders.create(options);

    logger.info("Razorpay order created", {
      orderId: order.id,
      amount: order.amount,
      corporateId: corporateId?.toString?.(),
    });

    return {
      gateway: PAYMENT_GATEWAYS.RAZORPAY,
      merchantOrderId: order.id,
      providerOrderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: razorpayConfig.keyId,
      raw: order,
    };
  }

  verifyClientCallback({ orderId, paymentId, signature }) {
    this.assertConfigured();

    const body = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac("sha256", razorpayConfig.keySecret)
      .update(body)
      .digest("hex");

    return expectedSignature === signature;
  }

  async fetchPayment(paymentId) {
    this.assertConfigured();
    return razorpay.payments.fetch(paymentId);
  }

  async capturePayment(paymentId, amountInPaise) {
    this.assertConfigured();
    return razorpay.payments.capture(
      paymentId,
      amountInPaise,
      razorpayConfig.currency,
    );
  }

  async refundPayment(paymentId, amountInPaise) {
    this.assertConfigured();
    return razorpay.payments.refund(paymentId, {
      amount: amountInPaise,
    });
  }

  async getOrderStatus(orderId) {
    this.assertConfigured();

    const [order, paymentList] = await Promise.all([
      razorpay.orders.fetch(orderId),
      razorpay.orders.fetchPayments(orderId),
    ]);

    const payments = Array.isArray(paymentList?.items) ? paymentList.items : [];
    const latestPayment = payments.sort(
      (left, right) => (right.created_at || 0) - (left.created_at || 0),
    )[0];

    return {
      order,
      latestPayment,
      payments,
    };
  }
}

module.exports = new RazorpayGateway();
