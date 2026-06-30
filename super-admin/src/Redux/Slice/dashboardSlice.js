import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { fetchDashboardDataAPI } from "../Actions/dashboardService";

/**
 * Async thunk
 */
export const fetchDashboardData = createAsyncThunk(
  "dashboard/fetchDashboardData",
  async (role, { rejectWithValue }) => {
    try {
      return await fetchDashboardDataAPI(role);
    } catch (err) {
      return rejectWithValue(
        err?.response?.data?.message || "Failed to load dashboard"
      );
    }
  }
);

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState: {
    loading: false,
    error: null,
    data: null,
  },
  reducers: {
    clearDashboard: (state) => {
      state.loading = false;
      state.error = null;
      state.data = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboardData.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload.data; // ApiResponse.data
      })
      .addCase(fetchDashboardData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearDashboard } = dashboardSlice.actions;
export default dashboardSlice.reducer;
