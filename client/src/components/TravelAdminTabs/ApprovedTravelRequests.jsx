import React, { useState, useMemo, useEffect } from "react";
import {
  FiChevronDown,
  FiChevronUp,
  FiDownload,
  FiDollarSign,
  FiCalendar,
  FiMapPin,
  FiUser,
  FiHome,
  FiX,
  FiClock,
} from "react-icons/fi";
import { FaPlane } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchApprovals,
  selectApprovals,
  selectApprovalLoading,
  selectApprovalPagination,
} from "../../Redux/Actions/approval.thunks";
import HeaderWithStats from "./Shared/HeaderWithStats";

const colors = {
  primary: "#0A4D68",
  secondary: "#088395",
  accent: "#05BFDB",
  light: "#F8FAFC",
  dark: "#1E293B",
};

// Helper Info display component
const Info = ({ label, value, icon }) => (
  <div className="mb-2">
    <p className="text-xs text-gray-500">{label}</p>
    <p className="font-medium text-gray-800 flex items-center gap-1 text-sm">
      {icon} {value || "N/A"}
    </p>
  </div>
);

export default function ApprovedTravelRequests() {
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [selectedType, setSelectedType] = useState("All");
  const [selectedBookingStatus, setSelectedBookingStatus] = useState("All");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [traceTimers, setTraceTimers] = useState({});

  const dispatch = useDispatch();
  const approvals = useSelector(selectApprovals);
  const loading = useSelector(selectApprovalLoading);
  const pagination = useSelector(selectApprovalPagination);

  React.useEffect(() => {
    dispatch(fetchApprovals({ status: "approved" }));
  }, [dispatch]);

  // 🕒 Manage live countdown timers for all traces
  useEffect(() => {
    const interval = setInterval(() => {
      const updated = {};
      approvals.forEach((a) => {
        const expiryRaw = a.flightRequest?.fareExpiry;
        if (!expiryRaw) return;
        const expiry = new Date(expiryRaw.$date || expiryRaw);
        const diff = expiry - new Date();
        if (diff <= 0) {
          updated[a._id] = "expired";
        } else {
          const h = Math.floor(diff / (1000 * 60 * 60));
          const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const s = Math.floor((diff % (1000 * 60)) / 1000);
          updated[a._id] = `${h}h ${m}m ${s}s`;
        }
      });
      setTraceTimers(updated);
    }, 1000);

    return () => clearInterval(interval);
  }, [approvals]);

  const getCity = (seg, type = "origin") => {
    return (
      seg?.[type]?.city ||
      seg?.[type]?.City ||
      seg?.[type]?.Airport?.CityName ||
      "N/A"
    );
  };

  const getAirportCode = (seg, type = "origin") => {
    return (
      seg?.[type]?.airportCode || seg?.[type]?.Airport?.AirportCode || "N/A"
    );
  };

  const normalizedRequests = useMemo(() => {
    return approvals.map((a) => {
      const segments = a.flightRequest?.segments || [];
      const firstSeg = segments[0];
      const lastSeg = segments[segments.length - 1];

      return {
        id: a._id,
        bookingReference: a.bookingReference,
        bookingType: a.bookingType,
        purposeOfTravel: a.purposeOfTravel,
        travellers: a.travellers || [],
        flightRequest: a.flightRequest || {},
        pricingSnapshot: a.pricingSnapshot || {},
        bookingSnapshot: a.bookingSnapshot || {},
        approverComments: a.approverComments || "",
        requestStatus: a.requestStatus,
        executionStatus: a.executionStatus,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
        approvedAt: a.approvedAt,
        approvedBy: a.approvedBy,
        employee: a.userId?.name
          ? `${a.userId.name.firstName} ${a.userId.name.lastName}`
          : a.userId?.email || "Employee",
        department: a.userId?.department || "N/A",
        type: a.bookingType === "flight" ? "Flight" : "Hotel",

        // 🛫 FIXED: show only start → final destination
        destination:
          segments.length > 0
            ? `${getCity(segments[0], "origin")} → ${getCity(
                segments[segments.length - 1],
                "destination",
              )}`
            : "N/A",

        departureDate: firstSeg?.departureDateTime,
        returnDate: lastSeg?.arrivalDateTime,
        estimatedCost: a.pricingSnapshot?.totalAmount || 0,
        bookingStatus:
          a.executionStatus === "not_started" ? "Pending Booking" : "Booked",
      };
    });
  }, [approvals]);

  const filteredRequests = normalizedRequests.filter((r) => {
    const deptMatch =
      selectedDepartment === "All" || r.department === selectedDepartment;
    const typeMatch = selectedType === "All" || r.type === selectedType;
    const bookingMatch =
      selectedBookingStatus === "All" ||
      r.bookingStatus === selectedBookingStatus;
    return deptMatch && typeMatch && bookingMatch;
  });

  const totalApproved = filteredRequests.length;

  const totalFlights = filteredRequests.filter(
    (r) => r.bookingType === "flight",
  ).length;

  const totalHotels = filteredRequests.filter(
    (r) => r.bookingType === "hotel",
  ).length;

  const totalPendingBookingFlights = filteredRequests.filter(
    (r) => r.bookingStatus === "Pending Booking" && r.bookingType === "flight",
  ).length;

  const totalPendingBookingHotels = filteredRequests.filter(
    (r) => r.bookingStatus === "Pending Booking" && r.bookingType === "hotel",
  ).length;

  const totalEstimatedCost = filteredRequests.reduce(
    (sum, r) => sum + r.estimatedCost,
    0,
  );

  return (
    <div
      className="min-h-full p-4 lg:p-6"
      style={{ backgroundColor: colors.light }}
    >
      <div className="max-w-7xl mx-auto space-y-6">
        <HeaderWithStats
          title="Approved Travel Requests"
          subtitle="All approved travel requests"
          exportFileName="approved-travel-requests.csv"
          exportHeaders={[
            "id",
            "employee",
            "department",
            "type",
            "destination",
            "departureDate",
            "estimatedCost",
            "bookingStatus",
          ]}
          exportData={filteredRequests}
          stats={[
            {
              label: "Total Approved",
              value: totalApproved,
              color: "#16A34A",
              bg: "#DCFCE7",
              icon: <FiCalendar className="text-green-600 text-2xl" />,
            },
            {
              label: "Total Flights",
              value: totalFlights,
              color: "#0A4D68",
              bg: "#E0F2FE",
              icon: <FaPlane className="text-[#0A4D68] text-2xl" />,
            },
            {
              label: "Pending Booking (Flights)",
              value: totalPendingBookingFlights,
              color: "#0A4D68",
              bg: "#E0F2FE",
              icon: <FaPlane className="text-[#0A4D68] text-2xl" />,
            },
            {
              label: "Total Hotels",
              value: totalHotels,
              color: "#F97316",
              bg: "#FFEDD5",
              icon: <FiHome className="text-[#F97316] text-2xl" />,
            },
            {
              label: "Pending Booking (Hotels)",
              value: totalPendingBookingHotels,
              color: "#F97316",
              bg: "#FFEDD5",
              icon: <FiHome className="text-[#F97316] text-2xl" />,
            },
            {
              label: "Estimated Cost",
              value: `₹${totalEstimatedCost.toLocaleString()}`,
              color: "#0A4D68",
              bg: "#E0F2FE",
              icon: <FiDollarSign className="text-[#0A4D68] text-2xl" />,
            },
          ]}
        />

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-lg shadow-md flex flex-wrap gap-4 items-end">
          <div>
            <label className="text-sm font-medium text-gray-700">
              Department
            </label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="block mt-1 px-3 py-2 border rounded-md text-sm"
            >
              <option>All</option>
              {[...new Set(normalizedRequests.map((r) => r.department))].map(
                (d) => (
                  <option key={d}>{d}</option>
                ),
              )}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="block mt-1 px-3 py-2 border rounded-md text-sm"
            >
              <option>All</option>
              <option>Flight</option>
              <option>Hotel</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">
              Booking Status
            </label>
            <select
              value={selectedBookingStatus}
              onChange={(e) => setSelectedBookingStatus(e.target.value)}
              className="block mt-1 px-3 py-2 border rounded-md text-sm"
            >
              <option>All</option>
              <option>Booked</option>
              <option>Pending Booking</option>
            </select>
          </div>
        </div>

        {/* Cards */}
        {loading ? (
          <div className="text-center text-gray-500 py-10">Loading...</div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center text-gray-500 py-10">
            No approved requests found.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRequests.map((r) => {
              const traceInfo =
                traceTimers[r.id] && r.flightRequest?.traceId
                  ? traceTimers[r.id]
                  : null;
              const isExpired = traceInfo === "expired";

              return (
                <div
                  key={r.id}
                  className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-all"
                >
                  <div className="p-5 space-y-3">
                    <div className="flex justify-between items-start">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          r.type === "Flight"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-orange-50 text-orange-700 border border-orange-200"
                        }`}
                      >
                        {r.type === "Flight" ? <FaPlane /> : <FiHome />}
                        {r.type}
                      </span>

                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold text-white ${
                          r.bookingStatus === "Booked"
                            ? "bg-green-600"
                            : "bg-yellow-500"
                        }`}
                      >
                        {r.bookingStatus}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <p className="text-lg font-semibold text-gray-800">
                        {r.destination}
                      </p>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <FiCalendar />{" "}
                        {new Date(r.departureDate).toLocaleDateString()} →{" "}
                        {new Date(r.returnDate).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-500">
                        Purpose: {r.purposeOfTravel}
                      </p>

                      {/* 🧠 Trace info */}
                      {r.flightRequest?.traceId && (
                        <div className="flex items-center gap-2 mt-2 text-xs font-medium">
                          <FiClock
                            className={`${
                              isExpired ? "text-red-500" : "text-green-600"
                            }`}
                          />
                          {isExpired ? (
                            <span className="text-red-600 font-semibold">
                              Trace Expired
                            </span>
                          ) : (
                            <span className="text-green-700">
                              Expires in {traceInfo}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center mt-3">
                      <span className="text-[#0A4D68] font-semibold flex items-center gap-1">
                        <FiDollarSign />
                        {r.estimatedCost.toLocaleString()}
                      </span>
                      <button
                        onClick={() => setSelectedRequest(r)}
                        className="text-sm px-3 py-1.5 bg-[#0A4D68] text-white rounded-md hover:bg-[#093f54] transition-all"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal for Full Details */}
      {selectedRequest && (
        <div
          onClick={() => setSelectedRequest(null)}
          className="fixed inset-0 bg-white/10 backdrop-blur bg-opacity-40 flex items-center justify-center z-50"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto relative"
          >
            {/* Header */}
            <div className="sticky top-0 bg-linear-to-r from-[#0A4D68] to-[#088395] text-white px-6 py-4 rounded-t-xl flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold">
                  Booking Reference: {selectedRequest.bookingReference}
                </h2>
                <p className="text-sm text-blue-100">
                  {selectedRequest.type} • {selectedRequest.executionStatus}
                </p>
                {selectedRequest.flightRequest?.traceId && (
                  <div className="flex items-center gap-2 mt-1 text-sm">
                    <FiClock />
                    {traceTimers[selectedRequest.id] === "expired" ? (
                      <span className="text-red-300 font-medium">
                        Fare Expired
                      </span>
                    ) : (
                      <span className="text-green-200 font-medium">
                        Expires in {traceTimers[selectedRequest.id]}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="text-white hover:text-gray-200 transition"
              >
                <FiX className="text-2xl" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-8">
              {/* Basic Info */}
              <section>
                <h3 className="text-lg font-semibold text-gray-700 mb-3 border-b pb-1">
                  General Information
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Info
                    label="Employee"
                    value={selectedRequest.employee}
                    icon={<FiUser />}
                  />
                  <Info label="Department" value={selectedRequest.department} />
                  <Info
                    label="Purpose of Travel"
                    value={selectedRequest.purposeOfTravel}
                  />
                  <Info
                    label="Approved Date"
                    value={new Date(
                      selectedRequest.approvedAt,
                    ).toLocaleString()}
                  />
                  <Info
                    label="Execution Status"
                    value={selectedRequest.executionStatus}
                  />
                  <Info
                    label="Booking Status"
                    value={selectedRequest.bookingStatus}
                  />
                </div>
              </section>

              {/* Route Summary */}
              {selectedRequest.flightRequest?.segments?.length > 0 && (
                <section>
                  <h3 className="text-lg font-semibold text-gray-700 mb-3 border-b pb-1">
                    Route Summary
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-md border">
                    <p className="text-base font-semibold text-gray-800">
                      {getCity(
                        selectedRequest.flightRequest.segments[0],
                        "origin",
                      )}{" "}
                      (
                      {
                        selectedRequest.flightRequest.segments[0].origin
                          .airportCode
                      }
                      ) →{" "}
                      {
                        selectedRequest.flightRequest.segments[
                          selectedRequest.flightRequest.segments.length - 1
                        ].destination.city
                      }{" "}
                      (
                      {
                        selectedRequest.flightRequest.segments[
                          selectedRequest.flightRequest.segments.length - 1
                        ].destination.airportCode
                      }
                      )
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {new Date(
                        selectedRequest.flightRequest.segments[0]
                          .departureDateTime,
                      ).toLocaleString()}{" "}
                      →{" "}
                      {new Date(
                        selectedRequest.flightRequest.segments[
                          selectedRequest.flightRequest.segments.length - 1
                        ].arrivalDateTime,
                      ).toLocaleString()}
                    </p>
                  </div>
                </section>
              )}

              {/* Travellers */}
              <section>
                <h3 className="text-lg font-semibold text-gray-700 mb-3 border-b pb-1">
                  Travellers
                </h3>
                <div className="grid md:grid-cols-2 gap-3">
                  {selectedRequest.travellers.map((t, i) => (
                    <div
                      key={i}
                      className="bg-white border border-gray-200 rounded-md p-4 shadow-sm"
                    >
                      <p className="font-semibold text-gray-800">
                        {t.title} {t.firstName} {t.lastName}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Email: {t.email}
                      </p>
                      <p className="text-sm text-gray-600">
                        DOB: {new Date(t.dateOfBirth).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-600">
                        Gender: {t.gender}
                      </p>
                      <p className="text-sm text-gray-600">
                        Nationality: {t.nationality}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Flight Segments */}
              {selectedRequest.flightRequest?.segments?.length > 0 && (
                <section>
                  <h3 className="text-lg font-semibold text-gray-700 mb-3 border-b pb-1">
                    Flight Segments
                  </h3>
                  <div className="space-y-3">
                    {selectedRequest.flightRequest.segments.map((seg, i) => (
                      <div
                        key={i}
                        className="bg-linear-to-r from-gray-50 to-white border rounded-md p-4 shadow-sm"
                      >
                        <div className="flex justify-between items-center">
                          <p className="font-semibold text-gray-800">
                            ✈️ {seg.airlineName} {seg.flightNumber}
                          </p>
                          <p className="text-xs text-gray-500">
                            Aircraft: {seg.aircraft}
                          </p>
                        </div>
                        <p className="text-sm text-gray-700 mt-1">
                          {getCity(seg, "origin")} ({seg.origin.airportCode}) →{" "}
                          {getCity(seg, "destination")} (
                          {seg.destination.airportCode})
                        </p>
                        <p className="text-sm text-gray-600">
                          Departure:{" "}
                          {new Date(seg.departureDateTime).toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-600">
                          Arrival:{" "}
                          {new Date(seg.arrivalDateTime).toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-600">
                          Baggage: {seg.baggage?.checkIn} / {seg.baggage?.cabin}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Pricing */}
              <section>
                <h3 className="text-lg font-semibold text-gray-700 mb-3 border-b pb-1">
                  Pricing Details
                </h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="bg-gray-50 p-3 rounded border">
                    <p>
                      Base Fare: ₹
                      {selectedRequest.flightRequest?.fareSnapshot?.baseFare}
                    </p>
                    <p>
                      Tax: ₹{selectedRequest.flightRequest?.fareSnapshot?.tax}
                    </p>
                    <p className="font-semibold text-[#0A4D68] mt-1">
                      Total: ₹{selectedRequest.pricingSnapshot?.totalAmount}
                    </p>
                    <p>Currency: {selectedRequest.pricingSnapshot?.currency}</p>
                  </div>
                </div>
              </section>

              {/* Comments */}
              {selectedRequest.approverComments && (
                <section>
                  <h3 className="text-lg font-semibold text-gray-700 mb-3 border-b pb-1">
                    Approver Comments
                  </h3>
                  <p className="bg-gray-50 border rounded-md p-3 text-sm text-gray-700">
                    {selectedRequest.approverComments}
                  </p>
                </section>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
