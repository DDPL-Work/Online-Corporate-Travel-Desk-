import React, { useEffect, useState, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
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
  FiArrowRight,
  FiEye,
  FiHash,
  FiClock,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import { FaRupeeSign } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import {
  LabeledField,
  CustomDropdown,
  SearchBar,
  Th,
  StatCard,
} from "./Shared/CommonComponents";
import { Pagination } from "./Shared/Pagination";
import {
  fetchWalletBalance,
  fetchRechargeHistory,
  fetchBookingTransactions,
  fetchWalletPaymentStatus,
  initiateWalletRecharge,
} from "../../Redux/Slice/walletSlice";
import { C } from "../Shared/color";
import { useNavigate } from "react-router-dom";
import useExcelExporter from "../../hooks/export/useExcelExporter";
import ResponsiveDataTable from "./Shared/ResponsiveDataTable";

const StatusBadge = ({ status }) => {
  const config = {
    success: {
      bg: "#ECFDF5",
      text: "#065F46",
      border: "#A7F3D0",
      label: "Success",
    },
    credit: {
      bg: "#ECFDF5",
      text: "#065F46",
      border: "#A7F3D0",
      label: "Credit",
    },
    debit: {
      bg: "#FEF2F2",
      text: "#991B1B",
      border: "#FECACA",
      label: "Debit",
    },
    pending: {
      bg: "#FFFBEB",
      text: "#92400E",
      border: "#FDE68A",
      label: "Pending",
    },
    failed: {
      bg: "#FEF2F2",
      text: "#991B1B",
      border: "#FECACA",
      label: "Failed",
    },
  };
  const style = config[status] || config.success;
  return (
    <span
      className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm"
      style={{
        backgroundColor: style.bg,
        color: style.text,
        borderColor: style.border,
      }}
    >
      {style.label}
    </span>
  );
};

export default function CorporateWallet() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { balance, currency, transactions, loading, rechargeOrder } =
    useSelector((state) => state.wallet);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [activeTab, setActiveTab] = useState("booking"); // booking | recharge
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showRecharge, setShowRecharge] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);

  const itemsPerPage = 10;
  const pendingStatusSyncRef = useRef(new Map());
  const ledgerScrollRef = useRef(null);

  const handleScroll = (direction) => {
    if (ledgerScrollRef.current) {
      const scrollAmount = direction === "left" ? -300 : 300;
      ledgerScrollRef.current.scrollBy({
        left: scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const handleOpenDetails = (tx) => {
    // If it's a booking transaction (debit) and we have a valid booking ID, navigate to details page
    if (tx.type === "debit" && tx.bookingId?._id) {
      const route =
        tx.bookingModel === "HotelBookingRequest"
          ? `/employee-hotel-booking/${tx.bookingId._id}?source=wallet`
          : `/employee-flight-booking/${tx.bookingId._id}?source=wallet`;
      navigate(route);
      return;
    }

    // Fallback for recharges/adjustments or if booking data is missing
    setSelectedTx(tx);
    setShowDetails(true);
  };

  const handleCloseDetails = () => {
    setShowDetails(false);
    setSelectedTx(null);
  };

  useEffect(() => {
    dispatch(fetchWalletBalance());
  }, [dispatch]);

  useEffect(() => {
    const params = {
      dateFrom: startDate || undefined,
      dateTo: endDate || undefined,
    };
    if (activeTab === "recharge") dispatch(fetchRechargeHistory(params));
    else dispatch(fetchBookingTransactions(params));
    setSearchTerm("");
    setStatusFilter("All");
    setCurrentPage(1);
  }, [dispatch, activeTab, startDate, endDate]);

  const getTransactionStatus = (tx) =>
    tx.status ? tx.status.toLowerCase() : "success";

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
    if (!pendingPhonePeOrderIds.length) return;
    const now = Date.now();
    const orderIdsToSync = pendingPhonePeOrderIds.filter(
      (orderId) =>
        now - (pendingStatusSyncRef.current.get(orderId) || 0) >= 15000,
    );
    if (!orderIdsToSync.length) return;
    orderIdsToSync.forEach((orderId) =>
      pendingStatusSyncRef.current.set(orderId, now),
    );
    let cancelled = false;
    const syncPendingStatuses = async () => {
      let shouldRefreshWallet = false;
      for (const orderId of orderIdsToSync) {
        try {
          const statusResult = await dispatch(
            fetchWalletPaymentStatus({ orderId, gateway: "phonepe" }),
          ).unwrap();
          if (["SUCCESS", "FAILED"].includes(statusResult?.status))
            shouldRefreshWallet = true;
        } catch (error) {
          pendingStatusSyncRef.current.delete(orderId);
        }
      }
      if (cancelled || !shouldRefreshWallet) return;
      dispatch(fetchWalletBalance());
      const params = {
        dateFrom: startDate || undefined,
        dateTo: endDate || undefined,
      };
      if (activeTab === "recharge") dispatch(fetchRechargeHistory(params));
      else dispatch(fetchBookingTransactions(params));
    };
    syncPendingStatuses();
    return () => {
      cancelled = true;
    };
  }, [dispatch, transactions, activeTab, startDate, endDate]);

  const filteredTransactions = useMemo(() => {
    let filtered = transactions || [];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (tx) =>
          tx.description?.toLowerCase().includes(term) ||
          tx._id?.toLowerCase().includes(term) ||
          tx.bookingId?.toLowerCase().includes(term),
      );
    }
    if (statusFilter !== "All")
      filtered = filtered.filter(
        (tx) => getTransactionStatus(tx) === statusFilter.toLowerCase(),
      );
    return [...filtered].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    );
  }, [transactions, searchTerm, statusFilter]);

  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTransactions.slice(start, start + itemsPerPage);
  }, [filteredTransactions, currentPage]);

  const totalCredit = filteredTransactions
    .filter((tx) => tx.type === "credit")
    .reduce((sum, tx) => sum + (tx.amount || 0), 0);
  const totalDebit = filteredTransactions
    .filter((tx) => tx.type === "debit")
    .reduce((sum, tx) => sum + (tx.amount || 0), 0);

  const { exportExcel, isExporting } = useExcelExporter();

  useEffect(() => {
    if (rechargeOrder?.gateway === "phonepe" && rechargeOrder.redirectUrl) {
      window.location.assign(rechargeOrder.redirectUrl);
    }
  }, [rechargeOrder]);

  const handleRecharge = async () => {
    if (!rechargeAmount || rechargeAmount <= 0) return;
    await dispatch(
      initiateWalletRecharge({
        amount: Number(rechargeAmount),
        returnUrl: window.location.href, // Tell PhonePe to redirect directly back here
      })
    );
    setShowRecharge(false);
    setRechargeAmount("");
  };

  return (
    <div
      className="min-h-screen font-sans pb-20 -mt-6 -mx-4 md:-mx-6"
      style={{ background: C.offWhite }}
    >
      <div className="w-full bg-gradient-to-br from-[#003399] to-[#000d26] text-white pt-8 pb-20 px-6 md:px-10">
        <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/10"
              >
                <FiArrowRight className="rotate-180" size={20} />
              </button>
              <button
                onClick={() => dispatch(fetchWalletBalance())}
                className={`p-3 rounded-xl bg-white/10 transition-all border border-white/10 ${loading ? "opacity-50 cursor-not-allowed" : "hover:bg-white/20"}`}
                disabled={loading}
              >
                <div className={loading ? "animate-spin" : ""}>
                  <FiRefreshCw size={20} />
                </div>
              </button>
            </div>

            <div className="h-12 w-[1px] bg-white/10 mx-2 hidden md:block" />

            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl text-white border border-white/10 bg-white/10">
                <FiCreditCard size={28} />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight leading-none">
                  Corporate Wallet
                </h1>
                <p className="text-[10px] mt-2 font-bold uppercase tracking-[2px] opacity-60">
                  Comprehensive Oversight of all Corporate Fund Deployments and
                  Capital Management
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowRecharge(true)}
              className="px-8 py-3.5 rounded-xl font-black text-[11px] bg-gold text-navy hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center gap-2.5 uppercase tracking-widest"
            >
              <FiPlusCircle size={16} /> Initiate Recharge
            </button>
          </div>
        </div>
      </div>

      <div className="w-full px-4 md:px-10 -mt-10 space-y-10">
        <div className="flex gap-2 p-1.5 bg-white border border-slate-200/60 shadow-xl rounded-2xl w-fit">
          {[
            ["booking", "Consumption Ledger", FiArrowUpRight],
            ["recharge", "Wallet Recharge Ledger", FiArrowDownLeft],
          ].map(([k, lbl, Icon]) => (
            <button
              key={k}
              onClick={() => setActiveTab(k)}
              className={`px-8 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2.5 transition-all ${activeTab === k ? "bg-[#000D26] text-white shadow-lg scale-[1.02]" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"}`}
            >
              <Icon size={14} /> {lbl}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            label="Available Asset"
            value={
              loading
                ? "..."
                : `${currency || "₹"} ${(balance || 0).toLocaleString()}`
            }
            Icon={FaRupeeSign}
            borderCls="border-[#000D26]"
            iconBgCls="bg-slate-100"
            iconColorCls="text-[#000D26]"
          />
          <StatCard
            label="Total Capital In"
            value={`₹${totalCredit.toLocaleString()}`}
            Icon={FiArrowDownLeft}
            borderCls="border-emerald-500"
            iconBgCls="bg-emerald-50"
            iconColorCls="text-emerald-600"
          />
          {activeTab !== "recharge" && (
            <StatCard
              label="Total Capital Out"
              value={`₹${totalDebit.toLocaleString()}`}
              Icon={FiArrowUpRight}
              borderCls="border-amber-500"
              iconBgCls="bg-amber-50"
              iconColorCls="text-amber-600"
            />
          )}
          <StatCard
            label="Ledger Entries"
            value={filteredTransactions.length}
            Icon={FiActivity}
            borderCls="border-gold"
            iconBgCls="bg-gold/10"
            iconColorCls="text-gold"
          />
        </div>

        <div
          className="bg-white rounded-3xl p-8 border shadow-sm"
          style={{ borderColor: C.border }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 items-end">
            <div className="lg:col-span-4">
              <LabeledField label="Universal Search">
                <SearchBar
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="Ref ID, booking or description..."
                />
              </LabeledField>
            </div>
            <div className="lg:col-span-4">
              <LabeledField label="Ledger Period">
                <div className="flex items-center gap-3">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-2.5 border rounded-xl text-xs outline-none bg-slate-50 focus:bg-white transition-all"
                    style={{ borderColor: C.border }}
                  />
                  <span className="text-[10px] font-black uppercase text-slate-300">
                    to
                  </span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-2.5 border rounded-xl text-xs outline-none bg-slate-50 focus:bg-white transition-all"
                    style={{ borderColor: C.border }}
                  />
                </div>
              </LabeledField>
            </div>
            <div className="lg:col-span-2">
              <LabeledField label="Execution Status">
                <CustomDropdown
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={["All", "Success", "Pending", "Failed"]}
                />
              </LabeledField>
            </div>
            <div className="lg:col-span-2">
              <button
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("All");
                  setStartDate("");
                  setEndDate("");
                }}
                className="w-full py-2.5 rounded-xl font-black text-[11px] flex items-center justify-center gap-2 border shadow-sm transition-all hover:bg-slate-50 uppercase tracking-widest"
                style={{
                  background: C.white,
                  borderColor: C.border,
                  color: C.muted,
                }}
              >
                <FiX /> Reset Ledger
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl overflow-hidden">
          <div className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black" style={{ color: C.navy }}>
                {activeTab === "booking"
                  ? "Asset Consumption Ledger"
                  : "Wallet Recharge Ledger"}
              </h2>
              <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">
                {filteredTransactions.length} records processed
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleScroll("left")}
                  className="p-2.5 rounded-xl border bg-white hover:bg-slate-50 text-slate-400 hover:text-navy transition-all active:scale-90"
                  style={{ borderColor: C.border }}
                  title="Scroll Left"
                >
                  <FiChevronLeft size={16} />
                </button>
                <button
                  onClick={() => handleScroll("right")}
                  className="p-2.5 rounded-xl border bg-white hover:bg-slate-50 text-slate-400 hover:text-navy transition-all active:scale-90"
                  style={{ borderColor: C.border }}
                  title="Scroll Right"
                >
                  <FiChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>

          <ResponsiveDataTable
            exportLabel="Export Excel"
            exportLoading={isExporting}
            exportDisabled={isExporting}
            onExport={() => exportExcel({
              pageHeader: activeTab === "booking" ? "Asset Consumption Ledger" : "Wallet Recharge Ledger",
              statCards: [
                { label: "Available Asset", value: loading ? "..." : `${currency || "₹"} ${(balance || 0).toLocaleString()}` },
                { label: "Total Capital In", value: `₹${totalCredit.toLocaleString()}` },
                ...(activeTab !== "recharge" ? [{ label: "Total Capital Out", value: `₹${totalDebit.toLocaleString()}` }] : []),
                { label: "Ledger Entries", value: filteredTransactions.length }
              ],
              appliedFilters: [
                { label: "Universal Search", value: searchTerm || "None" },
                { label: "Ledger Period", value: `${startDate || "Any"} to ${endDate || "Any"}` },
                { label: "Execution Status", value: statusFilter }
              ],
              data: filteredTransactions,
              columns: [
                { header: "Date", value: (tx) => new Date(tx.createdAt).toLocaleDateString("en-IN") },
                { header: "Description", value: (tx) => tx.description || "—" },
                { header: "Asset Reference", value: (tx) => tx.orderId || tx.reference || tx._id || tx.bookingId || "—" },
                ...(activeTab === "recharge" ? [{ header: "Payment ID", value: (tx) => tx.paymentGateway?.paymentId || "—" }] : []),
                { header: "Type", value: (tx) => tx.type || "—" },
                { header: "Amount", value: (tx) => `${tx.type === "credit" ? "+" : "-"} ₹${(tx.amount || 0).toLocaleString()}` },
                { header: "Status", value: (tx) => getTransactionStatus(tx) }
              ],
              filenamePrefix: "wallet_ledger"
            })}
            wrapperClass="!border-none !shadow-none"
          >
            <div className="overflow-x-auto" ref={ledgerScrollRef}>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-[#003399] to-[#000d26] text-white">
                  <Th className="!px-6 !py-5">Deployment Date</Th>
                  <Th className="!px-6 !py-5">Mission Protocol</Th>
                  <Th className="!px-6 !py-5">Asset Reference</Th>
                  {/* <Th className="!px-6 !py-5">Category</Th> */}
                  <Th className="!px-6 !py-5">Matrix Type</Th>
                  <Th className="!px-6 !py-5">Capital Flow</Th>
                  <Th className="!px-6 !py-5">Status</Th>
                  <Th className="!px-6 !py-5 text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {paginatedTransactions.map((tx, idx) => {
                  const processorName = tx.processedBy?.name
                    ? `${tx.processedBy.name.firstName || ""} ${tx.processedBy.name.lastName || ""}`.trim()
                    : "System Protocol";
                  const gatewayInfo =
                    tx.paymentGateway?.name || tx.type === "debit"
                      ? "Corporate Asset"
                      : "Direct Recharge";

                  return (
                    <tr
                      key={tx._id}
                      className="hover:bg-slate-50 transition-colors"
                      style={{
                        background: idx % 2 === 0 ? C.white : "#FAF6EB",
                      }}
                    >
                      <td className="px-6 py-5">
                        <p
                          className="text-xs font-black"
                          style={{ color: C.navy }}
                        >
                          {new Date(tx.createdAt).toLocaleDateString("en-IN")}
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">
                          {new Date(tx.createdAt).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </td>
                      <td className="px-6 py-5">
                        <p
                          className="text-xs font-black"
                          style={{ color: C.navy }}
                        >
                          {tx.description || "Travel Asset Procurement"}
                        </p>
                      </td>
                      <td className="px-6 py-5">
                        <code
                          className="text-[10px] font-black px-2 py-1 rounded border uppercase block w-fit mb-1"
                          style={{
                            background: C.white,
                            borderColor: C.border,
                            color: C.muted,
                          }}
                        >
                          {tx.orderId || tx.reference || tx._id}
                        </code>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                          <FiCreditCard size={10} className="text-gold" />{" "}
                          {gatewayInfo}
                        </p>
                      </td>
                      {/* <td className="px-6 py-5">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-[10px] font-black uppercase text-navy border border-slate-200/60 shadow-sm block w-fit mb-1">
                          {tx.bookingModel === "HotelBookingRequest"
                            ? "Hotel"
                            : "Flight"}
                        </span>
                        {tx.bookingId?.orderId && (
                          <p className="text-[9px] font-bold text-gold uppercase tracking-tight">
                            {tx.bookingId.orderId}
                          </p>
                        )}
                      </td> */}
                      <td className="px-6 py-5">
                        <span
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm"
                          style={{
                            backgroundColor:
                              tx.type === "credit" || tx.type === "refund"
                                ? "#ECFDF5"
                                : "#FEF2F2",
                            color:
                              tx.type === "credit" || tx.type === "refund"
                                ? "#065F46"
                                : "#991B1B",
                            borderColor:
                              tx.type === "credit" || tx.type === "refund"
                                ? "#A7F3D0"
                                : "#FECACA",
                          }}
                        >
                          {tx.type === "credit" || tx.type === "refund" ? (
                            <FiArrowDownLeft />
                          ) : (
                            <FiArrowUpRight />
                          )}{" "}
                          {tx.type}
                        </span>
                      </td>
                      <td className="px-6 py-5 font-black text-xs text-left">
                        <span
                          style={{
                            color:
                              tx.type === "credit" || tx.type === "refund"
                                ? "#10B981"
                                : "#EF4444",
                          }}
                        >
                          {tx.type === "credit" || tx.type === "refund"
                            ? "+"
                            : "-"}{" "}
                          ₹{(tx.amount || 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <StatusBadge status={getTransactionStatus(tx)} />
                      </td>
                      <td className="px-6 py-5 text-right">
                        <button
                          onClick={() => handleOpenDetails(tx)}
                          className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-[#003399] transition-all border border-slate-100 hover:border-[#003399]/20"
                          title="View Protocol Details"
                        >
                          <FiEye size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </ResponsiveDataTable>

          <div className="p-6 border-t" style={{ borderColor: C.border }}>
            <Pagination
              currentPage={currentPage}
              totalItems={filteredTransactions.length}
              pageSize={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      </div>

      {showRecharge && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-9999 flex items-center justify-center p-6" style={{ isolation: "isolate" }}>
          <div
            className="absolute inset-0 backdrop-blur-sm animate-in fade-in duration-300"
            style={{ background: `${C.navy}CC` }}
            onClick={() => setShowRecharge(false)}
          />
          <div className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">
            <div
              className="p-10 text-center relative overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${C.navyMid}, ${C.navy})`,
              }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gold/10 rounded-full -mr-16 -mt-16 blur-3xl" />
              <div className="w-20 h-20 rounded-[24px] bg-white/10 flex items-center justify-center mx-auto mb-6 text-white shadow-xl border border-white/10 relative z-10">
                <FiPlusCircle size={40} />
              </div>
              <h3 className="text-3xl font-black text-white tracking-tight leading-none mb-2">
                Wallet Recharge
              </h3>
              <p className="text-[10px] text-white/50 font-black uppercase tracking-[0.3em]">
                Authorized Recharge Protocol
              </p>
            </div>

            <div className="p-10 space-y-8">
              <div className="space-y-2">
                <p
                  className="text-[10px] font-black uppercase tracking-[0.1em]"
                  style={{ color: C.muted }}
                >
                  Transaction Amount (INR)
                </p>
                <div className="relative group">
                  <span
                    className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-2xl transition-colors group-focus-within:text-gold"
                    style={{ color: C.muted }}
                  >
                    ₹
                  </span>
                  <input
                    type="number"
                    value={rechargeAmount}
                    onChange={(e) => setRechargeAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-12 pr-6 py-5 text-3xl font-black rounded-2xl outline-none border-2 transition-all focus:ring-4 focus:ring-gold/5"
                    style={{
                      borderColor: C.border,
                      color: C.navy,
                      background: C.offWhite,
                    }}
                    autoFocus
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[1000, 5000, 10000].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setRechargeAmount(amt)}
                    className="py-4 rounded-xl text-[11px] font-black border-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                      borderColor:
                        Number(rechargeAmount) === amt ? C.gold : C.border,
                      background:
                        Number(rechargeAmount) === amt
                          ? `${C.gold}15`
                          : C.white,
                      color: Number(rechargeAmount) === amt ? C.gold : C.muted,
                    }}
                  >
                    ₹{amt.toLocaleString()}
                  </button>
                ))}
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setShowRecharge(false)}
                  className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all hover:bg-slate-50"
                  style={{ borderColor: C.border, color: C.muted }}
                >
                  Abstain
                </button>
                <button
                  onClick={handleRecharge}
                  className="flex-[2.5] py-4 rounded-2xl font-black text-[10px] text-white uppercase tracking-widest shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] hover:shadow-navy/20"
                  style={{
                    background: `linear-gradient(to right, ${C.navy}, ${C.navyMid})`,
                  }}
                >
                  Initialize Protocol
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
      {/* Recharge Details Modal */}
      {showDetails && selectedTx && (
        <RechargeDetailsModal tx={selectedTx} onClose={handleCloseDetails} />
      )}
    </div>
  );
}

const RechargeDetailsModal = ({ tx, onClose }) => {
  const processorName = tx.processedBy?.name
    ? `${tx.processedBy.name.firstName || ""} ${tx.processedBy.name.lastName || ""}`.trim()
    : "System Protocol";

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 backdrop-blur-sm animate-in fade-in duration-300"
        style={{ background: `${C.navy}99` }}
        onClick={onClose}
      />

      <div
        className="relative w-full max-w-4xl rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border"
        style={{ background: C.white, borderColor: `${C.white}33` }}
      >
        {/* Header */}
        <div
          className="p-8 text-white relative"
          style={{
            background: `linear-gradient(135deg, ${C.navyMid}, ${C.navy})`,
          }}
        >
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest"
                  style={{
                    background: `${C.gold}33`,
                    borderColor: `${C.gold}4D`,
                    color: C.gold,
                  }}
                >
                  Financial Protocol
                </div>
                <div
                  className="px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest"
                  style={{
                    background:
                      tx.status === "completed"
                        ? `${C.emerald}33`
                        : `${C.amber}33`,
                    borderColor:
                      tx.status === "completed"
                        ? `${C.emerald}4D`
                        : `${C.amber}4D`,
                    color: tx.status === "completed" ? C.emerald : C.amber,
                  }}
                >
                  {tx.status}
                </div>
              </div>
              <h2 className="text-2xl font-black tracking-tight leading-none">
                Recharge Registry Details
              </h2>
              <p className="text-white/60 text-[10px] font-bold mt-2 uppercase tracking-[2px]">
                Internal Audit Log Reference: {tx._id}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all border border-white/10"
            >
              <FiX size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8 overflow-y-auto max-h-[60vh]">
          {/* Main Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <DetailItem
              label="Transaction ID"
              value={tx.transactionId || tx._id}
              icon={<FiHash style={{ color: C.gold }} />}
              isCode
            />
            <DetailItem
              label="Amount Processed"
              value={`₹${(tx.amount || 0).toLocaleString()}`}
              icon={<FiActivity style={{ color: C.emerald }} />}
              isBold
            />
            <DetailItem
              label="Execution Date"
              value={new Date(tx.createdAt).toLocaleString("en-IN", {
                day: "2-digit",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
              icon={<FiClock className="text-blue-500" />}
            />
            <DetailItem
              label="Payment Gateway"
              value={tx.paymentGateway?.name?.toUpperCase() || "N/A"}
              icon={<FiCreditCard className="text-violet-500" />}
            />
          </div>

          {/* User Info & Balance Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
              className="rounded-2xl p-6 border"
              style={{ background: C.offWhite, borderColor: C.border }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-lg"
                  style={{
                    background: `linear-gradient(135deg, ${C.navyMid}, ${C.navy})`,
                  }}
                >
                  {tx.processedBy?.name?.firstName?.[0] || "S"}
                  {tx.processedBy?.name?.lastName?.[0] || "P"}
                </div>
                <div>
                  <p
                    className="text-[10px] font-black uppercase tracking-widest mb-1"
                    style={{ color: C.muted }}
                  >
                    Authorizing Administrator
                  </p>
                  <p className="text-sm font-black" style={{ color: C.navy }}>
                    {processorName}
                  </p>
                  <p
                    className="text-[11px] font-bold"
                    style={{ color: C.muted }}
                  >
                    {tx.processedBy?.email ||
                      "system.protocol@corporate.travel"}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div
                className="p-4 rounded-2xl border shadow-sm"
                style={{ background: C.white, borderColor: C.border }}
              >
                <p
                  className="text-[9px] font-black uppercase tracking-widest mb-2"
                  style={{ color: C.muted }}
                >
                  Balance Before
                </p>
                <p className="text-lg font-black" style={{ color: C.muted }}>
                  ₹
                  {parseFloat(tx.balanceBefore || 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
              <div
                className="p-4 rounded-2xl border shadow-sm"
                style={{
                  background: `${C.gold}0D`,
                  borderColor: `${C.gold}33`,
                }}
              >
                <p
                  className="text-[9px] font-black uppercase tracking-widest mb-2"
                  style={{ color: C.gold }}
                >
                  Balance After
                </p>
                <p className="text-lg font-black" style={{ color: C.navy }}>
                  ₹
                  {parseFloat(tx.balanceAfter || 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Technical Metadata */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div
                className="w-1.5 h-4 rounded-full"
                style={{ background: C.gold }}
              />
              <h3
                className="text-xs font-black uppercase tracking-wider"
                style={{ color: C.navy }}
              >
                Protocol Metadata
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
              <DetailRow
                label="Gateway Order Ref"
                value={tx.paymentGateway?.orderId}
              />
              <DetailRow
                label="Gateway Payment Ref"
                value={tx.paymentGateway?.paymentId}
              />
              <DetailRow
                label="Provider Identifier"
                value={tx.paymentGateway?.providerOrderId}
              />
              <DetailRow label="Description" value={tx.description} />
              {tx.metadata?.source && (
                <DetailRow label="Sync Source" value={tx.metadata.source} />
              )}
              {tx.metadata?.creditedAt && (
                <DetailRow
                  label="Credit Time"
                  value={new Date(tx.metadata.creditedAt).toLocaleString()}
                />
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="p-6 border-t flex justify-end"
          style={{ background: C.offWhite, borderColor: C.border }}
        >
          <button
            onClick={onClose}
            className="px-8 py-3 rounded-xl text-white font-black text-xs uppercase tracking-[2px] shadow-xl hover:scale-105 transition-all active:scale-95"
            style={{ background: C.navy }}
          >
            Acknowledge Protocol
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const DetailItem = ({ label, value, icon, isCode, isBold }) => (
  <div className="flex gap-3">
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-sm"
      style={{ background: C.offWhite, borderColor: C.border }}
    >
      {icon}
    </div>
    <div className="min-w-0">
      <p
        className="text-[9px] font-black uppercase tracking-widest mb-1"
        style={{ color: C.muted }}
      >
        {label}
      </p>
      <p
        className={`text-[12px] truncate ${isCode ? "font-mono px-1.5 py-0.5 rounded border" : "font-black"} ${isBold ? "" : ""}`}
        style={{
          background: isCode ? C.offWhite : "transparent",
          borderColor: isCode ? C.border : "transparent",
          color: isBold ? C.navy : C.muted,
        }}
      >
        {value || "—"}
      </p>
    </div>
  </div>
);

const DetailRow = ({ label, value }) => (
  <div
    className="flex justify-between items-center py-2 border-b last:border-0"
    style={{ borderColor: C.border }}
  >
    <p
      className="text-[10px] font-bold uppercase tracking-tight"
      style={{ color: C.muted }}
    >
      {label}
    </p>
    <p
      className="text-[10px] font-black font-mono select-all px-2 py-0.5 rounded border"
      style={{ background: C.offWhite, borderColor: C.border, color: C.navy }}
    >
      {value || "—"}
    </p>
  </div>
);
