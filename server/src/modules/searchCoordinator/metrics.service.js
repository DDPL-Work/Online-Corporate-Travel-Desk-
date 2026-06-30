/**
 * Search Metrics Service
 *
 * Centralized in-memory metrics collection for the distributed search pipeline.
 * Tracks latency, throughput, and error rates across all subsystems.
 * Exposes metrics for Prometheus/Grafana integration.
 *
 * Metrics are collected via simple counters and histograms.
 * Thread-safe for single-process; for multi-process, use Redis counters.
 */

const logger = require("../../utils/logger");

/**
 * Histogram buckets for latency tracking (in milliseconds).
 */
const LATENCY_BUCKETS = [50, 100, 250, 500, 1000, 2500, 5000, 10000, 30000];

/**
 * Metrics state.
 * All values are resettable for periodic snapshotting.
 */
const metrics = {
  // Search pipeline metrics
  searches: {
    total: 0,
    cached: 0,
    completed: 0,
    failed: 0,
    avgLatencyMs: 0,
    _latencySum: 0,
    _latencyCount: 0,
  },

  // Dispatcher metrics
  dispatcher: {
    ticks: 0,
    chunksDispatched: 0,
    avgBatchSize: 0,
    _batchSum: 0,
    _batchCount: 0,
    backpressureEvents: 0,
    avgTickLatencyMs: 0,
    _tickLatencySum: 0,
    _tickLatencyCount: 0,
  },

  // Worker metrics
  workers: {
    jobsProcessed: 0,
    jobsFailed: 0,
    avgJobLatencyMs: 0,
    _latencySum: 0,
    _latencyCount: 0,
    tboApiCalls: 0,
    tboApiErrors: 0,
    tboAvgLatencyMs: 0,
    _tboLatencySum: 0,
    _tboLatencyCount: 0,
    mongoQueries: 0,
    mongoAvgLatencyMs: 0,
    _mongoLatencySum: 0,
    _mongoLatencyCount: 0,
  },

  // Finalizer metrics
  finalizer: {
    total: 0,
    completed: 0,
    failed: 0,
    avgLatencyMs: 0,
    _latencySum: 0,
    _latencyCount: 0,
    avgHotels: 0,
    _hotelSum: 0,
    _hotelCount: 0,
  },

  // Socket metrics
  socket: {
    emits: 0,
    avgBatchSize: 0,
    _batchSum: 0,
    _batchCount: 0,
    connections: 0,
    rooms: 0,
  },

  // Redis metrics
  redis: {
    totalOps: 0,
    avgLatencyMs: 0,
    _latencySum: 0,
    _latencyCount: 0,
  },

  // Event loop lag (populated by perf_hooks monitorEventLoopDelay)
  eventLoop: {
    mean: 0,
    max: 0,
    p99: 0,
  },

  // Queue metrics (point-in-time snapshot)
  queue: {
    waiting: 0,
    active: 0,
    completed: 0,
    failed: 0,
    delayed: 0,
  },
};

/**
 * Record a search lifecycle event.
 */
function recordSearch(event) {
  metrics.searches.total++;
  if (event.cached) metrics.searches.cached++;
  if (event.completed) metrics.searches.completed++;
  if (event.failed) metrics.searches.failed++;
  if (event.latencyMs) {
    metrics.searches._latencySum += event.latencyMs;
    metrics.searches._latencyCount++;
    metrics.searches.avgLatencyMs = Math.round(
      metrics.searches._latencySum / metrics.searches._latencyCount
    );
  }
}

/**
 * Record a dispatcher tick.
 */
function recordDispatcherTick(event) {
  metrics.dispatcher.ticks++;
  if (event.chunksDispatched) {
    metrics.dispatcher.chunksDispatched += event.chunksDispatched;
    metrics.dispatcher._batchSum += event.chunksDispatched;
    metrics.dispatcher._batchCount++;
    metrics.dispatcher.avgBatchSize = Math.round(
      metrics.dispatcher._batchSum / metrics.dispatcher._batchCount
    );
  }
  if (event.backpressure) metrics.dispatcher.backpressureEvents++;
  if (event.tickLatencyMs) {
    metrics.dispatcher._tickLatencySum += event.tickLatencyMs;
    metrics.dispatcher._tickLatencyCount++;
    metrics.dispatcher.avgTickLatencyMs = Math.round(
      metrics.dispatcher._tickLatencySum / metrics.dispatcher._tickLatencyCount
    );
  }
}

/**
 * Record a worker job event.
 */
function recordWorkerJob(event) {
  metrics.workers.jobsProcessed++;
  if (event.failed) metrics.workers.jobsFailed++;
  if (event.latencyMs) {
    metrics.workers._latencySum += event.latencyMs;
    metrics.workers._latencyCount++;
    metrics.workers.avgJobLatencyMs = Math.round(
      metrics.workers._latencySum / metrics.workers._latencyCount
    );
  }
  if (event.tboLatencyMs) {
    metrics.workers.tboApiCalls++;
    metrics.workers._tboLatencySum += event.tboLatencyMs;
    metrics.workers._tboLatencyCount++;
    metrics.workers.tboAvgLatencyMs = Math.round(
      metrics.workers._tboLatencySum / metrics.workers._tboLatencyCount
    );
  }
  if (event.tboError) metrics.workers.tboApiErrors++;
  if (event.mongoLatencyMs) {
    metrics.workers.mongoQueries++;
    metrics.workers._mongoLatencySum += event.mongoLatencyMs;
    metrics.workers._mongoLatencyCount++;
    metrics.workers.mongoAvgLatencyMs = Math.round(
      metrics.workers._mongoLatencySum / metrics.workers._mongoLatencyCount
    );
  }
}

/**
 * Record a finalizer event.
 */
function recordFinalizer(event) {
  metrics.finalizer.total++;
  if (event.completed) metrics.finalizer.completed++;
  if (event.failed) metrics.finalizer.failed++;
  if (event.latencyMs) {
    metrics.finalizer._latencySum += event.latencyMs;
    metrics.finalizer._latencyCount++;
    metrics.finalizer.avgLatencyMs = Math.round(
      metrics.finalizer._latencySum / metrics.finalizer._latencyCount
    );
  }
  if (event.hotels) {
    metrics.finalizer._hotelSum += event.hotels;
    metrics.finalizer._hotelCount++;
    metrics.finalizer.avgHotels = Math.round(
      metrics.finalizer._hotelSum / metrics.finalizer._hotelCount
    );
  }
}

/**
 * Record a socket emit event.
 */
function recordSocketEmit(event) {
  metrics.socket.emits++;
  if (event.batchSize) {
    metrics.socket._batchSum += event.batchSize;
    metrics.socket._batchCount++;
    metrics.socket.avgBatchSize = Math.round(
      metrics.socket._batchSum / metrics.socket._batchCount
    );
  }
}

/**
 * Record Redis operation latency.
 */
function recordRedisOp(event) {
  metrics.redis.totalOps++;
  if (event.latencyMs) {
    metrics.redis._latencySum += event.latencyMs;
    metrics.redis._latencyCount++;
    metrics.redis.avgLatencyMs = (
      metrics.redis._latencySum / metrics.redis._latencyCount
    ).toFixed(2);
  }
}

/**
 * Update queue depth snapshot.
 */
function updateQueueDepth(depth) {
  Object.assign(metrics.queue, depth);
}

/**
 * Update event loop lag from perf_hooks monitorEventLoopDelay.
 */
function updateEventLoopLag(lag) {
  metrics.eventLoop.mean = lag.mean || 0;
  metrics.eventLoop.max = lag.max || 0;
  metrics.eventLoop.p99 = lag.p99 || 0;
}

/**
 * Get a snapshot of all metrics.
 * Safe to expose via /health or /metrics endpoint.
 */
function getMetricsSnapshot() {
  return JSON.parse(JSON.stringify(metrics));
}

/**
 * Get formatted Prometheus text metrics.
 */
function getPrometheusMetrics() {
  const lines = [];

  lines.push(`# HELP search_total Total searches initiated`);
  lines.push(`# TYPE search_total counter`);
  lines.push(`search_total ${metrics.searches.total}`);

  lines.push(`# HELP search_cached Cache hits`);
  lines.push(`search_cached ${metrics.searches.cached}`);

  lines.push(`# HELP search_completed Completed searches`);
  lines.push(`search_completed ${metrics.searches.completed}`);

  lines.push(`# HELP search_failed Failed searches`);
  lines.push(`search_failed ${metrics.searches.failed}`);

  lines.push(`# HELP search_latency_avg_ms Average search latency`);
  lines.push(`search_latency_avg_ms ${metrics.searches.avgLatencyMs}`);

  lines.push(`# HELP dispatcher_chunks_dispatched Total chunks dispatched`);
  lines.push(`dispatcher_chunks_dispatched ${metrics.dispatcher.chunksDispatched}`);

  lines.push(`# HELP dispatcher_backpressure_events Backpressure events`);
  lines.push(`dispatcher_backpressure_events ${metrics.dispatcher.backpressureEvents}`);

  lines.push(`# HELP dispatcher_tick_latency_avg_ms Average dispatcher tick latency`);
  lines.push(`dispatcher_tick_latency_avg_ms ${metrics.dispatcher.avgTickLatencyMs}`);

  lines.push(`# HELP worker_jobs_processed Total worker jobs processed`);
  lines.push(`worker_jobs_processed ${metrics.workers.jobsProcessed}`);

  lines.push(`# HELP worker_jobs_failed Total worker jobs failed`);
  lines.push(`worker_jobs_failed ${metrics.workers.jobsFailed}`);

  lines.push(`# HELP worker_job_latency_avg_ms Average worker job latency`);
  lines.push(`worker_job_latency_avg_ms ${metrics.workers.avgJobLatencyMs}`);

  lines.push(`# HELP worker_tbo_api_calls Total TBO API calls`);
  lines.push(`worker_tbo_api_calls ${metrics.workers.tboApiCalls}`);

  lines.push(`# HELP worker_tbo_api_errors Total TBO API errors`);
  lines.push(`worker_tbo_api_errors ${metrics.workers.tboApiErrors}`);

  lines.push(`# HELP worker_tbo_avg_latency_ms Average TBO API latency`);
  lines.push(`worker_tbo_avg_latency_ms ${metrics.workers.tboAvgLatencyMs}`);

  lines.push(`# HELP finalizer_total Total finalizations`);
  lines.push(`finalizer_total ${metrics.finalizer.total}`);

  lines.push(`# HELP finalizer_completed Completed finalizations`);
  lines.push(`finalizer_completed ${metrics.finalizer.completed}`);

  lines.push(`# HELP finalizer_avg_latency_ms Average finalization latency`);
  lines.push(`finalizer_avg_latency_ms ${metrics.finalizer.avgLatencyMs}`);

  lines.push(`# HELP finalizer_avg_hotels Average hotels per search`);
  lines.push(`finalizer_avg_hotels ${metrics.finalizer.avgHotels}`);

  lines.push(`# HELP socket_emits Total socket emits`);
  lines.push(`socket_emits ${metrics.socket.emits}`);

  lines.push(`# HELP socket_avg_batch_size Average socket batch size`);
  lines.push(`socket_avg_batch_size ${metrics.socket.avgBatchSize}`);

  lines.push(`# HELP redis_total_ops Total Redis operations`);
  lines.push(`redis_total_ops ${metrics.redis.totalOps}`);

  lines.push(`# HELP redis_avg_latency_ms Average Redis latency`);
  lines.push(`redis_avg_latency_ms ${metrics.redis.avgLatencyMs}`);

  lines.push(`# HELP queue_waiting Jobs waiting in queue`);
  lines.push(`queue_waiting ${metrics.queue.waiting}`);

  lines.push(`# HELP queue_active Jobs currently active`);
  lines.push(`queue_active ${metrics.queue.active}`);

  lines.push(`# HELP event_loop_lag_mean_ms Mean event loop lag`);
  lines.push(`event_loop_lag_mean_ms ${metrics.eventLoop.mean}`);
  lines.push(`# HELP event_loop_lag_max_ms Max event loop lag`);
  lines.push(`event_loop_lag_max_ms ${metrics.eventLoop.max}`);
  lines.push(`# HELP event_loop_lag_p99_ms P99 event loop lag`);
  lines.push(`event_loop_lag_p99_ms ${metrics.eventLoop.p99}`);

  return lines.join("\n") + "\n";
}

/**
 * Reset all metrics (useful for periodic snapshots).
 */
function resetMetrics() {
  const snapshot = getMetricsSnapshot();
  // Reset counters
  metrics.searches = { total: 0, cached: 0, completed: 0, failed: 0, avgLatencyMs: 0, _latencySum: 0, _latencyCount: 0 };
  metrics.dispatcher = { ticks: 0, chunksDispatched: 0, avgBatchSize: 0, _batchSum: 0, _batchCount: 0, backpressureEvents: 0, avgTickLatencyMs: 0, _tickLatencySum: 0, _tickLatencyCount: 0 };
  metrics.workers = { jobsProcessed: 0, jobsFailed: 0, avgJobLatencyMs: 0, _latencySum: 0, _latencyCount: 0, tboApiCalls: 0, tboApiErrors: 0, tboAvgLatencyMs: 0, _tboLatencySum: 0, _tboLatencyCount: 0, mongoQueries: 0, mongoAvgLatencyMs: 0, _mongoLatencySum: 0, _mongoLatencyCount: 0 };
  metrics.finalizer = { total: 0, completed: 0, failed: 0, avgLatencyMs: 0, _latencySum: 0, _latencyCount: 0, avgHotels: 0, _hotelSum: 0, _hotelCount: 0 };
  metrics.socket = { emits: 0, avgBatchSize: 0, _batchSum: 0, _batchCount: 0, connections: 0, rooms: 0 };
  metrics.redis = { totalOps: 0, avgLatencyMs: 0, _latencySum: 0, _latencyCount: 0 };
  return snapshot;
}

module.exports = {
  recordSearch,
  recordDispatcherTick,
  recordWorkerJob,
  recordFinalizer,
  recordSocketEmit,
  recordRedisOp,
  updateQueueDepth,
  updateEventLoopLag,
  getMetricsSnapshot,
  getPrometheusMetrics,
  resetMetrics,
  metrics,
};
