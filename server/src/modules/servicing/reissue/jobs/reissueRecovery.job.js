const logger = require("../../../../utils/logger");
const reissueWorkflowService = require("../services/reissueWorkflow.service");

async function runReissueRecoveryJob() {
  const recovered = await reissueWorkflowService.recoverStaleRequests();
  logger.info("REISSUE RECOVERY JOB COMPLETED", {
    recoveredCount: recovered.length,
    recovered,
  });
  return recovered;
}

module.exports = { runReissueRecoveryJob };
