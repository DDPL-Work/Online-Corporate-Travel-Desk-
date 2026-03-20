import React, { useEffect, useMemo } from "react";
import {
  FiCalendar,
  FiMapPin,
  FiArrowRightCircle,
  FiFilter,
  FiSearch,
} from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchMyBookings } from "../../Redux/Actions/booking.thunks";
import { formatDateWithYear } from "../../utils/formatter";
import { useState } from "react";

const colors = {
  primary: "#0A4D68",
  secondary: "#088395",
  light: "#F8FAFC",
  dark: "#1E293B",
};

export default function MyUpcomingTrips() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { list: bookings = [], loading } = useSelector(
    (state) => state.bookings,
  );

  useEffect(() => {
    dispatch(fetchMyBookings());
  }, [dispatch]);

  /* ================= FILTER UPCOMING TRIPS ================= */

  const upcomingTrips = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return bookings
      .filter((b) => {
        const travelDate = b.bookingSnapshot?.travelDate;
        if (!travelDate) return false;

        return b.executionStatus === "ticketed" && new Date(travelDate) > today;
      })
      .sort(
        (a, b) =>
          new Date(a.bookingSnapshot.travelDate) -
          new Date(b.bookingSnapshot.travelDate),
      );
  }, [bookings]);

  // Apply filters
  /* ================= APPLY FILTERS ================= */

  const filteredTrips = useMemo(() => {
    return upcomingTrips.filter((trip) => {
      const snapshot = trip.bookingSnapshot || {};

      const destination = snapshot.city?.toLowerCase() || "";
      const travelDate = snapshot.travelDate
        ? new Date(snapshot.travelDate)
        : null;

      const matchesType =
        typeFilter === "All" ||
        trip.bookingType?.toLowerCase() === typeFilter.toLowerCase();

      const matchesStatus =
        statusFilter === "All" ||
        trip.executionStatus?.toLowerCase() === statusFilter.toLowerCase();

      const matchesSearch =
        !searchTerm || destination.includes(searchTerm.toLowerCase());

      const matchesStart =
        !startDate ||
        (travelDate && travelDate >= new Date(startDate + "T00:00:00"));

      const matchesEnd =
        !endDate ||
        (travelDate && travelDate <= new Date(endDate + "T23:59:59"));

      return (
        matchesType &&
        matchesStatus &&
        matchesSearch &&
        matchesStart &&
        matchesEnd
      );
    });
  }, [upcomingTrips, statusFilter, typeFilter, searchTerm, startDate, endDate]);

  /* ================= SUMMARY ================= */

  const totalTrips = upcomingTrips.length;

  const totalAmount = upcomingTrips.reduce(
    (sum, b) => sum + (b.pricingSnapshot?.totalAmount || 0),
    0,
  );

  /* ================= UI ================= */

  return (
    <div className="p-6 min-h-screen" style={{ backgroundColor: colors.light }}>
      <h1 className="text-2xl font-bold mb-6" style={{ color: colors.dark }}>
        My Upcoming Trips
      </h1>

      {/* ===== SUMMARY CARDS ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <SummaryCard
          title="Upcoming Trips"
          value={totalTrips}
          color={colors.primary}
        />
        <SummaryCard
          title="Upcoming Spend"
          value={`₹${totalAmount.toLocaleString()}`}
          color={colors.secondary}
        />
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-xl shadow-md p-6 space-y-5 mb-5">
        <div className="flex items-center gap-2 border-b pb-2">
          <FiFilter className="text-[#0A4D68]" />
          <h2 className="font-semibold text-[#0A4D68]">
            Filter Booking Requests
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Type Filter */}
          <div>
            <label className="text-sm font-medium text-gray-700">Type</label>
            <select
              className="border rounded-md p-2 w-full mt-1"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              {["All", "Flight", "Hotel"].map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="text-sm font-medium text-gray-700">Status</label>
            <select
              className="border rounded-md p-2 w-full mt-1"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {["All", "pending", "approved"].map((s) => (
                <option key={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="text-sm font-medium text-gray-700">
              Start Date
            </label>
            <input
              type="date"
              className="border rounded-md p-2 w-full mt-1"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          {/* End Date */}
          <div>
            <label className="text-sm font-medium text-gray-700">
              End Date
            </label>
            <input
              type="date"
              className="border rounded-md p-2 w-full mt-1"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          {/* Search */}
          <div className="col-span-2 md:col-span-1 lg:col-span-2">
            <label className="text-sm font-medium text-gray-700">
              Search by Destination
            </label>
            <div className="relative mt-1">
              <FiSearch className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="e.g. Delhi, London, etc."
                className="border rounded-md pl-9 p-2 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Reset Filters Button */}
        <div className="flex justify-end">
          <button
            onClick={() => {
              setStatusFilter("All");
              setTypeFilter("All");
              setSearchTerm("");
              setStartDate("");
              setEndDate("");
            }}
            className="text-sm px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-center text-gray-500 mt-20">Loading trips...</p>
      ) : upcomingTrips.length === 0 ? (
        <p className="text-center text-gray-500 mt-20">No upcoming trips</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {upcomingTrips.map((trip) => {
            const snapshot = trip.bookingSnapshot;

            return (
              <div
                key={trip._id}
                className="bg-white rounded-lg shadow p-5 flex flex-col gap-3 border-l-4"
                style={{ borderColor: colors.primary }}
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-800">
                    ✈️ Flight Trip
                  </h2>

                  <span className="px-3 py-1 text-xs rounded-full bg-green-100 text-green-700">
                    Booked
                  </span>
                </div>

                {/* Sector */}
                <div className="flex items-center gap-2 text-gray-600">
                  <FiMapPin />
                  <span>
                    {(snapshot?.sectors || [])
                      .map((s) => s.replace("-", " → "))
                      .join("  |  ") || "N/A"}
                  </span>
                </div>

                {/* Date */}
                <div className="flex items-center gap-2 text-gray-600">
                  <FiCalendar />
                  <span>
                    {[snapshot?.travelDate, snapshot?.returnDate]
                      .filter(Boolean)
                      .map((d) => formatDateWithYear(d))
                      .join("  |  ")}
                  </span>
                </div>

                <div className="text-xs text-gray-500">
                  Booked on {formatDateWithYear(trip.createdAt)}
                </div>

                {/* Footer */}
                <div className="flex justify-end">
                  <button
                    onClick={() => navigate(`/my-bookings/${trip._id}`)}
                    className="flex items-center gap-2 px-4 py-2 rounded bg-gray-100 hover:bg-gray-200"
                  >
                    View Details <FiArrowRightCircle />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ================= SUMMARY CARD ================= */

function SummaryCard({ title, value, color }) {
  return (
    <div
      className="bg-white shadow rounded-lg p-6 flex items-center justify-between border-l-4"
      style={{ borderColor: color }}
    >
      <div>
        <p className="text-gray-600 text-sm">{title}</p>
        <h3 className="text-3xl font-bold mt-1" style={{ color }}>
          {value}
        </h3>
      </div>
    </div>
  );
}
