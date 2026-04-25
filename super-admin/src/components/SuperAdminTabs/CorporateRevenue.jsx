import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  FiFilter,
  FiDownload,
  FiCalendar,
  FiTrendingUp,
  FiDollarSign,
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
} from "react-icons/fi";
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
import { toast } from "react-toastify";
import Pagination from "../Shared/Pagination";

const COLORS = [
  "#0A4D68",
  "#088395",
  "#05BFDB",
  "#00FFCA",
  "#64ccc5",
  "#176b87",
  "#053b50",
];
const ITEMS_PER_PAGE = 10;

export default function CorporateRevenue() {
  const dispatch = useDispatch();

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

  const [viewMode, setViewMode] = useState("monthly");

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
      return matchSearch && matchCat && matchStatus;
    });
  }, [drillDownData, ddSearch, ddCategory, ddStatus]);

  const paginatedLeaderboard = useMemo(() => {
    const start = (leaderboardPage - 1) * ITEMS_PER_PAGE;
    return companyWise.slice(start, start + ITEMS_PER_PAGE);
  }, [companyWise, leaderboardPage]);

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
      } catch (err) {
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
          const res = await dispatch(
            fetchCorporateDetailedBookings({
              id: drillDownId,
              fromDate: computedDates.from,
              toDate: computedDates.to,
            }),
          ).unwrap();
          setDrillDownData(res.data);
          setDrillDownPage(1);
        } catch (err) {
          toast.error("Failed to fetch detailed bookings");
        } finally {
          setDrillDownLoading(false);
        }
      };
      fetchDetails();
    }
  }, [drillDownId, computedDates, dispatch]);

  // 🟠 4. RENDER LOGIC
  const inr = (val) => `₹${Number(val || 0).toLocaleString("en-IN")}`;

  if (loading && !summary && !drillDownId) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0A4D68] mb-4"></div>
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
      <div className="min-h-screen p-4 lg:p-6 bg-slate-50/50 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setDrillDownId(null);
                setDdSearch("");
                setDdCategory("All");
                setDdStatus("All");
              }}
              className="w-10 h-10 rounded-xl bg-white shadow-sm border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-all hover:scale-105 active:scale-95"
            >
              <FiArrowLeft size={20} />
            </button>
            <div className="text-left">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none">
                {corpName}
              </h2>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.15em] mt-2 translate-y-1">
                {computedDates.from} to {computedDates.to}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative group min-w-[200px]">
              <FiSearch
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#0A4D68] transition-colors"
                size={14}
              />
              <input
                type="text"
                placeholder="Search bookings..."
                value={ddSearch}
                onChange={(e) => setDdSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-[#0A4D68] focus:ring-4 focus:ring-[#0A4D68]/5 transition-all shadow-sm"
              />
            </div>
            <select
              value={ddCategory}
              onChange={(e) => setDdCategory(e.target.value)}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer focus:border-[#0A4D68] shadow-sm"
            >
              <option value="All">All Categories</option>
              <option value="Flight">Flights</option>
              <option value="Hotel">Hotels</option>
            </select>
            <select
              value={ddStatus}
              onChange={(e) => setDdStatus(e.target.value)}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer focus:border-[#0A4D68] shadow-sm font-mono"
            >
              <option value="All">All Status</option>
              <option value="succeeded">Succeeded</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
              <option value="in_progress">In Progress</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KPICard
            label="Corporate Spent"
            value={inr(totalSelectedRev)}
            icon={<FiDollarSign />}
            color="#0A4D68"
            size="small"
          />
          <KPICard
            label="Detailed Bookings"
            value={filteredDrillDownData.length}
            icon={<FiBriefcase />}
            color="#088395"
            size="small"
          />
          <KPICard
            label="Average Value"
            value={inr(
              filteredDrillDownData.length > 0
                ? totalSelectedRev / filteredDrillDownData.length
                : 0,
            )}
            icon={<FiTrendingUp />}
            color="#05BFDB"
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
            <Pagination
              currentPage={drillDownPage}
              totalPages={Math.ceil(
                filteredDrillDownData.length / ITEMS_PER_PAGE,
              )}
              onPageChange={setDrillDownPage}
              showFirstLast={false}
            />
          </div>

          <div className="overflow-x-auto min-h-[400px]">
            {drillDownLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0A4D68] mb-4"></div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                  Compiling details...
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                    <th className="px-8 py-3.5">Date</th>
                    <th className="px-8 py-3.5">Reference</th>
                    <th className="px-8 py-3.5">Employee</th>
                    <th className="px-8 py-3.5">Category</th>
                    <th className="px-8 py-3.5">Status</th>
                    <th className="px-8 py-3.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paginatedDrillDown.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-24 text-center">
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
                        className="hover:bg-slate-50/50 transition-all border-l-4 border-transparent hover:border-[#0A4D68]"
                      >
                        <td className="px-8 py-3 text-[12.5px] text-slate-500 font-bold uppercase tracking-tighter">
                          {new Date(b.date).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-8 py-3">
                          <span className="font-mono text-[13px] font-black text-slate-800 uppercase tracking-tight">
                            {b.reference}
                          </span>
                        </td>
                        <td className="px-8 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
                              <FiUser size={14} />
                            </div>
                            <span className="font-black text-[13px] text-slate-700">
                              {b.employee}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-3">
                          <span
                            className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                              b.type === "Flight"
                                ? "bg-blue-50 text-blue-700 border-blue-100"
                                : "bg-purple-50 text-purple-700 border-purple-100"
                            }`}
                          >
                            {b.type}
                          </span>
                        </td>
                        <td className="px-8 py-3">
                          <div
                            className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${
                              b.status?.toLowerCase().includes("success")
                                ? "text-emerald-600"
                                : b.status?.toLowerCase().includes("cancel")
                                  ? "text-rose-600"
                                  : "text-amber-600"
                            }`}
                          >
                            <div
                              className={`w-1.5 h-1.5 rounded-full ${
                                b.status?.toLowerCase().includes("success")
                                  ? "bg-emerald-600"
                                  : b.status?.toLowerCase().includes("cancel")
                                    ? "bg-rose-600"
                                    : "bg-amber-600"
                              }`}
                            />
                            {b.status?.replace(/_/g, " ")}
                          </div>
                        </td>
                        <td className="px-8 py-3 text-right font-black text-[14px] text-slate-900 tracking-tight">
                          {inr(b.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- MAIN DASHBOARD VIEW ---
  return (
    <div className="min-h-screen p-6 bg-slate-50/50 space-y-4 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#0A4D68] flex items-center justify-center shadow-xl shadow-[#0A4D68]/20 text-white">
            <FiActivity size={28} />
          </div>
          <div className="text-left">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">
              Revenue Dashboard
            </h1>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-[0.2em] mt-2 translate-y-1">
              Financial analytics
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 bg-slate-50 border-none rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-700 outline-none cursor-pointer hover:bg-slate-100 transition-all"
          >
            <option value="today">Today</option>
            <option value="last7Days">Last 7 Days</option>
            <option value="thisMonth">This Month</option>
            <option value="custom">Custom Range</option>
          </select>

          {dateRange === "custom" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 bg-slate-50 border-none rounded-xl text-[11px] font-bold outline-none"
              />
              <span className="text-slate-300">—</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 bg-slate-50 border-none rounded-xl text-[11px] font-bold outline-none"
              />
            </div>
          )}

          <select
            value={bookingType}
            onChange={(e) => setBookingType(e.target.value)}
            className="px-4 py-2 bg-slate-50 border-none rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-700 outline-none cursor-pointer hover:bg-slate-100 transition-all"
          >
            <option value="Both">Both (F+H)</option>
            <option value="Flights">Flights Only</option>
            <option value="Hotels">Hotels Only</option>
          </select>

          <select
            value={selectedCorporate}
            onChange={(e) => setSelectedCorporate(e.target.value)}
            className="px-4 py-2 bg-slate-50 border-none rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-700 outline-none cursor-pointer hover:bg-slate-100 transition-all max-w-[180px]"
          >
            <option value="All">All Onboarded</option>
            {corporates.map((c) => (
              <option key={c._id} value={c._id}>
                {c.corporateName}
              </option>
            ))}
          </select>

          <button
            onClick={fetchData}
            className="p-2.5 bg-[#0A4D68] text-white rounded-xl shadow-lg shadow-[#0A4D68]/30 hover:scale-105 active:scale-95 transition-all"
          >
            <FiNavigation size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Total Revenue"
          value={inr(summary?.totalRevenue)}
          icon={<FiDollarSign />}
          color="#0A4D68"
          trend="+12.5%"
          isGood={true}
        />
        <KPICard
          label="Flight Revenue"
          value={inr(summary?.flights?.totalRevenue)}
          icon={<FaPlane />}
          color="#088395"
          subLabel={`${summary?.flights?.totalBookings} Bookings`}
        />
        <KPICard
          label="Hotel Revenue"
          value={inr(summary?.hotels?.totalRevenue)}
          icon={<FaBuilding />}
          color="#05BFDB"
          subLabel={`${summary?.hotels?.totalBookings} Bookings`}
        />
        <KPICard
          label="Avg Booking Value"
          value={inr(summary?.avgBookingValue)}
          icon={<FiTrendingUp />}
          color="#64ccc5"
          subLabel="Per successful booking"
        />
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
                        ? "bg-white text-[#0A4D68] shadow-md scale-105 border border-slate-100"
                        : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    {mode.replace("-", " ")}
                  </button>
                ),
              )}
            </div>
          </div>

          <div className="h-[350px] w-full">
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
                      <stop offset="5%" stopColor="#0A4D68" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#0A4D68" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorHotel" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#05BFDB" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#05BFDB" stopOpacity={0} />
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
                    stroke="#0A4D68"
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
                    stroke="#05BFDB"
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
                    fill="#0A4D68"
                    radius={[6, 6, 0, 0]}
                    barSize={24}
                    animationDuration={1500}
                  />
                  <Bar
                    dataKey="hotelRev"
                    name="Hotel Revenue"
                    fill="#05BFDB"
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
          <div className="flex-1 w-full min-h-[280px] relative">
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
              <p className="text-xl font-black text-[#0A4D68] leading-none">
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
            <button
              onClick={() => toast.info("Preparing report...")}
              className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-black/10 active:scale-95"
            >
              <FiDownload /> Export
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 leading-none">
                <th className="px-8 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Rank
                </th>
                <th className="px-8 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Company
                </th>
                <th className="px-8 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Account Type
                </th>
                <th className="px-8 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Total Bookings
                </th>
                <th className="px-8 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Revenue Spread
                </th>
                <th className="px-8 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                  Revenue
                </th>
                <th className="px-8 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                  Contribution
                </th>
                <th className="px-8 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                  Action
                </th>
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
                      className="hover:bg-slate-50/50 transition-all group"
                    >
                      <td className="px-8 py-3 font-black text-slate-300 group-hover:text-[#0A4D68]">
                        #{String(rank).padStart(2, "0")}
                      </td>
                      <td className="px-8 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-black text-[13px] capitalize group-hover:bg-[#0A4D68]/10 group-hover:text-[#0A4D68] transition-colors">
                            {c.companyName[0]}
                          </div>
                          <span className="font-black text-[12px] text-slate-800 tracking-tight">
                            {c.companyName}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-3">
                        <span
                          className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                            c.accountType === "postpaid"
                              ? "bg-purple-50 text-purple-700 border-purple-100"
                              : "bg-emerald-50 text-emerald-700 border-emerald-100"
                          }`}
                        >
                          {c.accountType}
                        </span>
                      </td>
                      <td className="px-8 py-3">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-[9px] font-black text-slate-600 tracking-tighter uppercase">
                            {c.bookings} Bookings
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-3">
                        <div className="w-[100px] space-y-1.5 leading-none">
                          <div className="flex justify-between text-[7px] font-black uppercase text-slate-400 tracking-widest mb-0.5">
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
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                            <div
                              className="h-full bg-[#0A4D68]"
                              style={{
                                width: `${(c.flightRev / (c.revenue || 1)) * 100}%`,
                              }}
                            />
                            <div
                              className="h-full bg-[#05BFDB]"
                              style={{
                                width: `${(c.hotelRev / (c.revenue || 1)) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-3 text-right">
                        <span className="text-[12px] font-black text-slate-900 tracking-tight">
                          {inr(c.revenue)}
                        </span>
                      </td>
                      <td className="px-8 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 text-emerald-600 font-black text-[10px] tracking-tighter">
                          <FiArrowUpRight size={10} />{" "}
                          {c.contribution.toFixed(1)}%
                        </div>
                      </td>
                      <td className="px-8 py-3 text-center">
                        <button
                          onClick={() => setDrillDownId(c.corporateId)}
                          className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:text-[#0A4D68] hover:bg-[#0A4D68]/10 hover:border-[#0A4D68]/20 transition-all hover:scale-110 active:scale-95 mx-auto"
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
  );
}

// ------------------- SUB-COMPONENTS -------------------

function KPICard({ label, value, icon, color, trend, subLabel, isGood, size }) {
  const isSmall = size === "small";
  return (
    <div
      className={`bg-white rounded-3xl ${isSmall ? "p-3.5" : "p-5"} shadow-sm border border-slate-100 group hover:border-slate-200 transition-all hover:-translate-y-1 duration-300`}
    >
      <div
        className={`flex items-start justify-between ${isSmall ? "mb-2" : "mb-3"}`}
      >
        <div
          className={`${isSmall ? "w-9 h-9" : "w-11 h-11"} rounded-2xl flex items-center justify-center text-white shadow-lg transition-all group-hover:rotate-6 group-hover:scale-110`}
          style={{
            backgroundColor: color,
            boxShadow: `0 8px 16px -4px ${color}55`,
          }}
        >
          {React.cloneElement(icon, { size: isSmall ? 18 : 20 })}
        </div>
        {trend && (
          <div
            className={`flex items-center gap-0.5 px-2.5 py-1.5 rounded-xl text-[10px] font-black ${isGood ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"} shadow-sm`}
          >
            {isGood ? (
              <FiArrowUpRight size={10} />
            ) : (
              <FiArrowDownRight size={10} />
            )}
            {trend}
          </div>
        )}
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 opacity-80 leading-none">
          {label}
        </p>
        <h4
          className={`${isSmall ? "text-lg" : "text-2xl"} font-black text-slate-900 tracking-tight leading-none`}
        >
          {value}
        </h4>
        {subLabel && (
          <p className="text-[9px] font-black text-slate-500 mt-2 uppercase tracking-widest opacity-60 italic leading-none">
            {subLabel}
          </p>
        )}
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-100 shadow-2xl shadow-[#0A4D68]/10 min-w-[160px] animate-in zoom-in-95 duration-200">
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
            <span className="text-[12px] font-black text-[#0A4D68] leading-none">
              ₹{payload.reduce((sum, p) => sum + p.value, 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}
