//client\src\Redux\Slice\travelAdmin.slice.js

import { createSlice } from "@reduxjs/toolkit";
import {
  getAllFlightBookingsAdmin,
  getFlightBookingByIdAdmin,
  getAllHotelBookingsAdmin,
  getHotelBookingByIdAdmin,
  getCancelledHotelBookingsAdmin,
  fetchManagerRequests,
  reviewManagerRequest,
  getAllEmployeesAdmin,
  toggleEmployeeStatusAdmin,
  demoteEmployeeAdmin,
  promoteEmployeeAdmin,
  promoteEmployeeToFinanceAdmin,
  getEmployeeExpensesAdmin,
  getFinanceTeamAdmin,
} from "../Actions/travelAdmin.thunks";

const initialState = {
  flightBookings: [],
  hotelBookings: [],
  cancelledHotelBookings: [],
  managerRequests: [],
  allEmployees: [],
  financeTeam: [],
  employeeExpenses: {},

  loadingFlights: false,
  loadingHotels: false,
  loadingCancelledHotels: false,
  loadingManagerRequests: false,
  loadingEmployees: false,
  loadingFinanceTeam: false,
  loadingEmployeeExpenses: false,

  errorFlights: null,
  errorHotels: null,
  errorCancelledHotels: null,
  errorManagerRequests: null,
  errorEmployees: null,
  errorFinanceTeam: null,

  singleBooking: null,
  loadingSingleBooking: false,
  errorSingleBooking: null,
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
       * ✈️ FETCH SINGLE FLIGHT BOOKING BY ID
       * ============================================================
       */
      .addCase(getFlightBookingByIdAdmin.pending, (state) => {
        state.loadingSingleBooking = true;
        state.errorSingleBooking = null;
        state.singleBooking = null;
      })
      .addCase(getFlightBookingByIdAdmin.fulfilled, (state, action) => {
        state.loadingSingleBooking = false;
        state.singleBooking = action.payload;
      })
      .addCase(getFlightBookingByIdAdmin.rejected, (state, action) => {
        state.loadingSingleBooking = false;
        state.errorSingleBooking = action.payload;
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
       * 🏨 FETCH SINGLE HOTEL BOOKING BY ID
       * ============================================================
       */
      .addCase(getHotelBookingByIdAdmin.pending, (state) => {
        state.loadingSingleBooking = true;
        state.errorSingleBooking = null;
        state.singleBooking = null;
      })
      .addCase(getHotelBookingByIdAdmin.fulfilled, (state, action) => {
        state.loadingSingleBooking = false;
        state.singleBooking = action.payload;
      })
      .addCase(getHotelBookingByIdAdmin.rejected, (state, action) => {
        state.loadingSingleBooking = false;
        state.errorSingleBooking = action.payload;
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
       * 💰 EMPLOYEE EXPENSES
       * ============================================================
       */
      .addCase(getEmployeeExpensesAdmin.pending, (state) => {
        state.loadingEmployeeExpenses = true;
      })
      .addCase(getEmployeeExpensesAdmin.fulfilled, (state, action) => {
        state.loadingEmployeeExpenses = false;
        state.employeeExpenses = action.payload; // Map of userId -> amount
      })
      .addCase(getEmployeeExpensesAdmin.rejected, (state, action) => {
        state.loadingEmployeeExpenses = false;
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
      })
      /**
       * ============================================================
       * 🔐 DEMOTE EMPLOYEE ADMIN
       * ============================================================
       */
      .addCase(demoteEmployeeAdmin.fulfilled, (state, action) => {
        const { userId, role } = action.payload;
        const emp = state.allEmployees.find((u) => u._id === userId);
        if (emp) {
          emp.role = role;
        }
      })
      .addCase(demoteEmployeeAdmin.rejected, (state, action) => {
        state.errorEmployees = action.payload;
      })
      /**
       * ============================================================
       * 🔐 PROMOTE EMPLOYEE ADMIN
       * ============================================================
       */
      .addCase(promoteEmployeeAdmin.fulfilled, (state, action) => {
        const { userId, role } = action.payload;
        const emp = state.allEmployees.find((u) => u._id === userId);
        if (emp) {
          emp.role = role;
        }
      })
      .addCase(promoteEmployeeAdmin.rejected, (state, action) => {
        state.errorEmployees = action.payload;
      })
      /**
       * ============================================================
       * 🔐 PROMOTE USER TO FINANCE TEAM ADMIN
       * ============================================================
       */
      .addCase(promoteEmployeeToFinanceAdmin.fulfilled, (state, action) => {
        const { userId, role } = action.payload;
        const emp = state.allEmployees.find((u) => u._id === userId);
        if (emp) {
          emp.role = role;
        }
      })
      .addCase(promoteEmployeeToFinanceAdmin.rejected, (state, action) => {
        state.errorEmployees = action.payload;
      })
      /**
       * ============================================================
       * 💼 FINANCE TEAM
       * ============================================================
       */
      .addCase(getFinanceTeamAdmin.pending, (state) => {
        state.loadingFinanceTeam = true;
        state.errorFinanceTeam = null;
      })
      .addCase(getFinanceTeamAdmin.fulfilled, (state, action) => {
        state.loadingFinanceTeam = false;
        state.financeTeam = action.payload;
      })
      .addCase(getFinanceTeamAdmin.rejected, (state, action) => {
        state.loadingFinanceTeam = false;
        state.errorFinanceTeam = action.payload;
      });
  },
});

export default adminBookingSlice.reducer;
