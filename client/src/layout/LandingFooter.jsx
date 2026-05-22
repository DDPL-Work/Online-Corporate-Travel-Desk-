import { useSelector } from "react-redux";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { FaPlane, FaHotel } from "react-icons/fa";
import { 
  FiSearch, 
  FiCalendar, 
  FiCheckSquare, 
  FiInfo, 
  FiHelpCircle, 
  FiBookOpen, 
  FiAirplay, 
  FiBriefcase, 
  FiFileText, 
  FiShield, 
  FiUserCheck, 
  FiPhone 
} from "react-icons/fi";
const logo = "/logo-traveamer.svg";
import { useFlightSearch } from "../context/FlightSearchContext";

export default function LandingFooter({ onTabChange }) {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useSelector((s) => s.auth);
  const { publicBranding } = useSelector((s) => s.landingPage);
  const branding = publicBranding;
  const { setActiveTab } = useFlightSearch();

  const handleSearchClick = (tab) => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setActiveTab(tab);
    }
    navigate(`/travel`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const GOLD = "#C9A84C";
  const GOLD_10 = "rgba(201,162,64,0.10)";
  const GOLD_20 = "rgba(201,162,64,0.20)";
  const C = {
    navy: "#000D26",
    navyDeep: "#04112F",
    navyDark: "#102238",
    nearBlack: "#0C0C0C",
    white: "#FFFFFF",
    grayLight: "#F5F5F5",
    border: "#E1E7EF",
    muted: "#65758B",
  };

  const FOOTER_SECTIONS = [
    {
      head: "Quick Links",
      links: [
        { label: "Search Flights", icon: <FiSearch size={14} />, onClick: () => handleSearchClick("flight") },
        { label: "Search Hotels", icon: <FiSearch size={14} />, onClick: () => handleSearchClick("hotel") },
        { label: "My Bookings", icon: <FiCalendar size={14} />, href: "/my-bookings" },
        { label: "Pending Approvals", icon: <FiCheckSquare size={14} />, href: "/my-pending-approvals" },
      ],
    },
    {
      head: "Resources",
      links: [
        { label: "Traveamer", icon: <FiAirplay size={14} />, href: "/traveamer" },
        { label: "About Us", icon: <FiInfo size={14} />, href: "/about-us" },
        { label: "FAQs", icon: <FiHelpCircle size={14} />, href: "/faq" },
        { label: "Blog", icon: <FiBookOpen size={14} />, href: "/blog" },
      ],
    },
    {
      head: "Platform",
      links: [
        { label: "Flight Booking", icon: <FaPlane size={14} />, href: "/platform/flight-booking-info" },
        { label: "Hotel Booking", icon: <FaHotel size={14} />, href: "/platform/hotel-booking-info" },
        { label: "Approval & Workflow", icon: <FiCheckSquare size={14} />, href: "/platform/approval-and-workflow" },
      ],
    },
    {
      head: "Who It's For",
      links: [
        { label: "Independent Professionals", icon: <FiBriefcase size={14} />, href: "/who-it's-for/independent" },
        { label: "Small Business", icon: <FiAirplay size={14} />, href: "/who-it's-for/small-business" },
        { label: "Mid Size Business", icon: <FiBriefcase size={14} />, href: "/who-it's-for/mid-size-business" },
        { label: "Growing Business", icon: <FiAirplay size={14} />, href: "/who-it's-for/growing-business" },
      ],
    },
    {
      head: "Company Legal",
      links: [
        { label: "Terms of Service", icon: <FiFileText size={14} />, href: "/legal/terms-of-service" },
        { label: "Privacy Center", icon: <FiShield size={14} />, href: "/legal/privacy-policy" },
        { label: "User Agreement", icon: <FiUserCheck size={14} />, href: "/legal/user-agreement" },
        { label: "Contact Us", icon: <FiPhone size={14} />, href: "/legal/contact-us" },
      ],
    },
  ];

  return (
    <footer
      style={{ background: C.grayLight, borderTop: `1px solid ${C.border}` }}
    >
      {/* ── Top brand bar ── */}
      <div
        style={{
          background: C.navyDark,
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-10 flex flex-col lg:flex-row items-center justify-between gap-8">
          {/* Brand */}
          <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
            {branding?.branding?.logo?.url ? (
              <img src={branding.branding.logo.url}
                alt="Logo"
                className="h-12 object-contain" loading="eager" />
            ) : (
              <img src={logo} alt="Traveamer" className="h-10" loading="eager" />
            )}
            <div className="space-y-1">
              <h4
                className="font-bold text-lg md:text-xl leading-tight"
                style={{
                  color: C.white,
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                }}
              >
                {branding?.corporateName || "Company Travel Desk"}
              </h4>
              <p
                className="text-[11px] font-bold uppercase tracking-[0.2em] opacity-80"
                style={{
                  color: GOLD,
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                }}
              >
                Internal Travel Ecosystem
              </p>
            </div>
          </div>

          {/* Quick action buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => handleSearchClick("flight")}
              className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs font-bold transition-all hover:translate-y-[-2px] active:scale-95"
              style={{
                background: GOLD_10,
                color: GOLD,
                border: `1px solid ${GOLD_20}`,
                fontFamily: "'Plus Jakarta Sans',sans-serif",
              }}
            >
              <FaPlane size={12} /> Book Flight
            </button>
            <button
              onClick={() => handleSearchClick("hotel")}
              className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs font-bold transition-all hover:translate-y-[-2px] active:scale-95"
              style={{
                background: GOLD_10,
                color: GOLD,
                border: `1px solid ${GOLD_20}`,
                fontFamily: "'Plus Jakarta Sans',sans-serif",
              }}
            >
              <FaHotel size={12} /> Book Hotel
            </button>
          </div>
        </div>
      </div>

      {/* ── Main link columns ── */}
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-16">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-y-12 gap-x-8">
          {/* Brand description column */}
          <div className="lg:col-span-1">
            <div className="mb-5">
              {branding?.branding?.logo?.url ? (
                <img src={branding.branding.logo.url}
                  alt="Logo"
                  className="h-10 object-contain" loading="eager" />
              ) : (
                <img src={logo} alt="Traveamer" className="h-8" loading="eager" />
              )}
            </div>

            <div
              className="w-10 h-1 mb-6 rounded-full"
              style={{ background: GOLD }}
            />

            <div className="mb-5">
              <img className="h-14"
                src="/iata-logo.svg"
                alt="iata-logo" loading="eager" />
              <p
                className="text-[10px] font-semibold mt-2 opacity-60"
                style={{
                  color: C.muted,
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                }}
              >
                IATA Accredited Agent
              </p>
            </div>
          </div>

          {/* Link columns */}
          {FOOTER_SECTIONS.map(({ head, links }) => (
            <div key={head}>
              <h5
                className="text-[11px] font-black uppercase tracking-[0.25em] mb-7"
                style={{
                  color: C.navy,
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                }}
              >
                {head}
              </h5>
              <ul className="space-y-4">
                {links.map(({ label, href, onClick, icon }) => (
                  <li key={label}>
                    {onClick ? (
                      <button
                        onClick={onClick}
                        className="text-[13px] font-semibold transition-all hover:translate-x-1 flex items-center gap-3 group border-none bg-transparent p-0 cursor-pointer text-left"
                        style={{
                          color: C.muted,
                          fontFamily: "'Plus Jakarta Sans',sans-serif",
                        }}
                      >
                        <span className="text-[#C9A84C] opacity-70 group-hover:opacity-100 transition-colors">
                          {icon}
                        </span>
                        {label}
                      </button>
                    ) : (
                      <Link
                        to={href}
                        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                        className="text-[13px] font-semibold transition-all hover:translate-x-1 flex items-center gap-3 group no-underline"
                        style={{
                          color: C.muted,
                          fontFamily: "'Plus Jakarta Sans',sans-serif",
                        }}
                      >
                        <span className="text-[#C9A84C] opacity-70 group-hover:opacity-100 transition-colors">
                          {icon}
                        </span>
                        {label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* ── Bottom Bar ── */}
      <div className="px-6 md:px-10 py-8 border-t flex flex-col md:flex-row items-center justify-between gap-6" style={{ borderColor: C.border, background: C.white }}>
        <p className="text-[12px] font-medium" style={{ color: C.muted }}>
          © {new Date().getFullYear()} {branding?.corporateName || "Traveamer"}. All rights reserved.
        </p>
        <div className="flex items-center gap-8">
          <Link to="/legal/privacy-policy" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="text-[12px] font-semibold no-underline hover:text-[#C9A84C] transition-colors" style={{ color: C.muted }}>Privacy Policy</Link>
          <Link to="/legal/terms-of-service" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="text-[12px] font-semibold no-underline hover:text-[#C9A84C] transition-colors" style={{ color: C.muted }}>Terms of Service</Link>
          <Link to="/legal/user-agreement" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="text-[12px] font-semibold no-underline hover:text-[#C9A84C] transition-colors" style={{ color: C.muted }}>User Agreement</Link>
        </div>
      </div>
    </footer>
  );
}
