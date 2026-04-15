// client\src\Redux\Slice\hotelBooking.slice.js

import { createSlice } from "@reduxjs/toolkit";
import {
  createHotelBookingRequest,
  fetchMyHotelRequests,
  fetchHotelRequestById,
  fetchRejectedHotelRequests,
  fetchMyHotelBookings,
  executeHotelBooking,
  fetchBookedHotelDetails,
  generateHotelVoucher,
  preBookHotel,
} from "../Actions/hotelBooking.thunks";

const initialState = {
  requests: [],
  rejected: [],
  completed: [],
  selectedRequest: null,

  selectedBookingDetails: null,

  loading: false,
  error: null,
  success: false,

  voucherLoading: false,
  voucherError: null,
  voucherSuccess: false,

  preBookLoading: false,
  preBookError: null,
  preBookSuccess: false,
  preBookData: null,
};

const hotelBookingSlice = createSlice({
  name: "hotelBookings",
  initialState,
  reducers: {
    clearSelectedRequest: (state) => {
      state.selectedRequest = null;
    },
    resetHotelBookingState: (state) => {
      state.loading = false;
      state.error = null;
      state.success = false;
    },

    clearBookingDetails: (state) => {
      state.selectedBookingDetails = null;
    },

    clearPreBook: (state) => {
      state.preBookLoading = false;
      state.preBookError = null;
      state.preBookSuccess = false;
      state.preBookData = null;
    },
  },

  extraReducers: (builder) => {
    builder

      /* ================= PRE BOOK ================= */
      .addCase(preBookHotel.pending, (state) => {
        state.preBookLoading = true;
        state.preBookError = null;
        state.preBookSuccess = false;
      })
      .addCase(preBookHotel.fulfilled, (state, action) => {
        state.preBookLoading = false;
        state.preBookSuccess = true;
        state.preBookData = action.payload;
      })
      .addCase(preBookHotel.rejected, (state, action) => {
        state.preBookLoading = false;
        state.preBookError = action.payload;
        state.preBookSuccess = false;
      })

      /* ================= CREATE ================= */
      .addCase(createHotelBookingRequest.pending, (state) => {
        state.loading = true;
        state.success = false;
      })
      .addCase(createHotelBookingRequest.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;

        // 🔥 IMPORTANT: Push newly created request in list (instant UI update)
        state.requests.unshift({
          _id: action.payload.bookingRequestId,
          bookingReference: action.payload.bookingReference,
          requestStatus: action.payload.requestStatus,
          createdAt: new Date().toISOString(),
        });
      })
      .addCase(createHotelBookingRequest.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.success = false;
      })

      /* ================= FETCH ALL ================= */
      .addCase(fetchMyHotelRequests.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchMyHotelRequests.fulfilled, (state, action) => {
        state.loading = false;
        state.requests = action.payload;
      })
      .addCase(fetchMyHotelRequests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      /* ================= FETCH SINGLE ================= */
      .addCase(fetchHotelRequestById.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchHotelRequestById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedRequest = action.payload;
      })
      .addCase(fetchHotelRequestById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      /* ================= REJECTED ================= */
      .addCase(fetchRejectedHotelRequests.fulfilled, (state, action) => {
        state.rejected = action.payload;
      })

      /* ================= COMPLETED ================= */
      .addCase(fetchMyHotelBookings.fulfilled, (state, action) => {
        state.completed = action.payload;
      })

      /* ================= EXECUTE ================= */
      .addCase(executeHotelBooking.pending, (state) => {
        state.loading = true;
      })
      .addCase(executeHotelBooking.fulfilled, (state, action) => {
        state.loading = false;

        // remove from pending list
        state.requests = state.requests.filter(
          (r) => r._id !== action.meta.arg,
        );

        // optionally push to completed
        state.completed.unshift(action.payload);
      })
      .addCase(executeHotelBooking.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      /* ================= BOOKING DETAILS ================= */
      .addCase(fetchBookedHotelDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBookedHotelDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedBookingDetails = action.payload;
      })
      .addCase(fetchBookedHotelDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(generateHotelVoucher.pending, (state) => {
        state.voucherLoading = true;
        state.voucherError = null;
      })
      .addCase(generateHotelVoucher.fulfilled, (state, action) => {
        state.voucherLoading = false;
        state.voucherSuccess = true;

        // update selected booking
        if (state.selectedBookingDetails) {
          state.selectedBookingDetails.executionStatus = "voucher_generated";
        }
      })
      .addCase(generateHotelVoucher.rejected, (state, action) => {
        state.voucherLoading = false;
        state.voucherError = action.payload;
      });
  },
});

export const selectMyRejectedHotelRequests = (state) =>
  state.hotelBookings.rejected;

export const {
  clearSelectedRequest,
  resetHotelBookingState,
  clearBookingDetails,
  clearPreBook,
} = hotelBookingSlice.actions;
export default hotelBookingSlice.reducer;
