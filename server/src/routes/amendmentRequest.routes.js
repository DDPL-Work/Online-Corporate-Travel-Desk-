const express = require("express");
const router = express.Router();
const amendmentRequestController = require("../controllers/amendmentRequest.controller");
const { verifyToken, authorizeRoles } = require("../middleware/auth.middleware");

// Employee creates an amendment request and sends to manager
router.post("/request/manager", verifyToken, amendmentRequestController.sendRequestToManager);

// Employee creates an amendment request and sends to travel-admin
router.post("/request/admin", verifyToken, amendmentRequestController.sendRequestToAdmin);

// Manager fetches their pending requests
router.get("/manager", verifyToken, authorizeRoles("manager"), amendmentRequestController.getManagerRequests);

// Travel Admin fetches pending requests for their corporate
router.get("/admin", verifyToken, authorizeRoles("travel-admin"), amendmentRequestController.getAdminRequests);

// Manager or Travel Admin approves a request
router.post("/approve", verifyToken, amendmentRequestController.approveRequest);

// Manager or Travel Admin rejects a request
router.post("/reject", verifyToken, amendmentRequestController.rejectRequest);

module.exports = router;
