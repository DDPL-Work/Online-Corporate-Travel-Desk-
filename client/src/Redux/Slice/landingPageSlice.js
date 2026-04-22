import { createSlice } from "@reduxjs/toolkit";
import {
  getBrandingDetails,
  updateBrandingDetails,
  getPublicBrandingBySlug,
  getPublicBrandingById,
} from "../Actions/landingPageThunks";

const initialState = {
  branding: null,           // Private branding details config for admin
  publicBranding: null,     // Public branding used for the actual landing page display
  isLoading: false,
  isUpdating: false,
  error: null,
};

const landingPageSlice = createSlice({
  name: "landingPage",
  initialState,
  reducers: {
    clearLandingPageError: (state) => {
      state.error = null;
    },
    resetLandingPage: (state) => {
      state.branding = null;
      state.publicBranding = null;
      state.isLoading = false;
      state.isUpdating = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // -------------------------------------------------------------
    // getBrandingDetails
    // -------------------------------------------------------------
    builder.addCase(getBrandingDetails.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(getBrandingDetails.fulfilled, (state, action) => {
      state.isLoading = false;
      state.branding = action.payload; // Admin settings model
    });
    builder.addCase(getBrandingDetails.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
    });

    // -------------------------------------------------------------
    // updateBrandingDetails
    // -------------------------------------------------------------
    builder.addCase(updateBrandingDetails.pending, (state) => {
      state.isUpdating = true;
      state.error = null;
    });
    builder.addCase(updateBrandingDetails.fulfilled, (state, action) => {
      state.isUpdating = false;
      // We manually update the local `branding` node or force a refetch
      if (state.branding) {
        state.branding.branding = action.payload;
      }
    });
    builder.addCase(updateBrandingDetails.rejected, (state, action) => {
      state.isUpdating = false;
      state.error = action.payload;
    });

    // -------------------------------------------------------------
    // getPublicBrandingBySlug / getPublicBrandingById
    // -------------------------------------------------------------
    const handlePublicPending = (state) => {
      state.isLoading = true;
      state.error = null;
      state.publicBranding = null;
    };
    const handlePublicFulfilled = (state, action) => {
      state.isLoading = false;
      state.publicBranding = action.payload;
    };
    const handlePublicRejected = (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
      state.publicBranding = null;
    };

    builder.addCase(getPublicBrandingBySlug.pending, handlePublicPending);
    builder.addCase(getPublicBrandingBySlug.fulfilled, handlePublicFulfilled);
    builder.addCase(getPublicBrandingBySlug.rejected, handlePublicRejected);

    builder.addCase(getPublicBrandingById.pending, handlePublicPending);
    builder.addCase(getPublicBrandingById.fulfilled, handlePublicFulfilled);
    builder.addCase(getPublicBrandingById.rejected, handlePublicRejected);
  },
});

export const { clearLandingPageError, resetLandingPage } = landingPageSlice.actions;
export default landingPageSlice.reducer;
