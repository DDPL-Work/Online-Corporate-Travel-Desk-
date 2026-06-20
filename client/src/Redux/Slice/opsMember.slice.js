import { createSlice } from "@reduxjs/toolkit";
import {
  fetchOpsMembers,
  createOpsMember,
  updateOpsMember,
  deleteOpsMember,
  toggleOpsMemberStatus,
  fetchOpsDiagnostics,
} from "../Actions/opsMember.thunks";

const opsMemberSlice = createSlice({
  name: "opsMember",
  initialState: {
    members: [],
    diagnostics: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearOpsError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOpsMembers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOpsMembers.fulfilled, (state, action) => {
        state.loading = false;
        state.members = action.payload;
      })
      .addCase(fetchOpsMembers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createOpsMember.fulfilled, (state, action) => {
        state.members.unshift(action.payload);
      })
      .addCase(updateOpsMember.fulfilled, (state, action) => {
        const idx = state.members.findIndex((m) => m._id === action.payload._id);
        if (idx !== -1) state.members[idx] = action.payload;
      })
      .addCase(deleteOpsMember.fulfilled, (state, action) => {
        state.members = state.members.filter((m) => m._id !== action.payload);
      })
      .addCase(toggleOpsMemberStatus.fulfilled, (state, action) => {
        const idx = state.members.findIndex((m) => m._id === action.payload._id);
        if (idx !== -1) state.members[idx] = action.payload;
      })
      .addCase(fetchOpsDiagnostics.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchOpsDiagnostics.fulfilled, (state, action) => {
        state.loading = false;
        state.diagnostics = action.payload;
      })
      .addCase(fetchOpsDiagnostics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearOpsError } = opsMemberSlice.actions;
export default opsMemberSlice.reducer;
