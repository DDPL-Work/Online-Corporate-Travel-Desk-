import React, { useState } from "react";
import { FiFilter, FiDownload } from "react-icons/fi";
import { FaRupeeSign, FaChartLine, FaBuilding } from "react-icons/fa";
import { corporateRevenueData } from "../../data/dummyData";

const colors = {
  primary: "#0A4D68",
  secondary: "#088395",
  accent: "#05BFDB",
  light: "#F8FAFC",
  dark: "#1E293B",
};

export default function CorporateRevenue() {
  const [startDate, setStartDate] = useState("2024-01-01");
  const [endDate, setEndDate] = useState("2024-12-31");
  const [corporate, setCorporate] = useState("All");

  const corporates = ["All", ...new Set(corporateRevenueData.map((c) => c.company))];

  // FILTERED
  const filtered = corporateRevenueData.filter((c) => {
    const d = new Date(c.date);
    const start = new Date(startDate);
    const end = new Date(endDate);

    const dateMatch = d >= start && d <= end;
    const corpMatch = corporate === "All" || c.company === corporate;

    return dateMatch && corpMatch;
  });

  // CALCULATIONS
  const totalRevenue = filtered.reduce((sum, c) => sum + c.amount, 0);
  const flightRevenue = filtered
    .filter((c) => c.type === "Flight")
    .reduce((s, c) => s + c.amount, 0);
  const hotelRevenue = filtered
    .filter((c) => c.type === "Hotel")
    .reduce((s, c) => s + c.amount, 0);

  return (
    <div className="p-6" style={{ backgroundColor: colors.light }}>
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <h1 className="text-3xl font-bold mb-6" style={{ color: colors.dark }}>
          Corporate Revenue Summary
        </h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

          <SummaryCard
            title="Total Revenue"
            amount={totalRevenue}
            color={colors.primary}
            icon={<FaChartLine size={26} />}
          />

          <SummaryCard
            title="Flight Revenue"
            amount={flightRevenue}
            color={colors.secondary}
            icon={<FaRupeeSign size={26} />}
          />

          <SummaryCard
            title="Hotel Revenue"
            amount={hotelRevenue}
            color={colors.accent}
            icon={<FaBuilding size={26} />}
          />

        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">

          <div className="flex items-center gap-2 mb-4">
            <FiFilter className="text-[#0A4D68]" size={22} />
            <h2 className="text-lg font-semibold">Filters</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

            {/* Start Date */}
            <div>
              <label className="text-sm font-medium">Start Date</label>
              <input
                type="date"
                className="border w-full p-2 rounded mt-1"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            {/* End Date */}
            <div>
              <label className="text-sm font-medium">End Date</label>
              <input
                type="date"
                className="border w-full p-2 rounded mt-1"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            {/* Corporate */}
            <div>
              <label className="text-sm font-medium">Corporate</label>
              <select
                className="border w-full p-2 rounded mt-1"
                value={corporate}
                onChange={(e) => setCorporate(e.target.value)}
              >
                {corporates.map((c, i) => (
                  <option key={i}>{c}</option>
                ))}
              </select>
            </div>

          </div>
        </div>

        {/* Revenue Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-6 border-b flex justify-between items-center">
            <h2 className="text-xl font-semibold">Corporate Revenue Details</h2>

            <button
              className="px-4 py-2 rounded text-white flex items-center gap-2 shadow"
              style={{ backgroundColor: colors.primary }}
            >
              <FiDownload /> Export
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead style={{ backgroundColor: colors.primary }}>
                <tr>
                  {["Date", "Company", "Type", "Employee", "Amount"].map((h) => (
                    <th key={h} className="px-6 py-3 text-sm text-white font-medium">{h}</th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-8 text-gray-500">
                      No revenue records found
                    </td>
                  </tr>
                ) : (
                  filtered.map((rev) => (
                    <tr key={rev.id} className="hover:bg-gray-50 transition">

                      <td className="px-6 py-4 text-sm">{rev.date}</td>
                      <td className="px-6 py-4 text-sm">{rev.company}</td>

                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-3 py-1 text-xs rounded-full font-medium ${
                            rev.type === "Flight"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {rev.type}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-sm">{rev.employee}</td>

                      <td className="px-6 py-4 text-sm font-bold text-green-700">
                        ₹{rev.amount.toLocaleString()}
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
function SummaryCard({ title, amount, color, icon }) {
  return (
    <div className="bg-white shadow rounded-lg p-6 flex items-center justify-between border-l-4"
      style={{ borderColor: color }}
    >
      <div>
        <p className="text-gray-600 text-sm">{title}</p>
        <h3 className="text-3xl font-bold mt-1" style={{ color }}>
          ₹{amount.toLocaleString()}
        </h3>
      </div>

      <div className="p-3 rounded-full bg-[#F8FAFC]">{icon}</div>
    </div>
  );
}
