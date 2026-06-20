require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const mongoose = require("mongoose");
const config = require("../config");

async function main() {
  await mongoose.connect(config.database.uri, config.database.options);
  console.log("Connected\n");

  // Get all Ops members
  const OpsMember = mongoose.model("OpsMember", require("../models/OpsMember").schema);
  const members = await OpsMember.find({ isDeleted: false }).lean();

  // Get all offline reissue requests (collection name might differ)
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  const collNames = collections.map(c => c.name);
  console.log("Collections:", collNames.filter(n => n.toLowerCase().includes("reissue") || n.toLowerCase().includes("offline")));

  // Try to find the offline reissue collection
  const reissueCollName = collNames.find(n => n.toLowerCase().includes("offlinereissue")) 
    || collNames.find(n => n.toLowerCase().includes("reissuerequest"))
    || "offlinereissuerequests";

  const reissueColl = db.collection(reissueCollName);
  const allRequests = await reissueColl.find({}).toArray();
  console.log(`\nTotal offline reissue requests: ${allRequests.length}`);

  // Active statuses
  const ACTIVE = ["PENDING_ASSIGNMENT", "RAISED", "ASSIGNED", "IN_PROGRESS", "WAITING_AIRLINE", "TICKET_GENERATED"];
  const TERMINAL = ["COMPLETED", "FAILED", "REJECTED", "CANCELLED"];

  // Count per Ops member
  for (const m of members) {
    const assigned = allRequests.filter(r => 
      r.assignedOpsMember && String(r.assignedOpsMember) === String(m._id)
    );
    
    const activeAssigned = assigned.filter(r => ACTIVE.includes(r.status));
    const terminalAssigned = assigned.filter(r => TERMINAL.includes(r.status));
    const pendingAssign = assigned.filter(r => r.status === "PENDING_ASSIGNMENT");
    
    console.log(`\n${m.name} (${m.email}):`);
    console.log(`  DB counters → workload: ${m.currentWorkload}, activeAssignments: ${m.currentActiveAssignments}, max: ${m.maxConcurrentAssignments}`);
    console.log(`  Actual assigned requests: ${assigned.length}`);
    console.log(`  Active (non-terminal): ${activeAssigned.length}`);
    console.log(`  Terminal (should be released): ${terminalAssigned.length}`);
    console.log(`  PENDING_ASSIGNMENT: ${pendingAssign.length}`);
    
    for (const r of activeAssigned) {
      console.log(`    → Active: ${r.requestId || r._id} status=${r.status}`);
    }
  }

  // Also check cancellation queries for cross-system counter inflation
  console.log("\n\n=== Cancellation Queries assigned to Ops members ===");
  const cqColl = collNames.find(n => n.toLowerCase().includes("cancellationquery") || n.toLowerCase().includes("cancellation_quer"))
    || "cancellationqueries";
  try {
    const cqs = await db.collection(cqColl).find({
      assignedTo: { $exists: true, $ne: null },
      status: { $nin: ["COMPLETED", "CANCELLED", "REJECTED", "FAILED"] }
    }).toArray();
    
    for (const m of members) {
      const memberCqs = cqs.filter(cq => String(cq.assignedTo) === String(m._id));
      if (memberCqs.length > 0) {
        console.log(`  ${m.name}: ${memberCqs.length} active CQs assigned`);
      }
    }
  } catch(e) {
    console.log("  Could not query CQs:", e.message);
  }

  await mongoose.disconnect();
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
