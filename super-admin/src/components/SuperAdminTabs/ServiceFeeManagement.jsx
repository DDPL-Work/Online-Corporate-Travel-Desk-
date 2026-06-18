import React, { useMemo, useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchCorporates } from "../../Redux/Slice/corporateListSlice";
import { FiEye, FiSearch, FiBriefcase, FiMail, FiUser, FiCreditCard, FiActivity, FiArrowLeft, FiRefreshCw, FiCalendar, FiLayers, FiChevronDown, FiCheck, FiX, FiChevronLeft, FiChevronRight, FiDownload } from "react-icons/fi";
import { FaPlane, FaHotel, FaRupeeSign } from "react-icons/fa";
import { MdTrendingUp } from "react-icons/md";
import ServiceFeesModal from "../../Modal/ServiceFeesModal";
import Pagination from "../Shared/Pagination";
import { useNavigate } from "react-router-dom";
import { fetchServiceFeeStats, fetchServiceFeeCollections } from "../../Redux/Slice/serviceFeeLedgerSlice";
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from "recharts";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { createDatedExcelFilename } from "../../utils/export/excelExport";

const COLORS = [
  "#003399",
  "#d97706",
  "#f59e0b",
  "#10b981",
  "#0ea5e9", // sky
  "#8b5cf6", // violet
  "#f43f5e", // rose
];

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

const C = {
  navy: "#001f5c",
  offWhite: "#f8fafc",
  white: "#ffffff",
  border: "#e2e8f0",
};

const CustomDropdown = ({ value, options, onChange, icon: Icon, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value) || options[0];

  return (
    <div className="flex-1 w-full relative" ref={dropdownRef}>
      <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
        {Icon && <Icon />} {label}
      </label>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-slate-50/50 border ${isOpen ? "border-[#003399] ring-4 ring-[#003399]/10" : "border-slate-200"} rounded-xl px-4 py-3 text-sm font-bold text-slate-700 cursor-pointer flex items-center justify-between transition-all`}
      >
        <span className="truncate">{selectedOption?.label}</span>
        <FiChevronDown className={`transition-transform duration-200 text-slate-400 shrink-0 ml-2 ${isOpen ? "rotate-180" : ""}`} />
      </div>
      
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden py-1 max-h-60 overflow-y-auto">
          {options.map((opt) => (
            <div
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`px-4 py-2.5 text-sm font-bold cursor-pointer flex items-center justify-between transition-colors ${value === opt.value ? "bg-indigo-50/50 text-[#003399]" : "text-slate-600 hover:bg-slate-50"}`}
            >
              <span className="truncate">{opt.label}</span>
              {value === opt.value && <FiCheck size={14} className="text-[#003399] shrink-0 ml-2" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const CompactDropdown = ({ value, onChange, options }) => {
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
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all bg-white text-[#003399] shadow-sm outline-none border border-slate-100"
      >
        <span>{selectedOption?.label}</span>
        <FiChevronDown className={`transition-transform ${isOpen ? "rotate-180" : ""}`} size={12} />
      </button>
      
      {isOpen && (
        <div className="absolute right-0 z-50 w-32 mt-2 bg-white border border-slate-100 rounded-xl shadow-lg shadow-slate-200/50 py-1 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-colors hover:bg-slate-50 flex items-center justify-between ${
                String(value) === String(opt.value) ? "text-[#003399] bg-[#003399]/5" : "text-slate-600"
              }`}
            >
              <span className="truncate">{opt.label}</span>
              {String(value) === String(opt.value) && <FiCheck size={12} className="shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default function ServiceFeeManagement() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { corporates, loading } = useSelector((state) => state.corporateList);
  const { stats: fetchedStats, collections, loadingStats, loadingCollections } = useSelector((state) => state.serviceFeeLedger);

  const [search, setSearch] = useState("");
  const [selectedCorporate, setSelectedCorporate] = useState(null);

  // Filter States
  const [dateRange, setDateRange] = useState("monthly");
  const [customFromDate, setCustomFromDate] = useState("");
  const [customToDate, setCustomToDate] = useState("");
  const [bookingType, setBookingType] = useState("Both (F+H)");
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState("All Onboarded");
  const [performanceView, setPerformanceView] = useState("today"); // "today" | "month"

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth().toString());
  const [selectedQuarter, setSelectedQuarter] = useState(() => {
    const m = new Date().getMonth();
    if (m < 3) return "Q1";
    if (m < 6) return "Q2";
    if (m < 9) return "Q3";
    return "Q4";
  });

  const handleRefresh = () => {
    dispatch(fetchCorporates());
    
    const filters = {
      dateRange: "Custom", 
      bookingType, 
      corporateId: selectedCompanyFilter,
    };
    
    let fromDate, toDate;
    if (dateRange === "monthly") {
      fromDate = new Date(parseInt(selectedYear), parseInt(selectedMonth), 1);
      toDate = new Date(parseInt(selectedYear), parseInt(selectedMonth) + 1, 0);
    } else if (dateRange === "quarterly") {
      const qStartMonth = selectedQuarter === "Q1" ? 0 : selectedQuarter === "Q2" ? 3 : selectedQuarter === "Q3" ? 6 : 9;
      fromDate = new Date(parseInt(selectedYear), qStartMonth, 1);
      toDate = new Date(parseInt(selectedYear), qStartMonth + 3, 0);
    } else if (dateRange === "yearly") {
      fromDate = new Date(parseInt(selectedYear), 0, 1);
      toDate = new Date(parseInt(selectedYear), 11, 31);
    } else if (dateRange === "custom" && customFromDate && customToDate) {
      fromDate = new Date(customFromDate);
      toDate = new Date(customToDate);
    }

    if (fromDate && toDate && !isNaN(fromDate) && !isNaN(toDate)) {
      filters.customFromDate = fromDate.toISOString().split('T')[0];
      filters.customToDate = toDate.toISOString().split('T')[0];
    } else {
      filters.dateRange = "This Year";
    }
    
    dispatch(fetchServiceFeeStats(filters));
    dispatch(fetchServiceFeeCollections(filters));
  };

  const handleExport = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      
      // Sheet 1: Main Report (Stats, Filters, Corporates)
      const ws1 = workbook.addWorksheet("Main Report");
      
      ws1.addRow(["Service Fee Management Report"]);
      ws1.getRow(1).font = { size: 16, bold: true };
      ws1.addRow([]);

      ws1.addRow(["Summary Statistics"]);
      ws1.getRow(3).font = { size: 12, bold: true, italic: true };
      ws1.addRow(["Total Revenue", `₹${stats.total.toLocaleString()}`]);
      ws1.addRow(["Flight Revenue", `₹${stats.flight.toLocaleString()}`]);
      ws1.addRow(["Hotel Revenue", `₹${stats.hotel.toLocaleString()}`]);
      ws1.addRow(["Top Corporate", `${stats.topCorporateName} (₹${stats.topCorporateRevenue.toLocaleString()})`]);
      ws1.addRow([]);

      ws1.addRow(["Applied Filters"]);
      ws1.getRow(10).font = { size: 12, bold: true, italic: true };
      ws1.addRow(["Date Range", dateRange === "Custom" ? `${customFromDate} to ${customToDate}` : dateRange]);
      ws1.addRow(["Booking Type", bookingType]);
      ws1.addRow(["Company", selectedCompanyFilter === "All Onboarded" ? "All Onboarded" : onboardedCorporates.find(c => c._id === selectedCompanyFilter)?.corporateName || selectedCompanyFilter]);
      ws1.addRow(["Search Query", search || "None"]);
      ws1.addRow([]);

      ws1.addRow(["Performance Metrics"]);
      ws1.getRow(ws1.rowCount).font = { size: 14, bold: true };
      
      const perfHeader = ws1.addRow(["Metric", "Today's Performance", "This Month's Performance"]);
      perfHeader.font = { bold: true };
      
      ws1.addRow(["Peak Time", todaysPerformance.peakHour, thisMonthPerformance.peakDay]);
      ws1.addRow(["Avg Transaction", `₹${todaysPerformance.avgTransaction}`, `₹${thisMonthPerformance.avgTransaction}`]);
      ws1.addRow(["Total Items", todaysPerformance.totalItems, thisMonthPerformance.totalItems]);
      ws1.addRow(["Flight Revenue", `₹${todaysPerformance.flightRevenue}`, `₹${thisMonthPerformance.flightRevenue}`]);
      ws1.addRow(["Hotel Revenue", `₹${todaysPerformance.hotelRevenue}`, `₹${thisMonthPerformance.hotelRevenue}`]);
      ws1.addRow(["Growth vs Previous", todaysPerformance.growth, thisMonthPerformance.growth]);
      ws1.addRow([]);

      ws1.addRow(["Graph Data (Trend)"]);
      ws1.getRow(ws1.rowCount).font = { size: 14, bold: true };
      const trendHeader = ws1.addRow(["Timeline label", "Flight Revenue", "Hotel Revenue", "Total Revenue"]);
      trendHeader.font = { bold: true };
      
      activeTrendData.forEach(d => {
        ws1.addRow([d.label, `₹${d.flightRev}`, `₹${d.hotelRev}`, `₹${d.flightRev + d.hotelRev}`]);
      });
      ws1.addRow([]);

      ws1.addRow(["Corporate Data Table"]);
      ws1.getRow(ws1.rowCount).font = { size: 14, bold: true };
      const tableHeaderRow = ws1.addRow(["Corporate Name", "Contact Name", "Email", "Phone", "Status", "Total Flight Revenue", "Total Hotel Revenue", "Total Revenue", "Date Onboarded"]);
      tableHeaderRow.font = { bold: true };
      
      filteredCorporates.forEach(c => {
        // Calculate revenues from collections for each corporate if needed, or just standard fields
        const cCollections = collections?.filter(col => (col.corporateId?._id || col.corporateId) === c._id) || [];
        const flightRev = cCollections.filter(col => col.bookingModel === "BookingRequest").reduce((acc, curr) => acc + curr.amount, 0);
        const hotelRev = cCollections.filter(col => col.bookingModel !== "BookingRequest").reduce((acc, curr) => acc + curr.amount, 0);
        
        ws1.addRow([
          c.corporateName,
          c.primaryContact?.name || "N/A",
          c.primaryContact?.email || "N/A",
          c.primaryContact?.phone || "N/A",
          c.status,
          `₹${flightRev.toLocaleString()}`,
          `₹${hotelRev.toLocaleString()}`,
          `₹${(flightRev + hotelRev).toLocaleString()}`,
          new Date(c.createdAt).toLocaleDateString()
        ]);
      });

      // Auto-fit columns for WS1
      ws1.columns.forEach((column) => {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, (cell) => {
          const columnLength = cell.value ? cell.value.toString().length : 10;
          if (columnLength > maxLength) maxLength = columnLength;
        });
        column.width = maxLength < 10 ? 10 : maxLength + 2;
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      saveAs(blob, createDatedExcelFilename("service_fee_report"));
      
    } catch (err) {
      console.error("Export failed", err);
    }
  };

  useEffect(() => {
    handleRefresh();
  }, [dispatch, dateRange, bookingType, selectedCompanyFilter, customFromDate, customToDate, selectedYear, selectedMonth, selectedQuarter]);

  const onboardedCorporates = useMemo(() => {
    return (corporates || []).filter((c) => c.status === "active");
  }, [corporates]);

  const stats = useMemo(() => {
    const total = fetchedStats?.totalRevenue || 0;
    
    return {
      total,
      flight: fetchedStats?.flightRevenue || 0,
      hotel: fetchedStats?.hotelRevenue || 0,
      flightBookings: fetchedStats?.flightBookings || 0,
      hotelBookings: fetchedStats?.hotelBookings || 0,
      topCorporateName: fetchedStats?.topCorporate?.corporateName || "N/A",
      topCorporateRevenue: fetchedStats?.topCorporate?.totalRevenue || 0,
      growth: fetchedStats?.growth || 0,
    };
  }, [fetchedStats]);

  const filteredCorporates = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = onboardedCorporates;

    if (selectedCompanyFilter !== "All Onboarded") {
      result = result.filter(c => c._id === selectedCompanyFilter);
    }

    if (q) {
      result = result.filter(
        (c) =>
          c.corporateName?.toLowerCase().includes(q) ||
          c.primaryContact?.name?.toLowerCase().includes(q) ||
          c.primaryContact?.email?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [search, onboardedCorporates, selectedCompanyFilter]);

  // Analytics Aggregation
  const { activeTrendData, todaysPerformance, thisMonthPerformance } = useMemo(() => {
    const data = collections || [];
    
    const timeMap = {};
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    
    let todayCount = 0;
    let todayRev = 0;
    let todayFlightRev = 0;
    let todayHotelRev = 0;
    const hourCounts = {}; // To find peak hour

    let monthCount = 0;
    let monthRev = 0;
    let monthFlightRev = 0;
    let monthHotelRev = 0;
    const dayCounts = {}; // To find peak day

    let yesterdayRev = 0;
    let lastMonthRev = 0;

    // Determine bounds and grouping strategy based on dateRange
    let groupStrategy = "day"; 
    let startDate = new Date();
    let endDate = new Date();

    if (dateRange === "monthly") {
      startDate = new Date(parseInt(selectedYear), parseInt(selectedMonth), 1);
      endDate = new Date(parseInt(selectedYear), parseInt(selectedMonth) + 1, 0);
    } else if (dateRange === "quarterly") {
      const qStartMonth = selectedQuarter === "Q1" ? 0 : selectedQuarter === "Q2" ? 3 : selectedQuarter === "Q3" ? 6 : 9;
      startDate = new Date(parseInt(selectedYear), qStartMonth, 1);
      endDate = new Date(parseInt(selectedYear), qStartMonth + 3, 0);
      groupStrategy = "month";
    } else if (dateRange === "yearly") {
      startDate = new Date(parseInt(selectedYear), 0, 1);
      endDate = new Date(parseInt(selectedYear), 11, 31);
      groupStrategy = "month";
    } else if (dateRange === "custom" && customFromDate && customToDate) {
      startDate = new Date(customFromDate);
      endDate = new Date(customToDate);
      const diffDays = (endDate - startDate) / (1000 * 3600 * 24);
      groupStrategy = diffDays > 31 ? "month" : "day";
    } else {
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      endDate = today;
    }

    if (dateRange !== "custom" && endDate > today) {
      endDate = today;
    }

    // Pre-fill timeMap
    if (groupStrategy === "day") {
      let current = new Date(startDate);
      current.setHours(0,0,0,0);
      const end = new Date(endDate);
      end.setHours(23,59,59,999);
      
      while (current <= end) {
        const key = `${current.getDate()} ${current.toLocaleString('en-US', {month:'short'})}`;
        if (!timeMap[key]) {
          timeMap[key] = { label: key, flightRev: 0, hotelRev: 0, sortVal: current.getTime() };
        }
        current.setDate(current.getDate() + 1);
      }
    } else {
      let current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
      
      while (current <= end) {
        const key = `${current.toLocaleString('en-US', {month:'short'})} ${current.getFullYear()}`;
        if (!timeMap[key]) {
          timeMap[key] = { label: key, flightRev: 0, hotelRev: 0, sortVal: current.getTime() };
        }
        current.setMonth(current.getMonth() + 1);
      }
    }

    const targetMonth = (performanceView !== "today" && performanceView !== "month") ? parseInt(performanceView) : today.getMonth();
    const targetYear = dateRange === "yearly" ? parseInt(selectedYear) : today.getFullYear();
    const targetMonthDate = new Date(targetYear, targetMonth, 1);
    const targetLastMonthDate = new Date(targetYear, targetMonth - 1, 1);

    data.forEach(txn => {
      // Timeline parsing
      const d = new Date(txn.createdAt);
      
      // Calculate today's performance metrics
      const txnDateStr = d.toISOString().split("T")[0];
      if (txnDateStr === todayStr) {
        todayCount++;
        todayRev += txn.amount;
        if (txn.bookingModel === "BookingRequest") {
          todayFlightRev += txn.amount;
        } else {
          todayHotelRev += txn.amount;
        }
        const hr = d.getHours();
        hourCounts[hr] = (hourCounts[hr] || 0) + 1;
      }

      if (txnDateStr === yesterdayStr) {
        yesterdayRev += txn.amount;
      }

      // Calculate this month's performance metrics
      if (d.getMonth() === targetMonth && d.getFullYear() === targetYear) {
        monthCount++;
        monthRev += txn.amount;
        if (txn.bookingModel === "BookingRequest") {
          monthFlightRev += txn.amount;
        } else {
          monthHotelRev += txn.amount;
        }
        const day = d.getDate();
        dayCounts[day] = (dayCounts[day] || 0) + 1;
      }

      if (d.getMonth() === targetLastMonthDate.getMonth() && d.getFullYear() === targetLastMonthDate.getFullYear()) {
        lastMonthRev += txn.amount;
      }
      
      let tKey = "";
      if (groupStrategy === "day") {
        tKey = `${d.getDate()} ${d.toLocaleString('en-US', {month:'short'})}`;
      } else {
        tKey = `${d.toLocaleString('en-US', {month:'short'})} ${d.getFullYear()}`;
      }

      if (timeMap[tKey]) {
        if (txn.bookingModel === "BookingRequest") {
          timeMap[tKey].flightRev += txn.amount;
        } else {
          timeMap[tKey].hotelRev += txn.amount;
        }
      }
    });

    const activeTrendData = Object.values(timeMap).sort((a, b) => a.sortVal - b.sortVal);
    
    // Calculate growth
    let todayGrowth = 0;
    if (yesterdayRev > 0) {
      todayGrowth = ((todayRev - yesterdayRev) / yesterdayRev) * 100;
    } else if (todayRev > 0) {
      todayGrowth = 100;
    }

    let monthGrowth = 0;
    if (lastMonthRev > 0) {
      monthGrowth = ((monthRev - lastMonthRev) / lastMonthRev) * 100;
    } else if (monthRev > 0) {
      monthGrowth = 100;
    }

    // Calculate peak hour
    let peakHr = "N/A";
    if (Object.keys(hourCounts).length > 0) {
      const maxHr = Object.keys(hourCounts).reduce((a, b) => hourCounts[a] > hourCounts[b] ? a : b);
      const hrNum = parseInt(maxHr);
      const ampm = hrNum >= 12 ? 'pm' : 'am';
      const hr12 = hrNum % 12 || 12;
      peakHr = `${hr12}:00${ampm}`;
    }
    
    const todaysPerformance = {
      peakHour: peakHr,
      avgTransaction: todayCount > 0 ? (todayRev / todayCount).toFixed(2) : "0.00",
      totalItems: todayCount,
      flightRevenue: todayFlightRev,
      hotelRevenue: todayHotelRev,
      growth: todayGrowth > 0 ? `+${todayGrowth.toFixed(1)}%` : `${todayGrowth.toFixed(1)}%`,
      growthColor: todayGrowth >= 0 ? "text-emerald-600" : "text-red-500"
    };
    
    // Calculate peak day for month
    let peakDay = "N/A";
    if (Object.keys(dayCounts).length > 0) {
      const maxDay = Object.keys(dayCounts).reduce((a, b) => dayCounts[a] > dayCounts[b] ? a : b);
      peakDay = `${maxDay} ${targetMonthDate.toLocaleString('en-US', {month:'short'})}`;
    }

    const thisMonthPerformance = {
      peakDay: peakDay,
      avgTransaction: monthCount > 0 ? (monthRev / monthCount).toFixed(2) : "0.00",
      totalItems: monthCount,
      flightRevenue: monthFlightRev,
      hotelRevenue: monthHotelRev,
      growth: monthGrowth > 0 ? `+${monthGrowth.toFixed(1)}%` : `${monthGrowth.toFixed(1)}%`,
      growthColor: monthGrowth >= 0 ? "text-emerald-600" : "text-red-500"
    };
    
    return { activeTrendData, todaysPerformance, thisMonthPerformance };
  }, [collections, dateRange, customFromDate, customToDate, performanceView]);

  const xDataKey = "label";

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedCompanyFilter]);

  const totalPages = Math.ceil(filteredCorporates.length / itemsPerPage);
  const currentData = filteredCorporates.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Table Scroll States
  const tableContainerRef = useRef(null);
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(false);

  const handleTableScroll = () => {
    if (tableContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tableContainerRef.current;
      setShowLeftScroll(scrollLeft > 0);
      setShowRightScroll(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  useEffect(() => {
    handleTableScroll();
    window.addEventListener("resize", handleTableScroll);
    return () => window.removeEventListener("resize", handleTableScroll);
  }, [currentData]);

  const scrollTable = (direction) => {
    if (tableContainerRef.current) {
      const scrollAmount = 300;
      tableContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth"
      });
    }
  };

  return (
    <div className="min-h-screen font-sans pb-20 -mt-6 -mx-4 md:-mx-6" style={{ background: C.offWhite }}>
      {/* Header matching screenshot */}
      <div className="w-full bg-[#001f5c] text-white pt-6 pb-28 px-6 md:px-10">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate(-1)} 
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition-all text-white shadow-sm"
            >
              <FiArrowLeft size={18} />
            </button>
            <button 
              onClick={handleRefresh}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition-all text-white shadow-sm"
            >
              <FiRefreshCw size={18} className={(loading || loadingStats) ? "animate-spin" : ""} />
            </button>
          </div>
          
          <div className="flex items-center gap-4 ml-2">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl text-white bg-white/10">
              <MdTrendingUp size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight leading-none mb-1">
                Service Fee Rules & Collections
              </h1>
              <p className="text-[9px] font-bold uppercase tracking-[2px] text-slate-300">
                Manage Corporate Rules & View Revenue
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 md:px-10 -mt-20 relative z-10 space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Total Revenue */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border-b-[6px] border-slate-900 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">TOTAL REVENUE</p>
                <h3 className="text-2xl font-black text-slate-800">₹{stats.total.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-700 flex items-center justify-center">
                <FaRupeeSign size={16} />
              </div>
            </div>
            <div className="mt-4">
              <span 
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-black border ${
                  stats.growth >= 0 
                    ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                    : "bg-red-50 text-red-600 border-red-100"
                }`}
                title="Growth compared to last month"
              >
                <MdTrendingUp className={stats.growth < 0 ? "rotate-180" : ""} /> 
                {stats.growth >= 0 ? "+" : ""}{stats.growth}%
              </span>
            </div>
          </div>

          {/* Card 2: Flight Revenue */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border-b-[6px] border-[#003399] flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">FLIGHT REVENUE</p>
                <h3 className="text-2xl font-black text-slate-800">₹{stats.flight.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#003399]/10 text-[#003399] flex items-center justify-center">
                <FaPlane className="rotate-[-45deg]" size={16} />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {stats.flightBookings} BOOKINGS
              </span>
            </div>
          </div>

          {/* Card 3: Hotel Revenue */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border-b-[6px] border-amber-500 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">HOTEL REVENUE</p>
                <h3 className="text-2xl font-black text-slate-800">₹{stats.hotel.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
                <FaHotel size={16} />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {stats.hotelBookings} BOOKINGS
              </span>
            </div>
          </div>

          {/* Card 4: Top Contributor */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border-b-[6px] border-emerald-400 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="w-full">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">TOP CONTRIBUTOR</p>
                <h3 className="text-xl font-black text-slate-800 truncate" title={stats.topCorporateName}>
                  {stats.topCorporateName}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0 ml-2">
                <MdTrendingUp size={20} />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                ₹{stats.topCorporateRevenue.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})} GENERATED
              </span>
            </div>
          </div>
        </div>

        

        {/* Filters Container */}
        <div className="bg-white rounded-2xl p-5 shadow-[0_2px_10px_rgb(0,0,0,0.02)] border border-slate-100 flex flex-col md:flex-row gap-4 items-end">
          {dateRange === "Custom" ? (
            <div className="flex-1 w-full bg-slate-50/50 border border-[#003399] ring-4 ring-[#003399]/10 rounded-xl p-3 flex flex-col gap-2 relative">
              <button 
                onClick={() => setDateRange("This Month")}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
                title="Cancel Custom Date"
              >
                <FiX size={14} />
              </button>
              <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#003399]">
                <FiCalendar /> CUSTOM DATE RANGE
              </label>
              <div className="flex items-center gap-2">
                <input 
                  type="date" 
                  value={customFromDate}
                  onChange={e => setCustomFromDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-[#003399]"
                />
                <span className="text-slate-400 font-bold text-xs">to</span>
                <input 
                  type="date" 
                  value={customToDate}
                  onChange={e => setCustomToDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-[#003399]"
                />
              </div>
            </div>
          ) : (
            <CustomDropdown 
              label="DATE RANGE"
              icon={FiCalendar}
              value={dateRange}
              onChange={setDateRange}
              options={[
                { value: "monthly", label: "Monthly" },
                { value: "quarterly", label: "Quarterly" },
                { value: "yearly", label: "Yearly" },
                { value: "custom", label: "Custom Date" },
              ]}
            />
          )}
          <CustomDropdown 
            label="BOOKING TYPE"
            icon={FiLayers}
            value={bookingType}
            onChange={setBookingType}
            options={[
              { value: "Both (F+H)", label: "Both (F+H)" },
              { value: "Flight", label: "Flight" },
              { value: "Hotel", label: "Hotel" },
            ]}
          />
          <CustomDropdown 
            label="COMPANY"
            icon={FiBriefcase}
            value={selectedCompanyFilter}
            onChange={setSelectedCompanyFilter}
            options={[
              { value: "All Onboarded", label: "All Onboarded" },
              ...onboardedCorporates.map(c => ({ value: c._id, label: c.corporateName }))
            ]}
          />
        </div>


        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
              <div>
                <h3 className="text-xl font-black text-slate-800 tracking-tighter leading-none">
                  Sales & Transactions
                </h3>
                <p className="text-[12px] text-slate-500 font-medium leading-none mt-2">
                  Real-time sales and performance metrics
                </p>
              </div>
              <div className="flex items-center gap-2">
                {(dateRange === "monthly" || dateRange === "quarterly" || dateRange === "yearly") && (
                  <CompactDropdown
                    value={selectedYear}
                    onChange={setSelectedYear}
                    options={(() => {
                      const currentYear = new Date().getFullYear();
                      const startYear = 2025;
                      const years = [];
                      for (let y = currentYear; y >= startYear; y--) {
                        years.push({ value: y.toString(), label: y.toString() });
                      }
                      return years;
                    })()}
                  />
                )}
                {dateRange === "monthly" && (
                  <CompactDropdown
                    value={selectedMonth}
                    onChange={setSelectedMonth}
                    options={Array.from({length: 12}).map((_, i) => ({
                      value: i.toString(),
                      label: new Date(0, i).toLocaleString('default', { month: 'short' })
                    }))}
                  />
                )}
                {dateRange === "quarterly" && (
                  <CompactDropdown
                    value={selectedQuarter}
                    onChange={setSelectedQuarter}
                    options={[
                      { value: "Q1", label: "Q1 (Jan-Mar)" },
                      { value: "Q2", label: "Q2 (Apr-Jun)" },
                      { value: "Q3", label: "Q3 (Jul-Sep)" },
                      { value: "Q4", label: "Q4 (Oct-Dec)" }
                    ]}
                  />
                )}
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={activeTrendData}
                  margin={{ top: 20, right: 10, left: 0, bottom: 0 }}
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
                  <Tooltip cursor={{ fill: "#003399", opacity: 0.1 }} content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    height={30}
                    iconType="circle"
                  />
                  <Line
                    type="natural"
                    dataKey="flightRev"
                    name="Flight Revenue"
                    stroke="#003399"
                    strokeWidth={3}
                    dot={{ r: 5, fill: "#fff", stroke: "#003399", strokeWidth: 2 }}
                    activeDot={{ r: 7, fill: "#fff", stroke: "#003399", strokeWidth: 3 }}
                    animationDuration={1500}
                  />
                  <Line
                    type="natural"
                    dataKey="hotelRev"
                    name="Hotel Revenue"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ r: 6, fill: "#fff", stroke: "#10b981", strokeWidth: 2 }}
                    activeDot={{ r: 8, fill: "#fff", stroke: "#10b981", strokeWidth: 3 }}
                    animationDuration={1500}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
            <div className="w-full mb-6 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-800 tracking-tighter leading-none">
                {performanceView === "today" ? "Today's Performance" : performanceView === "month" ? "This Month's Performance" : `${new Date(0, parseInt(performanceView)).toLocaleString('default', {month:'long'})} Performance`}
              </h3>
              <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100">
                {dateRange === "yearly" ? (
                  <CompactDropdown
                    value={performanceView}
                    onChange={setPerformanceView}
                    options={[
                      { value: "today", label: "Today" },
                      { value: "month", label: "This Month" },
                      ...Array.from({length: 12}).map((_, i) => ({
                        value: i.toString(),
                        label: new Date(0, i).toLocaleString('default', { month: 'short' })
                      }))
                    ]}
                  />
                ) : (
                  <>
                    <button
                      onClick={() => setPerformanceView("today")}
                      className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                        performanceView === "today" ? "bg-white text-[#003399] shadow-sm" : "text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      Today
                    </button>
                    <button
                      onClick={() => setPerformanceView("month")}
                      className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                        performanceView === "month" ? "bg-white text-[#003399] shadow-sm" : "text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      Month
                    </button>
                  </>
                )}
              </div>
            </div>
            
            <div className="flex flex-col gap-3 h-full justify-between pb-2">
              <div className="bg-[#f8fafc] rounded-xl p-3 flex items-center justify-between">
                <span className="text-[12px] font-bold text-slate-500">Peak {performanceView === "today" ? "Hour" : "Day"}</span>
                <span className="text-[14px] font-black text-slate-800">
                  {performanceView === "today" ? todaysPerformance.peakHour : thisMonthPerformance.peakDay}
                </span>
              </div>
              
              <div className="bg-[#f8fafc] rounded-xl p-3 flex items-center justify-between">
                <span className="text-[12px] font-bold text-slate-500">Avg Transaction</span>
                <span className="text-[14px] font-black text-slate-800">
                  ₹{performanceView === "today" ? todaysPerformance.avgTransaction : thisMonthPerformance.avgTransaction}
                </span>
              </div>
              
              <div className="bg-[#f8fafc] rounded-xl p-3 flex items-center justify-between">
                <span className="text-[12px] font-bold text-slate-500">Total Items</span>
                <span className="text-[14px] font-black text-slate-800">
                  {performanceView === "today" ? todaysPerformance.totalItems.toLocaleString() : thisMonthPerformance.totalItems.toLocaleString()}
                </span>
              </div>

              <div className="bg-[#f8fafc] rounded-xl p-3 flex items-center justify-between">
                <span className="text-[12px] font-bold text-slate-500">Flight Revenue</span>
                <span className="text-[14px] font-black text-[#003399]">
                  ₹{performanceView === "today" ? todaysPerformance.flightRevenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) : thisMonthPerformance.flightRevenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </span>
              </div>
              
              <div className="bg-[#f8fafc] rounded-xl p-3 flex items-center justify-between">
                <span className="text-[12px] font-bold text-slate-500">Hotel Revenue</span>
                <span className="text-[14px] font-black text-[#10b981]">
                  ₹{performanceView === "today" ? todaysPerformance.hotelRevenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) : thisMonthPerformance.hotelRevenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </span>
              </div>
              
              <div className="bg-[#f8fafc] rounded-xl p-3 flex items-center justify-between">
                <span className="text-[12px] font-bold text-slate-500">
                  {performanceView === "today" ? "Vs Yesterday" : "Vs Last Month"}
                </span>
                <span className={`text-[14px] font-black ${performanceView === "today" ? todaysPerformance.growthColor : thisMonthPerformance.growthColor}`}>
                  {performanceView === "today" ? todaysPerformance.growth : thisMonthPerformance.growth}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Table */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex-1 w-full max-w-lg relative">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <FiSearch className="text-slate-400" size={18} />
              </div>
              <input
                type="text"
                placeholder="Search corporates by name, email, or contact person..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#003399] focus:ring-4 focus:ring-[#003399]/10 transition-all"
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 bg-indigo-50 text-[#003399] rounded-xl text-sm font-bold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#003399] animate-pulse"></span>
                {filteredCorporates.length} Active Corporates
              </div>
              <button 
                onClick={handleExport}
                className="px-4 py-2 bg-[#003399] text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-[#002266] hover:shadow-lg hover:-translate-y-0.5 transition-all"
              >
                <FiDownload size={16} />
                Export Data
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden relative group">
          {showLeftScroll && (
            <button
              onClick={() => scrollTable("left")}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white/90 backdrop-blur-sm border border-slate-200 shadow-md rounded-r-xl flex items-center justify-center text-slate-600 hover:text-[#003399] transition-all"
            >
              <FiChevronLeft size={20} />
            </button>
          )}
          {showRightScroll && (
            <button
              onClick={() => scrollTable("right")}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white/90 backdrop-blur-sm border border-slate-200 shadow-md rounded-l-xl flex items-center justify-center text-slate-600 hover:text-[#003399] transition-all"
            >
              <FiChevronRight size={20} />
            </button>
          )}

          <div 
            className="overflow-x-auto custom-scrollbar" 
            ref={tableContainerRef}
            onScroll={handleTableScroll}
          >
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-8 py-5 text-[11px] uppercase font-black tracking-widest text-slate-400 whitespace-nowrap">Corporate Details</th>
                  <th className="px-8 py-5 text-[11px] uppercase font-black tracking-widest text-slate-400 whitespace-nowrap">Contact Info</th>
                  <th className="px-8 py-5 text-[11px] uppercase font-black tracking-widest text-slate-400 whitespace-nowrap">Classification</th>
                  <th className="px-8 py-5 text-[11px] uppercase font-black tracking-widest text-slate-400 whitespace-nowrap text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="p-16 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-8 h-8 border-4 border-slate-200 border-t-[#003399] rounded-full animate-spin"></div>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Loading Corporates...</p>
                      </div>
                    </td>
                  </tr>
                ) : currentData.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-16 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                          <FiBriefcase size={28} />
                        </div>
                        <p className="text-sm font-bold text-slate-500">No corporates found matching your search.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  currentData.map((corp) => (
                    <tr key={corp._id} className="group/row hover:bg-slate-50/50 transition-colors duration-200">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#003399]/5 to-[#003399]/10 border border-[#003399]/10 flex items-center justify-center text-[#003399] shrink-0">
                            <FiBriefcase size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-800 group-hover/row:text-[#003399] transition-colors">{corp.corporateName}</p>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">{corp.corporateType?.replace("-", " ") || "Corporate"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                            <FiUser className="text-slate-400" />
                            {corp.primaryContact?.name || "N/A"}
                          </div>
                          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                            <FiMail className="text-slate-400" />
                            {corp.primaryContact?.email || "N/A"}
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${corp.classification === "postpaid" ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
                            <FiCreditCard size={12} />
                            {corp.classification || "Prepaid"}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => {
                              const params = new URLSearchParams({
                                corporateId: corp._id,
                                corporateName: corp.corporateName,
                                dateRange
                              });
                              if (bookingType) params.append("bookingType", bookingType);
                              if (dateRange === "Custom" && customFromDate && customToDate) {
                                params.append("customFromDate", customFromDate);
                                params.append("customToDate", customToDate);
                              }
                              navigate(`/corporate-service-collections?${params.toString()}`);
                            }}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all duration-200 active:scale-95 shadow-sm"
                          >
                            <FiActivity size={14} />
                          </button>
                          <button
                            onClick={() => setSelectedCorporate(corp)}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm hover:border-[#003399] hover:text-[#003399] hover:bg-indigo-50/50 hover:shadow transition-all duration-200 active:scale-95"
                          >
                            <FiEye size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          {!loading && totalPages > 1 && (
            <div className="px-8 py-5 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
              <span className="text-sm font-bold text-slate-500">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredCorporates.length)} of {filteredCorporates.length} corporates
              </span>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                showFirstLast={true}
              />
            </div>
          )}
        </div>
      </div>

      {selectedCorporate && (
        <ServiceFeesModal
          isOpen={true}
          onClose={() => setSelectedCorporate(null)}
          rules={selectedCorporate.serviceFeeRules || []}
          corporate={selectedCorporate}
        />
      )}
    </div>
  );
}
