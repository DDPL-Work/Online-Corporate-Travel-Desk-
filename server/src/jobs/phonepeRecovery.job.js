const cron = require("node-cron");
const config = require("../config");
const logger = require("../utils/logger");
const paymentService = require("../services/payment.service");

const recoverPendingPhonePeRecharges = async () => {
  try {
    await paymentService.recoverPendingPhonePeRecharges();
  } catch (error) {
    logger.error("PhonePe recovery job failed", {
      message: error.message,
      stack: error.stack,
    });
  }
};

const startPhonePeRecoveryJob = () => {
  cron.schedule(
    config.cronJobs.phonePeRecoverySchedule,
    recoverPendingPhonePeRecharges,
  );

  logger.info(
    `PhonePe recovery job scheduled: ${config.cronJobs.phonePeRecoverySchedule}`,
  );
};

module.exports = {
  startPhonePeRecoveryJob,
};
