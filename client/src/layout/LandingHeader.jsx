import { useState, useRef, useEffect } from "react";
import { FiChevronDown, FiMapPin, FiBriefcase, FiCalendar, FiTrendingUp, FiUser, FiHome } from "react-icons/fi";
import { MdOutlineFlight, MdOutlineHotel } from "react-icons/md";
import logo from '../../public/logo-traveamer.svg';

/* ── Dropdown Data ── */
const platformLinks = [
  {
    icon: <MdOutlineFlight size={18} className="text-[#C9A84C]" />,
    label: "Flight Booking",
    desc: "Search & book flights in under 60 seconds",
    href: "#",
  },
  {
    icon: <MdOutlineHotel size={18} className="text-[#C9A84C]" />,
    label: "Hotel Booking",
    desc: "Find and book hotels tagged to your client",
    href: "#",
  },
  {
    icon: <FiMapPin size={18} className="text-[#C9A84C]" />,
    label: "Cab & Local Travel",
    desc: "Track every cab ride per client",
    href: "#",
  },
];

const whoItsForLinks = [
  {
    icon: <FiBriefcase size={18} className="text-[#C9A84C]" />,
    label: "Independent Professionals",
    desc: "CAs, consultants, architects & more",
    href: "#",
  },
  {
    icon: <FiCalendar size={18} className="text-[#C9A84C]" />,
    label: "Event Managers",
    desc: "Track travel per event & vendor",
    href: "#",
  },
  {
    icon: <FiTrendingUp size={18} className="text-[#C9A84C]" />,
    label: "Consultants",
    desc: "Bill travel accurately to each client",
    href: "#",
  },
  {
    icon: <FiUser size={18} className="text-[#C9A84C]" />,
    label: "Legal Professionals",
    desc: "Court visits & client meetings tracked",
    href: "#",
  },
  {
    icon: <FiHome size={18} className="text-[#C9A84C]" />,
    label: "Architects & Designers",
    desc: "Site visits & material trips organised",
    href: "#",
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
  const [openMenu, setOpenMenu] = useState(null); // "platform" | "whoFor" | null
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobilePlatformOpen, setMobilePlatformOpen] = useState(false);
  const [mobileWhoOpen, setMobileWhoOpen] = useState(false);

  const platformRef = useRef(null);
  const whoForRef = useRef(null);

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

  const toggle = (menu) => setOpenMenu((prev) => (prev === menu ? null : menu));

  return (
    <header className="w-full px-6 py-4 bg-[#F5F5F5] flex justify-between items-center z-50 sticky top-0 shadow-sm">

      {/* Logo */}
      <div className="flex items-center">
        <img src={logo} alt="Traveamer" className="h-7" />
      </div>

      {/* Desktop Nav */}
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
        <button className="text-[#000D26] text-sm font-medium font-['Plus_Jakarta_Sans'] hover:text-[#C9A84C] transition-colors">
          Why Us
        </button>
        <button className="text-[#000D26] text-sm font-medium font-['Plus_Jakarta_Sans'] hover:text-[#C9A84C] transition-colors">
          FAQs
        </button>
      </nav>

      {/* CTA Buttons */}
      <div className="hidden md:flex items-center gap-4">
        <button className="text-black text-sm font-medium font-['Plus_Jakarta_Sans'] hover:text-[#C9A84C] transition-colors">
          Login
        </button>
        <button className="h-10 px-5 bg-[#C9A84C] text-black text-sm font-medium font-['Plus_Jakarta_Sans'] rounded-full shadow-[0px_0px_40px_0px_rgba(60,131,246,0.15)] hover:bg-[#b8963d] transition-colors">
          Sign Up
        </button>
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

          {/* Platform accordion */}
          <button
            onClick={() => setMobilePlatformOpen(!mobilePlatformOpen)}
            className="flex items-center justify-between w-full px-3 py-2.5 text-[#000D26] text-sm font-medium font-['Plus_Jakarta_Sans'] rounded-xl hover:bg-black/5 transition-colors"
          >
            Platform
            <FiChevronDown size={13} className={`transition-transform duration-200 ${mobilePlatformOpen ? "rotate-180" : ""}`} />
          </button>
          {mobilePlatformOpen && (
            <div className="pl-3 pb-1 flex flex-col gap-1">
              {platformLinks.map(({ icon, label, href }) => (
                <a key={label} href={href} className="flex items-center gap-2.5 px-3 py-2 text-[#000D26] text-sm font-['Plus_Jakarta_Sans'] rounded-lg hover:bg-[#C9A84C]/10 transition-colors">
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
            <FiChevronDown size={13} className={`transition-transform duration-200 ${mobileWhoOpen ? "rotate-180" : ""}`} />
          </button>
          {mobileWhoOpen && (
            <div className="pl-3 pb-1 flex flex-col gap-1">
              {whoItsForLinks.map(({ icon, label, href }) => (
                <a key={label} href={href} className="flex items-center gap-2.5 px-3 py-2 text-[#000D26] text-sm font-['Plus_Jakarta_Sans'] rounded-lg hover:bg-[#C9A84C]/10 transition-colors">
                  {icon} {label}
                </a>
              ))}
            </div>
          )}

          <button className="text-left px-3 py-2.5 text-[#000D26] text-sm font-medium font-['Plus_Jakarta_Sans'] rounded-xl hover:bg-black/5 transition-colors">
            Why Us
          </button>
          <button className="text-left px-3 py-2.5 text-[#000D26] text-sm font-medium font-['Plus_Jakarta_Sans'] rounded-xl hover:bg-black/5 transition-colors">
            FAQs
          </button>

          <hr className="border-gray-200 my-1" />

          <button className="text-left px-3 py-2.5 text-black text-sm font-medium font-['Plus_Jakarta_Sans'] rounded-xl hover:bg-black/5 transition-colors">
            Login
          </button>
          <button className="w-full px-5 py-2.5 bg-[#C9A84C] text-black text-sm font-medium font-['Plus_Jakarta_Sans'] rounded-full hover:bg-[#b8963d] transition-colors">
            Sign Up
          </button>
        </div>
      )}
    </header>
  );
}