const emailService = require('./email.service');
const logger = require('../utils/logger');

class NotificationService {
  async sendBookingNotification(booking, user, type) {
    try {
      switch (type) {
        case 'confirmation':
          await emailService.sendBookingConfirmation(booking, user);
          break;
        case 'cancellation':
          // Implement cancellation email
          break;
        default:
          break;
      }
    } catch (error) {
      logger.error('Notification Error:', error);
    }
  }

  async sendApprovalNotifications(approval, requester, approver, action) {
    try {
      if (action === 'request') {
        await emailService.sendApprovalRequest(approval, requester, approver);
      } else {
        const status = action === 'approve' ? 'Approved' : 'Rejected';
        await emailService.sendApprovalNotification(approval, requester, status);
      }
    } catch (error) {
      logger.error('Approval Notification Error:', error);
    }
  }

  async sendCreditAlerts(corporate, utilizationPercent) {
    try {
      await emailService.sendCreditAlert(corporate, utilizationPercent);
    } catch (error) {
      logger.error('Credit Alert Error:', error);
    }
  }
}

module.exports = new NotificationService();