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


// 🔹 Admin: Get manager requests
export const fetchManagerRequests = createAsyncThunk(
  "employee/fetchManagerRequests",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.post("/travel-admin/all/managers");
      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch manager requests"
      );
    }
  }
);

// 🔹 Admin: Review manager request (approve/reject)
export const reviewManagerRequest = createAsyncThunk(
  "employee/reviewManagerRequest",
  async ({ requestId, action }, { rejectWithValue }) => {
    try {
      const res = await api.post("/travel-admin/review", {
        requestId,
        action,
      });
      return { requestId, action, message: res.data.message };
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to review request"
      );
    }
  }
);


/**
 * ============================================================
 * 👥 FETCH ALL EMPLOYEES (ADMIN)
 * ============================================================
 */
export const getAllEmployeesAdmin = createAsyncThunk(
  "adminBooking/getAllEmployeesAdmin",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/travel-admin/all-employees");

      // backend response:
      // { success: true, count, employees }
      return res.data.employees;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch employees"
      );
    }
  }
);

/**
 * ============================================================
 * 🔁 TOGGLE EMPLOYEE STATUS (ADMIN)
 * ============================================================
 */
export const toggleEmployeeStatusAdmin = createAsyncThunk(
  "adminBooking/toggleEmployeeStatusAdmin",
  async (userId, { rejectWithValue }) => {
    try {
      const res = await api.patch(
        `/travel-admin/${userId}/toggle-status`
      );

      // expected response:
      // { success, message, data: { userId, isActive, employeeStatus } }

      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to toggle employee status"
      );
    }
  }
);