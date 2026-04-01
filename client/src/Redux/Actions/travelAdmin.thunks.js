//client\src\Redux\Actions\travelAdmin.thunks.js
import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../API/axios";

/**
 * ============================================================
 * ✈️ FETCH FLIGHT BOOKINGS (ADMIN)
 * ============================================================
 */
export const getAllFlightBookingsAdmin = createAsyncThunk(
  "adminBooking/getAllFlightBookingsAdmin",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/travel-admin/flights");

      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch flight bookings",
      );
    }
  },
);

/**
 * ============================================================
 * 🏨 FETCH HOTEL BOOKINGS (ADMIN)
 * ============================================================
 */
export const getAllHotelBookingsAdmin = createAsyncThunk(
  "adminBooking/getAllHotelBookingsAdmin",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/travel-admin/hotels");

      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch hotel bookings",
      );
    }
  },
);

/**
 * ============================================================
 * ❌ FETCH CANCELLED HOTEL BOOKINGS (ADMIN)
 * ============================================================
 */
export const getCancelledHotelBookingsAdmin = createAsyncThunk(
  "adminBooking/getCancelledHotelBookingsAdmin",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/travel-admin/hotels/cancelled");

      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message ||
          "Failed to fetch cancelled hotel bookings",
      );
    }
  },
);
