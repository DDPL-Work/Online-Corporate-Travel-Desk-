import React, { useState } from 'react';
import { FiCalendar, FiUsers, FiUser, FiFilter, FiTrendingUp, FiHome } from 'react-icons/fi';
import {bookingsData} from '../../data/dummyData';
import { FaPlane } from 'react-icons/fa';

const colors = {
  primary: '#0A4D68',
  secondary: '#088395',
  accent: '#05BFDB',
  light: '#F8FAFC',
  dark: '#1E293B'
};



export default function BookingsDashboard() {
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState('2024-12-31');
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [selectedEmployee, setSelectedEmployee] = useState('All');

  // Get unique departments and employees
  const departments = ['All', ...new Set(bookingsData.map(b => b.department))];
  const employees = ['All', ...new Set(bookingsData.map(b => b.employee))];

  // Filter bookings based on selected filters
  const filteredBookings = bookingsData.filter(booking => {
    const bookingDate = new Date(booking.date);
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const dateMatch = bookingDate >= start && bookingDate <= end;
    const deptMatch = selectedDepartment === 'All' || booking.department === selectedDepartment;
    const empMatch = selectedEmployee === 'All' || booking.employee === selectedEmployee;
    
    return dateMatch && deptMatch && empMatch;
  });

  // Calculate statistics
  const totalBookings = filteredBookings.length;
  const totalAmount = filteredBookings.reduce((sum, b) => sum + b.amount, 0);
  const flightBookings = filteredBookings.filter(b => b.type === 'Flight').length;
  const hotelBookings = filteredBookings.filter(b => b.type === 'Hotel').length;

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: colors.light }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: colors.dark }}>
            Travel Bookings Dashboard
          </h1>
          <p className="text-gray-600">Track and manage flight and hotel bookings</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <FiFilter style={{ color: colors.primary }} size={20} />
            <h2 className="text-lg font-semibold" style={{ color: colors.dark }}>Filters</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: colors.dark }}>
                <FiCalendar className="inline mr-2" />
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2"
                style={{ focusRingColor: colors.accent }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: colors.dark }}>
                <FiCalendar className="inline mr-2" />
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2"
                style={{ focusRingColor: colors.accent }}
              />
            </div>

            {/* Department Filter */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: colors.dark }}>
                <FiUsers className="inline mr-2" />
                Department
              </label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2"
                style={{ focusRingColor: colors.accent }}
              >
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            {/* Employee Filter */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: colors.dark }}>
                <FiUser className="inline mr-2" />
                Employee
              </label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2"
                style={{ focusRingColor: colors.accent }}
              >
                {employees.map(emp => (
                  <option key={emp} value={emp}>{emp}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* Total Bookings */}
          <div className="bg-white rounded-lg shadow-md p-6" style={{ borderTop: `4px solid ${colors.primary}` }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Total Bookings</p>
                <p className="text-3xl font-bold" style={{ color: colors.primary }}>{totalBookings}</p>
              </div>
              <div className="p-3 rounded-full" style={{ backgroundColor: colors.light }}>
                <FiTrendingUp size={24} style={{ color: colors.primary }} />
              </div>
            </div>
          </div>

          {/* Flight Bookings */}
          <div className="bg-white rounded-lg shadow-md p-6" style={{ borderTop: `4px solid ${colors.secondary}` }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Flight Bookings</p>
                <p className="text-3xl font-bold" style={{ color: colors.secondary }}>{flightBookings}</p>
              </div>
              <div className="p-3 rounded-full" style={{ backgroundColor: colors.light }}>
                <FaPlane size={24} style={{ color: colors.secondary }} />
              </div>
            </div>
          </div>

          {/* Hotel Bookings */}
          <div className="bg-white rounded-lg shadow-md p-6" style={{ borderTop: `4px solid ${colors.accent}` }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Hotel Bookings</p>
                <p className="text-3xl font-bold" style={{ color: colors.accent }}>{hotelBookings}</p>
              </div>
              <div className="p-3 rounded-full" style={{ backgroundColor: colors.light }}>
                <FiHome size={24} style={{ color: colors.accent }} />
              </div>
            </div>
          </div>

          {/* Total Amount */}
          <div className="bg-white rounded-lg shadow-md p-6" style={{ borderTop: `4px solid ${colors.dark}` }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Total Amount</p>
                <p className="text-3xl font-bold" style={{ color: colors.dark }}>${totalAmount}</p>
              </div>
              <div className="p-3 rounded-full" style={{ backgroundColor: colors.light }}>
                <span className="text-2xl">💰</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bookings Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b" style={{ borderColor: colors.light }}>
            <h2 className="text-xl font-semibold" style={{ color: colors.dark }}>Booking Details</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ backgroundColor: colors.primary }}>
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-white">Date</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-white">Type</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-white">Destination</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-white">Employee</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-white">Department</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-white">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                      No bookings found matching your filters
                    </td>
                  </tr>
                ) : (
                  filteredBookings.map((booking, index) => (
                    <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm" style={{ color: colors.dark }}>
                        {new Date(booking.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="flex items-center gap-2">
                          {booking.type === 'Flight' ? (
                            <FaPlane style={{ color: colors.secondary }} />
                          ) : (
                            <FiHome style={{ color: colors.accent }} />
                          )}
                          <span style={{ color: colors.dark }}>{booking.type}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm" style={{ color: colors.dark }}>
                        {booking.destination}
                      </td>
                      <td className="px-6 py-4 text-sm" style={{ color: colors.dark }}>
                        {booking.employee}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span 
                          className="px-3 py-1 rounded-full text-xs font-medium"
                          style={{ 
                            backgroundColor: colors.light,
                            color: colors.primary
                          }}
                        >
                          {booking.department}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold" style={{ color: colors.secondary }}>
                        ${booking.amount}
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