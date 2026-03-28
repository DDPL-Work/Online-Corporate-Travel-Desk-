import React, { useState } from "react";
import {
  FiFilter,
  FiEdit3,
  FiCheckCircle,
  FiXCircle,
  FiSearch,
  FiCalendar,
  FiEye,
} from "react-icons/fi";
import { FaPlane, FaHotel } from "react-icons/fa";
import { pendingAmendmentsData } from "../../data/dummyData";

const colors = {
  primary: "#0A4D68",
  secondary: "#088395",
  accent: "#05BFDB",
  light: "#F8FAFC",
  dark: "#1E293B",
  success: "#10B981",
  danger: "#EF4444",
  warning: "#F59E0B",
};

export default function PendingAmendments() {
  // Tab state
  const [activeTab, setActiveTab] = useState("Flight");

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [corporate, setCorporate] = useState("All");
  const [type, setType] = useState("All");
  const [status, setStatus] = useState("All");

  // Extract unique values for filters from all data (both flight and hotel)
  const allData = pendingAmendmentsData;
  const corporates = ["All", ...new Set(allData.map((a) => a.company))];
  const types = ["All", "Flight", "Hotel"];
  const statuses = ["All", "Pending", "Approved", "Rejected"];

  // Filter data based on selected tab and all filters
  const filteredData = allData.filter((item) => {
    // Tab filter
    const tabMatch = item.type === activeTab;

    // Corporate filter
    const corpMatch = corporate === "All" || item.company === corporate;

    // Type filter (already handled by tab, but if we want additional type filter, we keep it)
    const typeMatch = type === "All" || item.type === type;

    // Status filter
    const statusMatch = status === "All" || item.status === status;

    // Search filter (search in company, employee, details, etc.)
    const searchMatch =
      !searchTerm ||
      item.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.employee.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.details &&
        item.details.toLowerCase().includes(searchTerm.toLowerCase()));

    // Date range filter (using request date)
    let dateMatch = true;
    const requestDate = item.requestDate || item.date; // use requestDate if available, else date
    if (dateFrom) {
      const itemDate = new Date(requestDate);
      const from = new Date(dateFrom);
      if (isNaN(itemDate.getTime()) || itemDate < from) dateMatch = false;
    }
    if (dateTo && dateMatch) {
      const itemDate = new Date(requestDate);
      const to = new Date(dateTo);
      if (isNaN(itemDate.getTime()) || itemDate > to) dateMatch = false;
    }

    return (
      tabMatch &&
      corpMatch &&
      typeMatch &&
      statusMatch &&
      searchMatch &&
      dateMatch
    );
  });

  // Summary stats for the active tab
  const total = filteredData.length;
  const pending = filteredData.filter((x) => x.status === "Pending").length;
  const approved = filteredData.filter((x) => x.status === "Approved").length;
  const rejected = filteredData.filter((x) => x.status === "Rejected").length;

  // Action handlers
  function approve(id) {
    alert(`Amendment #${id} Approved`);
  }

  function reject(id) {
    alert(`Amendment #${id} Rejected`);
  }

  function viewDetails(item) {
    alert(`View details for ${item.bookingId || item.id}`);
  }

  return (
    <div
      className="min-h-screen p-6 font-sans"
      style={{ backgroundColor: colors.light }}
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* PAGE HEADER */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-linear-to-br from-[#0A4D68] to-[#088395] flex items-center justify-center shadow-lg text-white">
            <FiEdit3 size={24} />
          </div>
          <div className="text-left">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">
              Pending Amendments
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-widest">
              Manage change requests for bookings
            </p>
          </div>
        </div>

        {/* TABS SELECTOR */}
        <div className="flex items-end gap-1 border-b-2 border-slate-200">
          <button
            onClick={() => setActiveTab("Flight")}
            className={`flex items-center gap-2 px-8 py-3 text-[13px] font-bold transition-all border-b-2 -mb-0.5 rounded-t-lg ${
              activeTab === "Flight"
                ? "bg-white text-[#0A4D68] border-b-[#0A4D68] shadow-sm"
                : "text-slate-400 border-transparent hover:text-slate-600 hover:bg-white/60"
            }`}
          >
            <FaPlane size={14} /> Flight Amendments
          </button>
          <button
            onClick={() => setActiveTab("Hotel")}
            className={`flex items-center gap-2 px-8 py-3 text-[13px] font-bold transition-all border-b-2 -mb-0.5 rounded-t-lg ${
              activeTab === "Hotel"
                ? "bg-white text-[#088395] border-b-[#088395] shadow-sm"
                : "text-slate-400 border-transparent hover:text-slate-600 hover:bg-white/60"
            }`}
          >
            <FaHotel size={14} /> Hotel Amendments
          </button>
        </div>

        {/* STATS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Requests"
            value={total}
            Icon={FiEdit3}
            borderCls="border-[#0A4D68]"
            iconBgCls="bg-[#0A4D68]/10"
            iconColorCls="text-[#0A4D68]"
          />
          <StatCard
            label="Pending"
            value={pending}
            Icon={FiCheckCircle}
            borderCls="border-amber-500"
            iconBgCls="bg-amber-50"
            iconColorCls="text-amber-600"
          />
          <StatCard
            label="Approved"
            value={approved}
            Icon={FiCheckCircle}
            borderCls="border-emerald-500"
            iconBgCls="bg-emerald-50"
            iconColorCls="text-emerald-600"
          />
          <StatCard
            label="Rejected"
            value={rejected}
            Icon={FiXCircle}
            borderCls="border-rose-500"
            iconBgCls="bg-rose-50"
            iconColorCls="text-rose-600"
          />
        </div>

        {/* FILTERS SECTION */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <LabeledInput label="Search">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Company / Employee / Details..."
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

            <LabeledInput label="Type">
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm outline-none bg-slate-50 cursor-pointer focus:border-[#0A4D68]"
              >
                {types.map((t) => (
                  <option key={t} value={t}>
                    {t === "All" ? "All Types" : t}
                  </option>
                ))}
              </select>
            </LabeledInput>

            <LabeledInput label="Status">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm outline-none bg-slate-50 cursor-pointer focus:border-[#0A4D68]"
              >
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {s === "All" ? "All Statuses" : s}
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
              {activeTab} Amendment Requests
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
                <tr
                  style={{ backgroundColor: colors.primary }}
                  className="text-white"
                >
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest">
                    Change Request ID
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest">
                    Booking ID
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest">
                    Request Date
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest">
                    Corporate
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest">
                    Traveller / Guest
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest">
                    Remark
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest">
                    Status
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-8 text-center text-slate-500">
                      No amendments found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50 transition-all"
                    >
                      <td className="px-6 py-4 font-mono text-slate-600">
                        {item.changeRequestId || `CR-${item.id}`}
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-600">
                        {item.bookingId || item.id}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {item.requestDate || item.date || "—"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 text-[13px]">
                            {item.company}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ID:{" "}
                            {item.corporateId ||
                              "CORP-" + item.company.substring(0, 3)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-700 text-[13px]">
                            {item.employee}
                          </span>
                          <span className="text-[11px] text-teal-600 font-mono">
                            ID:{" "}
                            {item.employeeId ||
                              "EMP-" + Math.floor(Math.random() * 1000)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {item.details || "—"}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-3">
                          <ActionButton
                            icon={<FiEye size={16} />}
                            onClick={() => viewDetails(item)}
                            tooltip="View"
                            color="text-slate-600"
                            hoverBg="bg-slate-100"
                          />
                          {/* {item.status === "Pending" && (
                            <>
                              <ActionButton
                                icon={<FiCheckCircle size={16} />}
                                onClick={() => approve(item.id)}
                                tooltip="Approve"
                                color="text-green-600"
                                hoverBg="bg-green-50"
                              />
                              <ActionButton
                                icon={<FiXCircle size={16} />}
                                onClick={() => reject(item.id)}
                                tooltip="Reject"
                                color="text-red-600"
                                hoverBg="bg-red-50"
                              />
                            </>
                          )} */}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <span>Showing {filteredData.length} amendment(s)</span>
            <span>
              Pending: {pending} | Approved: {approved} | Rejected: {rejected}
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

function StatusBadge({ status }) {
  const config = {
    Pending: {
      bg: "bg-amber-50",
      text: "text-amber-700",
      border: "border-amber-100",
    },
    Approved: {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-100",
    },
    Rejected: {
      bg: "bg-rose-50",
      text: "text-rose-700",
      border: "border-rose-100",
    },
  };
  const style = config[status] || config.Pending;
  return (
    <span
      className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border ${style.bg} ${style.text} ${style.border}`}
    >
      {status}
    </span>
  );
}

function ActionButton({ icon, onClick, tooltip, color, hoverBg }) {
  return (
    <button
      title={tooltip}
      onClick={onClick}
      className={`p-2 rounded-lg transition-all ${color} ${hoverBg} hover:scale-105 focus:outline-none`}
    >
      {icon}
    </button>
  );
}