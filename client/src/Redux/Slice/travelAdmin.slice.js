//client\src\Redux\Slice\travelAdmin.slice.js

import { createSlice } from "@reduxjs/toolkit";
import {
  getAllFlightBookingsAdmin,
  getAllHotelBookingsAdmin,
  getCancelledHotelBookingsAdmin,
  fetchManagerRequests,
  reviewManagerRequest,
  getAllEmployeesAdmin,
  toggleEmployeeStatusAdmin,
} from "../Actions/travelAdmin.thunks";

const initialState = {
  flightBookings: [],
  hotelBookings: [],
  cancelledHotelBookings: [],
  managerRequests: [],
  allEmployees: [],

  loadingFlights: false,
  loadingHotels: false,
  loadingCancelledHotels: false,
  loadingManagerRequests: false,
  loadingEmployees: false,

  errorFlights: null,
  errorHotels: null,
  errorCancelledHotels: null,
  errorManagerRequests: null,
  errorEmployees: null,
};

const adminBookingSlice = createSlice({
  name: "adminBooking",
  initialState,
  reducers: {},

  extraReducers: (builder) => {
    builder

      /**
       * ============================================================
       * ✈️ FLIGHT BOOKINGS
       * ============================================================
       */
      .addCase(getAllFlightBookingsAdmin.pending, (state) => {
        state.loadingFlights = true;
        state.errorFlights = null;
      })
      .addCase(getAllFlightBookingsAdmin.fulfilled, (state, action) => {
        state.loadingFlights = false;
        state.flightBookings = action.payload;
      })
      .addCase(getAllFlightBookingsAdmin.rejected, (state, action) => {
        state.loadingFlights = false;
        state.errorFlights = action.payload;
      })

      /**
       * ============================================================
       * 🏨 HOTEL BOOKINGS
       * ============================================================
       */
      .addCase(getAllHotelBookingsAdmin.pending, (state) => {
        state.loadingHotels = true;
        state.errorHotels = null;
      })
      .addCase(getAllHotelBookingsAdmin.fulfilled, (state, action) => {
        state.loadingHotels = false;
        state.hotelBookings = action.payload;
      })
      .addCase(getAllHotelBookingsAdmin.rejected, (state, action) => {
        state.loadingHotels = false;
        state.errorHotels = action.payload;
      })

      /**
       * ============================================================
       * ❌ CANCELLED HOTEL BOOKINGS
       * ============================================================
       */
      .addCase(getCancelledHotelBookingsAdmin.pending, (state) => {
        state.loadingCancelledHotels = true;
        state.errorCancelledHotels = null;
      })
      .addCase(getCancelledHotelBookingsAdmin.fulfilled, (state, action) => {
        state.loadingCancelledHotels = false;
        state.cancelledHotelBookings = action.payload;
      })
      .addCase(getCancelledHotelBookingsAdmin.rejected, (state, action) => {
        state.loadingCancelledHotels = false;
        state.errorCancelledHotels = action.payload;
      })

      /**
       * ============================================================
       * 👨‍💼 MANAGER REQUESTS
       * ============================================================
       */

      // 📥 FETCH REQUESTS
      .addCase(fetchManagerRequests.pending, (state) => {
        state.loadingManagerRequests = true;
        state.errorManagerRequests = null;
      })
      .addCase(fetchManagerRequests.fulfilled, (state, action) => {
        state.loadingManagerRequests = false;
        state.managerRequests = action.payload;
      })
      .addCase(fetchManagerRequests.rejected, (state, action) => {
        state.loadingManagerRequests = false;
        state.errorManagerRequests = action.payload;
      })

      // ✅ REVIEW REQUEST (APPROVE / REJECT)
      .addCase(reviewManagerRequest.fulfilled, (state, action) => {
        const { requestId, action: reviewAction } = action.payload;

        const req = state.managerRequests.find((r) => r._id === requestId);

        if (req) {
          req.status = reviewAction === "approve" ? "approved" : "rejected";

          // 🔥 update manager role instantly in UI
          if (req.managerId) {
            req.managerId.role =
              reviewAction === "approve" ? "manager" : "employee";
          }
        }
      })

      /**
       * ============================================================
       * 👥 ALL EMPLOYEES
       * ============================================================
       */
      .addCase(getAllEmployeesAdmin.pending, (state) => {
        state.loadingEmployees = true;
        state.errorEmployees = null;
      })
      .addCase(getAllEmployeesAdmin.fulfilled, (state, action) => {
        state.loadingEmployees = false;
        state.allEmployees = action.payload;
      })
      .addCase(getAllEmployeesAdmin.rejected, (state, action) => {
        state.loadingEmployees = false;
        state.errorEmployees = action.payload;
      })

      /**
       * ============================================================
       * 🔁 TOGGLE EMPLOYEE STATUS
       * ============================================================
       */
      .addCase(toggleEmployeeStatusAdmin.fulfilled, (state, action) => {
        const { userId, isActive } = action.payload;

        const emp = state.allEmployees.find((u) => u._id === userId);

        if (emp) {
          // ✅ update UI instantly
          emp.isActive = isActive;

          // optional (if employee.status is available on frontend side)
          emp.status = isActive ? "active" : "inactive";
        }
      })
      .addCase(toggleEmployeeStatusAdmin.rejected, (state, action) => {
        // optional: you can add error handling if needed
        state.errorEmployees = action.payload;
      });
  },
});

export default adminBookingSlice.reducer;
