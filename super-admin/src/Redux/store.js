import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./Slice/authSlice.js";
// import ssoAuthReducer from "./Slice/ssoAuthSlice.js";
import dashboardReducer from "./Slice/dashboardSlice.js";
import profileReducer from "./Slice/profileSlice";
import corporateOnboardingReducer from "./Slice/corporateOnboardingSlice.js";
import corporateListReducer from "./Slice/corporateListSlice.js";
import corporateAdminReducer from "./Slice/corporateAdminSlice.js";
import walletReducer from "./Slice/walletSlice.js";
import walletRechargeLogsReducer from "./Slice/walletRechargeLogsSlice";
import tboBalanceReducer from "./Slice/tboBalanceSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    // ssoAuth: ssoAuthReducer,
    dashboard: dashboardReducer,
    profile: profileReducer,
    corporateList: corporateListReducer,
    corporateOnboarding: corporateOnboardingReducer,
    corporateAdmin: corporateAdminReducer,
    wallet: walletReducer,
    walletRechargeLogs: walletRechargeLogsReducer,
    tboBalance: tboBalanceReducer,
  },
});
