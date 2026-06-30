import React, { useEffect, useState, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
  FiDownload,
  FiPlusCircle,
  FiArrowUpRight,
  FiArrowDownLeft,
  FiActivity,
  FiCreditCard,
  FiRefreshCw,
  FiX,
  FiArrowRight,
  FiEye,
  FiHash,
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
  fetchServiceChargeTransactions,
} from "../../Redux/Slice/walletSlice";
import { C } from "../Shared/color";
import { useNavigate, useLocation } from "react-router-dom";
import useExcelExporter from "../../hooks/export/useExcelExporter";
import ResponsiveDataTable from "./Shared/ResponsiveDataTable";
import { StatusBadge, RechargeDetailsModal, ServiceFeeDetailsModal } from "./Modal/CorporateWalletModal";


export default function CorporateWallet() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { balance, currency, transactions, loading, rechargeOrder } =
    useSelector((state) => state.wallet);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [activeTab, setActiveTab] = useState(
    location.state?.returnToWalletFeeTx 
      ? "serviceCharge" 
      : location.state?.returnToWalletTab 
        ? location.state.returnToWalletTab 
        : "booking"
  ); // booking | recharge | serviceCharge
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
    else if (activeTab === "serviceCharge") dispatch(fetchServiceChargeTransactions(params));
    else dispatch(fetchBookingTransactions(params));
    setSearchTerm("");
    setStatusFilter("All");
    setCurrentPage(1);
  }, [activeTab, startDate, endDate, dispatch]);

  useEffect(() => {
    const txId = location.state?.returnToWalletFeeTx || location.state?.returnToWalletTx;
    if (txId && transactions?.length > 0) {
      const tx = transactions.find((t) => t._id === txId);
      if (tx) {
        setSelectedTx(tx);
        setShowDetails(true);
        // Clear the state so it doesn't reopen if the user refreshes the page manually
        const stateCopy = { ...location.state };
        delete stateCopy.returnToWalletFeeTx;
        delete stateCopy.returnToWalletTx;
        delete stateCopy.returnToWalletTab;
        navigate(location.pathname, { replace: true, state: stateCopy });
      }
    }
  }, [location.state?.returnToWalletFeeTx, location.state?.returnToWalletTx, transactions, navigate, location.pathname, location.state]);

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
      else if (activeTab === "serviceCharge") dispatch(fetchServiceChargeTransactions(params));
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
          tx.bookingId?.orderId?.toLowerCase().includes(term) ||
          (typeof tx.bookingId === 'string' && tx.bookingId.toLowerCase().includes(term)),
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
    .filter((tx) => tx.type === "debit" || tx.type === "service_fee_deduction")
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

  const handleRefresh = async () => {
    const params = {
      dateFrom: startDate || undefined,
      dateTo: endDate || undefined,
    };
    await Promise.all([
      dispatch(fetchWalletBalance()),
      activeTab === "recharge"
        ? dispatch(fetchRechargeHistory(params))
        : activeTab === "serviceCharge"
        ? dispatch(fetchServiceChargeTransactions(params))
        : dispatch(fetchBookingTransactions(params))
    ]);
  };

  return (
    <div
      className="min-h-screen font-sans pb-20 -mt-6 -mx-4 md:-mx-6"
      style={{ background: C.offWhite }}
    >
      <div className="w-full bg-gradient-to-br from-[#003399] to-[#000d26] text-white pt-8 pb-20 px-6 md:px-10">
        <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/10"
              >
                <FiArrowRight className="rotate-180" size={20} />
              </button>
              <button
                onClick={handleRefresh}
                className={`p-3 rounded-xl bg-white/10 transition-all border border-white/10 ${loading ? "opacity-50 cursor-not-allowed" : "hover:bg-white/20"}`}
                disabled={loading}
              >
                <div className={loading ? "animate-spin" : ""}>
                  <FiRefreshCw size={20} />
                </div>
              </button>
            </div>

            <div className="h-12 w-[1px] bg-white/10 mx-2 hidden md:block" />

            <div className="flex items-center md:items-center gap-4 md:gap-5">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl flex shrink-0 items-center justify-center shadow-xl text-white border border-white/10 bg-white/10">
                <FiCreditCard size={24} className="md:w-7 md:h-7" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-none">
                  Corporate Wallet
                </h1>
                <p className="text-[9px] md:text-[10px] mt-2 md:mt-3 font-bold uppercase tracking-[2px] opacity-60">
                  Manage corporate funds and capital
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowRecharge(true)}
              className="px-6 md:px-8 py-3.5 rounded-xl font-black text-[10px] md:text-[11px] bg-gold text-navy hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center gap-2.5 uppercase tracking-widest bg-[#C9A240] whitespace-nowrap"
            >
              <FiPlusCircle size={16} className="w-3.5 h-3.5 md:w-4 md:h-4" /> Recharge Wallet
            </button>
          </div>
        </div>
      </div>

      <div className="w-full px-4 md:px-10 -mt-10 space-y-10">
        <div className="w-full md:w-auto">
          {/* Mobile Dropdown */}
          <div className="block md:hidden">
            <CustomDropdown
              value={
                activeTab === "booking"
                  ? "Bookings"
                  : activeTab === "recharge"
                  ? "Recharges"
                  : "Service Charges"
              }
              onChange={(val) => setActiveTab(val)}
              options={[
                { label: "Bookings", value: "booking" },
                { label: "Recharges", value: "recharge" },
                { label: "Service Charges", value: "serviceCharge" },
              ]}
            />
          </div>

          {/* Desktop Tabs */}
          <div className="hidden md:flex gap-2 p-1.5 bg-white border border-slate-200/60 shadow-xl rounded-2xl w-fit">
            {[
              ["booking", "Bookings", FiArrowUpRight],
              ["recharge", "Recharges", FiArrowDownLeft],
              ["serviceCharge", "Service Charges", FiHash],
            ].map(([k, lbl, Icon]) => (
              <button
                key={k}
                onClick={() => setActiveTab(k)}
                className={`px-8 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2.5 transition-all whitespace-nowrap ${activeTab === k ? "bg-[#000D26] text-white shadow-lg scale-[1.02]" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"}`}
              >
                <Icon className="w-3.5 h-3.5" /> {lbl}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <StatCard
            label="Available Balance"
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
          {activeTab === "recharge" && (
            <StatCard
              label="Total Recharged"
              value={`₹${totalCredit.toLocaleString()}` }
              Icon={FiArrowDownLeft}
              borderCls="border-emerald-500"
              iconBgCls="bg-emerald-50"
              iconColorCls="text-emerald-600"
            />
          )}
          {activeTab !== "recharge" && (
            <StatCard
              label="Total Spent"
              value={`₹${totalDebit.toLocaleString()}` }
              Icon={FiArrowUpRight}
              borderCls="border-amber-500"
              iconBgCls="bg-amber-50"
              iconColorCls="text-amber-600"
            />
          )}
          <StatCard
            label="Transactions"
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
              <LabeledField label="Search">
                <SearchBar
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="Search transactions..."
                />
              </LabeledField>
            </div>
            <div className="lg:col-span-4">
              <LabeledField label="Date Range">
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
              <LabeledField label="Status">
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
                <FiX /> Reset Filters
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl overflow-hidden">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center">
              <div className="w-16 h-16 border-[6px] border-slate-100 border-t-[#003399] rounded-full animate-spin mb-6" />
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                Loading Transactions...
              </p>
            </div>
          ) : (
            <ResponsiveDataTable
              title={
                activeTab === "booking"
                  ? "Booking Transactions"
                  : activeTab === "recharge"
                  ? "Recharge Transactions"
                  : "Service Charges Applied"
              }
              subtitle={`${filteredTransactions.length} records found`}
              exportLabel="Export Excel"
              exportLoading={isExporting}
              exportDisabled={isExporting}
              onExport={() =>
                exportExcel({
                  pageHeader:
                    activeTab === "booking"
                      ? "Asset Consumption Ledger"
                      : "Wallet Recharge Ledger",
                  statCards: [
                    {
                      label: "Available Asset",
                      value: loading
                        ? "..."
                        : `${currency || "₹"} ${(balance || 0).toLocaleString()}`,
                    },
                    {
                      label: "Total Capital In",
                      value: `₹${totalCredit.toLocaleString()}`,
                    },
                    ...(activeTab !== "recharge"
                      ? [
                          {
                            label: "Total Capital Out",
                            value: `₹${totalDebit.toLocaleString()}`,
                          },
                        ]
                      : []),
                    {
                      label: "Ledger Entries",
                      value: filteredTransactions.length,
                    },
                  ],
                  appliedFilters: [
                    { label: "Universal Search", value: searchTerm || "None" },
                    {
                      label: "Ledger Period",
                      value: `${startDate || "Any"} to ${endDate || "Any"}`,
                    },
                    { label: "Execution Status", value: statusFilter },
                  ],
                  data: filteredTransactions,
                  columns: [
                    {
                      header: "Date",
                      value: (tx) =>
                        new Date(tx.createdAt).toLocaleDateString("en-IN"),
                    },
                    {
                      header: "Description",
                      value: (tx) => tx.description || "—",
                    },
                    {
                      header: "Reference",
                      value: (tx) =>
                        tx.bookingId?.orderId ||
                        tx.orderId ||
                        tx.reference ||
                        (typeof tx.bookingId === "string" ? tx.bookingId : null) ||
                        tx._id ||
                        "—",
                    },
                    ...(activeTab === "recharge"
                      ? [
                          {
                            header: "Payment ID",
                            value: (tx) => tx.paymentGateway?.paymentId || "—",
                          },
                        ]
                      : []),
                    { header: "Type", value: (tx) => tx.type || "—" },
                    {
                      header: "Amount",
                      value: (tx) => {
                        const amt = tx.amount || 0;
                        return `${
                          tx.type === "credit" ? "+" : "-"
                        } ₹${amt.toLocaleString()}`;
                      },
                    },
                    {
                      header: "Status",
                      value: (tx) => getTransactionStatus(tx),
                    },
                  ],
                  filenamePrefix: "wallet_ledger",
                })
              }
              wrapperClass="!border-none !shadow-none"
              pagination={
                <Pagination
                  currentPage={currentPage}
                  totalItems={filteredTransactions.length}
                  pageSize={itemsPerPage}
                  onPageChange={setCurrentPage}
                />
              }
            >
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-[#003399] to-[#000d26] text-white">
                    <Th className="!px-6 !py-5">Date</Th>
                    <Th className="!px-6 !py-5">Description</Th>
                    <Th className="!px-6 !py-5">Reference</Th>
                    {activeTab !== "recharge" && (
                      <Th className="!px-6 !py-5">Category</Th>
                    )}
                    <Th className="!px-6 !py-5">Type</Th>
                    <Th className="!px-6 !py-5">Amount</Th>
                    <Th className="!px-6 !py-5">Status</Th>
                    <Th className="!px-6 !py-5 text-right">Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTransactions.length > 0 ? (
                    paginatedTransactions.map((tx, idx) => {
                      const processorName = tx.processedBy?.name
                        ? `${tx.processedBy.name.firstName || ""} ${
                            tx.processedBy.name.lastName || ""
                          }`.trim()
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
                              {tx.description || "Travel Booking"}
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
                              {tx.bookingId?.orderId ||
                                tx.orderId ||
                                tx.reference ||
                                (typeof tx.bookingId === "string"
                                  ? tx.bookingId
                                  : null) ||
                                tx._id}
                            </code>
                          </td>
                          {activeTab !== "recharge" && (
                            <td className="px-6 py-5">
                              <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-[10px] font-black uppercase text-navy border border-slate-200/60 shadow-sm block w-fit mb-1">
                                {tx.bookingModel === "HotelBookingRequest"
                                  ? "Hotel"
                                  : tx.bookingModel === "BookingRequest"
                                  ? "Flight"
                                  : tx.type === "credit"
                                  ? "Recharge"
                                  : "Other"}
                              </span>
                            </td>
                          )}
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
                              {tx.type === "service_fee_deduction"
                                ? "Service Fee"
                                : tx.type}
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
                              title="View Details"
                            >
                              <FiEye size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-slate-400 font-bold uppercase tracking-widest text-[11px]">
                        No Transactions Found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </ResponsiveDataTable>
          )}
        </div>
      </div>

      {showRecharge && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 backdrop-blur-sm animate-in fade-in duration-300"
            style={{ background: `${C.navy}99` }}
            onClick={() => setShowRecharge(false)}
          />
          <div
            className="relative w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border"
            style={{ background: C.white, borderColor: `${C.white}33` }}
          >
            {/* Header */}
            <div
              className="p-8 text-white relative"
              style={{
                background: `linear-gradient(135deg, ${C.navyMid}, ${C.navy})`,
              }}
            >
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mr-20 -mt-20 blur-2xl" />
              <div className="flex justify-between items-start relative z-10">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className="px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest"
                      style={{
                        background: `${C.gold}33`,
                        borderColor: `${C.gold}4D`,
                        color: C.gold,
                      }}
                    >
                      Prepaid Wallet
                    </div>
                  </div>
                  <h2 className="text-3xl font-black tracking-tight leading-none">
                    Recharge Balance
                  </h2>
                  <p className="text-white/60 text-xs font-bold mt-2 uppercase tracking-widest">
                    Add funds to your corporate wallet
                  </p>
                </div>
                <button
                  onClick={() => setShowRecharge(false)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all border border-white/10"
                >
                  <FiX size={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-8 space-y-8">
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest" style={{ color: C.navy }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: C.gold }} />
                  Transaction Amount (INR)
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                    <span className="text-3xl font-black text-slate-300 group-focus-within:text-amber-500 transition-colors">
                      ₹
                    </span>
                  </div>
                  <input
                    type="number"
                    value={rechargeAmount}
                    onChange={(e) => setRechargeAmount(e.target.value)}
                    placeholder="0"
                    className="w-full pl-14 pr-6 py-6 text-4xl font-black rounded-2xl outline-none border-2 transition-all placeholder:text-slate-200"
                    style={{
                      borderColor: C.border,
                      color: C.navy,
                      background: C.offWhite,
                    }}
                    onFocus={(e) => (e.target.style.borderColor = C.gold)}
                    onBlur={(e) => (e.target.style.borderColor = C.border)}
                    autoFocus
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {[5000, 10000, 50000].map((amt) => {
                  const isSelected = Number(rechargeAmount) === amt;
                  return (
                    <button
                      key={amt}
                      onClick={() => setRechargeAmount(amt)}
                      className={`py-4 rounded-xl text-xs font-black uppercase tracking-wider border-2 transition-all shadow-sm ${
                        isSelected ? "scale-[1.02]" : "hover:scale-[1.02] hover:bg-slate-50"
                      }`}
                      style={{
                        borderColor: isSelected ? C.navy : C.border,
                        background: isSelected ? C.navy : C.white,
                        color: isSelected ? C.white : C.navy,
                      }}
                    >
                      + ₹{(amt / 1000).toFixed(0)}k
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div
              className="p-6 border-t flex gap-4"
              style={{ background: C.offWhite, borderColor: C.border }}
            >
              <button
                onClick={() => setShowRecharge(false)}
                className="flex-[1] py-4 rounded-xl font-black text-[11px] uppercase tracking-[2px] border transition-all hover:bg-white bg-transparent shadow-sm"
                style={{ borderColor: C.border, color: C.navy }}
              >
                Cancel
              </button>
              <button
                onClick={handleRecharge}
                className="flex-[2] py-4 rounded-xl font-black text-[11px] text-white uppercase tracking-[2px] shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] flex justify-center items-center gap-2"
                style={{
                  background: `linear-gradient(135deg, ${C.navyMid}, ${C.navy})`,
                }}
              >
                Proceed to Pay <FiArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {/* Recharge Details Modal */}
      {showDetails && selectedTx && selectedTx.type !== "service_fee_deduction" && (
        <RechargeDetailsModal tx={selectedTx} onClose={handleCloseDetails} />
      )}
      {/* Service Fee Details Modal */}
      {showDetails && selectedTx && selectedTx.type === "service_fee_deduction" && (
        <ServiceFeeDetailsModal tx={selectedTx} onClose={handleCloseDetails} />
      )}
    </div>
  );
}