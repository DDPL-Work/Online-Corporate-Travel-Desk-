import { createSlice } from "@reduxjs/toolkit";
import { fetchAirlines, fetchCountries, fetchCities, fetchHotels, fetchAirports, saveCorporateMarkup, getAllCorporateMarkups, deleteCorporateMarkup, fetchMarkupRevenue, fetchBookingMarkupAudit } from "../Actions/markup.thunks";

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

  saveMarkupLoading: false,
  saveMarkupError: null,

  configuredMarkups: [],
  fetchMarkupsLoading: false,
  fetchMarkupsError: null,

  deleteMarkupLoading: false,

  revenue: [],
  revenueLoading: false,
  revenueError: null,

  audit: [],
  auditLoading: false,
  auditError: null,
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
    clearRevenue: (state) => {
      state.revenue = [];
    },
    clearAudit: (state) => {
      state.audit = [];
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
      })
      
      // Save Corporate Markup
      .addCase(saveCorporateMarkup.pending, (state) => {
        state.saveMarkupLoading = true;
        state.saveMarkupError = null;
      })
      .addCase(saveCorporateMarkup.fulfilled, (state) => {
        state.saveMarkupLoading = false;
      })
      .addCase(saveCorporateMarkup.rejected, (state, action) => {
        state.saveMarkupLoading = false;
        state.saveMarkupError = action.payload;
      })
      
      // Fetch Corporate Markups
      .addCase(getAllCorporateMarkups.pending, (state) => {
        state.fetchMarkupsLoading = true;
        state.fetchMarkupsError = null;
      })
      .addCase(getAllCorporateMarkups.fulfilled, (state, action) => {
        state.fetchMarkupsLoading = false;
        state.configuredMarkups = action.payload?.data || [];
      })
      .addCase(getAllCorporateMarkups.rejected, (state, action) => {
        state.fetchMarkupsLoading = false;
        state.fetchMarkupsError = action.payload;
      })

      // Delete Corporate Markup
      .addCase(deleteCorporateMarkup.pending, (state) => {
        state.deleteMarkupLoading = true;
      })
      .addCase(deleteCorporateMarkup.fulfilled, (state, action) => {
        state.deleteMarkupLoading = false;
        // The thunk payload might not have the ID, so we re-fetch in the component
      })
      .addCase(deleteCorporateMarkup.rejected, (state) => {
        state.deleteMarkupLoading = false;
      })

      // Fetch Markup Revenue
      .addCase(fetchMarkupRevenue.pending, (state) => {
        state.revenueLoading = true;
        state.revenueError = null;
      })
      .addCase(fetchMarkupRevenue.fulfilled, (state, action) => {
        state.revenueLoading = false;
        state.revenue = action.payload?.data || [];
      })
      .addCase(fetchMarkupRevenue.rejected, (state, action) => {
        state.revenueLoading = false;
        state.revenueError = action.payload || "Failed to fetch markup revenue";
      })

      // Fetch Booking Markup Audit
      .addCase(fetchBookingMarkupAudit.pending, (state) => {
        state.auditLoading = true;
        state.auditError = null;
      })
      .addCase(fetchBookingMarkupAudit.fulfilled, (state, action) => {
        state.auditLoading = false;
        state.audit = action.payload?.data || [];
      })
      .addCase(fetchBookingMarkupAudit.rejected, (state, action) => {
        state.auditLoading = false;
        state.auditError = action.payload || "Failed to fetch booking markup audit";
      });
  },
});

export const { clearAirlines, clearCountries, clearCities, clearHotels, clearAirports, clearRevenue, clearAudit } = markupSlice.actions;

export default markupSlice.reducer;
