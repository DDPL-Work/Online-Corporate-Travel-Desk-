import React, { useEffect, useState, useMemo } from "react";
import {
  FiFilter,
  FiDownload,
  FiSearch,
  FiCalendar,
  FiDollarSign,
  FiCreditCard,
  FiActivity,
} from "react-icons/fi";
import { FaRupeeSign, FaBuilding } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchPostpaidBalance,
  fetchPostpaidTransactions,
} from "../../Redux/Actions/postpaidThunks";
import {Pagination} from "./Shared/Pagination";

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

export default function CreditUtilizationPostpaid() {
  const dispatch = useDispatch();

  // Date presets: current month
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);
  const [status, setStatus] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);

  const { balance, transactions, pagination, loadingBalance, loadingTransactions } =
    useSelector((state) => state.postpaid);

  // Sync filters with current cycle when balance is loaded
  useEffect(() => {
    if (balance?.currentCycleStart && balance?.currentCycleEnd) {
      setStartDate(new Date(balance.currentCycleStart).toISOString().split("T")[0]);
      setEndDate(new Date(balance.currentCycleEnd).toISOString().split("T")[0]);
    }
  }, [balance]);

  // Calculate days remaining
  const daysRemaining = useMemo(() => {
    if (!balance?.currentCycleEnd) return null;
    const end = new Date(balance.currentCycleEnd);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [balance]);

  // Fetch balance once
  useEffect(() => {
    dispatch(fetchPostpaidBalance());
  }, [dispatch]);

  // Fetch transactions when filters/page change
  useEffect(() => {
    const params = {
      startDate,
      endDate,
      page: currentPage,
      limit: 10,
    };
    if (status !== "All") params.status = status;
    dispatch(fetchPostpaidTransactions(params));
  }, [dispatch, startDate, endDate, status, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [startDate, endDate, status]);

  // Safe arrays
  const safeTransactions = transactions || [];

  // Client-side search (search across corporate name, booking ID, description)
  const searchedTransactions = useMemo(() => {
    if (!searchTerm) return safeTransactions;
    const term = searchTerm.toLowerCase();
    return safeTransactions.filter(
      (t) =>
        t.bookingId?.toLowerCase().includes(term) ||
        t.description?.toLowerCase().includes(term)
    );
  }, [safeTransactions, searchTerm]);

  const statuses = ["All", "paid", "pending", "failed"]; // adjust based on actual statuses

  // Summary stats (based on filtered results)
  const totalTransactions = searchedTransactions.length;
  // const totalAmount = searchedTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  // const totalCreditUsed = searchedTransactions.reduce((sum, t) => sum + (t.creditUsed || 0), 0);

  return (
    <div className="min-h-screen p-6 font-sans" style={{ backgroundColor: colors.light }}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* PAGE HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-linear-to-br from-[#0A4D68] to-[#088395] flex items-center justify-center shadow-lg text-white">
              <FiCreditCard size={24} />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">
                Credit Utilization (Postpaid)
              </h1>
              <p className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-widest">
                Monitor corporate credit usage
              </p>
            </div>
          </div>

          {!loadingBalance && balance && (
            <div className="flex items-center gap-4">
               <div className="flex flex-col items-end border-r border-slate-200 pr-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                  Lifecycle
                </p>
                <p className="text-xs font-bold text-slate-700">
                  Since {balance.onboardedAt ? new Date(balance.onboardedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                </p>
              </div>

              <div className="flex flex-col items-end">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                  Current Cycle
                </p>
                <p className="text-xs font-bold text-slate-700">
                  {balance.currentCycleStart ? new Date(balance.currentCycleStart).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—"} 
                  <span className="mx-1 text-slate-300">→</span>
                  {balance.currentCycleEnd ? new Date(balance.currentCycleEnd).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—"}
                </p>
              </div>

              <div className="flex flex-col items-end border-l border-slate-200 pl-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                  Resets In
                </p>
                <div className="flex items-center gap-1.5">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                   <p className="text-sm font-black text-[#0A4D68]">
                    {daysRemaining} Days
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* STATS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Credit Limit"
            value={
              loadingBalance
                ? "..."
                : `₹${(balance?.totalLimit || 0).toLocaleString()}`
            }
            Icon={FaRupeeSign}
            borderCls="border-[#0A4D68]"
            iconBgCls="bg-[#0A4D68]/10"
            iconColorCls="text-[#0A4D68]"
          />
          <StatCard
            label="Used Credit"
            value={
              loadingBalance
                ? "..."
                : `₹${(balance?.usedCredit || 0).toLocaleString()}`
            }
            Icon={FiActivity}
            borderCls="border-[#F59E0B]"
            iconBgCls="bg-amber-50"
            iconColorCls="text-amber-600"
          />
          <StatCard
            label={balance?.availableCredit < 0 ? "Credit Over Limit" : "Available Credit"}
            value={
              loadingBalance
                ? "..."
                : `₹${Math.abs(balance?.availableCredit || 0).toLocaleString()}${balance?.availableCredit < 0 ? " (Exceeded)" : ""}`
            }
            Icon={FiDollarSign}
            borderCls={balance?.availableCredit < 0 ? "border-rose-500" : "border-[#10B981]"}
            iconBgCls={balance?.availableCredit < 0 ? "bg-rose-50" : "bg-emerald-50"}
            iconColorCls={balance?.availableCredit < 0 ? "text-rose-600" : "text-emerald-600"}
          />
          <StatCard
            label="Total Transactions (filtered)"
            value={totalTransactions}
            Icon={FiActivity}
            borderCls="border-[#088395]"
            iconBgCls="bg-[#088395]/10"
            iconColorCls="text-[#088395]"
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
                  placeholder="Booking ID / Description..."
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
              Credit Usage History
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
                <tr style={{ backgroundColor: colors.primary }} className="text-white">
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest">
                    Date
                  </th>
                
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest">
                    Booking ID
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest">
                    Type
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest">
                    Amount
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest">
                    Credit Used
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest">
                    Description
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loadingTransactions ? (
                  <tr>
                    <td colSpan="8" className="py-8 text-center text-slate-500">
                      Loading transactions...
                    </td>
                  </tr>
                ) : searchedTransactions.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-8 text-center text-slate-500">
                      No transactions found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  searchedTransactions.map((t) => (
                    <tr key={t._id} className="hover:bg-slate-50 transition-all">
                      <td className="px-6 py-4 text-slate-600 font-medium">
                        {new Date(t.paidDate || t.createdAt).toLocaleDateString()}
                      </td>
                     
                      <td className="px-6 py-4 font-mono text-slate-600 text-xs">
                        {t.bookingId || "—"}
                      </td>
                      <td className="px-6 py-4 capitalize text-slate-600">
                        {t.type || "—"}
                      </td>
                      <td className="px-6 py-4 font-black text-red-600">
                        - ₹{(t.amount || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-bold">
                        ₹{(t.amount || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-slate-600 max-w-xs truncate">
                        {t.description || "—"}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={t.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <span>Showing {searchedTransactions.length} transaction(s)</span>
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
    paid: {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-100",
      label: "Paid",
    },
    billed: {
      bg: "bg-cyan-50",
      text: "text-cyan-700",
      border: "border-cyan-100",
      label: "Billed",
    },
    pending: {
      bg: "bg-amber-50",
      text: "text-amber-700",
      border: "border-amber-100",
      label: "Pending",
    },
    failed: {
      bg: "bg-rose-50",
      text: "text-rose-700",
      border: "border-rose-100",
      label: "Failed",
    },
  };
  const style = config[status] || config.pending;
  return (
    <span
      className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border ${style.bg} ${style.text} ${style.border}`}
    >
      {style.label}
    </span>
  );
}