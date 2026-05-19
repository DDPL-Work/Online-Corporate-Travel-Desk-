const FlightReissueRequest = require("../../../../models/FlightReissueRequest");
const ReissueRequest = require("../schemas/ReissueRequest.schema");
const {
  REISSUE_MODES,
  REISSUE_STATUSES,
  REISSUE_TYPES,
  BILLING_MODES,
  PROVIDERS,
} = require("../constants/reissue.constants");

const statusMap = {
  PENDING: REISSUE_STATUSES.OPS_PENDING,
  APPROVED: REISSUE_STATUSES.OPS_ASSIGNED,
  REJECTED: REISSUE_STATUSES.CANCELLED,
  COMPLETED: REISSUE_STATUSES.COMPLETED,
};

async function backfillLegacyReissues({ dryRun = true } = {}) {
  const legacyRows = await FlightReissueRequest.find({}).lean();
  let migrated = 0;

  for (const legacy of legacyRows) {
    const exists = await ReissueRequest.findOne({
      reissueId: legacy.reissueId,
    }).lean();
    if (exists) continue;

    const mapped = {
      reissueId: legacy.reissueId,
      bookingId: legacy.bookingId,
      originalBookingId: legacy.bookingReference,
      originalPnr: legacy.bookingSnapshot?.pnr || "",
      userId: legacy.user?.id,
      corporateId: legacy.corporate?.companyId,
      companyId: legacy.corporate?.companyId,
      supplier: legacy.bookingSnapshot?.airline || "TBO",
      airline: legacy.bookingSnapshot?.airline || "",
      provider: PROVIDERS.TBO,
      mode: REISSUE_MODES.OFFLINE,
      status: statusMap[legacy.status] || REISSUE_STATUSES.OPS_PENDING,
      reissueType: REISSUE_TYPES.FULL_REISSUE,
      billingMode: BILLING_MODES.POSTPAID,
      oldJourney: {
        travelDate: legacy.bookingSnapshot?.travelDate || null,
        airline: legacy.bookingSnapshot?.airline || "",
      },
      newJourney: {
        segments: legacy.segments || [],
      },
      opsRemarks: legacy.resolution?.message
        ? [
            {
              message: legacy.resolution.message,
              by: legacy.resolution.actionBy || null,
              byRole: "legacy",
              at: legacy.resolution.actionAt || new Date(),
            },
          ]
        : [],
      supplierResponse: legacy.resolution?.apiResponse || null,
      correlationId: `legacy-${legacy._id}`,
      timeline: [
        {
          status: statusMap[legacy.status] || REISSUE_STATUSES.OPS_PENDING,
          title: "Legacy reissue migrated",
          description: "Imported from FlightReissueRequest",
          actorRole: "system",
          at: legacy.createdAt || new Date(),
        },
      ],
      auditLogs: [
        {
          action: "LEGACY_REISSUE_IMPORTED",
          actorRole: "system",
          message: "Legacy reissue imported into unified servicing module",
          at: new Date(),
          metadata: { legacyId: legacy._id },
        },
      ],
    };

    if (!dryRun) {
      await ReissueRequest.create(mapped);
    }
    migrated += 1;
  }

  return {
    dryRun,
    scanned: legacyRows.length,
    migrated,
  };
}

module.exports = { backfillLegacyReissues };
