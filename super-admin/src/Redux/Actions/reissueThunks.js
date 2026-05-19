import { createAsyncThunk } from "@reduxjs/toolkit";
import axios from "../../API/axios";

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

export const fetchReissueRequests = createAsyncThunk(
  "reissue/fetchAll",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await axios.get("/reissue/offline/admin/list", { params });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Failed to fetch offline reissue requests"),
      );
    }
  },
);

export const updateReissueStatus = createAsyncThunk(
  "reissue/updateStatus",
  async ({ requestId, status, message, assignedTo }, { rejectWithValue }) => {
    try {
      const response = await axios.patch(`/reissue/offline/${requestId}/status`, {
        status,
        message,
        assignedTo,
      });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Failed to update offline reissue status"),
      );
    }
  },
);

export const generateReissueTicket = createAsyncThunk(
  "reissue/generateTicket",
  async ({ requestId, message }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`/reissue/offline/${requestId}/generate-ticket`, {
        message,
      });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Failed to generate revised ticket"),
      );
    }
  },
);

export const reassignReissueRequest = createAsyncThunk(
  "reissue/reassign",
  async ({ requestId, assignedTo, message }, { rejectWithValue }) => {
    try {
      const response = await axios.patch(`/reissue/offline/${requestId}/reassign`, {
        assignedTo,
        message,
      });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Failed to reassign offline reissue request"),
      );
    }
  },
);

export const fetchReissueAnalytics = createAsyncThunk(
  "reissue/fetchAnalytics",
  async (_, { rejectWithValue }) => {
    try {
      return null;
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Failed to fetch offline reissue analytics"),
      );
    }
  },
);
