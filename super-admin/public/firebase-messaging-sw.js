importScripts("https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js");

// These values are hardcoded in the service worker as it doesn't have access to environment variables easily
// The user should update these with their actual values
const firebaseConfig = {
  apiKey: "AIzaSyBuiXbWTI9lk3_3ORB70-ZaqREuElULIHk",
  authDomain: "traveamer-dd20c.firebaseapp.com",
  projectId: "traveamer-dd20c",
  storageBucket: "traveamer-dd20c.firebasestorage.app",
  messagingSenderId: "444961330244",
  appId: "1:444961330244:web:78b55c31caa799ea5ed811",
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw.js] Received background message ", payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: "/firebase-logo.png", // Path to your notification icon
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
