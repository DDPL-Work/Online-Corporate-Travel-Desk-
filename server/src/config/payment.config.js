const Razorpay = require("razorpay");
const { Env } = require("@phonepe-pg/pg-sdk-node");

const PAYMENT_GATEWAYS = Object.freeze({
  RAZORPAY: "razorpay",
  PHONEPE: "phonepe",
});

const DEFAULT_CURRENCY = "INR";
const DEFAULT_RECHARGE_MIN_AMOUNT = 100;

const normalizeGateway = (gateway) => {
  const normalized = String(gateway || PAYMENT_GATEWAYS.PHONEPE)
    .trim()
    .toLowerCase();

  if (Object.values(PAYMENT_GATEWAYS).includes(normalized)) {
    return normalized;
  }

  return PAYMENT_GATEWAYS.PHONEPE;
};

const normalizePhonePeEnv = (env) =>
  String(env || "SANDBOX").trim().toUpperCase() === Env.PRODUCTION
    ? Env.PRODUCTION
    : Env.SANDBOX;

const razorpayConfig = {
  keyId: process.env.RAZORPAY_KEY_ID,
  keySecret: process.env.RAZORPAY_KEY_SECRET,
  webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
  currency: DEFAULT_CURRENCY,
  receiptPrefix: "ORDER_",
  enabled: Boolean(
    process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET,
  ),
};

const phonepeConfig = {
  clientId: process.env.PHONEPE_CLIENT_ID,
  clientSecret: process.env.PHONEPE_CLIENT_SECRET,
  clientVersion: Number(process.env.PHONEPE_CLIENT_VERSION || 1),
  env: normalizePhonePeEnv(process.env.PHONEPE_ENV),
  redirectUrl: process.env.PHONEPE_REDIRECT_URL,
  callbackUrl: process.env.PHONEPE_CALLBACK_URL,
  callbackUsername: process.env.PHONEPE_CALLBACK_USERNAME,
  callbackPassword: process.env.PHONEPE_CALLBACK_PASSWORD,
  currency: DEFAULT_CURRENCY,
  minAmount: DEFAULT_RECHARGE_MIN_AMOUNT,
  enabled: Boolean(
    process.env.PHONEPE_CLIENT_ID &&
      process.env.PHONEPE_CLIENT_SECRET &&
      process.env.PHONEPE_REDIRECT_URL &&
      process.env.PHONEPE_CALLBACK_URL &&
      process.env.PHONEPE_CALLBACK_USERNAME &&
      process.env.PHONEPE_CALLBACK_PASSWORD,
  ),
};

const razorpay = razorpayConfig.enabled
  ? new Razorpay({
      key_id: razorpayConfig.keyId,
      key_secret: razorpayConfig.keySecret,
    })
  : null;

const paymentConfig = {
  defaultGateway: normalizeGateway(
    process.env.DEFAULT_PAYMENT_GATEWAY || PAYMENT_GATEWAYS.PHONEPE,
  ),
  currency: DEFAULT_CURRENCY,
  minRechargeAmount: Number(
    process.env.MIN_WALLET_RECHARGE_AMOUNT || DEFAULT_RECHARGE_MIN_AMOUNT,
  ),
  gateways: {
    [PAYMENT_GATEWAYS.RAZORPAY]: razorpayConfig,
    [PAYMENT_GATEWAYS.PHONEPE]: phonepeConfig,
  },
};

const isGatewayEnabled = (gateway) =>
  Boolean(paymentConfig.gateways[normalizeGateway(gateway)]?.enabled);

module.exports = {
  PAYMENT_GATEWAYS,
  paymentConfig,
  razorpay,
  razorpayConfig,
  phonepeConfig,
  normalizeGateway,
  isGatewayEnabled,
};