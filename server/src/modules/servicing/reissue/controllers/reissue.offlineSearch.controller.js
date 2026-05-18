const asyncHandler = require("../../../../utils/asyncHandler");
const ApiResponse = require("../../../../utils/ApiResponse");
const offlineSearchService = require("../services/offlineSearch.service");

exports.searchOptions = asyncHandler(async (req, res) => {
  const response = await offlineSearchService.searchOptions({
    actor: req.user,
    payload: req.body,
  });

  res.status(200).json(new ApiResponse(200, response, "Offline alternative flights fetched"));
});
