const asyncHandler = require("../../../../utils/asyncHandler");
const ApiResponse = require("../../../../utils/ApiResponse");
const reissueWorkflowService = require("../services/reissueWorkflow.service");

const { toReissueDto } = require("../transformers/reissue.dto");

exports.list = asyncHandler(async (req, res) => {
  const result = await reissueWorkflowService.listAdmin({ query: req.query });
  res.status(200).json(
    new ApiResponse(
      200,
      {
        data: result.data.map(toReissueDto),
        pagination: result.pagination,
      },
      "Reissue requests fetched",
    ),
  );
});

exports.analytics = asyncHandler(async (req, res) => {
  const analytics = await reissueWorkflowService.getAnalytics();
  res.status(200).json(
    new ApiResponse(200, analytics, "Reissue analytics fetched"),
  );
});
