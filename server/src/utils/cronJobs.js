const cron = require("node-cron");
const tboSyncCtrl = require("../controllers/tboSync.controller");
const { reconcileOpsCapacity } = require("../jobs/reconcileOpsCapacity.job");
const logger = require("./logger");

/**
 * Initialize all scheduled tasks
 */
const initCronJobs = () => {
  logger.info("[CRON] Initializing scheduled synchronization tasks...");

  // Schedule TBO Periodic Sync (Cities -> Hotels) at 02:00 AM every day
  cron.schedule("0 2 * * *", async () => {
    logger.info("[CRON] Starting scheduled TBO city sync...");
    const citySuccess = await tboSyncCtrl.processCitySync();
    if (citySuccess) {
      logger.info("[CRON] City sync completed. Moving to hotel sync...");
      await tboSyncCtrl.processHotelSync();
    } else {
      logger.error("[CRON] City sync failed. Skipping hotel sync for today.");
    }
  });

  // Schedule Ops capacity reconciliation at 02:00 AM every day (after TBO sync)
  cron.schedule("30 2 * * *", async () => {
    logger.info("[CRON] Starting Ops capacity reconciliation...");
    try {
      await reconcileOpsCapacity();
      logger.info("[CRON] Ops capacity reconciliation completed");
    } catch (err) {
      logger.error("[CRON] Ops capacity reconciliation failed:", err.message);
    }
  });

  logger.info("[CRON] Jobs scheduled successfully.");
};

module.exports = { initCronJobs };
