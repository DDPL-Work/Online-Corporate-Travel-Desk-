import React from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "./Redux/store.js";
import { FlightSearchProvider } from "./context/FlightSearchContext";
import { NotificationProvider } from "./context/NotificationContext";
import { registerMessagingServiceWorker } from "./config/firebase";
import App from "./App";
import "./index.css";

import "leaflet/dist/leaflet.css";
import "./leafletIconFix";

registerMessagingServiceWorker().catch((error) => {
  console.error("[FCM:client] Initial service worker registration failed", error);
});

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <FlightSearchProvider>
        <NotificationProvider>
          <App />
        </NotificationProvider>
      </FlightSearchProvider>
    </Provider>
  </React.StrictMode>,
);
