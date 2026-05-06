import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  FiAlertTriangle,
  FiBell,
  FiMail,
  FiSearch,
  FiTrendingDown,
  FiShield,
  FiArrowUpRight,
  FiActivity,
  FiBriefcase,
  FiCalendar,
  FiClock,
  FiArrowLeft,
  FiUser,
  FiRotateCcw,
  FiFilter,
} from "react-icons/fi";
import { FaPlane, FaHotel } from "react-icons/fa";
import { 
  fetchCorporates, 
  fetchCompanyWiseRevenue
} from "../../Redux/Actions/corporate.related.thunks";
import {
  fetchPostpaidBalance,
  fetchPostpaidTransactions,
  fetchPreviousCycles,
  fetchCycleTransactions,
} from "../../Redux/Actions/postpaidThunks";
import { clearCycleTransactions } from "../../Redux/Slice/postpaidSlice";
import { toast } from "react-toastify";
import Pagination from "../Shared/Pagination";
import TableActionBar from "../Shared/TableActionBar";

const fmt = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" }) : "—";

const fmtAmt = (n) =>
  Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STMT_COLS = [
  "Row", "Statement ID", "Statement Period",
  "Statement Date", "Due Date", "Delay Days", "Amount (₹)",
];

const TX_COLS = [
  "Transaction ID", "Doc Type",
  "Invoice Date", "Product Type", "Booking Date", "Booking Ref",
  "Txn Type", "Amount (₹)", "Status",
];

const DRILL_PAGE_SIZE = 10;

const COLORS = {
  critical: "#EF4444",
  warning: "#F59E0B",
  healthy: "#10B981",
  primary: "#0A4D68",
  secondary: "#088395",
  neutral: "#64748B",
};

const ITEMS_PER_PAGE = 10;

export default function CreditStatusAlerts() {
  const dispatch = useDispatch();
  const tableScrollRef = useRef(null);
  
  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterCycle, setFilterCycle] = useState("All");
  const [minLimit, setMinLimit] = useState("");
  const [maxLimit, setMaxLimit] = useState("");
  const [usageThreshold, setUsageThreshold] = useState("0"); 
  
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);

  // Data
  const [corporates, setCorporates] = useState([]);
  const [periodRevenue, setPeriodRevenue] = useState([]); 
  const [loading, setLoading] = useState(false);

  // Drill-down Transaction Ledger
  const [drillDownId, setDrillDownId] = useState(null);

  // Drill-down Cycle & Tabs
  const [activeTab, setActiveTab] = useState("current");
  const [drillCycle, setDrillCycle] = useState(null);
  const [drillPage, setDrillPage] = useState(1);

  const {
    balance, loadingBalance: loadingPostpaidBalance,
    transactions, pagination: transactionsMeta, loadingTransactions,
    previousCycles, loadingCycles,
    cycleTransactions, cycleTransactionsMeta, loadingCycleTransactions,
  } = useSelector((s) => s.postpaid);

  useEffect(() => {
    const loadBaseData = async () => {
      setLoading(true);
      try {
        const res = await dispatch(fetchCorporates()).unwrap();
        const postpaidOnly = (res.data || []).filter(
          c => c.status === "active" && c.classification === "postpaid"
        );
        setCorporates(postpaidOnly);
      } catch (err) {
        toast.error("Failed to load credit profiles");
      } finally {
        setLoading(false);
      }
    };
    loadBaseData();
  }, [dispatch]);

  // Fetch Summary Period Usage
  useEffect(() => {
    if (startDate && endDate) {
      const fetchHistory = async () => {
        try {
          const res = await dispatch(fetchCompanyWiseRevenue({ fromDate: startDate, toDate: endDate })).unwrap();
          setPeriodRevenue(res.data || []);
        } catch (err) {
          console.error("Failed to fetch period usage:", err);
        }
      };
      fetchHistory();
    } else {
      setPeriodRevenue([]);
    }
  }, [startDate, endDate, dispatch]);

  /* ── Effects for Postpaid Data ─────────────────────────── */
  useEffect(() => {
    if (drillDownId) {
      dispatch(fetchPostpaidBalance({ corporateId: drillDownId }));
    }
  }, [dispatch, drillDownId]);

  useEffect(() => {
    if (drillDownId && activeTab === "previous" && !drillCycle) {
      dispatch(fetchPreviousCycles({ corporateId: drillDownId }));
    }
  }, [dispatch, drillDownId, activeTab, drillCycle]);

  useEffect(() => {
    if (!drillCycle?.isCurrent || !drillDownId) return;
    const params = {
      corporateId: drillDownId,
      startDate: balance?.currentCycleStart
        ? new Date(balance.currentCycleStart).toISOString().split("T")[0]
        : undefined,
      endDate: balance?.currentCycleEnd
        ? new Date(balance.currentCycleEnd).toISOString().split("T")[0]
        : undefined,
      page: 1,
      limit: 500,
    };
    dispatch(fetchPostpaidTransactions(params));
  }, [dispatch, drillCycle, balance, drillDownId]);

  useEffect(() => {
    if (!drillCycle || drillCycle.isCurrent || !drillDownId) return;
    dispatch(fetchCycleTransactions({ 
      corporateId: drillDownId, 
      cycleIndex: drillCycle.cycleIndex 
    }));
  }, [dispatch, drillCycle, drillDownId]);

  /* ── Derived Postpaid values ──────────────────────────────── */
  const currentCycleRow = useMemo(() => {
    if (!balance || !drillDownId) return null;
    const stmtDate = balance.currentCycleEnd
      ? new Date(new Date(balance.currentCycleEnd).getTime() + 86400000)
      : null;
    const dueDate = stmtDate
      ? new Date(stmtDate.getTime() + 8 * 86400000)
      : null;
    const delayDays = dueDate && new Date() > dueDate
      ? Math.floor((Date.now() - dueDate.getTime()) / 86400000)
      : 0;
    return {
      rowNum: 1,
      cycleIndex: "current",
      statementId: "CURRENT CYCLE",
      trackId: "—",
      periodStart: balance.currentCycleStart,
      periodEnd: balance.currentCycleEnd,
      statementDate: stmtDate,
      dueDate,
      delayDays,
      statementAmount: balance.usedCredit || 0,
      isCurrent: true,
    };
  }, [balance, drillDownId]);

  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    setDrillCycle(null);
    dispatch(clearCycleTransactions());
  };

  const handleBackFromCycle = () => {
    setDrillCycle(null);
    setDrillPage(1);
    dispatch(clearCycleTransactions());
  };

  const openDrillDownCycle = (row) => {
    setDrillCycle(row);
    setDrillPage(1);
  };

  const drillTx = drillCycle?.isCurrent ? (transactions || []) : (cycleTransactions || []);
  const drillLoading = drillCycle?.isCurrent ? loadingTransactions : loadingCycleTransactions;
  const drillStmtId = drillCycle?.statementId;

  const paginatedDrillTx = useMemo(() => {
    const start = (drillPage - 1) * DRILL_PAGE_SIZE;
    return drillTx.slice(start, start + DRILL_PAGE_SIZE);
  }, [drillTx, drillPage]);

  const setQuickPeriod = (type) => {
    const now = new Date();
    let start, end;
    if (type === 'last-month') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (type === 'this-month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = now;
    }
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const processedData = useMemo(() => {
    return corporates.map((corp) => {
      const utilization = corp.creditLimit > 0 ? (corp.currentCredit / corp.creditLimit) * 100 : 0;
      const revRecord = periodRevenue.find(r => r.corporateId === corp._id);
      const usageInPeriod = revRecord ? revRecord.revenue : 0;

      let status = "Healthy";
      let priority = 3; 

      if (utilization >= 90) { status = "Critical"; priority = 1; }
      else if (utilization >= 75) { status = "Warning"; priority = 2; }

      return { ...corp, utilization, usageInPeriod, status, priority };
    }).sort((a, b) => a.priority - b.priority);
  }, [corporates, periodRevenue]);

  const filtered = useMemo(() => {
    return processedData.filter((corp) => {
      const matchSearch = 
        corp.corporateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        corp._id.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchStatus = filterStatus === "All" || corp.status === filterStatus;
      const matchCycle = filterCycle === "All" || (corp.billingCycle || "30days") === filterCycle;
      
      const matchMinLimit = !minLimit || corp.creditLimit >= Number(minLimit);
      const matchMaxLimit = !maxLimit || corp.creditLimit <= Number(maxLimit);
      
      const matchUsage = corp.utilization >= Number(usageThreshold);

      return matchSearch && matchStatus && matchCycle && matchMinLimit && matchMaxLimit && matchUsage;
    });
  }, [processedData, searchTerm, filterStatus, filterCycle, minLimit, maxLimit, usageThreshold]);

  const stats = useMemo(() => {
    const criticalCount = processedData.filter(c => c.status === "Critical").length;
    const warningCount = processedData.filter(c => c.status === "Warning").length;
    
    // If date range is selected, show Period Spend
    const isHistory = startDate && endDate;
    const totalExposure = isHistory 
      ? processedData.reduce((sum, c) => sum + (c.usageInPeriod || 0), 0)
      : processedData.reduce((sum, c) => sum + (c.currentCredit || 0), 0);
      
    const totalLimit = processedData.reduce((sum, c) => sum + (c.creditLimit || 0), 0);
    return { criticalCount, warningCount, totalExposure, totalLimit, isHistory };
  }, [processedData, startDate, endDate]);

  const inr = (v) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v || 0);

  if (loading) {
    return (
      <div className="p-10 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0A4D68] mb-4"></div>
        <p className="text-slate-500 font-bold uppercase tracking-widest animate-pulse">Computing Risk Ledger...</p>
      </div>
    );
  }

  // --- CYCLE-BASED DRILL DOWN VIEW ---
  if (drillDownId) {
    const target = corporates.find(c => c._id === drillDownId) || {};

    return (
      <div className="min-h-screen p-4 lg:p-6 bg-[#F8FAFC] space-y-6 animate-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => {
                setDrillDownId(null);
                setDrillCycle(null);
                setActiveTab("current");
              }}
              className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-all shadow-sm group"
            >
              <FiArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
            </button>
            <div className="text-left">
              <div className="flex items-center gap-3">
                 <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none uppercase">{target.corporateName}</h2>
                 <span className="px-3 py-1 bg-[#0A4D68] text-white rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-[#0A4D68]/20">
                    <FiClock /> {target.billingCycle || '30 days'} Cycle
                 </span>
              </div>
              <div className="flex items-center gap-4 mt-2">
                 <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Approved Line:</span>
                    <span className="text-[11px] font-black text-slate-800">{inr(target.creditLimit)}</span>
                 </div>
                 <div className="w-1 h-1 rounded-full bg-slate-300" />
                 <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Available Credit:</span>
                    <span className={`text-[11px] font-black ${target.creditLimit - target.currentCredit < target.creditLimit * 0.1 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {inr(target.creditLimit - target.currentCredit)}
                    </span>
                 </div>
              </div>
            </div>
          </div>

          <div className="flex gap-1 bg-white border border-slate-100 rounded-2xl p-1 shadow-sm h-fit">
            {[["current", "Current Cycle"], ["previous", "Previous Cycles"]].map(([k, lbl]) => (
              <button
                key={k}
                onClick={() => handleTabSwitch(k)}
                className="px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                style={{
                  background: activeTab === k ? COLORS.primary : "transparent",
                  color: activeTab === k ? "#fff" : "#94a3b8",
                }}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>

        {/* ── DRILL-DOWN CYCLE DETAIL VIEW ── */}
        {drillCycle && (
          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={handleBackFromCycle}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase border border-slate-200 bg-white hover:bg-slate-100 transition-colors text-slate-600 shadow-sm"
              >
                <FiArrowLeft size={13} />
                Back to {activeTab === "current" ? "Summary" : "Statements"}
              </button>
              <div className="bg-white border border-slate-100 rounded-xl px-4 py-2 text-[10px] flex items-center gap-2 flex-wrap shadow-sm font-black uppercase">
                <span className="text-slate-400 tracking-widest">Statement:</span>
                <span style={{ color: COLORS.primary }}>{drillStmtId}</span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-500">
                  {fmt(drillCycle.periodStart)} – {fmt(drillCycle.periodEnd)}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
               <div className="px-8 py-5 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                  <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-widest">Transactions — {drillStmtId}</h3>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{drillTx.length} records</span>
               </div>
               
               <div className="overflow-x-auto min-h-[400px]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900 border-b border-slate-800">
                        {TX_COLS.map((h) => (
                          <th key={h} className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {drillLoading ? (
                        <tr><td colSpan={TX_COLS.length} className="py-20 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0A4D68] mx-auto"></div></td></tr>
                      ) : drillTx.length === 0 ? (
                        <tr><td colSpan={TX_COLS.length} className="py-20 text-center text-slate-400 font-black uppercase text-[10px] tracking-widest">No transactions found for this cycle</td></tr>
                      ) : paginatedDrillTx.map((t, idx) => (
                        <tr key={t._id} className="hover:bg-slate-50 transition-all text-[11px] font-bold text-slate-600">
                          <td className="px-6 py-3 font-mono text-slate-400 text-[10px]">{t._id}</td>


                          <td className="px-6 py-3">{t.type === "booking" ? "Sales Invoice" : t.type || "—"}</td>
                          <td className="px-6 py-3">{fmt(t.bookingDate || t.createdAt)}</td>
                          <td className="px-6 py-3">
                            {t.metadata?.bookingType || t.metadata?.productType || (t.type === "booking" ? "Air - Domestic" : "—")}
                          </td>
                          <td className="px-6 py-3">{fmt(t.travelDate || t.bookingDate)}</td>
                          <td className="px-6 py-3 font-mono">{t.bookingReference || t.paymentReference || "—"}</td>
                          <td className="px-6 py-3 uppercase">{t.transactionType || (t.type === "booking" ? "debit" : "credit")}</td>
                          <td className={`px-6 py-3 font-black ${(t.transactionType === "debit" || (!t.transactionType && t.type === "booking")) ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {(t.transactionType === "debit" || (!t.transactionType && t.type === "booking")) ? "-" : "+"}₹{fmtAmt(t.amount)}
                          </td>
                          <td className="px-6 py-3"><StatusBadge status={t.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
               </div>
               
               <div className="bg-slate-50 px-8 py-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex gap-6 items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{drillTx.length} items</span>
                    <div className="w-px h-4 bg-slate-200" />
                    <span className="text-xs font-black text-slate-700">
                      Net: ₹{fmtAmt(
                        drillTx.filter(t => t.transactionType === "debit" || (!t.transactionType && t.type === "booking")).reduce((s, t) => s + (t.amount || 0), 0) -
                        drillTx.filter(t => t.transactionType === "credit" || (!t.transactionType && ["payment", "topup", "refund"].includes(t.type))).reduce((s, t) => s + (t.amount || 0), 0)
                      )}
                    </span>
                  </div>
                  <Pagination 
                    currentPage={drillPage} 
                    totalPages={Math.ceil(drillTx.length / DRILL_PAGE_SIZE)} 
                    onPageChange={setDrillPage} 
                  />
               </div>
            </div>
          </div>
        )}

        {/* ── CYCLE LIST VIEW ── */}
        {!drillCycle && (
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
            <div className="px-8 py-5 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-widest">
                {activeTab === "current" ? "Current Billing Cycle" : "Statement History"}
              </h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800">
                    {STMT_COLS.map((h) => (
                      <th key={h} className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {activeTab === "current" ? (
                    loadingPostpaidBalance ? (
                      <tr><td colSpan={STMT_COLS.length} className="py-20 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0A4D68] mx-auto"></div></td></tr>
                    ) : !currentCycleRow ? (
                      <tr><td colSpan={STMT_COLS.length} className="py-20 text-center text-slate-400 font-black uppercase text-[10px] tracking-widest">No active cycle data</td></tr>
                    ) : (
                      <StatementRow row={currentCycleRow} onClick={() => openDrillDownCycle(currentCycleRow)} />
                    )
                  ) : (
                    loadingCycles ? (
                      <tr><td colSpan={STMT_COLS.length} className="py-20 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0A4D68] mx-auto"></div></td></tr>
                    ) : previousCycles.length === 0 ? (
                      <tr><td colSpan={STMT_COLS.length} className="py-20 text-center text-slate-400 font-black uppercase text-[10px] tracking-widest">No statement history available</td></tr>
                    ) : (
                      previousCycles.map((c) => (
                        <StatementRow key={c.cycleIndex} row={c} onClick={() => openDrillDownCycle(c)} />
                      ))
                    )
                  )}
                </tbody>
                {activeTab === "previous" && previousCycles.length > 0 && (
                  <tfoot className="bg-slate-50">
                    <tr>
                      <td colSpan={STMT_COLS.length - 1} className="px-8 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Historical Volume</td>
                      <td className="px-8 py-4 font-black text-slate-900 text-sm">
                        ₹{fmtAmt(previousCycles.reduce((sum, c) => sum + (c.statementAmount || 0), 0))}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- MAIN VIEW ---
  return (
    <div className="min-h-screen p-4 lg:p-6 bg-[#F8FAFC] space-y-6 animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center shadow-2xl shadow-slate-900/20 text-white transform rotate-3">
            <FiShield size={28} />
          </div>
          <div className="text-left">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">Credit Pulse</h1>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              Real-time Risk Intelligence & Aging
            </p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-6">
           <div className="bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-6">
              <div className="text-center">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                   {stats.isHistory ? "Total Period Spend" : "Global Debt"}
                 </p>
                 <p className={`text-lg font-black leading-none ${stats.isHistory ? 'text-blue-600' : 'text-rose-600'}`}>
                   {inr(stats.totalExposure)}
                 </p>
              </div>
              <div className="w-px h-8 bg-slate-100" />
              <div className="text-center">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Limit Cap</p>
                 <p className="text-lg font-black text-slate-800 leading-none">{inr(stats.totalLimit)}</p>
              </div>
           </div>
        </div>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Critical Risks" value={stats.criticalCount} icon={<FiAlertTriangle />} color={COLORS.critical} sub="Usage > 90%" />
        <SummaryCard label="Warning Alerts" value={stats.warningCount} icon={<FiBell />} color={COLORS.warning} sub="Usage > 75%" />
        <SummaryCard 
          label={stats.isHistory ? "Range Spend" : "Net Exposure"} 
          value={inr(stats.totalExposure)} 
          icon={<FiTrendingDown />} 
          color={COLORS.primary} 
          sub={stats.isHistory ? "Usage in selected window" : "Current System Liability"} 
        />
        <SummaryCard label="Capacity" value={inr(stats.totalLimit - stats.totalExposure)} icon={<FiActivity />} color={COLORS.healthy} sub="Remaining Limit" />
      </div>

      {/* ADVANCED FILTERS */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 space-y-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[300px] relative group pr-4">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#0A4D68] transition-colors" />
            <input 
              type="text"
              placeholder="Search by name or reference ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#0A4D68]/10 transition-all placeholder:text-slate-300"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4">
             <div className="flex items-center gap-2">
                <button 
                  onClick={() => setQuickPeriod('this-month')}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${startDate && endDate && stats.isHistory ? 'bg-slate-100 text-slate-600' : 'bg-[#0A4D68]/10 text-[#0A4D68]'}`}
                >
                  This Month
                </button>
                <button 
                  onClick={() => setQuickPeriod('last-month')}
                  className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 hover:bg-slate-200"
                >
                  Last Month
                </button>
                {(startDate || endDate || searchTerm || filterStatus !== 'All' || filterCycle !== 'All' || minLimit || maxLimit || usageThreshold !== '0') && (
                  <button 
                    onClick={() => {
                      setStartDate(''); setEndDate(''); setSearchTerm(''); setFilterStatus('All'); 
                      setFilterCycle('All'); setMinLimit(''); setMaxLimit(''); setUsageThreshold('0');
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all shadow-sm"
                    title="Reset All Filters"
                  >
                    <FiRotateCcw size={16} />
                  </button>
                )}
             </div>

             <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100 shadow-inner">
                <DateFilter label="Booking From" value={startDate} onChange={setStartDate} />
                <DateFilter label="Booking To" value={endDate} onChange={setEndDate} />
             </div>
          </div>
        </div>

        {/* SECONDARY FILTER ROW */}
        <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-slate-50">
           <FilterSelect 
              label="Risk Portfolio" 
              value={filterStatus} 
              onChange={setFilterStatus}
              options={[
                { label: "All Risk Tiers", value: "All" },
                { label: "Critical Only (>90%)", value: "Critical" },
                { label: "Warning Only (>75%)", value: "Warning" },
                { label: "Stable Only", value: "Healthy" }
              ]}
           />
           <FilterSelect 
              label="Billing Cycle" 
              value={filterCycle} 
              onChange={setFilterCycle}
              options={[
                { label: "All Cycles", value: "All" },
                { label: "15 Days Cycle", value: "15days" },
                { label: "30 Days Cycle", value: "30days" },
                { label: "Custom Cycle", value: "custom" }
              ]}
           />
           <div className="flex flex-col gap-1 w-[180px]">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-2 flex justify-between">
                <span>Usage Filter</span>
                <span className="text-[#0A4D68]">{usageThreshold}%+</span>
              </label>
              <input 
                type="range" 
                min="0" max="100" step="10"
                value={usageThreshold}
                onChange={(e) => setUsageThreshold(e.target.value)}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#0A4D68]"
              />
           </div>
           <div className="flex items-center gap-3">
              <div className="flex flex-col gap-1">
                 <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-2">Min Limit</label>
                 <input 
                  type="number" 
                  placeholder="₹ Min"
                  value={minLimit}
                  onChange={(e) => setMinLimit(e.target.value)}
                  className="w-24 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-black outline-none focus:border-[#0A4D68]"
                 />
              </div>
              <div className="flex flex-col gap-1">
                 <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-2">Max Limit</label>
                 <input 
                  type="number" 
                  placeholder="₹ Max"
                  value={maxLimit}
                  onChange={(e) => setMaxLimit(e.target.value)}
                  className="w-24 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-black outline-none focus:border-[#0A4D68]"
                 />
              </div>
           </div>
        </div>
      </div>

      <TableActionBar
        scrollRef={tableScrollRef}
        exportLabel="Export Alerts"
        onExport={() => toast.info("Preparing alert report...")}
        exportClassName="bg-[#B45309] hover:bg-[#92400E] shadow-[#B45309]/20"
        arrowClassName="border-amber-100 bg-amber-50 text-[#B45309] hover:bg-amber-100 hover:border-amber-200 hover:text-[#92400E] disabled:hover:bg-amber-50"
      />

      {/* DATA TABLE */}
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        <div ref={tableScrollRef} className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-800">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Postpaid Identity</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Reference ID</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Billing Cycle</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Approved Limit</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {startDate && endDate ? 'Period Credit Usage' : 'Live Utilization'}
                </th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Available Line</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Ledger</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <tr>
                   <td colSpan="7" className="py-24 text-center">
                      <div className="flex flex-col items-center opacity-20">
                         <FiActivity size={64} className="text-slate-400 mb-4" />
                         <p className="text-xl font-black uppercase tracking-widest">No active risks detected</p>
                      </div>
                   </td>
                </tr>
              ) : (
                filtered.map((corp) => (
                  <tr key={corp._id} className="group hover:bg-slate-50/50 transition-all border-l-4 border-transparent hover:border-[#0A4D68]">
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs text-white shadow-lg ${corp.utilization >= 90 ? 'bg-red-500' : corp.utilization >= 75 ? 'bg-amber-500' : 'bg-slate-800'}`}>
                          {corp.corporateName[0]}
                        </div>
                        <p className="font-black text-slate-800 text-sm leading-tight">{corp.corporateName}</p>
                      </div>
                    </td>
                    <td className="px-8 py-4">
                       <p className="font-mono text-[10px] font-black text-slate-400 uppercase tracking-tighter bg-slate-50 px-2 py-1 rounded border border-slate-100 w-fit">
                          {corp._id}
                       </p>
                    </td>
                    <td className="px-8 py-4">
                       <div className="space-y-1.5 text-left">
                          <div className="flex items-center gap-2 text-[10px] font-black text-slate-700 uppercase leading-none">
                             <FiClock className="text-[#0A4D68]" /> {corp.billingCycle || '30 days'}
                          </div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                             Term: {corp.classification?.toUpperCase()}
                          </p>
                       </div>
                    </td>
                    <td className="px-8 py-4">
                       <span className="font-black text-[14px] text-slate-900">{inr(corp.creditLimit)}</span>
                    </td>
                    <td className="px-8 py-4">
                      <div className="w-[180px] space-y-2">
                        <div className="flex justify-between items-end">
                          <p className={`text-[10px] font-black uppercase tracking-tighter ${startDate && endDate ? 'text-[#0A4D68]' : 'text-slate-500'}`}>
                            {startDate && endDate ? `Range: ${inr(corp.usageInPeriod)}` : `Live: ${inr(corp.currentCredit)}`}
                          </p>
                          {!startDate && !endDate && (
                             <p className={`text-[10px] font-black ${corp.utilization >= 90 ? 'text-red-600' : 'text-slate-400'}`}>
                              {Math.round(corp.utilization)}%
                             </p>
                          )}
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                           <div 
                              className={`h-full transition-all duration-1000 ${startDate && endDate ? 'bg-[#0A4D68]' : (corp.utilization >= 90 ? 'bg-red-500' : corp.utilization >= 75 ? 'bg-amber-500' : 'bg-[#0A4D68]')}`} 
                              style={{ width: `${corp.utilization}%` }} 
                           />
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-4 text-right">
                       <p className="font-black text-slate-900 text-sm leading-none">
                         {inr(corp.creditLimit - corp.currentCredit)}
                       </p>
                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-1 leading-none shadow-neutral-100">Net Liquidity</p>
                    </td>
                    <td className="px-8 py-4 text-center">
                       <div className="flex items-center gap-2 justify-center">
                          <button 
                            title="Audit Transaction Ledger"
                            onClick={() => setDrillDownId(corp._id)}
                            className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-[#0A4D68] hover:bg-[#0A4D68]/10 hover:border-[#0A4D68]/20 transition-all hover:scale-110 active:scale-95 shadow-xs"
                          >
                            <FiClock size={18} />
                          </button>
                          <button 
                            title="Send Credit Reminder"
                            className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-rose-700 hover:bg-rose-50 hover:border-rose-100 transition-all hover:scale-110 active:scale-95 shadow-xs"
                            onClick={() => toast.success(`Credit reminder sent to ${corp.corporateName}`)}
                          >
                             <FiMail size={18} />
                          </button>
                       </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── SHARED STATEMENT ROW ── */
function StatementRow({ row, onClick }) {
  return (
    <tr
      onClick={onClick}
      className="group hover:bg-slate-50 cursor-pointer transition-all border-l-4 border-transparent hover:border-[#088395] text-[11px] font-bold"
    >
      <td className="px-8 py-4 font-mono text-slate-400">{row.rowNum}</td>
      <td className="px-8 py-4">
        <span className="flex items-center gap-2 text-[#088395] font-black">
          {row.statementId} <FiArrowUpRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
        </span>
      </td>
      <td className="px-8 py-4 whitespace-nowrap text-slate-600 font-black">
        {fmt(row.periodStart)} – {fmt(row.periodEnd)}
      </td>
      <td className="px-8 py-4 whitespace-nowrap text-slate-500">{fmt(row.statementDate)}</td>
      <td className="px-8 py-4 whitespace-nowrap text-slate-500">{fmt(row.dueDate)}</td>
      <td className="px-8 py-4 text-center">
        <span
          className={`px-3 py-1 rounded-lg font-black text-[9px] uppercase tracking-widest shadow-xs ${row.delayDays > 0 ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}
        >
          {row.delayDays} Days Delay
        </span>
      </td>
      <td className="px-8 py-4 font-black text-slate-900 text-[13px]">₹{fmtAmt(row.statementAmount)}</td>
    </tr>
  );
}

function SummaryCard({ label, value, icon, color, sub }) {
  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 group hover:border-slate-200 transition-all hover:-translate-y-1 duration-300">
      <div className="flex items-start justify-between mb-4">
        <div 
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg transition-all group-hover:rotate-6 group-hover:scale-110"
          style={{ backgroundColor: color, boxShadow: `0 8px 16px -4px ${color}55` }}
        >
          {React.cloneElement(icon, { size: 24 })}
        </div>
        <div className="p-1.5 bg-slate-50 rounded-lg">
           <FiArrowUpRight size={14} className="text-slate-400" />
        </div>
      </div>
      <div>
        <h4 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-2">{value}</h4>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1 opacity-80">{label}</p>
        <p className="text-[9px] font-bold text-slate-300 italic truncate">{sub}</p>
      </div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div className="flex flex-col gap-1 text-left min-w-[140px]">
      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-2">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer focus:ring-2 focus:ring-[#0A4D68]/5 transition-all shadow-xs"
      >
        {options.map((opt, i) => (
          <option key={i} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

function DateFilter({ label, value, onChange }) {
  return (
    <div className="flex flex-col gap-1 text-left">
       <label className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 text-center">{label}</label>
       <input
         type="date"
         value={value}
         onChange={(e) => onChange(e.target.value)}
         className="px-2 py-1 bg-white border border-slate-100 rounded-lg text-[10px] font-black text-[#0A4D68] outline-none w-[110px] focus:ring-1 focus:ring-[#0A4D68]/10 transition-all text-center shadow-xs"
       />
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    paid:      { bg: "#ECFDF5", text: "#065F46", label: "Paid" },
    billed:    { bg: "#ECFEFF", text: "#155E75", label: "Billed" },
    pending:   { bg: "#FFFBEB", text: "#92400E", label: "Pending" },
    failed:    { bg: "#FFF1F2", text: "#9F1239", label: "Failed" },
    cancelled: { bg: "#F1F5F9", text: "#475569", label: "Cancelled" },
    voucher:   { bg: "#ECFDF5", text: "#065F46", label: "Vouchered" },
    success:   { bg: "#ECFDF5", text: "#065F46", label: "Success" },
  };
  const s = map[status?.toLowerCase()] || map.pending;
  return (
    <span
      className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      {s.label}
    </span>
  );
}