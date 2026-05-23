// server/src/services/email.service.js
// Email Provider Switcher

const sendgridService = require('./sendgrid.service');
const mailgunService = require('./mailgun.service');
const logger = require('../utils/logger');

const provider = (process.env.EMAIL_PROVIDER || 'mailgun').toLowerCase();

if (provider === 'mailgun') {
  logger.info('📧 Using Mailgun as the Email Provider');
  module.exports = mailgunService;
} else {
  logger.info('📧 Using SendGrid as the Email Provider');
  module.exports = sendgridService;
}
