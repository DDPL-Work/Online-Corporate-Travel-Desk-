import { createSlice } from "@reduxjs/toolkit";
import { fetchAirlines, fetchCountries, fetchCities, fetchHotels, fetchAirports } from "../Actions/markup.thunks";

const initialState = {
  airlines: [],
  airlinesLoading: false,
  airlinesError: null,

  countries: [],
  countriesLoading: false,
  countriesError: null,

  cities: [],
  citiesLoading: false,
  citiesError: null,

  hotels: [],
  hotelsLoading: false,
  hotelsError: null,

  airports: [],
  airportsLoading: false,
  airportsError: null,
};

const markupSlice = createSlice({
  name: "markup",
  initialState,
  reducers: {
    clearAirlines: (state) => {
      state.airlines = [];
    },
    clearCountries: (state) => {
      state.countries = [];
    },
    clearCities: (state) => {
      state.cities = [];
    },
    clearHotels: (state) => {
      state.hotels = [];
    },
    clearAirports: (state) => {
      state.airports = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Airlines
      .addCase(fetchAirlines.pending, (state) => {
        state.airlinesLoading = true;
        state.airlinesError = null;
      })
      .addCase(fetchAirlines.fulfilled, (state, action) => {
        state.airlinesLoading = false;
        state.airlines = action.payload?.data || [];
      })
      .addCase(fetchAirlines.rejected, (state, action) => {
        state.airlinesLoading = false;
        state.airlinesError = action.payload || "Failed to fetch airlines";
      })
      
      // Fetch Countries
      .addCase(fetchCountries.pending, (state) => {
        state.countriesLoading = true;
        state.countriesError = null;
      })
      .addCase(fetchCountries.fulfilled, (state, action) => {
        state.countriesLoading = false;
        state.countries = action.payload?.data || [];
      })
      .addCase(fetchCountries.rejected, (state, action) => {
        state.countriesLoading = false;
        state.countriesError = action.payload || "Failed to fetch countries";
      })

      // Fetch Cities
      .addCase(fetchCities.pending, (state) => {
        state.citiesLoading = true;
        state.citiesError = null;
      })
      .addCase(fetchCities.fulfilled, (state, action) => {
        state.citiesLoading = false;
        state.cities = action.payload?.data || [];
      })
      .addCase(fetchCities.rejected, (state, action) => {
        state.citiesLoading = false;
        state.citiesError = action.payload || "Failed to fetch cities";
      })

      // Fetch Hotels
      .addCase(fetchHotels.pending, (state) => {
        state.hotelsLoading = true;
        state.hotelsError = null;
      })
      .addCase(fetchHotels.fulfilled, (state, action) => {
        state.hotelsLoading = false;
        state.hotels = action.payload?.data || [];
      })
      .addCase(fetchHotels.rejected, (state, action) => {
        state.hotelsLoading = false;
        state.hotelsError = action.payload;
      })

      // Fetch Airports
      .addCase(fetchAirports.pending, (state) => {
        state.airportsLoading = true;
        state.airportsError = null;
      })
      .addCase(fetchAirports.fulfilled, (state, action) => {
        state.airportsLoading = false;
        state.airports = action.payload?.data || [];
      })
      .addCase(fetchAirports.rejected, (state, action) => {
        state.airportsLoading = false;
        state.airportsError = action.payload;
      });
  },
});

export const { clearAirlines, clearCountries, clearCities, clearHotels, clearAirports } = markupSlice.actions;

export default markupSlice.reducer;
