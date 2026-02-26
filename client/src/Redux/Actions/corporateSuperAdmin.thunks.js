import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../API/axios";

/* ================================
   GET ALL CORPORATE USERS
================================ */
export const fetchCorporateUsers = createAsyncThunk(
  "corporateSuperAdmin/fetchUsers",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/corporate-super-admin/users");
      return data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch users",
      );
    }
  },
);

/* ================================
   TOGGLE USER STATUS
================================ */
export const toggleUserStatus = createAsyncThunk(
  "corporateSuperAdmin/toggleUserStatus",
  async (userId, { rejectWithValue }) => {
    try {
      const { data } = await API.patch(`/corporate-super-admin/users/${userId}/toggle`);
      return data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to toggle user",
      );
    }
  },
);

/* ================================
   CHANGE TRAVEL ADMIN
================================ */
export const changeTravelAdmin = createAsyncThunk(
  "corporateSuperAdmin/changeTravelAdmin",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await API.patch("/corporate-super-admin/travel-admin", payload);
      return data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update travel admin",
      );
    }
  },
);

/* ================================
   UPDATE TRAVEL POLICY
================================ */
export const updateTravelPolicy = createAsyncThunk(
  "corporateSuperAdmin/updateTravelPolicy",
  async (policyData, { rejectWithValue }) => {
    try {
      const { data } = await API.patch("/corporate-super-admin/travel-policy", policyData);
      return data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update travel policy",
      );
    }
  },
);

/* ================================
   GET DASHBOARD
================================ */
export const fetchCorporateDashboard = createAsyncThunk(
  "corporateSuperAdmin/fetchDashboard",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await API.get("/corporate-super-admin/dashboard");
      return data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch dashboard"
      );
    }
  }
);
