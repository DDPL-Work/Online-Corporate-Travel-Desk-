import { createSlice } from "@reduxjs/toolkit";
import {
  selectManager,
  getPendingHotelRequests,
  getMyEmployees,
  getApprovedHotelRequests,
  getRejectedHotelRequests,
  getTeamExecutedHotelRequests,
} from "../Actions/manager.thunk";

const initialState = {
  // 🔹 manager selection
  loading: false,
  success: false,
  message: null,
  error: null,

  // 🔹 hotel pending requests
  pendingHotelRequests: [],
  pendingHotelRequestsCount: 0,
  loadingPendingRequests: false,
  errorPendingRequests: null,

  // 🔹 approved requests
  approvedHotelRequests: [],
  approvedHotelRequestsCount: 0,
  loadingApprovedRequests: false,
  errorApprovedRequests: null,

  // 🔹 rejected requests
  rejectedHotelRequests: [],
  rejectedHotelRequestsCount: 0,
  loadingRejectedRequests: false,
  errorRejectedRequests: null,

  // 🔹 executed approved requests
  teamExecutedHotelRequests: [],
  teamExecutedHotelRequestsCount: 0,
  loadingTeamExecutedRequests: false,
  errorTeamExecutedRequests: null,

  // 🔹 my team
  myEmployees: [],
  myEmployeesCount: 0,
  loadingEmployees: false,
  errorEmployees: null,
};

const managerSlice = createSlice({
  name: "manager",
  initialState,

  reducers: {
    resetManagerState: (state) => {
      state.loading = false;
      state.success = false;
      state.message = null;
      state.error = null;
    },
  },

  extraReducers: (builder) => {
    builder

      // ================= SELECT MANAGER =================

      .addCase(selectManager.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })

      .addCase(selectManager.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.message = action.payload?.message;
      })

      .addCase(selectManager.rejected, (state, action) => {
        state.loading = false;
        state.success = false;
        state.error = action.payload?.message || "Something went wrong";
      })

      // ================= HOTEL PENDING REQUESTS =================

      .addCase(getPendingHotelRequests.pending, (state) => {
        state.loadingPendingRequests = true;
        state.errorPendingRequests = null;
      })

      .addCase(getPendingHotelRequests.fulfilled, (state, action) => {
        state.loadingPendingRequests = false;

        state.pendingHotelRequests = action.payload?.data || [];
        state.pendingHotelRequestsCount = action.payload?.count || 0;
      })

      .addCase(getPendingHotelRequests.rejected, (state, action) => {
        state.loadingPendingRequests = false;
        state.errorPendingRequests =
          action.payload?.message || "Failed to fetch requests";
      })

      .addCase(getApprovedHotelRequests.pending, (state) => {
        state.loadingApprovedRequests = true;
        state.errorApprovedRequests = null;
      })

      .addCase(getApprovedHotelRequests.fulfilled, (state, action) => {
        state.loadingApprovedRequests = false;

        state.approvedHotelRequests = action.payload?.data || [];
        state.approvedHotelRequestsCount = action.payload?.count || 0;
      })

      .addCase(getApprovedHotelRequests.rejected, (state, action) => {
        state.loadingApprovedRequests = false;
        state.errorApprovedRequests =
          action.payload?.message || "Failed to fetch approved requests";
      })

      .addCase(getRejectedHotelRequests.pending, (state) => {
        state.loadingRejectedRequests = true;
        state.errorRejectedRequests = null;
      })

      .addCase(getRejectedHotelRequests.fulfilled, (state, action) => {
        state.loadingRejectedRequests = false;

        state.rejectedHotelRequests = action.payload?.data || [];
        state.rejectedHotelRequestsCount = action.payload?.count || 0;
      })

      .addCase(getRejectedHotelRequests.rejected, (state, action) => {
        state.loadingRejectedRequests = false;
        state.errorRejectedRequests =
          action.payload?.message || "Failed to fetch rejected requests";
      })

      // ================= EXECUTED APPROVED REQUESTS =================

      .addCase(getTeamExecutedHotelRequests.pending, (state) => {
        state.loadingTeamExecutedRequests = true;
        state.errorTeamExecutedRequests = null;
      })

      .addCase(getTeamExecutedHotelRequests.fulfilled, (state, action) => {
        state.loadingTeamExecutedRequests = false;

        state.teamExecutedHotelRequests = action.payload?.data || [];
        state.teamExecutedHotelRequestsCount = action.payload?.count || 0;
      })

      .addCase(getTeamExecutedHotelRequests.rejected, (state, action) => {
        state.loadingTeamExecutedRequests = false;
        state.errorTeamExecutedRequests =
          action.payload?.message ||
          "Failed to fetch executed approved requests";
      })

      // ================= MY EMPLOYEES =================

      .addCase(getMyEmployees.pending, (state) => {
        state.loadingEmployees = true;
        state.errorEmployees = null;
      })

      .addCase(getMyEmployees.fulfilled, (state, action) => {
        state.loadingEmployees = false;

        state.myEmployees = action.payload?.data || [];
        state.myEmployeesCount = action.payload?.count || 0;
      })

      .addCase(getMyEmployees.rejected, (state, action) => {
        state.loadingEmployees = false;
        state.errorEmployees =
          action.payload?.message || "Failed to fetch employees";
      });
  },
});

export const { resetManagerState } = managerSlice.actions;
export default managerSlice.reducer;
