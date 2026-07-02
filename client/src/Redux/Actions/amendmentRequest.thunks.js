import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../API/axios";
import { toast } from "react-toastify";

// Send amendment request to Manager
export const sendRequestToManager = createAsyncThunk(
  "amendmentRequest/sendToManager",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await api.post("/amendment-requests/request/manager", payload);
      toast.success(response.data.message || "Amendment request sent to manager");
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || "Failed to send amendment request to manager";
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Send amendment request to Admin (or execute directly if auto-approved)
export const sendRequestToAdmin = createAsyncThunk(
  "amendmentRequest/sendToAdmin",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await api.post("/amendment-requests/request/admin", payload);
      toast.success(response.data.message || "Amendment processed successfully");
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || "Failed to process amendment request";
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Get Manager Pending Requests
export const getManagerAmendmentRequests = createAsyncThunk(
  "amendmentRequest/getManagerRequests",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/amendment-requests/manager");
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || "Failed to fetch manager amendment requests";
      return rejectWithValue(message);
    }
  }
);

// Get Admin Pending Requests
export const getAdminAmendmentRequests = createAsyncThunk(
  "amendmentRequest/getAdminRequests",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/amendment-requests/admin");
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || "Failed to fetch admin amendment requests";
      return rejectWithValue(message);
    }
  }
);

// Approve Amendment Request
export const approveAmendmentRequest = createAsyncThunk(
  "amendmentRequest/approve",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await api.post("/amendment-requests/approve", payload);
      toast.success(response.data.message || "Amendment request approved successfully");
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || "Failed to approve amendment request";
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Reject Amendment Request
export const rejectAmendmentRequest = createAsyncThunk(
  "amendmentRequest/reject",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await api.post("/amendment-requests/reject", payload);
      toast.success(response.data.message || "Amendment request rejected successfully");
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || "Failed to reject amendment request";
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);
