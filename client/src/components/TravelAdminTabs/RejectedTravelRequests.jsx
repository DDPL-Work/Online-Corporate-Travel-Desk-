import React, { useState } from "react";
import {
  FiXCircle,
  FiHome,
  FiUser,
  FiCalendar,
  FiDollarSign,
  FiFilter,
  FiDownload,
  FiEye
} from "react-icons/fi";
import { FaPlane } from "react-icons/fa";

import { rejectedRequestsData } from "../../data/dummyData";

const colors = {
  primary: "#0A4D68",
  secondary: "#088395",
  accent: "#05BFDB",
  light: "#F8FAFC",
  dark: "#1E293B",
  danger: "#EF4444"
};

export default function RejectedTravelRequests() {
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [selectedType, setSelectedType] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [startDate, setStartDate] = useState("2024-01-01");
  const [endDate, setEndDate] = useState("2024-12-31");

  // Unique filter values
  const departments = ["All", ...new Set(rejectedRequestsData.map(r => r.department))];
  const types = ["All", "Flight", "Hotel"];
  const statuses = ["All", "Rejected", "Cancelled"];

  // Filter logic
  const filteredRequests = rejectedRequestsData.filter(request => {
    const rejectedDate = new Date(request.rejectedDate);
    const start = new Date(startDate);
    const end = new Date(endDate);

    const dateMatch = rejectedDate >= start && rejectedDate <= end;
    const deptMatch = selectedDepartment === "All" || request.department === selectedDepartment;
    const typeMatch = selectedType === "All" || request.type === selectedType;
    const statusMatch = selectedStatus === "All" || request.status === selectedStatus;

    return dateMatch && deptMatch && typeMatch && statusMatch;
  });

  // Stats
  const totalRejected = filteredRequests.length;
  const totalCancelled = filteredRequests.filter(r => r.status === "Cancelled").length;
  const totalEstimatedCost = filteredRequests.reduce((sum, r) => sum + r.estimatedCost, 0);

  // View details
  const handleViewDetails = id => alert(`Viewing details for rejected request #${id}`);

  const handleExport = () => alert("Exporting rejected requests...");

  return (
    <div className="p-6" style={{ backgroundColor: colors.light }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2" style={{ color: colors.dark }}>
              Rejected Travel Requests
            </h1>
            <p className="text-gray-600">
              View all rejected or cancelled company travel requests
            </p>
          </div>

          <button
            onClick={handleExport}
            className="mt-4 md:mt-0 flex items-center gap-2 px-6 py-3 rounded-lg text-white font-medium"
            style={{ backgroundColor: colors.primary }}
          >
            <FiDownload size={18} />
            Export
          </button>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Total Rejected */}
          <div className="bg-white shadow-md rounded-lg p-6" style={{ borderTop: "4px solid #EF4444" }}>
            <div className="flex justify-between">
              <div>
                <p className="text-gray-600 mb-1">Total Rejected</p>
                <p className="text-3xl font-bold text-red-500">{totalRejected}</p>
              </div>
              <div className="p-3 bg-red-50 rounded-full">
                <FiXCircle size={24} className="text-red-500" />
              </div>
            </div>
          </div>

          {/* Cancelled */}
          <div className="bg-white shadow-md rounded-lg p-6" style={{ borderTop: `4px solid ${colors.secondary}` }}>
            <div className="flex justify-between">
              <div>
                <p className="text-gray-600 mb-1">Cancelled</p>
                <p className="text-3xl font-bold" style={{ color: colors.secondary }}>
                  {totalCancelled}
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-full">
                <FiCalendar size={24} style={{ color: colors.secondary }} />
              </div>
            </div>
          </div>

          {/* Estimated Cost */}
          <div className="bg-white shadow-md rounded-lg p-6" style={{ borderTop: `4px solid ${colors.accent}` }}>
            <div className="flex justify-between">
              <div>
                <p className="text-gray-600 mb-1">Estimated Cost</p>
                <p className="text-3xl font-bold" style={{ color: colors.accent }}>
                  ${totalEstimatedCost}
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-full">
                <FiDollarSign size={24} style={{ color: colors.accent }} />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <FiFilter size={20} className="text-[#0A4D68]" />
            <h2 className="text-lg font-semibold" style={{ color: colors.dark }}>
              Filters
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Date Range */}
            <div>
              <label className="text-sm font-medium block mb-2">Start Date</label>
              <input
                type="date"
                className="w-full border p-2 rounded"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">End Date</label>
              <input
                type="date"
                className="w-full border p-2 rounded"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>

            {/* Department */}
            <div>
              <label className="text-sm font-medium block mb-2">Department</label>
              <select
                className="w-full border p-2 rounded"
                value={selectedDepartment}
                onChange={e => setSelectedDepartment(e.target.value)}
              >
                {departments.map(dept => (
                  <option key={dept}>{dept}</option>
                ))}
              </select>
            </div>

            {/* Type */}
            <div>
              <label className="text-sm font-medium block mb-2">Type</label>
              <select
                className="w-full border p-2 rounded"
                value={selectedType}
                onChange={e => setSelectedType(e.target.value)}
              >
                {types.map(type => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="text-sm font-medium block mb-2">Request Status</label>
              <select
                className="w-full border p-2 rounded"
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
              >
                {statuses.map(s => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold" style={{ color: colors.dark }}>
              Rejected Requests
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ backgroundColor: colors.primary }}>
                <tr>
                  {[
                    "Request ID",
                    "Employee",
                    "Department",
                    "Type",
                    "Destination",
                    "Rejected On",
                    "Approved By",
                    "Est. Cost",
                    "Status",
                    "Actions"
                  ].map(head => (
                    <th key={head} className="px-6 py-3 text-left text-sm font-semibold text-white">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="px-6 py-8 text-center text-gray-500">
                      No rejected requests found
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map(request => (
                    <tr key={request.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm font-medium text-red-600">
                        #{request.id}
                      </td>

                      <td className="px-6 py-4 text-sm">{request.employee}</td>

                      <td className="px-6 py-4 text-sm">
                        <span className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-xs">
                          {request.department}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-sm">
                        <span className="flex items-center gap-2">
                          {request.type === "Flight" ? (
                            <FaPlane className="text-[#088395]" />
                          ) : (
                            <FiHome className="text-[#05BFDB]" />
                          )}
                          {request.type}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-sm">{request.destination}</td>

                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(request.rejectedDate).toLocaleDateString()}
                      </td>

                      <td className="px-6 py-4 text-sm">{request.approvedBy}</td>

                      <td className="px-6 py-4 text-sm font-semibold text-[#088395]">
                        ${request.estimatedCost}
                      </td>

                      <td className="px-6 py-4 text-sm">
                        <span className="px-3 py-1 rounded-full text-xs font-medium text-white"
                          style={{
                            backgroundColor:
                              request.status === "Rejected"
                                ? "#EF4444"
                                : "#F59E0B"
                          }}
                        >
                          {request.status}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={() => handleViewDetails(request.id)}
                          className="flex items-center gap-1 px-3 py-2 rounded-md bg-gray-100 text-[var(--primary)] hover:opacity-80"
                        >
                          <FiEye size={16} />
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
