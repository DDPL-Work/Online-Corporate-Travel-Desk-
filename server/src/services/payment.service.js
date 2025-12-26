const { razorpay, config } = require('../config/payment.config');
const crypto = require('crypto');
const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');

class PaymentService {
  async createOrder(amount, bookingReference, corporateId) {
    try {
      const options = {
        amount: Math.round(amount * 100),
        currency: config.currency,
        receipt: `${config.receiptPrefix}${bookingReference}`,
        notes: {
          corporateId: corporateId.toString(),
          bookingReference
        }
      };

      return await razorpay.orders.create(options);
    } catch (error) {
      logger.error('Razorpay Create Order Error:', error);
      throw new ApiError(500, 'Failed to create payment order');
    }
  }

  verifyPaymentSignature(orderId, paymentId, signature) {
    if (!process.env.RAZORPAY_KEY_SECRET) {
      throw new ApiError(500, "Razorpay key secret not configured");
    }

    const body = `${orderId}|${paymentId}`;

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    return expectedSignature === signature;
  }

  async capturePayment(paymentId, amount) {
    try {
      return await razorpay.payments.capture(
        paymentId,
        Math.round(amount * 100)
      );
    } catch (error) {
      logger.error('Razorpay Capture Payment Error:', error);
      throw new ApiError(500, 'Failed to capture payment');
    }
  }

  async refundPayment(paymentId, amount) {
    try {
      return await razorpay.payments.refund(paymentId, {
        amount: Math.round(amount * 100)
      });
    } catch (error) {
      logger.error('Razorpay Refund Error:', error);
      throw new ApiError(500, 'Failed to process refund');
    }
  }
}

module.exports = new PaymentService();
