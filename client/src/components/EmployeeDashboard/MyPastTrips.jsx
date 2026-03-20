import React, { useEffect, useMemo, useState } from "react";
import { FiCalendar, FiFilter, FiMapPin, FiSearch } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import { fetchMyBookings } from "../../Redux/Actions/booking.thunks";
import { formatDateWithYear } from "../../utils/formatter";

const colors = {
  primary: "#0A4D68",
  secondary: "#088395",
  light: "#F8FAFC",
  dark: "#1E293B",
};

export default function MyPastTrips() {
  const dispatch = useDispatch();

  const { list: bookings = [], loading } = useSelector(
    (state) => state.bookings
  );

  /* ================= FILTER STATES ================= */
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    dispatch(fetchMyBookings());
  }, [dispatch]);

  /* ================= BASE: PAST TRIPS ================= */
  const pastTrips = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return bookings.filter((b) => {
      const travelDate = b.bookingSnapshot?.travelDate;
      if (!travelDate) return false;

      return (
        b.executionStatus === "ticketed" &&
        new Date(travelDate) < today
      );
    });
  }, [bookings]);

  /* ================= APPLY FILTERS ================= */
  const filteredTrips = useMemo(() => {
    return pastTrips.filter((trip) => {
      const snapshot = trip.bookingSnapshot || {};
      const travelDate = snapshot.travelDate
        ? new Date(snapshot.travelDate)
        : null;

      const destination = snapshot.city?.toLowerCase() || "";

      const matchesType =
        typeFilter === "All" ||
        trip.bookingType?.toLowerCase() === typeFilter.toLowerCase();

      const matchesStatus =
        statusFilter === "All" ||
        trip.executionStatus?.toLowerCase() === statusFilter.toLowerCase();

      const matchesSearch =
        !searchTerm ||
        destination.includes(searchTerm.toLowerCase());

      const matchesStart =
        !startDate ||
        (travelDate &&
          travelDate >= new Date(startDate + "T00:00:00"));

      const matchesEnd =
        !endDate ||
        (travelDate &&
          travelDate <= new Date(endDate + "T23:59:59"));

      return (
        matchesType &&
        matchesStatus &&
        matchesSearch &&
        matchesStart &&
        matchesEnd
      );
    });
  }, [
    pastTrips,
    typeFilter,
    statusFilter,
    searchTerm,
    startDate,
    endDate,
  ]);

  /* ================= SUMMARY ================= */
  const totalTrips = filteredTrips.length;

  const totalSpent = filteredTrips.reduce(
    (sum, b) => sum + (b.pricingSnapshot?.totalAmount || 0),
    0
  );

  /* ================= UI ================= */
  return (
    <div className="p-6 min-h-screen" style={{ backgroundColor: colors.light }}>
      <h1 className="text-2xl font-bold mb-6" style={{ color: colors.dark }}>
        My Past Trips
      </h1>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <SummaryCard
          title="Completed Trips"
          value={totalTrips}
          color={colors.primary}
        />
        <SummaryCard
          title="Total Spent"
          value={`₹${totalSpent.toLocaleString()}`}
          color={colors.secondary}
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md p-6 space-y-5 mb-8">
        <div className="flex items-center gap-2 border-b pb-2">
          <FiFilter className="text-[#0A4D68]" />
          <h2 className="font-semibold text-[#0A4D68]">Filter Trips</h2>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <select
            className="border rounded-md p-2"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option>All</option>
            <option>flight</option>
            <option>hotel</option>
          </select>

          <select
            className="border rounded-md p-2"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option>All</option>
            <option>ticketed</option>
            <option>failed</option>
          </select>

          <input
            type="date"
            className="border rounded-md p-2"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />

          <input
            type="date"
            className="border rounded-md p-2"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />

          <div className="relative col-span-2">
            <FiSearch className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search destination"
              className="border rounded-md pl-9 p-2 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Cards */}
      {loading ? (
        <p className="text-center text-gray-500 mt-20">Loading trips...</p>
      ) : filteredTrips.length === 0 ? (
        <p className="text-gray-500 text-center mt-20">
          No past trips found
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredTrips.map((trip) => {
            const snapshot = trip.bookingSnapshot;

            return (
              <div
                key={trip._id}
                className="bg-white rounded-lg shadow p-5 border-l-4"
                style={{ borderColor: colors.primary }}
              >
                <div className="flex justify-between mb-2">
                  <h2 className="text-lg font-semibold">✈️ Flight Trip</h2>
                  <span className="text-xs px-3 py-1 bg-gray-100 rounded-full">
                    Completed
                  </span>
                </div>

                <div className="flex items-center gap-2 text-gray-600">
                  <FiMapPin />
                  {snapshot?.sectors?.[0]}
                </div>

                <div className="flex items-center gap-2 text-gray-600">
                  <FiCalendar />
                  {formatDateWithYear(snapshot.travelDate)}
                </div>

                <p className="mt-2 text-sm font-semibold text-[#088395]">
                  Cost: ₹{trip.pricingSnapshot?.totalAmount?.toLocaleString()}
                </p>
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
      className="bg-white shadow rounded-lg p-6 border-l-4"
      style={{ borderColor: color }}
    >
      <p className="text-gray-600 text-sm">{title}</p>
      <h3 className="text-3xl font-bold mt-1" style={{ color }}>
        {value}
      </h3>
    </div>
  );
}
