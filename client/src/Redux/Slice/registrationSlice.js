import { createSlice } from "@reduxjs/toolkit";
import { onboardCorporate } from "../Actions/registrationThunks";

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

export const { resetCorporateOnboarding } = corporateOnboardingSlice.actions;

export default corporateOnboardingSlice.reducer;
