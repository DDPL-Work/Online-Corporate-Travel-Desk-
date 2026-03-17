import { createSlice } from "@reduxjs/toolkit";
import { getMyTravelAdmin } from "../Actions/travelAdmin.thunks";

const initialState = {
  approver: null,
  loading: false,
  error: null,
};

const travelAdminSlice = createSlice({
  name: "travelAdmin",
  initialState,
  reducers: {
    resetTravelAdminState: (state) => {
      state.approver = null;
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(getMyTravelAdmin.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder
      .addCase(getMyTravelAdmin.fulfilled, (state, action) => {
        const data = action.payload;

        state.approver = {
          id: data._id,
          email: data.email,
          role: data.role,
          fullName: `${data.name?.firstName || ""} ${
            data.name?.lastName || ""
          }`.trim(),
        };

        state.loading = false;
      })
      .addCase(getMyTravelAdmin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { resetTravelAdminState } = travelAdminSlice.actions;

export default travelAdminSlice.reducer;
