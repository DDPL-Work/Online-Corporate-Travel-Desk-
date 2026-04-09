import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../API/axios";
import { jwtDecode } from "jwt-decode";

const getRoleFromToken = () => {
  const token =
    sessionStorage.getItem("token") || localStorage.getItem("token");

  if (!token) return null;

  try {
    const decoded = jwtDecode(token);
    return decoded.role || null;
  } catch {
    return null;
  }
};

// ===================================================
// THUNK: FETCH LOGGED-IN CORPORATE ADMIN PROFILE
// ===================================================
export const fetchCorporateAdmin = createAsyncThunk(
  "corporateAdmin/fetchCorporateAdmin",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/corporate-admin/me");
      console.log("API RESPONSE:", res.data); // 👈 ADD THIS
      return res.data.data;
    } catch (err) {
      console.error("API ERROR:", err.response);
      return rejectWithValue(
        err.response?.data?.message || "Failed to load corporate admin profile",
      );
    }
  },
);

// ===================================================
// THUNK: UPDATE CORPORATE PROFILE
// ===================================================
export const updateCorporateAdmin = createAsyncThunk(
  "corporateAdmin/updateCorporateAdmin",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await api.patch("/corporate-admin/me", payload);

      // backend returns:
      // { success, data, message }
      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to update corporate profile",
      );
    }
  },
);

// ===================================================
// SLICE
// ===================================================
const corporateAdminSlice = createSlice({
  name: "corporateAdmin",
  initialState: {
    corporate: null,
    updating: false,
    loading: false,
    updateError: null,
    error: null,
  },

  reducers: {
    clearCorporateAdminError: (state) => {
      state.error = null;
    },

    resetCorporateAdmin: (state) => {
      state.corporate = null;
      state.loading = false;
      state.error = null;
    },
  },

  extraReducers: (builder) => {
    builder
      // ---------------------------
      // FETCH CORPORATE ADMIN
      // ---------------------------
      .addCase(fetchCorporateAdmin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      .addCase(fetchCorporateAdmin.fulfilled, (state, action) => {
        state.loading = false;
        state.corporate = action.payload;
      })

      .addCase(fetchCorporateAdmin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // ---------------------------
      // UPDATE CORPORATE ADMIN
      // ---------------------------
      .addCase(updateCorporateAdmin.pending, (state) => {
        state.updating = true;
        state.updateError = null;
      })

      .addCase(updateCorporateAdmin.fulfilled, (state, action) => {
        state.updating = false;

        // ✅ Important: merge updated data
        state.corporate = action.payload;
      })

      .addCase(updateCorporateAdmin.rejected, (state, action) => {
        state.updating = false;
        state.updateError = action.payload;
      });
  },
});

export const { clearCorporateAdminError, resetCorporateAdmin } =
  corporateAdminSlice.actions;

export default corporateAdminSlice.reducer;
