import React, { useEffect, useMemo, useState } from "react";
import {
  FiCalendar,
  FiFilter,
  FiMapPin,
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
import { formatDateWithYear } from "../../utils/formatter";
import api from "../../API/axios";

/* ─────────────────────────────────────────────────────────────── */
/*  Summary Stats                                                  */
/* ─────────────────────────────────────────────────────────────── */
function SummaryStats({ trips, userRole }) {
  const total = trips.length;
  const flights = trips.filter((t) => t.bookingType?.toLowerCase() === "flight").length;
  const hotels = trips.filter((t) => t.bookingType?.toLowerCase() === "hotel").length;
  const totalSpent = trips.reduce(
    (sum, t) => sum + (t.pricingSnapshot?.totalAmount || 0),
    0,
  );

  const canSeeSpend = userRole === "travel-admin";

  return (
    <div className={`grid grid-cols-2 ${canSeeSpend ? "sm:grid-cols-4" : "sm:grid-cols-3"} gap-3 mb-6`}>
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">
          Past Trips
        </p>
        <p className="text-2xl font-black text-slate-800">{total}</p>
      </div>
      <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
        <p className="text-[10px] uppercase tracking-widest text-blue-500 font-bold mb-1">
          Flights
        </p>
        <p className="text-2xl font-black text-blue-700">{flights}</p>
      </div>
      <div className="bg-teal-50 rounded-xl border border-teal-100 p-4">
        <p className="text-[10px] uppercase tracking-widest text-teal-500 font-bold mb-1">
          Hotels
        </p>
        <p className="text-2xl font-black text-teal-700">{hotels}</p>
      </div>
      {canSeeSpend && (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">
            Total Spent
          </p>
          <p className="text-2xl font-black text-slate-800">
            ₹{totalSpent.toLocaleString("en-IN")}
          </p>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Past Trip Card                                                 */
/* ─────────────────────────────────────────────────────────────── */
function PastTripCard({ trip, onView, userRole }) {
  const snapshot = trip.bookingSnapshot || {};
  const isHotel = trip.bookingType?.toLowerCase() === "hotel";

  const sectors = (snapshot.sectors || [])
    .map((s) => s.replace("-", " → "))
    .join("  |  ");

  const dates = isHotel
    ? [snapshot.checkInDate || trip.checkInDate || trip.CheckInDate, snapshot.checkOutDate || trip.checkOutDate || trip.CheckOutDate]
        .filter(Boolean)
        .map((d) => formatDateWithYear(d))
        .join("  →  ")
    : [snapshot.travelDate, snapshot.returnDate]
        .filter(Boolean)
        .map((d) => formatDateWithYear(d))
        .join("  →  ");

  const travelDate = isHotel ? (snapshot.checkInDate || trip.checkInDate || trip.CheckInDate) : snapshot.travelDate;
  const daysAgo = travelDate
    ? Math.floor((new Date() - new Date(travelDate)) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* top accent bar — muted for past trips */}
      <div className="h-[5px] bg-slate-400" />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isHotel ? "bg-teal-50" : "bg-blue-50"
              }`}
            >
              {isHotel ? (
                <MdHotel size={18} className="text-teal-600" />
              ) : (
                <MdFlightTakeoff size={18} className="text-blue-600" />
              )}
            </div>
            <div>
              <p className="text-[14px] font-semibold text-slate-800 leading-tight">
                {isHotel
                  ? trip.hotelRequest?.selectedHotel?.hotelName || snapshot.hotelName || "Hotel Stay"
                  : "Flight Trip"}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                {trip.orderId || `#${trip._id?.slice(-8).toUpperCase()}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-full px-2.5 py-1 text-[11px] font-semibold shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Completed
          </div>
        </div>

        {/* Destination */}
        <div className="flex items-center gap-2 mb-3">
          <FiMapPin size={12} className="text-slate-400 shrink-0" />
          <p className="text-[14px] font-bold text-slate-800 leading-snug">
            {isHotel
              ? trip.hotelRequest?.selectedHotel?.address || snapshot.address || snapshot.city || "N/A"
              : snapshot.city || trip.cityName || trip.CityName || sectors || "N/A"}
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

        {/* Completed strip */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 mb-4">
          <FiCheckCircle size={13} className="text-slate-400" />
          <span className="text-[11px] font-semibold text-slate-500">
            Trip completed
          </span>
          {daysAgo !== null && (
            <span className="ml-auto text-[11px] font-bold text-slate-400">
              {daysAgo}d ago
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div>
            {( userRole === "travel-admin") && trip.pricingSnapshot?.totalAmount && (
              <>
                <p className="text-[11px] text-slate-400 mb-0.5">Total spent</p>
                <p className="text-[17px] font-bold text-slate-800">
                  ₹{Number(trip.pricingSnapshot.totalAmount).toLocaleString("en-IN")}
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
export default function MyPastTrips() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { list: bookings = [], loading } = useSelector(
    (state) => state.bookings,
  );
  const userRole = useSelector((state) => state.auth?.user?.role);

  const [typeFilter, setTypeFilter] = useState("flight");
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [hotelBookings, setHotelBookings] = useState([]);
  const [isHotelLoading, setIsHotelLoading] = useState(false);

  useEffect(() => {
    dispatch(fetchMyBookings());
  }, [dispatch]);

  useEffect(() => {
    const fetchHotelPastTrips = async () => {
      setIsHotelLoading(true);
      try {
        const { data } = await api.get("/hotel-booking/my/completed");
        setHotelBookings(Array.isArray(data.data?.bookings) ? data.data.bookings : []);
      } catch (err) {
        console.error("Failed to fetch hotel past trips:", err);
      } finally {
        setIsHotelLoading(false);
      }
    };
    fetchHotelPastTrips();
  }, []);

  const pastTrips = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Merge and deduplicate by _id
    const combined = [
      ...(Array.isArray(bookings) ? bookings : []),
      ...(Array.isArray(hotelBookings) ? hotelBookings : [])
    ];
    const uniqueBookings = Array.from(new Map(combined.map(b => [b?._id, b])).values()).filter(Boolean);

    return uniqueBookings
      .filter((b) => {
        const isHotel = b.bookingType?.toLowerCase() === "hotel";
        
        if (isHotel) {
          // User specific criteria for hotels
          const snapshot = b.bookingSnapshot || {};
          const checkIn = snapshot.checkInDate || b.checkInDate || b.CheckInDate;
          const checkOut = snapshot.checkOutDate || b.checkOutDate || b.CheckOutDate;
          const status = (b.executionStatus || b.status || "").toLowerCase();
          const amendmentRequested = b.amendment?.status === "requested";

          return (
            checkIn && checkOut &&
            new Date(checkIn) < today &&
            new Date(checkOut) < today &&
            status === "voucher_generated" &&
            !amendmentRequested
          );
        } else {
          // Flight logic
          const dateStr = b.bookingSnapshot?.travelDate;
          const isSuccess = b.executionStatus?.toLowerCase() === "ticketed";
          return dateStr && isSuccess && new Date(dateStr) < today;
        }
      })
      .sort((a, b) => {
        const dateA = a.bookingType?.toLowerCase() === "hotel"
          ? (a.bookingSnapshot?.checkInDate || a.checkInDate || a.CheckInDate)
          : a.bookingSnapshot?.travelDate;
        const dateB = b.bookingType?.toLowerCase() === "hotel"
          ? (b.bookingSnapshot?.checkInDate || b.checkInDate || b.CheckInDate)
          : b.bookingSnapshot?.travelDate;
        return new Date(dateB) - new Date(dateA);
      });
  }, [bookings, hotelBookings]);

  const filteredTrips = useMemo(() => {
    return pastTrips.filter((trip) => {
      const snapshot = trip.bookingSnapshot || {};
      const destination = (snapshot.city || "").toLowerCase();
      const sectors = (snapshot.sectors || []).join(" ").toLowerCase();
      const isHotel = trip.bookingType?.toLowerCase() === "hotel";
      const travelDateObj = isHotel ? (trip.bookingSnapshot?.checkInDate || trip.checkInDate || trip.CheckInDate) : snapshot.travelDate;
      const travelDate = travelDateObj ? new Date(travelDateObj) : null;

      const matchType =
        typeFilter === "all" || trip.bookingType?.toLowerCase() === typeFilter;
      const matchSearch =
        !searchTerm ||
        destination.includes(searchTerm.toLowerCase()) ||
        (snapshot.city || trip.cityName || trip.CityName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        sectors.includes(searchTerm.toLowerCase()) ||
        (snapshot.hotelName || trip.hotelName || trip.HotelName || "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchStart =
        !startDate ||
        (travelDate && travelDate >= new Date(startDate + "T00:00:00"));
      const matchEnd =
        !endDate ||
        (travelDate && travelDate <= new Date(endDate + "T23:59:59"));

      return matchType && matchSearch && matchStart && matchEnd;
    });
  }, [pastTrips, typeFilter, searchTerm, startDate, endDate]);

  const hasFilters = typeFilter !== "all" || searchTerm || startDate || endDate;

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
        <h1 className="text-[15px] font-bold text-slate-900">My Past Trips</h1>

        {/* Type toggle */}
        <div className="flex items-center gap-1 ml-4 bg-slate-100 rounded-xl p-1">
          {["flight", "hotel"].map((tab) => (
            <button
              key={tab}
              onClick={() => setTypeFilter(tab)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-150 cursor-pointer border-none ${
                typeFilter === tab
                  ? "bg-white text-[#0A4D68] shadow-sm"
                  : "bg-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab === "flight" && <FaPlane size={11} />}
              {tab === "hotel" && <MdHotel size={13} />}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="ml-auto">
          <span className="bg-slate-200 text-slate-600 text-[11px] font-bold px-2.5 py-1 rounded-full">
            {pastTrips.length} trip{pastTrips.length !== 1 ? "s" : ""}
          </span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 py-8 pb-24">
        {/* Page title */}
        <div className="mb-6 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-200 flex items-center justify-center">
            <FiClock size={15} className="text-slate-500" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 leading-tight">
              Past Trips
            </h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Your completed travel history
            </p>
          </div>
        </div>

        {/* Summary Stats */}
        {!loading && <SummaryStats trips={pastTrips} userRole={userRole} />}

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <span className="bg-cyan-50 rounded-lg p-1.5">
              <FiFilter size={13} className="text-teal-600" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Filter Trips
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Search Destination</label>
              <div className="relative">
                <FiSearch
                  size={13}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Search destination, sector…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-[13px] border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition text-slate-500"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition text-slate-500"
              />
            </div>
          </div>

          {hasFilters && (
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => {
                  setTypeFilter("flight");
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
        {loading || isHotelLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-10 h-10 rounded-full border-2 border-slate-200 border-t-teal-500 animate-spin mb-4" />
            <p className="text-slate-400 text-sm">Loading your trips…</p>
          </div>
        ) : (
          <>
            <p className="text-[13px] text-slate-500 mb-4">
              Showing{" "}
              <strong className="text-slate-700">{filteredTrips.length}</strong>{" "}
              past trip{filteredTrips.length !== 1 ? "s" : ""}
            </p>

            {filteredTrips.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredTrips.map((trip) => (
                  <PastTripCard
                    key={trip._id}
                    trip={trip}
                    userRole={userRole}
                    onView={(t) => {
                      if (t.bookingType?.toLowerCase() === "hotel") {
                        navigate(`/my-hotel-booking/${t._id}`);
                      } else {
                        navigate(`/my-booking/${t._id}`);
                      }
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                  <FiClock size={24} className="text-slate-300" />
                </div>
                <p className="text-slate-500 font-semibold mb-1">
                  No past trips found
                </p>
                <p className="text-sm text-slate-400">
                  Try adjusting your filters
                </p>
                {hasFilters && (
                  <button
                    onClick={() => {
                      setTypeFilter("flight");
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