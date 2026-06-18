const MarkupSimulatorService = require("../services/markupSimulator.service");
const ApiError = require("../../../utils/ApiError");

exports.simulateFlightMarkup = async (req, res, next) => {
  try {
    const { corporateId, payload } = req.body;
    
    if (!corporateId || !payload) {
      throw new ApiError(400, "corporateId and payload are required");
    }

    const result = await MarkupSimulatorService.simulateFlightMarkup(corporateId, payload);
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};
