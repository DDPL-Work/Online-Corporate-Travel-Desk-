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

export const getPendingFlightRequests = createAsyncThunk(
  "manager/getPendingFlightRequests",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get(
        "/corporate-manager/flight/pending-requests",
        { withCredentials: true }
      );
      return res.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data || { message: "Failed to fetch flight requests" }
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

export const getApprovedFlightRequests = createAsyncThunk(
  "manager/getApprovedFlightRequests",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get(
        "/corporate-manager/flight/approved-requests",
        { withCredentials: true }
      );
      return res.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data || { message: "Failed to fetch approved flight requests" }
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

export const getRejectedFlightRequests = createAsyncThunk(
  "manager/getRejectedFlightRequests",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get(
        "/corporate-manager/flight/rejected-requests",
        { withCredentials: true }
      );
      return res.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data || { message: "Failed to fetch rejected flight requests" }
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

export const getTeamExecutedFlightRequests = createAsyncThunk(
  "manager/getExecutedApprovedFlightRequests",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get(
        "/corporate-manager/flight/team-executed-requests",
        { withCredentials: true }
      );
      return res.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data || {
          message: "Failed to fetch executed approved flight requests",
        }
      );
    }
  }
);

export const getTeamExecutedFlightRequestById = createAsyncThunk(
  "manager/getTeamExecutedFlightRequestById",
  async (id, { rejectWithValue }) => {
    try {
      const res = await api.get(
        `/corporate-manager/flight/team-executed-requests/${id}`,
        { withCredentials: true }
      );
      return res.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data || { message: "Failed to fetch flight details" }
      );
    }
  }
);

export const getTeamExecutedHotelRequestById = createAsyncThunk(
  "manager/getTeamExecutedHotelRequestById",
  async (id, { rejectWithValue }) => {
    try {
      const res = await api.get(
        `/corporate-manager/hotel/team-executed-requests/${id}`,
        { withCredentials: true }
      );
      return res.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data || { message: "Failed to fetch hotel details" }
      );
    }
  }
);

