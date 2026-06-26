const { getConnections } = require("../../config/redisConnections");
const redis = getConnections().coordinator;
const { searchQueue } = require("../../queues/search.queue");
const logger = require("../../utils/logger");
const metrics = require("./metrics.service");

let isDispatching = false;
let dispatcherInterval = null;

/**
 * Adaptive scheduling state.
 * Tracks worker utilization and adjusts dispatch rate dynamically.
 */
const scheduler = {
  maxQueueDepth: 100,
  minQueueDepth: 10,
  batchSize: 50,
  tickMs: 100,
  highLatencyTicks: 0,
  lowLatencyTicks: 0,
  // Track active search count for adaptive batch sizing
  activeSearchCount: 0,
  // Track average pending count per search for priority calculation
  avgPendingPerSearch: 0,
};

/**
 * Lua script: atomic fair-schedule + INTERLEAVED batch pop across ALL active searches.
 *
 * Performs in a single atomic Redis call:
 * 1. Gets all active search IDs (SMEMBERS)
 * 2. Gets pending count for each (LLEN) — replaces N sequential calls
 * 3. Sorts by pending count ascending (smaller searches first)
 * 4. Round-robin interleaves chunks across all searches (1 from each, then 2, etc.)
 * 5. Computes priority per chunk: smaller total search = higher priority (lower number)
 *
 * Interleaving ensures:
 *   - Small searches get chunks dispatched first AND interleaved with large searches
 *   - No single search monopolizes worker slots
 *   - Fair scheduling even under heavy load
 *
 * Returns: { chunks: [[json, priority], ...], counts: [[searchId, count], ...], empty: [searchId, ...] }
 */
const FAIR_DISPATCH_SCRIPT = `
local activeKey = KEYS[1]
local batchSize = tonumber(ARGV[1])

-- 1. Get all active search IDs
local searchIds = redis.call("smembers", activeKey)
if #searchIds == 0 then
  return {chunks={}, counts={}, empty={}}
end

-- 2. Get pending counts for all searches in one pass
local counts = {}
for i, sid in ipairs(searchIds) do
  local listKey = "pending:chunks:" .. sid
  local cnt = redis.call("llen", listKey)
  if cnt > 0 then
    counts[#counts + 1] = {sid, cnt}
  end
end

if #counts == 0 then
  return {chunks={}, counts={}, empty={}}
end

-- 3. Sort by pending count ascending (smaller searches first = fair scheduling)
table.sort(counts, function(a, b) return a[2] < b[2] end)

-- 4. Round-robin interleaved pop with priority assignment
-- Priority: smaller total search → higher priority (lower number)
-- Priority range: 1 (smallest search) to 10 (largest search)
local chunks = {}
local empty = {}
local numSearches = #counts
local remaining = batchSize

-- Calculate priority for each search based on total pending count
-- Map pending count to priority 1-10 (1 = highest priority = smallest search)
local maxPending = counts[numSearches][2]
local minPending = counts[1][2]
local pendingRange = maxPending - minPending

-- Round-robin: pop 1 chunk from each search in priority order, then repeat
local roundRobinIndex = 1
while remaining > 0 do
  local entry = counts[roundRobinIndex]
  local sid = entry[1]
  local pending = entry[2]

  -- Calculate priority: smaller search = lower number = higher priority
  local priority
  if pendingRange == 0 then
    priority = 5
  else
    priority = math.max(1, math.min(10, math.ceil(((pending - minPending) / pendingRange) * 9) + 1))
  end

  -- Pop one chunk
  local listKey = "pending:chunks:" .. sid
  local val = redis.call("lpop", listKey)
  if val ~= false then
    chunks[#chunks + 1] = {val, priority}
    remaining = remaining - 1
    -- Update count
    entry[2] = entry[2] - 1
  end

  -- Move to next search in round-robin
  roundRobinIndex = roundRobinIndex + 1
  if roundRobinIndex > numSearches then
    roundRobinIndex = 1
  end

  -- Check if we've exhausted all searches
  local allEmpty = true
  for i, e in ipairs(counts) do
    if e[2] > 0 then
      allEmpty = false
      break
    end
  end
  if allEmpty then break end
end

-- 5. Check which searches are now fully drained
for i, entry in ipairs(counts) do
  local sid = entry[1]
  local listKey = "pending:chunks:" .. sid
  local still = redis.call("llen", listKey)
  if still == 0 then
    empty[#empty + 1] = sid
  end
end

return {counts=counts, chunks=chunks, empty=empty}
`;

let fairDispatchSha = null;

/**
 * Starts the adaptive dispatcher loop.
 *
 * Scheduling algorithm: Interleaved Fair Queueing with Deficit Counter
 * - Lua script handles atomic fair dispatch with round-robin interleaving in single round trip
 * - Smaller searches get higher BullMQ priority (lower number)
 * - Round-robin interleaving prevents any search from monopolizing workers
 * - Backpressure adjusts batch size based on queue depth and worker availability
 */
function startDispatcherLoop(baseTickMs = 100) {
  scheduler.tickMs = baseTickMs;

  dispatcherInterval = setInterval(async () => {
    if (isDispatching) return;
    isDispatching = true;

    const tickStart = Date.now();

    try {
      // 1. Get all active searches
      const activeSearches = await redis.smembers("active:searches");
      if (!activeSearches || activeSearches.length === 0) {
        isDispatching = false;
        return;
      }
      scheduler.activeSearchCount = activeSearches.length;

      // 2. Adaptive backpressure check — query queue depth in parallel
      const [waitingCount, activeCount] = await Promise.all([
        searchQueue.getWaitingCount(),
        searchQueue.getActiveCount(),
      ]);

      const queueDepth = waitingCount + activeCount;
      // Scale max queue depth with number of active searches (each search needs capacity)
      const adaptiveMax = Math.max(scheduler.maxQueueDepth, activeSearches.length * 8);

      if (queueDepth >= adaptiveMax) {
        scheduler.highLatencyTicks++;
        scheduler.lowLatencyTicks = 0;

        // Faster backpressure: reduce batch size immediately, not after 5 ticks
        if (scheduler.highLatencyTicks >= 2) {
          scheduler.batchSize = Math.max(10, Math.floor(scheduler.batchSize * 0.75));
          scheduler.tickMs = Math.min(500, scheduler.tickMs + 50);
        }

        metrics.recordDispatcherTick({ backpressure: true });
        isDispatching = false;
        return;
      }

      // Recovery: restore batch size more aggressively when healthy
      if (queueDepth < scheduler.minQueueDepth) {
        scheduler.lowLatencyTicks++;
        scheduler.highLatencyTicks = 0;

        // Faster recovery: increase batch size more aggressively
        if (scheduler.lowLatencyTicks >= 2) {
          scheduler.batchSize = Math.min(80, scheduler.batchSize + 10);
          scheduler.tickMs = Math.max(baseTickMs, scheduler.tickMs - 25);
        }
      } else {
        scheduler.lowLatencyTicks = 0;
      }

      // 3. Atomic fair dispatch via Lua script
      // Single round trip: gets counts + interleaved pops chunks in one atomic call
      let result;
      try {
        if (fairDispatchSha) {
          result = await redis.evalsha(fairDispatchSha, 1, "active:searches", String(scheduler.batchSize));
        } else {
          result = await redis.eval(FAIR_DISPATCH_SCRIPT, 1, "active:searches", String(scheduler.batchSize));
          try {
            fairDispatchSha = await redis.script("LOAD", FAIR_DISPATCH_SCRIPT);
          } catch (e) { /* ignore — will use EVAL next time */ }
        }
      } catch (scriptErr) {
        // If script flushed from cache, retry with EVAL
        if (scriptErr.message.includes('NOSCRIPT')) {
          result = await redis.eval(FAIR_DISPATCH_SCRIPT, 1, "active:searches", String(scheduler.batchSize));
          try {
            fairDispatchSha = await redis.script("LOAD", FAIR_DISPATCH_SCRIPT);
          } catch (e) { /* ignore */ }
        } else {
          throw scriptErr;
        }
      }

      const { chunks: rawChunks, empty: emptySearches } = result;

      // 4. Parse and dispatch to BullMQ with priority
      if (rawChunks && rawChunks.length > 0) {
        const jobsToDispatch = [];
        for (const [raw, priority] of rawChunks) {
          try {
            const jobDef = JSON.parse(raw);
            jobsToDispatch.push({
              name: jobDef.name,
              data: jobDef.data,
              opts: { priority },
            });
          } catch (parseErr) {
            logger.warn(`[Dispatcher] Malformed job data: ${parseErr.message}`);
          }
        }

        if (jobsToDispatch.length > 0) {
          await searchQueue.addBulk(jobsToDispatch);
        }
      }

      // 5. Cleanup: verify and remove empty searches from active pool
      if (emptySearches && emptySearches.length > 0) {
        for (const searchId of emptySearches) {
          const listKey = `pending:chunks:${searchId}`;
          const stillEmpty = await redis.llen(listKey);
          if (stillEmpty === 0) {
            await redis.srem("active:searches", searchId);
          }
        }
      }

      // Log dispatch metrics periodically
      if (rawChunks && rawChunks.length > 0) {
        logger.debug(
          `[Dispatcher] Dispatched ${rawChunks.length} jobs (queue: ${waitingCount} waiting, ${activeCount} active, searches: ${activeSearches.length})`
        );
      }

      // Record dispatcher metrics
      const tickLatencyMs = Date.now() - tickStart;
      metrics.recordDispatcherTick({
        chunksDispatched: rawChunks ? rawChunks.length : 0,
        tickLatencyMs,
      });
    } catch (err) {
      logger.error("[Dispatcher] Loop error:", err.message);
    } finally {
      isDispatching = false;
    }
  }, scheduler.tickMs);

  // Phase 6: .unref() so interval doesn't prevent process exit
  dispatcherInterval.unref();
}

/**
 * Stops the dispatcher interval loop.
 */
function stopDispatcherLoop() {
  if (dispatcherInterval) {
    clearInterval(dispatcherInterval);
    dispatcherInterval = null;
  }
  logger.info("[Dispatcher] Loop stopped");
}

/**
 * Returns current scheduler state for monitoring.
 */
function getSchedulerState() {
  return {
    batchSize: scheduler.batchSize,
    tickMs: scheduler.tickMs,
    maxQueueDepth: scheduler.maxQueueDepth,
    highLatencyTicks: scheduler.highLatencyTicks,
    lowLatencyTicks: scheduler.lowLatencyTicks,
    activeSearchCount: scheduler.activeSearchCount,
  };
}

module.exports = {
  startDispatcherLoop,
  stopDispatcherLoop,
  getSchedulerState,
};
