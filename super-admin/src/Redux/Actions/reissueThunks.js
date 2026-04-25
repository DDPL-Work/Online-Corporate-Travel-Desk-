import { createAsyncThunk } from "@reduxjs/toolkit";
import axios from "../../API/axios";

/**
 * 1️⃣ Create Reissue Request
 */
export const createReissueRequest = createAsyncThunk(
  "reissue/create",
  async (data, { rejectWithValue }) => {
    try {
      const response = await axios.post("/flights/reissue/create", data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Failed to create reissue request");
    }
  }
);

/**
 * 2️⃣ Fetch Reissue Requests
 */
export const fetchReissueRequests = createAsyncThunk(
  "reissue/fetchAll",
  async (params, { rejectWithValue }) => {
    try {
      const response = await axios.get("/flights/reissue/list", { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch reissue requests");
    }
  }
);

/**
 * 3️⃣ Update Reissue Status (Approve/Reject)
 */
export const updateReissueStatus = createAsyncThunk(
  "reissue/updateStatus",
  async ({ requestId, status, message, actionBy, actionByName }, { rejectWithValue }) => {
    try {
      const response = await axios.patch(`/flights/reissue/status/${requestId}`, {
        status,
        message,
        actionBy,
        actionByName
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Failed to update status");
    }
  }
);

/**
 * 4️⃣ Execute Reissue (TBO Call)
 */
export const executeReissue = createAsyncThunk(
  "reissue/execute",
  async ({ requestId, actionBy, actionByName, remarks }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`/flights/reissue/execute/${requestId}`, {
        actionBy,
        actionByName,
        remarks
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Failed to execute reissue");
    }
  }
);
