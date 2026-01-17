import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchMyRejectedRequests } from "../../Redux/Actions/booking.thunks";
import { selectMyRejectedRequests } from "../../Redux/Slice/booking.slice";
import {
  FiFilter,
  FiXCircle,
  FiMapPin,
  FiCalendar,
  FiMessageCircle,
  FiEye,
  FiX,
  FiHome,
  FiSearch,
} from "react-icons/fi";
import { FaPlane } from "react-icons/fa";
import {
  formatDate,
  formatTime,
  formatDuration,
  getDateInIST,
  getCabinClassLabel,
} from "../../utils/formatter";

const colors = {
  primary: "#0A4D68",
  light: "#F8FAFC",
  dark: "#1E293B",
};

export default function MyRejectedRequests() {
  const dispatch = useDispatch();
  const rejectedRequests = useSelector(selectMyRejectedRequests);
  const loading = useSelector((state) => state.bookings.loading);

  const [type, setType] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);

  useEffect(() => {
    dispatch(fetchMyRejectedRequests());
  }, [dispatch]);

  // Normalize + Filter
  const filtered = useMemo(() => {
    const normalized = rejectedRequests.map((r) => {
      const segments = r.flightRequest?.segments || [];
      const first = segments[0];
      const last = segments[segments.length - 1];
      return {
        id: r._id,
        raw: r,
        type: r.bookingType === "flight" ? "Flight" : "Hotel",
        status: "Rejected",
        destination:
          r.bookingType === "hotel"
            ? r.hotelRequest?.city || "N/A"
            : segments.length
            ? `${first?.origin?.city || "N/A"} → ${
                last?.destination?.city || "N/A"
              }`
            : "N/A",
        startDate:
          r.bookingType === "hotel"
            ? r.hotelRequest?.checkInDate
            : first?.departureDateTime,
        startTime:
          r.bookingType === "hotel"
            ? r.hotelRequest?.checkInDate
            : first?.departureDateTime,
        endDate:
          r.bookingType === "hotel"
            ? r.hotelRequest?.checkOutDate
            : last?.arrivalDateTime,
        endTime:
          r.bookingType === "hotel"
            ? r.hotelRequest?.checkOutDate
            : last?.arrivalDateTime,
        rejectedBy: r.rejectedBy?.name
          ? `${r.rejectedBy.name.firstName} ${r.rejectedBy.name.lastName}`
          : "Admin",
        rejectedDate: r.rejectedAt || r.updatedAt,
        reason: r.approverComments || "No reason provided",
        createdAt: r.createdAt,
      };
    });

    return normalized
      .filter((req) => type === "All" || req.type === type)
      .filter((req) =>
        req.destination.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .filter((req) => {
        const date = req.rejectedDate ? new Date(req.rejectedDate) : null;
        const matchesStart = !startDate || date >= new Date(startDate);
        const matchesEnd = !endDate || date <= new Date(endDate);
        return matchesStart && matchesEnd;
      })
      .sort((a, b) => new Date(b.rejectedDate) - new Date(a.rejectedDate));
  }, [rejectedRequests, type, searchTerm, startDate, endDate]);

  return (
    <div className="p-6 min-h-screen" style={{ backgroundColor: colors.light }}>
      <div className="max-w-7xl mx-auto space-y-8">
        <h1 className="text-2xl font-bold text-[#0A4D68]">
          My Rejected Requests
        </h1>

        {/* Filter Section */}
        <div className="bg-white rounded-xl shadow-md p-6 space-y-5">
          <div className="flex items-center gap-2 border-b pb-2">
            <FiFilter className="text-[#0A4D68]" />
            <h2 className="font-semibold text-[#0A4D68]">Filter Requests</h2>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Type Filter */}
            <div>
              <label className="text-sm font-medium text-gray-700">Type</label>
              <select
                className="border rounded-md p-2 w-full mt-1"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                {["All", "Flight", "Hotel"].map((t) => (
                  <option key={t}>{t}</option>
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
                Search Destination
              </label>
              <div className="relative mt-1">
                <FiSearch className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="e.g. Delhi, London..."
                  className="border rounded-md pl-9 p-2 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Reset Button */}
          <div className="flex justify-end">
            <button
              onClick={() => {
                setType("All");
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
        {loading ? (
          <p className="text-center text-gray-500 py-10">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-gray-500 text-center mt-20">
            No rejected requests found.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((req) => (
              <div
                key={req.id}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all p-5 flex flex-col gap-3 border-l-4"
                style={{ borderColor: colors.primary }}
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold flex items-center gap-2 text-[#0A4D68]">
                    {req.type === "Flight" ? <FaPlane /> : <FiHome />}
                    {req.type} Request
                  </h2>
                  <span className="px-3 py-1 text-xs rounded-full font-medium bg-red-100 text-red-700">
                    Rejected
                  </span>
                </div>

                {/* Destination */}
                <div className="flex items-center gap-2 text-gray-600">
                  <FiMapPin />
                  <span>{req.destination}</span>
                </div>

                {/* Dates */}
                <div className="flex items-center gap-2 text-gray-600">
                  <FiCalendar />
                  <span>
                    {req.startDate
                      ? new Date(req.startDate).toLocaleDateString()
                      : "N/A"}{" "}
                    →{" "}
                    {req.endDate
                      ? new Date(req.endDate).toLocaleDateString()
                      : "N/A"}
                  </span>
                </div>

                {/* Rejected Date */}
                {req.rejectedDate && (
                  <div className="text-xs text-gray-500 mt-1">
                    Rejected on{" "}
                    {new Date(req.rejectedDate).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                )}

                {/* Footer */}
                <div className="flex justify-end">
                  <button
                    onClick={() => setSelectedRequest(req)}
                    className="flex items-center gap-2 px-4 py-2 rounded bg-[#0A4D68] text-white text-sm hover:bg-[#083a50] transition"
                  >
                    View More <FiEye />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedRequest && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setSelectedRequest(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-5xl mx-4 max-h-[90vh] overflow-y-auto relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedRequest(null)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
            >
              <FiX size={24} />
            </button>

            <div className="p-6 space-y-6 text-sm text-gray-700">
              {/* Header */}
              <div className="border-b pb-3">
                <h2 className="text-2xl font-bold text-[#0A4D68] mb-1">
                  {selectedRequest.destination}
                </h2>
                <p className="text-gray-500">
                  Rejected by {selectedRequest.rejectedBy}{" "}
                  {selectedRequest.rejectedDate && (
                    <>
                      on{" "}
                      {formatDate(getDateInIST(selectedRequest.rejectedDate))},{" "}
                      {formatTime(getDateInIST(selectedRequest.rejectedDate))}
                    </>
                  )}
                </p>
              </div>

              {/* Overview */}
              <div>
                <h3 className="text-lg font-semibold text-[#0A4D68] mb-3">
                  Overview
                </h3>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { label: "Type", value: selectedRequest.type },
                    {
                      label: "Destination",
                      value: selectedRequest.destination,
                    },
                    {
                      label: "Start Date",
                      value: `${formatDate(
                        getDateInIST(selectedRequest.startDate)
                      )}, ${formatTime(
                        getDateInIST(selectedRequest.startDate)
                      )}`,
                    },
                    {
                      label: "End Date",
                      value: `${formatDate(
                        getDateInIST(selectedRequest.endDate)
                      )}, ${formatTime(getDateInIST(selectedRequest.endDate))}`,
                    },
                    {
                      label: "Rejected By",
                      value: selectedRequest.rejectedBy,
                    },
                    {
                      label: "Reason",
                      value: selectedRequest.reason,
                    },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="bg-gray-50 border border-gray-200 rounded-lg p-3"
                    >
                      <p className="text-xs uppercase text-gray-500 font-semibold tracking-wide">
                        {item.label}
                      </p>
                      <p className="text-sm text-gray-800 font-medium mt-0.5">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Flight Details */}
              {selectedRequest.raw.flightRequest?.segments?.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-[#0A4D68] mb-2">
                    Flight Details
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-200 rounded-lg text-sm">
                      <thead className="bg-[#0A4D68] text-white">
                        <tr>
                          <th className="px-4 py-2 text-left">Flight</th>
                          <th className="px-4 py-2 text-left">Airline</th>
                          <th className="px-4 py-2 text-left">Cabin</th>
                          <th className="px-4 py-2 text-left">Departure</th>
                          <th className="px-4 py-2 text-left">Arrival</th>
                          <th className="px-4 py-2 text-left">Duration</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {selectedRequest.raw.flightRequest.segments.map(
                          (seg, i) => (
                            <tr
                              key={i}
                              className="hover:bg-blue-50 transition-colors"
                            >
                              <td className="px-4 py-2">
                                {seg.origin.city} → {seg.destination.city}
                              </td>
                              <td className="px-4 py-2">
                                {seg.airlineName} ({seg.airlineCode}-
                                {seg.flightNumber})
                              </td>
                              <td className="px-4 py-2">
                                {getCabinClassLabel(seg.cabinClass)}
                              </td>
                              <td className="px-4 py-2">
                                {formatDate(
                                  getDateInIST(seg.departureDateTime)
                                )}{" "}
                                {formatTime(
                                  getDateInIST(seg.departureDateTime)
                                )}
                              </td>
                              <td className="px-4 py-2">
                                {formatDate(getDateInIST(seg.arrivalDateTime))}{" "}
                                {formatTime(getDateInIST(seg.arrivalDateTime))}
                              </td>
                              <td className="px-4 py-2">
                                {formatDuration(seg.durationMinutes)}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
