import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FiEye,
  FiSearch,
  FiList,
  FiCheckCircle,
  FiClock,
  FiArrowDown,
  FiArrowUp,
  FiArrowRight,
  FiRefreshCw,
  FiDownload,
  FiX,
} from "react-icons/fi";
import { FaPlane, FaHotel, FaRupeeSign, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { airlineLogo } from "../../utils/formatter";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchFlightBookings,
  fetchHotelBookings,
} from "../../Redux/Actions/corporate.related.thunks";
import { fetchCorporates } from "../../Redux/Slice/corporateListSlice";
import Pagination from "../Shared/Pagination";
import useCsvExporter from "../../services/export/useCsvExporter";
import {
  flightBookingsExportTemplate,
  hotelBookingsExportTemplate,
} from "../../templates/exportTemplates/superAdminExportTemplates";

const DEFAULT_LIMIT = 10;
const EMPTY_VALUE = "—";

const getCorporateName = (b = {}) => {
  const corp = b.corporateName || b.corporate || b.corporateId;
  if (corp && typeof corp === "object") {
    return corp.corporateName || corp.name || corp.title || corp.code || corp._id || "N/A";
  }
  return corp || "N/A";
};

const getCorporateId = (b = {}) => {
  const corpId = b.corporateId || b.corporateCode || b.corporate;
  if (corpId && typeof corpId === "object") {
    return corpId._id || corpId.id || corpId.code || corpId.corporateCode || "—";
  }
  return corpId || "—";
};

const normalizeFlight = (b = {}) => {
  const traveler = (b.travellers && b.travellers[0]) || {};
  const travelerName =
    [traveler.firstName, traveler.lastName].filter(Boolean).join(" ").trim() ||
    traveler.email ||
    "N/A";

  const segments = b.flightRequest?.segments || [];
  let routeFromSegments;
  if (segments.length >= 2) {
    const hasOnward = segments.some((s) => (s.journeyType || "").toLowerCase() === "onward");
    const hasReturn = segments.some((s) => (s.journeyType || "").toLowerCase() === "return");
    if (hasOnward && hasReturn) {
      const first = segments[0];
      const last = segments[segments.length - 1];
      routeFromSegments = `${first?.origin?.airportCode || "?"}-${first?.destination?.airportCode || "?"} / ${last?.origin?.airportCode || "?"}-${last?.destination?.airportCode || "?"}`;
    } else {
      routeFromSegments = segments
        .map((s) => `${s?.origin?.airportCode || "?"}-${s?.destination?.airportCode || "?"}`)
        .join(" / ");
    }
  } else if (segments.length === 1) {
    const s = segments[0];
    routeFromSegments = `${s?.origin?.airportCode || "?"}-${s?.destination?.airportCode || "?"}`;
  }

  const routeFromSnapshot = Array.isArray(b.bookingSnapshot?.sectors)
    ? b.bookingSnapshot.sectors.join(" / ")
    : undefined;

  const route =
    routeFromSegments ||
    routeFromSnapshot ||
    b.bookingSnapshot?.city ||
    b.route ||
    b.destination ||
    [b.from, b.to].filter(Boolean).join(" -> ") ||
    b.sector ||
    "Route not available";

  const travelDate =
    segments.find((s) => (s.journeyType || "onward") === "onward")?.departureDateTime ||
    b.bookingSnapshot?.travelDate ||
    b.travelDate ||
    b.date ||
    b.createdAt ||
    "";

  const amount =
    Number(
      b.bookingSnapshot?.amount ||
        b.pricingSnapshot?.totalAmount ||
        b.flightRequest?.fareSnapshot?.onwardFare?.PublishedFare ||
        b.total ||
        b.totalFare ||
        b.price ||
        b.overallAmount ||
        0,
    ) || 0;

  return {
    id: b._id || b.bookingId || "—",
    orderId: b.orderId || b.bookingSnapshot?.orderId || b.bookingReference || EMPTY_VALUE,
    paymentId: b.paymentId || b.payment?.paymentId || EMPTY_VALUE,
    bookedDate: b.bookedDate || b.createdAt || b.approvedAt || b.ticketedAt || "",
    pnr: b.bookingResult?.pnr || b.pnr || b.itinerary?.PNR || "—",
    bookingRef: b.bookingReference || EMPTY_VALUE,
    corporate: getCorporateName(b),
    corpId: getCorporateId(b),
    employee: b.employeeName || travelerName,
    empId: b.userId || b.employeeCode || b.employeeId || b.empId || traveler.email || "—",
    type: "Flight",
    date: travelDate,
    destination: route,
    amount,
    status: b.executionStatus || b.requestStatus || b.status || "Pending",
    refundStatus: (() => {
      const dbStatus = b.cancellation?.refundStatus || b.refundStatus;
      if (dbStatus && dbStatus.toLowerCase() !== "pending") return dbStatus;
      const amendment = b.amendment || {};
      const lastHistory =
        Array.isArray(b.amendmentHistory) && b.amendmentHistory.length
          ? b.amendmentHistory[b.amendmentHistory.length - 1]
          : {};
      const fRes =
        amendment.response?.[0]?.response?.Response?.TicketCRInfo?.[0] ||
        lastHistory.response?.[0]?.response?.Response?.TicketCRInfo?.[0];
      if (fRes?.ChangeRequestStatus === 4 || fRes?.RefundedAmount > 0) return "Processed";
      return dbStatus || null;
    })(),
    // airlineCode  → always the IATA code (e.g. "EY", "AI") for logo lookup
    // airline      → human-readable name / code for display
    airlineCode:
      b.airlineDetails?.code ||
      segments[0]?.airlineCode ||
      null,
    airline:
      // Prefer the full name from the first segment, fall back to bookingSnapshot.airline
      segments[0]?.airlineName ||
      b.airlineDetails?.name ||
      b.bookingSnapshot?.airline ||
      segments[0]?.airlineCode ||
      "",
  };
};

const normalizeHotel = (b = {}) => {
  const amount =
    Number(
      b.pricingSnapshot?.totalAmount ||
        b.bookingSnapshot?.amount ||
        b.selectedRoom?.Price?.totalFare ||
        b.totalFare ||
        b.amount ||
        0,
    ) || 0;

  const checkIn =
    b.bookingSnapshot?.checkInDate ||
    b.hotelRequest?.checkInDate ||
    b.checkIn ||
    b.checkInDate ||
    b.date ||
    "";
  const checkOut =
    b.bookingSnapshot?.checkOutDate ||
    b.hotelRequest?.checkOutDate ||
    b.checkOut ||
    b.checkOutDate ||
    b.endDate ||
    "";

  return {
    id: b._id || b.bookingId || "—",
    orderId: b.orderId || b.bookingSnapshot?.orderId || b.bookingReference || EMPTY_VALUE,
    paymentId: b.paymentId || b.payment?.paymentId || EMPTY_VALUE,
    bookedDate: b.bookedDate || b.createdAt || b.approvedAt || b.voucheredAt || "",
    bookingRef: b.bookingReference || EMPTY_VALUE,
    corporate: getCorporateName(b),
    corpId: getCorporateId(b),
    employee:
      b.employeeName ||
      b.guestName ||
      b.travelerName ||
      (b.travellers && b.travellers[0]
        ? [b.travellers[0].firstName, b.travellers[0].lastName].filter(Boolean).join(" ")
        : "N/A"),
    empId: b.userId || b.employeeCode || b.employeeId || b.empId || "—",
    type: "Hotel",
    checkIn,
    checkOut,
    date: checkIn || b.date || "",
    destination:
      b.bookingSnapshot?.hotelName ||
      b.hotelRequest?.selectedHotel?.hotelName ||
      b.hotelName ||
      b.property ||
      b.destination ||
      "Hotel",
    amount,
    status: b.executionStatus || b.requestStatus || b.status || "Pending",
    refundStatus: (() => {
      const dbStatus = b.cancellation?.refundStatus || b.refundStatus;
      if (dbStatus && dbStatus.toLowerCase() !== "pending") return dbStatus;
      const amendment = b.amendment || {};
      const lastHistory =
        Array.isArray(b.amendmentHistory) && b.amendmentHistory.length
          ? b.amendmentHistory[b.amendmentHistory.length - 1]
          : {};
      const hRes =
        amendment.providerResponse?.HotelChangeRequestResult ||
        lastHistory.providerResponse?.HotelChangeRequestResult ||
        {};
      if (hRes.ChangeRequestStatus === 3 || hRes.RefundedAmount > 0) return "Processed";
      return dbStatus || null;
    })(),
    roomType:
      b.hotelRequest?.selectedRoom?.rawRoomData?.Name?.[0] || b.roomType || b.room || "",
  };
};

const isSuccessStatus = (status) => {
  const s = (status || "").toLowerCase();
  return ["completed", "ticketed", "approved", "success", "voucher_generated"].includes(s);
};

const isPendingStatus = (status) => {
  const s = (status || "").toLowerCase();
  return ["pending", "pending_approval", "not_started", "initiated", "in_progress"].includes(s);
};

const isBlockedStatus = (status) => {
  const s = (status || "").toLowerCase();
  return ["failed", "not_started"].includes(s);
};

const formatDisplayDate = (value) => {
  if (!value) return EMPTY_VALUE;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return EMPTY_VALUE;
  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDisplayDateTime = (value) => {
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

const getTimeValue = (value) => {
  const parsed = value ? new Date(value) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed.getTime() : 0;
};

const compareText = (a, b) => String(a || "").localeCompare(String(b || ""));

const SortHeader = ({ label, sortKey, sort, onSort }) => {
  const active = sort.key === sortKey;
  const Icon = sort.direction === "asc" ? FiArrowUp : FiArrowDown;

  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className="inline-flex items-center gap-1.5 text-left uppercase tracking-wider"
    >
      <span>{label}</span>
      <Icon size={11} className={active ? "opacity-100" : "opacity-35"} />
    </button>
  );
};

const truncateId = (id = "", maxLen = 16) => {
  if (!id || id === EMPTY_VALUE) return id;
  return id.length > maxLen ? `${id.slice(0, maxLen)}…` : id;
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function GlobalBookingsDashboard() {
  const tableScrollRef = useRef(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { exportCsv, exportingKey } = useCsvExporter();
  const {
    flightBookings,
    hotelBookings,
    loadingFlights,
    loadingHotels,
  } = useSelector((state) => state.corporateRelated);

  const { corporates: onboardedCorporates } = useSelector((state) => state.corporateList);

  const [activeTab, setActiveTab] = useState("Flight");
  const [corporate, setCorporate] = useState("All");
  const [search, setSearch] = useState("");
  const [flightPage, setFlightPage] = useState(1);
  const [hotelPage, setHotelPage] = useState(1);
  const [sort, setSort] = useState({ key: "bookedDate", direction: "desc" });

  const [travelDate, setTravelDate] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startDate, setStartDate] = useState("");

  useEffect(() => {
    if (activeTab === "Flight") setFlightPage(1);
    else setHotelPage(1);
  }, [search, startDate, endDate, activeTab]);

  useEffect(() => {
    if (activeTab === "Flight") dispatch(fetchFlightBookings());
    else dispatch(fetchHotelBookings());
  }, [activeTab, dispatch]);

  useEffect(() => {
    dispatch(fetchCorporates());
  }, [dispatch]);

  const flights = useMemo(
    () => (flightBookings || []).map((b) => ({ ...normalizeFlight(b), _raw: b })),
    [flightBookings],
  );
  const hotels = useMemo(
    () => (hotelBookings || []).map((b) => ({ ...normalizeHotel(b), _raw: b })),
    [hotelBookings],
  );

  const corporates = useMemo(() => {
    const fromOnboarded = (onboardedCorporates || []).map(
      (c) => c.corporateName || c.name || c.title,
    );
    const validBookings = [...flights, ...hotels].filter((b) => !isBlockedStatus(b.status));
    const namesFromBookings = validBookings.map((b) => b.corporate).filter(Boolean);
    const allNames = new Set([...fromOnboarded, ...namesFromBookings]);
    return ["All", ...Array.from(allNames).sort()];
  }, [onboardedCorporates, flights, hotels]);

  const filtered = useMemo(() => {
    const source = activeTab === "Flight" ? flights : hotels;
    return source.filter((b) => {
      if (isBlockedStatus(b.status)) return false;
      const corpMatch = corporate === "All" || b.corporate === corporate;
      const typeMatch = b.type === activeTab;
      const searchText = search.trim().toLowerCase();
      const searchMatch =
        !searchText ||
        b.employee?.toLowerCase().includes(searchText) ||
        b.orderId?.toLowerCase().includes(searchText) ||
        b.paymentId?.toLowerCase().includes(searchText) ||
        b.empId?.toLowerCase().includes(searchText) ||
        b.bookingRef?.toLowerCase?.().includes(searchText) ||
        formatDisplayDateTime(b.bookedDate).toLowerCase().includes(searchText);

      let dateMatch = true;
      if (activeTab === "Flight" && travelDate) {
        dateMatch = (b.date || "").slice(0, 10) === travelDate;
      } else if (activeTab === "Hotel") {
        const cinMatch = !checkIn || (b.checkIn || "").slice(0, 10) === checkIn;
        const coutMatch = !checkOut || (b.checkOut || "").slice(0, 10) === checkOut;
        dateMatch = cinMatch && coutMatch;
      }

      const dStart = b.bookedDate;
      const startOk = !startDate || (dStart && new Date(dStart) >= new Date(startDate));
      const dEnd = b.bookedDate;
      const endOk = !endDate || (dEnd && new Date(dEnd) <= new Date(endDate));

      return corpMatch && typeMatch && searchMatch && dateMatch && startOk && endOk;
    });
  }, [activeTab, flights, hotels, corporate, search, travelDate, checkIn, checkOut, startDate, endDate]);

  const sortedFiltered = useMemo(() => {
    const direction = sort.direction === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (["bookedDate", "date", "checkIn", "checkOut"].includes(sort.key)) {
        return (getTimeValue(a[sort.key]) - getTimeValue(b[sort.key])) * direction;
      }
      return compareText(a[sort.key], b[sort.key]) * direction;
    });
  }, [filtered, sort]);

  const totalSpend = sortedFiltered.reduce((sum, b) => sum + (b.amount || 0), 0);

  const handleViewBooking = (booking, type = activeTab) => {
    const id = booking?._raw?._id || booking?.id || booking?._id;
    if (!id) return;
    navigate(`/bookings/${type.toLowerCase()}/${id}`);
  };

  const currentPage = activeTab === "Flight" ? flightPage : hotelPage;
  const totalPages = Math.max(1, Math.ceil(sortedFiltered.length / DEFAULT_LIMIT));

  const paginatedData = useMemo(() => {
    const pg = activeTab === "Flight" ? flightPage : hotelPage;
    const start = (pg - 1) * DEFAULT_LIMIT;
    return sortedFiltered.slice(start, start + DEFAULT_LIMIT);
  }, [sortedFiltered, flightPage, hotelPage, activeTab]);

  const handleSort = (key) => {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === "desc" ? "asc" : "desc",
    }));
  };

  const handlePageChange = (page) => {
    if (activeTab === "Flight") setFlightPage(page);
    else setHotelPage(page);
  };

  const handleRefresh = () => {
    if (activeTab === "Flight") dispatch(fetchFlightBookings());
    else dispatch(fetchHotelBookings());
  };

  const handleScrollTable = (direction) => {
    if (tableScrollRef.current) {
      tableScrollRef.current.scrollBy({
        left: direction === "left" ? -300 : 300,
        behavior: "smooth",
      });
    }
  };

  const resetFilters = () => {
    setSearch("");
    setStartDate("");
    setEndDate("");
    setTravelDate("");
    setCheckIn("");
    setCheckOut("");
    setCorporate("All");
  };

  const isLoading = activeTab === "Flight" ? loadingFlights : loadingHotels;
  const exportKey = `bookings_${activeTab.toLowerCase()}`;
  const isExporting = exportingKey === exportKey;

  const handleExport = () => {
    if (isLoading) return;
    exportCsv({
      key: exportKey,
      data: paginatedData,
      columns:
        activeTab === "Flight"
          ? flightBookingsExportTemplate
          : hotelBookingsExportTemplate,
      filenamePrefix: `${activeTab.toLowerCase()}_bookings_export`,
      emptyMessage: `No ${activeTab.toLowerCase()} bookings available to export`,
      successMessage: `${activeTab} bookings exported`,
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
                <FiArrowRight className="rotate-180" size={20} />
              </button>
              <button
                onClick={handleRefresh}
                className={`p-3 rounded-xl bg-white/10 transition-all border border-white/10 ${isLoading ? "opacity-50 cursor-not-allowed" : "hover:bg-white/20"}`}
                disabled={isLoading}
              >
                <div className={isLoading ? "animate-spin" : ""}>
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
                <h1 className="text-3xl font-black tracking-tight leading-none">
                  Global Bookings Summary
                </h1>
                <p className="text-[10px] mt-2 font-bold uppercase tracking-[2px] opacity-60">
                  Multi-Corporate Administration
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
            ["Flight", "Flight Manifest", FaPlane],
            ["Hotel", "Hotel Manifest", FaHotel],
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

        {/* ── Summary Stats ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            label={`Total ${activeTab}s`}
            value={filtered.length}
            Icon={activeTab === "Flight" ? FaPlane : FaHotel}
            borderCls="border-[#000D26]"
            iconBgCls="bg-slate-100"
            iconColorCls="text-[#000D26]"
          />
          <StatCard
            label="Confirmed"
            value={filtered.filter((b) => isSuccessStatus(b.status)).length}
            Icon={FiCheckCircle}
            borderCls="border-emerald-500"
            iconBgCls="bg-emerald-50"
            iconColorCls="text-emerald-600"
          />
          <StatCard
            label="Pending"
            value={filtered.filter((b) => isPendingStatus(b.status)).length}
            Icon={FiClock}
            borderCls="border-amber-500"
            iconBgCls="bg-amber-50"
            iconColorCls="text-amber-600"
          />
          <StatCard
            label="Total Spend"
            value={`₹${totalSpend.toLocaleString()}`}
            Icon={FaRupeeSign}
            borderCls="border-violet-500"
            iconBgCls="bg-violet-50"
            iconColorCls="text-violet-600"
          />
        </div>

        {/* ── Filters ── */}
        <div className="bg-white rounded-2xl p-6 border shadow-sm" style={{ borderColor: "#e2e8f0" }}>
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-5 ${
            activeTab === "Flight" ? "lg:grid-cols-5" : "lg:grid-cols-6"
          }`}>
            {/* Search */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <FiSearch size={12} /> Search
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Traveller or booking..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 border rounded-xl text-[13px] font-medium outline-none transition-all focus:border-[#003399] focus:ring-2 focus:ring-[#003399]/10 bg-slate-50 hover:bg-white"
                />
                <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              </div>
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
                {corporates.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Date filters */}
            {activeTab === "Flight" ? (
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Travel Date
                </label>
                <input
                  type="date"
                  value={travelDate}
                  onChange={(e) => setTravelDate(e.target.value)}
                  className="w-full px-4 py-2.5 border rounded-xl text-[13px] font-medium outline-none transition-all focus:border-[#003399] focus:ring-2 focus:ring-[#003399]/10 bg-slate-50 hover:bg-white"
                />
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Check-In
                  </label>
                  <input
                    type="date"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="w-full px-4 py-2.5 border rounded-xl text-[13px] font-medium outline-none transition-all focus:border-[#003399] focus:ring-2 focus:ring-[#003399]/10 bg-slate-50 hover:bg-white"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Check-Out
                  </label>
                  <input
                    type="date"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="w-full px-4 py-2.5 border rounded-xl text-[13px] font-medium outline-none transition-all focus:border-[#003399] focus:ring-2 focus:ring-[#003399]/10 bg-slate-50 hover:bg-white"
                  />
                </div>
              </>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Booking From
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2.5 border rounded-xl text-[13px] font-medium outline-none transition-all focus:border-[#003399] focus:ring-2 focus:ring-[#003399]/10 bg-slate-50 hover:bg-white"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={resetFilters}
                className="w-full py-2.5 rounded-xl font-black text-[13px] flex items-center justify-center gap-2 border shadow-sm transition-all hover:bg-slate-100 hover:text-slate-700 bg-white text-slate-500 border-slate-200"
              >
                <FiX size={14} /> Reset
              </button>
            </div>
          </div>
        </div>

        {/* ── Table Section ── */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
          {/* Table Titlebar */}
          <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap gap-3 justify-between items-center bg-slate-50/50">
            {/* Left: title + count */}
            <div>
              <h2 className="font-black text-slate-700 uppercase tracking-tighter text-lg">
                {activeTab} Detailed Report
              </h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                {sortedFiltered.length} records found
              </p>
            </div>

            {/* Right: Export + Scroll controls */}
            <div className="flex items-center gap-2">
              {/* Export */}
            <button
              onClick={handleExport}
              disabled={isLoading || isExporting}
              className="flex items-center justify-center space-x-2 px-5 py-1.5 bg-[#000d26] text-white hover:text-white hover:border-[#C9A84C] transition-all shadow-sm rounded-2xl"
            >
              <FiDownload className="w-4 h-4" />
              <span>{isExporting ? "Exporting..." : "Export"}</span>
            </button>
              {/* Divider */}
              <div className="w-px h-7 bg-slate-200 mx-1" />

              {/* Scroll Left */}
              <button
                onClick={() => handleScrollTable("left")}
                title="Scroll table left"
                className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-[#C9A84C] hover:border-[#C9A84C] transition-all shadow-sm"
              >
                <FaChevronLeft size={15} />
              </button>

              {/* Scroll Right */}
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
          <div ref={tableScrollRef} className="w-full overflow-x-auto">
            {isLoading ? (
              <div className="py-20 text-center">
                <FiRefreshCw className="animate-spin mx-auto text-[#003399] mb-4" size={32} />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">
                  Loading {activeTab.toLowerCase()} bookings...
                </p>
              </div>
            ) : sortedFiltered.length === 0 ? (
              <div className="py-20 text-center">
                <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mx-auto mb-4">
                  <FiSearch size={32} />
                </div>
                <p className="text-sm font-bold text-slate-400">
                  No {activeTab.toLowerCase()} bookings found.
                </p>
              </div>
            ) : activeTab === "Flight" ? (
              <FlightTable
                data={paginatedData}
                onView={handleViewBooking}
                sort={sort}
                onSort={handleSort}
              />
            ) : (
              <HotelTable
                data={paginatedData}
                onView={handleViewBooking}
                sort={sort}
                onSort={handleSort}
              />
            )}
          </div>

          {/* Pagination */}
          <div className="flex flex-wrap gap-3 items-center justify-between px-6 py-3 border-t border-slate-100 bg-white">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Page {currentPage} of {totalPages}
            </span>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              showFirstLast
            />
          </div>

          {/* Footer */}
          <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex flex-wrap gap-2 justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <span>Showing {sortedFiltered.length} {activeTab} Records</span>
            <span>
              Est. Market Value:{" "}
              <span className="text-[#003399]">₹{totalSpend.toLocaleString()}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── FLIGHT TABLE ─────────────────────────────────────────────────────────────
const FlightTable = ({ data, onView, sort, onSort }) => (
  <>
    <table className="min-w-[1240px] w-full table-fixed text-left border-collapse">
      <colgroup>
        <col style={{ width: "12%" }} />
        <col style={{ width: "12%" }} />
        <col style={{ width: "12%" }} />
        <col style={{ width: "13%" }} />
        <col style={{ width: "12%" }} />
        <col style={{ width: "9%" }} />
        <col style={{ width: "8%" }} />
        <col style={{ width: "12%" }} />
        <col style={{ width: "15%" }} />
        <col style={{ width: "5%" }} />
      </colgroup>
      <thead>
        <tr className="bg-gradient-to-r from-[#003399] to-[#000d26] text-white">
          <th className="px-4 xl:px-5 py-5 align-middle text-[10px] font-bold uppercase tracking-wider">Order ID</th>
          <th className="px-4 xl:px-5 py-5 align-middle text-[10px] font-bold uppercase tracking-wider">Payment ID</th>
          <th className="px-4 xl:px-5 py-5 align-middle text-[10px] font-bold">
            <SortHeader label="Booked Date" sortKey="bookedDate" sort={sort} onSort={onSort} />
          </th>
          {["Corporate Account", "Traveller / ID"].map((h) => (
            <th key={h} className="px-4 xl:px-5 py-5 align-middle text-[10px] font-bold uppercase tracking-wider">
              {h}
            </th>
          ))}
          <th className="px-4 xl:px-5 py-5 align-middle text-[10px] font-bold">
            <SortHeader label="Travel Date" sortKey="date" sort={sort} onSort={onSort} />
          </th>
          {["PNR", "Status", "Airline / Route", ""].map((h) => (
            <th key={h} className="px-4 xl:px-5 py-5 align-middle text-[10px] font-bold uppercase tracking-wider">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 text-sm">
        {data.map((b, i) => (
          <tr
            key={b.id || b.orderId || b.empId}
            className="h-[92px] hover:bg-slate-50 transition-colors"
            style={{ background: i % 2 === 0 ? "#ffffff" : "#f8fafc" }}
          >
            {/* Order ID */}
            <td className="px-4 xl:px-5 py-4 align-middle">
              <div className="flex min-h-[52px] items-center">
                <span className="font-mono text-[11px] text-[#003399] font-black truncate block">
                  {truncateId(b.orderId, 22)}
                </span>
              </div>
            </td>

            {/* Payment ID */}
            <td className="px-4 xl:px-5 py-4 align-middle">
              <div className="flex min-h-[52px] items-center">
                <span className="font-mono text-[11px] text-amber-700 font-black truncate block">
                  {truncateId(b.paymentId, 22)}
                </span>
              </div>
            </td>

            {/* Booked Date */}
            <td className="px-4 xl:px-5 py-4 align-middle">
              <div className="flex min-h-[52px] items-center whitespace-nowrap text-slate-500 font-medium text-[12px]">
                {formatDisplayDateTime(b.bookedDate)}
              </div>
            </td>

            {/* Corporate */}
            <td className="px-4 xl:px-5 py-4 align-middle">
              <div className="flex min-h-[52px] items-center">
                <p className="font-bold text-slate-800 text-[12px] truncate">{b.corporate}</p>
              </div>
            </td>

            {/* Traveller */}
            <td className="px-4 xl:px-5 py-4 align-middle">
              <div className="flex min-h-[52px] items-center">
                <p className="font-bold text-[#003399] text-[12px] truncate">{b.employee}</p>
              </div>
            </td>

            {/* Travel Date */}
            <td className="px-4 xl:px-5 py-4 align-middle">
              <div className="flex min-h-[52px] items-center whitespace-nowrap text-slate-500 font-medium text-[12px]">
                {formatDisplayDate(b.date)}
              </div>
            </td>

            {/* PNR */}
            <td className="px-4 xl:px-5 py-4 align-middle">
              <div className="flex min-h-[52px] items-center font-mono font-black text-[12px] text-[#003399] uppercase tracking-tight">
                {b.pnr}
              </div>
            </td>

            {/* Status */}
            <td className="px-4 xl:px-5 py-4 align-middle">
              <div className="flex min-h-[52px] flex-col items-start justify-center gap-1.5">
                <StatusLabel status={b.status} />
                {b.refundStatus && <RefundMeta refundStatus={b.refundStatus} />}
              </div>
            </td>

            {/* Airline / Route */}
            <td className="px-4 xl:px-5 py-4 align-middle">
              <div className="flex min-h-[52px] flex-col justify-center gap-1">
                <div className="flex items-center gap-2">
                  <img
                    src={airlineLogo(b.airlineCode || b.airline)}
                    alt={b.airline || "Airline"}
                    className="w-7 h-7 rounded-md object-contain bg-slate-50 border border-slate-100 flex-shrink-0"
                    onError={(e) => {
                      e.currentTarget.src = "https://via.placeholder.com/32";
                    }}
                  />
                  <p className="font-bold text-slate-700 text-[12px] truncate">{b.destination}</p>
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate pl-9">
                  {b.airline || b.airlineCode || "—"}
                </p>
              </div>
            </td>

            {/* Action */}
            <td className="px-4 xl:px-5 py-4 align-middle text-center">
              <div className="flex min-h-[52px] items-center justify-center">
                <button
                  onClick={() => onView(b, "Flight")}
                  className="p-3 rounded-xl transition-all shadow-sm hover:shadow-md bg-gradient-to-br from-[#003399] to-[#000d26] hover:from-white hover:to-white group"
                  title="View details"
                >
                  <FiArrowRight
                    size={16}
                    className="text-[#E7C695] group-hover:text-[#000d26] transition-colors"
                  />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </>
);

// ─── HOTEL TABLE ──────────────────────────────────────────────────────────────
const HotelTable = ({ data, onView, sort, onSort }) => (
  <>
    <table className="min-w-[1240px] w-full table-fixed text-left border-collapse">
      <colgroup>
        <col style={{ width: "12%" }} />
        <col style={{ width: "12%" }} />
        <col style={{ width: "12%" }} />
        <col style={{ width: "13%" }} />
        <col style={{ width: "12%" }} />
        <col style={{ width: "11%" }} />
        <col style={{ width: "8%" }} />
        <col style={{ width: "11%" }} />
        <col style={{ width: "16%" }} />
        <col style={{ width: "5%" }} />
      </colgroup>
      <thead>
        <tr className="bg-gradient-to-r from-[#003399] to-[#000d26] text-white">
          <th className="px-4 xl:px-5 py-5 align-middle text-[10px] font-bold uppercase tracking-wider">Order ID</th>
          <th className="px-4 xl:px-5 py-5 align-middle text-[10px] font-bold uppercase tracking-wider">Payment ID</th>
          <th className="px-4 xl:px-5 py-5 align-middle text-[10px] font-bold">
            <SortHeader label="Booked Date" sortKey="bookedDate" sort={sort} onSort={onSort} />
          </th>
          {["Corporate Account", "Guest / ID"].map((h) => (
            <th key={h} className="px-4 xl:px-5 py-5 align-middle text-[10px] font-bold uppercase tracking-wider">
              {h}
            </th>
          ))}
          <th className="px-4 xl:px-5 py-5 align-middle text-[10px] font-bold">
            <SortHeader label="Duration" sortKey="checkIn" sort={sort} onSort={onSort} />
          </th>
          {["Amount", "Status", "Hotel / Room", ""].map((h) => (
            <th key={h} className="px-4 xl:px-5 py-5 align-middle text-[10px] font-bold uppercase tracking-wider">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 text-sm">
        {data.map((b, i) => (
          <tr
            key={b.id || b.orderId || b.empId}
            className="h-[92px] hover:bg-slate-50 transition-colors"
            style={{ background: i % 2 === 0 ? "#ffffff" : "#f8fafc" }}
          >
            {/* Order ID */}
            <td className="px-4 xl:px-5 py-4 align-middle">
              <div className="flex min-h-[52px] items-center">
                <span className="font-mono text-[11px] text-[#003399] font-black truncate block">
                  {truncateId(b.orderId, 22)}
                </span>
              </div>
            </td>

            {/* Payment ID */}
            <td className="px-4 xl:px-5 py-4 align-middle">
              <div className="flex min-h-[52px] items-center">
                <span className="font-mono text-[11px] text-amber-700 font-black truncate block">
                  {truncateId(b.paymentId, 22)}
                </span>
              </div>
            </td>

            {/* Booked Date */}
            <td className="px-4 xl:px-5 py-4 align-middle">
              <div className="flex min-h-[52px] items-center whitespace-nowrap text-slate-500 font-medium text-[12px]">
                {formatDisplayDateTime(b.bookedDate)}
              </div>
            </td>

            {/* Corporate */}
            <td className="px-4 xl:px-5 py-4 align-middle">
              <div className="flex min-h-[52px] items-center">
                <p className="font-bold text-slate-800 text-[12px] truncate">{b.corporate}</p>
              </div>
            </td>

            {/* Guest */}
            <td className="px-4 xl:px-5 py-4 align-middle">
              <div className="flex min-h-[52px] items-center">
                <p className="font-bold text-[#003399] text-[12px] truncate">{b.employee}</p>
              </div>
            </td>

            {/* Duration */}
            <td className="px-3 xl:px-4 py-3.5 align-middle">
              <p className="text-slate-600 font-medium text-[12px] whitespace-nowrap">{formatDisplayDate(b.checkIn)}</p>
              <p className="text-[10px] text-slate-400 whitespace-nowrap mt-0.5">→ {formatDisplayDate(b.checkOut)}</p>
            </td>

            {/* Amount */}
            <td className="px-3 xl:px-4 py-3.5 align-middle font-black text-[#003399] text-[12px] whitespace-nowrap">
              ₹{(b.amount || 0).toLocaleString()}
            </td>

            {/* Status */}
            <td className="px-3 xl:px-4 py-3.5 align-middle">
              <div className="flex flex-col items-start gap-1">
                <StatusLabel status={b.status} />
                {b.refundStatus && <RefundMeta refundStatus={b.refundStatus} />}
              </div>
            </td>

            {/* Hotel / Room */}
            <td className="px-3 xl:px-4 py-3.5 align-middle">
              <p className="font-bold text-slate-700 text-[12px] truncate">{b.destination}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate mt-0.5">{b.roomType}</p>
            </td>

            {/* Action */}
            <td className="pl-3 pr-6 xl:pl-4 xl:pr-8 py-3.5 align-middle text-center">
              <button
                onClick={() => onView(b, "Hotel")}
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
        ))}
      </tbody>
    </table>
  </>
);

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function RefundMeta({ refundStatus }) {
  const isProcessed = refundStatus.toLowerCase().includes("process");
  return (
    <div className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-wide leading-none ${
      isProcessed ? "text-emerald-600" : "text-rose-600"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isProcessed ? "bg-emerald-500" : "bg-rose-500"}`} />
      Refund: {refundStatus}
    </div>
  );
}

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

function StatusLabel({ status }) {
  const s = (status || "").toLowerCase();
  const isSuccess = isSuccessStatus(status);
  const isWarn = isPendingStatus(status);
  const isError = ["failed", "cancelled", "error"].includes(s);

  let cls = "bg-slate-100 text-slate-700 border-slate-200";
  if (isSuccess) cls = "bg-emerald-50 text-emerald-700 border-emerald-100";
  else if (isWarn) cls = "bg-amber-50 text-amber-700 border-amber-100";
  else if (isError) cls = "bg-rose-50 text-rose-700 border-rose-100";

  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tight border ${cls}`}>
      {status || "Pending"}
    </span>
  );
}
