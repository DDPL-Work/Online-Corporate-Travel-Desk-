// client\src\Redux\Slice\employeeActionSlice.js

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../API/axios";

// ===============================
// THUNKS
// ===============================

// 🔹 Get own profile
export const fetchMyProfile = createAsyncThunk(
  "employee/fetchMyProfile",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/employees/profile");
      return res.data.employee;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to load profile",
      );
    }
  },
);

// 🔹 Update own profile
export const updateMyProfile = createAsyncThunk(
  "employee/updateMyProfile",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await api.patch("/employees/profile", payload);
      return res.data.employee;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Profile update failed",
      );
    }
  },
);

// 🔹 Admin: Get all employees
export const fetchEmployees = createAsyncThunk(
  "employee/fetchEmployees",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/travel-admin");
      return res.data.employees;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch employees",
      );
    }
  },
);

// 🔹 Admin: Get single employee
export const fetchEmployeeById = createAsyncThunk(
  "employee/fetchEmployeeById",
  async (id, { rejectWithValue }) => {
    try {
      const res = await api.get(`/travel-admin/${id}`);
      return res.data.employee;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch employee",
      );
    }
  },
);

// 🔹 Admin: Update employee
export const updateEmployee = createAsyncThunk(
  "employee/updateEmployee",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await api.put(`/travel-admin/${id}`, data);
      return res.data.employee;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Employee update failed",
      );
    }
  },
);

// 🔹 Admin: Toggle active/inactive
export const toggleEmployeeStatus = createAsyncThunk(
  "employee/toggleStatus",
  async (id, { rejectWithValue }) => {
    try {
      const res = await api.patch(`/travel-admin/${id}/toggle-status`);
      return { id, status: res.data.status };
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to toggle status",
      );
    }
  },
);

// 🔹 Admin: Delete employee
export const deleteEmployee = createAsyncThunk(
  "employee/deleteEmployee",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/travel-admin/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to delete employee",
      );
    }
  },
);

// 🔹 Admin: Promote employee → manager
export const promoteEmployee = createAsyncThunk(
  "employee/promoteEmployee",
  async (userId, { rejectWithValue }) => {
    try {
      const res = await api.put(`/travel-admin/promote/${userId}`);
      return {
        userId,
        role: res.data.data.role, // manager
      };
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to promote employee",
      );
    }
  },
);

// 🔹 Admin: Demote manager → employee
export const demoteEmployee = createAsyncThunk(
  "employee/demoteEmployee",
  async (userId, { rejectWithValue }) => {
    try {
      await api.put(`/travel-admin/demote/${userId}`);
      return {
        userId,
        role: "employee",
      };
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to demote manager",
      );
    }
  },
);

// ===============================
// SLICE
// ===============================
const employeeActionSlice = createSlice({
  name: "employee",
  initialState: {
    myProfile: null,
    employees: [],
    selectedEmployee: null,
    loading: false,
    error: null,
    updating: false,
  },

  reducers: {
    clearEmployeeError: (state) => {
      state.error = null;
    },
    clearSelectedEmployee: (state) => {
      state.selectedEmployee = null;
    },
  },

  extraReducers: (builder) => {
    builder

      // -------------------------
      // MY PROFILE
      // -------------------------
      .addCase(fetchMyProfile.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchMyProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.myProfile = action.payload;
      })
      .addCase(fetchMyProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // -------------------------
      // MY PROFILE UPDATING
      // -------------------------

      .addCase(updateMyProfile.pending, (state) => {
        state.updating = true;
      })
      .addCase(updateMyProfile.fulfilled, (state, action) => {
        state.updating = false;
        state.myProfile = action.payload;
      })
      .addCase(updateMyProfile.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload;
      })

      // -------------------------
      // ADMIN
      // -------------------------
      .addCase(fetchEmployees.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchEmployees.fulfilled, (state, action) => {
        state.loading = false;
        state.employees = action.payload;
      })
      .addCase(fetchEmployees.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(fetchEmployeeById.fulfilled, (state, action) => {
        state.selectedEmployee = action.payload;
      })

      .addCase(updateEmployee.fulfilled, (state, action) => {
        state.employees = state.employees.map((emp) =>
          emp._id === action.payload._id ? action.payload : emp,
        );
      })

      .addCase(toggleEmployeeStatus.fulfilled, (state, action) => {
        const emp = state.employees.find((e) => e._id === action.payload.id);
        if (emp) emp.status = action.payload.status;
      })

      .addCase(deleteEmployee.fulfilled, (state, action) => {
        state.employees = state.employees.filter(
          (emp) => emp._id !== action.payload,
        );
      })

      // -------------------------
      // PROMOTE EMPLOYEE
      // -------------------------
      .addCase(promoteEmployee.fulfilled, (state, action) => {
        state.employees = state.employees.map((emp) =>
          emp._id === action.payload.userId
            ? { ...emp, role: action.payload.role }
            : emp,
        );
      })

      // -------------------------
      // DEMOTE MANAGER
      // -------------------------
      .addCase(demoteEmployee.fulfilled, (state, action) => {
        state.employees = state.employees.map((emp) =>
          emp._id === action.payload.userId
            ? { ...emp, role: action.payload.role }
            : emp,
        );
      });
  },
});

export const { clearEmployeeError, clearSelectedEmployee } =
  employeeActionSlice.actions;

export default employeeActionSlice.reducer;
