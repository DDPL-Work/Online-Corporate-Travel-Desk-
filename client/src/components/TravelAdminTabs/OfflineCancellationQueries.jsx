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
} from "react-icons/fi";
import { StatCard, IdCell, Th } from "./Shared/CommonComponents";
import CancellationQueryDetailsPage from "./CancellationQueryDetailsPage";

/* ────────────────────────────────────────────────────────────────────────── */
/*                                  HELPERS                                   */
/* ────────────────────────────────────────────────────────────────────────── */

const StatusBadge = ({ status }) => {
  const map = {
    OPEN: {
      label: "Open",
      cls: "bg-blue-50 text-blue-700 border-blue-200",
      icon: <FiClock size={11} />,
    },
    IN_PROGRESS: {
      label: "In Progress",
      cls: "bg-amber-50 text-amber-700 border-amber-200",
      icon: <FiRefreshCw size={11} className="animate-spin-slow" />,
    },
    RESOLVED: {
      label: "Resolved",
      cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: <FiCheckCircle size={11} />,
    },
    REJECTED: {
      label: "Rejected",
      cls: "bg-rose-50 text-rose-700 border-rose-200",
      icon: <FiXCircle size={11} />,
    },
  };
  const s = map[status?.toUpperCase()] || map.OPEN;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${s.cls}`}
    >
      {s.icon}
      {s.label}
    </span>
  );
};

const PriorityBadge = ({ priority }) => {
  const map = {
    HIGH: "bg-rose-100 text-rose-700",
    MEDIUM: "bg-amber-100 text-amber-700",
    LOW: "bg-slate-100 text-slate-600",
  };
  return (
    <span
      className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${map[priority?.toUpperCase()] || map.LOW}`}
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
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group">
      <div className="h-1.5 w-full bg-linear-to-r from-[#dac448] to-[#0A4D68]" />
      <div className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Query ID
              </span>
              <span className="text-[12px] font-black text-[#0A4D68] bg-[#0A4D68]/5 px-2 py-0.5 rounded">
                #{query.queryId || "—"}
              </span>
            </div>
            <h3 className="text-lg font-black text-slate-800 leading-tight">
              {query.bookingReference || "Offline Cancellation"}
            </h3>
          </div>
          <StatusBadge status={query.status} />
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3 text-slate-600">
            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
              <FiCalendar size={14} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400 leading-none mb-1">
                Requested On
              </p>
              <p className="text-sm font-bold text-slate-700">{requestedAt}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-slate-600">
            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
              <FiUser size={14} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400 leading-none mb-1">
                Requester
              </p>
              <p className="text-sm font-bold text-slate-700 truncate max-w-[180px]">
                {query.corporate?.employeeName || "Unknown"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-slate-600">
            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
              <FiTag size={14} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400 leading-none mb-1">
                Priority
              </p>
              <PriorityBadge priority={query.priority} />
            </div>
          </div>
        </div>

        {query.remarks && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-[11px] text-slate-400 italic line-clamp-2">
              "{query.remarks}"
            </p>
          </div>
        )}

        <button 
          onClick={() => onViewDetails(query._id)}
          className="w-full mt-5 py-2.5 rounded-xl border-2 border-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-50 hover:border-slate-200 transition-all flex items-center justify-center gap-2"
        >
          View Details
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
  const { queries, queriesLoading, queriesError } = useSelector(
    (state) => state.amendment
  );
  const { user: currentUser } = useSelector((state) => state.auth);
  
  const userRole = currentUser?.role || "employee";
  const [activeTab, setActiveTab] = useState("my"); // 'my' | 'company'
  const [search, setSearch] = useState("");
  const [selectedQueryId, setSelectedQueryId] = useState(null);

  useEffect(() => {
    dispatch(fetchCancellationQueries());
  }, [dispatch]);

  const handleOpenModal = (id) => {
    setSelectedQueryId(id);
  };

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
    
    // Tab Filtering
    if (activeTab === "my") {
      // Filter for own queries
      list = list.filter(q => 
        q.user?.id === currentUser?._id || 
        q.user?.id === currentUser?.id ||
        q.corporate?.employeeId === currentUser?._id ||
        q.corporate?.employeeId === currentUser?.id
      );
    } else {
      // If manager/admin, they see team/company in 'company' tab
      // For now, we show everything the backend returned for this tab
      // (Backend already scoped it to team/corporate)
    }

    // Search Filtering
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (item) =>
          item.bookingReference?.toLowerCase().includes(q) ||
          item.queryId?.toLowerCase().includes(q) ||
          item.corporate?.employeeName?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [queries, activeTab, search, currentUser]);

  // If a query is selected, show the detail page inline (no overlay)
  if (selectedQueryId) {
    return (
      <CancellationQueryDetailsPage
        queryId={selectedQueryId}
        onBack={() => setSelectedQueryId(null)}
      />
    );
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto font-sans text-slate-900">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-800 flex items-center gap-3">
            Offline Cancellation Queries
            <span className="px-3 py-1 rounded-full bg-[#0A4D68]/5 text-[#0A4D68] text-xs font-black uppercase tracking-tighter">
              BETA
            </span>
          </h1>
          <p className="text-slate-400 font-medium mt-1">
            Track and manage offline cancellation requests for your team.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => dispatch(fetchCancellationQueries())}
            disabled={queriesLoading}
            className="p-3 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-[#0A4D68] hover:border-[#0A4D68]/30 transition shadow-sm"
          >
            <FiRefreshCw size={18} className={queriesLoading ? "animate-spin" : ""} />
          </button>
          <div className="relative group">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#0A4D68] transition-colors" />
            <input
              type="text"
              placeholder="Search by Ref or Query ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-11 pr-4 py-3 rounded-2xl bg-white border border-slate-200 w-full md:w-72 outline-none focus:border-[#0A4D68] focus:ring-4 focus:ring-[#0A4D68]/5 transition shadow-sm font-medium text-sm"
            />
          </div>
        </div>
      </div>

      {/* STATS SECTION */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Queries"
          value={stats.total}
          Icon={FiInbox}
          iconBgCls="bg-[#0A4D68]/10"
          iconColorCls="text-[#0A4D68]"
          borderCls="border-[#0A4D68]"
        />
        <StatCard
          label="Open"
          value={stats.open}
          Icon={FiClock}
          iconBgCls="bg-blue-50"
          iconColorCls="text-blue-500"
          borderCls="border-blue-400"
        />
        <StatCard
          label="In Progress"
          value={stats.inProgress}
          Icon={FiRefreshCw}
          iconBgCls="bg-amber-50"
          iconColorCls="text-amber-500"
          borderCls="border-amber-400"
        />
        <StatCard
          label="Resolved"
          value={stats.resolved}
          Icon={FiCheckCircle}
          iconBgCls="bg-emerald-50"
          iconColorCls="text-emerald-500"
          borderCls="border-emerald-400"
        />
      </div>

      {/* TABS SECTION */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <div className="flex p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
          <button
            onClick={() => setActiveTab("my")}
            className={`px-6 py-2 rounded-xl text-sm font-black transition-all ${
              activeTab === "my"
                ? "bg-white text-[#0A4D68] shadow-sm scale-[1.02]"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {userRole === "employee" ? "My Queries" : "Assigned to Me"}
          </button>
          {(userRole === "manager" || userRole === "travel-admin") && (
            <button
              onClick={() => setActiveTab("company")}
              className={`px-6 py-2 rounded-xl text-sm font-black transition-all ${
                activeTab === "company"
                  ? "bg-white text-[#0A4D68] shadow-sm scale-[1.02]"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {userRole === "manager" ? "Team Queries" : "All Company Queries"}
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-2 px-4 py-2 bg-[#dac448]/10 border border-[#dac448]/20 rounded-xl">
          <FiAlertCircle className="text-[#dac448]" size={14} />
          <p className="text-[11px] font-bold text-[#b5a23a] uppercase tracking-wider">
            Standard Processing Time: 2-4 Business Hours
          </p>
        </div>
      </div>

      {/* CONTENT SECTION */}
      {queriesLoading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <div className="w-12 h-12 border-4 border-[#0A4D68] border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 font-bold animate-pulse">Synchronizing cancellation data...</p>
        </div>
      ) : queriesError ? (
        <div className="bg-rose-50 border border-rose-100 rounded-3xl p-12 text-center">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiAlertCircle size={32} />
          </div>
          <h3 className="text-xl font-black text-slate-800 mb-2">Sync Interrupted</h3>
          <p className="text-slate-500 max-w-md mx-auto mb-6">{queriesError}</p>
          <button
            onClick={() => dispatch(fetchCancellationQueries())}
            className="px-8 py-3 bg-[#0A4D68] text-white rounded-xl font-bold hover:bg-[#088395] transition shadow-lg"
          >
            Retry Connection
          </button>
        </div>
      ) : filteredQueries.length === 0 ? (
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiInbox size={32} />
          </div>
          <h3 className="text-xl font-black text-slate-800 mb-1">No Queries Found</h3>
          <p className="text-slate-400 font-medium">No offline cancellation requests match your current view.</p>
        </div>
      ) : activeTab === "my" ? (
        /* CARD GRID FOR PERSONAL VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          {filteredQueries.map((query) => (
            <QueryCard key={query._id} query={query} onViewDetails={handleOpenModal} />
          ))}
        </div>
      ) : (
        /* TABLE FOR ADMIN/COMPANY VIEW */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <Th label="Query ID" icon={<FiHash />} />
                  <Th label="Reference" icon={<FiTag />} />
                  <Th label="Employee" icon={<FiUser />} />
                  <Th label="Requested At" icon={<FiCalendar />} />
                  <Th label="Status" />
                  <Th label="Action" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredQueries.map((query) => (
                  <tr key={query._id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <IdCell id={query.queryId} prefix="Q" />
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-700">{query.bookingReference}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-black">{query.bookingSnapshot?.airline || "N/A"}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-700">{query.corporate?.employeeName}</p>
                      <p className="text-[11px] text-slate-400">{query.corporate?.employeeEmail}</p>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-600">
                      {new Date(query.requestedAt).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={query.status} />
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => handleOpenModal(query._id)}
                        className="px-4 py-2 rounded-lg bg-[#0A4D68]/5 text-[#0A4D68] text-xs font-bold hover:bg-[#0A4D68] hover:text-white transition-all"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
              Showing {filteredQueries.length} of {stats.total} total requests
            </p>
            <div className="flex gap-2">
              <button disabled className="px-3 py-1 rounded border border-slate-200 text-[10px] font-bold text-slate-400 bg-white">Prev</button>
              <button disabled className="px-3 py-1 rounded border border-slate-200 text-[10px] font-bold text-slate-400 bg-white">Next</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfflineCancellationQueries;
