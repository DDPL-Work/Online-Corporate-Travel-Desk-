import React from "react";
import { NavLink } from "react-router-dom";
import {
  FaClipboardList,
  FaClock,
  FaCheck,
  FaTimes,
  FaUsers,
  FaWallet,
  FaCreditCard,
  FaTimes as FaClose,
} from "react-icons/fa";

export default function Sidebar({ isOpen, onClose }) {
  const menu = [
    {
      to: "/total-bookings",
      label: "Total Bookings",
      icon: <FaClipboardList size={18} />,
    },
    {
      to: "/pending-requests",
      label: "Pending Requests",
      icon: <FaClock size={18} />,
    },
    {
      to: "/approved-requests",
      label: "Approved Requests",
      icon: <FaCheck size={18} />,
    },
    {
      to: "/rejected-requests",
      label: "Rejected Requests",
      icon: <FaTimes size={18} />,
    },
    {
      to: "/upcoming-trips",
      label: "Upcoming Trips",
      icon: <FaClock size={18} />,
    },
    {
      to: "/past-trips",
      label: "Past Trips",
      icon: <FaClipboardList size={18} />,
    },
    {
      to: "/user-management",
      label: "User Management",
      icon: <FaUsers size={18} />,
    },
    {
      to: "/corporate-wallet",
      label: "Corporate Wallet",
      icon: <FaWallet size={18} />,
    },
    {
      to: "/credit-utilization",
      label: "Credit Utilization",
      icon: <FaCreditCard size={18} />,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static top-0 left-0 h-full bg-white shadow-md border-r
          transition-all duration-300 z-50 
          ${isOpen ? "w-64 translate-x-0" : "-translate-x-full lg:translate-x-0 lg:w-20 xl:w-64"}
        `}
      >
        {/* Header with close button for mobile */}
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#0A4D68] truncate text-center flex-1">
            {isOpen ? "Travel Admin" : "TA"}
          </h2>
          
          {/* Close button for mobile */}
          <button
            className="lg:hidden p-1 hover:bg-gray-100 rounded"
            onClick={onClose}
          >
            <FaClose size={16} className="text-gray-600" />
          </button>
        </div>

        {/* Menu */}
        <nav className="mt-3 space-y-1 px-3">
          {menu.map((m) => (
            <NavLink
              key={m.to}
              to={m.to}
              onClick={() => {
                // Close sidebar on mobile when a menu item is clicked
                if (window.innerWidth < 1024) {
                  onClose();
                }
              }}
              className={({ isActive }) =>
                `
                flex items-center gap-4 px-3 py-3 rounded text-sm
                transition-all overflow-hidden
                ${
                  isActive
                    ? "bg-[#05BFDB] text-white shadow-sm"
                    : "hover:bg-gray-100 text-gray-700"
                }
                `
              }
            >
              <span className="min-w-[24px] flex justify-center">{m.icon}</span>
              <span
                className={`
                  ${isOpen ? "opacity-100" : "lg:opacity-0 xl:opacity-100"} 
                  transition-opacity whitespace-nowrap
                `}
              >
                {m.label}
              </span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}