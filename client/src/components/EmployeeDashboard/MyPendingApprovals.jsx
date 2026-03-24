import React, { useEffect, useMemo, useState } from "react";
import {
  FiCalendar,
  FiMapPin,
  FiArrowLeft,
  FiFilter,
  FiSearch,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiEye,
  FiRefreshCw,
  FiXCircle,
} from "react-icons/fi";
import { FaPlane } from "react-icons/fa";
import { MdHotel, MdFlightTakeoff } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import { fetchMyBookingRequests } from "../../Redux/Actions/booking.thunks";
import { fetchMyHotelRequests } from "../../Redux/Actions/hotelBooking.thunks";
import { useNavigate } from "react-router-dom";

/* ─────────────────────────────────────────────────────────────── */
/*  Status Config  (mirrors REFUND_CONFIG pattern)                 */
/* ─────────────────────────────────────────────────────────────── */
const STATUS_CONFIG = {
  pending_approval: {
    label: "Pending Approval",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-100",
    dot: "bg-amber-400",
    icon: FiRefreshCw,
    iconColor: "text-amber-500",
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-700",
    badgeBorder: "border-amber-200",
  },
  approved: {
    label: "Approved",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-100",
    dot: "bg-emerald-500",
    icon: FiCheckCircle,
    iconColor: "text-emerald-500",
    badgeBg: "bg-emerald-50",
    badgeText: "text-emerald-700",
    badgeBorder: "border-emerald-200",
  },
  rejected: {
    label: "Rejected",
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-100",
    dot: "bg-red-500",
    icon: FiXCircle,
    iconColor: "text-red-400",
    badgeBg: "bg-red-50",
    badgeText: "text-red-700",
    badgeBorder: "border-red-200",
  },
};

const getStatus = (status) =>
  STATUS_CONFIG[status] || STATUS_CONFIG["pending_approval"];

/* ─────────────────────────────────────────────────────────────── */
/*  Summary Stats                                                  */
/* ─────────────────────────────────────────────────────────────── */
function SummaryStats({ trips }) {
  const total = trips.length;
  const approved = trips.filter((t) => t.status === "approved").length;
  const pending = trips.filter((t) => t.status === "pending_approval").length;
  const expired = trips.filter((t) => t.fareExpired).length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">
          Total Requests
        </p>
        <p className="text-2xl font-black text-slate-800">{total}</p>
      </div>
      <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-4">
        <p className="text-[10px] uppercase tracking-widest text-emerald-500 font-bold mb-1">
          Approved
        </p>
        <p className="text-2xl font-black text-emerald-700">{approved}</p>
      </div>
      <div className="bg-amber-50 rounded-xl border border-amber-100 p-4">
        <p className="text-[10px] uppercase tracking-widest text-amber-500 font-bold mb-1">
          Pending Approval
        </p>
        <p className="text-2xl font-black text-amber-700">{pending}</p>
      </div>
      <div className="bg-red-50 rounded-xl border border-red-100 p-4">
        <p className="text-[10px] uppercase tracking-widest text-red-400 font-bold mb-1">
          Fare Expired
        </p>
        <p className="text-2xl font-black text-red-600">{expired}</p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Flight Card                                                    */
/* ─────────────────────────────────────────────────────────────── */
function FlightRequestCard({ trip, onView }) {
  const cfg = getStatus(trip.status);
  const StatusIcon = cfg.icon;

  const formatDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : null;

  const requestedOn = trip.createdAt
    ? new Date(trip.createdAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* top accent bar — amber for pending, green for approved */}
      <div
        className={`h-[5px] ${
          trip.status === "approved" ? "bg-emerald-500" : "bg-amber-400"
        }`}
      />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <MdFlightTakeoff size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-slate-800 leading-tight">
                Flight Request
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                #{trip.id?.slice(-8).toUpperCase()}
              </p>
            </div>
          </div>

          <div
            className={`flex items-center gap-1.5 ${cfg.badgeBg} ${cfg.badgeText} border ${cfg.badgeBorder} rounded-full px-2.5 py-1 text-[11px] font-semibold shrink-0`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </div>
        </div>

        {/* Destination route */}
        <div className="flex items-center gap-2 mb-1">
          <FiMapPin size={12} className="text-slate-400 shrink-0" />
          <p className="text-[14px] font-bold text-slate-800 leading-snug">
            {trip.destination}
          </p>
        </div>

        {/* Dates */}
        <div className="space-y-1.5 mt-3 mb-4">
          {trip.startDate && (
            <div className="flex items-center gap-2 text-[12px] text-slate-500">
              <FiCalendar size={12} className="text-slate-400 shrink-0" />
              <span>
                Departure:{" "}
                <span className="font-medium text-slate-700">
                  {formatDate(trip.startDate)}
                </span>
              </span>
            </div>
          )}
          {trip.returnDate && (
            <div className="flex items-center gap-2 text-[12px] text-slate-500">
              <FiCalendar size={12} className="text-slate-400 shrink-0" />
              <span>
                Return:{" "}
                <span className="font-medium text-slate-700">
                  {formatDate(trip.returnDate)}
                </span>
              </span>
            </div>
          )}
          {requestedOn && (
            <div className="flex items-center gap-2 text-[12px] text-slate-500">
              <FiClock size={12} className="text-slate-400 shrink-0" />
              <span>Requested on {requestedOn}</span>
            </div>
          )}
        </div>

        {/* Status strip */}
        <div
          className={`flex items-center gap-2 ${cfg.bg} ${cfg.border} border rounded-xl px-3 py-2 mb-4`}
        >
          <StatusIcon size={13} className={cfg.iconColor} />
          <span className={`text-[11px] font-semibold ${cfg.text}`}>
            {cfg.label}
          </span>
          {trip.fareExpired && (
            <span className="ml-auto text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
              FARE EXPIRED
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div>
            {trip.amount && (
              <>
                <p className="text-[11px] text-slate-400 mb-0.5">
                  Est. Amount
                </p>
                <p className="text-[17px] font-bold text-slate-800">
                  ₹{Number(trip.amount).toLocaleString("en-IN")}
                  {trip.currency && (
                    <span className="text-[11px] text-slate-400 font-normal ml-1">
                      {trip.currency}
                    </span>
                  )}
                </p>
              </>
            )}
          </div>
          <button
            onClick={() => onView(trip)}
            className="flex items-center gap-2 bg-[#0A4D68] hover:bg-[#083d52] active:scale-[0.98] text-white text-[12px] font-semibold px-4 py-2 rounded-2xl transition-all duration-150 cursor-pointer border-none"
          >
            <FiEye size={13} />
            View Details
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Hotel Card                                                     */
/* ─────────────────────────────────────────────────────────────── */
function HotelRequestCard({ trip, onView }) {
  const cfg = getStatus(trip.status);
  const StatusIcon = cfg.icon;

  const formatDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : null;

  const requestedOn = trip.createdAt
    ? new Date(trip.createdAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
      <div
        className={`h-[5px] ${
          trip.status === "approved" ? "bg-emerald-500" : "bg-amber-400"
        }`}
      />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
              <MdHotel size={18} className="text-teal-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-slate-800 leading-tight truncate max-w-[170px]">
                {trip.hotelName || "Hotel Request"}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                #{trip.id?.slice(-8).toUpperCase()}
              </p>
            </div>
          </div>

          <div
            className={`flex items-center gap-1.5 ${cfg.badgeBg} ${cfg.badgeText} border ${cfg.badgeBorder} rounded-full px-2.5 py-1 text-[11px] font-semibold shrink-0`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </div>
        </div>

        {/* Location */}
        <div className="flex items-center gap-1.5 text-[12px] text-slate-500 mb-3">
          <FiMapPin size={12} className="text-slate-400 shrink-0" />
          <span className="truncate">{trip.city || "N/A"}</span>
        </div>

        {/* Stay connector */}
        {(trip.startDate || trip.returnDate) && (
          <div className="flex items-center gap-3 mb-3">
            <div className="text-center min-w-[60px]">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                Check-in
              </p>
              <p className="text-[14px] font-bold text-slate-800 leading-tight">
                {formatDate(trip.startDate) || "—"}
              </p>
            </div>
            <div className="flex-1 flex flex-col items-center gap-0.5">
              <div className="flex items-center w-full gap-1">
                <div className="flex-1 border-t border-dashed border-slate-200" />
                <span className="text-xs">🏨</span>
                <div className="flex-1 border-t border-dashed border-slate-200" />
              </div>
            </div>
            <div className="text-center min-w-[60px]">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                Check-out
              </p>
              <p className="text-[14px] font-bold text-slate-800 leading-tight">
                {formatDate(trip.returnDate) || "—"}
              </p>
            </div>
          </div>
        )}

        {/* Meta */}
        <div className="space-y-1.5 mb-4">
          {requestedOn && (
            <div className="flex items-center gap-2 text-[12px] text-slate-500">
              <FiClock size={12} className="text-slate-400 shrink-0" />
              <span>Requested on {requestedOn}</span>
            </div>
          )}
        </div>

        {/* Status strip */}
        <div
          className={`flex items-center gap-2 ${cfg.bg} ${cfg.border} border rounded-xl px-3 py-2 mb-4`}
        >
          <StatusIcon size={13} className={cfg.iconColor} />
          <span className={`text-[11px] font-semibold ${cfg.text}`}>
            {cfg.label}
          </span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div>
            {trip.amount && (
              <>
                <p className="text-[11px] text-slate-400 mb-0.5">
                  Est. Amount
                </p>
                <p className="text-[17px] font-bold text-slate-800">
                  ₹{Number(trip.amount).toLocaleString("en-IN")}
                  {trip.currency && (
                    <span className="text-[11px] text-slate-400 font-normal ml-1">
                      {trip.currency}
                    </span>
                  )}
                </p>
              </>
            )}
          </div>
          <button
            onClick={() => onView(trip)}
            className="flex items-center gap-2 bg-[#0A4D68] hover:bg-[#083d52] active:scale-[0.98] text-white text-[12px] font-semibold px-4 py-2 rounded-2xl transition-all duration-150 cursor-pointer border-none"
          >
            <FiEye size={13} />
            View Details
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Main Page                                                      */
/* ─────────────────────────────────────────────────────────────── */
export default function MyPendingApprovals() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { myRequests, loading: flightLoading } = useSelector(
    (state) => state.bookings,
  );
  const { requests: hotelRequests, loading: hotelLoading } = useSelector(
    (state) => state.hotelBookings,
  );

  const [activeTab, setActiveTab] = useState("flight");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    if (activeTab === "flight") dispatch(fetchMyBookingRequests());
    else dispatch(fetchMyHotelRequests());
  }, [dispatch, activeTab]);

  const sourceData = activeTab === "flight" ? myRequests : hotelRequests;

  const myTrips = useMemo(() => {
    return (sourceData || [])
      .filter((b) => b.requestStatus !== "rejected")
      .map((b) => {
        const segments = b.flightRequest?.segments || [];
        const fareExpiry = b.flightRequest?.fareExpiry;
        const fareExpired =
          b.requestStatus !== "approved" &&
          fareExpiry &&
          new Date() > new Date(fareExpiry);

        const firstOrigin = segments[0]?.origin?.airportCode;
        const lastDest =
          segments[segments.length - 1]?.destination?.airportCode;
        const isRoundTrip =
          segments.length > 1 && firstOrigin === lastDest;

        let destination = "N/A";
        if (activeTab === "hotel") {
          destination = b.hotelRequest?.city || "Hotel Booking";
        } else if (segments.length) {
          if (!isRoundTrip) {
            destination = `${firstOrigin} → ${lastDest}`;
          } else {
            const mid = Math.floor(segments.length / 2);
            const onward = segments.slice(0, mid);
            const ret = segments.slice(mid);
            destination = `${onward[0]?.origin?.airportCode} → ${
              onward[onward.length - 1]?.destination?.airportCode
            }  |  ${ret[0]?.origin?.airportCode} → ${
              ret[ret.length - 1]?.destination?.airportCode
            }`;
          }
        }

        return {
          id: b._id,
          type: activeTab === "hotel" ? "Hotel" : "Flight",
          status: b.requestStatus,
          destination,
          startDate:
            activeTab === "hotel"
              ? b.hotelRequest?.checkInDate
              : segments[0]?.departureDateTime || null,
          returnDate:
            activeTab === "hotel"
              ? b.hotelRequest?.checkOutDate || null
              : isRoundTrip
                ? segments[segments.length - 1]?.departureDateTime
                : null,
          hotelName:
            b.bookingSnapshot?.hotelName ||
            b.hotelRequest?.selectedHotel?.hotelName,
          city:
            b.bookingSnapshot?.city ||
            b.hotelRequest?.selectedHotel?.address ||
            "N/A",
          amount: b.pricingSnapshot?.totalAmount,
          currency: b.pricingSnapshot?.currency,
          createdAt: b.createdAt,
          fareExpired,
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [sourceData, activeTab]);

  const filteredTrips = useMemo(() => {
    return myTrips.filter((t) => {
      const matchStatus =
        statusFilter === "all" ||
        t.status.toLowerCase() === statusFilter.toLowerCase();
      const matchSearch =
        !searchTerm.trim() ||
        t.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.hotelName || "").toLowerCase().includes(searchTerm.toLowerCase());
      const tripDate = new Date(t.startDate);
      const matchStart =
        !startDate || tripDate >= new Date(startDate + "T00:00:00");
      const matchEnd =
        !endDate || tripDate <= new Date(endDate + "T23:59:59");
      return matchStatus && matchSearch && matchStart && matchEnd;
    });
  }, [statusFilter, searchTerm, startDate, endDate, myTrips]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setStatusFilter("all");
    setSearchTerm("");
    setStartDate("");
    setEndDate("");
  };

  const handleView = (trip) => {
    if (trip.type === "Hotel") navigate(`/hotel-booking/${trip.id}`);
    else navigate(`/bookings/${trip.id}/book`);
  };

  const isLoading = flightLoading || hotelLoading;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* ── Sticky Header ── */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 h-[60px] px-6 flex items-center gap-4 shadow-sm">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-teal-600 hover:text-teal-700 text-sm font-semibold transition-colors bg-transparent border-none p-0 cursor-pointer"
        >
          <FiArrowLeft size={15} /> Back
        </button>

        <span className="w-px h-5 bg-slate-200" />
        <h1 className="text-[15px] font-bold text-slate-900">
          My Booking Requests
        </h1>

        {/* Tab toggle */}
        <div className="flex items-center gap-1 ml-4 bg-slate-100 rounded-xl p-1">
          <button
            onClick={() => handleTabChange("flight")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-150 cursor-pointer border-none ${
              activeTab === "flight"
                ? "bg-white text-[#0A4D68] shadow-sm"
                : "bg-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <FaPlane size={12} />
            Flights
          </button>
          <button
            onClick={() => handleTabChange("hotel")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-150 cursor-pointer border-none ${
              activeTab === "hotel"
                ? "bg-white text-[#0A4D68] shadow-sm"
                : "bg-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <MdHotel size={14} />
            Hotels
          </button>
        </div>

        <div className="ml-auto">
          <span className="bg-[#0A4D68]/10 text-[#0A4D68] text-[11px] font-bold px-2.5 py-1 rounded-full">
            {myTrips.length} request{myTrips.length !== 1 ? "s" : ""}
          </span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 py-8 pb-24">
        {/* Page title */}
        <div className="mb-6 flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              activeTab === "flight" ? "bg-blue-50" : "bg-teal-50"
            }`}
          >
            {activeTab === "flight" ? (
              <FaPlane size={16} className="text-blue-600" />
            ) : (
              <MdHotel size={18} className="text-teal-600" />
            )}
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 leading-tight">
              {activeTab === "flight" ? "Flight" : "Hotel"} Requests
            </h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Track and manage your{" "}
              {activeTab === "flight" ? "flight" : "hotel"} booking approvals
            </p>
          </div>
        </div>

        {/* Summary Stats */}
        {!isLoading && <SummaryStats trips={myTrips} />}

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <span className="bg-cyan-50 rounded-lg p-1.5">
              <FiFilter size={13} className="text-teal-600" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Filter Requests
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div className="relative">
              <FiSearch
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder={
                  activeTab === "flight"
                    ? "Search destination, route…"
                    : "Search hotel, city…"
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-[13px] border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition"
              />
            </div>

            {/* Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition text-slate-700"
            >
              <option value="all">All Statuses</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="approved">Approved</option>
            </select>

            {/* Start date */}
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="From date"
              className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition text-slate-500"
            />

            {/* End date */}
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="To date"
              className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition text-slate-500"
            />
          </div>

          {/* Reset */}
          {(searchTerm || statusFilter !== "all" || startDate || endDate) && (
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setStartDate("");
                  setEndDate("");
                }}
                className="text-[12px] text-teal-600 hover:underline font-medium bg-transparent border-none cursor-pointer"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* Loading */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-10 h-10 rounded-full border-2 border-slate-200 border-t-teal-500 animate-spin mb-4" />
            <p className="text-slate-400 text-sm">Loading your requests…</p>
          </div>
        ) : (
          <>
            {/* Results count */}
            <p className="text-[13px] text-slate-500 mb-4">
              Showing{" "}
              <strong className="text-slate-700">{filteredTrips.length}</strong>{" "}
              {activeTab === "flight" ? "flight" : "hotel"} request
              {filteredTrips.length !== 1 ? "s" : ""}
            </p>

            {/* Cards Grid */}
            {filteredTrips.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredTrips.map((trip) =>
                  activeTab === "hotel" ? (
                    <HotelRequestCard
                      key={trip.id}
                      trip={trip}
                      onView={handleView}
                    />
                  ) : (
                    <FlightRequestCard
                      key={trip.id}
                      trip={trip}
                      onView={handleView}
                    />
                  ),
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                  {activeTab === "flight" ? (
                    <FaPlane size={24} className="text-slate-300" />
                  ) : (
                    <MdHotel size={28} className="text-slate-300" />
                  )}
                </div>
                <p className="text-slate-500 font-semibold mb-1">
                  No{" "}
                  {activeTab === "flight" ? "flight" : "hotel"} requests found
                </p>
                <p className="text-sm text-slate-400">
                  Try adjusting your filters
                </p>
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                    setStartDate("");
                    setEndDate("");
                  }}
                  className="mt-4 text-sm text-teal-600 hover:underline font-medium bg-transparent border-none cursor-pointer"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}