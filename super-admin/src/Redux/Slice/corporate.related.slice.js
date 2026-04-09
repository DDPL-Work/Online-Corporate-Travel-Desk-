//super-admin\src\Redux\Slice\corporate.related.slice.js
import { createSlice } from "@reduxjs/toolkit";
import {
  fetchFlightBookings,
  fetchFlightCancellations,
  fetchHotelBookings,
  fetchHotelCancellations,
} from "../Actions/corporate.related.thunks";

const initialState = {
  // ✈️ Flights
  flightBookings: [],
  flightPagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
  loadingFlights: false,
  flightCancellations: [],
  flightCancellationPagination: {},
  loadingFlightCancellations: false,
  flightCancellationError: null,

  hotelCancellations: [],
  hotelCancellationPagination: {},
  loadingHotelCancellations: false,
  hotelCancellationError: null,

  // 🏨 Hotels
  hotelBookings: [],
  hotelPagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
  loadingHotels: false,

  error: null,
};

const corporateRelatedSlice = createSlice({
  name: "corporateRelated",
  initialState,
  reducers: {
    // Reset (useful for filters change)
    resetFlightBookings: (state) => {
      state.flightBookings = [];
      state.flightPagination = { page: 1, limit: 10, total: 0, totalPages: 0 };
    },
    resetHotelBookings: (state) => {
      state.hotelBookings = [];
      state.hotelPagination = { page: 1, limit: 10, total: 0, totalPages: 0 };
    },

    resetFlightCancellations: (state) => {
      state.flightCancellations = [];
      state.flightCancellationPagination = {};
    },
    resetHotelCancellations: (state) => {
      state.hotelCancellations = [];
      state.hotelCancellationPagination = {};
    },
  },
  extraReducers: (builder) => {
    builder

      /**
       * ✈️ FLIGHTS
       */
      .addCase(fetchFlightBookings.pending, (state) => {
        state.loadingFlights = true;
        state.error = null;
      })
      .addCase(fetchFlightBookings.fulfilled, (state, action) => {
        state.loadingFlights = false;

        const { data, pagination } = action.payload;

        state.flightBookings = data || [];
        state.flightPagination = {
          page: pagination?.page || 1,
          limit: pagination?.limit || 10,
          total: pagination?.total || 0,
          totalPages:
            pagination?.totalPages ||
            Math.ceil((pagination?.total || 0) / (pagination?.limit || 10)) ||
            0,
        };
      })
      .addCase(fetchFlightBookings.rejected, (state, action) => {
        state.loadingFlights = false;
        state.error = action.payload;
      })

      /**
       * 🏨 HOTELS
       */
      .addCase(fetchHotelBookings.pending, (state) => {
        state.loadingHotels = true;
        state.error = null;
      })
      .addCase(fetchHotelBookings.fulfilled, (state, action) => {
        state.loadingHotels = false;

        const { data, pagination } = action.payload;

        state.hotelBookings = data || [];
        state.hotelPagination = {
          page: pagination?.page || 1,
          limit: pagination?.limit || 10,
          total: pagination?.total || 0,
          totalPages:
            pagination?.totalPages ||
            Math.ceil((pagination?.total || 0) / (pagination?.limit || 10)) ||
            0,
        };
      })
      .addCase(fetchHotelBookings.rejected, (state, action) => {
        state.loadingHotels = false;
        state.error = action.payload;
      })

      /**
       * ✈️ FLIGHT CANCELLATIONS
       */
      .addCase(fetchFlightCancellations.pending, (state) => {
        state.loadingFlightCancellations = true;
        state.flightCancellationError = null;
      })
      .addCase(fetchFlightCancellations.fulfilled, (state, action) => {
        state.loadingFlightCancellations = false;

        const { data, pagination } = action.payload;

        // Always replace with the current page so the table shows correct rows
        // for the selected page instead of accumulating previous pages.
        state.flightCancellations = data || [];

        state.flightCancellationPagination = pagination;
      })
      .addCase(fetchFlightCancellations.rejected, (state, action) => {
        state.loadingFlightCancellations = false;
        state.flightCancellationError = action.payload;
      })

      /**
       * 🏨 HOTEL CANCELLATIONS
       */
      .addCase(fetchHotelCancellations.pending, (state) => {
        state.loadingHotelCancellations = true;
        state.hotelCancellationError = null;
      })
      .addCase(fetchHotelCancellations.fulfilled, (state, action) => {
        state.loadingHotelCancellations = false;

        const { data, pagination } = action.payload;

        // Mirror flight cancellations behaviour: keep only the page payload.
        state.hotelCancellations = data || [];

        state.hotelCancellationPagination = pagination;
      })
      .addCase(fetchHotelCancellations.rejected, (state, action) => {
        state.loadingHotelCancellations = false;
        state.hotelCancellationError = action.payload;
      });
  },
});

export const {
  resetFlightBookings,
  resetHotelBookings,
  resetFlightCancellations,
  resetHotelCancellations,
} = corporateRelatedSlice.actions;

export default corporateRelatedSlice.reducer;
