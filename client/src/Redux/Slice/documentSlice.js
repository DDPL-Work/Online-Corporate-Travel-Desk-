// client\src\Redux\Slice\documentSlice.js


// redux/slices/documentSlice.js

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../API/axios";

// ===============================
// THUNKS
// ===============================

// 🔹 Get My Documents
export const fetchMyDocuments = createAsyncThunk(
  "documents/fetchMyDocuments",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/employees/documents");
      return res.data.documents;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch documents",
      );
    }
  },
);

// 🔹 Upload Document
export const uploadDocument = createAsyncThunk(
  "documents/uploadDocument",
  async (data, { rejectWithValue }) => {
    try {
      const formData = new FormData();

      formData.append("type", data.type);
      formData.append("name", data.name);
      formData.append("number", data.number);
      formData.append("expiry", data.expiry);
      formData.append("travelDocument", data.file);

      const res = await api.post("/employees/documents", formData);

      return res.data; // ✅ return full response (IMPORTANT)
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || // ✅ FIXED
          err.response?.data?.message ||
          "Upload failed",
      );
    }
  },
);

// 🔹 Delete Document
export const deleteDocument = createAsyncThunk(
  "documents/deleteDocument",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/employees/documents/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Delete failed",
      );
    }
  },
);

// ===============================
// SLICE
// ===============================

const documentSlice = createSlice({
  name: "documents",
  initialState: {
    documents: [],
    loading: false,
    error: null,
    uploading: false,
  },

  reducers: {
    clearDocumentError: (state) => {
      state.error = null;
    },
  },

  extraReducers: (builder) => {
    builder

      // -------------------------
      // FETCH
      // -------------------------
      .addCase(fetchMyDocuments.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchMyDocuments.fulfilled, (state, action) => {
        state.loading = false;
        state.documents = action.payload;
      })
      .addCase(fetchMyDocuments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // -------------------------
      // UPLOAD
      // -------------------------
      .addCase(uploadDocument.pending, (state) => {
        state.uploading = true;
      })
      .addCase(uploadDocument.fulfilled, (state, action) => {
        state.uploading = false;
        state.documents.push(action.payload.document); // ✅ correct
      })
      .addCase(uploadDocument.rejected, (state, action) => {
        state.uploading = false;
        state.error = action.payload;
      })

      // -------------------------
      // DELETE
      // -------------------------
      .addCase(deleteDocument.fulfilled, (state, action) => {
        state.documents = state.documents.filter(
          (doc) => doc._id !== action.payload,
        );
      });
  },
});

export const { clearDocumentError } = documentSlice.actions;

export default documentSlice.reducer;
