const {
  StandardCheckoutClient,
  StandardCheckoutPayRequest,
  MetaInfo,
  PrefillUserLoginDetails,
  Env,
} = require("@phonepe-pg/pg-sdk-node");
const ApiError = require("../../../utils/ApiError");
const logger = require("../../../utils/logger");
const {
  phonepeConfig,
  PAYMENT_GATEWAYS,
} = require("../../../config/payment.config");

class PhonePeGateway {
  constructor() {
    this.client = null;
  }

  assertConfigured() {
    if (!phonepeConfig.enabled) {
      throw new ApiError(503, "PhonePe gateway is not configured");
    }

    if (!Number.isFinite(phonepeConfig.clientVersion)) {
      throw new ApiError(500, "PhonePe client version is invalid");
    }
  }

  getClient() {
    this.assertConfigured();

    if (!this.client) {
      this.client = StandardCheckoutClient.getInstance(
        phonepeConfig.clientId,
        phonepeConfig.clientSecret,
        phonepeConfig.clientVersion,
        phonepeConfig.env === Env.PRODUCTION ? Env.PRODUCTION : Env.SANDBOX,
      );
    }

    return this.client;
  }

  buildRedirectUrl(merchantOrderId, customReturnUrl) {
    const redirectUrl = new URL(customReturnUrl || phonepeConfig.redirectUrl);
    redirectUrl.searchParams.set("merchantOrderId", merchantOrderId);
    redirectUrl.searchParams.set("gateway", PAYMENT_GATEWAYS.PHONEPE);
    return redirectUrl.toString();
  }

  buildMetaInfo({ corporateId, userId, bookingReference, gateway }) {
    return MetaInfo.builder()
      .udf1(corporateId?.toString?.() || "")
      .udf2(userId?.toString?.() || "")
      .udf3(bookingReference || "")
      .udf4(gateway || PAYMENT_GATEWAYS.PHONEPE)
      .udf5("wallet_recharge")
      .build();
  }

  async createOrder({
    amount,
    amountInPaise,
    merchantOrderId,
    corporateId,
    userId,
    bookingReference,
    customerPhone,
    returnUrl,
  }) {
    const client = this.getClient();

    const requestBuilder = StandardCheckoutPayRequest.builder()
      .merchantOrderId(merchantOrderId)
      .amount(amountInPaise)
      .metaInfo(
        this.buildMetaInfo({
          corporateId,
          userId,
          bookingReference,
          gateway: PAYMENT_GATEWAYS.PHONEPE,
        }),
      )
      .redirectUrl(this.buildRedirectUrl(merchantOrderId, returnUrl))
      .expireAfter(15 * 60);

    if (customerPhone) {
      requestBuilder.prefillUserLoginDetails(
        PrefillUserLoginDetails.builder().phoneNumber(customerPhone).build(),
      );
    }

    const response = await client.pay(requestBuilder.build());

    logger.info("PhonePe order created", {
      merchantOrderId,
      providerOrderId: response.orderId,
      amount: amountInPaise,
    });

    return {
      gateway: PAYMENT_GATEWAYS.PHONEPE,
      merchantOrderId,
      providerOrderId: response.orderId,
      amount: amountInPaise,
      currency: phonepeConfig.currency,
      redirectUrl: response.redirectUrl,
      state: response.state,
      expireAt: response.expireAt,
      raw: response,
    };
  }

  async getOrderStatus(merchantOrderId, details = true) {
    const client = this.getClient();
    return client.getOrderStatus(merchantOrderId, details);
  }

  validateCallback({ authorization, responseBody }) {
    const client = this.getClient();

    if (!phonepeConfig.callbackUsername || !phonepeConfig.callbackPassword) {
      throw new ApiError(
        500,
        "PhonePe callback username/password are not configured",
      );
    }

    return client.validateCallback(
      phonepeConfig.callbackUsername,
      phonepeConfig.callbackPassword,
      authorization,
      responseBody,
    );
  }
}

module.exports = new PhonePeGateway();
