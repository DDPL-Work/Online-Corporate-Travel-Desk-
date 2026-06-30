// server/src/notifications/templates/email.templates.js
// HTML email templates for every notification event

const EVENTS = require('../../events/eventConstants');

const base = (content) => `
<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;color:#333;">
  <div style="background:#000D26;padding:24px 30px;border-radius:10px 10px 0 0;text-align:center;">
    <h1 style="color:#C9A84C;margin:0;font-size:24px;letter-spacing:1px;">Traveamer</h1>
    <p style="color:#aab4c8;margin:4px 0 0;font-size:12px;">Corporate Travel Management</p>
  </div>
  <div style="padding:28px 30px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px;background:#fff;">
    ${content}
    <p style="margin-top:24px;font-size:12px;color:#9ca3af;text-align:center;">
      This is an automated notification from Traveamer. Please do not reply.
    </p>
  </div>
  <div style="text-align:center;padding:12px;font-size:11px;color:#9ca3af;">
    © ${new Date().getFullYear()} Traveamer — Corporate Travel Desk
  </div>
</div>`;

const card = (rows) => `
<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:18px;margin:16px 0;">
  <table style="width:100%;border-collapse:collapse;font-size:14px;">
    ${rows.map((r, i) => `
    <tr ${i % 2 === 1 ? 'style="background:#f3f4f6;"' : ''}>
      <td style="padding:7px 4px;color:#6b7280;width:40%;"><strong>${r[0]}</strong></td>
      <td style="padding:7px 4px;color:#111;">${r[1]}</td>
    </tr>`).join('')}
  </table>
</div>`;

const btn = (href, label, color = '#0A4D68') =>
  `<div style="text-align:center;margin:22px 0;">
    <a href="${href}" style="background:${color};color:#fff;padding:12px 28px;text-decoration:none;border-radius:8px;font-weight:700;display:inline-block;">${label}</a>
  </div>`;

const alert = (msg) =>
  `<div style="background:#fffbeb;border-left:4px solid #C9A84C;padding:12px 16px;border-radius:6px;font-size:13px;color:#555;margin:16px 0;">${msg}</div>`;

// ─────────────────────────────────────────────────────────────
// TEMPLATE REGISTRY
// ─────────────────────────────────────────────────────────────
const templates = {

  // ── CORPORATE_REGISTERED ────────────────────────────────
  // Sent to super admin + ops members with manage_corporates permission
  [EVENTS.CORPORATE_REGISTERED]: (d) => ({
    subject: `🏢 New Corporate Registration — ${d.corporateName} (Pending Review)`,
    html: base(`
      <h2 style="color:#000D26;">New Corporate Registration</h2>
      <p>Dear Admin,</p>
      <p>A new corporate account has been registered and is <strong>pending your review</strong>.</p>
      ${card([
        ['Corporate Name', d.corporateName || 'N/A'],
        ['Classification', d.classification?.toUpperCase() || 'N/A'],
        ['Primary Contact', d.primaryContactEmail || 'N/A'],
        ['Registered At', new Date().toLocaleString()],
      ])}
      ${btn(`${process.env.SUPER_ADMIN_URL || process.env.FRONTEND_URL}/corporates`, 'Review Corporate', '#C9A84C')}
      ${alert('Please review and approve or reject this registration at your earliest convenience.')}
    `),
  }),

  // ── CORPORATE_APPROVED ──────────────────────────────────
  [EVENTS.CORPORATE_APPROVED]: (d) => ({
    subject: `🎉 Welcome to Traveamer — Your Corporate Portal is Live!`,
    html: base(`
      <h2 style="color:#000D26;">Activation Successful!</h2>
      <p>Dear ${d.contactName},</p>
      <p>Your corporate account for <strong>${d.corporateName}</strong> has been activated.</p>
      ${card([
        ['Classification', d.classification?.toUpperCase() || 'N/A'],
        ['SSO Domain', `@${d.domain || 'N/A'}`],
        ['Credit Limit', d.creditLimit ? `₹${Number(d.creditLimit).toLocaleString()}` : 'Prepaid'],
        ['Credit Cycle', d.creditCycle || 'N/A'],
        ['Service Charges', d.serviceCharges ? `${d.serviceCharges}%` : 'N/A'],
      ])}
      ${btn(d.corporateUrl, 'Open Corporate Portal', '#C9A84C')}
      ${alert('Logins are restricted to your corporate SSO domain.')}
    `),
  }),

  [EVENTS.CORPORATE_APPROVED_BY_OPS]: (d) => ({
    subject: `🏢 Corporate Approved — ${d.corporateName}`,
    html: base(`
      <h2 style="color:#000D26;">Corporate Approval Action</h2>
      <p>Dear Super Admin,</p>
      <p>An OPS team member has approved a new corporate account.</p>
      ${card([
        ['Corporate Name', d.corporateName],
        ['Approved By', d.opsMemberName],
        ['Classification', d.classification?.toUpperCase() || 'N/A'],
        ['Approval Date', new Date().toLocaleString()],
      ])}
      ${btn(`${process.env.SUPER_ADMIN_URL}/corporates`, 'View Corporate Details', '#C9A84C')}
    `),
  }),

  [EVENTS.CORPORATE_UPDATED_BY_OPS]: (d) => {
    if (d.recipientRole === 'super-admin') {
      return {
        subject: `📝 Corporate Updated — ${d.corporateName}`,
        html: base(`
          <h2 style="color:#000D26;">Corporate Update Action</h2>
          <p>Dear Super Admin,</p>
          <p>An OPS team member has modified a corporate account.</p>
          ${card([
            ['Corporate Name', d.corporateName],
            ['Updated By', d.opsMemberName],
            ['Update Date', new Date().toLocaleString()],
          ])}
          ${btn(`${process.env.SUPER_ADMIN_URL}/corporates`, 'View Corporate Details', '#C9A84C')}
        `),
      };
    }
    return {
      subject: `📝 Your Corporate Profile has been Updated`,
      html: base(`
        <h2 style="color:#000D26;">Profile Update Notification</h2>
        <p>Dear ${d.contactName || 'Corporate Admin'},</p>
        <p>Your corporate profile for <strong>${d.corporateName}</strong> has been updated by the Traveamer OPS team.</p>
        ${card([
          ['Company', d.corporateName],
          ['Update Date', new Date().toLocaleString()],
        ])}
        <p>If you have any questions regarding these changes, please contact our support team.</p>
        ${btn(`${process.env.FRONTEND_URL}/login`, 'Go to Portal', '#C9A84C')}
      `),
    };
  },

  // ── WALLET_RECHARGED ────────────────────────────────────
  [EVENTS.WALLET_RECHARGED]: (d) => ({
    subject: `💰 Wallet Recharged — ₹${Number(d.amount).toLocaleString()} Added`,
    html: base(`
      <h2 style="color:#16a34a;">💰 Wallet Recharged</h2>
      <p>Dear Admin,</p>
      ${card([
        ['Amount Added', `₹${Number(d.amount).toLocaleString()}`],
        ['New Balance', `₹${Number(d.newBalance).toLocaleString()}`],
        ['Transaction ID', d.transactionId || 'N/A'],
        ['Recharged By', d.rechargedBy || 'System'],
      ])}
    `),
  }),

  // ── WALLET_LOW ──────────────────────────────────────────
  [EVENTS.WALLET_LOW]: (d) => ({
    subject: `⚠️ Low Wallet Balance Alert — ${d.corporateName}`,
    html: base(`
      <h2 style="color:#dc2626;">⚠️ Wallet Balance Low</h2>
      <p>Dear Admin,</p>
      <p>Your wallet balance has dropped below the threshold limit.</p>
      ${card([
        ['Current Balance', `₹${Number(d.currentBalance).toLocaleString()}`],
        ['Threshold', `₹${Number(d.threshold).toLocaleString()}`],
      ])}
      ${alert('Please recharge your wallet to avoid booking disruptions.')}
    `),
  }),

  // ── CREDIT_LIMIT_LOW ────────────────────────────────────
  [EVENTS.CREDIT_LIMIT_LOW]: (d) => ({
    subject: `🔴 Credit Alert: ${d.utilizationPercent}% Utilized — ${d.corporateName}`,
    html: base(`
      <h2 style="color:#dc2626;">Credit Utilization Alert</h2>
      <p>Dear Admin,</p>
      <p>Credit usage has reached <strong>${d.utilizationPercent}%</strong> of the limit.</p>
      ${card([
        ['Credit Limit', `₹${Number(d.totalLimit).toLocaleString()}`],
        ['Used', `₹${Number(d.usedAmount).toLocaleString()}`],
        ['Available', `₹${Number(d.availableCredit).toLocaleString()}`],
        ['Utilization', `${d.utilizationPercent}%`],
      ])}
      ${alert('Please settle outstanding dues or contact us to raise your credit limit.')}
    `),
  }),

  // ── CREDIT_LIMIT_EXCEEDED ───────────────────────────────
  [EVENTS.CREDIT_LIMIT_EXCEEDED]: (d) => ({
    subject: `🚨 URGENT: Credit Limit Exceeded — ${d.corporateName}`,
    html: base(`
      <h2 style="color:#dc2626;">🚨 Credit Limit Exceeded</h2>
      <p>Dear Admin,</p>
      <p><strong>All new bookings have been paused</strong> as your credit limit has been exceeded.</p>
      ${card([
        ['Credit Limit', `₹${Number(d.totalLimit).toLocaleString()}`],
        ['Current Usage', `₹${Number(d.usedAmount).toLocaleString()}`],
        ['Overage', `₹${Number(d.usedAmount - d.totalLimit).toLocaleString()}`],
      ])}
      ${alert('Please clear your outstanding balance immediately to resume booking services.')}
    `),
  }),

  // ── CREDIT_CYCLE_END ────────────────────────────────────
  [EVENTS.CREDIT_CYCLE_END]: (d) => ({
    subject: `📅 Credit Cycle Ending — ${d.corporateName}`,
    html: base(`
      <h2 style="color:#f59e0b;">Credit Cycle Ending Soon</h2>
      <p>Dear Admin,</p>
      ${card([
        ['Cycle End Date', d.cycleEndDate],
        ['Total Usage This Cycle', `₹${Number(d.totalUsage).toLocaleString()}`],
        ['Outstanding Amount', `₹${Number(d.outstandingAmount).toLocaleString()}`],
      ])}
      ${alert('Please ensure all dues are cleared before the cycle ends.')}
    `),
  }),

  // ── CREDIT_CYCLE_START ──────────────────────────────────
  [EVENTS.CREDIT_CYCLE_START]: (d) => ({
    subject: `🔄 New Credit Cycle Started — ${d.corporateName}`,
    html: base(`
      <h2 style="color:#16a34a;">New Credit Cycle Started</h2>
      <p>Dear Admin,</p>
      ${card([
        ['New Cycle Start', d.newCycleStart],
        ['New Cycle End', d.newCycleEnd],
        ['Credit Limit', `₹${Number(d.creditLimit).toLocaleString()}`],
      ])}
    `),
  }),

  // ── BOOKING_REQUEST_CREATED ─────────────────────────────
  [EVENTS.BOOKING_REQUEST_CREATED]: (d) => ({
    subject: `📋 New Booking Request — ${d.orderId}`,
    html: base(`
      <h2 style="color:#0A4D68;">New Booking Request</h2>
      <p>Dear Admin,</p>
      <p><strong>${d.employeeName}</strong> has submitted a new travel booking request.</p>
      ${card([
        ['Order ID', d.orderId],
        ['Booking Type', d.bookingType?.toUpperCase() || 'N/A'],
        ['Amount', d.amount ? `₹${Number(d.amount).toLocaleString()}` : 'N/A'],
      ])}
      ${btn(`${process.env.FRONTEND_URL}/pending-requests?type=${d.bookingType}`, 'Review Request')}
    `),
  }),

  // ── BOOKING_APPROVAL_REQUIRED ───────────────────────────
  [EVENTS.BOOKING_APPROVAL_REQUIRED]: (d) => ({
    subject: `🔔 Action Required: Approve Booking ${d.orderId}`,
    html: base(`
      <h2 style="color:#0A4D68;">Booking Approval Required</h2>
      <p>Dear ${d.managerName || 'Manager'},</p>
      <p><strong>${d.employeeName}</strong> needs your approval for a booking.</p>
      ${card([
        ['Order ID', d.orderId],
        ['Type', d.bookingType?.toUpperCase() || 'N/A'],
        ['Amount', d.amount ? `₹${Number(d.amount).toLocaleString()}` : 'N/A'],
      ])}
      ${btn(`${process.env.FRONTEND_URL}/manager/pending-requests?type=${d.bookingType}`, 'Approve Now')}
    `),
  }),

  // ── BOOKING_TRANSFERRED ─────────────────────────────────
  [EVENTS.BOOKING_TRANSFERRED]: (d) => ({
    subject: `🔔 Action Required: Approve Transferred Booking ${d.orderId}`,
    html: base(`
      <h2 style="color:#0A4D68;">Booking Transferred for Approval</h2>
      <p>Dear ${d.secondApproverName || 'Approver'},</p>
      <p><strong>${d.transferredByName}</strong> has transferred <strong>${d.employeeName}</strong>'s booking to you for final approval.</p>
      ${card([
        ['Order ID', d.orderId],
        ['Type', d.bookingType?.toUpperCase() || 'N/A'],
        ['Amount', d.amount ? `₹${Number(d.amount).toLocaleString()}` : 'N/A'],
      ])}
      ${btn(`${process.env.FRONTEND_URL}/manager/pending-requests?type=${d.bookingType}`, 'Review Booking')}
    `),
  }),

  // ── BOOKING_APPROVED ────────────────────────────────────
  [EVENTS.BOOKING_APPROVED]: (d) => ({
    subject: `✅ Booking Approved — ${d.orderId}`,
    html: base(`
      <h2 style="color:#16a34a;">✅ Booking Approved!</h2>
      <p>Dear ${d.employeeName},</p>
      <p>Your booking request has been <strong style="color:#16a34a;">approved</strong>.</p>
      ${card([
        ['Order ID', d.orderId],
        ['Type', d.bookingType?.toUpperCase() || 'N/A'],
        ['Approved By', d.approverName || 'Admin'],
        ['Approver Role', d.approverRole || 'N/A'],
      ])}
      ${btn(`${process.env.FRONTEND_URL}/my-bookings?type=${d.bookingType}`, 'View Booking')}
    `),
  }),

  // ── BOOKING_REJECTED ────────────────────────────────────
  [EVENTS.BOOKING_REJECTED]: (d) => ({
    subject: `❌ Booking Rejected — ${d.orderId}`,
    html: base(`
      <h2 style="color:#dc2626;">❌ Booking Rejected</h2>
      <p>Dear ${d.employeeName},</p>
      <p>Your booking request has been <strong style="color:#dc2626;">rejected</strong>.</p>
      ${card([
        ['Order ID', d.orderId],
        ['Type', d.bookingType?.toUpperCase() || 'N/A'],
        ['Rejected By', d.approverName || 'Admin'],
        ['Reason', d.rejectionReason || 'No reason provided'],
      ])}
    `),
  }),

  // ── BOOKING_CONFIRMED ───────────────────────────────────
  [EVENTS.BOOKING_CONFIRMED]: (d) => ({
    subject: `🎫 Booking Confirmed — ${d.orderId}`,
    html: base(`
      <h2 style="color:#16a34a;">🎫 Booking Confirmed!</h2>
      <p>Dear ${d.employeeName},</p>
      <p>Your booking has been <strong>confirmed</strong> successfully.</p>
      ${card([
        ['Order ID', d.orderId],
        ['Type', d.bookingType?.toUpperCase() || 'N/A'],
        ...(d.pnr ? [['PNR', d.pnr]] : []),
        ...(d.invoiceNo ? [['Invoice No', d.invoiceNo]] : []),
      ])}
      ${btn(`${process.env.FRONTEND_URL}/my-bookings?type=${d.bookingType}`, 'View Booking')}
    `),
  }),

  // ── BOOKING_CANCELLED ───────────────────────────────────
  [EVENTS.BOOKING_CANCELLED]: (d) => ({
    subject: `🚫 Booking Cancelled — ${d.orderId}`,
    html: base(`
      <h2 style="color:#dc2626;">🚫 Booking Cancelled</h2>
      <p>Dear ${d.employeeName},</p>
      ${card([
        ['Order ID', d.orderId],
        ['Type', d.bookingType?.toUpperCase() || 'N/A'],
        ...(d.refundAmount ? [['Refund Amount', `₹${Number(d.refundAmount).toLocaleString()}`]] : []),
        ['Reason', d.cancellationReason || 'N/A'],
      ])}
    `),
  }),

  // ── BOOKING_REISSUED ────────────────────────────────────
  [EVENTS.BOOKING_REISSUED]: (d) => ({
    subject: `🔄 Booking Reissued — ${d.orderId}`,
    html: base(`
      <h2 style="color:#0A4D68;">Booking Reissued</h2>
      <p>Dear ${d.employeeName},</p>
      ${card([
        ['Order ID', d.orderId],
        ...(d.newPnr ? [['New PNR', d.newPnr]] : []),
        ['Change Details', d.changeDetails || 'N/A'],
      ])}
      ${btn(`${process.env.FRONTEND_URL}/my-bookings?type=flight`, 'View Booking')}
    `),
  }),

  [EVENTS.REISSUE_CREATED]: (d) => ({
    subject: `Reissue Request Created — ${d.reissueId}`,
    html: base(`
      <h2 style="color:#0A4D68;">Reissue Request Created</h2>
      <p>Your flight reissue request <strong>${d.reissueId}</strong> has been created.</p>
      ${btn(`${process.env.FRONTEND_URL}/my-reissued`, 'Track Reissue')}
    `),
  }),

  [EVENTS.REISSUE_ELIGIBILITY_CHECKED]: (d) => ({
    subject: `Reissue Eligibility Updated — ${d.reissueId}`,
    html: base(`
      <h2 style="color:#0A4D68;">Reissue Eligibility Checked</h2>
      <p>Reissue <strong>${d.reissueId}</strong> is now marked as <strong>${d.requestedMode || 'UNDER REVIEW'}</strong>.</p>
      ${btn(`${process.env.FRONTEND_URL}/my-reissued`, 'View Request')}
    `),
  }),

  [EVENTS.REISSUE_QUOTE_RECEIVED]: (d) => ({
    subject: `Reissue Quote Ready â€” ${d.reissueId}`,
    html: base(`
      <h2 style="color:#0A4D68;">Reissue Quote Ready</h2>
      <p>Your final fare quote for reissue <strong>${d.reissueId}</strong> is ready for confirmation.</p>
      ${btn(`${process.env.FRONTEND_URL}/my-reissued`, 'Review Quote')}
    `),
  }),

  [EVENTS.REISSUE_COMPLETED]: (d) => ({
    subject: `Reissue Completed — ${d.reissueId}`,
    html: base(`
      <h2 style="color:#16a34a;">Reissue Completed</h2>
      <p>Your reissue request <strong>${d.reissueId}</strong> has completed successfully.</p>
      ${card([
        ['Reissue ID', d.reissueId],
        ...(d.newPnr ? [['New PNR', d.newPnr]] : []),
      ])}
      ${btn(`${process.env.FRONTEND_URL}/my-reissued`, 'Open Reissue Tracker')}
    `),
  }),

  [EVENTS.REISSUE_FAILED]: (d) => ({
    subject: `Reissue Failed — ${d.reissueId}`,
    html: base(`
      <h2 style="color:#dc2626;">Reissue Failed</h2>
      <p>We could not complete reissue <strong>${d.reissueId}</strong>.</p>
      ${btn(`${process.env.FRONTEND_URL}/my-reissued`, 'Review Reissue')}
    `),
  }),

  [EVENTS.REISSUE_OPS_ASSIGNED]: (d) => ({
    subject: `Ops Assigned — ${d.reissueId}`,
    html: base(`
      <h2 style="color:#0A4D68;">Operations Assigned</h2>
      <p>An operations specialist has been assigned to reissue <strong>${d.reissueId}</strong>.</p>
      ${btn(`${process.env.FRONTEND_URL}/my-reissued`, 'Track Request')}
    `),
  }),

  [EVENTS.REISSUE_TICKET_UPLOADED]: (d) => ({
    subject: `Updated Ticket Uploaded — ${d.reissueId}`,
    html: base(`
      <h2 style="color:#0A4D68;">Updated Ticket Available</h2>
      <p>The revised ticket for reissue <strong>${d.reissueId}</strong> has been uploaded.</p>
      ${btn(`${process.env.FRONTEND_URL}/my-reissued`, 'Download Files')}
    `),
  }),

  // ── MANAGER_PROMOTION ───────────────────────────────────
  [EVENTS.OFFLINE_REISSUE_CREATED]: (d) => ({
    subject: `Offline Reissue Requested — ${d.reissueId}`,
    html: base(`
      <h2 style="color:#0A4D68;">Offline Reissue Requested</h2>
      <p>Your offline reissue request <strong>${d.reissueId}</strong> has been submitted successfully.</p>
      ${card([
        ['Status', d.status || 'RAISED'],
        ['Expected Timeline', 'Operations typically responds within 24 hours'],
      ])}
      ${btn(`${process.env.FRONTEND_URL}/my-reissued`, 'Track Request')}
    `),
  }),

  [EVENTS.OFFLINE_REISSUE_UPDATED]: (d) => {
    const status = String(d.status || 'PROCESSING');
    const subjectMap = {
      ASSIGNED: `Ops Assigned — ${d.reissueId}`,
      REJECTED: `Offline Reissue Rejected — ${d.reissueId}`,
      TICKET_GENERATED: `Reissued Ticket Ready — ${d.reissueId}`,
      COMPLETED: `Offline Reissue Completed — ${d.reissueId}`,
    };
    const titleMap = {
      ASSIGNED: 'Operations Assigned',
      REJECTED: 'Offline Reissue Rejected',
      TICKET_GENERATED: 'Reissued Ticket Ready',
      COMPLETED: 'Offline Reissue Completed',
    };
    const messageMap = {
      ASSIGNED: `An operations specialist is now handling offline reissue <strong>${d.reissueId}</strong>.`,
      REJECTED: `Offline reissue <strong>${d.reissueId}</strong> has been rejected by operations.`,
      TICKET_GENERATED: `Your reissued ticket for offline reissue <strong>${d.reissueId}</strong> is now ready to download.`,
      COMPLETED: `Offline reissue <strong>${d.reissueId}</strong> has been completed successfully.`,
    };

    return {
      subject: subjectMap[status] || `Offline Reissue Updated — ${d.reissueId}`,
      html: base(`
        <h2 style="color:#0A4D68;">${titleMap[status] || 'Offline Reissue Updated'}</h2>
        <p>${messageMap[status] || `Offline reissue <strong>${d.reissueId}</strong> moved to <strong>${status}</strong>.`}</p>
        ${card([
          ['Request ID', d.reissueId],
          ['Status', status],
        ])}
        ${btn(`${process.env.FRONTEND_URL}/my-reissued`, 'Open Reissue Tracker')}
      `),
    };
  },

  [EVENTS.OFFLINE_TICKET_GENERATED]: (d) => ({
    subject: `Reissued Ticket Ready — ${d.reissueId}`,
    html: base(`
      <h2 style="color:#0A4D68;">Reissued Ticket Available</h2>
      <p>Your reissued ticket for offline reissue <strong>${d.reissueId}</strong> is now available to download.</p>
      ${btn(`${process.env.FRONTEND_URL}/my-reissued`, 'Download Ticket')}
    `),
  }),

  [EVENTS.MANAGER_PROMOTION]: (d) => ({
    subject: `🏆 You've Been Promoted to Manager — Traveamer`,
    html: base(`
      <h2 style="color:#0A4D68;">🏆 Congratulations, ${d.name}!</h2>
      <p>You have been promoted to <strong>Manager</strong> at ${d.corporateName}.</p>
      <p>You can now approve or reject travel booking requests from your team.</p>
      ${btn(`${process.env.FRONTEND_URL}/manager-dashboard`, 'Go to Manager Dashboard', '#C9A84C')}
    `),
  }),

  // ── MANAGER_ASSIGNED_TO_EMPLOYEE ────────────────────────
  [EVENTS.MANAGER_ASSIGNED_TO_EMPLOYEE]: (d) => ({
    subject: `👤 New Team Member Assigned — ${d.employeeName}`,
    html: base(`
      <h2 style="color:#0A4D68;">New Employee Assigned to You</h2>
      <p>Dear ${d.managerName},</p>
      <p><strong>${d.employeeName}</strong> has been assigned to you for travel approvals.</p>
      ${card([
        ['Employee', d.employeeName],
        ['Email', d.employeeEmail || 'N/A'],
      ])}
      ${btn(`${process.env.FRONTEND_URL}/my-team`, 'View Your Team')}
    `),
  }),

  // ── MANAGER_REQUEST_REVIEWED ────────────────────────────
  [EVENTS.MANAGER_REQUEST_REVIEWED]: (d) => ({
    subject: d.action === 'approve'
      ? `✅ Your Manager Request Has Been Approved`
      : `❌ Your Manager Request Has Been Rejected`,
    html: base(`
      <h2 style="color:${d.action === 'approve' ? '#16a34a' : '#dc2626'};">
        ${d.action === 'approve' ? '✅ Manager Request Approved' : '❌ Manager Request Rejected'}
      </h2>
      <p>Dear ${d.name},</p>
      <p>Your manager role request has been <strong>${d.action === 'approve' ? 'approved' : 'rejected'}</strong> by the Travel Admin.</p>
      ${d.action === 'approve' ? btn(`${process.env.FRONTEND_URL}/manager-dashboard`, 'Go to Dashboard') : ''}
    `),
  }),

  // ── OPS_MEMBER_CREATED ──────────────────────────────────
  [EVENTS.OPS_MEMBER_CREATED]: (d) => ({
    subject: `Welcome to Traveamer OPS Team — Your Credentials`,
    html: base(`
      <h2 style="color:#0A4D68;">Welcome, ${d.name}!</h2>
      <p>You've been added as <strong>${d.role}</strong> to the Traveamer OPS Team.</p>
      ${card([
        ['Email', d.email],
        ['Password', d.password],
        ['Department', d.department || 'N/A'],
        ['Permissions', Array.isArray(d.permissions) ? d.permissions.join(', ') : d.permissions || 'Standard'],
      ])}
      ${btn(d.dashboardUrl || process.env.SUPER_ADMIN_URL || '#', 'Login to OPS Dashboard')}
      ${alert('🔒 Please change your password immediately after your first login.')}
    `),
  }),

  // ── OPS_LOGIN_ALERT ─────────────────────────────────────
  [EVENTS.OPS_LOGIN_ALERT]: (d) => ({
    subject: `🔑 OPS Login Alert — ${d.opsMemberName}`,
    html: base(`
      <h2 style="color:#0A4D68;">OPS Member Login Detected</h2>
      ${card([
        ['Name', d.opsMemberName],
        ['Email', d.opsMemberEmail],
        ['Login Time', d.loginTime],
        ['IP Address', d.ipAddress || 'Unknown'],
      ])}
      ${alert('If this was not expected, please review OPS access immediately.')}
    `),
  }),

  // ── OPS_PERMISSION_CHANGED ──────────────────────────────
  [EVENTS.OPS_PERMISSION_CHANGED]: (d) => ({
    subject: `🔧 Your OPS Permissions Have Been Updated`,
    html: base(`
      <h2 style="color:#0A4D68;">Permission Update</h2>
      <p>Dear ${d.name},</p>
      <p>Your OPS permissions have been updated by <strong>${d.changedBy}</strong>.</p>
      ${card([
        ['Previous Permissions', Array.isArray(d.oldPermissions) ? d.oldPermissions.join(', ') : d.oldPermissions || 'N/A'],
        ['New Permissions', Array.isArray(d.newPermissions) ? d.newPermissions.join(', ') : d.newPermissions || 'N/A'],
      ])}
    `),
  }),

  // ── SSR_POLICY_UPDATED ──────────────────────────────────
  [EVENTS.SSR_POLICY_UPDATED]: (d) => ({
    subject: `📋 Your Travel Policy Has Been Updated`,
    html: base(`
      <h2 style="color:#0A4D68;">Travel Policy Updated</h2>
      <p>Dear ${d.employeeName},</p>
      <p>Your SSR travel policy has been updated.</p>
      ${card([
        ['Policy', d.policyName || 'Default Policy'],
        ['Updated By', d.updatedBy || 'Travel Admin'],
        ['Effective Date', d.effectiveDate || 'Immediately'],
      ])}
    `),
  }),

  // ── UPCOMING_TRIP_REMINDER ──────────────────────────────
  [EVENTS.UPCOMING_TRIP_REMINDER]: (d) => ({
    subject: `✈️ Trip Reminder: Your flight to ${d.destination} is in 5 hours`,
    html: base(`
      <h2 style="color:#0A4D68;">✈️ Upcoming Trip Reminder</h2>
      <p>Dear ${d.employeeName},</p>
      <p>Your flight departs in approximately <strong>5 hours</strong>. Please prepare!</p>
      ${card([
        ['Order ID', d.orderId],
        ['From', d.origin],
        ['To', d.destination],
        ['Departure', d.departureTime],
        ...(d.pnr ? [['PNR', d.pnr]] : []),
      ])}
      ${btn(`${process.env.FRONTEND_URL}/my-bookings?type=flight`, 'View Booking Details')}
    `),
  }),

  // ── SSR_POLICY_UPDATED ──────────────────────────────────────
  [EVENTS.SSR_POLICY_UPDATED]: (d) => ({
    subject: `📋 Travel Policy Updated — ${d.policyName}`,
    html: base(`
      <h2 style="color:#0A4D68;">Your Travel Policy was Updated</h2>
      <p>Dear ${d.employeeName},</p>
      <p>Your corporate travel policy (<strong>${d.policyName}</strong>) has been updated by your administrator.</p>
      ${card([
        ['Updated By', d.updatedBy || 'Admin'],
        ['Effective Date', d.effectiveDate || 'Immediately'],
      ])}
      <p style="margin-top:20px;">Log in to your profile to view the new allowances for seat selection, meals, and baggage.</p>
      ${btn(`${process.env.FRONTEND_URL}/my-profile`, 'View Policy Details')}
    `),
  }),

  // ── EMPLOYEE_MANAGER_FIRST_APPROVAL ─────────────────────
  [EVENTS.EMPLOYEE_MANAGER_FIRST_APPROVAL]: (d) => ({
    subject: `📋 Manager Selection Request — ${d.employeeName}`,
    html: base(`
      <h2 style="color:#0A4D68;">Manager Selection Pending Review</h2>
      <p>Dear Admin,</p>
      <p><strong>${d.employeeName}</strong> has selected <strong>${d.managerName}</strong> as their approval manager.</p>
      ${card([
        ['Employee', d.employeeName],
        ['Selected Manager', d.managerName],
        ['Manager Email', d.managerEmail || 'N/A'],
      ])}
      ${btn(`${process.env.FRONTEND_URL}/manager-requests`, 'Review Request')}
    `),
  }),
};

/**
 * Get email template for a given event
 * @param {string} event
 * @param {Object} data
 * @returns {{ subject: string, html: string } | null}
 */
module.exports.getEmailTemplate = (event, data) => {
  const fn = templates[event];
  if (!fn) return null;
  try {
    return fn(data);
  } catch (err) {
    console.error(`[EMAIL TEMPLATE ERROR] event=${event}:`, err.message);
    return null;
  }
};
