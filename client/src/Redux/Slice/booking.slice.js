// booking.slice.js

import { createSlice } from "@reduxjs/toolkit";
import {
  createBookingRequest,
  fetchMyBookings,
  fetchMyBookingById,
  cancelBooking,
  fetchMyBookingRequests,
  fetchMyBookingRequestById,
  fetchMyRejectedRequests,
  executeApprovedFlightBooking,
  // ticketFlight,
} from "../Actions/booking.thunks";

const initialState = {
  list: [], // admin / all bookings
  myRequests: [], // ✅ employee bookings
  myRejected: [],
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

      /* ================= FETCH MY REJECTED ================= */
      .addCase(fetchMyRejectedRequests.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyRejectedRequests.fulfilled, (state, action) => {
        state.loading = false;
        state.myRejected = action.payload || [];
      })
      .addCase(fetchMyRejectedRequests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      /* ================= EXECUTE APPROVED FLIGHT ================= */
      .addCase(executeApprovedFlightBooking.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })

      .addCase(executeApprovedFlightBooking.fulfilled, (state, action) => {
        state.actionLoading = false;

        state.selected = {
          ...state.selected,
          executionStatus: "ticketed",
          bookingResult: {
            ...(state.selected?.bookingResult || {}),
            pnr: action.payload.pnr,
          },
        };

        // Also update list if present
        const idx = state.list.findIndex((b) => b._id === state.selected?._id);
        if (idx !== -1) {
          state.list[idx] = state.selected;
        }
      })

      .addCase(executeApprovedFlightBooking.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      })

      /* ================= FETCH ALL ================= */
      .addCase(fetchMyBookings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyBookings.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.bookings;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchMyBookings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      /* ================= FETCH ONE ================= */
      .addCase(fetchMyBookingById.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchMyBookingById.fulfilled, (state, action) => {
        state.loading = false;
        state.selected = action.payload;
      })
      .addCase(fetchMyBookingById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      /* ================= TICKETING ================= */
      //   .addCase(ticketFlight.pending, (state) => {
      //   state.loading = true;
      //   state.error = null;
      // })
      // .addCase(ticketFlight.fulfilled, (state, action) => {
      //   state.loading = false;
      //   state.ticketStatus = "success";
      // })
      // .addCase(ticketFlight.rejected, (state, action) => {
      //   state.loading = false;
      //   state.ticketStatus = "failed";
      //   state.error = action.payload;
      // })

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

export const { clearSelectedBookingRequest } = bookingSlice.actions;
export const selectMyRejectedRequests = (state) => state.bookings.myRejected;

export default bookingSlice.reducer;
