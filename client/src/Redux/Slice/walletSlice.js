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

// 🔹 Initiate wallet recharge (Razorpay order)
export const initiateWalletRecharge = createAsyncThunk(
  "wallet/initiateRecharge",
  async ({ amount }, { rejectWithValue }) => {
    try {
      const res = await api.post("/wallet/recharge", { amount });
      return res.data.data;
      /*
        {
          orderId,
          amount,
          currency,
          keyId
        }
      */
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to initiate recharge"
      );
    }
  }
);

// 🔹 Verify Razorpay payment & credit wallet
export const verifyWalletPayment = createAsyncThunk(
  "wallet/verifyPayment",
  async ({ orderId, paymentId, signature, amount }, { rejectWithValue }) => {
    try {
      const res = await api.post("/wallet/verify-payment", {
        orderId,
        paymentId,
        signature,
        amount,
      });

      return res.data.data;
      /*
        {
          balance,
          transaction
        }
      */
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Payment verification failed"
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

    // Recharge / Razorpay
    rechargeOrder: null,
    paymentVerifying: false,

    loading: false,
    error: null,
  },

  reducers: {
    clearWalletError: (state) => {
      state.error = null;
    },
    clearRechargeOrder: (state) => {
      state.rechargeOrder = null;
    },
  },

  extraReducers: (builder) => {
    builder

      /* ================================
         BALANCE
      ================================ */
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

      /* ================================
         TRANSACTIONS
      ================================ */
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
      })

      /* ================================
         INITIATE RECHARGE
      ================================ */
      .addCase(initiateWalletRecharge.pending, (state) => {
        state.loading = true;
      })
      .addCase(initiateWalletRecharge.fulfilled, (state, action) => {
        state.loading = false;
        state.rechargeOrder = action.payload;
      })
      .addCase(initiateWalletRecharge.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      /* ================================
         VERIFY PAYMENT
      ================================ */
      .addCase(verifyWalletPayment.pending, (state) => {
        state.paymentVerifying = true;
      })
      .addCase(verifyWalletPayment.fulfilled, (state, action) => {
        state.paymentVerifying = false;
        state.balance = action.payload.balance;
        state.rechargeOrder = null;
      })
      .addCase(verifyWalletPayment.rejected, (state, action) => {
        state.paymentVerifying = false;
        state.error = action.payload;
      });
  },
});

export const { clearWalletError, clearRechargeOrder } = walletSlice.actions;

export default walletSlice.reducer;
