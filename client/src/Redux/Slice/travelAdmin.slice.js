import { createSlice } from "@reduxjs/toolkit";
import {
  getAllFlightBookingsAdmin,
  getAllHotelBookingsAdmin,
  getCancelledHotelBookingsAdmin,
} from "../Actions/travelAdmin.thunks";

const initialState = {
  flightBookings: [],
  hotelBookings: [],
  cancelledHotelBookings: [],

  loadingFlights: false,
  loadingHotels: false,
  loadingCancelledHotels: false,

  errorFlights: null,
  errorHotels: null,
  errorCancelledHotels: null,
};

const adminBookingSlice = createSlice({
  name: "adminBooking",
  initialState,
  reducers: {},

  extraReducers: (builder) => {
    builder

      /**
       * ============================================================
       * ✈️ FLIGHT BOOKINGS
       * ============================================================
       */
      .addCase(getAllFlightBookingsAdmin.pending, (state) => {
        state.loadingFlights = true;
        state.errorFlights = null;
      })
      .addCase(getAllFlightBookingsAdmin.fulfilled, (state, action) => {
        state.loadingFlights = false;
        state.flightBookings = action.payload;
      })
      .addCase(getAllFlightBookingsAdmin.rejected, (state, action) => {
        state.loadingFlights = false;
        state.errorFlights = action.payload;
      })

      /**
       * ============================================================
       * 🏨 HOTEL BOOKINGS
       * ============================================================
       */
      .addCase(getAllHotelBookingsAdmin.pending, (state) => {
        state.loadingHotels = true;
        state.errorHotels = null;
      })
      .addCase(getAllHotelBookingsAdmin.fulfilled, (state, action) => {
        state.loadingHotels = false;
        state.hotelBookings = action.payload;
      })
      .addCase(getAllHotelBookingsAdmin.rejected, (state, action) => {
        state.loadingHotels = false;
        state.errorHotels = action.payload;
      })

      /**
       * ============================================================
       * ❌ CANCELLED HOTEL BOOKINGS
       * ============================================================
       */
      .addCase(getCancelledHotelBookingsAdmin.pending, (state) => {
        state.loadingCancelledHotels = true;
        state.errorCancelledHotels = null;
      })
      .addCase(getCancelledHotelBookingsAdmin.fulfilled, (state, action) => {
        state.loadingCancelledHotels = false;
        state.cancelledHotelBookings = action.payload;
      })
      .addCase(getCancelledHotelBookingsAdmin.rejected, (state, action) => {
        state.loadingCancelledHotels = false;
        state.errorCancelledHotels = action.payload;
      });
  },
});

export default adminBookingSlice.reducer;
