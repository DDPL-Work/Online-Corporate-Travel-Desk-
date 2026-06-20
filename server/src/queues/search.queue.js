const { Queue } = require("bullmq");
const createBullConnection = require("./connection");

const SEARCH_QUEUE_NAME = "tbo-search-chunks";

// Configuration for the queue itself
const searchQueue = new Queue(SEARCH_QUEUE_NAME, {
  connection: createBullConnection(),
  defaultJobOptions: {
    attempts: 3, // Retry failed requests up to 3 times
    backoff: {
      type: "exponential",
      delay: 1000, // 1s, 2s, 4s...
    },
    removeOnComplete: {
      age: 900, // keep completed jobs for 15 minutes
    },
    removeOnFail: {
      age: 86400, // keep failed jobs for 24 hours
    },
  },
});

module.exports = {
  SEARCH_QUEUE_NAME,
  searchQueue,
};
