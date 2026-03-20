import React, { useState, useMemo, useEffect } from "react";
import {
  FiXCircle,
  FiHome,
  FiUser,
  FiCalendar,
  FiDollarSign,
  FiFilter,
  FiDownload,
  FiEye,
  FiMapPin,
  FiMessageCircle,
  FiX,
} from "react-icons/fi";
import { FaPlane } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchApprovals,
  selectApprovals,
  selectApprovalLoading,
} from "../../Redux/Actions/approval.thunks";
import HeaderWithStats from "./Shared/HeaderWithStats";
import { ToastWithTimer } from "../../utils/ToastConfirm";
import {
  airlineLogo,
  formatDate,
  formatDuration,
  formatTime,
  getCabinClassLabel,
  getDateInIST,
} from "../../utils/formatter";

const colors = {
  primary: "#0A4D68",
  secondary: "#088395",
  accent: "#05BFDB",
  light: "#F8FAFC",
  dark: "#1E293B",
  danger: "#EF4444",
};

export default function RejectedTravelRequests() {
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [selectedType, setSelectedType] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const today = new Date();

  const firstDayOfYear = new Date(today.getFullYear(), 0, 1)
    .toISOString()
    .split("T")[0];

  const lastDayOfYear = new Date(today.getFullYear(), 11, 31)
    .toISOString()
    .split("T")[0];

  const [startDate, setStartDate] = useState(firstDayOfYear);
  const [endDate, setEndDate] = useState(lastDayOfYear);

  const [selectedRequest, setSelectedRequest] = useState(null);

  const dispatch = useDispatch();
  const rejectedRequests = useSelector(selectApprovals);
  const loading = useSelector(selectApprovalLoading);

  useEffect(() => {
    dispatch(fetchApprovals({ status: "rejected" }));
  }, [dispatch]);

  const types = ["All", "Flight", "Hotel"];
  const statuses = ["All", "Rejected", "Cancelled"];

  const normalizedRequests = useMemo(() => {
    return rejectedRequests.map((r) => {
      const segments = r.flightRequest?.segments || [];
      const firstSeg = segments[0];
      const lastSeg = segments[segments.length - 1];
      return {
        id: r._id,

        raw: r, // 🔥 IMPORTANT — keep full DB record

        employee: r.userId?.name
          ? `${r.userId.name.firstName} ${r.userId.name.lastName}`
          : r.userId?.email || "Employee",

        department: r.userId?.department || "N/A",
        type: r.bookingType === "flight" ? "Flight" : "Hotel",

        destination: segments.length
          ? `${segments[0].origin.city} → ${
              segments[segments.length - 1].destination.city
            }`
          : "N/A",

        rejectedDate: r.rejectedAt,
        rejectedBy:
          r.rejectedBy?.name?.firstName && r.rejectedBy?.name?.lastName
            ? `${r.rejectedBy.name.firstName} ${r.rejectedBy.name.lastName}`
            : "Admin",

        reason: r.approverComments || "No reason provided",
        estimatedCost: r.pricingSnapshot?.totalAmount || 0,
        status: "Rejected",
      };
    });
  }, [rejectedRequests]);

  const departments = useMemo(() => {
    return ["All", ...new Set(normalizedRequests.map((r) => r.department))];
  }, [normalizedRequests]);

  const filteredRequests = normalizedRequests.filter((request) => {
    const rejectedDate = new Date(request.rejectedDate);

    const dateMatch =
      (!startDate || rejectedDate >= new Date(startDate)) &&
      (!endDate || rejectedDate <= new Date(endDate));

    const deptMatch =
      selectedDepartment === "All" || request.department === selectedDepartment;

    const typeMatch = selectedType === "All" || request.type === selectedType;

    const statusMatch =
      selectedStatus === "All" || request.status === selectedStatus;

    return dateMatch && deptMatch && typeMatch && statusMatch;
  });

  const totalRejected = filteredRequests.length;
  const totalCancelled = 0;
  const totalEstimatedCost = filteredRequests.reduce(
    (sum, r) => sum + r.estimatedCost,
    0
  );

  const handleViewDetails = (id) =>
    ToastWithTimer({
      type: "info",
      message: `Viewing details for rejected request #${id}`,
    });

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <HeaderWithStats
          title="Rejected Travel Requests"
          subtitle="Review and analyze all rejected or cancelled requests"
          exportFileName="rejected-travel-requests.csv"
          exportHeaders={[
            "id",
            "employee",
            "department",
            "type",
            "destination",
            "rejectedDate",
            "approvedBy",
            "estimatedCost",
            "status",
          ]}
          exportData={filteredRequests}
          stats={[
            {
              label: "Total Rejected",
              value: totalRejected,
              color: "#EF4444",
              bg: "#FEE2E2",
              icon: <FiXCircle className="text-red-600 text-2xl" />,
            },
            {
              label: "Estimated Cost",
              value: `₹${totalEstimatedCost.toLocaleString()}`,
              color: "#05BFDB",
              bg: "#E0F2FE",
              icon: <FiDollarSign className="text-[#05BFDB] text-2xl" />,
            },
          ]}
        />

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-md p-6 space-y-4">
          <div className="flex items-center gap-2 border-b pb-2">
            <FiFilter className="text-[#0A4D68]" />
            <h2 className="font-semibold text-[#0A4D68]">Filter Requests</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="text-sm font-medium">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border rounded-md p-2 mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border rounded-md p-2 mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Department</label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full border rounded-md p-2 mt-1"
              >
                {departments.map((dept) => (
                  <option key={dept}>{dept}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Type</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full border rounded-md p-2 mt-1"
              >
                {types.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full border rounded-md p-2 mt-1"
              >
                {statuses.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Cards Grid */}
        {loading ? (
          <p className="text-center text-gray-500 py-10">Loading...</p>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center text-gray-500 py-10 bg-white rounded-lg shadow-md">
            No rejected requests found
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRequests.map((req) => (
              <div
                key={req.id}
                className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span
                      className={`px-3 py-1 text-xs rounded-full font-medium flex items-center gap-1 ${
                        req.type === "Flight"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-orange-50 text-orange-700"
                      }`}
                    >
                      {req.type === "Flight" ? <FaPlane /> : <FiHome />}
                      {req.type}
                    </span>
                    <span className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full font-semibold">
                      Rejected
                    </span>
                  </div>

                  <h3 className="font-semibold text-gray-800 text-lg mb-1">
                    {req.destination}
                  </h3>

                  <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                    <FiCalendar />{" "}
                    {new Date(req.rejectedDate).toLocaleDateString()}
                  </p>

                  <p className="text-sm text-gray-600 flex items-center gap-1">
                    <FiUser /> {req.employee}
                  </p>
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <FiXCircle /> Rejected by: {req.rejectedBy}
                  </p>

                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <FiMessageCircle /> Reason: {req.reason}
                  </p>
                </div>

                <div className="flex justify-between items-center mt-4 pt-3 border-t">
                  <p className="font-semibold text-[#088395] flex items-center gap-1">
                    <FiDollarSign /> ₹{req.estimatedCost.toLocaleString()}
                  </p>
                  <button
                    onClick={() => setSelectedRequest(req)}
                    className="flex items-center gap-1 text-sm bg-[#0A4D68] text-white px-3 py-1.5 rounded-md hover:bg-[#083a50]"
                  >
                    <FiEye size={14} /> View
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal for Full Details */}
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
              {/* HEADER */}
              <div className="border-b pb-3">
                <h2 className="text-2xl font-bold text-[#0A4D68] mb-1">
                  {selectedRequest.destination || "Rejected Travel Request"}
                </h2>
                <p className="text-gray-500">
                  Rejected on{" "}
                  {selectedRequest.rejectedDate
                    ? `${formatDate(
                        getDateInIST(selectedRequest.rejectedDate)
                      )}, ${formatTime(
                        getDateInIST(selectedRequest.rejectedDate)
                      )}`
                    : "N/A"}{" "}
                  by {selectedRequest.rejectedBy}
                </p>
              </div>

              {/* OVERVIEW SECTION */}
              <div>
                <h3 className="text-lg font-semibold text-[#0A4D68] mb-3">
                  Overview
                </h3>

                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { label: "Employee", value: selectedRequest.employee },
                    { label: "Department", value: selectedRequest.department },
                    { label: "Booking Type", value: selectedRequest.type },
                    {
                      label: "Purpose of Travel",
                      value: selectedRequest.raw.purposeOfTravel || "N/A",
                    },
                    {
                      label: "Status",
                      value: selectedRequest.raw.requestStatus || "Rejected",
                    },
                    {
                      label: "Created At",
                      value: `${formatDate(
                        getDateInIST(selectedRequest.raw.createdAt)
                      )}, ${formatTime(
                        getDateInIST(selectedRequest.raw.createdAt)
                      )}`,
                    },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-gray-50 border border-gray-200 rounded-lg p-3 hover:shadow-sm transition"
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

              {/* REJECTION REASON */}
              <div>
                <h3 className="text-lg font-semibold text-red-600 mb-2">
                  Rejection Reason
                </h3>
                <p className="bg-red-50 border border-red-100 p-3 rounded-md text-red-700">
                  {selectedRequest.reason || "No reason provided"}
                </p>
              </div>

              {/* FLIGHT REQUEST DETAILS */}
              {selectedRequest.raw.flightRequest && (
                <div>
                  <h3 className="text-lg font-semibold text-[#0A4D68] mb-2">
                    Flight Request Details
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <p>
                      <span className="font-medium">Fare Expiry:</span>{" "}
                      {selectedRequest.raw.flightRequest.fareExpiry
                        ? new Date(
                            selectedRequest.raw.flightRequest.fareExpiry
                          ).toLocaleString()
                        : "N/A"}
                    </p>
                  </div>

                  <div className="mt-4">
                    <h4 className="font-semibold text-gray-800 mb-3">
                      Flight Segments
                    </h4>

                    <div className="overflow-x-auto">
                      <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden text-sm">
                        <thead className="bg-[#0A4D68] text-white">
                          <tr>
                            <th className="px-4 py-2 text-left">Flight</th>
                            <th className="px-4 py-2 text-left">Airline</th>
                            <th className="px-4 py-2 text-left">Aircraft</th>
                            <th className="px-4 py-2 text-left">Cabin</th>
                            <th className="px-4 py-2 text-left">Departure</th>
                            <th className="px-4 py-2 text-left">Arrival</th>
                            <th className="px-4 py-2 text-left">Baggage</th>
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
                                <td className="px-4 py-2 flex items-center gap-2">
                                  <span>
                                    {seg.airlineName} ({seg.airlineCode}-
                                    {seg.flightNumber})
                                  </span>
                                </td>
                                <td className="px-4 py-2">
                                  {seg.aircraft || "N/A"}
                                </td>
                                <td className="px-4 py-2">
                                  {getCabinClassLabel(seg.cabinClass)}
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap">
                                  <div className="flex flex-col">
                                    <span className="font-medium text-gray-800">
                                      {formatTime(
                                        getDateInIST(seg.departureDateTime)
                                      )}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {formatDate(
                                        getDateInIST(seg.departureDateTime)
                                      )}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap">
                                  <div className="flex flex-col">
                                    <span className="font-medium text-gray-800">
                                      {formatTime(
                                        getDateInIST(seg.arrivalDateTime)
                                      )}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {formatDate(
                                        getDateInIST(seg.arrivalDateTime)
                                      )}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-2">
                                  {seg.baggage?.checkIn || "-"} +{" "}
                                  {seg.baggage?.cabin || "-"}
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
                </div>
              )}

              {/* TRAVELLER DETAILS */}
              {selectedRequest.raw.travellers?.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-[#0A4D68] mb-3">
                    Traveller Details
                  </h3>

                  <div className="grid md:grid-cols-2 gap-4">
                    {selectedRequest.raw.travellers.map((t, i) => (
                      <div
                        key={i}
                        className="border border-gray-200 rounded-xl p-4 bg-linear-to-br from-white to-gray-50 shadow-sm hover:shadow-md transition"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-[#0A4D68] text-sm">
                            {t.title} {t.firstName} {t.lastName}
                          </h4>
                          {t.isLeadPassenger && (
                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                              Lead Traveller
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-gray-600 space-y-1.5">
                          <p>
                            <span className="font-medium text-gray-700">
                              Gender:
                            </span>{" "}
                            {t.gender || "N/A"}
                          </p>
                          <p>
                            <span className="font-medium text-gray-700">
                              DOB:
                            </span>{" "}
                            {t.dateOfBirth
                              ? formatDate(getDateInIST(t.dateOfBirth))
                              : "N/A"}
                          </p>
                          <p>
                            <span className="font-medium text-gray-700">
                              Email:
                            </span>{" "}
                            {t.email || "N/A"}
                          </p>
                          <p>
                            <span className="font-medium text-gray-700">
                              Nationality:
                            </span>{" "}
                            {t.nationality || "N/A"}
                          </p>
                          <p>
                            <span className="font-medium text-gray-700">
                              Passport No:
                            </span>{" "}
                            {t.passportNumber || "N/A"}
                          </p>
                          <p>
                            <span className="font-medium text-gray-700">
                              Passport Expiry:
                            </span>{" "}
                            {t.passportExpiry
                              ? formatDate(getDateInIST(t.passportExpiry))
                              : "N/A"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* FARE DETAILS */}
              {selectedRequest.raw.flightRequest?.fareSnapshot && (
                <div>
                  <h3 className="text-lg font-semibold text-[#0A4D68] mb-2">
                    Fare Details
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <p>
                      <span className="font-medium">Currency:</span>{" "}
                      {selectedRequest.raw.flightRequest.fareSnapshot.currency}
                    </p>
                    <p>
                      <span className="font-medium">Base Fare:</span> ₹
                      {selectedRequest.raw.flightRequest.fareSnapshot.baseFare}
                    </p>
                    <p>
                      <span className="font-medium">Tax:</span> ₹
                      {selectedRequest.raw.flightRequest.fareSnapshot.tax}
                    </p>
                    <p>
                      <span className="font-medium">Published Fare:</span> ₹
                      {
                        selectedRequest.raw.flightRequest.fareSnapshot
                          .publishedFare
                      }
                    </p>
                    <p>
                      <span className="font-medium">Refundable:</span>{" "}
                      {selectedRequest.raw.flightRequest.fareSnapshot.refundable
                        ? "Yes"
                        : "No"}
                    </p>
                    <p>
                      <span className="font-medium">Fare Type:</span>{" "}
                      {selectedRequest.raw.flightRequest.fareSnapshot.fareType}
                    </p>
                  </div>
                </div>
              )}

              {/* SSR SNAPSHOT (Seats, Meals, Baggage) */}
              {selectedRequest.raw.flightRequest?.ssrSnapshot && (
                <div>
                  <h3 className="text-lg font-semibold text-[#0A4D68] mb-2">
                    Additional Services
                  </h3>
                  <div className="space-y-2 text-sm">
                    {selectedRequest.raw.flightRequest.ssrSnapshot.seats
                      ?.length > 0 && (
                      <p>
                        Seats:{" "}
                        {selectedRequest.raw.flightRequest.ssrSnapshot.seats
                          .map((s) => s.seatNo)
                          .join(", ")}
                      </p>
                    )}
                    {selectedRequest.raw.flightRequest.ssrSnapshot.meals
                      ?.length > 0 && (
                      <p>
                        Meals:{" "}
                        {selectedRequest.raw.flightRequest.ssrSnapshot.meals
                          .map((m) => `${m.description} (₹${m.price})`)
                          .join(", ")}
                      </p>
                    )}
                    {selectedRequest.raw.flightRequest.ssrSnapshot.baggage
                      ?.length > 0 && (
                      <p>
                        Baggage:{" "}
                        {selectedRequest.raw.flightRequest.ssrSnapshot.baggage
                          .map((b) => `${b.weight} (${b.price}₹)`)
                          .join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* PRICING SNAPSHOT */}
              {selectedRequest.raw.pricingSnapshot && (
                <div>
                  <h3 className="text-lg font-semibold text-[#0A4D68] mb-2">
                    Pricing Snapshot
                  </h3>
                  <p>
                    <span className="font-medium">Total Amount:</span> ₹
                    {selectedRequest.raw.pricingSnapshot.totalAmount?.toLocaleString()}
                  </p>
                  <p>
                    <span className="font-medium">Currency:</span>{" "}
                    {selectedRequest.raw.pricingSnapshot.currency}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
