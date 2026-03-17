import React, { useState } from "react";
import { FiFilter, FiEye, FiDownload } from "react-icons/fi";
import { FaPlane, FaHotel, FaClock, FaCheckCircle } from "react-icons/fa";
import { bookingsSummary } from "../../data/dummyData";

const colors = {
  primary: "#0A4D68",
  secondary: "#088395",
  accent: "#05BFDB",
  light: "#F8FAFC",
  dark: "#1E293B",
};

export default function BookingsSummary() {
  const [startDate, setStartDate] = useState("2024-01-01");
  const [endDate, setEndDate] = useState("2024-12-31");
  const [department, setDepartment] = useState("All");
  const [type, setType] = useState("All");

  const departments = ["All", ...new Set(bookingsSummary.map((b) => b.department))];
  const types = ["All", "Flight", "Hotel"];

  // FILTERED BOOKING DATA
  const filtered = bookingsSummary.filter((b) => {
    const d = new Date(b.date);
    const start = new Date(startDate);
    const end = new Date(endDate);

    const dateMatch = d >= start && d <= end;
    const deptMatch = department === "All" || b.department === department;
    const typeMatch = type === "All" || b.type === type;

    return dateMatch && deptMatch && typeMatch;
  });

  // SUMMARY COUNTS
  const totalBookings = filtered.length;
  const totalFlights = filtered.filter((b) => b.type === "Flight").length;
  const totalHotels = filtered.filter((b) => b.type === "Hotel").length;
  const totalPending = filtered.filter((b) => b.status === "Pending").length;
  const totalCompleted = filtered.filter((b) => b.status === "Completed").length;

  return (
    <div className="p-6" style={{ backgroundColor: colors.light }}>
      <div className="max-w-6xl mx-auto">

        {/* PAGE HEADER */}
        <h1 className="text-3xl font-bold mb-6" style={{ color: colors.dark }}>
          Bookings Summary
        </h1>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">

          {/* Total Bookings */}
          <SummaryCard
            title="Total Bookings"
            count={totalBookings}
            color={colors.primary}
            icon={<FaCheckCircle size={26} />}
          />

          {/* Flights */}
          <SummaryCard
            title="Flight Bookings"
            count={totalFlights}
            color={colors.secondary}
            icon={<FaPlane size={26} />}
          />

          {/* Hotels */}
          <SummaryCard
            title="Hotel Bookings"
            count={totalHotels}
            color={colors.accent}
            icon={<FaHotel size={26} />}
          />

          {/* Pending */}
          <SummaryCard
            title="Pending"
            count={totalPending}
            color="#F59E0B"
            icon={<FaClock size={26} />}
          />

          {/* Completed */}
          <SummaryCard
            title="Completed"
            count={totalCompleted}
            color="#10B981"
            icon={<FaCheckCircle size={26} />}
          />

        </div>

        {/* FILTERS */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <FiFilter className="text-[#0A4D68]" size={22} />
            <h2 className="text-lg font-semibold">Filters</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {/* Start Date */}
            <div>
              <label className="text-sm font-medium">Start Date</label>
              <input
                type="date"
                className="border p-2 rounded w-full mt-1"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            {/* End Date */}
            <div>
              <label className="text-sm font-medium">End Date</label>
              <input
                type="date"
                className="border p-2 rounded w-full mt-1"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            {/* Department */}
            <div>
              <label className="text-sm font-medium">Department</label>
              <select
                className="border p-2 rounded w-full mt-1"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              >
                {departments.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Type */}
            <div>
              <label className="text-sm font-medium">Booking Type</label>
              <select
                className="border p-2 rounded w-full mt-1"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                {types.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>

          </div>
        </div>

        {/* TABLE */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-6 border-b flex justify-between">
            <h2 className="text-xl font-semibold">Booking Details</h2>

            <button
              className="px-4 py-2 rounded text-white flex items-center gap-2"
              style={{ backgroundColor: colors.primary }}
            >
              <FiDownload /> Export
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead style={{ backgroundColor: colors.primary }}>
                <tr>
                  {["Booking ID", "Employee", "Type", "Department", "Date", "Destination", "Status", "Actions"].map((h) => (
                    <th key={h} className="px-6 py-3 text-sm text-white font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-8 text-gray-500">
                      No bookings found
                    </td>
                  </tr>
                ) : (
                  filtered.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50">

                      <td className="px-6 py-4 text-sm font-semibold text-[#0A4D68]">
                        #{b.id}
                      </td>

                      <td className="px-6 py-4 text-sm">{b.employee}</td>

                      <td className="px-6 py-4 text-sm flex items-center gap-2">
                        {b.type === "Flight" ? (
                          <FaPlane className="text-[#088395]" />
                        ) : (
                          <FaHotel className="text-[#05BFDB]" />
                        )}
                        {b.type}
                      </td>

                      <td className="px-6 py-4 text-sm">{b.department}</td>

                      <td className="px-6 py-4 text-sm">{b.date}</td>

                      <td className="px-6 py-4 text-sm">{b.destination}</td>

                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-3 py-1 text-xs rounded-full font-medium ${
                            b.status === "Completed"
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <button className="flex items-center gap-1 px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 text-[#0A4D68]">
                          <FiEye /> View
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


// COMPONENT FOR SUMMARY CARDS
function SummaryCard({ title, count, color, icon }) {
  return (
    <div className="bg-white shadow rounded-lg p-4 flex items-center justify-between border-l-4"
      style={{ borderColor: color }}>
      
      <div>
        <p className="text-sm text-gray-600">{title}</p>
        <h3 className="text-3xl font-bold mt-1" style={{ color }}>
          {count}
        </h3>
      </div>

      <div className="p-3 rounded-full bg-[#F8FAFC]">{icon}</div>
    </div>
  );
}
