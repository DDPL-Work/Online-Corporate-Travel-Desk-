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

  // Lazy-require repositories to avoid circular deps
  const reissueRepository = require("../repositories/reissue.repository");
  const offlineReissueRepository = require("../repositories/offlineReissue.repository");

  const mongoQuery = { corporateId };
  if (query.status) mongoQuery.status = query.status;

  const [onlineRes, offlineRes] = await Promise.all([
    reissueRepository.list(mongoQuery, {
      page: Number(query.page || 1),
      limit: Number(query.limit || 20),
    }),
    offlineReissueRepository.list(mongoQuery, {
      page: Number(query.page || 1),
      limit: Number(query.limit || 20),
    }),
  ]);

  // ── CRITICAL: Use the correct transformer per record type ──────────────────
  // Online records  → toReissueDto        (oldJourney / newJourney structure)
  // Offline records → toOfflineReissueDto (selectedSegments / preferredJourney / pricingSnapshot)
  // Mixing transformers strips all flight/pricing fields from offline records.
  const onlineDtos  = (onlineRes.data  || []).map(toReissueDto);
  const offlineDtos = (offlineRes.data || []).map(toOfflineReissueDto);

  const combined = [...onlineDtos, ...offlineDtos].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  );

  res.status(200).json(
    new ApiResponse(200, {
      data: combined,
      pagination: { total: combined.length, page: 1, pages: 1 },
    }, "Company reissue requests fetched"),
  );
});
exports.getById = asyncHandler(async (req, res) => {
  const request = await reissueWorkflowService.getById({
    actor: req.user,
    requestId: req.params.id,
  });

  res.status(200).json(
    new ApiResponse(200, toReissueDto(request), "Reissue request fetched"),
  );
});
