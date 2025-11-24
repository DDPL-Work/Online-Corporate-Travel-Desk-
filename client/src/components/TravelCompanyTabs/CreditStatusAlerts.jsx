import React, { useState } from "react";
import { FiFilter, FiAlertTriangle, FiBell, FiMail } from "react-icons/fi";
import { creditAlertsData } from "../../data/dummyData";

const colors = {
  primary: "#0A4D68",
  secondary: "#088395",
  accent: "#05BFDB",
  light: "#F8FAFC",
  dark: "#1E293B",
  danger: "#EF4444",
  warning: "#F59E0B"
};

export default function CreditStatusAlerts() {
  const [corporate, setCorporate] = useState("All");
  const [priority, setPriority] = useState("All");

  const corporates = ["All", ...new Set(creditAlertsData.map((c) => c.company))];
  const priorities = ["All", "High", "Medium", "Low"];

  // Filter alerts
  const filtered = creditAlertsData.filter((c) => {
    const corpMatch = corporate === "All" || c.company === corporate;
    const priorityMatch = priority === "All" || c.priority === priority;
    return corpMatch && priorityMatch;
  });

  // Summary values
  const totalAlerts = filtered.length;
  const highAlerts = filtered.filter((a) => a.priority === "High").length;
  const mediumAlerts = filtered.filter((a) => a.priority === "Medium").length;
  const lowAlerts = filtered.filter((a) => a.priority === "Low").length;

  return (
    <div className="p-6" style={{ backgroundColor: colors.light }}>
      <div className="max-w-6xl mx-auto">

        {/* HEADER */}
        <h1 className="text-3xl font-bold mb-6" style={{ color: colors.dark }}>
          Credit Status Alerts
        </h1>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <SummaryCard
            title="Total Alerts"
            count={totalAlerts}
            color={colors.primary}
            icon={<FiBell size={26} />}
          />
          <SummaryCard
            title="High Priority"
            count={highAlerts}
            color={colors.danger}
            icon={<FiAlertTriangle size={26} />}
          />
          <SummaryCard
            title="Medium Priority"
            count={mediumAlerts}
            color={colors.warning}
            icon={<FiAlertTriangle size={26} />}
          />
          <SummaryCard
            title="Low Priority"
            count={lowAlerts}
            color={colors.secondary}
            icon={<FiAlertTriangle size={26} />}
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
                className="border w-full p-2 rounded mt-1"
                value={corporate}
                onChange={(e) => setCorporate(e.target.value)}
              >
                {corporates.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Priority Filter */}
            <div>
              <label className="text-sm font-medium">Priority</label>
              <select
                className="border w-full p-2 rounded mt-1"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                {priorities.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>

          </div>
        </div>

        {/* ALERT TABLE */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Alert Details</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead style={{ backgroundColor: colors.primary }}>
                <tr>
                  {["Date", "Company", "Priority", "Message", "Action"].map((h) => (
                    <th key={h} className="px-6 py-3 text-sm text-white font-medium">{h}</th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-8 text-gray-500">
                      No alerts available
                    </td>
                  </tr>
                ) : (
                  filtered.map((alert) => (
                    <tr key={alert.id} className="hover:bg-gray-50 transition">

                      <td className="px-6 py-4 text-sm">{alert.date}</td>
                      <td className="px-6 py-4 text-sm font-medium">{alert.company}</td>

                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-3 py-1 text-xs rounded-full font-medium
                            ${
                              alert.priority === "High"
                                ? "bg-red-100 text-red-700"
                                : alert.priority === "Medium"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-green-100 text-green-700"
                            }
                          `}
                        >
                          {alert.priority}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-sm">{alert.message}</td>

                      <td className="px-6 py-4 text-sm">
                        <button className="flex items-center gap-1 px-3 py-1 rounded bg-gray-100 hover:bg-gray-200">
                          <FiMail /> Notify
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


// Summary Card Component
function SummaryCard({ title, count, color, icon }) {
  return (
    <div className="bg-white shadow rounded-lg p-6 flex items-center justify-between border-l-4"
      style={{ borderColor: color }}>
      
      <div>
        <p className="text-gray-600 text-sm">{title}</p>
        <h3 className="text-3xl font-bold mt-1" style={{ color }}>
          {count}
        </h3>
      </div>

      <div className="p-3 rounded-full bg-[#F8FAFC]">
        {icon}
      </div>
    </div>
  );
}
