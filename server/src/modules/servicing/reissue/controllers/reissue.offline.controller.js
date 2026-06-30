const mongoose = require("mongoose");
const asyncHandler = require("../../../../utils/asyncHandler");
const ApiResponse = require("../../../../utils/ApiResponse");
const ApiError = require("../../../../utils/ApiError");
const offlineReissueWorkflowService = require("../services/offlineReissueWorkflow.service");
const { toOfflineReissueDto } = require("../transformers/offlineReissue.dto");

/**
 * POST /api/v1/reissue/offline/create
 * Employee raises an offline reissue request.
 */
exports.create = asyncHandler(async (req, res) => {
  const request = await offlineReissueWorkflowService.createRequest({
    actor: req.user,
    payload: req.body,
  });
  const message =
    request?.status === "PENDING_ASSIGNMENT"
      ? "Reissue request submitted successfully and awaiting OPS assignment."
      : "Offline reissue request created and assigned successfully.";

  res.status(201).json(
    new ApiResponse(201, toOfflineReissueDto(request), message),
  );
});

/**
 * GET /api/v1/reissue/offline/my-requests
 * Employee views their own offline reissue requests.
 */
exports.getMyRequests = asyncHandler(async (req, res) => {
  const result = await offlineReissueWorkflowService.getMyRequests({
    actor: req.user,
    query: req.query,
  });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        data: result.data.map(toOfflineReissueDto),
        pagination: result.pagination,
      },
      "Offline reissue requests fetched",
    ),
  );
});

/**
 * GET /api/v1/reissue/offline/:id
 * Fetch a single offline reissue request by ID.
 */
exports.getById = asyncHandler(async (req, res) => {
  const request = await offlineReissueWorkflowService.getById({
    actor: req.user,
    requestId: req.params.id,
  });

  res.status(200).json(
    new ApiResponse(200, toOfflineReissueDto(request), "Offline reissue request fetched"),
  );
});

/**
 * GET /api/v1/reissue/offline/admin/list
 * Admin/ops view of all offline reissue requests.
 */
exports.listAdmin = asyncHandler(async (req, res) => {
  let query = { ...req.query };

  if (req.opsMember && (query.assignedTo === "me" || query.assignedOpsMember === "me")) {
    query.assignedOpsMember = new mongoose.Types.ObjectId(req.user.id);
  }

  const ADMIN_ROLES = ["super-admin", "master-admin", "ops-admin"];
  if (req.opsMember && !ADMIN_ROLES.includes(req.user?.role)) {
    query.assignedOpsMember = new mongoose.Types.ObjectId(req.user.id);
  }

  // Only restrict to EXECUTED when ops member is browsing ALL requests
  // (not filtered to their own assigned queue)
  if (req.user?.role === "ops-member" && !query.assignedOpsMember) {
    query.approvalStage = "EXECUTED";
  }

  const result = await offlineReissueWorkflowService.listAdmin({
    actor: req.user,
    query,
  });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        data: result.data.map(toOfflineReissueDto),
        pagination: result.pagination,
        metrics: result.metrics,
      },
      "Offline reissue requests fetched",
    ),
  );
});

/**
 * PATCH /api/v1/reissue/offline/:id/status
 * Ops team updates the status of an offline reissue.
 */
exports.updateStatus = asyncHandler(async (req, res) => {
  const request = await offlineReissueWorkflowService.updateStatus({
    actor: req.user,
    requestId: req.params.id,
    payload: req.body,
  });

  res.status(200).json(
    new ApiResponse(200, toOfflineReissueDto(request), "Offline reissue status updated"),
  );
});

/**
 * PATCH /api/v1/reissue/offline/:id/reassign
 * Reassign an offline reissue request to a different OPS member.
 */
exports.reassign = asyncHandler(async (req, res) => {
  const request = await offlineReissueWorkflowService.reassignRequest({
    actor: req.user,
    requestId: req.params.id,
    payload: req.body,
  });

  res.status(200).json(
    new ApiResponse(200, toOfflineReissueDto(request), "Offline reissue request reassigned"),
  );
});

exports.generateTicket = asyncHandler(async (req, res) => {
  const request = await offlineReissueWorkflowService.generateTicket({
    actor: req.user,
    requestId: req.params.id,
    payload: req.body || {},
  });

  res.status(200).json(
    new ApiResponse(200, toOfflineReissueDto(request), "Offline reissue ticket generated"),
  );
});

exports.downloadTicket = asyncHandler(async (req, res) => {
  const { artifact } = await offlineReissueWorkflowService.getArtifactForDownload({
    actor: req.user,
    requestId: req.params.id,
    type: "ticket",
  });

  if (artifact.localPath) {
    res.setHeader("Content-Type", "application/pdf");
    return res.download(artifact.localPath, artifact.fileName);
  }

  if (artifact.url) {
    return res.redirect(artifact.url);
  }

  // ── CRITICAL FIX: Neither localPath nor url available — throw instead of crash ──
  throw new ApiError(404, "Ticket file is not available for download");
});
