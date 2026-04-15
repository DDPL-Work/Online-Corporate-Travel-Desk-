//hotelBooking.thunks.js


import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../API/axios";


/* ================================
   PRE BOOK HOTEL
================================ */
export const preBookHotel = createAsyncThunk(
  "hotelBookings/preBookHotel",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await api.post("/hotel-booking/prebook", payload);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

/* ================================
   CREATE HOTEL BOOKING REQUEST
================================ */
export const createHotelBookingRequest = createAsyncThunk(
  "hotelBookings/createHotelBookingRequest",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await api.post("/hotel-booking/create-request", payload);
      return res.data.data; // { bookingRequestId, bookingReference, requestStatus }
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

/* ================================
   GET MY HOTEL REQUESTS
================================ */
export const fetchMyHotelRequests = createAsyncThunk(
  "hotelBookings/fetchMyHotelRequests",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/hotel-booking/my");
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

/* ================================
   GET SINGLE HOTEL REQUEST
================================ */
export const fetchHotelRequestById = createAsyncThunk(
  "hotelBookings/fetchHotelRequestById",
  async (id, { rejectWithValue }) => {
    try {
      const res = await api.get(`/hotel-booking/my/${id}`);
      return res.data?.data || res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

/* ================================
   GET REJECTED REQUESTS
================================ */
export const fetchRejectedHotelRequests = createAsyncThunk(
  "hotelBookings/fetchRejectedHotelRequests",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/hotel-booking/my/rejected");
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

/* ================================
   GET COMPLETED BOOKINGS
================================ */
export const fetchMyHotelBookings = createAsyncThunk(
  "hotelBookings/fetchCompletedHotelBookings",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/hotel-booking/my/completed");

      return res.data.data.bookings; // ✅ ONLY ARRAY
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

/* ================================
   EXECUTE HOTEL BOOKING
================================ */
export const executeHotelBooking = createAsyncThunk(
  "hotelBookings/executeHotelBooking",
  async (bookingId, { rejectWithValue }) => {
    try {
      const res = await api.post(`/hotel-booking/${bookingId}/execute`);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);


/* ================================
   GET BOOKED HOTEL DETAILS (TBO)
================================ */
export const fetchBookedHotelDetails = createAsyncThunk(
  "hotelBookings/fetchBookedHotelDetails",
  async (id, { rejectWithValue }) => {
    try {
      const res = await api.get(`/hotel-booking/${id}/details`);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || err.message
      );
    }
  }
);

/* ================================
   GENERATE HOTEL VOUCHER
================================ */
export const generateHotelVoucher = createAsyncThunk(
  "hotelBookings/generateHotelVoucher",
  async (bookingId, { rejectWithValue }) => {
    try {
      const res = await api.post(
        `/hotel-booking/${bookingId}/voucher`,
        {},
        {
          responseType: "blob", // 🔥 VERY IMPORTANT
        }
      );

      // 🔥 Create download
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");

      link.href = url;
      link.setAttribute("download", `hotel-voucher-${bookingId}.pdf`);
      document.body.appendChild(link);
      link.click();

      link.remove();

      return true;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || err.message
      );
    }
  }
);