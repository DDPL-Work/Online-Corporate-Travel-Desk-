import React, { useEffect, useMemo, useState } from "react";
import {
  FiCalendar,
  FiMapPin,
  FiArrowRightCircle,
  FiFilter,
  FiSearch,
} from "react-icons/fi";
import { FaPlane } from "react-icons/fa";
import { FiHome } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import { fetchMyBookingRequests } from "../../Redux/Actions/booking.thunks";
import { useNavigate } from "react-router-dom";

const colors = {
  primary: "#0A4D68",
  light: "#F8FAFC",
  dark: "#1E293B",
};

export default function MyPendingApprovals() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { myRequests, loading } = useSelector((state) => state.bookings);

  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    dispatch(fetchMyBookingRequests());
  }, [dispatch]);

  // Prepare trip data
  const myTrips = useMemo(() => {
    return (myRequests || [])
      .filter((b) => b.requestStatus !== "rejected")
      .map((b) => {
        const segments = b.flightRequest?.segments || [];
        const first = segments[0];
        const last = segments[segments.length - 1];

        const fareExpiry = b.flightRequest?.fareExpiry;
        const fareExpired =
          b.requestStatus !== "approved" &&
          fareExpiry &&
          new Date() > new Date(fareExpiry);

        return {
          id: b._id,
          type: b.bookingType === "hotel" ? "Hotel" : "Flight",
          status: b.requestStatus,
          destination: (() => {
            if (!segments.length) return "N/A";

            const firstOrigin = segments[0]?.origin?.airportCode;
            const lastDestination =
              segments[segments.length - 1]?.destination?.airportCode;

            // Detect round trip (comes back to origin)
            const isRoundTrip =
              segments.length > 1 && firstOrigin === lastDestination;

            if (!isRoundTrip) {
              // One-way (even if layover)
              return `${firstOrigin} → ${lastDestination}`;
            }

            // ROUND TRIP LOGIC
            // Split into two halves (outbound + inbound)
            const midIndex = Math.floor(segments.length / 2);

            const onwardSegments = segments.slice(0, midIndex);
            const returnSegments = segments.slice(midIndex);

            const onwardOrigin = onwardSegments[0]?.origin?.airportCode;
            const onwardDestination =
              onwardSegments[onwardSegments.length - 1]?.destination
                ?.airportCode;

            const returnOrigin = returnSegments[0]?.origin?.airportCode;
            const returnDestination =
              returnSegments[returnSegments.length - 1]?.destination
                ?.airportCode;

            return `${onwardOrigin} → ${onwardDestination}  |  ${returnOrigin} → ${returnDestination}`;
          })(),

          // startDate: first?.departureDateTime || null,
          endDate: last?.arrivalDateTime || null,
          startDate: segments.length ? segments[0]?.departureDateTime : null,

          returnDate: (() => {
            if (!segments.length) return null;

            const firstOrigin = segments[0]?.origin?.airportCode;
            const lastDestination =
              segments[segments.length - 1]?.destination?.airportCode;

            // Real round trip (comes back to origin)
            if (firstOrigin === lastDestination && segments.length > 1) {
              return segments[segments.length - 1]?.departureDateTime;
            }

            return null; // layover only
          })(),

          createdAt: b.createdAt,
          fareExpired,
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [myRequests]);

  const isFareExpired = (expiryTime) => {
    if (!expiryTime) return false;
    return new Date(expiryTime) < new Date();
  };

  // Apply filters
  const filteredTrips = useMemo(() => {
    return myTrips.filter((t) => {
      const matchesStatus =
        statusFilter === "All" ||
        t.status.toLowerCase() === statusFilter.toLowerCase();

      const matchesType =
        typeFilter === "All" ||
        t.type.toLowerCase() === typeFilter.toLowerCase();

      const matchesSearch =
        searchTerm.trim() === "" ||
        t.destination.toLowerCase().includes(searchTerm.toLowerCase());

      const tripDate = new Date(t.startDate);
      const matchesStart =
        !startDate || tripDate >= new Date(startDate + "T00:00:00");
      const matchesEnd =
        !endDate || tripDate <= new Date(endDate + "T23:59:59");

      return (
        matchesStatus &&
        matchesType &&
        matchesSearch &&
        matchesStart &&
        matchesEnd
      );
    });
  }, [statusFilter, typeFilter, searchTerm, startDate, endDate, myTrips]);

  if (loading) {
    return (
      <div className="p-10 text-center text-gray-500">Loading your trips…</div>
    );
  }

  return (
    <div className="p-6 min-h-screen" style={{ backgroundColor: colors.light }}>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <h1 className="text-2xl font-bold" style={{ color: colors.dark }}>
          My Booking Requests
        </h1>

        {/* Filter Section */}
        <div className="bg-white rounded-xl shadow-md p-6 space-y-5">
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
              <label className="text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                className="border rounded-md p-2 w-full mt-1"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                {["All", "pending_approval", "approved"].map((s) => (
                  <option key={s}>{s.replace("_", " ").toUpperCase()}</option>
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

        {/* Card List */}
        {filteredTrips.length === 0 ? (
          <p className="text-gray-500 text-center mt-20">
            No booking requests found.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTrips.map((trip) => (
              <div
                key={trip.id}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all p-5 flex flex-col gap-3 border-l-4"
                style={{ borderColor: colors.primary }}
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold flex items-center gap-2 text-[#0A4D68]">
                    {trip.type === "Flight" ? <FaPlane /> : <FiHome />}
                    {trip.type} Request
                  </h2>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 text-xs rounded-full font-medium ${
                        trip.status === "approved"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {trip.status.replace("_", " ").toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Destination */}
                <div className="flex items-center gap-2 text-gray-600">
                  <FiMapPin />
                  <span>{trip.destination}</span>
                </div>

                {/* Dates */}
                <div className="flex items-center gap-2 text-gray-600">
                  <FiCalendar />
                  <span>
                    {[trip.startDate, trip.returnDate]
                      .filter(Boolean)
                      .map((d) =>
                        new Date(d).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        }),
                      )
                      .join("  |  ") || "N/A"}
                  </span>
                </div>

                {/* Created Date */}
                <div className="text-xs text-gray-500 mt-1">
                  Requested on{" "}
                  {new Date(trip.createdAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </div>

                {/* Footer */}
                <div className="flex justify-between">
                  {trip.fareExpired && (
                    <span className="px-3 py-1 flex items-center text-xs rounded-full font-medium bg-red-100 text-red-700">
                      FARE EXPIRED
                    </span>
                  )}
                  <button
                    onClick={() => navigate(`/bookings/${trip.id}/book`)}
                    className="flex items-center gap-2 px-4 py-2 rounded bg-[#0A4D68] text-white text-sm hover:bg-[#083a50] transition"
                  >
                    View Details <FiArrowRightCircle />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
