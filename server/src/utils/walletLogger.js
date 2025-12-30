const WalletRechargeLog = require("../models/WalletActivityLog");

exports.createRechargeLog = async ({
  corporateId,
  userId,
  amount,
  status,
  orderId,
  paymentId,
  failureReason,
  balanceBefore,
  balanceAfter,
  metadata,
}) => {
  return WalletRechargeLog.create({
    corporateId,
    initiatedBy: userId,
    amount,
    status,
    orderId,
    paymentId,
    failureReason,
    balanceBefore,
    balanceAfter,
    metadata,
  });
};
