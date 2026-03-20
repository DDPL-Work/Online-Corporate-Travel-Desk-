import React, { useState } from "react";
import { FiFilter, FiEdit3, FiCheckCircle, FiXCircle } from "react-icons/fi";
import { pendingAmendmentsData } from "../../data/dummyData";

const colors = {
  primary: "#0A4D68",
  secondary: "#088395",
  accent: "#05BFDB",
  light: "#F8FAFC",
  dark: "#1E293B",
  success: "#10B981",
  danger: "#EF4444",
  warning: "#F59E0B"
};

export default function PendingAmendments() {
  const [status, setStatus] = useState("All");
  const [corporate, setCorporate] = useState("All");
  const [type, setType] = useState("All");

  const corporates = ["All", ...new Set(pendingAmendmentsData.map((a) => a.company))];
  const types = ["All", "Flight", "Hotel"];
  const statuses = ["All", "Pending", "Approved", "Rejected"];

  const filtered = pendingAmendmentsData.filter((a) => {
    const corpMatch = corporate === "All" || a.company === corporate;
    const typeMatch = type === "All" || a.type === type;
    const statusMatch = status === "All" || a.status === status;
    return corpMatch && typeMatch && statusMatch;
  });

  const total = filtered.length;
  const pending = filtered.filter((x) => x.status === "Pending").length;
  const approved = filtered.filter((x) => x.status === "Approved").length;
  const rejected = filtered.filter((x) => x.status === "Rejected").length;

  function approve(id) {
    alert(`Amendment #${id} Approved`);
  }

  function reject(id) {
    alert(`Amendment #${id} Rejected`);
  }

  return (
    <div className="p-6" style={{ backgroundColor: colors.light }}>
      <div className="max-w-6xl mx-auto">

        {/* HEADER */}
        <h1 className="text-3xl font-bold mb-6" style={{ color: colors.dark }}>
          Pending Amendments
        </h1>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <SummaryCard title="Total Requests" value={total} color={colors.primary} />
          <SummaryCard title="Pending" value={pending} color={colors.warning} />
          <SummaryCard title="Approved" value={approved} color={colors.success} />
          <SummaryCard title="Rejected" value={rejected} color={colors.danger} />
        </div>

        {/* FILTERS */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <FiFilter size={20} className="text-[#0A4D68]" />
            <h2 className="text-lg font-semibold">Filters</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Corporate */}
            <div>
              <label className="text-sm font-medium">Corporate</label>
              <select
                className="border w-full p-2 rounded mt-1"
                value={corporate}
                onChange={(e) => setCorporate(e.target.value)}
              >
                {corporates.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Type */}
            <div>
              <label className="text-sm font-medium">Amendment Type</label>
              <select
                className="border w-full p-2 rounded mt-1"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                {types.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="text-sm font-medium">Status</label>
              <select
                className="border w-full p-2 rounded mt-1"
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
            <h2 className="text-xl font-semibold">Amendment Details</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead style={{ backgroundColor: colors.primary }}>
                <tr>
                  {["ID", "Company", "Employee", "Type", "Details", "Status", "Actions"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-6 py-3 text-sm text-white font-medium"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-8 text-gray-500">
                      No pending amendments found
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50 transition">

                      <td className="px-6 py-4 text-sm">#{row.id}</td>
                      <td className="px-6 py-4 text-sm">{row.company}</td>
                      <td className="px-6 py-4 text-sm">{row.employee}</td>

                      <td className="px-6 py-4 text-sm">
                        {row.type === "Flight" ? "✈️ Flight" : "🏨 Hotel"}
                      </td>

                      <td className="px-6 py-4 text-sm">{row.details}</td>

                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-3 py-1 text-xs rounded-full font-medium ${
                            row.status === "Pending"
                              ? "bg-yellow-100 text-yellow-700"
                              : row.status === "Approved"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>

                      <td className="px-6 py-4 flex items-center gap-3 text-gray-600">
                        <button
                          onClick={() => approve(row.id)}
                          className="text-green-600 hover:text-green-800"
                        >
                          <FiCheckCircle size={20} />
                        </button>

                        <button
                          onClick={() => reject(row.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <FiXCircle size={20} />
                        </button>
                      </td>

                    </tr>
                  ))
                )}
              </tbody>

            </table>
          </div>
        </div>

      </div>
    </div>
  );
}


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
      <FiEdit3 className="text-gray-400" size={24} />
    </div>
  );
}
