import { useState } from "react";
import {
  MdOutlineFlightTakeoff,
  MdOutlineFlightLand,
  MdOutlineCalendarToday,
  MdOutlineEventAvailable,
  MdOutlineCheckCircle,
  MdOutlinePublic,
  MdOutlineRoute,
  MdOutlineTimer,
  MdOutlineVerified,
} from "react-icons/md";
import { HiOutlineSparkles, HiArrowRight, HiCheck } from "react-icons/hi";
import { BsAirplaneFill } from "react-icons/bs";
import LandingHeader from "../../../layout/LandingHeader";
import LandingFooter from "../../../layout/LandingFooter";

/* ─────────────── tokens ─────────────── */
const ORANGE = "#C9A84C";
const DARK = "#000D26";
const AZURE = "#1E293B";
const SLATE47 = "#64748B";

/* ─────────────────────────────────────────────
   HERO / SEARCH SECTION
───────────────────────────────────────────── */
function Hero() {
  const flights = [
    {
      code: "6E",
      id: "6E340",
      route: "Mumbai → Delhi · Non-stop",
      time: "06:15",
      price: "₹4,200",
      recommended: true,
    },
    {
      code: "UK",
      id: "UK103",
      route: "Mumbai → Delhi · Non-stop",
      time: "08:30",
      price: "₹5,100",
      recommended: false,
    },
    {
      code: "SG",
      id: "SG430",
      route: "Mumbai → Delhi · 1 stop",
      time: "10:00",
      price: "₹3,800",
      recommended: false,
    },
  ];

  return (
    <section className="relative bg-gradient-to-l from-blue-900 to-slate-950 overflow-hidden min-h-[600px] xl:min-h-screen">
      {/* ambient glows */}
      <div
        className="absolute top-[-160px] right-[-120px] w-[700px] h-[700px] rounded-full opacity-10 pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${ORANGE} 0%, transparent 65%)`,
        }}
      />
      <div
        className="absolute bottom-[-60px] left-[-80px] w-[400px] h-[400px] rounded-full opacity-10 pointer-events-none"
        style={{
          background: `radial-gradient(circle, #3B82F6 0%, transparent 65%)`,
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 lg:px-12 py-16 md:py-16 lg:py-20 flex flex-col md:grid md:grid-cols-2 gap-12 md:gap-10 lg:gap-16 items-center md:items-start">
        {/* LEFT – copy */}
        <div className="flex flex-col gap-6 md:gap-7 items-center md:items-start text-center md:text-left">
          {/* pill tag */}
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 backdrop-blur-sm w-fit"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            <HiOutlineSparkles
              style={{ color: ORANGE }}
              className=" w-3.5 h-3.5"
            />
            <span className="text-white/80 text-xs font-normal">
              Platform · Flight Booking
            </span>
          </div>

          <div className="self-stretch">
            <h1 className="text-white text-4xl md:text-5xl lg:text-7xl font-normal font-['DM_Serif_Display'] leading-tight md:leading-[1.1] lg:leading-[72px]">
              Book the{" "}
              <span style={{ color: ORANGE }} className="italic">
                right
              </span>
              <br />
              flight. In under 60 seconds.
            </h1>
          </div>

          <p className="text-white/60 text-base md:text-lg leading-relaxed md:leading-7 max-w-md mx-auto md:mx-0">
            Eliminate endless tabs and back-and-forth. One-tap booking for you
            or your employees — your company stays in control. No waiting.
          </p>

          <div className="flex flex-wrap gap-3 mt-1 justify-center md:justify-start">
            <button
              className="px-6 md:px-7 py-3 md:py-3.5 rounded-lg text-sm font-semibold transition-all duration-200 hover:brightness-110 active:scale-95"
              style={{ background: ORANGE, color: DARK }}
            >
              Start Free Trial
            </button>
            <button className="flex items-center gap-2 text-sm text-white/80 hover:text-white transition-colors duration-200">
              See How it Works <HiArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* stats */}
          <div className="flex gap-8 md:gap-10 pt-6 border-t border-white/10 justify-center md:justify-start">
            {[
              { val: "60s", label: "PNR confirmed" },
              { val: "500+", label: "Airlines" },
              { val: "100%", label: "Tagged" },
            ].map((s) => (
              <div key={s.label} className="flex flex-col gap-1">
                <span className="text-white text-2xl md:text-3xl font-normal font-['DM_Serif_Display'] leading-tight">
                  {s.val}
                </span>
                <span className="text-white/40 text-[10px] md:text-xs">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT – search card */}
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
          {/* card header */}
          <div className="px-5 pt-5 pb-4 flex justify-between items-center border-b border-slate-100">
            <span className="text-slate-900 text-lg font-normal font-['DM_Serif_Display']">
              Search Flights
            </span>
            <span className="text-xs font-semibold" style={{ color: ORANGE }}>
              Cheapest first
            </span>
          </div>

          {/* form fields */}
          <div className="px-5 pt-4 flex flex-col gap-3">
            {/* from / to */}
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  label: "From",
                  icon: <MdOutlineFlightTakeoff />,
                  city: "Mumbai",
                  airport: "Chhatrapati Shivaji Intl.",
                },
                {
                  label: "To",
                  icon: <MdOutlineFlightLand />,
                  city: "Delhi",
                  airport: "Indira Gandhi Intl.",
                },
              ].map((f) => (
                <div
                  key={f.label}
                  className="p-3 rounded-lg border border-slate-200 flex flex-col gap-0.5"
                >
                  <span className="text-[10px] text-slate-400 uppercase tracking-wide flex items-center gap-1">
                    <span style={{ color: ORANGE }}>{f.icon}</span> {f.label}
                  </span>
                  <span className="text-slate-900 text-sm font-['DM_Serif_Display']">
                    {f.city}
                  </span>
                  <span className="text-slate-400 text-[10px]">
                    {f.airport}
                  </span>
                </div>
              ))}
            </div>

            {/* dates */}
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  label: "Departure",
                  icon: <MdOutlineCalendarToday />,
                  date: "22 April 2026",
                  day: "Wednesday",
                },
                {
                  label: "Return",
                  icon: <MdOutlineEventAvailable />,
                  date: "24 April 2026",
                  day: "Friday",
                },
              ].map((d) => (
                <div
                  key={d.label}
                  className="p-3 rounded-lg border border-slate-200 flex flex-col gap-0.5"
                >
                  <span className="text-[10px] text-slate-400 uppercase tracking-wide flex items-center gap-1">
                    <span style={{ color: ORANGE }}>{d.icon}</span> {d.label}
                  </span>
                  <span className="text-slate-900 text-sm font-['DM_Serif_Display']">
                    {d.date}
                  </span>
                  <span className="text-slate-400 text-[10px]">{d.day}</span>
                </div>
              ))}
            </div>

            {/* search button */}
            <button
              className="w-full py-3 rounded-lg text-sm font-semibold text-white transition-all duration-200 hover:brightness-110 active:scale-95"
              style={{ background: AZURE }}
            >
              Search Flights
            </button>
          </div>

          {/* results */}
          <div className="px-5 pt-6 pb-5 border-t border-slate-100 mt-3 flex flex-col gap-3">
            <div className="flex items-center gap-4 mb-1">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                Cheapest Fares
              </span>
              <span
                className="text-[10px] font-semibold uppercase tracking-wide"
                style={{ color: ORANGE }}
              >
                AI Recommended
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {flights.map((fl) => (
                <div
                  key={fl.id}
                  className="p-3 rounded-lg flex items-center gap-3 transition-all duration-150"
                  style={
                    fl.recommended
                      ? {
                          background: `${ORANGE}0D`,
                          border: `1px solid ${ORANGE}50`,
                        }
                      : {
                          background: "transparent",
                          border: "1px solid #E2E8F0",
                        }
                  }
                >
                  {/* airline logo */}
                  <div className="w-8 h-8 bg-slate-100 rounded-md flex items-center justify-center shrink-0">
                    <span className="text-slate-800 text-xs font-['DM_Serif_Display']">
                      {fl.code}
                    </span>
                  </div>

                  {/* flight info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-900 text-xs font-semibold">
                      {fl.id}
                    </p>
                    <p className="text-slate-400 text-[10px] truncate">
                      {fl.route}
                    </p>
                  </div>

                  {/* AI badge */}
                  {fl.recommended && (
                    <span
                      className="text-[8px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
                      style={{ background: `${ORANGE}1A`, color: ORANGE }}
                    >
                      AI RECOMMENDED
                    </span>
                  )}

                  {/* time + price */}
                  <div className="text-right shrink-0">
                    <p className="text-slate-400 text-[10px]">{fl.time}</p>
                    <p className="text-slate-900 text-sm font-['DM_Serif_Display']">
                      {fl.price}
                    </p>
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
   INFO BAR
───────────────────────────────────────────── */
function InfoBar() {
  const items = [
    "500+ airlines across 190+ countries",
    "SSO login · Google, Microsoft, Zoho",
    "GST Invoice auto-attached to every booking",
    "Project Cost ID tagged for every trip",
  ];

  return (
    <div className="bg-slate-950 border-t border-white/10 py-6 lg:py-4 px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto relative">
        {/* Carousel Container */}
        <div className="flex w-max md:w-full md:justify-center items-center gap-x-10 animate-infinite-scroll md:animate-none">
          {/* Original Items */}
          {items.map((it, idx) => (
            <p
              key={`orig-${idx}`}
              className="text-white text-sm font-bold whitespace-nowrap"
            >
              {it}
            </p>
          ))}

          {/* Duplicated Items (Hidden on MD screens and above) */}
          {/* We only need the duplicate for the scroll effect on mobile */}
          <div className="flex md:hidden gap-x-10">
            {items.map((it, idx) => (
              <p
                key={`dup-${idx}`}
                className="text-white text-sm font-bold whitespace-nowrap"
              >
                {it}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   HOW IT WORKS
───────────────────────────────────────────── */
function HowItWorks() {
  const steps = [
    {
      n: 1,
      title: "Employee searches live inventory",
      body: "Access real-time rates from 500+ airlines. AI instantly highlights the best value, fastest, cheapest — with carbon metrics for each.",
    },
    {
      n: 2,
      title: "Selects flight and submits request",
      body: "Employee picks their option. The best flight is pre-selected. Project Cost ID is auto-suggested, confirm and submit. Travel Admin notified instantly.",
    },
    {
      n: 3,
      title: "Travel Admin approves in one click",
      body: "Admin sees a clear summary — with details, fare breakdowns, policy compliance. One click to approve. Email or WhatsApp approval supported.",
    },
    {
      n: 4,
      title: "Employee books — PNR in seconds",
      body: "No wait on airlines. Employee taps 'Book Now', PNR generated within seconds. Confirmation email, GST invoice collected automatically.",
    },
  ];

  return (
    <section className="bg-slate-50 py-20 px-6">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
        {/* LEFT – copy + steps */}
        <div className="flex flex-col gap-10">
          <div className="flex flex-col gap-4">
          <div
              className="w-full md:w-[519px] px-2.5 py-1 mb-5 text-[10px] lg:text-xs font-semibold tracking-[0.2em] uppercase "
            style={{ background: ORANGE, color: "#000" }}
          >
              How It Works
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-normal leading-tight text-black font-['DM_Serif_Display']">
              Search. Select. Approve.{" "}
              <span className="italic" style={{ color: ORANGE }}>
                Book. Done.
              </span>
            </h2>
            <p className="text-slate-500 text-sm lg:text-base leading-6">
              From first search to PNR confirmation — in under 60 seconds.
            </p>
          </div>

          <div className="flex flex-col gap-8">
            {steps.map((s) => (
              <div key={s.n} className="flex gap-5 items-start">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white text-sm font-bold font-['DM_Sans']"
                  style={{ background: AZURE }}
                >
                  {s.n}
                </div>
                <div className="flex flex-col gap-1 pt-1">
                  <h3 className="text-slate-900 text-lg font-bold leading-7">
                    {s.title}
                  </h3>
                  <p className="text-slate-500 text-sm leading-6">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT – booking card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          {/* card top */}
          <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
            <span className="text-slate-900 text-sm font-['DM_Serif_Display']">
              Trip Booking — Final Step
            </span>
            <span
              className="text-[10px] font-semibold px-3 py-1 rounded-full"
              style={{ background: `${ORANGE}1A`, color: ORANGE }}
            >
              ✓ Approved
            </span>
          </div>

          <div className="w-full flex justify-between items-center px-5 pb-5">
            <div className="flex justify-start items-center gap-1">
              <div
                style={{ background: ORANGE }}
                className="w-8 h-8 rounded-full flex justify-center items-center shrink-0"
              >
                <div className="text-center text-[#000D26] text-xs font-bold font-['DM_Sans']">
                  ✓
                </div>
              </div>
              <div
                style={{ background: ORANGE }}
                className="w-8 md:w-12 h-0.5"
              />
            </div>
            <div className="flex justify-start items-center gap-1">
              <div
                style={{ background: ORANGE }}
                className="w-8 h-8 rounded-full flex justify-center items-center shrink-0"
              >
                <div className="text-center text-[#000D26] text-xs font-bold font-['DM_Sans']">
                  ✓
                </div>
              </div>
              <div
                style={{ background: ORANGE }}
                className="w-8 md:w-12 h-0.5"
              />
            </div>
            <div className="flex justify-start items-center gap-1">
              <div
                style={{ background: ORANGE }}
                className="w-8 h-8 rounded-full flex justify-center items-center shrink-0"
              >
                <div className="text-center text-[#000D26] text-xs font-bold font-['DM_Sans']">
                  ✓
                </div>
              </div>
              <div className="w-8 md:w-12 h-0.5 bg-gray-100" />
            </div>
            <div className="w-8 h-8 bg-gray-200 rounded-full flex justify-center items-center shrink-0">
              <div className="text-center text-slate-500 text-xs font-bold font-['DM_Sans']">
                4
              </div>
            </div>
          </div>

          {/* flight summary */}
          <div className="px-5 flex flex-col gap-3">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
              Selected &amp; Approved Flight
            </p>

            <div className="border border-slate-200 rounded-lg p-4 flex flex-col gap-4">
              {/* route */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-900 text-base font-['DM_Serif_Display']">
                    BOM
                  </p>
                  <p className="text-slate-400 text-[10px]">
                    Mumbai · 09:00 AM
                  </p>
                </div>
                <div className="flex-1 px-3 flex items-center gap-1">
                  <div className="flex-1 h-px bg-slate-200" />
                  <BsAirplaneFill className="text-slate-400 text-sm rotate-90" />
                  <div className="flex-1 h-px bg-slate-200" />
                </div>
                <div className="text-right">
                  <p className="text-slate-900 text-base font-['DM_Serif_Display']">
                    DEL
                  </p>
                  <p className="text-slate-400 text-[10px]">Delhi</p>
                </div>
              </div>

              {/* price */}
              <p className="text-slate-900 text-xl font-['DM_Serif_Display']">
                ₹4,200
              </p>

              {/* cost ID */}
              <div className="border-t border-slate-100 pt-3 flex flex-col gap-0.5">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                  Project Cost ID
                </p>
                <p className="text-slate-900 text-sm font-semibold">
                  Tata Steel – Phase 2 Site Review
                </p>
              </div>

              {/* CTA */}
              <button
                className="w-full py-3 rounded-lg text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-95"
                style={{ background: ORANGE }}
              >
                Book Now — Confirm PNR
              </button>
            </div>

            {/* PNR confirmed */}
            <div
              className="px-3 py-3 rounded-lg border mb-5"
              style={{ background: `${ORANGE}0A`, borderColor: `${ORANGE}33` }}
            >
              <p
                className="text-[10px] font-semibold uppercase tracking-wide"
                style={{ color: ORANGE }}
              >
                PNR Confirmed
              </p>
              <p className="text-slate-900 text-lg font-bold tracking-widest mt-0.5">
                ABC 1 2 3
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   SEAT & MEAL RIGHTS
───────────────────────────────────────────── */
function SeatMealRights() {
  const tiers = [
    {
      dot: ORANGE,
      tier: "Standard",
      sub: "Mid-level / Frequent travelers",
      active: true,
      perks: ["Free seats only", "Standard & vegetarian meal"],
    },
    {
      dot: "#94A3B8",
      tier: "Full Rights",
      sub: "Senior staff / Super users",
      active: false,
      perks: [
        "Any seat — no limit",
        "Any meal type",
        "1A seater / front seats",
        "Preference shortcut (by AI)",
      ],
    },
  ];

  return (
    <section className="bg-slate-50 py-0 md:py-20 px-6 md:px-20 border-t border-slate-100">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-start">
        {/* LEFT – copy */}
        <div className="flex flex-col gap-5">
          <div
            className="w-full md:w-[519px] px-2.5 py-1 text-[10px] lg:text-xs font-semibold font-['Plus_Jakarta_Sans'] uppercase tracking-[2.40px]"
            style={{ background: ORANGE, color: "#000" }}
          >
            Seat &amp; Meal Rights
          </div>
          <div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-normal leading-tight text-slate-900 font-['DM_Serif_Display']">
              Configured once.
              <br />
              <span style={{ color: ORANGE }}>Works forever.</span>
            </h2>
          </div>
          <p className="text-slate-500 text-sm lg:text-base leading-relaxed max-w-sm pt-2">
            Travel Admin sets rights per employee one time. Nobody ever calls
            admin for a window seat again.
          </p>
        </div>

        {/* RIGHT – tier cards */}
        <div className="flex flex-col gap-4"></div>
      </div>
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-start -mt-8 md:mt-10 mb-3 md:mb-0">
        {tiers.map((t) => (
          <div
            key={t.tier}
            className="bg-white rounded-2xl p-6 flex flex-col gap-5 transition-shadow duration-200 hover:shadow-md"
            style={{
              border: t.active ? `1px solid ${ORANGE}` : "1px solid #E2E8F0",
            }}
          >
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: t.dot }}
                />
                <span className="text-slate-900 text-lg font-['DM_Serif_Display']">
                  {t.tier}
                </span>
              </div>
              <p className="text-slate-400 text-xs pl-4">{t.sub}</p>
            </div>

            <div className="flex flex-col gap-3">
              {t.perks.map((p) => (
                <div key={p} className="flex items-center gap-3">
                  <MdOutlineCheckCircle
                    className="shrink-0 w-4 h-4"
                    style={{ color: ORANGE }}
                  />
                  <span className="text-slate-800 text-sm">{p}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   GLOBAL COVERAGE
───────────────────────────────────────────── */
function GlobalCoverage() {
  const stats = [
    {
      icon: <MdOutlineFlightTakeoff size={22} />,
      val: "500+",
      label: "Airlines Worldwide",
      sub: "Every major carrier — low cost, full-service and premium in one search.",
    },
    {
      icon: <MdOutlinePublic size={22} />,
      val: "190+",
      label: "Countries Covered",
      sub: "Domestic and international — wherever your business takes your team.",
    },
    {
      icon: <MdOutlineRoute size={22} />,
      val: "1M+",
      label: "Routes Available",
      sub: "Live inventory, updated in real-time — right flights, right prices, always.",
    },
    {
      icon: <MdOutlineTimer size={22} />,
      val: "60s",
      label: "To Confirmed PNR",
      sub: "From search to booking — no more manual follow ups from travel agents.",
    },
  ];

  return (
    <section className="relative bg-gradient-to-l from-blue-900 to-slate-950 overflow-hidden py-10 px-6">
      {/* glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-10 pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${ORANGE} 0%, transparent 65%)`,
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto flex flex-col gap-12">
        {/* header */}
        <div className="flex flex-col gap-5">
          <div
            style={{ background: ORANGE, color: "#000" }}
            className="w-full md:w-[519px] px-2.5 py-1 inline-flex flex-col justify-center items-start"
          >
            <div className="text-black text-[10px] lg:text-xs font-semibold font-['Plus_Jakarta_Sans'] uppercase leading-4 tracking-[2.40px]">
              Global Coverage
            </div>
          </div>
          <h2 className="text-white text-3xl md:text-5xl font-normal font-['DM_Serif_Display'] leading-tight">
            One platform.
            <br />
            Every flight your team needs.
          </h2>
          <p className="text-white/50 text-sm lg:text-base leading-relaxed max-w-md">
            Whether your team flies domestic or international — Traveamer has
            them covered. One search. One approval. One booking.
          </p>
        </div>

        {/* stat cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-white/10 backdrop-blur-sm p-6 flex flex-col items-center text-center gap-3 hover:border-white/20 transition-colors duration-200"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <span style={{ color: ORANGE }}>{s.icon}</span>
              <span className="text-white text-5xl font-normal font-['DM_Serif_Display'] leading-none">
                {s.val}
              </span>
              <span className="text-white/60 text-sm font-semibold">
                {s.label}
              </span>
              <p className="text-white/40 text-xs leading-5">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* footer note */}
        {/* <div
          className="px-6 py-4 rounded-xl border border-white/10"
          style={{ background: "rgba(255,255,255,0.05)" }}
        > */}
        <div
          style={{ background: "rgba(255,255,255,0.05)" }}
          className="w-full px-6 py-6 lg:py-4 rounded-xl border border-white/10"
        >
          <div className="flex flex-col justify-start items-start">
            <div className="justify-center">
              <span className="text-white/80 text-xs lg:text-sm font-semibold font-['Plus_Jakarta_Sans'] leading-relaxed">
                Built for India, ready for the world.
              </span>
              <span className="text-white/50 text-xs lg:text-sm font-normal font-['Plus_Jakarta_Sans'] leading-relaxed">
                {" "}
                Traveamer is built to match complete domestic coverage across
                all Indian carriers — and scales globally as your business
                grows. GST invoices are auto-collected on every domestic
                booking.
              </span>
            </div>
          </div>
        </div>
      </div>
      {/* </div> */}
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

      <div className="max-w-xl mx-auto text-center px-6">
        <h2 className="text-white text-3xl md:text-4xl font-normal font-['DM_Serif_Display'] leading-tight">
          Ready to give your team
          <br />
          <span style={{ color: ORANGE }}>flights in 60 seconds?</span>
        </h2>
      </div>

      <div className="py-3 self-stretch text-center justify-center text-white/50 text-base font-normal font-['Plus_Jakarta_Sans'] leading-6">
        Join hundreds of Indian MSMEs who replaced travel chaos <br /> with
        Traveamer. Free 30-day trial. No credit card needed.
      </div>

      <div className="flex flex-wrap justify-center gap-3 mt-8">
        <button
          className="h-11 px-8 rounded-[10px] text-sm font-semibold transition-all hover:brightness-110 active:scale-95"
          style={{ background: ORANGE, color: DARK }}
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
export default function FlightBookingInfo() {
  return (
    <div className="w-full font-['Plus_Jakarta_Sans']">
      <LandingHeader />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=DM+Sans:wght@700&display=swap');
      `}</style>
      <Hero />
      <InfoBar />
      <HowItWorks />
      <SeatMealRights />
      <GlobalCoverage />
      <CTA />
      <LandingFooter />
    </div>
  );
}
