const { razorpay, config } = require('../config/payment.config');
const crypto = require('crypto');
const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');

class PaymentService {
  async createOrder(amount, bookingReference, corporateId) {
    try {
      const options = {
        amount: Math.round(amount * 100), // Convert to paise
        currency: config.currency,
        receipt: `${config.receiptPrefix}${bookingReference}`,
        notes: {
          corporateId: corporateId.toString(),
          bookingReference
        }
      };

      const order = await razorpay.orders.create(options);
      return order;
    } catch (error) {
      logger.error('Razorpay Create Order Error:', error);
      throw new ApiError(500, 'Failed to create payment order');
    }
  }

  verifyPaymentSignature(orderId, paymentId, signature) {
    const body = orderId + '|' + paymentId;
    const expectedSignature = crypto
      .createHmac('sha256', config.config.keySecret)
      .update(body)
      .digest('hex');

    return expectedSignature === signature;
  }

  async capturePayment(paymentId, amount) {
    try {
      const capture = await razorpay.payments.capture(paymentId, Math.round(amount * 100));
      return capture;
    } catch (error) {
      logger.error('Razorpay Capture Payment Error:', error);
      throw new ApiError(500, 'Failed to capture payment');
    }
  }

  async refundPayment(paymentId, amount) {
    try {
      const refund = await razorpay.payments.refund(paymentId, {
        amount: Math.round(amount * 100)
      });
      return refund;
    } catch (error) {
      logger.error('Razorpay Refund Error:', error);
      throw new ApiError(500, 'Failed to process refund');
    }
  }
}

module.exports = new PaymentService();