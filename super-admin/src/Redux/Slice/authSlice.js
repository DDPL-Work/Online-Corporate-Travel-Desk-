import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_BASE_URL;

// ---------------- SAFE PARSER ----------------
const getStoredUser = () => {
  try {
    const raw = sessionStorage.getItem("user");
    if (!raw || raw === "undefined" || raw === "null") return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

// ---------------- LOGIN (PASSWORD) ----------------
export const loginUser = createAsyncThunk(
  "auth/loginUser",
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(`${API_URL}/auth/login`, {
        email,
        password,
      });
      return data; // { token, role, user }
    } catch (err) {
      return rejectWithValue(err.response?.data?.message);
    }
  }
);

// ---------------- AUTH SLICE ----------------
const authSlice = createSlice({
  name: "auth",
  initialState: {
    loading: false,
    token: sessionStorage.getItem("token"),
    role: sessionStorage.getItem("role"),
    user: getStoredUser(),
    isAuthenticated: !!sessionStorage.getItem("token"),
    error: null,
  },

  reducers: {
    // ✅ SSO SUCCESS HANDLER
    ssoLoginSuccess: (state, action) => {
      const { token, user } = action.payload;

      state.token = token;
      state.user = user;
      state.role = user.role;
      state.isAuthenticated = true;

      sessionStorage.setItem("token", token);
      sessionStorage.setItem("user", JSON.stringify(user));
      sessionStorage.setItem("role", user.role);
    },

    logoutUser: (state) => {
      state.token = null;
      state.role = null;
      state.user = null;
      state.isAuthenticated = false;
      sessionStorage.clear();
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      .addCase(loginUser.fulfilled, (state, action) => {
        const { token, role, user } = action.payload;

        state.loading = false;
        state.token = token;
        state.role = role;
        state.user = user;
        state.isAuthenticated = true;

        sessionStorage.setItem("token", token);
        sessionStorage.setItem("role", role);
        sessionStorage.setItem("user", JSON.stringify(user));
      })

      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { ssoLoginSuccess, logoutUser } = authSlice.actions;
export default authSlice.reducer;
