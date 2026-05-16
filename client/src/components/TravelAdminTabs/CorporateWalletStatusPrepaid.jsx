import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  FiFilter,
  FiDownload,
  FiPlusCircle,
  FiArrowUpRight,
  FiArrowDownLeft,
  FiSearch,
  FiCalendar,
  FiActivity,
  FiCreditCard,
  FiRefreshCw,
  FiX,
} from "react-icons/fi";
import { FaRupeeSign } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { LabeledField, CustomDropdown } from "./Shared/CommonComponents";
import ResponsiveDataTable from "./Shared/ResponsiveDataTable";
import { Pagination } from "./Shared/Pagination";
import { fetchWalletBalance, fetchWalletTransactions, initiateWalletRecharge, fetchRechargeHistory, fetchBookingTransactions } from "../../Redux/Slice/walletSlice";

// Extended color palette matching CreditUtilizationPostpaid
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

// Helper Components (reused from postpaid page)
const StatCard = ({
  label,
  value,
  borderCls,
  iconBgCls,
  iconColorCls,
  Icon,
}) => (
  <div
    className={`bg-white rounded-xl p-4 flex items-center gap-3 shadow-sm border-l-4 ${borderCls}`}
  >
    <div
      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBgCls}`}
    >
      <Icon size={18} className={iconColorCls} />
    </div>
    <div className="text-left">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 italic">
        {label}
      </p>
      <p className="text-xl font-black text-slate-900 leading-none">{value}</p>
    </div>
  </div>
);

const LabeledInput = ({ label, children }) => (
  <div className="flex flex-col gap-1 text-left">
    <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 italic mb-1">
      {label}
    </label>
    {children}
  </div>
);

const StatusBadge = ({ status }) => {
  const config = {
    success: {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-100",
      label: "Success",
    },
    credit: {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-100",
      label: "Credit",
    },
    debit: {
      bg: "bg-rose-50",
      text: "text-rose-700",
      border: "border-rose-100",
      label: "Debit",
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
  const style = config[status] || config.success;
  return (
    <span
      className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-tighter border shadow-sm ${style.bg} ${style.text} ${style.border}`}
    >
      {style.label}
    </span>
  );
};

export default function CorporateWallet() {
  const dispatch = useDispatch();

  const {
    balance,
    currency,
    transactions,
    loading,
    rechargeOrder,
    pagination,
    error,
  } = useSelector((state) => state.wallet);

  // Original filter states
  const [filterType, setFilterType] = useState("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [activeTab, setActiveTab] = useState("booking"); // booking | recharge

  // New UI filters (client-side)
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all, success, pending, failed

  // Modal state
  const [showRecharge, setShowRecharge] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [selectedTx, setSelectedTx] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const pendingStatusSyncRef = useRef(new Map());

  // INITIAL LOAD
  useEffect(() => {
    dispatch(fetchWalletBalance());
  }, [dispatch]);

  // APPLY FILTERS (original server-side logic)
  // AUTO APPLY FILTERS (trigger when filter states change)
  useEffect(() => {
    const params = {
      dateFrom: startDate || undefined,
      dateTo: endDate || undefined,
    };

    if (activeTab === "recharge") {
      dispatch(fetchRechargeHistory(params));
    } else {
      dispatch(fetchBookingTransactions(params));
    }

    setSearchTerm("");
    setStatusFilter("all");
    setCurrentPage(1); // Reset to first page on filter change
  }, [dispatch, activeTab, startDate, endDate]);

  // Helper: determine transaction status (fallback to 'success')
  const getTransactionStatus = (tx) => {
    if (tx.status) return tx.status.toLowerCase();
    // If no status field, assume success
    return "success";
  };

  useEffect(() => {
    const pendingPhonePeOrderIds = [
      ...new Set(
        (transactions || [])
          .filter(
            (tx) =>
              getTransactionStatus(tx) === "pending" &&
              tx.type === "credit" &&
              tx.paymentGateway?.name === "phonepe" &&
              tx.paymentGateway?.orderId,
          )
          .map((tx) => tx.paymentGateway.orderId),
      ),
    ];

    if (!pendingPhonePeOrderIds.length) {
      return undefined;
    }

    const now = Date.now();
    const orderIdsToSync = pendingPhonePeOrderIds.filter((orderId) => {
      const lastCheckedAt = pendingStatusSyncRef.current.get(orderId) || 0;
      return now - lastCheckedAt >= 15000;
    });

    if (!orderIdsToSync.length) {
      return undefined;
    }

    orderIdsToSync.forEach((orderId) => {
      pendingStatusSyncRef.current.set(orderId, now);
    });

    let cancelled = false;

    const syncPendingStatuses = async () => {
      let shouldRefreshWallet = false;

      for (const orderId of orderIdsToSync) {
        try {
          const statusResult = await dispatch(
            fetchWalletPaymentStatus({
              orderId,
              gateway: "phonepe",
            }),
          ).unwrap();

          if (["SUCCESS", "FAILED"].includes(statusResult?.status)) {
            shouldRefreshWallet = true;
          }
        } catch (error) {
          pendingStatusSyncRef.current.delete(orderId);
        }
      }

      if (cancelled || !shouldRefreshWallet) {
        return;
      }

      dispatch(fetchWalletBalance());
      if (activeTab === "recharge") {
        dispatch(fetchRechargeHistory({ dateFrom: startDate || undefined, dateTo: endDate || undefined }));
      } else {
        dispatch(fetchBookingTransactions({ dateFrom: startDate || undefined, dateTo: endDate || undefined }));
      }
    };

    syncPendingStatuses();

    return () => {
      cancelled = true;
    };
  }, [
    dispatch,
    transactions,
    pagination?.page,
    pagination?.limit,
    filterType,
    startDate,
    endDate,
  ]);

  // Combine filters: server-side filtered data from Redux + client-side search + status + tab
  const filteredTransactions = useMemo(() => {
    let filtered = transactions || [];

    // Client-side search (description or transaction ID)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (tx) =>
          tx.description?.toLowerCase().includes(term) ||
          tx._id?.toLowerCase().includes(term) ||
          tx.bookingId?.toLowerCase().includes(term),
      );
    }

    // Status filter (client-side)
    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (tx) => getTransactionStatus(tx) === statusFilter,
      );
    }

    // Note: Server-side separation is now handled by different API calls
    return [...filtered].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    );
  }, [transactions, searchTerm, statusFilter, activeTab]);

  // Frontend Pagination Logic
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTransactions.slice(start, start + itemsPerPage);
  }, [filteredTransactions, currentPage, itemsPerPage]);

  // Summary stats (based on filtered transactions)
  const totalTransactions = filteredTransactions.length;
  const totalCredit = filteredTransactions
    .filter((tx) => tx.type === "credit")
    .reduce((sum, tx) => sum + (tx.amount || 0), 0);
  const totalDebit = filteredTransactions
    .filter((tx) => tx.type === "debit")
    .reduce((sum, tx) => sum + (tx.amount || 0), 0);

  // Pagination
  // const totalPages = Math.ceil(totalTransactions / itemsPerPage);
  // const paginatedTransactions = useMemo(() => {
  //   const start = (currentPage - 1) * itemsPerPage;
  //   return filteredTransactions.slice(start, start + itemsPerPage);
  // }, [filteredTransactions, currentPage, itemsPerPage]);

  // Export to CSV (based on filtered transactions)
  const handleExport = () => {
    if (!filteredTransactions.length) return;
    const headers = [
      "Date",
      "Description",
      "Order ID",
      "Type",
      "Amount",
      "Status",
    ];
    const rows = filteredTransactions.map((tx) => [
      new Date(tx.createdAt).toLocaleDateString("en-IN"),
      tx.description || "—",
      tx.orderId || tx._id || tx.bookingId || "—",
      tx.type || "—",
      `${tx.type === "credit" ? "+" : "-"} ₹${(tx.amount || 0).toLocaleString()}`,
      getTransactionStatus(tx),
    ]);
    const tableRows = rows
      .map(
        (row) =>
          `<tr>${row
            .map(
              (cell) =>
                `<td style="border:1px solid #dbe4f0;padding:8px;">${String(
                  cell ?? "",
                )
                  .replace(/&/g, "&amp;")
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;")}</td>`,
            )
            .join("")}</tr>`,
      )
      .join("");
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head><body><table><thead><tr>${headers.map((h) => `<th style="border:1px solid #cbd5e1;padding:10px;background:#0f172a;color:#fff;font-weight:700;text-align:left;">${h}</th>`).join("")}</tr></thead><tbody>${tableRows}</tbody></table></body></html>`;
    const blob = new Blob(["\ufeff", html], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wallet-transactions-${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (!rechargeOrder) return;

    const redirectToPhonePe = async () => {
      if (rechargeOrder.gateway === "phonepe" && rechargeOrder.redirectUrl) {
        window.location.assign(rechargeOrder.redirectUrl);
        return;
      }
      alert("PhonePe payment link is unavailable. Please try again.");
    };

    redirectToPhonePe();
  }, [rechargeOrder]);

  const handleRecharge = async () => {
    if (!rechargeAmount || rechargeAmount <= 0) {
      alert("Enter a valid amount");
      return;
    }
    const result = await dispatch(
      initiateWalletRecharge({
        amount: Number(rechargeAmount),
      }),
    );
    if (result.error) return;
    setShowRecharge(false);
    setRechargeAmount("");
  };

  return (
    <div
      className="min-h-screen p-6 font-sans"
      style={{ backgroundColor: colors.light }}
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* HEADER CARD */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[#0A4D68] to-[#088395] flex items-center justify-center shadow-lg text-white shrink-0">
              <FiCreditCard size={24} />
            </div>
            <div className="text-left min-w-0">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase leading-none truncate">
                Corporate Wallet
              </h1>
              <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1 font-bold uppercase tracking-widest truncate">
                Manage balance & transactions
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => {
                dispatch(fetchWalletBalance());
                const params = {
                  dateFrom: startDate || undefined,
                  dateTo: endDate || undefined,
                };
                if (activeTab === "recharge") {
                  dispatch(fetchRechargeHistory(params));
                } else {
                  dispatch(fetchBookingTransactions(params));
                }
              }}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-bold transition-all shadow-sm border bg-cyan-50 border-cyan-200 text-[#0A4D68] hover:bg-cyan-100 active:scale-95"
            >
              <FiRefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              onClick={() => setShowRecharge(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold text-[13px] shadow-lg transition-all active:scale-95 hover:opacity-90"
              style={{ backgroundColor: colors.primary }}
            >
              <FiPlusCircle size={18} />
              Recharge
            </button>
          </div>
        </div>

        {/* STATS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Available Balance"
            value={
              loading
                ? "..."
                : `${currency || "₹"} ${(balance || 0).toLocaleString()}`
            }
            Icon={FaRupeeSign}
            borderCls="border-[#0A4D68]"
            iconBgCls="bg-[#0A4D68]/10"
            iconColorCls="text-[#0A4D68]"
          />
          <StatCard
            label="Total Recharge"
            value={`₹${totalCredit.toLocaleString()}`}
            Icon={FiArrowDownLeft}
            borderCls="border-[#10B981]"
            iconBgCls="bg-emerald-50"
            iconColorCls="text-emerald-600"
          />
          <StatCard
            label="Total Spend"
            value={`₹${totalDebit.toLocaleString()}`}
            Icon={FiArrowUpRight}
            borderCls="border-[#F59E0B]"
            iconBgCls="bg-amber-50"
            iconColorCls="text-amber-600"
          />
          <StatCard
            label="Transactions"
            value={totalTransactions}
            Icon={FiActivity}
            borderCls="border-[#088395]"
            iconBgCls="bg-[#088395]/10"
            iconColorCls="text-[#088395]"
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
            <div className="sm:col-span-2 lg:col-span-4">
              <LabeledField
                label={
                  <>
                    <FiSearch size={10} /> Search
                  </>
                }
              >
                <div className="relative group">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#0A4D68] transition-colors" />
                  <input
                    type="text"
                    placeholder="Description / Order ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border rounded-xl text-sm outline-none bg-slate-50 focus:ring-2 focus:ring-[#0A4D68]/10 focus:border-[#0A4D68] transition-all"
                  />
                </div>
              </LabeledField>
            </div>

            <div className="sm:col-span-2 lg:col-span-4">
              <LabeledField
                label={
                  <>
                    <FiCalendar size={10} /> Transaction Dates
                  </>
                }
              >
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-2 py-2 border rounded-lg text-[11px] outline-none bg-slate-50 focus:border-[#0A4D68] focus:ring-1 focus:ring-[#0A4D68]/10 transition-all"
                  />
                  <span className="text-slate-400 text-[10px] font-bold uppercase">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-2 py-2 border rounded-lg text-[11px] outline-none bg-slate-50 focus:border-[#0A4D68] focus:ring-1 focus:ring-[#0A4D68]/10 transition-all"
                  />
                </div>
              </LabeledField>
            </div>

            <div className="sm:col-span-1 lg:col-span-2">
              <LabeledField
                label={
                  <>
                    <FiFilter size={10} /> Status
                  </>
                }
              >
                <CustomDropdown
                  value={statusFilter === "all" ? "All Statuses" : statusFilter}
                  onChange={(val) =>
                    setStatusFilter(val === "All Statuses" ? "all" : val)
                  }
                  options={["All Statuses", "success", "pending", "failed"]}
                />
              </LabeledField>
            </div>

            <div className="sm:col-span-1 lg:col-span-2">
              <button
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setStartDate("");
                  setEndDate("");
                }}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-[11px] font-bold text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors active:scale-95 border border-slate-200 shadow-sm"
              >
                <FiRefreshCw size={12} /> Reset
              </button>
            </div>
          </div>
        </div>

        <ResponsiveDataTable
          title="Transaction History"
          subtitle={`${filteredTransactions.length} record${filteredTransactions.length !== 1 ? "s" : ""} found`}
          tableMinWidth="1050px"
          onExport={handleExport}
          exportLabel="Export"
          exportBgClass="bg-[#0A4D68] hover:bg-[#083d52]"
          arrowBgClass="bg-cyan-50 border-cyan-200 text-[#0A4D68] hover:bg-cyan-100"
          pagination={
            <Pagination
              currentPage={currentPage}
              totalItems={filteredTransactions.length}
              pageSize={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          }
        >
          <div className="p-4 border-b border-slate-100 flex gap-2 bg-slate-50/30">
            <button
              onClick={() => setActiveTab("booking")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "booking"
                  ? "bg-[#0A4D68] text-white shadow-sm"
                  : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              Bookings & Refunds
            </button>
            <button
              onClick={() => setActiveTab("recharge")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "recharge"
                  ? "bg-[#0A4D68] text-white shadow-sm"
                  : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              Recharge History
            </button>
          </div>

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
                  Description
                </th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest">
                  Order ID
                </th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest">
                  Type
                </th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest">
                  Amount
                </th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <FiRefreshCw
                        className="animate-spin text-slate-300"
                        size={24}
                      />
                      <span className="font-medium text-xs">
                        Loading transactions...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : paginatedTransactions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <FiActivity className="opacity-20" size={32} />
                      <p className="font-semibold text-sm">
                        No transactions found
                      </p>
                      <p className="text-xs">
                        Try adjusting the filters or search query
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((tx) => (
                  <tr
                    key={tx._id}
                    onClick={() => setSelectedTx(tx)}
                    className="hover:bg-slate-900 transition-all border-b border-slate-50 cursor-pointer group"
                  >
                    <td className="px-6 py-4 text-slate-600 font-medium group-hover:text-slate-300">
                      {new Date(tx.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-4 text-slate-800 font-semibold max-w-xs truncate group-hover:text-white transition-colors">
                      {tx.description || "—"}
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-500 text-[11px]">
                      <span className="bg-slate-50/50 px-2 py-0.5 rounded border border-slate-100 group-hover:bg-slate-800 group-hover:border-slate-700 group-hover:text-indigo-400 transition-all">
                        {tx.orderId || tx.reference || tx.bookingId || tx._id}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter transition-all ${
                          tx.type === "credit" || tx.type === "refund"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100 group-hover:bg-emerald-500 group-hover:text-white group-hover:border-emerald-400"
                            : "bg-rose-50 text-rose-700 border border-rose-100 group-hover:bg-rose-500 group-hover:text-white group-hover:border-rose-400"
                        }`}
                      >
                        {tx.type === "credit" || tx.type === "refund" ? (
                          <FiArrowDownLeft size={12} />
                        ) : (
                          <FiArrowUpRight size={12} />
                        )}
                        {tx.type}
                      </span>
                    </td>
                    <td
                      className={`px-6 py-4 font-black text-sm transition-colors ${
                        tx.type === "credit" || tx.type === "refund"
                          ? "text-emerald-600 group-hover:text-emerald-400"
                          : "text-rose-600 group-hover:text-rose-400"
                      }`}
                    >
                      {tx.type === "credit" || tx.type === "refund" ? "+" : "-"} ₹
                      {(tx.amount || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 transition-transform group-hover:scale-105 duration-300">
                      <StatusBadge status={getTransactionStatus(tx)} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </ResponsiveDataTable>
      </div>

      {/* RECHARGE MODAL - Enhanced Real-World Design */}
      {showRecharge && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all duration-300"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowRecharge(false);
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 scale-100 opacity-100 animate-in fade-in zoom-in">
            {/* Header with gradient bar */}
            <div className="relative">
              <div
                className="absolute top-0 left-0 w-full h-1 rounded-t-2xl"
                style={{ backgroundColor: colors.primary }}
              />
              <div className="flex justify-between items-center p-5 pb-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-full bg-[#0A4D68]/10">
                    <FiPlusCircle className="text-[#0A4D68]" size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800">
                    Recharge Wallet
                  </h3>
                </div>
                <button
                  onClick={() => setShowRecharge(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
                  aria-label="Close"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-500 px-5 pb-3">
                Add funds to your corporate wallet securely
              </p>
            </div>

            {/* Amount Input Section */}
            <div className="p-5 pt-2">
              <label className="text-sm font-semibold text-gray-700 block mb-1">
                Enter Amount <span className="text-red-500">*</span>
              </label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-lg">
                  ₹
                </span>
                <input
                  type="number"
                  value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-3 py-3 text-lg border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0A4D68]/30 focus:border-[#0A4D68] transition-all"
                  autoFocus
                />
              </div>

              {/* Quick Amount Buttons */}
              <div className="mt-4">
                <p className="text-xs text-gray-500 mb-2 font-medium">
                  Quick select
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {[1000, 5000, 10000].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setRechargeAmount(amt)}
                      className={`py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                        Number(rechargeAmount) === amt
                          ? "bg-[#0A4D68] text-white border-[#0A4D68] shadow-md"
                          : "bg-white text-gray-700 border-gray-200 hover:border-[#0A4D68] hover:bg-[#0A4D68]/5"
                      }`}
                    >
                      ₹ {amt.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-[#0A4D68]/20 bg-[#0A4D68]/5 px-4 py-3">
                <p className="text-xs font-black uppercase tracking-wider text-[#0A4D68]">
                  Payment gateway
                </p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-800">PhonePe</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Redirect checkout with backend status verification
                    </p>
                  </div>
                  <span className="rounded-full bg-[#0A4D68] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white">
                    Active
                  </span>
                </div>
              </div>

              {/* Optional: Info note */}
              <div className="mt-5 p-3 bg-blue-50 rounded-lg flex items-start gap-2">
                <FiCreditCard
                  className="text-blue-600 mt-0.5 shrink-0"
                  size={14}
                />
                <p className="text-xs text-blue-800">
                  Minimum recharge amount is ₹100. Funds will be credited only
                  after backend verification completes.
                </p>
              </div>
            </div>

            {error ? (
              <div className="px-5 pb-2">
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                  {error}
                </div>
              </div>
            ) : null}

            {/* Actions Buttons */}
            <div className="flex gap-3 p-5 pt-2 border-t border-gray-100">
              <button
                onClick={() => setShowRecharge(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRecharge}
                disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-xl text-white font-medium shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                style={{ backgroundColor: colors.primary }}
              >
                <FiPlusCircle size={16} />
                {loading ? "Starting payment..." : "Continue with PhonePe"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* TRANSACTION DETAILS MODAL */}
      {selectedTx && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md transition-all duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300 border border-white/20">
            {/* Modal Header */}
            <div className="relative bg-slate-900 px-8 py-10 text-white overflow-hidden shrink-0">
               <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-500/20 to-transparent pointer-events-none" />
               <div className="relative z-10 flex justify-between items-start">
                  <div>
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4 inline-block ${selectedTx.type === 'credit' || selectedTx.type === 'refund' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                      {selectedTx.type} Transaction
                    </span>
                    <h3 className="text-3xl font-black tracking-tighter leading-none">
                      {selectedTx.type === 'credit' || selectedTx.type === 'refund' ? '+' : '-'} ₹{(selectedTx.amount || 0).toLocaleString()}
                    </h3>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">
                      Order ID: {selectedTx.orderId || selectedTx.reference || selectedTx.bookingId || selectedTx._id}
                    </p>
                  </div>
                  <button onClick={() => setSelectedTx(null)} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all text-white">
                    <FiX size={20} />
                  </button>
               </div>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="p-10 space-y-10 bg-slate-50/50 overflow-y-auto custom-scrollbar">
               {/* Core Info */}
               <div className="grid grid-cols-2 gap-10">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 italic">Processed Date</p>
                    <p className="text-lg font-black text-slate-900 leading-tight">
                      {new Date(selectedTx.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 italic">Current Status</p>
                    <span className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest inline-block shadow-sm ${
                      getTransactionStatus(selectedTx) === 'completed' || getTransactionStatus(selectedTx) === 'success' 
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                      : getTransactionStatus(selectedTx) === 'failed'
                      ? 'bg-rose-50 text-rose-600 border border-rose-100'
                      : 'bg-amber-50 text-amber-600 border border-amber-100'
                    }`}>
                      {selectedTx.status || 'pending'}
                    </span>
                  </div>
               </div>

               {/* Balance Impact */}
               <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-xl shadow-slate-200/50 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-500" />
                  <div className="relative z-10 grid grid-cols-2 gap-8 divide-x divide-slate-100">
                    <div className="pr-4">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Balance Before</p>
                      <p className="text-xl font-black text-slate-900 font-mono italic">₹{(selectedTx.balanceBefore || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                    </div>
                    <div className="pl-8 text-right">
                      <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2">Balance After</p>
                      <p className="text-xl font-black text-indigo-600 font-mono">₹{(selectedTx.balanceAfter || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                    </div>
                  </div>
               </div>

               {/* Description */}
               <div className="space-y-3">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Description</p>
                  <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                    <p className="text-base font-bold text-slate-700 leading-relaxed">
                      {selectedTx.description || 'No description available'}
                    </p>
                  </div>
               </div>

               {/* Gateway / Metadata */}
               {(selectedTx.paymentGateway || selectedTx.metadata || selectedTx.transactionId) && (
                 <div className="space-y-4">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Payment & Gateway Details</p>
                    <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm space-y-6">
                       <div className="grid grid-cols-2 gap-8">
                          <div>
                             <p className="text-xs font-bold text-slate-400 uppercase italic mb-1.5">Gateway Name</p>
                             <p className="text-sm font-black text-slate-900 uppercase tracking-wide">
                                {selectedTx.paymentGateway?.name || selectedTx.metadata?.gateway || '—'}
                             </p>
                          </div>
                          <div>
                             <p className="text-xs font-bold text-slate-400 uppercase italic mb-1.5">Payment Mode</p>
                             <p className="text-sm font-black text-slate-900 uppercase tracking-wide">
                                {selectedTx.metadata?.gatewayResponse?.statusResponse?.paymentDetails?.[0]?.paymentMode || '—'}
                             </p>
                          </div>
                       </div>

                       {/* Technical Traceability */}
                       <div className="pt-6 border-t border-slate-50 space-y-5">
                          <div>
                             <p className="text-xs font-bold text-slate-400 uppercase italic mb-2">Payment ID / Txn ID</p>
                             <p className="text-sm font-mono font-black text-indigo-600 break-all bg-indigo-50 px-3 py-2 rounded-xl">
                                {selectedTx.transactionId || selectedTx.paymentGateway?.paymentId || '—'}
                             </p>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div>
                                <p className="text-xs font-bold text-slate-400 uppercase italic mb-1.5">Provider Order ID</p>
                                <p className="text-xs font-mono font-bold text-slate-500 break-all">
                                   {selectedTx.paymentGateway?.providerOrderId || '—'}
                                </p>
                             </div>
                             <div>
                                <p className="text-xs font-bold text-slate-400 uppercase italic mb-1.5">ARN / Bank Ref</p>
                                <p className="text-xs font-mono font-bold text-slate-500 break-all">
                                   {selectedTx.metadata?.gatewayResponse?.statusResponse?.paymentDetails?.[0]?.splitInstruments?.[0]?.instrument?.arn || '—'}
                                </p>
                             </div>
                          </div>
                       </div>

                       {/* Rail & Instrument Details */}
                       {selectedTx.metadata?.gatewayResponse?.statusResponse?.paymentDetails?.[0]?.splitInstruments?.[0] && (
                         <div className="pt-6 border-t border-slate-50">
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Gateway Rail & Instrument</p>
                            <div className="grid grid-cols-1 gap-4 bg-slate-50 p-6 rounded-[1.5rem] border border-slate-100">
                               {selectedTx.metadata.gatewayResponse.statusResponse.paymentDetails[0].splitInstruments[0].rail && (
                                 <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                       <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rail Type</span>
                                       <span className="text-xs font-black text-slate-900 uppercase bg-white px-2 py-1 rounded border border-slate-100">{selectedTx.metadata.gatewayResponse.statusResponse.paymentDetails[0].splitInstruments[0].rail.type || '—'}</span>
                                    </div>
                                    {selectedTx.metadata.gatewayResponse.statusResponse.paymentDetails[0].splitInstruments[0].rail.utr && (
                                      <div className="flex justify-between items-center">
                                         <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">UTR Number</span>
                                         <span className="text-sm font-mono font-black text-indigo-600 bg-white px-2 py-1 rounded border border-slate-100">{selectedTx.metadata.gatewayResponse.statusResponse.paymentDetails[0].splitInstruments[0].rail.utr}</span>
                                      </div>
                                    )}
                                    {selectedTx.metadata.gatewayResponse.statusResponse.paymentDetails[0].splitInstruments[0].rail.vpa && (
                                      <div className="flex justify-between items-center">
                                         <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">VPA / UPI ID</span>
                                         <span className="text-sm font-mono font-black text-slate-600 bg-white px-2 py-1 rounded border border-slate-100">{selectedTx.metadata.gatewayResponse.statusResponse.paymentDetails[0].splitInstruments[0].rail.vpa}</span>
                                      </div>
                                    )}
                                 </div>
                               )}
                               
                               {selectedTx.metadata.gatewayResponse.statusResponse.paymentDetails[0].splitInstruments[0].instrument && (
                                 <div className="pt-4 border-t border-slate-200 mt-2 space-y-3">
                                    <div className="flex justify-between items-center">
                                       <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Instrument</span>
                                       <span className="text-xs font-black text-slate-900 uppercase bg-white px-2 py-1 rounded border border-slate-100">{selectedTx.metadata.gatewayResponse.statusResponse.paymentDetails[0].splitInstruments[0].instrument.type || '—'}</span>
                                    </div>
                                    {selectedTx.metadata.gatewayResponse.statusResponse.paymentDetails[0].splitInstruments[0].instrument.bankId && (
                                      <div className="flex justify-between items-center">
                                         <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bank ID</span>
                                         <span className="text-sm font-black text-slate-900">{selectedTx.metadata.gatewayResponse.statusResponse.paymentDetails[0].splitInstruments[0].instrument.bankId}</span>
                                      </div>
                                    )}
                                    {selectedTx.metadata.gatewayResponse.statusResponse.paymentDetails[0].splitInstruments[0].instrument.maskedAccountNumber && (
                                      <div className="flex justify-between items-center">
                                         <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Account</span>
                                         <span className="text-sm font-black text-slate-900">{selectedTx.metadata.gatewayResponse.statusResponse.paymentDetails[0].splitInstruments[0].instrument.maskedAccountNumber}</span>
                                      </div>
                                    )}
                                    {selectedTx.metadata.gatewayResponse.statusResponse.paymentDetails[0].splitInstruments[0].instrument.accountHolderName && (
                                      <div className="flex justify-between items-center">
                                         <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Holder</span>
                                         <span className="text-sm font-black text-slate-900">{selectedTx.metadata.gatewayResponse.statusResponse.paymentDetails[0].splitInstruments[0].instrument.accountHolderName}</span>
                                      </div>
                                    )}
                                 </div>
                               )}
                            </div>
                         </div>
                       )}

                       {selectedTx.metadata?.creditedAt && (
                         <div className="pt-6 border-t border-slate-50">
                            <p className="text-xs font-bold text-slate-400 uppercase italic mb-2">Funds Credited On</p>
                            <p className="text-base font-black text-emerald-600">
                                {new Date(selectedTx.metadata.creditedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                            </p>
                          </div>
                       )}
                    </div>
                 </div>
               )}
            </div>

            {/* Footer */}
            <div className="px-8 py-6 bg-white border-t border-slate-100 flex justify-end">
               <button onClick={() => setSelectedTx(null)} className="px-8 py-2.5 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-full hover:bg-slate-800 transition-all shadow-lg active:scale-95">
                  Dismiss
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
