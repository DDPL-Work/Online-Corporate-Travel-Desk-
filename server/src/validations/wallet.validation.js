const Joi = require("joi");

const gateway = Joi.string().valid("razorpay", "phonepe").default("phonepe");

module.exports = {
  initiateRecharge: Joi.object({
    amount: Joi.number().positive().precision(2).required(),
    gateway,
    returnUrl: Joi.string().optional(),
  }),

  verifyPayment: Joi.object({
    gateway: Joi.string().valid("razorpay").default("razorpay"),
    orderId: Joi.string().trim().required(),
    paymentId: Joi.string().trim().required(),
    signature: Joi.string().trim().required(),
  }),

  verifyPhonePePayment: Joi.object({
    orderId: Joi.string().trim().required(),
  }),
};
