const ReissueRequest = require("../schemas/ReissueRequest.schema");

async function generateReissueId() {
  const year = new Date().getFullYear();
  const prefix = `REI-${year}`;
  const count = await ReissueRequest.countDocuments({
    reissueId: { $regex: `^${prefix}` },
  });
  return `${prefix}-${String(count + 1).padStart(6, "0")}`;
}

module.exports = { generateReissueId };
