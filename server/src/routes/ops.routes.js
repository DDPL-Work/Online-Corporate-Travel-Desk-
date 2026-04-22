// server/src/routes/ops.routes.js

const express = require("express");
const router = express.Router();
const opsController = require("../controllers/ops.controller");
const { verifyToken, verifySuperAdmin } = require("../middleware/auth.middleware");

// All routes here require Super Admin access
router.use(verifyToken);
router.use(verifySuperAdmin);

router.post("/create", opsController.createOpsMember);
router.get("/list", opsController.listOpsMembers);
router.patch("/update/:id", opsController.updateOpsMember);
router.patch("/status/:id", opsController.updateOpsStatus);
router.delete("/delete/:id", opsController.deleteOpsMember);
router.patch("/reset-password/:id", opsController.resetPassword);

module.exports = router;
