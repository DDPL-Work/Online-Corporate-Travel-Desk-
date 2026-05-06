import { getApp, getApps, initializeApp } from "firebase/app";
import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const APP_NAME = "super-admin";
const BASE_URL = import.meta.env.BASE_URL || "/";
const NORMALIZED_BASE_URL = BASE_URL.endsWith("/") ? BASE_URL : `${BASE_URL}/`;
const SERVICE_WORKER_FILE = "firebase-messaging-sw.js";
const FCM_TOKEN_CACHE_KEY = `traveamer:${APP_NAME}:fcm-token`;

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

let messagingSupportPromise = null;
let messagingPromise = null;
let serviceWorkerRegistrationPromise = null;

const buildServiceWorkerUrl = () => {
  const url = new URL(
    `${NORMALIZED_BASE_URL}${SERVICE_WORKER_FILE}`,
    window.location.origin,
  );

  url.searchParams.set("appName", APP_NAME);
  url.searchParams.set("apiKey", firebaseConfig.apiKey || "");
  url.searchParams.set("authDomain", firebaseConfig.authDomain || "");
  url.searchParams.set("projectId", firebaseConfig.projectId || "");
  url.searchParams.set("storageBucket", firebaseConfig.storageBucket || "");
  url.searchParams.set("messagingSenderId", firebaseConfig.messagingSenderId || "");
  url.searchParams.set("appId", firebaseConfig.appId || "");
  url.searchParams.set("measurementId", firebaseConfig.measurementId || "");

  return url.toString();
};

const getMessagingSupport = async () => {
  if (!messagingSupportPromise) {
    messagingSupportPromise = isSupported()
      .then((supported) => {
        console.info(`[FCM:${APP_NAME}] Messaging support`, { supported });
        return supported;
      })
      .catch((error) => {
        console.error(`[FCM:${APP_NAME}] Unable to detect messaging support`, error);
        return false;
      });
  }

  return messagingSupportPromise;
};

const getMessagingInstance = async () => {
  if (!messagingPromise) {
    messagingPromise = getMessagingSupport().then((supported) => {
      if (!supported) {
        return null;
      }

      console.info(`[FCM:${APP_NAME}] Firebase messaging initialized`);
      return getMessaging(app);
    });
  }

  return messagingPromise;
};

export const registerMessagingServiceWorker = async () => {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    console.warn(`[FCM:${APP_NAME}] Service workers are not supported in this environment`);
    return null;
  }

  if (serviceWorkerRegistrationPromise) {
    return serviceWorkerRegistrationPromise;
  }

  serviceWorkerRegistrationPromise = (async () => {
    const supported = await getMessagingSupport();
    if (!supported) {
      return null;
    }

    const serviceWorkerUrl = buildServiceWorkerUrl();
    console.info(`[FCM:${APP_NAME}] Registering messaging service worker`, {
      serviceWorkerUrl,
      scope: NORMALIZED_BASE_URL,
    });

    try {
      const registration = await navigator.serviceWorker.register(
        serviceWorkerUrl,
        {
          scope: NORMALIZED_BASE_URL,
          updateViaCache: "none",
        },
      );

      await navigator.serviceWorker.ready;

      console.info(`[FCM:${APP_NAME}] Messaging service worker registered`, {
        scope: registration.scope,
        activeScript: registration.active?.scriptURL || null,
      });

      return registration;
    } catch (error) {
      console.error(`[FCM:${APP_NAME}] Messaging service worker registration failed`, error);
      throw error;
    }
  })();

  return serviceWorkerRegistrationPromise;
};

export const requestNotificationPermission = async () => {
  if (typeof window === "undefined" || !("Notification" in window)) {
    console.warn(`[FCM:${APP_NAME}] Notification API is not available`);
    return "denied";
  }

  if (!window.isSecureContext) {
    console.warn(`[FCM:${APP_NAME}] Push notifications require a secure context`);
    return Notification.permission;
  }

  if (Notification.permission === "granted") {
    console.info(`[FCM:${APP_NAME}] Notification permission already granted`);
    return "granted";
  }

  if (Notification.permission === "denied") {
    console.warn(`[FCM:${APP_NAME}] Notification permission was previously denied`);
    return "denied";
  }

  const permission = await Notification.requestPermission();
  console.info(`[FCM:${APP_NAME}] Notification permission result`, {
    permission,
  });
  return permission;
};

export const requestForToken = async () => {
  try {
    const supported = await getMessagingSupport();
    if (!supported) {
      return null;
    }

    const permission = await requestNotificationPermission();
    if (permission !== "granted") {
      console.warn(`[FCM:${APP_NAME}] Skipping FCM token request because permission is not granted`);
      return null;
    }

    const messaging = await getMessagingInstance();
    const serviceWorkerRegistration = await registerMessagingServiceWorker();

    if (!messaging || !serviceWorkerRegistration) {
      console.warn(`[FCM:${APP_NAME}] Messaging or service worker registration unavailable`);
      return null;
    }

    const currentToken = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration,
    });

    if (!currentToken) {
      console.warn(`[FCM:${APP_NAME}] No FCM token returned from Firebase`);
      return null;
    }

    const previousToken =
      typeof window !== "undefined"
        ? window.localStorage.getItem(FCM_TOKEN_CACHE_KEY)
        : null;

    if (typeof window !== "undefined" && previousToken !== currentToken) {
      window.localStorage.setItem(FCM_TOKEN_CACHE_KEY, currentToken);
    }

    console.info(`[FCM:${APP_NAME}] FCM token generated`, {
      refreshed: previousToken !== currentToken,
      tokenPreview: `${currentToken.slice(0, 12)}...${currentToken.slice(-8)}`,
    });

    return currentToken;
  } catch (error) {
    console.error(`[FCM:${APP_NAME}] Failed to retrieve FCM token`, error);
    return null;
  }
};

export const subscribeToForegroundMessages = async (callback) => {
  const messaging = await getMessagingInstance();
  if (!messaging) {
    console.warn(`[FCM:${APP_NAME}] Foreground message listener skipped because messaging is unavailable`);
    return () => {};
  }

  console.info(`[FCM:${APP_NAME}] Foreground message listener attached`);
  return onMessage(messaging, (payload) => {
    console.info(`[FCM:${APP_NAME}] Foreground message received`, payload);
    callback(payload);
  });
};

export default app;
