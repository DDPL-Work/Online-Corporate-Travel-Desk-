import { createSlice } from "@reduxjs/toolkit";
import {
  selectManager,
  getPendingHotelRequests,
  getPendingFlightRequests,
  getMyEmployees,
  getApprovedHotelRequests,
  getApprovedFlightRequests,
  getRejectedHotelRequests,
  getRejectedFlightRequests,
  getTeamExecutedHotelRequests,
  getTeamExecutedFlightRequests,
  getTeamExecutedFlightRequestById,
  getTeamExecutedHotelRequestById,
} from "../Actions/manager.thunk";

const initialState = {
  // manager selection
  loading: false,
  success: false,
  message: null,
  error: null,

  // hotel pending requests
  pendingHotelRequests: [],
  pendingHotelRequestsCount: 0,
  loadingPendingRequests: false,
  errorPendingRequests: null,

  // flight pending requests
  pendingFlightRequests: [],
  pendingFlightRequestsCount: 0,
  loadingPendingFlightRequests: false,
  errorPendingFlightRequests: null,

  // approved requests
  approvedHotelRequests: [],
  approvedHotelRequestsCount: 0,
  loadingApprovedRequests: false,
  errorApprovedRequests: null,

  approvedFlightRequests: [],
  approvedFlightRequestsCount: 0,
  loadingApprovedFlightRequests: false,
  errorApprovedFlightRequests: null,

  // rejected requests
  rejectedHotelRequests: [],
  rejectedHotelRequestsCount: 0,
  loadingRejectedRequests: false,
  errorRejectedRequests: null,

  rejectedFlightRequests: [],
  rejectedFlightRequestsCount: 0,
  loadingRejectedFlightRequests: false,
  errorRejectedFlightRequests: null,

  // executed approved requests
  teamExecutedHotelRequests: [],
  teamExecutedHotelRequestsCount: 0,
  loadingTeamExecutedRequests: false,
  errorTeamExecutedRequests: null,

  teamExecutedFlightRequests: [],
  teamExecutedFlightRequestsCount: 0,
  loadingTeamExecutedFlightRequests: false,
  errorTeamExecutedFlightRequests: null,

  // my team
  myEmployees: [],
  myEmployeesCount: 0,
  loadingEmployees: false,
  errorEmployees: null,
  
  // single request details
  teamBookingDetail: null,
  loadingTeamBookingDetail: false,
  errorTeamBookingDetail: null,
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
      // SELECT MANAGER
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

      // HOTEL PENDING
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

      // FLIGHT PENDING
      .addCase(getPendingFlightRequests.pending, (state) => {
        state.loadingPendingFlightRequests = true;
        state.errorPendingFlightRequests = null;
      })
      .addCase(getPendingFlightRequests.fulfilled, (state, action) => {
        state.loadingPendingFlightRequests = false;
        state.pendingFlightRequests = action.payload?.data || [];
        state.pendingFlightRequestsCount = action.payload?.count || 0;
      })
      .addCase(getPendingFlightRequests.rejected, (state, action) => {
        state.loadingPendingFlightRequests = false;
        state.errorPendingFlightRequests =
          action.payload?.message || "Failed to fetch flight requests";
      })

      // HOTEL APPROVED
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

      // FLIGHT APPROVED
      .addCase(getApprovedFlightRequests.pending, (state) => {
        state.loadingApprovedFlightRequests = true;
        state.errorApprovedFlightRequests = null;
      })
      .addCase(getApprovedFlightRequests.fulfilled, (state, action) => {
        state.loadingApprovedFlightRequests = false;
        state.approvedFlightRequests = action.payload?.data || [];
        state.approvedFlightRequestsCount = action.payload?.count || 0;
      })
      .addCase(getApprovedFlightRequests.rejected, (state, action) => {
        state.loadingApprovedFlightRequests = false;
        state.errorApprovedFlightRequests =
          action.payload?.message || "Failed to fetch approved flight requests";
      })

      // HOTEL REJECTED
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

      // FLIGHT REJECTED
      .addCase(getRejectedFlightRequests.pending, (state) => {
        state.loadingRejectedFlightRequests = true;
        state.errorRejectedFlightRequests = null;
      })
      .addCase(getRejectedFlightRequests.fulfilled, (state, action) => {
        state.loadingRejectedFlightRequests = false;
        state.rejectedFlightRequests = action.payload?.data || [];
        state.rejectedFlightRequestsCount = action.payload?.count || 0;
      })
      .addCase(getRejectedFlightRequests.rejected, (state, action) => {
        state.loadingRejectedFlightRequests = false;
        state.errorRejectedFlightRequests =
          action.payload?.message || "Failed to fetch rejected flight requests";
      })

      // HOTEL EXECUTED
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

      // FLIGHT EXECUTED
      .addCase(getTeamExecutedFlightRequests.pending, (state) => {
        state.loadingTeamExecutedFlightRequests = true;
        state.errorTeamExecutedFlightRequests = null;
      })
      .addCase(getTeamExecutedFlightRequests.fulfilled, (state, action) => {
        state.loadingTeamExecutedFlightRequests = false;
        state.teamExecutedFlightRequests = action.payload?.data || [];
        state.teamExecutedFlightRequestsCount = action.payload?.count || 0;
      })
      .addCase(getTeamExecutedFlightRequests.rejected, (state, action) => {
        state.loadingTeamExecutedFlightRequests = false;
        state.errorTeamExecutedFlightRequests =
          action.payload?.message ||
          "Failed to fetch executed approved flight requests";
      })

      // MY EMPLOYEES
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
      })

      // TEAM FLIGHT DETAIL BY ID
      .addCase(getTeamExecutedFlightRequestById.pending, (state) => {
        state.loadingTeamBookingDetail = true;
        state.errorTeamBookingDetail = null;
        state.teamBookingDetail = null;
      })
      .addCase(getTeamExecutedFlightRequestById.fulfilled, (state, action) => {
        state.loadingTeamBookingDetail = false;
        state.teamBookingDetail = action.payload?.data;
      })
      .addCase(getTeamExecutedFlightRequestById.rejected, (state, action) => {
        state.loadingTeamBookingDetail = false;
        state.errorTeamBookingDetail = action.payload?.message || "Failed to fetch details";
      })

      // TEAM HOTEL DETAIL BY ID
      .addCase(getTeamExecutedHotelRequestById.pending, (state) => {
        state.loadingTeamBookingDetail = true;
        state.errorTeamBookingDetail = null;
        state.teamBookingDetail = null;
      })
      .addCase(getTeamExecutedHotelRequestById.fulfilled, (state, action) => {
        state.loadingTeamBookingDetail = false;
        state.teamBookingDetail = action.payload?.data;
      })
      .addCase(getTeamExecutedHotelRequestById.rejected, (state, action) => {
        state.loadingTeamBookingDetail = false;
        state.errorTeamBookingDetail = action.payload?.message || "Failed to fetch details";
      });
  },
});

export const { resetManagerState } = managerSlice.actions;
export default managerSlice.reducer;
