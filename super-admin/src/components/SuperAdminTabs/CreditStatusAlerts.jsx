import React, { useState, useEffect, useMemo } from "react";
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
  fetchCompanyWiseRevenue,
  fetchCorporateDetailedBookings 
} from "../../Redux/Actions/corporate.related.thunks";
import { toast } from "react-toastify";
import Pagination from "../Shared/Pagination";

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
  const [drillDownData, setDrillDownData] = useState([]);
  const [ddLoading, setDdLoading] = useState(false);
  const [ddPage, setDdPage] = useState(1);
  const [ddSearch, setDdSearch] = useState("");
  const [ddType, setDdType] = useState("All");
  const [ddStatus, setDdStatus] = useState("All");

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

  // Fetch Detailed Drill-down
  useEffect(() => {
    if (drillDownId) {
      const fetchDD = async () => {
        setDdLoading(true);
        try {
          const res = await dispatch(fetchCorporateDetailedBookings({ 
            id: drillDownId, 
            fromDate: startDate, 
            toDate: endDate 
          })).unwrap();
          setDrillDownData(res.data || []);
          setDdPage(1);
          setDdSearch("");
          setDdType("All");
          setDdStatus("All");
        } catch (err) {
          toast.error("Failed to load detailed ledger");
        } finally {
          setDdLoading(false);
        }
      };
      fetchDD();
    }
  }, [drillDownId, startDate, endDate, dispatch]);

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

  const filteredDD = useMemo(() => {
    return drillDownData.filter((item) => {
      const matchSearch = 
        item.reference.toLowerCase().includes(ddSearch.toLowerCase()) ||
        item.employee.toLowerCase().includes(ddSearch.toLowerCase());
      
      const matchType = ddType === "All" || item.type === ddType;
      const matchStatus = ddStatus === "All" || (item.status && item.status.toLowerCase().includes(ddStatus.toLowerCase()));

      return matchSearch && matchType && matchStatus;
    });
  }, [drillDownData, ddSearch, ddType, ddStatus]);

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

  // --- LEDGER DRILL DOWN VIEW ---
  if (drillDownId) {
    const target = corporates.find(c => c._id === drillDownId) || {};
    const paginatedDD = filteredDD.slice((ddPage -1) * ITEMS_PER_PAGE, ddPage * ITEMS_PER_PAGE);

    return (
      <div className="min-h-screen p-4 lg:p-6 bg-[#F8FAFC] space-y-6 animate-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setDrillDownId(null)}
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
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Liquidity:</span>
                    <span className={`text-[11px] font-black ${target.creditLimit - target.currentCredit < target.creditLimit * 0.1 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {inr(target.creditLimit - target.currentCredit)}
                    </span>
                 </div>
              </div>
            </div>
          </div>
          <div className="flex bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm gap-4 items-center">
             <div className="px-4 py-2 text-center border-r border-slate-50">
                <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">Items Found</p>
                <p className="text-sm font-black text-slate-800 leading-none">{filteredDD.length}</p>
             </div>
             <div className="px-4 py-2 text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">Period Spend</p>
                <p className="text-sm font-black text-[#0A4D68] leading-none">{inr(filteredDD.reduce((s,i) => s+i.amount, 0))}</p>
             </div>
          </div>
        </div>

        {/* LEDGER FILTERS */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-4">
           <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[300px] relative group">
                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#0A4D68] transition-colors" />
                <input 
                  type="text"
                  placeholder="Search by reference or employee name..."
                  value={ddSearch}
                  onChange={(e) => setDdSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#0A4D68]/10 transition-all placeholder:text-slate-300"
                />
              </div>
              <div className="flex items-center gap-3">
                 <FilterSelect 
                    label="Booking Type"
                    value={ddType}
                    onChange={setDdType}
                    options={[
                      { label: "All Types", value: "All" },
                      { label: "Flights", value: "Flight" },
                      { label: "Hotels", value: "Hotel" }
                    ]}
                 />
                 <FilterSelect 
                    label="Transaction Status"
                    value={ddStatus}
                    onChange={setDdStatus}
                    options={[
                      { label: "All Statuses", value: "All" },
                      { label: "Voucher / Success", value: "success" },
                      { label: "Pending", value: "pending" },
                      { label: "Cancelled", value: "cancel" }
                    ]}
                 />
                 {(ddSearch || ddType !== 'All' || ddStatus !== 'All') && (
                   <button 
                    onClick={() => {setDdSearch(""); setDdType("All"); setDdStatus("All");}}
                    className="p-3 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-all border border-rose-100 shadow-xs"
                    title="Clear Filters"
                   >
                     <FiRotateCcw size={16} />
                   </button>
                 )}
              </div>
           </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
           <div className="px-8 py-5 border-b border-slate-50 flex items-center justify-between">
              <h3 className="font-black text-slate-800 uppercase text-sm tracking-widest">Transaction Ledger</h3>
              <Pagination 
                currentPage={ddPage} 
                totalPages={Math.ceil(filteredDD.length / ITEMS_PER_PAGE)} 
                onPageChange={setDdPage} 
              />
           </div>
           
           <div className="overflow-x-auto min-h-[400px]">
              {ddLoading ? (
                 <div className="py-20 text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0A4D68] mx-auto mb-4"></div>
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest animate-pulse">Syncing transactions...</p>
                 </div>
              ) : (
                <table className="w-full text-left border-collapse">
                   <thead>
                      <tr className="bg-slate-50 shadow-inner">
                         <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                         <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Reference</th>
                         <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee</th>
                         <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                         <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                         <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Credit Used</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                      {paginatedDD.map((item, idx) => (
                        <tr key={idx} className="group hover:bg-slate-50 transition-all border-l-4 border-transparent hover:border-[#0A4D68]">
                           <td className="px-8 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-tighter">
                              {new Date(item.date).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}
                           </td>
                           <td className="px-8 py-4">
                              <span className="font-mono text-[11px] font-black text-slate-800 uppercase leading-none">{item.reference}</span>
                           </td>
                           <td className="px-8 py-4">
                              <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                                    <FiUser size={14} />
                                 </div>
                                 <span className="text-[12px] font-black text-slate-700">{item.employee}</span>
                              </div>
                           </td>
                           <td className="px-8 py-4">
                              <div className={`flex items-center gap-2 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest w-fit shadow-xs ${item.type === 'Flight' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                                 {item.type === 'Flight' ? <FaPlane size={10} /> : <FaHotel size={10} />}
                                 {item.type}
                              </div>
                           </td>
                           <td className="px-8 py-4">
                              <span className={`text-[10px] font-black uppercase tracking-widest ${item.status?.toLowerCase().includes('success') || item.status?.toLowerCase().includes('voucher') ? 'text-emerald-600' : item.status?.toLowerCase().includes('cancel') ? 'text-rose-600' : 'text-amber-600'}`}>
                                 {item.status?.replace(/_/g, ' ')}
                              </span>
                           </td>
                           <td className="px-8 py-4 text-right font-black text-slate-900 text-[13px]">
                              {inr(item.amount)}
                           </td>
                        </tr>
                      ))}
                      {filteredDD.length === 0 && (
                        <tr>
                           <td colSpan="6" className="py-20 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">No transaction history found for this period</td>
                        </tr>
                      )}
                   </tbody>
                </table>
              )}
           </div>
        </div>
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
                <DateFilter label="From" value={startDate} onChange={setStartDate} />
                <DateFilter label="To" value={endDate} onChange={setEndDate} />
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
                { label: "Stable Only", value: "active" }
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

      {/* DATA TABLE */}
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto min-h-[400px]">
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