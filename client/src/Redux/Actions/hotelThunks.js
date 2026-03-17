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
// <<<<<<< HEAD
//       return data.data.HotelResult;
// =======
      console.log("🏨 HOTEL SEARCH RESPONSE:", data.data);
      return {
        hotels: data.data.HotelResult || [],
        traceId: data.data.TraceId,
      };
// >>>>>>> 6c93c2a6864064eee402edb2e2c40c889dc71d90
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  },
);

/* ---------- HOTEL DETAILS ---------- */
export const fetchHotelDetails = createAsyncThunk(
  "hotel/fetchHotelDetails",
// <<<<<<< HEAD
//   async (hotelCode, { rejectWithValue }) => {
//     try {
//       const { data } = await api.post("/hotels/details", { hotelCode });
// =======
  async ({ hotelCode, traceId, resultIndex }, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/hotels/details", {
        hotelCode,
        traceId,
        resultIndex,
      });
// >>>>>>> 6c93c2a6864064eee402edb2e2c40c889dc71d90
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  },
  {
// <<<<<<< HEAD
//     condition: (hotelCode, { getState }) => {
// =======
    condition: ({ hotelCode }, { getState }) => {
// >>>>>>> 6c93c2a6864064eee402edb2e2c40c889dc71d90
      const { hotel } = getState();
      if (hotel.hotelDetailsById?.[hotelCode]) {
        return false; // already cached
      }
    },
  },
);
// <<<<<<< HEAD
// =======

/* ---------- ROOM INFO ---------- */
export const fetchRoomInfo = createAsyncThunk(
  "hotel/fetchRoomInfo",
  async ({ hotelCode, traceId, resultIndex }, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/hotels/room-info", {
        hotelCode,
        traceId,
        resultIndex,
      });
      return { hotelCode, rooms: data.data?.GetHotelRoomResult?.HotelRoomsDetails || [] };
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  },
);
/* ---------- BOOKING DETAILS (Post-Booking) ---------- */
export const fetchBookingDetails = createAsyncThunk(
  "hotel/fetchBookingDetails",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/hotels/booking-details", payload);
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  },
);
// >>>>>>> 6c93c2a6864064eee402edb2e2c40c889dc71d90
