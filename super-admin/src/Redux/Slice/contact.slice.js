import { createSlice } from "@reduxjs/toolkit";
import { getAllLeads, updateLeadStatus } from "../Actions/contactLead.thunks";

const initialState = {
  leads: [],
  pagination: {
    total: 0,
    page: 1,
    limit: 20,
    pages: 0,
  },
  stats: {
    total: 0,
    reviewed: 0,
    new: 0,
    today: 0,
  },
  isLoading: false,
  isUpdating: false,
  error: null,
};

const contactSlice = createSlice({
  name: "contact",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    // getAllLeads
    builder
      .addCase(getAllLeads.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getAllLeads.fulfilled, (state, action) => {
        state.isLoading = false;
        state.leads = action.payload.data || [];
        state.stats = action.payload.stats || {};
        state.pagination = { total: action.payload.total || action.payload.data?.length || 0 };
      })
      .addCase(getAllLeads.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });

    // updateLeadStatus
    builder
      .addCase(updateLeadStatus.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(updateLeadStatus.fulfilled, (state, action) => {
        state.isUpdating = false;
        const updatedLead = action.payload.data;
        const index = state.leads.findIndex((l) => l._id === updatedLead._id);
        if (index !== -1) {
          state.leads[index] = updatedLead;
        }
      })
      .addCase(updateLeadStatus.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload;
      });
  },
});

export default contactSlice.reducer;
