// server/src/notifications/templates/inapp.templates.js
// In-app notification message templates for every event

const EVENTS = require('../../events/eventConstants');

const templates = {

  // ── CORPORATE ─────────────────────────────────────────────
  [EVENTS.CORPORATE_APPROVED]: (d) => ({
    title: '🎉 Corporate Account Activated',
    message: `Your corporate account for ${d.corporateName} is now live. Login at your portal URL.`,
    link: d.corporateUrl,
  }),
  [EVENTS.CORPORATE_APPROVED_BY_OPS]: (d) => ({
    title: '🏢 Corporate Approved by OPS',
    message: `OPS Member ${d.opsMemberName} has approved corporate: ${d.corporateName}.`,
    link: '/super-admin/corporates',
  }),
  [EVENTS.CORPORATE_UPDATED_BY_OPS]: (d) => {
    if (d.recipientRole === 'super-admin') {
      return {
        title: '📝 Corporate Updated by OPS',
        message: `OPS Member ${d.opsMemberName} has updated corporate: ${d.corporateName} on ${new Date().toLocaleString()}.`,
        link: '/super-admin/corporates',
      };
    }
    return {
      title: '📝 Profile Updated by OPS',
      message: `Your corporate profile has been updated by the Traveamer OPS team on ${new Date().toLocaleString()}.`,
      link: '/corporate-settings',
    };
  },

  // ── WALLET / CREDIT ───────────────────────────────────────
  [EVENTS.WALLET_RECHARGED]: (d) => ({
    title: '💰 Wallet Recharged',
    message: `₹${Number(d.amount).toLocaleString()} added to wallet. New balance: ₹${Number(d.newBalance).toLocaleString()}.`,
    link: '/corporate-wallet',
  }),

  [EVENTS.WALLET_LOW]: (d) => ({
    title: '⚠️ Low Wallet Balance',
    message: `Wallet balance is ₹${Number(d.currentBalance).toLocaleString()}, below your threshold. Please recharge.`,
    link: '/wallet',
  }),

  [EVENTS.CREDIT_LIMIT_LOW]: (d) => ({
    title: '🔴 Credit Utilization Alert',
    message: `Credit usage at ${d.utilizationPercent}%. Only ₹${Number(d.availableCredit).toLocaleString()} remaining.`,
    link: '/credit-utilization',
  }),

  [EVENTS.CREDIT_LIMIT_EXCEEDED]: (d) => ({
    title: '🚨 Credit Limit Exceeded',
    message: `Credit limit exceeded. New bookings are paused until balance is cleared.`,
    link: '/credit-utilization',
  }),

  [EVENTS.CREDIT_CYCLE_END]: (d) => ({
    title: '📅 Credit Cycle Ending',
    message: `Your credit cycle ends on ${d.cycleEndDate}. Total usage: ₹${Number(d.totalUsage).toLocaleString()}.`,
    link: '/credit-utilization',
  }),

  [EVENTS.CREDIT_CYCLE_START]: (d) => ({
    title: '🔄 New Credit Cycle Started',
    message: `New credit cycle started. Limit: ₹${Number(d.creditLimit).toLocaleString()}. Valid until ${d.newCycleEnd}.`,
    link: '/credit-utilization',
  }),

  // ── BOOKING ───────────────────────────────────────────────
  [EVENTS.BOOKING_REQUEST_CREATED]: (d) => ({
    title: '📋 New Booking Request',
    message: `${d.employeeName} has submitted a new ${d.bookingType} booking request (${d.orderId}).`,
    link: `/pending-requests?type=${d.bookingType}`,
  }),

  [EVENTS.BOOKING_APPROVAL_REQUIRED]: (d) => ({
    title: '🔔 Approval Required',
    message: `${d.employeeName}'s ${d.bookingType} booking (${d.orderId}) needs your approval.`,
    link: `/manager/pending-requests?type=${d.bookingType}`,
  }),

  [EVENTS.BOOKING_TRANSFERRED]: (d) => ({
    title: '🔔 Selected as Second Approver',
    message: `${d.transferredByName} has transferred ${d.employeeName}'s ${d.bookingType} booking (${d.orderId}) to you for approval.`,
    link: `/manager/pending-requests?type=${d.bookingType}`,
  }),

  [EVENTS.BOOKING_APPROVED]: (d) => ({
    title: '✅ Booking Approved',
    message: `Your ${d.bookingType} booking (${d.orderId}) has been approved by ${d.approverName}.`,
    link: `/my-bookings?type=${d.bookingType}`,
  }),

  [EVENTS.BOOKING_REJECTED]: (d) => ({
    title: '❌ Booking Rejected',
    message: `Your ${d.bookingType} booking (${d.orderId}) was rejected. Reason: ${d.rejectionReason || 'Not specified'}.`,
    link: `/my-rejected-requests?type=${d.bookingType}`,
  }),

  [EVENTS.BOOKING_CONFIRMED]: (d) => ({
    title: '🎫 Booking Confirmed',
    message: `Your ${d.bookingType} booking (${d.orderId}) is confirmed!${d.pnr ? ` PNR: ${d.pnr}` : ''}.`,
    link: `/my-bookings?type=${d.bookingType}`,
  }),

  [EVENTS.BOOKING_CANCELLED]: (d) => ({
    title: '🚫 Booking Cancelled',
    message: `Your ${d.bookingType} booking (${d.orderId}) has been cancelled.${d.refundAmount ? ` Refund: ₹${Number(d.refundAmount).toLocaleString()}` : ''}.`,
    link: '/my-cancelled-bookings',
  }),

  [EVENTS.BOOKING_REISSUED]: (d) => ({
    title: '🔄 Booking Reissued',
    message: `Booking (${d.orderId}) has been reissued.${d.newPnr ? ` New PNR: ${d.newPnr}` : ''}.`,
    link: '/my-bookings?type=flight',
  }),

  [EVENTS.REISSUE_CREATED]: (d) => ({
    title: 'Reissue Request Created',
    message: `Reissue request ${d.reissueId} has been created in ${d.requestedMode || 'servicing'} mode.`,
    link: '/my-reissued',
  }),

  [EVENTS.REISSUE_ELIGIBILITY_CHECKED]: (d) => ({
    title: 'Reissue Eligibility Checked',
    message: `Reissue ${d.reissueId} is ${d.requestedMode === 'ONLINE' ? 'available for self-service' : 'queued for operations support'}.`,
    link: '/my-reissued',
  }),

  [EVENTS.REISSUE_SEARCH_COMPLETED]: (d) => ({
    title: 'Reissue Search Completed',
    message: `Updated flight options are ready for reissue ${d.reissueId}.`,
    link: '/my-reissued',
  }),

  [EVENTS.REISSUE_QUOTE_RECEIVED]: (d) => ({
    title: 'Reissue Quote Ready',
    message: `Final fare quote is ready for reissue ${d.reissueId}.`,
    link: '/my-reissued',
  }),

  [EVENTS.REISSUE_BILLING_RESERVED]: (d) => ({
    title: 'Internal Billing Reserved',
    message: `Internal billing reservation has been created for reissue ${d.reissueId}.`,
    link: '/my-reissued',
  }),

  [EVENTS.REISSUE_PROCESSING_STARTED]: (d) => ({
    title: 'Reissue Processing Started',
    message: `Reissue ${d.reissueId} is being processed with the supplier.`,
    link: '/my-reissued',
  }),

  [EVENTS.REISSUE_COMPLETED]: (d) => ({
    title: 'Reissue Completed',
    message: `Reissue ${d.reissueId} completed successfully.${d.newPnr ? ` New PNR: ${d.newPnr}` : ''}`,
    link: '/my-reissued',
  }),

  [EVENTS.REISSUE_FAILED]: (d) => ({
    title: 'Reissue Failed',
    message: `Reissue ${d.reissueId} could not be completed.`,
    link: '/my-reissued',
  }),

  [EVENTS.REISSUE_OPS_ASSIGNED]: (d) => ({
    title: 'Ops Assigned to Reissue',
    message: `Operations has been assigned to reissue ${d.reissueId}.`,
    link: '/reissue-requests',
  }),

  [EVENTS.REISSUE_TICKET_UPLOADED]: (d) => ({
    title: 'Revised Ticket Uploaded',
    message: `Updated ticket for reissue ${d.reissueId} is now available.`,
    link: '/my-reissued',
  }),

  [EVENTS.OFFLINE_REISSUE_CREATED]: (d) => ({
    title: 'Offline Reissue Requested',
    message: `Offline reissue ${d.reissueId} has been submitted successfully and is now queued for operations review.`,
    link: '/my-reissued',
  }),

  [EVENTS.OFFLINE_REISSUE_UPDATED]: (d) => {
    if (d.status === 'ASSIGNED') {
      return {
        title: 'Ops Assigned',
        message: `Offline reissue ${d.reissueId} is now assigned to our servicing team.`,
        link: '/my-reissued',
      };
    }

    if (d.status === 'REJECTED') {
      return {
        title: 'Offline Reissue Rejected',
        message: `Offline reissue ${d.reissueId} was rejected by operations.`,
        link: '/my-reissued',
      };
    }

    if (d.status === 'COMPLETED') {
      return {
        title: 'Offline Reissue Completed',
        message: `Offline reissue ${d.reissueId} has been completed successfully. Your reissued ticket remains available in your dashboard.`,
        link: '/my-reissued',
      };
    }

    if (d.status === 'TICKET_GENERATED') {
      return {
        title: 'Reissued Ticket Ready',
        message: `Your reissued ticket for offline reissue ${d.reissueId} is ready to download.`,
        link: '/my-reissued',
      };
    }

    return {
      title: 'Offline Reissue Updated',
      message: `Offline reissue ${d.reissueId} moved to ${String(d.status || 'processing').replace(/_/g, ' ').toLowerCase()}.`,
      link: '/my-reissued',
    };
  },

  [EVENTS.OFFLINE_TICKET_GENERATED]: (d) => ({
    title: 'Reissued Ticket Ready',
    message: `Your reissued ticket for offline reissue ${d.reissueId} is ready to download.`,
    link: '/my-reissued',
  }),

  [EVENTS.BOOKING_OFFLINE_CANCELLED]: (d) => ({
    title: '🚫 Offline Cancellation Processed',
    message: `Booking (${d.orderId}) has been cancelled offline by ${d.cancelledBy || 'Admin'}.`,
    link: '/my-cancelled-bookings',
  }),

  [EVENTS.TEAM_BOOKING_ACTIVITY]: (d) => ({
    title: `📋 Team Booking ${d.action}`,
    message: `${d.employeeName}'s ${d.bookingType} booking (${d.orderId}) has been ${d.action}.`,
    link: `/manager/team-bookings?type=${d.bookingType}`,
  }),

  [EVENTS.MANAGER_BOOKING_ACTION]: (d) => ({
    title: `📋 Manager Booking Action`,
    message: `Manager ${d.managerName} has ${d.action} booking (${d.orderId}).`,
    link: `/all-bookings?type=${d.bookingType}`,
  }),

  // ── MANAGER ───────────────────────────────────────────────
  [EVENTS.MANAGER_PROMOTION]: (d) => ({
    title: '🏆 You Are Now a Manager!',
    message: `Congratulations! You have been promoted to Manager at ${d.corporateName}.`,
    link: '/manager-dashboard',
  }),

  [EVENTS.MANAGER_ASSIGNED_TO_EMPLOYEE]: (d) => ({
    title: '👤 New Employee Assigned',
    message: `${d.employeeName} has been assigned to you for travel approvals.`,
    link: '/my-team',
  }),

  [EVENTS.MANAGER_REQUEST_REVIEWED]: (d) => ({
    title: d.action === 'approve' ? '✅ Manager Request Approved' : '❌ Manager Request Rejected',
    message: d.action === 'approve'
      ? 'Your manager role request has been approved. You can now approve bookings.'
      : 'Your manager role request has been rejected by the Travel Admin.',
    link: d.action === 'approve' ? '/manager-dashboard' : '/my-profile',
  }),

  [EVENTS.EMPLOYEE_MANAGER_FIRST_APPROVAL]: (d) => ({
    title: '📋 Manager Selection Request',
    message: `${d.employeeName} selected ${d.managerName} as their approval manager.`,
    link: '/manager-requests',
  }),

  // ── EMPLOYEE ──────────────────────────────────────────────
  [EVENTS.SSR_POLICY_UPDATED]: (d) => ({
    title: '📋 Travel Policy Updated',
    message: `Your SSR travel policy has been updated by ${d.updatedBy || 'Admin'}.`,
    link: '/my-profile',
  }),

  [EVENTS.UPCOMING_TRIP_REMINDER]: (d) => ({
    title: `✈️ Trip in 5 Hours: ${d.destination}`,
    message: `Your flight to ${d.destination} departs at ${d.departureTime}. Order: ${d.orderId}.`,
    link: '/my-bookings?type=flight',
  }),

  // ── OPS / SUPER ADMIN ─────────────────────────────────────
  [EVENTS.OPS_MEMBER_CREATED]: (d) => ({
    title: '👤 New OPS Member Created',
    message: `${d.name} (${d.role}) has been added to the OPS team.`,
    link: '/super-admin/ops-team',
  }),

  [EVENTS.OPS_LOGIN_ALERT]: (d) => ({
    title: '🔑 OPS Login Alert',
    message: `${d.opsMemberName} logged in at ${d.loginTime}. IP: ${d.ipAddress || 'Unknown'}.`,
    link: '/super-admin/audit-logs',
  }),

  [EVENTS.OPS_PERMISSION_CHANGED]: (d) => ({
    title: '🔧 Your Permissions Were Updated',
    message: `Your OPS permissions have been updated by ${d.changedBy}.`,
    link: '/my-profile',
  }),

  [EVENTS.CORPORATE_REGISTERED]: (d) => ({
    title: '🏢 New Corporate Registered',
    message: `${d.corporateName} (${d.classification}) has registered on Traveamer.`,
    link: '/super-admin/corporates',
  }),
};

/**
 * Get in-app template for a given event
 * @param {string} event
 * @param {Object} data
 * @returns {{ title: string, message: string, link: string } | null}
 */
module.exports.getInAppTemplate = (event, data) => {
  const fn = templates[event];
  if (!fn) return null;
  try {
    return fn(data);
  } catch (err) {
    console.error(`[INAPP TEMPLATE ERROR] event=${event}:`, err.message);
    return null;
  }
};
