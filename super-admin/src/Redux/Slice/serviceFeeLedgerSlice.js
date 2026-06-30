import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_BASE_URL;

const authHeader = () => {
  const token = sessionStorage.getItem("token");
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

export const fetchServiceFeeStats = createAsyncThunk(
  "serviceFeeLedger/fetchStats",
  async (filters, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams(filters).toString();
      const res = await axios.get(`${API_URL}/service-fee-ledger/stats?${queryParams}`, authHeader());
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch service fee stats");
    }
  }
);

export const fetchServiceFeeCollections = createAsyncThunk(
  "serviceFeeLedger/fetchCollections",
  async (filters, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams(filters).toString();
      const res = await axios.get(`${API_URL}/service-fee-ledger?${queryParams}`, authHeader());
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch service fee collections");
    }
  }
);

const initialState = {
  stats: {
    totalRevenue: 0,
    totalBookings: 0,
    flightRevenue: 0,
    flightBookings: 0,
    hotelRevenue: 0,
    hotelBookings: 0,
    topCorporate: null
  },
  collections: [],
  loadingStats: false,
  loadingCollections: false,
  error: null,
};

const serviceFeeLedgerSlice = createSlice({
  name: "serviceFeeLedger",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchServiceFeeStats.pending, (state) => {
        state.loadingStats = true;
        state.error = null;
      })
      .addCase(fetchServiceFeeStats.fulfilled, (state, action) => {
        state.loadingStats = false;
        state.stats = action.payload;
      })
      .addCase(fetchServiceFeeStats.rejected, (state, action) => {
        state.loadingStats = false;
        state.error = action.payload;
      })
      .addCase(fetchServiceFeeCollections.pending, (state) => {
        state.loadingCollections = true;
        state.error = null;
      })
      .addCase(fetchServiceFeeCollections.fulfilled, (state, action) => {
        state.loadingCollections = false;
        state.collections = action.payload;
      })
      .addCase(fetchServiceFeeCollections.rejected, (state, action) => {
        state.loadingCollections = false;
        state.error = action.payload;
      });
  },
});

export default serviceFeeLedgerSlice.reducer;
