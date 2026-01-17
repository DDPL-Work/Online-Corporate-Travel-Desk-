import React, { useState, useRef, useEffect } from "react";
import { FaUserCircle, FaBars, FaChevronDown, FaBell, FaSignOutAlt } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { logoutUser } from "../Redux/Slice/authSlice";
import { useNavigate } from "react-router-dom";
import { FiSettings } from "react-icons/fi";

export default function Header({ toggleSidebar, sidebarOpen }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const dropdownRef = useRef(null);
  const notificationsRef = useRef(null);

  const { user, role } = useSelector((state) => state.auth);

  // ✅ SAFE USER DATA
  const firstName = user?.name?.firstName || "";
  const lastName = user?.name?.lastName || "";
  const fullName = firstName || lastName ? `${firstName} ${lastName}` : "User";

  const email = user?.email || "-";
  const userRole = role || "user";

  // -------------------------
  // AUTO CLOSE DROPDOWNS
  // -------------------------
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(e.target)
      ) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // -------------------------
  // DASHBOARD TITLE
  // -------------------------
  const getDashboardTitle = () => {
    switch (userRole) {
      case "super-admin":
        return "Super Admin Dashboard";
      case "travel-admin":
        return "Travel Admin Dashboard";
      case "employee":
        return "Employee Dashboard";
      default:
        return "Dashboard";
    }
  };

  const handleLogout = () => {
    dispatch(logoutUser());
    navigate("/login", { replace: true });
  };

  const handleProfileNavigation = () => {
    switch (userRole) {
      case "travel-admin":
        navigate("/travel-profile-settings");
        break;

      case "employee":
        navigate("/employee-profile-settings");
        break;

      case "super-admin":
        navigate("/super-admin-profile-settings");
        break;

      default:
        navigate("/login");
    }
  };

  return (
    <header className="h-14 bg-[#0A4D68] border-b border-[#0A4D68] flex items-center justify-between px-4 sticky top-0 z-40">
      {/* LEFT */}
      <div className="flex items-center gap-4">
        <button
          className="p-2 text-[#0A4D68] hover:bg-gray-100 rounded lg:hidden"
          onClick={toggleSidebar}
        >
          <FaBars size={20} />
        </button>

        {/* <h1 className="text-lg font-semibold text-[#0A4D68] hidden sm:block">
          {getDashboardTitle()}
        </h1> */}
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <div ref={notificationsRef} className="relative">
          <button
            className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
          >
            <FaBell size={20} />
          </button>
        </div>

        {/* User Dropdown */}
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded"
          >
            <FaUserCircle className="text-xl text-[#0A4D68]" />
            <span className="hidden sm:block font-medium">{fullName}</span>
            <FaChevronDown
              className={`hidden sm:block transition ${
                open ? "rotate-180" : ""
              }`}
            />
          </button>

          {open && (
            <div className="absolute right-0 w-56 bg-white shadow-lg border border-gray-300 rounded mt-2 z-50">
              {/* <div className="px-4 py-3 border-b border-gray-300">
                <p className="font-semibold">{fullName}</p>
                <p className="text-xs text-gray-500">{email}</p>
                <p className="text-xs text-gray-400 capitalize">{userRole}</p>
              </div> */}

              <button
                onClick={handleProfileNavigation}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
              > 
              <FiSettings />
                Profile Settings
              </button>

              <div className="border-t border-gray-300">
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100 flex items-center gap-2"
                > 
                <FaSignOutAlt />
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
