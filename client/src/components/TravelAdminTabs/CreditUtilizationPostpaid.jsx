import React, { useState } from "react";
import { FiFilter } from "react-icons/fi";
import { FaRupeeSign } from "react-icons/fa";
import { creditUtilizationData } from "../../data/dummyData";

const colors = {
  primary: "#0A4D68",
  secondary: "#088395",
  accent: "#05BFDB",
  light: "#F8FAFC",
  dark: "#1E293B",
};

export default function CreditUtilizationPostpaid() {
  const [startDate, setStartDate] = useState("2024-01-01");
  const [endDate, setEndDate] = useState("2024-12-31");
  const [department, setDepartment] = useState("All");

  const departments = ["All", ...new Set(creditUtilizationData.map((x) => x.department))];

  const totalLimit = 200000; // Example corporate limit

  // FILTER LOGIC
  const filtered = creditUtilizationData.filter((t) => {
    const d = new Date(t.date);
    const start = new Date(startDate);
    const end = new Date(endDate);

    const dateMatch = d >= start && d <= end;
    const deptMatch = department === "All" || t.department === department;

    return dateMatch && deptMatch;
  });

  const usedCredit = filtered.reduce((sum, t) => sum + t.amount, 0);
  const availableCredit = totalLimit - usedCredit;

  return (
    <div className="p-6" style={{ backgroundColor: colors.light }}>
      <div className="max-w-6xl mx-auto">

        {/* HEADER */}
        <h1 className="text-3xl font-bold mb-6" style={{ color: colors.dark }}>
          Credit Utilization (Postpaid)
        </h1>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">

          <div
            className="bg-white shadow rounded-lg p-6"
            style={{ borderLeft: `6px solid ${colors.primary}` }}
          >
            <p className="text-gray-600">Total Credit Limit</p>
            <h2 className="text-3xl font-bold flex items-center gap-1 mt-2" style={{ color: colors.primary }}>
              <FaRupeeSign /> {totalLimit.toLocaleString()}
            </h2>
          </div>

          <div
            className="bg-white shadow rounded-lg p-6"
            style={{ borderLeft: `6px solid #F59E0B` }}
          >
            <p className="text-gray-600">Used Credit</p>
            <h2 className="text-3xl font-bold flex items-center gap-1 mt-2 text-[#F59E0B]">
              <FaRupeeSign /> {usedCredit.toLocaleString()}
            </h2>
          </div>

          <div
            className="bg-white shadow rounded-lg p-6"
            style={{ borderLeft: `6px solid #10B981` }}
          >
            <p className="text-gray-600">Available Credit</p>
            <h2 className="text-3xl font-bold flex items-center gap-1 mt-2 text-[#10B981]">
              <FaRupeeSign /> {availableCredit.toLocaleString()}
            </h2>
          </div>

        </div>

        {/* FILTERS */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">

          <div className="flex items-center gap-2 mb-4">
            <FiFilter className="text-[#0A4D68]" size={22} />
            <h2 className="text-lg font-semibold">Filters</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

            <div>
              <label className="text-sm font-medium">Start Date</label>
              <input
                type="date"
                className="border w-full p-2 rounded mt-1"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium">End Date</label>
              <input
                type="date"
                className="border w-full p-2 rounded mt-1"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Department</label>
              <select
                className="border w-full p-2 rounded mt-1"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              >
                {departments.map((d, i) => (
                  <option key={i}>{d}</option>
                ))}
              </select>
            </div>

          </div>
        </div>

        {/* TRANSACTION TABLE */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Credit Usage History</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead style={{ backgroundColor: colors.primary }}>
                <tr>
                  {["Date", "Employee", "Department", "Purpose", "Amount"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-6 py-3 text-sm text-white font-semibold"
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
                    <td
                      colSpan="5"
                      className="text-center py-8 text-gray-500"
                    >
                      No usage found for the selected filters
                    </td>
                  </tr>
                ) : (
                  filtered.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm">{t.date}</td>
                      <td className="px-6 py-4 text-sm">{t.employee}</td>
                      <td className="px-6 py-4 text-sm">{t.department}</td>
                      <td className="px-6 py-4 text-sm">{t.purpose}</td>

                      <td className="px-6 py-4 text-sm font-semibold text-red-600">
                        - ₹{t.amount.toLocaleString()}
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
