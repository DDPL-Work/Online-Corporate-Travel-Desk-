import React, { useEffect, useState } from "react";
import { FiX, FiSave } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import { updateEmployee } from "../Redux/Slice/employeeActionSlice";

export default function EditUserModal({ user, onClose }) {
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.employeeAction);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    department: "",
    designation: "",
    employeeCode: "",
    mobile: "",
    status: "active",
  });

  // -------------------------
  // PREFILL DATA
  // -------------------------
  useEffect(() => {
    if (!user) return;

    setForm({
      firstName: user.name?.firstName || "",
      lastName: user.name?.lastName || "",
      email: user.email || "",
      department: user.department || "",
      designation: user.designation || "",
      employeeCode: user.employeeCode || "",
      mobile: user.mobile || "",
      status: user.status || "active",
    });
  }, [user]);

  // -------------------------
  // CHANGE HANDLER
  // -------------------------
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // -------------------------
  // SUBMIT
  // -------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();

    await dispatch(
      updateEmployee({
        id: user._id,
        data: {
          name: {
            firstName: form.firstName,
            lastName: form.lastName,
          },
          department: form.department,
          designation: form.designation,
          employeeCode: form.employeeCode,
          mobile: form.mobile,
          status: form.status,
        },
      })
    );

    onClose();
  };

  // -------------------------
  // UI
  // -------------------------
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
      <div className="bg-white w-full max-w-xl rounded-xl shadow-xl">
        {/* HEADER */}
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-[#0A4D68]">
            Edit Employee
          </h2>
          <button onClick={onClose}>
            <FiX size={20} />
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* NAME */}
          <div className="grid grid-cols-2 gap-4">
            <input
              name="firstName"
              placeholder="First Name"
              value={form.firstName}
              onChange={handleChange}
              className="border p-2 rounded w-full"
              required
            />
            <input
              name="lastName"
              placeholder="Last Name"
              value={form.lastName}
              onChange={handleChange}
              className="border p-2 rounded w-full"
              required
            />
          </div>

          {/* EMAIL (READ ONLY) */}
          <input
            value={form.email}
            disabled
            className="border p-2 rounded w-full bg-gray-100 cursor-not-allowed"
          />

          {/* DEPARTMENT */}
          <input
            name="department"
            placeholder="Department"
            value={form.department}
            onChange={handleChange}
            className="border p-2 rounded w-full"
          />

          {/* DESIGNATION */}
          <input
            name="designation"
            placeholder="Designation"
            value={form.designation}
            onChange={handleChange}
            className="border p-2 rounded w-full"
          />

          {/* EMPLOYEE CODE */}
          <input
            name="employeeCode"
            placeholder="Employee Code"
            value={form.employeeCode}
            onChange={handleChange}
            className="border p-2 rounded w-full"
          />

          {/* MOBILE */}
          <input
            name="mobile"
            placeholder="Mobile Number"
            value={form.mobile}
            onChange={handleChange}
            className="border p-2 rounded w-full"
          />

          {/* STATUS */}
          <select
            name="status"
            value={form.status}
            onChange={handleChange}
            className="border p-2 rounded w-full"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          {/* ACTIONS */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded border"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 rounded bg-[#0A4D68] text-white font-medium disabled:opacity-60"
            >
              <FiSave />
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
