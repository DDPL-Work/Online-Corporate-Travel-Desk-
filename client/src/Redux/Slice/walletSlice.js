import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../API/axios";

export const fetchWalletBalance = createAsyncThunk(
  "wallet/fetchBalance",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/wallet/balance");
      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch wallet balance",
      );
    }
  },
);

export const fetchWalletTransactions = createAsyncThunk(
  "wallet/fetchTransactions",
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await api.get("/wallet/transactions", { params });
      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch transactions",
      );
    }
  },
);

export const fetchRechargeHistory = createAsyncThunk(
  "wallet/fetchRechargeHistory",
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await api.get("/wallet/transactions/recharge", { params });
      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch recharge history",
      );
    }
  },
);

export const fetchBookingTransactions = createAsyncThunk(
  "wallet/fetchBookingTransactions",
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await api.get("/wallet/transactions/booking", { params });
      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch booking transactions",
      );
    }
  },
);

export const initiateWalletRecharge = createAsyncThunk(
  "wallet/initiateRecharge",
  async ({ amount, returnUrl }, { rejectWithValue }) => {
    try {
      const res = await api.post("/wallet/recharge", { amount, returnUrl });
      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to initiate recharge",
      );
    }
  },
);

export const verifyWalletPayment = createAsyncThunk(
  "wallet/verifyPayment",
  async ({ orderId, paymentId, signature }, { rejectWithValue }) => {
    try {
      const res = await api.post("/wallet/verify-payment", {
        gateway: "razorpay",
        orderId,
        paymentId,
        signature,
      });

      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Payment verification failed",
      );
    }
  },
);

export const verifyPhonePePayment = createAsyncThunk(
  "wallet/verifyPhonePePayment",
  async ({ orderId }, { rejectWithValue }) => {
    try {
      const res = await api.post("/wallet/verify-phonepe", {
        orderId,
      });

      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "PhonePe verification failed",
      );
    }
  },
);

export const fetchWalletPaymentStatus = createAsyncThunk(
  "wallet/fetchPaymentStatus",
  async ({ orderId, gateway }, { rejectWithValue }) => {
    try {
      const res = await api.get(`/wallet/payment-status/${orderId}`, {
        params: gateway ? { gateway } : undefined,
      });
      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch payment status",
      );
    }
  },
);

const walletSlice = createSlice({
  name: "wallet",
  initialState: {
    balance: 0,
    currency: "INR",
    transactions: [],
    pagination: null,
    rechargeOrder: null,
    paymentVerifying: false,
    paymentStatus: null,
    paymentOptions: {
      defaultGateway: "phonepe",
      supportedGateways: [{ code: "phonepe", label: "PhonePe" }],
      minRechargeAmount: 100,
      currency: "INR",
    },
    loading: false,
    statusLoading: false,
    error: null,
  },
  reducers: {
    clearWalletError: (state) => {
      state.error = null;
    },
    clearRechargeOrder: (state) => {
      state.rechargeOrder = null;
    },
    clearPaymentStatus: (state) => {
      state.paymentStatus = null;
    },
  },
  extraReducers: (builder) => {
    builder
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

      .addCase(fetchRechargeHistory.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchRechargeHistory.fulfilled, (state, action) => {
        state.loading = false;
        state.transactions = action.payload.transactions;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchRechargeHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(fetchBookingTransactions.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchBookingTransactions.fulfilled, (state, action) => {
        state.loading = false;
        state.transactions = action.payload.transactions;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchBookingTransactions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(initiateWalletRecharge.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(initiateWalletRecharge.fulfilled, (state, action) => {
        state.loading = false;
        state.rechargeOrder = action.payload;
      })
      .addCase(initiateWalletRecharge.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(verifyWalletPayment.pending, (state) => {
        state.paymentVerifying = true;
        state.error = null;
      })
      .addCase(verifyWalletPayment.fulfilled, (state, action) => {
        state.paymentVerifying = false;
        state.balance = action.payload.balance;
        state.rechargeOrder = null;
        state.paymentStatus = action.payload;
      })
      .addCase(verifyWalletPayment.rejected, (state, action) => {
        state.paymentVerifying = false;
        state.error = action.payload;
      })

      .addCase(verifyPhonePePayment.pending, (state) => {
        state.paymentVerifying = true;
        state.error = null;
      })
      .addCase(verifyPhonePePayment.fulfilled, (state, action) => {
        state.paymentVerifying = false;
        state.paymentStatus = action.payload;
        if (action.payload?.balance != null) {
          state.balance = action.payload.balance;
        }
      })
      .addCase(verifyPhonePePayment.rejected, (state, action) => {
        state.paymentVerifying = false;
        state.error = action.payload;
      })

      .addCase(fetchWalletPaymentStatus.pending, (state) => {
        state.statusLoading = true;
        state.error = null;
      })
      .addCase(fetchWalletPaymentStatus.fulfilled, (state, action) => {
        state.statusLoading = false;
        state.paymentStatus = action.payload;
        if (action.payload?.balance != null) {
          state.balance = action.payload.balance;
        }
      })
      .addCase(fetchWalletPaymentStatus.rejected, (state, action) => {
        state.statusLoading = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearWalletError,
  clearRechargeOrder,
  clearPaymentStatus,
} = walletSlice.actions;

export default walletSlice.reducer;
