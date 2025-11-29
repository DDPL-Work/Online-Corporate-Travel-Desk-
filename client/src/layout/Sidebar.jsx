import React from "react";
import { NavLink } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

import {
  FaClipboardList,
  FaClock,
  FaCheck,
  FaTimes,
  FaUsers,
  FaWallet,
  FaCreditCard,
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

  // --------------------------------------------------------
  // READ JWT TOKEN FROM SESSION STORAGE + DECODE ROLE
  // --------------------------------------------------------
  const token = sessionStorage.getItem("token");

  let role = "super-admin"; 

  if (token) {
    try {
      const decoded = jwtDecode(token);
      role = decoded.role || decoded.userRole || role;
    } catch (err) {
      console.error("Invalid token:", err);
    }
  }

  // --------------------------------------------------------
  // ROLE-BASED MENU DEFINITIONS
  // --------------------------------------------------------

  const travelAdminMenu = [
    { to: "/total-bookings", label: "Total Bookings", icon: <FaClipboardList size={18} /> },
    { to: "/pending-requests", label: "Pending Requests", icon: <FaClock size={18} /> },
    { to: "/approved-requests", label: "Approved Requests", icon: <FaCheck size={18} /> },
    { to: "/rejected-requests", label: "Rejected Requests", icon: <FaTimes size={18} /> },
    { to: "/upcoming-trips", label: "Upcoming Trips", icon: <FaClock size={18} /> },
    { to: "/past-trips", label: "Past Trips", icon: <FaClipboardList size={18} /> },
    { to: "/user-management", label: "User Management", icon: <FaUsers size={18} /> },
    { to: "/corporate-wallet", label: "Corporate Wallet", icon: <FaWallet size={18} /> },
    { to: "/credit-utilization", label: "Credit Utilization", icon: <FaCreditCard size={18} /> }
  ];

  const travelCompanyMenu = [
    { to: "/onboarded-corporates", label: "Onboarded Corporates", icon: <FaBuilding size={18} /> },
    { to: "/bookings-summary", label: "Bookings Summary", icon: <FaClipboardList size={18} /> },
    { to: "/corporate-revenue", label: "Corporate Revenue", icon: <FaMoneyBillWave size={18} /> },
    { to: "/credit-status", label: "Credit Status & Alerts", icon: <FaCreditCard size={18} /> },
    { to: "/wallet-recharge-logs", label: "Wallet Recharge Logs", icon: <FaWallet size={18} /> },
    { to: "/corporate-access", label: "Corporate Access Control", icon: <FaShieldAlt size={18} /> },
    { to: "/pending-amendments", label: "Pending Amendments", icon: <FaExchangeAlt size={18} /> },
    { to: "/commission-settings", label: "Commission Settings", icon: <FaCog size={18} /> },
    { to: "/api-configurations", label: "API Configurations", icon: <FaListAlt size={18} /> },
    { to: "/system-logs", label: "System Logs", icon: <FaFileAlt size={18} /> }
  ];

  const employeeMenu = [
    { to: "/my-bookings", label: "Booked Trips", icon: <FaClipboardList size={18} /> },
    { to: "/my-upcoming-trips", label: "Upcoming Trips", icon: <FaClock size={18} /> },
    { to: "/my-past-trips", label: "Past Trips", icon: <FaListAlt size={18} /> },
    { to: "/my-pending-approvals", label: "Pending Approvals", icon: <FaClock size={18} /> },
    { to: "/my-rejected-requests", label: "Rejected Requests", icon: <FaTimes size={18} /> },
    { to: "/my-profile", label: "Profile Details", icon: <FaUser size={18} /> },
    { to: "/travel-documents", label: "Travel Documents", icon: <FaIdCard size={18} /> }
  ];

  const sidebars = {
    "super-admin": travelAdminMenu,
    "travel-company": travelCompanyMenu,
    "employee": employeeMenu
  };

  const activeMenu = sidebars[role] || [];

  const roleLabels = {
    "travel-admin": "Super Admin",
    "travel-company": "Travel Company",
    "employee": "Employee"
  };

  // --------------------------------------------------------
  // SIDEBAR UI
  // --------------------------------------------------------
  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={onClose}></div>
      )}

      <aside
        className={`
          fixed lg:static top-0 left-0 h-full bg-white shadow-lg border-r z-50
          transition-all duration-300
          ${isOpen ? "w-64 translate-x-0" : "-translate-x-full lg:translate-x-0 lg:w-64"}
        `}
      >
        <div className="p-4 border-b flex items-center justify-between bg-gray-50">
          <h2 className="text-lg font-semibold text-[#0A4D68]">
            {roleLabels[role] || "User"}
          </h2>

          <button className="lg:hidden" onClick={onClose}>
            <FaTimes size={18} className="text-gray-600" />
          </button>
        </div>

        <nav className="mt-4 space-y-1 px-4">
          {activeMenu.map((m) => (
            <NavLink
              key={m.to}
              to={m.to}
              onClick={() => window.innerWidth < 1024 && onClose()}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-3 rounded-md text-sm transition
                 ${isActive ? "bg-[#05BFDB] text-white" : "text-gray-700 hover:bg-gray-100"}
                `
              }
            >
              <span className="w-6 flex justify-center">{m.icon}</span>
              <span>{m.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
