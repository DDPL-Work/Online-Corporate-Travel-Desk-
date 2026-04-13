import React from "react";
import {
  HiOutlineUsers,
  HiOutlineDocumentText,
  HiOutlineUserCircle,
  HiArrowRight,
  HiCheck,
} from "react-icons/hi";
import {
  MdOutlineFlightTakeoff,
  MdOutlineApproval,
  MdOutlineAccountBalanceWallet,
  MdOutlineBarChart,
  MdOutlineAssignmentInd,
  MdOutlineTag,
  MdOutlineSearch,
} from "react-icons/md";
import { BsArrowRightShort } from "react-icons/bs";
import LandingFooter from "../../../layout/LandingFooter";
import LandingHeader from "../../../layout/LandingHeader";
import {
  FiCheckCircle,
  FiCheckSquare,
  FiUserPlus,
  FiUserX,
} from "react-icons/fi";
import {
  LuCalculator,
  LuTag,
  LuTicket,
  LuUserCheck,
  LuWallet,
} from "react-icons/lu";
import { TbPlaneTilt, TbUsers } from "react-icons/tb";
import { FaRegChartBar } from "react-icons/fa";

/* ─────────────────────────────────────────────
   Colour tokens (mirrors design)
───────────────────────────────────────────── */
const ORANGE = "#C9A84C"; // orange-400
const DARK_BG = "#000D26"; // slate-950
const CARD_BG = "rgba(255,255,255,0.06)";

/* ─────────────────────────────────────────────
   HERO SECTION
───────────────────────────────────────────── */
function Hero() {
  return (
    <section className="relative bg-gradient-to-l from-blue-900 to-slate-950 overflow-hidden min-h-screen flex items-center">
      <div
        className="absolute bottom-[-80px] right-[-80px] w-[400px] h-[400px] rounded-full opacity-10 pointer-events-none"
        style={{
          background: "radial-gradient(circle, #3B82F6 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-12 py-24 lg:py-32 grid lg:grid-cols-2 gap-16 items-start">
        {/* LEFT – copy */}
        <div className="flex flex-col gap-6">
          <span
            className="text-xs font-semibold tracking-[0.2em] uppercase"
            style={{ color: ORANGE }}
          >
            Who it's For · Growing business — 50 to 200 people
          </span>

          <h1 className="text-4xl sm:text-5xl xl:text-6xl font-normal leading-tight text-white font-['DM_Serif_Display']">
            Your team is growing.
            <br />
            Your travel needs{" "}
            <span
              className="italic text-6xl font-normal font-['DM_Serif_Display'] leading-[54.40px]"
              style={{ color: ORANGE }}
            >
              structure.
            </span>
          </h1>

          <p className="justify-center text-white/60 text-base font-normal font-['Plus_Jakarta_Sans'] leading-6">
            At some point, excel—or even WhatsApping each other—is
            <br />
            not a team system. Costs pile up and accountability
            <br />
            disappears. Traveamer brings structure to a growing team.
          </p>

          <div className="flex flex-wrap gap-3 mt-2">
            <button
              className="h-11 px-8 rounded-[10px] text-sm font-semibold transition-all duration-200 hover:brightness-110 active:scale-95"
              style={{ background: ORANGE, color: "#0F172A" }}
            >
              Start Free Trial
            </button>
            <button className="h-11 px-8 rounded-[10px] text-sm font-medium text-white border-2 border-white/30 hover:border-white/60 transition-all duration-200 flex items-center gap-2">
              See How it Works <HiArrowRight />
            </button>
          </div>

          {/* stats */}
          <div className="self-stretch pt-8 inline-flex justify-start items-start gap-10">
            <div className="self-stretch inline-flex flex-col justify-start items-start">
              <div className="self-stretch flex flex-col justify-start items-start">
                <div className="justify-center text-white text-3xl font-bold font-['DM_Sans'] leading-9">
                  1
                </div>
              </div>
              <div className="self-stretch flex flex-col justify-start items-start">
                <div className="justify-center text-white/50 text-xs font-normal font-['Plus_Jakarta_Sans'] leading-4">
                  Platform for all
                </div>
              </div>
            </div>
            <div className="self-stretch inline-flex flex-col justify-start items-start">
              <div className="self-stretch flex flex-col justify-start items-start">
                <div className="justify-center">
                  <span className="text-white text-3xl font-bold font-['DM_Sans'] leading-9">
                    100
                  </span>
                  <span
                    style={{ color: ORANGE }}
                    className=" text-3xl font-bold font-['DM_Sans'] leading-9"
                  >
                    %
                  </span>
                </div>
              </div>
              <div className="self-stretch flex flex-col justify-start items-start">
                <div className="justify-center text-white/50 text-xs font-normal font-['Plus_Jakarta_Sans'] leading-4">
                  Expense report accuracy
                </div>
              </div>
            </div>
            <div className="self-stretch inline-flex flex-col justify-start items-start">
              <div className="self-stretch flex flex-col justify-start items-start">
                <div
                  style={{ color: ORANGE }}
                  className="justify-center  text-3xl font-bold font-['DM_Sans'] leading-9"
                >
                  Live
                </div>
              </div>
              <div className="self-stretch flex flex-col justify-start items-start">
                <div className="justify-center text-white/50 text-xs font-normal font-['Plus_Jakarta_Sans'] leading-4">
                  Spend visibility
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT – dashboard card */}
        <div className="relative">
          <div
            className="rounded-2xl border border-white/10 backdrop-blur-md p-6 flex flex-col gap-5"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            {/* header */}
            <div className="flex justify-between items-center">
              <span className="text-white font-['DM_Serif_Display'] text-base">
                Team Manager Dashboard
              </span>
              <span
                className="text-xs font-medium px-2.5 py-1 rounded-full"
                style={{ background: `${ORANGE}22`, color: ORANGE }}
              >
                Live
              </span>
            </div>

            {/* KPI row */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Total Spend", val: "₹6.4L", sub: "This month" },
                { label: "Active Trips", val: "34", sub: "Employees" },
                { label: "Approvals", val: "8", sub: "Pending" },
              ].map((k) => (
                <div
                  key={k.label}
                  className="rounded-xl p-3 flex flex-col gap-1"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                >
                  <span className="text-white text-[10px] uppercase tracking-wider">
                    {k.label}
                  </span>
                  <span className="text-white text-lg font-['DM_Serif_Display']">
                    {k.val}
                  </span>
                  <span className="text-white/40 text-[10px]">{k.sub}</span>
                </div>
              ))}
            </div>

            {/* approvals list */}
            <div>
              <p className="text-white text-[10px] uppercase tracking-wider mb-2">
                Recent Approvals
              </p>
              <div className="flex flex-col gap-2">
                {[
                  {
                    init: "AK",
                    name: "Ankit Kumar",
                    route: "Mumbai → Delhi",
                    status: "Approved",
                    statusStyle: {
                      background: "rgba(52, 211, 153, 0.2)",
                      color: "#34D399",
                    },
                  },
                  {
                    init: "SR",
                    name: "Sunita Rao",
                    route: "Bangalore → Chennai",
                    status: "Flagged",
                    statusStyle: {
                      background: "rgba(251, 191, 36, 0.2)",
                      color: "#FDE68A",
                    },
                  },
                  {
                    init: "VM",
                    name: "Vikram Mehta",
                    route: "Pune Day Trip",
                    status: "Pending",
                    statusStyle: {
                      background: "rgba(148,163,184,0.25)",
                      color: "rgba(255,255,255,0.6)",
                    },
                  },
                ].map((row) => (
                  <div
                    key={row.name}
                    className="flex justify-between items-center px-4 py-3 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.05)" }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold"
                        style={{ background: `${ORANGE}22`, color: ORANGE }}
                      >
                        {row.init}
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">
                          {row.name}
                        </p>
                        <p className="text-white/40 text-[10px]">{row.route}</p>
                      </div>
                    </div>
                    <span
                      className="text-[10px] font-medium px-2.5 py-1 rounded-full"
                      style={row.statusStyle}
                    >
                      {row.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* wallet bar */}
            <div
              className="flex justify-between items-center px-4 py-2.5 rounded-xl"
              style={{ background: ORANGE }}
            >
              <span className="text-[#0F172A] text-xs font-semibold">
                Company Wallet
              </span>
              <span className="text-[#0F172A] text-xs font-bold">
                ₹4L Available
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   MARQUEE / INFO BAR
───────────────────────────────────────────── */
function InfoBar() {
  const items = [
    { bold: "50 to 200 people", rest: " — one platform manages all" },
    { bold: "Every trip tagged", rest: " to a project or client" },
    { bold: "Secretary / EA", rest: " books on behalf of teams" },
    { bold: "Live spend dashboard", rest: " — always current" },
  ];
  return (
    <div className="bg-slate-950 border-t border-white/10 py-4">
      <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-center gap-x-10 gap-y-2">
        {items.map((it) => (
          <p key={it.bold} className="text-sm text-white/60 whitespace-nowrap">
            <span className="text-white/80 font-bold">{it.bold}</span>
            {it.rest}
          </p>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   PAIN POINTS SECTION
───────────────────────────────────────────── */
function PainPoints() {
  const cards = [
    {
      icon: <TbUsers size={30} />,
      title: "Multiple teams — multiple rules",
      body: "Define clearly who can travel where and on what budget. Sales, ops, leadership — each with their own travel parameters.",
    },
    {
      icon: <LuCalculator size={30} />,
      title: "Finance spends days reconciling",
      body: "Automate the audit of bills against projects and clients. No more manual matching of invoices and reimbursement claims.",
    },
    {
      icon: <FiUserX size={30} />,
      title: "Travel admin becomes a bottleneck",
      body: "Empower employees to book within policy. Constant calls, WhatsApp messages, and email follow-ups slow everyone down.",
    },
  ];

  return (
    <section className="bg-slate-50 py-20 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12">
          <span
            className="inline-block px-[5px] w-[519px] py-0.5 mb-5 text-xs font-semibold tracking-[0.2em] uppercase"
            style={{ background: ORANGE, color: "#000" }}
          >
            Your Reality Right Now
          </span>
          <h2 className="mt-4 text-4xl md:text-5xl font-normal leading-tight text-black font-['DM_Serif_Display']">
            Growing fast.{" "} <br />
            <span className="italic" style={{ color: ORANGE }}>Travel getting messy.</span>
          </h2>
          <p className="mt-4 text-slate-500 text-base max-w-lg leading-7">
            A ten-person team shouldn't walk high-fliers. Standardized travel is
            what keeps teams efficient.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {cards.map((c) => (
            <div
              key={c.title}
              className="bg-white rounded-2xl border border-slate-200 p-7 flex flex-col gap-4 hover:shadow-lg transition-shadow duration-300"
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center"
                style={{ background: "#f8fafc" }}
              >
                <span className="text-slate-900">{c.icon}</span>
              </div>
              <h3 className="text-sky-950 text-base font-semibold leading-6">
                {c.title}
              </h3>
              <p className="text-slate-500 text-sm leading-6">{c.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   FEATURES SECTION
───────────────────────────────────────────── */
function Features() {
  const features = [
    {
      icon: <TbPlaneTilt size={30} />,
      title: "Flight & Hotel Booking",
      body: "Search live inventory and book directly. No agents, no PNR delays. Company-wide payment in seconds.",
    },
    {
      icon: <FiCheckSquare size={30} />,
      title: "Structured Approval Workflow",
      body: "Every request goes to the right manager. One-click approvals. Everything is tracked, no WhatsApp chains.",
    },
    {
      icon: <LuTag size={30} />,
      title: "Project / Cost ID Mandatory",
      body: "Every trip is tagged to a project. Instant cost-centre clarity for your CFO and CA.",
    },
    {
      icon: <LuUserCheck size={30} />,
      title: "Secretary & EA Role",
      body: "Travel leads can book on behalf of team members. Deeply integrated — powered by the same policy engine.",
    },
    {
      icon: <LuWallet size={30} />,
      title: "Company Travel Wallet",
      body: "One centralized wallet for your entire team. Recharge it once, track every spend and every transaction.",
    },
    {
      icon: <FaRegChartBar size={30} />,
      title: "Live Spend Dashboard",
      body: "Real-time CEO-level view of every cost and every project allocation. No waiting for month-end reports.",
    },
  ];

  return (
    <section className="bg-slate-50 py-20 px-6 border-t border-slate-100">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12">
          <span
            className="text-xs font-semibold tracking-[0.2em] uppercase inline-block px-[5px] w-[519px] py-0.5 mb-5"
            style={{ background: ORANGE, color: "#000" }}
          >
            What Traveamer Does For You
          </span>
          <h2 className=" mt-4 text-4xl font-normal leading-tight text-black font-['DM_Serif_Display']">
            One platform. <br />
            <span className="italic" style={{ color: ORANGE }}>Every team. Every trip.</span>
          </h2>
          <p className="mt-4 text-slate-500 text-base max-w-lg leading-7">
            Traveamer is about giving teams the autonomy they need — without the
            complexity of big systems.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col gap-3 hover:shadow-md transition-shadow duration-300 group"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-200"
                style={{ background: "#f8fafc" }}
              >
                <span className="text-slate-800 group-hover:text-orange-300 transition-colors duration-200">
                  {f.icon}
                </span>
              </div>
              <h3 className="text-sky-950 text-sm font-semibold leading-5 mt-2">
                {f.title}
              </h3>
              <p className="text-slate-500 text-xs leading-5">{f.body}</p>
            </div>
          ))}
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
      step: "Step 1",
      title: "Onboard your Team",
      body: "Add everyone to the platform. Set roles, budgets, and policies in minutes.",
      icon: <FiUserPlus size={20} />,
    },
    {
      step: "Step 2",
      title: "Employee raises request",
      body: "Search for flights and hotels. Pick what fits, submit. Travel Admin gets a clear notification.",
      icon: <MdOutlineSearch size={20} />,
    },
    {
      step: "Step 3",
      title: "Manager approves",
      body: "One-click approval. Policy is auto-validated. Everything documented and auto-stamped.",
      icon: <FiCheckCircle size={20} />,
    },
    {
      step: "Step 4",
      title: "Employee books instantly",
      body: "PNR is live in seconds. Wallet debited. Dashboard updated. Done.",
      icon: <LuTicket size={20} />,
    },
  ];

  return (
    <section className="bg-slate-50 py-20 px-6 border-t border-slate-100">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12">
          <span
            className="text-xs font-semibold tracking-[0.2em] uppercase inline-block px-[5px] w-[519px] py-0.5 mb-5"
            style={{ background: ORANGE, color: "#000" }}
          >
            How It Works
          </span>
          <h2 className="mt-4 text-4xl font-normal leading-tight text-black font-['DM_Serif_Display']">
            One system. <br />{" "}
            <span className="italic" style={{ color: ORANGE }}>Your whole team.</span>
          </h2>
          <p className="mt-3 text-slate-500 text-base max-w-sm leading-7">
            Four simple steps to organized team travel.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {steps.map((s, i) => (
            <div key={s.step} className="relative">
              {/* connector line (desktop) */}
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-7 left-[calc(100%_-_1rem)] w-8 h-px bg-slate-200 z-10" />
              )}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col gap-3 h-full hover:shadow-md transition-shadow duration-300">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: `${ORANGE}18` }}
                  >
                    <span style={{ color: ORANGE }}>{s.icon}</span>
                  </div>
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{ background: `${ORANGE}18`, color: ORANGE }}
                  >
                    {s.step}
                  </span>
                </div>
                <h3 className="text-sky-950 text-sm font-semibold leading-5 mt-2">
                  {s.title}
                </h3>
                <p className="text-slate-500 text-xs leading-5">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   CTA SECTION
───────────────────────────────────────────── */
function CTA() {
  const perks = [
    "30-day free trial",
    "No credit card required",
    "Set up in 5 minutes",
    "Every trip tagged to a client",
  ];

  return (
    <section
      className="py-10 px-6 flex flex-col items-center text-center"
      style={{ background: DARK_BG }}
    >
      <span
        className="text-xs font-semibold tracking-[0.2em] uppercase mb-4 relative z-10"
        style={{ color: ORANGE }}
      >
        Get Started Today
      </span>

      <div className="text-center justify-center"><span className="text-white text-4xl font-normal font-['DM_Serif_Display'] leading-10">Your team is growing.<br/></span><span style={{color: ORANGE}} className="italic text-4xl font-normal font-['DM_Serif_Display'] leading-10">Your travel should keep up.</span></div>

      <p className="mt-5 text-white/50 text-base max-w-sm leading-7 relative z-10">
        Organize your team travel today with Traveamer. Free 30-day trial.
      </p>

      <div className="flex flex-wrap justify-center gap-3 mt-8 relative z-10">
        <button
          className="h-11 px-8 rounded-[10px] text-sm font-semibold transition-all duration-200 hover:brightness-110 active:scale-95"
          style={{ background: ORANGE, color: "#0F172A" }}
        >
          Start Free Trial
        </button>
        <button className="h-11 px-8 rounded-[10px] text-sm font-medium text-white border-2 border-white/30 hover:border-white/60 transition-all duration-200">
          Book a Demo
        </button>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 relative z-10">
        {perks.map((p) => (
          <div key={p} className="flex items-center gap-1.5">
            <HiCheck className="text-orange-400 w-3.5 h-3.5 shrink-0" />
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
export default function GrowingBusiness() {
  return (
    <div className="w-full font-['Plus_Jakarta_Sans']">
      <LandingHeader />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
      `}</style>
      <Hero />
      <InfoBar />
      <PainPoints />
      <Features />
      <HowItWorks />
      <CTA />
      <LandingFooter />
    </div>
  );
}