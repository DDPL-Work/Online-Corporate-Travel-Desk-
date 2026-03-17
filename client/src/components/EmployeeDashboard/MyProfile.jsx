import React, { useState } from "react";
import { employeeProfile } from "../../data/dummyData";
import { FiEdit2, FiUser, FiMail, FiPhone, FiBriefcase } from "react-icons/fi";

const colors = {
  primary: "#0A4D68",
  secondary: "#088395",
  light: "#F8FAFC",
  dark: "#1E293B",
};

export default function MyProfile() {
  const [profile, setProfile] = useState(employeeProfile);
  const [editing, setEditing] = useState(false);

  function updateField(key, value) {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }

  function saveProfile() {
    setEditing(false);
    alert("Profile updated!");
  }

  return (
    <div className="p-6" style={{ backgroundColor: colors.light }}>
      <h1 className="text-2xl font-bold mb-6" style={{ color: colors.dark }}>
        My Profile
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Left Sidebar */}
        <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center text-center">

          <img
            src={profile.image}
            alt="Profile"
            className="w-28 h-28 rounded-full object-cover mb-4 border-4"
            style={{ borderColor: colors.primary }}
          />

          <h2 className="text-xl font-semibold" style={{ color: colors.dark }}>
            {profile.name}
          </h2>

          <p className="text-sm text-gray-600">{profile.designation}</p>

          {/* Upload (dummy) */}
          <button
            onClick={() => alert("Upload coming soon!")}
            className="mt-4 px-4 py-2 rounded text-white"
            style={{ backgroundColor: colors.primary }}
          >
            Upload New Photo
          </button>

        </div>

        {/* Right Section */}
        <div className="md:col-span-2 bg-white rounded-lg shadow p-6">

          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Personal Information</h2>

            <button
              className="flex items-center gap-2 px-3 py-2 rounded text-white"
              style={{ backgroundColor: colors.primary }}
              onClick={() => setEditing(!editing)}
            >
              <FiEdit2 /> {editing ? "Cancel" : "Edit"}
            </button>
          </div>

          {/* Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Name */}
            <div>
              <label className="font-medium flex items-center gap-2">
                <FiUser /> Full Name
              </label>
              <input
                disabled={!editing}
                value={profile.name}
                onChange={(e) => updateField("name", e.target.value)}
                className={`p-2 w-full border rounded mt-1 ${
                  !editing && "bg-gray-100"
                }`}
              />
            </div>

            {/* Email */}
            <div>
              <label className="font-medium flex items-center gap-2">
                <FiMail /> Email Address
              </label>
              <input
                disabled
                value={profile.email}
                className="p-2 w-full border rounded mt-1 bg-gray-100"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="font-medium flex items-center gap-2">
                <FiPhone /> Phone Number
              </label>
              <input
                disabled={!editing}
                value={profile.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                className={`p-2 w-full border rounded mt-1 ${
                  !editing && "bg-gray-100"
                }`}
              />
            </div>

            {/* Location */}
            <div>
              <label className="font-medium flex items-center gap-2">
                📍 Location
              </label>
              <input
                disabled={!editing}
                value={profile.location}
                onChange={(e) => updateField("location", e.target.value)}
                className={`p-2 w-full border rounded mt-1 ${
                  !editing && "bg-gray-100"
                }`}
              />
            </div>
          </div>

          {/* Save Button */}
          {editing && (
            <button
              onClick={saveProfile}
              className="mt-5 px-4 py-2 rounded text-white"
              style={{ backgroundColor: colors.secondary }}
            >
              Save Changes
            </button>
          )}

          {/* Corporate Info */}
          <div className="mt-8 pt-6 border-t">
            <h2 className="text-xl font-semibold mb-4">Corporate Information</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div>
                <label className="font-medium flex items-center gap-2">
                  <FiBriefcase /> Employee ID
                </label>
                <input
                  disabled
                  value={profile.employeeId}
                  className="p-2 w-full border rounded mt-1 bg-gray-100"
                />
              </div>

              <div>
                <label className="font-medium flex items-center gap-2">
                  🏢 Department
                </label>
                <input
                  disabled
                  value={profile.department}
                  className="p-2 w-full border rounded mt-1 bg-gray-100"
                />
              </div>

            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
