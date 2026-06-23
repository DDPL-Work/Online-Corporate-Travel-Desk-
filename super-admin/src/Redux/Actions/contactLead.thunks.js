import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../API/axios";

// Fetch all contact leads
export const getAllLeads = createAsyncThunk(
  "contact/getAllLeads",
  async ({ status, search, fromDate, toDate } = {}, { rejectWithValue }) => {
    try {
      const response = await api.get("/contact-leads", {
        params: { status, search, fromDate, toDate },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch contact leads"
      );
    }
  }
);

// Update lead status
export const updateLeadStatus = createAsyncThunk(
  "contact/updateLeadStatus",
  async ({ id, status, notes }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/contact-leads/${id}/status`, {
        status,
        notes,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update lead status"
      );
    }
  }
);
