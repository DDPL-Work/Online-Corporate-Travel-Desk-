import { createSlice } from "@reduxjs/toolkit";
import {
  fetchPostpaidBalance,
  fetchPostpaidTransactions,
  fetchPreviousCycles,
  fetchCycleTransactions,
} from "../Actions/postpaidThunks";

const initialState = {
  balance: null,
  loadingBalance: false,
  
  transactions: [],
  pagination: { total: 0, page: 1, pages: 0, limit: 10 },
  loadingTransactions: false,

  previousCycles: [],
  loadingCycles: false,

  cycleTransactions: [],
  cycleTransactionsMeta: null,
  loadingCycleTransactions: false,

  error: null,
};

const postpaidSlice = createSlice({
  name: "postpaid",
  initialState,
  reducers: {
    clearCycleTransactions: (state) => {
      state.cycleTransactions = [];
      state.cycleTransactionsMeta = null;
    },
    resetPostpaidState: (state) => {
      return initialState;
    }
  },
  extraReducers: (builder) => {
    builder
      // Balance
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

      // Transactions
      .addCase(fetchPostpaidTransactions.pending, (state) => {
        state.loadingTransactions = true;
      })
      .addCase(fetchPostpaidTransactions.fulfilled, (state, action) => {
        state.loadingTransactions = false;
        state.transactions = action.payload.transactions;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchPostpaidTransactions.rejected, (state, action) => {
        state.loadingTransactions = false;
        state.error = action.payload;
      })

      // Previous Cycles
      .addCase(fetchPreviousCycles.pending, (state) => {
        state.loadingCycles = true;
      })
      .addCase(fetchPreviousCycles.fulfilled, (state, action) => {
        state.loadingCycles = false;
        state.previousCycles = action.payload.cycles;
      })
      .addCase(fetchPreviousCycles.rejected, (state, action) => {
        state.loadingCycles = false;
        state.error = action.payload;
      })

      // Cycle Transactions
      .addCase(fetchCycleTransactions.pending, (state) => {
        state.loadingCycleTransactions = true;
      })
      .addCase(fetchCycleTransactions.fulfilled, (state, action) => {
        state.loadingCycleTransactions = false;
        state.cycleTransactions = action.payload.transactions;
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

export const { clearCycleTransactions, resetPostpaidState } = postpaidSlice.actions;
export default postpaidSlice.reducer;
