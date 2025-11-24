import React, { useState } from "react";
import { myPendingApprovals } from "../../data/dummyData";
import { FiFilter, FiClock, FiMapPin, FiCalendar } from "react-icons/fi";

const colors = {
  primary: "#0A4D68",
  secondary: "#088395",
  accent: "#05BFDB",
  light: "#F8FAFC",
  dark: "#1E293B",
  warning: "#F59E0B",
};

export default function MyPendingApprovals() {
  const [type, setType] = useState("All");

  const types = ["All", "Flight", "Hotel"];

  const filtered = myPendingApprovals.filter((req) => {
    return type === "All" || req.type === type;
  });

  return (
    <div className="p-6" style={{ backgroundColor: colors.light }}>
      <h1 className="text-2xl font-bold mb-6" style={{ color: colors.dark }}>
        My Pending Approvals
      </h1>

      {/* Filters */}
      <div className="bg-white rounded shadow p-4 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <FiFilter className="text-[#0A4D68]" />
          <h2 className="text-lg font-semibold text-gray-700">Filters</h2>
        </div>

        <select
          className="border p-2 rounded w-full md:w-64"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          {types.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="w-full text-left">
          <thead style={{ backgroundColor: colors.primary }}>
            <tr>
              {["Type", "Destination", "Dates", "Reason", "Status"].map((h) => (
                <th
                  key={h}
                  className="px-6 py-3 text-white text-sm font-medium"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan="5"
                  className="text-center py-8 text-gray-500 text-sm"
                >
                  No pending approvals found.
                </td>
              </tr>
            ) : (
              filtered.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50 transition">
                  {/* Type */}
                  <td className="px-6 py-4 text-sm font-medium">
                    {req.type === "Flight" ? "✈️ Flight" : "🏨 Hotel"}
                  </td>

                  {/* Destination */}
                  <td className="px-6 py-4 text-sm flex items-center gap-2">
                    <FiMapPin className="text-gray-500" />
                    {req.destination}
                  </td>

                  {/* Dates */}
                  <td className="px-6 py-4 text-sm flex items-center gap-2">
                    <FiCalendar className="text-gray-500" />
                    {req.startDate} → {req.endDate}
                  </td>

                  {/* Reason */}
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {req.reason}
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4 text-sm">
                    <span
                      className="px-3 py-1 text-xs rounded-full font-medium bg-yellow-100 text-yellow-700 flex items-center gap-1 w-fit"
                    >
                      <FiClock /> Pending
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
