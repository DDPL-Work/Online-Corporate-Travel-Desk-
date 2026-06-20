import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FiFilter,
  FiDownload,
  FiCheckCircle,
  FiXCircle,
  FiSearch,
  FiCalendar,
  FiCreditCard,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiActivity,
  FiArrowLeft,
  FiRefreshCw,
} from "react-icons/fi";
import { FaRupeeSign } from "react-icons/fa";
import { MdBusiness } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchWalletRechargeLogs } from "../../Redux/Slice/walletRechargeLogsSlice";
import { fetchCorporates } from "../../Redux/Slice/corporateListSlice";
import Pagination from "../Shared/Pagination";
import useExcelExporter from "../../services/export/useExcelExporter";
import { walletRechargeLogsExportTemplate } from "../../templates/exportTemplates/superAdminExportTemplates";

const C = {
  primary: "#003399",
  dark: "#000D26",
  border: "#000D26",
};

export default function WalletRechargeLogs() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const tableScrollRef = useRef(null);
  const { exportExcel, exportingKey } = useExcelExporter();

  // Filter states
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [corporate, setCorporate] = useState("All");
  const [status, setStatus] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [apiPage, setApiPage] = useState(1);

  const { logs, loading, pagination } = useSelector(
    (state) => state.walletRechargeLogs,
  );

  const { corporates: onboardedCorporates } = useSelector(
    (state) => state.corporateList,
  );

  useEffect(() => {
    dispatch(
      fetchWalletRechargeLogs({
        status: status !== "All" ? status.toUpperCase() : undefined,
        corporateId: corporate !== "All" ? corporate : undefined,
        from: startDate || undefined,
        to: endDate || undefined,
        page: apiPage,
        limit: 500,
      }),
    );
  }, [dispatch, status, corporate, startDate, endDate, apiPage]);

  useEffect(() => {
    dispatch(fetchCorporates());
  }, [dispatch]);

  const normalizedLogs = useMemo(() => {
    return logs.map((log) => ({
      id: log._id,
      date: new Date(log.createdAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      time: new Date(log.createdAt).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      corporateName: log.corporateId?.corporateName || "—",
      corporateId: log.corporateId?._id || "—",
      amount: log.amount,
      method: log.gateway === "phonepe"
        ? "PhonePe"
        : log.gateway === "razorpay"
          ? "Razorpay"
          : log.orderId?.startsWith("PHONEPE_")
            ? "PhonePe"
            : log.orderId?.startsWith("RAZORPAY_")
              ? "Razorpay"
              : log.gateway
                ? log.gateway.charAt(0).toUpperCase() + log.gateway.slice(1)
                : "Unknown",
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

  const finalLogs = searchedLogs;

  const ITEMS_PER_PAGE = 10;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return finalLogs.slice(start, start + ITEMS_PER_PAGE);
  }, [finalLogs, currentPage]);

  const corporateOptions = useMemo(() => {
    const fromOnboarded = (onboardedCorporates || []).map(
      (c) => c.corporateName || c.name || c.title,
    );
    const namesFromLogs = normalizedLogs
      .map((l) => l.corporateName)
      .filter((n) => n !== "—");
    const allNames = new Set([...fromOnboarded, ...namesFromLogs]);
    return [
      { label: "All Corporates", value: "All" },
      ...Array.from(allNames).sort().map((n) => ({ label: n, value: n })),
    ];
  }, [onboardedCorporates, normalizedLogs]);

  const totalRecharge = finalLogs.reduce((sum, l) => sum + l.amount, 0);
  const successCount = finalLogs.filter((l) => l.status === "Success").length;
  const failedCount = finalLogs.filter((l) => l.status === "Failed").length;
  const pendingCount = finalLogs.filter((l) => l.status === "Pending").length;

  const isExporting = exportingKey === "wallet_recharge_logs";

  const updateFilter = (setter, value) => {
    setCurrentPage(1);
    setApiPage(1);
    setter(value);
  };

  const refreshLogs = () => {
    dispatch(
      fetchWalletRechargeLogs({
        status: status !== "All" ? status.toUpperCase() : undefined,
        corporateId: corporate !== "All" ? corporate : undefined,
        from: startDate || undefined,
        to: endDate || undefined,
        page: apiPage,
        limit: 500,
      }),
    );
  };

  const handleExport = () => {
    if (loading) return;

    const statCards = [
      { label: "Total Recharge", value: `₹${totalRecharge.toLocaleString("en-IN")}` },
      { label: "Successful", value: successCount },
      { label: "Failed", value: failedCount },
      { label: "Pending", value: pendingCount },
    ];

    const appliedFilters = [
      { label: "Search", value: searchTerm || "None" },
      { label: "From Date", value: startDate || "Any" },
      { label: "To Date", value: endDate || "Any" },
      { label: "Corporate", value: corporate },
      { label: "Status", value: status },
    ];

    exportExcel({
      key: "wallet_recharge_logs",
      pageHeader: "Wallet Recharge Logs",
      statCards,
      appliedFilters,
      data: finalLogs,
      columns: walletRechargeLogsExportTemplate,
      filenamePrefix: "wallet_recharge_logs_export",
      emptyMessage: "No wallet recharge logs available to export",
      successMessage: "Wallet recharge logs exported",
    });
  };

  const handleScroll = (direction) => {
    if (tableScrollRef.current) {
      tableScrollRef.current.scrollBy({
        left: direction === "left" ? -300 : 300,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans -mt-6 -mx-4 md:-mx-6">

      {/* ── NAVY BANNER HEADER ── */}
      <div
        className="w-full px-6 md:px-10 pt-8 pb-20"
        style={{ background: `linear-gradient(135deg, ${C.primary} 0%, ${C.dark} 100%)` }}
      >
        <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/10 text-white shadow-sm"
                aria-label="Go back"
              >
                <FiArrowLeft size={20} />
              </button>
              <button
                type="button"
                onClick={refreshLogs}
                disabled={loading}
                className={`p-3 rounded-xl bg-white/10 transition-all border border-white/10 text-white shadow-sm ${loading ? "opacity-50 cursor-not-allowed" : "hover:bg-white/20"}`}
                aria-label="Refresh wallet recharge logs"
              >
                <FiRefreshCw size={20} className={loading ? "animate-spin" : ""} />
              </button>
            </div>

            <div className="hidden md:block h-12 w-px bg-white/10 mx-2" />

            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl text-white border border-white/10 bg-white/10">
                <FaRupeeSign size={28} />
              </div>
              <div>
                <h1 className="text-3xl font-black text-white tracking-tight leading-none">
                  Wallet Recharge Logs
                </h1>
                <p className="text-[10px] mt-2 font-bold uppercase tracking-[2px] opacity-60">
                  Monitor all wallet transactions
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── PULL-UP CONTENT ── */}
      <div className="w-full px-4 md:px-10 -mt-10 space-y-10">

        {/* KPI STAT CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            label="Total Recharge"
            value={`₹${totalRecharge.toLocaleString("en-IN")}`}
            icon={<FaRupeeSign />}
            borderCls="border-[#000D26]"
            iconBgCls="bg-slate-100"
            iconColorCls="text-[#000D26]"
          />
          <KPICard
            label="Successful"
            value={successCount}
            icon={<FiCheckCircle />}
            borderCls="border-emerald-500"
            iconBgCls="bg-emerald-50"
            iconColorCls="text-emerald-600"
          />
          <KPICard
            label="Failed"
            value={failedCount}
            icon={<FiXCircle />}
            borderCls="border-rose-500"
            iconBgCls="bg-rose-50"
            iconColorCls="text-rose-600"
          />
          <KPICard
            label="Pending"
            value={pendingCount}
            icon={<FiClock />}
            borderCls="border-amber-500"
            iconBgCls="bg-amber-50"
            iconColorCls="text-amber-600"
          />
        </div>

        {/* FILTER SECTION */}
        <div className="bg-white rounded-2xl p-6 border shadow-sm" style={{ borderColor: C.border + "20" }}>
          <div className="flex items-center gap-2 mb-4">
            <FiFilter size={14} className="text-slate-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Filters</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">

            {/* Search */}
            <div className="xl:col-span-2 flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <FiSearch size={12} /> Search
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Company / ID / Order / Payment..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-[13px] font-medium outline-none transition-all focus:border-[#003399] focus:ring-2 focus:ring-[#003399]/10 bg-slate-50 hover:bg-white"
                />
                <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              </div>
            </div>

            {/* From Date */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <FiCalendar size={12} /> From Date
              </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => updateFilter(setStartDate, e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-[13px] font-medium outline-none transition-all focus:border-[#003399] focus:ring-2 focus:ring-[#003399]/10 bg-slate-50 hover:bg-white"
                />
            </div>

            {/* To Date */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <FiCalendar size={12} /> To Date
              </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => updateFilter(setEndDate, e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-[13px] font-medium outline-none transition-all focus:border-[#003399] focus:ring-2 focus:ring-[#003399]/10 bg-slate-50 hover:bg-white"
                />
            </div>

            {/* Corporate */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <MdBusiness size={12} /> Corporate
              </label>
              <CustomSelect
                value={corporate}
                onChange={(value) => updateFilter(setCorporate, value)}
                options={corporateOptions}
              />
            </div>

            {/* Status */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <FiCheckCircle size={12} /> Status
              </label>
              <CustomSelect
                value={status}
                onChange={(value) => updateFilter(setStatus, value)}
                options={[
                  { label: "All Statuses", value: "All" },
                  { label: "Success", value: "Success" },
                  { label: "Failed", value: "Failed" },
                  { label: "Pending", value: "Pending" },
                ]}
              />
            </div>
          </div>
        </div>

        {/* TABLE SECTION */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-800 uppercase tracking-tighter leading-none">
                Recharge Records
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1.5">
                Granular view of wallet activity
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleExport}
                disabled={loading || isExporting}
                className="flex items-center gap-2 px-4 py-2 bg-[#003399] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#002266] transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-[#003399]/30 disabled:opacity-50"
              >
                <FiDownload size={14} />
                {isExporting ? "Exporting..." : "Export"}
              </button>

              <div className="w-px h-6 bg-slate-200 mx-1" />

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleScroll("left")}
                  className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors focus:outline-none"
                  aria-label="Scroll left"
                >
                  <FiChevronLeft size={16} />
                </button>
                <button
                  onClick={() => handleScroll("right")}
                  className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors focus:outline-none"
                  aria-label="Scroll right"
                >
                  <FiChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>

          <div ref={tableScrollRef} className="overflow-x-auto min-h-64">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#003399] mb-4" />
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                  Loading recharge logs...
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse" style={{ minWidth: "900px" }}>
                <thead>
                  <tr className="bg-linear-to-r from-[#003399] to-[#000d26] text-white">
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest opacity-90 whitespace-nowrap">Date</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest opacity-90 whitespace-nowrap">Corporate</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest opacity-90 whitespace-nowrap">Amount</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest opacity-90 whitespace-nowrap">Method</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest opacity-90 whitespace-nowrap">Order ID</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest opacity-90 whitespace-nowrap">Payment ID</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest opacity-90 whitespace-nowrap text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {finalLogs.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-20 text-center">
                        <div className="flex flex-col items-center">
                          <FiActivity size={40} className="text-slate-200 mb-3" />
                          <p className="text-slate-400 font-bold uppercase text-xs">
                            No recharge logs found
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition-all group">

                        {/* Date */}
                        <td className="px-6 py-3.5 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-[12.5px] text-slate-700 font-bold">{log.date}</span>
                            <span className="text-[10px] text-slate-400 font-medium">{log.time}</span>
                          </div>
                        </td>

                        {/* Corporate */}
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 font-black text-[14px] capitalize group-hover:bg-[#003399]/10 group-hover:text-[#003399] transition-colors">
                              {(log.corporateName?.[0] || "?")}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-black text-[12.5px] text-slate-700 whitespace-nowrap">
                                {log.corporateName}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono truncate max-w-40">
                                {log.corporateId}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="px-6 py-3.5 whitespace-nowrap">
                          <span className="text-[14px] font-black text-slate-900 tracking-tight">
                            ₹{log.amount.toLocaleString("en-IN")}
                          </span>
                        </td>

                        {/* Method */}
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                              <FiCreditCard className="text-blue-500" size={14} />
                            </span>
                            <span className="text-[12.5px] font-bold text-slate-600">{log.method}</span>
                          </div>
                        </td>

                        {/* Order ID */}
                        <td className="px-6 py-3.5">
                          <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                            {log.orderId}
                          </span>
                        </td>

                        {/* Payment ID */}
                        <td className="px-6 py-3.5">
                          <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                            {log.paymentId}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-3.5 text-center">
                          <StatusBadge status={log.status} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination Footer */}
          <div className="bg-slate-50/80 px-6 py-4 border-t border-slate-100 flex justify-between items-center">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Showing {finalLogs.length} recharge(s)
            </span>
            <Pagination
              currentPage={currentPage}
              totalPages={pagination?.total ? Math.max(1, Math.ceil(pagination.total / ITEMS_PER_PAGE)) : Math.max(1, Math.ceil(finalLogs.length / ITEMS_PER_PAGE))}
              onPageChange={(page) => {
                setCurrentPage(page);
                const requiredApiPage = Math.ceil((page * ITEMS_PER_PAGE) / 500);
                if (requiredApiPage > apiPage && requiredApiPage <= (pagination?.pages || 1)) {
                  setApiPage(requiredApiPage);
                }
              }}
              showFirstLast={true}
            />
          </div>
        </div>

        {/* bottom spacing */}
        <div className="h-6" />
      </div>
    </div>
  );
}

/* ─── SUB-COMPONENTS ─── */

function CustomSelect({ value, onChange, options, className = "" }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => String(opt.value) === String(value)) || options[0];

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] font-medium hover:bg-white hover:border-[#003399]/30 transition-all focus:outline-none focus:ring-2 focus:ring-[#003399]/10"
      >
        <span className="truncate text-slate-700">{selectedOption?.label}</span>
        <FiChevronDown className={`text-slate-400 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} size={16} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-100 rounded-xl shadow-lg shadow-slate-200/50 py-1 max-h-60 overflow-y-auto">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setIsOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-[13px] font-medium transition-colors hover:bg-slate-50 flex items-center justify-between ${
                String(value) === String(opt.value) ? "text-[#003399] bg-[#003399]/5" : "text-slate-600"
              }`}
            >
              <span className="truncate">{opt.label}</span>
              {String(value) === String(opt.value) && (
                <FiCheckCircle size={14} className="shrink-0 text-[#003399]" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function KPICard({ label, value, icon, borderCls, iconBgCls, iconColorCls }) {
  const bCls = borderCls || "border-[#000D26]";
  const bgCls = iconBgCls || "bg-slate-100";
  const cCls = iconColorCls || "text-[#000D26]";

  return (
    <div className={`bg-white rounded-2xl p-6 border-b-4 ${bCls} shadow-sm flex items-center justify-between`}>
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
          {label}
        </p>
        <h3 className="text-3xl font-black text-slate-800">
          {value}
        </h3>
      </div>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bgCls} ${cCls}`}>
        {icon}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const config = {
    Success: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-100", dot: "bg-emerald-500" },
    Failed:  { bg: "bg-rose-50",    text: "text-rose-700",    border: "border-rose-100",    dot: "bg-rose-500" },
    Pending: { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-100",   dot: "bg-amber-500" },
  };
  const s = config[status] || config.Pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${s.bg} ${s.text} ${s.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {status}
    </span>
  );
}
