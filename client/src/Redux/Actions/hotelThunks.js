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
      console.log("🏨 HOTEL SEARCH RESPONSE:", data.data);
      return {
        hotels: data.data.HotelResult || [],
        traceId: data.data.TraceId,
      };
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  },
);

/* ---------- HOTEL DETAILS ---------- */
export const fetchHotelDetails = createAsyncThunk(
  "hotel/fetchHotelDetails",
  async ({ hotelCode, traceId, resultIndex }, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/hotels/details", {
        hotelCode,
        traceId,
        resultIndex,
      });
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  },
  {
    condition: ({ hotelCode }, { getState }) => {
      const { hotel } = getState();
      if (hotel.hotelDetailsById?.[hotelCode]) {
        return false; // already cached
      }
    },
  },
);

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
