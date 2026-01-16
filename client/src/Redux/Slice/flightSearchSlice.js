//flightSearchSlice.js

import { createSlice } from "@reduxjs/toolkit";
import {
  searchFlights,
  getFareQuote,
  getFareRule,
  getSSR,
  bookFlight,
  ticketFlight,
  getBookingDetails,
} from "../Actions/flight.thunks";

const initialState = {
  searchResults: [],
  traceId: null,

  journeyType: 1,

  fareQuote: null,
  fareRule: null,
  ssr: null,

  booking: null,
  ticket: null,
  bookingDetails: null,

  loading: false,
  error: null,
};

const flightSlice = createSlice({
  name: "flights",
  initialState,
  reducers: {
    resetFlights: () => initialState,
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder

      /* SEARCH */
      .addCase(searchFlights.pending, (state) => {
        state.loading = true;
      })
      .addCase(searchFlights.fulfilled, (state, action) => {
        state.loading = false;
        state.traceId = action.payload.TraceId;
        state.journeyType = action.payload.journeyType;
        state.cabinClass = action.meta.arg.cabinClass;


        // 🔥 IMPORTANT: Flatten Results
        state.searchResults = action.payload.Results;
      })

      .addCase(searchFlights.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      /* FARE QUOTE */
      .addCase(getFareQuote.fulfilled, (state, action) => {
        state.fareQuote = action.payload;
      })

      /* FARE RULE */
      .addCase(getFareRule.fulfilled, (state, action) => {
        state.fareRule = action.payload;
      })

      /* SSR */
      .addCase(getSSR.fulfilled, (state, action) => {
        state.ssr = action.payload;
      })

      /* BOOK */
      .addCase(bookFlight.fulfilled, (state, action) => {
        state.booking = action.payload;
      })

      /* TICKET */
      .addCase(ticketFlight.fulfilled, (state, action) => {
        state.ticket = action.payload;
      })

      /* BOOKING DETAILS */
      .addCase(getBookingDetails.fulfilled, (state, action) => {
        state.bookingDetails = action.payload;
      });
  },
});

export const { resetFlights, clearError } = flightSlice.actions;
export default flightSlice.reducer;
