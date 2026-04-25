// TraveamerLanding.jsx
import React from "react";
import {
  RiCheckLine,
  RiMapPinLine,
  RiCalendarLine,
  RiFlightTakeoffLine,
  RiHotelLine,
  RiBriefcaseLine,
  RiShieldCheckLine,
  RiTeamLine,
  RiSettings3Line,
  RiNotificationLine,
  RiFileTextLine,
  RiTimeLine,
  RiBarChartLine,
  RiUserLine,
  RiMailCloseLine,
  RiClipboardLine,
} from "react-icons/ri";
import LandingHeader from "../../../layout/LandingHeader";
import LandingFooter from "../../../layout/LandingFooter";
import { FiAirplay, FiCalendar, FiHome } from "react-icons/fi";
import { MdFlight, MdOutlineShield } from "react-icons/md";
import { LuPlane, LuSendHorizontal } from "react-icons/lu";
import { BsBell, BsSend } from "react-icons/bs";
import { CiCircleCheck, CiStar } from "react-icons/ci";
import { TbPointFilled, TbUsers } from "react-icons/tb";
import { AiOutlineThunderbolt } from "react-icons/ai";

// ─── Brand Color Constants ────────────────────────────────────────────────────
const C = {
  black: "#000000",
  navy: "#000D26",
  navyDeep: "#04112F",
  emerald: "#059669",
  navyMid: "#0A243D",
  nearBlack: "#0C0C0C",
  navyDark: "#102238",
  muted: "#65758B",
  gold: "#C9A240",
  amber: "#D97706",
  border: "#E1E7EF",
  lightGray: "#F5F5F5",
  offWhite: "#F8FAFC",
  cream: "#FFFBEB",
  white: "#FFFFFF",
};

// ─── COLOR TOKENS ─────────────────────────────────────────────────────────────
// Change any value here to retheme the entire page — nowhere else needs editing.
const C_BLACK = "[#000000]"; // pure black — text on gold
const C_NAVY_DEEP = "[#000D26]"; // deepest navy — hero gradient end, ticker, CTA bg
const C_FOOTER_TEXT = "[#04112F]"; // footer copyright / links
const C_CTA_BTN_TEXT = "[#0A243D]"; // "Start Free Trial" button text
const C_NAVBAR_BG = "[#0C0C0C]"; // navbar background
const C_STEP_NUM = "[#102238]"; // step-number text on gold badge
const C_BODY_TEXT = "[#65758B]"; // body / secondary text (azure-47)
const C_GOLD = "[#C9A240]"; // primary accent — gold (replaces orange)
const C_CARD_BORDER = "[#E1E7EF]"; // card border on light sections
const C_NAV_LIGHT = "[#F5F5F5]"; // light navbar variant bg
const C_SECTION_BG = "[#F8FAFC]"; // light section background
const C_WHITE = "[#ffffff]"; // white — card bg, text on dark
// ─────────────────────────────────────────────────────────────────────────────

// Derived inline style values (for rgba / gradients that Tailwind can't do)
const GOLD_HEX = "#C9A240";
const GOLD_10 = "rgba(201,162,64,0.10)";
const GOLD_20 = "rgba(201,162,64,0.20)";
const WHITE_5 = "rgba(255,255,255,0.05)";
const WHITE_10 = "rgba(255,255,255,0.10)";
const WHITE_30 = "rgba(255,255,255,0.30)";
const HERO_GRADIENT = "linear-gradient(348deg, #003399 0%, #000D26 100%)";

const ORANGE = "#C9A84C";
const ORANGE_FADE = "rgba(201,162,64,0.1)";
const ORANGE_FADE_20 = "rgba(201,162,64,0.2)";
// Card-specific dark colors (matching Figma screenshot)
const CARD_BG = "#ffffff"; // main card body
const CARD_HEADER_BG = "#1a2d4a"; // card header strip
const CARD_CELL_BG = "#1e3152"; // info cells inside card
const CARD_ROW_BG = "#1a2d4a"; // approval-status rows
const CARD_BORDER = "rgba(255,255,255,0.10)";

// ─── Shared UI Atoms ──────────────────────────────────────────────────────────

/** Orange pill badge */
const Badge = ({ children }) => (
  <span
    className="inline-block rounded-full px-4 py-1 text-[11px] font-bold uppercase tracking-[0.15em]"
    style={{
      background: C.gold + "33",
      color: C.gold,
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}
  >
    {children}
  </span>
);

/** Solid-gold label bar (replaces colored chip) */
const SectionLabel = ({ children }) => (
  <div className="inline-block mb-4 px-2 py-0.5" style={{ background: C.gold }}>
    <span
      className="text-[11px] font-bold uppercase tracking-[0.18em]"
      style={{ color: C.black, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {children}
    </span>
  </div>
);

const PrimaryBtn = ({ children, className = "" }) => (
  <button
    className={`px-7 py-2.5 rounded-[10px] text-sm font-bold cursor-pointer border-0 transition-opacity hover:opacity-90 ${className}`}
    style={{
      background: C.gold,
      color: C.black,
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}
  >
    {children}
  </button>
);

const OutlineBtn = ({ children, dark = false, className = "" }) => (
  <button
    className={`px-7 py-2.5 rounded-[10px] text-sm font-medium cursor-pointer bg-transparent transition-opacity hover:opacity-80 ${className}`}
    style={{
      color: dark ? C.navyDeep : C.white,
      border: `2px solid ${dark ? C.border : "rgba(255,255,255,0.3)"}`,
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}
  >
    {children}
  </button>
);

// ─── 1. Hero Section ──────────────────────────────────────────────────────────
const HeroSection = () => (
  <section
    className="overflow-hidden relative "
    style={{
      background: HERO_GRADIENT,
    }}
  >
    {/* ── Main two-column row ── */}
    <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center md:items-start justify-between px-6 md:px-10 lg:px-16 py-10 md:py-16 lg:py-20 gap-10 md:gap-8 lg:gap-16">
      {/* ────────────── Left column ────────────── */}
      <div
        className="flex flex-col justify-start items-center md:items-start w-full md:w-1/2 text-center md:text-left"
        style={{ paddingBottom: 0, paddingTop: 40 }}
      >
        {/* Badge pill */}
        <div className="mb-6 flex justify-center md:justify-start">
          <div
            className="px-4 py-1.5 rounded-full inline-flex items-center"
            style={{
              background: ORANGE_FADE,
              border: `1px solid rgba(201,162,64,0.25)`,
            }}
          >
            <span
              className="text-[10px] md:text-[11px] font-semibold uppercase leading-4 tracking-widest"
              style={{
                color: ORANGE,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              Platform · Approval Workflow
            </span>
          </div>
        </div>

        {/* Headline */}
        <div className="mb-6">
          <h1
            className="font-normal leading-tight md:leading-[1.1] lg:leading-[1.08]"
            style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: "clamp(32px, 5vw, 60px)",
              color: C.white,
              margin: 0,
            }}
          >
            Control without
            <br />
            the{" "}
            <em
              style={{
                color: ORANGE,
                fontStyle: "italic",
                fontFamily: "'DM Serif Display', serif",
              }}
            >
              chaos.
            </em>
          </h1>
        </div>

        {/* Subtext */}
        <div className="mb-8 w-full max-w-xl md:max-w-full">
          <div className="text-white/70 text-sm md:text-base font-normal font-['Plus_Jakarta_Sans'] leading-relaxed md:leading-7">
            Every travel request goes to the right person. Approved in one
            click. Documented automatically. No more messy emails — you stay in
            sync with your team.
          </div>
        </div>

        {/* CTA row */}
        <div className="flex gap-3 mb-10 md:mb-12 flex-wrap items-center justify-center md:justify-start">
          {/* Gold filled button */}
          <button
            className="h-10 md:h-11 px-6 md:px-8 rounded-lg text-xs md:text-sm font-semibold cursor-pointer border-0 transition-opacity hover:opacity-90"
            style={{
              background: ORANGE,
              color: C.navyDeep,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              boxShadow:
                "0px 10px 15px -3px rgba(201,162,64,0.20), 0px 4px 6px -4px rgba(201,162,64,0.20)",
            }}
          >
            Start Free Trial
          </button>

          {/* Outline button */}
          <button
            className="h-10 md:h-11 px-6 md:px-8 rounded-lg text-xs md:text-sm font-medium cursor-pointer bg-transparent transition-opacity hover:opacity-80"
            style={{
              color: C.white,
              border: "2px solid rgba(255,255,255,0.30)",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            See How It Works →
          </button>
        </div>

        <div className="flex flex-wrap gap-5 md:gap-8 lg:gap-10 justify-center md:justify-start">
          {[
            { v: "1", l: "Review screen" },
            { v: "100%", l: "Trips on record" },
            { v: "0", l: "Email back-and-forth" },
          ].map(({ v, l }) => (
            <div key={l} className="flex flex-col gap-1">
              <span
                className="text-lg md:text-xl lg:text-2xl font-bold leading-7 md:leading-8"
                style={{
                  color: ORANGE,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              >
                {v}
              </span>
              <span
                className="text-[9px] md:text-[10px] lg:text-xs font-normal leading-4"
                style={{
                  color: "rgba(255,255,255,0.50)",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              >
                {l}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ────────────── Right: Approval Card ────────────── */}
      <div
        className="w-full max-w-[560px] mx-auto lg:mx-0 rounded-xl overflow-hidden shadow-2xl"
        style={{
          background: "rgba(255,255,255,0.05)",
          border: `1px solid ${CARD_BORDER}`,
          marginTop: 0,
          marginBottom: 0,
        }}
      >
        {/* Card header */}
        <div
          className="flex justify-between items-center px-6 py-4"
          style={{
            background: CARD_HEADER_BG,
            borderBottom: `1px solid ${CARD_BORDER}`,
          }}
        >
          <span
            className="text-base font-normal leading-5"
            style={{ color: C.white, fontFamily: "'DM Serif Display', serif" }}
          >
            Travel Request — Pending Approval
          </span>
          <span
            className="w-2 h-2 rounded-full block"
            style={{ background: ORANGE }}
          />
        </div>

        {/* Card body */}
        <div className="p-6 flex flex-col gap-5">
          {/* REQUEST DETAILS label */}
          <p
            className="text-[10px] font-medium uppercase leading-4 tracking-widest"
            style={{
              color: "rgba(255,255,255,0.40)",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            Request Details
          </p>

          {/* User row */}
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: "rgba(201,162,64,0.25)" }}
            >
              <RiUserLine size={18} style={{ color: ORANGE }} />
            </div>
            <div>
              <p
                className="text-sm font-semibold leading-5"
                style={{
                  color: C.white,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              >
                Amit Kumar
              </p>
              <p
                className="text-xs font-normal leading-4"
                style={{
                  color: "rgba(255,255,255,0.50)",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              >
                Sales Executive · Mumbai
              </p>
            </div>
          </div>

          {/* Info grid — 2 × 2 */}
          <div className="grid grid-cols-2 gap-2">
            {[
              {
                k: "Route",
                v: "Mumbai → Delhi",
                icon: (
                  <LuPlane className="inline ml-1 text-[#C9A84C]" size={14} />
                ),
              },
              {
                k: "Dates",
                v: "22–24 April",
                icon: (
                  <FiCalendar
                    className="inline ml-1 text-[#C9A84C]"
                    size={14}
                  />
                ),
              },
              {
                k: "Flight",
                v: "₹4,200",
                icon: (
                  <FiAirplay className="inline ml-1 text-[#C9A84C]" size={14} />
                ),
              },
              {
                k: "Hotel",
                v: "₹7,500/n",
                icon: (
                  <FiHome className="inline ml-1 text-[#C9A84C]" size={14} />
                ),
              },
            ].map(({ k, v, icon }) => (
              <div
                key={k}
                className="rounded-lg px-4 py-3 bg-white/5"
                style={{
                  border: `1px solid ${CARD_BORDER}`,
                }}
              >
                <p
                  className="text-[10px] font-normal uppercase leading-4 tracking-widest mb-1"
                  style={{
                    color: "rgba(255,255,255,0.40)",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}
                >
                  {k}
                </p>

                <p
                  className="text-sm font-medium leading-5 flex items-center"
                  style={{
                    color: C.white,
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}
                >
                  {v}
                  {icon}
                </p>
              </div>
            ))}
          </div>

          {/* APPROVAL STATUS label */}
          <p
            className="text-[10px] font-medium uppercase leading-4 tracking-widest pt-1"
            style={{
              color: "rgba(255,255,255,0.40)",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            Approval Status
          </p>

          {/* Status rows */}
          <div className="flex flex-col gap-2">
            <div
              className="flex justify-between items-center px-4 py-2.5 rounded-lg bg-white/5"
              style={{
                border: `1px solid ${CARD_BORDER}`,
              }}
            >
              <span
                className="text-sm font-normal leading-5"
                style={{
                  color: "rgba(255,255,255,0.80)",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              >
                Rajat Gupta — Manager
              </span>
              <span
                className="text-xs font-semibold leading-4"
                style={{
                  color: ORANGE,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              >
                Informed
              </span>
            </div>
            <div
              className="flex justify-between items-center px-4 py-2.5 rounded-lg bg-white/5"
              style={{
                border: `1px solid ${CARD_BORDER}`,
              }}
            >
              <span
                className="text-sm font-normal leading-5"
                style={{
                  color: "rgba(255,255,255,0.80)",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              >
                Sunita Sharma — Travel Admin
              </span>
              <span
                className="text-xs font-semibold leading-4"
                style={{
                  color: "rgba(201,162,64,0.70)",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              >
                In Review
              </span>
            </div>
          </div>

          {/* PROJECT COST ID */}
          <div className="flex flex-col gap-2 pt-1">
            <p
              className="text-[10px] font-normal uppercase leading-4 tracking-widest"
              style={{
                color: "rgba(255,255,255,0.40)",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              Project Cost ID
            </p>
            <p
              className="text-xs font-normal leading-4"
              style={{
                color: "rgba(255,255,255,0.65)",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              Tuna — Phase 2 Site Review
            </p>

            {/* Approve CTA */}
            <button
              className="w-full flex items-center justify-center gap-3 h-12 rounded-lg text-sm font-semibold cursor-pointer border-0 transition-opacity hover:opacity-90"
              style={{
                background: ORANGE,
                color: C.navyDeep,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                boxShadow:
                  "0px 10px 15px -3px rgba(201,162,64,0.20), 0px 4px 6px -4px rgba(201,162,64,0.20)",
              }}
            >
              <RiCheckLine size={16} />
              Approve &amp; Notify Employee
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
);

// ─── 2. Feature strip ──────────────────────────────────────────────────────────
const Features = () => {
  const items = [
    { bold: "One click", light: "to approve any request" },
    { bold: "Project Cost ID", light: "mandatory on every approval" },
    { bold: "Full audit trail", light: "auto generated always" },
    { bold: "Auto notifications", light: "employee informed instantly" },
  ];

  return (
    <div className="w-full bg-[#020617] border-t border-white/10 py-10 lg:py-6 px-6 lg:px-4 overflow-hidden">
      <div className="max-w-7xl mx-auto relative">
        {/* Carousel Container */}
        <div className="flex w-max md:w-full md:grid md:grid-cols-2 lg:grid-cols-4 md:justify-items-center items-center gap-x-10 md:gap-x-6 lg:gap-8 animate-infinite-scroll md:animate-none">
          {/* Original Items */}
          {items.map((it, idx) => (
            <div
              key={`orig-${idx}`}
              className="flex flex-col md:items-center lg:items-start text-left md:text-center lg:text-left whitespace-nowrap md:whitespace-normal"
            >
              <span className="text-white font-bold text-sm font-['Plus_Jakarta_Sans']">
                {it.bold}
              </span>
              <span className="text-white/60 font-normal text-xs md:text-sm font-['Plus_Jakarta_Sans'] mt-1">
                {it.light}
              </span>
            </div>
          ))}

          {/* Duplicated Items (Hidden on MD screens and above) */}
          <div className="flex md:hidden gap-x-10">
            {items.map((it, idx) => (
              <div
                key={`dup-${idx}`}
                className="flex flex-col text-left whitespace-nowrap"
              >
                <span className="text-white font-bold text-sm font-['Plus_Jakarta_Sans']">
                  {it.bold}
                </span>
                <span className="text-white/60 font-normal text-xs md:text-sm font-['Plus_Jakarta_Sans'] mt-1">
                  {it.light}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── 3. How It Works ──────────────────────────────────────────────────────────
const STEPS = [
  {
    n: 1,
    title: "Employee raises a travel request",
    desc: "Employee selects a flight or hotel within policy and submits the request to the travel admin or manager.",
  },
  {
    n: 2,
    title: "Travel Admin and Manager notified instantly",
    desc: "The travel admin or manager receives a notification instantly via the app or email, with all trip details, policy status and cost mentioned for quick approval.",
  },
  {
    n: 3,
    title: "Travel Admin approves in one click",
    desc: "The admin/manager reviews the request and clicks approve on the dashboard. The system documents everything automatically — no manual entry required.",
  },
  {
    n: 4,
    title: "Employee notified — books instantly",
    desc: "Once the travel request is approved, the employee is notified through the app and via email. They can book the trip with just one click.",
  },
];

const HowItWorksSection = () => (
  <section
    className="w-full py-16 lg:py-24 px-6 lg:px-12"
    style={{ background: C.offWhite }}
  >
    <div className="max-w-7xl mx-auto flex flex-col justify-start items-start gap-3.5">
      <div className="self-stretch inline-flex justify-start items-start gap-4">
        <div className="inline-flex flex-col justify-start items-start gap-3.5">
          <div
            style={{ background: ORANGE }}
            className="w-full max-w-[512px] px-2.5 py-1 flex flex-col justify-start items-start"
          >
            <div className="text-black text-[10px] lg:text-xs font-semibold font-['Plus_Jakarta_Sans'] uppercase leading-4 tracking-[2.40px]">
              How It Works
            </div>
          </div>
          <div className="self-stretch flex flex-col justify-start items-start">
            <h2 className="text-black text-3xl md:text-4xl font-normal font-['DM_Serif_Display'] leading-tight">
              Request. Notify. Approve.
              <br />
              <span style={{ color: ORANGE }} className="italic">
                Book. Done.
              </span>
            </h2>
          </div>
        </div>
      </div>
      <div className="w-full max-w-[512px] flex flex-col justify-start items-start">
        <div className="text-[#65758B] text-sm lg:text-base font-normal font-['Plus_Jakarta_Sans'] leading-relaxed">
          Seamlessly connect employees and managers for faster booking.
        </div>
      </div>
    </div>
    <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-start lg:items-end gap-16 mt-12 lg:mt-[68px]">
      {/* Left Column*/}
      <div className="w-full lg:w-1/2 flex flex-col justify-start items-start gap-12 lg:gap-[70px]">
        {STEPS.map((step) => (
          <div key={step.n} className="flex justify-start items-start gap-5">
            <div
              style={{ background: ORANGE_FADE }}
              className="w-10 h-10 min-w-[40px] rounded-full flex justify-center items-center"
            >
              <div
                style={{ color: ORANGE }}
                className="text-lg font-bold font-['Plus_Jakarta_Sans']"
              >
                {step.n}
              </div>
            </div>
            <div className="flex flex-col justify-start items-start gap-2">
              <h3 className="text-slate-950 text-xl font-normal font-['DM_Serif_Display'] leading-7">
                {step.title}
              </h3>
              <p className="text-[#65758B] text-sm lg:text-base font-normal font-['Plus_Jakarta_Sans'] leading-relaxed">
                {step.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Right Column */}
      <div className="w-full lg:w-1/2 flex flex-col justify-start items-start gap-8">
        <div className="w-full bg-white rounded-xl shadow-xl border border-gray-100 flex flex-col justify-start items-start gap-2.5 overflow-hidden">
          <div
            style={{ background: ORANGE_FADE_20 }}
            className="self-stretch h-12 px-5 py-3 border-b border-gray-100 inline-flex justify-start items-center gap-2"
          >
            <BsSend style={{ color: ORANGE }} />
            <div className="text-[#C9A240] text-sm font-semibold font-['Plus_Jakarta_Sans']">
              Travel Admin — Action Required
            </div>
          </div>
          <div className="self-stretch px-5 lg:px-8 py-6 lg:py-8 flex flex-col justify-start items-start gap-6">
            <div className="self-stretch text-slate-600 text-sm lg:text-base font-['Plus_Jakarta_Sans'] leading-relaxed">
              <span className="font-bold">Amit Kumar</span> has requested travel
              to <span className="font-bold">Delhi on 22 April</span>. Flight
              Cost: ₹4,200, Hotel: ₹7,500/n. Manager: Rajat Gupta. Amount:
              ₹75,300. <span className="font-bold">Total: ₹79,800</span>.
              Project: Tuna, Travel Policy: Standard.
            </div>

            <div className="w-full flex flex-col sm:flex-row gap-3">
              <button
                style={{ background: ORANGE }}
                className="w-full sm:flex-1 h-12 rounded-lg flex justify-center items-center text-slate-950 text-sm font-semibold font-['Plus_Jakarta_Sans'] hover:opacity-90 transition-opacity"
              >
                Approve Request
              </button>
              <button className="w-full sm:flex-1 h-12 rounded-lg border-2 border-slate-200 flex justify-center items-center text-slate-400 text-sm font-semibold font-['Plus_Jakarta_Sans'] hover:bg-slate-50 transition-colors">
                Reject
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);
// ─── 4. Who Approves ──────────────────────────────────────────────────────────
const ROLES = [
  {
    icon: <MdOutlineShield size={22} />,
    title: "Travel Admin",
    sub: "Manages operations · Ensures compliance",
    points: [
      "Manage and onboard employees to the platform",
      "Customise the rules and policy for every employee",
      "Full visibility into every travel request across the company",
      "Manage everything from the admin panel",
    ],
  },
  {
    icon: <TbUsers size={22} />,
    title: "Manager",
    sub: "Informed · Set budgets",
    points: [
      "Review travel requests from your team and approve instantly",
      "Every trip is counted towards a budget and project",
      "No more manual entry — everything is tracked",
      "Never miss a request with real-time notifications",
    ],
  },
  {
    icon: <CiStar size={22} />,
    title: "Super User",
    sub: "Full access · Any booking",
    points: [
      "Book on behalf of any employee in the company",
      "For secretary and admins who book for other staff",
      "Manage every booking and expense in a single view",
      "Full control — no matter how big the team",
    ],
  },
];

const WhoApprovesSection = () => (
  <section className="py-20 px-6 lg:px-12" style={{ background: C.offWhite }}>
    <div className="max-w-7xl mx-auto space-y-12">
      <div className="flex flex-col justify-start items-start gap-3.5">
        <div
          style={{ background: ORANGE }}
          className="w-full md:w-[519px] px-2.5 py-1 flex flex-col justify-start items-start"
        >
          <div className="text-black text-[10px] lg:text-xs font-semibold font-['Plus_Jakarta_Sans'] uppercase leading-4 tracking-[2.40px]">
            Who Approves
          </div>
        </div>
        <div className="flex flex-col justify-start items-start">
          <h2 className="text-slate-800 text-3xl md:text-4xl font-normal font-['DM_Serif_Display'] leading-tight">
            Every role has a<br />
            <span style={{ color: ORANGE }} className="italic">
              clear purpose.
            </span>
          </h2>
        </div>
        <div className="max-w-xl">
          <p className="text-slate-500 text-sm lg:text-base font-normal font-['Plus_Jakarta_Sans'] leading-relaxed">
            From booking to approvals, Managers and Admin stay informed.
            Experience effortless travel management through a purpose-driven
            dashboard.
          </p>
        </div>
      </div>

      <div
        className="grid gap-6"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}
      >
        {ROLES.map((r) => (
          <div
            key={r.title}
            className="rounded-2xl p-7"
            style={{ background: C.white, border: `1px solid ${C.border}` }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
              style={{ background: C.gold + "1a", color: C.gold }}
            >
              {r.icon}
            </div>
            <p
              className="text-xl mb-1"
              style={{
                fontFamily: "'DM Serif Display', serif",
                color: C.navyDeep,
              }}
            >
              {r.title}
            </p>
            <p
              className="text-[11px] mb-5"
              style={{
                color: C.muted,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              {r.sub}
            </p>
            <ul className="flex flex-col gap-3 list-none p-0 m-0">
              {r.points.map((pt) => (
                <li key={pt} className="flex items-start gap-2">
                  <span
                    className="mt-[3px] flex-none"
                    style={{ color: C.gold }}
                  >
                    <TbPointFilled size={14} />
                  </span>
                  <span
                    className="text-sm leading-[1.6]"
                    style={{
                      color: C.muted,
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                    }}
                  >
                    {pt}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  </section>
);

// ─── 5. Why It Matters ────────────────────────────────────────────────────────
const STATS = [
  {
    icon: <AiOutlineThunderbolt color={ORANGE} size={24} />,
    value: "60s",
    label: "Average Approval Time",
  },
  {
    icon: <RiFileTextLine className="text-blue-400" size={24} />,
    value: "100%",
    label: "Auditable trail of approvals",
  },
  {
    icon: <RiMailCloseLine className="text-green-400" size={24} />,
    value: "0",
    label: "Manual Reconciliation",
  },
  {
    icon: <RiClipboardLine color={ORANGE} size={24} />,
    value: "1",
    label: "Consolidated Report",
  },
];

const WhyItMattersSection = () => {
  return (
    <section className="relative w-full min-h-[600px] bg-gradient-to-b from-slate-950 to-blue-900 py-16 lg:py-24 px-6 lg:px-12 flex flex-col justify-center overflow-hidden">
      {/* Background Large Text Overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
        <h1 className="text-[80px] lg:text-[180px] font-bold font-sans whitespace-nowrap text-white/20">
          Always on Record
        </h1>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto w-full">
        {/* Header Section */}
        <div className="mb-12 lg:mb-16">
          <div
            style={{ background: ORANGE }}
            className="w-full md:w-[519px] px-2.5 py-1 inline-flex flex-col justify-start items-start"
          >
            <div className="text-black text-[10px] lg:text-xs font-semibold font-['Plus_Jakarta_Sans'] uppercase leading-4 tracking-[2.40px]">
              Why It Matters
            </div>
          </div>

          <h2 className="text-white text-3xl md:text-5xl font-normal font-['DM_Serif_Display'] leading-tight my-4">
            Every trip. Every approval.
            <br />
            Always on record.
          </h2>

          <div className="max-w-2xl text-white/50 text-sm lg:text-base font-normal font-['Plus_Jakarta_Sans'] leading-relaxed">
            Whether you are a startup or a growing business, stay organized.
            Know exactly who approved what — and keep travel on track.
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {STATS.map((stat, index) => (
            <div
              key={index}
              className="border-2 border-white rounded-xl p-4 sm:p-6 md:p-8 flex flex-col items-center justify-center"
            >
              <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mb-6">
                {stat.icon}
              </div>
              <div
                style={{ color: ORANGE }}
                className=" text-4xl font-serif mb-2"
              >
                {stat.value}
              </div>
              <div className="text-white/50 text-sm text-center font-sans">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ─── 6. CTA Section ───────────────────────────────────────────────────────────
const PERKS = [
  "30-day free trial",
  "No credit card required",
  "Live in under 2 hours",
  "GST invoices from day one",
];

const CTASection = () => (
  <section className="py-16 px-6 mt-15" style={{ background: C.navyDeep }}>
    <div className="max-w-3xl mx-auto text-center">
      <p
        className="text-[11px] font-bold uppercase tracking-[0.18em] mb-5"
        style={{ color: C.gold, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        Get Started Today
      </p>

      <h2
        className="font-normal leading-tight mb-4"
        style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: "clamp(28px, 6vw, 40px)",
          color: C.white,
        }}
      >
        Ready to bring <span style={{ color: C.gold }}>structure</span> to your
        company's travel?
      </h2>

      <p
        className="text-[15px] leading-[1.7] mb-8 max-w-[420px] mx-auto"
        style={{
          color: "rgba(255,255,255,0.5)",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        Join hundreds of Indian MSMEs who replaced travel chaos with Traveamer.
        Free 30-day trial. No credit card needed.
      </p>

      <div className="flex gap-3 justify-center mb-7 flex-wrap">
        <PrimaryBtn>Start Free Trial</PrimaryBtn>
        <OutlineBtn>Book a Demo</OutlineBtn>
      </div>

      <div className="flex gap-5 justify-center flex-wrap">
        {PERKS.map((p) => (
          <div key={p} className="flex items-center gap-1.5">
            <RiCheckLine size={14} style={{ color: C.gold }} />
            <span
              className="text-xs"
              style={{
                color: "rgba(255,255,255,0.5)",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              {p}
            </span>
          </div>
        ))}
      </div>
    </div>
  </section>
);

// ─── Root Export ──────────────────────────────────────────────────────────────
export default function ApprovalWorkflow() {
  return (
    <main className="w-full mx-auto">
      <LandingHeader />
      <>
        <HeroSection />
        <Features />
        <HowItWorksSection />
        <WhoApprovesSection />
        <WhyItMattersSection />
        <CTASection />
      </>
      <LandingFooter />
    </main>
  );
}
