require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const mongoose = require("mongoose");
const config = require("../config");
const OpsMember = require("../models/OpsMember");
const {
  isEligibleForReissueAssignment,
  evaluateReissueAssignmentEligibility,
} = require("../utils/reissueAssignmentEligibility.util");

const DEFAULT_MAX = 10;

async function main() {
  await mongoose.connect(config.database.uri, config.database.options);
  console.log("Connected\n");

  const all = await OpsMember.find({ isDeleted: false }).lean();
  console.log(`Total: ${all.length}\n`);

  // Simulate getEligibleOpsQuery()
  const mongoQuery = {
    isDeleted: false,
    $or: [
      { isAvailableForReissues: true },
      { isAvailableForReissues: { $exists: false } },
    ],
    autoAssignmentEnabled: true,
    $expr: {
      $and: [
        { $lt: [{ $ifNull: ["$currentWorkload", 0] }, { $ifNull: ["$maxConcurrentAssignments", DEFAULT_MAX] }] },
        { $lt: [{ $ifNull: ["$currentActiveAssignments", 0] }, { $ifNull: ["$maxConcurrentAssignments", DEFAULT_MAX] }] },
      ],
    },
  };

  const mongoPassed = await OpsMember.find(mongoQuery).lean();
  console.log(`=== MongoDB getEligibleOpsQuery() ===`);
  console.log(`Passed: ${mongoPassed.length}/${all.length}`);
  for (const m of all) {
    const passed = mongoPassed.some((p) => String(p._id) === String(m._id));
    if (!passed) {
      const reasons = [];
      if (m.isDeleted) reasons.push("isDeleted");
      if (m.isAvailableForReissues === false) reasons.push("isAvailableForReissues=false");
      if (m.autoAssignmentEnabled !== true) reasons.push(`autoAssignmentEnabled=${m.autoAssignmentEnabled}`);
      const wl = m.currentWorkload ?? 0;
      const mac = m.maxConcurrentAssignments ?? DEFAULT_MAX;
      const caa = m.currentActiveAssignments ?? 0;
      if (wl >= mac) reasons.push(`workload(${wl}) >= max(${mac})`);
      if (caa >= mac) reasons.push(`activeAssignments(${caa}) >= max(${mac})`);
      console.log(`  FAIL: ${m.name} → ${reasons.join(", ")}`);
    }
  }

  console.log(`\n=== isEligibleForReissueAssignment() ===`);
  for (const m of all) {
    const result = evaluateReissueAssignmentEligibility(m, { log: false, context: { service: "verify" } });
    const passed = mongoPassed.some((p) => String(p._id) === String(m._id));
    if (passed) {
      console.log(`  ${m.name}: Mongo PASS + Eligibility ${result.eligible ? "PASS" : "FAIL → " + result.reasons.join(", ")}`);
    } else {
      console.log(`  ${m.name}: Mongo FAIL (skipped eligibility check)`);
    }
  }

  await mongoose.disconnect();
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
