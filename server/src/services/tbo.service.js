const hotelService = require("./tektravels/hotel.service");
const chunkArray = require("../utils/chunkArray");
const logger = require("../utils/logger");

const DEFAULT_CHUNK_SIZE = 100;
const DEFAULT_MAX_PARALLEL = 4;
const DEFAULT_MAX_RETRIES = 1;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const searchChunkWithRetry = async ({
  hotelCodes = [],
  searchPayload,
  chunkNumber,
  maxRetries = DEFAULT_MAX_RETRIES,
}) => {
  let attempt = 0;

  while (attempt <= maxRetries) {
    const startedAt = Date.now();

    try {
      const response = await hotelService.searchHotels({
        ...searchPayload,
        HotelCodes: hotelCodes.join(","),
      });

      const latencyMs = Date.now() - startedAt;
      // logger.info(
      //   `[hotel-search] chunk ${chunkNumber} success (${hotelCodes.length} codes, attempt ${attempt + 1}, ${latencyMs}ms)`,
      // );

      return {
        success: true,
        response,
        latencyMs,
        attempts: attempt + 1,
      };
    } catch (error) {
      const latencyMs = Date.now() - startedAt;
      attempt += 1;

      // logger.warn(
      //   `[hotel-search] chunk ${chunkNumber} failed on attempt ${attempt} (${latencyMs}ms): ${error.message}`,
      // );

      if (attempt > maxRetries) {
        return {
          success: false,
          response: null,
          latencyMs,
          attempts: attempt,
          error,
        };
      }

      await wait(250 * attempt);
    }
  }

  return {
    success: false,
    response: null,
    latencyMs: 0,
    attempts: maxRetries + 1,
    error: new Error("Unknown chunk execution failure"),
  };
};

const searchHotelsByCodeChunks = async ({
  hotelCodes = [],
  searchPayload,
  chunkSize = DEFAULT_CHUNK_SIZE,
  maxParallel = DEFAULT_MAX_PARALLEL,
  maxRetries = DEFAULT_MAX_RETRIES,
}) => {
  const codeChunks = chunkArray(
    (hotelCodes || []).filter(Boolean),
    Math.min(DEFAULT_CHUNK_SIZE, chunkSize),
  );
  const safeParallel = Math.max(1, Number(maxParallel) || DEFAULT_MAX_PARALLEL);
  const startedAt = Date.now();
  const successfulResponses = [];
  const failedChunks = [];

  for (
    let batchStartIndex = 0;
    batchStartIndex < codeChunks.length;
    batchStartIndex += safeParallel
  ) {
    const batch = codeChunks.slice(batchStartIndex, batchStartIndex + safeParallel);

    const batchResults = await Promise.all(
      batch.map((codes, batchIndex) =>
        searchChunkWithRetry({
          hotelCodes: codes,
          searchPayload,
          chunkNumber: batchStartIndex + batchIndex + 1,
          maxRetries,
        }),
      ),
    );

    batchResults.forEach((result, index) => {
      const chunkNumber = batchStartIndex + index + 1;

      if (result.success) {
        successfulResponses.push(result.response);
        return;
      }

      failedChunks.push({
        chunkNumber,
        hotelCodes: batch[index],
        error: result.error?.message || "Unknown TBO search failure",
        attempts: result.attempts,
      });
    });
  }

  const hotels = successfulResponses.flatMap((response) =>
    Array.isArray(response?.HotelResult) ? response.HotelResult : [],
  );
  const traceId =
    successfulResponses.find((response) => response?.TraceId)?.TraceId || null;

  return {
    hotels,
    traceId,
    failedChunks,
    totalChunks: codeChunks.length,
    elapsedMs: Date.now() - startedAt,
    maxParallel: safeParallel,
    chunkSize: Math.min(DEFAULT_CHUNK_SIZE, chunkSize),
  };
};

module.exports = {
  DEFAULT_CHUNK_SIZE,
  DEFAULT_MAX_PARALLEL,
  DEFAULT_MAX_RETRIES,
  searchHotelsByCodeChunks,
};
