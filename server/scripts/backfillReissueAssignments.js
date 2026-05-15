const path = require("path");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const OpsMember = require("../src/models/OpsMember");
const OfflineReissueRequest = require("../src/modules/servicing/reissue/schemas/OfflineReissueRequest.schema");
const reissueAssignmentService = require("../src/modules/servicing/reissue/services/reissueAssignment.service");
const {
  TERMINAL_OFFLINE_STATUSES,
} = require("../src/modules/servicing/reissue/constants/reissue.constants");

const MANAGE_REISSUES_PERMISSION = "Manage Reissues";

async function resetWorkloads() {
  await OpsMember.updateMany(
    {},
    {
      $set: {
        currentWorkload: 0,
        currentActiveAssignments: 0,
      },
    },
  );
}

async function rebuildExistingAssignedWorkloads() {
  const rows = await OfflineReissueRequest.aggregate([
    {
      $match: {
        assignedOpsMember: { $exists: true, $ne: null },
        status: { $nin: TERMINAL_OFFLINE_STATUSES },
      },
    },
    {
      $group: {
        _id: "$assignedOpsMember",
        currentWorkload: { $sum: 1 },
        lastAssignedAt: { $max: "$assignedAt" },
      },
    },
  ]);

  for (const row of rows) {
    await OpsMember.findByIdAndUpdate(row._id, {
      $set: {
        currentWorkload: row.currentWorkload,
        currentActiveAssignments: row.currentWorkload,
        lastAssignedAt: row.lastAssignedAt || null,
      },
    });
  }
}

async function resolveLegacyOpsMemberId(legacyAssigneeId) {
  if (!legacyAssigneeId || !mongoose.Types.ObjectId.isValid(legacyAssigneeId)) {
    return null;
  }

  const opsMember = await OpsMember.findOne({
    _id: legacyAssigneeId,
    status: "Active",
    isDeleted: false,
    isAvailableForReissues: true,
    permissions: { $in: [MANAGE_REISSUES_PERMISSION] },
  })
    .select("_id")
    .lean();

  return opsMember?._id || null;
}

async function backfillUnassignedRequests() {
  const rawRequests = await OfflineReissueRequest.collection
    .find({
      $or: [
        { assignedOpsMember: null },
        { assignedOpsMember: { $exists: false } },
      ],
    })
    .toArray();

  let assignedCount = 0;

  for (const rawRequest of rawRequests) {
    const request = await OfflineReissueRequest.findById(rawRequest._id);
    if (!request || request.assignedOpsMember) {
      continue;
    }

    const legacyOpsMemberId = await resolveLegacyOpsMemberId(rawRequest.assignedTo);
    const result = await reissueAssignmentService.assignOfflineReissue({
      request,
      assignedBy: { id: null, _id: null },
      mode:
        rawRequest.assignmentMode === "MANUAL" || rawRequest.assignmentMethod === "MANUAL"
          ? "MANUAL"
          : "AUTO",
      remarks: legacyOpsMemberId
        ? "Backfilled from legacy offline reissue assignment"
        : "Backfilled automatic offline reissue assignment",
      opsMemberId: legacyOpsMemberId,
      notify: false,
    });

    if (rawRequest.assignedAt && result?.request) {
      result.request.assignedAt = rawRequest.assignedAt;
      await result.request.save();
    }

    if (result?.request?.requestId) {
      assignedCount += 1;
      console.log(
        `[REISSUE AUTO ASSIGN] Request: ${result.request.requestId} Assigned OPS: ${
          result.assignedOpsMember?.name || result.request.assignedOpsMember
        }`,
      );
    }
  }

  return assignedCount;
}

async function run() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is required");
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");

  await resetWorkloads();
  await rebuildExistingAssignedWorkloads();
  const assignedCount = await backfillUnassignedRequests();
  await rebuildExistingAssignedWorkloads();

  console.log(`Backfill completed. Assigned ${assignedCount} unassigned offline reissue request(s).`);
  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error("Backfill failed:", error);
  try {
    await mongoose.disconnect();
  } catch (disconnectError) {
    console.error("Mongo disconnect failed:", disconnectError);
  }
  process.exit(1);
});
