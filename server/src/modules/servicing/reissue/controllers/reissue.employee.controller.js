const asyncHandler = require("../../../../utils/asyncHandler");
const ApiResponse = require("../../../../utils/ApiResponse");
const reissueWorkflowService = require("../services/reissueWorkflow.service");
const { toReissueDto } = require("../transformers/reissue.dto");
const { toOfflineReissueDto } = require("../transformers/offlineReissue.dto");
const { REISSUE_STATUSES } = require("../constants/reissue.constants");

/**
 * GET /api/v1/reissue/eligibility/:bookingId
 * Frontend calls this to determine online vs offline eligibility dynamically.
 */
exports.checkEligibility = asyncHandler(async (req, res) => {
  const result = await reissueWorkflowService.checkEligibility({
    actor: req.user,
    bookingId: req.params.bookingId,
  });

  if (!result.eligible) {
    return res.status(200).json(
      new ApiResponse(200, {
        success: false,
        code: result.code,
        message: result.message,
        mode: result.mode,
        support: result.support,
        reasons: result.reasons,
      }, result.message),
    );
  }

  res.status(200).json(
    new ApiResponse(200, {
      success: true,
      code: result.code,
      message: result.message,
      mode: result.mode,
      support: result.support,
      supplier: result.supplier,
    }, result.message),
  );
});

/**
 * POST /api/v1/reissue/search
 * Online reissue search - ONLY when eligibility passes.
 */
exports.search = asyncHandler(async (req, res) => {
  const request = await reissueWorkflowService.createRequest({
    actor: req.user,
    payload: req.body,
  });

  // CRITICAL: If eligibility failed, return ONLINE_REISSUE_NOT_SUPPORTED
  if (request.status === REISSUE_STATUSES.FAILED) {
    const errorCode = request.metadata?.errorCode || "ONLINE_REISSUE_NOT_SUPPORTED";
    const reasons = request.timeline
      ?.filter((t) => t.status === REISSUE_STATUSES.FAILED)
      .map((t) => t.description)
      .filter(Boolean);

    return res.status(200).json(
      new ApiResponse(200, {
        success: false,
        code: errorCode,
        message: "This booking does not support online reissue. Please raise offline request.",
        reissueRequestId: request._id,
        reasons,
        supplierSupport: request.supplierSupport,
      }, "Online reissue not supported"),
    );
  }

  // ── OFFLINE_REQUIRED: provider routed to offline (sandbox / PNR restriction / fare rules) ──
  if (request.status === REISSUE_STATUSES.OFFLINE_REQUIRED) {
    const offlineCode =
      request.metadata?.errorCode ||
      "TBO_SANDBOX_REISSUE_UNSUPPORTED";

    return res.status(200).json(
      new ApiResponse(200, {
        success: false,
        code: offlineCode,
        message: "Online reissue is currently unavailable for this booking/airline.",
        providerMessage:
          "TBO sandbox or airline does not support online reissue for this PNR.",
        fallbackAvailable: true,
        mode: "OFFLINE",
        status: request.status,
        reissueId: request.reissueId,
        reissueRequestId: request._id,
      }, "Offline reissue required"),
    );
  }

  if (request.status === REISSUE_STATUSES.SEARCH_COMPLETED) {
    return res.status(200).json(
      new ApiResponse(200, {
        success: true,
        reissueRequestId: request._id,
        reissueId: request.reissueId,
        mode: request.mode,
        status: request.status,
        flightOptions: request.supplierResponse?.searchResponse?.Response?.Results || [],
        miniFareRules: request.miniFareRules || [],
        supplierReissueSupported: request.supplierSupport?.onlineReissue || false,
      }, "Reissue search completed"),
    );
  }

  res.status(201).json(
    new ApiResponse(201, toReissueDto(request), "Reissue request created"),
  );

});

exports.create = exports.search;

exports.fareQuote = asyncHandler(async (req, res) => {
  const request = await reissueWorkflowService.previewOnlineQuote({
    actor: req.user,
    requestId: req.params.id,
    resultIndex: req.body?.resultIndex,
  });

  res.status(200).json(
    new ApiResponse(200, toReissueDto(request), "Reissue fare quote generated"),
  );
});

exports.previewQuote = exports.fareQuote;

exports.confirm = asyncHandler(async (req, res) => {
  const request = await reissueWorkflowService.confirmOnlineReissue({
    actor: req.user,
    requestId: req.params.id,
    remarks: req.body?.remarks,
    ticketData: req.body?.ticketData,
  });

  res.status(200).json(
    new ApiResponse(200, toReissueDto(request), "Reissue completed"),
  );
});

exports.getMyRequests = asyncHandler(async (req, res) => {
  const result = await reissueWorkflowService.getMyRequests({
    actor: req.user,
    query: req.query,
  });

  res.status(200).json(
    new ApiResponse(200, {
      data: result.data.map(toReissueDto),
      pagination: result.pagination,
    }, "My reissue requests fetched"),
  );
});

exports.getCompanyRequests = asyncHandler(async (req, res) => {
  const corporateId = req.query.corporateId || req.user.corporateId;
  if (!corporateId) {
    return res.status(400).json(new ApiResponse(400, null, "Corporate ID missing"));
  }

  const query = { ...req.query, corporateId };
  const page = Number(query.page || 1);
  const limit = Number(query.limit || 20);

  // Lazy-require repositories to avoid circular deps
  const reissueRepository = require("../repositories/reissue.repository");
  const offlineReissueRepository = require("../repositories/offlineReissue.repository");

  // ── CRITICAL FIX: Exclude terminal/routed statuses from online query ──
  // When an online reissue fails and falls back to offline, both repos have a record
  // for the same booking. Excluding OFFLINE_REQUIRED/FAILED/CANCELLED from the online
  // query prevents duplicate rows in the combined list.
  const EXCLUDED_ONLINE_STATUSES = ["OFFLINE_REQUIRED", "FAILED", "CANCELLED"];

  const onlineQuery = { corporateId };
  if (query.status) {
    onlineQuery.status = query.status;
  } else {
    onlineQuery.status = { $nin: EXCLUDED_ONLINE_STATUSES };
  }

  const offlineQuery = { corporateId };
  if (query.status) offlineQuery.status = query.status;

  const [onlineRes, offlineRes] = await Promise.all([
    reissueRepository.list(onlineQuery, { page, limit }),
    offlineReissueRepository.list(offlineQuery, { page, limit }),
  ]);

  // ── Use the correct transformer per record type ──
  // Online records  → toReissueDto        (oldJourney / newJourney structure)
  // Offline records → toOfflineReissueDto (selectedSegments / preferredJourney / pricingSnapshot)
  const onlineDtos  = (onlineRes.data  || []).map(toReissueDto);
  const offlineDtos = (offlineRes.data || []).map(toOfflineReissueDto);

  const combined = [...onlineDtos, ...offlineDtos].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  );

  // ── CRITICAL FIX: Deduplicate records for the same PNR or Request ID ──
  // Since the combined list is sorted by createdAt desc, the first record we see
  // for any PNR is the most recent (highest priority) and should be kept.
  const seenPnrs = new Set();
  const seenRequestIds = new Set();
  const deduped = [];

  for (const item of combined) {
    const pnr = (item.displayInfo?.pnr || item.pnr || "").trim().toUpperCase();
    const reqId = (item.requestId || item.id || item._id || "").toString().trim();
    
    let isDuplicate = false;
    if (pnr && pnr !== "N/A" && seenPnrs.has(pnr)) {
      isDuplicate = true;
    }
    if (reqId && seenRequestIds.has(reqId)) {
      isDuplicate = true;
    }

    if (!isDuplicate) {
      if (pnr && pnr !== "N/A") seenPnrs.add(pnr);
      if (reqId) seenRequestIds.add(reqId);
      deduped.push(item);
    }
  }

  // ── CRITICAL FIX: Use real aggregate totals for pagination ──
  const aggregateTotal = deduped.length;

  res.status(200).json(
    new ApiResponse(200, {
      data: deduped,
      pagination: {
        total: aggregateTotal,
        page,
        pages: Math.ceil(aggregateTotal / limit) || 1,
        limit,
      },
    }, "Company reissue requests fetched"),
  );
});
exports.getById = asyncHandler(async (req, res) => {
  // ── Try online repo first ──
  let request;
  try {
    request = await reissueWorkflowService.getById({
      actor: req.user,
      requestId: req.params.id,
    });
  } catch (err) {
    if (err.statusCode !== 404) throw err;
    request = null;
  }

  if (request) {
    return res.status(200).json(
      new ApiResponse(200, toReissueDto(request), "Reissue request fetched"),
    );
  }

  // ── Fallback: check offline repo ──
  const offlineReissueRepository = require("../repositories/offlineReissue.repository");
  const offlineRequest = await offlineReissueRepository.findByIdOrRequestId(req.params.id);

  if (!offlineRequest) {
    return res.status(404).json(new ApiResponse(404, null, "Reissue request not found"));
  }

  res.status(200).json(
    new ApiResponse(200, toOfflineReissueDto(offlineRequest), "Reissue request fetched"),
  );
});
