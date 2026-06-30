import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
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
  FaFileExcel,
  FaChevronDown,
  FaPlane,
  FaHotel,
  FaSignOutAlt,
} from "react-icons/fa";
import { MdCancel } from "react-icons/md";
import { GrProjects, GrUserManager } from "react-icons/gr";
import { SiHomepage } from "react-icons/si";
import { MdAirlineSeatReclineNormal } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import { fetchCorporateAdmin } from "../Redux/Slice/corporateAdminSlice";
import { logoutUser } from "../Redux/Slice/authSlice";
import { C } from "../components/Shared/color";
import api from "../API/axios";

export default function Sidebar({ isOpen, onClose }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = useMemo(() => {
    if (location.state?.activeTab) return location.state.activeTab;
    const path = location.pathname.toLowerCase();
    if (path.includes("hotel")) return "hotel";
    if (path.includes("flight")) return "flight";
    return "flight";
  }, [location]);
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
  const { user } = useSelector((state) => state.auth);
  const classification = corporate?.classification;

  useEffect(() => {
    if ((role === "travel-admin" || role === "finance_team") && !corporate) {
      dispatch(fetchCorporateAdmin());
    }
  }, [role, corporate, dispatch]);

  const [hasPendingTransfers, setHasPendingTransfers] = useState(false);

  useEffect(() => {
    if (token && role === "finance_team") {
      api.get("/approvals/second-approver/check")
        .then((res) => {
          setHasPendingTransfers(res.data.data.hasPending);
        })
        .catch(console.error);
    }
  }, [token, location.pathname, role]);

  const handleLogout = () => {
    dispatch(logoutUser());
    const storedSlug = localStorage.getItem("companySlug");
    if (storedSlug) {
      navigate(`/${storedSlug}`);
    } else {
      navigate("/platform/flight-booking-info");
    }
  };

  // ========================= MENUS =========================
  const travelAdminMenu = useMemo(() => {
    const menu = [
      {
        to: "/project-management",
        label: "Project Management",
        icon: <FaFileExcel />,
      },
      {
        to: "/projects-table",
        label: "Project Expenditures",
        icon: <GrProjects />,
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
      {
        to: "/ssr-management",
        label: "SSR Management",
        icon: <MdAirlineSeatReclineNormal />,
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
        to: "/corporate-profile",
        label: "Corporate Profile",
        icon: <FaBuilding />,
      },
      {
        to: "/branding-settings",
        label: "Branding & Landing Page",
        icon: <SiHomepage />,
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
            to: "/my-reissued?scope=company",
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
    );
    return menu;
  }, [classification]);

  const financeTeamMenu = useMemo(() => {
    const menu = [];
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
        to: "/travel-profile-settings",
        label: "Corporate Profile",
        icon: <FaBuilding />,
      }
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
        {
          to: "/my-upcoming-trips",
          label: "Upcoming Trips",
          icon: <FaClock />,
        },
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
        { to: "/my-reissued", label: "My Reissued", icon: <FaExchangeAlt /> },
        {
          to: "/my-offline-cancellations",
          label: "Offline Cancellations",
          icon: <FaClock />,
        },
      ],
    },
    { to: "/my-profile", label: "My Profile", icon: <FaUser /> },
  ];

  const managerMenu = useMemo(
    () => [
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
            to: "/my-reissued?scope=company",
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
    ],
    [],
  );

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
    { to: "/my-reissued", label: "My Reissued", icon: <FaExchangeAlt /> },
    {
      to: "/my-offline-cancellations",
      label: "Offline Cancellations",
      icon: <FaClock />,
    },
    { to: "/my-profile", label: "My Profile", icon: <FaUser /> },
  ];

  const transferredMenu = hasPendingTransfers ? [{
    to: "/second-approver-requests",
    label: "Transferred to Me",
    icon: <FaExchangeAlt />,
  }] : [];

  const menus = {
    "super-admin": [...transferredMenu, ...travelCompanyMenu],
    "travel-admin": [...transferredMenu, ...travelAdminMenu, ...employeeSection],
    manager: [...transferredMenu, ...managerMenu, ...employeeSection],
    employee: [...transferredMenu, ...employeeMenu],
    finance_team: [...transferredMenu, ...financeTeamMenu, ...employeeSection],
  };
  const activeMenu = menus[role] || [];
  const [openGroups, setOpenGroups] = useState({});

  const toggleGroup = (label) =>
    setOpenGroups((prev) => ({
      [label]: !prev[label]
    }));

  const roleLabels = {
    "super-admin": "Super Admin",
    "travel-admin": "Corporate Admin",
    "corporate-super-admin": "Corporate Super Admin",
    employee: "Employee",
    finance_team: "Finance Team",
  };

  return createPortal(
    <div className={`fixed inset-0 z-[99999] transition-opacity duration-300 ${isOpen ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"}`}>
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close sidebar"
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-[1px] w-full h-full border-none cursor-default"
        onClick={onClose}
      />
    <aside
      className={`absolute top-0 left-0 h-screen flex flex-col transition-transform duration-300 shadow-2xl border-r
        ${isOpen ? "w-64 translate-x-0" : "w-64 -translate-x-full"}`}
      style={{
        background: C.navyDeep,
        borderColor: `${C.gold}33`,
      }}
    >
      {/* ====== BRAND / HEADER ====== */}
      <div
        className="p-5 flex items-center justify-between border-b"
        style={{ borderColor: `${C.gold}22` }}
      >
        <h2 className="text-sm font-bold text-white tracking-widest uppercase flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: `${C.gold}22` }}
          >
            <FaUser style={{ color: C.gold }} />
          </div>
          <div className="flex flex-col">
            <span style={{ color: C.gold }}>{roleLabels[role] || "User"}</span>
            <span className="text-[9px] text-slate-400 normal-case tracking-normal">
              Dashboard Access
            </span>
          </div>
        </h2>
        <button
          className="text-slate-400 hover:text-white transition-colors"
          onClick={onClose}
        >
          <FaTimes size={18} />
        </button>
      </div>

      {/* ====== FLIGHT / HOTEL TOGGLE (Mobile Only: sm:hidden) ====== */}
      <div className="px-4 py-3 sm:hidden border-b shrink-0" style={{ borderColor: `${C.gold}11` }}>
        <div className="flex items-center rounded-full p-1 border border-white/10" style={{ background: "#05163D" }}>
          <button
            onClick={() => {
              navigate("/travel", { state: { activeTab: "flight" } });
              onClose();
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-full transition-all duration-300 ${
              activeTab === "flight"
                ? "bg-[#C9A240] text-black shadow-md shadow-[#C9A240]/20"
                : "text-slate-400 hover:text-white bg-transparent"
            }`}
          >
            <FaPlane size={14} />
            <span>Flight</span>
          </button>
          <button
            onClick={() => {
              navigate("/travel", { state: { activeTab: "hotel" } });
              onClose();
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-full transition-all duration-300 ${
              activeTab === "hotel"
                ? "bg-[#C9A240] text-black shadow-md shadow-[#C9A240]/20"
                : "text-slate-400 hover:text-white bg-transparent"
            }`}
          >
            <FaHotel size={14} />
            <span>Hotel</span>
          </button>
        </div>
      </div>

      {/* ====== NAVIGATION ====== */}
      <nav className="flex-1 overflow-y-auto mt-4 space-y-1.5 px-4 custom-scrollbar">
        {role === "travel-admin" && loading ? (
          <div className="text-center text-slate-500 py-6 text-xs uppercase tracking-widest">
            Loading...
          </div>
        ) : (
          activeMenu.map((m) =>
            m.children ? (
              <div key={m.label} className="space-y-1">
                <button
                  onClick={() => toggleGroup(m.label)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200 group
                    ${
                      openGroups[m.label]
                        ? "text-white"
                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                    }`}
                  style={{
                    background: openGroups[m.label]
                      ? `${C.gold}22`
                      : "transparent",
                  }}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className="w-5 h-5 flex items-center justify-center text-lg"
                      style={{
                        color: openGroups[m.label] ? C.gold : "inherit",
                      }}
                    >
                      {m.icon}
                    </span>
                    <span>{m.label}</span>
                  </span>
                  <FaChevronDown
                    size={12}
                    className={`transition-transform duration-300 ${openGroups[m.label] ? "rotate-180" : ""}`}
                    style={{ color: openGroups[m.label] ? C.gold : "inherit" }}
                  />
                </button>
                {openGroups[m.label] && (
                  <div
                    className="ml-4 border-l pl-3 space-y-1 mt-1"
                    style={{ borderColor: `${C.gold}22` }}
                  >
                    {m.children.map((c) => (
                      <NavLink
                        key={c.to}
                        to={c.to}
                        onClick={onClose}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2 rounded-lg text-[12px] font-medium transition-all duration-200
                          ${
                            isActive
                              ? "text-white"
                              : "text-slate-400 hover:bg-white/5 hover:text-white"
                          }`
                        }
                        style={({ isActive }) => ({
                          background: isActive ? C.gold : "transparent",
                          color: isActive ? C.navy : undefined,
                        })}
                      >
                        <span className="w-4 h-4 flex items-center justify-center text-md">
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
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200
                  ${
                    isActive
                      ? "text-white"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`
                }
                style={({ isActive }) => ({
                  background: isActive ? C.gold : "transparent",
                  color: isActive ? C.navy : undefined,
                })}
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

      {/* Sidebar User Profile Footer */}
      <div
        className="p-4 border-t mt-auto"
        style={{ borderColor: `${C.gold}11` }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-lg shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
            style={{ background: C.gold, color: C.navy }}
            onClick={() => navigate("/my-profile")}
            title="My Profile"
          >
            {user?.name?.firstName?.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <p className="text-sm font-bold text-white truncate leading-tight">
              {user?.name?.firstName} {user?.name?.lastName}
            </p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1 truncate">
              {user?.role?.replace("-", " ")}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-red-400 hover:text-white hover:bg-red-500/20 transition-colors shrink-0"
            title="Sign Out"
          >
            <FaSignOutAlt size={14} />
          </button>
        </div>
      </div>
    </aside>
    </div>,
    document.body
  );
}
