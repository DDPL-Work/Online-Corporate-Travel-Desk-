import React, { useEffect, useMemo } from "react";
import { NavLink } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import {
  FaClipboardList,
  FaTimes,
  FaWallet,
  FaCreditCard,
  FaBuilding,
  FaCog,
  FaFileAlt,
  FaMoneyBillWave,
  FaExchangeAlt,
  FaListAlt,
  FaShieldAlt,
  FaIdCard,
  FaUser,
  FaBars,
} from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { fetchCorporateAdmin } from "../Redux/Slice/corporateAdminSlice";

export default function Sidebar({ isOpen, onClose }) {
  const dispatch = useDispatch();
  const token = sessionStorage.getItem("token");

  let role = "super-admin";
  if (token) {
    try {
      const decoded = jwtDecode(token);
      role = decoded.role || decoded.userRole || role;
    } catch {
      console.error("Invalid token");
    }
  }

  const { corporate, loading } = useSelector((state) => state.corporateAdmin);
  const classification = corporate?.classification;

  useEffect(() => {
    if (role === "travel-admin" && !corporate) {
      dispatch(fetchCorporateAdmin());
    }
  }, [role, corporate, dispatch]);

  // ========================= MENUS =========================

  const travelCompanyMenu = [
    {
      to: "/onboarded-corporates",
      label: "Onboarded Corporates",
      icon: <FaBuilding />,
    },
    {
      to: "/bookings-summary",
      label: "Bookings Summary",
      icon: <FaClipboardList />,
    },
    {
      to: "/corporate-revenue",
      label: "Corporate Revenue",
      icon: <FaMoneyBillWave />,
    },
    {
      to: "/credit-status",
      label: "Credit Status & Alerts",
      icon: <FaCreditCard />,
    },
    {
      to: "/wallet-recharge-logs",
      label: "Wallet Recharge Logs",
      icon: <FaWallet />,
    },
    {
      to: "/corporate-access",
      label: "Corporate Access Control",
      icon: <FaShieldAlt />,
    },
    {
      to: "/pending-amendments",
      label: "Pending Amendments",
      icon: <FaExchangeAlt />,
    },
    {
      to: "/commission-settings",
      label: "Commission Settings",
      icon: <FaCog />,
    },
    {
      to: "/api-configurations",
      label: "API Configurations",
      icon: <FaListAlt />,
    },
    { to: "/system-logs", label: "System Logs", icon: <FaFileAlt /> },
  ];

  const menus = {
    "super-admin": travelCompanyMenu,
  };
  const activeMenu = menus[role] || [];

  const roleLabels = {
    "super-admin": "Super Admin",
  };

  // ========================= UI =========================
  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed lg:static bg-white border-r border-[#0A4D68] top-0 left-0 z-50 
          flex flex-col transition-all duration-300 h-screen
          ${
            isOpen
              ? "w-64 translate-x-0"
              : "-translate-x-full lg:translate-x-0 lg:w-64"
          }
        `}
      >
        {/* ====== BRAND / HEADER ====== */}
        <div className="p-4  flex items-center justify-between bg-[#0A4D68]">
          <h2 className="text-md font-semibold text-white tracking-wide flex items-center gap-2">
            <FaUser className="text-white/80" /> {roleLabels[role] || "User"}
          </h2>
          <button className="lg:hidden text-white" onClick={onClose}>
            <FaTimes size={16} />
          </button>
        </div>

        {/* ====== NAVIGATION ====== */}
        <nav className="flex-1 overflow-y-auto mt-2 space-y-2 px-3">
          {role === "travel-admin" && loading ? (
            <div className="text-center text-gray-400 py-6">Loading...</div>
          ) : (
            activeMenu.map((m) => (
              <NavLink
                key={m.to}
                to={m.to}
                onClick={() => window.innerWidth < 1024 && onClose()}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium transition-all duration-200
                  ${
                    isActive
                      ? "bg-[#0A4D68] text-white shadow-sm"
                      : "text-gray-700 hover:bg-gray-100 hover:text-[#0A4D68]"
                  }`
                }
              >
                <span className="w-5 h-5 flex items-center justify-center text-lg">
                  {m.icon}
                </span>
                <span>{m.label}</span>
              </NavLink>
            ))
          )}
        </nav>
      </aside>
    </>
  );
}
