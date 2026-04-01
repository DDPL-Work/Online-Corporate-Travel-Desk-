// server/src/services/email.service.js

const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });
  }

  // -----------------------------------------------------
  // SEND EMAIL - REUSABLE CORE FUNCTION
  // -----------------------------------------------------
  async sendEmail(options) {
    try {
      const mailOptions = {
        from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        attachments: options.attachments || []
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log("Email info:", info);
      logger.info(`Email sent: ${info.messageId}`);

      return info;
    } catch (error) {
      logger.error("Email sending error:", error);
      throw error;
    }
  }

  // -----------------------------------------------------
  // BOOKING CONFIRMATION EMAIL
  // -----------------------------------------------------
  async sendBookingConfirmation(booking, user) {
    const subject = `Booking Confirmation - ${booking.bookingReference}`;
    const html = `
      <div style="font-family: Arial; max-width: 600px; margin: 0 auto;">
        <h2>Booking Confirmed!</h2>
        <p>Dear ${user.fullName},</p>
        <p>Your booking has been confirmed successfully.</p>

        <div style="background: #f5f5f5; padding: 15px; margin-top: 20px;">
          <h3>Booking Details</h3>
          <p><strong>Booking Reference:</strong> ${booking.bookingReference}</p>
          <p><strong>Type:</strong> ${booking.bookingType}</p>
          <p><strong>Amount:</strong> ₹${booking.pricing.totalAmount}</p>
        </div>

        <p>Thank you for using our service.</p>
      </div>
    `;

    return await this.sendEmail({ to: user.email, subject, html });
  }

  // -----------------------------------------------------
  // APPROVAL REQUEST EMAIL (SENT TO APPROVER)
  // -----------------------------------------------------
  async sendApprovalRequest(approval, requester, approver) {
    const subject = `Travel Approval Request - ${approval.bookingDetails.destination}`;
    const html = `
      <div style="font-family: Arial; max-width: 600px; margin: 0 auto;">
        <h2>Travel Approval Request</h2>
        <p>Dear ${approver.fullName},</p>

        <p>${requester.fullName} has requested approval for:</p>

        <div style="background: #f5f5f5; padding: 15px; margin: 20px 0;">
          <p><strong>Destination:</strong> ${approval.bookingDetails.destination}</p>
          <p><strong>Travel Date:</strong> ${new Date(approval.bookingDetails.travelDate).toLocaleDateString()}</p>
          <p><strong>Amount:</strong> ₹${approval.bookingDetails.amount}</p>
          <p><strong>Purpose:</strong> ${approval.bookingDetails.purposeOfTravel}</p>
        </div>

        <a href="${process.env.FRONTEND_URL}/approvals/${approval._id}"
           style="background:#4CAF50; color:white; padding:10px 20px; text-decoration:none; border-radius:5px;">
           Review Request
        </a>
      </div>
    `;

    return await this.sendEmail({ to: approver.email, subject, html });
  }

  // -----------------------------------------------------
  // APPROVAL RESULT EMAIL (REQUESTER)
  // -----------------------------------------------------
  async sendApprovalNotification(approval, requester, status) {
    const subject = `Travel Request ${status} - ${approval.bookingDetails.destination}`;
    const color = status === "Approved" ? "#4CAF50" : "#f44336";

    const html = `
      <div style="font-family: Arial; max-width: 600px; margin: 0 auto;">
        <h2 style="color:${color};">Travel Request ${status}</h2>
        <p>Dear ${requester.fullName},</p>

        <p>Your travel request has been <strong>${status.toLowerCase()}</strong>.</p>

        <div style="background:#f5f5f5;padding:15px;margin-top:20px;">
          <p><strong>Destination:</strong> ${approval.bookingDetails.destination}</p>
          <p><strong>Travel Date:</strong> ${new Date(approval.bookingDetails.travelDate).toLocaleDateString()}</p>
          ${approval.approverComments ? `<p><strong>Comments:</strong> ${approval.approverComments}</p>` : ""}
        </div>

        ${status === "Approved" ? `<p>You may now proceed with booking.</p>` : ""}
      </div>
    `;

    return await this.sendEmail({ to: requester.email, subject, html });
  }

  // -----------------------------------------------------
  // CORPORATE ONBOARDING (AFTER APPROVAL)
  // -----------------------------------------------------
  async sendCorporateOnboarding(corporate, token) {
    const subject = "Welcome to Corporate Travel Desk";
    const setPasswordUrl = `${process.env.FRONTEND_URL}/set-password/${token}`;

    const html = `
      <div style="font-family: Arial; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to Corporate Travel Desk!</h2>

        <p>Dear ${corporate.primaryContact.name},</p>

        <p>Your corporate account has now been <strong>activated</strong>.</p>

        <div style="background:#f5f5f5;padding:15px;margin:20px 0;">
          <h3>Corporate Details</h3>
          <p><strong>Name:</strong> ${corporate.corporateName}</p>
          <p><strong>Classification:</strong> ${corporate.classification}</p>
          <p><strong>SSO Domain:</strong> ${corporate.ssoConfig.domain}</p>
        </div>

        <p>Your employees may login using:</p>
        <ul>
          <li>✔ SSO (${corporate.ssoConfig.type})</li>
          <li>✔ Password (after setting it)</li>
        </ul>

        <p><strong>Your account requires password setup before login:</strong></p>

        <a href="${setPasswordUrl}" 
           style="background:#4CAF50;color:white;padding:10px 20px;
                  text-decoration:none;border-radius:5px;display:inline-block;margin-top:10px;">
          Set Password
        </a>

        <p style="margin-top:10px;color:#888;">
          This link will expire in 24 hours.
        </p>

        <p>If you prefer, you may log in directly using your corporate SSO system.</p>
      </div>
    `;

    return await this.sendEmail({
      to: corporate.primaryContact.email,
      subject,
      html
    });
  }

  // -----------------------------------------------------
  // CREDIT ALERT EMAIL
  // -----------------------------------------------------
  async sendCreditAlert(corporate, utilizationPercent) {
    const subject = `Credit Alert: ${utilizationPercent}% Utilized`;

    const html = `
      <div style="font-family: Arial; max-width: 600px; margin: 0 auto;">
        <h2 style="color:#ff9800;">Credit Utilization Alert</h2>

        <p>Dear ${corporate.primaryContact.name},</p>
        <p>Your credit usage has reached <strong>${utilizationPercent}%</strong>.</p>

        <div style="background:#fff3cd;padding:15px;margin-top:20px;border-left:5px solid #ff9800;">
          <p><strong>Credit Limit:</strong> ₹${corporate.creditLimit.toLocaleString()}</p>
          <p><strong>Used:</strong> ₹${corporate.currentCredit.toLocaleString()}</p>
          <p><strong>Available:</strong> ₹${(corporate.creditLimit - corporate.currentCredit).toLocaleString()}</p>
        </div>

        <p>Please settle dues or increase your credit limit if needed.</p>
      </div>
    `;

    return await this.sendEmail({
      to: corporate.primaryContact.email,
      subject,
      html
    });
  }
}

module.exports = new EmailService();
 