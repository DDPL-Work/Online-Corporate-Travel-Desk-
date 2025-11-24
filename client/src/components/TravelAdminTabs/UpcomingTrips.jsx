import React, { useState } from "react";
import { FiCalendar, FiFilter, FiEye, FiMapPin, FiUser } from "react-icons/fi";
import { FaPlane } from "react-icons/fa";
import { upcomingTripsData } from "../../data/dummyData";

const colors = {
  primary: "#0A4D68",
  secondary: "#088395",
  accent: "#05BFDB",
  light: "#F8FAFC",
  dark: "#1E293B",
};

export default function UpcomingTrips() {
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [selectedType, setSelectedType] = useState("All");
  const [startDate, setStartDate] = useState("2024-01-01");
  const [endDate, setEndDate] = useState("2024-12-31");

  const departments = [
    "All",
    ...new Set(upcomingTripsData.map((t) => t.department)),
  ];
  const types = ["All", "Flight", "Hotel"];

  // Filter trips based on selected criteria
  const filteredTrips = upcomingTripsData.filter((trip) => {
    const depDate = new Date(trip.departureDate);
    const start = new Date(startDate);
    const end = new Date(endDate);

    const dateMatch = depDate >= start && depDate <= end;
    const deptMatch =
      selectedDepartment === "All" || trip.department === selectedDepartment;
    const typeMatch = selectedType === "All" || trip.type === selectedType;

    return dateMatch && deptMatch && typeMatch;
  });

  const totalTrips = filteredTrips.length;
  const totalFlight = filteredTrips.filter((t) => t.type === "Flight").length;
  const totalHotel = filteredTrips.filter((t) => t.type === "Hotel").length;

  return (
    <div className="p-6" style={{ backgroundColor: colors.light }}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1
            className="text-3xl font-bold mb-2"
            style={{ color: colors.dark }}
          >
            Upcoming Trips
          </h1>
          <p className="text-gray-600">
            Review all upcoming business travel plans
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Total Trips */}
          <div
            className="bg-white rounded-lg shadow p-6"
            style={{ borderTop: "4px solid #0A4D68" }}
          >
            <p className="text-gray-500 mb-1">Total Trips</p>
            <p className="text-3xl font-bold" style={{ color: colors.primary }}>
              {totalTrips}
            </p>
          </div>

          {/* Flight Trips */}
          <div
            className="bg-white rounded-lg shadow p-6"
            style={{ borderTop: "4px solid #088395" }}
          >
            <p className="text-gray-500 mb-1">Flight Trips</p>
            <p
              className="text-3xl font-bold"
              style={{ color: colors.secondary }}
            >
              {totalFlight}
            </p>
          </div>

          {/* Hotel Trips */}
          <div
            className="bg-white rounded-lg shadow p-6"
            style={{ borderTop: "4px solid #05BFDB" }}
          >
            <p className="text-gray-500 mb-1">Hotel Trips</p>
            <p className="text-3xl font-bold" style={{ color: colors.accent }}>
              {totalHotel}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <FiFilter size={20} className="text-[#0A4D68]" />
            <h2 className="text-lg font-semibold">Filters</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Start Date */}
            <div>
              <label className="text-sm font-medium block mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border p-2 rounded"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="text-sm font-medium block mb-2">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border p-2 rounded"
              />
            </div>

            {/* Department */}
            <div>
              <label className="text-sm font-medium block mb-2">
                Department
              </label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full border p-2 rounded"
              >
                {departments.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Type */}
            <div>
              <label className="text-sm font-medium block mb-2">Type</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full border p-2 rounded"
              >
                {types.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Trips Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b">
            <h2
              className="text-xl font-semibold"
              style={{ color: colors.dark }}
            >
              Upcoming Trip List
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ backgroundColor: colors.primary }}>
                <tr>
                  {[
                    "Trip ID",
                    "Employee",
                    "Department",
                    "Type",
                    "Destination",
                    "Travel Dates",
                    "Actions",
                  ].map((head) => (
                    <th
                      key={head}
                      className="px-6 py-3 text-left text-white text-sm font-semibold"
                    >
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {filteredTrips.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-8 text-gray-500">
                      No upcoming trips found
                    </td>
                  </tr>
                ) : (
                  filteredTrips.map((trip) => (
                    <tr key={trip.id} className="hover:bg-gray-50 transition">
                      <td
                        className="px-6 py-4 text-sm font-medium"
                        style={{ color: colors.primary }}
                      >
                        #{trip.id}
                      </td>

                      <td className="px-6 py-4 text-sm flex items-center gap-2">
                        <FiUser /> {trip.employee}
                      </td>

                      <td className="px-6 py-4 text-sm">
                        <span
                          className="px-3 py-1 text-xs rounded-full bg-blue-50"
                          style={{ color: colors.primary }}
                        >
                          {trip.department}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-sm flex items-center gap-2">
                        {trip.type === "Flight" ? (
                          <FaPlane className="text-[#088395]" />
                        ) : (
                          <FiMapPin className="text-[#05BFDB]" />
                        )}
                        {trip.type}
                      </td>

                      <td className="px-6 py-4 text-sm">{trip.destination}</td>

                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(trip.departureDate).toLocaleDateString()} -{" "}
                        {new Date(trip.returnDate).toLocaleDateString()}
                      </td>

                      <td className="px-6 py-4 text-sm">
                        <button className="flex items-center gap-1 px-3 py-2 rounded bg-gray-100 text-[#0A4D68] hover:opacity-80">
                          <FiEye size={16} /> View
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
