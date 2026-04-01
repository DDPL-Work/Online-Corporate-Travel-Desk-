// server/src/jobs/lccTicketPolling.job.js
const cron = require("node-cron");
const logger = require("../utils/logger");
const BookingRequest = require("../models/BookingRequest");
const tboService = require("../services/tektravels/flight.service");

async function pollLccTickets() {
  const pendingBookings = await BookingRequest.find({
    executionStatus: "ticket_pending",
    "payment.status": "completed",
    bookingType: "flight",
  });

  for (const booking of pendingBookings) {
    try {
      const pnr = booking.bookingResult?.pnr;
      if (!pnr) continue;

      const details = await tboService.getBookingDetails(pnr);
      const itinerary = details?.Response?.Response?.FlightItinerary;

      const resolvedPNR =
        itinerary?.PNR || itinerary?.Segments?.[0]?.AirlinePNR;

      if (resolvedPNR) {
        booking.executionStatus = "ticketed";
        booking.bookingResult.pnr = resolvedPNR;
        booking.bookingResult.bookingDetails = details;
        await booking.save();
      }
    } catch (err) {
      logger.error("LCC polling error", err);
    }
  }
}

// 👇 THIS is what index.js will call
const startLccTicketPollingJob = () => {
  // every 5 minutes
  cron.schedule("*/5 * * * *", async () => {
    logger.info("⏳ Running LCC ticket polling job");
    await pollLccTickets();
  });
};

module.exports = { startLccTicketPollingJob };
