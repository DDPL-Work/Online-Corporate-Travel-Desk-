import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_BASE_URL;

// --------------------------------------------------
// HELPER: AUTH HEADER
// --------------------------------------------------
const authHeader = () => {
  const token = sessionStorage.getItem("token");
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

// --------------------------------------------------
// GET ALL CORPORATES (SUPER ADMIN)
// GET /api/v1/corporate
// --------------------------------------------------
export const fetchCorporates = createAsyncThunk(
  "corporate/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const res = await axios.get(`${API_URL}/corporate`, authHeader());
      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch corporates"
      );
    }
  }
);

// --------------------------------------------------
// GET SINGLE CORPORATE
// GET /api/v1/corporate/:id
// --------------------------------------------------
export const fetchCorporateById = createAsyncThunk(
  "corporate/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      const res = await axios.get(`${API_URL}/corporate/${id}`, authHeader());
      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch corporate"
      );
    }
  }
);

// --------------------------------------------------
// APPROVE CORPORATE (SUPER ADMIN)
// PUT /api/v1/corporate/:id/approve
// --------------------------------------------------
export const approveCorporate = createAsyncThunk(
  "corporate/approve",
  async (id, { rejectWithValue }) => {
    try {
      const res = await axios.put(
        `${API_URL}/corporate/${id}/approve`,
        {},
        authHeader()
      );
      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to approve corporate"
      );
    }
  }
);

// --------------------------------------------------
// UPDATE CORPORATE
// PUT /api/v1/corporate/:id
// --------------------------------------------------
export const updateCorporate = createAsyncThunk(
  "corporate/update",
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const res = await axios.put(
        `${API_URL}/corporate/${id}`,
        payload,
        authHeader()
      );
      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to update corporate"
      );
    }
  }
);

// --------------------------------------------------
// TOGGLE CORPORATE STATUS
// PATCH /api/v1/corporate/:id/toggle-status
// --------------------------------------------------
export const toggleCorporateStatus = createAsyncThunk(
  "corporate/toggleStatus",
  async (id, { rejectWithValue }) => {
    try {
      const res = await axios.patch(
        `${API_URL}/corporate/${id}/toggle-status`,
        {},
        authHeader()
      );
      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to toggle status"
      );
    }
  }
);

// --------------------------------------------------
// INITIAL STATE
// --------------------------------------------------
const initialState = {
  corporates: [],
  selectedCorporate: null,
  loading: false,
  error: null,
};

// --------------------------------------------------
// SLICE
// --------------------------------------------------
const corporateListSlice = createSlice({
  name: "corporateList",
  initialState,
  reducers: {
    clearSelectedCorporate: (state) => {
      state.selectedCorporate = null;
    },
  },

  extraReducers: (builder) => {
    builder

      // ----------------------
      // FETCH ALL
      // ----------------------
      .addCase(fetchCorporates.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCorporates.fulfilled, (state, action) => {
        state.loading = false;
        state.corporates = action.payload;
      })
      .addCase(fetchCorporates.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // ----------------------
      // FETCH ONE
      // ----------------------
      .addCase(fetchCorporateById.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCorporateById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedCorporate = action.payload;
      })
      .addCase(fetchCorporateById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // ----------------------
      // APPROVE
      // ----------------------
      .addCase(approveCorporate.fulfilled, (state, action) => {
        state.corporates = state.corporates.map((c) =>
          c._id === action.payload._id ? action.payload : c
        );
      })

      // ----------------------
      // UPDATE
      // ----------------------
      .addCase(updateCorporate.fulfilled, (state, action) => {
        state.corporates = state.corporates.map((c) =>
          c._id === action.payload._id ? action.payload : c
        );

        if (
          state.selectedCorporate &&
          state.selectedCorporate._id === action.payload._id
        ) {
          state.selectedCorporate = action.payload;
        }
      })

      // ----------------------
      // TOGGLE STATUS
      // ----------------------
      .addCase(toggleCorporateStatus.fulfilled, (state, action) => {
        state.corporates = state.corporates.map((c) =>
          c._id === action.payload._id ? action.payload : c
        );
      });
  },
});

export const { clearSelectedCorporate } = corporateListSlice.actions;

export default corporateListSlice.reducer;
