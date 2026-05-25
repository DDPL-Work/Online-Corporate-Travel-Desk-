import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  FiArrowLeft, FiCheckCircle, FiClock, FiDownload,
  FiEye, FiFilter, FiRefreshCw, FiRepeat, FiSend,
} from "react-icons/fi";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  fetchOfflineReissueRequests,
  fetchReissueRequests,
} from "../../Redux/Actions/reissueThunks";
import { Pagination } from "../TravelAdminTabs/Shared/Pagination";
import ReissueRequestDetailsModal from "./ReissueRequestDetailsModal";
import {
  getStatusTone,
  getPnr,
  safeDate,
  safeMoney,
  getRoute,
  getAirline,
  getTicketUrl,
  getStatus,
  getRequestId,
  getFareDifference,
  dedupeLatestActionableRequests,
  resolveWorkflowType,
} from "../../utils/reissueResolvers";

/* ─── prettify status label ─── */
const prettifyLabel = (s) => {
  if (!s) return "N/A";
  return String(s).replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
};

/* ─── Status options for filter ─── */
const REISSUE_STATUS_OPTIONS = [
  "ALL", "CREATED", "SEARCH_COMPLETED", "QUOTE_RECEIVED",
  "BILLING_RESERVED", "PROCESSING", "OPS_PENDING", "OPS_ASSIGNED",
  "OPS_PROCESSING", "TICKET_UPLOADED", "COMPLETED", "FAILED",
  "CANCELLED",
];

/* ─────────────────────────────────────────────────────────────
   OFFLINE STATUS TONE — matches OFFLINE_STATUSES enum exactly
   ───────────────────────────────────────────────────────────── */
const OFFLINE_STATUS_TONE = {
  RAISED:           "bg-amber-50 text-amber-700 border-amber-200",
  ASSIGNED:         "bg-blue-50 text-blue-700 border-blue-200",
  IN_PROGRESS:      "bg-blue-50 text-blue-700 border-blue-200",
  WAITING_AIRLINE:  "bg-indigo-50 text-indigo-700 border-indigo-200",
  TICKET_GENERATED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  COMPLETED:        "bg-emerald-50 text-emerald-700 border-emerald-200",
  FAILED:           "bg-rose-50 text-rose-700 border-rose-200",
  REJECTED:         "bg-rose-50 text-rose-700 border-rose-200",
};

/* ─────────────────────────────────────────────────────────────
   OFFLINE PROGRESS TIMELINE
   ───────────────────────────────────────────────────────────── */
const OFFLINE_STEPS = [
  "RAISED", "ASSIGNED", "IN_PROGRESS",
  "WAITING_AIRLINE", "TICKET_GENERATED", "COMPLETED",
];

function OfflineStatusTimeline({ currentStatus }) {
  const currentIndex = OFFLINE_STEPS.indexOf(currentStatus);
  const failed = currentStatus === "FAILED" || currentStatus === "REJECTED";
  return (
    <div className="flex items-center gap-1">
      {OFFLINE_STEPS.map((step, index) => {
        const done   = !failed && index <= currentIndex;
        const active = !failed && index === currentIndex;
        return (
          <React.Fragment key={step}>
            <div
              className={`h-1.5 rounded-full transition-all ${
                done
                  ? active ? "w-7 bg-indigo-600" : "w-5 bg-indigo-300"
                  : "w-5 bg-slate-200"
              }`}
              title={prettifyLabel(step)}
            />
            {index < OFFLINE_STEPS.length - 1 && (
              <div className="h-px w-1 bg-slate-200" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   STAT CARD
   ───────────────────────────────────────────────────────────── */
// eslint-disable-next-line no-unused-vars
function StatCard({ label, value, icon: Icon, tone }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone}`}>
          <Icon size={18} />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MAIN PAGE
   ───────────────────────────────────────────────────────────── */
export default function ReissueRequestsPage({ title, subtitle }) {
  const dispatch    = useDispatch();
  const navigate    = useNavigate();
  const [searchParams] = useSearchParams();

  const {
    requests, loading, pagination,
    offlineRequests, offlineLoading, offlinePagination,
  } = useSelector((s) => s.reissue);

  const [activeTab, setActiveTab] = useState(
    title?.toLowerCase().includes("my") ? "offline" : "online"
  );
  const [status, setStatus]   = useState("ALL");
  const [search, setSearch]   = useState(
    searchParams.get("bookingId") || searchParams.get("requestId") || ""
  );
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [page, setPage]       = useState(1);

  const bookingIdFilter = searchParams.get("bookingId") || undefined;

  /* Fetch online reissue requests */
  useEffect(() => {
    dispatch(
      fetchReissueRequests({
        page,
        limit: 10,
        status: status === "ALL" ? undefined : status,
      })
    );
  }, [dispatch, page, status]);

  /* Fetch offline reissue requests when tab is offline */
  useEffect(() => {
    if (activeTab === "offline") {
      dispatch(
        fetchOfflineReissueRequests({
          page,
          limit: 10,
          bookingId: bookingIdFilter,
        })
      );
    }
  }, [activeTab, bookingIdFilter, dispatch, page]);

  useEffect(() => { 
    // Ignore updates to avoid cascaded renders, just reset page on tab/status change if needed in a handler instead.
    // Or we can safely remove this because the handlers setting activeTab or status already setPage(1).
  }, [activeTab, status]);

  /* ── Filtered lists ── */
  const filteredOnline = useMemo(() => {
    const dedupedRequests = dedupeLatestActionableRequests(requests);
    const term = search.trim().toLowerCase();
    if (!term) return dedupedRequests;
    return dedupedRequests.filter((r) =>
      [r.reissueId, r.originalPnr, r.newPnr, r.airline, r.mode, r.status]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term))
    );
  }, [requests, search]);

  const filteredOffline = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return offlineRequests;
    return offlineRequests.filter((r) =>
      [
        r.requestId,
        String(r.bookingId),
        r.airline,
        r.status,
        r.selectedFlight?.airlineCode,
        r.selectedFlight?.flightNumber,
        r.pnr,
        r.originalPnr,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term))
    );
  }, [offlineRequests, search]);

  /* ── Stats ── */
  const stats = useMemo(() => {
    const completedOffline = offlineRequests.filter((r) =>
      ["TICKET_GENERATED", "COMPLETED"].includes(r.status)
    ).length;
    const processingOffline = offlineRequests.filter((r) =>
      ["ASSIGNED", "IN_PROGRESS", "WAITING_AIRLINE"].includes(r.status)
    ).length;
    return {
      onlineTotal:      pagination?.total  || requests.length,
      offlineTotal:     offlinePagination?.total || offlineRequests.length,
      processingOffline,
      completedOffline,
    };
  }, [offlinePagination, offlineRequests, pagination, requests]);

  const handleRefresh = () => {
    if (activeTab === "online") {
      dispatch(fetchReissueRequests({ page, limit: 10, status: status === "ALL" ? undefined : status }));
    } else {
      dispatch(fetchOfflineReissueRequests({ page, limit: 10, bookingId: bookingIdFilter }));
    }
  };

  const isLoading = activeTab === "online" ? loading : offlineLoading;

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50"
            >
              <FiArrowLeft size={18} />
            </button>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0A4D68] text-white shadow-lg shadow-cyan-900/10">
                <FiRepeat size={20} />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900">{title}</h1>
                <p className="text-sm text-slate-500">{subtitle}</p>
              </div>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 shadow-sm transition hover:bg-slate-50"
          >
            <FiRefreshCw size={15} className={isLoading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Stat Cards */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Online Requests"    value={stats.onlineTotal}      icon={FiRefreshCw}   tone="bg-teal-50 text-teal-700" />
          <StatCard label="Offline Requests"   value={stats.offlineTotal}     icon={FiSend}        tone="bg-indigo-50 text-indigo-700" />
          <StatCard label="Processing Offline" value={stats.processingOffline} icon={FiClock}      tone="bg-blue-50 text-blue-700" />
          <StatCard label="Ticket Ready"       value={stats.completedOffline}  icon={FiCheckCircle} tone="bg-emerald-50 text-emerald-700" />
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm w-fit">
          {[
            { id: "online",  label: "Online Reissue",      icon: FiRefreshCw },
            { id: "offline", label: "My Reissued Tickets",  icon: FiSend },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition ${
                activeTab === tab.id
                  ? "bg-[#0A4D68] text-white shadow-md"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search + Filter */}
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                activeTab === "online"
                  ? "Search by request ID, PNR, airline, or status"
                  : "Search by request ID, booking ID, airline, PNR, or status"
              }
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#0A4D68]"
            />
            {activeTab === "online" && (
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3">
                <FiFilter size={15} className="text-slate-400" />
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-transparent py-3 text-sm font-semibold text-slate-700 outline-none"
                >
                  {REISSUE_STATUS_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt === "ALL" ? "All Statuses" : prettifyLabel(opt)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* ── ONLINE TABLE ── */}
        {activeTab === "online" && (
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-[960px] w-full">
                <thead className="bg-slate-900 text-left">
                  <tr>
                    {["Request", "PNR", "Journey", "New Date", "Mode", "Status", "Adjustment", "Action"].map((h) => (
                      <th key={h} className="px-4 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="px-4 py-20 text-center">
                        <div className="flex flex-col items-center gap-3 text-slate-400">
                          <FiRefreshCw size={28} className="animate-spin" />
                          <p className="text-sm font-semibold">Loading requests...</p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredOnline.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-4 py-20 text-center">
                        <div className="flex flex-col items-center gap-3 text-slate-400">
                          <FiRepeat size={32} />
                          <p className="text-sm font-semibold">No online reissue requests found</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredOnline.map((req) => (
                      <tr key={getRequestId(req)} className="hover:bg-slate-50/70">
                        <td className="px-4 py-4">
                          <p className="font-mono text-sm font-bold text-slate-900">{req.reissueId || getRequestId(req)}</p>
                          <p className="text-xs text-slate-400">{safeDate(req.createdAt)}</p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-mono text-sm font-bold text-slate-900">
                            {getPnr(req)}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm font-semibold text-slate-800">
                            {getRoute(req)}
                          </p>
                          <p className="text-xs text-slate-400">
                            {getAirline(req) || "Airline pending"}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm font-semibold text-slate-800">
                            {safeDate(req.newJourney?.departureDate || req.preferredDate)}
                          </p>
                          {req.newJourney?.returnDate && (
                            <p className="text-xs text-slate-400">
                              Return: {safeDate(req.newJourney.returnDate)}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-wider ${
                            resolveWorkflowType(req) === "ONLINE_REISSUE"
                              ? "bg-teal-50 text-teal-700 border-teal-200"
                              : "bg-slate-100 text-slate-700 border-slate-200"
                          }`}>
                            {resolveWorkflowType(req)}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-wider ${getStatusTone(getStatus(req))}`}>
                            {prettifyLabel(getStatus(req))}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm font-bold text-slate-900">
                            {getFareDifference(req) ? safeMoney(getFareDifference(req)) : "N/A"}
                          </p>
                          {req.totalAdjustment != null && (
                            <p className="text-xs text-slate-400">
                              Total {safeMoney(req.totalAdjustment)}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() => setSelectedRequestId(req.id || req._id)}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            <FiEye size={15} /> Details
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={pagination?.page || page}
              totalItems={pagination?.total || filteredOnline.length}
              pageSize={pagination?.limit || 10}
              onPageChange={setPage}
            />
          </div>
        )}

        {/* ── OFFLINE TABLE ── */}
        {activeTab === "offline" && (
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-[1200px] w-full">
                <thead className="bg-slate-900 text-left">
                  <tr>
                    {["Request ID", "Booking ID", "Status", "Airline / Route", "Preferred Date", "Reissued Ticket", "Last Updated"].map((h) => (
                      <th key={h} className="px-4 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {offlineLoading ? (
                    <tr>
                      <td colSpan="7" className="px-4 py-20 text-center">
                        <div className="flex flex-col items-center gap-3 text-slate-400">
                          <FiRefreshCw size={28} className="animate-spin" />
                          <p className="text-sm font-semibold">Loading offline requests...</p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredOffline.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-4 py-20 text-center">
                        <div className="flex flex-col items-center gap-3 text-slate-400">
                          <FiSend size={32} />
                          <p className="text-sm font-semibold">No offline reissue requests found</p>
                          <p className="text-xs text-slate-400">
                            When online reissue is unavailable, submit an offline request from the booking page.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredOffline.map((req) => (
                      <tr key={getRequestId(req)} className="hover:bg-slate-50/70">
                        {/* Request ID + Timeline */}
                        <td className="px-4 py-4">
                          <p className="font-mono text-sm font-bold text-slate-900">
                            {getRequestId(req)}
                          </p>
                          <div className="mt-2">
                            <OfflineStatusTimeline currentStatus={getStatus(req)} />
                          </div>
                        </td>
                        {/* Booking ID */}
                        <td className="px-4 py-4">
                          <p className="text-sm font-semibold text-slate-800">
                            {String(req.bookingId || "N/A")}
                          </p>
                          {getPnr(req) !== "N/A" && (
                            <p className="text-xs text-slate-400 mt-1">
                              PNR: {getPnr(req)}
                            </p>
                          )}
                        </td>
                        {/* Status */}
                        <td className="px-4 py-4">
                          <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-wider ${OFFLINE_STATUS_TONE[getStatus(req)] || "bg-slate-50 text-slate-700 border-slate-200"}`}>
                            {prettifyLabel(getStatus(req))}
                          </span>
                        </td>
                        {/* Airline / Route */}
                        <td className="px-4 py-4">
                          <p className="text-sm font-semibold text-slate-800">
                            {getAirline(req)}
                            {(req.selectedFlight?.flightNumber || req.preferredJourney?.flightNumber)
                              ? ` • ${req.selectedFlight?.flightNumber || req.preferredJourney?.flightNumber}`
                              : ""}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            {getRoute(req)}
                          </p>
                        </td>
                        {/* Preferred Date */}
                        <td className="px-4 py-4">
                          <p className="text-sm font-semibold text-slate-800">
                            {safeDate(req.preferredDate || req.selectedFlight?.departureDate || req.preferredJourney?.departureDate)}
                          </p>
                          {(req.preferredJourney?.returnDate || req.selectedFlight?.returnDate) && (
                            <p className="text-xs text-slate-400 mt-1">
                              Return {safeDate(req.preferredJourney?.returnDate || req.selectedFlight?.returnDate)}
                            </p>
                          )}
                        </td>
                        {/* Download */}
                        <td className="px-4 py-4">
                          {["TICKET_GENERATED", "COMPLETED"].includes(getStatus(req)) && getTicketUrl(req) ? (
                            <button
                              type="button"
                              onClick={() => {
                                const url = getTicketUrl(req);
                                if (url) window.open(url, "_blank");
                              }}
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-600 hover:text-teal-800"
                            >
                              <FiDownload size={13} /> View Ticket
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">Pending</span>
                          )}
                        </td>
                        {/* Last Updated */}
                        <td className="px-4 py-4">
                          <p className="text-sm text-slate-700">
                            {safeDate(req.updatedAt)}
                          </p>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={offlinePagination?.page || page}
              totalItems={offlinePagination?.total || filteredOffline.length}
              pageSize={offlinePagination?.limit || 10}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {selectedRequestId && (
        <ReissueRequestDetailsModal
          requestId={selectedRequestId}
          onClose={() => setSelectedRequestId(null)}
        />
      )}
    </div>
  );
}
