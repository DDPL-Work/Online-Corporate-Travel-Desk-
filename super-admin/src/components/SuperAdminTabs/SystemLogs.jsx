import React, { useState } from "react";
import {
  FiFilter,
  FiDownload,
  FiTrash2,
  FiAlertTriangle,
  FiInfo,
  FiCheckCircle,
  FiClock,
} from "react-icons/fi";
import { systemLogsData } from "../../data/dummyData";

const colors = {
  primary: "#0A4D68",
  secondary: "#088395",
  accent: "#05BFDB",
  light: "#F8FAFC",
  dark: "#1E293B",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
};

export default function SystemLogs() {
  const [logs, setLogs] = useState(systemLogsData);
  const [type, setType] = useState("All");
  const [user, setUser] = useState("All");
  const [start, setStart] = useState("2024-01-01");
  const [end, setEnd] = useState("2024-12-31");

  const types = ["All", "Info", "Warning", "Error", "Success"];
  const users = ["All", ...new Set(logs.map((l) => l.user))];

  // FILTER LOGS
  const filtered = logs.filter((log) => {
    const logDate = new Date(log.date);
    const startDate = new Date(start);
    const endDate = new Date(end);

    const dateMatch = logDate >= startDate && logDate <= endDate;
    const userMatch = user === "All" || log.user === user;
    const typeMatch = type === "All" || log.type === type;

    return dateMatch && userMatch && typeMatch;
  });

  // SUMMARY COUNTS
  const todays = filtered.filter((l) => l.isToday).length;
  const errors = filtered.filter((l) => l.type === "Error").length;
  const warnings = filtered.filter((l) => l.type === "Warning").length;
  const infos = filtered.filter((l) => l.type === "Info").length;

  function clearLogs() {
    if (window.confirm("Are you sure you want to clear ALL logs?")) {
      setLogs([]);
    }
  }

  function exportLogs() {
    alert("Downloading logs CSV...");
  }

  return (
    <div className="p-6" style={{ backgroundColor: colors.light }}>
      <div className="max-w-6xl mx-auto">

        {/* HEADER */}
        <h1 className="text-3xl font-bold mb-6" style={{ color: colors.dark }}>
          System Logs
        </h1>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">

          <SummaryCard
            title="Today's Logs"
            value={todays}
            color={colors.primary}
            icon={<FiClock size={26} />}
          />

          <SummaryCard
            title="Error Logs"
            value={errors}
            color={colors.danger}
            icon={<FiAlertTriangle size={26} />}
          />

          <SummaryCard
            title="Warnings"
            value={warnings}
            color={colors.warning}
            icon={<FiAlertTriangle size={26} />}
          />

          <SummaryCard
            title="Info Logs"
            value={infos}
            color={colors.secondary}
            icon={<FiInfo size={26} />}
          />

        </div>

        {/* FILTERS */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">

          <div className="flex items-center gap-2 mb-4">
            <FiFilter size={20} className="text-[#0A4D68]" />
            <h2 className="text-lg font-semibold">Filters</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

            {/* User */}
            <div>
              <label className="text-sm font-medium">User</label>
              <select
                className="border w-full p-2 rounded mt-1"
                value={user}
                onChange={(e) => setUser(e.target.value)}
              >
                {users.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
            </div>

            {/* Type */}
            <div>
              <label className="text-sm font-medium">Log Type</label>
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

            {/* Date Range */}
            <div>
              <label className="text-sm font-medium">Start Date</label>
              <input
                type="date"
                className="border w-full p-2 rounded mt-1"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium">End Date</label>
              <input
                type="date"
                className="border w-full p-2 rounded mt-1"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>

          </div>

        </div>

        {/* TABLE */}
        <div className="bg-white shadow rounded-lg overflow-hidden">

          <div className="p-6 border-b flex justify-between items-center">
            <h2 className="text-xl font-semibold">Log Records</h2>

            <div className="flex gap-3">
              <button
                onClick={exportLogs}
                className="px-4 py-2 rounded text-white flex items-center gap-2"
                style={{ backgroundColor: colors.primary }}
              >
                <FiDownload /> Export
              </button>

              <button
                onClick={clearLogs}
                className="px-4 py-2 rounded flex items-center gap-2 text-white"
                style={{ backgroundColor: colors.danger }}
              >
                <FiTrash2 /> Clear
              </button>
            </div>

          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead style={{ backgroundColor: colors.primary }}>
                <tr>
                  {["Date", "User", "Type", "Message"].map((h) => (
                    <th key={h} className="px-6 py-3 text-sm text-white font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">

                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center py-8 text-gray-500">
                      No logs found
                    </td>
                  </tr>
                ) : (
                  filtered.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition">

                      <td className="px-6 py-4 text-sm">{log.date}</td>
                      <td className="px-6 py-4 text-sm">{log.user}</td>

                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-3 py-1 text-xs rounded-full font-medium 
                          ${
                            log.type === "Error"
                              ? "bg-red-100 text-red-700"
                              : log.type === "Warning"
                              ? "bg-yellow-100 text-yellow-700"
                              : log.type === "Success"
                              ? "bg-green-100 text-green-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {log.type}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-sm">{log.message}</td>

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

// Summary card component
function SummaryCard({ title, value, color, icon }) {
  return (
    <div
      className="bg-white shadow rounded-lg p-5 flex items-center justify-between border-l-4"
      style={{ borderColor: color }}
    >
      <div>
        <p className="text-gray-600 text-sm">{title}</p>
        <h3 className="text-3xl font-bold mt-1" style={{ color }}>
          {value}
        </h3>
      </div>
      <div className="p-3 rounded-full bg-[#F8FAFC]">{icon}</div>
    </div>
  );
}
