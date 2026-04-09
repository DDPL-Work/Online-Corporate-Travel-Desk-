import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchUserProfile, updateUserProfile } from "../../Redux/Slice/profileSlice";

import {
  FaUser,
  FaEnvelope,
  FaPhone,
  FaBriefcase,
  FaIdBadge,
} from "react-icons/fa";

export default function ProfileSettings() {
  const dispatch = useDispatch();

  const { user, loading, updating } = useSelector((state) => state.profile);
  const tokenRole = useSelector((state) => state.auth.role);

  const [form, setForm] = useState({
    name: "",
    email: "",
    mobile: "",
    department: "",
    designation: "",
    role: "",
  });

  // ------------------------------
  // Fetch Profile When Page Loads
  // ------------------------------
  useEffect(() => {
    dispatch(fetchUserProfile());
  }, []);

  // ------------------------------
  // Fill Form When Profile Arrives
  // ------------------------------
  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || "",
        email: user.email || "",
        mobile: user.mobile || "",
        department: user.department || "",
        designation: user.designation || "",
        role: user.role || "",
      });
    }
  }, [user]);

  // ------------------------------
  // Handle Input Change
  // ------------------------------
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // ------------------------------
  // Save Profile
  // ------------------------------
  const handleSave = () => {
    dispatch(updateUserProfile(form));
  };

  if (loading || !user) {
    return <p className="text-center text-gray-500">Loading profile...</p>;
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Title */}
      <h1 className="text-2xl font-bold text-[#0A4D68] mb-6">
        Profile Settings
      </h1>

      {/* Card */}
      <div className="bg-white rounded-xl shadow-lg border p-6 space-y-6">

        {/* User Info */}
        <div className="flex items-center gap-4">
          <div className="bg-gray-200 p-4 rounded-full">
            <FaUser className="text-4xl text-gray-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold capitalize">{form.name}</h2>
            <p className="text-gray-500 capitalize">{form.role}</p>
          </div>
        </div>

        {/* Form Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-6">

          {/* Name */}
          <div className="flex flex-col">
            <label className="font-medium mb-1 flex items-center gap-2">
              <FaUser /> Full Name
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              className="p-3 border rounded-md bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Email - Non Editable */}
          <div className="flex flex-col">
            <label className="font-medium mb-1 flex items-center gap-2">
              <FaEnvelope /> Email Address (Not Editable)
            </label>
            <input
              type="email"
              value={form.email}
              disabled
              className="p-3 border rounded-md bg-gray-200 text-gray-500 cursor-not-allowed"
            />
          </div>

          {/* Mobile */}
          <div className="flex flex-col">
            <label className="font-medium mb-1 flex items-center gap-2">
              <FaPhone /> Contact Number
            </label>
            <input
              type="text"
              name="mobile"
              value={form.mobile}
              onChange={handleChange}
              className="p-3 border rounded-md bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Department (Only for employees) */}
          {tokenRole === "employee" && (
            <div className="flex flex-col">
              <label className="font-medium mb-1 flex items-center gap-2">
                <FaBriefcase /> Department
              </label>
              <input
                type="text"
                name="department"
                value={form.department}
                onChange={handleChange}
                className="p-3 border rounded-md bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          )}

          {/* Designation (Only for employees) */}
          {tokenRole === "employee" && (
            <div className="flex flex-col">
              <label className="font-medium mb-1 flex items-center gap-2">
                <FaIdBadge /> Designation
              </label>
              <input
                type="text"
                name="designation"
                value={form.designation}
                onChange={handleChange}
                className="p-3 border rounded-md bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="flex justify-end mt-4">
          <button
            onClick={handleSave}
            disabled={updating}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-60"
          >
            {updating ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
