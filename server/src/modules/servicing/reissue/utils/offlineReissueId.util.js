const OfflineReissueRequest = require("../schemas/OfflineReissueRequest.schema");

async function generateOfflineReissueId() {
  const year = new Date().getFullYear();
  const prefix = `OREI-${year}`;
  const count = await OfflineReissueRequest.countDocuments({
    requestId: { $regex: `^${prefix}` },
  });
  return `${prefix}-${String(count + 1).padStart(6, "0")}`;
}

module.exports = { generateOfflineReissueId };
