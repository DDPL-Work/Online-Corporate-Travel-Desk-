const admin = require("firebase-admin");
const Notification = require("../models/Notification");
const User = require("../models/User");
const OpsMember = require("../models/OpsMember");
const SuperAdmin = require("../models/SuperAdmin.model");
const logger = require("../utils/logger");

let firebaseInitialized = false;
try {
  const serviceAccount = require("../config/firebase-service-account.json");
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
  firebaseInitialized = true;
  logger.info("Firebase Admin initialized for notification dispatch");
} catch (error) {
  logger.warn(
    "Firebase Admin initialization failed. Push notifications will be disabled.",
    { error: error.message },
  );
}

const getRecipientModel = (role) => {
  if (role === "ops-member") return OpsMember;
  if (role === "super-admin") return SuperAdmin;
  return User;
};

const normalizeRecipientType = (role) => {
  if (role === "ops-member") return "OpsMember";
  if (role === "super-admin") return "SuperAdmin";
  return "User";
};

const resolveRecipientTargets = async ({ recipient, recipientRole, corporateId }) => {
  if (recipient) {
    const RecipientModel = getRecipientModel(recipientRole);
    const account = await RecipientModel.findById(recipient).select("fcmTokens email corporateId").lean();
    return [
      {
        recipient,
        recipientRole: recipientRole || null,
        recipientType: normalizeRecipientType(recipientRole),
        corporateId: corporateId || account?.corporateId || null,
        email: account?.email || null,
        fcmTokens: account?.fcmTokens || [],
      },
    ];
  }

  if (!recipientRole) {
    throw new Error("Notification dispatch requires recipient or recipientRole");
  }

  if (recipientRole === "super-admin") {
    const admins = await SuperAdmin.find({}).select("_id email").lean();
    return admins.map((adminUser) => ({
      recipient: adminUser._id,
      recipientType: "SuperAdmin",
      recipientRole,
      email: adminUser.email,
      corporateId: corporateId || null,
    }));
  }

  if (recipientRole === "ops-member") {
    const opsMembers = await OpsMember.find({
      isDeleted: false,
      status: "Active",
    }).select("_id email fcmTokens").lean();
    return opsMembers.map((ops) => ({
      recipient: ops._id,
      recipientType: "OpsMember",
      recipientRole,
      email: ops.email,
      corporateId: corporateId || null,
      fcmTokens: ops.fcmTokens || [],
    }));
  }

  const users = await User.find({
    role: recipientRole,
    isActive: true,
    ...(corporateId ? { corporateId } : {}),
  })
    .select("_id email fcmTokens corporateId")
    .lean();

  return users.map((user) => ({
    recipient: user._id,
    recipientType: "User",
    recipientRole,
    email: user.email,
    corporateId: user.corporateId || corporateId || null,
    fcmTokens: user.fcmTokens || [],
  }));
};

const sendFcmPayload = async ({ tokens, title, message, type, relatedId, link }) => {
  if (!Array.isArray(tokens) || !tokens.length) return null;

  const payload = {
    notification: {
      title,
      body: message,
    },
    data: {
      type: type || "general",
      relatedId: relatedId ? String(relatedId) : "",
      link: link || "",
    },
    tokens,
  };

  const response = await admin.messaging().sendEachForMulticast(payload);
  logger.info("Notification FCM dispatched", {
    successCount: response.successCount,
    failureCount: response.failureCount,
  });

  return response;
};

const sendNotification = async (data) => {
  try {
    const targets = await resolveRecipientTargets(data);
    const notifications = [];

    for (const target of targets) {
      const notificationPayload = {
        recipient: target.recipient,
        recipientType: target.recipientType || normalizeRecipientType(target.recipientRole),
        recipientRole: target.recipientRole || data.recipientRole || null,
        corporateId: target.corporateId || data.corporateId || null,
        sender: data.sender || null,
        title: data.title,
        message: data.message,
        type: data.type,
        relatedId: data.relatedId,
        link: data.link,
      };

      const notification = await Notification.create(notificationPayload);
      notifications.push(notification);

      if (firebaseInitialized && target.fcmTokens?.length) {
        try {
          const response = await sendFcmPayload({
            tokens: target.fcmTokens,
            title: data.title,
            message: data.message,
            type: data.type,
            relatedId: data.relatedId,
            link: data.link,
          });

          if (response?.failureCount) {
            const failedTokens = response.responses
              .map((resp, index) => (!resp.success ? target.fcmTokens[index] : null))
              .filter(Boolean);

            if (failedTokens.length) {
              const RecipientModel = getRecipientModel(target.recipientRole);
              await RecipientModel.findByIdAndUpdate(target.recipient, {
                $pull: { fcmTokens: { $in: failedTokens } },
              });
            }
          }
        } catch (pushError) {
          logger.warn("Push notification failed", {
            recipient: String(target.recipient),
            recipientRole: target.recipientRole,
            error: pushError.message,
          });
        }
      }
    }

    return notifications.length === 1 ? notifications[0] : notifications;
  } catch (error) {
    logger.error("Notification dispatch failed", error);
    return null;
  }
};

module.exports = {
  sendNotification,
};
