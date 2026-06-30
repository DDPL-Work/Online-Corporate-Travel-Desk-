import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../API/axios";

// Get Branding & Landing Page Details (Admin/Protected)
export const getBrandingDetails = createAsyncThunk(
  "landingPage/getBrandingDetails",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/landing-page/branding");
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch branding details"
      );
    }
  }
);

// Update Branding & Landing Page Details (Admin/Protected)
export const updateBrandingDetails = createAsyncThunk(
  "landingPage/updateBrandingDetails",
  async (formData, { rejectWithValue }) => {
    try {
      const response = await api.put("/landing-page/branding", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update branding details"
      );
    }
  }
);

// Get Public Branding By Slug (Public)
export const getPublicBrandingBySlug = createAsyncThunk(
  "landingPage/getPublicBrandingBySlug",
  async (slug, { rejectWithValue }) => {
    try {
      const response = await api.get(`/landing-page/public-branding/slug/${slug}`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch public branding details"
      );
    }
  }
);

// Get Public Branding By ID (Public)
export const getPublicBrandingById = createAsyncThunk(
  "landingPage/getPublicBrandingById",
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/landing-page/public-branding/${id}`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch public branding details"
      );
    }
  }
);
