//client\src\components\EmployeeDashboard\MyBookings.jsx
import React, { useState, useEffect, useMemo } from "react";
import {
  FiSearch,
  FiEye,
  FiMapPin,
  FiCalendar,
  FiFilter,
  FiMoon,
} from "react-icons/fi";
import { FaPlane, FaHotel } from "react-icons/fa";
import {
  MdHotel,
  MdLocationOn,
  MdCheckCircle,
  MdKingBed,
} from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchMyBookings } from "../../Redux/Actions/booking.thunks";
import { fetchMyHotelBookings } from "../../Redux/Actions/hotelBooking.thunks";
import {
  formatDateWithYear,
  airlineLogo,
  getTotalDuration,
  getStopsLabel,
  getCabinClassLabel,
  airlineThemes,
} from "../../utils/formatter";

/* ─── helpers ─── */
function fmtDate(
  d,
  opts = { day: "2-digit", month: "short", year: "numeric" },
) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", opts);
}

function StatusBadge({ status }) {
  const map = {
    ticketed: {
      bg: "bg-emerald-100",
      text: "text-emerald-700",
      dot: "bg-emerald-500",
      label: "Ticketed",
    },
    voucher_generated: {
      bg: "bg-emerald-100",
      text: "text-emerald-700",
      dot: "bg-emerald-500",
      label: "Confirmed",
    },
    confirmed: {
      bg: "bg-emerald-100",
      text: "text-emerald-700",
      dot: "bg-emerald-500",
      label: "Confirmed",
    },
    failed: {
      bg: "bg-red-100",
      text: "text-red-700",
      dot: "bg-red-500",
      label: "Failed",
    },
    cancelled: {
      bg: "bg-red-100",
      text: "text-red-700",
      dot: "bg-red-500",
      label: "Cancelled",
    },
    ticket_pending: {
      bg: "bg-amber-100",
      text: "text-amber-700",
      dot: "bg-amber-400",
      label: "Processing",
    },
  };
  const s = map[status?.toLowerCase()] || {
    bg: "bg-slate-100",
    text: "text-slate-600",
    dot: "bg-slate-400",
    label: status || "Unknown",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full ${s.bg} ${s.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
      {s.label}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Flight Booking Card                                            */
/* ─────────────────────────────────────────────────────────────── */
function FlightBookingCard({ b, navigate }) {
  const snapshot = b.bookingSnapshot || {};
  const sectors = snapshot.sectors || [];

  const segments = b.flightRequest?.segments || [];
  const firstSeg = segments[0];
  const lastSeg = segments[segments.length - 1];

  const airlineCode = (
    b.flightRequest?.segments?.[0]?.airlineCode ||
    // case 1 (with raw)
    b.bookingResult?.providerResponse?.raw?.Response?.Response?.FlightItinerary
      ?.AirlineCode ||
    // case 2 (without raw)
    b.bookingResult?.providerResponse?.Response?.Response?.FlightItinerary
      ?.AirlineCode ||
    ""
  ).toUpperCase();
  const departure = firstSeg?.origin;
  const arrival = lastSeg?.destination;

  const departureTime = firstSeg?.departureDateTime;
  const arrivalTime = lastSeg?.arrivalDateTime;

  const totalDuration = getTotalDuration(segments);
  const stopsLabel = getStopsLabel(segments);
  const cabinClass = getCabinClassLabel(b.flightRequest?.cabinClass);

  const logo = airlineLogo(airlineCode) || "/default-airline.png";

  const formattedRoute =
    sectors.length === 1
      ? sectors[0].replace("-", " → ")
      : sectors.length >= 2
        ? `${sectors[0].replace("-", " → ")}  ·  ${sectors[1].replace("-", " → ")}`
        : "N/A → N/A";

  // const logo = airlineLogo?.(snapshot.airlineCode);

  const theme = airlineThemes[airlineCode] || {
    primary: "#0A4D68",
    secondary: "#088395",
    accent: "#fff",
  };

  const airlineName =
    b.flightRequest?.segments?.[0]?.airlineName ||
    b.bookingResult?.providerResponse?.raw?.Response?.Response?.FlightItinerary
      ?.Segments?.[0]?.Airline?.AirlineName ||
    b.bookingSnapshot?.airline ||
    airlineCode;

  console.log("AIRLINE CODE:", airlineCode);

  return (
    <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all border border-slate-200 overflow-hidden group">
      <div className="h-1 w-full bg-linear-to-r from-[#0A4D68] to-[#088395]" />
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Airline logo */}
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border"
              style={{
                backgroundColor: `${theme.primary}15`,
                borderColor: `${theme.primary}30`,
              }}
            >
              <img
                src={logo}
                alt={airlineCode}
                className="w-6 h-6 object-contain"
              />
            </div>

            {/* Airline info */}
            <div>
              <p className="text-sm font-bold text-slate-800">{airlineName}</p>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                {cabinClass}
              </p>
            </div>
          </div>

          <StatusBadge status={b.executionStatus} />
        </div>

        {/* Route */}
        <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-2">
          <FiMapPin size={13} className="text-[#088395] shrink-0" />
          {formattedRoute}
        </div>

        {/* Dates */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
          <FiCalendar size={12} className="shrink-0" />
          {snapshot.returnDate
            ? `${formatDateWithYear(snapshot.travelDate)}  ·  ${formatDateWithYear(snapshot.returnDate)}`
            : formatDateWithYear(snapshot.travelDate) || "—"}
        </div>
        <p className="text-[11px] text-slate-400 mb-4">
          Booked on {fmtDate(b.createdAt)}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <span className="text-lg font-black text-[#0A4D68]">
            ₹
            {Number(b.pricingSnapshot?.totalAmount || 0).toLocaleString(
              "en-IN",
            )}
          </span>
          <button
            onClick={() => navigate(`/my-bookings/${b._id}`)}
            className="flex items-center gap-1.5 text-xs font-bold text-white bg-[#0A4D68] hover:bg-[#083d52] px-4 py-2 rounded-xl transition-all active:scale-95"
          >
            <FiEye size={13} /> View Details
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Hotel Booking Card                                             */
/* ─────────────────────────────────────────────────────────────── */
function HotelBookingCard({ b, navigate }) {
  const snapshot = b.bookingSnapshot || {};
  const hotelReq = b.hotelRequest || {};
  const selectedHotel = hotelReq.selectedHotel || {};
  const selectedRoom = hotelReq.selectedRoom || {};
  // const rawRoom = selectedRoom.rawRoomData || {};
  const rawRooms = Array.isArray(selectedRoom.rawRoomData)
  ? selectedRoom.rawRoomData
  : selectedRoom.rawRoomData
  ? [selectedRoom.rawRoomData]
  : [];

// ✅ FINAL CORRECT PRICE (MULTI ROOM SAFE)
const finalPrice = rawRooms.reduce((total, room) => {
  if (room.TotalFare) return total + room.TotalFare;

  if (room.Price?.totalFare) return total + room.Price.totalFare;

  if (Array.isArray(room.DayRates)) {
    const roomTotal = room.DayRates.reduce((sum, days) => {
      return sum + days.reduce((dSum, d) => dSum + (d.BasePrice || 0), 0);
    }, 0);
    return total + roomTotal;
  }

  return total;
}, 0);

  const hotelName = snapshot.hotelName || selectedHotel.hotelName || "Hotel";
  const city = selectedHotel.city || snapshot.city || "";
  const checkIn = snapshot.checkInDate || hotelReq.checkInDate;
  const checkOut = snapshot.checkOutDate || hotelReq.checkOutDate;
  const nights =
    checkIn && checkOut
      ? Math.max(
          1,
          Math.ceil(
            (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24),
          ),
        )
      : 1;
  const roomType =
    rawRooms?.Name?.[0] ||
    selectedRoom?.roomTypeName ||
    b?.bookingSnapshot?.roomType ||
    "Room details unavailable";
  const images = rawRooms.images || [];
  const [currentIndex, setCurrentIndex] = useState(0);

  // auto change every 500ms
  useEffect(() => {
    if (!images.length) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [images]);

  const heroImage = images[currentIndex] || null;
  const mealType = selectedRoom.mealType || "—";
  const cancelPolicies =
    rawRooms?.CancelPolicies ||
    selectedRoom?.cancelPolicies ||
    b?.raw?.Rooms?.[0]?.CancelPolicies ||
    [];

  const refundable = cancelPolicies.some(
    (p) => Number(p.CancellationCharge) === 0,
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all border border-slate-200 overflow-hidden group">
      {/* Hotel image / gradient fallback */}
      <div className="relative h-36 overflow-hidden bg-linear-to-br from-[#0A4D68] to-[#088395]">
        {heroImage ? (
          <div className="relative w-full h-full">
            {images.map((img, i) => (
              <img
                key={i}
                src={img}
                alt={hotelName}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-in-out ${
                  i === currentIndex ? "opacity-100" : "opacity-0"
                }`}
              />
            ))}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <MdHotel size={40} className="text-white/25" />
          </div>
        )}
        {/* Dark gradient over image bottom */}
        <div className="absolute inset-0 bg-linear-to-t from-[#0d1b2a]/80 via-transparent to-transparent" />

        {/* Status top-right */}
        <div className="absolute top-3 right-3">
          <StatusBadge status={b.executionStatus} />
        </div>

        {/* Hotel name + city over image */}
        <div className="absolute bottom-3 left-4 right-12">
          <p className="text-white font-black text-sm leading-snug line-clamp-1 drop-shadow-sm">
            {hotelName}
          </p>
          {city && (
            <div className="flex items-center gap-1 mt-0.5">
              <MdLocationOn size={11} className="text-teal-400 shrink-0" />
              <p className="text-white/70 text-[11px] font-medium">{city}</p>
            </div>
          )}
        </div>
      </div>

      <div className="p-4">
        {/* Stay dates */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <FiCalendar size={12} className="text-[#088395] shrink-0" />
            <span className="font-semibold">
              {fmtDate(checkIn, { day: "2-digit", month: "short" })}
            </span>
            <span className="text-slate-300">→</span>
            <span className="font-semibold">
              {fmtDate(checkOut, {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
          <div className="flex items-center gap-1 bg-[#0A4D68]/8 border border-[#0A4D68]/15 px-2 py-0.5 rounded-full">
            <FiMoon size={10} className="text-[#0A4D68]" />
            <span className="text-[11px] font-bold text-[#0A4D68]">
              {nights}N
            </span>
          </div>
        </div>

        {/* Room type */}
        <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-2">
          <MdKingBed size={14} className="text-slate-400 shrink-0" />
          <span className="font-medium line-clamp-1">{roomType}</span>
        </div>

        {/* Meal + refundable pills */}
        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
          {mealType !== "—" && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
              <MdCheckCircle size={10} /> {mealType}
            </span>
          )}
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
              refundable
                ? "text-teal-700 bg-teal-50 border-teal-100"
                : "text-slate-500 bg-slate-50 border-slate-200"
            }`}
          >
            {refundable ? "✓ Refundable" : "Non-refundable"}
          </span>
        </div>

        <p className="text-[11px] text-slate-400 mb-3">
          Booked on {fmtDate(b.createdAt)}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <span className="text-lg font-black text-[#0A4D68]">
            ₹
            {Number(finalPrice || 0).toLocaleString(
              "en-IN",
            )}
          </span>
          <button
            onClick={() => navigate(`/my-hotel-booking/${b._id}`)}
            className="flex items-center gap-1.5 text-xs font-bold text-white bg-[#0A4D68] hover:bg-[#083d52] px-4 py-2 rounded-xl transition-all active:scale-95"
          >
            <FiEye size={13} /> View Details
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Main Page                                                      */
/* ─────────────────────────────────────────────────────────────── */
export default function MyBookings() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Separate Redux slices for flights & hotels
  const { list: flightBookings = [], loading: flightLoading } = useSelector(
    (s) => s.bookings,
  );
  const { completed: hotelBookings, loading: hotelLoading } = useSelector(
    (s) => s.hotelBookings,
  );

  const [activeTab, setActiveTab] = useState("flight");
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  /* Fetch on tab switch */
  useEffect(() => {
    if (activeTab === "flight") dispatch(fetchMyBookings());
    else dispatch(fetchMyHotelBookings());
  }, [activeTab, dispatch]);

  const loading = activeTab === "flight" ? flightLoading : hotelLoading;
  const bookings = activeTab === "flight" ? flightBookings : hotelBookings;

  /* ── Filter logic ── */
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      // ✅ ONLY SHOW VALID FLIGHT BOOKINGS
      if (activeTab === "flight") {
        const status = b.executionStatus?.toLowerCase();

        if (
          status === "failed" ||
          status === "cancelled" ||
          status === "cancel_requested" ||
          status === "not_started"
        ) {
          return false; // ❌ skip these completely
        }
      }
      const matchesStatus =
        statusFilter === "All" ||
        b.executionStatus?.toLowerCase() === statusFilter.toLowerCase();

      if (activeTab === "hotel") {
        const amendmentStatus = b?.amendment?.status;

        // hide if amendment is initiated
        if (amendmentStatus && amendmentStatus !== "not_requested") {
          return false;
        }
      }

      if (activeTab === "flight") {
        const seg = b.flightRequest?.segments?.[0];
        const destCity = seg?.destination?.city?.toLowerCase() || "";
        const deptDate = seg?.departureDateTime
          ? new Date(seg.departureDateTime)
          : null;
        return (
          matchesStatus &&
          (!searchTerm || destCity.includes(searchTerm.toLowerCase())) &&
          (!startDate ||
            (deptDate && deptDate >= new Date(startDate + "T00:00:00"))) &&
          (!endDate ||
            (deptDate && deptDate <= new Date(endDate + "T23:59:59")))
        );
      } else {
        const hotelReq = b.hotelRequest || {};
        const hotelName = (
          b.bookingSnapshot?.hotelName ||
          hotelReq.selectedHotel?.hotelName ||
          ""
        ).toLowerCase();
        const city = (hotelReq.selectedHotel?.city || "").toLowerCase();
        const ciDate = hotelReq.checkInDate
          ? new Date(hotelReq.checkInDate)
          : null;
        return (
          matchesStatus &&
          (!searchTerm ||
            hotelName.includes(searchTerm.toLowerCase()) ||
            city.includes(searchTerm.toLowerCase())) &&
          (!startDate ||
            (ciDate && ciDate >= new Date(startDate + "T00:00:00"))) &&
          (!endDate || (ciDate && ciDate <= new Date(endDate + "T23:59:59")))
        );
      }
    });
  }, [bookings, statusFilter, searchTerm, startDate, endDate, activeTab]);

  const filteredFlightCount = useMemo(() => {
  return flightBookings.filter((b) => {
    const status = b.executionStatus?.toLowerCase();

    if (
      status === "failed" ||
      status === "cancelled" ||
      status === "cancel_requested" ||
      status === "not_started"
    ) {
      return false;
    }

    return true;
  }).length;
}, [flightBookings]);

const filteredHotelCount = useMemo(() => {
  return hotelBookings.filter((b) => {
    const amendmentStatus = b?.amendment?.status;

    if (amendmentStatus && amendmentStatus !== "not_requested") {
      return false;
    }

    return true;
  }).length;
}, [hotelBookings]);

  const statusOptions =
    activeTab === "flight"
      ? ["All", "ticketed", "ticket_pending", "failed", "cancelled"]
      : ["All", "voucher_generated", "confirmed", "failed", "cancelled"];

  const resetFilters = () => {
    setStatusFilter("All");
    setSearchTerm("");
    setStartDate("");
    setEndDate("");
  };

  const hasActiveFilters =
    statusFilter !== "All" || searchTerm || startDate || endDate;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* ══════════════════════════════════════
          HEADER BAND
      ══════════════════════════════════════ */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Top row — title + CTA */}
          <div className="flex items-center justify-between py-5">
            <div>
              <h1 className="text-2xl font-black text-[#0A4D68] tracking-tight">
                My Bookings
              </h1>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">
                View and manage all your travel bookings
              </p>
            </div>
            <button
              onClick={() =>
                navigate(
                  activeTab === "flight" ? "/search-flight" : "/search-hotel",
                )
              }
              className="flex items-center gap-2 bg-linear-to-r from-[#0A4D68] to-[#088395] text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:from-[#083d52] hover:to-[#066876] transition-all active:scale-95 shadow-md shadow-[#0A4D68]/20"
            >
              {activeTab === "flight" ? (
                <FaPlane size={13} />
              ) : (
                <FaHotel size={13} />
              )}
              {activeTab === "flight" ? "Book a Flight" : "Book a Hotel"}
            </button>
          </div>

          {/* Tab strip */}
          <div className="flex gap-0 -mb-px">
            {[
              {
                key: "flight",
                label: "Flights",
                Icon: FaPlane,
                count: filteredFlightCount,
              },
              {
                key: "hotel",
                label: "Hotels",
                Icon: FaHotel,
                count: filteredHotelCount,
              },
            ].map(({ key, label, Icon, count }) => (
              <button
                key={key}
                onClick={() => {
                  setActiveTab(key);
                  resetFilters();
                }}
                className={`relative flex items-center gap-2 px-7 py-3.5 text-sm font-bold border-b-2 transition-all focus:outline-none ${
                  activeTab === key
                    ? "border-[#0A4D68] text-[#0A4D68]"
                    : "border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-200"
                }`}
              >
                <Icon size={13} />
                {label}
                {count > 0 && (
                  <span
                    className={`text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none ${
                      activeTab === key
                        ? "bg-[#0A4D68] text-white"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          FILTERS
      ══════════════════════════════════════ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-lg bg-[#0A4D68]/8 flex items-center justify-center">
              <FiFilter size={12} className="text-[#0A4D68]" />
            </div>
            <h2 className="text-sm font-bold text-slate-700">
              Filter Bookings
            </h2>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="ml-auto text-xs text-red-500 font-semibold hover:text-red-700 transition"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-white outline-none focus:border-[#0A4D68] focus:ring-2 focus:ring-[#0A4D68]/10 transition"
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s === "All"
                    ? "All Statuses"
                    : s
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, (c) => c.toUpperCase())}
                </option>
              ))}
            </select>

            <div className="relative">
              <FiCalendar
                size={13}
                className="absolute left-3 top-3 text-slate-400 pointer-events-none"
              />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-700 bg-white w-full outline-none focus:border-[#0A4D68] focus:ring-2 focus:ring-[#0A4D68]/10 transition"
              />
            </div>

            <div className="relative">
              <FiCalendar
                size={13}
                className="absolute left-3 top-3 text-slate-400 pointer-events-none"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-700 bg-white w-full outline-none focus:border-[#0A4D68] focus:ring-2 focus:ring-[#0A4D68]/10 transition"
              />
            </div>

            <div className="relative">
              <FiSearch
                size={13}
                className="absolute left-3 top-3 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                placeholder={
                  activeTab === "flight"
                    ? "Search destination…"
                    : "Search hotel or city…"
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-700 bg-white w-full outline-none focus:border-[#0A4D68] focus:ring-2 focus:ring-[#0A4D68]/10 transition"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          RESULTS
      ══════════════════════════════════════ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-5 pb-16">
        {/* Count line */}
        {!loading && bookings.length > 0 && (
          <p className="text-xs text-slate-400 font-medium mb-4">
            Showing{" "}
            <span className="font-bold text-slate-600">
              {filteredBookings.length}
            </span>{" "}
            {activeTab} booking{filteredBookings.length !== 1 ? "s" : ""}
            {filteredBookings.length !== bookings.length &&
              ` (filtered from ${bookings.length})`}
          </p>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden animate-pulse"
              >
                {activeTab === "hotel" && <div className="h-36 bg-slate-200" />}
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-slate-200 rounded-lg w-2/3" />
                  <div className="h-3 bg-slate-100 rounded-lg w-full" />
                  <div className="h-3 bg-slate-100 rounded-lg w-4/5" />
                  <div className="h-8 bg-slate-200 rounded-xl mt-4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredBookings.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center">
              {activeTab === "flight" ? (
                <FaPlane size={32} className="text-slate-300" />
              ) : (
                <FaHotel size={32} className="text-slate-300" />
              )}
            </div>
            <p className="text-slate-500 font-semibold text-sm">
              {bookings.length === 0
                ? `No ${activeTab} bookings yet`
                : "No bookings match your filters"}
            </p>
            {bookings.length === 0 && (
              <button
                onClick={() =>
                  navigate(
                    activeTab === "flight" ? "/search-flight" : "/search-hotel",
                  )
                }
                className="text-sm font-bold text-white bg-[#0A4D68] px-6 py-2.5 rounded-xl hover:bg-[#083d52] transition"
              >
                {activeTab === "flight" ? "Search Flights" : "Search Hotels"}
              </button>
            )}
          </div>
        )}

        {/* Card grid */}
        {!loading && filteredBookings.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredBookings.map((b) =>
              activeTab === "flight" ? (
                <FlightBookingCard key={b._id} b={b} navigate={navigate} />
              ) : (
                <HotelBookingCard key={b._id} b={b} navigate={navigate} />
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}
