import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

// --------------------------------------------------
// ASYNC THUNK: ONBOARD CORPORATE (PUBLIC)
// --------------------------------------------------
export const onboardCorporate = createAsyncThunk(
  "corporate/onboard",
  async (formData, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${API_URL}/corporate/onboard`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      // ✅ Return ONLY the corporate object
      return response.data.data;
    } catch (error) {
      const errData = error.response?.data;

      return rejectWithValue(
        errData?.errors || errData?.message || "Corporate onboarding failed"
      );
    }
  }
);

// --------------------------------------------------
// INITIAL STATE
// --------------------------------------------------
const initialState = {
  loading: false,
  success: false,
  corporate: null,
  error: null,
};

// --------------------------------------------------
// SLICE
// --------------------------------------------------
const corporateOnboardingSlice = createSlice({
  name: "corporateOnboarding",
  initialState,

  reducers: {
    resetCorporateOnboarding: () => initialState,
  },

  extraReducers: (builder) => {
    builder
      // --------------------
      // ONBOARD
      // --------------------
      .addCase(onboardCorporate.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })

      .addCase(onboardCorporate.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.corporate = action.payload; // already normalized
      })

      .addCase(onboardCorporate.rejected, (state, action) => {
        state.loading = false;
        state.success = false;
        state.error = action.payload;
      });
  },
});

export const { resetCorporateOnboarding } =
  corporateOnboardingSlice.actions;

export default corporateOnboardingSlice.reducer;
