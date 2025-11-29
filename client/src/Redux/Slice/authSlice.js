import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

// ----------------------------
// SAFE USER PARSER
// ----------------------------
const getStoredUser = () => {
  try {
    const raw = sessionStorage.getItem("user");

    if (!raw || raw === "undefined" || raw === "null") {
      return null;
    }

    return JSON.parse(raw);
  } catch (err) {
    console.warn("Invalid JSON in sessionStorage.user");
    return null;
  }
};

// ----------------------------------
// LOGIN (FOR ANY USER ROLE)
// ----------------------------------
export const loginUser = createAsyncThunk(
  "auth/loginUser",
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password,
      });

      // Expecting backend to return: { token, role, user }
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Login failed. Try again."
      );
    }
  }
);

// ----------------------------------
// LOGOUT
// ----------------------------------
export const logoutUser = createAsyncThunk("auth/logoutUser", async () => {
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("role");
  sessionStorage.removeItem("user");
  return true;
});


// ----------------------------------
// INITIAL STATE (LOAD FROM SESSION)
// ----------------------------------
const authSlice = createSlice({
  name: "auth",
  initialState: {
    loading: false,
    token: sessionStorage.getItem("token") || null,
    role: sessionStorage.getItem("role") || null,
    user: getStoredUser(),
    error: null,
    isAuthenticated: !!sessionStorage.getItem("token"),
  },

  reducers: {},

  extraReducers: (builder) => {
    builder

      // -------------------------
      // LOGIN
      // -------------------------
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;

        const { token, role, user } = action.payload;

        state.token = token;
        state.role = role;
        state.user = user;
        state.isAuthenticated = true;

        // SAVE FOR ALL USER TYPES
        sessionStorage.setItem("token", token);
        sessionStorage.setItem("role", role);
        sessionStorage.setItem("user", JSON.stringify(user));
      })

      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
      })

      // -------------------------
      // LOGOUT
      // -------------------------
      .addCase(logoutUser.fulfilled, (state) => {
        state.token = null;
        state.role = null;
        state.user = null;
        state.error = null;
        state.isAuthenticated = false;
      });
  },
});

export default authSlice.reducer;
