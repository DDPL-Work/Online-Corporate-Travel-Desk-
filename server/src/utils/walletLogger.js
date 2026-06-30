const WalletRechargeLog = require("../models/WalletActivityLog");

exports.createRechargeLog = async ({
  corporateId,
  userId,
  amount,
  gateway = "razorpay",
  status,
  orderId,
  paymentId,
  providerOrderId,
  lastKnownState,
  failureReason,
  balanceBefore,
  balanceAfter,
  metadata,
}) => {
  return WalletRechargeLog.create({
    corporateId,
    initiatedBy: userId,
    amount,
    gateway,
    status,
    orderId,
    paymentId,
    providerOrderId,
    lastKnownState,
    failureReason,
    balanceBefore,
    balanceAfter,
    metadata,
  });
};
