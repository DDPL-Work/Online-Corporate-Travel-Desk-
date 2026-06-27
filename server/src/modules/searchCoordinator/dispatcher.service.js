const redis = require("../../config/redis");
const { searchQueue } = require("../../queues/search.queue");
const logger = require("../../utils/logger");

let isDispatching = false;

/**
 * Starts a background loop that iterates through all active searches
 * and perfectly interleaves their pending chunks into the BullMQ queue
 * one-by-one in a Round-Robin fashion.
 */
function startDispatcherLoop(intervalMs = 100) {
  setInterval(async () => {
    // Prevent overlapping execution
    if (isDispatching) return;
    isDispatching = true;

    try {
      const activeSearches = await redis.smembers("active:searches");
      if (!activeSearches || activeSearches.length === 0) {
        isDispatching = false;
        return;
      }

      // To prevent dumping thousands of jobs into BullMQ if the workers
      // are slow, we only dispatch if the BullMQ waiting queue is relatively small.
      // This maintains the exact Round-Robin order without queue bloat.
      const waitingCount = await searchQueue.getWaitingCount();
      if (waitingCount > 100) {
        isDispatching = false;
        return;
      }

      const jobsToDispatch = [];
      const emptySearches = [];

      // Iterate through every active user currently searching
      for (const searchId of activeSearches) {
        const listKey = `pending:chunks:${searchId}`;
        
        // Pop exactly ONE chunk for this user
        const rawJob = await redis.lpop(listKey);

        if (rawJob) {
          const jobDef = JSON.parse(rawJob);
          jobsToDispatch.push({
            name: jobDef.name,
            data: jobDef.data
          });
        } else {
          // If this user has no more chunks pending, mark them for removal
          emptySearches.push(searchId);
        }
      }

      // Add the interleaved batch of chunks to BullMQ
      // (e.g. [User1-Chunk1, User2-Chunk1, User3-Chunk1, User4-Chunk1])
      if (jobsToDispatch.length > 0) {
        logger.info(`[Dispatcher] Dispatching ${jobsToDispatch.length} chunks to BullMQ...`);
        await searchQueue.addBulk(jobsToDispatch);
        logger.info(`[Dispatcher] Successfully pushed chunks!`);
      }

      // Cleanup finished searches from the active pool
      if (emptySearches.length > 0) {
        logger.info(`[Dispatcher] Cleaning up empty searches: ${emptySearches.join(',')}`);
        await redis.srem("active:searches", ...emptySearches);
      }

    } catch (err) {
      logger.error("[Dispatcher] Loop error:", err.message);
    } finally {
      isDispatching = false;
    }
  }, intervalMs);
}

module.exports = {
  startDispatcherLoop
};
