import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchMarkupRevenue, fetchBookingMarkupAudit } from "../../Redux/Actions/markup.thunks";
import api from "../../API/axios";
import {
  FiDownload,
  FiCalendar,
  FiSearch,
  FiEye,
  FiActivity,
  FiLayers,
  FiArrowLeft,
  FiRefreshCw,
  FiChevronDown,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight
} from "react-icons/fi";
import { FaRupeeSign, FaBuilding, FaPlane, FaHotel } from "react-icons/fa";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import Pagination from "../Shared/Pagination";
import useExcelExporter from "../../services/export/useExcelExporter";
import { toast } from "sonner";

const C = {
  navy: "#003399",
  offWhite: "#f8fafc",
  white: "#ffffff",
  border: "#e2e8f0",
};

const ITEMS_PER_PAGE = 10;

const COLORS = ["#003399", "#10b981", "#f59e0b", "#8b5cf6", "#f43f5e"];

const KPICard = ({ label, value, icon, borderCls, iconBgCls, iconColorCls }) => (
  <div className={`bg-white rounded-2xl p-6 border-l-4 ${borderCls} shadow-sm flex items-center justify-between`}>
    <div>
      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">{label}</p>
      <h3 className="text-2xl font-black text-slate-800 tracking-tight">{value}</h3>
    </div>
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${iconBgCls} ${iconColorCls}`}>
      {icon}
    </div>
  </div>
);

// CustomSelect will be defined at the bottom

export default function MarkupRevenueAndAudit() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { revenue, revenueLoading, audit, auditLoading } = useSelector((state) => state.markup);
  
  const [corporates, setCorporates] = useState([]);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCorporate, setSelectedCorporate] = useState("All");
  const [productType, setProductType] = useState("All");
  const [page, setPage] = useState(1);
  const [timeFilter, setTimeFilter] = useState("All");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const { exportExcel, exportingKey } = useExcelExporter();

  const tableScrollRef = React.useRef(null);
  const handleScroll = (direction) => {
    if (tableScrollRef.current) {
      const scrollAmount = 300;
      tableScrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth"
      });
    }
  };

  const inr = (val) => `₹${Number(val || 0).toLocaleString("en-IN")}`;

  const loadData = async () => {
    try {
      dispatch(fetchMarkupRevenue());
      dispatch(fetchBookingMarkupAudit());
      const res = await api.get("/corporate-related/");
      const approvedCorporates = (res.data.data || []).filter(c => c.status === "active");
      setCorporates(approvedCorporates);
    } catch (err) {
      toast.error("Failed to load data");
    }
  };

  useEffect(() => {
    loadData();
  }, [dispatch]);

  // Filter Revenue Data (for stats and charts)
  const filteredRevenue = useMemo(() => {
    const now = new Date();
    
    return (revenue || []).filter(r => {
      const matchSearch = r.orderId?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          r.corporateName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.companyName?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCorp = selectedCorporate === "All" || String(r.corporateId) === selectedCorporate;
      const matchProduct = productType === "All" || r.productType === productType.toLowerCase();
      
      const rDate = new Date(r.bookingDate || r.createdAt);
      let matchTime = true;
      if (timeFilter === "Monthly") {
        matchTime = rDate.getMonth() === now.getMonth() && rDate.getFullYear() === now.getFullYear();
      } else if (timeFilter === "Quarterly") {
        const qNow = Math.floor(now.getMonth() / 3);
        const qR = Math.floor(rDate.getMonth() / 3);
        matchTime = qNow === qR && rDate.getFullYear() === now.getFullYear();
      } else if (timeFilter === "Yearly") {
        matchTime = rDate.getFullYear() === now.getFullYear();
      } else if (timeFilter === "Custom" && customStartDate && customEndDate) {
        const start = new Date(customStartDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        matchTime = rDate >= start && rDate <= end;
      }
      
      return matchSearch && matchCorp && matchProduct && matchTime;
    });
  }, [revenue, searchQuery, selectedCorporate, productType, timeFilter, customStartDate, customEndDate]);

  // Filter Audit Data
  const filteredAudit = useMemo(() => {
    const now = new Date();
    
    return (audit || []).filter(a => {
      const matchSearch = a.orderId?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          a.bookingDetails?.corporateName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          a.bookingDetails?.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          a.corporateName?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCorp = selectedCorporate === "All" || String(a.corporateId) === selectedCorporate;
      const matchProduct = productType === "All" || a.productType === productType.toLowerCase();
      
      const aDate = new Date(a.bookingDate || a.createdAt);
      let matchTime = true;
      if (timeFilter === "Monthly") {
        matchTime = aDate.getMonth() === now.getMonth() && aDate.getFullYear() === now.getFullYear();
      } else if (timeFilter === "Quarterly") {
        const qNow = Math.floor(now.getMonth() / 3);
        const qA = Math.floor(aDate.getMonth() / 3);
        matchTime = qNow === qA && aDate.getFullYear() === now.getFullYear();
      } else if (timeFilter === "Yearly") {
        matchTime = aDate.getFullYear() === now.getFullYear();
      } else if (timeFilter === "Custom" && customStartDate && customEndDate) {
        const start = new Date(customStartDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        matchTime = aDate >= start && aDate <= end;
      }
      
      return matchSearch && matchCorp && matchProduct && matchTime;
    });
  }, [audit, searchQuery, selectedCorporate, productType, timeFilter, customStartDate, customEndDate]);

  // Aggregate Stats from Filtered Revenue
  const stats = useMemo(() => {
    let total = 0;
    let flight = 0;
    let hotel = 0;
    
    filteredRevenue.forEach(r => {
      const amt = Number(r.totalMarkup || r.netRevenue || 0);
      total += amt;
      if (r.productType === 'flight') flight += amt;
      if (r.productType === 'hotel') hotel += amt;
    });
    
    return { total, flight, hotel };
  }, [filteredRevenue]);

  const corporateChartData = useMemo(() => {
    const corpMap = {};
    filteredRevenue.forEach(r => {
      const corpId = String(r.corporateId);
      const amt = Number(r.totalMarkup || r.netRevenue || 0);
      if (!corpMap[corpId]) {
        corpMap[corpId] = {
          name: r.companyName || r.corporateName || 'Unknown',
          flight: 0,
          hotel: 0,
          total: 0
        };
      }
      if (r.productType === 'flight') corpMap[corpId].flight += amt;
      if (r.productType === 'hotel') corpMap[corpId].hotel += amt;
      corpMap[corpId].total += amt;
    });

    return Object.values(corpMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5); // Top 5
  }, [filteredRevenue]);

  const pieChartData = useMemo(() => {
    return corporateChartData
      .map(c => ({ name: c.name, value: c.total }))
      .filter(d => d.value > 0);
  }, [corporateChartData]);

  const paginatedAudit = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filteredAudit.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAudit, page]);

  const handleExport = () => {
    if (filteredAudit.length === 0) {
      toast.error("No data to export");
      return;
    }

    exportExcel({
      key: "markup_revenue_audit",
      pageHeader: "Markup Revenue & Audit Logs",
      statCards: [
        { label: "Total Markup Revenue", value: inr(stats.total) },
        { label: "Flight Markup Revenue", value: inr(stats.flight) },
        { label: "Hotel Markup Revenue", value: inr(stats.hotel) }
      ],
      appliedFilters: [
        { label: "Search", value: searchQuery || "None" },
        { label: "Company", value: selectedCorporate === "All" ? "All Companies" : (corporates.find(c => String(c._id) === selectedCorporate)?.companyName || selectedCorporate) },
        { label: "Category", value: productType }
      ],
      data: filteredAudit.map(a => {
        const beforeAmount = Number(a.supplierFare || a.fareBeforeMarkup?.supplierFare || a.bookingDetails?.supplierFare || 0);
        const markupValue = Number(a.totalMarkup || a.fareAfterMarkup?.markupAmount || a.markupValue || 0);
        const afterAmount = Number(a.finalFare || a.fareAfterMarkup?.finalFare || a.bookingDetails?.totalFare || a.bookingDetails?.amount || 0);
        const corpName = a.corporateName || a.bookingDetails?.corporateName || a.bookingDetails?.companyName || "Unknown";
        const bookingDate = a.bookingDate || a.createdAt;

        return {
          "Order ID": a.orderId || "—",
          "Company Name": corpName,
          "Booking Date": new Date(bookingDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
          "Category": a.productType === "flight" ? "Flight" : "Hotel",
          "Supplier Fare (Before)": inr(beforeAmount),
          "Markup Amount": inr(markupValue),
          "Final Fare (After)": inr(afterAmount)
        };
      }),
      columns: [
        { header: "Order ID", key: "Order ID", width: 20 },
        { header: "Company Name", key: "Company Name", width: 30 },
        { header: "Booking Date", key: "Booking Date", width: 20 },
        { header: "Category", key: "Category", width: 15 },
        { header: "Supplier Fare (Before)", key: "Supplier Fare (Before)", width: 25 },
        { header: "Markup Amount", key: "Markup Amount", width: 20 },
        { header: "Final Fare (After)", key: "Final Fare (After)", width: 25 }
      ],
      filenamePrefix: "markup_revenue_audit",
      emptyMessage: "No audit records found",
      successMessage: "Audit logs exported successfully"
    });
  };

  return (
    <div className="min-h-screen font-sans pb-20 -mt-6 -mx-4 md:-mx-6" style={{ background: C.offWhite }}>
      <div className="w-full bg-linear-to-br from-[#003399] to-[#000d26] text-white pt-8 pb-20 px-6 md:px-10">
        <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate(-1)}
              className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/10 text-white shadow-sm"
            >
              <FiArrowLeft size={20} />
            </button>
            <button
              onClick={loadData}
              className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/10 text-white shadow-sm"
            >
              <FiRefreshCw size={20} className={revenueLoading || auditLoading ? "animate-spin" : ""} />
            </button>
            <div className="h-12 w-px bg-white/10 mx-2 hidden md:block" />
            <div>
              <h1 className="text-3xl font-black tracking-tight leading-none">Markup Revenue & Audit</h1>
              <p className="text-[10px] mt-2 font-bold uppercase tracking-[2px] opacity-60">
                Track margin earnings & transparent breakdowns
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 md:px-10 -mt-10 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <KPICard
            label="Total Markup Revenue"
            value={inr(stats.total)}
            icon={<FaRupeeSign />}
            borderCls="border-[#003399]"
            iconBgCls="bg-[#003399]/10"
            iconColorCls="text-[#003399]"
          />
          <KPICard
            label="Flight Markup Revenue"
            value={inr(stats.flight)}
            icon={<FaPlane />}
            borderCls="border-indigo-500"
            iconBgCls="bg-indigo-50"
            iconColorCls="text-indigo-600"
          />
          <KPICard
            label="Hotel Markup Revenue"
            value={inr(stats.hotel)}
            icon={<FaHotel />}
            borderCls="border-emerald-500"
            iconBgCls="bg-emerald-50"
            iconColorCls="text-emerald-600"
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col h-full lg:col-span-1">
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter leading-none mb-6">
              Revenue Split
            </h3>
            <div className="flex-1 min-h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={0}
                    outerRadius={90}
                    dataKey="value"
                    stroke="#ffffff"
                    strokeWidth={2}
                    labelLine={false}
                    label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                      if (percent < 0.05) return null; // Don't show label for very small slices
                      const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                      const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
                      const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
                      return (
                        <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize="11" fontWeight="bold">
                          {`${(percent * 100).toFixed(0)}%`}
                        </text>
                      );
                    }}
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name, props) => {
                      const percent = props.payload.percent !== undefined 
                        ? ` (${(props.payload.percent * 100).toFixed(1)}%)` 
                        : '';
                      return [`${inr(value)}${percent}`, name];
                    }} 
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col h-full lg:col-span-2">
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter leading-none mb-6">
              Top 5 Companies by Markup
            </h3>
            <div className="flex-1 min-h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={corporateChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#334155', fontWeight: 600 }} axisLine={{ stroke: '#475569', strokeWidth: 2 }} tickLine={{ stroke: '#475569', strokeWidth: 2 }} />
                  <YAxis tickFormatter={(val) => `₹${val}`} tick={{ fontSize: 10, fill: '#334155', fontWeight: 600 }} axisLine={{ stroke: '#475569', strokeWidth: 2 }} tickLine={{ stroke: '#475569', strokeWidth: 2 }} />
                  <Tooltip formatter={(value) => inr(value)} cursor={{ fill: '#f8fafc' }} />
                  <Legend verticalAlign="top" height={36} />
                  <Bar dataKey="flight" name="Flight" stackId="a" fill="#003399" radius={[0, 0, 4, 4]} barSize={40} />
                  <Bar dataKey="hotel" name="Hotel" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border shadow-sm" style={{ borderColor: C.border }}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            
            {/* Category Tabs */}
            <div className="flex items-center gap-1.5 p-1.5 bg-slate-50 border border-slate-100 rounded-xl">
              {[
                { label: "All Categories", value: "All", icon: <FiLayers size={14} /> },
                { label: "Flight", value: "Flight", icon: <FaPlane size={14} /> },
                { label: "Hotel", value: "Hotel", icon: <FaHotel size={14} /> }
              ].map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => { setProductType(tab.value); setPage(1); }}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                    productType === tab.value
                      ? "bg-white text-[#003399] shadow-sm border border-slate-200/50"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* Inline Filters */}
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Order ID or Company..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-[13px] font-medium outline-none transition-all focus:border-[#003399] bg-slate-50 hover:bg-white"
                />
                <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              </div>
              
              <div className="w-full sm:w-64">
                <CustomSelect
                  value={selectedCorporate}
                  onChange={(val) => { setSelectedCorporate(val); setPage(1); }}
                  icon={<FaBuilding size={14} />}
                  options={[
                    { label: "All Companies", value: "All" },
                    ...corporates.map(c => ({ label: c.companyName || c.corporateName, value: String(c._id) }))
                  ]}
                />
              </div>

              <div className="w-full sm:w-48">
                <CustomSelect
                  value={timeFilter}
                  onChange={(val) => { setTimeFilter(val); setPage(1); }}
                  icon={<FiCalendar size={14} />}
                  options={[
                    { label: "All Time", value: "All" },
                    { label: "This Month", value: "Monthly" },
                    { label: "This Quarter", value: "Quarterly" },
                    { label: "This Year", value: "Yearly" },
                    { label: "Custom Range", value: "Custom" }
                  ]}
                />
              </div>

              {timeFilter === "Custom" && (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative">
                    <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                    <input
                      type="date"
                      value={customStartDate}
                      onClick={(e) => e.target.showPicker && e.target.showPicker()}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-[130px] pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-[13px] font-medium outline-none transition-all focus:border-[#003399] bg-slate-50 hover:bg-white cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden"
                    />
                  </div>
                  <span className="text-slate-400 text-xs font-bold uppercase">to</span>
                  <div className="relative">
                    <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                    <input
                      type="date"
                      value={customEndDate}
                      onClick={(e) => e.target.showPicker && e.target.showPicker()}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-[130px] pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-[13px] font-medium outline-none transition-all focus:border-[#003399] bg-slate-50 hover:bg-white cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden"
                    />
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-800 uppercase tracking-tighter leading-none">
                Markup Audit Logs
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1.5">
                Detailed breakdown of applied markups
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleExport}
                disabled={exportingKey === "markup_revenue_audit"}
                className="flex items-center gap-2 px-4 py-2 bg-[#003399] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#002266] transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-[#003399]/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exportingKey === "markup_revenue_audit" ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <FiDownload size={14} />
                )}
                {exportingKey === "markup_revenue_audit" ? "Exporting..." : "Export"}
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

          <div ref={tableScrollRef} className="overflow-x-auto min-h-[400px]">
            {auditLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#003399] mb-4"></div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Compiling details...</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse" style={{ minWidth: "900px" }}>
                <thead>
                  <tr className="bg-linear-to-r from-[#003399] to-[#000d26] text-white">
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest opacity-90">Order ID</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest opacity-90">Company</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest opacity-90">Booking Date</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest opacity-90 text-center">Category</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest opacity-90 text-right">Supplier Fare</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest opacity-90 text-right">Markup Amount</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest opacity-90 text-right">Final Fare</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest opacity-90 text-center">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/50">
                  {paginatedAudit.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-24 text-center">
                        <div className="flex flex-col items-center">
                          <FiActivity size={32} className="text-slate-200 mb-3" />
                          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                            No markup audit records found
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedAudit.map((a, i) => {
                      const beforeAmount = Number(a.supplierFare || a.fareBeforeMarkup?.supplierFare || a.bookingDetails?.supplierFare || 0);
                      const markupValue = Number(a.totalMarkup || a.fareAfterMarkup?.markupAmount || a.markupValue || 0);
                      const afterAmount = Number(a.finalFare || a.fareAfterMarkup?.finalFare || a.bookingDetails?.totalFare || a.bookingDetails?.amount || 0);
                      const corpName = a.corporateName || a.bookingDetails?.corporateName || a.bookingDetails?.companyName || "Unknown";
                      const bookingDate = a.bookingDate || a.createdAt;

                      return (
                        <tr key={i} className="hover:bg-slate-50/50 transition-all border-l-4 border-transparent hover:border-[#003399]">
                          <td className="px-6 py-3.5">
                            <span className="font-mono text-[12px] font-black text-slate-800 uppercase tracking-tight whitespace-nowrap">
                              {a.orderId || "—"}
                            </span>
                          </td>
                          <td className="px-6 py-3.5">
                            <span className="font-black text-[12.5px] text-slate-700 whitespace-nowrap">
                              {corpName}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="text-[12.5px] text-slate-700 font-bold">
                                {new Date(bookingDate).toLocaleDateString("en-IN", {
                                  day: "2-digit", month: "short", year: "numeric",
                                })}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-3.5 text-center">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border whitespace-nowrap ${
                                a.productType === "flight"
                                  ? "bg-blue-50 text-blue-700 border-blue-100"
                                  : "bg-purple-50 text-purple-700 border-purple-100"
                              }`}
                            >
                              {a.productType === "flight" ? <FaPlane size={11} className="-mt-0.5" /> : <FaHotel size={11} className="-mt-0.5" />}
                              {a.productType === "flight" ? "Flight" : "Hotel"}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-right whitespace-nowrap">
                            <span className="font-medium text-[13px] text-slate-600 tracking-tight">
                              {inr(beforeAmount)}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-right whitespace-nowrap">
                            <span className="font-black text-[13px] text-emerald-600 tracking-tight">
                              +{inr(markupValue)}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-right whitespace-nowrap">
                            <span className="font-black text-[14px] text-slate-900 tracking-tight">
                              {inr(afterAmount)}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-center">
                            <button
                              onClick={() => navigate(
                                a.productType === "flight"
                                  ? `/bookings/flight/${a.bookingId}`
                                  : `/bookings/hotel/${a.bookingId}`
                              )}
                              className="w-8 h-8 rounded-xl bg-[#003399]/8 hover:bg-[#003399]/15 flex items-center justify-center text-[#003399] transition-colors mx-auto"
                              title="View booking details"
                            >
                              <FiEye size={15} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>
          <div className="px-6 py-4 border-t border-slate-50 flex items-center justify-end">
            <Pagination
              currentPage={page}
              totalPages={Math.max(1, Math.ceil(filteredAudit.length / ITEMS_PER_PAGE))}
              onPageChange={setPage}
              showFirstLast={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ------------------- SUB-COMPONENTS -------------------

function CustomSelect({ value, onChange, options, icon, className = "" }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = React.useRef(null);

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
