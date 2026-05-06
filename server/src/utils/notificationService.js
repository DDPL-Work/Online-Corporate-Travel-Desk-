const admin = require("firebase-admin");
const Notification = require("../models/Notification");
const User = require("../models/User");

// Initialize Firebase Admin
let firebaseInitialized = false;
try {
  const serviceAccount = require("../config/firebase-service-account.json");
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  firebaseInitialized = true;
  console.log("Firebase Admin initialized successfully");
} catch (error) {
  console.warn(
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
      const user = await User.findById(recipient).select("fcmTokens");

      if (user && user.fcmTokens && user.fcmTokens.length > 0) {
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
          tokens: user.fcmTokens,
        };

        // sendMulticast allows sending to multiple tokens at once
        const response = await admin.messaging().sendMulticast(payload);
        
        // Handle failed tokens (e.g. expired)
        if (response.failureCount > 0) {
          const failedTokens = [];
          response.responses.forEach((resp, idx) => {
            if (!resp.success) {
              failedTokens.push(user.fcmTokens[idx]);
            }
          });
          
          if (failedTokens.length > 0) {
            await User.findByIdAndUpdate(recipient, {
              $pull: { fcmTokens: { $in: failedTokens } },
            });
          }
        }
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
