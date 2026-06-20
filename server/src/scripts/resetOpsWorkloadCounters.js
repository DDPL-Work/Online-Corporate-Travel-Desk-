require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const mongoose = require("mongoose");
const config = require("../config");

const ACTIVE_STATUSES = [
  "PENDING_ASSIGNMENT", "RAISED", "ASSIGNED",
  "IN_PROGRESS", "WAITING_AIRLINE", "TICKET_GENERATED",
];

async function main() {
  await mongoose.connect(config.database.uri, config.database.options);
  console.log("Connected\n");

  const OpsMember = mongoose.model("OpsMember", require("../models/OpsMember").schema);
  const members = await OpsMember.find({ isDeleted: false }).lean();

  const db = mongoose.connection.db;
  const reissues = await db.collection("offlinereissuerequests").find({}).toArray();

  for (const member of members) {
    const activeCount = reissues.filter(
      (r) =>
        r.assignedOpsMember &&
        String(r.assignedOpsMember) === String(member._id) &&
        ACTIVE_STATUSES.includes(r.status),
    ).length;

    console.log(
      `${member.name} (${member.email}): resetting from workload=${member.currentWorkload}, activeAssignments=${member.currentActiveAssignments} -> ${activeCount}`,
    );

    await db.collection("opsmembers").updateOne(
      { _id: member._id },
      { $set: { currentWorkload: activeCount, currentActiveAssignments: activeCount } },
    );
  }

  // Verify
  console.log("\n=== Verification ===");
  const updated = await OpsMember.find({ isDeleted: false }).lean();
  for (const m of updated) {
    console.log(`  ${m.name}: workload=${m.currentWorkload}, activeAssignments=${m.currentActiveAssignments}`);
  }

  await mongoose.disconnect();
  console.log("\nDone - counters reset to actual active assignment counts");
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
