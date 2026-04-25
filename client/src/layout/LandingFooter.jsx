import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { FaPlane, FaHotel } from "react-icons/fa";
import { RiPhoneLine, RiArrowRightLine } from "react-icons/ri";
import { LuPlane } from "react-icons/lu";
import logo from "../../public/logo-traveamer.svg";
import { useFlightSearch } from "../context/FlightSearchContext";

export default function LandingFooter() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useSelector((s) => s.auth);
  const { publicBranding } = useSelector((s) => s.landingPage);
  const branding = publicBranding;
  const { setActiveTab } = useFlightSearch();

  const handleSearchClick = (tab) => {
    setActiveTab(tab);
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

  if (isAuthenticated && user) {
    return (
      <footer style={{ background: C.grayLight, borderTop: `1px solid ${C.border}` }}>
        {/* ── Top brand bar ── */}
        <div style={{ background: C.navyDark, borderBottom: `1px solid ${C.border}` }}>
          <div className="max-w-7xl mx-auto px-6 md:px-10 py-10 flex flex-col lg:flex-row items-center justify-between gap-8">
            {/* Brand */}
            <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
              {branding?.branding?.logo?.url ? (
                <img
                  src={branding.branding.logo.url}
                  alt="Logo"
                  className="h-12 object-contain"
                />
              ) : (
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 cursor-pointer"
                  style={{ background: GOLD }}
                  onClick={() => navigate("/travel")}
                >
                  <LuPlane size={22} style={{ color: C.white }} />
                </div>
              )}
              <div className="space-y-1">
                <h4
                  className="font-bold text-lg md:text-xl leading-tight"
                  style={{
                    color: C.white,
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                  }}
                >
                  {branding?.branding?.landingPageTitle ||
                    branding?.corporateName ||
                    "Travel Portal"}
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
              <button
                className="flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-xs font-bold transition-all hover:shadow-xl active:scale-95"
                style={{
                  background: GOLD,
                  color: C.white,
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  boxShadow: `0 4px 12px ${GOLD_20}`,
                }}
              >
                <RiPhoneLine size={14} /> Support
              </button>
            </div>
          </div>
        </div>

        {/* ── Main link columns ── */}
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-16">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-y-12 gap-x-8">
            {/* Brand description column */}
            <div className="col-span-2 sm:col-span-3 lg:col-span-1">
              <div className="w-10 h-1 mb-6 rounded-full" style={{ background: GOLD }} />
              <p
                className="text-sm leading-7 mb-8 max-w-xs"
                style={{
                  color: C.muted,
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                }}
              >
                Seamless, policy-compliant travel management for modern teams.
                Powered by Traveamer Technology.
              </p>
              {/* Trust badges */}
              <div className="flex flex-wrap gap-2">
                {["GST", "ISO", "GDPR"].map((b) => (
                  <span
                    key={b}
                    className="text-[10px] font-black px-3 py-1 rounded-md border"
                    style={{
                      background: C.white,
                      color: C.navy,
                      borderColor: C.border,
                      fontFamily: "'Plus Jakarta Sans',sans-serif",
                    }}
                  >
                    {b}
                  </span>
                ))}
              </div>
            </div>

            {/* Link columns */}
            {[
              {
                head: "Quick Links",
                links: [
                  { label: "Search Flights", onClick: () => handleSearchClick("flight") },
                  { label: "Search Hotels", onClick: () => handleSearchClick("hotel") },
                  { label: "My Bookings", href: "/my-bookings" },
                  { label: "Pending Approvals", href: "/pending-approvals" },
                ],
              },
              {
                head: "Support",
                links: [
                  { label: "Expense Policy", href: "#" },
                  { label: "Help Center", href: "#" },
                  { label: "Emergency Guide", href: "#" },
                  { label: "Portal FAQ", href: "#" },
                ],
              },
              {
                head: "Administration",
                links: [
                  { label: "Branding", href: "#" },
                  { label: "User Directory", href: "#" },
                  { label: "Policy Manager", href: "#" },
                  { label: "Credit Reports", href: "#" },
                ],
              },
              {
                head: "Company Legal",
                links: [
                  { label: "Terms of Service", href: "/legal/terms-of-service" },
                  { label: "Privacy Center", href: "/legal/privacy-policy" },
                  { label: "User Agreement", href: "/legal/user-agreement" },
                  { label: "Contact Us", href: "/legal/contact-us" },
                ],
              },
            ].map(({ head, links }) => (
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
                  {links.map(({ label, href, onClick }) => (
                    <li key={label}>
                      {onClick ? (
                        <button
                          onClick={onClick}
                          className="text-[13px] font-semibold transition-all hover:translate-x-1 inline-flex items-center gap-2 group border-none bg-transparent p-0 cursor-pointer"
                          style={{
                            color: C.muted,
                            fontFamily: "'Plus Jakarta Sans',sans-serif",
                          }}
                        >
                          <span className="w-1 h-1 rounded-full bg-gray-300 transition-all group-hover:bg-[#C9A84C] group-hover:w-2" />
                          {label}
                        </button>
                      ) : (
                        <a
                          href={href}
                          className="text-[13px] font-semibold transition-all hover:translate-x-1 inline-flex items-center gap-2 group no-underline"
                          style={{
                            color: C.muted,
                            fontFamily: "'Plus Jakarta Sans',sans-serif",
                          }}
                        >
                          <span className="w-1 h-1 rounded-full bg-gray-300 transition-all group-hover:bg-[#C9A84C] group-hover:w-2" />
                          {label}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </footer>
    );
  }

  // Guest Footer (Static)
  return (
    <footer className="w-full border-t border-[#E1E7EF] bg-white py-12 px-6">
      <div className="max-w-[1340px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        {/* Logo */}
        <div 
          className="cursor-pointer"
          onClick={() => {
            if (isAuthenticated) {
              navigate("/travel");
            } else {
              navigate("/platform/flight-booking-info");
            }
          }}
        >
          <img src={logo} alt="Traveamer" className="h-7" />
        </div>

        {/* Copyright */}
        <p className="text-[#65758B] text-xs font-['Inter']">
          © {new Date().getFullYear()} Traveamer. All rights reserved.
        </p>

        {/* Links */}
        <div className="flex items-center gap-6">
          <a
            href="/legal/user-agreement"
            className="text-[#04112F] text-xs font-['Inter'] hover:text-[#C9A84C] transition-colors no-underline"
          >
            User Agreement
          </a>
          <a
            href="/legal/privacy-policy"
            className="text-[#04112F] text-xs font-['Inter'] hover:text-[#C9A84C] transition-colors no-underline"
          >
            Privacy
          </a>
          <a
            href="/legal/terms-of-service"
            className="text-[#04112F] text-xs font-['Inter'] hover:text-[#C9A84C] transition-colors no-underline"
          >
            Terms
          </a>
          <a
            href="/legal/contact-us"
            className="text-[#04112F] text-xs font-['Inter'] hover:text-[#C9A84C] transition-colors no-underline"
          >
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
}
