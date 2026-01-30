const { startCreditAlertJob } = require("./creditAlert.job");
const { startBookingReminderJob } = require("./bookingReminder.job");
const { startLccTicketPollingJob } = require("./lccTicketPolling.job");
const logger = require("../utils/logger");

const start = () => {
  try {
    startCreditAlertJob();
    startBookingReminderJob();
    startLccTicketPollingJob(); // ✅ ADD THIS LINE

    logger.info("All cron jobs started successfully");
  } catch (error) {
    logger.error("Error starting cron jobs:", error);
  }
};

module.exports = { start };
