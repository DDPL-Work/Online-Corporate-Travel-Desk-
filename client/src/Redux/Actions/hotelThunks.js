// client\src\Redux\Actions\hotelThunks.js


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
  async (params, { rejectWithValue }) => {
    try {
      const hasWrapper = params && typeof params === "object" && "payload" in params;
      const payload = hasWrapper ? params.payload : params;
      const page = hasWrapper ? params.page || 1 : 1;
      const limit = hasWrapper ? params.limit || 10 : 10;

      const { data } = await api.post(
        `/hotels/search?page=${page}&limit=${limit}`,
        payload,
      );

      const hotels =
        data?.data?.hotels ||
        data?.data?.HotelResult ||
        data?.data?.HotelResult?.HotelResult ||
        [];

      const pagination =
        data?.data?.pagination || {
          total: hotels.length,
          page,
          limit,
          hasMore: false,
        };

      console.log("🏨 HOTEL SEARCH RESPONSE:", {
        page,
        limit,
        total: pagination.total,
        hotels: hotels.length,
      });

      return {
        hotels,
        pagination,
        traceId: data?.data?.traceId || data?.data?.TraceId || null,
        page,
        limit,
      };
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  },
);

/* ---------- HOTEL DETAILS ---------- */
export const fetchHotelDetails = createAsyncThunk(
  "hotel/fetchHotelDetails",
  async ({ hotelCode }, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/hotels/details", {
        hotelCode,
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
  async ({ hotelCode }, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/hotels/room-info", {
        hotelCode,
      });
      return {
        hotelCode,
        rooms: data.data?.GetHotelRoomResult?.HotelRoomsDetails || [],
      };
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
