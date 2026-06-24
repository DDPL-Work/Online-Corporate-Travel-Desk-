const { Queue } = require("bullmq");
const createBullConnection = require("./connection");

const SEARCH_QUEUE_NAME = "tbo-search-chunks";
const FINALIZE_QUEUE_NAME = "tbo-search-finalize";
const CLEANUP_QUEUE_NAME = "tbo-search-cleanup";

const connection = createBullConnection();

const defaultJobOptions = {
  attempts: 3, 
  backoff: {
    type: "exponential",
    delay: 1000, 
  },
  removeOnComplete: {
    age: 900, 
    count: 500, 
  },
  removeOnFail: {
    age: 86400, 
    count: 1000, 
  },
};

const searchQueue = new Queue(SEARCH_QUEUE_NAME, {
  connection,
  defaultJobOptions,
});

const finalizeQueue = new Queue(FINALIZE_QUEUE_NAME, {
  connection,
  defaultJobOptions,
});

const cleanupQueue = new Queue(CLEANUP_QUEUE_NAME, {
  connection,
  defaultJobOptions,
});

module.exports = {
  SEARCH_QUEUE_NAME,
  FINALIZE_QUEUE_NAME,
  CLEANUP_QUEUE_NAME,
  searchQueue,
  finalizeQueue,
  cleanupQueue,
};
