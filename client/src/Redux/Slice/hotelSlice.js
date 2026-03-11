import { createSlice } from "@reduxjs/toolkit";
import {
  fetchCities,
  fetchCountries,
  fetchHotelDetails,
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

    loading: {
      countries: false,
      cities: false,
      search: false,
      details: false,
    },

    error: {
      countries: null,
      cities: null,
      search: null,
      details: null,
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
        state.hotels = action.payload || [];
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

        const hotelCode = action.meta.arg;
        state.hotelDetailsById[hotelCode] = action.payload;

        state.selectedHotel = action.payload;
      })
      .addCase(fetchHotelDetails.rejected, (state, action) => {
        state.loading.details = false;
        state.error.details = action.payload;
      });
  },
});

export const { clearHotels, clearSelectedHotel } = hotelSlice.actions;
export default hotelSlice.reducer;
