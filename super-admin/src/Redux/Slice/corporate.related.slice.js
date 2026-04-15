//super-admin\src\Redux\Slice\corporate.related.slice.js
import { createSlice } from "@reduxjs/toolkit";
import {
  amendBooking,
  fetchCancellationCharges,
  fetchChangeStatus,
  fetchFlightBookings,
  fetchFlightCancellations,
  fetchHotelBookings,
  fetchHotelCancellations,
  fullCancellation,
  getHotelAmendmentStatus,
  partialCancellation,
  sendHotelAmendment,
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

  // ✈️ Amendment (Flight)
  cancellationCharges: null,
  loadingCancellationCharges: false,
  cancellationChargesError: null,

  fullCancellationLoading: false,
  fullCancellationSuccess: false,
  fullCancellationError: null,

  partialCancellationLoading: false,
  partialCancellationSuccess: false,
  partialCancellationError: null,

  amendmentLoading: false,
  amendmentSuccess: false,
  amendmentError: null,

  changeStatusLoading: false,
  changeStatusData: null,
  changeStatusError: null,

  // 🏨 Hotels
  hotelBookings: [],
  hotelPagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
  loadingHotels: false,

  // 🏨 Hotel Amendment
  hotelAmendmentLoading: false,
  hotelAmendmentSuccess: false,
  hotelAmendmentError: null,

  hotelAmendmentStatusLoading: false,
  hotelAmendmentStatus: null,
  hotelAmendmentStatusError: null,

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

    resetAmendmentState: (state) => {
      state.fullCancellationLoading = false;
      state.fullCancellationSuccess = false;
      state.fullCancellationError = null;

      state.partialCancellationLoading = false;
      state.partialCancellationSuccess = false;
      state.partialCancellationError = null;

      state.amendmentLoading = false;
      state.amendmentSuccess = false;
      state.amendmentError = null;

      state.changeStatusData = null;

      state.cancellationCharges = null;
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
      //CANCELLATION CHARGES
      .addCase(fetchCancellationCharges.pending, (state) => {
        state.loadingCancellationCharges = true;
        state.cancellationChargesError = null;
      })
      .addCase(fetchCancellationCharges.fulfilled, (state, action) => {
        state.loadingCancellationCharges = false;
        state.cancellationCharges = action.payload;
      })
      .addCase(fetchCancellationCharges.rejected, (state, action) => {
        state.loadingCancellationCharges = false;
        state.cancellationChargesError = action.payload;
      })

      //FULL CANCELLATION
      .addCase(fullCancellation.pending, (state) => {
        state.fullCancellationLoading = true;
        state.fullCancellationError = null;
      })
      .addCase(fullCancellation.fulfilled, (state) => {
        state.fullCancellationLoading = false;
        state.fullCancellationSuccess = true;
      })
      .addCase(fullCancellation.rejected, (state, action) => {
        state.fullCancellationLoading = false;
        state.fullCancellationError = action.payload;
      })
      // /PARTIAL CANCELLATION
      .addCase(partialCancellation.pending, (state) => {
        state.partialCancellationLoading = true;
        state.partialCancellationError = null;
      })
      .addCase(partialCancellation.fulfilled, (state) => {
        state.partialCancellationLoading = false;
        state.partialCancellationSuccess = true;
      })
      .addCase(partialCancellation.rejected, (state, action) => {
        state.partialCancellationLoading = false;
        state.partialCancellationError = action.payload;
      })
      //AMEND BOOKING (REISSUE)
      .addCase(amendBooking.pending, (state) => {
        state.amendmentLoading = true;
        state.amendmentError = null;
      })
      .addCase(amendBooking.fulfilled, (state) => {
        state.amendmentLoading = false;
        state.amendmentSuccess = true;
      })
      .addCase(amendBooking.rejected, (state, action) => {
        state.amendmentLoading = false;
        state.amendmentError = action.payload;
      })
      //CHANGE STATUS
      .addCase(fetchChangeStatus.pending, (state) => {
        state.changeStatusLoading = true;
      })
      .addCase(fetchChangeStatus.fulfilled, (state, action) => {
        state.changeStatusLoading = false;
        state.changeStatusData = action.payload;
      })
      .addCase(fetchChangeStatus.rejected, (state, action) => {
        state.changeStatusLoading = false;
        state.changeStatusError = action.payload;
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
      })
      // HOTEL CANCELLATION
      .addCase(sendHotelAmendment.pending, (state) => {
        state.hotelAmendmentLoading = true;
        state.hotelAmendmentError = null;
      })
      .addCase(sendHotelAmendment.fulfilled, (state) => {
        state.hotelAmendmentLoading = false;
        state.hotelAmendmentSuccess = true;
      })
      .addCase(sendHotelAmendment.rejected, (state, action) => {
        state.hotelAmendmentLoading = false;
        state.hotelAmendmentError = action.payload;
      })
      // HOTEL CANCELLATION STATUS
      .addCase(getHotelAmendmentStatus.pending, (state) => {
        state.hotelAmendmentStatusLoading = true;
      })
      .addCase(getHotelAmendmentStatus.fulfilled, (state, action) => {
        state.hotelAmendmentStatusLoading = false;
        state.hotelAmendmentStatus = action.payload;
      })
      .addCase(getHotelAmendmentStatus.rejected, (state, action) => {
        state.hotelAmendmentStatusLoading = false;
        state.hotelAmendmentStatusError = action.payload;
      });
  },
});

export const {
  resetFlightBookings,
  resetHotelBookings,
  resetFlightCancellations,
  resetHotelCancellations,
  resetAmendmentState,
} = corporateRelatedSlice.actions;

export default corporateRelatedSlice.reducer;
