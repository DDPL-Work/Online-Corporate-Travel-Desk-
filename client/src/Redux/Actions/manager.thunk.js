import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../API/axios";

// 🚀 SELECT MANAGER (trigger your controller)
export const selectManager = createAsyncThunk(
  "manager/select",
  async (
    {
      approverId,
      approverEmail,
      projectCodeId,
      projectName,
      projectClient,
    },
    { rejectWithValue },
  ) => {
    try {
      const res = await api.post(
        "/corporate-manager/select",
        {
          approverId,
          approverEmail,
          projectCodeId,
          projectName,
          projectClient,
        },
        {
          withCredentials: true,
        }
      );

      return res.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data || { message: "Manager selection failed" }
      );
    }
  }
);


export const getPendingHotelRequests = createAsyncThunk(
  "manager/getPendingHotelRequests",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get(
        "/corporate-manager/hotel/pending-requests",
        {
          withCredentials: true,
        }
      );

      return res.data; // { success, count, data }
    } catch (err) {
      return rejectWithValue(
        err.response?.data || { message: "Failed to fetch hotel requests" }
      );
    }
  }
);


// 🔥 NEW: Get employees who selected me as manager
export const getMyEmployees = createAsyncThunk(
  "manager/getMyEmployees",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get(
        "/corporate-manager/my-team",
        {
          withCredentials: true,
        }
      );

      return res.data; // { success, count, data }
    } catch (err) {
      return rejectWithValue(
        err.response?.data || { message: "Failed to fetch employees" }
      );
    }
  }
);

export const getApprovedHotelRequests = createAsyncThunk(
  "manager/getApprovedHotelRequests",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get(
        "/corporate-manager/hotel/approved-requests",
        { withCredentials: true }
      );

      return res.data; // { success, count, data }
    } catch (err) {
      return rejectWithValue(
        err.response?.data || { message: "Failed to fetch approved requests" }
      );
    }
  }
);

export const getRejectedHotelRequests = createAsyncThunk(
  "manager/getRejectedHotelRequests",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get(
        "/corporate-manager/hotel/rejected-requests",
        { withCredentials: true }
      );

      return res.data; // { success, count, data }
    } catch (err) {
      return rejectWithValue(
        err.response?.data || { message: "Failed to fetch rejected requests" }
      );
    }
  }
);

export const getTeamExecutedHotelRequests = createAsyncThunk(
  "manager/getExecutedApprovedHotelRequests",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get(
        "/corporate-manager/hotel/team-executed-requests",
        { withCredentials: true }
      );

      return res.data; // { success, count, data }
    } catch (err) {
      return rejectWithValue(
        err.response?.data || {
          message: "Failed to fetch executed approved requests",
        }
      );
    }
  }
);