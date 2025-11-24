import React, { useState } from 'react';
import { FiClock, FiHome, FiUser, FiCalendar, FiDollarSign, FiCheck, FiX, FiFilter, FiAlertCircle } from 'react-icons/fi';
import {travelRequestsData} from '../../data/dummyData'
import { FaPlane } from 'react-icons/fa';

const colors = {
  primary: '#0A4D68',
  secondary: '#088395',
  accent: '#05BFDB',
  light: '#F8FAFC',
  dark: '#1E293B'
};

export default function PendingTravelRequests() {
  const [requests, setRequests] = useState(travelRequestsData);
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [selectedPriority, setSelectedPriority] = useState('All');
  const [selectedType, setSelectedType] = useState('All');

  // Get unique values for filters
  const departments = ['All', ...new Set(requests.map(r => r.department))];
  const priorities = ['All', 'High', 'Medium', 'Low'];
  const types = ['All', 'Flight', 'Hotel'];

  // Filter requests
  const filteredRequests = requests.filter(request => {
    const deptMatch = selectedDepartment === 'All' || request.department === selectedDepartment;
    const priorityMatch = selectedPriority === 'All' || request.priority === selectedPriority;
    const typeMatch = selectedType === 'All' || request.type === selectedType;
    
    return deptMatch && priorityMatch && typeMatch && request.status === 'Pending';
  });

  // Calculate statistics
  const totalPending = filteredRequests.length;
  const totalEstimatedCost = filteredRequests.reduce((sum, r) => sum + r.estimatedCost, 0);
  const highPriority = filteredRequests.filter(r => r.priority === 'High').length;
  const flightRequests = filteredRequests.filter(r => r.type === 'Flight').length;

  // Handle approval
  const handleApprove = (id) => {
    setRequests(requests.map(req => 
      req.id === id ? { ...req, status: 'Approved' } : req
    ));
  };

  // Handle rejection
  const handleReject = (id) => {
    setRequests(requests.map(req => 
      req.id === id ? { ...req, status: 'Rejected' } : req
    ));
  };

  // Priority badge color
  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'High': return '#EF4444';
      case 'Medium': return '#F59E0B';
      case 'Low': return '#10B981';
      default: return colors.dark;
    }
  };

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: colors.light }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: colors.dark }}>
            Pending Travel Requests
          </h1>
          <p className="text-gray-600">Review and approve employee travel requests</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* Total Pending */}
          <div className="bg-white rounded-lg shadow-md p-6" style={{ borderTop: `4px solid ${colors.primary}` }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Total Pending</p>
                <p className="text-3xl font-bold" style={{ color: colors.primary }}>{totalPending}</p>
              </div>
              <div className="p-3 rounded-full" style={{ backgroundColor: colors.light }}>
                <FiClock size={24} style={{ color: colors.primary }} />
              </div>
            </div>
          </div>

          {/* High Priority */}
          <div className="bg-white rounded-lg shadow-md p-6" style={{ borderTop: '4px solid #EF4444' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">High Priority</p>
                <p className="text-3xl font-bold" style={{ color: '#EF4444' }}>{highPriority}</p>
              </div>
              <div className="p-3 rounded-full" style={{ backgroundColor: colors.light }}>
                <FiAlertCircle size={24} style={{ color: '#EF4444' }} />
              </div>
            </div>
          </div>

          {/* Flight Requests */}
          <div className="bg-white rounded-lg shadow-md p-6" style={{ borderTop: `4px solid ${colors.secondary}` }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Flight Requests</p>
                <p className="text-3xl font-bold" style={{ color: colors.secondary }}>{flightRequests}</p>
              </div>
              <div className="p-3 rounded-full" style={{ backgroundColor: colors.light }}>
                <FaPlane size={24} style={{ color: colors.secondary }} />
              </div>
            </div>
          </div>

          {/* Estimated Cost */}
          <div className="bg-white rounded-lg shadow-md p-6" style={{ borderTop: `4px solid ${colors.accent}` }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Estimated Cost</p>
                <p className="text-3xl font-bold" style={{ color: colors.accent }}>${totalEstimatedCost}</p>
              </div>
              <div className="p-3 rounded-full" style={{ backgroundColor: colors.light }}>
                <FiDollarSign size={24} style={{ color: colors.accent }} />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <FiFilter style={{ color: colors.primary }} size={20} />
            <h2 className="text-lg font-semibold" style={{ color: colors.dark }}>Filters</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Department Filter */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: colors.dark }}>
                Department
              </label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2"
              >
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            {/* Priority Filter */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: colors.dark }}>
                Priority
              </label>
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2"
              >
                {priorities.map(priority => (
                  <option key={priority} value={priority}>{priority}</option>
                ))}
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: colors.dark }}>
                Type
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2"
              >
                {types.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Requests List */}
        <div className="space-y-4">
          {filteredRequests.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <FiCheck size={48} className="mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">No pending requests matching your filters</p>
            </div>
          ) : (
            filteredRequests.map((request) => (
              <div key={request.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Request Info */}
                  <div className="flex-1">
                    <div className="flex items-start gap-4 mb-4">
                      {/* Icon */}
                      <div className="p-3 rounded-full" style={{ backgroundColor: colors.light }}>
                        {request.type === 'Flight' ? (
                          <FaPlane size={24} style={{ color: colors.secondary }} />
                        ) : (
                          <FiHome size={24} style={{ color: colors.accent }} />
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold" style={{ color: colors.dark }}>
                            {request.type} to {request.destination}
                          </h3>
                          <span 
                            className="px-3 py-1 rounded-full text-xs font-medium text-white"
                            style={{ backgroundColor: getPriorityColor(request.priority) }}
                          >
                            {request.priority} Priority
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <FiUser style={{ color: colors.primary }} />
                            <span>{request.employee} • {request.department}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FiCalendar style={{ color: colors.primary }} />
                            <span>{new Date(request.departureDate).toLocaleDateString()} - {new Date(request.returnDate).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FiDollarSign style={{ color: colors.primary }} />
                            <span className="font-semibold">${request.estimatedCost}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FiClock style={{ color: colors.primary }} />
                            <span>Requested: {new Date(request.requestDate).toLocaleDateString()}</span>
                          </div>
                        </div>

                        <div className="mt-3 p-3 rounded-md" style={{ backgroundColor: colors.light }}>
                          <p className="text-sm" style={{ color: colors.dark }}>
                            <strong>Reason:</strong> {request.reason}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex lg:flex-col gap-3">
                    <button
                      onClick={() => handleApprove(request.id)}
                      className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white font-medium transition-all hover:opacity-90 flex-1 lg:flex-initial"
                      style={{ backgroundColor: '#10B981' }}
                    >
                      <FiCheck size={18} />
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(request.id)}
                      className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white font-medium transition-all hover:opacity-90 flex-1 lg:flex-initial"
                      style={{ backgroundColor: '#EF4444' }}
                    >
                      <FiX size={18} />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}