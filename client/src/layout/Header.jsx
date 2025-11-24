import React, { useState, useRef, useEffect } from "react";
import { FaUserCircle, FaBars, FaChevronDown, FaBell } from "react-icons/fa";

export default function Header({ toggleSidebar, sidebarOpen, activeUserType }) {
  const [open, setOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const dropdownRef = useRef();
  const notificationsRef = useRef();

  // Auto-close dropdowns when clicking outside
  useEffect(() => {
    function closeDropdowns(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener("click", closeDropdowns);
    return () => document.removeEventListener("click", closeDropdowns);
  }, []);

  const getDashboardTitle = () => {
    switch (activeUserType) {
      case "travelAdmin":
        return "Travel Admin Dashboard";
      case "travelCompany":
        return "Travel Company Dashboard";
      case "employee":
        return "Employee Dashboard";
      default:
        return "Travel Admin Dashboard";
    }
  };

  const getUserRole = () => {
    switch (activeUserType) {
      case "travelAdmin":
        return "Admin";
      case "travelCompany":
        return "Company Manager";
      case "employee":
        return "Employee";
      default:
        return "Admin";
    }
  };

  return (
    <header className="h-16 bg-white shadow flex items-center justify-between px-4 md:px-6 sticky top-0 z-40">
      {/* Left Section - Menu Toggle & Title */}
      <div className="flex items-center gap-4">
        {/* Menu Toggle Button - Visible on all devices */}
        <button
          className="p-2 text-[#0A4D68] hover:bg-gray-100 rounded lg:hidden"
          onClick={toggleSidebar}
          aria-label="Toggle menu"
        >
          <FaBars size={20} />
        </button>

        {/* Desktop Title */}
        <h1 className="text-lg font-semibold text-[#0A4D68] hidden sm:block">
          {getDashboardTitle()}
        </h1>
        
        {/* Mobile Title - Shows when sidebar is closed */}
        <h1 className="text-lg font-semibold text-[#0A4D68] sm:hidden">
          {sidebarOpen ? "" : "Dashboard"}
        </h1>
      </div>

      {/* Right Section - Notifications & Profile */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <div ref={notificationsRef} className="relative">
          <button
            className="p-2 text-[#0A4D68] hover:bg-gray-100 rounded relative"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            aria-label="Notifications"
          >
            <FaBell size={18} />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
              3
            </span>
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 w-72 sm:w-80 bg-white shadow-lg border rounded mt-2 z-50 py-2">
              <div className="px-4 py-2 border-b font-semibold text-gray-700">
                Notifications
              </div>
              <div className="max-h-60 overflow-y-auto">
                <div className="px-4 py-3 hover:bg-gray-50 border-b">
                  <p className="text-sm font-medium">New booking request</p>
                  <p className="text-xs text-gray-500">2 minutes ago</p>
                </div>
                <div className="px-4 py-3 hover:bg-gray-50 border-b">
                  <p className="text-sm font-medium">Payment received</p>
                  <p className="text-xs text-gray-500">1 hour ago</p>
                </div>
                <div className="px-4 py-3 hover:bg-gray-50">
                  <p className="text-sm font-medium">System update</p>
                  <p className="text-xs text-gray-500">Yesterday</p>
                </div>
              </div>
              <button className="w-full text-center py-2 text-sm text-blue-600 hover:bg-gray-50">
                View All Notifications
              </button>
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <div ref={dropdownRef} className="relative">
          <button
            className="flex items-center gap-2 hover:bg-gray-100 px-3 py-2 rounded transition-colors"
            onClick={() => setOpen(!open)}
            aria-label="User menu"
          >
            <FaUserCircle className="text-2xl sm:text-3xl text-[#0A4D68]" />
            <span className="hidden sm:block font-medium text-sm md:text-base">
              {getUserRole()}
            </span>
            <FaChevronDown
              className={`hidden sm:block transition-transform ${
                open ? "rotate-180" : "rotate-0"
              }`}
            />
          </button>

          {open && (
            <div className="absolute right-0 w-48 bg-white shadow-lg border rounded mt-2 z-50 py-1">
              <div className="px-4 py-2 border-b">
                <p className="font-medium text-sm">{getUserRole()} User</p>
                <p className="text-xs text-gray-500">
                  {activeUserType === "travelAdmin" && "admin@example.com"}
                  {activeUserType === "travelCompany" && "manager@company.com"}
                  {activeUserType === "employee" && "employee@company.com"}
                </p>
              </div>
              <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100">
                Profile Settings
              </button>
              <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100">
                System Preferences
              </button>
              <div className="border-t mt-1">
                <button className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100">
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}