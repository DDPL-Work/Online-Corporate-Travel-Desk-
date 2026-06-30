// client/src/Redux/Actions/ssrPolicy.thunks.js

import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../API/axios";

// ── Employee: fetch own SSR policy ──────────────────────────────────────────
export const fetchMySSRPolicy = createAsyncThunk(
  "ssrPolicy/fetchMyPolicy",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/ssr-policies/my-policy");
      return data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch SSR policy"
      );
    }
  }
);

// ── Admin: lookup policy by employee email ──────────────────────────────────
export const fetchPolicyByEmail = createAsyncThunk(
  "ssrPolicy/fetchByEmail",
  async (email, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/ssr-policies/by-email", {
        params: { email },
      });
      return data.data; // { employee, policy, isNewPolicy }
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Employee not found"
      );
    }
  }
);

// ── Admin: list all policies for corporate ──────────────────────────────────
export const fetchAllSSRPolicies = createAsyncThunk(
  "ssrPolicy/listAll",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/ssr-policies");
      return data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch policies"
      );
    }
  }
);

// ── Admin: create or update policy ──────────────────────────────────────────
export const upsertSSRPolicy = createAsyncThunk(
  "ssrPolicy/upsert",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/ssr-policies", payload);
      return data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to save policy"
      );
    }
  }
);

// ── Admin: delete a policy ───────────────────────────────────────────────────
export const deleteSSRPolicy = createAsyncThunk(
  "ssrPolicy/delete",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/ssr-policies/${id}`);
      return id; // return id so slice can remove from list
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to delete policy"
      );
    }
  }
);
