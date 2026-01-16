import React, { useEffect, useMemo, useState } from "react";
import {
  FiClock,
  FiUser,
  FiCalendar,
  FiDollarSign,
  FiMapPin,
  FiFilter,
  FiAlertCircle,
  FiCheck,
  FiX,
  FiChevronDown,
  FiChevronUp,
  FiHome,
  FiMail,
} from "react-icons/fi";
import { FaHotel, FaPlane } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchApprovals,
  approveApproval,
  rejectApproval,
} from "../../Redux/Actions/approval.thunks";
import Swal from "sweetalert2";

const colors = {
  primary: "#0A4D68",
  secondary: "#088395",
  accent: "#05BFDB",
  light: "#F8FAFC",
  dark: "#1E293B",
};

export default function PendingTravelRequests() {
  const dispatch = useDispatch();
  const { list, loading, actionLoading } = useSelector(
    (state) => state.approvals
  );

  const [filters, setFilters] = useState({ type: "All" });
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    dispatch(fetchApprovals({ status: "pending_approval" }));
  }, [dispatch]);

  const requests = useMemo(() => {
    return list.map((b) => {
      const segments = b.flightRequest?.segments || [];
      const ssr = b.flightRequest?.ssrSnapshot || {};
      const lastSegment = segments[segments.length - 1];
      const firstSegment = segments[0];
      return {
        id: b._id,
        bookingRef: b.bookingReference,
        type: b.bookingType,
        status: b.requestStatus,
        employee: b.userId?.name?.firstName || b.userId?.email || "Employee",
        travellers: (b.travellers || []).map((t) => ({
          name:
            `${t.firstName || ""} ${t.lastName || ""}`.trim() || "Traveller",
          email: t.email || "N/A",
          isLead: t.isLeadPassenger,
        })),

        reason: b.purposeOfTravel,
        priority: "Medium",
        destination: segments.length
          ? segments
              .map(
                (s) =>
                  `${s?.origin?.city || "Unknown"} → ${
                    s?.destination?.city || "Unknown"
                  }`
              )
              .join(", ")
          : "N/A",
        cityFrom: firstSegment?.origin?.city || "N/A",
        cityTo: lastSegment?.destination?.city || "N/A",
        departureDate: firstSegment?.departureDateTime
          ? new Date(firstSegment.departureDateTime).toLocaleDateString()
          : "N/A",
        returnDate: lastSegment?.arrivalDateTime
          ? new Date(lastSegment.arrivalDateTime).toLocaleDateString()
          : "N/A",
        estimatedCost: b.pricingSnapshot?.totalAmount || 0,
        route: segments.map((s) => {
          const fromCity = s?.origin?.city || "Unknown";
          const fromCode = s?.origin?.airportCode || "---";
          const toCity = s?.destination?.city || "Unknown";
          const toCode = s?.destination?.airportCode || "---";
          return `${fromCity} (${fromCode}) → ${toCity} (${toCode})`;
        }),
        country:
          (firstSegment?.origin?.country || "N/A") !==
          (lastSegment?.destination?.country || "N/A")
            ? `${firstSegment?.origin?.country || "N/A"} → ${
                lastSegment?.destination?.country || "N/A"
              }`
            : firstSegment?.origin?.country || "N/A",
        airline: [
          ...new Set(segments.map((s) => s?.airlineName).filter(Boolean)),
        ].join(", "),
        airlineCode: [
          ...new Set(segments.map((s) => s?.airlineCode).filter(Boolean)),
        ].join(", "),
        aircraft: segments
          .map((s) => s?.aircraft)
          .filter(Boolean)
          .join(", "),
        departureDateTime: firstSegment?.departureDateTime,
        arrivalDateTime: lastSegment?.arrivalDateTime,
        durationMinutes: segments.reduce(
          (sum, s) => sum + (s?.durationMinutes || 0),
          0
        ),
        baggage: segments.map((s) => s?.baggage || {}),
        seats: ssr.seats || [],
        meals: ssr.meals || [],
        extraBaggage: ssr.baggage || [],
        pricing: b.pricingSnapshot || {},
        fare: b.flightRequest?.fareSnapshot || null,
      };
    });
  }, [list]);

  const filteredRequests = requests.filter(
    (r) => filters.type === "All" || r.type === filters.type
  );

  const handleApprove = async (id) => {
    const result = await Swal.fire({
      title: "Approve Travel Request",
      text: "Are you sure you want to approve this request?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Approve",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#16a34a",
      cancelButtonColor: "#6b7280",
    });

    if (result.isConfirmed) {
      dispatch(
        approveApproval({
          id,
          comments: "", // intentionally empty
        })
      )
        .unwrap()
        .then(() => {
          Swal.fire("Approved", "Request approved successfully", "success");
        })
        .catch((err) => {
          Swal.fire("Error", err || "Approval failed", "error");
        });
    }
  };

  const handleReject = async (id) => {
    const result = await Swal.fire({
      title: "Reject Travel Request",
      text: "Please provide a reason for rejection",
      input: "textarea",
      inputPlaceholder: "Enter rejection reason...",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Reject",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      inputValidator: (value) => {
        if (!value || value.trim().length < 5) {
          return "Rejection reason must be at least 5 characters";
        }
      },
    });

    if (result.isConfirmed) {
      dispatch(
        rejectApproval({
          id,
          comments: result.value.trim(), // always string here
        })
      )
        .unwrap()
        .then(() => {
          Swal.fire("Rejected", "Request rejected successfully", "success");
        })
        .catch((err) => {
          Swal.fire("Error", err || "Rejection failed", "error");
        });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-12 w-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: colors.light }}>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* HEADER */}
        <div className="text-center">
          <h1
            className="text-3xl font-bold mb-2"
            style={{ color: colors.primary }}
          >
            Pending Travel Requests
          </h1>
          <p className="text-gray-600">
            Review, manage, and approve employee travel bookings
          </p>
        </div>

        {/* FILTERS */}
        <div className="bg-white p-4 rounded-lg shadow flex items-center gap-4">
          <FiFilter size={20} />
          <select
            value={filters.type}
            onChange={(e) =>
              setFilters((f) => ({ ...f, type: e.target.value }))
            }
            className="border rounded px-3 py-2"
          >
            <option>All</option>
            <option value="flight">Flight</option>
            <option value="hotel">Hotel</option>
          </select>
        </div>

        {/* LIST */}
        {filteredRequests.length === 0 ? (
          <div className="bg-white p-8 text-center rounded-lg shadow">
            No pending requests
          </div>
        ) : (
          filteredRequests.map((r) => {
            const isExpanded = expanded === r.id;
            return (
              <div
                key={r.id}
                className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-200 overflow-hidden"
              >
                {/* HEADER */}
                <div
                  className="flex justify-between items-center px-6 py-4 cursor-pointer bg-linear-to-r from-[#05BFDB] to-white text-gray-900"
                  onClick={() =>
                    setExpanded((prev) => (prev === r.id ? null : r.id))
                  }
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-2">
                      {r.type === "flight" ? (
                        <FaPlane className="text-[#0A4D68] text-xl" />
                      ) : (
                        <FaHotel className="text-[#0A4D68] text-xl" />
                      )}
                      <h3 className="text-lg font-semibold text-[#0A4D68] flex items-center gap-2">
                        <span>{r.cityFrom}</span>
                        <span className="text-gray-500">→</span>
                        <span>{r.cityTo}</span>
                      </h3>
                    </div>
                    {/* TRAVELLERS */}
                    <div className="md:col-span-2">
                      <div className="space-y-2">
                        {r.travellers.length ? (
                          r.travellers.map((t, idx) => (
                            <div
                              key={idx}
                              className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white border rounded-md p-3"
                            >
                              <div className="flex items-center gap-2">
                                <FiUser className="text-[#0A4D68]" />
                                <span className="font-medium">
                                  {t.name}
                                  {t.isLead && (
                                    <span className="ml-2 text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                                      Lead
                                    </span>
                                  )}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 text-sm text-gray-600 mt-1 sm:mt-0">
                                <FiMail />
                                {t.email}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500">
                            No traveller details available
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    {" "}
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        r.status === "pending_approval"
                          ? "bg-yellow-100 text-yellow-700"
                          : r.status === "approved"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {r.status.replace("_", " ").toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-[#0A4D68]">
                      ₹{r.estimatedCost.toLocaleString()}
                    </span>
                    {/* ACTION BUTTONS */}
                    <div className="flex justify-end gap-2">
                      <button
                        disabled={actionLoading}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApprove(r.id);
                        }}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-md flex items-center gap-1 text-sm transition"
                      >
                        <FiCheck /> Approve
                      </button>
                      <button
                        disabled={actionLoading}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReject(r.id);
                        }}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md flex items-center gap-1 text-sm transition"
                      >
                        <FiX /> Reject
                      </button>
                    </div>

                    {isExpanded ? (
                      <FiChevronUp className="text-[#0A4D68] text-xl" />
                    ) : (
                      <FiChevronDown className="text-[#0A4D68] text-xl" />
                    )}
                  </div>
                </div>

                {/* SUMMARY VIEW */}
                <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Detail
                    icon={<FiCalendar />}
                    label="Departure Date"
                    value={r.departureDate}
                  />
                  <Detail
                    icon={<FiCalendar />}
                    label="Return Date"
                    value={r.returnDate}
                  />
                  <Detail
                    icon={<FiMapPin />}
                    label="Departure City"
                    value={r.cityFrom}
                  />
                  <Detail
                    icon={<FiMapPin />}
                    label="Arrival City"
                    value={r.cityTo}
                  />
                  <Detail
                    icon={<FiDollarSign />}
                    label="Estimated Cost"
                    value={`₹${r.estimatedCost}`}
                  />
                  <Detail
                    icon={<FiAlertCircle />}
                    label="Purpose"
                    value={r.reason}
                  />
                  <Detail
                    icon={<FiClock />}
                    label="Priority"
                    value={r.priority}
                  />

                  {/* ==== Fare Expiry Info ==== */}
                  {r.fare &&
                    (() => {
                      const expiryDate = new Date(
                        r.fareExpiry || r.pricing?.capturedAt
                      );
                      const now = new Date();
                      const diffMs = expiryDate - now;
                      let expiryText = "Fare expired";
                      let expiryColor = "text-red-600";

                      if (diffMs > 0) {
                        const diffMin = Math.floor(diffMs / 60000);
                        const hours = Math.floor(diffMin / 60);
                        const minutes = diffMin % 60;
                        expiryText = `Fare expires in ${
                          hours > 0 ? hours + "h " : ""
                        }${minutes}m`;
                        expiryColor = "text-green-600";
                      }

                      return (
                        <div className="mb-4 flex items-center gap-2">
                          <FiClock className={`text-lg ${expiryColor}`} />
                          <p className={`font-medium ${expiryColor}`}>
                            {expiryText}
                          </p>
                        </div>
                      );
                    })()}
                </div>

                {isExpanded && (
                  <div className="bg-gray-50 border-t border-gray-200 px-6 py-5 animate-fade-in">
                    <h4 className="text-md font-semibold text-gray-700 mb-3">
                      Full Request Details
                    </h4>

                    {/* If there are route segments → show tables */}
                    {r.route?.length > 0 ? (
                      <>
                        {/* FLIGHT DETAILS TABLE */}
                        <h5 className="text-md font-semibold text-[#0A4D68] mb-2">
                          Flight Segments
                        </h5>
                        <div className="overflow-x-auto mb-6">
                          <table className="min-w-full border border-gray-300 bg-white rounded-md shadow-sm">
                            <thead className="bg-[#05BFDB]/20 text-[#0A4D68]">
                              <tr>
                                <th className="px-4 py-2 text-left text-sm font-semibold border-b border-gray-300">
                                  Route
                                </th>
                                <th className="px-4 py-2 text-left text-sm font-semibold border-b border-gray-300">
                                  Airline
                                </th>
                                <th className="px-4 py-2 text-left text-sm font-semibold border-b border-gray-300">
                                  Aircraft
                                </th>
                                <th className="px-4 py-2 text-left text-sm font-semibold border-b border-gray-300">
                                  Departure
                                </th>
                                <th className="px-4 py-2 text-left text-sm font-semibold border-b border-gray-300">
                                  Arrival
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {r.route.map((seg, idx) => (
                                <tr
                                  key={idx}
                                  className="odd:bg-white even:bg-gray-50 border-b border-gray-300"
                                >
                                  <td className="px-4 py-2 text-sm text-gray-700">
                                    {seg}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-700">
                                    {r.airline || "N/A"}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-700">
                                    {r.aircraft || "N/A"}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-700">
                                    {r.departureDateTime
                                      ? new Date(
                                          r.departureDateTime
                                        ).toLocaleString()
                                      : "N/A"}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-700">
                                    {r.arrivalDateTime
                                      ? new Date(
                                          r.arrivalDateTime
                                        ).toLocaleString()
                                      : "N/A"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* BAGGAGE TABLE */}
                        {r.baggage?.length > 0 && (
                          <>
                            <h5 className="text-md font-semibold text-[#0A4D68] mb-2">
                              Baggage Details
                            </h5>
                            <div className="overflow-x-auto mb-6">
                              <table className="min-w-full border border-gray-200 bg-white rounded-md shadow-sm">
                                <thead className="bg-[#05BFDB]/20 text-[#0A4D68]">
                                  <tr>
                                    <th className="px-4 py-2 text-left text-sm font-semibold border-b border-gray-300">
                                      Segment
                                    </th>
                                    <th className="px-4 py-2 text-left text-sm font-semibold border-b border-gray-300">
                                      Check-in
                                    </th>
                                    <th className="px-4 py-2 text-left text-sm font-semibold border-b border-gray-300">
                                      Cabin
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {r.baggage.map((b, idx) => (
                                    <tr
                                      key={idx}
                                      className="odd:bg-white even:bg-gray-50 border-b border-gray-300"
                                    >
                                      <td className="px-4 py-2 text-sm text-gray-700">
                                        #{idx + 1}
                                      </td>
                                      <td className="px-4 py-2 text-sm text-gray-700">
                                        {b?.checkIn || "N/A"}
                                      </td>
                                      <td className="px-4 py-2 text-sm text-gray-700">
                                        {b?.cabin || "N/A"}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </>
                        )}

                        {/* SEATS TABLE */}
                        {r.seats?.length > 0 && (
                          <>
                            <h5 className="text-md font-semibold text-[#0A4D68] mb-2">
                              Selected Seats
                            </h5>
                            <div className="overflow-x-auto mb-6">
                              <table className="min-w-full border border-gray-200 bg-white rounded-md shadow-sm">
                                <thead className="bg-[#05BFDB]/20 text-[#0A4D68]">
                                  <tr>
                                    <th className="px-4 py-2 text-left text-sm font-semibold border-b border-gray-300">
                                      Seat No
                                    </th>
                                    <th className="px-4 py-2 text-left text-sm font-semibold border-b border-gray-300">
                                      Price
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {r.seats.map((s, idx) => (
                                    <tr
                                      key={idx}
                                      className="odd:bg-white even:bg-gray-50 border-b border-gray-300"
                                    >
                                      <td className="px-4 py-2 text-sm text-gray-700">
                                        {s.seatNo}
                                      </td>
                                      <td className="px-4 py-2 text-sm text-gray-700">
                                        ₹{s.price}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </>
                        )}

                        {/* MEALS TABLE */}
                        {r.meals?.length > 0 && (
                          <>
                            <h5 className="text-md font-semibold text-[#0A4D68] mb-2">
                              Meal Preferences
                            </h5>
                            <div className="overflow-x-auto mb-6">
                              <table className="min-w-full border border-gray-200 bg-white rounded-md shadow-sm">
                                <thead className="bg-[#05BFDB]/20 text-[#0A4D68]">
                                  <tr>
                                    <th className="px-4 py-2 text-left text-sm font-semibold border-b border-gray-300">
                                      Description
                                    </th>
                                    <th className="px-4 py-2 text-left text-sm font-semibold border-b border-gray-300">
                                      Price
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {r.meals.map((m, idx) => (
                                    <tr
                                      key={idx}
                                      className="odd:bg-white even:bg-gray-50 border-b border-gray-300"
                                    >
                                      <td className="px-4 py-2 text-sm text-gray-700">
                                        {m.description}
                                      </td>
                                      <td className="px-4 py-2 text-sm text-gray-700">
                                        ₹{m.price}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </>
                        )}

                        {/* EXTRA BAGGAGE TABLE */}
                        {r.extraBaggage?.length > 0 && (
                          <>
                            <h5 className="text-md font-semibold text-[#0A4D68] mb-2">
                              Extra Baggage
                            </h5>
                            <div className="overflow-x-auto mb-6">
                              <table className="min-w-full border border-gray-200 bg-white rounded-md shadow-sm">
                                <thead className="bg-[#05BFDB]/20 text-[#0A4D68]">
                                  <tr>
                                    <th className="px-4 py-2 text-left text-sm font-semibold border-b border-gray-300">
                                      Weight
                                    </th>
                                    <th className="px-4 py-2 text-left text-sm font-semibold border-b border-gray-300">
                                      Price
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {r.extraBaggage.map((b, idx) => (
                                    <tr
                                      key={idx}
                                      className="odd:bg-white even:bg-gray-50 border-b border-gray-300"
                                    >
                                      <td className="px-4 py-2 text-sm text-gray-700">
                                        {b.weight}
                                      </td>
                                      <td className="px-4 py-2 text-sm text-gray-700">
                                        ₹{b.price}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      /* CARD VIEW if no segments */
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        <Detail label="Airline" value={r.airline || "N/A"} />
                        <Detail label="Aircraft" value={r.aircraft || "N/A"} />
                        <Detail
                          label="Departure"
                          value={
                            r.departureDateTime
                              ? new Date(r.departureDateTime).toLocaleString()
                              : "N/A"
                          }
                        />
                        <Detail
                          label="Arrival"
                          value={
                            r.arrivalDateTime
                              ? new Date(r.arrivalDateTime).toLocaleString()
                              : "N/A"
                          }
                        />
                        <Detail
                          label="Duration"
                          value={`${r.durationMinutes} mins`}
                        />
                        <Detail
                          label="Fare"
                          value={
                            r.fare
                              ? `Base ₹${r.fare.baseFare}, Tax ₹${r.fare.tax}, Total ₹${r.pricing?.totalAmount}`
                              : "Fare not available"
                          }
                        />
                        <Detail
                          label="Refundable"
                          value={
                            r.fare ? (r.fare.refundable ? "Yes" : "No") : "N/A"
                          }
                        />
                      </div>
                    )}

                    {/* FOOTER */}
                    <div className="mt-5 flex justify-between items-center border-t border-gray-200 pt-3">
                      <div className="text-xs text-gray-500">
                        Booking Ref:{" "}
                        <span className="font-medium">{r.bookingRef}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ========== SMALL COMPONENTS ========== */
const Detail = ({ icon, label, value }) => (
  <div className="flex items-start gap-3 bg-white rounded-lg p-3 border border-gray-100 shadow-sm hover:shadow-md transition">
    {icon && <div className="text-blue-500 mt-0.5 text-lg">{icon}</div>}
    <div>
      <p className="text-sm font-semibold text-gray-700">{label}</p>
      <p className="text-gray-600 text-sm wrap-break-word">{value || "N/A"}</p>
    </div>
  </div>
);
