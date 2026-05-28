import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
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
} from "react-icons/fi";
import { toast } from "react-toastify";
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

const REQUEST_STATUS_PRIORITY = {
  PENDING_ASSIGNMENT: 125,
  ASSIGNED: 120,
  IN_PROGRESS: 115,
  WAITING_AIRLINE: 110,
  PROCESSING: 105,
  BILLING_RESERVED: 100,
  QUOTE_RECEIVED: 95,
  SEARCH_COMPLETED: 90,
  CREATED: 85,
  OFFLINE_REQUIRED: 80,
  TICKET_GENERATED: 70,
  COMPLETED: 60,
  FAILED: 20,
  REJECTED: 15,
  CANCELLED: 10,
};

const dedupeLatestActionableRequests = (items = []) => {
  const sorted = [...items].sort((left, right) => {
    const generationDiff =
      Number(right?.bookingLineage?.reissueGeneration || 0) -
      Number(left?.bookingLineage?.reissueGeneration || 0);
    if (generationDiff !== 0) return generationDiff;

    const statusDiff =
      (REQUEST_STATUS_PRIORITY[right?.status] || 0) -
      (REQUEST_STATUS_PRIORITY[left?.status] || 0);
    if (statusDiff !== 0) return statusDiff;

    return new Date(right?.updatedAt || right?.createdAt || 0) - new Date(left?.updatedAt || left?.createdAt || 0);
  });

  const seen = new Set();
  return sorted.filter((item) => {
    const key =
      item?.bookingLineage?.originalBookingId ||
      item?.bookingLineage?.originalMongoBookingId ||
      item?.originalPnr ||
      item?.displayInfo?.pnr ||
      item?.bookingId ||
      item?.id;
    if (!key || seen.has(String(key))) return false;
    seen.add(String(key));
    return true;
  });
};

function readToken() {
  const token = sessionStorage.getItem("token");
  if (!token) return {};
  try {
    return jwtDecode(token);
  } catch {
    return {};
  }
}

function SummaryCard({ label, value, icon: Icon, tone }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone}`}>
          <Icon size={18} />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            {label}
          </p>
          <p className="mt-1 text-2xl font-black text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default function AllReissueRequests() {
  const dispatch = useDispatch();
  const token = readToken();
  const currentRole = token.role || token.userRole || "super-admin";
  const currentUserId = token.id || token._id || null;
  const canReassign = ["super-admin", "master-admin", "ops-admin"].includes(currentRole);
  const { requests, loading, pagination, error, analytics } = useSelector((state) => state.reissue);

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
    const dedupedRequests = dedupeLatestActionableRequests(requests);
    const term = search.trim().toLowerCase();
    if (!term) return dedupedRequests;
    return dedupedRequests.filter((request) =>
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

  const unassignedRequests = useMemo(
    () =>
      filteredRequests.filter(
        (request) =>
          request.assignmentStatus === "UNASSIGNED" ||
          request.status === "PENDING_ASSIGNMENT",
      ),
    [filteredRequests],
  );

  const stats = useMemo(() => {
    const total = pagination?.total || requests.length;
    const pendingAssignment =
      analytics?.pendingAssignmentCount ??
      requests.filter((request) =>
        request.assignmentStatus === "UNASSIGNED" ||
        request.status === "PENDING_ASSIGNMENT",
      ).length;
    const processing = requests.filter((request) =>
      ["ASSIGNED", "IN_PROGRESS", "WAITING_AIRLINE"].includes(request.status),
    ).length;
    const overdue = requests.filter((request) => request.overdue).length;
    const completed = requests.filter((request) =>
      ["TICKET_GENERATED", "COMPLETED"].includes(request.status),
    ).length;

    return { total, pendingAssignment, processing, overdue, completed };
  }, [analytics, pagination, requests]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 lg:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0A4D68] text-white shadow-lg shadow-cyan-900/10">
              <FiRepeat size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                Offline Reissue Management
              </h1>
              <p className="text-sm text-slate-500">
                Operations workspace for assignment, SLA tracking, automatic ticket generation, and passenger delivery.
              </p>
            </div>
          </div>

          <button
            onClick={() =>
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
              )
            }
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 shadow-sm transition hover:bg-slate-50"
          >
            <FiRefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Open Requests" value={stats.total} icon={FiBarChart2} tone="bg-slate-100 text-slate-700" />
          <SummaryCard label="Pending Assignment" value={stats.pendingAssignment} icon={FiClock} tone="bg-amber-50 text-amber-700" />
          <SummaryCard label="Processing" value={stats.processing} icon={FiSend} tone="bg-blue-50 text-blue-700" />
          <SummaryCard label="Overdue" value={stats.overdue} icon={FiAlertCircle} tone="bg-amber-50 text-amber-700" />
          <SummaryCard label="Ticket Ready" value={stats.completed} icon={FiDownload} tone="bg-emerald-50 text-emerald-700" />
        </div>

        <div className="rounded-3xl border border-amber-200 bg-amber-50/70 p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">
                Unassigned Reissue Requests
              </p>
              <p className="mt-1 text-sm text-amber-900">
                Requests stay active even when auto-assignment cannot find an OPS agent.
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white px-3 py-1.5 text-xs font-black uppercase tracking-wider text-amber-700">
              <FiClock size={14} />
              {stats.pendingAssignment} awaiting assignment
            </span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {unassignedRequests.slice(0, 6).map((request) => (
              <button
                key={request.id}
                type="button"
                onClick={() => setSelectedRequest(request)}
                className="rounded-2xl border border-amber-200 bg-white p-4 text-left transition hover:border-amber-300 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm font-bold text-slate-900">{request.requestId}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {request.displayInfo?.userName || request.metadata?.employeeName || "Passenger"}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-amber-700">
                    <FiClock size={11} />
                    Pending Assignment
                  </span>
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-800">
                  {getJourneyLabel(request.selectedFlight || request.preferredJourney)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {request.assignmentFailureReason === "NO_ELIGIBLE_OPS"
                    ? "No eligible OPS member was available during auto-assignment."
                    : "Awaiting manual OPS assignment."}
                </p>
              </button>
            ))}
            {unassignedRequests.length === 0 && (
              <div className="rounded-2xl border border-dashed border-amber-200 bg-white/80 p-4 text-sm text-slate-500">
                No unassigned offline reissue requests in the current result set.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-3 xl:grid-cols-6">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search request, booking, passenger, or PNR"
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#0A4D68]"
            />

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 outline-none"
            >
              {REISSUE_STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option === "ALL" ? "All Statuses" : prettifyLabel(option)}
                </option>
              ))}
            </select>

            <input
              value={airline}
              onChange={(event) => setAirline(event.target.value)}
              placeholder="Filter by airline"
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#0A4D68]"
            />

            <select
              value={assignedTo}
              onChange={(event) => setAssignedTo(event.target.value)}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 outline-none"
              disabled={currentRole === "ops-member"}
            >
              {currentRole !== "ops-member" && <option value="">All agents</option>}
              {currentUserId && <option value="me">Assigned to me</option>}
              {opsMembers.map((member) => (
                <option key={member._id} value={member._id}>
                  {member.name}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={createdFrom}
              onChange={(event) => setCreatedFrom(event.target.value)}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#0A4D68]"
            />

            <input
              type="date"
              value={createdTo}
              onChange={(event) => setCreatedTo(event.target.value)}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#0A4D68]"
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setOverdueOnly((value) => !value)}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${
                overdueOnly
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              Overdue
            </button>
            <button
              type="button"
              onClick={() => setBreachedOnly((value) => !value)}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${
                breachedOnly
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              SLA Breach
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[1280px] w-full">
              <thead className="bg-slate-900 text-left">
                <tr>
                  {["Request", "Passenger", "Preferred Flight", "Status", "Assigned Agent", "SLA", "Reissued Ticket", "Updated", "Action"].map((heading) => (
                    <th
                      key={heading}
                      className="px-4 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400"
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
                        <FiRefreshCw size={28} className="animate-spin" />
                        <p className="text-sm font-semibold">Loading offline reissue queue...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-4 py-20 text-center">
                      <div className="flex flex-col items-center gap-3 text-slate-400">
                        <FiRepeat size={32} />
                        <p className="text-sm font-semibold">No offline reissue requests found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-4">
                        <p className="font-mono text-sm font-bold text-slate-900">{request.requestId}</p>
                        <p className="mt-1 text-xs text-slate-400">Booking {request.bookingId}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm font-semibold text-slate-800">
                          {request.metadata?.employeeName || "Passenger"}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {request.metadata?.employeeEmail || "Email not captured"}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm font-semibold text-slate-800">
                          {getJourneyLabel(request.selectedFlight || request.preferredJourney)}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {request.selectedFlight?.airlineCode || request.preferredJourney?.airlineCode || request.airline || "Airline pending"}
                          {request.selectedFlight?.flightNumber ? ` • ${request.selectedFlight.flightNumber}` : ""}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-wider ${getStatusTone(request.status)}`}>
                          {request.status === "PENDING_ASSIGNMENT" && <FiClock size={12} className="mr-1" />}
                          {prettifyLabel(request.status)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm font-semibold text-slate-800">
                          {request.assignedTo?.name || "Unassigned"}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {request.assignedAt
                            ? `Assigned ${formatDate(request.assignedAt)}`
                            : request.assignmentFailureReason === "NO_ELIGIBLE_OPS"
                              ? "Awaiting manual assignment"
                              : "Assignment pending"}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <p className={`text-sm font-bold ${request.overdue ? "text-amber-700" : request.breached ? "text-rose-700" : "text-slate-800"}`}>
                          {request.overdue ? "Overdue" : request.breached ? "Breached" : "On Track"}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          Deadline {formatDateTime(request.slaDeadline)}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1 text-xs">
                          <p className={request.generatedTicketUrl || request.revisedTicketUrl ? "font-semibold text-emerald-700" : "text-slate-400"}>
                            {request.generatedTicketUrl || request.revisedTicketUrl
                              ? "Ready to download"
                              : "Awaiting generation"}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm font-semibold text-slate-800">{formatDate(request.updatedAt)}</p>
                        <p className="mt-1 text-xs text-slate-400">{formatDateTime(request.updatedAt)}</p>
                      </td>
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => setSelectedRequest(request)}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          <FiEye size={15} />
                          Open
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 bg-white px-4 py-3">
            <p className="text-xs font-semibold text-slate-400">
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
