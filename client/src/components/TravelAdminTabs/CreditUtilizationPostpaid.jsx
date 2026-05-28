import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  FiCreditCard,
  FiActivity,
  FiDollarSign,
  FiChevronRight,
  FiRefreshCw,
  FiCalendar,
  FiDownload,
  FiClock,
  FiArrowRight,
  FiArrowUpRight,
  FiArrowDownLeft,
  FiSearch,
  FiX,
  FiChevronLeft,
  FiEye,
} from "react-icons/fi";
import { FaRupeeSign } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchPostpaidBalance,
  fetchPostpaidTransactions,
  fetchPreviousCycles,
  fetchCycleTransactions,
} from "../../Redux/Actions/postpaidThunks";
import { getAllEmployeesAdmin } from "../../Redux/Actions/travelAdmin.thunks";
import { clearCycleTransactions } from "../../Redux/Slice/postpaidSlice";
import {
  LabeledField,
  CustomDropdown,
  SearchBar,
  Th,
  StatCard,
} from "./Shared/CommonComponents";
import { Pagination } from "./Shared/Pagination";
import { C } from "../Shared/color";
import { useNavigate } from "react-router-dom";
import { airlineLogo } from "../../utils/formatter";
import ResponsiveDataTable from "./Shared/ResponsiveDataTable";

const fmt = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";
const fmtAmt = (n) =>
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const calculateDelayDays = ({ dueDate, statementAmount, receivedAmount, paymentReceivedAt }) => {
  if (!dueDate) return 0;
  if (Number(statementAmount || 0) <= 0) return 0;
  const normalizedDueDate = new Date(dueDate);
  const paidInFull = Number(receivedAmount || 0) >= Number(statementAmount || 0);
  const stopAt = paidInFull && paymentReceivedAt ? new Date(paymentReceivedAt) : new Date();
  return stopAt > normalizedDueDate
    ? Math.floor((stopAt.getTime() - normalizedDueDate.getTime()) / 86400000)
    : 0;
};

const DRILL_PAGE_SIZE = 10;

const StatusBadge = ({ status }) => {
  const config = {
    paid: {
      bg: "#ECFDF5",
      text: "#065F46",
      border: "#A7F3D0",
      label: "RESOLVED",
    },
    billed: {
      bg: "#ECFEFF",
      text: "#155E75",
      border: "#A5F3FC",
      label: "BILLED",
    },
    pending: {
      bg: "#FFFBEB",
      text: "#92400E",
      border: "#FDE68A",
      label: "PENDING",
    },
    failed: {
      bg: "#FEF2F2",
      text: "#991B1B",
      border: "#FECACA",
      label: "FAILED",
    },
  };
  const style = config[status?.toLowerCase()] || config.pending;
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

export default function CreditUtilizationPostpaid() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("current");
  const [drillCycle, setDrillCycle] = useState(null);
  const [drillPage, setDrillPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [canScroll, setCanScroll] = useState(false);
  const scrollRef = useRef(null);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollWidth, clientWidth } = scrollRef.current;
      setCanScroll(scrollWidth > clientWidth);
    }
  };

  const {
    balance,
    loadingBalance,
    transactions,
    loadingTransactions,
    previousCycles,
    loadingCycles,
    cycleTransactions,
    loadingCycleTransactions,
  } = useSelector((s) => s.postpaid || {});

  const { allEmployees: companyUsers = [] } = useSelector((s) => s.adminBooking || {});
  const { corporate } = useSelector((s) => s.corporateAdmin || {});

  const daysRemaining = useMemo(() => {
    if (!balance?.currentCycleEnd) return null;
    return Math.max(
      0,
      Math.ceil(
        (new Date(balance.currentCycleEnd).getTime() - Date.now()) / 86400000,
      ),
    );
  }, [balance]);

  const pct = balance
    ? Math.min(
        100,
        ((balance.usedCredit || 0) / (balance.totalLimit || 1)) * 100,
      )
    : 0;
  const pctColor = pct > 85 ? "#EF4444" : pct > 60 ? "#F59E0B" : "#10B981";

  const currentCycleRow = useMemo(() => {
    if (!balance) return null;
    const stmtDate = balance.currentCycleEnd
      ? new Date(new Date(balance.currentCycleEnd).getTime() + 86400000)
      : null;
    const dueDays = corporate?.dueDays ?? 15;
    const dueDate = stmtDate
      ? new Date(stmtDate.getTime() + dueDays * 86400000)
      : null;
    const delayDays =
      dueDate && new Date() > dueDate
        ? Math.floor((Date.now() - dueDate.getTime()) / 86400000)
        : 0;
    return {
      rowNum: 1,
      cycleIndex: "current",
      statementId: "ACTIVE SESSION",
      trackId: "—",
      periodStart: balance.currentCycleStart,
      periodEnd: balance.currentCycleEnd,
      statementDate: stmtDate,
      dueDate,
      delayDays,
      statementAmount: balance.usedCredit || 0,
      isCurrent: true,
    };
  }, [balance, corporate]);

  const displayStats = useMemo(() => {
    if (drillCycle) {
      const used = drillCycle.statementAmount || 0;
      const limit = balance?.totalLimit || 0;
      // In the context of a historical statement, available credit is the unused portion of that limit
      const available = Math.max(0, limit - used);
      const density = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
      return {
        totalLimit: limit,
        usedCredit: used,
        availableCredit: available,
        pct: density,
        usedLabel: drillCycle.isCurrent ? "Active Usage" : "Statement Usage",
        availableLabel: drillCycle.isCurrent ? "Current Liquidity" : "Statement Liquidity",
        isHistorical: !drillCycle.isCurrent
      };
    }
    return {
      totalLimit: balance?.totalLimit || 0,
      usedCredit: balance?.usedCredit || 0,
      availableCredit: balance?.availableCredit || 0,
      pct: balance ? Math.min(100, ((balance.usedCredit || 0) / (balance.totalLimit || 1)) * 100) : 0,
      usedLabel: "Deployed Capital",
      availableLabel: "Available Liquidity",
      isHistorical: false
    };
  }, [drillCycle, balance]);

  useEffect(() => {
    dispatch(fetchPostpaidBalance());
    dispatch(getAllEmployeesAdmin());
  }, [dispatch]);

  useEffect(() => {
    if (activeTab === "previous" && !drillCycle)
      dispatch(fetchPreviousCycles());
  }, [dispatch, activeTab, drillCycle]);

  useEffect(() => {
    if (!drillCycle || !drillCycle.isCurrent) return;
    dispatch(
      fetchPostpaidTransactions({
        startDate: balance?.currentCycleStart?.split("T")[0],
        endDate: balance?.currentCycleEnd?.split("T")[0],
        page: 1,
        limit: 500,
      }),
    );
  }, [dispatch, drillCycle, balance]);

  useEffect(() => {
    if (!drillCycle || drillCycle.isCurrent) return;
    dispatch(fetchCycleTransactions({ cycleIndex: drillCycle.cycleIndex }));
  }, [dispatch, drillCycle]);


  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    setDrillCycle(null);
    dispatch(clearCycleTransactions());
  };

  const handleBack = () => {
    setDrillCycle(null);
    setDrillPage(1);
    dispatch(clearCycleTransactions());
  };

  // `handleExport` is now handled by ResponsiveDataTable's exportConfig

  const handleScroll = (dir) => {
    if (scrollRef.current) {
      const amount = 300;
      scrollRef.current.scrollBy({
        left: dir === "left" ? -amount : amount,
        behavior: "smooth",
      });
    }
  };

  const drillTx = useMemo(() => {
    let txs = drillCycle?.isCurrent
      ? transactions || []
      : cycleTransactions || [];

    // Filter by Search Term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      txs = txs.filter(
        (t) =>
          t.bookingReference?.toLowerCase().includes(term) ||
          String(t._id).toLowerCase().includes(term) ||
          t.description?.toLowerCase().includes(term),
      );
    }

    // Filter by Date Range
    if (fromDate) {
      const fDate = new Date(fromDate).setHours(0, 0, 0, 0);
      txs = txs.filter((t) => new Date(t.createdAt).getTime() >= fDate);
    }
    if (toDate) {
      const tDate = new Date(toDate).setHours(23, 59, 59, 999);
      txs = txs.filter((t) => new Date(t.createdAt).getTime() <= tDate);
    }

    // Filter by Employee
    if (selectedEmployee) {
      txs = txs.filter((t) => t.userId?._id === selectedEmployee);
    }

    // Filter by Type
    if (selectedType) {
      txs = txs.filter((t) => {
        const isHotel = t.description?.toLowerCase().includes("hotel") || t.bookingModel === "HotelBookingRequest";
        return selectedType === "hotel" ? isHotel : !isHotel;
      });
    }

    // Sorting
    const sorted = [...txs].sort((a, b) => {
      if (sortBy === "lowToHigh") return a.amount - b.amount;
      if (sortBy === "highToLow") return b.amount - a.amount;
      if (sortBy === "oldest") return new Date(a.createdAt) - new Date(b.createdAt);
      return new Date(b.createdAt) - new Date(a.createdAt); // newest
    });

    return sorted;
  }, [drillCycle, transactions, cycleTransactions, searchTerm, fromDate, toDate, selectedEmployee, selectedType, sortBy]);

  useEffect(() => {
    checkScroll();
    const timer = setTimeout(checkScroll, 100);
    window.addEventListener("resize", checkScroll);
    return () => {
      window.removeEventListener("resize", checkScroll);
      clearTimeout(timer);
    };
  }, [drillTx, drillCycle]);

  const drillLoading = drillCycle?.isCurrent
    ? loadingTransactions
    : loadingCycleTransactions;

  const paginatedDrillTx = useMemo(() => {
    return drillTx.slice(
      (drillPage - 1) * DRILL_PAGE_SIZE,
      drillPage * DRILL_PAGE_SIZE,
    );
  }, [drillTx, drillPage]);

  return (
    <div
      className="min-h-screen font-sans pb-20 -mt-6 -mx-4 md:-mx-6"
      style={{ background: C.offWhite }}
    >
      {/* Premium Header */}
      <div className="w-full bg-gradient-to-br from-[#003399] to-[#000d26] text-white pt-8 pb-20 px-6 md:px-10">
        <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => (drillCycle ? handleBack() : navigate(-1))}
                className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/10"
              >
                <FiArrowRight className="rotate-180" size={20} />
              </button>
              <button
                onClick={() => dispatch(fetchPostpaidBalance())}
                className={`p-3 rounded-xl bg-white/10 transition-all border border-white/10 ${loadingBalance ? "opacity-50 cursor-not-allowed" : "hover:bg-white/20"}`}
                disabled={loadingBalance}
              >
                <div className={loadingBalance ? "animate-spin" : ""}>
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
                  Strategic Credit Ledger
                </h1>
                <p className="text-[10px] mt-2 font-bold uppercase tracking-[2px] opacity-60">
                  Comprehensive Oversight of all Postpaid Corporate Fund
                  Deployments
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden lg:flex items-center gap-3 px-4 py-2 bg-white/5 rounded-xl border border-white/10">
              <FiClock className="text-gold" size={16} />
              <div>
                <p className="text-[9px] font-black uppercase opacity-50 leading-none mb-1">
                  Reset Countdown
                </p>
                <p className="text-xs font-black text-gold">
                  {daysRemaining} Strategic Days
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 md:px-10 -mt-10 space-y-10">
        {/* Tabs */}
        <div className="flex gap-2 p-1.5 bg-white border border-slate-200/60 shadow-xl rounded-2xl w-fit">
          {[
            ["current", "Active Statement", FiActivity],
            ["previous", "Archive Registry", FiCalendar],
          ].map(([k, lbl, Icon]) => (
            <button
              key={k}
              onClick={() => handleTabSwitch(k)}
              className={`px-8 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2.5 transition-all ${activeTab === k ? "bg-[#000D26] text-white shadow-lg scale-[1.02]" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"}`}
            >
              <Icon size={14} /> {lbl}
            </button>
          ))}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            label="Total Credit Limit"
            value={loadingBalance ? "..." : `₹${fmtAmt(displayStats.totalLimit)}`}
            Icon={FaRupeeSign}
            borderCls="border-[#000D26]"
            iconBgCls="bg-slate-100"
            iconColorCls="text-[#000D26]"
          />
          <StatCard
            label={displayStats.usedLabel}
            value={loadingBalance ? "..." : `₹${fmtAmt(displayStats.usedCredit)}`}
            Icon={FiActivity}
            borderCls="border-amber-500"
            iconBgCls="bg-amber-50"
            iconColorCls="text-amber-600"
          />
          <StatCard
            label={displayStats.availableLabel}
            value={
              loadingBalance
                ? "..."
                : `₹${fmtAmt(Math.abs(displayStats.availableCredit))}`
            }
            Icon={FiDollarSign}
            borderCls={
              displayStats.availableCredit < 0
                ? "border-red-500"
                : "border-emerald-500"
            }
            iconBgCls={
              displayStats.availableCredit < 0 ? "bg-red-50" : "bg-emerald-50"
            }
            iconColorCls={
              displayStats.availableCredit < 0 ? "text-red-600" : "text-emerald-600"
            }
          />
          <div
            className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60 flex flex-col justify-between"
            style={{ borderLeftWidth: "4px", borderLeftColor: pctColor }}
          >
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
              {displayStats.isHistorical ? "Statement Density" : "Capital Density"}
            </p>
            <div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{ width: `${displayStats.pct}%`, backgroundColor: pctColor }}
                />
              </div>
              <p
                className="text-xl font-black text-right leading-none"
                style={{ color: pctColor }}
              >
                {displayStats.pct.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        {/* Drill Down Filters */}
        {drillCycle && (
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
                    placeholder="Search Reference, ID..."
                  />
                </LabeledField>
              </div>
              <div className="lg:col-span-2">
                <LabeledField label="From Date">
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold outline-none focus:border-amber-500 transition-all"
                  />
                </LabeledField>
              </div>
              <div className="lg:col-span-2">
                <LabeledField label="To Date">
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold outline-none focus:border-amber-500 transition-all"
                  />
                </LabeledField>
              </div>
              <div className="lg:col-span-2">
                <LabeledField label="Employee">
                  <CustomDropdown
                    value={selectedEmployee}
                    onChange={setSelectedEmployee}
                    options={[
                      { value: "", label: "All Personnel" },
                      ...(companyUsers || []).map((u) => ({
                        value: u._id,
                        label: `${u.name?.firstName} ${u.name?.lastName}`,
                      })),
                    ]}
                  />
                </LabeledField>
              </div>
              <div className="lg:col-span-2">
                <LabeledField label="Booking Type">
                  <CustomDropdown
                    value={selectedType}
                    onChange={setSelectedType}
                    options={[
                      { value: "", label: "All Assets" },
                      { value: "flight", label: "Flights Only" },
                      { value: "hotel", label: "Hotels Only" },
                    ]}
                  />
                </LabeledField>
              </div>
              <div className="lg:col-span-3">
                <LabeledField label="Sort Strategy">
                  <CustomDropdown
                    value={sortBy}
                    onChange={setSortBy}
                    options={[
                      { value: "newest", label: "Newest First" },
                      { value: "oldest", label: "Oldest First" },
                      { value: "lowToHigh", label: "Amount: Low to High" },
                      { value: "highToLow", label: "Amount: High to Low" },
                    ]}
                  />
                </LabeledField>
              </div>
              <div className="lg:col-span-9 flex justify-end">
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setFromDate("");
                    setToDate("");
                    setSelectedEmployee("");
                    setSelectedType("");
                    setSortBy("newest");
                  }}
                  className="px-8 py-2.5 rounded-xl font-black text-[11px] flex items-center justify-center gap-2 border shadow-sm transition-all hover:bg-slate-50 uppercase tracking-widest"
                  style={{
                    background: C.white,
                    borderColor: C.border,
                    color: C.muted,
                  }}
                >
                  <FiX /> Reset All Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Ledger Section */}
        <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-200/60">
          <div className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black" style={{ color: C.navy }}>
                {drillCycle
                  ? `Transaction Matrix: ${drillCycle.statementId}`
                  : activeTab === "current"
                    ? "Active Cycle Registry"
                    : "Archive Cycle Registry"}
              </h2>
              <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">
                {drillCycle
                  ? `${drillTx.length} records in this matrix`
                  : activeTab === "current"
                    ? "Live monitoring of current deployments"
                    : `${previousCycles.length} validated statements processed`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {drillCycle && (
                <button
                  onClick={handleBack}
                  className="px-4 py-2.5 rounded-xl font-black text-[10px] flex items-center gap-2 border shadow-sm hover:bg-slate-50 transition-all uppercase tracking-widest"
                  style={{ borderColor: C.border, color: C.navy }}
                >
                  <FiChevronLeft size={14} /> Back to Registry
                </button>
              )}
              {canScroll && (
                <div className="flex items-center gap-2 ml-1">
                  <button
                    onClick={() => handleScroll("left")}
                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:bg-slate-50 transition-all active:scale-90 shadow-sm"
                  >
                    <FiChevronLeft size={18} />
                  </button>
                  <button
                    onClick={() => handleScroll("right")}
                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-amber-50 border border-amber-200 text-amber-600 hover:bg-amber-100 transition-all active:scale-90 shadow-sm"
                  >
                    <FiChevronRight size={18} />
                  </button>
                </div>
              )}
            </div>
          </div>

          <ResponsiveDataTable
            exportConfig={!drillCycle ? {
              data: activeTab === "current" && currentCycleRow ? [currentCycleRow] : (previousCycles || []),
              filename: `credit_ledger_report_${new Date().toISOString().split('T')[0]}.csv`,
              columns: [
                { header: "Statement ID", key: "statementId" },
                { header: "Billing Cycle", accessor: (c) => `${fmt(c.periodStart)} - ${fmt(c.periodEnd)}` },
                { header: "Usage", accessor: (c) => `₹${(c.statementAmount || 0).toLocaleString()}` },
                { header: "Due Date", accessor: (c) => fmt(c.dueDate) },
                { header: "Payment Received", accessor: (c) => c.isCurrent ? "N/A" : fmt(c.paymentReceivedAt) }
              ]
            } : null}
            wrapperClass="!border-none !shadow-none"
          >
            <div className="overflow-x-auto" ref={scrollRef}>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-[#003399] to-[#000d26] text-white">
                  {drillCycle ? (
                    <>
                      <Th className="!px-6 !py-5">Generation Date</Th>
                      <Th className="!px-6 !py-5">Asset Detail</Th>
                      <Th className="!px-6 !py-5">Personnel</Th>
                      <Th className="!px-6 !py-5">PNR/Confirmation No</Th>
                      <Th className="!px-6 !py-5">Order ID</Th>
                      <Th className="!px-6 !py-5">Asset Type</Th>
                      <Th className="!px-6 !py-5">Capital Flow</Th>
                      <Th className="!px-6 !py-5">Status</Th>
                      <Th className="!px-6 !py-5 text-right">Actions</Th>
                    </>
                  ) : (
                    <>
                      <Th className="!px-6 !py-5">Sequence</Th>
                      <Th className="!px-6 !py-5">Statement Registry</Th>
                      <Th className="!px-6 !py-5">Billing Horizon</Th>
                      <Th className="!px-6 !py-5">Due Protocol</Th>
                      <Th className="!px-6 !py-5">Payment Received</Th>
                      <Th className="!px-6 !py-5">Compliance Status</Th>
                      <Th className="!px-6 !py-5 text-right">Paid Amount</Th>
                      <Th className="!px-6 !py-5 text-right">Remaining</Th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {drillCycle ? (
                  drillLoading ? (
                    <tr>
                      <td colSpan={9} className="py-24 text-center">
                        <div className="animate-spin mb-4 flex justify-center">
                          <FiRefreshCw size={32} className="text-gold" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                          Synchronizing Protocol Matrix...
                        </p>
                      </td>
                    </tr>
                  ) : paginatedDrillTx.length > 0 ? (
                    paginatedDrillTx.map((t, i) => {
                      const b = t.bookingId;
                      const isHotel =
                        t.metadata?.bookingType === "hotel" ||
                        b?.bookingType === "hotel" ||
                        t.description?.toLowerCase().includes("hotel");

                      // Fallback logic for PNR and Order ID across different models
                      const pnr =
                        b?.flightDetails?.pnr ||
                        b?.bookingResult?.pnr ||
                        b?.bookingResult?.onwardPNR ||
                        b?.bookingResult?.hotelBookingId ||
                        b?.bookingResult?.providerResponse?.BookResult?.ConfirmationNo ||
                        "—";

                      const orderId =
                        b?.orderId ||
                        b?.flightDetails?.bookingId ||
                        b?.hotelDetails?.bookingId ||
                        b?.bookingResult?.hotelBookingId ||
                        b?.bookingResult?.confirmationNumber ||
                        b?.tboBookingId ||
                        t.bookingReference ||
                        "—";

                      // Personnel logic
                      const leadTraveller = b?.travellers?.find(p => p.isLeadPassenger) || b?.travellers?.[0];
                      const travellerName = leadTraveller ? `${leadTraveller.firstName} ${leadTraveller.lastName}` : (t.userId?.name ? `${t.userId.name.firstName} ${t.userId.name.lastName}` : "Staff Member");
                      const travellerEmail = leadTraveller?.email || t.userId?.email || "—";

                      // Asset Detail Logic
                      const renderAssetDetail = () => {
                        if (isHotel) {
                          const hotelName = b?.bookingSnapshot?.hotelName || b?.hotelName || "Unknown Hotel";
                          const city = b?.bookingSnapshot?.city || b?.city || "—";
                          return (
                            <div className="flex flex-col">
                              <p className="text-[12px] font-black text-slate-800 leading-tight uppercase">{hotelName}</p>
                              <p className="text-[10px] font-bold text-gold uppercase tracking-wider mt-0.5">{city}</p>
                            </div>
                          );
                        } else {
                          // Flight logic
                          const sectors = b?.bookingSnapshot?.sectors || [];
                          const airlineName = b?.bookingSnapshot?.airline || "Airlines";
                          // Extract airline code from provider response if possible
                          const rawSegments = b?.bookingResult?.providerResponse?.raw?.Response?.Response?.FlightItinerary?.Segments || [];
                          const airlineCode = rawSegments[0]?.Airline?.AirlineCode || b?.flightDetails?.airlineCode || "AI";
                          const logoUrl = airlineLogo(airlineCode);

                          const isRT = b?.bookingSnapshot?.journeyType?.toLowerCase().includes("round") || 
                                       b?.bookingSnapshot?.isRoundTrip || 
                                       rawSegments.some(s => s.JourneyType === 2);
                          
                          return (
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-white border border-slate-100 flex items-center justify-center p-1.5 shadow-sm overflow-hidden shrink-0">
                                <img src={logoUrl} 
                                  alt={airlineName} 
                                  className="w-full h-full object-contain"
                                  loading="eager" onError={(e) => { 
                                    e.target.onerror = null;
                                    e.target.src = "https://cdn-icons-png.flaticon.com/512/3114/3114883.png"; 
                                  }} 
                                />
                              </div>
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[12px] font-black text-slate-800 uppercase tracking-tight">
                                    {sectors[0]?.split("-")[0] || "DEL"}
                                  </span>
                                  <FiArrowRight size={10} className="text-slate-400" />
                                  <span className="text-[12px] font-black text-slate-800 uppercase tracking-tight">
                                    {sectors[0]?.split("-")[1] || "BOM"}
                                  </span>
                                  {isRT && (
                                    <span className="bg-amber-50 text-amber-600 text-[8px] font-black px-1.5 py-0.5 rounded border border-amber-100 ml-1">RT</span>
                                  )}
                                </div>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{airlineName}</span>
                              </div>
                            </div>
                          );
                        }
                      };

                      const handleView = () => {
                        if (!b?._id) return;
                        const route = isHotel
                          ? `/employee-hotel-booking/${b._id}?source=postpaid`
                          : `/employee-flight-booking/${b._id}?source=postpaid`;
                        navigate(route);
                      };

                      return (
                        <tr
                          key={t._id}
                          className="hover:bg-slate-50 transition-colors"
                          style={{
                            background: i % 2 === 0 ? C.white : "#FAF6EB",
                          }}
                        >
                          <td className="px-6 py-5">
                            <p className="text-xs font-black text-navy">
                              {fmt(t.createdAt)}
                            </p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">
                              {new Date(t.createdAt).toLocaleTimeString(
                                "en-IN",
                                { hour: "2-digit", minute: "2-digit" },
                              )}
                            </p>
                          </td>
                          <td className="px-6 py-5">
                            {renderAssetDetail()}
                          </td>
                          <td className="px-6 py-5">
                            <p className="text-[12px] font-black text-navy leading-tight">{travellerName}</p>
                            <p className="text-[10px] font-bold text-slate-400 truncate max-w-[150px]">{travellerEmail}</p>
                          </td>
                          <td className="px-6 py-5">
                            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-[10px] font-black uppercase text-navy border border-slate-200/60 shadow-sm">
                              {pnr}
                            </span>
                          </td>
                          <td className="px-6 py-5">
                            <code className="text-[10px] font-black text-gold uppercase px-2 py-1 rounded bg-gold/5 border border-gold/10">
                              {orderId}
                            </code>
                          </td>
                          <td className="px-6 py-5">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white text-[9px] font-black uppercase tracking-widest border border-slate-200 shadow-sm text-navy">
                              {t.metadata?.bookingType ||
                                b?.bookingType ||
                                (t.type === "booking" ? "ASSET" : "N/A")}
                            </span>
                          </td>
                          <td className="px-6 py-5 font-black text-xs">
                            <span
                              style={{
                                color:
                                  t.transactionType === "debit" ||
                                  t.type === "booking"
                                    ? "#EF4444"
                                    : "#10B981",
                              }}
                            >
                              {t.transactionType === "debit" ||
                              t.type === "booking"
                                ? "-"
                                : "+"}{" "}
                              ₹{fmtAmt(t.amount)}
                            </span>
                          </td>
                          <td className="px-6 py-5">
                            <StatusBadge status={t.status} />
                          </td>
                          <td className="px-6 py-5 text-right">
                            <button
                              onClick={handleView}
                              disabled={!b?._id}
                              className={`p-2 rounded-xl transition-all border ${!b?._id ? "opacity-30 cursor-not-allowed" : "bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-[#003399] border-slate-100 hover:border-[#003399]/20"}`}
                              title="View Protocol Details"
                            >
                              <FiEye size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} className="py-20 text-center">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                          No transactions found in this matrix
                        </p>
                      </td>
                    </tr>
                  )
                ) : (
                  <>
                    {activeTab === "current" && currentCycleRow && (
                      <StatementRow
                        row={currentCycleRow}
                        onClick={() => setDrillCycle(currentCycleRow)}
                        idx={0}
                      />
                    )}
                    {activeTab === "previous" &&
                      previousCycles.map((c, i) => (
                        <StatementRow
                          key={c.cycleIndex}
                          row={c}
                          idx={i}
                          onClick={() => setDrillCycle(c)}
                        />
                      ))}
                  </>
                )}
              </tbody>
            </table>
            </div>
          </ResponsiveDataTable>

          <div className="p-6 border-t" style={{ borderColor: C.border }}>
            <Pagination
              currentPage={drillCycle ? drillPage : 1}
              totalItems={drillCycle ? drillTx.length : 1}
              pageSize={DRILL_PAGE_SIZE}
              onPageChange={drillCycle ? setDrillPage : () => {}}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatementRow({ row, onClick, idx = 0 }) {
  const delayDays = calculateDelayDays({
    dueDate: row.dueDate,
    statementAmount: row.statementAmount,
    receivedAmount: row.receivedAmount,
    paymentReceivedAt: row.paymentReceivedAt,
  });

  return (
    <tr
      onClick={onClick}
      className="hover:bg-slate-50 cursor-pointer transition-colors group"
      style={{ background: idx % 2 === 0 ? C.white : "#FAF6EB" }}
    >
      <td className="px-6 py-5">
        <span className="text-xs font-black text-slate-300">
          {String(row.rowNum).padStart(2, "0")}
        </span>
      </td>
      <td className="px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-navy/5 flex items-center justify-center text-navy group-hover:bg-navy group-hover:text-white transition-all">
            <FiCreditCard size={14} />
          </div>
          <div>
            <p className="text-xs font-black text-navy group-hover:text-gold transition-colors">
              {row.statementId}
            </p>
            <p className="text-[10px] text-slate-400 font-bold uppercase">
              Ref: {row.trackId || "N/A"}
            </p>
          </div>
        </div>
      </td>
      <td className="px-6 py-5">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
          {fmt(row.periodStart)} — {fmt(row.periodEnd)}
        </p>
      </td>
      <td className="px-6 py-5">
        <p className="text-[10px] font-bold text-slate-400 uppercase">
          {fmt(row.dueDate)}
        </p>
      </td>
      <td className="px-6 py-5">
        <p className="text-[10px] font-bold text-slate-400 uppercase">
          {row.isCurrent ? "—" : fmt(row.paymentReceivedAt)}
        </p>
      </td>
      <td className="px-6 py-5">
        <span
          className="px-3 py-1 rounded-full font-black text-[9px] uppercase tracking-widest border shadow-sm"
          style={{
            backgroundColor: delayDays > 0 ? "#FEF2F2" : "#ECFDF5",
            color: delayDays > 0 ? "#EF4444" : "#10B981",
            borderColor: delayDays > 0 ? "#FECACA" : "#A7F3D0",
          }}
        >
          {delayDays > 0 ? `${delayDays} Days Overdue` : "Strategic Standby"}
        </span>
      </td>
      <td className="px-6 py-5 text-right">
        <p className="text-sm font-black text-[#088395]">
          ₹{fmtAmt(row.receivedAmount || 0)}
        </p>
      </td>
      <td className="px-6 py-5 text-right">
        <p className={`text-sm font-black ${row.statementAmount - (row.receivedAmount || 0) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
          ₹{fmtAmt(Math.max(0, row.statementAmount - (row.receivedAmount || 0)))}
        </p>
        <button className="text-[9px] font-black text-gold uppercase tracking-tighter mt-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 justify-end ml-auto">
          View Protocol <FiChevronRight />
        </button>
      </td>
    </tr>
  );
}
