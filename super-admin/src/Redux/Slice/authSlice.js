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

const getStoredRole = () => {
  const storedRole = sessionStorage.getItem("role");
  if (storedRole && storedRole !== "undefined" && storedRole !== "null") {
    return storedRole;
  }

  const storedUser = getStoredUser();
  return storedUser?.role || storedUser?.userRole || null;
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
      return data.data || data; // { token, role, user }
    } catch (err) {
      return rejectWithValue(err.response?.data?.message);
    }
  }
);

// ---------------- FORGOT PASSWORD — send OTP ----------------
export const forgotPassword = createAsyncThunk(
  "auth/forgotPassword",
  async ({ email }, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(`${API_URL}/auth/forgot-password`, { email });
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to send OTP");
    }
  }
);

// ---------------- VERIFY OTP ----------------
export const verifyOtp = createAsyncThunk(
  "auth/verifyOtp",
  async ({ email, otp }, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(`${API_URL}/auth/verify-otp`, { email, otp });
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Invalid or expired OTP");
    }
  }
);

// ---------------- RESET PASSWORD ----------------
export const resetPassword = createAsyncThunk(
  "auth/resetPassword",
  async ({ email, otp, newPassword }, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(`${API_URL}/auth/reset-password`, {
        email,
        otp,
        newPassword,
      });
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to reset password");
    }
  }
);

// ---------------- AUTH SLICE ----------------
const authSlice = createSlice({
  name: "auth",
  initialState: {
    loading: false,
    fpLoading: false,   // forgot-password flow loading
    fpError: null,      // forgot-password flow error
    token: sessionStorage.getItem("token"),
    role: getStoredRole(),
    user: getStoredUser(),
    isAuthenticated: !!sessionStorage.getItem("token"),
    error: null,
  },

  reducers: {
    // ✅ SSO SUCCESS HANDLER
    ssoLoginSuccess: (state, action) => {
      const { token, user } = action.payload;
      const resolvedRole = user?.role || user?.userRole || null;

      state.token = token;
      state.user = user;
      state.role = resolvedRole;
      state.isAuthenticated = true;

      sessionStorage.setItem("token", token);
      sessionStorage.setItem("user", JSON.stringify(user));
      if (resolvedRole) {
        sessionStorage.setItem("role", resolvedRole);
      } else {
        sessionStorage.removeItem("role");
      }
    },

    logoutUser: (state) => {
      state.token = null;
      state.role = null;
      state.user = null;
      state.isAuthenticated = false;
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("role");
      sessionStorage.removeItem("user");
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
        const resolvedRole = role || user?.role || user?.userRole || null;

        state.loading = false;
        state.token = token;
        state.role = resolvedRole;
        state.user = user;
        state.isAuthenticated = true;

        sessionStorage.setItem("token", token);
        sessionStorage.setItem("user", JSON.stringify(user));
        if (resolvedRole) {
          sessionStorage.setItem("role", resolvedRole);
        } else {
          sessionStorage.removeItem("role");
        }
      })

      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // forgot-password
      .addCase(forgotPassword.pending, (state) => { state.fpLoading = true; state.fpError = null; })
      .addCase(forgotPassword.fulfilled, (state) => { state.fpLoading = false; })
      .addCase(forgotPassword.rejected, (state, action) => { state.fpLoading = false; state.fpError = action.payload; })

      // verify-otp
      .addCase(verifyOtp.pending, (state) => { state.fpLoading = true; state.fpError = null; })
      .addCase(verifyOtp.fulfilled, (state) => { state.fpLoading = false; })
      .addCase(verifyOtp.rejected, (state, action) => { state.fpLoading = false; state.fpError = action.payload; })

      // reset-password
      .addCase(resetPassword.pending, (state) => { state.fpLoading = true; state.fpError = null; })
      .addCase(resetPassword.fulfilled, (state) => { state.fpLoading = false; })
      .addCase(resetPassword.rejected, (state, action) => { state.fpLoading = false; state.fpError = action.payload; });
  },
});

export const { ssoLoginSuccess, logoutUser } = authSlice.actions;
export default authSlice.reducer;
