// src/Redux/Actions/approval.thunks.js
import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../API/axios";

/**
 * ================================
 * FETCH APPROVALS
 * pending_approval → BookingRequest
 * approved / rejected → Approval
 * ================================
 */
export const fetchApprovals = createAsyncThunk(
  "approvals/fetchAll",
  async ({ page = 1, limit = 10, status }, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/approvals", {
        params: { page, limit, status },
      });

      return data.data; // { approvals, pagination }
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || "Failed to fetch approvals"
      );
    }
  }
);

/**
 * ================================
 * FETCH SINGLE (Pending or History)
 * ================================
 */
export const fetchApprovalById = createAsyncThunk(
  "approvals/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/approvals/${id}`);
      return data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || "Failed to fetch approval"
      );
    }
  }
);

/**
 * ================================
 * APPROVE REQUEST
 * id = BookingRequest._id
 * ================================
 */
export const approveApproval = createAsyncThunk(
  "approvals/approve",
  async ({ id, comments }, { rejectWithValue }) => {
    try {
      const { data } = await api.post(`/approvals/${id}/approve`, {
        comments,
      });
      return data.data; // Approval document
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || "Approval failed");
    }
  }
);

/**
 * ================================
 * REJECT REQUEST
 * id = BookingRequest._id
 * ================================
 */
export const rejectApproval = createAsyncThunk(
  "approvals/reject",
  async ({ id, comments }, { rejectWithValue }) => {
    try {
      const { data } = await api.post(`/approvals/${id}/reject`, {
        comments,
      });
      return data.data; // Approval document
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || "Rejection failed");
    }
  }
);

export const selectApprovals = (state) => state.approvals.list;
export const selectApprovalPagination = (state) => state.approvals.pagination;
export const selectApprovalLoading = (state) => state.approvals.loading;
export const selectApprovalActionLoading = (state) =>
  state.approvals.actionLoading;
export const selectApprovalError = (state) => state.approvals.error;
