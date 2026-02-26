import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../API/axios"; 

export const getMyTravelAdmin = createAsyncThunk(
  "travelAdmin/getMyTravelAdmin",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/my-travel-admin/me");
      return res.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch approver",
      );
    }
  },
);
