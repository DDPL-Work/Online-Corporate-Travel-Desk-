import React, { useEffect, useMemo, useState } from "react";
import {
  FiCalendar,
  FiMapPin,
  FiFilter,
  FiSearch,
  FiArrowLeft,
  FiClock,
  FiEye,
  FiCheckCircle,
} from "react-icons/fi";
import { FaPlane } from "react-icons/fa";
import { MdHotel, MdFlightTakeoff } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchMyBookings } from "../../Redux/Actions/booking.thunks";
import { fetchMyHotelBookings } from "../../Redux/Actions/hotelBooking.thunks";
import { formatDateWithYear } from "../../utils/formatter";

/* ─────────────────────────────────────────────────────────────── */
/*  Summary Stats                                                  */
/* ─────────────────────────────────────────────────────────────── */
function SummaryStats({ flightTrips, hotelTrips }) {
  const totalSpend = [...flightTrips, ...hotelTrips].reduce(
    (sum, t) => sum + (t.pricingSnapshot?.totalAmount || 0),
    0,
  );

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">
          Total Upcoming
        </p>
        <p className="text-2xl font-black text-slate-800">
          {flightTrips.length + hotelTrips.length}
        </p>
      </div>
      <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
        <p className="text-[10px] uppercase tracking-widest text-blue-500 font-bold mb-1">
          Flights
        </p>
        <p className="text-2xl font-black text-blue-700">
          {flightTrips.length}
        </p>
      </div>
      <div className="bg-teal-50 rounded-xl border border-teal-100 p-4">
        <p className="text-[10px] uppercase tracking-widest text-teal-500 font-bold mb-1">
          Hotels
        </p>
        <p className="text-2xl font-black text-teal-700">{hotelTrips.length}</p>
      </div>
      <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-4">
        <p className="text-[10px] uppercase tracking-widest text-emerald-500 font-bold mb-1">
          Total Spend
        </p>
        <p className="text-2xl font-black text-emerald-700">
          ₹{totalSpend.toLocaleString("en-IN")}
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Urgency helper                                                 */
/* ─────────────────────────────────────────────────────────────── */
function getUrgency(dateStr) {
  if (!dateStr) return null;
  const daysUntil = Math.ceil(
    (new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24),
  );
  if (daysUntil <= 3)
    return {
      bg: "bg-red-50",
      text: "text-red-600",
      border: "border-red-100",
      label: `${daysUntil}d away`,
    };
  if (daysUntil <= 7)
    return {
      bg: "bg-amber-50",
      text: "text-amber-600",
      border: "border-amber-100",
      label: `${daysUntil}d away`,
    };
  return {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-100",
    label: `${daysUntil}d away`,
  };
}

/* ─────────────────────────────────────────────────────────────── */
/*  Flight Trip Card                                               */
/* ─────────────────────────────────────────────────────────────── */
function FlightTripCard({ trip, onView }) {
  const snapshot = trip.bookingSnapshot || {};
  const sectors = (snapshot.sectors || [])
    .map((s) => s.replace("-", " → "))
    .join("  |  ");
  const dates = [snapshot.travelDate, snapshot.returnDate]
    .filter(Boolean)
    .map((d) => formatDateWithYear(d))
    .join("  →  ");
  const urgency = getUrgency(snapshot.travelDate);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="h-[5px] bg-[#0A4D68]" />
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <MdFlightTakeoff size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-slate-800 leading-tight">
                Flight Trip
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                #{trip._id?.slice(-8).toUpperCase()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full px-2.5 py-1 text-[11px] font-semibold shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Ticketed
          </div>
        </div>

        {/* Destination */}
        <div className="flex items-center gap-2 mb-3">
          <FiMapPin size={12} className="text-slate-400 shrink-0" />
          <p className="text-[14px] font-bold text-slate-800 leading-snug">
            {snapshot.city || sectors || "N/A"}
          </p>
        </div>

        {/* Dates */}
        <div className="space-y-1.5 mb-4">
          {dates && (
            <div className="flex items-center gap-2 text-[12px] text-slate-500">
              <FiCalendar size={12} className="text-slate-400 shrink-0" />
              <span className="font-medium text-slate-700">{dates}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-[12px] text-slate-500">
            <FiClock size={12} className="text-slate-400 shrink-0" />
            <span>Booked on {formatDateWithYear(trip.createdAt)}</span>
          </div>
        </div>

        {/* Countdown strip */}
        {urgency && (
          <div
            className={`flex items-center gap-2 ${urgency.bg} ${urgency.border} border rounded-xl px-3 py-2 mb-4`}
          >
            <FiCheckCircle size={13} className={urgency.text} />
            <span className={`text-[11px] font-semibold ${urgency.text}`}>
              Trip confirmed
            </span>
            <span className={`ml-auto text-[11px] font-bold ${urgency.text}`}>
              {urgency.label}
            </span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-end justify-end pt-3 border-t border-slate-100">
          {/* <div>
            {trip.pricingSnapshot?.totalAmount && (
              <>
                <p className="text-[11px] text-slate-400 mb-0.5">Total fare</p>
                <p className="text-[17px] font-bold text-slate-800">
                  ₹
                  {Number(trip.pricingSnapshot.totalAmount).toLocaleString(
                    "en-IN",
                  )}
                </p>
              </>
            )}
          </div> */}
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
/*  Hotel Trip Card                                                */
/* ─────────────────────────────────────────────────────────────── */
function HotelTripCard({ trip, onView }) {
  const snapshot = trip.bookingSnapshot || {};
  const checkIn = snapshot.checkInDate || snapshot.travelDate;
  const checkOut = snapshot.checkOutDate || snapshot.returnDate;
  const nights =
    checkIn && checkOut
      ? Math.ceil(
          (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24),
        )
      : null;
  const urgency = getUrgency(checkIn);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="h-[5px] bg-[#0A4D68]" />
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
              <MdHotel size={18} className="text-teal-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-slate-800 leading-tight truncate max-w-[170px]">
                {snapshot.hotelName || "Hotel Stay"}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                #{trip._id?.slice(-8).toUpperCase()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full px-2.5 py-1 text-[11px] font-semibold shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Booked
          </div>
        </div>

        {/* Address */}
        {snapshot.address && (
          <div className="flex items-center gap-1.5 text-[12px] text-slate-500 mb-3">
            <FiMapPin size={12} className="text-slate-400 shrink-0" />
            <span className="truncate">{snapshot.address}</span>
          </div>
        )}

        {/* Stay connector */}
        {(checkIn || checkOut) && (
          <div className="flex items-center gap-3 mb-3">
            <div className="text-center min-w-[60px]">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                Check-in
              </p>
              <p className="text-[14px] font-bold text-slate-800 leading-tight">
                {checkIn
                  ? new Date(checkIn).toLocaleDateString("en-GB").slice(0, 5)
                  : "—"}
              </p>
            </div>
            <div className="flex-1 flex flex-col items-center gap-0.5">
              <div className="flex items-center w-full gap-1">
                <div className="flex-1 border-t border-dashed border-slate-200" />
                <span className="text-xs">🏨</span>
                <div className="flex-1 border-t border-dashed border-slate-200" />
              </div>
              {nights && (
                <span className="text-[10px] text-slate-400 font-medium">
                  {nights} Night{nights !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div className="text-center min-w-[60px]">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                Check-out
              </p>
              <p className="text-[14px] font-bold text-slate-800 leading-tight">
                {checkOut
                  ? new Date(checkOut).toLocaleDateString("en-GB").slice(0, 5)
                  : "—"}
              </p>
            </div>
          </div>
        )}

        {/* Booked on */}
        <div className="flex items-center gap-2 text-[12px] text-slate-500 mb-4">
          <FiClock size={12} className="text-slate-400 shrink-0" />
          <span>Booked on {formatDateWithYear(trip.createdAt)}</span>
        </div>

        {/* Countdown strip */}
        {urgency && (
          <div
            className={`flex items-center gap-2 ${urgency.bg} ${urgency.border} border rounded-xl px-3 py-2 mb-4`}
          >
            <FiCheckCircle size={13} className={urgency.text} />
            <span className={`text-[11px] font-semibold ${urgency.text}`}>
              Stay confirmed
            </span>
            <span className={`ml-auto text-[11px] font-bold ${urgency.text}`}>
              {urgency.label}
            </span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-end justify-end pt-3 border-t border-slate-100">
          {/* <div>
            {trip.pricingSnapshot?.totalAmount && (
              <>
                <p className="text-[11px] text-slate-400 mb-0.5">Total fare</p>
                <p className="text-[17px] font-bold text-slate-800">
                  ₹
                  {Number(trip.pricingSnapshot.totalAmount).toLocaleString(
                    "en-IN",
                  )}
                </p>
              </>
            )}
          </div> */}
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
export default function MyUpcomingTrips() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("flight");
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { list: flightBookings = [], loading: flightLoading } = useSelector(
    (state) => state.bookings,
  );
  const { completed: hotelBookings = [], loading: hotelLoading } = useSelector(
    (state) => state.hotelBookings,
  );

  useEffect(() => {
    dispatch(fetchMyBookings());
    dispatch(fetchMyHotelBookings());
  }, [dispatch]);

  /* ── Upcoming flights ── */
  const upcomingFlights = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return flightBookings
      .filter((b) => {
        const travelDate = b.bookingSnapshot?.travelDate;
        return (
          b.executionStatus === "ticketed" &&
          travelDate &&
          new Date(travelDate) >= today
        );
      })
      .sort(
        (a, b) =>
          new Date(a.bookingSnapshot.travelDate) -
          new Date(b.bookingSnapshot.travelDate),
      );
  }, [flightBookings]);

  /* ── Upcoming hotels ── */
  const upcomingHotels = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return hotelBookings
      .filter((b) => {
        const snapshot = b.bookingSnapshot || {};
        const checkInDate = snapshot.checkInDate || snapshot.travelDate;

        // 🔥 TBO amendment status
        const tboStatus =
          b?.amendment?.providerResponse?.HotelChangeRequestStatusResult
            ?.ChangeRequestStatus;

        const localStatus = b?.amendment?.status;

        // ❌ EXCLUDE if amendment exists (any stage)
        const isAmendmentActive =
          localStatus === "requested" ||
          localStatus === "in_progress" ||
          tboStatus === 0 ||
          tboStatus === 1 ||
          tboStatus === 2 || // processed (cancelled)
          tboStatus === 3; // rejected

        return (
          ["ticketed", "voucher_generated"].includes(b.executionStatus) &&
          checkInDate &&
          new Date(checkInDate) >= today &&
          !isAmendmentActive // 🔥 THIS IS THE KEY FIX
        );
      })
      .sort((a, b) => {
        const aDate =
          a.bookingSnapshot?.checkInDate || a.bookingSnapshot?.travelDate;
        const bDate =
          b.bookingSnapshot?.checkInDate || b.bookingSnapshot?.travelDate;

        return new Date(aDate) - new Date(bDate);
      });
  }, [hotelBookings]);

  /* ── Filtered flights ── */
  const filteredFlights = useMemo(() => {
    return upcomingFlights.filter((trip) => {
      const snapshot = trip.bookingSnapshot || {};
      const destination = (snapshot.city || "").toLowerCase();
      const sectors = (snapshot.sectors || []).join(" ").toLowerCase();
      const travelDate = snapshot.travelDate
        ? new Date(snapshot.travelDate)
        : null;
      return (
        (!searchTerm ||
          destination.includes(searchTerm.toLowerCase()) ||
          sectors.includes(searchTerm.toLowerCase())) &&
        (!startDate ||
          (travelDate && travelDate >= new Date(startDate + "T00:00:00"))) &&
        (!endDate ||
          (travelDate && travelDate <= new Date(endDate + "T23:59:59")))
      );
    });
  }, [upcomingFlights, searchTerm, startDate, endDate]);

  /* ── Filtered hotels ── */
  const filteredHotels = useMemo(() => {
    return upcomingHotels.filter((trip) => {
      const snapshot = trip.bookingSnapshot || {};
      const name = (snapshot.hotelName || "").toLowerCase();
      const address = (snapshot.address || "").toLowerCase();
      const city = (snapshot.city || "").toLowerCase();
      const checkIn = snapshot.checkInDate
        ? new Date(snapshot.checkInDate)
        : null;
      return (
        (!searchTerm ||
          name.includes(searchTerm.toLowerCase()) ||
          address.includes(searchTerm.toLowerCase()) ||
          city.includes(searchTerm.toLowerCase())) &&
        (!startDate ||
          (checkIn && checkIn >= new Date(startDate + "T00:00:00"))) &&
        (!endDate || (checkIn && checkIn <= new Date(endDate + "T23:59:59")))
      );
    });
  }, [upcomingHotels, searchTerm, startDate, endDate]);

  const activeData = activeTab === "flight" ? filteredFlights : filteredHotels;
  const hasFilters = searchTerm || startDate || endDate;
  const isLoading = flightLoading || hotelLoading;

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchTerm("");
    setStartDate("");
    setEndDate("");
  };

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
          My Upcoming Trips
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
            <FaPlane size={11} />
            Flights
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === "flight" ? "bg-blue-100 text-blue-600" : "bg-slate-200 text-slate-500"}`}
            >
              {upcomingFlights.length}
            </span>
          </button>
          <button
            onClick={() => handleTabChange("hotel")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-150 cursor-pointer border-none ${
              activeTab === "hotel"
                ? "bg-white text-[#0A4D68] shadow-sm"
                : "bg-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <MdHotel size={13} />
            Hotels
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === "hotel" ? "bg-teal-100 text-teal-600" : "bg-slate-200 text-slate-500"}`}
            >
              {upcomingHotels.length}
            </span>
          </button>
        </div>

        <div className="ml-auto">
          <span className="bg-[#0A4D68]/10 text-[#0A4D68] text-[11px] font-bold px-2.5 py-1 rounded-full">
            {activeData.length} {activeTab === "flight" ? "flight" : "hotel"}
            {activeData.length !== 1 ? "s" : ""}
          </span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 py-8 pb-24">
        {/* Page title */}
        <div className="mb-6 flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center ${activeTab === "flight" ? "bg-blue-50" : "bg-teal-50"}`}
          >
            {activeTab === "flight" ? (
              <FaPlane size={15} className="text-blue-600" />
            ) : (
              <MdHotel size={18} className="text-teal-600" />
            )}
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 leading-tight">
              Upcoming {activeTab === "flight" ? "Flights" : "Hotels"}
            </h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Your confirmed upcoming{" "}
              {activeTab === "flight" ? "flight bookings" : "hotel stays"}
            </p>
          </div>
        </div>

        {/* Summary Stats */}
        {!isLoading && (
          <SummaryStats
            flightTrips={upcomingFlights}
            hotelTrips={upcomingHotels}
          />
        )}

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <span className="bg-cyan-50 rounded-lg p-1.5">
              <FiFilter size={13} className="text-teal-600" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Filter {activeTab === "flight" ? "Flights" : "Hotels"}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <FiSearch
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder={
                  activeTab === "flight"
                    ? "Search destination, sector…"
                    : "Search hotel, city, address…"
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-[13px] border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition"
              />
            </div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition text-slate-500"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition text-slate-500"
            />
          </div>
          {hasFilters && (
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => {
                  setSearchTerm("");
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
            <p className="text-slate-400 text-sm">Loading your trips…</p>
          </div>
        ) : (
          <>
            <p className="text-[13px] text-slate-500 mb-4">
              Showing{" "}
              <strong className="text-slate-700">{activeData.length}</strong>{" "}
              upcoming {activeTab === "flight" ? "flight" : "hotel"}
              {activeData.length !== 1 ? "s" : ""}
            </p>

            {activeData.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {activeTab === "flight"
                  ? filteredFlights.map((trip) => (
                      <FlightTripCard
                        key={trip._id}
                        trip={trip}
                        onView={(t) => navigate(`/my-bookings/${t._id}`)}
                      />
                    ))
                  : filteredHotels.map((trip) => (
                      <HotelTripCard
                        key={trip._id}
                        trip={trip}
                        onView={(t) => navigate(`/my-hotel-booking/${t._id}`)}
                      />
                    ))}
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
                  No upcoming {activeTab === "flight" ? "flights" : "hotels"}{" "}
                  found
                </p>
                <p className="text-sm text-slate-400">
                  Try adjusting your filters
                </p>
                {hasFilters && (
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setStartDate("");
                      setEndDate("");
                    }}
                    className="mt-4 text-sm text-teal-600 hover:underline font-medium bg-transparent border-none cursor-pointer"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
