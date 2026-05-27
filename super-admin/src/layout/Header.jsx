import React, { useState, useRef, useEffect } from "react";
import { FaBars } from "react-icons/fa";
import { FiUser } from "react-icons/fi";
import { RiUserLine } from "react-icons/ri";
import { useDispatch, useSelector } from "react-redux";
import { logoutUser } from "../Redux/Slice/authSlice";
import { useNavigate } from "react-router-dom";
import NotificationBell from "../components/common/NotificationBell";
import { DASHBOARD_ROLES } from "../constants/rbac";

export default function Header({ toggleSidebar, sidebarOpen }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileRef = useRef(null);

  const { user, role } = useSelector((state) => state.auth || {});

  const GOLD = "#C9A84C";
  const C = {
    navy: "#000D26",
    navyDeep: "#04112F",
    white: "#FFFFFF",
    border: "#E1E7EF",
  };

  useEffect(() => {
    function handleClick(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleLogout = () => {
    dispatch(logoutUser());
    navigate("/login", { replace: true });
  };

  const roleLabels = {
    [DASHBOARD_ROLES?.SUPER_ADMIN || "super-admin"]: "Super Admin",
    [DASHBOARD_ROLES?.OPS_MEMBER || "ops-member"]: "OPS Team Member",
  };

  const fullName = typeof user?.name === "string" 
    ? user.name 
    : (user?.name?.firstName ? `${user.name.firstName} ${user.name.lastName || ""}` : "Super Admin");
    
  const initial = typeof user?.name === "string" && user.name.length > 0
    ? user.name.charAt(0).toUpperCase()
    : (user?.name?.firstName?.charAt(0).toUpperCase() || "S");

  return (
    <header className="w-full px-6 py-4 flex justify-between items-center z-40 sticky top-0 shadow-sm transition-all bg-white">
      {/* LEFT: Logo */}
      <div className="flex items-center gap-4 cursor-pointer" onClick={() => navigate("/")}>
        <img src="/logo-traveamer.svg" alt="Traveamer" className="h-7" loading="eager" />
      </div>

      {/* RIGHT: Profile & Notifications */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <NotificationBell onOpen={() => setProfileDropdownOpen(false)} />

          <div className="relative" ref={profileRef}>
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer font-bold text-sm transition-all shadow-sm hover:shadow-md"
              onClick={() => {
                if (!profileDropdownOpen) {
                  window.dispatchEvent(new Event("closeNotificationBell"));
                }
                setProfileDropdownOpen(!profileDropdownOpen);
              }}
              style={{
                background: GOLD,
                color: C.navy,
                border: `2px solid ${C.navyDeep}`,
              }}
            >
              {initial}
            </div>
            
            {/* Profile Dropdown */}
            <div
              className={`absolute right-0 top-full mt-2 w-48 rounded-xl shadow-xl transition-all overflow-hidden z-50 ${profileDropdownOpen ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"}`}
              style={{
                background: C.white,
                border: `1px solid ${C.border}`,
              }}
            >
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                <p className="text-sm font-bold text-gray-800 truncate leading-tight">
                  {fullName}
                </p>
                <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mt-1">
                  {roleLabels[role] || "System Admin"}
                </p>
              </div>
              <button
                onClick={() => {
                  setProfileDropdownOpen(false);
                  navigate("/profile");
                }}
                className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2 border-b border-gray-100 cursor-pointer"
              >
                <FiUser size={15} /> Profile Settings
              </button>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2 border-none cursor-pointer"
              >
                <RiUserLine size={15} /> Sign Out
              </button>
            </div>
          </div>

          {/* Sidebar Toggle */}
          <button
            onClick={toggleSidebar}
            className="flex p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-700 items-center justify-center ml-2"
            title={sidebarOpen ? "Close Menu" : "Open Menu"}
          >
            <FaBars size={20} />
          </button>
        </div>
      </div>
    </header>
  );
}
