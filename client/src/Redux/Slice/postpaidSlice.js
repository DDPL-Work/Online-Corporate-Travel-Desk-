import { createSlice } from "@reduxjs/toolkit";
import {
  fetchPostpaidBalance,
  fetchPostpaidTransactions,
  fetchPreviousCycles,
  fetchCycleTransactions,
} from "../Actions/postpaidThunks";

const initialState = {
  balance: null,
  transactions: [],
  pagination: null,
  loadingBalance: false,
  loadingTransactions: false,
  // Previous cycles
  previousCycles: [],
  loadingCycles: false,
  // Per-cycle drill-down
  cycleTransactions: [],
  cycleTransactionsMeta: null, // { statementId, cycle, pagination }
  loadingCycleTransactions: false,
  error: null,
};

const postpaidSlice = createSlice({
  name: "postpaid",
  initialState,
  reducers: {
    clearCycleTransactions(state) {
      state.cycleTransactions = [];
      state.cycleTransactionsMeta = null;
    },
  },
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
      // TRANSACTIONS (current cycle)
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
      })

      // =========================
      // PREVIOUS CYCLES
      // =========================
      .addCase(fetchPreviousCycles.pending, (state) => {
        state.loadingCycles = true;
      })
      .addCase(fetchPreviousCycles.fulfilled, (state, action) => {
        state.loadingCycles = false;
        state.previousCycles = action.payload.cycles || [];
      })
      .addCase(fetchPreviousCycles.rejected, (state, action) => {
        state.loadingCycles = false;
        state.error = action.payload;
      })

      // =========================
      // CYCLE TRANSACTIONS (drill-down)
      // =========================
      .addCase(fetchCycleTransactions.pending, (state) => {
        state.loadingCycleTransactions = true;
      })
      .addCase(fetchCycleTransactions.fulfilled, (state, action) => {
        state.loadingCycleTransactions = false;
        state.cycleTransactions = action.payload.transactions || [];
        state.cycleTransactionsMeta = {
          statementId: action.payload.statementId,
          cycle: action.payload.cycle,
          pagination: action.payload.pagination,
        };
      })
      .addCase(fetchCycleTransactions.rejected, (state, action) => {
        state.loadingCycleTransactions = false;
        state.error = action.payload;
      });
  },
});

export const { clearCycleTransactions } = postpaidSlice.actions;
export default postpaidSlice.reducer;