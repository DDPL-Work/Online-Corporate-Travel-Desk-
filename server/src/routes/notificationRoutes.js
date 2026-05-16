const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");
const { verifyToken } = require("../middleware/auth.middleware");

// All routes are protected
router.use(verifyToken);

router.get("/my-notifications", notificationController.getMyNotifications);
router.patch("/mark-as-read/:id", notificationController.markAsRead);
router.patch("/mark-all-as-read", notificationController.markAllAsRead);
router.post("/save-fcm-token", notificationController.saveFcmToken);
router.delete("/:id", notificationController.deleteNotification);

module.exports = router;
