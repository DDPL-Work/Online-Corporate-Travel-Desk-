import React, { useState, useMemo } from "react";
import {
  FiChevronDown,
  FiChevronUp,
  FiDownload,
  FiFilter,
  FiDollarSign,
  FiCheckCircle,
  FiCalendar,
  FiMapPin,
  FiUser,
  FiHome,
} from "react-icons/fi";
import { FaPlane } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchApprovals,
  selectApprovals,
  selectApprovalLoading,
  selectApprovalPagination,
} from "../../Redux/Actions/approval.thunks";

const colors = {
  primary: "#0A4D68",
  secondary: "#088395",
  accent: "#05BFDB",
  light: "#F8FAFC",
  dark: "#1E293B",
};

export default function ApprovedTravelRequests() {
  const [expanded, setExpanded] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [selectedType, setSelectedType] = useState("All");
  const [selectedBookingStatus, setSelectedBookingStatus] = useState("All");

  const dispatch = useDispatch();
  const approvals = useSelector(selectApprovals);
  const loading = useSelector(selectApprovalLoading);
  const pagination = useSelector(selectApprovalPagination);

  React.useEffect(() => {
    dispatch(fetchApprovals({ status: "approved" }));
  }, [dispatch]);

  const normalizedRequests = useMemo(() => {
    return approvals.map((a) => ({
      id: a._id,
      employee: a.requesterId
        ? `${a.requesterId.firstName} ${a.requesterId.lastName}`
        : "Employee",
      department: a.requesterId?.department || "N/A",
      type: a.bookingSnapshot?.bookingType === "flight" ? "Flight" : "Hotel",
      destination:
        a.bookingSnapshot?.sectors?.length > 0
          ? a.bookingSnapshot.sectors.join(", ")
          : "N/A",
      departureDate: a.bookingSnapshot?.travelDate,
      returnDate: a.bookingSnapshot?.returnDate,
      approvedBy: a.approverId
        ? `${a.approverId.firstName} ${a.approverId.lastName}`
        : "Admin",
      approvedDate: a.approvedAt,
      estimatedCost: a.bookingSnapshot?.amount || 0,
      bookingStatus: "Booked",
    }));
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

  return (
    <div
      className="min-h-full p-4 lg:p-6"
      style={{ backgroundColor: colors.light }}
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: colors.dark }}>
              Approved Travel Requests
            </h1>
            <p className="text-gray-600 text-sm">
              View and manage approved travel requests
            </p>
          </div>
          <button
            onClick={() => alert("Exporting CSV...")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium hover:opacity-90 transition-all"
            style={{ backgroundColor: colors.primary }}
          >
            <FiDownload /> Export Report
          </button>
        </div>

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
                )
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
          <div className="space-y-4">
            {filteredRequests.map((r) => {
              const isExpanded = expanded === r.id;
              return (
                <div
                  key={r.id}
                  className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200"
                >
                  {/* Header */}
                  <div
                    className="flex justify-between items-center px-5 py-4 cursor-pointer bg-gradient-to-r from-white to-[#05BFDB]/10 hover:to-[#05BFDB]/20 transition-all"
                    onClick={() => setExpanded(isExpanded ? null : r.id)}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium ${
                          r.type === "Flight"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-orange-50 text-orange-700 border border-orange-200"
                        }`}
                      >
                        {r.type === "Flight" ? <FaPlane /> : <FiHome />}
                        {r.type}
                      </span>
                      <span className="text-gray-800 font-medium flex items-center gap-2">
                        <FiMapPin className="text-gray-500" /> {r.destination}
                      </span>
                      <span className="hidden sm:flex items-center gap-2 text-gray-600 text-sm">
                        <FiCalendar />{" "}
                        {new Date(r.departureDate).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[#0A4D68] font-semibold flex items-center gap-1">
                        <FiDollarSign />
                        {r.estimatedCost.toLocaleString()}
                      </span>
                      {isExpanded ? (
                        <FiChevronUp className="text-xl text-gray-500" />
                      ) : (
                        <FiChevronDown className="text-xl text-gray-500" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Section */}
                  {isExpanded && (
                    <div className="px-6 py-4 border-t border-gray-200 bg-slate-50">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Employee</p>
                          <p className="font-medium text-gray-800 flex items-center gap-1">
                            <FiUser /> {r.employee}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Department</p>
                          <p className="font-medium text-gray-800">
                            {r.department}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Approved By</p>
                          <p className="font-medium text-gray-800">
                            {r.approvedBy}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Approved Date</p>
                          <p className="font-medium text-gray-800">
                            {new Date(r.approvedDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${
                            r.bookingStatus === "Booked"
                              ? "bg-green-600"
                              : "bg-yellow-500"
                          }`}
                        >
                          {r.bookingStatus}
                        </span>

                        <button
                          onClick={() => alert(`View details for ${r.id}`)}
                          className="px-4 py-2 bg-[#0A4D68] text-white rounded-md hover:bg-[#093f54] transition text-sm flex items-center gap-2"
                        >
                          <FiCheckCircle /> View Details
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
