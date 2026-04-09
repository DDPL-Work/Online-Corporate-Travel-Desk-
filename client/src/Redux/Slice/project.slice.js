// Redux/Slice/project.slice.js

import { createSlice } from "@reduxjs/toolkit";
import { uploadProjectsExcel, fetchProjects, deleteProject } from "../Actions/project.thunk";

const initialState = {
  // =========================
  // 📤 UPLOAD STATE
  // =========================
  uploadLoading: false,
  uploadSuccess: false,
  uploadError: null,

  insertedCount: 0,
  skippedCount: 0,
  skipped: [],

  // =========================
  // 📥 FETCH STATE
  // =========================
  projects: [],
  total: 0,

  fetchLoading: false,
  fetchError: null,

  deleteLoading: false,
  deleteError: null,
};

const projectSlice = createSlice({
  name: "corporateProject",
  initialState,

  reducers: {
    resetUploadState: (state) => {
      state.uploadLoading = false;
      state.uploadSuccess = false;
      state.uploadError = null;

      state.insertedCount = 0;
      state.skippedCount = 0;
      state.skipped = [];
    },

    clearProjects: (state) => {
      state.projects = [];
      state.total = 0;
    },
  },

  extraReducers: (builder) => {
    builder

      // =========================
      // 📤 UPLOAD PROJECTS
      // =========================
      .addCase(uploadProjectsExcel.pending, (state) => {
        state.uploadLoading = true;
        state.uploadSuccess = false;
        state.uploadError = null;
      })

      .addCase(uploadProjectsExcel.fulfilled, (state, action) => {
        state.uploadLoading = false;
        state.uploadSuccess = true;

        state.insertedCount = action.payload.insertedCount || 0;
        state.skippedCount = action.payload.skippedCount || 0;
        state.skipped = action.payload.skipped || [];
      })

      .addCase(uploadProjectsExcel.rejected, (state, action) => {
        state.uploadLoading = false;
        state.uploadSuccess = false;

        state.uploadError = action.payload?.message || "Upload failed";
      })

      // =========================
      // 📥 FETCH PROJECTS
      // =========================
      .addCase(fetchProjects.pending, (state) => {
        state.fetchLoading = true;
        state.fetchError = null;
      })

      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.fetchLoading = false;

        state.projects = action.payload.data || [];
        state.total = action.payload.count || 0;
      })

      .addCase(fetchProjects.rejected, (state, action) => {
        state.fetchLoading = false;

        state.fetchError =
          action.payload?.message || "Failed to fetch projects";
      })

      .addCase(deleteProject.pending, (state) => {
        state.deleteLoading = true;
        state.deleteError = null;
      })

      .addCase(deleteProject.fulfilled, (state, action) => {
        state.deleteLoading = false;

        const deletedId = action.payload.deletedId;

        // ✅ Remove from state instantly (no refetch needed)
        state.projects = state.projects.filter((p) => p._id !== deletedId);

        state.total = state.total > 0 ? state.total - 1 : 0;
      })

      .addCase(deleteProject.rejected, (state, action) => {
        state.deleteLoading = false;

        state.deleteError = action.payload?.message || "Delete failed";
      });
  },
});

export const { resetUploadState, clearProjects } = projectSlice.actions;

export default projectSlice.reducer;
