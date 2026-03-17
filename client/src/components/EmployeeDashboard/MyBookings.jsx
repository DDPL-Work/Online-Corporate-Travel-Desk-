import React, { useState, useEffect, useMemo } from "react";
import {
  FiSearch,
  FiEye,
  FiMapPin,
  FiCalendar,
  FiFilter,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchMyBookings } from "../../Redux/Actions/booking.thunks";
import {
  formatDateTime,
  airlineLogo,
  formatDateWithYear,
} from "../../utils/formatter";

const colors = {
  primary: "#0A4D68",
};

export default function MyBookings() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { list: bookings = [], loading } = useSelector(
    (state) => state.bookings,
  );

  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    dispatch(fetchMyBookings());
  }, [dispatch]);

  /* ================= FILTER LOGIC ================= */

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const flight = b.flightRequest?.segments?.[0];

      const destinationCity = flight?.destination?.city?.toLowerCase() || "";

      const departureDate = flight?.departureDateTime
        ? new Date(flight.departureDateTime)
        : null;

      const matchesStatus =
        statusFilter === "All" ||
        b.executionStatus?.toLowerCase() === statusFilter.toLowerCase();

      const matchesType =
        typeFilter === "All" ||
        b.bookingType?.toLowerCase() === typeFilter.toLowerCase();

      const matchesSearch =
        !searchTerm || destinationCity.includes(searchTerm.toLowerCase());

      const matchesStart =
        !startDate ||
        (departureDate && departureDate >= new Date(startDate + "T00:00:00"));

      const matchesEnd =
        !endDate ||
        (departureDate && departureDate <= new Date(endDate + "T23:59:59"));

      return (
        matchesStatus &&
        matchesType &&
        matchesSearch &&
        matchesStart &&
        matchesEnd
      );
    });
  }, [bookings, statusFilter, typeFilter, searchTerm, startDate, endDate]);

  /* ================= UI ================= */

  return (
    <div className="p-6 bg-[#F8FAFC] min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#0A4D68]">My Bookings</h1>
        <button
          onClick={() => navigate("/search-flight")}
          className="bg-[#035966] text-white px-4 py-2 rounded-xl hover:bg-[#044652]"
        >
          Make Booking
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <FiFilter className="text-[#0A4D68]" />
          <h2 className="font-semibold text-[#0A4D68]">Filter Bookings</h2>
        </div>

        <div className="grid md:grid-cols-5 gap-4">
          <select
            className="border p-2 rounded"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option>All</option>
            <option>Flight</option>
            <option>Hotel</option>
          </select>

          <select
            className="border p-2 rounded"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option>All</option>
            <option>ticketed</option>
            <option>failed</option>
          </select>

          <input
            type="date"
            className="border p-2 rounded"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />

          <input
            type="date"
            className="border p-2 rounded"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />

          <div className="relative">
            <FiSearch className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search destination"
              className="border pl-9 p-2 rounded w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="text-center py-10">Loading...</div>
      ) : filteredBookings.length === 0 ? (
        <div className="text-center py-10 text-gray-500">No bookings found</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBookings.map((b) => {
            const snapshot = b.bookingSnapshot;

            const sector = snapshot?.sectors?.[0] || "N/A → N/A";
            const [from, to] = sector.split("-");

            const sectors = snapshot?.sectors || [];

            const formattedRoute =
              sectors.length === 1
                ? sectors[0].replace("-", " → ")
                : sectors.length === 2
                  ? `${sectors[0].replace("-", " → ")}  |  ${sectors[1].replace(
                      "-",
                      " → ",
                    )}`
                  : "N/A → N/A";

            return (
              <div
                key={b._id}
                className="bg-white rounded-lg shadow-md p-5 border-l-4"
                style={{ borderColor: colors.primary }}
              >
                {/* Header */}
                <div className="flex justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#0A4D68]">
                      {snapshot?.airline || "Airline"}
                    </span>
                  </div>

                  <span className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded-full">
                    Booked
                  </span>
                </div>

                {/* Route */}
                <div className="text-sm flex items-center gap-2">
                  <FiMapPin />
                  <span>{formattedRoute}</span>
                </div>

                {/* Date */}
                <div className="text-sm text-gray-600 mt-1 flex items-center gap-2">
                  <FiCalendar />
                  <span>
                    {snapshot?.returnDate
                      ? `${formatDateWithYear(snapshot?.travelDate)}  |  ${formatDateWithYear(
                          snapshot?.returnDate,
                        )}`
                      : formatDateWithYear(snapshot?.travelDate)}
                  </span>
                </div>

                <div className="text-xs text-gray-500 mt-1">
                  Booked on {formatDateWithYear(b.createdAt)}
                </div>

                {/* Fare */}
                <div className="mt-3 font-bold text-[#088395]">
                  ₹{b.pricingSnapshot?.totalAmount}
                </div>

                {/* Action */}
                <button
                  onClick={() => navigate(`/my-bookings/${b._id}`)}
                  className="mt-4 w-full bg-gray-100 py-2 rounded flex justify-center gap-2"
                >
                  <FiEye /> View Details
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
