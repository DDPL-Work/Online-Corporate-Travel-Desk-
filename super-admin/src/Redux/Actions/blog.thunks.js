// super-admin/src/Redux/Actions/blog.thunks.js

import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../API/axios";

// removed API_PREFIX since baseURL already includes /api/v1

// ============================================
// BLOG ASYNC THUNKS
// ============================================

// === Fetch all blogs ===
export const fetchBlogs = createAsyncThunk(
  "blogs/fetchBlogs",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get(`/blogs/all`);
      return response.data.blogs || response.data.data || response.data;
    } catch (err) {
      console.error("Fetch blogs error:", err);
      return rejectWithValue(
        err.response?.data?.message || err.message || "Failed to fetch blogs",
      );
    }
  },
);

// --- Fetch single blog by ID or slug ---
export const fetchBlogById = createAsyncThunk(
  "blogs/fetchBlogById",
  async (idOrSlug, { rejectWithValue }) => {
    try {
      const response = await api.get(`/blogs/one`, {
        params: { id: idOrSlug },
      });
      return response.data.blog || response.data.data || response.data;
    } catch (err) {
      console.error("Fetch blog by ID error:", err);
      return rejectWithValue(
        err.response?.data?.message || err.message || "Failed to fetch blog",
      );
    }
  },
);

// === Create blog ===
export const createBlog = createAsyncThunk(
  "blogs/createBlog",
  async ({ formData }, { rejectWithValue }) => {
    try {
      const isFormData = formData instanceof FormData;
      const headers = isFormData
        ? { "Content-Type": "multipart/form-data" }
        : {};

      const response = await api.post(`/blogs/create`, formData, {
        headers,
      });

      const createdBlog =
        response.data.blog || response.data.data || response.data;
      if (!createdBlog || !createdBlog._id) {
        throw new Error("Invalid response: No blog data returned");
      }

      return createdBlog;
    } catch (err) {
      console.error("Create blog error:", err);
      return rejectWithValue(
        err.response?.data?.message || err.message || "Failed to create blog",
      );
    }
  },
);

// === Update blog ===
export const updateBlog = createAsyncThunk(
  "blogs/updateBlog",
  async ({ id, formData }, { rejectWithValue }) => {
    try {
      const isFormData = formData instanceof FormData;
      const headers = isFormData
        ? { "Content-Type": "multipart/form-data" }
        : {};

      const response = await api.put(
        `/blogs/update/${id}`,
        formData,
        {
          headers,
        },
      );

      const updatedBlog =
        response.data.blog || response.data.data || response.data;
      if (!updatedBlog || !updatedBlog._id) {
        throw new Error("Invalid response: Missing updated blog data");
      }

      return updatedBlog;
    } catch (err) {
      console.error("Update blog error:", err);
      return rejectWithValue(
        err.response?.data?.message || err.message || "Failed to update blog",
      );
    }
  },
);

// === Delete blog ===
export const deleteBlog = createAsyncThunk(
  "blogs/deleteBlog",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/blogs/delete/${id}`);
      return id;
    } catch (err) {
      console.error("Delete blog error:", err);
      return rejectWithValue(
        err.response?.data?.message || err.message || "Failed to delete blog",
      );
    }
  },
);

// ============================================
// COMMENT ASYNC THUNKS
// ============================================

// === Fetch Comments for a Blog ===
export const fetchComments = createAsyncThunk(
  "blogs/fetchComments",
  async (blogId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/blogs/${blogId}/comments`);

      return response.data.data || response.data.comments || response.data;
    } catch (error) {
      console.error("Fetch comments error:", error);
      return rejectWithValue(error.message);
    }
  },
);

// === Moderate Comment (Admin: Approve/Reject) ===
export const moderateComment = createAsyncThunk(
  "blogs/moderateComment",
  async ({ blogId, commentId, action, moderator_id }, { rejectWithValue }) => {
    try {
      const response = await api.post(
        `/blogs/${blogId}/comments/${commentId}/moderate`,
        { action, moderator_id }
      );

      return response.data.data || response.data.comment || response.data;
    } catch (error) {
      console.error("Moderate comment error:", error);
      return rejectWithValue(error.message);
    }
  },
);

// === Delete Comment (Admin Only) ===
export const deleteComment = createAsyncThunk(
  "blogs/deleteComment",
  async ({ blogId, commentId }, { rejectWithValue }) => {
    try {
      await api.delete(`/blogs/${blogId}/comments/${commentId}`);
      return commentId;
    } catch (error) {
      console.error("Delete comment error:", error);
      return rejectWithValue(error.message);
    }
  },
);

// === Fetch All Comments (Admin Dashboard - All Blogs) ===
export const fetchAllComments = createAsyncThunk(
  "blogs/fetchAllComments",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get(`/comments/all`);

      return response.data.data || response.data.comments || response.data;
    } catch (error) {
      console.error("Fetch all comments error:", error);
      return rejectWithValue(error.message);
    }
  },
);
