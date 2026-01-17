import React, { useState, useRef, useEffect } from "react";
import {
  FaUserCircle,
  FaChevronDown,
  FaBell,
  FaSignOutAlt,
  FaHome,
} from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { logoutUser } from "../../Redux/Slice/authSlice";
import { useNavigate } from "react-router-dom";
import { FiSettings } from "react-icons/fi";

export default function EmployeeHeader() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const profileRef = useRef(null);
  const notificationRef = useRef(null);

  /* ================= REDUX USER ================= */
  const { user } = useSelector((state) => state.auth);

  const firstName = user?.name?.firstName || "";
  const lastName = user?.name?.lastName || "";
  const fullName =
    firstName || lastName ? `${firstName} ${lastName}` : "Employee";

  const email = user?.email || "employee@company.com";

  /* ================= CLICK OUTSIDE ================= */
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
      if (
        notificationRef.current &&
        !notificationRef.current.contains(e.target)
      ) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ================= ACTIONS ================= */
  const handleLogout = () => {
    dispatch(logoutUser());
    navigate("/login", { replace: true });
  };

  const goToProfile = () => {
    navigate("/employee-profile-settings");
  };

  return (
    <header className="w-full sticky top-0 z-50 bg-white">
      <div className="max-w-full mx-10  py-1  flex items-center justify-between">
        {/* LEFT: LOGO */}
        <div
          onClick={() => navigate("/my-bookings")}
          className="flex items-center gap-2 cursor-pointer"
        >
          <div className="w-9 h-9 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-lg">
            TD
          </div>
          <span className="text-xl font-bold text-slate-900">COTD</span>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <div ref={notificationRef} className="relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="p-2 rounded hover:bg-slate-100 text-slate-600"
            >
              <FaBell size={18} />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">
                2
              </span>
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white border rounded-lg shadow-lg z-50">
                <div className="px-4 py-3 text-sm font-semibold border-b">
                  Notifications
                </div>
                <div className="px-4 py-3 text-sm text-gray-600">
                  No new notifications
                </div>
              </div>
            )}
          </div>

          {/* Profile */}
          <div ref={profileRef} className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded hover:bg-slate-100"
            >
              <FaUserCircle className="text-3xl text-blue-600" />
              <div className="hidden sm:flex flex-col leading-tight text-left">
                <span className="text-sm font-semibold text-slate-800">
                  {fullName}
                </span>
                <span className="text-xs text-slate-500">{email}</span>
              </div>
              <FaChevronDown
                className={`hidden sm:block text-xs transition ${
                  profileOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-60 bg-white border rounded-lg shadow-lg z-50">
                <button
                  onClick={() => navigate("/search-flight")}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                >
                  <FaHome />
                  Home
                </button>
                <button
                  onClick={goToProfile}
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
      </div>
    </header>
  );
}
