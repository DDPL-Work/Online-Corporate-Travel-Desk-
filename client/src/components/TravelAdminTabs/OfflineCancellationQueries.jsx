import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchCancellationQueries } from "../../Redux/Actions/amendmentThunks";
import {
  FiSearch, FiFilter, FiRefreshCw, FiClock, FiCheckCircle,
  FiXCircle, FiAlertCircle, FiInbox, FiCalendar, FiUser,
  FiTag, FiHash, FiX, FiArrowRight, FiActivity, FiEye,
} from "react-icons/fi";
import { StatCard, IdCell, Th } from "./Shared/CommonComponents";
import ResponsiveDataTable from "./Shared/ResponsiveDataTable";
import CancellationQueryDetailsPage from "./CancellationQueryDetailsPage";
import { C } from "../Shared/color";
import useExcelExporter from "../../hooks/export/useExcelExporter";
import { adminOfflineCancellationQueriesExportTemplate } from "../../templates/exportTemplates/clientExportTemplates";

const StatusBadge = ({ status }) => {
  const map = {
    OPEN: {
      label: "Pending Review",
      tone: "bg-blue-50 text-blue-700 border-blue-200",
    },
    IN_PROGRESS: {
      label: "In Progress",
      tone: "bg-amber-50 text-amber-700 border-amber-200",
    },
    RESOLVED: {
      label: "Resolved",
      tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    REJECTED: {
      label: "Rejected",
      tone: "bg-rose-50 text-rose-700 border-rose-200",
    },
  };
  const s = map[status] || map.OPEN;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${s.tone}`}>
      {s.label}
    </span>
  );
};

export default function OfflineCancellationQueries() {
  const dispatch = useDispatch();
  const { queries, queriesLoading, queriesError } = useSelector((state) => state.amendment);
  const { user: currentUser } = useSelector((state) => state.auth);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedQueryId, setSelectedQueryId] = useState(null);

  const { exportExcel, isExporting } = useExcelExporter();

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

  const filtered = useMemo(() => {
    let result = queries || [];
    if (statusFilter !== "ALL") {
      result = result.filter((q) => q.status === statusFilter);
    }
    const t = search.trim().toLowerCase();
    if (!t) return result;
    return result.filter((r) => {
      const ref = (r.bookingReference || "").toLowerCase();
      const qid = (r.queryId || "").toLowerCase();
      const name = (r.corporate?.employeeName || "").toLowerCase();
      const email = (r.corporate?.employeeEmail || "").toLowerCase();
      const reason = (r.reason || r.remarks || "").toLowerCase();
      return [ref, qid, name, email, reason].some((v) => v.includes(t));
    });
  }, [queries, search, statusFilter]);

  if (selectedQueryId) {
    return (
      <CancellationQueryDetailsPage
        queryId={selectedQueryId}
        onBack={() => setSelectedQueryId(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0A4D68]/10 text-[#0A4D68] flex items-center justify-center">
            <FiInbox size={18} />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900">Cancellation Queries</h2>
            <p className="text-xs text-slate-400">Offline amendment and ticketing inquiries</p>
          </div>
        </div>
        <button
          onClick={() => dispatch(fetchCancellationQueries())}
          disabled={queriesLoading}
          className="flex items-center gap-2 px-3 py-2 text-[11px] font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"
        >
          <FiRefreshCw size={12} className={queriesLoading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Stat pills */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, color: "bg-[#0A4D68]/10 text-[#0A4D68]" },
          { label: "Pending Review", value: stats.open, color: "bg-blue-50 text-blue-700" },
          { label: "Under Process", value: stats.inProgress, color: "bg-amber-50 text-amber-700" },
          { label: "Closed Queries", value: stats.resolved, color: "bg-emerald-50 text-emerald-700" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center gap-3">
            <span className={`h-10 w-10 rounded-xl flex items-center justify-center text-lg font-black ${color}`}>{value}</span>
            <span className="text-[13px] font-bold text-slate-600">{label}</span>
          </div>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col md:flex-row gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by PNR, query ID, employee name, email, or reason…"
          className="flex-1 px-4 py-2.5 rounded-2xl border border-slate-200 text-sm outline-none focus:border-[#0A4D68] bg-white"
        />
        <div className="flex gap-2 flex-wrap">
          {["ALL", "OPEN", "IN_PROGRESS", "RESOLVED", "REJECTED"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider border transition ${statusFilter === s ? "bg-[#0A4D68] text-white border-[#0A4D68]" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`}
            >
              {s === "ALL" ? "All" : s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {queriesLoading ? (
        <div className="py-20 text-center bg-white rounded-2xl shadow-sm border border-slate-200">
          <FiRefreshCw size={32} className="mx-auto text-[#0A4D68] animate-spin opacity-30" />
          <p className="text-sm font-bold text-slate-400 mt-4">Loading...</p>
        </div>
      ) : queriesError ? (
        <div className="py-20 text-center bg-white rounded-2xl shadow-sm border border-slate-200">
          <FiAlertCircle size={40} className="mx-auto text-slate-200 mb-3" />
          <p className="text-sm font-bold text-slate-400">{queriesError}</p>
          <button onClick={() => dispatch(fetchCancellationQueries())} className="mt-4 px-5 py-2 bg-[#0A4D68] text-white rounded-xl text-xs font-bold">Retry</button>
        </div>
      ) : !filtered.length ? (
        <div className="py-20 text-center bg-white rounded-2xl shadow-sm border border-slate-200">
          <FiInbox size={40} className="mx-auto text-slate-200 mb-3" />
          <p className="text-sm font-bold text-slate-400">No cancellation queries found</p>
        </div>
      ) : (
        <ResponsiveDataTable
          exportLabel="Export Excel"
          exportLoading={isExporting}
          exportDisabled={isExporting}
          onExport={() => exportExcel({
            pageHeader: "Cancellation Queries",
            statCards: [
              { label: "Total", value: stats.total },
              { label: "Pending Review", value: stats.open },
              { label: "Under Process", value: stats.inProgress },
              { label: "Closed Queries", value: stats.resolved },
            ],
            appliedFilters: [
              { label: "Search", value: search || "None" },
              { label: "Status", value: statusFilter },
            ],
            data: filtered,
            columns: adminOfflineCancellationQueriesExportTemplate,
            filenamePrefix: "cancellation_queries",
          })}
          wrapperClass="!border-none !shadow-none"
        >
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-[#dac448] text-slate-900 border-b border-slate-200">
                    <th className="px-4 py-3.5 text-left text-[10px] font-black uppercase tracking-widest">Query ID</th>
                    <th className="px-4 py-3.5 text-left text-[10px] font-black uppercase tracking-widest">Employee</th>
                    <th className="px-4 py-3.5 text-left text-[10px] font-black uppercase tracking-widest">PNR / Ref</th>
                    <th className="px-4 py-3.5 text-left text-[10px] font-black uppercase tracking-widest">Submission Time</th>
                    <th className="px-4 py-3.5 text-left text-[10px] font-black uppercase tracking-widest">Reason</th>
                    <th className="px-4 py-3.5 text-left text-[10px] font-black uppercase tracking-widest">Status</th>
                    <th className="px-4 py-3.5 text-right text-[10px] font-black uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((q, i) => {
                    const queryIdDisplay = q.queryId || `Q-${String(q._id).slice(-6).toUpperCase()}`;
                    const employeeName = q.corporate?.employeeName || q.user?.name || "Unknown";
                    const employeeEmail = q.corporate?.employeeEmail || q.user?.email || "";
                    const pnr = q.bookingReference || q.bookingSnapshot?.pnr || "—";
                    const reason = q.reason || q.remarks || "";
                    const requestedAt = q.requestedAt ? new Date(q.requestedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
                    const requestedTime = q.requestedAt ? new Date(q.requestedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "";
                    return (
                      <tr key={q._id} className={`hover:bg-sky-50/40 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-slate-50/30"}`}>
                        <td className="px-4 py-4">
                          <p className="font-mono text-[12px] font-bold text-slate-800">{queryIdDisplay}</p>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0A4D68] to-[#088395] text-white flex items-center justify-center text-[11px] font-black shrink-0 shadow-sm">
                              {employeeName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-[13px] text-slate-800 leading-tight">{employeeName}</p>
                              {employeeEmail && <p className="text-[11px] text-slate-400">{employeeEmail}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-black text-sm text-slate-900 uppercase tracking-wide">{pnr}</p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-bold text-[13px] text-slate-800">{requestedAt}</p>
                          {requestedTime && <p className="text-[11px] text-slate-400">{requestedTime}</p>}
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-[11px] text-slate-500 italic line-clamp-1 max-w-[200px]" title={reason}>
                            &ldquo;{reason || "N/A"}&rdquo;
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge status={q.status} />
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button
                            onClick={() => setSelectedQueryId(q._id)}
                            className="p-2 text-slate-400 hover:text-[#0A4D68] hover:bg-[#0A4D68]/5 transition-all rounded-lg"
                            title="View Details"
                          >
                            <FiEye size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </ResponsiveDataTable>
      )}
    </div>
  );
}
