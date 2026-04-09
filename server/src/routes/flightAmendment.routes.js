const express = require("express");
const controller = require("../controllers/flightAmendment.controller");

const router = express.Router();

/* =========================================================
   FLIGHT AMENDMENT ROUTES (TBO)
   Base Path Suggestion:
   /api/v1/tbo/flights/amendments
========================================================= */

/**
 * 1️⃣ Get Cancellation Charges (Always call before cancel)
 */
router.post("/cancellation/charges", controller.getCancellationCharges);

/**
 * 2️⃣ Full Cancellation
 */
router.post("/cancellation/full", controller.fullCancellation);

/**
 * 3️⃣ Partial Cancellation
 */
router.post("/cancellation/partial", controller.partialCancellation);

/**
 * 4️⃣ Amendment (Date / Sector Change)
 */
router.post("/amend", controller.amendBooking);

/**
 * 5️⃣ Get Change Request Status
 */
router.post("/cancellation/status", controller.getChangeStatus);

/**
 * 6️⃣ Release PNR (Unticketed only)
 */
router.post("/release-pnr", controller.releasePNR);

module.exports = router;
