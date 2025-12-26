import { createSlice } from "@reduxjs/toolkit";

const token = sessionStorage.getItem("token");
const user = sessionStorage.getItem("user");
const role = sessionStorage.getItem("role");

const initialState = {
  isAuthenticated: !!token,
  token: token || null,
  user: user ? JSON.parse(user) : null,
  role: role || null,
};

const ssoAuthSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    ssoLoginSuccess: (state, action) => {
      const { token, user } = action.payload;

      state.isAuthenticated = true;
      state.token = token;
      state.user = user;
      state.role = user.role;

      // ✅ ONLY primitives / JSON
      sessionStorage.setItem("token", token);
      sessionStorage.setItem("user", JSON.stringify(user));
      sessionStorage.setItem("role", user.role);
    },

    logout: (state) => {
      state.isAuthenticated = false;
      state.token = null;
      state.user = null;
      state.role = null;

      sessionStorage.clear();
    },
  },
});

export const { ssoLoginSuccess, logout } = ssoAuthSlice.actions;
export default ssoAuthSlice.reducer;
