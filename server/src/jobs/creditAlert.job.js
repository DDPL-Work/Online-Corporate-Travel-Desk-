const cron = require('node-cron');
const Corporate = require('../models/Corporate');
const notificationService = require('../services/notification.service');
const config = require('../config');
const logger = require('../utils/logger');

const checkCreditUtilization = async () => {
  try {
    logger.info('Running credit utilization check...');

    const postpaidCorporates = await Corporate.find({
      classification: 'postpaid',
      status: 'active',
      isActive: true
    });

    for (const corporate of postpaidCorporates) {
      const utilization = corporate.creditUtilization;

      if (utilization >= config.creditAlert.criticalPercent) {
        await notificationService.sendCreditAlerts(corporate, utilization);
        logger.warn(`Critical credit alert sent to ${corporate.corporateName}: ${utilization}%`);
      } else if (utilization >= config.creditAlert.thresholdPercent) {
        await notificationService.sendCreditAlerts(corporate, utilization);
        logger.info(`Credit alert sent to ${corporate.corporateName}: ${utilization}%`);
      }
    }

    logger.info('Credit utilization check completed');
  } catch (error) {
    logger.error('Error in credit utilization check:', error);
  }
};

const startCreditAlertJob = () => {
  cron.schedule(config.cronJobs.creditAlertSchedule, checkCreditUtilization);
  logger.info(`Credit alert job scheduled: ${config.cronJobs.creditAlertSchedule}`);
};

module.exports = { startCreditAlertJob, checkCreditUtilization };