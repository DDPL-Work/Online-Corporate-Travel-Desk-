import React, { useState } from "react";
import {
  FiFilter,
  FiAlertTriangle,
  FiBell,
  FiMail,
  FiSearch,
  FiCalendar,
} from "react-icons/fi";
import { creditAlertsData } from "../../data/dummyData";

const colors = {
  primary: "#0A4D68",
  secondary: "#088395",
  accent: "#05BFDB",
  light: "#F8FAFC",
  dark: "#1E293B",
  danger: "#EF4444",
  warning: "#F59E0B",
};

export default function CreditStatusAlerts() {
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [corporate, setCorporate] = useState("All");
  const [priority, setPriority] = useState("All");

  const corporates = ["All", ...new Set(creditAlertsData.map((a) => a.company))];
  const priorities = ["All", "High", "Medium", "Low"];

  // Filter logic
  const filtered = creditAlertsData.filter((alert) => {
    // Corporate filter
    const corpMatch = corporate === "All" || alert.company === corporate;
    // Priority filter
    const priorityMatch = priority === "All" || alert.priority === priority;
    // Search filter (company or message)
    const searchMatch =
      !searchTerm ||
      alert.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.message.toLowerCase().includes(searchTerm.toLowerCase());

    // Date range filter
    let dateMatch = true;
    if (dateFrom) {
      const alertDate = new Date(alert.date);
      const from = new Date(dateFrom);
      if (isNaN(alertDate.getTime()) || alertDate < from) dateMatch = false;
    }
    if (dateTo && dateMatch) {
      const alertDate = new Date(alert.date);
      const to = new Date(dateTo);
      if (isNaN(alertDate.getTime()) || alertDate > to) dateMatch = false;
    }

    return corpMatch && priorityMatch && searchMatch && dateMatch;
  });

  // Summary values
  const totalAlerts = filtered.length;
  const highAlerts = filtered.filter((a) => a.priority === "High").length;
  const mediumAlerts = filtered.filter((a) => a.priority === "Medium").length;
  const lowAlerts = filtered.filter((a) => a.priority === "Low").length;

  // Handle notify action (placeholder)
  const handleNotify = (alert) => {
    alert("Notify " + alert.company + " about: " + alert.message);
  };

  return (
    <div className="min-h-screen p-6 font-sans" style={{ backgroundColor: colors.light }}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* PAGE HEADER */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-linear-to-br from-[#0A4D68] to-[#088395] flex items-center justify-center shadow-lg text-white">
            <FiBell size={24} />
          </div>
          <div className="text-left">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">
              Credit Status Alerts
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-widest">
              Monitor corporate credit thresholds
            </p>
          </div>
        </div>

        {/* STATS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Alerts"
            value={totalAlerts}
            Icon={FiBell}
            borderCls="border-[#0A4D68]"
            iconBgCls="bg-[#0A4D68]/10"
            iconColorCls="text-[#0A4D68]"
          />
          <StatCard
            label="High Priority"
            value={highAlerts}
            Icon={FiAlertTriangle}
            borderCls="border-red-500"
            iconBgCls="bg-red-50"
            iconColorCls="text-red-600"
          />
          <StatCard
            label="Medium Priority"
            value={mediumAlerts}
            Icon={FiAlertTriangle}
            borderCls="border-amber-500"
            iconBgCls="bg-amber-50"
            iconColorCls="text-amber-600"
          />
          <StatCard
            label="Low Priority"
            value={lowAlerts}
            Icon={FiAlertTriangle}
            borderCls="border-[#088395]"
            iconBgCls="bg-[#088395]/10"
            iconColorCls="text-[#088395]"
          />
        </div>

        {/* FILTERS SECTION */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <LabeledInput label="Search">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Company / Message..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm outline-none bg-slate-50"
                />
              </div>
            </LabeledInput>

            <LabeledInput label="From Date">
              <div className="relative">
                <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm outline-none bg-slate-50"
                />
              </div>
            </LabeledInput>

            <LabeledInput label="To Date">
              <div className="relative">
                <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm outline-none bg-slate-50"
                />
              </div>
            </LabeledInput>

            <LabeledInput label="Corporate">
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

            <LabeledInput label="Priority">
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm outline-none bg-slate-50 cursor-pointer focus:border-[#0A4D68]"
              >
                {priorities.map((p) => (
                  <option key={p} value={p}>
                    {p === "All" ? "All Priorities" : p}
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
              Alert Details
            </h2>
            <button
              className="flex items-center gap-2 px-4 py-2 text-white rounded-lg text-xs font-bold transition-all shadow-md uppercase bg-[#0A4D68] hover:bg-[#088395]"
              onClick={() => {}} // optional export
            >
              <FiFilter /> Export
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr style={{ backgroundColor: colors.primary }} className="text-white">
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest">
                    Date
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest">
                    Corporate
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest">
                    Priority
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest">
                    Message
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-slate-500">
                      No alerts match the filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((alert) => (
                    <tr key={alert.id} className="hover:bg-slate-50 transition-all">
                      <td className="px-6 py-4 text-slate-600 font-medium">
                        {alert.date}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-slate-800 text-[13px]">
                          {alert.company}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <PriorityBadge priority={alert.priority} />
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {alert.message}
                      </td>
                      <td className="px-6 py-4">
                        <ActionButton
                          icon={<FiMail size={14} />}
                          onClick={() => handleNotify(alert)}
                          tooltip="Notify"
                          color="text-slate-600"
                          hoverBg="bg-slate-100"
                          label="Notify"
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <span>Showing {filtered.length} alert(s)</span>
            <span>
              High: {highAlerts} | Medium: {mediumAlerts} | Low: {lowAlerts}
            </span>
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

function PriorityBadge({ priority }) {
  const config = {
    High: {
      bg: "bg-red-50",
      text: "text-red-700",
      border: "border-red-100",
    },
    Medium: {
      bg: "bg-amber-50",
      text: "text-amber-700",
      border: "border-amber-100",
    },
    Low: {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-100",
    },
  };
  const style = config[priority] || config.Low;
  return (
    <span
      className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border ${style.bg} ${style.text} ${style.border}`}
    >
      {priority}
    </span>
  );
}

function ActionButton({ icon, onClick, tooltip, color, hoverBg, label }) {
  return (
    <button
      title={tooltip}
      onClick={onClick}
      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all ${color} ${hoverBg} hover:scale-105 focus:outline-none text-xs font-medium`}
    >
      {icon}
      {label && <span>{label}</span>}
    </button>
  );
}