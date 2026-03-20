const cron = require("node-cron");
const pollLccTickets = require("../jobs/lccTicketPolling.job");
const logger = require("../utils/logger");

// Runs every 5 minutes
cron.schedule("*/5 * * * *", async () => {
  try {
    logger.info("⏳ Running LCC ticket polling job...");
    await pollLccTickets();
    logger.info("✅ LCC ticket polling completed");
  } catch (err) {
    logger.error("❌ LCC ticket polling failed", err);
  }
});
