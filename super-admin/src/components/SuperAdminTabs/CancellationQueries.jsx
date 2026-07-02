import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FiSearch,
  FiDownload,
  FiEye,
  FiXCircle,
  FiRotateCcw,
  FiAlertCircle,
  FiTrash2,
  FiMessageSquare,
  FiX,
  FiClock,
  FiCheckCircle,
  FiArrowRight,
  FiArrowLeft,
  FiList,
  FiRefreshCw
} from "react-icons/fi";
import { FaPlane, FaHotel } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  fetchCancellationQueries,
  updateCancellationQueryStatus,
} from "../../Redux/Actions/corporate.related.thunks";
import Pagination from "../Shared/Pagination";
import TableActionBar from "../Shared/TableActionBar";
import useExcelExporter from "../../services/export/useExcelExporter";
import {
  flightCancellationQueriesExportTemplate,
} from "../../templates/exportTemplates/superAdminExportTemplates";
import QueryDetailModal from "../Modals/QueryDetailModal";
import { airlineLogo } from "../../utils/formatter";

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

const QUERY_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "REJECTED"];
const QUERY_PRIORITIES = ["LOW", "MEDIUM", "HIGH"];

// FIX 1: min-w + explicit width on date inputs so dd-mm-yyyy and calendar icon are fully visible
const FILTER_DATE_INPUT_CLASS =
  "filter-date-input w-full min-w-[175px] px-3 py-2 border rounded-lg text-sm outline-none bg-slate-50";

const STATUS_STYLES = {
  OPEN: "bg-blue-50 text-blue-700 border-blue-200",
  IN_PROGRESS: "bg-amber-50 text-amber-700 border-amber-200",
  RESOLVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
};

const PRIORITY_STYLES = {
  LOW: "bg-slate-50 text-slate-600 border-slate-200",
  MEDIUM: "bg-amber-50 text-amber-700 border-amber-200",
  HIGH: "bg-rose-50 text-rose-700 border-rose-200",
};

// ─────────────────────────────────────────────
// DUMMY HOTEL CANCELLATION QUERIES (Removed)
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// NORMALIZERS
// ─────────────────────────────────────────────

const normalizeCorpName = (val) => {
  if (!val) return "N/A";
  if (typeof val === "object")
    return (
      val.corporateName || val.name || val.title || val.code || val._id || "N/A"
    );
  return val;
};

const normalizeCorpId = (val) => {
  if (!val) return "—";
  if (typeof val === "object")
    return val._id || val.id || val.code || val.corporateCode || "—";
  return val;
};

const _normalizeFlight = (b = {}) => {
  const traveller = (b.travellers && b.travellers[0]) || {};
  const travellerName =
    [traveller.firstName, traveller.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    traveller.email ||
    b.employeeName ||
    "N/A";
  const segments = b.flightRequest?.segments || [];
  const route =
    (segments.length &&
      segments
        .map(
          (s) =>
            `${s?.origin?.airportCode || "?"}-${s?.destination?.airportCode || "?"}`,
        )
        .join(" / ")) ||
    (Array.isArray(b.bookingSnapshot?.sectors)
      ? b.bookingSnapshot.sectors.join(" / ")
      : "") ||
    b.bookingSnapshot?.city ||
    b.destination ||
    "—";
  const travelDt =
    b.bookingSnapshot?.travelDate ||
    segments.find((s) => (s.journeyType || "onward") === "onward")
      ?.departureDateTime ||
    b.travelDate ||
    b.date ||
    b.createdAt ||
    "";
  const cancelDt =
    b.cancelledAt || b.cancellationDate || b.updatedAt || b.createdAt || "";
  const amount =
    Number(
      b.pricingSnapshot?.totalAmount ||
        b.bookingSnapshot?.amount ||
        b.total ||
        b.totalFare ||
        b.price ||
        0,
    ) || 0;
  const amendment = b.amendment || {};
  const lastHistory =
    Array.isArray(b.amendmentHistory) && b.amendmentHistory.length
      ? b.amendmentHistory[b.amendmentHistory.length - 1]
      : {};
  return {
    id: b._id || b.bookingId || "—",
    bookingRef: b.bookingReference || b._id || "—",
    corporate: normalizeCorpName(b.corporateId || b.corporate),
    corpId: normalizeCorpId(b.corporateId || b.corporate),
    employee: b.employeeName || travellerName,
    empId: b.userId || traveller.email || "—",
    type: "Flight",
    date: travelDt,
    cancelDate: cancelDt,
    destination: route,
    amount,
    refundStatus: (() => {
      const dbStatus = b.cancellation?.refundStatus || b.refundStatus;
      if (dbStatus && dbStatus.toLowerCase() !== "pending") return dbStatus;
      const amendment = b.amendment || {};
      const lastHistory = Array.isArray(b.amendmentHistory) && b.amendmentHistory.length
        ? b.amendmentHistory[b.amendmentHistory.length - 1] : {};
      const fRes = amendment.response?.[0]?.response?.Response?.TicketCRInfo?.[0] || 
                   lastHistory.response?.[0]?.response?.Response?.TicketCRInfo?.[0];
      if (fRes?.ChangeRequestStatus === 4 || fRes?.RefundedAmount > 0) return "Processed";
      return dbStatus || "Pending";
    })(),
    amendmentType: amendment.type || lastHistory.type || "",
    amendmentStatus: amendment.status || lastHistory.status || "",
    changeRequestId:
      amendment.changeRequestId || lastHistory.changeRequestId || "",
    airline:
      b.bookingSnapshot?.airline ||
      segments[0]?.airlineName ||
      segments[0]?.airlineCode ||
      "",
  };
};

const _normalizeHotel = (b = {}) => {
  const traveller = (b.travellers && b.travellers[0]) || {};
  const guestName =
    b.employeeName ||
    b.guestName ||
    [traveller.firstName, traveller.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    traveller.email ||
    "N/A";
  const cancelDt =
    b.cancelledAt || b.cancellationDate || b.updatedAt || b.createdAt || "";
  const amount =
    Number(
      b.pricingSnapshot?.totalAmount ||
        b.bookingSnapshot?.amount ||
        b.selectedRoom?.Price?.totalFare ||
        b.totalFare ||
        b.amount ||
        0,
    ) || 0;
  const amendment = b.amendment || {};
  const lastHistory =
    Array.isArray(b.amendmentHistory) && b.amendmentHistory.length
      ? b.amendmentHistory[b.amendmentHistory.length - 1]
      : {};
  return {
    id: b._id || b.bookingId || "—",
    bookingRef: b.bookingReference || b._id || "—",
    corporate: normalizeCorpName(b.corporateId || b.corporate),
    corpId: normalizeCorpId(b.corporateId || b.corporate),
    employee: guestName,
    empId: b.userId || traveller.email || "—",
    type: "Hotel",
    cancelDate: cancelDt,
    checkIn:
      b.bookingSnapshot?.checkInDate ||
      b.hotelRequest?.checkInDate ||
      b.checkIn ||
      b.checkInDate ||
      "",
    checkOut:
      b.bookingSnapshot?.checkOutDate ||
      b.hotelRequest?.checkOutDate ||
      b.checkOut ||
      b.checkOutDate ||
      "",
    destination:
      b.bookingSnapshot?.hotelName ||
      b.hotelRequest?.selectedHotel?.hotelName ||
      b.hotelName ||
      b.property ||
      "—",
    roomType:
      b.hotelRequest?.selectedRoom?.rawRoomData?.Name?.[0] ||
      b.roomType ||
      b.room ||
      "",
    amount,
    refundStatus: (() => {
      const dbStatus = b.cancellation?.refundStatus || b.refundStatus;
      if (dbStatus && dbStatus.toLowerCase() !== "pending") return dbStatus;
      const amendment = b.amendment || {};
      const lastHistory = Array.isArray(b.amendmentHistory) && b.amendmentHistory.length
        ? b.amendmentHistory[b.amendmentHistory.length - 1] : {};
      const hRes = amendment.providerResponse?.HotelChangeRequestResult || 
                   lastHistory.providerResponse?.HotelChangeRequestResult || {};
      if (hRes.ChangeRequestStatus === 3 || hRes.RefundedAmount > 0) return "Processed";
      return dbStatus || "Pending";
    })(),
    amendmentType: amendment.type || lastHistory.type || "",
    amendmentStatus: amendment.status || lastHistory.status || "",
    changeRequestId:
      amendment.changeRequestId || lastHistory.changeRequestId || "",
  };
};



// ─────────────────────────────────────────────
// CANCELLATION QUERY TAB
// ─────────────────────────────────────────────

function CancellationQueryTab() {
  const tableScrollRef = useRef(null);
  const dispatch = useDispatch();
  const { exportExcel, exportingKey } = useExcelExporter();
  const {
    cancellationQueries,
    loadingCancellationQueries,
  } = useSelector((state) => state.corporateRelated);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [requestedDate, setRequestedDate] = useState("");
  const [page, setPage] = useState(1);
  const [selectedQuery, setSelectedQuery] = useState(null);
  const isExporting = exportingKey === "flight_cancellation_queries";

  // Reset to page 1 when filters change
  useEffect(() => {
    const resetId = window.requestAnimationFrame(() => {
      setPage(1);
    });
    return () => window.cancelAnimationFrame(resetId);
  }, [statusFilter, search, fromDate, toDate, requestedDate]);

  // Fetch all data at once (no API pagination)
  useEffect(() => {
    dispatch(fetchCancellationQueries());
  }, [dispatch]);

  const queries = useMemo(
    () => {
      const flights = Array.isArray(cancellationQueries) ? cancellationQueries : [];
      // Sort them descending by requestedAt date
      return [...flights].sort((a, b) => new Date(b.requestedAt || 0) - new Date(a.requestedAt || 0));
    },
    [cancellationQueries],
  );

  useEffect(() => {
    if (!selectedQuery?._id) return;
    const updatedSelectedQuery = queries.find((q) => q._id === selectedQuery._id);
    if (updatedSelectedQuery && updatedSelectedQuery !== selectedQuery) {
      setSelectedQuery(updatedSelectedQuery);
    }
  }, [queries, selectedQuery]);

  const filtered = useMemo(
    () =>
      queries.filter((q) => {
        const s = (q.status || "").toUpperCase();
        const p = (q.priority || "").toUpperCase();
        const matchStatus = statusFilter === "ALL" || s === statusFilter;
        const matchPriority = priorityFilter === "ALL" || p === priorityFilter;
        const matchSearch =
          !search ||
          (q.queryId || "").toLowerCase().includes(search.toLowerCase()) ||
          (q.user?.email || "").toLowerCase().includes(search.toLowerCase()) ||
          (q.bookingReference || "")
            .toLowerCase()
            .includes(search.toLowerCase()) ||
          (q.corporate?.employeeName || "")
            .toLowerCase()
            .includes(search.toLowerCase()) ||
          (q.corporate?.companyName || "")
            .toLowerCase()
            .includes(search.toLowerCase()) ||
          (q.bookingSnapshot?.hotelName || "")
            .toLowerCase()
            .includes(search.toLowerCase());

        // Date filters — based on requestedAt field
        const reqAt = q.requestedAt ? new Date(q.requestedAt) : null;
        const matchFrom = !fromDate || (reqAt && reqAt >= new Date(fromDate));
        const matchTo   = !toDate   || (reqAt && reqAt <= new Date(toDate + "T23:59:59"));
        const matchRequested =
          !requestedDate ||
          (q.requestedAt || "").slice(0, 10) === requestedDate;

        return matchStatus && matchPriority && matchSearch && matchFrom && matchTo && matchRequested;
      }),
    [queries, statusFilter, priorityFilter, search, fromDate, toDate, requestedDate],
  );

  // Frontend pagination
  const currentPage = page;
  const totalPages = Math.max(1, Math.ceil(filtered.length / 10));

  const paginatedQueries = useMemo(
    () => filtered.slice((page - 1) * 10, page * 10),
    [filtered, page],
  );

  const handleStatusChange = useCallback(
    async (id, payload) => {
      try {
        const response = await dispatch(
          updateCancellationQueryStatus({ id, ...payload }),
        ).unwrap();
        await dispatch(fetchCancellationQueries()).unwrap();
        toast.success(response?.message || "Query status updated");
        return response;
      } catch (error) {
        const message =
          error?.message ||
          error?.error ||
          "Failed to update cancellation query";
        toast.error(message);
        throw error;
      }
    },
    [dispatch],
  );

  const statusCounts = useMemo(() => {
    const counts = { OPEN: 0, IN_PROGRESS: 0, RESOLVED: 0, REJECTED: 0 };
    queries.forEach((q) => {
      if (counts[q.status] !== undefined) counts[q.status]++;
    });
    return counts;
  }, [queries]);

  const handleExport = () => {
    if (loadingCancellationQueries) return;

    const statCards = [
      { label: "Open", value: statusCounts.OPEN },
      { label: "In Progress", value: statusCounts.IN_PROGRESS },
      { label: "Resolved", value: statusCounts.RESOLVED },
      { label: "Rejected", value: statusCounts.REJECTED },
    ];

    const appliedFilters = [
      { label: "Search", value: search || "None" },
      { label: "Status", value: statusFilter },
      { label: "Priority", value: priorityFilter },
      { label: "Booking From", value: fromDate || "Any" },
      { label: "Booking To", value: toDate || "Any" },
      { label: "Requested Date", value: requestedDate || "Any" },
    ];

    exportExcel({
      key: "flight_cancellation_queries",
      pageHeader: "Cancellations",
      statCards,
      appliedFilters,
      data: filtered,
      columns: flightCancellationQueriesExportTemplate,
      filenamePrefix: "flight_cancellation_queries_export",
      emptyMessage: "No flight cancellation queries available to export",
      successMessage: "Flight cancellation queries exported",
    });
  };

  const fmt = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—";

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Open"
          value={statusCounts.OPEN}
          Icon={FiAlertCircle}
          borderCls="border-blue-500"
          iconBgCls="bg-blue-50"
          iconColorCls="text-blue-600"
        />
        <StatCard
          label="In Progress"
          value={statusCounts.IN_PROGRESS}
          Icon={FiClock}
          borderCls="border-amber-500"
          iconBgCls="bg-amber-50"
          iconColorCls="text-amber-600"
        />
        <StatCard
          label="Resolved"
          value={statusCounts.RESOLVED}
          Icon={FiCheckCircle}
          borderCls="border-emerald-500"
          iconBgCls="bg-emerald-50"
          iconColorCls="text-emerald-600"
        />
        <StatCard
          label="Rejected"
          value={statusCounts.REJECTED}
          Icon={FiXCircle}
          borderCls="border-rose-500"
          iconBgCls="bg-rose-50"
          iconColorCls="text-rose-600"
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-6 border shadow-sm" style={{ borderColor: "#e2e8f0" }}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-5">
          <LabeledInput label="Search">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Query ID / Employee..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border rounded-xl text-[13px] font-medium outline-none transition-all focus:border-[#003399] focus:ring-2 focus:ring-[#003399]/10 bg-slate-50 hover:bg-white"
              />
            </div>
          </LabeledInput>
          <LabeledInput label="Status">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm outline-none bg-slate-50 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              {QUERY_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
              ))}
            </select>
          </LabeledInput>
          <LabeledInput label="Priority">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm outline-none bg-slate-50 cursor-pointer"
            >
              <option value="ALL">All Priorities</option>
              {QUERY_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </LabeledInput>
          <LabeledInput label="Booking From">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className={FILTER_DATE_INPUT_CLASS}
            />
          </LabeledInput>
          <LabeledInput label="Booking To">
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className={FILTER_DATE_INPUT_CLASS}
            />
          </LabeledInput>
          <LabeledInput label="Requested Date">
            <input
              type="date"
              value={requestedDate}
              onChange={(e) => setRequestedDate(e.target.value)}
              className={FILTER_DATE_INPUT_CLASS}
            />
          </LabeledInput>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="font-black text-slate-700 uppercase tracking-tighter text-lg flex items-center gap-2">
            <FiMessageSquare size={18} className="text-[#003399]" />
            Queries
          </h2>
          <TableActionBar
            scrollRef={tableScrollRef}
            exportLabel="Export"
            onExport={handleExport}
            exportDisabled={loadingCancellationQueries || isExporting}
            exportLoading={isExporting}
            exportClassName="bg-[#003399] hover:bg-[#000d26] shadow-[#003399]/20"
            arrowClassName="border-[#003399]/20 bg-[#003399]/5 text-[#003399] hover:bg-[#003399]/10 hover:border-[#003399]/30 disabled:hover:bg-[#003399]/5"
          />
        </div>

        <div ref={tableScrollRef} className="overflow-x-auto">
          {loadingCancellationQueries ? (
            <div className="p-10 text-center text-sm text-slate-400">
              Loading queries...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-400">
              No cancellation queries found.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-[#003399] to-[#000d26] text-white">
                  {[
                    "Query ID",
                    "Order ID",
                    "Company / Employee",
                    "Airline Details",
                    "PNR",
                    "Travel Date",
                    "Priority",
                    "Status",
                    "Requested On",
                    "Total Fare",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-4 text-[11px] font-bold uppercase tracking-widest whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {paginatedQueries.map((q) => (
                  <QueryRow
                    key={q._id || q.queryId}
                    query={q}
                    fmt={fmt}
                    onView={() => setSelectedQuery(q)}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-white">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Page {currentPage} of {totalPages}
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
            showFirstLast
          />
        </div>
      </div>

      {selectedQuery && (
        <QueryDetailModal
          query={selectedQuery}
          onClose={() => setSelectedQuery(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// QUERY ROW
// ─────────────────────────────────────────────

function QueryRow({ query, fmt, onView }) {
  const isHotel = !!query.bookingSnapshot?.hotelName;

  return (
    <tr className="hover:bg-rose-50/20 transition-all bg-white">
      <td className="px-5 py-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
        {query.queryId || query._id || "—"}
      </td>
      <td className="px-5 py-4">
        <span className="font-mono text-[12px] font-bold text-slate-700">
          {query.orderId || "—"}
        </span>
      </td>
      <td className="px-5 py-4">
        <div className="flex flex-col">
          <span className="font-bold text-slate-800 text-[13px]">
            {query.corporate?.companyName || "—"}
          </span>
          <span className="text-[11px] text-slate-400">
            {query.corporate?.employeeEmail || query.user?.email || "—"}
          </span>
        </div>
      </td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-2">
          {!isHotel && (
            <img
              src={airlineLogo(query.bookingSnapshot?.airlineCode || query.bookingSnapshot?.airline)}
              alt="Airline Logo"
              className="w-7 h-7 rounded-md object-contain bg-slate-50 border border-slate-100 flex-shrink-0"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
          )}
          <div className="flex flex-col">
            <span className="text-[12px] font-semibold text-slate-700 truncate max-w-[150px]" title={isHotel ? query.bookingSnapshot?.hotelName : (query.bookingSnapshot?.sectors?.[0]?.airline + " / " + query.bookingSnapshot?.sectors?.[0]?.flightNumber)}>
              {isHotel ? query.bookingSnapshot?.hotelName : (query.bookingSnapshot?.sectors?.[0]?.airline)}
            </span>
            <span className="font-mono text-[10px] text-slate-400">
              {isHotel 
                ? query.bookingSnapshot?.roomType 
                : query.bookingSnapshot?.sectors?.length
                  ? `${query.bookingSnapshot.sectors[0].origin} → ${query.bookingSnapshot.sectors[query.bookingSnapshot.sectors.length - 1].destination}`
                  : "—"}
            </span>
          </div>
        </div>
      </td>
      <td className="px-5 py-4 font-mono text-[11px] text-slate-700 font-bold whitespace-nowrap">
        {query.bookingSnapshot?.pnr || "—"}
      </td>
      <td className="px-5 py-4 text-[12px] text-slate-600 whitespace-nowrap">
        {isHotel ? (
          <>
            <div>{fmt(query.bookingSnapshot?.checkInDate)}</div>
            <div className="text-[10px] text-slate-400">to {fmt(query.bookingSnapshot?.checkOutDate)}</div>
          </>
        ) : (
          fmt(query.bookingSnapshot?.sectors?.[0]?.departureTime)
        )}
      </td>
      <td className="px-5 py-4">
        <span
          className={`px-2 py-1 rounded-full text-[10px] font-black uppercase border ${PRIORITY_STYLES[query.priority] || PRIORITY_STYLES.MEDIUM}`}
        >
          {query.priority || "MEDIUM"}
        </span>
      </td>
      {/* FIX 2: Added whitespace-nowrap so "IN PROGRESS" never wraps to two lines */}
      <td className="px-5 py-4">
        <span
          className={`inline-flex items-center px-3 py-1.5 rounded-full text-[10px] font-black uppercase border whitespace-nowrap ${STATUS_STYLES[query.status] || STATUS_STYLES.OPEN}`}
        >
          {(query.status || "OPEN").replace("_", " ")}
        </span>
      </td>
      <td className="px-5 py-4 text-[11px] text-slate-500 whitespace-nowrap">
        {fmt(query.requestedAt)}
      </td>
      <td className="px-5 py-4 font-bold text-slate-800 text-[12px] whitespace-nowrap">
        {query.bookingSnapshot?.totalFare != null
          ? `₹${Number(query.bookingSnapshot.totalFare).toLocaleString()}`
          : "—"}
      </td>
      <td className="px-5 py-4">
        <button
          onClick={onView}
          className="p-3 rounded-xl transition-all shadow-sm hover:shadow-md bg-gradient-to-br from-[#003399] to-[#000d26] hover:from-white hover:to-white group"
          title="View details"
        >
          <FiArrowRight
            size={16}
            className="text-[#E7C695] group-hover:text-[#000d26] transition-colors"
          />
        </button>
      </td>
    </tr>
  );
}



// ─────────────────────────────────────────────
// MAIN DASHBOARD
// ─────────────────────────────────────────────

export default function CancellationQueries() {
  const [activeTab, setActiveTab] = useState("Flight");
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Trigger re-fetching for the current tab. In a real scenario, you might dispatch fetchCancellationQueries here.
    dispatch(fetchCancellationQueries()).finally(() => {
      setTimeout(() => setIsRefreshing(false), 500); // UI feedback
    });
  };

  return (
    <div className="min-h-screen font-sans pb-20 -mt-6 -mx-4 md:-mx-6" style={{ background: "#f8fafc" }}>
      {/* ── Navy Gradient Header ── */}
      <div className="w-full bg-gradient-to-br from-[#003399] to-[#000d26] text-white pt-8 pb-20 px-6 md:px-10">
        <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-8">
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
                className={`p-3 rounded-xl bg-white/10 transition-all border border-white/10 ${isRefreshing ? "opacity-50 cursor-not-allowed" : "hover:bg-white/20"}`}
                disabled={isRefreshing}
              >
                <div className={isRefreshing ? "animate-spin" : ""}>
                  <FiRefreshCw size={20} />
                </div>
              </button>
            </div>

            <div className="h-12 w-[1px] bg-white/10 mx-2 hidden md:block" />

            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl text-white border border-white/10 bg-white/10">
                <FiList size={28} />
              </div>
              <div>
                <h1 className="text-3xl font-black text-white tracking-tight leading-none">
                  Cancellations
                </h1>
                <p className="text-[10px] text-white/60 mt-2 font-bold uppercase tracking-[2px]">
                  Manage cancellation queries
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 md:px-10 -mt-10 space-y-10">
        <CancellationQueryTab />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SHARED COMPONENTS
// ─────────────────────────────────────────────

function StatCard({ label, value, iconBgCls, iconColorCls, borderCls, Icon }) {
  return (
    <div className={`bg-white rounded-2xl p-6 border-b-4 ${borderCls} shadow-sm flex items-center justify-between`}>
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
        <h3 className="text-3xl font-black text-slate-800">{value}</h3>
      </div>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBgCls}`}>
        <Icon size={24} className={iconColorCls} />
      </div>
    </div>
  );
}

function LabeledInput({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
        {label}
      </label>
      {children}
    </div>
  );
}
