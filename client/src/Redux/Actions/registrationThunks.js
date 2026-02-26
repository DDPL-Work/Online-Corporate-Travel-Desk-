import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_BASE_URL;

// --------------------------------------------------
// ASYNC THUNK: ONBOARD CORPORATE (PUBLIC)
// --------------------------------------------------
export const onboardCorporate = createAsyncThunk(
  "corporate/onboard",
  async (formData, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${API_URL}/corporate/onboard`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      // ✅ Return ONLY the corporate object
      return response.data.data;
    } catch (error) {
      const errData = error.response?.data;

      return rejectWithValue(
        errData?.errors || errData?.message || "Corporate onboarding failed"
      );
    }
  }
);