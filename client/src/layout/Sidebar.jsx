import React, { useState } from "react";
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
  FaBuilding,
  FaUserTie,
  FaUser,
  FaCog,
  FaFileAlt,
  FaMoneyBillWave,
  FaExchangeAlt,
  FaListAlt,
  FaShieldAlt,
  FaIdCard
} from "react-icons/fa";

export default function Sidebar({ isOpen, onClose }) {
  const [activeUserType, setActiveUserType] = useState("travelAdmin"); // travelAdmin, travelCompany, employee

  const travelAdminMenu = [
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

  const travelCompanyMenu = [
    {
      to: "/onboarded-corporates",
      label: "Onboarded Corporates",
      icon: <FaBuilding size={18} />,
    },
    {
      to: "/bookings-summary",
      label: "Bookings Summary",
      icon: <FaClipboardList size={18} />,
    },
    {
      to: "/corporate-revenue",
      label: "Corporate Revenue",
      icon: <FaMoneyBillWave size={18} />,
    },
    {
      to: "/credit-status",
      label: "Credit Status & Alerts",
      icon: <FaCreditCard size={18} />,
    },
    {
      to: "/wallet-recharge-logs",
      label: "Wallet Recharge Logs",
      icon: <FaWallet size={18} />,
    },
    {
      to: "/corporate-access",
      label: "Corporate Access Control",
      icon: <FaShieldAlt size={18} />,
    },
    {
      to: "/pending-amendments",
      label: "Pending Amendments",
      icon: <FaExchangeAlt size={18} />,
    },
    {
      to: "/commission-settings",
      label: "Commission Settings",
      icon: <FaCog size={18} />,
    },
    {
      to: "/api-configurations",
      label: "API Configurations",
      icon: <FaListAlt size={18} />,
    },
    {
      to: "/system-logs",
      label: "System Logs",
      icon: <FaFileAlt size={18} />,
    },
  ];

  const employeeMenu = [
    {
      to: "/my-bookings",
      label: "Booked Trips",
      icon: <FaClipboardList size={18} />,
    },
    {
      to: "/my-upcoming-trips",
      label: "Upcoming Trips",
      icon: <FaClock size={18} />,
    },
    {
      to: "/my-past-trips",
      label: "Past Trips",
      icon: <FaListAlt size={18} />,
    },
    {
      to: "/my-pending-approvals",
      label: "Pending Approvals",
      icon: <FaClock size={18} />,
    },
    {
      to: "/my-rejected-requests",
      label: "Rejected Requests",
      icon: <FaTimes size={18} />,
    },
    {
      to: "/my-profile",
      label: "Profile Details",
      icon: <FaUser size={18} />,
    },
    {
      to: "/travel-documents",
      label: "Travel Documents",
      icon: <FaIdCard size={18} />,
    },
  ];

  const getUserTypeIcon = (type) => {
    switch (type) {
      case "travelAdmin":
        return <FaUserTie size={16} />;
      case "travelCompany":
        return <FaBuilding size={16} />;
      case "employee":
        return <FaUser size={16} />;
      default:
        return <FaUserTie size={16} />;
    }
  };

  const getUserTypeLabel = (type) => {
    switch (type) {
      case "travelAdmin":
        return "Travel Admin";
      case "travelCompany":
        return "Travel Company";
      case "employee":
        return "Employee";
      default:
        return "Travel Admin";
    }
  };

  const getActiveMenu = () => {
    switch (activeUserType) {
      case "travelAdmin":
        return travelAdminMenu;
      case "travelCompany":
        return travelCompanyMenu;
      case "employee":
        return employeeMenu;
      default:
        return travelAdminMenu;
    }
  };

  const userTypes = [
    { id: "travelAdmin", label: "Travel Admin", icon: <FaUserTie /> },
    { id: "travelCompany", label: "Travel Company", icon: <FaBuilding /> },
    { id: "employee", label: "Employee", icon: <FaUser /> },
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
            {isOpen ? getUserTypeLabel(activeUserType) : getUserTypeLabel(activeUserType).charAt(0)}
          </h2>
          
          {/* Close button for mobile */}
          <button
            className="lg:hidden p-1 hover:bg-gray-100 rounded"
            onClick={onClose}
          >
            <FaClose size={16} className="text-gray-600" />
          </button>
        </div>

        {/* User Type Selector */}
        <div className="px-3 py-4 border-b">
          <div className="flex flex-col gap-2">
            {userTypes.map((userType) => (
              <button
                key={userType.id}
                onClick={() => setActiveUserType(userType.id)}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-all
                  ${activeUserType === userType.id 
                    ? "bg-[#05BFDB] text-white shadow-sm" 
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }
                `}
              >
                <span className="flex-shrink-0">{userType.icon}</span>
                <span className={`
                  ${isOpen ? "opacity-100" : "lg:opacity-0 xl:opacity-100"} 
                  transition-opacity whitespace-nowrap flex-1 text-left
                `}>
                  {userType.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Menu */}
        <nav className="mt-3 space-y-1 px-3">
          {getActiveMenu().map((m) => (
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