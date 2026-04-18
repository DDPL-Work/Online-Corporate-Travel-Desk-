import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  FiSearch,
  FiDownload,
  FiEye,
  FiDollarSign,
  FiXCircle,
  FiRotateCcw,
  FiAlertCircle,
  FiTrash2,
  FiMessageSquare,
  FiChevronDown,
  FiX,
  FiClock,
  FiCheckCircle,
} from "react-icons/fi";
import { FaPlane, FaHotel } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchCancellationQueries,
  updateCancellationQueryStatus,
} from "../../Redux/Actions/corporate.related.thunks";
import Pagination from "../Shared/Pagination";
import {
  FlightBookingModal,
  HotelBookingModal,
} from "../Shared/BookingRequestDetailsModal";

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

const QUERY_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "REJECTED"];
const QUERY_PRIORITIES = ["LOW", "MEDIUM", "HIGH"];

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

const normalizeFlight = (b = {}) => {
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
    refundStatus: b.refundStatus || "Pending",
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

const normalizeHotel = (b = {}) => {
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
    refundStatus: b.refundStatus || "Pending",
    amendmentType: amendment.type || lastHistory.type || "",
    amendmentStatus: amendment.status || lastHistory.status || "",
    changeRequestId:
      amendment.changeRequestId || lastHistory.changeRequestId || "",
  };
};

// ─────────────────────────────────────────────
// QUERY DETAIL MODAL
// ─────────────────────────────────────────────

function QueryDetailModal({ query, onClose, onStatusChange }) {
  const [status, setStatus] = useState(query.status || "OPEN");
  const [resolutionMsg, setResolutionMsg] = useState(
    query.resolution?.message || "",
  );
  const [refundAmount, setRefundAmount] = useState(
    query.resolution?.refundAmount || "",
  );
  const [cancelCharge, setCancelCharge] = useState(
    query.resolution?.cancellationCharge || "",
  );
  const [creditNoteNo, setCreditNoteNo] = useState(
    query.resolution?.creditNoteNo || "",
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onStatusChange(query._id || query.queryId, {
      status,
      resolution: {
        message: resolutionMsg,
        refundAmount: Number(refundAmount) || 0,
        cancellationCharge: Number(cancelCharge) || 0,
        creditNoteNo,
        resolvedAt:
          status === "RESOLVED" ? new Date().toISOString() : undefined,
      },
    });
    setSaving(false);
    onClose();
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
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
              Cancellation Query
            </p>
            <h2 className="text-lg font-black text-slate-900 leading-none">
              {query.queryId || query._id || "—"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500"
          >
            <FiX size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Booking Info */}
          <section>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
              Booking Details
            </p>
            <div className="grid grid-cols-2 gap-3">
              <InfoCell
                label="Booking Ref"
                value={query.bookingReference || "—"}
              />
              <InfoCell
                label="Journey Type"
                value={query.bookingSnapshot?.journeyType || "—"}
              />
              <InfoCell
                label="Travel Date"
                value={fmt(query.bookingSnapshot?.travelDate)}
              />
              <InfoCell
                label="Return Date"
                value={fmt(query.bookingSnapshot?.returnDate)}
              />
              <InfoCell
                label="Airline / PNR"
                value={`${query.bookingSnapshot?.airline || "—"} / ${query.bookingSnapshot?.pnr || "—"}`}
              />
              <InfoCell label="Requested On" value={fmt(query.requestedAt)} />
            </div>
          </section>

          {/* Fare Breakdown */}
          <section>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
              Fare Breakdown
            </p>
            <div className="bg-slate-50 rounded-xl p-4 grid grid-cols-2 gap-2 text-sm">
              {[
                ["Total Fare", query.bookingSnapshot?.totalFare],
                ["Base Fare", query.bookingSnapshot?.baseFare],
                ["Taxes", query.bookingSnapshot?.taxes],
                ["Service Fee", query.bookingSnapshot?.serviceFee],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between">
                  <span className="text-slate-500 text-[12px]">{l}</span>
                  <span className="font-bold text-slate-800 text-[12px]">
                    {v != null ? `₹${Number(v).toLocaleString()}` : "—"}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Corporate */}
          <section>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
              Corporate & Employee
            </p>
            <div className="grid grid-cols-2 gap-3">
              <InfoCell
                label="Company"
                value={query.corporate?.companyName || "—"}
              />
              <InfoCell
                label="Employee"
                value={query.corporate?.employeeName || "—"}
              />
              <InfoCell
                label="Email"
                value={query.corporate?.employeeEmail || "—"}
              />
              <InfoCell
                label="Employee ID"
                value={query.corporate?.employeeId || "—"}
              />
            </div>
          </section>

          {/* Sectors */}
          {query.bookingSnapshot?.sectors?.length > 0 && (
            <section>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                Sectors
              </p>
              <div className="space-y-2">
                {query.bookingSnapshot.sectors.map((s, i) => (
                  <div
                    key={i}
                    className="bg-slate-50 rounded-xl p-3 flex items-center justify-between text-sm"
                  >
                    <div>
                      <p className="font-black text-slate-800">
                        {s.origin} → {s.destination}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {s.airline} · {s.flightNumber}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-slate-500">
                        {s.departureTime ? fmt(s.departureTime) : "—"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Passengers */}
          {query.passengers?.length > 0 && (
            <section>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                Passengers
              </p>
              <div className="space-y-2">
                {query.passengers.map((p, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3"
                  >
                    <div>
                      <p className="font-bold text-slate-800 text-sm">
                        {p.name || "—"}
                      </p>
                      <p className="text-[11px] text-slate-400 uppercase">
                        {p.type || "—"}
                      </p>
                    </div>
                    <span className="font-mono text-[11px] text-slate-500">
                      {p.ticketNumber || "—"}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Remarks */}
          {query.remarks && (
            <section>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                Remarks
              </p>
              <p className="text-sm text-slate-700 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                {query.remarks}
              </p>
            </section>
          )}

          {/* Status Update */}
          <section className="border-t border-slate-100 pt-5">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
              Update Status
            </p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <LabeledInput label="Status">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none bg-slate-50 cursor-pointer"
                >
                  {QUERY_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </LabeledInput>
              <LabeledInput label="Credit Note No.">
                <input
                  type="text"
                  value={creditNoteNo}
                  onChange={(e) => setCreditNoteNo(e.target.value)}
                  placeholder="e.g. CN-2024-001"
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none bg-slate-50"
                />
              </LabeledInput>
              <LabeledInput label="Refund Amount (₹)">
                <input
                  type="number"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none bg-slate-50"
                />
              </LabeledInput>
              <LabeledInput label="Cancellation Charge (₹)">
                <input
                  type="number"
                  value={cancelCharge}
                  onChange={(e) => setCancelCharge(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none bg-slate-50"
                />
              </LabeledInput>
            </div>
            <LabeledInput label="Resolution Message">
              <textarea
                value={resolutionMsg}
                onChange={(e) => setResolutionMsg(e.target.value)}
                rows={3}
                placeholder="Describe the resolution or reason for rejection..."
                className="w-full px-3 py-2 border rounded-lg text-sm outline-none bg-slate-50 resize-none"
              />
            </LabeledInput>
          </section>

          {/* Logs */}
          {query.logs?.length > 0 && (
            <section>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                Activity Log
              </p>
              <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                {[...query.logs].reverse().map((log, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 text-sm py-2 border-b border-slate-50"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-slate-700 font-medium">
                        {log.message || log.action}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {log.by && `by ${log.by} · `}
                        {log.at ? new Date(log.at).toLocaleString("en-IN") : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Save */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 rounded-lg bg-rose-700 text-white text-sm font-bold shadow hover:bg-rose-800 transition-colors disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// CANCELLATION QUERY TAB
// ─────────────────────────────────────────────

function CancellationQueryTab() {
  const dispatch = useDispatch();
  const {
    cancellationQueries,
    cancellationQueryPagination,
    loadingCancellationQueries,
  } = useSelector((state) => state.corporateRelated);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [selectedQuery, setSelectedQuery] = useState(null);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, search]);

  useEffect(() => {
    const params = { page, limit: 10 };
    if (statusFilter !== "ALL") params.status = statusFilter;
    if (search) params.bookingReference = search; // API allows bookingReference

    dispatch(fetchCancellationQueries(params));
  }, [page, statusFilter, search, dispatch]);

  const queries = useMemo(
    () => cancellationQueries || [],
    [cancellationQueries],
  );

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
            .includes(search.toLowerCase());
        return matchStatus && matchPriority && matchSearch;
      }),
    [queries, statusFilter, priorityFilter, search],
  );

  const totalPages =
    cancellationQueryPagination?.totalPages ||
    Math.max(
      1,
      Math.ceil(
        (cancellationQueryPagination?.total || filtered.length || 0) / 10,
      ),
    );
  const currentPage = cancellationQueryPagination?.page || page;

  const handleStatusChange = useCallback(
    async (id, payload) => {
      await dispatch(updateCancellationQueryStatus({ id, ...payload }));
      dispatch(fetchCancellationQueries({ page, limit: 10 }));
    },
    [dispatch, page],
  );

  const statusCounts = useMemo(() => {
    const counts = { OPEN: 0, IN_PROGRESS: 0, RESOLVED: 0, REJECTED: 0 };
    queries.forEach((q) => {
      if (counts[q.status] !== undefined) counts[q.status]++;
    });
    return counts;
  }, [queries]);

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
      <div className="bg-white rounded-xl shadow-sm p-5 border border-slate-100">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <LabeledInput label="Search">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Query ID / Employee..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm outline-none bg-slate-50"
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
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="font-black text-slate-700 uppercase tracking-tighter text-lg flex items-center gap-2">
            <FiMessageSquare size={18} className="text-rose-600" />
            Query List
          </h2>
          <button className="flex items-center gap-2 px-4 py-2 bg-rose-700 text-white rounded-lg text-xs font-bold shadow-md uppercase">
            <FiDownload /> Export Queries
          </button>
        </div>

        <div className="overflow-x-auto">
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
                <tr className="bg-slate-800">
                  {[
                    "Query ID",
                    "Corporate / Employee",
                    "Airline / PNR",
                    "Travel Date",
                    "Total Fare",
                    "Priority",
                    "Status",
                    "Requested On",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-4 text-[11px] font-bold text-slate-300 uppercase tracking-widest whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filtered.map((q) => (
                  <QueryRow
                    key={q._id || q.queryId}
                    query={q}
                    fmt={fmt}
                    onView={() => setSelectedQuery(q)}
                    onStatusChange={handleStatusChange}
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
// QUERY ROW (inline status dropdown)
// ─────────────────────────────────────────────

function QueryRow({ query, fmt, onView, onStatusChange }) {
  const [status, setStatus] = useState(query.status || "OPEN");
  const [updating, setUpdating] = useState(false);

  const handleStatusChange = async (newStatus) => {
    setStatus(newStatus);
    setUpdating(true);
    await onStatusChange(query._id || query.queryId, { status: newStatus });
    setUpdating(false);
  };

  return (
    <tr className="hover:bg-rose-50/20 transition-all bg-white">
      <td className="px-5 py-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
        {query.queryId || query._id || "—"}
      </td>
     
      <td className="px-5 py-4">
        <div className="flex flex-col">
          <span className="font-bold text-slate-800 text-[13px]">
            {query.corporate?.companyName || "—"}
          </span>
          <span className="text-[11px] text-slate-400">
            {query.user?.email || "—"}
          </span>
        </div>
      </td>
      <td className="px-5 py-4">
        <div className="flex flex-col">
          <span className="text-[12px] font-semibold text-slate-700">
            {query.bookingSnapshot.sectors[0].airline + " / " + query.bookingSnapshot.sectors[0].flightNumber || "—"}
          </span>
          <span className="font-mono text-[10px] text-slate-400">
            {query.bookingSnapshot?.pnr || "—"}
          </span>
        </div>
      </td>
      <td className="px-5 py-4 text-[12px] text-slate-600 whitespace-nowrap">
        {fmt(query.bookingSnapshot.sectors[0].departureTime)}
      </td>
      <td className="px-5 py-4 font-bold text-slate-800 text-[12px] whitespace-nowrap">
        {query.bookingSnapshot?.totalFare != null
          ? `₹${Number(query.bookingSnapshot.totalFare).toLocaleString()}`
          : "—"}
      </td>
      <td className="px-5 py-4">
        <span
          className={`px-2 py-1 rounded-full text-[10px] font-black uppercase border ${PRIORITY_STYLES[query.priority] || PRIORITY_STYLES.MEDIUM}`}
        >
          {query.priority || "MEDIUM"}
        </span>
      </td>
      <td className="px-5 py-4">
        <div className="relative">
          <select
            value={status}
            disabled={updating}
            onChange={(e) => handleStatusChange(e.target.value)}
            className={`appearance-none px-2 py-1 pr-6 rounded-full text-[10px] font-black uppercase border cursor-pointer outline-none ${STATUS_STYLES[status] || STATUS_STYLES.OPEN} ${updating ? "opacity-50" : ""}`}
            style={{ backgroundImage: "none" }}
          >
            {QUERY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
          <FiChevronDown
            size={10}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60"
          />
        </div>
      </td>
      <td className="px-5 py-4 text-[11px] text-slate-500 whitespace-nowrap">
        {fmt(query.requestedAt)}
      </td>
      <td className="px-5 py-4">
        <button
          onClick={onView}
          className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-700 transition-colors"
          title="View Details"
        >
          <FiEye size={15} />
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

  return (
    <div className="min-h-screen p-6 font-sans bg-slate-50">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-700 to-rose-500 flex items-center justify-center shadow-lg text-white">
            <FiXCircle size={24} />
          </div>
          <div className="text-left">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">
              Cancellation Archive
            </h1>
            <p className="text-xs text-rose-600 mt-1 font-bold uppercase tracking-widest">
              Super Admin Monitor
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-end gap-1 border-b-2 border-slate-200">
          {[
            {
              key: "Flight",
              icon: <FiMessageSquare size={14} />,
              label: "Flight Cancellation Queries",
            },
            {
              key: "Hotel",
              icon: <FiMessageSquare size={14} />,
              label: "Hotel Cancellation Queries",
            },
          ].map(({ key, icon, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-8 py-3 text-[13px] font-bold transition-all border-b-2 -mb-0.5 rounded-t-lg ${
                activeTab === key
                  ? "bg-white text-rose-700 border-b-rose-700 shadow-sm"
                  : "text-slate-400 border-transparent hover:text-slate-600"
              }`}
            >
              {icon} {label}
            </button>
          ))}
        </div>

        {/* Query Tab */}
        {activeTab === "Flight" && <CancellationQueryTab />}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SHARED COMPONENTS
// ─────────────────────────────────────────────

function StatCard({ label, value, iconBgCls, iconColorCls, borderCls, Icon }) {
  return (
    <div
      className={`bg-white rounded-xl p-4 flex items-center gap-3 shadow-sm border-l-4 ${borderCls}`}
    >
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBgCls}`}
      >
        <Icon size={18} className={iconColorCls} />
      </div>
      <div className="text-left">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
          {label}
        </p>
        <p className="text-xl font-black text-slate-900 leading-none">
          {value}
        </p>
      </div>
    </div>
  );
}

function LabeledInput({ label, children }) {
  return (
    <div className="flex flex-col gap-1 text-left">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
        {label}
      </label>
      {children}
    </div>
  );
}

function InfoCell({ label, value }) {
  return (
    <div className="bg-slate-50 rounded-xl px-4 py-3">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
        {label}
      </p>
      <p className="text-[13px] font-bold text-slate-800">{value || "—"}</p>
    </div>
  );
}
