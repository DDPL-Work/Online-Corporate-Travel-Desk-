import { createSlice } from "@reduxjs/toolkit";
import {
  fetchCities,
  fetchCountries,
  fetchHotelDetails,
  fetchRoomInfo,
  fetchBookingDetails,
  searchHotels,
} from "../Actions/hotelThunks";

const hotelSlice = createSlice({
  name: "hotel",
  initialState: {
    countries: [],
    citiesByCountry: {},
    hotels: [],
    selectedHotel: null,
    searchPayload: null,
    hotelDetailsById: {},
    traceId: null,
    tboBookingDetails: null, // ✅ STORE TBO BOOKING INFO

    loading: {
      countries: false,
      cities: false,
      search: false,
      details: false,
      rooms: false,
      bookingDetails: false,
    },

    error: {
      countries: null,
      cities: null,
      search: null,
      details: null,
      rooms: null,
      bookingDetails: null,
    },
  },

  reducers: {
    clearHotels: (state) => {
      state.hotels = [];
    },
    clearSelectedHotel: (state) => {
      state.selectedHotel = null;
    },
  },

  extraReducers: (builder) => {
    builder

      /* ---------------- COUNTRY ---------------- */
      .addCase(fetchCountries.pending, (state) => {
        state.loading.countries = true;
        state.error.countries = null;
      })
      .addCase(fetchCountries.fulfilled, (state, action) => {
        state.loading.countries = false;
        state.countries = action.payload;
      })
      .addCase(fetchCountries.rejected, (state, action) => {
        state.loading.countries = false;
        state.error.countries = action.payload;
      })

      /* ---------------- CITY ---------------- */
      /* ---------------- CITY ---------------- */
      .addCase(fetchCities.pending, (state) => {
        state.loading.cities = true;
        state.error.cities = null;
      })
      .addCase(fetchCities.fulfilled, (state, action) => {
        state.loading.cities = false;

        const { countryCode, cities } = action.payload;
        state.citiesByCountry[countryCode] = cities;
      })
      .addCase(fetchCities.rejected, (state, action) => {
        state.loading.cities = false;
        state.error.cities = action.payload;
      })

      /* ---------------- SEARCH ---------------- */
      .addCase(searchHotels.pending, (state) => {
        state.loading.search = true;
        state.error.search = null;
      })
      .addCase(searchHotels.fulfilled, (state, action) => {
        state.loading.search = false;
        state.hotels = action.payload.hotels || [];
        state.traceId = action.payload.traceId || null;
        state.searchPayload = action.meta.arg;
      })
      .addCase(searchHotels.rejected, (state, action) => {
        state.loading.search = false;
        state.error.search = action.payload;
      })

      /* ---------------- DETAILS ---------------- */
      .addCase(fetchHotelDetails.pending, (state) => {
        state.loading.details = true;
        state.error.details = null;
      })
      .addCase(fetchHotelDetails.fulfilled, (state, action) => {
        state.loading.details = false;
        const { hotelCode } = action.meta.arg;
        state.hotelDetailsById[hotelCode] = action.payload;
        state.selectedHotel = action.payload;
      })
      .addCase(fetchHotelDetails.rejected, (state, action) => {
        state.loading.details = false;
        state.error.details = action.payload;
      })
      /* ---------------- ROOM INFO ---------------- */
      .addCase(fetchRoomInfo.pending, (state) => {
        state.loading.rooms = true;
        state.error.rooms = null;
      })
      .addCase(fetchRoomInfo.fulfilled, (state, action) => {
        state.loading.rooms = false;
        const { hotelCode, rooms } = action.payload;
        // Update the hotel details with the latest rooms if already present
        if (state.hotelDetailsById[hotelCode]) {
          state.hotelDetailsById[hotelCode].Rooms = rooms;
        }
      })
      .addCase(fetchRoomInfo.rejected, (state, action) => {
        state.loading.rooms = false;
        state.error.rooms = action.payload;
      })
      /* ---------------- BOOKING DETAILS ---------------- */
      .addCase(fetchBookingDetails.pending, (state) => {
        state.loading.bookingDetails = true;
        state.error.bookingDetails = null;
      })
      .addCase(fetchBookingDetails.fulfilled, (state, action) => {
        state.loading.bookingDetails = false;
        state.tboBookingDetails = action.payload;
      })
      .addCase(fetchBookingDetails.rejected, (state, action) => {
        state.loading.bookingDetails = false;
        state.error.bookingDetails = action.payload;
      });
  },
});

export const { clearHotels, clearSelectedHotel } = hotelSlice.actions;
export default hotelSlice.reducer;
