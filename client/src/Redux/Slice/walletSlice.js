import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../API/axios";

/* ================================
   THUNKS
================================ */

// 🔹 Get wallet balance
export const fetchWalletBalance = createAsyncThunk(
  "wallet/fetchBalance",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/wallet/balance");
      return res.data.data; // { balance, currency }
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch wallet balance"
      );
    }
  }
);

// 🔹 Get wallet transactions
export const fetchWalletTransactions = createAsyncThunk(
  "wallet/fetchTransactions",
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await api.get("/wallet/transactions", { params });
      return res.data.data; // { transactions, pagination }
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch transactions"
      );
    }
  }
);

/* ================================
   SLICE
================================ */

const walletSlice = createSlice({
  name: "wallet",
  initialState: {
    balance: 0,
    currency: "INR",
    transactions: [],
    pagination: null,
    loading: false,
    error: null,
  },

  reducers: {
    clearWalletError: (state) => {
      state.error = null;
    },
  },

  extraReducers: (builder) => {
    builder
      // BALANCE
      .addCase(fetchWalletBalance.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchWalletBalance.fulfilled, (state, action) => {
        state.loading = false;
        state.balance = action.payload.balance;
        state.currency = action.payload.currency;
      })
      .addCase(fetchWalletBalance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // TRANSACTIONS
      .addCase(fetchWalletTransactions.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchWalletTransactions.fulfilled, (state, action) => {
        state.loading = false;
        state.transactions = action.payload.transactions;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchWalletTransactions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearWalletError } = walletSlice.actions;
export default walletSlice.reducer;
