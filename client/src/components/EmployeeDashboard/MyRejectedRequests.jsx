//client\src\components\EmployeeDashboard\MyRejectedRequests.jsx
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
import { fetchRejectedHotelRequests } from "../../Redux/Actions/hotelBooking.thunks";
import { selectMyRejectedHotelRequests } from "../../Redux/Slice/hotelBooking.slice";

const colors = {
  primary: "#0A4D68",
  light: "#F8FAFC",
  dark: "#1E293B",
};

const calculateNights = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 0;

  const start = new Date(checkIn);
  const end = new Date(checkOut);

  const diffTime = end - start;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export default function MyRejectedRequests() {
  const dispatch = useDispatch();
  const rejectedRequests = useSelector(selectMyRejectedRequests);
  const loading = useSelector((state) => state.bookings.loading);
  const rejectedHotelRequests = useSelector(selectMyRejectedHotelRequests);

  const [type, setType] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [activeTab, setActiveTab] = useState("flight");

  useEffect(() => {
    dispatch(fetchMyRejectedRequests());
    dispatch(fetchRejectedHotelRequests());
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
        req.destination.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      .filter((req) => {
        const date = req.rejectedDate ? new Date(req.rejectedDate) : null;
        const matchesStart = !startDate || date >= new Date(startDate);
        const matchesEnd = !endDate || date <= new Date(endDate);
        return matchesStart && matchesEnd;
      })
      .sort((a, b) => new Date(b.rejectedDate) - new Date(a.rejectedDate));
  }, [rejectedRequests, type, searchTerm, startDate, endDate]);

  const hotelFiltered = useMemo(() => {
    return rejectedHotelRequests
      .map((r) => {
        const hotel = r.hotelRequest || {};
        const room = hotel.selectedRoom || {};
        const snapshot = r.bookingSnapshot || {};

        return {
          id: r._id,
          raw: r,
          type: "Hotel",
          status: "Rejected",

          // 🔥 UI DATA
          hotelName: hotel.selectedHotel?.hotelName || "N/A",
          address: hotel.selectedHotel?.address || "N/A",

          destination: hotel.selectedHotel?.hotelName || "N/A",

          startDate: hotel.checkInDate,
          endDate: hotel.checkOutDate,

          nights: calculateNights(hotel.checkInDate, hotel.checkOutDate),
          rooms: hotel.noOfRooms,

          price: room.totalFare,
          tax: room.totalTax,
          currency: room.currency,

          mealType: room.mealType,
          refundable: room.isRefundable,

          travellers: r.travellers || [],

          rejectedBy: r.rejectedBy?.name
            ? `${r.rejectedBy.name.firstName} ${r.rejectedBy.name.lastName}`
            : "Admin",

          rejectedDate: r.rejectedAt || r.updatedAt,
          reason: r.approverComments || "No reason provided",
        };
      })
      .filter((req) =>
        req.destination.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      .filter((req) => {
        const date = req.rejectedDate ? new Date(req.rejectedDate) : null;
        return (
          (!startDate || date >= new Date(startDate)) &&
          (!endDate || date <= new Date(endDate))
        );
      })
      .sort((a, b) => new Date(b.rejectedDate) - new Date(a.rejectedDate));
  }, [rejectedHotelRequests, searchTerm, startDate, endDate]);

  const activeData = activeTab === "flight" ? filtered : hotelFiltered;

  return (
    <div className="p-6 min-h-screen" style={{ backgroundColor: colors.light }}>
      <div className="max-w-7xl mx-auto space-y-8">
        <h1 className="text-2xl font-bold text-[#0A4D68]">
          My Rejected Requests
        </h1>

        <div className="flex gap-4 mt-4">
          <button
            onClick={() => setActiveTab("flight")}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              activeTab === "flight" ? "bg-[#0A4D68] text-white" : "bg-gray-100"
            }`}
          >
            Flights
          </button>

          <button
            onClick={() => setActiveTab("hotel")}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              activeTab === "hotel" ? "bg-[#0A4D68] text-white" : "bg-gray-100"
            }`}
          >
            Hotels
          </button>
        </div>

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
        ) : activeData.length === 0 ? (
          <p className="text-gray-500 text-center mt-20">
            No rejected requests found.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeData.map((req) => (
              <div>
                {" "}
                {activeTab === "flight" ? (
                  // ✈️ FLIGHT CARD (your existing one — keep as is)
                  <div
                    key={req.id}
                    className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all p-5 flex flex-col gap-3 border-l-4"
                    style={{ borderColor: colors.primary }}
                  >
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold flex items-center gap-2 text-[#0A4D68]">
                        <FaPlane /> Flight Request
                      </h2>
                      <span className="px-3 py-1 text-xs rounded-full bg-red-100 text-red-700">
                        Rejected
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-gray-600">
                      <FiMapPin />
                      {req.destination}
                    </div>

                    <div className="flex items-center gap-2 text-gray-600">
                      <FiCalendar />
                      {new Date(req.startDate).toLocaleDateString()} →{" "}
                      {new Date(req.endDate).toLocaleDateString()}
                    </div>

                    <div className="text-xs text-gray-500">
                      Rejected on{" "}
                      {new Date(req.rejectedDate).toLocaleDateString("en-GB")}
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={() => setSelectedRequest(req)}
                        className="px-4 py-2 bg-[#0A4D68] text-white rounded text-sm"
                      >
                        View More
                      </button>
                    </div>
                  </div>
                ) : (
                  // 🏨 HOTEL CARD (NEW)
                  <div
                    key={req.id}
                    className="bg-white rounded-xl shadow-md hover:shadow-lg transition p-5 flex flex-col gap-3 border-l-4"
                    style={{ borderColor: "#16A34A" }}
                  >
                    {/* Header */}
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-lg font-semibold text-green-700 flex items-center gap-2">
                          <FiHome /> {req.hotelName}
                        </h2>
                        <p className="text-xs text-gray-500">{req.address}</p>
                      </div>

                      <span className="px-3 py-1 text-xs rounded-full bg-red-100 text-red-700">
                        Rejected
                      </span>
                    </div>

                    {/* Stay Info */}
                    <div className="flex items-center gap-2 text-gray-600">
                      <FiCalendar />
                      {new Date(req.startDate).toLocaleDateString()} →{" "}
                      {new Date(req.endDate).toLocaleDateString()}
                    </div>

                    {/* Meta */}
                    {/* <div className="text-sm text-gray-600 flex flex-wrap gap-3">
                      <span>🏨 {req.rooms} Room</span>
                      <span>🌙 {req.nights} Nights</span>
                      <span>🍽 {req.mealType}</span>
                      <span>
                        {req.refundable ? "Refundable" : "Non-refundable"}
                      </span>
                    </div> */}

                    {/* Price */}
                    <div className="text-lg font-semibold text-gray-800">
                      ₹ {req.price?.toLocaleString()}
                    </div>

                    {/* Footer */}
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">
                        Rejected on{" "}
                        {new Date(req.rejectedDate).toLocaleDateString("en-GB")}
                      </span>

                      <button
                        onClick={() => setSelectedRequest(req)}
                        className="px-4 py-2 bg-green-600 text-white rounded text-sm"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                )}
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
                        getDateInIST(selectedRequest.startDate),
                      )}, ${formatTime(
                        getDateInIST(selectedRequest.startDate),
                      )}`,
                    },
                    {
                      label: "End Date",
                      value: `${formatDate(
                        getDateInIST(selectedRequest.endDate),
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
                                  getDateInIST(seg.departureDateTime),
                                )}{" "}
                                {formatTime(
                                  getDateInIST(seg.departureDateTime),
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
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {selectedRequest.type === "Hotel" && (
                <div>
                  <h3 className="text-lg font-semibold text-green-700 mb-3">
                    Hotel Details
                  </h3>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg border">
                      <p className="text-xs text-gray-500">Hotel</p>
                      <p className="font-medium">
                        {
                          selectedRequest.raw.hotelRequest?.selectedHotel
                            ?.hotelName
                        }
                      </p>

                      <p className="text-xs text-gray-500 mt-2">Address</p>
                      <p className="text-sm">
                        {
                          selectedRequest.raw.hotelRequest?.selectedHotel
                            ?.address
                        }
                      </p>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg border">
                      <p className="text-xs text-gray-500">Room Info</p>
                      <p>{selectedRequest.mealType}</p>
                      <p>
                        {selectedRequest.refundable
                          ? "Refundable"
                          : "Non-refundable"}
                      </p>
                      <p>{selectedRequest.rooms} Room(s)</p>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="mt-4 bg-gray-50 p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2">Pricing</h4>
                    <p>Total: ₹ {selectedRequest.price?.toLocaleString()}</p>
                    <p>Tax: ₹ {selectedRequest.tax?.toLocaleString()}</p>
                  </div>

                  {/* Travellers */}
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2">Travellers</h4>
                    <div className="space-y-2">
                      {selectedRequest.travellers?.map((t, i) => (
                        <div
                          key={i}
                          className="bg-gray-50 p-2 rounded border text-sm"
                        >
                          {t.title} {t.firstName} {t.lastName} ({t.paxType})
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Cancellation */}
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2">Cancellation Policy</h4>
                    <div className="space-y-2 text-sm">
                      {selectedRequest.raw.hotelRequest?.selectedRoom?.cancelPolicies?.map(
                        (c, i) => (
                          <div
                            key={i}
                            className="bg-gray-50 p-2 rounded border"
                          >
                            From: {c.FromDate} | Charge: {c.CancellationCharge}{" "}
                            {c.ChargeType}
                          </div>
                        ),
                      )}
                    </div>
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
