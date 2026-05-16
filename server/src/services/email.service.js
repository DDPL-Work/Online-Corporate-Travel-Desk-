// server/src/services/email.service.js
// Powered by SendGrid

const sgMail = require('@sendgrid/mail');
const logger = require('../utils/logger');

// Initialize SendGrid with API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@traveamer.com';
const FROM_NAME = process.env.EMAIL_FROM_NAME || 'Traveamer';

class EmailService {
  // -----------------------------------------------------
  // SEND EMAIL - REUSABLE CORE FUNCTION
  // -----------------------------------------------------
  async sendEmail(options) {
    try {
      const msg = {
        from: {
          email: FROM_EMAIL,
          name: FROM_NAME,
        },
        to: options.to,
        subject: options.subject,
        html: options.html,
      };

      if (options.attachments && options.attachments.length > 0) {
        msg.attachments = options.attachments.map((att) => ({
          content: att.content,
          filename: att.filename,
          type: att.type || 'application/octet-stream',
          disposition: 'attachment',
        }));
      }

      const [response] = await sgMail.send(msg);

      // ── EMAIL SENT LOG ──────────────────────────────────
      console.log(
        `\n📧 [EMAIL SENT]`,
        `\n   To      : ${options.to}`,
        `\n   Subject : ${options.subject}`,
        `\n   Status  : ${response.statusCode} (SendGrid)`,
        `\n   From    : ${FROM_NAME} <${FROM_EMAIL}>`,
        `\n   Time    : ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST\n`
      );
      logger.info(`[EMAIL SENT] to=${options.to} | subject="${options.subject}" | status=${response.statusCode}`);

      return response;
    } catch (error) {
      // ── EMAIL FAILURE LOG ────────────────────────────────
      console.error(
        `\n❌ [EMAIL FAILED]`,
        `\n   To      : ${options.to}`,
        `\n   Subject : ${options.subject}`,
        `\n   Error   : ${error?.response?.body?.errors?.[0]?.message || error.message}\n`
      );
      logger.error(`[EMAIL FAILED] to=${options.to} | subject="${options.subject}" | error=${error.message}`);
      throw error;
    }
  }

  // -----------------------------------------------------
  // BOOKING CONFIRMATION EMAIL
  // -----------------------------------------------------
  async sendBookingConfirmation(booking, user) {
    const subject = `Booking Confirmation - ${booking.bookingReference}`;
    const html = `
      <div style="font-family:'Segoe UI',Arial,sans-serif; max-width:600px; margin:0 auto; color:#333;">
        <div style="background:#000D26; padding:28px 30px; border-radius:10px 10px 0 0; text-align:center;">
          <h1 style="color:#C9A84C; margin:0; font-size:24px;">Traveamer</h1>
        </div>
        <div style="padding:30px; border:1px solid #eee; border-radius:0 0 10px 10px;">
          <h2 style="color:#16a34a;">✅ Booking Confirmed!</h2>
          <p>Dear ${user.name?.firstName || user.fullName || 'Traveller'},</p>
          <p>Your booking has been confirmed successfully.</p>
          <div style="background:#f9fafb; padding:20px; margin:20px 0; border-radius:10px; border:1px solid #e5e7eb;">
            <h3 style="margin-top:0; color:#000D26;">Booking Details</h3>
            <p><strong>Reference:</strong> ${booking.bookingReference || 'N/A'}</p>
            ${booking.orderId ? `<p><strong>Order ID:</strong> ${booking.orderId}</p>` : ''}
            <p><strong>Type:</strong> ${booking.bookingType || 'N/A'}</p>
          </div>
          <p style="color:#666; font-size:13px;">Thank you for travelling with Traveamer.</p>
        </div>
      </div>
    `;
    return this.sendEmail({ to: user.email, subject, html });
  }

  // -----------------------------------------------------
  // APPROVAL REQUEST EMAIL (SENT TO APPROVER)
  // -----------------------------------------------------
  async sendApprovalRequest(approval, requester, approver) {
    const subject = `Travel Approval Request - ${approval.bookingDetails?.destination || 'New Booking'}`;
    const html = `
      <div style="font-family:'Segoe UI',Arial,sans-serif; max-width:600px; margin:0 auto; color:#333;">
        <div style="background:#000D26; padding:28px 30px; border-radius:10px 10px 0 0; text-align:center;">
          <h1 style="color:#C9A84C; margin:0; font-size:24px;">Traveamer</h1>
        </div>
        <div style="padding:30px; border:1px solid #eee; border-radius:0 0 10px 10px;">
          <h2 style="color:#0A4D68;">Travel Approval Request</h2>
          <p>Dear ${approver.fullName || approver.name || 'Manager'},</p>
          <p><strong>${requester.fullName || requester.name || 'An employee'}</strong> has requested approval for a travel booking.</p>
          <div style="background:#f9fafb; padding:20px; margin:20px 0; border-radius:10px; border:1px solid #e5e7eb;">
            <p><strong>Destination:</strong> ${approval.bookingDetails?.destination || 'N/A'}</p>
            <p><strong>Travel Date:</strong> ${approval.bookingDetails?.travelDate ? new Date(approval.bookingDetails.travelDate).toLocaleDateString() : 'N/A'}</p>
            <p><strong>Amount:</strong> ₹${approval.bookingDetails?.amount?.toLocaleString() || 'N/A'}</p>
            <p><strong>Purpose:</strong> ${approval.bookingDetails?.purposeOfTravel || 'N/A'}</p>
          </div>
          <div style="text-align:center; margin:25px 0;">
            <a href="${process.env.FRONTEND_URL}/approvals/${approval._id}"
               style="background:#0A4D68; color:#fff; padding:12px 28px; text-decoration:none; border-radius:8px; font-weight:700; display:inline-block;">
              Review Request
            </a>
          </div>
        </div>
      </div>
    `;
    return this.sendEmail({ to: approver.email, subject, html });
  }

  // -----------------------------------------------------
  // APPROVAL RESULT EMAIL (REQUESTER)
  // -----------------------------------------------------
  async sendApprovalNotification(approval, requester, status) {
    const subject = `Travel Request ${status} - ${approval.bookingDetails?.destination || 'Booking'}`;
    const isApproved = status === 'Approved';
    const color = isApproved ? '#16a34a' : '#dc2626';
    const icon = isApproved ? '✅' : '❌';
    const html = `
      <div style="font-family:'Segoe UI',Arial,sans-serif; max-width:600px; margin:0 auto; color:#333;">
        <div style="background:#000D26; padding:28px 30px; border-radius:10px 10px 0 0; text-align:center;">
          <h1 style="color:#C9A84C; margin:0; font-size:24px;">Traveamer</h1>
        </div>
        <div style="padding:30px; border:1px solid #eee; border-radius:0 0 10px 10px;">
          <h2 style="color:${color};">${icon} Travel Request ${status}</h2>
          <p>Dear ${requester.fullName || requester.name || 'Traveller'},</p>
          <p>Your travel request has been <strong style="color:${color};">${status.toLowerCase()}</strong>.</p>
          <div style="background:#f9fafb; padding:20px; margin:20px 0; border-radius:10px; border:1px solid #e5e7eb;">
            <p><strong>Destination:</strong> ${approval.bookingDetails?.destination || 'N/A'}</p>
            <p><strong>Travel Date:</strong> ${approval.bookingDetails?.travelDate ? new Date(approval.bookingDetails.travelDate).toLocaleDateString() : 'N/A'}</p>
            ${approval.approverComments ? `<p><strong>Comments:</strong> ${approval.approverComments}</p>` : ''}
          </div>
          ${isApproved ? `<p style="color:#16a34a; font-weight:600;">You may now proceed with booking.</p>` : ''}
        </div>
      </div>
    `;
    return this.sendEmail({ to: requester.email, subject, html });
  }

  // -----------------------------------------------------
  // CORPORATE ONBOARDING (AFTER APPROVAL)
  // -----------------------------------------------------
  async sendCorporateOnboarding(corporate) {
    const subject = 'Welcome to Traveamer — Your Corporate Portal is Live!';
    const to = corporate.primaryContact?.email;

    if (!to) {
      logger.error('Cannot send onboarding email: primaryContact email missing');
      return;
    }

    const html = `
      <div style="font-family:'Segoe UI',Arial,sans-serif; max-width:600px; margin:0 auto; color:#333; line-height:1.6;">
        <div style="background:#000D26; padding:30px; text-align:center; border-radius:10px 10px 0 0;">
          <h1 style="color:#C9A84C; margin:0; font-family:'Outfit',sans-serif;">Welcome to Traveamer</h1>
        </div>
        <div style="padding:30px; border:1px solid #eee; border-radius:0 0 10px 10px;">
          <h2 style="color:#000D26;">🎉 Activation Successful!</h2>
          <p>Dear ${corporate.primaryContact.name},</p>
          <p>Your corporate account for <strong>${corporate.corporateName}</strong> has been successfully <strong>activated</strong> by our team.</p>

          <div style="background:#f9fafb; padding:20px; margin:20px 0; border-radius:12px; border:1px solid #e5e7eb;">
            <h3 style="color:#000D26; margin-top:0; font-size:16px;">Portal Configuration</h3>
            <p style="margin:5px 0;"><strong>Classification:</strong> ${corporate.classification?.toUpperCase() || 'N/A'}</p>
            <p style="margin:5px 0;"><strong>SSO System:</strong> ${corporate.ssoConfig?.type?.toUpperCase() || 'N/A'}</p>
            <p style="margin:5px 0;"><strong>Allowed Domain:</strong> @${corporate.ssoConfig?.domain || 'N/A'}</p>
          </div>

          <p>Your employees can now log in to the portal using their corporate SSO credentials.</p>

          <div style="text-align:center; margin:30px 0;">
            <p style="margin-bottom:15px; font-weight:bold; color:#000D26;">Access your branded portal at:</p>
            <a href="${corporate.corporateUrl}"
               style="background:#C9A84C; color:#000D26; padding:14px 30px; text-decoration:none; border-radius:8px; display:inline-block; font-weight:800; font-size:16px; border:1px solid #b38e36;">
              Open Corporate Portal
            </a>
            <p style="margin-top:15px; font-size:12px; color:#666;">
              URL: <a href="${corporate.corporateUrl}" style="color:#C9A84C;">${corporate.corporateUrl}</a>
            </p>
          </div>

          <div style="background:#fffbeb; padding:15px; border-radius:8px; border-left:4px solid #f59e0b; font-size:14px;">
            <strong>Note:</strong> Logins are restricted to your corporate domain (@${corporate.ssoConfig?.domain || 'N/A'}).
          </div>

          <p style="margin-top:25px; font-size:14px; color:#666;">
            If you have any questions, please contact our support team.
          </p>
        </div>
      </div>
    `;

    logger.info(`Attempting to send onboarding email to: ${to}`);
    return this.sendEmail({ to, subject, html });
  }

  // -----------------------------------------------------
  // CREDIT ALERT EMAIL
  // -----------------------------------------------------
  async sendCreditAlert(corporate, utilizationPercent) {
    const subject = `⚠️ Credit Alert: ${utilizationPercent}% Utilized — ${corporate.corporateName}`;
    const html = `
      <div style="font-family:'Segoe UI',Arial,sans-serif; max-width:600px; margin:0 auto; color:#333;">
        <div style="background:#000D26; padding:28px 30px; border-radius:10px 10px 0 0; text-align:center;">
          <h1 style="color:#C9A84C; margin:0; font-size:24px;">Traveamer</h1>
        </div>
        <div style="padding:30px; border:1px solid #eee; border-radius:0 0 10px 10px;">
          <h2 style="color:#f59e0b;">⚠️ Credit Utilization Alert</h2>
          <p>Dear ${corporate.primaryContact?.name || 'Admin'},</p>
          <p>Your credit usage has reached <strong style="color:#dc2626;">${utilizationPercent}%</strong>.</p>
          <div style="background:#fff3cd; padding:20px; margin:20px 0; border-radius:10px; border-left:5px solid #f59e0b;">
            <p><strong>Credit Limit:</strong> ₹${(corporate.creditLimit || 0).toLocaleString()}</p>
            <p><strong>Used:</strong> ₹${(corporate.currentCredit || 0).toLocaleString()}</p>
            <p><strong>Available:</strong> ₹${((corporate.creditLimit || 0) - (corporate.currentCredit || 0)).toLocaleString()}</p>
          </div>
          <p>Please settle outstanding dues or contact us to increase your credit limit.</p>
        </div>
      </div>
    `;
    return this.sendEmail({ to: corporate.primaryContact?.email, subject, html });
  }

  // -----------------------------------------------------
  // OPS TEAM WELCOME EMAIL
  // -----------------------------------------------------
  async sendOpsWelcomeEmail(opsMember, password) {
    const subject = 'Welcome to the Traveamer OPS Team';
    const html = `
      <div style="font-family:'Segoe UI',Arial,sans-serif; max-width:600px; margin:0 auto; padding:20px; border:1px solid #f0f0f0; border-radius:10px;">
        <div style="background:#000D26; padding:24px; border-radius:8px 8px 0 0; text-align:center;">
          <h1 style="color:#C9A84C; margin:0; font-size:22px;">Traveamer OPS</h1>
        </div>
        <div style="padding:24px;">
          <h2 style="color:#0A4D68;">Welcome, ${opsMember.name}!</h2>
          <p>You have been added as a <strong>${opsMember.role}</strong> to the OPS Team.</p>
          <div style="background:#f9f9f9; padding:20px; margin:20px 0; border-radius:8px; border:1px solid #e5e7eb;">
            <h3 style="margin-top:0; color:#000D26;">Your Login Credentials</h3>
            <p><strong>Email:</strong> ${opsMember.email}</p>
            <p><strong>Password:</strong> <code style="background:#e5e7eb; padding:2px 8px; border-radius:4px;">${password}</code></p>
            <p><strong>Department:</strong> ${opsMember.department}</p>
          </div>
          <p>Please log in to the admin panel to get started.</p>
          <p style="color:#dc2626; font-size:13px; font-weight:600;">🔒 Please change your password after your first login.</p>
        </div>
      </div>
    `;
    return this.sendEmail({ to: opsMember.email, subject, html });
  }

  // -----------------------------------------------------
  // EMPLOYEE WELCOME / INVITE EMAIL
  // -----------------------------------------------------
  async sendEmployeeWelcomeEmail({ email, name, password, corporateName, loginUrl }) {
    const subject = `You're Invited to ${corporateName}'s Travel Portal — Traveamer`;
    const html = `
      <div style="font-family:'Segoe UI',Arial,sans-serif; max-width:600px; margin:0 auto; color:#333;">
        <div style="background:#000D26; padding:28px 30px; border-radius:10px 10px 0 0; text-align:center;">
          <h1 style="color:#C9A84C; margin:0; font-size:24px;">Traveamer</h1>
        </div>
        <div style="padding:30px; border:1px solid #eee; border-radius:0 0 10px 10px;">
          <h2 style="color:#0A4D68;">Welcome, ${name}! 👋</h2>
          <p>You've been added to <strong>${corporateName}</strong>'s corporate travel portal on Traveamer.</p>

          <div style="background:#f9fafb; padding:20px; margin:20px 0; border-radius:10px; border:1px solid #e5e7eb;">
            <h3 style="margin-top:0; color:#000D26;">Your Login Details</h3>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Temporary Password:</strong> <code style="background:#e5e7eb; padding:2px 8px; border-radius:4px;">${password}</code></p>
          </div>

          <div style="text-align:center; margin:25px 0;">
            <a href="${loginUrl || process.env.FRONTEND_URL}"
               style="background:#C9A84C; color:#000D26; padding:12px 28px; text-decoration:none; border-radius:8px; font-weight:700; display:inline-block;">
              Login to Portal
            </a>
          </div>

          <p style="color:#dc2626; font-size:13px; font-weight:600;">🔒 Please change your password after your first login.</p>
        </div>
      </div>
    `;
    return this.sendEmail({ to: email, subject, html });
  }
  // -----------------------------------------------------
  // LOGIN SUCCESS EMAIL
  // -----------------------------------------------------
  async sendLoginSuccessEmail({ email, name, role, loginTime, ipAddress }) {
    const subject = '🔐 New Login to Your Traveamer Account';
    const formattedRole = role
      ? role.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      : 'User';

    const formattedTime = loginTime
      ? new Date(loginTime).toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          dateStyle: 'full',
          timeStyle: 'short',
        })
      : new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'short' });

    const html = `
      <div style="font-family:'Segoe UI',Arial,sans-serif; max-width:600px; margin:0 auto; color:#333;">

        <!-- Header -->
        <div style="background:#000D26; padding:28px 30px; border-radius:10px 10px 0 0; text-align:center;">
          <h1 style="color:#C9A84C; margin:0; font-size:26px; letter-spacing:1px;">Traveamer</h1>
          <p style="color:#aab4c8; margin:6px 0 0; font-size:13px;">Corporate Travel Management</p>
        </div>

        <!-- Body -->
        <div style="padding:32px 30px; border:1px solid #e5e7eb; border-top:none; border-radius:0 0 10px 10px; background:#fff;">

          <h2 style="margin-top:0; color:#0A4D68; font-size:20px;">Successful Login Detected</h2>

          <p style="margin:0 0 16px;">Hi <strong>${name || email}</strong>,</p>
          <p style="color:#444; line-height:1.6;">
            We detected a new login to your <strong>Traveamer</strong> account. Here are the details:
          </p>

          <!-- Info Card -->
          <div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:10px; padding:20px; margin:20px 0;">
            <table style="width:100%; border-collapse:collapse; font-size:14px;">
              <tr>
                <td style="padding:8px 4px; color:#6b7280; width:40%;"><strong>👤 Account</strong></td>
                <td style="padding:8px 4px; color:#111;">${email}</td>
              </tr>
              <tr style="background:#f3f4f6;">
                <td style="padding:8px 4px; color:#6b7280;"><strong>🏷️ Role</strong></td>
                <td style="padding:8px 4px; color:#111;">${formattedRole}</td>
              </tr>
              <tr>
                <td style="padding:8px 4px; color:#6b7280;"><strong>🕐 Time</strong></td>
                <td style="padding:8px 4px; color:#111;">${formattedTime} IST</td>
              </tr>
              ${ipAddress ? `
              <tr style="background:#f3f4f6;">
                <td style="padding:8px 4px; color:#6b7280;"><strong>🌐 IP Address</strong></td>
                <td style="padding:8px 4px; color:#111;">${ipAddress}</td>
              </tr>` : ''}
            </table>
          </div>

          <!-- Security notice -->
          <div style="background:#fef9ec; border-left:4px solid #C9A84C; padding:14px 18px; border-radius:6px; font-size:13px; color:#555; line-height:1.6;">
            <strong>⚠️ Wasn't you?</strong><br/>
            If you did not initiate this login, please change your password immediately and contact our support team.
          </div>

          <p style="margin-top:24px; font-size:13px; color:#9ca3af; text-align:center;">
            This is an automated security notification from Traveamer.<br/>
            Please do not reply to this email.
          </p>
        </div>

        <!-- Footer -->
        <div style="text-align:center; padding:16px; font-size:11px; color:#9ca3af;">
          © ${new Date().getFullYear()} Traveamer — Corporate Travel Desk
        </div>

      </div>
    `;

    // ── LOGIN EMAIL LOG ──────────────────────────────────
    console.log(
      `\n🔐 [LOGIN EMAIL]`,
      `\n   To      : ${email}`,
      `\n   Name    : ${name || 'N/A'}`,
      `\n   Role    : ${role || 'N/A'}`,
      `\n   IP      : ${ipAddress || 'Unknown'}`,
      `\n   Time    : ${formattedTime} IST\n`
    );

    return this.sendEmail({ to: email, subject, html });
  }
}

module.exports = new EmailService();