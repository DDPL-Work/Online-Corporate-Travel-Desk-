import { FiChevronDown, FiMapPin, FiBriefcase, FiCalendar, FiTrendingUp, FiUser, FiHome, FiBarChart2 } from "react-icons/fi";
import { MdOutlineFlight, MdOutlineHotel } from "react-icons/md";
import { FcApproval } from "react-icons/fc";
import { RiBriefcaseLine, RiUserLine } from "react-icons/ri";
import { BsBell } from "react-icons/bs";
import logo from '../../public/logo-traveamer.svg';
import AuthModal from "../Pages/Auth/AuthModal";
import { LuWorkflow, LuPlane } from "react-icons/lu";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logoutUser } from "../Redux/Slice/authSlice";
import { useEffect, useRef, useState } from "react";

/* ── Dropdown Data ── */
const platformLinks = [
  {
    icon: <MdOutlineFlight size={18} className="text-[#C9A84C]" />,
    label: "Flight Booking",
    desc: "Search & book flights in under 60 seconds",
    href: "/platform/flight-booking-info",
  },
  {
    icon: <MdOutlineHotel size={18} className="text-[#C9A84C]" />,
    label: "Hotel Booking",
    desc: "Find and book hotels tagged to your client",
    href: "/platform/hotel-booking-info",
  },
  {
  icon: <LuWorkflow size={18} className="text-[#C9A84C]" />,
  label: "Approval & Workflow",
  desc: "Manage booking approvals and track request workflows",
  href: "/platform/approval-and-workflow",
}
];

const whoItsForLinks = [
  {
    icon: <FiUser size={18} className="text-[#C9A84C]" />,
    label: "Independent Professionals",
    desc: "CAs, consultants, architects & freelancers",
    href: "/who-it's-for/independent",
  },
  {
    icon: <FiBriefcase size={18} className="text-[#C9A84C]" />,
    label: "Small Business",
    desc: "Manage client meetings and local travel efficiently",
    href: "/who-it's-for/small-business",
  },
  {
    icon: <FiTrendingUp size={18} className="text-[#C9A84C]" />,
    label: "Growing Business",
    desc: "Track travel expenses across teams and projects",
    href: "/who-it's-for/growing-business",
  },
  {
    icon: <FiBarChart2 size={18} className="text-[#C9A84C]" />,
    label: "Mid-size Business",
    desc: "Control travel budgets and client-level billing",
    href: "/who-it's-for/mid-size-business",
  },
];

/* ── Dropdown Component ── */
function NavDropdown({ label, items, isOpen, onToggle, dropdownRef }) {
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={onToggle}
        className={`flex items-center gap-1 text-sm font-medium font-['Plus_Jakarta_Sans'] transition-colors ${
          isOpen ? "text-[#C9A84C]" : "text-[#000D26] hover:text-[#C9A84C]"
        }`}
      >
        {label}
        <FiChevronDown
          size={13}
          className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-[calc(100%+12px)] left-1/2 -translate-x-1/2 w-[280px] bg-white rounded-2xl shadow-[0px_8px_32px_rgba(0,0,0,0.12)] border border-gray-100 overflow-hidden z-50">
          {/* Arrow pointer */}
          <div className="absolute -top-[6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-l border-t border-gray-100 rotate-45" />

          <div className="p-2">
            {items.map(({ icon, label, desc, href }) => (
              <a
                key={label}
                href={href}
                className="flex items-start gap-3 px-3 py-3 rounded-xl hover:bg-[#C9A84C]/8 group transition-colors"
              >
                <div className="w-8 h-8 min-w-[32px] bg-[#C9A84C]/10 rounded-lg flex items-center justify-center mt-0.5 group-hover:bg-[#C9A84C]/15 transition-colors">
                  {icon}
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[#000D26] text-sm font-semibold font-['Plus_Jakarta_Sans'] leading-5 group-hover:text-[#C9A84C] transition-colors">
                    {label}
                  </span>
                  <span className="text-stone-400 text-xs font-normal font-['Plus_Jakarta_Sans'] leading-4">
                    {desc}
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main Header ── */
export default function LandingHeader() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((s) => s.auth);
  const { publicBranding } = useSelector((s) => s.landingPage);
  const branding = publicBranding;

  const [openMenu, setOpenMenu] = useState(null); // "platform" | "whoFor" | null
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobilePlatformOpen, setMobilePlatformOpen] = useState(false);
  const [mobileWhoOpen, setMobileWhoOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authStep, setAuthStep] = useState(0); // initial step for AuthModal
  const [showInactiveModal, setShowInactiveModal] = useState(false);
  const [inactiveMessage, setInactiveMessage] = useState(
    "Your account is currently disabled. Please contact your administrator.",
  );
  const [scrolled, setScrolled] = useState(false);

  const platformRef = useRef(null);
  const whoForRef = useRef(null);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const handleLogout = () => {
    dispatch(logoutUser());
    navigate("/login");
  };

  let dashboardRoute = "/my-bookings";
  if (user?.role === "travel-admin") dashboardRoute = "/total-bookings";
  else if (user?.role === "manager") dashboardRoute = "/manager/total-bookings";

  const GOLD = "#C9A84C";
  const C = {
    navy: "#000D26",
    navyDeep: "#04112F",
    white: "#FFFFFF",
    border: "#E1E7EF",
  };

  /* Close dropdown on outside click */
  useEffect(() => {
    function handleClick(e) {
      if (
        platformRef.current && !platformRef.current.contains(e.target) &&
        whoForRef.current && !whoForRef.current.contains(e.target)
      ) {
        setOpenMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Listen for global inactive-account event (optional trigger from auth logic)
  useEffect(() => {
    const handler = (e) => {
      const msg =
        e?.detail?.message ||
        "You cannot continue with SSO until your account is reactivated.";
      setInactiveMessage(msg);
      setShowInactiveModal(true);
      setShowAuth(false);
    };
    window.addEventListener("auth:inactive", handler);
    return () => window.removeEventListener("auth:inactive", handler);
  }, []);

  // On mount, check persisted inactive flag from SSO (in case event fired before header existed)
  useEffect(() => {
    try {
      const msg = sessionStorage.getItem("auth_inactive_msg");
      if (msg) {
        setInactiveMessage(msg);
        setShowInactiveModal(true);
        setShowAuth(false);
        sessionStorage.removeItem("auth_inactive_msg");
      }
    } catch (_) {}
  }, []);

  const toggle = (menu) => setOpenMenu((prev) => (prev === menu ? null : menu));

  return (
    <header className="w-full px-6 py-4 bg-[#F5F5F5] flex justify-between items-center z-50 sticky top-0 shadow-sm">

      {/* Logo */}
      <div
        className="flex items-center cursor-pointer"
        onClick={() => {
          if (isAuthenticated) {
            navigate("/travel");
          } else {
            navigate("/platform/flight-booking-info");
          }
        }}
      >
        {isAuthenticated && branding?.branding?.logo?.url ? (
          <img
            src={branding.branding.logo.url}
            alt={branding.corporateName || "Logo"}
            className="h-8 object-contain"
          />
        ) : (
          <img src={logo} alt="Traveamer" className="h-7" />
        )}
      </div>

      {/* Desktop Nav */}
      {!isAuthenticated && (
        <nav className="hidden md:flex items-center gap-8">
          <NavDropdown
            label="Platform"
            items={platformLinks}
            isOpen={openMenu === "platform"}
            onToggle={() => toggle("platform")}
            dropdownRef={platformRef}
          />
          <NavDropdown
            label="Who It's For"
            items={whoItsForLinks}
            isOpen={openMenu === "whoFor"}
            onToggle={() => toggle("whoFor")}
            dropdownRef={whoForRef}
          />
        </nav>
      )}

      {/* CTA Buttons / Auth State */}
      <div className="hidden md:flex items-center gap-4">
        {isAuthenticated && user ? (
          <div className="flex items-center gap-3">
            <button
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:bg-black/5"
              style={{ color: C.navy }}
            >
              <BsBell size={18} />
            </button>

            <div className="relative group">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer font-bold text-sm transition-all"
                style={{
                  background: GOLD,
                  color: C.navy,
                  border: `2px solid ${C.navyDeep}`,
                }}
              >
                {user?.name?.firstName?.charAt(0)?.toUpperCase() || "E"}
              </div>
              {/* Hover Dropdown */}
              <div
                className="absolute right-0 top-full mt-2 w-48 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all overflow-hidden z-50"
                style={{
                  background: C.white,
                  border: `1px solid ${C.border}`,
                }}
              >
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                  <p className="text-sm font-bold text-gray-800 truncate leading-tight">
                    {user?.name?.firstName} {user?.name?.lastName}
                  </p>
                  <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mt-1">
                    {user?.role?.replace("-", " ")}
                  </p>
                </div>
                <button
                  onClick={() => navigate(dashboardRoute)}
                  className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2 border-none cursor-pointer"
                >
                  <RiBriefcaseLine size={15} /> Dashboard
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2 border-none cursor-pointer"
                >
                  <RiUserLine size={15} /> Sign Out
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <button
              onClick={() => {
                setAuthStep(0); // login flow start
                setShowAuth(true);
              }}
              className="text-black text-sm font-medium font-['Plus_Jakarta_Sans'] hover:text-[#C9A84C] transition-colors"
            >
              Login
            </button>
            <button
              onClick={() => {
                setAuthStep(1); // start at step 1 for sign up
                setShowAuth(true);
              }}
              className="h-10 px-5 bg-[#C9A84C] text-black text-sm font-medium font-['Plus_Jakarta_Sans'] rounded-full shadow-[0px_0px_40px_0px_rgba(60,131,246,0.15)] hover:bg-[#b8963d] transition-colors"
            >
              Sign Up
            </button>
          </>
        )}
      </div>

      {/* Mobile toggle */}
      <button
        className="md:hidden text-[#000D26]"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        <div className="w-5 flex flex-col gap-1">
          <span className="block h-0.5 bg-current" />
          <span className="block h-0.5 bg-current" />
          <span className="block h-0.5 bg-current" />
        </div>
      </button>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="absolute top-full left-0 w-full bg-[#F5F5F5] shadow-lg md:hidden flex flex-col gap-1 p-4 z-50">

          {/* Nav Links - Only show if guest */}
          {!isAuthenticated && (
            <>
              {/* Platform accordion */}
              <button
                onClick={() => setMobilePlatformOpen(!mobilePlatformOpen)}
                className="flex items-center justify-between w-full px-3 py-2.5 text-[#000D26] text-sm font-medium font-['Plus_Jakarta_Sans'] rounded-xl hover:bg-black/5 transition-colors"
              >
                Platform
                <FiChevronDown
                  size={13}
                  className={`transition-transform duration-200 ${mobilePlatformOpen ? "rotate-180" : ""}`}
                />
              </button>
              {mobilePlatformOpen && (
                <div className="pl-3 pb-1 flex flex-col gap-1">
                  {platformLinks.map(({ icon, label, href }) => (
                    <a
                      key={label}
                      href={href}
                      className="flex items-center gap-2.5 px-3 py-2 text-[#000D26] text-sm font-['Plus_Jakarta_Sans'] rounded-lg hover:bg-[#C9A84C]/10 transition-colors"
                    >
                      {icon} {label}
                    </a>
                  ))}
                </div>
              )}

              {/* Who It's For accordion */}
              <button
                onClick={() => setMobileWhoOpen(!mobileWhoOpen)}
                className="flex items-center justify-between w-full px-3 py-2.5 text-[#000D26] text-sm font-medium font-['Plus_Jakarta_Sans'] rounded-xl hover:bg-black/5 transition-colors"
              >
                Who It's For
                <FiChevronDown
                  size={13}
                  className={`transition-transform duration-200 ${mobileWhoOpen ? "rotate-180" : ""}`}
                />
              </button>
              {mobileWhoOpen && (
                <div className="pl-3 pb-1 flex flex-col gap-1">
                  {whoItsForLinks.map(({ icon, label, href }) => (
                    <a
                      key={label}
                      href={href}
                      className="flex items-center gap-2.5 px-3 py-2 text-[#000D26] text-sm font-['Plus_Jakarta_Sans'] rounded-lg hover:bg-[#C9A84C]/10 transition-colors"
                    >
                      {icon} {label}
                    </a>
                  ))}
                </div>
              )}
            </>
          )}

          <hr className="border-gray-200 my-1" />

          {isAuthenticated && user ? (
            <div className="flex flex-col gap-1">
              <div className="px-3 py-3 bg-white/40 rounded-xl mb-1">
                <p className="text-sm font-bold text-gray-800 leading-tight">
                  {user?.name?.firstName} {user?.name?.lastName}
                </p>
                <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mt-0.5">
                  {user?.role?.replace("-", " ")}
                </p>
              </div>
              <button
                onClick={() => {
                  navigate(dashboardRoute);
                  setMobileOpen(false);
                }}
                className="flex items-center gap-2 px-3 py-2.5 text-[#000D26] text-sm font-medium font-['Plus_Jakarta_Sans'] rounded-xl hover:bg-black/5 transition-colors"
              >
                <RiBriefcaseLine size={16} /> Dashboard
              </button>
              <button
                onClick={() => {
                  handleLogout();
                  setMobileOpen(false);
                }}
                className="flex items-center gap-2 px-3 py-2.5 text-red-600 text-sm font-bold font-['Plus_Jakarta_Sans'] rounded-xl hover:bg-red-50 transition-colors"
              >
                <RiUserLine size={16} /> Sign Out
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => {
                  setAuthStep(0);
                  setShowAuth(true);
                  setMobileOpen(false);
                }}
                className="text-left px-3 py-2.5 text-black text-sm font-medium font-['Plus_Jakarta_Sans'] rounded-xl hover:bg-black/5 transition-colors"
              >
                Login
              </button>
              <button
                onClick={() => {
                  setAuthStep(1);
                  setShowAuth(true);
                  setMobileOpen(false);
                }}
                className="w-full px-5 py-2.5 bg-[#C9A84C] text-black text-sm font-medium font-['Plus_Jakarta_Sans'] rounded-full hover:bg-[#b8963d] transition-colors"
              >
                Sign Up
              </button>
            </>
          )}
        </div>
      )}

      {/* Auth Modal */}
      {showAuth && <AuthModal initialStep={authStep} onClose={() => setShowAuth(false)} />}

      {/* Inactive account modal */}
      {showInactiveModal && (
        <div className="fixed inset-0 z-[99] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center text-lg font-bold">
                !
              </div>
              <div>
                <p className="text-lg font-black text-slate-900">
                  Access Disabled
                </p>
                <p className="text-xs text-slate-500">
                  You cannot continue with SSO until your account is reactivated.
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">
              {inactiveMessage}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowInactiveModal(false);
                  setShowAuth(true);
                }}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
