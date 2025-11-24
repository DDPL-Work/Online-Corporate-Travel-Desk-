import React, { useState, useMemo } from 'react';
import { FiCheckCircle, FiHome, FiUser, FiCalendar, FiDollarSign, FiFilter, FiDownload, FiEye, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { approvedRequestsData } from '../../data/dummyData';
import { FaPlane } from 'react-icons/fa';

const colors = {
  primary: '#0A4D68',
  secondary: '#088395',
  accent: '#05BFDB',
  light: '#F8FAFC',
  dark: '#1E293B'
};

export default function ApprovedTravelRequests() {
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedBookingStatus, setSelectedBookingStatus] = useState('All');
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState('2024-12-31');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Get unique values for filters
  const departments = ['All', ...new Set(approvedRequestsData.map(r => r.department))];
  const types = ['All', 'Flight', 'Hotel'];
  const bookingStatuses = ['All', 'Booked', 'Pending Booking'];

  // Filter requests
  const filteredRequests = useMemo(() => {
    return approvedRequestsData.filter(request => {
      const approvedDate = new Date(request.approvedDate);
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      const dateMatch = approvedDate >= start && approvedDate <= end;
      const deptMatch = selectedDepartment === 'All' || request.department === selectedDepartment;
      const typeMatch = selectedType === 'All' || request.type === selectedType;
      const bookingMatch = selectedBookingStatus === 'All' || request.bookingStatus === selectedBookingStatus;
      
      return dateMatch && deptMatch && typeMatch && bookingMatch;
    });
  }, [selectedDepartment, selectedType, selectedBookingStatus, startDate, endDate]);

  // Pagination logic
  const totalItems = filteredRequests.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRequests = filteredRequests.slice(startIndex, startIndex + itemsPerPage);

  // Calculate statistics
  const totalApproved = filteredRequests.length;
  const totalBooked = filteredRequests.filter(r => r.bookingStatus === 'Booked').length;
  const totalEstimatedCost = filteredRequests.reduce((sum, r) => sum + r.estimatedCost, 0);
  const totalActualCost = filteredRequests.reduce((sum, r) => sum + r.actualCost, 0);

  // Handle view details
  const handleViewDetails = (id) => {
    alert(`Viewing details for request #${id}`);
  };

  // Handle export
  const handleExport = () => {
    alert('Exporting approved requests to CSV...');
  };

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Handle items per page change
  const handleItemsPerPageChange = (value) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1); // Reset to first page
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const startPage = Math.max(1, currentPage - 2);
      const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  };

  return (
    <div className="min-h-full p-4 lg:p-6" style={{ backgroundColor: colors.light }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 lg:mb-8">
          <div className="mb-4 md:mb-0">
            <h1 className="text-2xl lg:text-3xl font-bold mb-2" style={{ color: colors.dark }}>
              Approved Travel Requests
            </h1>
            <p className="text-gray-600 text-sm lg:text-base">View and manage approved travel requests</p>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 lg:px-6 lg:py-3 rounded-lg text-white font-medium transition-all hover:opacity-90 w-full md:w-auto justify-center"
            style={{ backgroundColor: colors.primary }}
          >
            <FiDownload size={18} />
            <span className="text-sm lg:text-base">Export Report</span>
          </button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6">
          {/* Total Approved */}
          <div className="bg-white rounded-lg shadow-md p-4 lg:p-6" style={{ borderTop: `4px solid #10B981` }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs lg:text-sm mb-1">Total Approved</p>
                <p className="text-2xl lg:text-3xl font-bold" style={{ color: '#10B981' }}>{totalApproved}</p>
              </div>
              <div className="p-2 lg:p-3 rounded-full" style={{ backgroundColor: colors.light }}>
                <FiCheckCircle size={20} className="lg:w-6 lg:h-6" style={{ color: '#10B981' }} />
              </div>
            </div>
          </div>

          {/* Booked */}
          <div className="bg-white rounded-lg shadow-md p-4 lg:p-6" style={{ borderTop: `4px solid ${colors.secondary}` }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs lg:text-sm mb-1">Booked</p>
                <p className="text-2xl lg:text-3xl font-bold" style={{ color: colors.secondary }}>{totalBooked}</p>
              </div>
              <div className="p-2 lg:p-3 rounded-full" style={{ backgroundColor: colors.light }}>
                <FaPlane size={20} className="lg:w-6 lg:h-6" style={{ color: colors.secondary }} />
              </div>
            </div>
          </div>

          {/* Estimated Cost */}
          <div className="bg-white rounded-lg shadow-md p-4 lg:p-6" style={{ borderTop: `4px solid ${colors.accent}` }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs lg:text-sm mb-1">Estimated Cost</p>
                <p className="text-2xl lg:text-3xl font-bold" style={{ color: colors.accent }}>
                  ${totalEstimatedCost.toLocaleString()}
                </p>
              </div>
              <div className="p-2 lg:p-3 rounded-full" style={{ backgroundColor: colors.light }}>
                <FiDollarSign size={20} className="lg:w-6 lg:h-6" style={{ color: colors.accent }} />
              </div>
            </div>
          </div>

          {/* Actual Cost */}
          <div className="bg-white rounded-lg shadow-md p-4 lg:p-6" style={{ borderTop: `4px solid ${colors.primary}` }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs lg:text-sm mb-1">Actual Cost</p>
                <p className="text-2xl lg:text-3xl font-bold" style={{ color: colors.primary }}>
                  ${totalActualCost.toLocaleString()}
                </p>
              </div>
              <div className="p-2 lg:p-3 rounded-full" style={{ backgroundColor: colors.light }}>
                <span className="text-xl lg:text-2xl">💰</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-4 lg:p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <FiFilter style={{ color: colors.primary }} size={18} className="lg:w-5 lg:h-5" />
            <h2 className="text-base lg:text-lg font-semibold" style={{ color: colors.dark }}>Filters</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 lg:gap-4">
            {/* Date Range */}
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-xs lg:text-sm font-medium mb-1 lg:mb-2" style={{ color: colors.dark }}>
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2 lg:px-3 py-1 lg:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 text-sm lg:text-base"
                style={{ focusBorderColor: colors.primary }}
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-xs lg:text-sm font-medium mb-1 lg:mb-2" style={{ color: colors.dark }}>
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-2 lg:px-3 py-1 lg:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 text-sm lg:text-base"
                style={{ focusBorderColor: colors.primary }}
              />
            </div>

            {/* Department Filter */}
            <div>
              <label className="block text-xs lg:text-sm font-medium mb-1 lg:mb-2" style={{ color: colors.dark }}>
                Department
              </label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full px-2 lg:px-3 py-1 lg:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 text-sm lg:text-base"
                style={{ focusBorderColor: colors.primary }}
              >
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-xs lg:text-sm font-medium mb-1 lg:mb-2" style={{ color: colors.dark }}>
                Type
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-2 lg:px-3 py-1 lg:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 text-sm lg:text-base"
                style={{ focusBorderColor: colors.primary }}
              >
                {types.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Booking Status Filter */}
            <div>
              <label className="block text-xs lg:text-sm font-medium mb-1 lg:mb-2" style={{ color: colors.dark }}>
                Booking Status
              </label>
              <select
                value={selectedBookingStatus}
                onChange={(e) => setSelectedBookingStatus(e.target.value)}
                className="w-full px-2 lg:px-3 py-1 lg:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 text-sm lg:text-base"
                style={{ focusBorderColor: colors.primary }}
              >
                {bookingStatuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results and Pagination Controls - Top */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, totalItems)} of {totalItems} results
          </div>
          
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600 whitespace-nowrap">http://localhost:5173/credit-utilization
              Rows per page:
            </label>
            <select
              value={itemsPerPage}
              onChange={(e) => handleItemsPerPageChange(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1"
              style={{ focusBorderColor: colors.primary }}
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </div>
        </div>

        {/* Requests Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
          <div className="p-4 lg:p-6 border-b" style={{ borderColor: colors.light }}>
            <h2 className="text-lg lg:text-xl font-semibold" style={{ color: colors.dark }}>Approved Requests</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead style={{ backgroundColor: colors.primary }}>
                <tr>
                  <th className="px-3 lg:px-6 py-2 lg:py-3 text-left text-xs lg:text-sm font-semibold text-white">Request ID</th>
                  <th className="px-3 lg:px-6 py-2 lg:py-3 text-left text-xs lg:text-sm font-semibold text-white">Employee</th>
                  <th className="px-3 lg:px-6 py-2 lg:py-3 text-left text-xs lg:text-sm font-semibold text-white">Department</th>
                  <th className="px-3 lg:px-6 py-2 lg:py-3 text-left text-xs lg:text-sm font-semibold text-white">Type</th>
                  <th className="px-3 lg:px-6 py-2 lg:py-3 text-left text-xs lg:text-sm font-semibold text-white">Destination</th>
                  <th className="px-3 lg:px-6 py-2 lg:py-3 text-left text-xs lg:text-sm font-semibold text-white">Travel Dates</th>
                  <th className="px-3 lg:px-6 py-2 lg:py-3 text-left text-xs lg:text-sm font-semibold text-white">Approved By</th>
                  <th className="px-3 lg:px-6 py-2 lg:py-3 text-left text-xs lg:text-sm font-semibold text-white">Cost</th>
                  <th className="px-3 lg:px-6 py-2 lg:py-3 text-left text-xs lg:text-sm font-semibold text-white">Status</th>
                  <th className="px-3 lg:px-6 py-2 lg:py-3 text-left text-xs lg:text-sm font-semibold text-white">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedRequests.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="px-3 lg:px-6 py-6 lg:py-8 text-center text-gray-500 text-sm lg:text-base">
                      No approved requests found matching your filters
                    </td>
                  </tr>
                ) : (
                  paginatedRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 lg:px-6 py-3 lg:py-4 text-xs lg:text-sm font-medium" style={{ color: colors.primary }}>
                        #{request.id}
                      </td>
                      <td className="px-3 lg:px-6 py-3 lg:py-4 text-xs lg:text-sm" style={{ color: colors.dark }}>
                        {request.employee}
                      </td>
                      <td className="px-3 lg:px-6 py-3 lg:py-4 text-xs lg:text-sm">
                        <span 
                          className="px-2 py-1 rounded-full text-xs font-medium"
                          style={{ 
                            backgroundColor: colors.light,
                            color: colors.primary
                          }}
                        >
                          {request.department}
                        </span>
                      </td>
                      <td className="px-3 lg:px-6 py-3 lg:py-4 text-xs lg:text-sm">
                        <span className="flex items-center gap-1 lg:gap-2">
                          {request.type === 'Flight' ? (
                            <FaPlane style={{ color: colors.secondary }} size={14} className="lg:w-4 lg:h-4" />
                          ) : (
                            <FiHome style={{ color: colors.accent }} size={14} className="lg:w-4 lg:h-4" />
                          )}
                          <span style={{ color: colors.dark }}>{request.type}</span>
                        </span>
                      </td>
                      <td className="px-3 lg:px-6 py-3 lg:py-4 text-xs lg:text-sm" style={{ color: colors.dark }}>
                        {request.destination}
                      </td>
                      <td className="px-3 lg:px-6 py-3 lg:py-4 text-xs lg:text-sm text-gray-600">
                        {new Date(request.departureDate).toLocaleDateString()} - {new Date(request.returnDate).toLocaleDateString()}
                      </td>
                      <td className="px-3 lg:px-6 py-3 lg:py-4 text-xs lg:text-sm" style={{ color: colors.dark }}>
                        {request.approvedBy}
                      </td>
                      <td className="px-3 lg:px-6 py-3 lg:py-4 text-xs lg:text-sm">
                        <div>
                          <div className="font-semibold" style={{ color: colors.secondary }}>
                            ${(request.actualCost || request.estimatedCost).toLocaleString()}
                          </div>
                          {request.actualCost > 0 && (
                            <div className="text-xs text-gray-500">
                              Est: ${request.estimatedCost.toLocaleString()}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 lg:px-6 py-3 lg:py-4 text-xs lg:text-sm">
                        <span 
                          className="px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap"
                          style={{ 
                            backgroundColor: request.bookingStatus === 'Booked' ? '#10B981' : '#F59E0B',
                            color: 'white'
                          }}
                        >
                          {request.bookingStatus}
                        </span>
                      </td>
                      <td className="px-3 lg:px-6 py-3 lg:py-4 text-xs lg:text-sm">
                        <button
                          onClick={() => handleViewDetails(request.id)}
                          className="flex items-center gap-1 px-2 lg:px-3 py-1 lg:py-2 rounded-md transition-colors hover:opacity-80 text-xs lg:text-sm"
                          style={{ 
                            backgroundColor: colors.light,
                            color: colors.primary
                          }}
                        >
                          <FiEye size={12} className="lg:w-4 lg:h-4" />
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

        {/* Pagination Controls - Bottom */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, totalItems)} of {totalItems} results
          </div>
          
          <div className="flex items-center gap-2">
            {/* Previous Button */}
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              aria-label="Previous page"
            >
              <FiChevronLeft size={16} />
            </button>

            {/* Page Numbers */}
            {getPageNumbers().map(page => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  currentPage === page
                    ? 'text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                style={{
                  backgroundColor: currentPage === page ? colors.primary : 'transparent'
                }}
              >
                {page}
              </button>
            ))}

            {/* Next Button */}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              aria-label="Next page"
            >
              <FiChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}