import React, { useState } from "react";
import {
  FiFilter,
  FiDownload,
  FiCalendar,
  FiTrendingUp,
  FiDollarSign,
  FiBriefcase,
  FiSearch,
} from "react-icons/fi";
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
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("2024-01-01");
  const [endDate, setEndDate] = useState("2024-12-31");
  const [corporate, setCorporate] = useState("All");

  const corporates = [
    "All",
    ...new Set(corporateRevenueData.map((c) => c.company)),
  ];

  // Filtered data
  const filtered = corporateRevenueData.filter((c) => {
    const d = new Date(c.date);
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dateMatch = d >= start && d <= end;
    const corpMatch = corporate === "All" || c.company === corporate;
    return dateMatch && corpMatch;
  });

  // Calculations
  const totalRevenue = filtered.reduce((sum, c) => sum + c.amount, 0);
  const flightRevenue = filtered
    .filter((c) => c.type === "Flight")
    .reduce((s, c) => s + c.amount, 0);
  const hotelRevenue = filtered
    .filter((c) => c.type === "Hotel")
    .reduce((s, c) => s + c.amount, 0);

  return (
    <div
      className="min-h-screen p-6 font-sans"
      style={{ backgroundColor: colors.light }}
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* PAGE HEADER */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-linear-to-br from-[#0A4D68] to-[#088395] flex items-center justify-center shadow-lg text-white">
            <FiTrendingUp size={24} />
          </div>
          <div className="text-left">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">
              Corporate Revenue Summary
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-widest">
              Multi‑corporate financial overview
            </p>
          </div>
        </div>

        {/* STATS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            label="Total Revenue"
            value={`₹${totalRevenue.toLocaleString()}`}
            Icon={FaChartLine}
            borderCls="border-[#0A4D68]"
            iconBgCls="bg-[#0A4D68]/10"
            iconColorCls="text-[#0A4D68]"
          />
          <StatCard
            label="Flight Revenue"
            value={`₹${flightRevenue.toLocaleString()}`}
            Icon={FaRupeeSign}
            borderCls="border-[#088395]"
            iconBgCls="bg-[#088395]/10"
            iconColorCls="text-[#088395]"
          />
          <StatCard
            label="Hotel Revenue"
            value={`₹${hotelRevenue.toLocaleString()}`}
            Icon={FaBuilding}
            borderCls="border-[#05BFDB]"
            iconBgCls="bg-[#05BFDB]/10"
            iconColorCls="text-[#05BFDB]"
          />
        </div>

        {/* FILTERS SECTION */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <LabeledInput label="Search">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Corporate / ID / Name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm outline-none bg-slate-50"
                />
              </div>
            </LabeledInput>
            <LabeledInput label="Start Date">
              <div className="relative">
                <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm outline-none bg-slate-50"
                />
              </div>
            </LabeledInput>

            <LabeledInput label="End Date">
              <div className="relative">
                <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm outline-none bg-slate-50"
                />
              </div>
            </LabeledInput>

            <LabeledInput label="Corporate Account">
              <select
                value={corporate}
                onChange={(e) => setCorporate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm outline-none bg-slate-50 cursor-pointer focus:border-[#0A4D68]"
              >
                {corporates.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </LabeledInput>
          </div>
        </div>

        {/* TABLE SECTION */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h2 className="font-black text-slate-700 uppercase tracking-tighter text-lg">
              Revenue Details
            </h2>
            <button
              className="flex items-center gap-2 px-4 py-2 text-white rounded-lg text-xs font-bold transition-all shadow-md uppercase bg-[#0A4D68] hover:bg-[#088395]"
              onClick={() => {}} // optional export
            >
              <FiDownload /> Export CSV
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr
                  style={{ backgroundColor: colors.primary }}
                  className="text-white"
                >
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest">
                    Date
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest">
                    Corporate
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest">
                    Type
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest">
                    Employee
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-slate-500">
                      No revenue records found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((rev) => (
                    <tr
                      key={rev.id}
                      className="hover:bg-slate-50 transition-all"
                    >
                      <td className="px-6 py-4 text-slate-600 font-medium">
                        {rev.date}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-slate-800 text-[13px]">
                          {rev.company}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <TypeBadge type={rev.type} />
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {rev.employee}
                      </td>
                      <td className="px-6 py-4 font-black text-green-700">
                        ₹{rev.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <span>Showing {filtered.length} revenue record(s)</span>
            <span>Total Revenue: ₹{totalRevenue.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------- HELPER COMPONENTS ------------------- */
function StatCard({ label, value, borderCls, iconBgCls, iconColorCls, Icon }) {
  return (
    <div
      className={`bg-white rounded-xl p-4 flex items-center gap-3 shadow-sm border-l-4 ${borderCls}`}
    >
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBgCls}`}
      >
        <Icon size={18} className={iconColorCls} />
      </div>
      <div className="text-left">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
          {label}
        </p>
        <p className="text-xl font-black text-slate-900 leading-none">
          {value}
        </p>
      </div>
    </div>
  );
}

function LabeledInput({ label, children }) {
  return (
    <div className="flex flex-col gap-1 text-left">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
        {label}
      </label>
      {children}
    </div>
  );
}

function TypeBadge({ type }) {
  const isFlight = type === "Flight";
  return (
    <span
      className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border ${
        isFlight
          ? "bg-blue-50 text-blue-700 border-blue-100"
          : "bg-amber-50 text-amber-700 border-amber-100"
      }`}
    >
      {type}
    </span>
  );
}
