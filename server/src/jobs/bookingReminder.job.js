const cron = require('node-cron');
const Booking = require('../models/Booking');
const User = require('../models/User');
const moment = require('moment-timezone');
const config = require('../config');
const logger = require('../utils/logger');

const sendUpcomingTravelReminders = async () => {
  try {
    logger.info('Sending upcoming travel reminders...');

    const tomorrow = moment().add(1, 'day').startOf('day').toDate();
    const dayAfter = moment().add(2, 'days').startOf('day').toDate();

    // Find bookings for tomorrow
    const upcomingBookings = await Booking.find({
      status: 'confirmed',
      $or: [
        {
          'flightDetails.departureDate': {
            $gte: tomorrow,
            $lt: dayAfter
          }
        },
        {
          'hotelDetails.checkInDate': {
            $gte: tomorrow,
            $lt: dayAfter
          }
        }
      ]
    }).populate('userId', 'name email');

    for (const booking of upcomingBookings) {
      // Send reminder email
      logger.info(`Reminder sent for booking ${booking.bookingReference} to ${booking.userId.email}`);
      // Implement email sending logic here
    }

    logger.info(`Sent ${upcomingBookings.length} travel reminders`);
  } catch (error) {
    logger.error('Error sending travel reminders:', error);
  }
};

const startBookingReminderJob = () => {
  cron.schedule(config.cronJobs.bookingReminderSchedule, sendUpcomingTravelReminders);
  logger.info(`Booking reminder job scheduled: ${config.cronJobs.bookingReminderSchedule}`);
};

module.exports = { startBookingReminderJob, sendUpcomingTravelReminders };