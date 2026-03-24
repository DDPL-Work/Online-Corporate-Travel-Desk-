import { createSlice } from "@reduxjs/toolkit";
import {
  sendHotelAmendment,
  getHotelAmendmentStatus,
} from "../Actions/hotelAmendment.thunks";

const initialState = {
  loading: false,
  statusLoading: false,

  amendment: null, // send response
  statusData: null, // status response

  error: null,
  statusError: null,
};

const hotelAmendmentSlice = createSlice({
  name: "hotelAmendment",
  initialState,
  reducers: {
    resetAmendmentState: (state) => {
      state.loading = false;
      state.error = null;
      state.amendment = null;
    },
    resetAmendmentStatus: (state) => {
      state.statusLoading = false;
      state.statusError = null;
      state.statusData = null;
    },
  },

  extraReducers: (builder) => {
    builder

      /* ================= SEND AMENDMENT ================= */

      .addCase(sendHotelAmendment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(sendHotelAmendment.fulfilled, (state, action) => {
        state.loading = false;
        state.amendment = action.payload;
      })
      .addCase(sendHotelAmendment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Amendment failed";
      })

      /* ================= GET STATUS ================= */

      .addCase(getHotelAmendmentStatus.pending, (state) => {
        state.statusLoading = true;
        state.statusError = null;
      })
      .addCase(getHotelAmendmentStatus.fulfilled, (state, action) => {
        state.statusLoading = false;
        state.statusData = action.payload;
      })
      .addCase(getHotelAmendmentStatus.rejected, (state, action) => {
        state.statusLoading = false;
        state.statusError =
          action.payload?.message || "Failed to fetch status";
      });
  },
});

export const {
  resetAmendmentState,
  resetAmendmentStatus,
} = hotelAmendmentSlice.actions;

export default hotelAmendmentSlice.reducer;