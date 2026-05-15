const asyncHandler = require("../../../../utils/asyncHandler");
const ApiResponse = require("../../../../utils/ApiResponse");
const reissueWorkflowService = require("../services/reissueWorkflow.service");
const { toReissueDto } = require("../transformers/reissue.dto");

exports.list = asyncHandler(async (req, res) => {
  const result = await reissueWorkflowService.listOps({ query: req.query });
  res.status(200).json(
    new ApiResponse(
      200,
      {
        data: result.data.map(toReissueDto),
        pagination: result.pagination,
      },
      "Ops reissue queue fetched",
    ),
  );
});

exports.updateStatus = asyncHandler(async (req, res) => {
  const request = await reissueWorkflowService.updateOpsStatus({
    actor: req.user,
    requestId: req.params.id,
    payload: req.body,
  });

  res.status(200).json(
    new ApiResponse(200, toReissueDto(request), "Ops reissue status updated"),
  );
});

exports.uploadTicket = asyncHandler(async (req, res) => {
  const request = await reissueWorkflowService.uploadArtifact({
    actor: req.user,
    requestId: req.params.id,
    file: req.file,
    type: "ticket",
  });

  res.status(200).json(
    new ApiResponse(200, toReissueDto(request), "Reissue ticket uploaded"),
  );
});

exports.uploadInvoice = asyncHandler(async (req, res) => {
  const request = await reissueWorkflowService.uploadArtifact({
    actor: req.user,
    requestId: req.params.id,
    file: req.file,
    type: "invoice",
  });

  res.status(200).json(
    new ApiResponse(200, toReissueDto(request), "Reissue invoice uploaded"),
  );
});
