import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../API/axios";

/* ================================
   THUNKS (SUPER ADMIN)
================================ */

// 🔹 Fetch wallet recharge logs
export const fetchWalletRechargeLogs = createAsyncThunk(
  "walletRechargeLogs/fetch",
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await api.get("/wallet-logs", { params });
      return res.data.data;
      /*
        {
          logs: [],
          pagination: { total, page, pages }
        }
      */
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch wallet recharge logs"
      );
    }
  }
);



const walletRechargeLogsSlice = createSlice({
  name: "walletRechargeLogs",

  initialState: {
    logs: [],
    pagination: null,

    loading: false,
    error: null,
  },

  reducers: {
    clearWalletRechargeLogsError: (state) => {
      state.error = null;
    },
    clearWalletRechargeLogs: (state) => {
      state.logs = [];
      state.pagination = null;
    },
  },

  extraReducers: (builder) => {
    builder
      // FETCH LOGS
      .addCase(fetchWalletRechargeLogs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWalletRechargeLogs.fulfilled, (state, action) => {
        state.loading = false;
        state.logs = action.payload.logs;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchWalletRechargeLogs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearWalletRechargeLogsError,
  clearWalletRechargeLogs,
} = walletRechargeLogsSlice.actions;

export default walletRechargeLogsSlice.reducer;
