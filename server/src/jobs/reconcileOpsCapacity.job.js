const mongoose = require("mongoose");
const OpsMember = require("../models/OpsMember");
const logger = require("../utils/logger");

const ACTIVE_REISSUE_STATUSES = [
  "PENDING_ASSIGNMENT", "ASSIGNED", "IN_PROGRESS",
  "WAITING_AIRLINE", "TICKET_GENERATED",
];

const ACTIVE_CANCELLATION_STATUSES = [
  "OPEN", "OPS_ASSIGNED", "OPS_PROCESSING", "PENDING_APPROVAL",
];

async function reconcileOpsCapacity() {
  logger.info("[RECONCILE] Starting Ops capacity reconciliation");

  const members = await OpsMember.find({ isDeleted: false }).lean();
  if (!members.length) {
    logger.info("[RECONCILE] No Ops members found");
    return { reconciled: 0, corrections: [] };
  }

  const db = mongoose.connection.db;
  const reissueColl = db.collection("offlinereissuerequests");
  const cancellationColl = db.collection("cancellationqueries");

  const corrections = [];

  for (const member of members) {
    const actualReissues = await reissueColl.countDocuments({
      assignedOpsMember: member._id,
      status: { $in: ACTIVE_REISSUE_STATUSES },
    });

    const actualCancellations = await cancellationColl.countDocuments({
      assignedTo: member._id,
      status: { $in: ACTIVE_CANCELLATION_STATUSES },
    });

    const storedReissues = member.currentActiveReissues ?? 0;
    const storedCancellations = member.currentActiveCancellations ?? 0;

    const reissueDiff = actualReissues - storedReissues;
    const cancellationDiff = actualCancellations - storedCancellations;

    if (reissueDiff !== 0 || cancellationDiff !== 0) {
      corrections.push({
        memberId: member._id,
        name: member.name,
        email: member.email,
        reissues: { stored: storedReissues, actual: actualReissues, diff: reissueDiff },
        cancellations: { stored: storedCancellations, actual: actualCancellations, diff: cancellationDiff },
      });

      await OpsMember.updateOne(
        { _id: member._id },
        {
          $set: {
            currentActiveReissues: actualReissues,
            currentActiveCancellations: actualCancellations,
          },
        },
      );

      logger.warn("[RECONCILE] Corrected counters", {
        name: member.name,
        reissues: `${storedReissues} -> ${actualReissues}`,
        cancellations: `${storedCancellations} -> ${actualCancellations}`,
      });
    }
  }

  logger.info("[RECONCILE] Reconciliation complete", {
    total: members.length,
    corrected: corrections.length,
  });

  return { reconciled: members.length, corrections };
}

module.exports = { reconcileOpsCapacity };
