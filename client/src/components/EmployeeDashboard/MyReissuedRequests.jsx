import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { toast } from "react-toastify";
import {
  FiArrowLeft, FiCheck, FiCheckCircle, FiClock,
  FiDownload, FiEye, FiList, FiRefreshCw, FiRepeat, FiXCircle,
  FiSearch
} from "react-icons/fi";

import { 
  fetchLegacyReissueRequests, 
  updateReissueStatus,
  fetchReissueRequests,
  fetchOfflineReissueRequests,
  fetchCompanyReissueRequests
} from "../../Redux/Actions/reissueThunks";
import { 
  getRequestId, getPnr, getUserName, getUserEmail, getJourneyType, 
  getAirline, getTotalFare, getCurrency, getRoute, getTicketUrl, 
  getStatus, getRequestedDate, getFareDifference, getSegments, getStatusTone
} from "../../utils/reissueResolvers";
import { IdCell } from "../TravelAdminTabs/Shared/CommonComponents";
import LegacyReissueDetailModal from "./LegacyReissueDetailModal";

/* ─────────────────────────────────────────────────────────────────
   STATUS BADGE
   ───────────────────────────────────────────────────────────────── */
const StatusBadge = ({ req }) => {
  const status = getStatus(req);
  const tone = getStatusTone(status);
  const icons = {
    PENDING:   <FiClock size={11} />,
    APPROVED:  <FiCheckCircle size={11} />,
    COMPLETED: <FiCheckCircle size={11} />,
    REJECTED:  <FiXCircle size={11} />,
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${tone}`}>
      {icons[status] || null}
      {status}
    </span>
  );
};

/* ─────────────────────────────────────────────────────────────────
   TICKET ACTION BUTTONS
   ───────────────────────────────────────────────────────────────── */
const TicketActions = ({ req }) => {
  const downloadUrl = getTicketUrl(req);
  const status = getStatus(req);

  if (!downloadUrl && !["COMPLETED", "TICKET_GENERATED"].includes(status)) {
    return (
      <span className="text-[10px] font-bold text-slate-400 italic">
        Ticket Pending
      </span>
    );
  }

  if (!downloadUrl) {
     return (
      <span className="text-[10px] font-bold text-slate-400 italic">
        Processing
      </span>
    );
  }

  const handleView = () => {
    window.open(downloadUrl, "_blank", "noopener,noreferrer");
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `reissue-ticket-${getRequestId(req)}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleView}
        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 hover:bg-slate-50 hover:text-[#0A2D45] transition-all w-full"
        title="View ticket in browser"
      >
        <FiEye size={12} /> View
      </button>
      <button
        onClick={handleDownload}
        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#0A2D45] text-white rounded-lg text-[11px] font-bold hover:bg-[#071f30] transition-all w-full"
        title="Download ticket"
      >
        <FiDownload size={12} /> Download
      </button>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────
   LEDGER STAT CARD
   ───────────────────────────────────────────────────────────────── */
const LedgerStatCard = ({ label, value, Icon, color }) => {
  const borderColors = {
    blue: "border-l-blue-500",
    orange: "border-l-amber-500",
    green: "border-l-emerald-500",
    red: "border-l-rose-500"
  };
  const iconColors = {
    blue: "bg-blue-50 text-blue-500",
    orange: "bg-amber-50 text-amber-500",
    green: "bg-emerald-50 text-emerald-500",
    red: "bg-rose-50 text-rose-500"
  };

  return (
    <div className={`bg-white rounded-xl shadow-md p-5 border border-slate-100 border-l-4 ${borderColors[color] || borderColors.blue} flex items-center gap-4`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${iconColors[color] || iconColors.blue}`}>
        <Icon size={18} strokeWidth={2.5} />
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
        <p className="text-2xl font-black text-slate-800 leading-none mt-1">{value}</p>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────
   REISSUE CARD — "My Reissued" view
   ───────────────────────────────────────────────────────────────── */
const ReissueCard = ({ req, onView }) => {
  const route = getRoute(req);
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-all flex flex-col gap-4 relative overflow-hidden">
      {/* Type ribbon */}
      <div className="absolute top-0 right-0">
        <span className="px-3 py-1 bg-[#0A2D45] text-white text-[9px] font-black uppercase tracking-widest rounded-bl-xl">
          {req.reissueType || req.type || "REISSUE"}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between pr-24">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Request ID</span>
          <IdCell id={getRequestId(req)} />
        </div>
        <div className="text-right">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Requested</span>
          <p className="text-[12px] font-semibold text-slate-600 mt-0.5">{getRequestedDate(req)}</p>
        </div>
      </div>

      {/* PNR / Booking Ref */}
      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">PNR</span>
          <p className="text-sm font-black text-slate-900 uppercase tracking-tight mt-0.5">{getPnr(req)}</p>
        </div>
        <div className="h-8 w-px bg-slate-200 mx-2" />
        <div className="text-right">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Booking Ref</span>
          <p className="text-sm font-black text-slate-900 uppercase tracking-tight mt-0.5">
            {req?.metadata?.orderId || req?.bookingReference || req?.orderId || req?.bookingRef || "N/A"}
          </p>
        </div>
      </div>

      {/* Route */}
      {route !== "N/A" && (
        <div className="bg-slate-50/50 rounded-lg px-3 py-1.5 border border-slate-100">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Route</span>
          <p className="text-sm font-bold text-slate-800 mt-0.5">{route}</p>
        </div>
      )}

      {/* Reason */}
      <div>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Reason</span>
        <p className="text-[12px] text-slate-600 leading-relaxed mt-1 italic bg-slate-50/50 p-2 rounded-lg border border-slate-100 line-clamp-2">
          &ldquo;{req.reason || req.remarks || "N/A"}&rdquo;
        </p>
      </div>

      {/* Ticket */}
      <div className="mt-2">
        <TicketActions req={req} />
      </div>

      {/* Footer */}
      <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between">
        <StatusBadge req={req} />
        <button
          onClick={() => onView(req)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 hover:bg-slate-50 hover:text-[#0A2D45] hover:border-[#0A2D45] transition-all"
        >
          <FiEye size={13} /> Details
        </button>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────
   MAIN COMPONENT
   ───────────────────────────────────────────────────────────────── */
const MyReissueRequests = () => {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const [searchParams] = useSearchParams();

  const { 
    legacyRequests, legacyLoading,
    requests: onlineRequests, loading: onlineLoading,
    offlineRequests, offlineLoading,
    companyRequests, companyLoading
  } = useSelector((s) => s.reissue);

  // If URL has ?scope=company (e.g. from sidebar), start on company tab
  const initialTab = searchParams.get("scope") === "company" ? "company" : "my";
  const [activeTab,     setActiveTab]     = useState(initialTab);
  const [filter,        setFilter]        = useState("All");
  const [currentPage,   setCurrentPage]   = useState(1);
  const [selectedReq,   setSelectedReq]   = useState(null);

  // Search and Timeline state (visual for now)
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Decode token
  let userId = null, corporateId = null, role = "employee";
  try {
    const token = sessionStorage.getItem("token");
    if (token) {
      const d = jwtDecode(token);
      userId = d.id;
      corporateId = d.corporateId;
      role = d.role || d.userRole || "employee";
    }
  } catch {}

  const buildParams = () => ({
    page: currentPage,
    limit: 10,
    ...(filter !== "All" ? { status: filter } : {}),
  });

  const load = () => {
    const params = buildParams();
    if (activeTab === "my") {
      dispatch(fetchReissueRequests(params));
      dispatch(fetchOfflineReissueRequests(params));
    } else {
      dispatch(fetchCompanyReissueRequests({ ...params, corporateId }));
      dispatch(fetchLegacyReissueRequests({ ...params, companyId: corporateId }));
    }
  };

  useEffect(() => {
    if (userId || corporateId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, activeTab, currentPage, filter, userId, corporateId]);

  const handleStatusUpdate = async (requestId, newStatus) => {
    const message = prompt(`Enter reason for ${newStatus} (optional):`) ?? "";
    if (message === null) return;
    try {
      let actionByName = "Admin";
      try {
        const u = JSON.parse(sessionStorage.getItem("user") || "{}");
        actionByName = typeof u.name === "string"
          ? u.name
          : [u.name?.firstName, u.name?.lastName].filter(Boolean).join(" ") || "Admin";
      } catch {}
      await dispatch(updateReissueStatus({
        requestId, status: newStatus, message, actionBy: userId, actionByName
      })).unwrap();
      toast.success(`Request ${newStatus} successfully!`);
      load();
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to update status");
    }
  };

  const currentRequests = useMemo(() => {
    let baseRequests = [];
    if (activeTab === "company") {
      const merged = [...(companyRequests || []), ...(legacyRequests || [])];
      // Deduplicate by ID
      const uniqueMap = new Map();
      merged.forEach(r => {
        const uid = r.requestId || r.id || r._id;
        if (uid && !uniqueMap.has(uid)) uniqueMap.set(uid, r);
      });
      baseRequests = Array.from(uniqueMap.values());
    } else {
      baseRequests = [...(onlineRequests || []), ...(offlineRequests || [])];
    }
    
    // Sort
    let sorted = baseRequests.sort((a, b) => {
      const d1 = new Date(a.createdAt || a.date);
      const d2 = new Date(b.createdAt || b.date);
      return d2 - d1;
    });

    // Client-side search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      sorted = sorted.filter(r => 
        (r.pnr || "").toLowerCase().includes(q) || 
        (r.requestId || r.id || r._id || "").toString().toLowerCase().includes(q)
      );
    }
    return sorted;
  }, [activeTab, companyRequests, legacyRequests, onlineRequests, offlineRequests, searchQuery]);

  const loading = legacyLoading || onlineLoading || offlineLoading || companyLoading;

  const stats = useMemo(() => ({
    total:    currentRequests.length,
    pending:  currentRequests.filter((r) => getStatus(r) === "PENDING").length,
    approved: currentRequests.filter((r) => ["APPROVED", "COMPLETED", "TICKET_GENERATED", "IN_PROGRESS"].includes(getStatus(r))).length,
    rejected: currentRequests.filter((r) => getStatus(r) === "REJECTED").length,
  }), [currentRequests]);

  const resetFilters = () => {
    setSearchQuery("");
    setDateFrom("");
    setDateTo("");
    setFilter("All");
  };

  return (
    <div className="min-h-screen bg-[#F4F7F9] font-sans flex flex-col">
      {/* ─────────────────────────────────────────────────────────────────
          TOP HEADER SECTION (Dark Navy)
          ───────────────────────────────────────────────────────────────── */}
      <div className="bg-[#0A2D45] w-full pt-8 pb-16 px-6 relative overflow-hidden">
        {/* Subtle background pattern/gradient if desired */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-lg text-white hover:bg-white/20 transition-colors">
                <FiArrowLeft size={18} />
              </button>
              <button onClick={load} className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-lg text-white hover:bg-white/20 transition-colors" title="Refresh">
                <FiRefreshCw size={16} className={loading ? "animate-spin" : ""} />
              </button>
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-white ml-2">
                <FiRepeat size={20} />
              </div>
              <div className="ml-1">
                <h1 className="text-2xl font-black text-white tracking-tight leading-none">Amendment Ledger</h1>
                <p className="text-[9px] font-bold text-slate-300 mt-1.5 uppercase tracking-widest">Management of Flight Reissue Requests and Travel Document Modifications</p>
              </div>
            </div>
            
            <button onClick={load} className="h-10 px-4 bg-white/10 border border-white/20 rounded-lg text-white text-xs font-bold hover:bg-white/20 transition-colors flex items-center gap-2">
              <FiRefreshCw size={14} className={loading ? "animate-spin" : ""} />
              REFRESH
            </button>
          </div>

          {/* Stat Cards - Overlapping the bottom edge */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 translate-y-12">
            <LedgerStatCard label="TOTAL REQUESTS" value={loading ? "—" : stats.total} Icon={FiList} color="blue" />
            <LedgerStatCard label="PENDING REVIEW" value={loading ? "—" : stats.pending} Icon={FiClock} color="orange" />
            <LedgerStatCard label="PROCESSED" value={loading ? "—" : stats.approved} Icon={FiCheckCircle} color="green" />
            <LedgerStatCard label="REJECTED" value={loading ? "—" : stats.rejected} Icon={FiXCircle} color="red" />
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────
          MAIN CONTENT AREA
          ───────────────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto w-full px-6 pt-16 pb-12 flex-1 space-y-6">
        
        {/* Tabs and Filter */}
        <div className="flex items-center justify-between">
          <div className="flex bg-white rounded-xl shadow-sm p-1 border border-slate-200">
             <button onClick={() => { setActiveTab("my"); setCurrentPage(1); }} 
               className={`px-6 py-2.5 rounded-lg text-[11px] font-bold tracking-wider transition-all ${activeTab === "my" ? "bg-[#0A2D45] text-white shadow-md" : "text-slate-500 hover:text-slate-700 bg-transparent"}`}>
               MY REQUESTS
             </button>
             {role !== "employee" && (
               <button onClick={() => { setActiveTab("company"); setCurrentPage(1); }}
                 className={`px-6 py-2.5 rounded-lg text-[11px] font-bold tracking-wider transition-all ${activeTab === "company" ? "bg-[#0A2D45] text-white shadow-md" : "text-slate-500 hover:text-slate-700 bg-transparent"}`}>
                 CORPORATE VIEW
               </button>
             )}
          </div>
          <div>
            <select 
              value={filter} 
              onChange={(e) => { setFilter(e.target.value); setCurrentPage(1); }}
              className="bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#0A2D45] cursor-pointer shadow-sm min-w-[120px]"
            >
              <option value="All">ALL STATUS ▼</option>
              <option value="PENDING">PENDING</option>
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
              <option value="COMPLETED">COMPLETED</option>
            </select>
          </div>
        </div>

        {/* Search & Timeline Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col md:flex-row gap-6 items-end">
          <div className="flex-1 w-full">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Search Ledger</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <FiSearch size={16} />
              </span>
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="PNR, Request ID..." 
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#0A2D45] focus:ring-1 focus:ring-[#0A2D45] transition-all" 
              />
            </div>
          </div>
          <div className="flex-1 w-full flex flex-col md:flex-row gap-4">
             <div className="flex-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Request Timeline</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="date" 
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 font-medium outline-none focus:border-[#0A2D45] focus:ring-1 focus:ring-[#0A2D45]" 
                  />
                  <span className="text-xs text-slate-400 font-medium">to</span>
                  <input 
                    type="date" 
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 font-medium outline-none focus:border-[#0A2D45] focus:ring-1 focus:ring-[#0A2D45]" 
                  />
                </div>
             </div>
             <div className="flex items-end shrink-0 mt-4 md:mt-0">
                <button onClick={resetFilters} className="h-[42px] px-6 bg-white border border-slate-200 rounded-xl text-[11px] font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap w-full md:w-auto shadow-sm">
                  <span>×</span> RESET
                </button>
             </div>
          </div>
        </div>

        {/* Inventory Header */}
        <div className="flex items-end justify-between pt-4">
           <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">Amendment Inventory</h2>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">{currentRequests.length} reissue records</p>
           </div>
           <button className="px-5 py-2.5 bg-[#C9A227] text-slate-900 rounded-lg text-[11px] font-black tracking-wide hover:bg-[#b59123] transition-all flex items-center gap-2 shadow-sm">
             <FiDownload size={14} /> EXPORT
           </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-20 text-center bg-white rounded-2xl shadow-sm border border-slate-200">
            <FiRefreshCw size={32} className="mx-auto text-[#0A2D45] animate-spin opacity-30" />
            <p className="text-sm font-bold text-slate-400 mt-4">Loading ledger...</p>
          </div>
        ) : !currentRequests?.length ? (
          <div className="py-20 text-center bg-white rounded-2xl shadow-sm border border-slate-200">
            <FiRepeat size={40} className="mx-auto text-slate-200 mb-3" />
            <p className="text-sm font-bold text-slate-400">No reissue records found</p>
          </div>
        ) : activeTab === "my" ? (
          /* MY REQUESTS CARD GRID */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {currentRequests.map((req) => (
              <ReissueCard key={getRequestId(req)} req={req} onView={setSelectedReq} />
            ))}
          </div>
        ) : (
          /* CORPORATE VIEW TABLE */
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-[#0A2D45] text-white">
                    <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-widest">Request ID</th>
                    <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-widest">Employee / Context</th>
                    <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-widest">PNR / Reference</th>
                    <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-widest">Airline & Route</th>
                    <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-widest">Type & Reason</th>
                    <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-widest">Status</th>
                    <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-widest">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentRequests.map((req, i) => {
                    const requestId = getRequestId(req);
                    const userName = getUserName(req);
                    const userEmail = getUserEmail(req);
                    const pnr = getPnr(req);
                    const route = getRoute(req);
                    const airline = getAirline(req);
                    const status = getStatus(req);
                    const requestedAt = getRequestedDate(req);
                    
                    return (
                      <tr key={requestId} className={`hover:bg-slate-50 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-slate-50/30"}`}>
                        <td className="px-5 py-4 align-top">
                          <IdCell id={requestId} />
                          <p className="text-[10px] font-semibold text-slate-400 mt-1">{requestedAt}</p>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#0A2D45]/10 text-[#0A2D45] flex items-center justify-center text-[11px] font-black shrink-0">
                              {userName?.[0]?.toUpperCase() || "?"}
                            </div>
                            <div>
                              <p className="font-bold text-[13px] text-slate-800 leading-tight">{userName}</p>
                              <p className="text-[11px] text-slate-500 mt-0.5">{userEmail}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <p className="font-black text-sm text-slate-900 uppercase">{pnr}</p>
                          <p className="text-[11px] font-bold text-slate-400 font-mono mt-0.5">{req.bookingReference || req.bookingRef || "N/A"}</p>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <p className="text-xs font-bold text-slate-800">{airline}</p>
                          <p className="text-[11px] font-semibold text-slate-500 mt-0.5">{route}</p>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 rounded text-[9px] font-black uppercase tracking-wider inline-block mb-1">
                            {req.reissueType || req.type || "REISSUE"}
                          </span>
                          <p className="text-[11px] text-slate-600 italic line-clamp-2 leading-snug" title={req.reason || req.remarks || "N/A"}>
                            &ldquo;{req.reason || req.remarks || "N/A"}&rdquo;
                          </p>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <StatusBadge req={req} />
                        </td>
                        <td className="px-5 py-4 align-top">
                          <div className="flex flex-col gap-2">
                            <button onClick={() => setSelectedReq(req)} className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:bg-slate-50 hover:text-[#0A2D45] hover:border-[#0A2D45] transition-all">
                              <FiEye size={12} /> View Details
                            </button>
                            {status === "PENDING" && (
                              <div className="flex gap-1.5 mt-1">
                                <button onClick={() => handleStatusUpdate(req._id || req.id || req.requestId, "APPROVED")} className="flex-1 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-black transition-colors">Approve</button>
                                <button onClick={() => handleStatusUpdate(req._id || req.id || req.requestId, "REJECTED")} className="flex-1 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-[10px] font-black transition-colors">Reject</button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedReq && (
        <LegacyReissueDetailModal
          request={selectedReq}
          onClose={() => setSelectedReq(null)}
          onStatusUpdate={handleStatusUpdate}
          userRole={role}
        />
      )}
    </div>
  );
};

export default MyReissueRequests;
