import React, { useState } from "react";
import { FiFilter, FiEdit2, FiPlusCircle, FiToggleLeft, FiToggleRight } from "react-icons/fi";
import { corporateAccessControlData } from "../../data/dummyData";
import AddAccessModal from "../../Modal/AddAccessModal";
import EditAccessModal from "../../Modal/EditAccessModal";

const colors = {
  primary: "#0A4D68",
  secondary: "#088395",
  accent: "#05BFDB",
  light: "#F8FAFC",
  dark: "#1E293B",
  danger: "#EF4444",
  success: "#10B981"
};

export default function CorporateAccessControl() {
  const [records, setRecords] = useState(corporateAccessControlData);

  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const [corporate, setCorporate] = useState("All");
  const [role, setRole] = useState("All");
  const [status, setStatus] = useState("All");

  // DROPDOWN VALUES
  const corporates = ["All", ...new Set(records.map((x) => x.company))];
  const roles = ["All", ...new Set(records.map((x) => x.role))];
  const statuses = ["All", "Active", "Inactive"];

  // FILTER
  const filtered = records.filter((r) => {
    const corpMatch = corporate === "All" || r.company === corporate;
    const roleMatch = role === "All" || r.role === role;
    const statusMatch = status === "All" || r.status === status;
    return corpMatch && roleMatch && statusMatch;
  });

  const totalUsers = records.length;
  const activeUsers = records.filter((r) => r.status === "Active").length;
  const inactiveUsers = totalUsers - activeUsers;

  // Add new access
  function addAccess(data) {
    setRecords((prev) => [...prev, { id: Date.now(), ...data }]);
    setOpenAdd(false);
  }

  // Update access
  function updateAccess(updated) {
    setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    setOpenEdit(false);
  }

  // Toggle status
  function toggleAccess(id) {
    setRecords((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: r.status === "Active" ? "Inactive" : "Active" } : r
      )
    );
  }

  return (
    <div className="p-6" style={{ backgroundColor: colors.light }}>
      <div className="max-w-6xl mx-auto">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold" style={{ color: colors.dark }}>
            Corporate Access Control
          </h1>

          <button
            onClick={() => setOpenAdd(true)}
            className="flex items-center gap-2 px-5 py-2 text-white rounded shadow"
            style={{ backgroundColor: colors.primary }}
          >
            <FiPlusCircle /> Add Access
          </button>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

          <SummaryCard
            title="Total Users"
            value={totalUsers}
            color={colors.primary}
          />

          <SummaryCard
            title="Active Access"
            value={activeUsers}
            color={colors.success}
          />

          <SummaryCard
            title="Inactive Access"
            value={inactiveUsers}
            color={colors.danger}
          />

        </div>

        {/* FILTERS */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <FiFilter className="text-[#0A4D68]" size={22} />
            <h2 className="text-lg font-semibold">Filters</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Corporate Filter */}
            <div>
              <label className="text-sm font-medium">Corporate</label>
              <select
                className="border p-2 rounded w-full mt-1"
                value={corporate}
                onChange={(e) => setCorporate(e.target.value)}
              >
                {corporates.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Role Filter */}
            <div>
              <label className="text-sm font-medium">Role</label>
              <select
                className="border p-2 rounded w-full mt-1"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                {roles.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="text-sm font-medium">Access Status</label>
              <select
                className="border p-2 rounded w-full mt-1"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {statuses.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>

          </div>
        </div>

        {/* TABLE */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Access Control List</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead style={{ backgroundColor: colors.primary }}>
                <tr>
                  {["Company", "User", "Role", "Status", "Actions"].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-3 text-sm text-white font-medium"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">

                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-8 text-gray-500">
                      No access records found
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50 transition">

                      <td className="px-6 py-4 text-sm font-semibold">{r.company}</td>
                      <td className="px-6 py-4 text-sm">{r.user}</td>
                      <td className="px-6 py-4 text-sm">{r.role}</td>

                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-3 py-1 text-xs rounded-full font-medium ${
                            r.status === "Active"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>

                      <td className="px-6 py-4 flex items-center gap-4 text-gray-600">

                        {/* Edit */}
                        <button
                          className="text-blue-600 hover:text-blue-800"
                          onClick={() => {
                            setSelectedRow(r);
                            setOpenEdit(true);
                          }}
                        >
                          <FiEdit2 size={18} />
                        </button>

                        {/* Toggle */}
                        <button
                          onClick={() => toggleAccess(r.id)}
                          className="text-gray-700 hover:text-gray-900"
                        >
                          {r.status === "Active" ? (
                            <FiToggleRight size={26} className="text-green-600" />
                          ) : (
                            <FiToggleLeft size={26} className="text-red-600" />
                          )}
                        </button>

                      </td>

                    </tr>
                  ))
                )}

              </tbody>

            </table>
          </div>
        </div>

        {/* MODALS */}
        {openAdd && <AddAccessModal onClose={() => setOpenAdd(false)} onSave={addAccess} />}
        {openEdit && selectedRow && (
          <EditAccessModal
            data={selectedRow}
            onClose={() => setOpenEdit(false)}
            onSave={updateAccess}
          />
        )}

      </div>
    </div>
  );
}


// Summary Card Component
function SummaryCard({ title, value, color }) {
  return (
    <div
      className="bg-white shadow rounded-lg p-6 flex items-center justify-between border-l-4"
      style={{ borderColor: color }}
    >
      <div>
        <p className="text-gray-600 text-sm">{title}</p>
        <h3 className="text-3xl font-bold mt-1" style={{ color }}>
          {value}
        </h3>
      </div>
    </div>
  );
}
