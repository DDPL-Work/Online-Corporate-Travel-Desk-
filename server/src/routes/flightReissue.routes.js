const express = require("express");
const router = express.Router();
const controller = require("../controllers/flightReissue.controller");

// Base path: /api/v1/reissue

/**
 * 1️⃣ Create Reissue Request (User/Employee)
 */
router.post("/create", controller.createReissueRequest);

/**
 * 2️⃣ Get Reissue Requests (Filterable)
 */
router.get("/list", controller.getReissueRequests);

/**
 * 2️⃣.5️⃣ Get Single Reissue Request by ID
 */
router.get("/:requestId", controller.getReissueRequestById);

/**
 * 3️⃣ Update Reissue Status (Approve/Reject - Corporate Admin)
 */
router.patch("/status/:requestId", controller.updateReissueStatus);

/**
 * 4️⃣ Execute Reissue (Final TBO Call - Super Admin)
 */
router.post("/execute/:requestId", controller.executeReissue);

module.exports = router;