import React from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "./Redux/store.js";
import { NotificationProvider } from "./context/NotificationContext";
import { registerMessagingServiceWorker } from "./config/firebase";
import App from "./App";
import "./index.css";

registerMessagingServiceWorker().catch((error) => {
  console.error("[FCM:super-admin] Initial service worker registration failed", error);
});

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
        <NotificationProvider>
            <App />
        </NotificationProvider>
    </Provider>
  </React.StrictMode>
);
