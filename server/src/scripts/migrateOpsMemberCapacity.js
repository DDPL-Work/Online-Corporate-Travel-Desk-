require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const mongoose = require("mongoose");
const config = require("../config");

const ACTIVE_REISSUE_STATUSES = [
  "PENDING_ASSIGNMENT", "ASSIGNED", "IN_PROGRESS",
  "WAITING_AIRLINE", "TICKET_GENERATED",
];

const ACTIVE_CANCELLATION_STATUSES = [
  "OPEN", "OPS_ASSIGNED", "OPS_PROCESSING", "PENDING_APPROVAL",
];

async function migrate() {
  await mongoose.connect(config.database.uri, config.database.options);
  console.log("Connected\n");

  const db = mongoose.connection.db;
  const members = await db.collection("opsmembers").find({ isDeleted: false }).toArray();
  console.log(`Found ${members.length} active Ops members\n`);

  const reissueColl = db.collection("offlinereissuerequests");
  const cancellationColl = db.collection("cancellationqueries");

  for (const member of members) {
    const actualReissues = await reissueColl.countDocuments({
      assignedOpsMember: member._id,
      status: { $in: ACTIVE_REISSUE_STATUSES },
    });

    const actualCancellations = await cancellationColl.countDocuments({
      assignedTo: member._id,
      status: { $in: ACTIVE_CANCELLATION_STATUSES },
    });

    const update = {
      $set: {
        maxConcurrentReissues: member.maxConcurrentReissues ?? 10,
        maxConcurrentCancellations: member.maxConcurrentCancellations ?? 10,
        currentActiveReissues: actualReissues,
        currentActiveCancellations: actualCancellations,
      },
    };

    if (!member.availabilityStatus || !["AVAILABLE", "BUSY", "BREAK", "OFFLINE", "ON_LEAVE"].includes(member.availabilityStatus)) {
      update.$set.availabilityStatus = "AVAILABLE";
    }

    await db.collection("opsmembers").updateOne({ _id: member._id }, update);

    console.log(
      `${member.name}: reissues=${actualReissues}, cancellations=${actualCancellations}, maxReissues=${member.maxConcurrentReissues ?? 10}, maxCancellations=${member.maxConcurrentCancellations ?? 10}`,
    );
  }

  console.log("\nMigration complete");
  await mongoose.disconnect();
  process.exit(0);
}

migrate().catch((e) => { console.error(e); process.exit(1); });
