const { flightBookingQueue, queueEnabled } = require("./queue");
const flightOrchestrationService = require("../services/booking/flightOrchestration.service");
const logger = require("../utils/logger");

if (queueEnabled) {
  flightBookingQueue.process(5, async (job) => {
    const { bookingId, actorId, idempotencyKey } = job.data;

    return flightOrchestrationService.processBooking({
      bookingId,
      actorId,
      idempotencyKey,
      queued: true,
    });
  });

  flightBookingQueue.on("completed", (job, result) => {
    logger.info("Flight booking queue job completed", {
      jobId: job.id,
      bookingId: job.data?.bookingId,
      status: result?.status,
    });
  });

  flightBookingQueue.on("failed", (job, error) => {
    logger.error("Flight booking queue job failed", {
      jobId: job?.id,
      bookingId: job?.data?.bookingId,
      message: error?.message || error,
    });
  });
}

const enqueueFlightBooking = async ({ bookingId, actorId, idempotencyKey }) => {
  if (!queueEnabled) {
    return null;
  }

  const job = await flightBookingQueue.add(
    {
      bookingId,
      actorId,
      idempotencyKey,
    },
    {
      jobId: `${bookingId}:${idempotencyKey || "default"}`,
    },
  );

  return job;
};

module.exports = {
  enqueueFlightBooking,
};
