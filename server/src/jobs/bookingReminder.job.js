const cron = require('node-cron');
const Booking = require('../models/Booking');
const User = require('../models/User');
const moment = require('moment-timezone');
const config = require('../config');
const logger = require('../utils/logger');
const { notify } = require('../notifications/orchestrator');
const EVENTS = require('../events/eventConstants');

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
      const isFlight = booking.bookingType === "flight";
      
      const origin = isFlight ? booking.flightDetails?.origin : "N/A";
      const dest = isFlight ? booking.flightDetails?.destination : (booking.hotelDetails?.hotelName || "Hotel");
      const depTime = isFlight 
        ? moment(booking.flightDetails?.departureDate).format('YYYY-MM-DD HH:mm')
        : moment(booking.hotelDetails?.checkInDate).format('YYYY-MM-DD');

      notify(EVENTS.UPCOMING_TRIP_REMINDER, {
        employeeName: booking.userId?.name?.firstName || "Traveler",
        employeeEmail: booking.userId?.email,
        employeeId: booking.userId?._id,
        orderId: booking.bookingReference,
        origin: origin,
        destination: dest,
        departureTime: depTime,
        pnr: booking.pnr,
      });

      logger.info(`Reminder sent for booking ${booking.bookingReference} to ${booking.userId?.email}`);
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