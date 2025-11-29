import React, { useState, useRef, useEffect } from "react";
import { FaUserCircle, FaBars, FaChevronDown, FaBell } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { logoutUser } from "../Redux/Slice/authSlice";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";

export default function Header({ toggleSidebar, sidebarOpen }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const dropdownRef = useRef();
  const notificationsRef = useRef();

  // -------------------------
  // READ USER FROM TOKEN
  // -------------------------

  const { user, role } = useSelector((state) => state.auth);

  const userName = user?.name || "User";
  const userEmail = user?.email || "-";
  const userRole = role || "user";

  

  // -------------------------
  // AUTO-CLOSE DROPDOWNS
  // -------------------------
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(e.target)
      ) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // -------------------------
  // TITLE BASED ON ROLE
  // -------------------------
  const getDashboardTitle = () => {
    switch (userRole) {
      case "super-admin":
        return "Super Admin Dashboard";
      case "travel-company":
        return "Travel Company Dashboard";
      case "employee":
        return "Employee Dashboard";
      default:
        return "Dashboard";
    }
  };

  // -------------------------
  // LOGOUT FUNCTION
  // -------------------------
  const handleLogout = () => {
    dispatch(logoutUser());
    navigate("/login");
  };

  return (
    <header className="h-16 bg-white shadow flex items-center justify-between px-4 md:px-6 sticky top-0 z-40">
      {/* LEFT — Menu Button + Title */}
      <div className="flex items-center gap-4">
        {/* Sidebar Toggle */}
        <button
          className="p-2 text-[#0A4D68] hover:bg-gray-100 rounded lg:hidden"
          onClick={toggleSidebar}
        >
          <FaBars size={20} />
        </button>

        {/* Desktop Title */}
        <h1 className="text-lg font-semibold text-[#0A4D68] hidden sm:block">
          {getDashboardTitle()}
        </h1>

        {/* Mobile Title */}
        <h1 className="text-lg font-semibold text-[#0A4D68] sm:hidden">
          {sidebarOpen ? "" : "Dashboard"}
        </h1>
      </div>

      {/* RIGHT — Notifications + User Dropdown */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <div ref={notificationsRef} className="relative">
          <button
            className="p-2 text-[#0A4D68] hover:bg-gray-100 rounded relative"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
          >
            <FaBell size={18} />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
              3
            </span>
          </button>

          {/* Notification Dropdown */}
          {notificationsOpen && (
            <div className="absolute right-0 w-72 bg-white shadow-lg border rounded mt-2 z-50 py-2">
              <div className="px-4 py-2 border-b font-semibold">
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
              </div>

              <button className="w-full text-center py-2 text-sm text-blue-600 hover:bg-gray-50">
                View All Notifications
              </button>
            </div>
          )}
        </div>

        {/* USER PROFILE DROPDOWN */}
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2 hover:bg-gray-100 px-3 py-2 rounded"
          >
            <FaUserCircle className="text-3xl text-[#0A4D68]" />
            <span className="hidden sm:block font-medium">{userName}</span>
            <FaChevronDown
              className={`hidden sm:block transition ${
                open ? "rotate-180" : ""
              }`}
            />
          </button>

          {open && (
            <div className="absolute right-0 w-52 bg-white shadow-lg border rounded mt-2 z-50 py-1">
              {/* User Info */}
              <div className="px-4 py-2 border-b">
                <p className="font-semibold">{userName}</p>
                <p className="text-xs text-gray-500">{userEmail}</p>
                <p className="text-xs text-gray-400 capitalize">{userRole}</p>
              </div>

              <button
                onClick={() => navigate("/update-profile")}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
              >
                Profile Settings
              </button>

              <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100">
                System Preferences
              </button>

              {/* LOGOUT BUTTON */}
              <div className="border-t mt-1">
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100"
                >
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
