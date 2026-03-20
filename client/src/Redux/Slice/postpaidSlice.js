import { createSlice } from "@reduxjs/toolkit";
import {
  fetchPostpaidBalance,
  fetchPostpaidTransactions,
} from "../Actions/postpaidThunks";

const initialState = {
  balance: null,
  transactions: [],
  pagination: null,
  loadingBalance: false,
  loadingTransactions: false,
  error: null,
};

const postpaidSlice = createSlice({
  name: "postpaid",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder

      // =========================
      // BALANCE
      // =========================
      .addCase(fetchPostpaidBalance.pending, (state) => {
        state.loadingBalance = true;
      })
      .addCase(fetchPostpaidBalance.fulfilled, (state, action) => {
        state.loadingBalance = false;
        state.balance = action.payload.balance;
      })
      .addCase(fetchPostpaidBalance.rejected, (state, action) => {
        state.loadingBalance = false;
        state.error = action.payload;
      })

      // =========================
      // TRANSACTIONS
      // =========================
      .addCase(fetchPostpaidTransactions.pending, (state) => {
        state.loadingTransactions = true;
      })
      .addCase(fetchPostpaidTransactions.fulfilled, (state, action) => {
        state.loadingTransactions = false;
        state.transactions = action.payload.transactions || [];
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchPostpaidTransactions.rejected, (state, action) => {
        state.loadingTransactions = false;
        state.error = action.payload;
      });
  },
});

export default postpaidSlice.reducer;