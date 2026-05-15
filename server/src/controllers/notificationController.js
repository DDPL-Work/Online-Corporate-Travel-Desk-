const Notification = require("../models/Notification");
const User = require("../models/User");
const OpsMember = require("../models/OpsMember");
const SuperAdmin = require("../models/SuperAdmin.model");
const logger = require("../utils/logger");

const getRecipientModel = (role) => {
  if (role === "ops-member") return OpsMember;
  if (role === "super-admin") return SuperAdmin;
  return User;
};

/**
 * Get all notifications for the logged in user
 */
exports.getMyNotifications = async (req, res) => {
  try {
    const query = {
      recipient: req.user.id,
    };

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      ...query,
      isRead: false,
    });

    res.status(200).json({
      status: "success",
      results: notifications.length,
      unreadCount,
      data: {
        notifications,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

/**
 * Mark notification as read
 */
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        recipient: req.user.id,
      },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        status: "fail",
        message: "Notification not found",
      });
    }

    res.status(200).json({
      status: "success",
      data: {
        notification,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

/**
 * Mark all notifications as read
 */
exports.markAllAsRead = async (req, res) => {
  try {
    const query = {
      isRead: false,
      recipient: req.user.id,
    };

    await Notification.updateMany(query, { isRead: true });

    res.status(200).json({
      status: "success",
      message: "All notifications marked as read",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

/**
 * Save FCM token for push notifications
 */
exports.saveFcmToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        status: "fail",
        message: "Token is required",
      });
    }

    const RecipientModel = getRecipientModel(req.user.role);

    await RecipientModel.findByIdAndUpdate(req.user.id, {
      $addToSet: { fcmTokens: token },
    });

    logger.info("FCM token saved successfully", {
      userId: req.user.id,
      role: req.user.role,
      tokenPreview: `${token.slice(0, 12)}...${token.slice(-8)}`,
    });

    res.status(200).json({
      status: "success",
      message: "FCM token saved successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

/**
 * Delete notification
 */
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user.id,
    });

    if (!notification) {
      return res.status(404).json({
        status: "fail",
        message: "Notification not found",
      });
    }

    res.status(204).json({
      status: "success",
      data: null,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

