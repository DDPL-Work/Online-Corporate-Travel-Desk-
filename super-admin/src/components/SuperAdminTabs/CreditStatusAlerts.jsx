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
  FiArrowRight,
  FiUser,
  FiRotateCcw,
  FiFilter,
  FiEdit2,
  FiX,
  FiRefreshCw,
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
  updateCycleReceipt,
} from "../../Redux/Actions/postpaidThunks";
import { clearCycleTransactions } from "../../Redux/Slice/postpaidSlice";
import { toast } from "sonner";
import Pagination from "../Shared/Pagination";
import TableActionBar from "../Shared/TableActionBar";
import useExcelExporter from "../../services/export/useExcelExporter";
import {
  creditAlertsExportTemplate,
  creditStatementsExportTemplate,
  creditTransactionsExportTemplate,
} from "../../templates/exportTemplates/superAdminExportTemplates";

const fmt = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" }) : "—";

const fmtAmt = (n) =>
  Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STMT_COLS = [
  "Row", "Statement ID", "Statement Period",
  "Statement Date", "Due Date", "Payment Received", "Delay Days", "Amount (₹)", "Received (₹)", "Action",
];

const TX_COLS = [
  "Transaction ID", "Payment ID", "Doc Type",
  "Invoice Date", "Product Type", "Booking Date", "Order ID",
  "Txn Type", "Amount (₹)", "Status",
];

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

const COLORS = {
  critical: "#EF4444",
  warning: "#F59E0B",
  healthy: "#10B981",
  primary: "#003399",
  secondary: "#d97706",
  neutral: "#64748B",
  dark: "#000d26",
  offWhite: "#f8fafc",
  border: "#e2e8f0",
};

const ITEMS_PER_PAGE = 10;

export default function CreditStatusAlerts() {
  const dispatch = useDispatch();
  const tableScrollRef = useRef(null);
  const cycleTableScrollRef = useRef(null);
  const creditTransactionsScrollRef = useRef(null);
  const { exportExcel, exportingKey } = useExcelExporter();
  
  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterCycle, setFilterCycle] = useState("All");
  const [minLimit, setMinLimit] = useState("");
  const [maxLimit, setMaxLimit] = useState("");
  const [usageThreshold, setUsageThreshold] = useState("0"); 
  
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

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
  const [txSearch, setTxSearch] = useState("");
  const [txStartDate, setTxStartDate] = useState("");
  const [txEndDate, setTxEndDate] = useState("");
  const [txCategory, setTxCategory] = useState("All");

  // Edit Modal State
  const [editModal, setEditModal] = useState({ isOpen: false, row: null, receivedAmount: "" });

  const {
    balance, loadingBalance: loadingPostpaidBalance,
    transactions, loadingTransactions,
    previousCycles, loadingCycles,
    cycleTransactions, loadingCycleTransactions,
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
      } catch {
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
      const timer = setTimeout(() => setPeriodRevenue([]), 0);
      return () => clearTimeout(timer);
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
    const targetCorp = corporates.find(c => c._id === drillDownId) || {};
    const dueDays = targetCorp.dueDays !== undefined && targetCorp.dueDays !== null ? Number(targetCorp.dueDays) : 15;

    const stmtDate = balance.currentCycleEnd
      ? new Date(new Date(balance.currentCycleEnd).getTime() + 86400000)
      : null;
    const dueDate = stmtDate
      ? new Date(stmtDate.getTime() + dueDays * 86400000)
      : null;
    const delayDays = dueDate && new Date() > dueDate
      ? Math.floor((new Date().getTime() - dueDate.getTime()) / 86400000)
      : 0;
    
    const remainingDays = balance.currentCycleEnd 
      ? Math.max(0, Math.ceil((new Date(balance.currentCycleEnd).getTime() - new Date().getTime()) / 86400000))
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
      remainingDays,
      statementAmount: balance.usedCredit || 0,
      isCurrent: true,
    };
  }, [balance, drillDownId, corporates]);

  const enhancedPreviousCycles = useMemo(() => {
    if (!previousCycles || !drillDownId) return [];
    const targetCorp = corporates.find(c => c._id === drillDownId) || {};
    const dueDays = targetCorp.dueDays !== undefined && targetCorp.dueDays !== null ? Number(targetCorp.dueDays) : 15;

    return previousCycles.map(cycle => {
      const stmtDate = cycle.periodEnd
        ? new Date(new Date(cycle.periodEnd).getTime() + 86400000)
        : null;
      const dueDate = stmtDate
        ? new Date(stmtDate.getTime() + dueDays * 86400000)
        : null;
      const paymentReceivedAt = cycle.paymentReceivedAt || cycle.receivedAt || null;
      const delayDays = calculateDelayDays({
        dueDate,
        statementAmount: cycle.statementAmount,
        receivedAmount: cycle.receivedAmount,
        paymentReceivedAt,
      });
      
      return {
        ...cycle,
        dueDate: dueDate || cycle.dueDate,
        paymentReceivedAt,
        delayDays,
      };
    });
  }, [previousCycles, drillDownId, corporates]);

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
    setTxSearch("");
    setTxStartDate("");
    setTxEndDate("");
    setTxCategory("All");
  };

  const drillTx = useMemo(
    () => (drillCycle?.isCurrent ? (transactions || []) : (cycleTransactions || [])),
    [drillCycle?.isCurrent, transactions, cycleTransactions],
  );
  const drillLoading = drillCycle?.isCurrent ? loadingTransactions : loadingCycleTransactions;
  const drillStmtId = drillCycle?.statementId;

  const updateTxFilter = (setter, value) => {
    setDrillPage(1);
    setter(value);
  };

  const filteredDrillTx = useMemo(() => {
    const search = txSearch.trim().toLowerCase();
    const start = txStartDate ? new Date(txStartDate).getTime() : null;
    const end = txEndDate ? new Date(txEndDate).setHours(23, 59, 59, 999) : null;
    const category = txCategory.toLowerCase();

    return drillTx.filter((t) => {
      const productType = String(
        t.metadata?.bookingType ||
          t.metadata?.productType ||
          (t.type === "booking" ? "Air - Domestic" : ""),
      );
      const orderId = String(t.bookingId?.orderId || t.orderId || "");
      const bookingRef = String(t.bookingReference || t.paymentReference || "");
      const docType = String(t.type === "booking" ? "Sales Invoice" : t.type || "");
      const txnType = String(t.transactionType || (t.type === "booking" ? "debit" : "credit"));
      const txDate = new Date(t.bookingDate || t.createdAt).getTime();

      const matchesSearch =
        !search ||
        String(t._id || "").toLowerCase().includes(search) ||
        String(t.paymentId || "").toLowerCase().includes(search) ||
        orderId.toLowerCase().includes(search) ||
        bookingRef.toLowerCase().includes(search) ||
        productType.toLowerCase().includes(search) ||
        docType.toLowerCase().includes(search) ||
        txnType.toLowerCase().includes(search) ||
        String(t.status || "").toLowerCase().includes(search);

      const matchesStart = !start || txDate >= start;
      const matchesEnd = !end || txDate <= end;
      const matchesCategory =
        txCategory === "All" ||
        productType.toLowerCase().includes(category) ||
        docType.toLowerCase().includes(category);

      return matchesSearch && matchesStart && matchesEnd && matchesCategory;
    });
  }, [drillTx, txSearch, txStartDate, txEndDate, txCategory]);

  const paginatedDrillTx = useMemo(() => {
    const start = (drillPage - 1) * DRILL_PAGE_SIZE;
    return filteredDrillTx.slice(start, start + DRILL_PAGE_SIZE);
  }, [filteredDrillTx, drillPage]);

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
  const isAlertsExporting = exportingKey === "credit_alerts";

  const handleAlertsExport = () => {
    const statCards = [
      { label: "Critical Corporates", value: stats.criticalCount },
      { label: "Warning Corporates", value: stats.warningCount },
      { label: stats.isHistory ? "Period Spend" : "Current Exposure", value: inr(stats.totalExposure) },
      { label: "Total Approved Limits", value: inr(stats.totalLimit) },
    ];
    const appliedFilters = [
      { label: "Search", value: searchTerm || "None" },
      { label: "Status", value: filterStatus },
      { label: "Cycle", value: filterCycle },
      { label: "Min Limit", value: minLimit || "None" },
      { label: "Max Limit", value: maxLimit || "None" },
      { label: "Usage Threshold", value: usageThreshold + "%" },
    ];
    exportExcel({
      key: "credit_alerts",
      pageHeader: "Credit Profiles & Risk Alert Board",
      statCards,
      appliedFilters,
      data: filtered,
      columns: creditAlertsExportTemplate,
      filenamePrefix: "credit_alerts_export",
      emptyMessage: "No credit alerts available to export",
      successMessage: "Credit alerts exported",
    });
  };


   const handleRefresh = () => dispatch(fetchCorporates());

  if (loading) {
    return (
      <div className="p-10 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#003399] mb-4"></div>
        <p className="text-slate-500 font-bold uppercase tracking-widest animate-pulse">Computing Risk Ledger...</p>
      </div>
    );
  }

  // --- CYCLE-BASED DRILL DOWN VIEW ---
  if (drillDownId) {
    const target = corporates.find(c => c._id === drillDownId) || {};
    const statementRows = activeTab === "current"
      ? currentCycleRow ? [currentCycleRow] : []
      : enhancedPreviousCycles;
    const isStatementsExporting = exportingKey === "credit_statements";
    const isTransactionsExporting = exportingKey === "credit_transactions";

    const handleStatementsExport = () => {
      exportExcel({
        key: "credit_statements",
        pageHeader: `${target.corporateName} - Statements`,
        statCards: [],
        appliedFilters: [],
        data: statementRows,
        columns: creditStatementsExportTemplate,
        filenamePrefix: "credit_statements_export",
        emptyMessage: "No statement rows available to export",
        successMessage: "Credit statements exported",
      });
    };

    const handleTransactionsExport = () => {
      if (drillLoading) return;

      exportExcel({
        key: "credit_transactions",
        pageHeader: `${target.corporateName} - Transactions`,
        statCards: [],
        appliedFilters: [
          { label: "Search", value: txSearch || "None" },
          { label: "From Date", value: txStartDate || "Any" },
          { label: "To Date", value: txEndDate || "Any" },
          { label: "Category", value: txCategory },
        ],
        data: filteredDrillTx,
        columns: creditTransactionsExportTemplate,
        filenamePrefix: "credit_transactions_export",
        emptyMessage: "No credit transactions available to export",
        successMessage: "Credit transactions exported",
      });
    };

    return (
      <div className="min-h-screen font-sans pb-20 -mt-6 -mx-4 md:-mx-6" style={{ background: COLORS.offWhite }}>
        <div className="w-full bg-linear-to-br from-[#003399] to-[#000d26] text-white pt-8 pb-20 px-6 md:px-10">
          <div className="w-full flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setDrillDownId(null);
                    setDrillCycle(null);
                    setActiveTab("current");
                  }}
                  className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/10 text-white shadow-sm group"
                >
                  <FiArrowLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
                </button>
              </div>

              <div className="h-12 w-px bg-white/10 mx-2 hidden md:block" />

              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl text-white border border-white/10 bg-white/10">
                  <FiBriefcase size={28} />
                </div>
                <div className="text-left">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-3xl font-black tracking-tight leading-none">{target.corporateName}</h2>
                    <span className="px-3 py-1 bg-white/10 text-white rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-white/10">
                      <FiClock /> {target.billingCycle || '30 days'} Cycle
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 mt-3 text-white/70">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black uppercase tracking-widest">Approved Line:</span>
                      <span className="text-[11px] font-black text-white">{inr(target.creditLimit)}</span>
                    </div>
                    <div className="w-1 h-1 rounded-full bg-white/30" />
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black uppercase tracking-widest">Available Credit:</span>
                      <span className={`text-[11px] font-black ${target.creditLimit - target.currentCredit < target.creditLimit * 0.1 ? 'text-rose-200' : 'text-emerald-200'}`}>
                        {inr(target.creditLimit - target.currentCredit)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-1 bg-white/10 border border-white/10 rounded-2xl p-1 shadow-sm h-fit w-fit">
              {[["current", "Current Cycle"], ["previous", "Previous Cycles"]].map(([k, lbl]) => (
                <button
                  key={k}
                  onClick={() => handleTabSwitch(k)}
                  className="px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                  style={{
                    background: activeTab === k ? "#fff" : "transparent",
                    color: activeTab === k ? COLORS.primary : "rgba(255,255,255,0.65)",
                  }}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="w-full px-4 md:px-10 -mt-10 space-y-6">

      {/* EDIT PREVIOUS CYCLE MODAL */}
      {editModal.isOpen && editModal.row && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 m-4 animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Add Received Amount</h3>
              <button 
                onClick={() => setEditModal({ isOpen: false, row: null, receivedAmount: "" })}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
              >
                <FiX size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Statement ID</label>
                <div className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-600 cursor-not-allowed mt-1">
                  {editModal.row.statementId}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Total Due</label>
                  <div className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-black text-slate-900 cursor-not-allowed mt-1">
                    ₹{fmtAmt(editModal.row.statementAmount)}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Previously Received</label>
                  <div className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-black text-slate-600 cursor-not-allowed mt-1">
                    ₹{fmtAmt(editModal.row.receivedAmount || 0)}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest px-1 text-[#003399]">New Received Amount</label>
                <input 
                  type="number"
                  placeholder="Enter additional amount received"
                  value={editModal.receivedAmount}
                  onChange={(e) => setEditModal({ ...editModal, receivedAmount: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-[#003399] rounded-xl text-sm font-black text-slate-900 outline-none focus:ring-2 focus:ring-[#003399]/10 transition-all mt-1"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Remaining Balance</label>
                <div className={`w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-black mt-1 ${editModal.row.statementAmount - ((Number(editModal.row.receivedAmount) || 0) + Number(editModal.receivedAmount || 0)) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  ₹{fmtAmt(Math.max(0, editModal.row.statementAmount - ((Number(editModal.row.receivedAmount) || 0) + Number(editModal.receivedAmount || 0))))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Last Payment Date</label>
                <div className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-600 cursor-not-allowed mt-1">
                  {fmt(editModal.row.paymentReceivedAt)}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button 
                onClick={() => setEditModal({ isOpen: false, row: null, receivedAmount: "" })}
                className="flex-1 px-4 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  try {
                    const newTotal = (Number(editModal.row.receivedAmount) || 0) + Number(editModal.receivedAmount || 0);
                    await dispatch(updateCycleReceipt({
                      corporateId: drillDownId,
                      cycleIndex: editModal.row.cycleIndex,
                      receivedAmount: newTotal
                    })).unwrap();
                    toast.success("Amount updated successfully");
                    setEditModal({ isOpen: false, row: null, receivedAmount: "" });
                    // Refresh data
                    dispatch(fetchPreviousCycles({ corporateId: drillDownId }));
                  } catch {
                    toast.error("Failed to update receipt");
                  }
                }}
                className="flex-1 px-4 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest text-white bg-[#003399] hover:bg-[#002266] shadow-lg shadow-[#003399]/20 transition-all"
              >
                Save Updates
              </button>
            </div>
          </div>
        </div>
      )}

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

            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
               <div className="px-8 py-5 border-b border-slate-50 flex flex-wrap items-center justify-between gap-3 bg-white">
                  <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-widest">Transactions — {drillStmtId}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-2">
                    Filter, review, and export cycle transactions
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{filteredDrillTx.length} of {drillTx.length} records</span>
                    <TableActionBar
                      scrollRef={creditTransactionsScrollRef}
                      exportLabel="Export"
                      onExport={handleTransactionsExport}
                      exportDisabled={drillLoading || isTransactionsExporting}
                      exportLoading={isTransactionsExporting}
                      exportClassName="bg-[#003399] hover:bg-[#002266] shadow-[#003399]/20"
                      arrowClassName="border-blue-100 bg-blue-50 text-[#003399] hover:bg-blue-100 hover:border-blue-200 hover:text-[#002266] disabled:hover:bg-blue-50"
                    />
                  </div>
               </div>
               
               <div className="px-8 py-4 border-b border-slate-50 bg-slate-50/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 items-end">
                    <div className="xl:col-span-2 flex flex-col gap-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <FiSearch size={12} /> Search Transactions
                      </label>
                      <div className="relative">
                        <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input
                          type="text"
                          placeholder="Transaction, payment, order ID, status..."
                          value={txSearch}
                          onChange={(e) => updateTxFilter(setTxSearch, e.target.value)}
                          className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-[13px] font-medium outline-none transition-all focus:border-[#003399] focus:ring-2 focus:ring-[#003399]/10 bg-white"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <FiCalendar size={12} /> From Date
                      </label>
                      <input
                        type="date"
                        value={txStartDate}
                        onChange={(e) => updateTxFilter(setTxStartDate, e.target.value)}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-[13px] font-medium outline-none transition-all focus:border-[#003399] focus:ring-2 focus:ring-[#003399]/10 bg-white"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <FiCalendar size={12} /> To Date
                      </label>
                      <input
                        type="date"
                        value={txEndDate}
                        onChange={(e) => updateTxFilter(setTxEndDate, e.target.value)}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-[13px] font-medium outline-none transition-all focus:border-[#003399] focus:ring-2 focus:ring-[#003399]/10 bg-white"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <FiFilter size={12} /> Category
                      </label>
                      <select
                        value={txCategory}
                        onChange={(e) => updateTxFilter(setTxCategory, e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-[13px] font-medium outline-none transition-all focus:border-[#003399] focus:ring-2 focus:ring-[#003399]/10 bg-white cursor-pointer"
                      >
                        <option value="All">All Categories</option>
                        <option value="flight">Flights</option>
                        <option value="air">Air</option>
                        <option value="hotel">Hotels</option>
                        <option value="sales invoice">Sales Invoice</option>
                      </select>
                    </div>
                  </div>
               </div>

               <div ref={creditTransactionsScrollRef} className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-linear-to-r from-[#003399] to-[#000d26] text-white">
                        {TX_COLS.map((h) => (
                          <th key={h} className="px-6 py-4 text-[9px] font-black uppercase tracking-widest opacity-90 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {drillLoading ? (
                        <tr><td colSpan={TX_COLS.length} className="py-20 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#003399] mx-auto"></div></td></tr>
                      ) : filteredDrillTx.length === 0 ? (
                        <tr><td colSpan={TX_COLS.length} className="py-20 text-center text-slate-400 font-black uppercase text-[10px] tracking-widest">No transactions found for this cycle</td></tr>
                      ) : paginatedDrillTx.map((t) => (
                        <tr key={t._id} className="hover:bg-slate-50 transition-all text-[11px] font-bold text-slate-600">
                          <td className="px-6 py-3 font-mono text-slate-400 text-[10px]">{t._id}</td>


                          <td className="px-6 py-3">
                            {t.paymentId ? (
                              <span className="font-mono text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md whitespace-nowrap">
                                {t.paymentId}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          <td className="px-6 py-3">{t.type === "booking" ? "Sales Invoice" : t.type || "—"}</td>
                          <td className="px-6 py-3">{fmt(t.bookingDate || t.createdAt)}</td>
                          <td className="px-6 py-3">
                            {t.metadata?.bookingType || t.metadata?.productType || (t.type === "booking" ? "Air - Domestic" : "—")}
                          </td>
                          <td className="px-6 py-3">{fmt(t.travelDate || t.bookingDate)}</td>
                          <td className="px-6 py-3 font-mono">{t.bookingId?.orderId || t.orderId || "—"}</td>
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
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{filteredDrillTx.length} items</span>
                    <div className="w-px h-4 bg-slate-200" />
                    <span className="text-xs font-black text-slate-700">
                      Net: ₹{fmtAmt(
                        filteredDrillTx.filter(t => t.transactionType === "debit" || (!t.transactionType && t.type === "booking")).reduce((s, t) => s + (t.amount || 0), 0) -
                        filteredDrillTx.filter(t => t.transactionType === "credit" || (!t.transactionType && ["payment", "topup", "refund"].includes(t.type))).reduce((s, t) => s + (t.amount || 0), 0)
                      )}
                    </span>
                  </div>
                  <Pagination 
                    currentPage={drillPage} 
                    totalPages={Math.ceil(filteredDrillTx.length / DRILL_PAGE_SIZE)}
                    onPageChange={setDrillPage} 
                  />
               </div>
            </div>
          </div>
        )}

        {/* ── CYCLE LIST VIEW ── */}
        {!drillCycle && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-8 py-5 border-b border-slate-50 bg-slate-50/50 flex flex-wrap justify-between items-center gap-3">
              <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-widest">
                {activeTab === "current" ? "Current Billing Cycle" : "Statement History"}
              </h3>
              <TableActionBar
                scrollRef={cycleTableScrollRef}
                exportLabel="Export"
                onExport={handleStatementsExport}
                exportDisabled={loadingPostpaidBalance || loadingCycles || isStatementsExporting}
                exportLoading={isStatementsExporting}
                exportClassName="bg-slate-900 hover:bg-black shadow-black/10"
                arrowClassName="border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:border-slate-300 hover:text-slate-900 disabled:hover:bg-slate-50"
              />
            </div>
            
            <div className="overflow-x-auto" ref={cycleTableScrollRef}>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-linear-to-r from-[#003399] to-[#000d26] text-white">
                    {(activeTab === "current" ? STMT_COLS.filter(h => !["Payment Received", "Received (₹)", "Action"].includes(h)) : STMT_COLS).map((h) => (
                      <th key={h} className="px-8 py-4 text-[9px] font-black uppercase tracking-widest opacity-90 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {activeTab === "current" ? (
                    loadingPostpaidBalance ? (
                      <tr><td colSpan={STMT_COLS.length} className="py-20 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#003399] mx-auto"></div></td></tr>
                    ) : !currentCycleRow ? (
                      <tr><td colSpan={STMT_COLS.length} className="py-20 text-center text-slate-400 font-black uppercase text-[10px] tracking-widest">No active cycle data</td></tr>
                    ) : (
                      <StatementRow 
                        row={currentCycleRow} 
                        onClick={() => openDrillDownCycle(currentCycleRow)} 
                        onEdit={() => {}} 
                      />
                    )
                  ) : (
                    loadingCycles ? (
                      <tr><td colSpan={STMT_COLS.length} className="py-20 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#003399] mx-auto"></div></td></tr>
                    ) : enhancedPreviousCycles.length === 0 ? (
                      <tr><td colSpan={STMT_COLS.length} className="py-20 text-center text-slate-400 font-black uppercase text-[10px] tracking-widest">No statement history available</td></tr>
                    ) : (
                      enhancedPreviousCycles.map((c) => (
                        <StatementRow 
                          key={c.cycleIndex} 
                          row={c} 
                          onClick={() => openDrillDownCycle(c)}
                          onEdit={(row) => setEditModal({ isOpen: true, row, receivedAmount: "" })}
                        />
                      ))
                    )
                  )}
                </tbody>
                {activeTab === "previous" && enhancedPreviousCycles.length > 0 && (
                  <tfoot className="bg-slate-50">
                    <tr>
                      <td colSpan={STMT_COLS.length - 2} className="px-8 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Historical Volume</td>
                      <td className="px-8 py-4 font-black text-slate-900 text-sm" colSpan="2">
                        ₹{fmtAmt(enhancedPreviousCycles.reduce((sum, c) => sum + (c.statementAmount || 0), 0))}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}
      </div>
      </div>
    );
  }

  // --- MAIN VIEW ---
  return (
    <div className="min-h-screen font-sans pb-20 -mt-6 -mx-4 md:-mx-6" style={{ background: COLORS.offWhite }}>
      {/* Navy Header Section */}
      <div className="w-full bg-linear-to-br from-[#003399] to-[#000d26] text-white pt-8 pb-20 px-6 md:px-10">
        <div className="w-full flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-3">
               <button 
                  onClick={() => navigate(-1)} 
                  className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/10 text-white shadow-sm"
               >
                 <FiArrowLeft size={20} />
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
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl text-white border border-white/10 bg-white/10">
              <FiShield size={28} />
            </div>
            <div className="text-left">
              <h1 className="text-3xl font-black tracking-tight leading-none">Credit Pulse</h1>
              <p className="text-[10px] mt-2 font-bold uppercase tracking-[2px] opacity-60 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                Real-time Risk Intelligence & Aging
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6">
             <div className="bg-white/10 px-6 py-3 rounded-2xl border border-white/10 shadow-sm flex items-center gap-6">
                <div className="text-center">
                   <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">
                     {stats.isHistory ? "Total Period Spend" : "Global Debt"}
                   </p>
                   <p className={`text-lg font-black leading-none ${stats.isHistory ? 'text-sky-200' : 'text-rose-200'}`}>
                     {inr(stats.totalExposure)}
                   </p>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="text-center">
                   <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">Total Limit Cap</p>
                   <p className="text-lg font-black text-white leading-none">{inr(stats.totalLimit)}</p>
                </div>
             </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 md:px-10 -mt-10 space-y-10">

      {/* KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
      <div className="bg-white rounded-2xl p-6 border shadow-sm space-y-5" style={{ borderColor: COLORS.border }}>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-75 relative group pr-4">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#003399] transition-colors" />
            <input 
              type="text"
              placeholder="Search by name or reference ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-[#003399] focus:ring-2 focus:ring-[#003399]/10 transition-all placeholder:text-slate-300"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4">
             <div className="flex items-center gap-2">
                <button 
                  onClick={() => setQuickPeriod('this-month')}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${startDate && endDate && stats.isHistory ? 'bg-slate-100 text-slate-600' : 'bg-[#003399]/10 text-[#003399]'}`}
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
           <div className="flex flex-col gap-1 w-45">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-2 flex justify-between">
                <span>Usage Filter</span>
                <span className="text-[#003399]">{usageThreshold}%+</span>
              </label>
              <input 
                type="range" 
                min="0" max="100" step="10"
                value={usageThreshold}
                onChange={(e) => setUsageThreshold(e.target.value)}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#003399]"
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
                  className="w-24 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-black outline-none focus:border-[#003399]"
                 />
              </div>
              <div className="flex flex-col gap-1">
                 <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-2">Max Limit</label>
                 <input 
                  type="number" 
                  placeholder="₹ Max"
                  value={maxLimit}
                  onChange={(e) => setMaxLimit(e.target.value)}
                  className="w-24 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-black outline-none focus:border-[#003399]"
                 />
              </div>
           </div>
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-50 flex flex-wrap items-center justify-between gap-4 bg-white">
          <div>
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter leading-none">
              Credit Alert Ledger
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-2">
              {filtered.length} postpaid corporate{filtered.length === 1 ? "" : "s"} in current view
            </p>
          </div>
          <TableActionBar
            scrollRef={tableScrollRef}
            exportLabel="Export Alerts"
            onExport={handleAlertsExport}
            exportDisabled={isAlertsExporting}
            exportLoading={isAlertsExporting}
            exportClassName="bg-[#003399] hover:bg-[#002266] shadow-[#003399]/20"
            arrowClassName="border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:border-slate-300 hover:text-slate-900 disabled:hover:bg-slate-50"
          />
        </div>

        <div ref={tableScrollRef} className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-linear-to-r from-[#003399] to-[#000d26] text-white">
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest opacity-90">Postpaid Identity</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest opacity-90">Reference ID</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest opacity-90">Billing Cycle</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest opacity-90">Approved Limit</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest opacity-90">
                  {startDate && endDate ? 'Period Credit Usage' : 'Live Utilization'}
                </th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest opacity-90 text-right">Available Line</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest opacity-90 text-center">Ledger</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <tr>
                   <td colSpan="7" className="py-16 text-center">
                      <div className="flex flex-col items-center opacity-20">
                         <FiActivity size={64} className="text-slate-400 mb-4" />
                         <p className="text-xl font-black uppercase tracking-widest">No active risks detected</p>
                      </div>
                   </td>
                </tr>
              ) : (
                filtered.map((corp) => (
                  <tr key={corp._id} className="group hover:bg-slate-50/50 transition-all border-l-4 border-transparent hover:border-[#003399]">
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
                             <FiClock className="text-[#003399]" /> {corp.billingCycle || '30 days'}
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
                      <div className="w-45 space-y-2">
                        <div className="flex justify-between items-end">
                          <p className={`text-[10px] font-black uppercase tracking-tighter ${startDate && endDate ? 'text-[#003399]' : 'text-slate-500'}`}>
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
                              className={`h-full transition-all duration-1000 ${startDate && endDate ? 'bg-[#003399]' : (corp.utilization >= 90 ? 'bg-red-500' : corp.utilization >= 75 ? 'bg-amber-500' : 'bg-[#003399]')}`}
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
                            className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-[#003399] hover:bg-[#003399]/10 hover:border-[#003399]/20 transition-all hover:scale-110 active:scale-95 shadow-xs"
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
    </div>
  );
}

/* ── SHARED STATEMENT ROW ── */
function StatementRow({ row, onClick, onEdit }) {
  return (
    <tr
      onClick={onClick}
      className="group hover:bg-slate-50 cursor-pointer transition-all border-l-4 border-transparent hover:border-[#003399] text-[11px] font-bold"
    >
      <td className="px-8 py-4 font-mono text-slate-400">{row.rowNum}</td>
      <td className="px-8 py-4">
        <span className="flex items-center gap-2 text-[#003399] font-black">
          {row.statementId} <FiArrowUpRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
        </span>
      </td>
      <td className="px-8 py-4 whitespace-nowrap text-slate-600 font-black">
        {fmt(row.periodStart)} – {fmt(row.periodEnd)}
      </td>
      <td className="px-8 py-4 whitespace-nowrap text-slate-500">{fmt(row.statementDate)}</td>
      <td className="px-8 py-4 whitespace-nowrap text-slate-500">{fmt(row.dueDate)}</td>
      
      {!row.isCurrent && (
        <td className="px-8 py-4 whitespace-nowrap text-slate-500">
          {fmt(row.paymentReceivedAt)}
        </td>
      )}

      <td className="px-8 py-4 text-center">
        {row.isCurrent ? (
          <span className="px-3 py-1 rounded-lg font-black text-[9px] uppercase tracking-widest shadow-xs bg-indigo-50 text-indigo-600 border border-indigo-100">
            {row.remainingDays} Days Remaining
          </span>
        ) : (
          <span
            className={`px-3 py-1 rounded-lg font-black text-[9px] uppercase tracking-widest shadow-xs ${row.delayDays > 0 ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}
          >
            {row.delayDays} Days Delay
          </span>
        )}
      </td>
      <td className="px-8 py-4 font-black text-slate-900 text-[13px]">₹{fmtAmt(row.statementAmount)}</td>
      
      {!row.isCurrent && (
        <>
          <td className="px-8 py-4 font-black text-[#003399] text-[13px]">
            ₹{fmtAmt(row.receivedAmount || 0)}
          </td>
          <td className="px-8 py-4 text-center">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(row); }}
              className="p-2 text-slate-400 hover:text-[#003399] bg-slate-100 hover:bg-[#003399]/10 rounded-xl transition-all shadow-sm active:scale-95"
              title="Edit Received Amount"
            >
              <FiEdit2 size={14} />
            </button>
          </td>
        </>
      )}
    </tr>
  );
}

function SummaryCard({ label, value, icon, color, sub }) {
  return (
    <div
      className="bg-white rounded-2xl p-6 border-b-4 shadow-sm flex flex-col justify-between"
      style={{ borderBottomColor: color }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
          <h3 className="text-3xl font-black text-slate-800">{value}</h3>
        </div>
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${color}14`, color }}
        >
          {React.cloneElement(icon, { size: 24 })}
        </div>
      </div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4">{sub}</p>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div className="flex flex-col gap-1 text-left min-w-35">
      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-2">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer focus:ring-2 focus:ring-[#003399]/5 transition-all shadow-xs"
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
         className="px-2 py-1 bg-white border border-slate-100 rounded-lg text-[10px] font-black text-[#003399] outline-none w-27.5 focus:ring-1 focus:ring-[#003399]/10 transition-all text-center shadow-xs"
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
