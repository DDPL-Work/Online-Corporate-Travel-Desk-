import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../API/axios";

// Helper to get token from state or localStorage if needed, 
// though api (axios instance) usually handles it in super-admin
const getToken = () => localStorage.getItem("token");

export const fetchPostpaidBalance = createAsyncThunk(
  "postpaid/fetchBalance",
  async ({ corporateId }, { rejectWithValue }) => {
    try {
      const res = await api.get("postpaid/balance", {
        params: { corporateId },
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch balance");
    }
  },
);

export const fetchPostpaidTransactions = createAsyncThunk(
  "postpaid/fetchTransactions",
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await api.get("postpaid/transactions", {
        params,
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch transactions");
    }
  },
);

export const fetchPreviousCycles = createAsyncThunk(
  "postpaid/fetchPreviousCycles",
  async ({ corporateId }, { rejectWithValue }) => {
    try {
      const res = await api.get("postpaid/cycles", {
        params: { corporateId },
      });
      return res.data; // { success, cycles }
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch cycles");
    }
  },
);

export const fetchCycleTransactions = createAsyncThunk(
  "postpaid/fetchCycleTransactions",
  async ({ corporateId, cycleIndex, page = 1, limit = 50 }, { rejectWithValue }) => {
    try {
      const res = await api.get(`postpaid/cycles/${cycleIndex}/transactions`, {
        params: { corporateId, page, limit },
      });
      return res.data; // { success, statementId, cycle, pagination, transactions }
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch cycle transactions");
    }
  },
);
