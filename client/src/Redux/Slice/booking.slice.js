// booking.slice.js

import { createSlice } from "@reduxjs/toolkit";
import {
  createBookingRequest,
  confirmBooking,
  fetchBookings,
  fetchBookingById,
  cancelBooking,
  fetchMyBookingRequests,
  fetchMyBookingRequestById,
} from "../Actions/booking.thunks";

const initialState = {
  list: [], // admin / all bookings
  myRequests: [], // ✅ employee bookings
  pagination: null,
  selected: null,
  loading: false,
  actionLoading: false,
  error: null,
};

const bookingSlice = createSlice({
  name: "bookings",
  initialState,
  reducers: {
    clearSelectedBookingRequest(state) {
      state.selected = null;
    },
  },
  extraReducers: (builder) => {
    builder
      /* ================= CREATE ================= */
      .addCase(createBookingRequest.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(createBookingRequest.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.selected = action.payload;
      })
      .addCase(createBookingRequest.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      })

      /* ================= FETCH MY REQUESTS (EMPLOYEE) ================= */
      .addCase(fetchMyBookingRequests.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyBookingRequests.fulfilled, (state, action) => {
        state.loading = false;
        state.myRequests = action.payload || [];
      })
      .addCase(fetchMyBookingRequests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      /* ================= FETCH MY REQUEST BY ID ================= */
      .addCase(fetchMyBookingRequestById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyBookingRequestById.fulfilled, (state, action) => {
        state.loading = false;
        state.selected = action.payload; // 🔑 THIS IS IMPORTANT
      })
      .addCase(fetchMyBookingRequestById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      /* ================= CONFIRM ================= */
      .addCase(confirmBooking.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(confirmBooking.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.selected = action.payload;

        const idx = state.list.findIndex((b) => b._id === action.payload._id);
        if (idx !== -1) state.list[idx] = action.payload;
      })
      .addCase(confirmBooking.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      })

      /* ================= FETCH ALL ================= */
      .addCase(fetchBookings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBookings.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.bookings;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchBookings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      /* ================= FETCH ONE ================= */
      .addCase(fetchBookingById.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchBookingById.fulfilled, (state, action) => {
        state.loading = false;
        state.selected = action.payload;
      })
      .addCase(fetchBookingById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      /* ================= CANCEL ================= */
      .addCase(cancelBooking.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(cancelBooking.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.selected = action.payload;

        const idx = state.list.findIndex((b) => b._id === action.payload._id);
        if (idx !== -1) state.list[idx] = action.payload;
      })
      .addCase(cancelBooking.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      });
  },
});

export const { clearSelectedBooking } = bookingSlice.actions;
export default bookingSlice.reducer;
