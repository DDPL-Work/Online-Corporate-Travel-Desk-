const { startCreditAlertJob } = require("./creditAlert.job");
const { startBookingReminderJob } = require("./bookingReminder.job");
const { startLccTicketPollingJob } = require("./lccTicketPolling.job");
const { startPhonePeRecoveryJob } = require("./phonepeRecovery.job");
const logger = require("../utils/logger");

const start = () => {
  try {
    startCreditAlertJob();
    startBookingReminderJob();
    startLccTicketPollingJob();
    startPhonePeRecoveryJob();

    logger.info("All cron jobs started successfully");
  } catch (error) {
    logger.error("Error starting cron jobs:", error);
  }
};

module.exports = { start };
