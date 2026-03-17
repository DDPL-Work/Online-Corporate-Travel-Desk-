import React, { useState } from "react";
import {
  FiCalendar,
  FiUsers,
  FiUser,
  FiFilter,
  FiTrendingUp,
  FiHome,
} from "react-icons/fi";
import { FaPlane } from "react-icons/fa";
import { bookingsData } from "../../data/dummyData";
import { useNavigate } from "react-router-dom";

const colors = {
  primary: "#0A4D68",
  secondary: "#088395",
  accent: "#05BFDB",
  light: "#F8FAFC",
  dark: "#1E293B",
};

/**
 * Helper to safely render employee name
 */
const getEmployeeName = (employee) => {
  if (!employee) return "-";

  if (typeof employee === "string") return employee;

  if (typeof employee === "object") {
    return `${employee.firstName || ""} ${employee.lastName || ""}`.trim();
  }

  return "-";
};

export default function BookingsDashboard() {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState("2024-01-01");
  const [endDate, setEndDate] = useState("2024-12-31");
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [selectedEmployee, setSelectedEmployee] = useState("All");

  // Unique departments
  const departments = [
    "All",
    ...new Set(bookingsData.map((b) => b.department)),
  ];

  // Unique employees (stringified for dropdown safety)
  const employees = [
    "All",
    ...new Set(
      bookingsData.map((b) =>
        typeof b.employee === "string"
          ? b.employee
          : `${b.employee.firstName} ${b.employee.lastName}`,
      ),
    ),
  ];

  // Filter bookings
  const filteredBookings = bookingsData.filter((booking) => {
    const bookingDate = new Date(booking.date);
    const start = new Date(startDate);
    const end = new Date(endDate);

    const dateMatch = bookingDate >= start && bookingDate <= end;
    const deptMatch =
      selectedDepartment === "All" || booking.department === selectedDepartment;

    const empName = getEmployeeName(booking.employee);
    const empMatch = selectedEmployee === "All" || empName === selectedEmployee;

    return dateMatch && deptMatch && empMatch;
  });

  // Stats
  const totalBookings = filteredBookings.length;
  const totalAmount = filteredBookings.reduce(
    (sum, b) => sum + (b.amount || 0),
    0,
  );
  const flightBookings = filteredBookings.filter(
    (b) => b.type === "Flight",
  ).length;
  const hotelBookings = filteredBookings.filter(
    (b) => b.type === "Hotel",
  ).length;

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: colors.light }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between ">
          <div className="mb-8">
            <h1
              className="text-3xl font-bold mb-2"
              style={{ color: colors.dark }}
            >
              Travel Bookings Dashboard
            </h1>
            <p className="text-gray-600">
              Track and manage flight and hotel bookings
            </p>
          </div>
          {/* <div>
            <button
              onClick={() => navigate("/search-flight")}
              className="bg-[#035966] text-white px-4 py-2 rounded-xl hover:bg-[#044652]"
            >
              Make Booking
            </button>
          </div> */}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <FiFilter size={20} style={{ color: colors.primary }} />
            <h2
              className="text-lg font-semibold"
              style={{ color: colors.dark }}
            >
              Filters
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium mb-2">
                <FiCalendar className="inline mr-2" />
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium mb-2">
                <FiCalendar className="inline mr-2" />
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>

            {/* Department */}
            <div>
              <label className="block text-sm font-medium mb-2">
                <FiUsers className="inline mr-2" />
                Department
              </label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              >
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            {/* Employee */}
            <div>
              <label className="block text-sm font-medium mb-2">
                <FiUser className="inline mr-2" />
                Employee
              </label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              >
                {employees.map((emp) => (
                  <option key={emp} value={emp}>
                    {emp}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <StatCard
            title="Total Bookings"
            value={totalBookings}
            icon={<FiTrendingUp />}
            color={colors.primary}
          />
          <StatCard
            title="Flight Bookings"
            value={flightBookings}
            icon={<FaPlane />}
            color={colors.secondary}
          />
          <StatCard
            title="Hotel Bookings"
            value={hotelBookings}
            icon={<FiHome />}
            color={colors.accent}
          />
          <StatCard
            title="Total Amount"
            value={`₹${totalAmount}`}
            icon={<span>💰</span>}
            color={colors.dark}
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Booking Details</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ backgroundColor: colors.primary }}>
                <tr>
                  {[
                    "Date",
                    "Type",
                    "Destination",
                    "Employee",
                    "Department",
                    "Amount",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-3 text-left text-white text-sm"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y">
                {filteredBookings.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      No bookings found
                    </td>
                  </tr>
                ) : (
                  filteredBookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        {new Date(booking.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 flex items-center gap-2">
                        {booking.type === "Flight" ? (
                          <FaPlane style={{ color: colors.secondary }} />
                        ) : (
                          <FiHome style={{ color: colors.accent }} />
                        )}
                        {booking.type}
                      </td>
                      <td className="px-6 py-4">{booking.destination}</td>
                      <td className="px-6 py-4">
                        {getEmployeeName(booking.employee)}
                      </td>
                      <td className="px-6 py-4">{booking.department}</td>
                      <td className="px-6 py-4 font-semibold">
                        ₹{booking.amount}
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

/**
 * Reusable Stat Card
 */
const StatCard = ({ title, value, icon, color }) => (
  <div
    className="bg-white rounded-lg shadow-md p-6"
    style={{ borderTop: `4px solid ${color}` }}
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-gray-600 text-sm mb-1">{title}</p>
        <p className="text-3xl font-bold" style={{ color }}>
          {value}
        </p>
      </div>
      <div className="p-3 rounded-full bg-gray-100">{icon}</div>
    </div>
  </div>
);
