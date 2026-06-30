require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const mongoose = require("mongoose");
const config = require("../config");

/**
 * Fix 5: Database Repair Script
 * 
 * Fixes OfflineReissueRequest documents that were prematurely assigned
 * before reaching EXECUTED approval stage.
 * 
 * RUN: node src/scripts/repairPrematureAssignments.js
 */

const ACTIVE = ["PENDING_ASSIGNMENT", "RAISED", "ASSIGNED", "IN_PROGRESS", "WAITING_AIRLINE", "TICKET_GENERATED", "COMPLETED"];
const TERMINAL = ["COMPLETED", "FAILED", "REJECTED", "CANCELLED"];

async function main() {
  await mongoose.connect(config.database.uri, config.database.options);
  console.log("Connected to MongoDB\n");

  const OpsMember = mongoose.model("OpsMember", require("../models/OpsMember").schema);
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  const collNames = collections.map(c => c.name);

  const reissueCollName = collNames.find(n => n.toLowerCase().includes("offlinereissue"))
    || collNames.find(n => n.toLowerCase().includes("reissuerequest"))
    || "offlinereissuerequests";

  const reissueColl = db.collection(reissueCollName);

  // Find prematurely assigned requests: status=ASSIGNED but approvalStage != EXECUTED
  const premature = await reissueColl.find({
    status: "ASSIGNED",
    assignedOpsMember: { $ne: null },
    $or: [
      { approvalStage: { $exists: false } },
      { approvalStage: null },
      { approvalStage: { $ne: "EXECUTED" } },
    ],
  }).toArray();

  console.log(`Found ${premature.length} prematurely assigned offline reissue requests.\n`);

  let repairedCount = 0;
  let skippedCount = 0;

  for (const request of premature) {
    const opsMemberId = request.assignedOpsMember;
    const name = request.name || request.requestId || request._id;

    const opsMember = await OpsMember.findById(opsMemberId);
    if (!opsMember) {
      console.log(`  SKIP: ${name} — assigned ops member ${opsMemberId} not found`);
      skippedCount++;
      continue;
    }

    console.log(`\n  REPAIR: ${name}`);
    console.log(`    Status: ${request.status}`);
    console.log(`    Approval Stage: ${request.approvalStage || "(not set)"}`);
    console.log(`    Assigned Ops: ${opsMember.name}`);
    console.log(`    Current workload: reissues=${opsMember.currentActiveReissues}, workload=${opsMember.currentWorkload}, activeAssignments=${opsMember.currentActiveAssignments}`);

    // Decrement workload
    opsMember.currentActiveReissues = Math.max(0, Number(opsMember.currentActiveReissues || 0) - 1);
    opsMember.currentWorkload = Math.max(0, Number(opsMember.currentWorkload || 0) - 1);
    opsMember.currentActiveAssignments = Math.max(0, Number(opsMember.currentActiveAssignments || 0) - 1);
    await opsMember.save();

    console.log(`    → Workload decremented: reissues=${opsMember.currentActiveReissues}, workload=${opsMember.currentWorkload}, activeAssignments=${opsMember.currentActiveAssignments}`);

    // Unassign the request
    await reissueColl.updateOne(
      { _id: request._id },
      {
        $set: {
          assignmentStatus: "UNASSIGNED",
          status: "PENDING_ASSIGNMENT",
          autoAssignmentAttempted: false,
          assignmentFailureReason: "REPAIRED: premature assignment before EXECUTED",
        },
        $unset: {
          assignedOpsMember: "",
          assignedAt: "",
          assignmentMethod: "",
        },
      },
    );

    console.log(`    → Request reset to PENDING_ASSIGNMENT (unassigned)`);
    repairedCount++;
  }

  console.log(`\n\n=== SUMMARY ===`);
  console.log(`Total premature requests found: ${premature.length}`);
  console.log(`Repaired: ${repairedCount}`);
  console.log(`Skipped: ${skippedCount}`);

  if (repairedCount > 0) {
    console.log(`\nThese requests will be automatically assigned via round-robin`);
    console.log(`when they reach EXECUTED approval stage through the approval controller.`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
