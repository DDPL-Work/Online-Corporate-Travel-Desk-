import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../API/axios";

const getToken = () => localStorage.getItem("token");

// ==============================
// GET BALANCE
// ==============================
export const fetchPostpaidBalance = createAsyncThunk(
  "postpaid/fetchBalance",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("postpaid/balance", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch balance");
    }
  },
);

// ==============================
// GET TRANSACTIONS (current cycle)
// ==============================
export const fetchPostpaidTransactions = createAsyncThunk(
  "postpaid/fetchTransactions",
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await api.get("postpaid/transactions", {
        params,
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch transactions");
    }
  },
);

// ==============================
// GET PREVIOUS CYCLES (statement list)
// ==============================
export const fetchPreviousCycles = createAsyncThunk(
  "postpaid/fetchPreviousCycles",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("postpaid/cycles", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      return res.data; // { success, cycles }
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch cycles");
    }
  },
);

// ==============================
// GET TRANSACTIONS FOR A SPECIFIC CYCLE
// ==============================
export const fetchCycleTransactions = createAsyncThunk(
  "postpaid/fetchCycleTransactions",
  async ({ cycleIndex, page = 1, limit = 50 }, { rejectWithValue }) => {
    try {
      const res = await api.get(`postpaid/cycles/${cycleIndex}/transactions`, {
        params: { page, limit },
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      return res.data; // { success, statementId, cycle, pagination, transactions }
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch cycle transactions");
    }
  },
);
