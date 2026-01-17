// booking.thunks.js

import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../API/axios"; // axios instance with auth token

// CREATE booking request (approval-first)
export const createBookingRequest = createAsyncThunk(
  "bookings/createBookingRequest",
  async (payload, { rejectWithValue }) => {
    try {
      console.log("🔥 API PAYLOAD:", payload);

      const { data } = await api.post("/bookings", payload);
      console.log("✅ API RESPONSE:", data);
      return data.data; // { bookingRequestId, approvalId, bookingReference }
    } catch (err) {
      console.error("❌ API ERROR:", err);
      return rejectWithValue(
        err.response?.data?.message ||
          "Failed to submit booking request for approval"
      );
    }
  }
);

// GET logged-in user's booking requests (EMPLOYEE)
export const fetchMyBookingRequests = createAsyncThunk(
  "bookings/fetchMyRequests",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/bookings/my");
      return data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch my booking requests"
      );
    }
  }
);

export const fetchMyBookingRequestById = createAsyncThunk(
  "bookingRequests/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/bookings/my/${id}`);
      return data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch booking request"
      );
    }
  }
);

export const fetchMyRejectedRequests = createAsyncThunk(
  "bookingRequests/fetchMyRejected",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/bookings/my/rejected");
      return data.data; // array of BookingRequest
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || "Failed to fetch my rejected requests"
      );
    }
  }
);

// CONFIRM booking after approval
export const confirmBooking = createAsyncThunk(
  "bookings/confirm",
  async (bookingId, { rejectWithValue }) => {
    try {
      const { data } = await api.post(`/bookings/${bookingId}/confirm`);
      return data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Booking confirmation failed"
      );
    }
  }
);

// GET all bookings
export const fetchBookings = createAsyncThunk(
  "bookings/fetchAll",
  async (
    { page = 1, limit = 10, status, bookingType, dateFrom, dateTo },
    { rejectWithValue }
  ) => {
    try {
      const { data } = await api.get("/bookings", {
        params: { page, limit, status, bookingType, dateFrom, dateTo },
      });
      return data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch bookings"
      );
    }
  }
);

// GET single booking
export const fetchBookingById = createAsyncThunk(
  "bookings/fetchOne",
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/bookings/${id}`);
      return data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch booking"
      );
    }
  }
);

// CANCEL booking
export const cancelBooking = createAsyncThunk(
  "bookings/cancel",
  async ({ id, reason }, { rejectWithValue }) => {
    try {
      const { data } = await api.post(`/bookings/${id}/cancel`, { reason });
      return data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Booking cancellation failed"
      );
    }
  }
);
