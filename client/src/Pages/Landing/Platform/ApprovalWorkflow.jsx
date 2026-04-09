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
} from "react-icons/ri";
import LandingHeader from "../../../layout/LandingHeader";
import LandingFooter from "../../../layout/LandingFooter";
import { FiAirplay, FiCalendar, FiHome } from "react-icons/fi";
import { MdFlight } from "react-icons/md";
import { LuPlane, LuSendHorizontal } from "react-icons/lu";
import { BsSend } from "react-icons/bs";

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
    <div className="mx-auto flex items-start justify-between px-20 py-[52px]">
      {/* ────────────── Left column ────────────── */}
      <div
        className="flex flex-col justify-start items-start"
        style={{ paddingBottom: 86, paddingTop: 80 }}
      >
        {/* Badge pill */}
        <div className="mb-6">
          <div
            className="px-4 py-1.5 rounded-full inline-flex items-center"
            style={{
              background: ORANGE_FADE,
              border: `1px solid rgba(201,162,64,0.25)`,
            }}
          >
            <span
              className="text-[11px] font-semibold uppercase leading-4 tracking-widest"
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
            className="font-normal leading-[1.08]"
            style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: 60,
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
        <div className="mb-8" style={{ maxWidth: 480 }}>
          <div className="justify-center text-white/70 text-md font-normal font-['Plus_Jakarta_Sans'] leading-7">
            Every travel request goes to the right person. Approved in
            <br />
            one click. Documented automatically. No more messy
            <br />
            emails — you stay in sync with your team.
          </div>
        </div>

        {/* CTA row */}
        <div className="flex gap-3 mb-12 flex-wrap items-center">
          {/* Gold filled button */}
          <button
            className="h-11 px-8 rounded-lg text-sm font-semibold cursor-pointer border-0 transition-opacity hover:opacity-90"
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
            className="h-11 px-8 rounded-lg text-sm font-medium cursor-pointer bg-transparent transition-opacity hover:opacity-80"
            style={{
              color: C.white,
              border: "2px solid rgba(255,255,255,0.30)",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            See How It Works →
          </button>
        </div>

        {/* Stats row */}
        <div className="flex gap-10">
          {[
            { v: "1", l: "Review screen" },
            { v: "100%", l: "Trips on record" },
            { v: "0", l: "Email back-and-forth" },
          ].map(({ v, l }) => (
            <div key={l} className="flex flex-col gap-1">
              <span
                className="text-2xl font-bold leading-8"
                style={{
                  color: ORANGE,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              >
                {v}
              </span>
              <span
                className="text-xs font-normal leading-4"
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
        className="flex-none rounded-xl overflow-hidden"
        style={{
          width: 560,
          background: "rgba(255,255,255,0.05)",
          border: `1px solid ${CARD_BORDER}`,
          marginTop: 40,
          marginBottom: 40,
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
const Features = () => (
  <div className="w-full bg-[#020617] border-t border-white/10 py-5 px-4">
    <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-6">
      {/* Item 1 */}
      <div className="flex items-center whitespace-nowrap">
        <span className="text-white font-bold text-sm font-['Plus_Jakarta_Sans']">
          One click{" "}
        </span>
        <span className="text-white/60 font-normal text-sm font-['Plus_Jakarta_Sans'] ml-1.5">
          to approve any request
        </span>
      </div>

      {/* Item 2 */}
      <div className="flex items-center whitespace-nowrap">
        <span className="text-white font-bold text-sm font-['Plus_Jakarta_Sans']">
          Project Cost ID{" "}
        </span>
        <span className="text-white/60 font-normal text-sm font-['Plus_Jakarta_Sans'] ml-1.5">
          mandatory on every approval
        </span>
      </div>

      {/* Item 3 */}
      <div className="flex items-center whitespace-nowrap">
        <span className="text-white font-bold text-sm font-['Plus_Jakarta_Sans']">
          Full audit trail
        </span>
        <span className="text-white/60 font-normal text-sm font-['Plus_Jakarta_Sans']">
          &mdash; auto generated always
        </span>
      </div>

      {/* Item 4 */}
      <div className="flex items-center whitespace-nowrap">
        <span className="text-white font-bold text-sm font-['Plus_Jakarta_Sans']">
          Auto notifications
        </span>
        <span className="text-white/60 font-normal text-sm font-['Plus_Jakarta_Sans']">
          &mdash; employee informed instantly
        </span>
      </div>
    </div>
  </div>
);

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
    className="py-24 px-6 md:pl-[51px] pr-[53px] "
    style={{ background: C.offWhite }}
  >
    <div className="w-[1338px] inline-flex flex-col justify-start items-start gap-3.5">
      <div className="self-stretch inline-flex justify-start items-start gap-4">
        <div className="inline-flex flex-col justify-start items-start gap-3.5">
          <div
            style={{ background: ORANGE }}
            className="w-[512px] px-[5px] py-0.5  flex flex-col justify-start items-start"
          >
            <div className="justify-center text-black text-xs font-semibold font-['Plus_Jakarta_Sans'] uppercase leading-4 tracking-[2.40px]">
              How It Works
            </div>
          </div>
          <div className="self-stretch flex flex-col justify-start items-start">
            <div className="justify-center">
              <span className="text-black text-4xl font-normal font-['DM_Serif_Display'] leading-10">
                Request. Notify. Approve.
                <br />
              </span>
              <span
                style={{ color: ORANGE }}
                className="italic text-4xl font-normal font-['DM_Serif_Display'] leading-10"
              >
                Book. Done.
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="w-full max-w-[512px] pl-3 flex flex-col justify-start items-start">
        <div className="justify-center text-[#65758B] text-base font-normal font-['Plus_Jakarta_Sans'] leading-6">
          Seamlessly connect employees and managers for faster booking.
        </div>
      </div>
    </div>
    <div className="w-[1337px] inline-flex justify-between items-center gap-[60px] mt-[68px]">
      {/* Left Column*/}
      <div className="w-[648px] inline-flex flex-col justify-start items-start gap-14 ">
        <div className="self-stretch h-20 inline-flex justify-start items-start gap-5">
          <div style={{background: ORANGE_FADE}} className="w-10 h-10 py-1.5  rounded-full flex justify-center items-center">
            <div style={{color: ORANGE}} className="text-center justify-center  text-lg font-bold font-['Plus_Jakarta_Sans'] leading-7">
              1
            </div>
          </div>
          <div className="self-stretch inline-flex flex-col justify-start items-start gap-2">
            <div className="self-stretch flex flex-col justify-start items-start">
              <div className="justify-center text-slate-950 text-xl font-normal font-['DM_Serif_Display'] leading-7">
                Employee raises a travel request
              </div>
            </div>
            <div className="self-stretch flex flex-col justify-start items-start">
              <div className="justify-center text-[#65758B] text-base font-normal font-['Plus_Jakarta_Sans'] leading-6">
                Employee selects a flight or hotel within policy and submits the
                request to the
                <br />
                travel admin or manager.
              </div>
            </div>
          </div>
        </div>
        <div className="self-stretch h-20 inline-flex justify-start items-start gap-5">
          <div style={{background: ORANGE_FADE}} className="w-10 h-10 py-1.5  rounded-full flex justify-center items-center">
            <div style={{color: ORANGE}} className="text-center justify-center  text-lg font-bold font-['Plus_Jakarta_Sans'] leading-7">
              2
            </div>
          </div>
          <div className="self-stretch inline-flex flex-col justify-start items-start gap-2">
            <div className="self-stretch flex flex-col justify-start items-start">
              <div className="justify-center text-slate-950 text-xl font-normal font-['DM_Serif_Display'] leading-7">
                Travel Admin and Manager notified instantly
              </div>
            </div>
            <div className="self-stretch flex flex-col justify-start items-start">
              <div className="justify-center text-[#65758B] text-base font-normal font-['Plus_Jakarta_Sans'] leading-6">
                The travel admin or manager receives a notification instantly
                via the app or
                <br />
                email, with all trip details, policy status and cost mentioned
                for quick approval.
              </div>
            </div>
          </div>
        </div>
        <div className="w-[648px] inline-flex justify-start items-start gap-5">
          <div style={{background: ORANGE_FADE}} className="w-10 h-10 py-1.5  rounded-full flex justify-center items-center">
            <div style={{color: ORANGE}}  className="text-center justify-center text-lg font-bold font-['Plus_Jakarta_Sans'] leading-7">
              3
            </div>
          </div>
          <div className="self-stretch min-w-[588px] inline-flex flex-col justify-start items-start gap-2">
            <div className="self-stretch flex flex-col justify-start items-start">
              <div className="justify-center text-slate-950 text-xl font-normal font-['DM_Serif_Display'] leading-7">
                Travel Admin approves in one click
              </div>
            </div>
            <div className="self-stretch flex flex-col justify-start items-start">
              <div className="justify-center text-[#65758B] text-base font-normal font-['Plus_Jakarta_Sans'] leading-6">
                The admin/manager reviews the request and clicks approve on the
                <br />
                dashboard. The system documents everything automatically — no
                manual
                <br />
                entry required.
              </div>
            </div>
          </div>
        </div>
        <div className="self-stretch h-20 inline-flex justify-start items-start gap-5">
          <div style={{background: ORANGE_FADE}} className="w-10 h-10 py-1.5  rounded-full flex justify-center items-center">
            <div style={{color: ORANGE}} className="text-center justify-center  text-lg font-bold font-['Plus_Jakarta_Sans'] leading-7">
              4
            </div>
          </div>
          <div className="self-stretch inline-flex flex-col justify-start items-start gap-2">
            <div className="self-stretch flex flex-col justify-start items-start">
              <div className="justify-center text-slate-950 text-xl font-normal font-['DM_Serif_Display'] leading-7">
                Employee notified — books instantly
              </div>
            </div>
            <div className="self-stretch flex flex-col justify-start items-start">
              <div className="justify-center text-[#65758B] text-base font-normal font-['Plus_Jakarta_Sans'] leading-6">
                Once the travel request is approved, the employee is notified
                through the app
                <br />
                and via email. They can book the trip with just one click.
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Right Column */}
      <div className="w-[628px] inline-flex flex-col justify-start items-start gap-8">
        <div className="w-[629px] h-56 bg-white rounded-xl shadow-[0px_4px_6px_-4px_rgba(0,0,0,0.10)] shadow-lg flex flex-col justify-start items-start gap-2.5 overflow-hidden">
          <div style={{background: ORANGE_FADE_20}} className="self-stretch h-11 px-5 py-3  border-b border-gray-100 inline-flex justify-start items-center gap-2">
            <BsSend style={{color: ORANGE}} />
            <div className="inline-flex flex-col justify-start items-start">
              <div style={{color: ORANGE}} className="justify-center  text-sm font-semibold font-['Plus_Jakarta_Sans'] leading-5">
                Travel Admin — Action Required
              </div>
            </div>
          </div>
          <div className="self-stretch px-5 py-4 flex flex-col justify-start items-start gap-4">
            <div className="self-stretch flex flex-col justify-start items-start">
              <div className="self-stretch justify-center">
                <span class="text-[#65758B] text-sm font-bold font-['Plus_Jakarta_Sans'] leading-6">
                  Amit Kumar
                </span>
                <span class="text-[#65758B] text-sm font-normal font-['Plus_Jakarta_Sans'] leading-6">
                  {" "}
                  has requested travel to{" "}
                </span>
                <span class="text-[#65758B] text-sm font-bold font-['Plus_Jakarta_Sans'] leading-6">
                  Delhi on 22 April
                </span>
                <span class="text-[#65758B] text-sm font-normal font-['Plus_Jakarta_Sans'] leading-6">
                  . Flight Cost: ₹4,200, Hotel: ₹7,500/n. Manager: Rajat Gupta.
                  Amount: ₹75,300.{" "}
                </span>
                <span class="text-[#65758B] text-sm font-bold font-['Plus_Jakarta_Sans'] leading-6">
                  Total: ₹79,800
                </span>
                <span class="text-[#65758B] text-sm font-normal font-['Plus_Jakarta_Sans'] leading-6">
                  . Project: Tuna, Travel Policy:
                  <br />
                  Standard.
                </span>
              </div>
            </div>
            <div className="self-stretch inline-flex justify-start items-start gap-28">
              <div style={{background: ORANGE}} className="w-80 px-5 py-2 rounded-lg flex justify-center items-center">
                <div className="text-center justify-center text-slate-950 text-sm font-semibold font-['Plus_Jakarta_Sans'] leading-5">
                  Approve Request
                </div>
              </div>
              <div className="w-40 px-5 py-2 opacity-60 rounded-lg  outline-1 -outline-offset-1 outline-slate-500 flex justify-center items-center">
                <div className="text-center justify-center text-slate-500 text-sm font-semibold font-['Plus_Jakarta_Sans'] leading-5">
                  Reject
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="w-[629px] pb-3.5 bg-color-white-solid rounded-xl shadow-[0px_4px_6px_-4px_rgba(0,0,0,0.10)] shadow-lg outline outline-1 outline-offset-[-1px] outline-color-grey-91 flex flex-col justify-start items-center gap-3.5 overflow-hidden">
          <div className="self-stretch h-11 px-5 py-3 bg-color-azure-14-10%/10 border-b border-color-grey-91 inline-flex justify-start items-center gap-2">
            <div className="w-4 h-4 relative overflow-hidden">
              <div className="w-3 h-2.5 left-[2px] top-[1.33px] absolute outline outline-[1.33px] outline-offset-[-0.67px] outline-slate-950" />
              <div className="w-0.5 h-[0.67px] left-[6.87px] top-[14px] absolute outline outline-[1.33px] outline-offset-[-0.67px] outline-slate-950" />
            </div>
            <div className="inline-flex flex-col justify-start items-start">
              <div className="justify-center text-slate-950 text-sm font-semibold font-['Plus_Jakarta_Sans'] leading-5">
                Manager — For Your Information
              </div>
            </div>
          </div>
          <div className="w-[581px] flex flex-col justify-start items-start">
            <div className="self-stretch justify-center text-slate-500 text-sm font-normal font-['Plus_Jakarta_Sans'] leading-6">
              Amit Sharma has raised a travel request to Delhi on 22 April.
              Purpose: Tuna Phase 2 client meeting. Total cost: ₹19,800. Travel
              Admin reviewing.
            </div>
          </div>
        </div>
        <div className="w-[629px] h-44 relative bg-color-white-solid rounded-xl shadow-[0px_4px_6px_-4px_rgba(0,0,0,0.10)] shadow-lg outline outline-1 outline-offset-[-1px] outline-color-grey-91 overflow-hidden">
          <div className="w-[627px] h-11 px-5 py-3 left-[1px] top-[1px] absolute bg-color-grey-96 border-b border-color-grey-91 inline-flex justify-start items-center gap-2">
            <div className="w-4 h-4 relative overflow-hidden">
              <div className="w-3.5 h-3.5 left-[1.33px] top-[1.33px] absolute outline outline-[1.33px] outline-offset-[-0.67px] outline-color-spring-green-30" />
              <div className="w-1 h-[2.67px] left-[6px] top-[6.67px] absolute outline outline-[1.33px] outline-offset-[-0.67px] outline-color-spring-green-30" />
            </div>
            <div className="inline-flex flex-col justify-start items-start">
              <div className="justify-center text-color-spring-green-30 text-sm font-semibold font-['Plus_Jakarta_Sans'] leading-5">
                Employee — Trip Approved
              </div>
            </div>
          </div>
          <div className="w-[627px] px-5 py-4 left-[1px] top-[46px] absolute inline-flex flex-col justify-start items-start gap-4">
            <div className="self-stretch flex flex-col justify-start items-start">
              <div className="self-stretch justify-center text-[#65758B] text-sm font-normal font-['Plus_Jakarta_Sans'] leading-6">
                Your Delhi trip has been approved. IndiGo 6E 456 on 22 April is
                confirmed and ready. Tap below to get your PNR instantly.
              </div>
            </div>
            <div className="self-stretch px-5 py-2 bg-color-orange-52 rounded-lg inline-flex justify-center items-center">
              <div className="text-center justify-center text-slate-950 text-sm font-semibold font-['Plus_Jakarta_Sans'] leading-5">
                Book Now → Get PNR
              </div>
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
    icon: <RiShieldCheckLine size={22} />,
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
    icon: <RiTeamLine size={22} />,
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
    icon: <RiSettings3Line size={22} />,
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
  <section className="py-20 px-10" style={{ background: C.offWhite }}>
    <div className="max-w-[1280px] mx-auto">
      <div className="mb-14">
        <SectionLabel>Who Approves</SectionLabel>
        <h2
          className="font-normal leading-[1.2] mb-3"
          style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: 40,
            color: "#1e293b",
          }}
        >
          Every role has a
          <br />
          <span style={{ color: C.gold }}>clear purpose.</span>
        </h2>
        <p
          className="text-[15px] leading-relaxed max-w-[500px]"
          style={{
            color: C.muted,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          From booking to approvals, Managers and Admin stay informed.
          Experience effortless travel management through a purpose-driven
          dashboard.
        </p>
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
                    <RiCheckLine size={14} />
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
    icon: <RiTimeLine size={22} />,
    value: "60s",
    label: "Average Approval Time",
  },
  {
    icon: <RiFileTextLine size={22} />,
    value: "100%",
    label: "Auditable trail of approvals",
  },
  {
    icon: <RiBarChartLine size={22} />,
    value: "0",
    label: "Manual Reconciliation",
  },
  {
    icon: <RiBriefcaseLine size={22} />,
    value: "1",
    label: "Consolidated Report",
  },
];

const WhyItMattersSection = () => (
  <section
    className="py-20 px-10 overflow-hidden"
    style={{
      background: `linear-gradient(to left, #1e3a8a, ${C.navyDeep})`,
    }}
  >
    <div className="max-w-[1280px] mx-auto">
      <div className="mb-14">
        <SectionLabel>Why It Matters</SectionLabel>
        <h2
          className="font-normal leading-[1.2] mb-4"
          style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: 40,
            color: C.white,
          }}
        >
          Every trip. Every approval.
          <br />
          Always on record.
        </h2>
        <p
          className="text-[15px] leading-relaxed max-w-[500px]"
          style={{
            color: "rgba(255,255,255,0.5)",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          Whether you are a startup or a growing business, stay organized. Know
          exactly who approved what — and keep travel on track.
        </p>
      </div>

      <div
        className="grid gap-5"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}
      >
        {STATS.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl p-8 text-center"
            style={{ border: "2px solid rgba(255,255,255,0.2)" }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-5"
              style={{ background: C.white, color: C.gold }}
            >
              {s.icon}
            </div>
            <p
              className="font-normal mb-2"
              style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: 34,
                color: C.gold,
              }}
            >
              {s.value}
            </p>
            <p
              className="text-[13px]"
              style={{
                color: "rgba(255,255,255,0.5)",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              {s.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

// ─── 6. CTA Section ───────────────────────────────────────────────────────────
const PERKS = [
  "30-day free trial",
  "No credit card required",
  "Live in under 2 hours",
  "GST invoices from day one",
];

const CTASection = () => (
  <section className="py-20 px-10" style={{ background: C.navyDeep }}>
    <div className="max-w-[640px] mx-auto text-center">
      <p
        className="text-[11px] font-bold uppercase tracking-[0.18em] mb-5"
        style={{ color: C.gold, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        Get Started Today
      </p>

      <h2
        className="font-normal leading-[1.2] mb-4"
        style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: 40,
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
