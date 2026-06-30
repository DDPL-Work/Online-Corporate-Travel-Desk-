const emailService = require('./email.service');
const logger = require('../utils/logger');
const { sendNotification } = require('../utils/notificationService');
const User = require('../models/User'); // ✅ ADDED

class NotificationService {
  async sendBookingNotification(booking, user, type) {
    try {
      // ✅ RESOLVE FULL USER IF EMAIL IS MISSING
      if (!user.email) {
        const fullUser = await User.findById(user._id || user.id);
        if (fullUser) {
          user = fullUser;
        }
      }

      switch (type) {
        case 'confirmation':
          await emailService.sendBookingConfirmation(booking, user);
          // In-App Notification
          await sendNotification({
            recipient: user.id || user._id,
            corporateId: user.corporateId || booking.corporateId,
            title: "Booking Confirmed",
            message: `Your booking ${booking.orderId || booking.bookingReference} has been confirmed successfully.`,
            type: "booking_confirmation",
            relatedId: booking._id,
            link: `/my-bookings?type=${booking.bookingType || 'flight'}`
          });

          break;

        case 'cancellation':
          // Implement cancellation email
          await sendNotification({
            recipient: user.id || user._id,
            corporateId: user.corporateId || booking.corporateId,
            title: "Booking Cancelled",
            message: `Your booking ${booking.orderId || booking.bookingReference} has been cancelled.`,
            type: "booking_cancellation",
            relatedId: booking._id,
            link: "/my-cancelled-bookings"
          });


          break;
        default:
          break;
      }
    } catch (error) {
      logger.error('Notification Error:', error);
    }
  }

  async sendApprovalNotifications(data) {
    try {
      const { bookingReference, orderId, requester, corporateId, action, approver, selectedManagerId, bookingType } = data;
      const User = require('../models/User');
      const identifier = orderId || bookingReference;
      const typeParam = bookingType ? `?type=${bookingType}` : "";
      if (!action || action === 'request') {
        // 1. Notify Travel Admins via Role
        await sendNotification({
          recipientRole: 'travel-admin',
          corporateId,
          sender: requester._id,
          title: "New Booking Request",
          message: `${requester.name?.firstName || 'An employee'} has requested a new booking (${identifier}).`,
          type: "booking_request",
          link: `/pending-requests${typeParam}`
        });

        // 2. Notify selected Manager (if any)
        if (selectedManagerId) {
          await sendNotification({
            recipient: selectedManagerId,
            corporateId,
            sender: requester._id,
            title: "New Booking Request",
            message: `${requester.name?.firstName || 'An employee'} has requested a new booking (${identifier}).`,
            type: "booking_request",
            link: `/manager/pending-requests${typeParam}`
          });
        }
      } else if (action === 'auto_approve') {

        // Notify Travel Admins via Role
        await sendNotification({
          recipientRole: 'travel-admin',
          corporateId,
          sender: requester._id,
          title: "New Auto-Approved Booking",
          message: `${requester.name?.firstName || 'An employee'} has made a booking (${identifier}) that was auto-approved.`,
          type: "booking_confirmation",
          link: `/all-bookings${typeParam}`
        });

      } else {
        const status = action === 'approve' ? 'Approved' : 'Rejected';
        const type = action === 'approve' ? 'booking_approval' : 'booking_rejection';
        const baseLink = action === 'approve' ? "/my-pending-approvals" : "/my-rejected-requests";

        await sendNotification({
          recipient: requester._id,
          corporateId,
          sender: approver?._id,
          title: `Booking ${status}`,
          message: `Your booking request ${identifier} has been ${status.toLowerCase()} by your manager.`,
          type: type,
          link: `${baseLink}${typeParam}`
        });

      }
    } catch (error) {
      logger.error('Approval Notification Error:', error);
    }
  }




  async sendCreditAlerts(corporate, utilizationPercent) {
    try {
      await emailService.sendCreditAlert(corporate, utilizationPercent);
      
      // In-App for admins via Role
      await sendNotification({
        recipientRole: 'travel-admin',
        corporateId: corporate._id,
        title: "Credit Utilization Alert",
        message: `Your corporate credit utilization has reached ${utilizationPercent}%.`,
        type: "system_alert",
        link: "/credit-utilization"
      });

    } catch (error) {
      logger.error('Credit Alert Error:', error);
    }
  }
}

module.exports = new NotificationService();