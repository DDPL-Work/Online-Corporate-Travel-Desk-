// booking.thunks.js

import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../API/axios"; // axios instance with auth token

const buildThunkError = (err, fallbackMessage) => ({
  message:
    err.response?.data?.message ||
    err.response?.data?.error ||
    err.message ||
    fallbackMessage,
  statusCode: err.response?.status || err.statusCode || 500,
  code: err.response?.data?.code || null,
  providerMessage: err.response?.data?.providerMessage || null,
  data: err.response?.data?.data || null,
});

// CREATE booking request (approval-first)
export const createBookingRequest = createAsyncThunk(
  "bookings/createBookingRequest",
  async (payload, { rejectWithValue }) => {
    try {
      console.log("🔥 API PAYLOAD:", payload);
      const { data } = await api.post("/bookings", payload);
      console.log("✅ API RESPONSE:", data);
      return data.data;
    } catch (err) {
      console.error("❌ API ERROR:", err);
      return rejectWithValue(buildThunkError(err, "Failed to submit booking request for approval"));
    }
  },
);

// INSTANT FLIGHT BOOKING (Auto-approval compliant)
export const instantFlightBooking = createAsyncThunk(
  "bookings/instantFlightBooking",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/bookings/instant-flight-book", payload);
      return data.data;
    } catch (err) {
      return rejectWithValue(buildThunkError(err, "Instant flight booking failed"));
    }
  },
);

// GET logged-in user's booking requests (EMPLOYEE)
export const fetchMyBookingRequests = createAsyncThunk(
  "bookings/fetchMyRequests",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/bookings/my-requests");
      return data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch my booking requests",
      );
    }
  },
);

export const fetchMyBookingRequestById = createAsyncThunk(
  "bookingRequests/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/bookings/my-request/${id}`);
      return data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch booking request",
      );
    }
  },
);

export const fetchMyRejectedRequests = createAsyncThunk(
  "bookingRequests/fetchMyRejected",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/bookings/my/rejected");
      return data.data; // array of BookingRequest
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || "Failed to fetch my rejected requests",
      );
    }
  },
);

// CONFIRM booking after approval
export const executeApprovedFlightBooking = createAsyncThunk(
  "bookings/executeFlight",
  async (input, { rejectWithValue }) => {
    try {
      const bookingId = typeof input === "string" ? input : input?.bookingId;
      const confirmPendingRevalidation =
        typeof input === "object" && input?.confirmPendingRevalidation === true;

      const { data } = await api.post(`/bookings/${bookingId}/execute-flight`, {
        confirmPendingRevalidation,
      });

      return data.data;
    } catch (err) {
      return rejectWithValue(buildThunkError(err, "Flight booking failed"));
    }
  },
);

export const fetchApprovedFlightBookingStatus = createAsyncThunk(
  "bookings/fetchApprovedFlightBookingStatus",
  async (bookingId, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/bookings/${bookingId}/execute-flight-status`);
      return data.data;
    } catch (err) {
      return rejectWithValue(
        buildThunkError(err, "Failed to fetch approved booking status"),
      );
    }
  },
);

// GET my bookings (Employee – BookingRequest)
export const fetchMyBookings = createAsyncThunk(
  "bookings/fetchMyBookings",
  async (
    {  requestStatus, executionStatus, bookingType } = {},
    { rejectWithValue },
  ) => {
    try {
      const { data } = await api.get("/bookings/my-bookings", {
        params: {
          // page,
          // limit,
          requestStatus,
          executionStatus,
          bookingType,
        },
      });

      return data.data; // { bookings, pagination }
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch my bookings",
      );
    }
  },
);

// GET my booking by ID (Employee – BookingRequest)
export const fetchMyBookingById = createAsyncThunk(
  "bookings/fetchMyBookingById",
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/bookings/my-booking/${id}`);
      return data.data; // BookingRequest
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch booking",
      );
    }
  },
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
        err.response?.data?.message || "Booking cancellation failed",
      );
    }
  },
);

export const manualTicketNonLcc = createAsyncThunk(
  "booking/manualTicketNonLcc",
  async (bookingId, { rejectWithValue }) => {
    try {
      const res = await api.post(`/bookings/${bookingId}/manual-ticket`);
      return res.data.data;
    } catch (err) {
      // Structured error so booking.slice can surface statusCode and code
      return rejectWithValue(buildThunkError(err, "Manual ticket generation failed"));
    }
  },
);

/* =====================================================
 * ✅ Ticket Flight (issue ticket & optionally download)
 * ===================================================== */
export const downloadTicketPdf = createAsyncThunk(
  "bookings/downloadTicketPdf",
  async ({ bookingId, journeyType }, { rejectWithValue }) => {
    try {
      const response = await api.get(`/bookings/${bookingId}/ticket-pdf`, {
        params: { journeyType },
        responseType: "blob",
      });

      const blob = new Blob([response.data], {
        type: "application/pdf",
      });
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `ticket_${bookingId}_${journeyType}.pdf`;
      a.click();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      // Surface real server error message (e.g. 409 "Ticket generation is not allowed from status COMPLETED")
      return rejectWithValue(
        buildThunkError(err, "Failed to download ticket PDF"),
      );
    }
  },
);

export const fetchMyCancellationQueries = createAsyncThunk(
  "booking/fetchMyCancellationQueries",
  async (params, { rejectWithValue }) => {
    try {
      const res = await api.get("/bookings/my/cancellation-queries", { params });
      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch my queries"
      );
    }
  }
);
