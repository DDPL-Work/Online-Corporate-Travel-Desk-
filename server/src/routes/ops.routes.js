// server/src/routes/ops.routes.js

const express = require("express");
const router = express.Router();
const opsController = require("../controllers/ops.controller");
const { verifyToken, verifySuperAdmin } = require("../middleware/auth.middleware");

// Authentication required for all routes
router.use(verifyToken);

// Super Admin only routes
router.post("/create", verifySuperAdmin, opsController.createOpsMember);
router.get("/list", verifySuperAdmin, opsController.listOpsMembers);
router.patch("/update/:id", verifySuperAdmin, opsController.updateOpsMember);
router.patch("/status/:id", verifySuperAdmin, opsController.updateOpsStatus);
router.delete("/delete/:id", verifySuperAdmin, opsController.deleteOpsMember);
router.patch("/reset-password/:id", verifySuperAdmin, opsController.resetPassword);
router.get("/diagnostics", verifySuperAdmin, opsController.getAssignmentDiagnostics);

// Self-service route (Ops member updates own availability)
router.patch("/availability", opsController.updateMyAvailability);

module.exports = router;
