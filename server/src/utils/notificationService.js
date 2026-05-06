const admin = require("firebase-admin");
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

// Initialize Firebase Admin
let firebaseInitialized = false;
try {
  const serviceAccount = require("../config/firebase-service-account.json");
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
  firebaseInitialized = true;
  logger.info("Firebase Admin initialized successfully");
} catch (error) {
  logger.warn(
    "Firebase Admin initialization failed. Push notifications will be disabled. " +
    "Please place firebase-service-account.json in src/config/."
  );
}

/**
 * Send notification to a user or a role within a corporate
 * @param {Object} data - Notification data
 * @param {string} data.recipient - Recipient User ID (optional if role provided)
 * @param {string} data.recipientRole - Recipient Role (optional if recipient provided)
 * @param {string} data.corporateId - Corporate ID (Required)
 * @param {string} data.sender - Sender User ID (optional)
 * @param {string} data.title - Notification title
 * @param {string} data.message - Notification message
 * @param {string} data.type - Notification type
 * @param {string} data.relatedId - ID of the related object (booking, request, etc.)
 * @param {string} data.link - Link to redirect to in the dashboard
 */
const sendNotification = async (data) => {
  try {
    const { recipient, recipientRole, corporateId, sender, title, message, type, relatedId, link } = data;

    // 1. Save to Database (In-App Notification)
    const notification = await Notification.create({
      recipient,
      recipientRole,
      corporateId,
      sender,
      title,
      message,
      type,
      relatedId,
      link,
    });

    // 2. Send Push Notification via FCM if user has tokens
    // Note: If recipientRole is used without a specific recipient, 
    // we would need to find all users with that role and corporateId.
    // For now, we only send push if a specific recipient is provided.
    if (firebaseInitialized && recipient) {
      const RecipientModel = getRecipientModel(recipientRole);
      const recipientAccount = await RecipientModel.findById(recipient).select("fcmTokens");

      if (recipientAccount && recipientAccount.fcmTokens && recipientAccount.fcmTokens.length > 0) {
        const payload = {
          notification: {
            title,
            body: message,
          },
          data: {
            type: type || "general",
            relatedId: relatedId ? String(relatedId) : "",
            link: link || "",
            notificationId: String(notification._id),
          },
          tokens: recipientAccount.fcmTokens,
        };

        // sendMulticast allows sending to multiple tokens at once
        const response = await admin.messaging().sendEachForMulticast(payload);
        logger.info("FCM push notification dispatched", {
          recipient: String(recipient),
          recipientRole: recipientRole || "user",
          successCount: response.successCount,
          failureCount: response.failureCount,
          type: type || "general",
        });
        
        // Handle failed tokens (e.g. expired)
        if (response.failureCount > 0) {
          const failedTokens = [];
          response.responses.forEach((resp, idx) => {
            if (!resp.success) {
              failedTokens.push(recipientAccount.fcmTokens[idx]);
              logger.warn("FCM token send failed", {
                recipient: String(recipient),
                recipientRole: recipientRole || "user",
                tokenSuffix: recipientAccount.fcmTokens[idx]?.slice?.(-12) || "unknown",
                error: resp.error?.message || "Unknown FCM error",
              });
            }
          });
          
          if (failedTokens.length > 0) {
            await RecipientModel.findByIdAndUpdate(recipient, {
              $pull: { fcmTokens: { $in: failedTokens } },
            });
          }
        }
      } else {
        logger.info("No FCM tokens found for notification recipient", {
          recipient: String(recipient),
          recipientRole: recipientRole || "user",
          type: type || "general",
        });
      }
    }

    return notification;
  } catch (error) {
    console.error("Error sending notification:", error);
    // Don't throw error to avoid breaking the main flow
    return null;
  }
};

module.exports = {
  sendNotification,
};
