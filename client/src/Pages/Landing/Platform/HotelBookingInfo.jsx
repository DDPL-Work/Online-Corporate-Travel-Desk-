import { useState } from "react";
import {
  MdOutlineHotel,
  MdOutlineLocationOn,
  MdOutlineCalendarToday,
  MdOutlinePeople,
  MdOutlinePublic,
  MdOutlineVerified,
  MdOutlineLocationCity,
  MdOutlineCheckCircle,
  MdOutlineStar,
} from "react-icons/md";
import { HiCheck, HiArrowRight, HiOutlineSparkles } from "react-icons/hi";
import { BsBuildingsFill, BsBuilding } from "react-icons/bs";
import { TbReceiptTax } from "react-icons/tb";
import LandingHeader from "../../../layout/LandingHeader";
import LandingFooter from "../../../layout/LandingFooter";

/* ─────────────── tokens ─────────────── */
const ORANGE = "#C9A84C";
const DARK = "#000D26";
const AZURE = "#0A203E"; // sky-950

/* ─────────────────────────────────────────────
   STAR RATING
───────────────────────────────────────────── */
function Stars({ count = 5 }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <MdOutlineStar key={i} className="w-3 h-3" style={{ color: ORANGE }} />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   HERO / SEARCH SECTION
───────────────────────────────────────────── */
function Hero() {
  const hotels = [
    { emoji: "🏨", name: "The Oberoi, Mumbai", stars: 5, price: "₹12,400" },
    { emoji: "🏢", name: "Hyatt Regency, Delhi", stars: 4, price: "₹8,900" },
    { emoji: "🏨", name: "Taj Bangalore", stars: 5, price: "₹11,200" },
  ];

  return (
    <section className="relative bg-gradient-to-l from-blue-900 to-slate-950 overflow-hidden min-h-screen">
      {/* ambient glows */}
      <div
        className="absolute top-[-140px] right-[-100px] w-[600px] h-[600px] rounded-full opacity-10 pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${ORANGE} 0%, transparent 65%)`,
        }}
      />
      <div
        className="absolute bottom-[-80px] left-[-60px] w-[400px] h-[400px] rounded-full opacity-10 pointer-events-none"
        style={{
          background: "radial-gradient(circle, #3B82F6 0%, transparent 65%)",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto  py-20 lg:py-28 grid lg:grid-cols-2 gap-16 items-start">
        {/* LEFT – copy */}
        <div className="flex flex-col gap-7 lg:pt-10">
          {/* pill tag */}
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 backdrop-blur-sm w-fit"
            style={{ background: "rgba(255,255,255,0.07)" }}
          >
            <HiOutlineSparkles
              className="w-3.5 h-3.5"
              style={{ color: ORANGE }}
            />
            <span className="text-white/80 text-xs">
              Platform · Hotel Booking
            </span>
          </div>

          <h1 className="text-5xl sm:text-6xl xl:text-[60px] font-normal leading-[1.04] text-white font-['DM_Serif_Display']">
            The right <span style={{ color: ORANGE }}>hotel,</span>
            <br />
            Right{" "}
            <span className="italic" style={{ color: ORANGE }}>
              city.
            </span>
            <br />
            Right <span style={{ color: ORANGE }}>price.</span>
          </h1>

          <div className="justify-center text-white/60 text-lg font-normal font-['Plus_Jakarta_Sans'] leading-7">
            From business hotels to 5-star resorts, Traveamer has over
            <br />
            800,000 properties worldwide. Compliance is built-in, so
            <br />
            your team stays where they should—at a price you&apos;ll love.
          </div>

          <div className="flex flex-wrap gap-3 mt-1">
            <button
              className="px-7 py-3.5 rounded-xl text-base font-semibold shadow-lg transition-all duration-200 hover:brightness-110 active:scale-95"
              style={{ background: ORANGE, color: AZURE }}
            >
              Start Free Trial
            </button>
            <button className="px-7 py-3.5 rounded-xl text-base font-semibold text-white border border-white/40 hover:border-white/70 transition-all duration-200 flex items-center gap-2">
              See How it Works <HiArrowRight />
            </button>
          </div>

          {/* stats */}
          <div className="flex gap-10 pt-6 border-t border-white/10">
            {[
              { val: "800K+", label: "Properties" },
              { val: "150+", label: "Countries" },
              { val: "100%", label: "Tax Compliant" },
            ].map((s) => (
              <div key={s.label} className="flex flex-col gap-1">
                <span
                  className="text-3xl font-normal font-['DM_Serif_Display'] leading-9"
                  style={{ color: ORANGE }}
                >
                  {s.val}
                </span>
                <span className="text-white text-sm font-medium">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT – search card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden ">
          {/* card header */}
          <div className="px-6 pt-6 pb-4 flex items-center gap-2 border-b border-slate-100">
            <MdOutlineHotel className="w-5 h-5" style={{ color: ORANGE }} />
            <span className="text-sky-950 text-lg font-normal font-['DM_Serif_Display']">
              Hotel Search
            </span>
          </div>

          {/* form */}
          <div className="px-6 pt-5 flex flex-col gap-4">
            {/* city search */}
            <div className="flex flex-col gap-1.5">
              <label className="text-slate-500 text-xs font-medium">
                City / Hotel Name
              </label>
              <div className="relative">
                <MdOutlineLocationOn className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. Mumbai, Taj Palace"
                  className="w-full pl-9 pr-4 py-3 bg-slate-100 border border-gray-200 rounded-xl text-slate-500 text-sm outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 transition-all"
                />
              </div>
            </div>

            {/* dates row */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Check-in", placeholder: "Select date" },
                { label: "Check-out", placeholder: "Select date" },
              ].map((d) => (
                <div key={d.label} className="flex flex-col gap-1.5">
                  <label className="text-slate-500 text-xs font-medium">
                    {d.label}
                  </label>
                  <div className="relative">
                    <MdOutlineCalendarToday className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder={d.placeholder}
                      className="w-full pl-9 pr-4 py-3 bg-slate-100 border border-gray-200 rounded-xl text-slate-500 text-sm outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 transition-all"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* guests */}
            <div className="flex flex-col gap-1.5">
              <label className="text-slate-500 text-xs font-medium">
                Rooms &amp; Guests
              </label>
              <div className="relative">
                <MdOutlinePeople className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  defaultValue="1 Room, 2 Guests"
                  className="w-full pl-9 pr-4 py-3 bg-slate-100 border border-gray-200 rounded-xl text-slate-500 text-sm outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 transition-all"
                />
              </div>
            </div>

            {/* search button */}
            <button
              className="w-full py-3.5 rounded-xl text-sm font-semibold shadow-md transition-all duration-200 hover:brightness-110 active:scale-95"
              style={{ background: ORANGE, color: AZURE }}
            >
              Search Hotels
            </button>
          </div>

          {/* results */}
          <div className="px-6 pt-5 pb-6 border-t border-gray-200 mt-4 flex flex-col gap-3">
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">
              Top Corporate Picks
            </p>
            <div className="flex flex-col gap-3">
              {hotels.map((h) => (
                <div
                  key={h.name}
                  className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between hover:border-orange-200 transition-colors duration-150"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{h.emoji}</span>
                    <div className="flex flex-col gap-0.5">
                      <p className="text-sky-950 text-sm font-medium">
                        {h.name}
                      </p>
                      <Stars count={h.stars} />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-0.5">
                    <span
                      className="text-sm font-bold"
                      style={{ color: ORANGE }}
                    >
                      {h.price}
                    </span>
                    <span className="text-slate-400 text-xs">/night</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   HOW IT WORKS
───────────────────────────────────────────── */
function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Employee searches live inventory",
      body: "Filter by distance to the office or client site.",
    },
    {
      n: "02",
      title: "Selects hotel and submits request",
      body: "Automatically checks for GST/Tax compliance.",
    },
    {
      n: "03",
      title: "Travel Admin approves in one click",
      body: "Review distance, stars, and cost in one view.",
    },
    {
      n: "04",
      title: "Employee books — Voucher instant",
      body: "Direct-to-app voucher and zero-wait check-in.",
    },
  ];

  return (
    <section className="bg-slate-50 py-20 px-6">
      <div className="max-w-7xl mx-auto flex flex-col gap-12">
        {/* headline */}
        <h2 className="text-5xl font-normal font-['DM_Serif_Display'] leading-tight text-black max-w-2xl">
          Search. Select. Approve. <br />
          <span className="italic" style={{ color: ORANGE }}>
            Check-in.
          </span>{" "}
          <span className="italic" style={{ color: ORANGE }}>
            Done.
          </span>
        </h2>

        <div className="grid lg:grid-cols-2 gap-16 items-start">
          {/* steps */}
          <div className="flex flex-col gap-8">
            {steps.map((s) => (
              <div key={s.n} className="flex gap-5 items-start">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: AZURE }}
                >
                  <span
                    className="text-sm font-normal font-['DM_Serif_Display']"
                    style={{ color: ORANGE }}
                  >
                    {s.n}
                  </span>
                </div>
                <div className="flex flex-col gap-1 pt-1">
                  <h3 className="text-sky-950 text-lg font-normal font-['DM_Serif_Display'] leading-7">
                    {s.title}
                  </h3>
                  <p className="text-slate-500 text-sm leading-6">{s.body}</p>
                </div>
              </div>
            ))}
          </div>

          {/* stay detail card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-6 flex flex-col gap-4">
            {/* hotel name + badge */}
            <div className="flex justify-between items-start">
              <div className="flex flex-col gap-1">
                <span
                  className="text-xs font-semibold uppercase tracking-wide"
                  style={{ color: ORANGE }}
                >
                  Stay Detail
                </span>
                <h3 className="text-sky-950 text-xl font-normal font-['DM_Serif_Display']">
                  The Oberoi, BKC Mumbai
                </h3>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-full">
                <TbReceiptTax className="w-3.5 h-3.5 text-green-600" />
                <span className="text-green-700 text-xs font-medium">
                  GST Compliant
                </span>
              </div>
            </div>

            {/* distance + stars */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <MdOutlineLocationOn className="w-4 h-4 text-slate-400" />
                <span className="text-slate-500 text-sm">
                  2.1 km from office
                </span>
              </div>
              <Stars count={5} />
            </div>

            {/* dates */}
            <div className="grid grid-cols-3 gap-2">
              {["Check-in: Mar 15", "Check-out: Mar 17", "2 Nights"].map(
                (d) => (
                  <div
                    key={d}
                    className="px-3 py-2.5 bg-slate-100 rounded-xl text-center text-sky-950 text-xs font-medium"
                  >
                    {d}
                  </div>
                ),
              )}
            </div>

            {/* total + compliance */}
            <div className="flex justify-between items-center pt-4 border-t border-gray-200">
              <div className="flex flex-col gap-0.5">
                <span className="text-slate-500 text-sm">Total Cost</span>
                <span className="text-sky-950 text-2xl font-normal font-['DM_Serif_Display']">
                  ₹24,800
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                <span className="text-slate-500 text-xs">
                  Within per-diem limit
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   GLOBAL COVERAGE (dark)
───────────────────────────────────────────── */
function GlobalCoverage() {
  const stats = [
    {
      icon: <BsBuildingsFill size={22} />,
      val: "800K+",
      label: "Properties Worldwide",
    },
    {
      icon: <MdOutlinePublic size={22} />,
      val: "150+",
      label: "Countries Covered",
    },
    {
      icon: <MdOutlineLocationCity size={22} />,
      val: "500+",
      label: "Cities Available",
    },
    {
      icon: <TbReceiptTax size={22} />,
      val: "100%",
      label: "Tax Compliant",
    },
  ];

  return (
    <section className="relative bg-gradient-to-l from-blue-900 to-slate-950 overflow-hidden py-10 px-6">
      {/* glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none"></div>

      <div className="relative z-10 max-w-7xl mx-auto flex flex-col gap-12">
        <div className="w-[548px] justify-center">
          <span className="text-white text-5xl font-normal font-['DM_Serif_Display'] leading-[48px]">
            Every city your team travels to —{" "}
          </span>
          <span
            style={{ color: ORANGE }}
            className=" text-5xl font-normal font-['DM_Serif_Display'] leading-[48px]"
          >
            covered.
          </span>
        </div>

        {/* stat cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-gray-200/20 backdrop-blur-sm p-6 flex flex-col items-center text-center gap-3 hover:border-white/20 transition-colors duration-200"
              //   style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <span style={{ color: ORANGE }}>{s.icon}</span>
              <span className="text-white text-6xl font-normal font-['DM_Serif_Display'] leading-none">
                {s.val}
              </span>
              <span className="text-white text-sm font-medium">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   CTA
───────────────────────────────────────────── */
function CTA() {
  const perks = [
    "30-day free trial",
    "No credit card required",
    "Live in under 2 hours",
    "GST invoices from day one",
  ];

  return (
    <section
      className="mt-15 py-10 px-6 flex flex-col items-center text-center"
      style={{ background: DARK }}
    >
      <span
        className="text-xs font-semibold tracking-[0.2em] uppercase mb-5"
        style={{ color: ORANGE }}
      >
        Get Started Today
      </span>

      <div className="w-[602px] text-center justify-center">
        <span className="text-white text-4xl font-normal font-['DM_Serif_Display'] leading-10">
          Give your team the 
        </span>
        <span
          style={{ color: ORANGE }}
          className="italic text-4xl font-normal font-['DM_Serif_Display'] leading-10"
        >
          right hotel{" "}
        </span>
        <span className=" italic text-white text-4xl font-normal font-['DM_Serif_Display'] leading-10">
          at the right price — every time.
        </span>
      </div>

      <div className="pt-3 self-stretch text-center justify-center text-white/50 text-base font-normal font-['Plus_Jakarta_Sans'] leading-6">
        Join hundreds of Indian MSMEs who replaced travel chaos <br /> with
        Traveamer. Free 30-day trial. No credit card needed.
      </div>

      <div className="flex flex-wrap justify-center gap-3 mt-8">
        <button
          className="h-11 px-8 rounded-[10px] text-sm font-semibold transition-all hover:brightness-110 active:scale-95"
          style={{ background: ORANGE, color: AZURE }}
        >
          Start Free Trial
        </button>
        <button className="h-11 px-8 rounded-[10px] text-sm font-medium text-white border-2 border-white/30 hover:border-white/60 transition-all">
          Book a Demo
        </button>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2">
        {perks.map((p) => (
          <div key={p} className="flex items-center gap-1.5">
            <HiCheck
              className="w-3.5 h-3.5 shrink-0"
              style={{ color: ORANGE }}
            />
            <span className="text-white/50 text-xs">{p}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   ROOT
───────────────────────────────────────────── */
export default function HotelBookingInfo() {
  return (
    <div className="w-full font-['Plus_Jakarta_Sans']">
      <LandingHeader />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
      `}</style>
      <Hero />
      <HowItWorks />
      <GlobalCoverage />
      <CTA />
      <LandingFooter />
    </div>
  );
}
