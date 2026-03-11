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

      console.log("COUNTRY API RESPONSE:", response.data);

      return response.data.data;
    } catch (err) {
      console.log("COUNTRY API ERROR:", err);
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  },
);

/* ---------- CITY LIST ---------- */
export const fetchCities = createAsyncThunk(
  "hotel/fetchCities",
  async (countryCode, { rejectWithValue }) => {
    try {
      const { data } = await api.get(
        `/hotels/cities?countryCode=${countryCode}`,
      );
      return {
        countryCode,
        cities: data.data?.CityList || [],
      };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
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
  },
);

/* ---------- HOTEL SEARCH ---------- */
export const searchHotels = createAsyncThunk(
  "hotel/searchHotels",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/hotels/search", payload);
      return data.data.HotelResult;
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
  {
    condition: (hotelCode, { getState }) => {
      const { hotel } = getState();
      if (hotel.hotelDetailsById?.[hotelCode]) {
        return false; // already cached
      }
    },
  },
);
