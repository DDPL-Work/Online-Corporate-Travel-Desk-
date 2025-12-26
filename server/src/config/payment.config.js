// config/payment.config.js

const Razorpay = require('razorpay');

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

module.exports = {
  razorpay: razorpayInstance,
  config: {
    keyId: process.env.RAZORPAY_KEY_ID,
    currency: 'INR',
    receiptPrefix: 'ORDER_',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET
  }
};