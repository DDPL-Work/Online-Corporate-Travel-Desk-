// src/Redux/Slices/approval.slice.js
import { createSlice } from "@reduxjs/toolkit";
import {
  fetchApprovals,
  fetchApprovalById,
  approveApproval,
  rejectApproval,
} from "../Actions/approval.thunks";

const initialState = {
  list: [],          // pending BookingRequests OR Approval history
  pagination: null,
  selected: null,

  loading: false,
  actionLoading: false,
  error: null,
};

const approvalSlice = createSlice({
  name: "approvals",
  initialState,
  reducers: {
    clearSelectedApproval(state) {
      state.selected = null;
    },
  },
  extraReducers: (builder) => {
    builder

      /* ================= FETCH ALL ================= */
      .addCase(fetchApprovals.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchApprovals.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.approvals;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchApprovals.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      /* ================= FETCH ONE ================= */
      .addCase(fetchApprovalById.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchApprovalById.fulfilled, (state, action) => {
        state.loading = false;
        state.selected = action.payload;
      })
      .addCase(fetchApprovalById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      /* ================= APPROVE ================= */
      .addCase(approveApproval.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(approveApproval.fulfilled, (state, action) => {
        state.actionLoading = false;

        // store approval result (history)
        state.selected = action.payload;

        // ❗ REMOVE from pending list (BookingRequest id === bookingRequestId)
        state.list = state.list.filter(
          (item) => item._id !== action.meta.arg.id
        );
      })
      .addCase(approveApproval.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      })

      /* ================= REJECT ================= */
      .addCase(rejectApproval.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(rejectApproval.fulfilled, (state, action) => {
        state.actionLoading = false;

        state.selected = action.payload;

        // ❗ REMOVE from pending list
        state.list = state.list.filter(
          (item) => item._id !== action.meta.arg.id
        );
      })
      .addCase(rejectApproval.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      });
  },
});

export const { clearSelectedApproval } = approvalSlice.actions;
export default approvalSlice.reducer;
