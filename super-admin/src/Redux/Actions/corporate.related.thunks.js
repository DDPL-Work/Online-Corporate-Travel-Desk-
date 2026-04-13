//super-admin\src\Redux\Actions\corporate.related.thunks.js
import { createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_BASE_URL;
const BASE_URL = `${API_URL}/corporate-related/corporate-bookings`;

// 🔐 attach token automatically (adjust if you use interceptor)
const getConfig = (getState) => ({
  headers: {
    Authorization: `Bearer ${getState().auth.token}`,
  },
});

/**
 * ✈️ FETCH FLIGHT BOOKINGS
 */
export const fetchFlightBookings = createAsyncThunk(
  "superAdmin/fetchFlightBookings",
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const { page = 1, limit = 10, ...filters } = params;

      const query = new URLSearchParams({
        page,
        limit,
        ...filters,
      }).toString();

      const res = await axios.get(
        `${BASE_URL}/flights?${query}`,
        getConfig(getState),
      );

      const payload = res.data || {};
      return {
        data: payload.data || payload.results || [],
        pagination: payload.pagination || {
          page,
          limit,
          total: payload.total || 0,
        },
      };
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  },
);

/**
 * 🏨 FETCH HOTEL BOOKINGS
 */
export const fetchHotelBookings = createAsyncThunk(
  "superAdmin/fetchHotelBookings",
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const { page = 1, limit = 10, ...filters } = params;

      const query = new URLSearchParams({
        page,
        limit,
        ...filters,
      }).toString();

      const res = await axios.get(
        `${BASE_URL}/hotels?${query}`,
        getConfig(getState),
      );

      const payload = res.data || {};
      return {
        data: payload.data || payload.results || [],
        pagination: payload.pagination || {
          page,
          limit,
          total: payload.total || 0,
        },
      };
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  },
);


// ✈️ FLIGHT CANCELLATIONS
export const fetchFlightCancellations = createAsyncThunk(
  "corporateRelated/fetchFlightCancellations",
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const { page = 1, limit = 10, ...filters } = params;

      const query = new URLSearchParams({
        page,
        limit,
        ...filters,
      }).toString();

      const res = await axios.get(
        `${BASE_URL}/flights/cancellations?${query}`,
        getConfig(getState),
      );

      const payload = res.data || {};
      return {
        data: payload.data || [],
        pagination: payload.pagination || {
          page,
          limit,
          total: payload.total || 0,
        },
      };
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

// 🏨 HOTEL CANCELLATIONS
export const fetchHotelCancellations = createAsyncThunk(
  "corporateRelated/fetchHotelCancellations",
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const { page = 1, limit = 10, ...filters } = params;

      const query = new URLSearchParams({
        page,
        limit,
        ...filters,
      }).toString();

      const res = await axios.get(
        `${BASE_URL}/hotels/cancellations?${query}`,
        getConfig(getState),
      );

      const payload = res.data || {};
      return {
        data: payload.data || [],
        pagination: payload.pagination || {
          page,
          limit,
          total: payload.total || 0,
        },
      };
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);
