import React, { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
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
  FaBlog,
  FaPlus,
  FaTags,
  FaChevronDown,
  FaChevronUp,
} from "react-icons/fa";
import { MdCancelScheduleSend } from "react-icons/md";

export default function Sidebar({ isOpen, onClose, role, loading }) {
  const location = useLocation();
  const [openMenus, setOpenMenus] = useState({});

  const toggleMenu = (label) => {
    setOpenMenus((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  // Automatically open parent menu if a child is active
  useEffect(() => {
    travelCompanyMenu.forEach((item) => {
      if (item.subItems) {
        const isChildActive = item.subItems.some(
          (sub) => location.pathname === sub.to,
        );
        if (isChildActive) {
          setOpenMenus((prev) => ({ ...prev, [item.label]: true }));
        }
      }
    });
  }, [location.pathname]);

  const travelCompanyMenu = [
    {
      to: "/all-corporates",
      label: "All Corporates",
      icon: <FaBuilding />,
      permission: "View Corporates",
    },
    {
      to: "/pending-corporates",
      label: "Pending Corporates",
      icon: <FaClipboardList />,
      permission: "Manage Corporates",
    },
    {
      to: "/financial-approvals",
      label: "Financial Approvals",
      icon: <FaMoneyBillWave />,
      permission: "Manage Finance",
    },
    {
      to: "/corporate-access-control",
      label: "Access Control",
      icon: <FaShieldAlt />,
      permission: "Super Admin Only",
    },
    {
      to: "/credit-status-alerts",
      label: "Credit Alerts",
      icon: <FaShieldAlt />,
      permission: "Super Admin Only",
    },
    {
      to: "/all-reissue-requests",
      label: "Reissue Requests",
      icon: <FaExchangeAlt />,
      permission: "Manage Operations",
    },
    {
      to: "/cancellation-queries",
      label: "Cancel Queries",
      icon: <MdCancelScheduleSend />,
      permission: "Manage Operations",
    },
    {
      to: "/corporate-revenue",
      label: "Corporate Revenue",
      icon: <FaCreditCard />,
      permission: "View Finance",
    },
    {
      to: "/wallet-recharge-logs",
      label: "Wallet Recharge Logs",
      icon: <FaWallet />,
      permission: "View Finance",
    },
    {
      to: "/api-configurations",
      label: "API Configurations",
      icon: <FaListAlt />,
      permission: "Super Admin Only",
    },
    {
      to: "/ops-management",
      label: "OPS Team Management",
      icon: <FaShieldAlt />,
      permission: "Super Admin Only",
    },
    {
      label: "Blog Section",
      icon: <FaBlog />,
      to: "/blog-and-articles",
      permission: "SEO Management",
    },
  ];

  const menus = {
    "super-admin": travelCompanyMenu,
    "ops-member": travelCompanyMenu.filter((m) => {
      // 1. Super Admin items are never shown to Ops Members
      if (m.permission === "Super Admin Only") return false;
      
      // 2. Public items (no permission required)
      if (!m.permission) return true;

      // 3. Check if user has the specific permission
      let permissions = [];
      try {
        const userRaw = sessionStorage.getItem("user");
        if (userRaw) {
          const user = JSON.parse(userRaw);
          permissions = user.permissions || [];
        }
      } catch (err) {
        console.error("Error parsing user permissions", err);
      }
      return permissions.includes(m.permission);
    }),
  };

  // Re-evaluating ops-member filtering logic based on your existing pattern
  const activeMenu = menus[role] || [];

  const roleLabels = {
    "super-admin": "Super Admin",
    "ops-member": "OPS Team Member",
  };

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
        <div className="p-4 flex items-center justify-between bg-[#0A4D68]">
          <h2 className="text-md font-semibold text-white tracking-wide flex items-center gap-2">
            <FaUser className="text-white/80" /> {roleLabels[role] || "User"}
          </h2>
          <button className="lg:hidden text-white" onClick={onClose}>
            <FaTimes size={16} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto mt-2 space-y-1 px-3 pb-10">
          {activeMenu.map((m) => {
            if (m.subItems) {
              const isExpanded = openMenus[m.label];
              return (
                <div key={m.label} className="space-y-1">
                  <button
                    onClick={() => toggleMenu(m.label)}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-3 rounded-md text-sm font-medium transition-all duration-200 text-gray-700 hover:bg-gray-100 hover:text-[#0A4D68]`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 flex items-center justify-center text-lg">
                        {m.icon}
                      </span>
                      <span>{m.label}</span>
                    </div>
                    {isExpanded ? (
                      <FaChevronUp size={12} />
                    ) : (
                      <FaChevronDown size={12} />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="ml-4 pl-4 border-l-2 border-gray-100 space-y-1">
                      {m.subItems.map((sub) => (
                        <NavLink
                          key={sub.to}
                          to={sub.to}
                          onClick={() => window.innerWidth < 1024 && onClose()}
                          className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-all duration-200
                            ${
                              isActive
                                ? "bg-[#0A4D68]/10 text-[#0A4D68] font-bold"
                                : "text-gray-600 hover:bg-gray-50 hover:text-[#0A4D68]"
                            }`
                          }
                        >
                          <span className="w-4 h-4 flex items-center justify-center text-md">
                            {sub.icon}
                          </span>
                          <span>{sub.label}</span>
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
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
            );
          })}
        </nav>
      </aside>
    </>
  );
}
