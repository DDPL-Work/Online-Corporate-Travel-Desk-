import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  FiArrowLeft,
  FiCheckCircle,
  FiClock,
  FiDownload,
  FiEye,
  FiFilter,
  FiRefreshCw,
  FiRepeat,
  FiSend,
} from "react-icons/fi";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "../../API/axios";
import {
  fetchOfflineReissueRequests,
  fetchReissueRequests,
} from "../../Redux/Actions/reissueThunks";
import { Pagination } from "../TravelAdminTabs/Shared/Pagination";
import ReissueRequestDetailsModal from "./ReissueRequestDetailsModal";
import {
  REISSUE_STATUS_OPTIONS,
  formatDate,
  formatMoney,
  getJourneyLabel,
  getModeTone,
  getStatusTone,
  prettifyLabel,
} from "./reissueUi";

const OFFLINE_STATUS_TONE = {
  RAISED: "bg-amber-50 text-amber-700 border-amber-200",
  ASSIGNED: "bg-blue-50 text-blue-700 border-blue-200",
  IN_PROGRESS: "bg-blue-50 text-blue-700 border-blue-200",
  WAITING_AIRLINE: "bg-indigo-50 text-indigo-700 border-indigo-200",
  TICKET_GENERATED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  FAILED: "bg-rose-50 text-rose-700 border-rose-200",
  REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
};

function OfflineStatusTimeline({ currentStatus }) {
  const steps = [
    "RAISED",
    "ASSIGNED",
    "IN_PROGRESS",
    "WAITING_AIRLINE",
    "TICKET_GENERATED",
    "COMPLETED",
  ];
  const currentIndex = steps.indexOf(currentStatus);
  const failed = currentStatus === "FAILED" || currentStatus === "REJECTED";

  return (
    <div className="flex items-center gap-1">
      {steps.map((step, index) => {
        const done = !failed && index <= currentIndex;
        const active = !failed && index === currentIndex;
        return (
          <React.Fragment key={step}>
            <div
              className={`h-1.5 rounded-full transition-all ${
                done
                  ? active
                    ? "w-7 bg-indigo-600"
                    : "w-5 bg-indigo-300"
                  : "w-5 bg-slate-200"
              }`}
              title={prettifyLabel(step)}
            />
            {index < steps.length - 1 && <div className="h-px w-1 bg-slate-200" />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone }) {
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

export default function ReissueRequestsPage({ title, subtitle }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const {
    requests,
    loading,
    pagination,
    offlineRequests,
    offlineLoading,
    offlinePagination,
  } = useSelector((state) => state.reissue);

  const [activeTab, setActiveTab] = useState(
    title?.toLowerCase().includes("my") ? "offline" : "online",
  );
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState(
    searchParams.get("bookingId") || searchParams.get("requestId") || "",
  );
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [page, setPage] = useState(1);

  const bookingIdFilter = searchParams.get("bookingId") || undefined;

  useEffect(() => {
    dispatch(
      fetchReissueRequests({
        page,
        limit: 10,
        status: status === "ALL" ? undefined : status,
      }),
    );
  }, [dispatch, page, status]);

  useEffect(() => {
    if (activeTab === "offline") {
      dispatch(
        fetchOfflineReissueRequests({
          page,
          limit: 10,
          bookingId: bookingIdFilter,
        }),
      );
    }
  }, [activeTab, bookingIdFilter, dispatch, page]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, status]);

  const filteredOnlineRequests = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return requests;
    return requests.filter((request) =>
      [
        request.reissueId,
        request.originalPnr,
        request.airline,
        request.mode,
        request.status,
      ]
        .filter(Boolean)
        .some((value) => value.toString().toLowerCase().includes(term)),
    );
  }, [requests, search]);

  const filteredOfflineRequests = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return offlineRequests;
    return offlineRequests.filter((request) =>
      [
        request.requestId,
        request.bookingId,
        request.airline,
        request.status,
        request.selectedFlight?.airlineCode,
        request.selectedFlight?.flightNumber,
      ]
        .filter(Boolean)
        .some((value) => value.toString().toLowerCase().includes(term)),
    );
  }, [offlineRequests, search]);

  const stats = useMemo(() => {
    const completedOffline = offlineRequests.filter((request) =>
      ["TICKET_GENERATED", "COMPLETED"].includes(request.status),
    ).length;
    const processingOffline = offlineRequests.filter((request) =>
      ["ASSIGNED", "IN_PROGRESS", "WAITING_AIRLINE"].includes(request.status),
    ).length;

    return {
      onlineTotal: pagination?.total || requests.length,
      offlineTotal: offlinePagination?.total || offlineRequests.length,
      processingOffline,
      completedOffline,
    };
  }, [offlinePagination, offlineRequests, pagination, requests]);

  const handleRefresh = () => {
    if (activeTab === "online") {
      dispatch(
        fetchReissueRequests({
          page,
          limit: 10,
          status: status === "ALL" ? undefined : status,
        }),
      );
      return;
    }

    dispatch(
      fetchOfflineReissueRequests({
        page,
        limit: 10,
        bookingId: bookingIdFilter,
      }),
    );
  };

  const handleDownload = async (requestId, type, fallbackName) => {
    try {
      const response = await axios.get(`/reissue/offline/${requestId}/download-${type}`, {
        responseType: "blob",
      });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fallbackName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(
        `${axios.defaults.baseURL}/reissue/offline/${requestId}/download-${type}`,
        "_blank",
        "noopener,noreferrer",
      );
    }
  };

  const isLoading = activeTab === "online" ? loading : offlineLoading;

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
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

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Online Requests" value={stats.onlineTotal} icon={FiRefreshCw} tone="bg-teal-50 text-teal-700" />
          <StatCard label="Offline Requests" value={stats.offlineTotal} icon={FiSend} tone="bg-indigo-50 text-indigo-700" />
          <StatCard label="Processing Offline" value={stats.processingOffline} icon={FiClock} tone="bg-blue-50 text-blue-700" />
          <StatCard label="Ticket Ready" value={stats.completedOffline} icon={FiCheckCircle} tone="bg-emerald-50 text-emerald-700" />
        </div>

        <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm w-fit">
          {[
            { id: "online", label: "Online Reissue", icon: FiRefreshCw },
            { id: "offline", label: "My Reissued Tickets", icon: FiSend },
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

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
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
                  onChange={(event) => setStatus(event.target.value)}
                  className="w-full bg-transparent py-3 text-sm font-semibold text-slate-700 outline-none"
                >
                  {REISSUE_STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option === "ALL" ? "All Statuses" : prettifyLabel(option)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {activeTab === "online" && (
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-[960px] w-full">
                <thead className="bg-slate-900 text-left">
                  <tr>
                    {["Request", "Journey", "New Date", "Mode", "Status", "Adjustment", "Action"].map((heading) => (
                      <th key={heading} className="px-4 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="px-4 py-20 text-center">
                        <div className="flex flex-col items-center gap-3 text-slate-400">
                          <FiRefreshCw size={28} className="animate-spin" />
                          <p className="text-sm font-semibold">Loading requests...</p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredOnlineRequests.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-4 py-20 text-center">
                        <div className="flex flex-col items-center gap-3 text-slate-400">
                          <FiRepeat size={32} />
                          <p className="text-sm font-semibold">No online reissue requests found</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredOnlineRequests.map((request) => (
                      <tr key={request.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-4">
                          <p className="font-mono text-sm font-bold text-slate-900">{request.reissueId}</p>
                          <p className="text-xs text-slate-400">PNR: {request.originalPnr || "—"}</p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm font-semibold text-slate-800">{getJourneyLabel(request.oldJourney)}</p>
                          <p className="text-xs text-slate-400">{request.airline || request.supplier || "Airline pending"}</p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm font-semibold text-slate-800">{formatDate(request.newJourney?.departureDate)}</p>
                          {request.newJourney?.returnDate && (
                            <p className="text-xs text-slate-400">Return: {formatDate(request.newJourney.returnDate)}</p>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-wider ${getModeTone(request.mode)}`}>
                            {prettifyLabel(request.mode)}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-wider ${getStatusTone(request.status)}`}>
                            {prettifyLabel(request.status)}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm font-bold text-slate-900">{formatMoney(request.fareDifference)}</p>
                          <p className="text-xs text-slate-400">Total adjustment {formatMoney(request.totalAdjustment)}</p>
                        </td>
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() => setSelectedRequestId(request.id)}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            <FiEye size={15} />
                            Details
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
              totalItems={pagination?.total || filteredOnlineRequests.length}
              pageSize={pagination?.limit || 10}
              onPageChange={setPage}
            />
          </div>
        )}

        {activeTab === "offline" && (
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-[1200px] w-full">
                <thead className="bg-slate-900 text-left">
                  <tr>
                    {["Request ID", "Booking ID", "Status", "Airline", "Preferred Date", "Reissued Ticket", "Last Updated"].map((heading) => (
                      <th key={heading} className="px-4 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">
                        {heading}
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
                  ) : filteredOfflineRequests.length === 0 ? (
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
                    filteredOfflineRequests.map((request) => (
                      <tr key={request.id || request._id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-4">
                          <p className="font-mono text-sm font-bold text-slate-900">
                            {request.requestId || "—"}
                          </p>
                          <div className="mt-2">
                            <OfflineStatusTimeline currentStatus={request.status} />
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm font-semibold text-slate-800">{request.bookingId || "—"}</p>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-wider ${OFFLINE_STATUS_TONE[request.status] || "bg-slate-50 text-slate-700 border-slate-200"}`}>
                            {prettifyLabel(request.status)}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm font-semibold text-slate-800">
                            {request.selectedFlight?.airlineCode || request.preferredJourney?.airlineCode || request.airline || "—"}
                            {request.selectedFlight?.flightNumber ? ` • ${request.selectedFlight.flightNumber}` : ""}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            {request.selectedFlight?.origin || request.preferredJourney?.origin || "—"} → {request.selectedFlight?.destination || request.preferredJourney?.destination || "—"}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm font-semibold text-slate-800">
                            {formatDate(request.preferredDate || request.selectedFlight?.departureDate || request.preferredJourney?.departureDate)}
                          </p>
                          {request.preferredJourney?.returnDate && (
                            <p className="text-xs text-slate-400 mt-1">Return {formatDate(request.preferredJourney.returnDate)}</p>
                          )}
                        </td>
                      <td className="px-4 py-4">
                          {["TICKET_GENERATED", "COMPLETED"].includes(request.status) &&
                          (request.generatedTicketUrl || request.revisedTicketUrl) ? (
                            <button
                              type="button"
                              onClick={() => handleDownload(request.id || request._id, "ticket", `${request.requestId || "reissue-ticket"}.pdf`)}
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-600 hover:text-teal-800"
                            >
                              <FiDownload size={13} />
                              Download
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">Pending</span>
                          )}
                      </td>
                        <td className="px-4 py-4">
                          <p className="text-sm text-slate-700">{formatDate(request.updatedAt)}</p>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={offlinePagination?.page || page}
              totalItems={offlinePagination?.total || filteredOfflineRequests.length}
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
