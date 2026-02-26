import { createSlice } from "@reduxjs/toolkit";
import {
  fetchCorporateUsers,
  toggleUserStatus,
  changeTravelAdmin,
  updateTravelPolicy,
  fetchCorporateDashboard,
} from "../Actions/corporateSuperAdmin.thunks";

const initialState = {
  users: [],
  dashboard: null,
  travelPolicy: null,

  loading: false,
  error: null,
};

const corporateSuperAdminSlice = createSlice({
  name: "corporateSuperAdmin",
  initialState,
  reducers: {
    clearCorporateError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder

      /* ================= USERS ================= */
      .addCase(fetchCorporateUsers.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCorporateUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload;
      })
      .addCase(fetchCorporateUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      /* ================= TOGGLE ================= */
      .addCase(toggleUserStatus.fulfilled, (state, action) => {
        const updatedUser = action.payload;
        const index = state.users.findIndex((u) => u._id === updatedUser._id);
        if (index !== -1) {
          state.users[index] = updatedUser;
        }
      })
      .addCase(toggleUserStatus.rejected, (state, action) => {
        state.error = action.payload;
      })

      /* ================= TRAVEL ADMIN ================= */
      .addCase(changeTravelAdmin.fulfilled, (state, action) => {
        const updatedUser = action.payload;

        // Update user list
        const index = state.users.findIndex((u) => u._id === updatedUser._id);

        if (index !== -1) {
          state.users[index] = updatedUser;
        } else {
          state.users.unshift(updatedUser);
        }
      })
      .addCase(changeTravelAdmin.rejected, (state, action) => {
        state.error = action.payload;
      })

      /* ================= TRAVEL POLICY ================= */
      .addCase(updateTravelPolicy.fulfilled, (state, action) => {
        state.travelPolicy = action.payload;
      })
      .addCase(updateTravelPolicy.rejected, (state, action) => {
        state.error = action.payload;
      })

      /* ================= DASHBOARD ================= */
      .addCase(fetchCorporateDashboard.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCorporateDashboard.fulfilled, (state, action) => {
        state.loading = false;
        state.dashboard = action.payload;
      })
      .addCase(fetchCorporateDashboard.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearCorporateError } = corporateSuperAdminSlice.actions;

export default corporateSuperAdminSlice.reducer;
