import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchReissueRequests, executeReissue } from "../../Redux/Actions/reissueThunks";
import { fetchCorporates } from "../../Redux/Slice/corporateListSlice";
import Pagination from "../Shared/Pagination";
import TableActionBar from "../Shared/TableActionBar";
import { FlightBookingModal } from "../Shared/BookingRequestDetailsModal";
import {
  FiSearch,
  FiEye,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiPlayCircle,
  FiRepeat
} from "react-icons/fi";
import { toast } from "react-toastify";

export default function AllReissueRequests() {
  const dispatch = useDispatch();
  const { requests, loading, executing } = useSelector((state) => state.reissue);
  const { corporates: onboardedCorporates } = useSelector((state) => state.corporateList);

  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [corporate, setCorporate] = useState("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [page, setPage] = useState(1);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const tableScrollRef = useRef(null);

  useEffect(() => {
    // Fetch all requests (large limit for client side filtering like cancellation summary)
    dispatch(fetchReissueRequests({ page: 1, limit: 1000 }));
    dispatch(fetchCorporates());
  }, [dispatch]);

  const corporates = useMemo(() => {
    const fromOnboarded = (onboardedCorporates || []).map((c) => c.corporateName || c.name || c.title);
    const namesFromRequests = (requests || []).map((r) => r.corporate?.companyName).filter(Boolean);
    const allNames = new Set([...fromOnboarded, ...namesFromRequests]);
    return ["All", ...Array.from(allNames).sort()];
  }, [onboardedCorporates, requests]);

  const filtered = useMemo(() => {
    return (requests || []).filter((r) => {
      const statusMatch = statusFilter === "All" || r.status === statusFilter;
      const corpMatch = corporate === "All" || r.corporate?.companyName === corporate;
      const searchMatch =
        !search ||
        (r.reissueId || "").toLowerCase().includes(search.toLowerCase()) ||
        (r.bookingSnapshot?.pnr || "").toLowerCase().includes(search.toLowerCase()) ||
        (r.user?.name || "").toLowerCase().includes(search.toLowerCase());

      const dStamp = new Date(r.requestedAt);
      const startOk = !startDate || dStamp >= new Date(startDate);
      const endOk = !endDate || dStamp <= new Date(endDate);

      return statusMatch && corpMatch && searchMatch && startOk && endOk;
    });
  }, [requests, statusFilter, corporate, search, startDate, endDate]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / 10));
  const paginatedData = filtered.slice((page - 1) * 10, page * 10);

  useEffect(() => { setPage(1); }, [statusFilter, search, corporate, startDate, endDate]);

  const handleExecute = async (requestId) => {
    if (window.confirm("Are you sure you want to execute this reissue via TBO?")) {
      try {
        const userStr = sessionStorage.getItem("user") || sessionStorage.getItem("adminUser");
        const user = userStr ? JSON.parse(userStr) : {};
        
        await dispatch(
          executeReissue({
            requestId,
            actionBy: user._id || "SuperAdmin",
            actionByName: user.name || "Super Admin",
          })
        ).unwrap();
        
        toast.success("Reissue executed successfully!");
        dispatch(fetchReissueRequests({ page: 1, limit: 1000 }));
      } catch (err) {
        toast.error(err || "Failed to execute reissue");
      }
    }
  };

  return (
    <div className="min-h-screen p-4 lg:p-6 bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-2">
           <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-700 flex items-center justify-center shadow-xl shadow-blue-700/20 text-white">
                <FiRepeat size={28} />
              </div>
              <div className="text-left">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">Reissue Requests</h1>
                <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest mt-1.5 opacity-80">Global Execution Dashboard</p>
              </div>
           </div>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
             Total Records: <span className="text-slate-900">{filtered.length}</span>
           </p>
        </div>

        {/* SUMMARY STATS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard label="Total Requests" value={filtered.length} Icon={FiRepeat} color="#1E293B" />
          <StatCard label="Pending Action" value={filtered.filter(r => r.status === "PENDING").length} Icon={FiClock} color="#F59E0B" />
          <StatCard label="Approved (Ready)" value={filtered.filter(r => r.status === "APPROVED").length} Icon={FiCheckCircle} color="#3B82F6" />
          <StatCard label="Completed" value={filtered.filter(r => r.status === "COMPLETED").length} Icon={FiCheckCircle} color="#10B981" />
        </div>

        {/* FILTERS */}
        <div className="bg-white rounded-2xl shadow-sm p-3 border border-slate-100">
           <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[200px] relative group">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-700 transition-colors" size={14} />
                <input
                  type="text"
                  placeholder="Search Request ID, PNR, User..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border-none rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-700/10 transition-all"
                />
              </div>

              <FilterDropdown label="Status" value={statusFilter} onChange={setStatusFilter}>
                 <option value="All">All Statuses</option>
                 <option value="PENDING">Pending</option>
                 <option value="APPROVED">Approved</option>
                 <option value="REJECTED">Rejected</option>
                 <option value="COMPLETED">Completed</option>
              </FilterDropdown>

              <FilterDropdown label="Corporate" value={corporate} onChange={setCorporate} wide>
                 {corporates.map(c => <option key={c} value={c}>{c}</option>)}
              </FilterDropdown>

              <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-50">
                 <DateFilter label="From Date" value={startDate} onChange={setStartDate} />
                 <DateFilter label="To Date" value={endDate} onChange={setEndDate} />
              </div>
           </div>
        </div>

        <TableActionBar
          scrollRef={tableScrollRef}
          exportLabel="Export Requests"
          onExport={() => {}}
          exportClassName="bg-blue-700 hover:bg-blue-800 shadow-blue-700/20"
          arrowClassName="border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-200 hover:text-blue-800 disabled:hover:bg-blue-50"
        />

        {/* DATA TABLE */}
        <div className="bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden">
           <div ref={tableScrollRef} className="overflow-x-auto min-h-[500px]">
              {loading ? (
                <div className="py-20 text-center flex flex-col items-center">
                   <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-700 mb-4"></div>
                   <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Loading Requests...</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                   <thead>
                      <tr className="bg-slate-900/95 border-b border-slate-800">
                         <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Request Info</th>
                         <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Corporate & User</th>
                         <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Booking Context</th>
                         <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type & Reason</th>
                         <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                         <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Actions</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                      {paginatedData.map((req) => (
                        <tr key={req._id} className="hover:bg-slate-50/50 transition-all group">
                           <td className="px-6 py-3">
                              <div className="flex flex-col">
                                 <span className="font-black text-[11px] text-slate-800 leading-none">{req.reissueId}</span>
                                 <span className="text-[9px] font-bold text-slate-400 mt-1.5 uppercase tracking-tighter">
                                    {new Date(req.requestedAt).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}
                                 </span>
                              </div>
                           </td>
                           <td className="px-6 py-3">
                              <div className="flex flex-col">
                                 <span className="font-black text-[11px] text-slate-800 leading-none">{req.corporate?.companyName || "N/A"}</span>
                                 <span className="text-[9px] font-bold text-blue-600 mt-1.5 uppercase tracking-tighter italic">{req.user?.name}</span>
                              </div>
                           </td>
                           <td className="px-6 py-3">
                              <div className="flex flex-col">
                                 <span className="font-black text-[11px] text-slate-800 leading-none">PNR: {req.bookingSnapshot?.pnr || "N/A"}</span>
                                 <span className="font-mono text-[9px] text-slate-400 mt-1.5">Ref: {req.bookingReference}</span>
                              </div>
                           </td>
                           <td className="px-6 py-3">
                              <div className="max-w-[200px]">
                                 <p className="font-black text-[11px] text-slate-800 capitalize leading-none">{req.reissueType.replace("_", " ").toLowerCase()}</p>
                                 <p className="text-[10px] text-slate-500 mt-1.5 truncate" title={req.reason}>{req.reason}</p>
                              </div>
                           </td>
                           <td className="px-6 py-3">
                              <div className={`flex items-center gap-2 px-2.5 py-1 rounded-full border text-[9px] font-black uppercase w-fit ${
                                 req.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                                 req.status === "APPROVED" ? "bg-blue-50 text-blue-700 border-blue-100" :
                                 req.status === "REJECTED" ? "bg-rose-50 text-rose-700 border-rose-100" :
                                 "bg-amber-50 text-amber-700 border-amber-100"
                              }`}>
                                 <div className={`w-1 h-1 rounded-full ${
                                    req.status === "COMPLETED" ? 'bg-emerald-700' :
                                    req.status === "APPROVED" ? 'bg-blue-700' :
                                    req.status === "REJECTED" ? 'bg-rose-700' :
                                    'bg-amber-700'
                                 }`} />
                                 {req.status}
                              </div>
                           </td>
                           <td className="px-6 py-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                 {req.status === "APPROVED" && (
                                   <button 
                                     onClick={() => handleExecute(req._id)}
                                     disabled={executing}
                                     title="Execute via TBO"
                                     className="w-8 h-8 rounded-lg bg-green-50 border border-green-100 flex items-center justify-center text-green-600 hover:bg-green-600 hover:text-white transition-all disabled:opacity-50"
                                   >
                                     <FiPlayCircle size={16} />
                                   </button>
                                 )}
                                 <button 
                                    onClick={() => setSelectedBooking(req.bookingId)}
                                    title="View Booking Details"
                                    className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:text-blue-700 hover:bg-blue-50 hover:border-blue-100 transition-all"
                                 >
                                    <FiEye size={16} />
                                 </button>
                              </div>
                           </td>
                        </tr>
                      ))}
                   </tbody>
                </table>
              )}
           </div>

           <div className="px-6 py-3 border-t border-slate-50 flex items-center justify-between bg-white">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Pages: {totalPages}</span>
              <Pagination 
                currentPage={page} 
                totalPages={totalPages} 
                onPageChange={setPage} 
                showFirstLast 
              />
           </div>
        </div>
      </div>

      {selectedBooking && typeof selectedBooking === "object" && (
        <FlightBookingModal booking={selectedBooking} onClose={() => setSelectedBooking(null)} />
      )}
    </div>
  );
}

function StatCard({ label, value, Icon, color }) {
  return (
    <div className="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm border border-slate-100 hover:border-slate-200 transition-all hover:-translate-y-1 group">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 group-hover:rotate-6 transition-transform" style={{ backgroundColor: `${color}10`, color }}>
        <Icon size={20} />
      </div>
      <div className="text-left">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">{label}</p>
        <p className="text-xl font-black text-slate-900 leading-none tracking-tight">{value}</p>
      </div>
    </div>
  );
}

function FilterDropdown({ label, value, onChange, children, wide }) {
  return (
    <div className={`flex flex-col gap-1.5 ${wide ? 'min-w-[180px]' : 'min-w-[120px]'}`}>
      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-slate-50 border-none rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer focus:ring-2 focus:ring-blue-700/10 transition-all"
      >
        {children}
      </select>
    </div>
  );
}

function DateFilter({ label, value, onChange }) {
  return (
    <div className="flex flex-col gap-1.5">
       <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">{label}</label>
       <input
         type="date"
         value={value}
         onChange={(e) => onChange(e.target.value)}
         className="px-3 py-1.5 bg-[#fcfcfc] border-none rounded-lg text-[10px] font-bold text-slate-600 outline-none focus:bg-white transition-all w-[110px]"
       />
    </div>
  );
}
