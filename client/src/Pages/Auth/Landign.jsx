import { useState, useEffect, useRef } from "react";
import {
  MdFlight,
  MdHotel,
  MdReceipt,
  MdSecurity,
  MdSupport,
  MdGroups,
  MdVerified,
  MdArrowForward,
  MdCheckCircle,
  MdMenu,
  MdClose,
  MdEmail,
  MdPhone,
  MdLocationOn,
  MdAutoGraph,
  MdCreditCard,
  MdNotifications,
  MdTrendingDown,
  MdAccessTime,
  MdFlightTakeoff,
  MdPolicy,
  MdAnalytics,
  MdIntegrationInstructions,
  MdRocket,
  MdCorporateFare,
  MdPeople,
  MdAttachMoney,
  MdApi,
  MdCategory,
  MdWork,
} from "react-icons/md";
import {
  FaLinkedin,
  FaTwitter,
  FaFacebook,
  FaInstagram,
  FaQuoteLeft,
  FaGlobe,
  FaShieldAlt,
  FaChartLine,
} from "react-icons/fa";
import {
  BsStarFill,
  BsArrowRight,
  BsPlayCircle,
  BsCheckLg,
  BsLightningChargeFill,
  BsMicrosoftTeams,
} from "react-icons/bs";
import { HiSparkles } from "react-icons/hi";
import {
  SiSap,
  SiSalesforce,
  SiSlack,
  //   SiWorkday,
  SiQuickbooks,
  SiZoho,
} from "react-icons/si";
import AuthModal from "./AuthModal";

const IMAGES = {
  hero: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1400&q=80",
  flight1:
    "https://images.unsplash.com/photo-1556388158-158ea5ccacbd?w=600&q=80",
  hotel1:
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80",
  office:
    "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80",
  airport:
    "https://images.unsplash.com/photo-1578574577315-3fbeb0cecdc2?w=800&q=80",
  hotel2:
    "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=600&q=80",
  globe:
    "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&q=80",
};

// ── Animated Counter ──────────────────────────────────────────────────────────
function AnimatedCounter({ target, suffix = "", duration = 1800 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !started.current) {
          started.current = true;
          const t0 = Date.now();
          const tick = () => {
            const p = Math.min((Date.now() - t0) / duration, 1);
            setCount(Math.floor((1 - Math.pow(1 - p, 3)) * target));
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.4 },
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target, duration]);
  return (
    <span ref={ref}>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

// ── Navbar ────────────────────────────────────────────────────────────────────
function Navbar({ onAuthOpen }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);
  const links = ["Features", "How It Works"];
  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? "bg-white/96 backdrop-blur-lg shadow-xl shadow-slate-200/50" : "bg-transparent"}`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-linear-to-br from-blue-700 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <MdFlightTakeoff className="text-white text-xl" />
          </div>
          <div>
            <div
              className={`font-black text-xl leading-tight ${scrolled ? "text-slate-800" : "text-white"}`}
              style={{ fontFamily: "'Outfit',sans-serif" }}
            >
              COTD
            </div>
            <div
              className={`text-[9px] font-bold tracking-[0.22em] leading-none ${scrolled ? "text-blue-600" : "text-cyan-300"}`}
            >
              CORPORATE ONLINE TRAVEL DESK
            </div>
          </div>
        </div>
        <ul className="hidden lg:flex items-center gap-8">
          {links.map((l) => (
            <li key={l}>
              <a
                href={`#${l.toLowerCase().replace(/\s+/g, "-")}`}
                className={`text-sm font-semibold hover:text-cyan-400 transition-colors ${scrolled ? "text-slate-600" : "text-white/80"}`}
              >
                {l}
              </a>
            </li>
          ))}
        </ul>
        <div className="hidden lg:flex items-center gap-3">
          <button
            onClick={onAuthOpen}
            className={`text-sm font-bold px-5 py-2.5 rounded-xl border-2 transition-all ${scrolled ? "border-blue-600 text-blue-600 hover:bg-blue-50" : "border-white/40 text-white hover:bg-white/10"}`}
          >
            Login/Sign-up
          </button>
        </div>
        <button
          className={`lg:hidden p-2 ${scrolled ? "text-slate-700" : "text-white"}`}
          onClick={() => setOpen(!open)}
        >
          {open ? <MdClose size={26} /> : <MdMenu size={26} />}
        </button>
      </div>
      {open && (
        <div className="lg:hidden bg-white border-t border-slate-100 px-6 py-5 shadow-xl">
          {links.map((l) => (
            <a
              key={l}
              href={`#${l.toLowerCase().replace(/\s+/g, "-")}`}
              className="block py-3 text-sm font-semibold text-slate-600 border-b border-slate-100 hover:text-blue-700"
              onClick={() => setOpen(false)}
            >
              {l}
            </a>
          ))}
          <div className="flex gap-3 mt-5">
            <button
              onClick={() => {
                setOpen(false);
                onAuthOpen();
              }}
              className="flex-1 text-sm font-bold py-3 rounded-xl border-2 border-blue-600 text-blue-600"
            >
              Login/Sign-up
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      <div className="absolute inset-0">
        <img src={IMAGES.hero} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-linear-to-br from-blue-950/93 via-blue-900/86 to-slate-900/90" />
        <div className="absolute inset-0 bg-linear-to-t from-slate-950/65 via-transparent to-transparent" />
      </div>
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(white 1px,transparent 1px),linear-gradient(90deg,white 1px,transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      <div className="absolute top-1/3 right-1/4 w-[480px] h-[480px] rounded-full bg-cyan-500/8 blur-3xl animate-pulse" />
      <div
        className="absolute bottom-1/3 left-1/4 w-72 h-72 rounded-full bg-orange-500/8 blur-3xl animate-pulse"
        style={{ animationDelay: "1.5s" }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-36 grid lg:grid-cols-2 gap-20 items-center w-full">
        <div>
          <div className="inline-flex items-center gap-2.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-5 py-2.5 mb-8">
            <HiSparkles className="text-yellow-400" />
            <span className="text-white text-xs font-bold tracking-wider uppercase">
              India's #1 B2B Corporate Travel Platform
            </span>
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          </div>
          <h1
            className="font-black text-white leading-[1.04] mb-7"
            style={{
              fontFamily: "'Outfit',sans-serif",
              fontSize: "clamp(38px,5.5vw,66px)",
            }}
          >
            Smarter Corporate
            <span className="block text-transparent bg-clip-text bg-linear-to-r from-cyan-300 via-blue-300 to-cyan-400">
              {" "}
              Travel Management
            </span>
            <span className="block">For Your Business</span>
          </h1>
          <p className="text-white/72 text-lg leading-relaxed mb-10 max-w-lg">
            Empower your organization with seamless flight & hotel booking,
            real-time expense tracking, policy compliance, and dedicated 24/7
            support — all in one powerful platform.
          </p>
          <div className="flex flex-wrap gap-2.5 mb-12">
            {[
              "No Setup Fee",
              "GST Invoice on Every Booking",
              "24/7 Dedicated Support",
              "Instant Onboarding",
            ].map((t) => (
              <span
                key={t}
                className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/15 text-white/85 text-xs font-semibold px-3.5 py-2 rounded-full"
              >
                <BsCheckLg className="text-cyan-400 shrink-0" /> {t}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-4">
            <button className="group flex items-center gap-2.5 bg-linear-to-r from-orange-500 to-red-500 text-white font-bold px-9 py-4 rounded-2xl shadow-2xl shadow-orange-500/40 hover:shadow-orange-500/65 hover:-translate-y-1 transition-all text-base">
              Start Free Trial{" "}
              <BsArrowRight className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="group flex items-center gap-2.5 bg-white/10 backdrop-blur-md border border-white/30 text-white font-bold px-9 py-4 rounded-2xl hover:bg-white/20 transition-all text-base">
              <BsPlayCircle className="text-cyan-300 text-xl" /> Watch Demo
            </button>
          </div>
        </div>

        <div className="hidden lg:block">
          <div className="bg-white/8 backdrop-blur-2xl border border-white/15 rounded-3xl p-7 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-white/55 text-xs font-semibold uppercase tracking-wider">
                  Travel Overview
                </p>
                <p
                  className="text-white font-black text-xl mt-0.5"
                  style={{ fontFamily: "'Outfit',sans-serif" }}
                >
                  December 2024
                </p>
              </div>
              <div className="flex items-center gap-2 bg-green-400/15 border border-green-400/25 px-3 py-1.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-green-300 text-xs font-bold">Live</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                {
                  label: "Bookings",
                  value: "142",
                  icon: <MdFlight />,
                  color: "from-blue-500 to-cyan-400",
                },
                {
                  label: "Savings",
                  value: "₹2.4L",
                  icon: <MdTrendingDown />,
                  color: "from-emerald-500 to-green-400",
                },
                {
                  label: "Employees",
                  value: "38",
                  icon: <MdGroups />,
                  color: "from-purple-500 to-pink-400",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="bg-white/8 rounded-2xl p-4 border border-white/10"
                >
                  <div
                    className={`w-9 h-9 rounded-xl bg-linear-to-br ${s.color} flex items-center justify-center text-white text-lg mb-3`}
                  >
                    {s.icon}
                  </div>
                  <p
                    className="text-white font-black text-xl"
                    style={{ fontFamily: "'Outfit',sans-serif" }}
                  >
                    {s.value}
                  </p>
                  <p className="text-white/45 text-xs mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
            <p className="text-white/45 text-xs font-bold uppercase tracking-wider mb-3">
              Recent Bookings
            </p>
            <div className="space-y-2.5">
              {[
                {
                  route: "Mumbai → Delhi",
                  type: "Flight",
                  price: "₹4,850",
                  time: "2h ago",
                  img: IMAGES.flight1,
                  tagCls: "bg-blue-500/20 text-blue-300 border-blue-500/25",
                },
                {
                  route: "ITC Maurya, Delhi",
                  type: "Hotel",
                  price: "₹8,200/night",
                  time: "5h ago",
                  img: IMAGES.hotel1,
                  tagCls:
                    "bg-purple-500/20 text-purple-300 border-purple-500/25",
                },
                {
                  route: "Bangalore → Mumbai",
                  type: "Flight",
                  price: "₹5,200",
                  time: "1d ago",
                  img: IMAGES.flight1,
                  tagCls: "bg-blue-500/20 text-blue-300 border-blue-500/25",
                },
              ].map((b, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 bg-white/5 border border-white/8 rounded-xl p-3"
                >
                  <img
                    src={b.img}
                    alt=""
                    className="w-10 h-10 rounded-xl object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-bold truncate">
                      {b.route}
                    </p>
                    <p className="text-white/35 text-xs">{b.time}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-white font-black text-sm">{b.price}</p>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${b.tagCls}`}
                    >
                      {b.type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 bg-white/5 border border-white/8 rounded-2xl p-4">
              <div className="flex justify-between text-xs mb-2.5">
                <span className="text-white/55 font-semibold">
                  Policy Compliance
                </span>
                <span className="text-emerald-400 font-black">94%</span>
              </div>
              <div className="h-2 bg-white/8 rounded-full overflow-hidden">
                <div
                  className="h-full w-[94%] bg-linear-to-r from-emerald-400 to-green-500 rounded-full"
                  style={{ boxShadow: "0 0 12px rgba(52,211,153,0.5)" }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 bg-white/4 backdrop-blur-xl border-t border-white/8">
        <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { num: 5000, suffix: "+", label: "Corporate Clients" },
            { num: 2, suffix: "M+", label: "Bookings Processed" },
            { num: 30, suffix: "%", label: "Avg Cost Savings" },
            { num: 99, suffix: ".9%", label: "Uptime SLA" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div
                className="font-black text-2xl text-white"
                style={{ fontFamily: "'Outfit',sans-serif" }}
              >
                <AnimatedCounter target={s.num} suffix={s.suffix} />
              </div>
              <div className="text-white/45 text-xs font-semibold mt-0.5">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── TRUSTED BY — Animated Marquee with Company Logos ─────────────────────────
function TrustedBy() {
  const brands = [
    { name: "Infosys", abbr: "IF", color: "#007CC3", tagline: "IT Services" },
    { name: "Wipro", abbr: "WP", color: "#3DBFEF", tagline: "Technology" },
    {
      name: "Tata Group",
      abbr: "TG",
      color: "#003087",
      tagline: "Conglomerate",
    },
    { name: "HCL Tech", abbr: "HC", color: "#007DB8", tagline: "IT Solutions" },
    {
      name: "Tech Mahindra",
      abbr: "TM",
      color: "#E31837",
      tagline: "Digital Transformation",
    },
    { name: "Bajaj Auto", abbr: "BA", color: "#003580", tagline: "Automotive" },
    { name: "Godrej", abbr: "GD", color: "#00703C", tagline: "Diversified" },
    { name: "Mahindra", abbr: "MH", color: "#D0161B", tagline: "Automotive" },
    { name: "Reliance", abbr: "RL", color: "#1C4FA0", tagline: "Conglomerate" },
    {
      name: "Adani Group",
      abbr: "AG",
      color: "#005BAA",
      tagline: "Infrastructure",
    },
    {
      name: "Birla Group",
      abbr: "BG",
      color: "#7B0D1E",
      tagline: "Manufacturing",
    },
    {
      name: "Larsen & T",
      abbr: "LT",
      color: "#003C71",
      tagline: "Engineering",
    },
  ];
  const doubled = [...brands, ...brands];

  return (
    <section className="py-14 bg-white border-y border-slate-100 overflow-hidden">
      <div className="text-center mb-10 px-6">
        <p className="text-slate-400 text-xs font-black uppercase tracking-[0.3em] mb-3">
          Trusted By India's Leading Corporations
        </p>
        <div className="flex justify-center items-center gap-2">
          {[...Array(5)].map((_, i) => (
            <BsStarFill key={i} className="text-yellow-400 text-sm" />
          ))}
          <span className="text-slate-500 text-sm font-semibold ml-2">
            4.9/5 from 2,000+ reviews
          </span>
        </div>
      </div>

      <div className="relative">
        {/* Fade edges */}
        <div
          className="absolute left-0 top-0 bottom-0 w-28 z-10 pointer-events-none"
          style={{
            background: "linear-gradient(to right, white, transparent)",
          }}
        />
        <div
          className="absolute right-0 top-0 bottom-0 w-28 z-10 pointer-events-none"
          style={{ background: "linear-gradient(to left, white, transparent)" }}
        />

        <div className="flex gap-4 overflow-hidden">
          <div
            className="flex gap-4 animate-marquee-ltr"
            style={{ width: "max-content" }}
          >
            {doubled.map((b, i) => (
              <div
                key={i}
                className="shrink-0 flex items-center gap-3.5 bg-white border-2 border-slate-100 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-50 rounded-2xl px-5 py-4 cursor-default transition-all duration-300 group min-w-[210px]"
              >
                {/* SVG-style logo badge */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0 shadow-lg group-hover:scale-110 transition-transform"
                  style={{
                    background: `linear-gradient(135deg, ${b.color}ee, ${b.color}99)`,
                  }}
                >
                  <div className="flex flex-col items-center leading-none">
                    <span className="text-sm font-black">{b.abbr}</span>
                    <div className="w-4 h-0.5 bg-white/50 mt-0.5 rounded-full" />
                  </div>
                </div>
                <div className="min-w-0">
                  <p
                    className="font-black text-slate-800 text-sm leading-tight truncate"
                    style={{ fontFamily: "'Outfit',sans-serif" }}
                  >
                    {b.name}
                  </p>
                  <p className="text-slate-400 text-xs mt-0.5">{b.tagline}</p>
                </div>
                <BsCheckLg className="text-green-500 text-xs shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Features ──────────────────────────────────────────────────────────────────
function Features() {
  const feats = [
    {
      icon: <MdFlight />,
      color: "from-blue-500 to-cyan-400",
      bg: "bg-blue-50 border-blue-100",
      title: "Corporate Flight Booking",
      desc: "Domestic & international flights with exclusive fares, priority seats, and centralized billing across 500+ airlines.",
      tags: ["Bulk Booking", "Priority Check-in", "GST Invoice"],
    },
    {
      icon: <MdHotel />,
      color: "from-purple-500 to-pink-400",
      bg: "bg-purple-50 border-purple-100",
      title: "Hotel & Accommodation",
      desc: "10L+ hotels worldwide with negotiated corporate rates, instant confirmation, and complimentary business amenities.",
      tags: ["Corporate Rates", "Instant Confirm", "Business Hotels"],
    },
    {
      icon: <MdPolicy />,
      color: "from-emerald-500 to-green-400",
      bg: "bg-emerald-50 border-emerald-100",
      title: "Travel Policy Engine",
      desc: "Set class restrictions, budget caps, and approval workflows. Policy enforced automatically on every single booking.",
      tags: ["Auto Enforcement", "Approval Flows", "Custom Rules"],
    },
    {
      icon: <MdAnalytics />,
      color: "from-orange-500 to-amber-400",
      bg: "bg-orange-50 border-orange-100",
      title: "Expense Analytics",
      desc: "Real-time dashboards by department, traveler, route and hotel. One-click Excel/PDF exports for finance teams.",
      tags: ["Live Reports", "Dept Tracking", "Excel Export"],
    },
    {
      icon: <MdCreditCard />,
      color: "from-red-500 to-rose-400",
      bg: "bg-red-50 border-red-100",
      title: "Centralized Billing",
      desc: "Single monthly invoice with consolidated GST input credits. Corporate credit line up to ₹50L with Net-30 terms.",
      tags: ["Credit Line", "GST Credits", "Single Invoice"],
    },
    {
      icon: <MdSupport />,
      color: "from-indigo-500 to-blue-400",
      bg: "bg-indigo-50 border-indigo-100",
      title: "24/7 Dedicated Support",
      desc: "Dedicated travel desk manager per enterprise client. Emergency rebooking, visa assist, crisis support always.",
      tags: ["Dedicated Manager", "Emergency Help", "Visa Assist"],
    },
    {
      icon: <MdIntegrationInstructions />,
      color: "from-teal-500 to-cyan-400",
      bg: "bg-teal-50 border-teal-100",
      title: "HRMS & ERP Integration",
      desc: "Native connectors for SAP, Oracle, Workday, Zoho, Darwinbox. Auto-sync employees and cost centers in minutes.",
      tags: ["SAP Connect", "Workday Sync", "Zoho HR"],
    },
    {
      icon: <MdSecurity />,
      color: "from-slate-600 to-slate-400",
      bg: "bg-slate-50 border-slate-200",
      title: "Enterprise-Grade Security",
      desc: "ISO 27001 certified with role-based access, SSO/SAML support, and full data encryption at rest and in transit.",
      tags: ["ISO 27001", "SSO Support", "Encrypted"],
    },
    {
      icon: <MdNotifications />,
      color: "from-yellow-500 to-orange-400",
      bg: "bg-yellow-50 border-yellow-100",
      title: "Smart Alerts & Approvals",
      desc: "Multi-level approval workflows with email, SMS, WhatsApp, and in-app push for high-value bookings.",
      tags: ["Multi-level", "WhatsApp Alerts", "Auto Reminders"],
    },
  ];
  return (
    <section id="features" className="py-28 bg-slate-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="inline-block bg-blue-600 text-white text-xs font-black uppercase tracking-widest px-4 py-2 rounded-full mb-5">
            Platform Features
          </span>
          <h2
            className="font-black text-slate-900 leading-tight mb-4"
            style={{
              fontFamily: "'Outfit',sans-serif",
              fontSize: "clamp(30px,4vw,50px)",
            }}
          >
            Everything Your Business Needs
            <br />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-cyan-500">
              to Travel Smarter
            </span>
          </h2>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto leading-relaxed">
            A complete corporate travel ecosystem built exclusively for Indian
            enterprises.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {feats.map((f, i) => (
            <div
              key={i}
              className="group bg-white border border-slate-100 rounded-3xl p-7 hover:border-blue-200 hover:shadow-2xl hover:shadow-blue-50/80 hover:-translate-y-1.5 transition-all duration-300 cursor-default"
            >
              <div
                className={`w-14 h-14 rounded-2xl border ${f.bg} flex items-center justify-center mb-5 group-hover:scale-105 transition-transform`}
              >
                <span
                  className={`text-2xl text-transparent bg-clip-text bg-linear-to-br ${f.color}`}
                >
                  {f.icon}
                </span>
              </div>
              <h3
                className="font-black text-slate-800 text-base mb-2"
                style={{ fontFamily: "'Outfit',sans-serif" }}
              >
                {f.title}
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-4">
                {f.desc}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {f.tags.map((t) => (
                  <span
                    key={t}
                    className="text-xs font-bold text-slate-400 bg-slate-50 border border-slate-150 px-2.5 py-1 rounded-full"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── How It Works ──────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    {
      num: "01",
      icon: <MdCorporateFare className="text-3xl" />,
      title: "Company Registration",
      desc: "Fill GST details & employee count. Verified within 2 business hours.",
      color: "from-blue-600 to-blue-400",
      shadow: "shadow-blue-300/50",
    },
    {
      num: "02",
      icon: <MdPolicy className="text-3xl" />,
      title: "Set Travel Policy",
      desc: "Define booking rules, budgets, preferred airlines & multi-level approvals.",
      color: "from-purple-600 to-purple-400",
      shadow: "shadow-purple-300/50",
    },
    {
      num: "03",
      icon: <MdGroups className="text-3xl" />,
      title: "Onboard Your Team",
      desc: "Bulk import via Excel or sync from HRMS. Assign roles instantly.",
      color: "from-teal-600 to-teal-400",
      shadow: "shadow-teal-300/50",
    },
    {
      num: "04",
      icon: <MdRocket className="text-3xl" />,
      title: "Start Booking & Saving",
      desc: "Team books within policy. Finance gets clean invoices. Save 30% avg.",
      color: "from-orange-500 to-red-400",
      shadow: "shadow-orange-300/50",
    },
  ];
  return (
    <section id="how-it-works" className="py-28 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="inline-block bg-orange-500 text-white text-xs font-black uppercase tracking-widest px-4 py-2 rounded-full mb-5">
            Quick Setup
          </span>
          <h2
            className="font-black text-slate-900 leading-tight mb-4"
            style={{
              fontFamily: "'Outfit',sans-serif",
              fontSize: "clamp(30px,4vw,50px)",
            }}
          >
            Go Live in{" "}
            <em className="not-italic text-transparent bg-clip-text bg-linear-to-r from-orange-500 to-red-500">
              Under 24 Hours
            </em>
          </h2>
          <p className="text-slate-500 text-lg max-w-xl mx-auto">
            Our implementation team handles everything. Zero IT resources from
            your side.
          </p>
        </div>
        <div className="grid md:grid-cols-4 gap-6 relative">
          <div className="hidden md:block absolute top-16 left-[14%] right-[14%] h-0.5 bg-linear-to-r from-blue-200 via-purple-200 via-teal-200 to-orange-200 z-0" />
          {steps.map((s, i) => (
            <div
              key={i}
              className="relative z-10 flex flex-col items-center text-center"
            >
              <div
                className={`w-16 h-16 rounded-2xl bg-linear-to-br ${s.color} flex items-center justify-center text-white mb-5 shadow-xl ${s.shadow}`}
              >
                {s.icon}
              </div>
              <div className="bg-white border-2 border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:border-blue-100 transition-all w-full">
                <div
                  className="font-black text-3xl text-slate-100 mb-1"
                  style={{ fontFamily: "'Outfit',sans-serif" }}
                >
                  {s.num}
                </div>
                <h3
                  className="font-black text-slate-800 text-sm mb-2"
                  style={{ fontFamily: "'Outfit',sans-serif" }}
                >
                  {s.title}
                </h3>
                <p className="text-slate-500 text-xs leading-relaxed">
                  {s.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-14 text-center">
          <button className="inline-flex items-center gap-2 bg-linear-to-r from-blue-600 to-cyan-500 text-white font-black px-12 py-4 rounded-2xl shadow-xl shadow-blue-300/40 hover:-translate-y-1 transition-all text-base">
            Onboard My Company Now <MdArrowForward />
          </button>
        </div>
      </div>
    </section>
  );
}

// ── Benefits ──────────────────────────────────────────────────────────────────
function Benefits() {
  return (
    <section className="py-28 bg-slate-50 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-20 items-center mb-28">
          <div>
            <span className="inline-block bg-blue-600 text-white text-xs font-black uppercase tracking-widest px-4 py-2 rounded-full mb-6">
              Flights
            </span>
            <h2
              className="font-black text-slate-900 leading-tight mb-5"
              style={{
                fontFamily: "'Outfit',sans-serif",
                fontSize: "clamp(26px,3.5vw,42px)",
              }}
            >
              Book Every Business Flight
              <br />
              <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-cyan-500">
                At Corporate-Exclusive Fares
              </span>
            </h2>
            <p className="text-slate-500 text-base leading-relaxed mb-8">
              Access negotiated fares across 500+ airlines — IndiGo, Air India,
              Vistara, Emirates and more. Employees book; you pay once a month.
            </p>
            <div className="space-y-3.5">
              {[
                "Domestic & international routes with competitive fares",
                "Preferred seating, extra baggage for frequent travellers",
                "Instant e-tickets with GST invoice attached",
                "Automated refund & reschedule management",
              ].map((p) => (
                <div key={p} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                    <MdCheckCircle className="text-blue-600 text-sm" />
                  </div>
                  <span className="text-slate-600 text-sm leading-relaxed">
                    {p}
                  </span>
                </div>
              ))}
            </div>
            <button className="mt-8 inline-flex items-center gap-2 text-blue-600 font-black text-sm bg-blue-50 hover:bg-blue-100 px-5 py-3 rounded-xl transition-all">
              Explore Flight Features <MdArrowForward />
            </button>
          </div>
          <div className="relative">
            <img
              src={IMAGES.airport}
              alt=""
              className="w-full rounded-3xl object-cover h-[420px] shadow-2xl shadow-slate-300"
            />
            <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl p-5 shadow-2xl border border-slate-100 flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-green-50 border border-green-100 flex items-center justify-center shrink-0">
                <MdTrendingDown className="text-green-500 text-2xl" />
              </div>
              <div>
                <p
                  className="font-black text-slate-800 text-xl"
                  style={{ fontFamily: "'Outfit',sans-serif" }}
                >
                  ₹18,000
                </p>
                <p className="text-green-600 text-xs font-bold">
                  Saved this month vs. retail
                </p>
              </div>
            </div>
            <div className="absolute -top-5 -right-5 bg-white rounded-2xl p-4 shadow-2xl border border-slate-100">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center">
                  <MdFlightTakeoff className="text-white text-xs" />
                </div>
                <p className="text-xs font-bold text-slate-400">Upcoming</p>
              </div>
              <p
                className="font-black text-slate-700 text-sm"
                style={{ fontFamily: "'Outfit',sans-serif" }}
              >
                BLR → BOM
              </p>
              <p className="text-xs text-slate-400 font-medium">
                Dec 18 · 06:45 AM
              </p>
            </div>
          </div>
        </div>
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          <div className="relative order-2 lg:order-1">
            <img
              src={IMAGES.hotel2}
              alt=""
              className="w-full rounded-3xl object-cover h-[420px] shadow-2xl shadow-slate-300"
            />
            <div className="absolute -bottom-6 -right-6 bg-white rounded-2xl p-5 shadow-2xl border border-slate-100">
              <div className="flex items-center gap-1 mb-2">
                {[...Array(5)].map((_, i) => (
                  <BsStarFill key={i} className="text-yellow-400 text-sm" />
                ))}
              </div>
              <p
                className="font-black text-slate-700 text-sm"
                style={{ fontFamily: "'Outfit',sans-serif" }}
              >
                ITC Grand Chola
              </p>
              <p className="text-xs text-blue-600 font-black">
                Corporate Rate: ₹5,200/night
              </p>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <span className="inline-block bg-purple-600 text-white text-xs font-black uppercase tracking-widest px-4 py-2 rounded-full mb-6">
              Hotels
            </span>
            <h2
              className="font-black text-slate-900 leading-tight mb-5"
              style={{
                fontFamily: "'Outfit',sans-serif",
                fontSize: "clamp(26px,3.5vw,42px)",
              }}
            >
              Premium Stays at
              <br />
              <span className="text-transparent bg-clip-text bg-linear-to-r from-purple-600 to-pink-500">
                Negotiated Corporate Rates
              </span>
            </h2>
            <p className="text-slate-500 text-base leading-relaxed mb-8">
              Choose from 10 lakh+ properties globally — budget business hotels
              to 5-star luxury — with instant confirmation and centralized
              billing.
            </p>
            <div className="space-y-3.5">
              {[
                "Access to ITC, Taj, Marriott, Hyatt at corporate rates",
                "Long-stay options with weekly & monthly pricing",
                "24/7 hotel concierge via our support desk",
                "No-hassle invoice with full GST breakup",
              ].map((p) => (
                <div key={p} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center shrink-0 mt-0.5">
                    <MdCheckCircle className="text-purple-600 text-sm" />
                  </div>
                  <span className="text-slate-600 text-sm leading-relaxed">
                    {p}
                  </span>
                </div>
              ))}
            </div>
            <button className="mt-8 inline-flex items-center gap-2 text-purple-600 font-black text-sm bg-purple-50 hover:bg-purple-100 px-5 py-3 rounded-xl transition-all">
              Explore Hotel Features <MdArrowForward />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── DYNAMIC ROI CALCULATOR ────────────────────────────────────────────────────
function ROICalculator() {
  const [employees, setEmployees] = useState(50);
  const [budget, setBudget] = useState(500000);
  const [flightPct, setFlightPct] = useState(60);
  const [currentTool, setCurrentTool] = useState("manual");

  const toolData = {
    manual: {
      label: "Manual / Email",
      saving: 0.28,
      color: "from-red-500 to-orange-500",
    },
    basic: {
      label: "Basic Portal",
      saving: 0.18,
      color: "from-orange-500 to-yellow-500",
    },
    competitor: {
      label: "Competitor Tool",
      saving: 0.12,
      color: "from-blue-500 to-cyan-500",
    },
  };

  const saving = budget * toolData[currentTool].saving;
  const annualSaving = saving * 12;
  const gstSaving = budget * 0.18 * 0.1;
  const timeSaved = Math.round(employees * 0.4);
  const compliance = Math.min(96, 58 + employees * 0.5);
  const breakEvenDays = Math.round(4999 / (saving / 30));

  const fmt = (n) =>
    n >= 100000
      ? `₹${(n / 100000).toFixed(1)}L`
      : n >= 1000
        ? `₹${(n / 1000).toFixed(0)}K`
        : `₹${Math.round(n)}`;
  const budgetLabel =
    budget >= 100000
      ? `₹${(budget / 100000).toFixed(1)}L`
      : `₹${(budget / 1000).toFixed(0)}K`;

  const sliderStyle = (val, min, max) => ({
    background: `linear-gradient(to right, #06b6d4 ${((val - min) / (max - min)) * 100}%, rgba(255,255,255,0.1) ${((val - min) / (max - min)) * 100}%)`,
  });

  return (
    <section
      id="roi-calculator"
      className="py-28 relative overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg,#0b1628 0%,#0f2744 45%,#0c3d5e 100%)",
      }}
    >
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: "radial-gradient(circle,white 1px,transparent 1px)",
          backgroundSize: "36px 36px",
        }}
      />
      <div className="absolute top-0 right-0 w-[40%] h-full opacity-[0.04]">
        <img src={IMAGES.globe} alt="" className="w-full h-full object-cover" />
      </div>
      <div className="absolute top-1/4 left-0 w-72 h-72 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="absolute bottom-1/4 right-0 w-72 h-72 rounded-full bg-orange-500/10 blur-3xl" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-14">
          <span className="inline-block bg-white/10 border border-white/20 text-cyan-300 text-xs font-black uppercase tracking-widest px-5 py-2 rounded-full mb-5">
            💰 ROI Calculator
          </span>
          <h2
            className="font-black text-white leading-tight mb-3"
            style={{
              fontFamily: "'Outfit',sans-serif",
              fontSize: "clamp(30px,4vw,50px)",
            }}
          >
            See Exactly How Much
            <br />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-yellow-400 to-orange-400">
              Your Company Will Save
            </span>
          </h2>
          <p className="text-white/55 text-base max-w-xl mx-auto">
            Drag the sliders to get a real-time personalised savings estimate.
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-8 items-start">
          {/* ── Controls ── */}
          <div className="lg:col-span-3 bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-md">
            <h3
              className="font-black text-white text-xl mb-8"
              style={{ fontFamily: "'Outfit',sans-serif" }}
            >
              Configure Your Company
            </h3>

            {/* Employees */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <label className="text-white/60 text-xs font-black uppercase tracking-widest block">
                    Travelling Employees
                  </label>
                  <p className="text-white/35 text-xs mt-0.5">
                    Employees who travel at least once a month
                  </p>
                </div>
                <span
                  className="font-black text-white text-2xl px-5 py-2 bg-cyan-500/20 border border-cyan-500/30 rounded-xl"
                  style={{ fontFamily: "'Outfit',sans-serif" }}
                >
                  {employees}
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="500"
                value={employees}
                onChange={(e) => setEmployees(Number(e.target.value))}
                className="w-full h-2.5 rounded-full appearance-none cursor-pointer"
                style={sliderStyle(employees, 5, 500)}
              />
              <div className="flex justify-between text-white/25 text-xs mt-2 font-semibold">
                <span>5</span>
                <span>100</span>
                <span>250</span>
                <span>500</span>
              </div>
            </div>

            {/* Budget */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <label className="text-white/60 text-xs font-black uppercase tracking-widest block">
                    Monthly Travel Budget
                  </label>
                  <p className="text-white/35 text-xs mt-0.5">
                    Total company spend on flights & hotels
                  </p>
                </div>
                <span
                  className="font-black text-white text-2xl px-5 py-2 bg-orange-500/20 border border-orange-500/30 rounded-xl"
                  style={{ fontFamily: "'Outfit',sans-serif" }}
                >
                  {budgetLabel}/mo
                </span>
              </div>
              <input
                type="range"
                min="50000"
                max="5000000"
                step="50000"
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="w-full h-2.5 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right,#f97316 ${((budget - 50000) / 4950000) * 100}%,rgba(255,255,255,0.1) ${((budget - 50000) / 4950000) * 100}%)`,
                }}
              />
              <div className="flex justify-between text-white/25 text-xs mt-2 font-semibold">
                <span>₹50K</span>
                <span>₹10L</span>
                <span>₹25L</span>
                <span>₹50L</span>
              </div>
            </div>

            {/* Flight mix */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <label className="text-white/60 text-xs font-black uppercase tracking-widest block">
                    Booking Mix
                  </label>
                  <p className="text-white/35 text-xs mt-0.5">
                    Proportion of flight vs hotel bookings
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-blue-300 font-bold text-xs">
                    ✈ {flightPct}%
                  </span>
                  <span className="text-white/30">|</span>
                  <span className="text-purple-300 font-bold text-xs">
                    🏨 {100 - flightPct}%
                  </span>
                </div>
              </div>
              <input
                type="range"
                min="20"
                max="80"
                value={flightPct}
                onChange={(e) => setFlightPct(Number(e.target.value))}
                className="w-full h-2.5 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right,#3b82f6 ${((flightPct - 20) / 60) * 100}%,rgba(255,255,255,0.1) ${((flightPct - 20) / 60) * 100}%)`,
                }}
              />
            </div>

            {/* Current tool */}
            <div>
              <label className="text-white/60 text-xs font-black uppercase tracking-widest block mb-3">
                Currently Using
              </label>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(toolData).map(([k, v]) => (
                  <button
                    key={k}
                    onClick={() => setCurrentTool(k)}
                    className={`px-3 py-4 rounded-2xl text-xs font-bold transition-all text-center border ${currentTool === k ? "bg-cyan-500/25 border-cyan-400/50 text-white shadow-lg shadow-cyan-500/20" : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white/80"}`}
                  >
                    <div
                      className={`w-2.5 h-2.5 rounded-full bg-linear-to-br ${v.color} mx-auto mb-2`}
                    />
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Results ── */}
          <div className="lg:col-span-2 space-y-4">
            {/* Hero savings card */}
            <div className="bg-linear-to-br from-emerald-500 to-green-600 rounded-3xl p-7 shadow-2xl shadow-emerald-500/30 relative overflow-hidden">
              <div className="absolute -top-6 -right-6 w-28 h-28 bg-white/10 rounded-full" />
              <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-white/8 rounded-full" />
              <p className="text-emerald-100 text-xs font-black uppercase tracking-widest mb-1 relative z-10">
                Monthly Savings vs {toolData[currentTool].label}
              </p>
              <p
                className="font-black text-white text-5xl leading-none relative z-10"
                style={{ fontFamily: "'Outfit',sans-serif" }}
              >
                {fmt(saving)}
              </p>
              <div className="mt-4 pt-4 border-t border-white/20 relative z-10 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-emerald-100/70 text-xs font-medium">
                    Annual ROI
                  </p>
                  <p
                    className="font-black text-yellow-300 text-2xl"
                    style={{ fontFamily: "'Outfit',sans-serif" }}
                  >
                    {fmt(annualSaving)}
                  </p>
                </div>
                <div>
                  <p className="text-emerald-100/70 text-xs font-medium">
                    Break-even
                  </p>
                  <p
                    className="font-black text-white text-2xl"
                    style={{ fontFamily: "'Outfit',sans-serif" }}
                  >
                    {breakEvenDays > 0 ? `${breakEvenDays}d` : "Day 1"}
                  </p>
                </div>
              </div>
            </div>

            {/* Mini stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/6 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-colors">
                <MdReceipt className="text-orange-400 text-2xl mb-2" />
                <p
                  className="font-black text-white text-xl"
                  style={{ fontFamily: "'Outfit',sans-serif" }}
                >
                  {fmt(gstSaving)}
                </p>
                <p className="text-white/45 text-xs font-medium mt-0.5">
                  GST ITC / month
                </p>
              </div>
              <div className="bg-white/6 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-colors">
                <MdAccessTime className="text-cyan-400 text-2xl mb-2" />
                <p
                  className="font-black text-white text-xl"
                  style={{ fontFamily: "'Outfit',sans-serif" }}
                >
                  {timeSaved}h
                </p>
                <p className="text-white/45 text-xs font-medium mt-0.5">
                  Time saved / week
                </p>
              </div>
              <div className="bg-white/6 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-colors">
                <MdPeople className="text-purple-400 text-2xl mb-2" />
                <p
                  className="font-black text-white text-xl"
                  style={{ fontFamily: "'Outfit',sans-serif" }}
                >
                  {employees}
                </p>
                <p className="text-white/45 text-xs font-medium mt-0.5">
                  Travellers managed
                </p>
              </div>
              <div className="bg-white/6 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-colors">
                <MdAutoGraph className="text-yellow-400 text-2xl mb-2" />
                <p
                  className="font-black text-white text-xl"
                  style={{ fontFamily: "'Outfit',sans-serif" }}
                >
                  {Math.round(toolData[currentTool].saving * 100)}%
                </p>
                <p className="text-white/45 text-xs font-medium mt-0.5">
                  Cost reduction
                </p>
              </div>
            </div>

            {/* Compliance */}
            <div className="bg-white/6 border border-white/10 rounded-2xl p-5">
              <div className="flex justify-between items-center mb-3">
                <p className="text-white/60 text-xs font-black uppercase tracking-wider">
                  Expected Policy Compliance
                </p>
                <p
                  className="font-black text-emerald-400 text-lg"
                  style={{ fontFamily: "'Outfit',sans-serif" }}
                >
                  {Math.round(compliance)}%
                </p>
              </div>
              <div className="h-3 bg-white/8 rounded-full overflow-hidden">
                <div
                  className="h-full bg-linear-to-r from-emerald-400 to-green-500 rounded-full transition-all duration-700"
                  style={{
                    width: `${compliance}%`,
                    boxShadow: "0 0 14px rgba(52,211,153,0.5)",
                  }}
                />
              </div>
              <div className="flex justify-between text-white/25 text-xs mt-1.5 font-medium">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            <button className="w-full py-4 rounded-2xl bg-linear-to-r from-orange-500 to-red-500 text-white font-black text-sm shadow-xl shadow-orange-500/30 hover:-translate-y-0.5 hover:shadow-orange-500/50 transition-all">
              Get My Full ROI Report →
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── CTA ───────────────────────────────────────────────────────────────────────
function CTASection() {
  return (
    <section
      className="py-28 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg,#1e3a5f 0%,#0f172a 100%)" }}
    >
      <div className="absolute inset-0">
        <img
          src={IMAGES.office}
          alt=""
          className="w-full h-full object-cover opacity-[0.07]"
        />
        <div className="absolute inset-0 bg-linear-to-br from-blue-900/93 to-slate-950/97" />
      </div>
      <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-500/8 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-orange-500/8 rounded-full translate-x-1/2 translate-y-1/2 blur-3xl" />
      <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
        <div className="inline-flex items-center gap-2 bg-white/8 border border-white/18 rounded-full px-5 py-2.5 mb-8">
          <BsLightningChargeFill className="text-yellow-400" />
          <span className="text-white text-xs font-black tracking-wider">
            Start Saving Today
          </span>
        </div>
        <h2
          className="font-black text-white leading-tight mb-5"
          style={{
            fontFamily: "'Outfit',sans-serif",
            fontSize: "clamp(34px,5vw,60px)",
          }}
        >
          Ready to Transform Your
          <br />
          Corporate Travel Program?
        </h2>
        <p className="text-white/60 text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
          Join 5,000+ companies saving lakhs every month. Get set up in under 24
          hours with zero IT effort required.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
          <input
            type="email"
            placeholder="Enter your work email"
            className="w-72 px-5 py-4 rounded-2xl bg-white/8 border-2 border-white/15 text-white placeholder:text-white/35 outline-none focus:border-cyan-400 text-sm backdrop-blur-sm transition-colors"
          />
          <button className="whitespace-nowrap bg-linear-to-r from-orange-500 to-red-500 text-white font-black px-9 py-4 rounded-2xl shadow-2xl shadow-orange-500/40 hover:-translate-y-1 hover:shadow-orange-500/60 transition-all text-sm">
            Request Free Demo
          </button>
        </div>
        <div className="flex flex-wrap justify-center gap-6 text-white/40 text-xs font-bold">
          {["✓ Setup in 24 hours", "✓ Dedicated onboarding"].map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="bg-slate-950 text-white py-10">
      <div className="max-w-7xl mx-auto px-6">
        {/* Top Row */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo + Tagline */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
              <MdFlightTakeoff className="text-white text-lg" />
            </div>
            <div>
              <p
                className="font-black text-lg"
                style={{ fontFamily: "'Outfit',sans-serif" }}
              >
                COTD
              </p>
              <p className="text-slate-400 text-xs">
                Corporate Travel Made Simple
              </p>
            </div>
          </div>

          {/* Simple Links */}
          <div className="flex items-center gap-6 text-sm text-slate-400 font-medium">
            <a href="#" className="hover:text-white transition-colors">
              About
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Contact
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Terms
            </a>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="border-t border-white/10 mt-8 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} COTD. All rights reserved.</p>

          <div className="flex gap-4">
            <FaLinkedin className="hover:text-white cursor-pointer transition-colors" />
            <FaTwitter className="hover:text-white cursor-pointer transition-colors" />
            <FaFacebook className="hover:text-white cursor-pointer transition-colors" />
            <FaInstagram className="hover:text-white cursor-pointer transition-colors" />
          </div>
        </div>
      </div>
    </footer>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [showAuth, setShowAuth] = useState(false);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap');
        * { box-sizing: border-box; }
        body { font-family: 'DM Sans', sans-serif; margin: 0; }
        html { scroll-behavior: smooth; }
        
        @keyframes marquee-ltr {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee-ltr {
          animation: marquee-ltr 40s linear infinite;
        }
        .animate-marquee-ltr:hover {
          animation-play-state: paused;
        }

        input[type=range] { -webkit-appearance: none; appearance: none; }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 22px; height: 22px; border-radius: 50%;
          background: white; cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.35);
          border: 2px solid rgba(0,0,0,0.1);
        }
        input[type=range]::-moz-range-thumb {
          width: 22px; height: 22px; border-radius: 50%;
          background: white; cursor: pointer; border: 2px solid rgba(0,0,0,0.1);
          box-shadow: 0 2px 8px rgba(0,0,0,0.35);
        }
      `}</style>
      <Navbar onAuthOpen={() => setShowAuth(true)} />
      <Hero />
      <TrustedBy />
      <Features />
      <HowItWorks />
      <Benefits />
      <ROICalculator />
      <CTASection />
      <Footer />
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  );
}
