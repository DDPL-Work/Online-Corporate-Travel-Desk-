import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  FiFilter,
  FiDownload,
  FiCalendar,
  FiTrendingUp,
  FiBriefcase,
  FiSearch,
  FiPieChart,
  FiBarChart2,
  FiActivity,
  FiArrowUpRight,
  FiArrowDownRight,
  FiNavigation,
  FiArrowLeft,
  FiUser,
  FiClock,
  FiCheckCircle,
  FiHash,
  FiLayers,
  FiEye,
  FiChevronRight,
  FiChevronLeft,
  FiRefreshCw,
  FiChevronDown,
} from "react-icons/fi";
import { MdBusiness } from "react-icons/md";
import { FaRupeeSign, FaChartLine, FaBuilding, FaPlane } from "react-icons/fa";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  fetchRevenueSummary,
  fetchCompanyWiseRevenue,
  fetchMonthlyRevenue,
  fetchQuarterlyRevenue,
  fetchHalfYearlyRevenue,
  fetchYearlyRevenue,
  fetchDailyRevenue,
  fetchCorporateDetailedBookings,
} from "../../Redux/Actions/corporate.related.thunks";
import api from "../../API/axios";
import { toast } from "sonner";
import useExcelExporter from "../../services/export/useExcelExporter";
import {
  corporateRevenueLeaderboardExportTemplate,
  corporateRevenueTransactionsExportTemplate,
} from "../../templates/exportTemplates/superAdminExportTemplates";
import Pagination from "../Shared/Pagination";
import TableActionBar from "../Shared/TableActionBar";

const C = {
  navy: "#003399",
  offWhite: "#f8fafc",
  white: "#ffffff",
  border: "#e2e8f0",
  muted: "#64748b",
  lightGray: "#f1f5f9",
  gold: "#d97706",
  emerald: "#10b981",
  red: "#ef4444",
  amber: "#f59e0b"
};

const COLORS = [
  C.navy,
  C.gold,
  C.amber,
  C.emerald,
  "#0ea5e9", // sky
  "#8b5cf6", // violet
  "#f43f5e", // rose
];

const Avatar = ({ name = "", classification = "postpaid" }) => {
  const nameStr = typeof name === "string" ? name : String(name || "");
  const initials = nameStr
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  
  const isPostpaid = classification === "postpaid";
  const color = isPostpaid 
    ? "from-[#003399] to-[#000d26]"
    : "from-amber-500 to-orange-400";
    
  return (
    <div
      className={`w-8 h-8 text-[10px] rounded-full bg-linear-to-br ${color} flex items-center justify-center font-black text-white shrink-0 shadow-sm border border-white/20`}
    >
      {initials || "?"}
    </div>
  );
};
const ITEMS_PER_PAGE = 10;

export default function CorporateRevenue() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const leaderboardScrollRef = useRef(null);
  const { exportExcel, exportingKey } = useExcelExporter();

  // 🟢 1. STATE HOOKS
  const [dateRange, setDateRange] = useState("thisMonth");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedCorporate, setSelectedCorporate] = useState("All");
  const [bookingType, setBookingType] = useState("Both");

  const [summary, setSummary] = useState(null);
  const [companyWise, setCompanyWise] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [quarterly, setQuarterly] = useState([]);
  const [halfYearly, setHalfYearly] = useState([]);
  const [yearly, setYearly] = useState([]);
  const [daily, setDaily] = useState([]);
  const [corporates, setCorporates] = useState([]);
  const [loading, setLoading] = useState(true);

  const [leaderboardPage, setLeaderboardPage] = useState(1);
  const [drillDownPage, setDrillDownPage] = useState(1);

  const [drillDownId, setDrillDownId] = useState(null);
  const [drillDownData, setDrillDownData] = useState([]);
  const [drillDownLoading, setDrillDownLoading] = useState(false);

  const [ddSearch, setDdSearch] = useState("");
  const [ddCategory, setDdCategory] = useState("All");
  const [ddStatus, setDdStatus] = useState("All");
  const [ddStartDate, setDdStartDate] = useState("");
  const [ddEndDate, setDdEndDate] = useState("");

  const [viewMode, setViewMode] = useState("monthly");

  const tableScrollRef = useRef(null);
  const handleScroll = (direction) => {
    if (tableScrollRef.current) {
      const scrollAmount = 300;
      tableScrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth"
      });
    }
  };

  // 🟢 2. MEMO HOOKS
  const computedDates = useMemo(() => {
    const today = new Date();
    let from = "";
    let to = today.toISOString().split("T")[0];

    if (dateRange === "today") {
      from = to;
    } else if (dateRange === "last7Days") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      from = d.toISOString().split("T")[0];
    } else if (dateRange === "thisMonth") {
      from = new Date(today.getFullYear(), today.getMonth(), 1)
        .toISOString()
        .split("T")[0];
    } else {
      from = startDate;
      to = endDate;
    }
    return { from, to };
  }, [dateRange, startDate, endDate]);

  const filteredDrillDownData = useMemo(() => {
    return drillDownData.filter((b) => {
      const matchSearch =
        (b.reference || "").toLowerCase().includes(ddSearch.toLowerCase()) ||
        (b.employee || "").toLowerCase().includes(ddSearch.toLowerCase());
      const matchCat = ddCategory === "All" || b.type === ddCategory;
      const matchStatus =
        ddStatus === "All" ||
        (b.status || "").toLowerCase().includes(ddStatus.toLowerCase());
        
      let matchDate = true;
      if (ddStartDate && ddEndDate) {
        const bDate = new Date(b.date).getTime();
        const sDate = new Date(ddStartDate).getTime();
        const eDate = new Date(ddEndDate).setHours(23, 59, 59, 999);
        matchDate = bDate >= sDate && bDate <= eDate;
      }
      
      return matchSearch && matchCat && matchStatus && matchDate;
    });
  }, [drillDownData, ddSearch, ddCategory, ddStatus, ddStartDate, ddEndDate]);

  const paginatedLeaderboard = useMemo(() => {
    const start = (leaderboardPage - 1) * ITEMS_PER_PAGE;
    return companyWise.slice(start, start + ITEMS_PER_PAGE);
  }, [companyWise, leaderboardPage]);

  const handleExport = () => {
    if (filteredDrillDownData.length === 0) {
      toast.error("No data to export");
      return;
    }

    const corp = corporates.find((c) => c._id === drillDownId) || companyWise.find((c) => c.corporateId === drillDownId) || {};
    const corpName = corp.corporateName || corp.companyName || "Corporate Revenue Drill Down";
    const totalSelectedRev = filteredDrillDownData.reduce((sum, b) => sum + b.amount, 0);
    const formattedDateRange = ddStartDate && ddEndDate ? `${new Date(ddStartDate).toLocaleDateString("en-GB", {day:"numeric", month:"short"})} - ${new Date(ddEndDate).toLocaleDateString("en-GB", {day:"numeric", month:"short"})}` : "All Dates";
    
    exportExcel({
      key: "corporate_revenue_transactions",
      pageHeader: corpName,
      statCards: [
        { label: "Corporate Spent", value: inr(totalSelectedRev) },
        { label: "Detailed Bookings", value: filteredDrillDownData.length },
        { label: "Date Range", value: formattedDateRange }
      ],
      appliedFilters: [
        { label: "Search", value: ddSearch || "None" },
        { label: "Category", value: ddCategory },
        { label: "Status", value: ddStatus },
        { label: "Start Date", value: ddStartDate || "Any" },
        { label: "End Date", value: ddEndDate || "Any" }
      ],
      data: filteredDrillDownData,
      columns: corporateRevenueTransactionsExportTemplate,
      filenamePrefix: `${corpName.replace(/\s+/g, "_")}_revenue_drilldown`,
      emptyMessage: "No drilldown data available to export",
      successMessage: "Drilldown data exported",
    });
  };

  const handleLeaderboardExport = () => {
    if (companyWise.length === 0) {
      toast.error("No data to export");
      return;
    }

    const exportData = companyWise.map((company, index) => ({
      ...company,
      exportRank: index + 1
    }));

    exportExcel({
      key: "corporate_revenue_leaderboard",
      pageHeader: "Corporate Revenue Leaderboard",
      statCards: [
        { label: "Total Revenue", value: inr(summary?.totalRevenue) },
        { label: "Flight Revenue", value: inr(summary?.flights?.totalRevenue) },
        { label: "Hotel Revenue", value: inr(summary?.hotels?.totalRevenue) },
        { label: "Avg Booking Value", value: inr(summary?.avgBookingValue) }
      ],
      appliedFilters: [
        { label: "Date Range", value: dateRange },
        { label: "Start Date", value: startDate || "Any" },
        { label: "End Date", value: endDate || "Any" },
        { label: "Booking Type", value: bookingType },
        { label: "Corporate", value: selectedCorporate }
      ],
      data: exportData,
      columns: corporateRevenueLeaderboardExportTemplate,
      filenamePrefix: "corporate_revenue_leaderboard",
      emptyMessage: "No leaderboard data available to export",
      successMessage: "Leaderboard data exported",
    });
  };

  const paginatedDrillDown = useMemo(() => {
    const start = (drillDownPage - 1) * ITEMS_PER_PAGE;
    return filteredDrillDownData.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredDrillDownData, drillDownPage]);

  const activeTrendData = useMemo(() => {
    switch (viewMode) {
      case "yearly":
        return yearly;
      case "half-yearly":
        return halfYearly;
      case "quarterly":
        return quarterly;
      case "custom":
        return daily;
      default:
        return monthly;
    }
  }, [viewMode, monthly, quarterly, halfYearly, yearly, daily]);

  const xDataKey =
    viewMode === "monthly"
      ? "month"
      : viewMode === "quarterly"
        ? "quarter"
        : "label";

  // 🟢 3. EFFECT HOOKS
  useEffect(() => {
    const fetchCorps = async () => {
      try {
        const res = await api.get("/corporate-related/");
        const approvedCorporates = (res.data.data || []).filter(
          (c) => c.status === "active",
        );
        setCorporates(approvedCorporates);
    } catch {
      toast.error("Failed to load corporates");
      }
    };
    fetchCorps();
  }, [dispatch]);

  const fetchData = async () => {
    setLoading(true);
    const params = {
      fromDate: computedDates.from,
      toDate: computedDates.to,
      corporateId: selectedCorporate,
      bookingType,
    };

    try {
      const [sumRes, compRes, monRes, quartRes, halfRes, yearRes, dailyRes] =
        await Promise.all([
          dispatch(fetchRevenueSummary(params)).unwrap(),
          dispatch(fetchCompanyWiseRevenue(params)).unwrap(),
          dispatch(fetchMonthlyRevenue(params)).unwrap(),
          dispatch(fetchQuarterlyRevenue(params)).unwrap(),
          dispatch(fetchHalfYearlyRevenue(params)).unwrap(),
          dispatch(fetchYearlyRevenue(params)).unwrap(),
          dispatch(fetchDailyRevenue(params)).unwrap(),
        ]);

      setSummary(sumRes.data);
      setCompanyWise(compRes.data);
      setMonthly(monRes.data);
      setQuarterly(quartRes.data);
      setHalfYearly(halfRes.data);
      setYearly(yearRes.data);
      setDaily(dailyRes.data);
      setLeaderboardPage(1);
    } catch (err) {
      toast.error(err.message || "Failed to fetch revenue data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!drillDownId) fetchData();
  }, [computedDates, selectedCorporate, bookingType, drillDownId, dispatch]);

  useEffect(() => {
    if (drillDownId) {
      const fetchDetails = async () => {
        setDrillDownLoading(true);

        try {
          const res = await dispatch(fetchCorporateDetailedBookings({ id: drillDownId })).unwrap();
          setDrillDownData(res.data);
          setDrillDownPage(1);
        } catch {
          toast.error("Failed to fetch detailed bookings");
        } finally {
          setDrillDownLoading(false);
        }
      };
      fetchDetails();
    }
  }, [drillDownId, dispatch]);

  // 🟠 4. RENDER LOGIC
  const inr = (val) => `₹${Number(val || 0).toLocaleString("en-IN")}`;

  if (loading && !summary && !drillDownId) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#003399] mb-4"></div>
        <p className="text-slate-500 font-medium animate-pulse">
          Loading Revenue Intelligence...
        </p>
      </div>
    );
  }

  // --- DRILL DOWN VIEW ---
  if (drillDownId) {
    const corp =
      corporates.find((c) => c._id === drillDownId) ||
      companyWise.find((c) => c.corporateId === drillDownId) ||
      {};
    const corpName =
      corp.corporateName || corp.companyName || "Corporate Details";
    const totalSelectedRev = filteredDrillDownData.reduce(
      (sum, b) => sum + b.amount,
      0,
    );

    return (
      <div className="min-h-screen font-sans pb-20 -mt-6 -mx-4 md:-mx-6" style={{ background: C.offWhite }}>
        {/* Navy Header Section */}
        <div className="w-full bg-linear-to-br from-[#003399] to-[#000d26] text-white pt-8 pb-20 px-6 md:px-10">
          <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setDrillDownId(null);
                    setDdSearch("");
                    setDdCategory("All");
                    setDdStatus("All");
                  }}
                  className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/10 text-white shadow-sm"
                >
                  <FiArrowLeft size={20} />
                </button>
              </div>

              <div className="h-12 w-px bg-white/10 mx-2 hidden md:block" />

              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl text-white border border-white/10 bg-white/10">
                  <FiBriefcase size={28} />
                </div>
                <div>
                  <h1 className="text-3xl font-black tracking-tight leading-none">{corpName}</h1>
                  <p className="text-[10px] mt-2 font-bold uppercase tracking-[2px] opacity-60">
                    All approved bookings
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full px-4 md:px-10 -mt-10 space-y-6">

        {/* Filter Section */}
        <div className="bg-white rounded-2xl p-6 border shadow-sm" style={{ borderColor: C.border }}>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-62.5 flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><FiSearch size={12} /> Search Bookings</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Reference ID or employee name..."
                  value={ddSearch}
                  onChange={(e) => setDdSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-[13px] font-medium outline-none transition-all focus:border-[#003399] focus:ring-2 focus:ring-[#003399]/10 bg-slate-50 hover:bg-white"
                />
                <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              </div>
            </div>
            
            <div className="w-full md:w-auto flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><FiLayers size={12}/> Category</label>
              <CustomSelect
                value={ddCategory}
                onChange={setDdCategory}
                options={[
                  { label: "All Categories", value: "All" },
                  { label: "Flights", value: "Flight" },
                  { label: "Hotels", value: "Hotel" }
                ]}
              />
            </div>
            
            <div className="w-full md:w-auto flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><FiCalendar size={12}/> Date Range</label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={ddStartDate}
                  onChange={(e) => setDdStartDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-[13px] font-medium outline-none transition-all focus:border-[#003399] focus:ring-2 focus:ring-[#003399]/10 bg-slate-50 hover:bg-white"
                />
                <span className="text-slate-300 font-bold">—</span>
                <input
                  type="date"
                  value={ddEndDate}
                  onChange={(e) => setDdEndDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-[13px] font-medium outline-none transition-all focus:border-[#003399] focus:ring-2 focus:ring-[#003399]/10 bg-slate-50 hover:bg-white"
                />
              </div>
            </div>
            
            <div className="w-full md:w-auto flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><FiCheckCircle size={12}/> Status</label>
              <CustomSelect
                value={ddStatus}
                onChange={setDdStatus}
                options={[
                  { label: "All Status", value: "All" },
                  { label: "Succeeded", value: "succeeded" },
                  { label: "Failed", value: "failed" },
                  { label: "Cancelled", value: "cancelled" },
                  { label: "In Progress", value: "in_progress" }
                ]}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <KPICard
            label="Corporate Spent"
            value={inr(totalSelectedRev)}
            icon={<FaRupeeSign />}
            borderCls="border-[#000D26]"
            iconBgCls="bg-slate-100"
            iconColorCls="text-[#000D26]"
            size="small"
          />
          <KPICard
            label="Detailed Bookings"
            value={filteredDrillDownData.length}
            icon={<FiBriefcase />}
            borderCls="border-indigo-500"
            iconBgCls="bg-indigo-50"
            iconColorCls="text-indigo-600"
            size="small"
          />
          <KPICard
            label="Date Range"
            value={ddStartDate && ddEndDate ? `${new Date(ddStartDate).toLocaleDateString("en-GB", {day:"numeric", month:"short"})} - ${new Date(ddEndDate).toLocaleDateString("en-GB", {day:"numeric", month:"short"})}` : "All Dates"}
            icon={<FiCalendar />}
            borderCls="border-amber-500"
            iconBgCls="bg-amber-50"
            iconColorCls="text-amber-600"
            size="small"
          />
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-800 uppercase tracking-tighter leading-none">
                Transaction History
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1.5">
                Granular view of corporate activity
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleExport}
                disabled={exportingKey === "corporate_revenue_transactions"}
                className="flex items-center gap-2 px-4 py-2 bg-[#003399] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#002266] transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-[#003399]/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exportingKey === "corporate_revenue_transactions" ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <FiDownload size={14} />
                )}
                {exportingKey === "corporate_revenue_transactions" ? "Exporting..." : "Export"}
              </button>
              
              <div className="w-px h-6 bg-slate-200 mx-1"></div>

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


          <div ref={tableScrollRef} className="overflow-x-auto min-h-100">
            {drillDownLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#003399] mb-4"></div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                  Compiling details...
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse" style={{ minWidth: "900px" }}>
                <thead>
                  <tr className="bg-linear-to-r from-[#003399] to-[#000d26] text-white">
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest opacity-90 whitespace-nowrap">Order ID</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest opacity-90 whitespace-nowrap">Payment ID</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest opacity-90 whitespace-nowrap">Traveller & Email</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest opacity-90 whitespace-nowrap">Payment Date</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest opacity-90 whitespace-nowrap">Category</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest opacity-90 whitespace-nowrap">Status</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest opacity-90 text-right whitespace-nowrap">Amount</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest opacity-90 text-center whitespace-nowrap">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/50">
                  {paginatedDrillDown.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-24 text-center">
                        <div className="flex flex-col items-center">
                          <FiActivity
                            size={32}
                            className="text-slate-200 mb-3"
                          />
                          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                            No matching transactions found
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedDrillDown.map((b, i) => (
                      <tr
                        key={i}
                        className="hover:bg-slate-50/50 transition-all border-l-4 border-transparent hover:border-[#003399]"
                      >
                        {/* Order ID */}
                        <td className="px-6 py-3.5">
                          <span className="font-mono text-[12px] font-black text-slate-800 uppercase tracking-tight whitespace-nowrap">
                            {b.orderId || b.reference || "—"}
                          </span>
                        </td>

                        {/* Payment ID */}
                        <td className="px-6 py-3.5">
                          {b.paymentId ? (
                            <span className="font-mono text-[11px] font-black bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 rounded-md whitespace-nowrap">
                              {b.paymentId}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-300 font-medium">—</span>
                          )}
                        </td>

                        {/* Traveller & Email */}
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100 shrink-0">
                              <FiUser size={14} />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-black text-[12.5px] text-slate-700 whitespace-nowrap">
                                {b.employee}
                              </span>
                              <span className="text-[10.5px] text-slate-400 font-medium truncate max-w-45">
                                {b.email || "—"}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Payment Date */}
                        <td className="px-6 py-3.5 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-[12.5px] text-slate-700 font-bold">
                              {new Date(b.date).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {new Date(b.date).toLocaleTimeString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="px-6 py-3.5">
                          <span
                            className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border whitespace-nowrap ${
                              b.type === "Flight"
                                ? "bg-blue-50 text-blue-700 border-blue-100"
                                : "bg-purple-50 text-purple-700 border-purple-100"
                            }`}
                          >
                            {b.type === "Flight" ? "✈ Flight" : "🏨 Hotel"}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-3.5">
                          <div
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap ${
                              b.status?.toLowerCase().includes("success")
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                : b.status?.toLowerCase().includes("cancel")
                                  ? "bg-rose-50 text-rose-700 border border-rose-100"
                                  : "bg-amber-50 text-amber-700 border border-amber-100"
                            }`}
                          >
                            <div
                              className={`w-1.5 h-1.5 rounded-full ${
                                b.status?.toLowerCase().includes("success")
                                  ? "bg-emerald-600"
                                  : b.status?.toLowerCase().includes("cancel")
                                    ? "bg-rose-600"
                                    : "bg-amber-500"
                              }`}
                            />
                            {b.status?.replace(/_/g, " ") || "—"}
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="px-6 py-3.5 text-right whitespace-nowrap">
                          <span className="font-black text-[14px] text-slate-900 tracking-tight">
                            {inr(b.amount)}
                          </span>
                        </td>

                        {/* View */}
                        <td className="px-6 py-3.5 text-center">
                          <button
                            onClick={() =>
                              navigate(
                                b.type === "Flight"
                                  ? `/bookings/flight/${b.id}`
                                  : `/bookings/hotel/${b.id}`
                              )
                            }
                            className="w-8 h-8 rounded-xl bg-[#003399]/8 hover:bg-[#003399]/15 flex items-center justify-center text-[#003399] transition-colors mx-auto"
                            title="View booking details"
                          >
                            <FiEye size={15} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
          <div className="px-6 py-4 border-t border-slate-50 flex items-center justify-end">
            <Pagination
              currentPage={drillDownPage}
              totalPages={Math.ceil(
                filteredDrillDownData.length / ITEMS_PER_PAGE,
              )}
              onPageChange={setDrillDownPage}
              showFirstLast={false}
            />
          </div>
        </div>
        </div>
      </div>
    );
  }

  // --- MAIN DASHBOARD VIEW ---
  return (
    <div className="min-h-screen font-sans pb-20 -mt-6 -mx-4 md:-mx-6" style={{ background: C.offWhite }}>
      {/* Navy Header Section */}
      <div className="w-full bg-linear-to-br from-[#003399] to-[#000d26] text-white pt-8 pb-20 px-6 md:px-10">
        <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate(-1)} 
                className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/10 text-white shadow-sm"
              >
                <FiArrowLeft size={20} />
              </button>
              <button 
                onClick={fetchData} 
                className={`p-3 rounded-xl bg-white/10 transition-all border border-white/10 ${loading ? "opacity-50 cursor-not-allowed" : "hover:bg-white/20"}`}
                disabled={loading}
              >
                <div className={loading ? "animate-spin" : ""}>
                  <FiRefreshCw size={20} />
                </div>
              </button>
            </div>
            
            <div className="h-12 w-px bg-white/10 mx-2 hidden md:block" />

            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl text-white border border-white/10 bg-white/10" >
                <FaChartLine size={28} />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight leading-none">Corporate Revenue</h1>
                <p className="text-[10px] mt-2 font-bold uppercase tracking-[2px] opacity-60">
                  Financial analytics & reporting
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 md:px-10 -mt-10 space-y-10">

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          label="Total Revenue"
          value={inr(summary?.totalRevenue)}
          icon={<FaRupeeSign />}
          borderCls="border-[#000D26]"
          iconBgCls="bg-slate-100"
          iconColorCls="text-[#000D26]"
          trend="+12.5%"
          isGood={true}
        />
        <KPICard
          label="Flight Revenue"
          value={inr(summary?.flights?.totalRevenue)}
          icon={<FaPlane />}
          borderCls="border-[#003399]"
          iconBgCls="bg-[#003399]/10"
          iconColorCls="text-[#003399]"
          subLabel={`${summary?.flights?.totalBookings} Bookings`}
        />
        <KPICard
          label="Hotel Revenue"
          value={inr(summary?.hotels?.totalRevenue)}
          icon={<FaBuilding />}
          borderCls="border-[#d97706]"
          iconBgCls="bg-[#d97706]/10"
          iconColorCls="text-[#d97706]"
          subLabel={`${summary?.hotels?.totalBookings} Bookings`}
        />
        <KPICard
          label="Avg Booking Value"
          value={inr(summary?.avgBookingValue)}
          icon={<FiTrendingUp />}
          borderCls="border-emerald-500"
          iconBgCls="bg-emerald-50"
          iconColorCls="text-emerald-600"
          subLabel="Per successful booking"
        />
      </div>

        {/* Filter Section */}
        <div className="bg-white rounded-2xl p-6 border shadow-sm" style={{ borderColor: C.border }}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
            <div className="flex flex-col gap-1.5 lg:col-span-3">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><FiCalendar size={12}/> Date Range</label>
              <CustomSelect
                value={dateRange}
                onChange={setDateRange}
                options={[
                  { label: "Today", value: "today" },
                  { label: "Last 7 Days", value: "last7Days" },
                  { label: "This Month", value: "thisMonth" },
                  { label: "Custom Range", value: "custom" }
                ]}
              />
            </div>

            {dateRange === "custom" && (
              <div className="flex flex-col gap-1.5 lg:col-span-3">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><FiCalendar size={12}/> Custom Range</label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2.5 border rounded-xl text-[13px] font-medium outline-none transition-all focus:border-[#003399] focus:ring-2 focus:ring-[#003399]/10 bg-slate-50 hover:bg-white"
                  />
                  <span className="text-slate-300 font-bold">—</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2.5 border rounded-xl text-[13px] font-medium outline-none transition-all focus:border-[#003399] focus:ring-2 focus:ring-[#003399]/10 bg-slate-50 hover:bg-white"
                  />
                </div>
              </div>
            )}

            <div className={`flex flex-col gap-1.5 ${dateRange === "custom" ? "lg:col-span-2" : "lg:col-span-3"}`}>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><FiLayers size={12}/> Booking Type</label>
              <CustomSelect
                value={bookingType}
                onChange={setBookingType}
                options={[
                  { label: "Both (F+H)", value: "Both" },
                  { label: "Flights Only", value: "Flights" },
                  { label: "Hotels Only", value: "Hotels" }
                ]}
              />
            </div>

            <div className={`flex flex-col gap-1.5 ${dateRange === "custom" ? "lg:col-span-3" : "lg:col-span-5"}`}>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><MdBusiness size={12}/> Corporate</label>
              <CustomSelect
                value={selectedCorporate}
                onChange={setSelectedCorporate}
                options={[
                  { label: "All Onboarded", value: "All" },
                  ...corporates.map((c) => ({ label: c.corporateName, value: c._id }))
                ]}
              />
            </div>
            
            {/* The refresh button is already in the header now, so we don't need a separate fetch button here since we also fetch on dependency change. */}
          </div>
        </div>

    

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
            <div>
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter leading-none">
                Revenue Trends
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-2">
                Historical Performance Analysis
              </p>
            </div>
            <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
              {["monthly", "quarterly", "half-yearly", "yearly", "custom"].map(
                (mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                      viewMode === mode
                        ? "bg-white text-[#003399] shadow-md scale-105 border border-slate-100"
                        : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    {mode.replace("-", " ")}
                  </button>
                ),
              )}
            </div>
          </div>

          <div className="h-87.5 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {viewMode !== "quarterly" ? (
                <AreaChart
                  data={activeTrendData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="colorFlight"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#003399" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#003399" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorHotel" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#d97706" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f1f5f9"
                  />
                  <XAxis
                    dataKey={xDataKey}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 9, fontWeight: 800 }}
                    dy={12}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 9, fontWeight: 800 }}
                    tickFormatter={(v) =>
                      `₹${
                        v >= 1000000
                          ? (v / 1000000).toFixed(1) + "M"
                          : v >= 1000
                            ? (v / 1000).toFixed(0) + "k"
                            : v
                      }`
                    }
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    height={30}
                    iconType="circle"
                  />
                  <Area
                    type="monotone"
                    dataKey="flightRev"
                    name="Flight Revenue"
                    stroke="#003399"
                    strokeWidth={4}
                    fillOpacity={1}
                    fill="url(#colorFlight)"
                    activeDot={{ r: 6, stroke: "#fff", strokeWidth: 2 }}
                    animationDuration={1500}
                  />
                  <Area
                    type="monotone"
                    dataKey="hotelRev"
                    name="Hotel Revenue"
                    stroke="#d97706"
                    strokeWidth={4}
                    fillOpacity={1}
                    fill="url(#colorHotel)"
                    activeDot={{ r: 6, stroke: "#fff", strokeWidth: 2 }}
                    animationDuration={1500}
                  />
                </AreaChart>
              ) : (
                <BarChart
                  data={activeTrendData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  barGap={8}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f1f5f9"
                  />
                  <XAxis
                    dataKey={xDataKey}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 10, fontWeight: 800 }}
                    dy={8}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 9, fontWeight: 800 }}
                    tickFormatter={(v) =>
                      `₹${
                        v >= 1000000
                          ? (v / 1000000).toFixed(1) + "M"
                          : v >= 1000
                            ? (v / 1000).toFixed(0) + "k"
                            : v
                      }`
                    }
                  />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ fill: "#f8fafc" }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    height={30}
                    iconType="circle"
                  />
                  <Bar
                    dataKey="flightRev"
                    name="Flight Revenue"
                    fill="#003399"
                    radius={[6, 6, 0, 0]}
                    barSize={24}
                    animationDuration={1500}
                  />
                  <Bar
                    dataKey="hotelRev"
                    name="Hotel Revenue"
                    fill="#d97706"
                    radius={[6, 6, 0, 0]}
                    barSize={24}
                    animationDuration={1500}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col items-center">
          <div className="w-full mb-6">
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter leading-none">
              Market Share
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2 leading-none">
              Leading Corporates by Volume
            </p>
          </div>
          <div className="flex-1 w-full min-h-70 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={companyWise.slice(0, 5)}
                  cx="50%"
                  cy="45%"
                  innerRadius={70}
                  outerRadius={95}
                  paddingAngle={8}
                  dataKey="revenue"
                  nameKey="companyName"
                  stroke="none"
                  animationBegin={0}
                  animationDuration={1500}
                >
                  {companyWise.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                      className="hover:opacity-80 transition-opacity cursor-pointer"
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => inr(v)} />
                <Legend
                  verticalAlign="bottom"
                  height={30}
                  content={({ payload }) => (
                    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-4">
                      {payload.map((entry, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 group cursor-pointer"
                        >
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: entry.color }}
                          />
                          <span className="text-[9px] font-black uppercase text-slate-500 tracking-tighter">
                            {entry.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">
                Total Rev
              </p>
              <p className="text-xl font-black text-[#003399] leading-none">
                {summary?.totalRevenue >= 1000000
                  ? (summary.totalRevenue / 1000000).toFixed(2) + "M"
                  : summary?.totalRevenue >= 1000
                    ? (summary.totalRevenue / 1000).toFixed(0) + "k"
                    : inr(summary?.totalRevenue)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-50 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter leading-none">
              Corporate Leaderboard
            </h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-none mt-2">
              Ranking based on transaction volume
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Pagination
              currentPage={leaderboardPage}
              totalPages={Math.ceil(companyWise.length / ITEMS_PER_PAGE)}
              onPageChange={setLeaderboardPage}
              showFirstLast={false}
            />
            <TableActionBar
              scrollRef={leaderboardScrollRef}
              exportLabel="Export"
              onExport={handleLeaderboardExport}
              exportDisabled={exportingKey === "corporate_revenue_leaderboard"}
              exportLoading={exportingKey === "corporate_revenue_leaderboard"}
              exportClassName="bg-slate-900 hover:bg-black shadow-black/10"
              arrowClassName="border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:border-slate-300 hover:text-slate-900 disabled:hover:bg-slate-50"
            />
          </div>
        </div>

        <div ref={leaderboardScrollRef} className="overflow-x-auto">
          <table className="min-w-305 w-full table-fixed text-left border-collapse">
            <thead>
              <tr className="bg-linear-to-r from-[#003399] to-[#000d26] text-white">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest opacity-90">Rank</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest opacity-90">Company</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest opacity-90">Account Type</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest opacity-90">Total Bookings</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest opacity-90">Revenue Spread</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest opacity-90 text-right">Revenue</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest opacity-90 text-right">Contribution</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest opacity-90 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginatedLeaderboard.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-20 text-center">
                    <div className="flex flex-col items-center">
                      <FiActivity size={40} className="text-slate-200 mb-3" />
                      <p className="text-slate-400 font-bold uppercase text-xs">
                        No corporate data available
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedLeaderboard.map((c, i) => {
                  const rank = (leaderboardPage - 1) * ITEMS_PER_PAGE + i + 1;
                  return (
                    <tr
                      key={c.corporateId}
                      className="h-21 hover:bg-slate-50/50 transition-all group"
                    >
                      <td className="px-6 py-4 align-middle font-black text-slate-300 group-hover:text-[#003399] whitespace-nowrap">
                        #{String(rank).padStart(2, "0")}
                      </td>
                      <td className="px-6 py-4 align-middle">
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 font-black text-[15px] capitalize group-hover:bg-[#003399]/10 group-hover:text-[#003399] transition-colors">
                            {c.companyName[0]}
                          </div>
                          <span className="block max-w-60 font-black text-[13px] leading-snug text-slate-800 tracking-tight">
                            {c.companyName}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 align-middle">
                        <span
                          className={`inline-flex min-w-29 items-center justify-center px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
                            c.accountType === "postpaid"
                              ? "bg-purple-50 text-purple-700 border-purple-100"
                              : "bg-emerald-50 text-emerald-700 border-emerald-100"
                          }`}
                        >
                          {c.accountType}
                        </span>
                      </td>
                      <td className="px-6 py-4 align-middle">
                        <div className="flex items-center">
                          <span className="inline-flex min-w-27.5 items-center justify-center px-3 py-2 bg-slate-100 rounded-xl text-[10px] font-black text-slate-600 tracking-tighter uppercase leading-none">
                            {c.bookings} Bookings
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 align-middle">
                        <div className="w-42.5 space-y-2 leading-none">
                          <div className="flex justify-between text-[9px] font-black uppercase text-slate-400 tracking-widest">
                            <span>
                              F:{" "}
                              {Math.round(
                                (c.flightRev / (c.revenue || 1)) * 100,
                              )}
                              %
                            </span>
                            <span>
                              H:{" "}
                              {Math.round(
                                (c.hotelRev / (c.revenue || 1)) * 100,
                              )}
                              %
                            </span>
                          </div>
                          <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                            <div
                              className="h-full bg-[#003399]"
                              style={{
                                width: `${(c.flightRev / (c.revenue || 1)) * 100}%`,
                              }}
                            />
                            <div
                              className="h-full bg-[#d97706]"
                              style={{
                                width: `${(c.hotelRev / (c.revenue || 1)) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 align-middle text-right">
                        <span className="text-[13px] font-black text-slate-900 tracking-tight whitespace-nowrap">
                          {inr(c.revenue)}
                        </span>
                      </td>
                      <td className="px-6 py-4 align-middle text-right">
                        <div className="flex items-center justify-end gap-1.5 text-emerald-600 font-black text-[10px] tracking-tighter whitespace-nowrap">
                          <FiArrowUpRight size={10} />{" "}
                          {c.contribution.toFixed(1)}%
                        </div>
                      </td>
                      <td className="px-6 py-4 align-middle text-center">
                        <button
                          onClick={() => setDrillDownId(c.corporateId)}
                          className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:text-[#003399] hover:bg-[#003399]/10 hover:border-[#003399]/20 transition-all hover:scale-110 active:scale-95 mx-auto"
                          title="View Detailed Revenue"
                        >
                          <FiEye size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </div>
  );
}

// ------------------- SUB-COMPONENTS -------------------

function CustomSelect({ value, onChange, options, icon, className = "" }) {
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
        <span className="flex items-center gap-2 truncate text-slate-700">
          {icon && <span className="text-slate-400">{icon}</span>}
          {selectedOption?.label}
        </span>
        <FiChevronDown className={`text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} size={16} />
      </button>
      
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-100 rounded-xl shadow-lg shadow-slate-200/50 py-1 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-1">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 text-[13px] font-medium transition-colors hover:bg-slate-50 flex items-center justify-between ${
                String(value) === String(opt.value) ? "text-[#003399] bg-[#003399]/5" : "text-slate-600"
              }`}
            >
              <span className="truncate">{opt.label}</span>
              {String(value) === String(opt.value) && <FiCheckCircle size={14} className="shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function KPICard({ label, value, icon, borderCls, iconBgCls, iconColorCls, trend, subLabel, isGood, size }) {
  const isSmall = size === "small";
  
  // Default styling if explicit classes aren't passed (for backward compatibility during refactor)
  const bCls = borderCls || "border-[#000D26]";
  const bgCls = iconBgCls || "bg-slate-100";
  const cCls = iconColorCls || "text-[#000D26]";

  return (
    <div className={`bg-white rounded-2xl ${isSmall ? "p-4" : "p-6"} border-b-4 ${bCls} shadow-sm flex flex-col justify-between`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
          <h3 className={`${isSmall ? "text-xl" : "text-3xl"} font-black text-slate-800`}>{value}</h3>
        </div>
        <div className={`rounded-xl flex items-center justify-center ${bgCls} ${cCls} ${isSmall ? "w-10 h-10" : "w-12 h-12"}`}>
          {React.cloneElement(icon, { size: isSmall ? 20 : 24 })}
        </div>
      </div>
      
      {(trend || subLabel) && (
        <div className="mt-4 flex items-center gap-3">
          {trend && (
            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black ${isGood ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-rose-50 text-rose-600 border border-rose-100"} shadow-sm`}>
              {isGood ? <FiArrowUpRight size={12} /> : <FiArrowDownRight size={12} />}
              {trend}
            </div>
          )}
          {subLabel && (
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{subLabel}</p>
          )}
        </div>
      )}
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-100 shadow-2xl shadow-[#003399]/10 min-w-40 animate-in zoom-in-95 duration-200">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-50 pb-2 leading-none">
          {label}
        </p>
        <div className="space-y-2.5">
          {payload.map((p, i) => (
            <div key={i} className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-2.5 h-2.5 rounded-full shadow-sm"
                  style={{ backgroundColor: p.stroke || p.fill }}
                />
                <span className="text-[11px] font-black text-slate-600 tracking-tight capitalize">
                  {p.name}
                </span>
              </div>
              <span className="text-[11px] font-black text-slate-900">
                ₹{p.value.toLocaleString()}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between gap-6 pt-3 border-t border-slate-100 mt-2">
            <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest leading-none">
              Total
            </span>
            <span className="text-[12px] font-black text-[#003399] leading-none">
              ₹{payload.reduce((sum, p) => sum + p.value, 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}
