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
          "Failed to submit booking request for approval",
      );
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
  async (bookingId, { rejectWithValue }) => {
    try {
      const { data } = await api.post(`/bookings/${bookingId}/execute-flight`);
      return data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Flight booking failed",
      );
    }
  },
);

// GET my bookings (Employee – BookingRequest)
export const fetchMyBookings = createAsyncThunk(
  "bookings/fetchMyBookings",
  async (
    { page = 1, limit = 10, requestStatus, executionStatus, bookingType } = {},
    { rejectWithValue },
  ) => {
    try {
      const { data } = await api.get("/bookings/my-bookings", {
        params: {
          page,
          limit,
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

/* =====================================================
 * ✅ Ticket Flight (issue ticket & optionally download)
 * ===================================================== */
// export const ticketFlight = createAsyncThunk(
//   "bookings/ticketFlight",
//   async ({ bookingId, pnr, isLCC = false }, { rejectWithValue }) => {
//     try {
//       const response = await axios.post(
//         "/api/v1/flights/ticket",
//         {
//           bookingId,
//           pnr,
//           IsLCC: isLCC,
//         },
//         { responseType: "blob" }, // so we can download PDF
//       );

//       // If backend sends PDF blob
//       const blob = new Blob([response.data], { type: "application/pdf" });
//       const url = window.URL.createObjectURL(blob);
//       const a = document.createElement("a");
//       a.href = url;
//       a.download = `ticket_${pnr || bookingId}.pdf`;
//       document.body.appendChild(a);
//       a.click();
//       window.URL.revokeObjectURL(url);
//       a.remove();

//       return { bookingId, pnr, success: true };
//     } catch (err) {
//       console.error("Ticket download failed:", err);
//       const message =
//         err.response?.data?.message || "Failed to download ticket.";
//       return rejectWithValue(message);
//     }
//   },
// );

export const downloadTicketPdf = createAsyncThunk(
  "bookings/downloadTicketPdf",
  async (bookingId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/bookings/${bookingId}/ticket-pdf`, {
        responseType: "blob",
      });

      const blob = new Blob([response.data], {
        type: "application/pdf",
      });
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `ticket_${bookingId}.pdf`;
      a.click();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      return rejectWithValue("Failed to download ticket");
    }
  },
);
