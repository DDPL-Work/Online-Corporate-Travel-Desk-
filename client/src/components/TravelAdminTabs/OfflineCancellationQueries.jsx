// client\src\components\TravelAdminTabs\OfflineCancellationQueries.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchCancellationQueries } from "../../Redux/Actions/amendmentThunks";
import {
  FiSearch,
  FiFilter,
  FiRefreshCw,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle,
  FiInbox,
  FiCalendar,
  FiUser,
  FiTag,
  FiHash,
  FiX,
  FiArrowRight,
  FiActivity,
} from "react-icons/fi";
import { StatCard, IdCell, Th, LabeledField } from "./Shared/CommonComponents";
import ResponsiveDataTable from "./Shared/ResponsiveDataTable";
import CancellationQueryDetailsPage from "./CancellationQueryDetailsPage";
import { C } from "../Shared/color";

/* ────────────────────────────────────────────────────────────────────────── */
/*                                  HELPERS                                   */
/* ────────────────────────────────────────────────────────────────────────── */

const StatusBadge = ({ status }) => {
  const map = {
    OPEN: {
      label: "Open",
      bg: "#EFF6FF", text: "#1E40AF", border: "#BFDBFE",
      icon: <FiClock size={11} />,
    },
    IN_PROGRESS: {
      label: "In Progress",
      bg: "#FFFBEB", text: "#92400E", border: "#FDE68A",
      icon: <FiRefreshCw size={11} className="animate-spin" />,
    },
    RESOLVED: {
      label: "Resolved",
      bg: "#ECFDF5", text: "#065F46", border: "#A7F3D0",
      icon: <FiCheckCircle size={11} />,
    },
    REJECTED: {
      label: "Rejected",
      bg: "#FEF2F2", text: "#991B1B", border: "#FECACA",
      icon: <FiXCircle size={11} />,
    },
  };
  const s = map[status?.toUpperCase()] || map.OPEN;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black border shadow-sm uppercase tracking-wider"
      style={{ background: s.bg, color: s.text, borderColor: s.border }}
    >
      {s.icon}
      {s.label}
    </span>
  );
};

const PriorityBadge = ({ priority }) => {
  const map = {
    HIGH: { bg: "#FEF2F2", text: "#991B1B" },
    MEDIUM: { bg: "#FFFBEB", text: "#92400E" },
    LOW: { bg: "#F8FAFC", text: "#64748B" },
  };
  const s = map[priority?.toUpperCase()] || map.LOW;
  return (
    <span
      className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest"
      style={{ background: s.bg, color: s.text }}
    >
      {priority || "MEDIUM"}
    </span>
  );
};

/* ────────────────────────────────────────────────────────────────────────── */
/*                                CARD VIEW                                   */
/* ────────────────────────────────────────────────────────────────────────── */
const QueryCard = ({ query, onViewDetails }) => {
  const requestedAt = query.requestedAt
    ? new Date(query.requestedAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

  return (
    <div className="bg-white rounded-2xl border shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group" style={{ borderColor: C.border }}>
      <div className="h-2 w-full" style={{ background: `linear-gradient(90deg, ${C.gold}, ${C.navy})` }} />
      <div className="p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Query Reference</span>
              <span className="text-[11px] font-black px-2 py-0.5 rounded-md border" style={{ color: C.navy, background: C.offWhite, borderColor: C.border }}>
                Q-{String(query.queryId || query._id).slice(-6).toUpperCase()}
              </span>
            </div>
            <h3 className="text-lg font-black tracking-tight line-clamp-1" style={{ color: C.navy }}>
              {query.bookingReference || "Corporate Amendment"}
            </h3>
          </div>
          <StatusBadge status={query.status} />
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm" style={{ background: `${C.navy}08`, color: C.navy }}>
              <FiCalendar size={18} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Request Date</p>
              <p className="text-sm font-black" style={{ color: C.navy }}>{requestedAt}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm" style={{ background: `${C.gold}10`, color: C.gold }}>
              <FiUser size={18} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Requester</p>
              <p className="text-sm font-black truncate max-w-[200px]" style={{ color: C.navy }}>
                {query.corporate?.employeeName || "Unknown Staff"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm" style={{ background: `${C.navy}08`, color: C.navy }}>
              <FiTag size={18} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Urgency</p>
              <PriorityBadge priority={query.priority} />
            </div>
          </div>
        </div>

        {query.remarks && (
          <div className="mt-6 p-4 rounded-xl border border-dashed text-[11px] font-medium italic" style={{ background: C.offWhite, borderColor: C.border, color: C.muted }}>
             "{query.remarks}"
          </div>
        )}

        <button 
          onClick={() => onViewDetails(query._id)}
          className="w-full mt-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-sm border group-hover:shadow-md"
          style={{ background: C.white, borderColor: C.border, color: C.navy }}
        >
          Process Query <FiArrowRight className="transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  );
};

/* ────────────────────────────────────────────────────────────────────────── */
/*                                MAIN COMPONENT                              */
/* ────────────────────────────────────────────────────────────────────────── */

const OfflineCancellationQueries = () => {
  const dispatch = useDispatch();
  const { queries, queriesLoading, queriesError } = useSelector((state) => state.amendment);
  const { user: currentUser } = useSelector((state) => state.auth);
  
  const userRole = currentUser?.role || "employee";
  const [activeTab, setActiveTab] = useState("my");
  const [search, setSearch] = useState("");
  const [selectedQueryId, setSelectedQueryId] = useState(null);

  useEffect(() => {
    dispatch(fetchCancellationQueries());
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
    let list = queries || [];
    if (activeTab === "my") {
      list = list.filter(q => 
        q.user?.id === currentUser?._id || 
        q.user?.id === currentUser?.id ||
        q.corporate?.employeeId === currentUser?._id ||
        q.corporate?.employeeId === currentUser?.id
      );
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (item) =>
          item.bookingReference?.toLowerCase().includes(q) ||
          item.queryId?.toLowerCase().includes(q) ||
          item.corporate?.employeeName?.toLowerCase().includes(q) ||
          item.corporate?.employeeEmail?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [queries, activeTab, search, currentUser]);

  if (selectedQueryId) {
    return (
      <CancellationQueryDetailsPage
        queryId={selectedQueryId}
        onBack={() => setSelectedQueryId(null)}
      />
    );
  }

  return (
    <div className="min-h-screen font-sans pb-20 px-6 pt-8" style={{ background: C.offWhite }}>
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-2xl border shadow-sm" style={{ borderColor: C.border }}>
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg text-white" style={{ background: `linear-gradient(135deg, ${C.navy}, ${C.gold})` }}>
              <FiInbox size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight" style={{ color: C.navy }}>Cancellation Queries</h1>
              <p className="text-xs mt-1 font-bold uppercase tracking-widest" style={{ color: C.muted }}>Manage Offline Amendments & Ticketing Inquiries</p>
            </div>
          </div>
          <button
            onClick={() => dispatch(fetchCancellationQueries())}
            disabled={queriesLoading}
            className="px-6 py-3 rounded-xl font-bold text-xs flex items-center gap-2 border transition-all shadow-sm"
            style={{ background: C.white, borderColor: C.border, color: C.navy }}
          >
            <FiRefreshCw className={queriesLoading ? "animate-spin" : ""} />
            {queriesLoading ? "Syncing..." : "Sync Records"}
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard label="Total Submissions" value={stats.total} Icon={FiInbox} iconBgCls="bg-[#000D26]10" iconColorCls="text-[#000D26]" borderCls="border-[#000D26]" />
          <StatCard label="Pending Review" value={stats.open} Icon={FiClock} iconBgCls="bg-blue-50" iconColorCls="text-blue-600" borderCls="border-blue-500" />
          <StatCard label="Under Process" value={stats.inProgress} Icon={FiRefreshCw} iconBgCls="bg-amber-50" iconColorCls="text-amber-600" borderCls="border-amber-500" />
          <StatCard label="Closed Queries" value={stats.resolved} Icon={FiCheckCircle} iconBgCls="bg-emerald-50" iconColorCls="text-emerald-600" borderCls="border-emerald-500" />
        </div>

        {/* Filters and Navigation */}
        <div className="bg-white rounded-2xl p-6 border shadow-sm" style={{ borderColor: C.border }}>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
            <div className="md:col-span-5">
              <div className="flex p-1 bg-slate-100 rounded-xl border" style={{ borderColor: C.border }}>
                <button
                  onClick={() => setActiveTab("my")}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === "my" ? "bg-white shadow-sm" : "text-slate-400"}`}
                  style={{ color: activeTab === "my" ? C.navy : "" }}
                >
                  {userRole === "employee" ? "My Submissions" : "Assigned Leads"}
                </button>
                {(userRole === "manager" || userRole === "travel-admin") && (
                  <button
                    onClick={() => setActiveTab("company")}
                    className={`flex-1 px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === "company" ? "bg-white shadow-sm" : "text-slate-400"}`}
                    style={{ color: activeTab === "company" ? C.navy : "" }}
                  >
                    {userRole === "manager" ? "Team Ledger" : "Corporate Wide"}
                  </button>
                )}
              </div>
            </div>

            <div className="md:col-span-5">
              <LabeledField label={<><FiSearch size={10} /> Reference Search</>}>
                <div className="relative group">
                  <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors" style={{ color: C.muted }} />
                  <input
                    type="text"
                    placeholder="PNR, Ref or Query Identifier..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 border rounded-xl text-sm font-bold outline-none transition-all shadow-sm focus:ring-2 focus:ring-[#B8860B]/20"
                    style={{ background: C.offWhite, borderColor: C.border, color: C.navy }}
                  />
                </div>
              </LabeledField>
            </div>

            <div className="md:col-span-2">
              <button
                onClick={() => { setSearch(""); setActiveTab("my"); }}
                className="w-full py-3 rounded-xl font-black text-[11px] flex items-center justify-center gap-2 border shadow-sm transition-all hover:bg-slate-50 uppercase tracking-widest"
                style={{ background: C.white, borderColor: C.border, color: C.muted }}
              >
                <FiX /> Reset
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        {queriesLoading ? (
          <div className="py-32 text-center bg-white rounded-3xl border shadow-sm" style={{ borderColor: C.border }}>
            <FiRefreshCw className="animate-spin mx-auto mb-4" size={40} style={{ color: C.gold }} />
            <p className="font-black uppercase tracking-widest" style={{ color: C.navy }}>Synchronizing Repository...</p>
          </div>
        ) : queriesError ? (
          <div className="bg-white border rounded-3xl p-16 text-center shadow-sm" style={{ borderColor: C.border }}>
            <FiAlertCircle size={48} className="mx-auto mb-4 text-red-500" />
            <h3 className="text-xl font-black mb-2" style={{ color: C.navy }}>Sync Protocol Interrupted</h3>
            <p className="text-slate-400 mb-8 max-w-md mx-auto font-medium">{queriesError}</p>
            <button onClick={() => dispatch(fetchCancellationQueries())} className="px-10 py-4 bg-navy rounded-2xl text-white font-black text-xs uppercase tracking-widest shadow-lg" style={{ background: C.navy }}>Retry Connection</button>
          </div>
        ) : filteredQueries.length === 0 ? (
          <div className="bg-white border-2 border-dashed rounded-3xl p-24 text-center" style={{ borderColor: C.border }}>
            <FiInbox size={64} className="mx-auto mb-4 opacity-10" style={{ color: C.navy }} />
            <h3 className="text-xl font-black uppercase tracking-widest text-slate-300">No Queries in Pipeline</h3>
          </div>
        ) : activeTab === "my" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {filteredQueries.map((query) => (
              <QueryCard key={query._id} query={query} onViewDetails={setSelectedQueryId} />
            ))}
          </div>
        ) : (
          <ResponsiveDataTable
            title="Governance Ledger"
            subtitle={`${filteredQueries.length} active queries tracked`}
            tableMinWidth="1000px"
            exportConfig={{
              data: filteredQueries,
              filename: `offline_cancellation_queries_${new Date().toISOString().split('T')[0]}.csv`,
              columns: [
                { header: "Query ID", accessor: (q) => `Q-${String(q.queryId || q._id).slice(-6).toUpperCase()}` },
                { header: "Travel Asset", key: "bookingReference" },
                { header: "Personnel", accessor: (q) => q.corporate?.employeeName || "—" },
                { header: "Email Identifier", accessor: (q) => q.corporate?.employeeEmail || "—" },
                { header: "Submission Time", accessor: (q) => new Date(q.requestedAt).toLocaleString() },
                { header: "Protocol Status", key: "status" },
              ]
            }}
          >
            <table className="w-full text-left border-collapse">
              <thead>
                <tr style={{ background: C.navy, color: C.white }}>
                  <Th className="px-6 py-5">Query ID</Th>
                  <Th className="px-6 py-5">Travel Asset</Th>
                  <Th className="px-6 py-5">Personnel</Th>
                  <Th className="px-6 py-5">Email Identifier</Th>
                  <Th className="px-6 py-5">Submission Time</Th>
                  <Th className="px-6 py-5 text-center">Protocol Status</Th>
                  <Th className="px-6 py-5 text-center">Governance</Th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: C.border }}>
                {filteredQueries.map((query, i) => (
                  <tr key={query._id} className="hover:bg-slate-50 transition-colors" style={{ background: i % 2 === 0 ? C.white : C.offWhite }}>
                    <td className="px-6 py-5">
                      <code className="text-[10px] font-black px-2 py-1 rounded border" style={{ background: C.white, borderColor: C.border, color: C.muted }}>
                        Q-{String(query.queryId || query._id).slice(-6).toUpperCase()}
                      </code>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-sm font-black" style={{ color: C.navy }}>{query.bookingReference}</p>
                      <p className="text-[10px] font-bold text-gold uppercase tracking-tighter">{query.bookingSnapshot?.airline || "Offline Segment"}</p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-xs font-black" style={{ color: C.navy }}>{query.corporate?.employeeName}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase truncate max-w-[120px]">{query.reason || "AMENDMENT"}</p>
                    </td>
                    <td className="px-6 py-5">
                       <span className="text-[11px] font-bold text-slate-500 font-mono bg-slate-100 px-2 py-1 rounded">{query.corporate?.employeeEmail}</span>
                    </td>
                    <td className="px-6 py-5">
                       <p className="text-xs font-bold" style={{ color: C.navy }}>{new Date(query.requestedAt).toLocaleDateString()}</p>
                       <p className="text-[10px] text-slate-400 font-medium">{new Date(query.requestedAt).toLocaleTimeString()}</p>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <StatusBadge status={query.status} />
                    </td>
                    <td className="px-6 py-5 text-center">
                      <button 
                        onClick={() => setSelectedQueryId(query._id)}
                        className="p-3 rounded-xl transition-all shadow-sm hover:shadow-md"
                        style={{ background: `${C.navy}08`, color: C.navy }}
                      >
                        <FiArrowRight size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ResponsiveDataTable>
        )}
      </div>
    </div>
  );
};

export default OfflineCancellationQueries;
