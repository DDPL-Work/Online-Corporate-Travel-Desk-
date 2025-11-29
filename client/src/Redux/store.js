import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./Slice/authSlice.js";
import profileReducer from "./Slice/profileSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    profile: profileReducer,
  },
});
