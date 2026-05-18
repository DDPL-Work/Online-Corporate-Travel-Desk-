// server/src/notifications/orchestrator.js
// Central Notification Orchestrator — single entry point for ALL notifications
// Usage: await notify(EVENTS.BOOKING_APPROVED, data)

const { getEmailTemplate } = require('./templates/email.templates');
const { getInAppTemplate } = require('./templates/inapp.templates');
const { sendNotification } = require('../utils/notificationService');
const emailService = require('../services/email.service');
const EVENTS = require('../events/eventConstants');
const User = require('../models/User');
const OpsMember = require('../models/OpsMember');
const SuperAdmin = require('../models/SuperAdmin.model'); // ✅ ADDED

// ─────────────────────────────────────────────────────────────────────────────
// CHANNEL PRIORITY MAP
// critical  → email + in-app
// high      → in-app (+ optional email for some events)
// medium    → in-app only
// ─────────────────────────────────────────────────────────────────────────────
const CHANNEL_MAP = {
  // CRITICAL — email + in-app
  [EVENTS.CORPORATE_APPROVED]:              { email: true,  inapp: true  },
  [EVENTS.WALLET_LOW]:                      { email: true,  inapp: true  },
  [EVENTS.CREDIT_LIMIT_LOW]:                { email: true,  inapp: true  },
  [EVENTS.CREDIT_LIMIT_EXCEEDED]:           { email: true,  inapp: true  },
  [EVENTS.BOOKING_APPROVAL_REQUIRED]:       { email: true,  inapp: true  },
  [EVENTS.BOOKING_APPROVED]:                { email: true,  inapp: true  },
  [EVENTS.BOOKING_REJECTED]:                { email: true,  inapp: true  },
  [EVENTS.BOOKING_CONFIRMED]:               { email: true,  inapp: true  },
  [EVENTS.MANAGER_PROMOTION]:               { email: true,  inapp: true  },
  [EVENTS.MANAGER_REQUEST_REVIEWED]:        { email: true,  inapp: true  },
  [EVENTS.OPS_MEMBER_CREATED]:              { email: true,  inapp: true  },
  [EVENTS.OPS_PERMISSION_CHANGED]:          { email: true,  inapp: true  },

  // HIGH — email + in-app
  [EVENTS.BOOKING_REQUEST_CREATED]:         { email: true,  inapp: true  },
  [EVENTS.BOOKING_CANCELLED]:               { email: true,  inapp: true  },
  [EVENTS.BOOKING_REISSUED]:                { email: false, inapp: true  },
  [EVENTS.REISSUE_CREATED]:                 { email: true,  inapp: true  },
  [EVENTS.REISSUE_ELIGIBILITY_CHECKED]:     { email: true,  inapp: true  },
  [EVENTS.REISSUE_SEARCH_COMPLETED]:        { email: false, inapp: true  },
  [EVENTS.REISSUE_QUOTE_RECEIVED]:          { email: true,  inapp: true  },
  [EVENTS.REISSUE_BILLING_RESERVED]:        { email: false, inapp: true  },
  [EVENTS.REISSUE_PROCESSING_STARTED]:      { email: false, inapp: true  },
  [EVENTS.REISSUE_COMPLETED]:               { email: true,  inapp: true  },
  [EVENTS.REISSUE_FAILED]:                  { email: true,  inapp: true  },
  [EVENTS.REISSUE_OPS_ASSIGNED]:            { email: true,  inapp: true  },
  [EVENTS.REISSUE_TICKET_UPLOADED]:         { email: true,  inapp: true  },
  [EVENTS.OFFLINE_REISSUE_CREATED]:         { email: true,  inapp: true  },
  [EVENTS.OFFLINE_REISSUE_UPDATED]:         { email: true,  inapp: true  },
  [EVENTS.OFFLINE_TICKET_GENERATED]:        { email: true,  inapp: true  },
  [EVENTS.CREDIT_CYCLE_END]:                { email: true,  inapp: true  },
  [EVENTS.MANAGER_ASSIGNED_TO_EMPLOYEE]:    { email: true,  inapp: true  },
  [EVENTS.CORPORATE_APPROVED]:              { email: true,  inapp: true  },
  [EVENTS.CORPORATE_APPROVED_BY_OPS]:       { email: true,  inapp: true  },
  [EVENTS.CORPORATE_UPDATED_BY_OPS]:        { email: true,  inapp: true  },
  [EVENTS.CORPORATE_REGISTERED]:            { email: false, inapp: true  },
  [EVENTS.UPCOMING_TRIP_REMINDER]:          { email: false, inapp: true  },

  // MEDIUM — in-app only
  [EVENTS.WALLET_RECHARGED]:                { email: true,  inapp: true  },
  [EVENTS.CREDIT_CYCLE_START]:              { email: true,  inapp: true  },
  [EVENTS.TEAM_BOOKING_ACTIVITY]:           { email: false, inapp: true  },
  [EVENTS.MANAGER_BOOKING_ACTION]:          { email: false, inapp: true  },
  [EVENTS.EMPLOYEE_MANAGER_FIRST_APPROVAL]: { email: false, inapp: true  },
  [EVENTS.SSR_POLICY_UPDATED]:              { email: true,  inapp: true  },
  [EVENTS.BOOKING_OFFLINE_CANCELLED]:       { email: false, inapp: true  },
  [EVENTS.OPS_LOGIN_ALERT]:                 { email: true,  inapp: true  },
};

// ─────────────────────────────────────────────────────────────────────────────
// RECIPIENT RESOLVER
// Returns array of: { userId, email, recipientRole, corporateId }
// ─────────────────────────────────────────────────────────────────────────────
const resolveRecipients = async (event, data) => {
  if (Array.isArray(data?.strictRecipients) && data.strictRecipients.length) {
    return data.strictRecipients
      .filter((recipient) => recipient?.userId || recipient?.email)
      .map((recipient) => ({
        userId: recipient.userId || null,
        email: recipient.email || null,
        corporateId: recipient.corporateId || data.corporateId || null,
        role: recipient.role || recipient.recipientRole || null,
      }));
  }

  if (data?.recipientId && data?.recipientRole) {
    return [
      {
        userId: data.recipientId,
        email:
          data.recipientEmail ||
          data.employeeEmail ||
          data.opsUserEmail ||
          null,
        corporateId: data.corporateId || null,
        role: data.recipientRole,
      },
    ];
  }

  const recipients = [];

  switch (event) {

    // ── TO EMPLOYEE & OTHERS (CC) ───────────────────────────
    case EVENTS.BOOKING_APPROVED:
    case EVENTS.BOOKING_REJECTED:
    case EVENTS.BOOKING_CONFIRMED:
    case EVENTS.BOOKING_CANCELLED:
    case EVENTS.BOOKING_REISSUED:
    case EVENTS.REISSUE_CREATED:
    case EVENTS.REISSUE_ELIGIBILITY_CHECKED:
    case EVENTS.REISSUE_SEARCH_COMPLETED:
    case EVENTS.REISSUE_BILLING_RESERVED:
    case EVENTS.REISSUE_PROCESSING_STARTED:
    case EVENTS.REISSUE_COMPLETED:
    case EVENTS.REISSUE_FAILED:
    case EVENTS.REISSUE_TICKET_UPLOADED:
    case EVENTS.BOOKING_OFFLINE_CANCELLED: {
      // 1. Employee
      if (data.employeeId || data.recipientId) {
        recipients.push({
          userId: data.employeeId || data.recipientId,
          email: data.employeeEmail,
          corporateId: data.corporateId,
        });
      }
      // 2. Manager (if manager exists)
      if (data.managerId) {
        recipients.push({
          userId: data.managerId,
          email: data.managerEmail,
          corporateId: data.corporateId,
        });
      }
      // 3. Travel Admin (Resolve to actual User IDs)
      const admins = await User.find({ corporateId: data.corporateId, role: 'travel-admin' }).select('_id email');
      admins.forEach(admin => {
        recipients.push({
          userId: admin._id,
          email: admin.email,
          corporateId: data.corporateId,
        });
      });

      // 4. Super Admin (Resolve to actual User IDs)
      const superAdmins = await SuperAdmin.find({}).select('_id email');
      superAdmins.forEach(sa => {
        recipients.push({
          userId: sa._id,
          email: sa.email,
          corporateId: data.corporateId || 'system',
        });
      });
      break;
    }

    case EVENTS.REISSUE_OPS_ASSIGNED: {
      if (data.employeeId || data.recipientId) {
        recipients.push({
          userId: data.employeeId || data.recipientId,
          email: data.employeeEmail,
          corporateId: data.corporateId,
        });
      }
      if (data.opsUserId) {
        recipients.push({
          userId: data.opsUserId,
          email: data.opsUserEmail,
          corporateId: data.corporateId || "system",
          role: "ops-member",
        });
      }
      break;
    }

    case EVENTS.SSR_POLICY_UPDATED:
    case EVENTS.UPCOMING_TRIP_REMINDER:
    case EVENTS.MANAGER_REQUEST_REVIEWED:
      if (data.employeeId || data.recipientId) {
        recipients.push({
          userId: data.employeeId || data.recipientId,
          email: data.employeeEmail,
          corporateId: data.corporateId,
        });
      }
      break;

    // ── TO MANAGER ──────────────────────────────────────────
    case EVENTS.BOOKING_APPROVAL_REQUIRED:
    case EVENTS.MANAGER_ASSIGNED_TO_EMPLOYEE:
      if (data.managerId) {
        recipients.push({
          userId: data.managerId,
          email: data.managerEmail,
          corporateId: data.corporateId,
        });
      }
      break;

    // ── TO MANAGER PROMOTION TARGET ─────────────────────────
    case EVENTS.MANAGER_PROMOTION:
      if (data.userId) {
        recipients.push({
          userId: data.userId,
          email: data.email,
          corporateId: data.corporateId,
        });
      }
      break;

    // ── TO TRAVEL ADMIN (role-based) ────────────────────────
    case EVENTS.BOOKING_REQUEST_CREATED:
    case EVENTS.EMPLOYEE_MANAGER_FIRST_APPROVAL:
    case EVENTS.MANAGER_BOOKING_ACTION: {
      const admins = await User.find({ corporateId: data.corporateId, role: 'travel-admin' }).select('_id email');
      admins.forEach(admin => {
        recipients.push({
          userId: admin._id,
          email: admin.email,
          corporateId: data.corporateId,
        });
      });
      // Also notify manager if specified
      if (data.managerId) {
        recipients.push({
          userId: data.managerId,
          email: data.managerEmail,
          corporateId: data.corporateId,
        });
      }
      break;
    }

    // ── TO TRAVEL ADMIN + TEAM MANAGER ──────────────────────
    case EVENTS.TEAM_BOOKING_ACTIVITY: {
      if (data.managerId) {
        recipients.push({
          userId: data.managerId,
          email: data.managerEmail,
          corporateId: data.corporateId,
        });
      }
      const admins = await User.find({ corporateId: data.corporateId, role: 'travel-admin' }).select('_id email');
      admins.forEach(admin => {
        recipients.push({
          userId: admin._id,
          email: admin.email,
          corporateId: data.corporateId,
        });
      });
      break;
    }

    // ── TO TRAVEL ADMIN (wallet/credit) ─────────────────────
    case EVENTS.WALLET_RECHARGED: {
      if (data.initiatorUserId || data.userId || data.recipientId) {
        recipients.push({
          userId: data.initiatorUserId || data.userId || data.recipientId,
          email: data.initiatorEmail || data.email || null,
          corporateId: data.corporateId,
          role: data.initiatorRole || 'travel-admin',
        });
      }

      const opsMembers = await OpsMember.find({
        isDeleted: false,
        status: 'Active',
      }).select('_id');

      opsMembers.forEach((member) => {
        recipients.push({
          userId: member._id,
          email: null,
          corporateId: data.corporateId,
          role: 'ops-member',
        });
      });
      break;
    }

    case EVENTS.WALLET_LOW:
    case EVENTS.CREDIT_LIMIT_LOW:
    case EVENTS.CREDIT_LIMIT_EXCEEDED:
    case EVENTS.CREDIT_CYCLE_END:
    case EVENTS.CREDIT_CYCLE_START: {
      const admins = await User.find({ corporateId: data.corporateId, role: 'travel-admin' }).select('_id email');
      admins.forEach(admin => {
        recipients.push({
          userId: admin._id,
          email: admin.email,
          corporateId: data.corporateId,
        });
      });

      const superAdmins = await SuperAdmin.find({}).select('_id email');
      superAdmins.forEach(sa => {
        recipients.push({
          userId: sa._id,
          email: sa.email,
          corporateId: data.corporateId || 'system',
        });
      });
      if (data.primaryContactEmail) {
        recipients.push({
          email: data.primaryContactEmail,
          corporateId: data.corporateId,
        });
      }
      break;
    }

    // ── TO CORPORATE PRIMARY CONTACT & SUPER ADMIN ──────────
    case EVENTS.CORPORATE_APPROVED: {
      recipients.push({
        email: data.primaryContactEmail,
        corporateId: data.corporateId,
      });
      const superAdmins = await SuperAdmin.find({}).select('_id email');
      superAdmins.forEach(sa => {
        recipients.push({
          userId: sa._id,
          email: sa.email,
          corporateId: data.corporateId || 'system',
        });
      });
      break;
    }

    case EVENTS.CORPORATE_APPROVED_BY_OPS:
    case EVENTS.CORPORATE_UPDATED_BY_OPS: {
      // 1. Notify all Super Admins
      const superAdmins = await SuperAdmin.find({}).select('_id email');
      superAdmins.forEach(sa => {
        recipients.push({
          userId: sa._id,
          email: sa.email,
          corporateId: 'system',
          role: 'super-admin',
        });
      });

      // 2. Notify Corporate Admins for this specific corporate
      if (data.corporateId) {
        const corpAdmins = await User.find({
          corporateId: data.corporateId,
          role: 'travel-admin',
          isActive: true,
        }).select('_id email');

        corpAdmins.forEach(admin => {
          recipients.push({
            userId: admin._id,
            email: admin.email,
            corporateId: data.corporateId,
            role: 'travel-admin',
          });
        });
      }
      break;
    }

    // ── TO OPS MEMBER (specific) ────────────────────────────
    case EVENTS.OPS_MEMBER_CREATED:
    case EVENTS.OPS_PERMISSION_CHANGED:
      recipients.push({
        userId: data.userId,
        email: data.email,
        corporateId: data.corporateId || 'system',
      });
      break;

    // ── TO SUPER ADMIN (via role on super-admin collection) ─
    case EVENTS.OPS_LOGIN_ALERT:
    case EVENTS.CORPORATE_REGISTERED: {
      const superAdmins = await SuperAdmin.find({}).select('_id email');
      superAdmins.forEach(sa => {
        recipients.push({
          userId: sa._id,
          email: sa.email,
          corporateId: data.corporateId || 'system',
        });
      });
      break;
    }

    default:
      break;
  }

  return recipients;
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EMIT FUNCTION
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Emit a notification event — handles in-app + email dispatch
 * Fire-and-forget: returns immediately and processes in the background.
 * @param {string} event  - Event constant from eventConstants.js
 * @param {Object} data   - Event payload
 */
const notify = (event, data) => {
  // Background the notification processing so it doesn't block the API response
  setImmediate(async () => {
    try {
      const channels = CHANNEL_MAP[event] || { email: false, inapp: true };
      const recipients = await resolveRecipients(event, data);

      if (!recipients.length) {
        console.warn(`[NOTIFY] No recipients resolved for event: ${event}`);
        return;
      }

      for (const r of recipients) {
        // ── Contextual Template Resolution (Role-based) ──────────
        const contextualData = { ...data, recipientRole: r.role };
        const inappTpl = channels.inapp ? getInAppTemplate(event, contextualData) : null;
        const emailTpl = channels.email ? getEmailTemplate(event, contextualData) : null;

        // ── IN-APP ──────────────────────────────────────────────
        if (channels.inapp && inappTpl) {
          sendNotification({
            recipient:     r.userId   || null,
            recipientRole: r.role     || null,
            corporateId:   r.corporateId === 'system' ? null : (r.corporateId || null),
            title:         inappTpl.title,
            message:       inappTpl.message,
            type:          event,
            link:          inappTpl.link || null,
            relatedId:     data.relatedId || data.bookingId || data.transactionId || null,
          }).catch((err) =>
            console.error(`[NOTIFY][IN-APP FAIL] event=${event}:`, err.message)
          );
        }

        // ── EMAIL ───────────────────────────────────────────────
        if (channels.email && emailTpl && r.email) {
          emailService.sendEmail({
            to:      r.email,
            subject: emailTpl.subject,
            html:    emailTpl.html,
          }).then(() =>
            console.log(`\n📧 [NOTIFY EMAIL SENT] event=${event} → ${r.email}`)
          ).catch((err) =>
            console.error(
              `\n❌ [NOTIFY EMAIL FAIL] event=${event} → ${r.email}:`,
              err?.response?.body?.errors?.[0]?.message || err.message,
            )
          );
        }
      }

      console.log(
        `\n🔔 [NOTIFY] event=${event}`,
        `| recipients=${recipients.length}`,
        `| email=${channels.email}`,
        `| inapp=${channels.inapp}`
      );

    } catch (err) {
      console.error(`[NOTIFY ERROR] event=${event}:`, err.message);
    }
  });
};

module.exports = { notify };
