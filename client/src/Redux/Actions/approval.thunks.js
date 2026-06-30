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
        err.response?.data?.error || "Failed to fetch approvals",
      );
    }
  },
);

/**
 * ================================
 * FETCH SECOND APPROVER REQUESTS
 * ================================
 */
export const fetchSecondApproverRequests = createAsyncThunk(
  "approvals/fetchSecondApprover",
  async ({ page = 1, limit = 10 }, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/approvals/second-approver/requests", {
        params: { page, limit },
      });
      return data.data; // { approvals, pagination }
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || "Failed to fetch transferred requests",
      );
    }
  },
);

/**
 * ================================
 * FETCH SINGLE (Pending or History)
 * ================================
 */
export const fetchApprovalById = createAsyncThunk(
  "approvals/fetchById",
  async ({ id, type = "flight" }, { rejectWithValue }) => {
    try {
      const url =
        type === "hotel"
          ? `/approvals/hotel/${id}`
          : `/approvals/${id}`;

      const { data } = await api.get(url);
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
  async ({ id, comments, type = "flight" }, { rejectWithValue }) => {
    try {
      const url =
        type === "hotel"
          ? `/approvals/hotel/${id}/approve`
          : `/approvals/${id}/approve`;

      const { data } = await api.post(url, { comments });
      return data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || "Approval failed"
      );
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
  async ({ id, comments, type = "flight" }, { rejectWithValue }) => {
    try {
      const url =
        type === "hotel"
          ? `/approvals/hotel/${id}/reject`
          : `/approvals/${id}/reject`;

      const { data } = await api.post(url, { comments });
      return data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || "Rejection failed"
      );
    }
  }
);

/**
 * ================================
 * TRANSFER REQUEST
 * ================================
 */
export const transferApproval = createAsyncThunk(
  "approvals/transfer",
  async ({ id, secondApproverId, remark, type = "flight" }, { rejectWithValue }) => {
    try {
      const url =
        type === "hotel"
          ? `/approvals/hotel/${id}/transfer`
          : `/approvals/${id}/transfer`;

      const { data } = await api.post(url, { secondApproverId, remark });
      return data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || "Transfer failed"
      );
    }
  }
);

/**
 * ================================
 * VALIDATE REQUEST
 * ================================
 */
export const validateApproval = createAsyncThunk(
  "approvals/validate",
  async ({ id, type = "flight" }, { rejectWithValue }) => {
    try {
      const url =
        type === "hotel"
          ? `/approvals/hotel/${id}/validate`
          : `/approvals/${id}/validate`;

      const { data } = await api.post(url);
      return data.data; // { isValid, priceUpdated, newPrice, oldPrice, errorMessages }
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || err.response?.data?.message || "Validation failed"
      );
    }
  }
);

export const selectApprovals = (state) => state.approvals.list;
export const selectApprovalPagination = (state) => state.approvals.pagination;
export const selectApprovalLoading = (state) => state.approvals.loading;
export const selectApprovalActionLoading = (state) =>
  state.approvals.actionLoading;
export const selectApprovalError = (state) => state.approvals.error;
