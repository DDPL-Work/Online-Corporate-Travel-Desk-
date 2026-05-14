import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../API/axios";

// === Fetch all published blogs for landing page ===
export const fetchPublishedBlogs = createAsyncThunk(
  "blogs/fetchPublishedBlogs",
  async (_, { rejectWithValue }) => {
    try {
      // We specifically request only published blogs for the public landing page
      const response = await api.get("/blogs/all", {
        params: { status: "published" }
      });
      return response.data.data || [];
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || err.message || "Failed to fetch blogs"
      );
    }
  }
);

// === Fetch single blog by slug (for details page) ===
export const fetchBlogBySlug = createAsyncThunk(
  "blogs/fetchBlogBySlug",
  async (slug, { rejectWithValue }) => {
    try {
      const response = await api.get("/blogs/one", {
        params: { slug }
      });
      return response.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || err.message || "Failed to fetch blog details"
      );
    }
  }
);
