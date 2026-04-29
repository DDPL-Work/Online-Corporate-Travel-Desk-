import React, { useEffect, useMemo, useState } from "react";
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
  FaCog,
  FaFileAlt,
  FaMoneyBillWave,
  FaExchangeAlt,
  FaListAlt,
  FaShieldAlt,
  FaIdCard,
  FaUser,
  FaBars,
  FaFileExcel,
  FaChevronDown,
} from "react-icons/fa";
import { MdCancel } from "react-icons/md";
import { GrUserManager } from "react-icons/gr";
import { SiHomepage } from "react-icons/si";
import { MdAirlineSeatReclineNormal } from "react-icons/md";
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
  const travelAdminMenu = useMemo(() => {
    const menu = [
      {
        to: "/project-management",
        label: "Project Management",
        icon: <FaFileExcel />,
      },
      {
        to: "/manager-management",
        label: "Manager Management",
        icon: <GrUserManager />,
      },
      {
        to: "/user-management",
        label: "Employee Management",
        icon: <FaUsers />,
      },
    ];
    if (classification === "prepaid") {
      menu.push({
        to: "/corporate-wallet",
        label: "Corporate Wallet",
        icon: <FaWallet />,
      });
    }
    if (classification === "postpaid") {
      menu.push({
        to: "/credit-utilization",
        label: "Credit Utilization",
        icon: <FaCreditCard />,
      });
    }
    menu.push(
      {
        to: "/ssr-management",
        label: "SSR Management",
        icon: <MdAirlineSeatReclineNormal />,
      },
      {
        label: "Company Bookings",
        icon: <FaClipboardList />,
        children: [
          {
            to: "/total-bookings",
            label: "Total Bookings",
            icon: <FaClipboardList />,
          },
          {
            to: "/total-cancelled-bookings",
            label: "Cancelled Bookings",
            icon: <FaClipboardList />,
          },
          {
            to: "/pending-requests",
            label: "Pending Requests",
            icon: <FaClock />,
          },
          {
            to: "/reissue-requests",
            label: "Reissue Requests",
            icon: <FaExchangeAlt />,
          },
          {
            to: "/offline-cancellations",
            label: "Offline Cancellations",
            icon: <FaClock />,
          },
          {
            to: "/approved-requests",
            label: "Approved Requests",
            icon: <FaCheck />,
          },
          {
            to: "/rejected-requests",
            label: "Rejected Requests",
            icon: <FaTimes />,
          },
          { to: "/upcoming-trips", label: "Upcoming Trips", icon: <FaClock /> },
          { to: "/past-trips", label: "Past Trips", icon: <FaClipboardList /> },
        ],
      },
      {
        to: "/travel-profile-settings",
        label: "Corporate Profile",
        icon: <FaBuilding />,
      },
      {
        to: "/branding-settings",
        label: "Branding & Landing Page",
        icon: <SiHomepage />,
      },
    );
    return menu;
  }, [classification]);

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

  const employeeSection = [
    {
      label: "My Travel",
      icon: <FaClipboardList />,
      children: [
        { to: "/my-bookings", label: "My Bookings", icon: <FaClipboardList /> },
        { to: "/my-upcoming-trips", label: "Upcoming Trips", icon: <FaClock /> },
        { to: "/my-past-trips", label: "Past Trips", icon: <FaListAlt /> },
        {
          to: "/my-pending-approvals",
          label: "Pending Approvals",
          icon: <FaClock />,
        },
        {
          to: "/my-rejected-requests",
          label: "Rejected Requests",
          icon: <FaTimes />,
        },
        {
          to: "/my-cancelled-bookings",
          label: "Cancelled Bookings",
          icon: <MdCancel />,
        },
        {
          to: "/my-reissued",
          label: "My Reissued",
          icon: <FaExchangeAlt />,
        },
        {
          to: "/my-offline-cancellations",
          label: "Offline Cancellations",
          icon: <FaClock />,
        },
        { to: "/my-profile", label: "Profile Details", icon: <FaUser /> },
        { to: "/travel-documents", label: "Travel Documents", icon: <FaIdCard /> },
      ],
    },
  ];

  const managerMenu = useMemo(() => {
    return [
      {
        to: "/manager/team-management",
        label: "Team Management",
        icon: <FaUsers />,
      },
      {
        label: "Company Bookings",
        icon: <FaClipboardList />,
        children: [
          {
            to: "/manager/total-bookings",
            label: "Total Bookings",
            icon: <FaClipboardList />,
          },
          {
            to: "/manager/total-cancelled-bookings",
            label: "Cancelled Bookings",
            icon: <FaClipboardList />,
          },
          {
            to: "/manager/pending-requests",
            label: "Pending Requests",
            icon: <FaClock />,
          },
          {
            to: "/manager/reissue-requests",
            label: "Reissue Requests",
            icon: <FaExchangeAlt />,
          },
          {
            to: "/manager/offline-cancellations",
            label: "Offline Cancellations",
            icon: <FaClock />,
          },
          {
            to: "/manager/approved-requests",
            label: "Approved Requests",
            icon: <FaCheck />,
          },
          {
            to: "/manager/rejected-requests",
            label: "Rejected Requests",
            icon: <FaTimes />,
          },
          {
            to: "/manager/upcoming-trips",
            label: "Upcoming Trips",
            icon: <FaClock />,
          },
          {
            to: "/manager/past-trips",
            label: "Past Trips",
            icon: <FaClipboardList />,
          },
        ],
      },
    ];
  }, []);

  const employeeMenu = [
    { to: "/my-bookings", label: "My Bookings", icon: <FaClipboardList /> },
    { to: "/my-upcoming-trips", label: "Upcoming Trips", icon: <FaClock /> },
    { to: "/my-past-trips", label: "Past Trips", icon: <FaListAlt /> },
    {
      to: "/my-pending-approvals",
      label: "Pending Approvals",
      icon: <FaClock />,
    },
    {
      to: "/my-rejected-requests",
      label: "Rejected Requests",
      icon: <FaTimes />,
    },
    {
      to: "/my-cancelled-bookings",
      label: "Cancelled Bookings",
      icon: <MdCancel />,
    },
    {
      to: "/my-reissued",
      label: "My Reissued",
      icon: <FaExchangeAlt />,
    },
    {
      to: "/my-offline-cancellations",
      label: "Offline Cancellations",
      icon: <FaClock />,
    },
    { to: "/my-profile", label: "Profile Details", icon: <FaUser /> },
    { to: "/travel-documents", label: "Travel Documents", icon: <FaIdCard /> },
  ];

  const menus = {
    "super-admin": travelCompanyMenu,
    "travel-admin": [...travelAdminMenu, ...employeeSection],
    manager: [...managerMenu, ...employeeSection],
    employee: employeeMenu,
  };
  const activeMenu = menus[role] || [];
  const [openGroups, setOpenGroups] = useState({});

  const toggleGroup = (label) =>
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));

  const roleLabels = {
    "super-admin": "Super Admin",
    "travel-admin": "Corporate Admin",
    "corporate-super-admin": "Corporate Super Admin",
    employee: "Employee",
  };

  // ========================= UI =========================
  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-50 lg:hidden"
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
            activeMenu.map((m) =>
              m.children ? (
                <div key={m.label} className="space-y-1">
                  <button
                    onClick={() => toggleGroup(m.label)}
                    className={`w-full flex items-center justify-between px-3 py-3 rounded-md text-sm font-semibold transition-all duration-200 ${
                      openGroups[m.label]
                        ? "bg-[#0A4D68] text-white shadow-sm"
                        : "text-gray-700 hover:bg-gray-100 hover:text-[#0A4D68]"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span className="w-5 h-5 flex items-center justify-center text-lg">
                        {m.icon}
                      </span>
                      <span>{m.label}</span>
                    </span>
                    <FaChevronDown
                      className={`transition-transform ${
                        openGroups[m.label] ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {openGroups[m.label] && (
                    <div className="ml-4 border-l border-slate-200 pl-2 space-y-1">
                      {m.children.map((c) => (
                        <NavLink
                          key={c.to}
                          to={c.to}
                          onClick={() => window.innerWidth < 1024 && onClose()}
                          className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200
                            ${
                              isActive
                                ? "bg-[#0A4D68] text-white shadow-sm"
                                : "text-gray-700 hover:bg-gray-100 hover:text-[#0A4D68]"
                            }`
                          }
                        >
                          <span className="w-5 h-5 flex items-center justify-center text-lg">
                            {c.icon}
                          </span>
                          <span>{c.label}</span>
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
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
              ),
            )
          )}
        </nav>
      </aside>
    </>
  );
}
