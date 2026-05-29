// super-admin/src/components/SuperAdminTabs/CancelledBookingsSummary.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiArrowDown,
  FiArrowUp,
  FiDownload,
  FiRefreshCw,
  FiSearch,
  FiXCircle,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiList,
  FiArrowRight,
  FiArrowLeft,
} from "react-icons/fi";
import {
  FaPlane,
  FaHotel,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchFlightCancellations,
  fetchHotelCancellations,
} from "../../Redux/Actions/corporate.related.thunks";
import { fetchCorporates } from "../../Redux/Slice/corporateListSlice";
import Pagination from "../Shared/Pagination";
import useExcelExporter from "../../services/export/useExcelExporter";
import {
  flightCancellationSummaryExportTemplate,
  hotelCancellationSummaryExportTemplate,
} from "../../templates/exportTemplates/superAdminExportTemplates";
import { airlineLogo } from "../../utils/formatter";

// ─── Constants ───────────────────────────────────────────────────────────────
const PAGE_SIZE = 10;
const EMPTY_VALUE = "—";
const STATUS_OPTIONS = [
  "Requested",
  "In Review",
  "Approved",
  "Rejected",
  "Cancelled",
  "Refunded",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatDate = (value) => {
  if (!value) return EMPTY_VALUE;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return EMPTY_VALUE;
  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (value) => {
  if (!value) return EMPTY_VALUE;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return EMPTY_VALUE;
  return parsed.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const dateValue = (value) => {
  const parsed = value ? new Date(value) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed.getTime() : 0;
};

const normalizeText = (value) => String(value || "").toLowerCase();

const joinName = (person = {}) =>
  [person.title, person.firstName, person.lastName].filter(Boolean).join(" ").trim();

const corporateName = (value) => {
  if (!value) return "N/A";
  if (typeof value === "object")
    return value.corporateName || value.companyName || value.name || value.title || "N/A";
  return value;
};

const corporateKey = (value) => {
  if (!value) return "";
  if (typeof value === "object") return value._id || value.id || value.corporateCode || "";
  return value;
};

const statusLabel = (booking = {}, type = "flight") => {
  // ── Highest priority: fully cancelled execution always wins ──────────────
  // executionStatus is set by the system after the cancellation is processed,
  // so it is more authoritative than amendment.status (which stays "approved"
  // even after the booking has been fully cancelled).
  const execStatus = normalizeText(booking.executionStatus || "");
  const bookingStatus = normalizeText(booking.status || "");
  if (execStatus === "cancelled" || bookingStatus === "cancelled") return "Cancelled";

  // ── Remaining priority chain ──────────────────────────────────────────────
  const raw =
    booking.cancellationStatus ||
    booking.cancelStatus ||
    booking.amendment?.status ||
    booking.cancellation?.refundStatus ||
    booking.refundStatus ||
    booking.executionStatus ||
    booking.status ||
    "";
  const value = normalizeText(raw);
  if (value.includes("refund") || value.includes("process")) return "Refunded";
  if (value.includes("reject") || value.includes("fail")) return "Rejected";
  if (value.includes("approved") || value.includes("completed")) return "Approved";
  if (value.includes("cancelled")) return "Cancelled";
  if (value.includes("progress") || value.includes("review")) return "In Review";
  if (value.includes("requested") || value.includes("cancel")) return "Requested";
  return type === "hotel" && booking.amendment?.status === "approved" ? "Approved" : "Requested";
};

const extractChangeRequestId = (booking = {}) => {
  const latestHistory =
    Array.isArray(booking.amendmentHistory) && booking.amendmentHistory.length
      ? booking.amendmentHistory[booking.amendmentHistory.length - 1]
      : {};
  return (
    booking.ChangeRequestId ||
    booking.changeRequestId ||
    booking.cancellationRequestId ||
    booking.cancelRequestId ||
    booking.amendment?.ChangeRequestId ||
    booking.amendment?.changeRequestId ||
    latestHistory?.ChangeRequestId ||
    latestHistory?.changeRequestId ||
    booking.amendment?.response?.[0]?.response?.Response?.TicketCRInfo?.[0]?.ChangeRequestId ||
    latestHistory?.response?.[0]?.response?.Response?.TicketCRInfo?.[0]?.ChangeRequestId ||
    booking.amendment?.providerResponse?.HotelChangeRequestResult?.ChangeRequestId ||
    latestHistory?.providerResponse?.HotelChangeRequestResult?.ChangeRequestId ||
    EMPTY_VALUE
  );
};

const flightRoute = (booking = {}) => {
  const segments = booking.flightRequest?.segments || booking.bookingSnapshot?.segments || [];
  if (Array.isArray(booking.route) && booking.route.length) {
    return booking.route
      .map((sector) =>
        typeof sector === "string"
          ? sector.replace("-", " → ")
          : `${sector.origin || "?"} → ${sector.destination || "?"}`,
      )
      .join(" / ");
  }
  if (Array.isArray(booking.bookingSnapshot?.sectors) && booking.bookingSnapshot.sectors.length) {
    return booking.bookingSnapshot.sectors.map((s) => String(s).replace("-", " → ")).join(" / ");
  }
  if (!segments.length) return booking.route || booking.destination || EMPTY_VALUE;
  return segments
    .map((seg) => {
      const from =
        seg?.origin?.airportCode || seg?.Origin?.Airport?.AirportCode || seg?.from || "?";
      const to =
        seg?.destination?.airportCode || seg?.Destination?.Airport?.AirportCode || seg?.to || "?";
      return `${from} → ${to}`;
    })
    .join(" / ");
};

const firstFlightSegment = (booking = {}) =>
  booking.flightRequest?.segments?.[0] || booking.bookingSnapshot?.segments?.[0] || {};

const normalizeFlight = (booking = {}) => {
  const travellers = Array.isArray(booking.travellers) ? booking.travellers : [];
  const firstSegment = firstFlightSegment(booking);
  const airlineCode =
    booking.airlineDetails?.code ||
    booking.airlineCode ||
    booking.bookingSnapshot?.airlineCode ||
    firstSegment?.airlineCode ||
    firstSegment?.Airline?.AirlineCode ||
    "";
  const airlineName =
    firstSegment?.airlineName ||
    booking.airlineDetails?.name ||
    booking.bookingSnapshot?.airline ||
    firstSegment?.Airline?.AirlineName ||
    airlineCode ||
    "Airline";
  return {
    id: booking._id || booking.id || booking.bookingReference,
    orderId: booking.orderId || booking.bookingReference || EMPTY_VALUE,
    cancellationRequestId: extractChangeRequestId(booking),
    corporate: corporateName(booking.corporateName || booking.corporate || booking.corporateId),
    corporateId: corporateKey(booking.corporateId || booking.corporate),
    people: travellers.length
      ? travellers.map((t) => ({ name: joinName(t) || t.email || "Traveller", email: t.email || EMPTY_VALUE }))
      : Array.isArray(booking.travellerDetails) && booking.travellerDetails.length
        ? booking.travellerDetails.map((t) => ({ name: t.name || t.email || "Traveller", email: t.email || EMPTY_VALUE }))
        : [{ name: booking.employeeName || booking.travellerName || "Traveller", email: booking.employeeEmail || EMPTY_VALUE }],
    route: flightRoute(booking),
    airlineName,
    airlineCode,
    bookedDate: booking.bookedDate || booking.createdAt || booking.approvedAt || booking.ticketedAt || "",
    cancelledDate:
      booking.cancelledAt ||
      booking.cancellationDate ||
      booking.amendment?.createdAt ||
      booking.updatedAt ||
      booking.bookedDate ||
      booking.createdAt ||
      "",
    travelDate:
      booking.bookingSnapshot?.travelDate ||
      firstSegment?.departureDateTime ||
      booking.travelDate ||
      booking.date ||
      "",
    status: statusLabel(booking, "flight"),
    _raw: booking,
  };
};

const normalizeHotel = (booking = {}) => {
  const guests = Array.isArray(booking.travellers) ? booking.travellers : [];
  const hotel = booking.hotelRequest?.selectedHotel || {};
  return {
    id: booking._id || booking.id || booking.bookingReference,
    orderId: booking.orderId || booking.bookingReference || EMPTY_VALUE,
    cancellationRequestId: extractChangeRequestId(booking),
    corporate: corporateName(booking.corporateName || booking.corporate || booking.corporateId),
    corporateId: corporateKey(booking.corporateId || booking.corporate),
    people: guests.length
      ? guests.map((g) => ({ name: joinName(g) || g.email || "Guest", email: g.email || EMPTY_VALUE }))
      : Array.isArray(booking.guestDetails) && booking.guestDetails.length
        ? booking.guestDetails.map((g) => ({ name: g.name || g.email || "Guest", email: g.email || EMPTY_VALUE }))
        : [{ name: booking.employeeName || booking.guestName || "Guest", email: booking.employeeEmail || EMPTY_VALUE }],
    hotelName:
      booking.hotelDetails?.name ||
      booking.bookingSnapshot?.hotelName ||
      hotel.hotelName ||
      booking.hotelName ||
      "Hotel",
    city:
      booking.hotelDetails?.city ||
      booking.bookingSnapshot?.city ||
      hotel.city ||
      booking.hotelRequest?.cityName ||
      booking.city ||
      EMPTY_VALUE,
    hotelImage:
      booking.bookingSnapshot?.hotelImage ||
      booking.hotelDetails?.image ||
      hotel.image ||
      hotel.images?.[0] ||
      booking.hotelImage ||
      "",
    bookedDate: booking.bookedDate || booking.createdAt || booking.approvedAt || booking.voucheredAt || "",
    cancelledDate:
      booking.cancelledAt ||
      booking.cancellationDate ||
      booking.amendment?.createdAt ||
      booking.updatedAt ||
      booking.bookedDate ||
      booking.createdAt ||
      "",
    checkIn:
      booking.bookingSnapshot?.checkInDate ||
      booking.stayDate?.checkIn ||
      booking.hotelRequest?.checkInDate ||
      booking.checkIn ||
      booking.checkInDate ||
      "",
    checkOut:
      booking.bookingSnapshot?.checkOutDate ||
      booking.stayDate?.checkOut ||
      booking.hotelRequest?.checkOutDate ||
      booking.checkOut ||
      booking.checkOutDate ||
      "",
    status: statusLabel(booking, "hotel"),
    _raw: booking,
  };
};

const getSortValue = (row, key) => {
  if (["bookedDate", "cancelledDate", "travelDate", "checkIn", "checkOut"].includes(key)) return dateValue(row[key]);
  return String(row[key] || "");
};

const matchesDateRange = (date, from, to) => {
  const value = dateValue(date);
  if (!value && (from || to)) return false;
  return (!from || value >= new Date(from).getTime()) &&
    (!to || value <= new Date(`${to}T23:59:59`).getTime());
};

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const styles = {
    Requested: "bg-blue-50 text-blue-700 border-blue-200",
    "In Review": "bg-amber-50 text-amber-700 border-amber-200",
    Approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Rejected: "bg-rose-50 text-rose-700 border-rose-200",
    Cancelled: "bg-red-50 text-red-700 border-red-200",
    Refunded: "bg-cyan-50 text-cyan-700 border-cyan-200",
  };
  return (
    <span
      className={`inline-flex px-2.5 py-1 rounded-full border text-[10px] font-black uppercase whitespace-nowrap ${
        styles[status] || styles.Requested
      }`}
    >
      {status}
    </span>
  );
}

// ─── Sort header ──────────────────────────────────────────────────────────────
function SortHeader({ label, sortKey, sort, onSort }) {
  const active = sort.key === sortKey;
  const Icon = sort.direction === "asc" ? FiArrowUp : FiArrowDown;
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className="inline-flex items-center gap-1.5 text-left text-slate-300 hover:text-white transition-colors"
    >
      <span>{label}</span>
      <Icon size={11} className={active ? "opacity-100 text-[#C9A84C]" : "opacity-35"} />
    </button>
  );
}

// ─── Table atoms ──────────────────────────────────────────────────────────────
function TableHead({ children }) {
  return (
    <th className="px-4 xl:px-5 py-4 text-[10px] font-black text-slate-300 uppercase tracking-widest align-middle whitespace-nowrap">
      {children}
    </th>
  );
}

function BodyCell({ children }) {
  return (
    <td className="px-4 xl:px-5 py-4 align-middle text-[12px] text-slate-700">{children}</td>
  );
}

function IdCell({ value, muted = false }) {
  return (
    <td className="px-4 xl:px-5 py-4 align-middle">
      <span
        className={`font-mono text-[11px] font-black truncate block ${
          muted ? "text-slate-500" : "text-[#003399]"
        }`}
      >
        {value || EMPTY_VALUE}
      </span>
    </td>
  );
}

function DateCell({ value }) {
  return (
    <td className="px-4 xl:px-5 py-4 align-middle text-[12px] text-slate-500 font-medium whitespace-nowrap">
      {value || EMPTY_VALUE}
    </td>
  );
}

function PeopleCell({ people }) {
  return (
    <BodyCell>
      <div className="space-y-1.5">
        {people.slice(0, 3).map((person, idx) => (
          <div key={`${person.email}-${idx}`} className="min-w-0">
            <p className="font-bold text-slate-800 truncate text-[12px]">{person.name}</p>
            <p className="text-[10px] text-slate-400 truncate">{person.email}</p>
          </div>
        ))}
        {people.length > 3 && (
          <p className="text-[10px] font-bold text-slate-400">+{people.length - 3} more</p>
        )}
      </div>
    </BodyCell>
  );
}

function ActionCell({ onClick }) {
  return (
    <td className="px-3 py-4 align-middle text-center">
      <button
        type="button"
        onClick={onClick}
        className="w-9 h-9 rounded-xl bg-linea-to-br from-[#003399] to-[#000d26] text-white hover:shadow-lg hover:scale-105 transition-all inline-flex items-center justify-center"
        title="View details"
      >
        <span className="text-sm font-black">→</span>
      </button>
    </td>
  );
}

// ─── Flight table ─────────────────────────────────────────────────────────────
function FlightCancellationTable({ rows, sort, onSort, onView }) {
  return (
    <table className="min-w-300 w-full table-fixed text-left border-collapse">
      <colgroup>
        <col style={{ width: "9%" }} />
        <col style={{ width: "9%" }} />
        <col style={{ width: "13%" }} />
        <col style={{ width: "15%" }} />
        <col style={{ width: "15%" }} />
        <col style={{ width: "14%" }} />
        <col style={{ width: "14%" }} />
        <col style={{ width: "7%" }} />
        <col style={{ width: "4%" }} />
      </colgroup>
      <thead>
        <tr className="bg-linea-to-r from-[#001a66] to-[#000d26]">
          <TableHead>Order ID</TableHead>
          <TableHead>Cancel Req. ID</TableHead>
          <TableHead>Corporate</TableHead>
          <TableHead>Traveller</TableHead>
          <TableHead>Route / Airline</TableHead>
          <TableHead>
            <SortHeader label="Cancelled Date" sortKey="cancelledDate" sort={sort} onSort={onSort} />
          </TableHead>
          <TableHead>
            <SortHeader label="Travel Date" sortKey="travelDate" sort={sort} onSort={onSort} />
          </TableHead>
          <TableHead>
            <SortHeader label="Status" sortKey="status" sort={sort} onSort={onSort} />
          </TableHead>
          <TableHead />
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.map((row, idx) => (
          <tr
            key={row.id}
            className={`transition-colors hover:bg-blue-50/30 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}
          >
            <IdCell value={row.orderId} />
            <IdCell value={row.cancellationRequestId} muted />
            <BodyCell>
              <span className="font-bold text-slate-800 text-[12px]">{row.corporate}</span>
            </BodyCell>
            <PeopleCell people={row.people} />
            <td className="px-4 xl:px-5 py-4 align-middle">
              <div className="flex min-h-13 flex-col justify-center gap-1">
                <div className="flex items-center gap-2">
                  <img
                    src={airlineLogo(row.airlineCode || row.airlineName)}
                    alt={row.airlineName || "Airline"}
                    className="w-7 h-7 rounded-md object-contain bg-slate-50 border border-slate-100 shrink-0"
                    onError={(e) => {
                      e.currentTarget.src = "https://via.placeholder.com/32";
                    }}
                  />
                  <p className="font-bold text-slate-700 text-[12px] truncate">{row.route}</p>
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate pl-9">
                  {row.airlineName || row.airlineCode || "—"}
                </p>
              </div>
            </td>
            <DateCell value={formatDateTime(row.cancelledDate)} />
            <DateCell value={formatDate(row.travelDate)} />
            <BodyCell>
              <StatusBadge status={row.status} />
            </BodyCell>
            <ActionCell onClick={() => onView(row._raw)} />
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Hotel table ──────────────────────────────────────────────────────────────
function HotelCancellationTable({ rows, sort, onSort, onView }) {
  return (
    <table className="min-w-300 w-full table-fixed text-left border-collapse">
      <colgroup>
        <col style={{ width: "9%" }} />
        <col style={{ width: "9%" }} />
        <col style={{ width: "13%" }} />
        <col style={{ width: "15%" }} />
        <col style={{ width: "15%" }} />
        <col style={{ width: "14%" }} />
        <col style={{ width: "14%" }} />
        <col style={{ width: "7%" }} />
        <col style={{ width: "4%" }} />
      </colgroup>
      <thead>
        <tr className="bg-linea-to-r from-[#001a66] to-[#000d26]">
          <TableHead>Order ID</TableHead>
          <TableHead>Cancel Req. ID</TableHead>
          <TableHead>Corporate</TableHead>
          <TableHead>Guest</TableHead>
          <TableHead>Hotel / City</TableHead>
          <TableHead>
            <SortHeader label="Cancelled Date" sortKey="cancelledDate" sort={sort} onSort={onSort} />
          </TableHead>
          <TableHead>
            <SortHeader label="Stay Dates" sortKey="checkIn" sort={sort} onSort={onSort} />
          </TableHead>
          <TableHead>
            <SortHeader label="Status" sortKey="status" sort={sort} onSort={onSort} />
          </TableHead>
          <TableHead />
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.map((row, idx) => (
          <tr
            key={row.id}
            className={`transition-colors hover:bg-blue-50/30 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}
          >
            <IdCell value={row.orderId} />
            <IdCell value={row.cancellationRequestId} muted />
            <BodyCell>
              <span className="font-bold text-slate-800 text-[12px]">{row.corporate}</span>
            </BodyCell>
            <PeopleCell people={row.people} />
            <BodyCell>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-7 h-7 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-[9px] font-black text-slate-500 overflow-hidden">
                  {row.hotelImage ? (
                    <img src={row.hotelImage} alt="" loading="lazy" className="w-full h-full object-cover" />
                  ) : (
                    <FaHotel size={14} className="text-slate-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-700 text-[12px] truncate">{row.hotelName}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">
                    {row.city}
                  </p>
                </div>
              </div>
            </BodyCell>
            <DateCell value={formatDateTime(row.cancelledDate)} />
            <DateCell value={`${formatDate(row.checkIn)} → ${formatDate(row.checkOut)}`} />
            <BodyCell>
              <StatusBadge status={row.status} />
            </BodyCell>
            <ActionCell onClick={() => onView(row._raw)} />
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, borderColor }) {
  return (
    <div
      className={`bg-white rounded-2xl p-5 flex items-center gap-4 shadow-sm border border-slate-100 border-b-4 ${borderColor}`}
    >
      <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
        <p className="text-2xl font-black text-slate-800 leading-tight">{value}</p>
      </div>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────
function TableSkeleton({ activeTab }) {
  return (
    <div className="p-5 space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-14 rounded-xl bg-slate-100 overflow-hidden relative">
          <div className="absolute inset-0 bg-linea-to-r from-transparent via-white/60 to-transparent animate-pulse" />
        </div>
      ))}
      <p className="text-center text-[11px] font-black text-slate-400 uppercase tracking-widest pt-3">
        Loading {activeTab.toLowerCase()} cancellations...
      </p>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ activeTab }) {
  return (
    <div className="min-h-105 flex flex-col items-center justify-center text-center p-8">
      <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 mb-4">
        {activeTab === "Flight" ? <FaPlane size={28} /> : <FaHotel size={28} />}
      </div>
      <p className="text-sm font-black text-slate-700">
        No {activeTab.toLowerCase()} cancellations found.
      </p>
      <p className="text-xs text-slate-400 mt-1">Try changing the filters or date range.</p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function CancellationDashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { exportExcel, exportingKey } = useExcelExporter();
  const tableScrollRef = useRef(null);

  const {
    flightCancellations,
    loadingFlightCancellations,
    hotelCancellations,
    loadingHotelCancellations,
  } = useSelector((state) => state.corporateRelated);
  const { corporates: onboardedCorporates } = useSelector((state) => state.corporateList);

  const [activeTab, setActiveTab] = useState("Flight");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [corporate, setCorporate] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ key: "cancelledDate", direction: "desc" });

  useEffect(() => {
    dispatch(fetchFlightCancellations({}));
    dispatch(fetchHotelCancellations({}));
    dispatch(fetchCorporates());
  }, [dispatch]);

  useEffect(() => {
    setPage(1);
    setSort({ key: "cancelledDate", direction: "desc" });
  }, [activeTab, search, status, corporate, fromDate, toDate]);

  const flights = useMemo(
    () => (flightCancellations || []).map(normalizeFlight),
    [flightCancellations],
  );
  const hotels = useMemo(
    () => (hotelCancellations || []).map(normalizeHotel),
    [hotelCancellations],
  );
  const rows = activeTab === "Flight" ? flights : hotels;

  const corporateOptions = useMemo(() => {
    const onboarded = (onboardedCorporates || []).map((c) => c.corporateName || c.name);
    const fromRows = [...flights, ...hotels].map((r) => r.corporate).filter(Boolean);
    return ["All", ...Array.from(new Set([...onboarded, ...fromRows])).sort()];
  }, [flights, hotels, onboardedCorporates]);

  const filtered = useMemo(() => {
    const query = normalizeText(search);
    return rows.filter((row) => {
      const peopleText = row.people.map((p) => `${p.name} ${p.email}`).join(" ");
      const searchable = [
        row.orderId,
        row.cancellationRequestId,
        row.corporate,
        peopleText,
        row.route,
        row.hotelName,
        row.city,
        formatDate(row.cancelledDate),
      ].join(" ");
      const searchOk = !query || normalizeText(searchable).includes(query);
      const statusOk = status === "All" || row.status === status;
      const corporateOk = corporate === "All" || row.corporate === corporate;
      const primaryDate = activeTab === "Flight" ? row.travelDate : row.checkIn;
      const dateOk = matchesDateRange(primaryDate || row.cancelledDate, fromDate, toDate);
      return searchOk && statusOk && corporateOk && dateOk;
    });
  }, [rows, search, status, corporate, fromDate, toDate, activeTab]);

  const sorted = useMemo(() => {
    const dir = sort.direction === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = getSortValue(a, sort.key);
      const bv = getSortValue(b, sort.key);
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginatedRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const isLoading =
    activeTab === "Flight" ? loadingFlightCancellations : loadingHotelCancellations;
  const exportKey =
    activeTab === "Flight" ? "flight_cancellation_summary" : "hotel_cancellation_summary";
  const isExporting = exportingKey === exportKey;

  const handleSort = (key) =>
    setSort((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "desc" ? "asc" : "desc",
    }));

  const handleRefresh = () => {
    dispatch(fetchFlightCancellations({}));
    dispatch(fetchHotelCancellations({}));
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
    const appliedFilters = [
      { label: "Search", value: search || "None" },
      { label: "Status", value: status },
      { label: "Corporate", value: corporate },
      { label: "From Date", value: fromDate || "Any" },
      { label: "To Date", value: toDate || "Any" },
      { label: "Active Tab", value: activeTab },
    ];

    exportExcel({
      key: exportKey,
      pageHeader: activeTab === "Flight" ? "Flight Cancellation Summary" : "Hotel Cancellation Summary",
      statCards: [
        { label: "Total Records", value: sorted.length },
        { label: "Requested", value: rows.filter((r) => r.status === "Requested").length },
        { label: "Approved", value: rows.filter((r) => r.status === "Approved").length },
        { label: "Needs Review", value: rows.filter((r) => r.status === "In Review").length },
      ],
      appliedFilters,
      data: sorted,
      columns:
        activeTab === "Flight"
          ? flightCancellationSummaryExportTemplate
          : hotelCancellationSummaryExportTemplate,
      filenamePrefix:
        activeTab === "Flight"
          ? "flight_cancellation_summary_export"
          : "hotel_cancellation_summary_export",
      emptyMessage: `No ${activeTab.toLowerCase()} cancellations available to export`,
      successMessage: `${activeTab} cancellation summary exported`,
    });
  };

  return (
    <div
      className="min-h-screen font-sans pb-20 -mt-6 -mx-4 md:-mx-6"
      style={{ background: "#f8fafc" }}
    >
      {/* ── Navy Gradient Header ── */}
      <div className="w-full bg-linear-to-br from-[#003399] to-[#000d26] text-white pt-8 pb-20 px-6 md:px-10">
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
                disabled={isLoading}
                className={`p-3 rounded-xl bg-white/10 transition-all border border-white/10 ${
                  isLoading ? "opacity-50 cursor-not-allowed" : "hover:bg-white/20"
                }`}
              >
                <div className={isLoading ? "animate-spin" : ""}>
                  <FiRefreshCw size={20} />
                </div>
              </button>
            </div>

            <div className="h-12 w-px bg-white/10 mx-2 hidden md:block" />

            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl text-white border border-white/10 bg-white/10">
                <FiXCircle size={28} />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight leading-none">
                  Cancellation Summary
                </h1>
                <p className="text-[10px] mt-2 font-bold uppercase tracking-[2px] opacity-60">
                  Flight &amp; Hotel Cancellation Management
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 md:px-10 -mt-10 space-y-10">
        {/* ── Tab Switcher ── */}
        <div className="flex gap-2 p-1.5 bg-white border border-slate-200/60 shadow-xl rounded-2xl w-fit">
          {[
            ["Flight", "Flight Cancellations", FaPlane],
            ["Hotel", "Hotel Cancellations", FaHotel],
          ].map(([k, lbl, Icon]) => (
            <button
              key={k}
              onClick={() => setActiveTab(k)}
              className={`px-8 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2.5 transition-all ${
                activeTab === k
                  ? "bg-[#000D26] text-white shadow-lg scale-[1.02]"
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Icon size={14} /> {lbl}
            </button>
          ))}
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="Total Records"
            value={sorted.length}
            icon={<FiList size={20} />}
            borderColor="border-b-[#003399]"
          />
          <StatCard
            label="Requested"
            value={rows.filter((r) => r.status === "Requested").length}
            icon={<FiClock size={20} />}
            borderColor="border-b-amber-500"
          />
          <StatCard
            label="Approved"
            value={rows.filter((r) => r.status === "Approved").length}
            icon={<FiCheckCircle size={20} />}
            borderColor="border-b-emerald-500"
          />
          <StatCard
            label="Needs Review"
            value={rows.filter((r) => r.status === "In Review").length}
            icon={<FiAlertCircle size={20} />}
            borderColor="border-b-rose-500"
          />
        </div>

        {/* ── Filter Bar ── */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            {/* Search */}
            <div className="flex flex-col gap-1.5">
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
                  placeholder="Order, request, company, name..."
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
                <option value="All">All Statuses</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Corporate */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Corporate Account
              </label>
              <select
                value={corporate}
                onChange={(e) => setCorporate(e.target.value)}
                className="w-full px-4 py-2.5 border rounded-xl text-[13px] font-medium outline-none transition-all focus:border-[#003399] focus:ring-2 focus:ring-[#003399]/10 bg-slate-50 hover:bg-white cursor-pointer"
              >
                {corporateOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Date From */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {activeTab === "Flight" ? "Travel From" : "Stay From"}
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-4 py-2.5 border rounded-xl text-[13px] font-medium outline-none transition-all focus:border-[#003399] focus:ring-2 focus:ring-[#003399]/10 bg-slate-50 hover:bg-white"
              />
            </div>

            {/* Date To */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {activeTab === "Flight" ? "Travel To" : "Stay To"}
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-4 py-2.5 border rounded-xl text-[13px] font-medium outline-none transition-all focus:border-[#003399] focus:ring-2 focus:ring-[#003399]/10 bg-slate-50 hover:bg-white"
              />
            </div>
          </div>
        </div>

        {/* ── Table Card ── */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
          {/* Table Titlebar */}
          <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap gap-3 justify-between items-center bg-slate-50/50">
            {/* Left: title + count */}
            <div>
              <h2 className="font-black text-slate-700 uppercase tracking-tighter text-lg">
                {activeTab} Cancellation Report
              </h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                {sorted.length} records found
              </p>
            </div>

            {/* Right: Export + Scroll controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleExport}
                disabled={isLoading || isExporting || sorted.length === 0}
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
          <div ref={tableScrollRef} className="w-full overflow-x-auto min-h-105">
            {isLoading ? (
              <TableSkeleton activeTab={activeTab} />
            ) : sorted.length === 0 ? (
              <EmptyState activeTab={activeTab} />
            ) : activeTab === "Flight" ? (
              <FlightCancellationTable
                rows={paginatedRows}
                sort={sort}
                onSort={handleSort}
                onView={(booking) => navigate(`/bookings/flight/${booking._id || booking.id}`)}
              />
            ) : (
              <HotelCancellationTable
                rows={paginatedRows}
                sort={sort}
                onSort={handleSort}
                onView={(booking) => navigate(`/bookings/hotel/${booking._id || booking.id}`)}
              />
            )}
          </div>

          {/* Pagination */}
          <div className="flex flex-wrap gap-3 items-center justify-between px-6 py-3 border-t border-slate-100 bg-white">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Page {page} of {totalPages}
            </span>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
              showFirstLast
            />
          </div>
        </div>
      </div>
    </div>
  );
}
