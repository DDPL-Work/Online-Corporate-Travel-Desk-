import React, { useEffect, useMemo, useState } from "react";
import {
  FiFilter,
  FiDownload,
  FiCheckCircle,
  FiXCircle,
  FiSearch,
  FiCalendar,
  FiDollarSign,
  FiCreditCard,
} from "react-icons/fi";
import { FaRupeeSign } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { fetchWalletRechargeLogs } from "../../Redux/Slice/walletRechargeLogsSlice";
import Pagination from "../Shared/Pagination";

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

export default function WalletRechargeLogs() {
  const dispatch = useDispatch();

  // Filter states
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [corporate, setCorporate] = useState("All");
  const [method, setMethod] = useState("All");
  const [status, setStatus] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const { logs, loading, pagination } = useSelector(
    (state) => state.walletRechargeLogs,
  );

  // Fetch logs when filters or page change (server-side)
  useEffect(() => {
    dispatch(
      fetchWalletRechargeLogs({
        status: status !== "All" ? status.toUpperCase() : undefined,
        corporateId: corporate !== "All" ? corporate : undefined,
        from: startDate || undefined,
        to: endDate || undefined,
        page: currentPage,
        limit: 10,
      }),
    );
  }, [dispatch, status, corporate, startDate, endDate, currentPage]);

  // Reset to page 1 when server-side filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [status, corporate, startDate, endDate]);

  // Normalize logs for display
  const normalizedLogs = useMemo(() => {
    return logs.map((log) => ({
      id: log._id,
      date: new Date(log.createdAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      corporateName: log.corporateId?.corporateName || "—",
      corporateId: log.corporateId?._id || "—",
      amount: log.amount,
      method: "Razorpay", // from API
      orderId: log.orderId || "—",
      paymentId: log.paymentId || "—",
      status:
        log.status === "SUCCESS"
          ? "Success"
          : log.status === "FAILED"
            ? "Failed"
            : "Pending",
    }));
  }, [logs]);

  // Client-side search (name, ID, order, payment, amount)
  const searchedLogs = useMemo(() => {
    if (!searchTerm) return normalizedLogs;
    const term = searchTerm.toLowerCase();
    return normalizedLogs.filter(
      (log) =>
        log.corporateName.toLowerCase().includes(term) ||
        log.corporateId.toLowerCase().includes(term) ||
        log.orderId.toLowerCase().includes(term) ||
        log.paymentId.toLowerCase().includes(term) ||
        log.amount.toString().includes(term),
    );
  }, [normalizedLogs, searchTerm]);

  // Apply payment method filter client-side
  const finalLogs = useMemo(() => {
    if (method === "All") return searchedLogs;
    return searchedLogs.filter((log) => log.method === method);
  }, [searchedLogs, method]);

  // Extract unique corporate names for dropdown (from all logs, not filtered)
  const corporates = useMemo(() => {
    const unique = new Set(
      normalizedLogs.map((l) => l.corporateName).filter((n) => n !== "—"),
    );
    return ["All", ...Array.from(unique)];
  }, [normalizedLogs]);

  const methods = ["All", "Razorpay"]; // only one method from API
  const statuses = ["All", "Success", "Failed", "Pending"];

  // Summary stats (based on final displayed logs)
  const totalRecharge = finalLogs.reduce((sum, l) => sum + l.amount, 0);
  const success = finalLogs.filter((l) => l.status === "Success").length;
  const failed = finalLogs.filter((l) => l.status === "Failed").length;
  const pending = finalLogs.filter((l) => l.status === "Pending").length;

  return (
    <div
      className="min-h-screen p-6 font-sans"
      style={{ backgroundColor: colors.light }}
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* PAGE HEADER */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-linear-to-br from-[#0A4D68] to-[#088395] flex items-center justify-center shadow-lg text-white">
            <FiDollarSign size={24} />
          </div>
          <div className="text-left">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">
              Wallet Recharge Logs
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-widest">
              Monitor all wallet transactions
            </p>
          </div>
        </div>

        {/* STATS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Recharge Amount"
            value={`₹${totalRecharge.toLocaleString()}`}
            Icon={FaRupeeSign}
            borderCls="border-[#0A4D68]"
            iconBgCls="bg-[#0A4D68]/10"
            iconColorCls="text-[#0A4D68]"
          />
          <StatCard
            label="Successful"
            value={success}
            Icon={FiCheckCircle}
            borderCls="border-emerald-500"
            iconBgCls="bg-emerald-50"
            iconColorCls="text-emerald-600"
          />
          <StatCard
            label="Failed"
            value={failed}
            Icon={FiXCircle}
            borderCls="border-rose-500"
            iconBgCls="bg-rose-50"
            iconColorCls="text-rose-600"
          />
          <StatCard
            label="Pending"
            value={pending}
            Icon={FiXCircle}
            borderCls="border-amber-500"
            iconBgCls="bg-amber-50"
            iconColorCls="text-amber-600"
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
                  placeholder="Company / ID / Order / Payment..."
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
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm outline-none bg-slate-50"
                />
              </div>
            </LabeledInput>

            <LabeledInput label="To Date">
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

            <LabeledInput label="Corporate">
              <select
                value={corporate}
                onChange={(e) => setCorporate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm outline-none bg-slate-50 cursor-pointer focus:border-[#0A4D68]"
              >
                {corporates.map((c) => (
                  <option key={c} value={c}>
                    {c === "All" ? "All Corporates" : c}
                  </option>
                ))}
              </select>
            </LabeledInput>

            <LabeledInput label="Payment Method">
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm outline-none bg-slate-50 cursor-pointer focus:border-[#0A4D68]"
              >
                {methods.map((m) => (
                  <option key={m} value={m}>
                    {m === "All" ? "All Methods" : m}
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
              Recharge Records
            </h2>
            <button
              className="flex items-center gap-2 px-4 py-2 text-white rounded-lg text-xs font-bold transition-all shadow-md uppercase bg-[#0A4D68] hover:bg-[#088395]"
              onClick={() => {}} // optional export
            >
              <FiDownload /> Export
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
                    Amount
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest">
                    Method
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest">
                    Order ID
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest">
                    Payment ID
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-slate-500">
                      Loading recharge logs...
                    </td>
                  </tr>
                ) : finalLogs.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-slate-500">
                      No recharge logs found
                    </td>
                  </tr>
                ) : (
                  finalLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50 transition-all"
                    >
                      <td className="px-6 py-4 text-slate-600 font-medium">
                        {log.date}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 text-[13px]">
                            {log.corporateName}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ID: {log.corporateId}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-black text-slate-900">
                        ₹{log.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <FiCreditCard className="text-[#05BFDB]" size={14} />
                          <span className="text-slate-600">{log.method}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-600 text-xs">
                        {log.orderId}
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-600 text-xs">
                        {log.paymentId}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={log.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <span>Showing {finalLogs.length} recharge(s)</span>
            <Pagination
              currentPage={pagination?.page || 1}
              totalPages={pagination?.pages || 1}
              onPageChange={setCurrentPage}
              showFirstLast={true}
            />
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
    Success: {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-100",
    },
    Failed: {
      bg: "bg-rose-50",
      text: "text-rose-700",
      border: "border-rose-100",
    },
    Pending: {
      bg: "bg-amber-50",
      text: "text-amber-700",
      border: "border-amber-100",
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