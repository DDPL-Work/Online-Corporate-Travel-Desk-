//flightSearchSliceRT.js

import { createSlice } from "@reduxjs/toolkit";
import {
  searchFlightsRT,
  getRTSSR,
  getRTFareRule,
  getRTFareQuote,
  bookFlight,
  ticketFlight,
  getBookingDetails,
} from "../Actions/flight.thunks.RT";

const initialState = {
  searchResultsRT: [],
  traceId: null,

  journeyType: 1,

  fareQuoteRT: {
    onward: null,
    return: null,
  },
  fareRuleRT: {
    onward: null,
    return: null,
  },
  ssrRT: {
    onward: {},
    return: {},
  },

  booking: null,
  ticket: null,
  bookingDetails: null,

  loading: false,
  error: null,
};

const flightSlice = createSlice({
  name: "flightsRT",
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
      .addCase(searchFlightsRT.pending, (state) => {
        state.loading = true;
      })
      .addCase(searchFlightsRT.fulfilled, (state, action) => {
        state.loading = false;
        state.traceId = action.payload.TraceId;
        state.searchResultsRT = action.payload.Results;

        // 🔥 RESET STALE DATA
        state.fareQuoteRT = { onward: null, return: null };
        state.fareRuleRT = { onward: null, return: null };
        state.ssrRT = { onward: {}, return: {} };
      })

      .addCase(searchFlightsRT.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      /* FARE QUOTE (ROUND-TRIP) */
      .addCase(getRTFareQuote.fulfilled, (state, action) => {
        const { journeyType, data } = action.payload;
        state.fareQuoteRT[journeyType] = data;
      })

      /* FARE RULE (ROUND-TRIP) */
      .addCase(getRTFareRule.fulfilled, (state, action) => {
        const { journeyType, data } = action.payload;
        state.fareRuleRT[journeyType] = data;
      })

      /* SSR (ROUND-TRIP) */
      .addCase(getRTSSR.fulfilled, (state, action) => {
        const { journeyType,resultIndex, data } = action.payload;
        if (!state.ssrRT[journeyType]) {
          state.ssrRT[journeyType] = {};
        }

        console.log("🧩 SSR REDUX WRITE", journeyType, data);
        state.ssrRT[journeyType][resultIndex] = data;
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
