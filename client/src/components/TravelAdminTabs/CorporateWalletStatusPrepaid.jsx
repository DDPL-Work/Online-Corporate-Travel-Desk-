import React, { useEffect, useState, useMemo } from "react";
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
} from "react-icons/fi";
import { FaRupeeSign } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchWalletBalance,
  fetchWalletTransactions,
  initiateWalletRecharge,
  verifyWalletPayment,
} from "../../Redux/Slice/walletSlice";
import { Pagination } from "./Shared/Pagination";

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
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
        {label}
      </p>
      <p className="text-xl font-black text-slate-900 leading-none">{value}</p>
    </div>
  </div>
);

const LabeledInput = ({ label, children }) => (
  <div className="flex flex-col gap-1 text-left">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
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
      className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border ${style.bg} ${style.text} ${style.border}`}
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
  } = useSelector((state) => state.wallet);

  // Original filter states
  const [filterType, setFilterType] = useState("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // all | recharge

  // New UI filters (client-side)
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all, success, pending, failed

  // Modal state
  const [showRecharge, setShowRecharge] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState("");

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // INITIAL LOAD (preserved)
  useEffect(() => {
    dispatch(fetchWalletBalance());
    dispatch(fetchWalletTransactions({ page: 1, limit: 10 }));
  }, [dispatch]);

  // APPLY FILTERS (original server-side logic)
  const applyFilters = () => {
    dispatch(
      fetchWalletTransactions({
        page: 1,
        limit: 10,
        type: filterType !== "All" ? filterType.toLowerCase() : undefined,
        dateFrom: startDate || undefined,
        dateTo: endDate || undefined,
      }),
    );
    // Reset pagination and client-side filters when server filters change
    setSearchTerm("");
    setStatusFilter("all");
  };


  // Helper: determine transaction status (fallback to 'success')
  const getTransactionStatus = (tx) => {
    if (tx.status) return tx.status.toLowerCase();
    // If no status field, assume success
    return "success";
  };

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

    // Tab filter (original logic)
    if (activeTab === "recharge") {
      filtered = filtered.filter((t) => t.type === "credit");
    }

    // Sort by newest first (clone to avoid mutating Redux arrays)
    return [...filtered].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    );
  }, [transactions, searchTerm, statusFilter, activeTab]);

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
    const headers = [
      "Date",
      "Description",
      "Transaction ID",
      "Type",
      "Amount",
      "Status",
    ];
    const rows = filteredTransactions.map((tx) => [
      new Date(tx.createdAt).toLocaleDateString(),
      tx.description || "-",
      tx._id || tx.bookingId || "-",
      tx.type,
      `${tx.type === "credit" ? "+" : "-"} ₹${(tx.amount || 0).toLocaleString()}`,
      getTransactionStatus(tx),
    ]);
    const csvContent = [headers, ...rows]
      .map((row) => row.join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "wallet_transactions.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Razorpay logic (preserved exactly as original)
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  useEffect(() => {
    if (!rechargeOrder) return;

    const openRazorpay = async () => {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        alert("Razorpay SDK failed to load");
        return;
      }

      const options = {
        key: rechargeOrder.keyId,
        amount: rechargeOrder.amount,
        currency: rechargeOrder.currency,
        name: "Corporate Wallet Recharge",
        description: "Wallet Top-up",
        order_id: rechargeOrder.orderId,
        handler: function (response) {
          dispatch(
            verifyWalletPayment({
              orderId: rechargeOrder.orderId,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              amount: rechargeOrder.amount,
            }),
          ).then(() => {
            dispatch(fetchWalletBalance());
            dispatch(fetchWalletTransactions());
          });
        },
        theme: { color: colors.primary },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    };

    openRazorpay();
  }, [rechargeOrder, dispatch]);

  const handleRecharge = async () => {
    if (!rechargeAmount || rechargeAmount <= 0) {
      alert("Enter a valid amount");
      return;
    }
    const result = await dispatch(
      initiateWalletRecharge({ amount: Number(rechargeAmount) }),
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
        {/* HEADER with Icon Block (matching postpaid) */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-linear-to-br from-[#0A4D68] to-[#088395] flex items-center justify-center shadow-lg text-white">
            <FiCreditCard size={24} />
          </div>
          <div className="text-left">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">
              Corporate Wallet
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-widest">
              Manage balance & transactions
            </p>
          </div>
          <div className="ml-auto">
            <button
              onClick={() => setShowRecharge(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-lg text-white font-semibold shadow hover:opacity-90"
              style={{ backgroundColor: colors.primary }}
            >
              <FiPlusCircle size={18} />
              Recharge Wallet
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
            label="Total Recharge (Filtered)"
            value={`₹${totalCredit.toLocaleString()}`}
            Icon={FiArrowDownLeft}
            borderCls="border-[#10B981]"
            iconBgCls="bg-emerald-50"
            iconColorCls="text-emerald-600"
          />
          <StatCard
            label="Total Spend (Filtered)"
            value={`₹${totalDebit.toLocaleString()}`}
            Icon={FiArrowUpRight}
            borderCls="border-[#F59E0B]"
            iconBgCls="bg-amber-50"
            iconColorCls="text-amber-600"
          />
          <StatCard
            label="Transactions Count"
            value={totalTransactions}
            Icon={FiActivity}
            borderCls="border-[#088395]"
            iconBgCls="bg-[#088395]/10"
            iconColorCls="text-[#088395]"
          />
        </div>

        {/* FILTERS SECTION (enhanced, but preserves original server filters) */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <LabeledInput label="Search">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Description / ID..."
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

            <LabeledInput label="Transaction Type">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm outline-none bg-slate-50 cursor-pointer focus:border-[#0A4D68]"
              >
                <option>All</option>
                <option>Credit</option>
                <option>Debit</option>
              </select>
            </LabeledInput>

            <LabeledInput label="Status">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm outline-none bg-slate-50 cursor-pointer focus:border-[#0A4D68]"
              >
                <option value="all">All Statuses</option>
                <option value="success">Success</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </LabeledInput>

            <div className="flex items-end gap-2">
              <button
                onClick={applyFilters}
                className="flex-1 text-white rounded-lg px-4 py-2 text-sm font-medium"
                style={{ backgroundColor: colors.primary }}
              >
                Apply
              </button>
              <button
                onClick={handleExport}
                className="flex items-center justify-center gap-2 border rounded-lg px-4 py-2 text-sm font-medium bg-white hover:bg-slate-50 transition"
              >
                <FiDownload /> Export
              </button>
            </div>
          </div>
        </div>

        {/* TRANSACTIONS TABLE with Tabs */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-wrap justify-between items-center gap-4 bg-slate-50/50">
            <h2 className="font-black text-slate-700 uppercase tracking-tighter text-lg">
              Transaction History
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab("all")}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
                  activeTab === "all"
                    ? "bg-[#0A4D68] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                All Transactions
              </button>
              <button
                onClick={() => setActiveTab("recharge")}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
                  activeTab === "recharge"
                    ? "bg-[#0A4D68] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Recharge History
              </button>
            </div>
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
                    Description
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest">
                    Transaction ID
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
                    <td colSpan="6" className="py-8 text-center text-slate-500">
                      Loading transactions...
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-500">
                      No transactions found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr
                      key={tx._id}
                      className="hover:bg-slate-50 transition-all"
                    >
                      <td className="px-6 py-4 text-slate-600 font-medium">
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-slate-800 max-w-xs truncate">
                        {tx.description || "—"}
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-600 text-xs">
                        {tx._id || tx.bookingId || "—"}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            tx.type === "credit"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {tx.type === "credit" ? (
                            <FiArrowDownLeft size={12} />
                          ) : (
                            <FiArrowUpRight size={12} />
                          )}
                          {tx.type}
                        </span>
                      </td>
                      <td
                        className={`px-6 py-4 font-semibold ${
                          tx.type === "credit"
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {tx.type === "credit" ? "+" : "-"} ₹
                        {(tx.amount || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={getTransactionStatus(tx)} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <span>
              Showing {transactions.length} of {pagination?.total || 0}{" "}
              transaction(s)
            </span>
            <Pagination
              currentPage={pagination?.page || 1}
              totalItems={pagination?.total || 0}
              pageSize={pagination?.limit || 10}
              onPageChange={(page) => {
                dispatch(
                  fetchWalletTransactions({
                    page,
                    limit: pagination?.limit || 10,
                    type:
                      filterType !== "All"
                        ? filterType.toLowerCase()
                        : undefined,
                    dateFrom: startDate || undefined,
                    dateTo: endDate || undefined,
                  }),
                );
              }}
            />
          </div>
        </div>
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

              {/* Optional: Info note */}
              <div className="mt-5 p-3 bg-blue-50 rounded-lg flex items-start gap-2">
                <FiCreditCard
                  className="text-blue-600 mt-0.5 shrink-0"
                  size={14}
                />
                <p className="text-xs text-blue-800">
                  Minimum recharge amount is ₹100. Funds will be credited
                  instantly.
                </p>
              </div>
            </div>

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
                className="flex-1 px-4 py-2.5 rounded-xl text-white font-medium shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                style={{ backgroundColor: colors.primary }}
              >
                <FiPlusCircle size={16} />
                Proceed to Pay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
