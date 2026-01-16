import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./Slice/authSlice.js";
// import ssoAuthReducer from "./Slice/ssoAuthSlice.js";
import dashboardReducer from "./Slice/dashboardSlice.js";
import profileReducer from "./Slice/profileSlice";
import corporateOnboardingReducer from "./Slice/corporateOnboardingSlice.js";
import corporateListReducer from "./Slice/corporateListSlice.js";
import employeeActionReducer from "./Slice/employeeActionSlice.js";
import corporateAdminReducer from "./Slice/corporateAdminSlice.js";
import walletReducer from "./Slice/walletSlice.js";
import flightReducer from "./Slice/flightSearchSlice.js";
import flightReducerRT from "./Slice/flightSearchSliceRT.js";
import flightReducerMC from "./Slice/flightSearchSlice.MC.js";
import walletRechargeLogsReducer from "./Slice/walletRechargeLogsSlice";
import tboBalanceReducer from "./Slice/tboBalanceSlice";
import approvalReducer from "./Slice/approval.slice.js";
import bookingReducer from "./Slice/booking.slice.js";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    // ssoAuth: ssoAuthReducer,
    dashboard: dashboardReducer,
    profile: profileReducer,
    corporateList: corporateListReducer,
    corporateOnboarding: corporateOnboardingReducer,
    employeeAction: employeeActionReducer,
    corporateAdmin: corporateAdminReducer,
    wallet: walletReducer,
    flights: flightReducer,
    flightsRT: flightReducerRT,
    flightsMC: flightReducerMC,
    walletRechargeLogs: walletRechargeLogsReducer,
    tboBalance: tboBalanceReducer,
    approvals: approvalReducer,
    bookings: bookingReducer,
  },
});
