import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../API/axios";

/* ======================================================
   THUNKS
====================================================== */

/* ---------- COUNTRY LIST ---------- */
export const fetchCountries = createAsyncThunk(
  "hotel/fetchCountries",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/hotels/country-list");
     return response.data.data.CountryList;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  },
  {
    condition: (_, { getState }) => {
      const { hotel } = getState();
      if (hotel.countries.length > 0) {
        return false; // prevent duplicate fetch
      }
    },
  },
);

/* ---------- CITY LIST ---------- */
export const fetchCities = createAsyncThunk(
  "hotel/fetchCities",
  async (countryCode, { rejectWithValue }) => {
    try {
      const { data } = await api.get(
        `/hotels/cities?countryCode=${countryCode}`
      );
      return {
  countryCode,
  cities: data.data?.CityList || [],
};
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || err.message
      );
    }
  },
  {
    condition: (countryCode, { getState }) => {
      const { hotel } = getState();

      // If cities already loaded for this country
      if (hotel.citiesByCountry?.[countryCode]) {
        return false;
      }
    },
  }
);

/* ---------- HOTEL SEARCH ---------- */
export const searchHotels = createAsyncThunk(
  "hotel/searchHotels",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/hotels/search", payload);
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  },
);

/* ---------- HOTEL DETAILS ---------- */
export const fetchHotelDetails = createAsyncThunk(
  "hotel/fetchHotelDetails",
  async (hotelCode, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/hotels/details", { hotelCode });
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  },
);
