import { createSlice } from "@reduxjs/toolkit";
import {
  sendRequestToManager,
  sendRequestToAdmin,
  getManagerAmendmentRequests,
  getAdminAmendmentRequests,
  approveAmendmentRequest,
  rejectAmendmentRequest,
} from "../Actions/amendmentRequest.thunks";

const initialState = {
  isLoading: false,
  error: null,
  success: false,
  lastRequest: null,
  managerRequests: [],
  adminRequests: [],
};

const amendmentRequestSlice = createSlice({
  name: "amendmentRequest",
  initialState,
  reducers: {
    resetAmendmentRequestState: (state) => {
      state.isLoading = false;
      state.error = null;
      state.success = false;
      state.lastRequest = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // sendRequestToManager
      .addCase(sendRequestToManager.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(sendRequestToManager.fulfilled, (state, action) => {
        state.isLoading = false;
        state.success = true;
        state.lastRequest = action.payload;
      })
      .addCase(sendRequestToManager.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // sendRequestToAdmin
      .addCase(sendRequestToAdmin.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(sendRequestToAdmin.fulfilled, (state, action) => {
        state.isLoading = false;
        state.success = true;
        state.lastRequest = action.payload;
      })
      .addCase(sendRequestToAdmin.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // getManagerAmendmentRequests
      .addCase(getManagerAmendmentRequests.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getManagerAmendmentRequests.fulfilled, (state, action) => {
        state.isLoading = false;
        state.managerRequests = action.payload?.data || [];
      })
      .addCase(getManagerAmendmentRequests.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // getAdminAmendmentRequests
      .addCase(getAdminAmendmentRequests.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getAdminAmendmentRequests.fulfilled, (state, action) => {
        state.isLoading = false;
        state.adminRequests = action.payload?.data || [];
      })
      .addCase(getAdminAmendmentRequests.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // approveAmendmentRequest
      .addCase(approveAmendmentRequest.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(approveAmendmentRequest.fulfilled, (state) => {
        state.isLoading = false;
        state.success = true;
      })
      .addCase(approveAmendmentRequest.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // rejectAmendmentRequest
      .addCase(rejectAmendmentRequest.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(rejectAmendmentRequest.fulfilled, (state) => {
        state.isLoading = false;
        state.success = true;
      })
      .addCase(rejectAmendmentRequest.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const { resetAmendmentRequestState } = amendmentRequestSlice.actions;
export default amendmentRequestSlice.reducer;
