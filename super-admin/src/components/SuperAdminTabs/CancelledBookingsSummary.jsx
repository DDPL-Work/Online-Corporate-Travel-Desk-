import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiArrowDown,
  FiArrowUp,
  FiEye,
  FiSearch,
  FiXCircle,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
} from "react-icons/fi";
import { FaPlane, FaHotel } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchFlightCancellations,
  fetchHotelCancellations,
} from "../../Redux/Actions/corporate.related.thunks";
import { fetchCorporates } from "../../Redux/Slice/corporateListSlice";
import Pagination from "../Shared/Pagination";
import TableActionBar from "../Shared/TableActionBar";
import useCsvExporter from "../../services/export/useCsvExporter";
import {
  flightCancellationSummaryExportTemplate,
  hotelCancellationSummaryExportTemplate,
} from "../../templates/exportTemplates/superAdminExportTemplates";

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
  if (typeof value === "object") {
    return value.corporateName || value.companyName || value.name || value.title || "N/A";
  }
  return value;
};

const corporateKey = (value) => {
  if (!value) return "";
  if (typeof value === "object") return value._id || value.id || value.corporateCode || "";
  return value;
};

const statusLabel = (booking = {}, type = "flight") => {
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
    return booking.bookingSnapshot.sectors.map((sector) => String(sector).replace("-", " → ")).join(" / ");
  }
  if (!segments.length) return booking.route || booking.destination || EMPTY_VALUE;
  return segments
    .map((segment) => {
      const from =
        segment?.origin?.airportCode ||
        segment?.Origin?.Airport?.AirportCode ||
        segment?.from ||
        "?";
      const to =
        segment?.destination?.airportCode ||
        segment?.Destination?.Airport?.AirportCode ||
        segment?.to ||
        "?";
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
    booking.airlineCode ||
    booking.airlineDetails?.code ||
    booking.bookingSnapshot?.airlineCode ||
    firstSegment?.airlineCode ||
    firstSegment?.Airline?.AirlineCode ||
    "";
  const airlineName =
    booking.airlineDetails?.name ||
    booking.bookingSnapshot?.airline ||
    firstSegment?.airlineName ||
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
      ? travellers.map((traveller) => ({
          name: joinName(traveller) || traveller.email || "Traveller",
          email: traveller.email || EMPTY_VALUE,
        }))
      : Array.isArray(booking.travellerDetails) && booking.travellerDetails.length
        ? booking.travellerDetails.map((traveller) => ({
            name: traveller.name || traveller.email || "Traveller",
            email: traveller.email || EMPTY_VALUE,
          }))
      : [{ name: booking.employeeName || booking.travellerName || "Traveller", email: booking.employeeEmail || EMPTY_VALUE }],
    route: flightRoute(booking),
    airlineName,
    airlineCode,
    airlineLogo: booking.airlineLogo || booking.airlineDetails?.logo || booking.bookingSnapshot?.airlineLogo || "",
    bookedDate: booking.bookedDate || booking.createdAt || booking.approvedAt || booking.ticketedAt || "",
    travelDate:
      booking.bookingSnapshot?.travelDate ||
      firstSegment?.departureDateTime ||
      firstSegment?.Origin?.DepTime ||
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
      ? guests.map((guest) => ({
          name: joinName(guest) || guest.email || "Guest",
          email: guest.email || EMPTY_VALUE,
        }))
      : Array.isArray(booking.guestDetails) && booking.guestDetails.length
        ? booking.guestDetails.map((guest) => ({
            name: guest.name || guest.email || "Guest",
            email: guest.email || EMPTY_VALUE,
          }))
      : [{ name: booking.employeeName || booking.guestName || "Guest", email: booking.employeeEmail || EMPTY_VALUE }],
    hotelName: booking.hotelDetails?.name || booking.bookingSnapshot?.hotelName || hotel.hotelName || booking.hotelName || "Hotel",
    city: booking.hotelDetails?.city || booking.bookingSnapshot?.city || hotel.city || booking.hotelRequest?.cityName || booking.city || EMPTY_VALUE,
    hotelImage:
      booking.bookingSnapshot?.hotelImage ||
      booking.hotelDetails?.image ||
      hotel.image ||
      hotel.images?.[0] ||
      booking.hotelImage ||
      "",
    bookedDate: booking.bookedDate || booking.createdAt || booking.approvedAt || booking.voucheredAt || "",
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
  if (["bookedDate", "travelDate", "checkIn", "checkOut"].includes(key)) return dateValue(row[key]);
  return String(row[key] || "");
};

const SortHeader = ({ label, sortKey, sort, onSort }) => {
  const active = sort.key === sortKey;
  const Icon = sort.direction === "asc" ? FiArrowUp : FiArrowDown;
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className="inline-flex items-center gap-1.5 text-left"
    >
      <span>{label}</span>
      <Icon size={11} className={active ? "opacity-100" : "opacity-35"} />
    </button>
  );
};

const matchesDateRange = (date, from, to) => {
  const value = dateValue(date);
  if (!value && (from || to)) return false;
  const fromOk = !from || value >= new Date(from).getTime();
  const toOk = !to || value <= new Date(`${to}T23:59:59`).getTime();
  return fromOk && toOk;
};

export default function CancellationDashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { exportCsv, exportingKey } = useCsvExporter();
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
  const [sort, setSort] = useState({ key: "bookedDate", direction: "desc" });

  useEffect(() => {
    dispatch(fetchFlightCancellations({}));
    dispatch(fetchHotelCancellations({}));
    dispatch(fetchCorporates());
  }, [dispatch]);

  useEffect(() => {
    setPage(1);
    setSort({ key: "bookedDate", direction: "desc" });
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
    const onboarded = (onboardedCorporates || []).map((item) => item.corporateName || item.name);
    const fromRows = [...flights, ...hotels].map((item) => item.corporate).filter(Boolean);
    return ["All", ...Array.from(new Set([...onboarded, ...fromRows])).sort()];
  }, [flights, hotels, onboardedCorporates]);

  const filtered = useMemo(() => {
    const query = normalizeText(search);
    return rows.filter((row) => {
      const peopleText = row.people.map((person) => `${person.name} ${person.email}`).join(" ");
      const searchable = [
        row.orderId,
        row.cancellationRequestId,
        row.corporate,
        peopleText,
        row.route,
        row.hotelName,
        row.city,
        formatDate(row.bookedDate),
      ].join(" ");
      const searchOk = !query || normalizeText(searchable).includes(query);
      const statusOk = status === "All" || row.status === status;
      const corporateOk = corporate === "All" || row.corporate === corporate;
      const primaryDate = activeTab === "Flight" ? row.travelDate : row.checkIn;
      const dateOk = matchesDateRange(primaryDate || row.bookedDate, fromDate, toDate);
      return searchOk && statusOk && corporateOk && dateOk;
    });
  }, [rows, search, status, corporate, fromDate, toDate, activeTab]);

  const sorted = useMemo(() => {
    const direction = sort.direction === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const aValue = getSortValue(a, sort.key);
      const bValue = getSortValue(b, sort.key);
      if (typeof aValue === "number" && typeof bValue === "number") return (aValue - bValue) * direction;
      return String(aValue).localeCompare(String(bValue)) * direction;
    });
  }, [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginatedRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const isLoading = activeTab === "Flight" ? loadingFlightCancellations : loadingHotelCancellations;
  const exportKey = activeTab === "Flight" ? "flight_cancellation_summary" : "hotel_cancellation_summary";
  const isExporting = exportingKey === exportKey;

  const handleSort = (key) => {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === "desc" ? "asc" : "desc",
    }));
  };

  const handleExport = () => {
    exportCsv({
      key: exportKey,
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
    <div className="min-h-screen p-4 lg:p-6 bg-[#F8FAFC] font-sans">
      <div className="max-w-[1440px] mx-auto space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-rose-700 flex items-center justify-center shadow-lg text-white">
              <FiXCircle size={24} />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">
                Cancellation Summary
              </h1>
              <p className="text-[10px] text-rose-600 font-bold uppercase tracking-widest mt-1">
                Separate Flight and Hotel Cancellation Management
              </p>
            </div>
          </div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white px-4 py-2 rounded-xl border border-slate-100">
            Showing {sorted.length} records
          </span>
        </div>

        <div className="flex flex-wrap items-end gap-1 border-b-2 border-slate-200">
          {[
            { key: "Flight", label: "Flight Cancellations", icon: <FaPlane size={14} /> },
            { key: "Hotel", label: "Hotel Cancellations", icon: <FaHotel size={14} /> },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-6 py-3 text-[13px] font-bold transition-all border-b-2 -mb-0.5 rounded-t-lg ${
                activeTab === tab.key
                  ? "bg-white text-rose-700 border-b-rose-700 shadow-sm"
                  : "text-slate-400 border-transparent hover:text-slate-600 hover:bg-white/60"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <Stats rows={rows} filtered={sorted} />

        <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
            <LabeledInput label="Search">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Order, request, company, name, email..."
                  className="w-full pl-9 pr-3 py-2 border rounded-lg text-xs outline-none bg-slate-50 focus:bg-white focus:border-rose-700"
                />
              </div>
            </LabeledInput>
            <LabeledInput label="Status">
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-xs outline-none bg-slate-50 focus:bg-white focus:border-rose-700"
              >
                <option value="All">All Statuses</option>
                {STATUS_OPTIONS.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </LabeledInput>
            <LabeledInput label="Corporate">
              <select
                value={corporate}
                onChange={(event) => setCorporate(event.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-xs outline-none bg-slate-50 focus:bg-white focus:border-rose-700"
              >
                {corporateOptions.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </LabeledInput>
            <LabeledInput label={activeTab === "Flight" ? "Travel From" : "Stay From"}>
              <input
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-xs outline-none bg-slate-50 focus:bg-white focus:border-rose-700"
              />
            </LabeledInput>
            <LabeledInput label={activeTab === "Flight" ? "Travel To" : "Stay To"}>
              <input
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-xs outline-none bg-slate-50 focus:bg-white focus:border-rose-700"
              />
            </LabeledInput>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap gap-3 justify-between items-center bg-slate-50/60">
            <h2 className="font-black text-slate-700 uppercase tracking-tight text-lg">
              {activeTab} Cancellation Table
            </h2>
            <TableActionBar
              scrollRef={tableScrollRef}
              exportLabel="Export CSV"
              onExport={handleExport}
              exportDisabled={isLoading || isExporting}
              exportLoading={isExporting}
              exportClassName="bg-rose-700 hover:bg-rose-800 shadow-rose-700/20"
              arrowClassName="border-rose-100 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:border-rose-200 hover:text-rose-800 disabled:hover:bg-rose-50"
            />
          </div>

          <div ref={tableScrollRef} className="overflow-x-auto min-h-[420px]">
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

          <div className="flex flex-wrap gap-3 items-center justify-between px-5 py-3 border-t border-slate-100 bg-white">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Page {page} of {totalPages}
            </span>
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} showFirstLast />
          </div>
        </div>
      </div>
    </div>
  );
}

function FlightCancellationTable({ rows, sort, onSort, onView }) {
  return (
    <table className="min-w-[1180px] w-full table-fixed text-left border-collapse">
      <colgroup>
        <col style={{ width: "13%" }} />
        <col style={{ width: "14%" }} />
        <col style={{ width: "14%" }} />
        <col style={{ width: "17%" }} />
        <col style={{ width: "15%" }} />
        <col style={{ width: "12%" }} />
        <col style={{ width: "10%" }} />
        <col style={{ width: "11%" }} />
        <col style={{ width: "4%" }} />
      </colgroup>
      <thead>
        <tr className="bg-slate-900">
          <TableHead>Order ID</TableHead>
          <TableHead>Change Request ID</TableHead>
          <TableHead>Corporate Name</TableHead>
          <TableHead>Traveller Name with Mail ID</TableHead>
          <TableHead>Route with Airline Logo</TableHead>
          <TableHead><SortHeader label="Booked Date" sortKey="bookedDate" sort={sort} onSort={onSort} /></TableHead>
          <TableHead><SortHeader label="Travel Date" sortKey="travelDate" sort={sort} onSort={onSort} /></TableHead>
          <TableHead><SortHeader label="Status" sortKey="status" sort={sort} onSort={onSort} /></TableHead>
          <TableHead />
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.map((row) => (
          <tr key={row.id} className="hover:bg-rose-50/30 transition-colors">
            <IdCell value={row.orderId} />
            <IdCell value={row.cancellationRequestId} muted />
            <BodyCell><span className="font-bold text-slate-800">{row.corporate}</span></BodyCell>
            <PeopleCell people={row.people} />
            <BodyCell>
              <div className="flex items-center gap-3 min-w-0">
                <LogoAvatar src={row.airlineLogo} label={row.airlineCode || row.airlineName} />
                <div className="min-w-0">
                  <p className="font-black text-slate-800 text-[12px] truncate">{row.route}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase truncate">{row.airlineName}</p>
                </div>
              </div>
            </BodyCell>
            <DateCell value={formatDateTime(row.bookedDate)} />
            <DateCell value={formatDate(row.travelDate)} />
            <BodyCell><StatusBadge status={row.status} /></BodyCell>
            <ActionCell onClick={() => onView(row._raw)} />
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function HotelCancellationTable({ rows, sort, onSort, onView }) {
  return (
    <table className="min-w-[1180px] w-full table-fixed text-left border-collapse">
      <colgroup>
        <col style={{ width: "13%" }} />
        <col style={{ width: "14%" }} />
        <col style={{ width: "14%" }} />
        <col style={{ width: "17%" }} />
        <col style={{ width: "15%" }} />
        <col style={{ width: "12%" }} />
        <col style={{ width: "11%" }} />
        <col style={{ width: "10%" }} />
        <col style={{ width: "4%" }} />
      </colgroup>
      <thead>
        <tr className="bg-slate-900">
          <TableHead>Order ID</TableHead>
          <TableHead>Change Request ID</TableHead>
          <TableHead>Corporate Name</TableHead>
          <TableHead>Guest Name with Mail ID</TableHead>
          <TableHead>Hotel Name with City Name</TableHead>
          <TableHead><SortHeader label="Booked Date" sortKey="bookedDate" sort={sort} onSort={onSort} /></TableHead>
          <TableHead><SortHeader label="Stay Date" sortKey="checkIn" sort={sort} onSort={onSort} /></TableHead>
          <TableHead><SortHeader label="Status" sortKey="status" sort={sort} onSort={onSort} /></TableHead>
          <TableHead />
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.map((row) => (
          <tr key={row.id} className="hover:bg-rose-50/30 transition-colors">
            <IdCell value={row.orderId} />
            <IdCell value={row.cancellationRequestId} muted />
            <BodyCell><span className="font-bold text-slate-800">{row.corporate}</span></BodyCell>
            <PeopleCell people={row.people} />
            <BodyCell>
              <div className="flex items-center gap-3 min-w-0">
                <LogoAvatar src={row.hotelImage} label={row.hotelName} rounded />
                <div className="min-w-0">
                  <p className="font-black text-slate-800 text-[12px] truncate">{row.hotelName}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase truncate">{row.city}</p>
                </div>
              </div>
            </BodyCell>
            <DateCell value={formatDateTime(row.bookedDate)} />
            <DateCell value={`${formatDate(row.checkIn)} → ${formatDate(row.checkOut)}`} />
            <BodyCell><StatusBadge status={row.status} /></BodyCell>
            <ActionCell onClick={() => onView(row._raw)} />
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Stats({ rows, filtered }) {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      <StatCard label="Total Records" value={filtered.length} icon={<FiXCircle size={18} />} color="rose" />
      <StatCard label="Requested" value={rows.filter((row) => row.status === "Requested").length} icon={<FiClock size={18} />} color="amber" />
      <StatCard label="Approved" value={rows.filter((row) => row.status === "Approved").length} icon={<FiCheckCircle size={18} />} color="emerald" />
      <StatCard label="Needs Review" value={rows.filter((row) => row.status === "In Review").length} icon={<FiAlertCircle size={18} />} color="blue" />
    </div>
  );
}

function StatCard({ label, value, icon, color }) {
  const colorMap = {
    rose: "border-rose-500 bg-rose-50 text-rose-700",
    amber: "border-amber-500 bg-amber-50 text-amber-700",
    emerald: "border-emerald-500 bg-emerald-50 text-emerald-700",
    blue: "border-blue-500 bg-blue-50 text-blue-700",
  };
  return (
    <div className="bg-white rounded-xl p-4 flex items-center gap-3 shadow-sm border border-slate-100">
      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${colorMap[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
        <p className="text-xl font-black text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function LabeledInput({ label, children }) {
  return (
    <div className="flex flex-col gap-1 text-left">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
      {children}
    </div>
  );
}

function TableHead({ children }) {
  return (
    <th className="px-4 py-4 text-[10px] font-black text-slate-300 uppercase tracking-widest align-middle">
      {children}
    </th>
  );
}

function BodyCell({ children }) {
  return <td className="px-4 py-4 align-middle text-[12px] text-slate-700">{children}</td>;
}

function IdCell({ value, muted = false }) {
  return (
    <td className="px-4 py-4 align-middle">
      <span className={`font-mono text-[11px] font-black truncate block ${muted ? "text-slate-500" : "text-rose-700"}`}>
        {value || EMPTY_VALUE}
      </span>
    </td>
  );
}

function DateCell({ value }) {
  return (
    <td className="px-4 py-4 align-middle text-[12px] text-slate-500 font-medium whitespace-nowrap">
      {value || EMPTY_VALUE}
    </td>
  );
}

function PeopleCell({ people }) {
  return (
    <BodyCell>
      <div className="space-y-1.5">
        {people.slice(0, 3).map((person, index) => (
          <div key={`${person.email}-${index}`} className="min-w-0">
            <p className="font-bold text-slate-800 truncate">{person.name}</p>
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

function LogoAvatar({ src, label, rounded = false }) {
  const initials = String(label || "?").slice(0, 2).toUpperCase();
  return (
    <div className={`${rounded ? "rounded-lg" : "rounded-full"} w-10 h-10 bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 text-[10px] font-black text-slate-500`}>
      {src ? (
        <img src={src} alt="" loading="lazy" className="w-full h-full object-cover" />
      ) : (
        initials
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    Requested: "bg-blue-50 text-blue-700 border-blue-100",
    "In Review": "bg-amber-50 text-amber-700 border-amber-100",
    Approved: "bg-emerald-50 text-emerald-700 border-emerald-100",
    Rejected: "bg-rose-50 text-rose-700 border-rose-100",
    Cancelled: "bg-slate-100 text-slate-700 border-slate-200",
    Refunded: "bg-cyan-50 text-cyan-700 border-cyan-100",
  };
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full border text-[10px] font-black uppercase whitespace-nowrap ${styles[status] || styles.Requested}`}>
      {status}
    </span>
  );
}

function ActionCell({ onClick }) {
  return (
    <td className="px-3 py-4 align-middle text-center">
      <button
        type="button"
        onClick={onClick}
        className="w-9 h-9 rounded-lg bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-700 transition-colors inline-flex items-center justify-center"
        title="View details"
      >
        <FiEye size={15} />
      </button>
    </td>
  );
}

function TableSkeleton({ activeTab }) {
  return (
    <div className="p-5 space-y-3">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="h-14 rounded-xl bg-slate-100 overflow-hidden">
          <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-white/70 to-transparent animate-pulse" />
        </div>
      ))}
      <p className="text-center text-[11px] font-black text-slate-400 uppercase tracking-widest pt-3">
        Loading {activeTab.toLowerCase()} cancellations...
      </p>
    </div>
  );
}

function EmptyState({ activeTab }) {
  return (
    <div className="min-h-[420px] flex flex-col items-center justify-center text-center p-8">
      <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
        {activeTab === "Flight" ? <FaPlane size={18} /> : <FaHotel size={18} />}
      </div>
      <p className="text-sm font-black text-slate-700">No {activeTab.toLowerCase()} cancellations found.</p>
      <p className="text-xs text-slate-400 mt-1">Try changing the filters or date range.</p>
    </div>
  );
}
