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
// DUMMY HOTEL CANCELLATION QUERIES
// ─────────────────────────────────────────────
const DUMMY_HOTEL_QUERIES = [
  { _id: "h001", queryId: "HCQ-001", status: "OPEN",        priority: "HIGH",   requestedAt: "2026-04-10T09:30:00Z", corporate: { companyName: "Acme Corp", employeeName: "Ravi Kumar",   employeeEmail: "ravi@acme.com"   }, bookingSnapshot: { hotelName: "The Leela Palace",    checkInDate: "2026-04-15", checkOutDate: "2026-04-18", totalFare: 42000, roomType: "Deluxe Suite"   }, remarks: "Urgent cancellation due to client meeting cancelled." },
  { _id: "h002", queryId: "HCQ-002", status: "IN_PROGRESS", priority: "MEDIUM", requestedAt: "2026-04-11T11:00:00Z", corporate: { companyName: "TechStar Pvt", employeeName: "Priya Sharma",  employeeEmail: "priya@ts.com"    }, bookingSnapshot: { hotelName: "Taj Mahal Hotel",      checkInDate: "2026-04-20", checkOutDate: "2026-04-22", totalFare: 28000, roomType: "Executive Room" }, remarks: "Guest unable to travel — visa issue." },
  { _id: "h003", queryId: "HCQ-003", status: "RESOLVED",   priority: "LOW",    requestedAt: "2026-04-08T14:15:00Z", corporate: { companyName: "GlobalLink",   employeeName: "Anjali Verma",   employeeEmail: "anjali@gl.com"   }, bookingSnapshot: { hotelName: "ITC Grand Bharat",    checkInDate: "2026-04-12", checkOutDate: "2026-04-14", totalFare: 19500, roomType: "Superior Room"  }, remarks: "Refund processed successfully." },
  { _id: "h004", queryId: "HCQ-004", status: "OPEN",        priority: "HIGH",   requestedAt: "2026-04-12T08:00:00Z", corporate: { companyName: "Synergy Ltd",  employeeName: "Mohan Das",      employeeEmail: "mohan@synergy.com" }, bookingSnapshot: { hotelName: "Oberoi Trident",      checkInDate: "2026-04-25", checkOutDate: "2026-04-27", totalFare: 35000, roomType: "Ocean View Suite"}, remarks: "Flight cancelled, need hotel refund." },
  { _id: "h005", queryId: "HCQ-005", status: "REJECTED",   priority: "LOW",    requestedAt: "2026-04-07T16:45:00Z", corporate: { companyName: "BrightPath",   employeeName: "Sunita Patel",   employeeEmail: "sunita@bp.com"   }, bookingSnapshot: { hotelName: "Hyatt Regency",       checkInDate: "2026-04-10", checkOutDate: "2026-04-11", totalFare: 8500,  roomType: "Standard Room"  }, remarks: "Cancellation requested after check-in." },
  { _id: "h006", queryId: "HCQ-006", status: "IN_PROGRESS", priority: "HIGH",   requestedAt: "2026-04-13T10:30:00Z", corporate: { companyName: "NovaTech",     employeeName: "Karan Mehta",    employeeEmail: "karan@nova.com"  }, bookingSnapshot: { hotelName: "Marriott Mumbai",     checkInDate: "2026-04-28", checkOutDate: "2026-05-01", totalFare: 55000, roomType: "Presidential"   }, remarks: "Conference event postponed." },
  { _id: "h007", queryId: "HCQ-007", status: "OPEN",        priority: "MEDIUM", requestedAt: "2026-04-14T07:20:00Z", corporate: { companyName: "Acme Corp",    employeeName: "Deepak Raj",     employeeEmail: "deepak@acme.com" }, bookingSnapshot: { hotelName: "Sheraton Grand",      checkInDate: "2026-04-30", checkOutDate: "2026-05-02", totalFare: 22000, roomType: "Club Room"      }, remarks: "Internal policy change." },
  { _id: "h008", queryId: "HCQ-008", status: "RESOLVED",   priority: "MEDIUM", requestedAt: "2026-04-09T13:00:00Z", corporate: { companyName: "PearlGate",    employeeName: "Nisha Jain",     employeeEmail: "nisha@pg.com"    }, bookingSnapshot: { hotelName: "Radisson Blu",        checkInDate: "2026-04-17", checkOutDate: "2026-04-19", totalFare: 16000, roomType: "Business Room"  }, remarks: "Credit note issued." },
  { _id: "h009", queryId: "HCQ-009", status: "OPEN",        priority: "LOW",    requestedAt: "2026-04-15T09:00:00Z", corporate: { companyName: "SkyLane",      employeeName: "Arjun Singh",    employeeEmail: "arjun@sl.com"    }, bookingSnapshot: { hotelName: "Crowne Plaza",        checkInDate: "2026-05-05", checkOutDate: "2026-05-07", totalFare: 13000, roomType: "Deluxe Room"    }, remarks: "Medical emergency." },
  { _id: "h010", queryId: "HCQ-010", status: "IN_PROGRESS", priority: "HIGH",   requestedAt: "2026-04-16T11:45:00Z", corporate: { companyName: "CoreEdge",     employeeName: "Meena Bose",     employeeEmail: "meena@ce.com"    }, bookingSnapshot: { hotelName: "Four Seasons Delhi",  checkInDate: "2026-05-10", checkOutDate: "2026-05-12", totalFare: 48000, roomType: "Luxury Suite"   }, remarks: "Budget freeze by management." },
  { _id: "h011", queryId: "HCQ-011", status: "OPEN",        priority: "MEDIUM", requestedAt: "2026-04-17T08:30:00Z", corporate: { companyName: "DataAxis",     employeeName: "Rahul Gupta",    employeeEmail: "rahul@da.com"    }, bookingSnapshot: { hotelName: "JW Marriott Pune",    checkInDate: "2026-05-15", checkOutDate: "2026-05-17", totalFare: 31000, roomType: "Superior Suite"  }, remarks: "Project site changed." },
  { _id: "h012", queryId: "HCQ-012", status: "REJECTED",   priority: "LOW",    requestedAt: "2026-04-06T15:00:00Z", corporate: { companyName: "FinServe",     employeeName: "Pooja Iyer",     employeeEmail: "pooja@fs.com"    }, bookingSnapshot: { hotelName: "Novotel Hyderabad",   checkInDate: "2026-04-09", checkOutDate: "2026-04-10", totalFare: 7200,  roomType: "Standard Room"  }, remarks: "Late cancellation — charges applied." },
];

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

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, search, fromDate, toDate, requestedDate]);

  // Fetch all data at once (no API pagination)
  useEffect(() => {
    dispatch(fetchCancellationQueries());
  }, [dispatch]);

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
      await dispatch(updateCancellationQueryStatus({ id, ...payload }));
      dispatch(fetchCancellationQueries());
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
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
          <LabeledInput label="From Date">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm outline-none bg-slate-50"
            />
          </LabeledInput>
          <LabeledInput label="To Date">
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm outline-none bg-slate-50"
            />
          </LabeledInput>
          <LabeledInput label="Requested Date">
            <input
              type="date"
              value={requestedDate}
              onChange={(e) => setRequestedDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm outline-none bg-slate-50"
            />
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
                {paginatedQueries.map((q) => (
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

// ─────────────────────────────────────────────
// HOTEL CANCELLATION QUERY TAB (dummy data)
// ─────────────────────────────────────────────

function HotelCancellationQueryTab() {
  const [search, setSearch]               = useState("");
  const [statusFilter, setStatusFilter]   = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [fromDate, setFromDate]           = useState("");
  const [toDate, setToDate]               = useState("");
  const [requestedDate, setRequestedDate] = useState("");
  const [page, setPage]                   = useState(1);
  const [selectedQuery, setSelectedQuery] = useState(null);

  useEffect(() => { setPage(1); }, [statusFilter, search, fromDate, toDate, requestedDate]);

  const fmt = (d) =>
    d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  const filtered = useMemo(() =>
    DUMMY_HOTEL_QUERIES.filter((q) => {
      const matchStatus   = statusFilter   === "ALL" || q.status   === statusFilter;
      const matchPriority = priorityFilter === "ALL" || q.priority === priorityFilter;
      const matchSearch   =
        !search ||
        (q.queryId || "").toLowerCase().includes(search.toLowerCase()) ||
        (q.corporate?.companyName  || "").toLowerCase().includes(search.toLowerCase()) ||
        (q.corporate?.employeeName || "").toLowerCase().includes(search.toLowerCase()) ||
        (q.bookingSnapshot?.hotelName || "").toLowerCase().includes(search.toLowerCase());
      const reqAt = q.requestedAt ? new Date(q.requestedAt) : null;
      const matchFrom      = !fromDate      || (reqAt && reqAt >= new Date(fromDate));
      const matchTo        = !toDate        || (reqAt && reqAt <= new Date(toDate + "T23:59:59"));
      const matchRequested = !requestedDate || (q.requestedAt || "").slice(0, 10) === requestedDate;
      return matchStatus && matchPriority && matchSearch && matchFrom && matchTo && matchRequested;
    }),
    [search, statusFilter, priorityFilter, fromDate, toDate, requestedDate],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / 10));
  const paginatedQueries = useMemo(
    () => filtered.slice((page - 1) * 10, page * 10),
    [filtered, page],
  );

  const statusCounts = useMemo(() => {
    const counts = { OPEN: 0, IN_PROGRESS: 0, RESOLVED: 0, REJECTED: 0 };
    DUMMY_HOTEL_QUERIES.forEach((q) => { if (counts[q.status] !== undefined) counts[q.status]++; });
    return counts;
  }, []);

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Open"        value={statusCounts.OPEN}        Icon={FiAlertCircle}  borderCls="border-blue-500"    iconBgCls="bg-blue-50"    iconColorCls="text-blue-600" />
        <StatCard label="In Progress" value={statusCounts.IN_PROGRESS} Icon={FiClock}        borderCls="border-amber-500"   iconBgCls="bg-amber-50"   iconColorCls="text-amber-600" />
        <StatCard label="Resolved"    value={statusCounts.RESOLVED}    Icon={FiCheckCircle}  borderCls="border-emerald-500" iconBgCls="bg-emerald-50" iconColorCls="text-emerald-600" />
        <StatCard label="Rejected"    value={statusCounts.REJECTED}    Icon={FiXCircle}      borderCls="border-rose-500"    iconBgCls="bg-rose-50"    iconColorCls="text-rose-600" />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-5 border border-slate-100">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <LabeledInput label="Search">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Hotel / Company / ID..." value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm outline-none bg-slate-50" />
            </div>
          </LabeledInput>
          <LabeledInput label="Status">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm outline-none bg-slate-50 cursor-pointer">
              <option value="ALL">All Statuses</option>
              {QUERY_STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
            </select>
          </LabeledInput>
          <LabeledInput label="Priority">
            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm outline-none bg-slate-50 cursor-pointer">
              <option value="ALL">All Priorities</option>
              {QUERY_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </LabeledInput>
          <LabeledInput label="From Date">
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm outline-none bg-slate-50" />
          </LabeledInput>
          <LabeledInput label="To Date">
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm outline-none bg-slate-50" />
          </LabeledInput>
          <LabeledInput label="Requested Date">
            <input type="date" value={requestedDate} onChange={(e) => setRequestedDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm outline-none bg-slate-50" />
          </LabeledInput>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="font-black text-slate-700 uppercase tracking-tighter text-lg flex items-center gap-2">
            <FiMessageSquare size={18} className="text-teal-600" />
            Hotel Query List
          </h2>
          <button className="flex items-center gap-2 px-4 py-2 bg-teal-700 text-white rounded-lg text-xs font-bold shadow-md uppercase">
            <FiDownload /> Export Queries
          </button>
        </div>

        <div className="overflow-x-auto">
          {filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-400">No hotel cancellation queries found.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-teal-800">
                  {["Query ID", "Corporate / Employee", "Hotel Name", "Check-In", "Check-Out", "Room Type", "Total Fare", "Priority", "Status", "Requested On", "Actions"].map((h) => (
                    <th key={h} className="px-5 py-4 text-[11px] font-bold text-teal-100 uppercase tracking-widest whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {paginatedQueries.map((q) => (
                  <tr key={q._id} className="hover:bg-teal-50/20 transition-all bg-white">
                    <td className="px-5 py-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">{q.queryId}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800 text-[13px]">{q.corporate?.companyName || "—"}</span>
                        <span className="text-[11px] text-slate-400">{q.corporate?.employeeName || "—"}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-700 text-[12px] whitespace-nowrap">{q.bookingSnapshot?.hotelName || "—"}</td>
                    <td className="px-5 py-4 text-[12px] text-slate-600 whitespace-nowrap">{fmt(q.bookingSnapshot?.checkInDate)}</td>
                    <td className="px-5 py-4 text-[12px] text-slate-600 whitespace-nowrap">{fmt(q.bookingSnapshot?.checkOutDate)}</td>
                    <td className="px-5 py-4 text-[11px] text-slate-500">{q.bookingSnapshot?.roomType || "—"}</td>
                    <td className="px-5 py-4 font-bold text-slate-800 text-[12px] whitespace-nowrap">
                      {q.bookingSnapshot?.totalFare != null ? `₹${Number(q.bookingSnapshot.totalFare).toLocaleString()}` : "—"}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase border ${PRIORITY_STYLES[q.priority] || PRIORITY_STYLES.MEDIUM}`}>
                        {q.priority || "MEDIUM"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase border ${STATUS_STYLES[q.status] || STATUS_STYLES.OPEN}`}>
                        {(q.status || "OPEN").replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-[11px] text-slate-500 whitespace-nowrap">{fmt(q.requestedAt)}</td>
                    <td className="px-5 py-4">
                      <button onClick={() => setSelectedQuery(q)}
                        className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-teal-50 hover:text-teal-700 transition-colors" title="View Details">
                        <FiEye size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-white">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Page {page} of {totalPages}
          </div>
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} showFirstLast />
        </div>
      </div>

      {/* Detail Modal (reuse QueryDetailModal in view-only mode) */}
      {selectedQuery && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setSelectedQuery(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Hotel Cancellation Query</p>
                <h2 className="text-lg font-black text-slate-900 leading-none">{selectedQuery.queryId}</h2>
              </div>
              <button onClick={() => setSelectedQuery(null)} className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500">
                <FiX size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <InfoCell label="Hotel"      value={selectedQuery.bookingSnapshot?.hotelName} />
                <InfoCell label="Room Type"  value={selectedQuery.bookingSnapshot?.roomType} />
                <InfoCell label="Check-In"   value={fmt(selectedQuery.bookingSnapshot?.checkInDate)} />
                <InfoCell label="Check-Out"  value={fmt(selectedQuery.bookingSnapshot?.checkOutDate)} />
                <InfoCell label="Total Fare" value={selectedQuery.bookingSnapshot?.totalFare != null ? `₹${Number(selectedQuery.bookingSnapshot.totalFare).toLocaleString()}` : "—"} />
                <InfoCell label="Requested"  value={fmt(selectedQuery.requestedAt)} />
                <InfoCell label="Company"    value={selectedQuery.corporate?.companyName} />
                <InfoCell label="Employee"   value={selectedQuery.corporate?.employeeName} />
                <InfoCell label="Email"      value={selectedQuery.corporate?.employeeEmail} />
                <InfoCell label="Priority"   value={selectedQuery.priority} />
              </div>
              {selectedQuery.remarks && (
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Remarks</p>
                  <p className="text-sm text-slate-700 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">{selectedQuery.remarks}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
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
        {activeTab === "Hotel"  && <HotelCancellationQueryTab />}
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
