// Redux/Actions/project.thunk.js

import { createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import api from "../../API/axios";

export const uploadProjectsExcel = createAsyncThunk(
  "projects/uploadExcel",
  async (file, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await api.post(
        "/corporate-projects/upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          withCredentials: true, // if using cookies
        }
      );

      return res.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || {
          message: "Upload failed",
        }
      );
    }
  }
);

export const fetchProjects = createAsyncThunk(
  "projects/fetchAll",
  async (corporateId, { rejectWithValue }) => {
    try {
      const res = await api.get(
        `/corporate-projects/my?corporateId=${corporateId}`,
        { withCredentials: true }
      );

      return res.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data || { message: "Fetch failed" }
      );
    }
  }
);

// 🗑️ DELETE PROJECT
export const deleteProject = createAsyncThunk(
  "projects/delete",
  async ({ id, corporateId }, { rejectWithValue }) => {
    try {
      const res = await api.delete(
        `/corporate-projects/${id}`,
        {
          data: { corporateId }, // 👈 required (as per your backend)
          withCredentials: true,
        }
      );

      return res.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data || { message: "Delete failed" }
      );
    }
  }
);