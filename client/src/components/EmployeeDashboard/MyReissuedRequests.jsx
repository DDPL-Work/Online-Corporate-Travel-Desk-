// client/src/components/EmployeeDashboard/MyReissuedRequests.jsx
import React, { useState, useEffect, useMemo } from "react";
import { FaPlane, FaRupeeSign } from "react-icons/fa";
import {
  FiSearch,
  FiCalendar,
  FiFilter,
  FiEye,
  FiRefreshCw,
  FiArrowRight,
  FiCheckCircle,
  FiClock,
  FiX,
  FiList,
  FiRepeat,
  FiXCircle,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchReissueRequests, updateReissueStatus } from "../../Redux/Actions/reissueThunks";
import { jwtDecode } from "jwt-decode";
import {
  LabeledField,
  StatCard,
  StatusBadge,
  dateCls,
  IdCell,
  SearchBar,
  Th,
} from "../TravelAdminTabs/Shared/CommonComponents";
import ResponsiveDataTable from "../TravelAdminTabs/Shared/ResponsiveDataTable";
import { Pagination } from "../TravelAdminTabs/Shared/Pagination";
import { C } from "../Shared/color";

/* ─── helpers ─── */
function fmtDate(d, opts = { day: "2-digit", month: "short", year: "numeric" }) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", opts);
}

export default function MyReissuedRequests() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { requests = [], loading } = useSelector((state) => state.reissue);

  const [activeView, setActiveView] = useState("my"); // "my" or "company"
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const token = sessionStorage.getItem("token");
  let userId = null;
  let corporateId = null;
  let role = "employee";

  if (token) {
    try {
      const decoded = jwtDecode(token);
      userId = decoded.id;
      corporateId = decoded.corporateId;
      role = decoded.role || decoded.userRole || "employee";
    } catch (e) { console.error("Token decode error:", e); }
  }

  useEffect(() => {
    if (!corporateId) return;
    const params = { status: statusFilter !== "All" ? statusFilter : undefined };
    if (activeView === "my") params.userId = userId;
    else params.companyId = corporateId;
    dispatch(fetchReissueRequests(params));
  }, [dispatch, activeView, statusFilter, corporateId, userId]);

  const stats = useMemo(() => {
    return {
      total: requests.length,
      pending: requests.filter(r => r.status === "PENDING").length,
      approved: requests.filter(r => r.status === "APPROVED" || r.status === "COMPLETED").length,
      rejected: requests.filter(r => r.status === "REJECTED").length,
    };
  }, [requests]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return (requests || []).filter(r => {
      const reqDate = r.requestedAt ? new Date(r.requestedAt).toISOString().slice(0, 10) : "";
      return (!q || r.reissueId?.toLowerCase().includes(q) || (r.bookingSnapshot?.pnr || "").toLowerCase().includes(q)) &&
             (!startDate || reqDate >= startDate) && (!endDate || reqDate <= endDate);
    });
  }, [requests, search, startDate, endDate]);

  const paginated = useMemo(() => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), [filtered, currentPage]);

  const handleRefresh = () => {
    dispatch(fetchReissueRequests({ 
      status: statusFilter !== "All" ? statusFilter : undefined,
      userId: activeView === "my" ? userId : undefined,
      companyId: corporateId
    }));
  };

  return (
    <div className="min-h-screen font-sans pb-20 -mt-6 -mx-4 md:-mx-6" style={{ background: C.offWhite }}>
      <div className="w-full bg-gradient-to-br from-[#0A4D68] to-[#000d26] text-white pt-8 pb-20 px-6 md:px-10">
        <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-3">
               <button onClick={() => navigate(-1)} className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/10"><FiArrowRight className="rotate-180" size={20} /></button>
               <button onClick={handleRefresh} className={`p-3 rounded-xl bg-white/10 border border-white/10 transition-all ${loading ? "animate-spin" : "hover:bg-white/20"}`} disabled={loading}>
                 <FiRefreshCw size={20} />
               </button>
             </div>
             <div className="h-12 w-[1px] bg-white/10 mx-2 hidden md:block" />
             <div className="flex items-center gap-5">
               <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl text-white border border-white/10 bg-white/10"><FiRepeat size={28} /></div>
               <div>
                 <h1 className="text-3xl font-black tracking-tight leading-none">Amendment Ledger</h1>
                 <p className="text-[10px] mt-2 font-bold uppercase tracking-[2px] opacity-60">Management of Flight Reissue Requests and Travel Document Modifications</p>
               </div>
             </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 md:px-10 -mt-10 space-y-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard label="Total Requests" value={stats.total} Icon={FiList} borderCls="border-[#0A4D68]" iconBgCls="bg-[#0A4D68]/10" iconColorCls="text-[#0A4D68]" />
          <StatCard label="Pending Review" value={stats.pending} Icon={FiClock} borderCls="border-amber-500" iconBgCls="bg-amber-50" iconColorCls="text-amber-600" />
          <StatCard label="Processed" value={stats.approved} Icon={FiCheckCircle} borderCls="border-emerald-500" iconBgCls="bg-emerald-50" iconColorCls="text-emerald-600" />
          <StatCard label="Rejected" value={stats.rejected} Icon={FiXCircle} borderCls="border-red-500" iconBgCls="bg-red-50" iconColorCls="text-red-600" />
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
           <div className="flex gap-2 p-1.5 bg-white border border-slate-200/60 shadow-xl rounded-2xl w-fit">
              {[["my", "My Requests"], ["company", "Corporate View"]].map(([k, lbl]) => (
                <button key={k} onClick={() => setActiveView(k)} className={`px-8 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${activeView === k ? "bg-[#0A4D68] text-white shadow-lg scale-[1.02]" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"}`}>
                   {lbl}
                </button>
              ))}
           </div>
           <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl border shadow-sm">
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest border-none focus:ring-0 cursor-pointer text-[#0A4D68]">
                 {["All", "PENDING", "APPROVED", "REJECTED", "COMPLETED"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
           </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border shadow-sm" style={{ borderColor: C.border }}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
            <LabeledField label={<><FiSearch size={10} /> Search Ledger</>} className="lg:col-span-4">
              <SearchBar value={search} onChange={setSearch} placeholder="PNR, Request ID..." />
            </LabeledField>
            <LabeledField label="Request Timeline" className="lg:col-span-6">
               <div className="flex items-center gap-2">
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={dateCls} style={{ borderColor: C.border }} />
                  <span className="text-slate-300">to</span>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={dateCls} style={{ borderColor: C.border }} />
               </div>
            </LabeledField>
            <div className="flex items-end lg:col-span-2">
               <button onClick={() => { setSearch(""); setStartDate(""); setEndDate(""); setStatusFilter("All"); }} className="w-full py-2.5 rounded-xl font-black text-[11px] flex items-center justify-center gap-2 border shadow-sm transition-all hover:bg-slate-50 uppercase tracking-widest" style={{ background: C.white, borderColor: C.border, color: C.muted }}><FiX /> Reset</button>
            </div>
          </div>
        </div>

        <ResponsiveDataTable title="Amendment Inventory" subtitle={`${filtered.length} reissuance records`} onExport={() => {}} wrapperClass="!border-none !shadow-none" pagination={<Pagination currentPage={currentPage} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />}>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-[#0A4D68] to-[#000d26] text-white">
                <Th className="!px-6 !py-5">Request ID</Th>
                <Th className="!px-6 !py-5">Employee / Context</Th>
                <Th className="!px-6 !py-5">PNR / Reference</Th>
                <Th className="!px-6 !py-5">Type & Reason</Th>
                <Th className="!px-6 !py-5">Status</Th>
                <Th className="!px-6 !py-5 !text-left">Action</Th>
              </tr>
            </thead>
            <tbody>
              {paginated.length > 0 ? paginated.map((b, i) => (
                <tr key={b._id} className="hover:bg-slate-100 transition-colors" style={{ background: i % 2 === 0 ? C.white : C.lightGray }}>
                  <td className="!px-6 !py-5"><IdCell id={b.reissueId} /></td>
                  <td className="!px-6 !py-5">
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-[#0A4D68] border border-slate-200">{(b.user?.name || "U")[0]}</div>
                        <div>
                           <p className="text-xs font-black" style={{ color: C.navy }}>{typeof b.user?.name === 'string' ? b.user.name : `${b.user?.name?.firstName || ''} ${b.user?.name?.lastName || ''}`}</p>
                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{fmtDate(b.requestedAt)}</p>
                        </div>
                     </div>
                  </td>
                  <td className="!px-6 !py-5">
                     <p className="text-xs font-black text-[#0A4D68] tracking-tight">{b.bookingSnapshot?.pnr || "N/A"}</p>
                     <p className="text-[9px] font-bold text-slate-400">{b.bookingReference}</p>
                  </td>
                  <td className="!px-6 !py-5">
                     <p className="text-[10px] font-black text-[#0A4D68] uppercase mb-1">{b.reissueType?.replace("_", " ")}</p>
                     <p className="text-[10px] text-slate-500 italic truncate max-w-[150px]">"{b.reason}"</p>
                  </td>
                  <td className="!px-6 !py-5"><StatusBadge status={b.status?.toLowerCase()} /></td>
                  <td className="!px-6 !py-5 !text-left">
                      <button className="p-3 rounded-xl transition-all shadow-sm hover:shadow-md bg-gradient-to-br from-[#0A4D68] to-[#000d26] hover:bg-white hover:from-white hover:to-white group">
                        <FiEye size={18} className="text-white group-hover:text-[#0A4D68] transition-colors" />
                      </button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={6} className="!px-6 !py-20 text-center"><div className="flex flex-col items-center gap-3"><div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300"><FiRepeat size={32} /></div><p className="text-sm font-bold text-slate-400">No reissue requests found.</p></div></td></tr>
              )}
            </tbody>
          </table>
        </ResponsiveDataTable>
      </div>
    </div>
  );
}
