import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../API/axios";

export const fetchOpsMembers = createAsyncThunk(
  "opsMember/fetchOpsMembers",
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await api.get("/ops/list", { params });
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch OPS members");
    }
  },
);

export const createOpsMember = createAsyncThunk(
  "opsMember/createOpsMember",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await api.post("/ops/create", payload);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to create OPS member");
    }
  },
);

export const updateOpsMember = createAsyncThunk(
  "opsMember/updateOpsMember",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await api.patch(`/ops/update/${id}`, data);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to update OPS member");
    }
  },
);

export const deleteOpsMember = createAsyncThunk(
  "opsMember/deleteOpsMember",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/ops/delete/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to delete OPS member");
    }
  },
);

export const toggleOpsMemberStatus = createAsyncThunk(
  "opsMember/toggleOpsMemberStatus",
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const res = await api.patch(`/ops/status/${id}`, { status });
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to update status");
    }
  },
);

export const fetchOpsDiagnostics = createAsyncThunk(
  "opsMember/fetchOpsDiagnostics",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/ops/diagnostics");
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch diagnostics");
    }
  },
);

export const resetOpsPassword = createAsyncThunk(
  "opsMember/resetOpsPassword",
  async ({ id, password }, { rejectWithValue }) => {
    try {
      const res = await api.patch(`/ops/reset-password/${id}`, { password });
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to reset password");
    }
  },
);
