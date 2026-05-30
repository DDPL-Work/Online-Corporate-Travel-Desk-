import React, { useEffect, useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  FaClipboardList,
  FaTimes,
  FaWallet,
  FaCreditCard,
  FaBuilding,
  FaMoneyBillWave,
  FaExchangeAlt,
  FaListAlt,
  FaUserShield,
  FaUserCog,
  FaBlog,
  FaChevronDown,
  FaUsers,
  FaBell,
  FaFileInvoiceDollar,
  FaBan,
  FaQuestionCircle,
  FaServer,
  FaUser,
  FaSignOutAlt,
  FaPercent,
  FaChartLine,
} from "react-icons/fa";

import {
  MdManageAccounts,
  MdOutlinePendingActions,
  MdCancelScheduleSend,
} from "react-icons/md";
import { canAccessMenuItem, DASHBOARD_ROLES, OPS_PERMISSIONS } from "../constants/rbac";
import { logoutUser } from "../Redux/Slice/authSlice";

export const C = {
  navy: "#000D26",
  navyDeep: "#04112F",
  navyMid: "#0A243D",
  navyDark: "#102238",
  gold: "#C9A240",
  amber: "#D97706",
  emerald: "#059669",
  muted: "#65758B",
  border: "#E1E7EF",
  lightGray: "#F5F5F5",
  offWhite: "#F8FAFC",
  cream: "#FFFBEB",
  white: "#FFFFFF",
  black: "#000000",
  nearBlack: "#1A1714",
};

export default function Sidebar({ isOpen, onClose, role, permissions = [] }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState({});

  const { user } = useSelector((state) => state.auth || {});

  const toggleGroup = (label) => {
    setOpenGroups((prev) => ({
      [label]: !prev[label],
    }));
  };

  const handleLogout = () => {
    dispatch(logoutUser());
    navigate("/login", { replace: true });
  };

  const superAdminMenu = [
    {
      label: "Corporate Management",
      icon: <FaBuilding />,
      subItems: [
        {
          to: "/all-corporates",
          label: "All Corporates",
          icon: <FaBuilding />,
        },
        {
          to: "/pending-corporates",
          label: "Pending Corporates",
          icon: <MdOutlinePendingActions />,
        },
        {
          to: "/corporate-access-control",
          label: "Access Control",
          icon: <FaUserShield />,
        },
      ],
    },

    {
      label: "Booking Operations",
      icon: <FaClipboardList />,
      subItems: [
        {
          to: "/bookings-summary",
          label: "Bookings Summary",
          icon: <FaClipboardList />,
        },
        {
          to: "/all-reissue-requests",
          label: "Reissue Requests",
          icon: <FaExchangeAlt />,
        },
        {
          to: "/cancellation-summary",
          label: "Cancellation Summary",
          icon: <FaBan />,
        },
        {
          to: "/cancellation-queries",
          label: "Cancel Queries",
          icon: <FaQuestionCircle />,
        },
      ],
    },

    {
      label: "Finance",
      icon: <FaWallet />,
      subItems: [
        {
          to: "/corporate-revenue",
          label: "Corporate Revenue",
          icon: <FaFileInvoiceDollar />,
        },
        {
          to: "/wallet-recharge-logs",
          label: "Wallet Recharge Logs",
          icon: <FaWallet />,
        },
        {
          to: "/credit-status-alerts",
          label: "Credit Alerts",
          icon: <FaBell />,
        },
      ],
    },

    {
      label: "Pricing & Yield",
      icon: <FaChartLine />,
      subItems: [
        {
          to: "/global-markup-engine",
          label: "Markup Engine",
          icon: <FaPercent />,
        },
      ],
    },

    {
      label: "Administration",
      icon: <FaUserShield />,
      subItems: [
        {
          to: "/ops-management",
          label: "OPS Team Management",
          icon: <FaUsers />,
        },
        {
          to: "/api-configurations",
          label: "API Configurations",
          icon: <FaServer />,
        },
      ],
    },

    {
      label: "Content",
      icon: <FaBlog />,
      subItems: [
        {
          to: "/blog-and-articles",
          label: "Blog Section",
          icon: <FaBlog />,
        },
      ],
    },
  ];

  // Automatically open parent menu if a child is active
  useEffect(() => {
    const activeParent = superAdminMenu.find((item) =>
      item.subItems?.some((sub) => location.pathname === sub.to)
    );

    if (activeParent) {
      setOpenGroups({
        [activeParent.label]: true,
      });
    }
  }, [location.pathname]);

  const menus = {
    "super-admin": superAdminMenu,
    "ops-member": superAdminMenu.filter((item) =>
      canAccessMenuItem({
        role,
        permissions,
        requiredPermissions: item.requiredPermissions,
        superAdminOnly: item.superAdminOnly,
      }),
    ),
  };

  const activeMenu = menus[role] || [];

  const roleLabels = {
    [DASHBOARD_ROLES.SUPER_ADMIN]: "Super Admin",
    [DASHBOARD_ROLES.OPS_MEMBER]: "OPS Team Member",
  };

  return (
    <aside
      className={`fixed top-0 left-0 h-screen z-100 flex flex-col transition-all duration-300 shadow-2xl border-r
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
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
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
          className="text-slate-400 hover:text-white transition-colors shrink-0"
          onClick={onClose}
        >
          <FaTimes size={18} />
        </button>
      </div>

      {/* ====== NAVIGATION ====== */}
      <nav className="flex-1 overflow-y-auto mt-4 space-y-1.5 px-4 custom-scrollbar overflow-x-hidden">
        {activeMenu.map((m) =>
          m.subItems ? (
            <div key={m.label} className="space-y-1">
              <button
                onClick={() => toggleGroup(m.label)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200
                  ${openGroups[m.label]
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
                    className="w-5 h-5 flex items-center justify-center text-lg shrink-0"
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
                  className={`transition-transform duration-300 ${openGroups[m.label] ? "rotate-180" : ""} shrink-0`}
                  style={{ color: openGroups[m.label] ? C.gold : "inherit" }}
                />
              </button>
              {openGroups[m.label] && (
                <div
                  className="ml-4 border-l pl-3 space-y-1 mt-1"
                  style={{ borderColor: `${C.gold}22` }}
                >
                  {m.subItems.map((sub) => (
                    <NavLink
                      key={sub.to}
                      to={sub.to}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-lg text-[12px] font-medium transition-all duration-200
                        ${isActive
                          ? "text-white"
                          : "text-slate-400 hover:bg-white/5 hover:text-white"
                        }`
                      }
                      style={({ isActive }) => ({
                        background: isActive ? C.gold : "transparent",
                        color: isActive ? C.navy : undefined,
                      })}
                    >
                      <span className="w-4 h-4 flex items-center justify-center text-md shrink-0">
                        {sub.icon}
                      </span>
                      <span>{sub.label}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <NavLink
              key={m.to || m.label}
              to={m.to || "#"}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200
                ${isActive
                  ? "text-white"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`
              }
              style={({ isActive }) => ({
                background: isActive ? C.gold : "transparent",
                color: isActive ? C.navy : undefined,
              })}
            >
              <span className="w-5 h-5 flex items-center justify-center text-lg shrink-0">
                {m.icon}
              </span>
              <span>{m.label}</span>
            </NavLink>
          ),
        )}
      </nav>

      {/* Sidebar User Profile Footer */}
      <div
        className="p-4 border-t mt-auto"
        style={{ borderColor: `${C.gold}11` }}
      >
        <div className="flex items-center gap-5">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-lg shrink-0"
            style={{ background: C.gold, color: C.navy }}
          >
            {typeof user?.name === "string" && user.name.length > 0
              ? user.name.charAt(0).toUpperCase()
              : (user?.name?.firstName?.charAt(0).toUpperCase() || "S")}
          </div>
          <div className="flex flex-col min-w-0">
            <p className="text-sm font-bold text-white truncate leading-tight">
              {typeof user?.name === "string"
                ? user.name
                : (user?.name?.firstName ? `${user.name.firstName} ${user.name.lastName || ""}` : "Super Admin")}
            </p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1 truncate">
              {roleLabels[role] || "System Admin"}
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
      {/* <div
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
            </div> */}
    </aside>
  );
}
