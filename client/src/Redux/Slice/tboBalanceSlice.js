import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../API/axios";

/* ================================
   THUNKS (SUPER ADMIN)
================================ */

// 🔹 Fetch TBO Agency Balance
export const fetchTboBalance = createAsyncThunk(
  "tboBalance/fetch",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.post("/super-admin/tbo/agency-balance", {
        env: "dummy",
      });
      return res.data.data;
      /*
        {
          cashBalance,
          creditBalance,
          preferredCurrency,
          agencyType
        }
      */
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch TBO agency balance"
      );
    }
  }
);

const tboBalanceSlice = createSlice({
  name: "tboBalance",

  initialState: {
    balance: 0,
    creditLimit: 0,
    currency: "INR",

    loading: false,
    error: null,
    lastUpdated: null,
  },

  reducers: {
    clearTboBalanceError: (state) => {
      state.error = null;
    },
  },

  extraReducers: (builder) => {
    builder
      // FETCH BALANCE
      .addCase(fetchTboBalance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTboBalance.fulfilled, (state, action) => {
        state.loading = false;

        // ✅ CORRECT MAPPING
        state.balance = action.payload.CashBalance ?? 0;
        state.creditLimit = action.payload.CreditBalance ?? 0;
        state.currency = action.payload.PreferredCurrency || "INR";

        state.lastUpdated = Date.now();
      })
      .addCase(fetchTboBalance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.balance = 0;
        state.creditLimit = 0;
        state.currency = "INR";
      });
  },
});

export const { clearTboBalanceError } = tboBalanceSlice.actions;
export default tboBalanceSlice.reducer;
