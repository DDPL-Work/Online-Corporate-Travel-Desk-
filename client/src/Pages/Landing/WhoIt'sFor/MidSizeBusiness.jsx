import {
  FiChevronDown,
  FiArrowRight,
  FiCheck,
  FiBarChart2,
  FiGrid,
  FiUsers,
  FiCheckSquare,
  FiCreditCard,
  FiMail,
  FiEye,
  FiDatabase,
  FiTag,
  FiSearch,
  FiCheckCircle,
} from "react-icons/fi";
import LandingHeader from "../../../layout/LandingHeader";
import LandingFooter from "../../../layout/LandingFooter";
import { LuPlane, LuWallet } from "react-icons/lu";
import { FaCheck } from "react-icons/fa";
import { IoIosCheckmark } from "react-icons/io";

// ─── COLOR TOKENS ─────────────────────────────────────────────────────────────
const C_BLACK = "[#000000]";
const C_NAVY_DEEP = "[#000D26]";
const C_FOOTER_TEXT = "[#04112F]";
const C_CTA_BTN_TEXT = "[#0A243D]";
const C_NAVBAR_BG = "[#0C0C0C]";
const C_STEP_NUM = "[#102238]";
const C_BODY_TEXT = "[#65758B]";
const C_GOLD = "[#C9A240]";
const C_CARD_BORDER = "[#E1E7EF]";
const C_NAV_LIGHT = "[#F5F5F5]";
const C_SECTION_BG = "[#F8FAFC]";
const C_WHITE = "[#ffffff]";
// ─────────────────────────────────────────────────────────────────────────────

const GOLD_HEX = "#C9A240";
const GOLD_10 = "rgba(201,162,64,0.10)";
const GOLD_20 = "rgba(201,162,64,0.20)";
const WHITE_5 = "rgba(255,255,255,0.05)";
const WHITE_10 = "rgba(255,255,255,0.10)";
const WHITE_30 = "rgba(255,255,255,0.30)";
const HERO_GRADIENT = "linear-gradient(348deg, #003399 0%, #000D26 100%)";

const ORANGE = "#C9A84C";
const ORANGE_FADE = "rgba(201,162,64,0.1)";

export default function MidSizeBusiness() {
  return (
    <>
      <LandingHeader />
      <div
        className={`w-full bg-${C_WHITE} overflow-hidden`}
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        {/* HERO */}
        <div
          className="relative w-full overflow-hidden"
          style={{ background: HERO_GRADIENT }}
        >
          <div className="max-w-7xl mx-auto px-5 sm:px-6 pb-20 pt-12 md:pt-24 flex flex-col lg:flex-row items-center lg:items-start justify-between gap-12 text-center lg:text-left">
            {/* LEFT — copy */}
            <div className="w-full lg:max-w-[580px] flex flex-col items-center lg:items-start gap-6 md:gap-8">
              {/* eyebrow badge */}
              <div className="w-fit px-4 py-2 bg-white/10 rounded-full outline -outline-offset-1 outline-white/10 backdrop-blur-[2px] flex items-center gap-2 mx-auto lg:mx-0">
                <div className="text-white/80 text-[10px] sm:text-xs font-normal font-['Plus_Jakarta_Sans'] leading-tight">
                  🏭 &nbsp;Who It's For · Mid-Size Business · 200 to 500 People
                </div>
              </div>

              {/* headline */}
              <h1 className="text-white text-3xl sm:text-5xl lg:text-6xl font-normal font-['DM_Serif_Display'] leading-tight">
                Travel at scale.
                <br />
                Control at{" "}
                <span style={{ color: ORANGE }} className="italic">
                  every level.
                </span>
              </h1>

              {/* sub-copy */}
              <p className="text-white/70 text-sm sm:text-base font-normal font-['Plus_Jakarta_Sans'] leading-relaxed max-w-[500px] mx-auto lg:mx-0">
                At 200 to 500 people — travel is a significant business cost.
                Your CFO needs clean data. Your MD needs visibility. Your Travel
                Admin needs tools that actually work at this scale. Traveamer
                delivers all three.
              </p>

              {/* CTA buttons */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
                <button
                  style={{ background: ORANGE }}
                  className="h-12 px-12 rounded-full text-sky-950 text-sm font-semibold transition-all hover:brightness-110 active:scale-95"
                >
                  Start Free Trial
                </button>
                <button className="h-12 px-8 rounded-full border-2 border-white/30 text-white text-sm font-semibold transition-all hover:border-white/60">
                  See How it Works →
                </button>
              </div>

              {/* stat strip */}
              <div className="w-full pt-8 border-t border-white/10 flex flex-wrap justify-center lg:justify-start gap-6 sm:gap-12">
                <div className="flex flex-col gap-1">
                  <div
                    style={{ color: ORANGE }}
                    className="text-2xl sm:text-3xl font-bold font-['Plus_Jakarta_Sans']"
                  >
                    500
                  </div>
                  <div className="text-white/50 text-[10px] sm:text-xs font-normal">
                    Employees supported
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <div
                    style={{ color: ORANGE }}
                    className="text-2xl sm:text-3xl font-bold font-['Plus_Jakarta_Sans']"
                  >
                    Live
                  </div>
                  <div className="text-white/50 text-[10px] sm:text-xs font-normal">
                    CFO spend dashboard
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <div
                    style={{ color: ORANGE }}
                    className="text-2xl sm:text-3xl font-bold font-['Plus_Jakarta_Sans']"
                  >
                    1
                  </div>
                  <div className="text-white/50 text-[10px] sm:text-xs font-normal">
                    Click cost report
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT — CFO card */}
            <div
              className="w-full lg:max-w-[600px] rounded-2xl overflow-hidden self-center lg:self-start"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.12)",
                backdropFilter: "blur(16px)",
                boxShadow: "0px 25px 50px -12px rgba(0,0,0,0.50)",
              }}
            >
              {/* card header */}
              <div className="px-5 sm:px-6 py-4 flex justify-between items-center border-b border-white/10">
                <div className="text-white text-sm sm:text-base font-normal font-['DM_Serif_Display']">
                  CFO Travel Report — Q1 2026
                </div>
                <div
                  style={{ background: ORANGE_FADE, color: ORANGE }}
                  className="px-3 py-1 rounded-full text-[10px] sm:text-xs font-medium"
                >
                  One Click
                </div>
              </div>

              {/* card body */}
              <div className="px-5 sm:px-6 py-6">
                <p className="text-white/50 text-[10px] sm:text-xs font-normal mb-6 uppercase tracking-wider">
                  January — March 2026
                </p>

                {/* metric tiles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                  <div className="bg-white/5 rounded-xl p-4 flex flex-col gap-1">
                    <span className="text-white/40 text-[10px] uppercase tracking-wide">
                      Total Spend
                    </span>
                    <span
                      style={{ color: ORANGE }}
                      className="text-2xl font-bold font-['Plus_Jakarta_Sans']"
                    >
                      ₹38.4L
                    </span>
                    <span className="text-white/40 text-[10px]">
                      + 12% vs last Q1
                    </span>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 flex flex-col gap-1">
                    <span className="text-white/40 text-[10px] uppercase tracking-wide">
                      Projects Tagged
                    </span>
                    <span className="text-white text-2xl font-bold font-['Plus_Jakarta_Sans']">
                      24
                    </span>
                    <span className="text-white/40 text-[10px]">
                      247 trips, 89 employees
                    </span>
                  </div>
                </div>

                {/* top projects label */}
                <div className="text-white/40 text-[10px] uppercase tracking-wider mb-3">
                  Top Projects by Travel Spend
                </div>

                {/* project rows */}
                <div className="flex flex-col gap-1">
                  {[
                    {
                      name: "Tata Steel — Phase 2",
                      amount: "₹8.2L",
                      pct: "100%",
                    },
                    { name: "Reliance Audit Q1", amount: "₹6.4L", pct: "78%" },
                    {
                      name: "Infosys Partnership",
                      amount: "₹4.4L",
                      pct: "54%",
                    },
                    {
                      name: "Internal — HR & Admin",
                      amount: "₹2.8L",
                      pct: "34%",
                    },
                  ].map((row) => (
                    <div
                      key={row.name}
                      className="py-3 flex justify-between items-center border-b border-white/5"
                    >
                      <span className="text-white/80 text-xs truncate max-w-[150px] sm:max-w-none">
                        {row.name}
                      </span>
                      <div className="flex items-center gap-3">
                        <div className="hidden sm:block w-[90px] h-1 rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full"
                            style={{ width: row.pct, background: GOLD_HEX }}
                          />
                        </div>
                        <span
                          style={{ color: ORANGE }}
                          className="text-xs font-semibold w-12 text-right"
                        >
                          {row.amount}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* total row */}
                <div className="pt-5 mt-4 flex justify-between items-center border-t border-orange-400/20">
                  <span className="text-white/80 text-xs font-medium">
                    Total Q1 Travel Spend
                  </span>
                  <span
                    style={{ color: ORANGE }}
                    className="text-base font-bold"
                  >
                    ₹38,40,000
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TICKER BAR */}
        <div className="w-full bg-[#020617] border-t border-white/10 py-6 px-6 overflow-hidden">
          <div className="max-w-7xl mx-auto">
            {/* On Mobile: animate-infinite-scroll and w-max 
        On Desktop (lg): static layout with justify-between 
    */}
            <div className="flex w-max lg:w-full lg:justify-between items-center gap-10 animate-infinite-scroll lg:animate-none">
              {/* First Set of Items */}
              <div className="flex items-center gap-10">
                {[
                  { b: "200 to 500 people", r: "— fully supported" },
                  { b: "CFO dashboard", r: "— live spend by project" },
                  { b: "Full role hierarchy", r: "— MD to employee" },
                  { b: "Audit ready", r: "— every trip documented" },
                ].map((item, i) => (
                  <div
                    key={`set1-${i}`}
                    className="flex items-center gap-1 whitespace-nowrap"
                  >
                    <span className="text-white font-bold text-sm">
                      {item.b}
                    </span>
                    <span className="text-white/70 font-normal text-sm">
                      {item.r}
                    </span>
                  </div>
                ))}
              </div>

              {/* Second Set of Items (Hidden on Desktop, used for mobile loop) */}
              <div className="flex lg:hidden items-center gap-10">
                {[
                  { b: "200 to 500 people", r: "— fully supported" },
                  { b: "CFO dashboard", r: "— live spend by project" },
                  { b: "Full role hierarchy", r: "— MD to employee" },
                  { b: "Audit ready", r: "— every trip documented" },
                ].map((item, i) => (
                  <div
                    key={`set2-${i}`}
                    className="flex items-center gap-1 whitespace-nowrap"
                  >
                    <span className="text-white font-bold text-sm">
                      {item.b}
                    </span>
                    <span className="text-white/70 font-normal text-sm">
                      {item.r}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* YOUR REALITY RIGHT NOW */}
        <section className="bg-slate-50 py-10 md:py-20 px-6">
          <div className="max-w-7xl mx-auto flex flex-col gap-12 items-start text-left">
            {/* header */}
            <div className="flex flex-col gap-6 items-start">
              <div
                style={{ background: ORANGE }}
                className="w-full lg:w-[519px] px-2.5 py-1 text-[10px] lg:text-xs font-semibold tracking-[0.2em] uppercase"
              >
                Your Reality Right Now
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-normal font-['DM_Serif_Display'] leading-tight">
                At this scale — travel <br />
                <span style={{ color: ORANGE }} className="italic">
                  is a serious cost.
                </span>
              </h2>
              <p className="text-slate-500 text-sm sm:text-base font-normal leading-relaxed max-w-2xl mx-auto lg:mx-0">
                With 200 to 500 people — travel spend runs into crores annually.
                Without proper systems, that money is impossible to track or
                control.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              {[
                {
                  icon: (
                    <FiEye className="w-6 h-6" style={{ color: GOLD_HEX }} />
                  ),
                  title: "No project-wise visibility",
                  body: "Travel is happening across 20 projects simultaneously. Nobody knows which project is consuming the most travel budget until it's too late to act.",
                },
                {
                  icon: (
                    <FiDatabase
                      className="w-6 h-6"
                      style={{ color: GOLD_HEX }}
                    />
                  ),
                  title: "CFO lacks clean data",
                  body: "Board meetings, audits, investor reviews — the CFO needs clean travel expense data on demand. Currently it takes days to compile from scattered sources.",
                },
                {
                  icon: (
                    <FiUsers className="w-6 h-6" style={{ color: GOLD_HEX }} />
                  ),
                  title: "No system built for this scale",
                  body: "The informal systems that worked at 50 people are completely broken at 200. You need a proper platform — not spreadsheets and WhatsApp groups.",
                },
              ].map((card) => (
                <div
                  key={card.title}
                  className="bg-white rounded-2xl p-8 flex flex-col items-center lg:items-start text-center lg:text-left gap-5 border border-slate-200 hover:shadow-lg transition-all duration-300"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: GOLD_10 }}
                  >
                    {card.icon}
                  </div>
                  <h3 className="text-slate-950 text-xl font-normal font-['DM_Serif_Display']">
                    {card.title}
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    {card.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* WHAT TRAVEAMER DOES FOR YOU */}
        <section className="bg-white py-10 md:py-20 px-6 border-t border-slate-100">
          <div className="max-w-7xl mx-auto flex flex-col gap-12 items-start text-left">
            <div className="flex flex-col gap-6 items-start">
              <div
                style={{ background: ORANGE }}
                className="w-full lg:w-[519px] px-2.5 py-1 text-[10px] lg:text-xs font-semibold tracking-[0.2em] uppercase"
              >
                <span className="text-black text-[10px] sm:text-xs font-semibold uppercase tracking-[2.40px]">
                  What Traveamer Does For You
                </span>
              </div>
              <h2 className="text-black text-3xl sm:text-4xl lg:text-5xl font-normal font-['DM_Serif_Display'] leading-tight">
                Built for scale. <br />
                <span style={{ color: ORANGE }} className="italic">
                  Simple to operate.
                </span>
              </h2>
              <p className="text-slate-500 text-sm sm:text-base font-normal leading-relaxed max-w-2xl mx-auto lg:mx-0">
                Everything your CFO, MD, and Travel Admin needs — in one
                platform that actually works at 200 to 500 people.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {[
                {
                  icon: (
                    <LuPlane className="w-5 h-5" style={{ color: GOLD_HEX }} />
                  ),
                  title: "Flight & hotel at scale",
                  body: "Hundreds of employees booking simultaneously. Live inventory, instant PNR. Company wallet pays. Every booking is tagged and logged automatically.",
                },
                {
                  icon: (
                    <FiBarChart2
                      className="w-5 h-5"
                      style={{ color: GOLD_HEX }}
                    />
                  ),
                  title: "CFO spend dashboard",
                  body: "Live travel spend across all projects, departments, and employees. One-click quarterly report. Clean data for board meetings, audits, and investor reviews.",
                },
                {
                  icon: (
                    <FiTag className="w-5 h-5" style={{ color: GOLD_HEX }} />
                  ),
                  title: "Project Cost ID — 100% tagged",
                  body: "Every single trip tagged to a project. No exceptions. No manual allocation. Your project profitability data is always clean and always current.",
                },
                {
                  icon: (
                    <FiUsers className="w-5 h-5" style={{ color: GOLD_HEX }} />
                  ),
                  title: "Full role hierarchy",
                  body: "MD books trips. Directors have full rights. Managers approve their teams. Secretaries book on behalf of seniors. Every level — right access, right control.",
                },
                {
                  icon: (
                    <FiCheckSquare
                      className="w-5 h-5"
                      style={{ color: GOLD_HEX }}
                    />
                  ),
                  title: "Structured approvals at scale",
                  body: "Travel Admin manages all approvals from one dashboard. Clear queues. One-click approve/reject. Full audit trail on every decision made.",
                },
                {
                  icon: (
                    <LuWallet className="w-5 h-5" style={{ color: GOLD_HEX }} />
                  ),
                  title: "Centralised travel wallet",
                  body: "One company wallet. Every booking debits instantly. Live balance visible to Finance team at all times. No manual reconciliation. Ever.",
                },
              ].map((card) => (
                <div
                  key={card.title}
                  className="bg-white rounded-2xl p-7 flex flex-col items-center lg:items-start text-center lg:text-left gap-4 border border-slate-200 hover:shadow-md transition-all duration-300"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: GOLD_10 }}
                  >
                    {card.icon}
                  </div>
                  <h3 className="text-slate-950 text-base font-semibold leading-tight">
                    {card.title}
                  </h3>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    {card.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="bg-slate-50 py-10 md:py-20 px-6 border-t border-slate-100">
          <div className="max-w-7xl mx-auto flex flex-col gap-12 items-start text-left">
            <div className="flex flex-col gap-6 items-start">
              <div
                style={{ background: ORANGE }}
                className="w-full lg:w-[519px] px-2.5 py-1 text-[10px] lg:text-xs font-semibold tracking-[0.2em] uppercase"
              >
                How It Works
              </div>
              <h2 className="text-black text-3xl sm:text-4xl lg:text-5xl font-normal font-['DM_Serif_Display'] leading-tight">
                Hundreds of employees. <br />
                <span style={{ color: ORANGE }} className="italic">
                  One clean system.
                </span>
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 ">
              {[
                {
                  step: "1",
                  icon: (
                    <FiUsers className="w-6 h-6" style={{ color: GOLD_HEX }} />
                  ),
                  title: "Onboard organisation",
                  body: "500 employees, your entire directory. Roles assigned. Projects set up. Wallet funded. Live in days.",
                },
                {
                  step: "2",
                  icon: (
                    <FiSearch className="w-6 h-6" style={{ color: GOLD_HEX }} />
                  ),
                  title: "Employee request",
                  body: "Search flights/hotels. Tag to project. Admin gets it instantly in their approval queue.",
                },
                {
                  step: "3",
                  icon: (
                    <FiCheckCircle
                      className="w-6 h-6"
                      style={{ color: GOLD_HEX }}
                    />
                  ),
                  title: "Admin approves",
                  body: "One click. Employee notified. Project cost updated. Auto-tagged. No manual work.",
                },
                {
                  step: "4",
                  icon: (
                    <FiBarChart2
                      className="w-6 h-6"
                      style={{ color: GOLD_HEX }}
                    />
                  ),
                  title: "CFO sees live data",
                  body: "Every booking feeds into the live dashboard. Reports ready on demand. Always.",
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="bg-white rounded-2xl p-6 flex flex-col gap-5 border border-slate-200 relative group hover:shadow-md transition-all text-center items-center justify-center"
                >
                  <div className="relative inline-flex w-fit">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center transition-colors group-hover:bg-amber-100"
                      style={{ background: GOLD_10 }}
                    >
                      {item.icon}
                    </div>
                    <span
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm"
                      style={{ background: GOLD_HEX }}
                    >
                      {item.step}
                    </span>
                  </div>
                  <h3 className="text-slate-950 text-base font-semibold leading-tight">
                    {item.title}
                  </h3>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA SECTION */}
        <section className="w-full py-20 bg-slate-950 px-6 text-center">
          <div className="max-w-4xl mx-auto flex flex-col items-center gap-8">
            <span
              style={{ color: ORANGE }}
              className="text-xs font-semibold uppercase tracking-[2.40px]"
            >
              Get Started Today
            </span>
            <h2 className="text-white text-3xl sm:text-4xl lg:text-5xl font-normal font-['DM_Serif_Display'] leading-tight">
              Give your CFO the data. <br />
              <span style={{ color: ORANGE }} className="italic">
                Give your team the freedom.
              </span>
            </h2>
            <p className="text-white/50 text-sm sm:text-base leading-relaxed max-w-xl">
              Traveamer scales with your organization. Free 30-day trial. Full
              team onboarded in days.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button
                style={{ background: ORANGE }}
                className="h-12 px-10 rounded-xl text-sky-950 text-sm font-semibold shadow-lg hover:brightness-110 active:scale-95 transition-all"
              >
                Start Free Trial
              </button>
              <button className="h-12 px-10 rounded-xl border-2 border-white/20 text-white text-sm font-medium hover:border-white/40 transition-all">
                Book a Demo
              </button>
            </div>
            <div className="flex flex-wrap justify-center gap-6 mt-4">
              {[
                "30-day free trial",
                "No credit card required",
                "Live in under 2 hours",
                "GST invoices from day one",
              ].map((perk) => (
                <div key={perk} className="flex items-center gap-2">
                  <IoIosCheckmark size={20} style={{ color: ORANGE }} />
                  <span className="text-white/50 text-xs">{perk}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
      <LandingFooter />
    </>
  );
}
