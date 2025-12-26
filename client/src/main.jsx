import React from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "./Redux/store.js";
import { FlightSearchProvider } from "./context/FlightSearchContext";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <FlightSearchProvider>
        <App />
      </FlightSearchProvider>
    </Provider>
  </React.StrictMode>
);
