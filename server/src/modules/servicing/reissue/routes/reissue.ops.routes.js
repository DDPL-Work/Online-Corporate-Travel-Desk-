const express = require("express");
const { verifyToken } = require("../../../../middleware/auth.middleware");
const { upload } = require("../../../../middleware/upload.middleware");
const { canManageReissues } = require("../../../../middlewares/canManageReissues");
const controller = require("../controllers/reissue.ops.controller");

const router = express.Router();

/**
 * ════════════════════════════════════════════════════════════════
 * OPS REISSUE ROUTES
 * 
 * These are legacy online reissue routes.
 * Allows: OPS Admin, OPS Agent, Super Admin, Master Admin
 * ════════════════════════════════════════════════════════════════
 */

router.use(verifyToken, canManageReissues);

/**
 * GET /
 * List assigned reissue requests
 */
router.get("/", controller.list);

/**
 * PATCH /:id/status
 * Update status of assigned reissue
 */
router.patch("/:id/status", controller.updateStatus);

/**
 * POST /:id/upload-ticket
 * Upload revised ticket
 */
router.post("/:id/upload-ticket", upload.single("file"), controller.uploadTicket);

/**
 * POST /:id/upload-invoice
 * Upload invoice
 */
router.post("/:id/upload-invoice", upload.single("file"), controller.uploadInvoice);

module.exports = router;
