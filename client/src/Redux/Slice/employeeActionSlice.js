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
      return rejectWithValue(err.response?.data?.message || "Failed to load profile");
    }
  }
);

// 🔹 Update own profile
export const updateMyProfile = createAsyncThunk(
  "employee/updateMyProfile",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await api.patch("/employees/profile", payload);
      return res.data.employee;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Profile update failed");
    }
  }
);

// 🔹 Admin: Get all employees
export const fetchEmployees = createAsyncThunk(
  "employee/fetchEmployees",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/employees");
      return res.data.employees;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch employees");
    }
  }
);

// 🔹 Admin: Get single employee
export const fetchEmployeeById = createAsyncThunk(
  "employee/fetchEmployeeById",
  async (id, { rejectWithValue }) => {
    try {
      const res = await api.get(`/employees/${id}`);
      return res.data.employee;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch employee");
    }
  }
);

// 🔹 Admin: Update employee
export const updateEmployee = createAsyncThunk(
  "employee/updateEmployee",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await api.put(`/employees/${id}`, data);
      return res.data.employee;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Employee update failed");
    }
  }
);

// 🔹 Admin: Toggle active/inactive
export const toggleEmployeeStatus = createAsyncThunk(
  "employee/toggleStatus",
  async (id, { rejectWithValue }) => {
    try {
      const res = await api.patch(`/employees/${id}/toggle-status`);
      return { id, status: res.data.status };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to toggle status");
    }
  }
);

// 🔹 Admin: Delete employee
export const deleteEmployee = createAsyncThunk(
  "employee/deleteEmployee",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/employees/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to delete employee");
    }
  }
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

      .addCase(updateMyProfile.fulfilled, (state, action) => {
        state.myProfile = action.payload;
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
          emp._id === action.payload._id ? action.payload : emp
        );
      })

      .addCase(toggleEmployeeStatus.fulfilled, (state, action) => {
        const emp = state.employees.find((e) => e._id === action.payload.id);
        if (emp) emp.status = action.payload.status;
      })

      .addCase(deleteEmployee.fulfilled, (state, action) => {
        state.employees = state.employees.filter(
          (emp) => emp._id !== action.payload
        );
      });
  },
});

export const {
  clearEmployeeError,
  clearSelectedEmployee,
} = employeeActionSlice.actions;

export default employeeActionSlice.reducer;
