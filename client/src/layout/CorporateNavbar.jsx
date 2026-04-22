import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logoutUser } from "../Redux/Slice/authSlice";
import { LuPlane } from "react-icons/lu";
import { BsBell } from "react-icons/bs";
import { RiBriefcaseLine, RiUserLine } from "react-icons/ri";

// Theme Constants (Mirrored from Landing page for consistency)
const C = {
  navy:      "#000D26",
  navyDeep:  "#04112F",
  navyMid:   "#0A243D",
  white:     "#FFFFFF",
  border:    "#E1E7EF",
};
const GOLD = "#C9A240";

export const CorporateNavbar = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((s) => s.auth);
  const { publicBranding } = useSelector((s) => s.landingPage);
  
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const handleLogout = () => {
    dispatch(logoutUser());
    navigate("/login");
  };

  const NAV_LINKS = ["Policies", "How to Book", "Support", "FAQ"];

  let dashboardRoute = "/my-bookings";
  if (user?.role === "travel-admin") dashboardRoute = "/total-bookings";
  else if (user?.role === "manager") dashboardRoute = "/manager/total-bookings";

  return (
    <>
      <nav className="sticky top-0 z-50 transition-all duration-200"
        style={{
          background: C.navy,
          borderBottom: `3px solid ${GOLD}`,
          boxShadow: scrolled ? "0 4px 24px rgba(0,13,38,0.18)" : "none",
        }}>
        <div className="max-w-full mx-auto px-6 md:px-8 h-16 flex items-center justify-between">

          {/* Logo Section */}
          <div className="flex items-center gap-3 cursor-pointer" 
            onClick={() => {
              const slug = publicBranding?.companySlug;
              if (slug) navigate(`/travel`);
              else navigate("/");
            }}>
            {publicBranding?.branding?.logo?.url ? (
              <img src={publicBranding.branding.logo.url} alt="Logo"
                className="h-8 object-contain" />
            ) : (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: GOLD }}>
                <LuPlane size={15} style={{ color: C.navy }} />
              </div>
            )}
          </div>

          {/* Desktop nav links */}
          {/* <div className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map(l => (
              <a key={l} href="#"
                className="px-4 py-2 rounded-lg text-xs font-semibold transition-all hover:bg-white/10"
                style={{ color: "rgba(255,255,255,0.65)", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                {l}
              </a>
            ))}
          </div> */}

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <button className="w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:bg-white/10"
              style={{ color: "rgba(255,255,255,0.55)" }}>
              <BsBell size={16} />
            </button>
            
            {/* Mobile hamburger */}
            {/* <button className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:bg-white/10"
              style={{ color: "rgba(255,255,255,0.55)" }}
              onClick={() => setMobileOpen(o => !o)}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                <rect y="0" width="18" height="2" rx="1"/>
                <rect y="8" width="18" height="2" rx="1"/>
                <rect y="16" width="18" height="2" rx="1"/>
              </svg>
            </button> */}

            {isAuthenticated && user ? (
              <div className="relative ml-2 group">
                <div className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer font-bold text-sm transition-all"
                  style={{ background: GOLD, color: C.navy, border: `2px solid ${C.navyDeep}` }}>
                  {user?.name?.firstName?.charAt(0)?.toUpperCase() || "E"}
                </div>
                {/* Hover Dropdown */}
                <div className="absolute right-0 top-full mt-2 w-48 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all overflow-hidden"
                  style={{ background: C.white, border: `1px solid ${C.border}` }}>
                  <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                    <p className="text-sm font-bold text-gray-800 truncate leading-tight">{user?.name?.firstName} {user?.name?.lastName}</p>
                    <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mt-1">{user?.role?.replace("-", " ")}</p>
                  </div>
                  <button onClick={() => navigate(dashboardRoute)} className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2 border-none cursor-pointer">
                    <RiBriefcaseLine size={15} /> Dashboard
                  </button>
                  <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2 border-none cursor-pointer">
                    <RiUserLine size={15} /> Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => navigate("/login")}
                className="h-9 px-5 rounded-lg text-sm font-bold transition-all hover:opacity-90 active:scale-95 flex items-center gap-1.5 border-none cursor-pointer"
                style={{ background: GOLD, color: C.navy }}>
                Sign In
              </button>
            )}
          </div>
        </div>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="lg:hidden border-t px-6 py-4 flex flex-col gap-1"
            style={{ borderColor: "rgba(255,255,255,0.08)", background: C.navyMid }}>
            {/* {NAV_LINKS.map(l => (
              <a key={l} href="#"
                className="block px-3 py-2.5 rounded-lg text-sm font-semibold transition-all hover:bg-white/5"
                style={{ color: "rgba(255,255,255,0.7)" }}>
                {l}
              </a>
            ))} */}
            {!isAuthenticated && (
              <button 
                onClick={() => navigate("/login")}
                className="w-full mt-2 py-2.5 rounded-lg text-sm font-bold text-center"
                style={{ background: GOLD, color: C.navy }}>
                Sign In
              </button>
            )}
          </div>
        )}
      </nav>
    </>
  );
};
