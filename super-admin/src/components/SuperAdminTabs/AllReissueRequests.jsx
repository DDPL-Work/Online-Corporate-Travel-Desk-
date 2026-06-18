import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import {
  FiAlertCircle,
  FiBarChart2,
  FiClock,
  FiDownload,
  FiEye,
  FiRefreshCw,
  FiRepeat,
  FiSend,
  FiSearch,
  FiArrowRight,
  FiArrowLeft,
} from "react-icons/fi";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { toast } from "sonner";
import Pagination from "../Shared/Pagination";
import ReissueOpsDetailModal from "../reissue/ReissueOpsDetailModal";
import { fetchReissueRequests } from "../../Redux/Actions/reissueThunks";
import { listOpsMembers } from "../../API/opsAPI";
import {
  REISSUE_STATUS_OPTIONS,
  formatDate,
  formatDateTime,
  prettifyLabel,
  getStatusTone,
  getJourneyLabel,
} from "../reissue/reissueUi";
import useExcelExporter from "../../services/export/useExcelExporter";
import { reissueRequestsExportTemplate } from "../../templates/exportTemplates/superAdminExportTemplates";

function readToken() {
  const token = sessionStorage.getItem("token");
  if (!token) return {};
  try {
    return jwtDecode(token);
  } catch {
    return {};
  }
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, borderColor }) {
  return (
    <div
      className={`bg-white rounded-2xl p-5 flex items-center gap-4 shadow-sm border border-slate-100 border-b-4 ${borderColor}`}
    >
      <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 flex-shrink-0">
        <Icon size={20} />
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
        <p className="text-2xl font-black text-slate-800 leading-tight">{value}</p>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AllReissueRequests() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const tableScrollRef = useRef(null);
  const { exportExcel, exportingKey } = useExcelExporter();
  const token = readToken();
  const currentRole = token.role || token.userRole || "super-admin";
  const currentUserId = token.id || token._id || null;
  const canReassign = ["super-admin", "master-admin", "ops-admin"].includes(currentRole);
  const { requests, loading, pagination, error } = useSelector((state) => state.reissue);

  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [airline, setAirline] = useState("");
  const [assignedTo, setAssignedTo] = useState(currentRole === "ops-member" ? "me" : "");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [breachedOnly, setBreachedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [opsMembers, setOpsMembers] = useState([]);
  const isExporting = exportingKey === "reissue_requests";

  useEffect(() => {
    dispatch(
      fetchReissueRequests({
        page,
        limit: 12,
        status: status === "ALL" ? undefined : status,
        airline: airline || undefined,
        assignedTo: assignedTo || undefined,
        createdFrom: createdFrom || undefined,
        createdTo: createdTo || undefined,
        overdue: overdueOnly || undefined,
        slaBreach: breachedOnly || undefined,
      }),
    );
  }, [
    airline,
    assignedTo,
    breachedOnly,
    createdFrom,
    createdTo,
    dispatch,
    overdueOnly,
    page,
    status,
  ]);

  useEffect(() => {
    setPage(1);
  }, [status, airline, assignedTo, createdFrom, createdTo, overdueOnly, breachedOnly]);

  useEffect(() => {
    if (!canReassign) return;
    listOpsMembers({ limit: 100 })
      .then((response) => {
        setOpsMembers(response?.data || []);
      })
      .catch(() => {
        setOpsMembers([]);
      });
  }, [canReassign]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  const filteredRequests = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return requests;
    return requests.filter((request) =>
      [
        request.requestId,
        request.bookingId,
        request.originalPnr,
        request.airline,
        request.status,
        request.metadata?.employeeName,
        request.metadata?.employeeEmail,
      ]
        .filter(Boolean)
        .some((value) => value.toString().toLowerCase().includes(term)),
    );
  }, [requests, search]);

  const stats = useMemo(() => {
    const total = pagination?.total || requests.length;
    const processing = requests.filter((request) =>
      ["ASSIGNED", "IN_PROGRESS", "WAITING_AIRLINE"].includes(request.status),
    ).length;
    const overdue = requests.filter((request) => request.overdue).length;
    const completed = requests.filter((request) =>
      ["TICKET_GENERATED", "COMPLETED"].includes(request.status),
    ).length;

    return { total, processing, overdue, completed };
  }, [pagination, requests]);

  const handleRefresh = () => {
    dispatch(
      fetchReissueRequests({
        page,
        limit: 12,
        status: status === "ALL" ? undefined : status,
        airline: airline || undefined,
        assignedTo: assignedTo || undefined,
        createdFrom: createdFrom || undefined,
        createdTo: createdTo || undefined,
        overdue: overdueOnly || undefined,
        slaBreach: breachedOnly || undefined,
      })
    );
  };

  const handleScrollTable = (direction) => {
    if (tableScrollRef.current) {
      tableScrollRef.current.scrollBy({
        left: direction === "left" ? -300 : 300,
        behavior: "smooth",
      });
    }
  };

  const handleExport = () => {
    if (loading) return;

    const statCards = [
      { label: "Open Requests", value: stats.total },
      { label: "Processing", value: stats.processing },
      { label: "Ticket Ready", value: stats.completed },
      { label: "Overdue", value: stats.overdue },
    ];

    const appliedFilters = [
      { label: "Search", value: search || "None" },
      { label: "Status", value: status },
      { label: "Airline", value: airline || "All" },
      { label: "Assigned Agent", value: assignedTo || "All" },
      { label: "Created From", value: createdFrom || "Any" },
      { label: "Created To", value: createdTo || "Any" },
      { label: "Overdue Only", value: overdueOnly ? "Yes" : "No" },
      { label: "SLA Breach", value: breachedOnly ? "Yes" : "No" },
    ];

    exportExcel({
      key: "reissue_requests",
      pageHeader: "Offline Reissue Management",
      statCards,
      appliedFilters,
      data: filteredRequests.map((request) => ({
        ...request,
        exportJourneyLabel: getJourneyLabel(request.selectedFlight || request.preferredJourney),
      })),
      columns: reissueRequestsExportTemplate,
      filenamePrefix: "reissue_requests_export",
      emptyMessage: "No reissue requests available to export",
      successMessage: "Reissue requests exported",
    });
  };

  return (
    <div
      className="min-h-screen font-sans pb-20 -mt-6 -mx-4 md:-mx-6"
      style={{ background: "#f8fafc" }}
    >
      {/* ── Navy Gradient Header ── */}
      <div className="w-full bg-gradient-to-br from-[#003399] to-[#000d26] text-white pt-8 pb-20 px-6 md:px-10">
        <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-8">
          {/* Left: nav + title */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/10 text-white shadow-sm"
              >
                <FiArrowLeft size={18} />
              </button>
              <button
                onClick={handleRefresh}
                disabled={loading}
                className={`p-3 rounded-xl bg-white/10 transition-all border border-white/10 ${
                  loading ? "opacity-50 cursor-not-allowed" : "hover:bg-white/20"
                }`}
              >
                <div className={loading ? "animate-spin" : ""}>
                  <FiRefreshCw size={20} />
                </div>
              </button>
            </div>

            <div className="h-12 w-[1px] bg-white/10 mx-2 hidden md:block" />

            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl text-white border border-white/10 bg-white/10">
                <FiRepeat size={28} />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight leading-none">
                  Flight Change Requests
                </h1>
                <p className="text-[10px] mt-2 font-bold uppercase tracking-[2px] opacity-60">
                  Manage and assign flight change requests
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 md:px-10 -mt-10 space-y-10">
        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="Total Requests"
            value={stats.total}
            icon={FiBarChart2}
            borderColor="border-b-[#003399]"
          />
          <StatCard
            label="In Progress"
            value={stats.processing}
            icon={FiSend}
            borderColor="border-b-amber-500"
          />
          <StatCard
            label="Ready"
            value={stats.completed}
            icon={FiDownload}
            borderColor="border-b-emerald-500"
          />
          <StatCard
            label="Late"
            value={stats.overdue}
            icon={FiAlertCircle}
            borderColor="border-b-rose-500"
          />
        </div>

        {/* ── Filter Bar ── */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
            {/* Search */}
            <div className="flex flex-col gap-1.5 xl:col-span-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Search
              </label>
              <div className="relative">
                <FiSearch
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={14}
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search request, booking, passenger, or PNR"
                  className="w-full pl-9 pr-3 py-2.5 border rounded-xl text-[13px] font-medium outline-none transition-all focus:border-[#003399] focus:ring-2 focus:ring-[#003399]/10 bg-slate-50 hover:bg-white"
                />
              </div>
            </div>

            {/* Status */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-4 py-2.5 border rounded-xl text-[13px] font-medium outline-none transition-all focus:border-[#003399] focus:ring-2 focus:ring-[#003399]/10 bg-slate-50 hover:bg-white cursor-pointer"
              >
                {REISSUE_STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option === "ALL" ? "All Statuses" : prettifyLabel(option)}
                  </option>
                ))}
              </select>
            </div>

            {/* Agent */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Assigned To
              </label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                disabled={currentRole === "ops-member"}
                className="w-full px-4 py-2.5 border rounded-xl text-[13px] font-medium outline-none transition-all focus:border-[#003399] focus:ring-2 focus:ring-[#003399]/10 bg-slate-50 hover:bg-white cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {currentRole !== "ops-member" && <option value="">All agents</option>}
                {currentUserId && <option value="me">Assigned to me</option>}
                {opsMembers.map((member) => (
                  <option key={member._id} value={member._id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date From */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Created From
              </label>
              <input
                type="date"
                value={createdFrom}
                onChange={(e) => setCreatedFrom(e.target.value)}
                className="w-full px-4 py-2.5 border rounded-xl text-[13px] font-medium outline-none transition-all focus:border-[#003399] focus:ring-2 focus:ring-[#003399]/10 bg-slate-50 hover:bg-white"
              />
            </div>

            {/* Date To */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Created To
              </label>
              <input
                type="date"
                value={createdTo}
                onChange={(e) => setCreatedTo(e.target.value)}
                className="w-full px-4 py-2.5 border rounded-xl text-[13px] font-medium outline-none transition-all focus:border-[#003399] focus:ring-2 focus:ring-[#003399]/10 bg-slate-50 hover:bg-white"
              />
            </div>
          </div>
          
          {/* Quick Filters */}
          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setOverdueOnly((v) => !v)}
              className={`rounded-xl border px-4 py-2 text-[11px] font-black uppercase tracking-wider transition-all ${
                overdueOnly
                  ? "border-rose-300 bg-rose-50 text-rose-700 shadow-sm"
                  : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
              }`}
            >
              Overdue
            </button>
            <button
              type="button"
              onClick={() => setBreachedOnly((v) => !v)}
              className={`rounded-xl border px-4 py-2 text-[11px] font-black uppercase tracking-wider transition-all ${
                breachedOnly
                  ? "border-[#003399] bg-[#003399] text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
              }`}
            >
              Missed Deadline
            </button>
            
            {/* Airline (inline) */}
            <div className="flex-1 max-w-[200px] ml-auto">
              <input
                value={airline}
                onChange={(e) => setAirline(e.target.value)}
                placeholder="Filter by airline code..."
                className="w-full px-4 py-2 border rounded-xl text-[12px] font-medium outline-none transition-all focus:border-[#003399] focus:ring-2 focus:ring-[#003399]/10 bg-slate-50 hover:bg-white"
              />
            </div>
          </div>
        </div>

        {/* ── Table Card ── */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
          {/* Table Titlebar */}
          <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap gap-3 justify-between items-center bg-slate-50/50">
            <div>
              <h2 className="font-black text-slate-700 uppercase tracking-tighter text-lg">
                Flight Changes
              </h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                {stats.total} records found
              </p>
            </div>

            {/* Export + Scroll controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleExport}
                disabled={loading || isExporting || filteredRequests.length === 0}
                className="flex items-center justify-center space-x-2 px-5 py-1.5 bg-[#000d26] text-white hover:border-[#C9A84C] transition-all shadow-sm rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <FiDownload className="w-4 h-4" />
                <span className="text-[11px] font-black uppercase tracking-wider">
                  {isExporting ? "Exporting..." : "Export"}
                </span>
              </button>

              <div className="w-px h-7 bg-slate-200 mx-1" />

              <button
                onClick={() => handleScrollTable("left")}
                title="Scroll table left"
                className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-[#C9A84C] hover:border-[#C9A84C] transition-all shadow-sm"
              >
                <FaChevronLeft size={15} />
              </button>
              <button
                onClick={() => handleScrollTable("right")}
                title="Scroll table right"
                className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-[#C9A84C] hover:border-[#C9A84C] transition-all shadow-sm"
              >
                <FaChevronRight size={15} />
              </button>
            </div>
          </div>

          {/* Table Body */}
          <div ref={tableScrollRef} className="w-full overflow-x-auto min-h-[420px]">
            <table className="min-w-[1250px] w-full table-fixed text-left border-collapse">
              <colgroup>
                <col style={{ width: "10%" }} /> {/* Request */}
                <col style={{ width: "14%" }} /> {/* Passenger */}
                <col style={{ width: "14%" }} /> {/* Preferred Flight */}
                <col style={{ width: "10%" }} /> {/* Status */}
                <col style={{ width: "13%" }} /> {/* Assigned To */}
                <col style={{ width: "11%" }} /> {/* Deadline */}
                <col style={{ width: "13%" }} /> {/* New Ticket */}
                <col style={{ width: "11%" }} /> {/* Updated */}
                <col style={{ width: "4%" }} />  {/* Action */}
              </colgroup>
              <thead>
                <tr className="bg-gradient-to-r from-[#001a66] to-[#000d26]">
                  {["Request", "Traveler", "New Flight", "Status", "Assigned To", "Deadline", "New Ticket", "Updated", ""].map((heading, i) => (
                    <th
                      key={i}
                      className="px-4 xl:px-5 py-4 text-[10px] font-black uppercase tracking-widest text-slate-300 whitespace-nowrap"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="px-4 py-20 text-center">
                      <div className="flex flex-col items-center gap-3 text-slate-400">
                        <FiRefreshCw size={28} className="animate-spin text-[#003399]" />
                        <p className="text-sm font-bold uppercase tracking-widest">Loading flight changes...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-4 py-20 text-center">
                      <div className="flex flex-col items-center justify-center gap-3 text-slate-400">
                        <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300">
                          <FiRepeat size={28} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-700">No flight change requests found</p>
                          <p className="text-xs text-slate-400 mt-1">Try changing the filters.</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((request, idx) => (
                    <tr
                      key={request.id}
                      className={`transition-colors hover:bg-blue-50/30 ${
                        idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                      }`}
                    >
                      <td className="px-4 xl:px-5 py-4 align-middle">
                        <p className="font-mono text-[11px] font-black text-[#003399] truncate">{request.requestId}</p>
                        <p className="mt-1 text-[10px] font-bold text-slate-400 uppercase">Booking {request.bookingId}</p>
                      </td>
                      <td className="px-4 xl:px-5 py-4 align-middle min-w-0">
                        <p className="text-[12px] font-bold text-slate-800 truncate">
                          {request.metadata?.employeeName || "Passenger"}
                        </p>
                        <p className="mt-1 text-[10px] font-bold text-slate-400 truncate">
                          {request.metadata?.employeeEmail || "Email not captured"}
                        </p>
                      </td>
                      <td className="px-4 xl:px-5 py-4 align-middle min-w-0">
                        <p className="text-[12px] font-bold text-slate-800 truncate">
                          {getJourneyLabel(request.selectedFlight || request.preferredJourney)}
                        </p>
                        <p className="mt-1 text-[10px] font-bold uppercase text-slate-400 truncate">
                          {request.selectedFlight?.airlineCode || request.preferredJourney?.airlineCode || (typeof request.airline === 'object' ? request.airline?.code || request.airline?.name : request.airline) || "Airline pending"}
                          {request.selectedFlight?.flightNumber ? ` • ${request.selectedFlight.flightNumber}` : ""}
                        </p>
                      </td>
                      <td className="px-4 xl:px-5 py-4 align-middle">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider whitespace-nowrap ${getStatusTone(
                            request.status
                          )}`}
                        >
                          {prettifyLabel(request.status)}
                        </span>
                      </td>
                      <td className="px-4 xl:px-5 py-4 align-middle min-w-0">
                        <p className="text-[12px] font-bold text-slate-800 truncate">
                          {request.assignedTo?.name || "Auto round robin"}
                        </p>
                        <p className="mt-1 text-[10px] font-bold text-slate-400 uppercase truncate">
                          {request.assignedAt ? `Assigned ${formatDate(request.assignedAt)}` : "Assignment pending"}
                        </p>
                      </td>
                      <td className="px-4 xl:px-5 py-4 align-middle">
                        <p
                          className={`text-[12px] font-black uppercase tracking-wider ${
                            request.overdue ? "text-amber-600" : request.breached ? "text-rose-600" : "text-emerald-600"
                          }`}
                        >
                          {request.overdue ? "Overdue" : request.breached ? "Breached" : "On Track"}
                        </p>
                        <p className="mt-1 text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap">
                          Due: {formatDateTime(request.slaDeadline)}
                        </p>
                      </td>
                      <td className="px-4 xl:px-5 py-4 align-middle">
                        <p
                          className={`text-[11px] font-black uppercase tracking-wider ${
                            request.generatedTicketUrl || request.revisedTicketUrl
                              ? "text-emerald-600"
                              : "text-slate-400"
                          }`}
                        >
                          {request.generatedTicketUrl || request.revisedTicketUrl
                            ? "Ready to download"
                            : "Waiting for new ticket"}
                        </p>
                      </td>
                      <td className="px-4 xl:px-5 py-4 align-middle">
                        <p className="text-[12px] font-bold text-slate-500 whitespace-nowrap">{formatDate(request.updatedAt)}</p>
                        <p className="mt-1 text-[10px] font-bold text-slate-400 uppercase">{formatDateTime(request.updatedAt)}</p>
                      </td>
                      <td className="px-3 py-4 align-middle text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedRequest(request)}
                          className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#003399] to-[#000d26] text-white hover:shadow-lg hover:scale-105 transition-all inline-flex items-center justify-center"
                          title="View details"
                        >
                          <span className="text-sm font-black">→</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-wrap gap-3 items-center justify-between px-6 py-3 border-t border-slate-100 bg-white">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Server page {pagination?.page || page} of {pagination?.pages || 1}
            </p>
            <Pagination
              currentPage={pagination?.page || page}
              totalPages={pagination?.pages || 1}
              onPageChange={setPage}
              showFirstLast
            />
          </div>
        </div>
      </div>

      {selectedRequest && (
        <ReissueOpsDetailModal
          request={selectedRequest}
          canReassign={canReassign}
          opsMembers={opsMembers}
          onClose={() => setSelectedRequest(null)}
        />
      )}
    </div>
  );
}
