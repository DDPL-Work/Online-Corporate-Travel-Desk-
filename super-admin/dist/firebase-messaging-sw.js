/* eslint-disable no-undef */

importScripts("https://www.gstatic.com/firebasejs/12.12.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.12.1/firebase-messaging-compat.js");

const serviceWorkerUrl = new URL(self.location.href);
const params = serviceWorkerUrl.searchParams;
const appName = params.get("appName") || "super-admin";

const firebaseConfig = {
  apiKey: params.get("apiKey") || "",
  authDomain: params.get("authDomain") || "",
  projectId: params.get("projectId") || "",
  storageBucket: params.get("storageBucket") || "",
  messagingSenderId: params.get("messagingSenderId") || "",
  appId: params.get("appId") || "",
  measurementId: params.get("measurementId") || "",
};

const hasRequiredConfig =
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.messagingSenderId &&
  firebaseConfig.appId;

if (!hasRequiredConfig) {
  console.error(`[firebase-messaging-sw:${appName}] Missing Firebase config`, firebaseConfig);
} else {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.info(`[firebase-messaging-sw:${appName}] Firebase app initialized`);
  } else {
    console.info(`[firebase-messaging-sw:${appName}] Reusing existing Firebase app`);
  }

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.info(`[firebase-messaging-sw:${appName}] Background message received`, payload);

    const notificationTitle =
      payload?.notification?.title ||
      payload?.data?.title ||
      "New notification";

    const notificationOptions = {
      body:
        payload?.notification?.body ||
        payload?.data?.body ||
        "You have a new update.",
      icon: payload?.notification?.icon || "/favicon.ico",
      badge: payload?.notification?.badge || "/favicon.ico",
      data: {
        link: payload?.data?.link || "/",
        notificationId: payload?.data?.notificationId || "",
      },
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetPath = event.notification?.data?.link || "/";
  const targetUrl = new URL(targetPath, self.location.origin).href;

  console.info(`[firebase-messaging-sw:${appName}] Notification click`, {
    targetUrl,
  });

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === targetUrl && "focus" in client) {
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }

      return undefined;
    }),
  );
});
