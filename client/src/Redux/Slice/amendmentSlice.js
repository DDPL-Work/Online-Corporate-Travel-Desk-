import { createSlice } from "@reduxjs/toolkit";
import {
  fetchCancellationCharges,
  fullCancellation,
  partialCancellation,
  amendBooking,
  fetchChangeStatus,
  releasePNR,
} from "../Actions/amendmentThunks";

const initialState = {
  loading: false,
  error: null,
  charges: null,
  cancellationResult: null,
  amendmentResult: null,
  changeStatus: null,
  releaseResult: null,
};

const amendmentSlice = createSlice({
  name: "amendment",
  initialState,
  reducers: {
    resetAmendmentState: (state) => {
      state.loading = false;
      state.error = null;
      state.charges = null;
      state.cancellationResult = null;
      state.amendmentResult = null;
      state.changeStatus = null;
      state.releaseResult = null;
    },
  },
  extraReducers: (builder) => {
    builder
      /* ========= Charges ========= */
      .addCase(fetchCancellationCharges.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCancellationCharges.fulfilled, (state, action) => {
        state.loading = false;
        state.charges = action.payload;
      })
      .addCase(fetchCancellationCharges.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      /* ========= Full / Partial Cancel ========= */
      .addCase(fullCancellation.fulfilled, (state, action) => {
        state.cancellationResult = action.payload;
      })
      .addCase(partialCancellation.fulfilled, (state, action) => {
        state.cancellationResult = action.payload;
      })

      /* ========= Amendment ========= */
      .addCase(amendBooking.fulfilled, (state, action) => {
        state.amendmentResult = action.payload;
      })

      /* ========= Status ========= */
      .addCase(fetchChangeStatus.fulfilled, (state, action) => {
        state.changeStatus = action.payload;
      })

      /* ========= Release ========= */
      .addCase(releasePNR.fulfilled, (state, action) => {
        state.releaseResult = action.payload;
      });
  },
});

export const { resetAmendmentState } = amendmentSlice.actions;
export default amendmentSlice.reducer;
