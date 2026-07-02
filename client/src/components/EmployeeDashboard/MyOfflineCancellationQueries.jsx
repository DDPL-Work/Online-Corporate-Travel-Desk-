import React, { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchMyCancellationQueries } from "../../Redux/Actions/booking.thunks";
import {
  FiSearch,
  FiRefreshCw,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle,
  FiInbox,
  FiX,
  FiArrowRight,
  FiUser,
  FiGlobe,
  FiCalendar
} from "react-icons/fi";
import {
  StatCard,
  IdCell,
  Th,
  LabeledField,
  SearchBar,
  CustomDropdown,
  RouteCell
} from "../TravelAdminTabs/Shared/CommonComponents";
import ResponsiveDataTable from "../TravelAdminTabs/Shared/ResponsiveDataTable";
import { Pagination } from "../TravelAdminTabs/Shared/Pagination";

import { C } from "../Shared/color";
import useExcelExporter from "../../hooks/export/useExcelExporter";
import { adminOfflineCancellationQueriesExportTemplate } from "../../templates/exportTemplates/clientExportTemplates";

const StatusBadgeLocal = ({ status }) => {
  const map = {
    OPEN: { bg: "#EFF6FF", text: "#1E40AF", border: "#BFDBFE" },
    IN_PROGRESS: { bg: "#FFFBEB", text: "#92400E", border: "#FDE68A" },
    RESOLVED: { bg: "#ECFDF5", text: "#065F46", border: "#A7F3D0" },
    REJECTED: { bg: "#FEF2F2", text: "#991B1B", border: "#FECACA" },
  };
  const s = map[status?.toUpperCase()] || map.OPEN;
  return (
    <span
      className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm"
      style={{ background: s.bg, color: s.text, borderColor: s.border }}
    >
      {status || "OPEN"}
    </span>
  );
};

export default function MyOfflineCancellationQueries() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { queries, queriesLoading, queriesError } = useSelector(
    (state) => state.bookings,
  );
  const { user: currentUser } = useSelector((state) => state.auth);

  const userRole = currentUser?.role || "employee";
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedQueryId, setSelectedQueryId] = useState(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const { exportExcel, isExporting } = useExcelExporter();

  useEffect(() => {
    dispatch(fetchMyCancellationQueries());
  }, [dispatch]);

  const stats = useMemo(() => {
    const list = queries || [];
    return {
      total: list.length,
      open: list.filter((q) => q.status === "OPEN").length,
      inProgress: list.filter((q) => q.status === "IN_PROGRESS").length,
      resolved: list.filter((q) => q.status === "RESOLVED").length,
    };
  }, [queries]);

  const filteredQueries = useMemo(() => {
    let list = (queries || []).map(b => {
      // Route Logic
      const segments = b.flightRequest?.segments || [];
      const onwardSegments = segments.filter(s => s.journeyType === "onward" || s.segmentIndicator === 1 || !s.journeyType);
      const returnSegments = segments.filter(s => s.journeyType === "return" || s.segmentIndicator === 2);
      
      const buildLeg = (segs) => {
        if (!segs.length) return null;
        const first = segs[0]; 
        const last = segs[segs.length - 1];
        return {
          fromCode: (first?.origin?.code || first?.origin?.airportCode) || "N/A",
          toCode: (last?.destination?.code || last?.destination?.airportCode) || "N/A",
          fromCity: first?.origin?.city || "Unknown",
          toCity: last?.destination?.city || "Unknown"
        };
      };

      const routes = [];
      if (onwardSegments.length > 0 || returnSegments.length > 0) {
        const onwardLeg = buildLeg(onwardSegments);
        const returnLeg = buildLeg(returnSegments);
        if (onwardLeg) routes.push(onwardLeg);
        if (returnLeg) routes.push(returnLeg);
      } else if (segments.length > 0) {
        const leg = buildLeg(segments);
        if (leg) routes.push(leg);
      }
      
      const airline = segments[0] ? { 
        airlineCode: segments[0].airlineCode || segments[0].airline?.airlineCode, 
        airlineName: segments[0].airlineName || segments[0].airline?.airlineName 
      } : null;

      return { ...b, routesData: routes, airlineData: airline };
    });
    
    if (statusFilter !== "All") {
      list = list.filter((q) => (q.status || "OPEN").toUpperCase() === statusFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (item) =>
          item.bookingReference?.toLowerCase().includes(q) ||
          item.queryId?.toLowerCase().includes(q) ||
          item.corporate?.employeeName?.toLowerCase().includes(q) ||
          item.corporate?.employeeEmail?.toLowerCase().includes(q),
      );
    }
    if (startDate) {
      list = list.filter((q) => new Date(q.requestedAt) >= new Date(startDate));
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      list = list.filter((q) => new Date(q.requestedAt) <= end);
    }

    return list;
  }, [queries, search, statusFilter, startDate, endDate, currentUser]);

  const paginated = useMemo(() => filteredQueries.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), [filteredQueries, currentPage]);



  const handleRefresh = async () => {
    dispatch(fetchMyCancellationQueries());
  };

  if (queriesError) {
    return (
      <div className="bg-white border rounded-3xl p-16 text-center shadow-sm" style={{ borderColor: C.border }}>
        <FiAlertCircle size={48} className="mx-auto mb-4 text-red-500" />
        <h3 className="text-xl font-black mb-2" style={{ color: C.navy }}>Sync Protocol Interrupted</h3>
        <p className="text-slate-400 mb-8 max-w-md mx-auto font-medium">{queriesError}</p>
        <button onClick={handleRefresh} className="px-10 py-4 bg-navy rounded-2xl text-white font-black text-xs uppercase tracking-widest shadow-lg" style={{ background: C.navy }}>
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans pb-20 -mt-6 -mx-4 md:-mx-6" style={{ background: C.offWhite }}>
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
                  className={`p-3 rounded-xl bg-white/10 transition-all border border-white/10 ${queriesLoading ? "opacity-50 cursor-not-allowed" : "hover:bg-white/20"}`}
                  disabled={queriesLoading}
               >
                 <div className={queriesLoading ? "animate-spin" : ""}>
                   <FiRefreshCw size={20} />
                 </div>
               </button>
             </div>
             
             <div className="h-12 w-[1px] bg-white/10 mx-2 hidden md:block" />

             <div className="flex items-center md:items-center gap-4 md:gap-5">
               <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl flex shrink-0 items-center justify-center shadow-xl text-white border border-white/10 bg-white/10" >
                 <FiInbox size={24} className="md:w-7 md:h-7" />
               </div>
               <div>
                 <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-none">My Cancellation Queries</h1>
                 <p className="text-[9px] md:text-[10px] mt-2 md:mt-3 font-bold uppercase tracking-[2px] opacity-60">
                   Track Your Offline Amendments & Ticketing Inquiries
                 </p>
               </div>
             </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 md:px-10 -mt-10 space-y-10">
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard label="Total Submissions" value={stats.total} Icon={FiInbox} borderCls="border-slate-800" iconBgCls="bg-slate-100" iconColorCls="text-slate-800" />
            <StatCard label="Pending Review" value={stats.open} Icon={FiClock} borderCls="border-blue-500" iconBgCls="bg-blue-50" iconColorCls="text-blue-600" />
            <StatCard label="Under Process" value={stats.inProgress} Icon={FiRefreshCw} borderCls="border-amber-500" iconBgCls="bg-amber-50" iconColorCls="text-amber-600" />
            <StatCard label="Closed Queries" value={stats.resolved} Icon={FiCheckCircle} borderCls="border-emerald-500" iconBgCls="bg-emerald-50" iconColorCls="text-emerald-600" />
          </div>

          <div className="bg-white rounded-2xl p-6 border shadow-sm" style={{ borderColor: C.border }}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
              <LabeledField label={<><FiSearch size={10} /> Reference Search</>} className="lg:col-span-3">
                <SearchBar value={search} onChange={setSearch} placeholder="PNR, Ref or Query Identifier..." />
              </LabeledField>
              <LabeledField label="Protocol Status" className="lg:col-span-2">
                <CustomDropdown value={statusFilter} onChange={setStatusFilter} options={["All", "OPEN", "IN_PROGRESS", "RESOLVED", "REJECTED"]} />
              </LabeledField>
              <LabeledField label={<><FiCalendar size={10} /> From Date</>} className="lg:col-span-2">
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full text-[11px] font-bold py-2.5 px-3 border border-gray-200 rounded-xl outline-none focus:border-navy text-gray-700 bg-white transition-all shadow-sm" />
              </LabeledField>
              <LabeledField label={<><FiCalendar size={10} /> To Date</>} className="lg:col-span-2">
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full text-[11px] font-bold py-2.5 px-3 border border-gray-200 rounded-xl outline-none focus:border-navy text-gray-700 bg-white transition-all shadow-sm" />
              </LabeledField>
              <div className="flex items-end lg:col-span-3">
                 <button onClick={() => { setSearch(""); setStatusFilter("All"); setStartDate(""); setEndDate(""); }} className="w-full py-2.5 rounded-xl font-black text-[11px] flex items-center justify-center gap-2 border shadow-sm transition-all hover:bg-slate-50 uppercase tracking-widest" style={{ background: C.white, borderColor: C.border, color: C.muted }}><FiX /> Reset</button>
              </div>
            </div>
          </div>

          <ResponsiveDataTable 
            title="Governance Ledger" 
            subtitle={`${filteredQueries.length} active queries tracked`} 
            exportLabel="Export Excel"
            exportLoading={isExporting}
            exportDisabled={isExporting}
            onExport={() => exportExcel({
              pageHeader: "Governance Ledger",
              statCards: [
                { label: "Total Submissions", value: stats.total },
                { label: "Pending Review", value: stats.open },
                { label: "Under Process", value: stats.inProgress },
                { label: "Closed Queries", value: stats.resolved }
              ],
              appliedFilters: [
                { label: "Search", value: search || "None" },
                { label: "Status", value: statusFilter },
                { label: "From Date", value: startDate || "All" },
                { label: "To Date", value: endDate || "All" }
              ],
              data: filteredQueries,
              columns: adminOfflineCancellationQueriesExportTemplate,
              filenamePrefix: "offline_cancellation_queries"
            })}
            wrapperClass="!border-none !shadow-none" 
            pagination={<Pagination currentPage={currentPage} totalItems={filteredQueries.length} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />}
          >
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-[#003399] to-[#000d26] text-white">
                  <Th className="!px-6 !py-5">Query ID</Th>
                  <Th className="!px-6 !py-5">Order ID</Th>
                  <Th className="!px-6 !py-5">Airline / Route</Th>
                  <Th className="!px-6 !py-5">PNR</Th>
                  <Th className="!px-6 !py-5">Travel Date & Time</Th>
                  <Th className="!px-6 !py-5">Submitted At</Th>
                  <Th className="!px-6 !py-5">Amount</Th>
                  <Th className="!px-6 !py-5">Priority</Th>
                  <Th className="!px-6 !py-5">Status</Th>
                  <Th className="!px-6 !py-5 !text-left">Action</Th>
                </tr>
              </thead>
              <tbody>
                {paginated.length > 0 ? paginated.map((query, i) => (
                  <tr key={query._id} className="hover:bg-slate-100 transition-colors" style={{ background: i % 2 === 0 ? C.white : C.lightGray }}>
                    <td className="!px-6 !py-5"><IdCell id={query.queryId || query._id} prefix="Q-" /></td>
                    <td className="!px-6 !py-5"><IdCell id={query.bookingSnapshot?.orderId || query.orderId || query.bookingReference} /></td>
                    <td className="!px-6 !py-5">
                       <RouteCell routes={query.routesData} airline={query.airlineData} />
                    </td>
                    <td className="!px-6 !py-5 font-black text-xs text-rose-500">{query.bookingResult?.pnr || query.bookingSnapshot?.pnr || query.bookingReference}</td>
                    <td className="!px-6 !py-5">
                       <p className="text-xs font-bold" style={{ color: C.navy }}>{query.bookingSnapshot?.travelDate ? new Date(query.bookingSnapshot.travelDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : "—"}</p>
                       <p className="text-[10px] text-slate-400 font-medium">{query.bookingSnapshot?.travelDate ? new Date(query.bookingSnapshot.travelDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ""}</p>
                    </td>
                    <td className="!px-6 !py-5">
                       <p className="text-xs font-bold" style={{ color: C.navy }}>{query.requestedAt ? new Date(query.requestedAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : "—"}</p>
                       <p className="text-[10px] text-slate-400 font-medium">{query.requestedAt ? new Date(query.requestedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ""}</p>
                    </td>
                    <td className="!px-6 !py-5 font-black text-xs" style={{ color: C.navy }}>₹{(query.bookingSnapshot?.totalAmount || query.pricingSnapshot?.totalAmount || 0).toLocaleString()}</td>
                    <td className="!px-6 !py-5">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${query.priority === "HIGH" ? "bg-rose-50 text-rose-600" : query.priority === "LOW" ? "bg-slate-50 text-slate-500" : "bg-amber-50 text-amber-600"}`}>
                        {query.priority || "MEDIUM"}
                      </span>
                    </td>
                    <td className="!px-6 !py-5"><StatusBadgeLocal status={query.status} /></td>
                    <td className="!px-6 !py-5 !text-left">
                       <button 
                         onClick={() => navigate(`/my-booking/${query._id}?source=offline-cancellation`)} 
                         className="p-3 rounded-xl transition-all shadow-sm hover:shadow-md bg-gradient-to-br from-[#003399] to-[#000d26] hover:bg-white hover:from-white hover:to-white group"
                       >
                         <FiArrowRight size={18} className="text-[#E7C695] group-hover:text-[#000d26] transition-colors" />
                       </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={11} className="!px-6 !py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                          <FiSearch size={32} />
                        </div>
                        <p className="text-sm font-bold text-slate-400">No active queries found for the selected criteria.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </ResponsiveDataTable>
        </div>
      </div>
    </div>
  );
}
