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

export default function MidSizeBusiness() {
  return (
    <>
      <LandingHeader />
      <div
        className={`w-full bg-${C_WHITE} overflow-hidden`}
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        {/* ══════════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════════ */}
        <div
          className=" relative w-full overflow-hidden"
          style={{ background: HERO_GRADIENT }}
        >
          {/* ── HERO BODY ── */}
          <div className="max-w-[1400px] mx-auto pb-[86px] pt-14 flex items-start justify-between gap-10 flex-wrap">
            {/* LEFT — copy */}
            <div className="flex-1 min-w-[340px] max-w-[580px] flex flex-col gap-7">
              {/* eyebrow badge */}
              <div className="w-[350px]  px-4 py-2 bg-white/10 rounded-full outline  -outline-offset-1 outline-white/10 backdrop-blur-[2px] inline-flex justify-start items-center gap-2">
                <div className="justify-center text-white/80 text-xs font-normal font-['Plus_Jakarta_Sans'] leading-4">
                  🏭  Who It&apos;s For · Mid-Size Business · 200 to 500 People
                </div>
              </div>

              {/* headline */}
              <h1 className="self-stretch justify-center">
                <span class="text-white text-6xl font-normal font-['DM_Serif_Display'] leading-[60px]">
                  Travel at scale.
                  <br />
                  Control at
                  <br />
                </span>
                <span
                  style={{ color: ORANGE }}
                  className=" text-6xl font-normal font-['DM_Serif_Display'] leading-[60px] italic"
                >
                  every level.
                </span>
              </h1>

              {/* sub-copy */}
              <p className="justify-center text-white/70 text-base font-normal font-['Plus_Jakarta_Sans'] leading-6">
                At 200 to 500 people — travel is a significant business cost.
                <br />
                Your CFO needs clean data. Your MD needs visibility. Your
                <br />
                Travel Admin needs tools that actually work at this scale.
                <br />
                Traveamer delivers all three.
              </p>

              {/* CTA buttons */}
              <div className="flex items-center gap-4 flex-wrap">
                <div
                  style={{ background: ORANGE }}
                  className="h-11 px-8 rounded-full inline-flex justify-center items-center"
                >
                  <button className="text-center justify-center text-color-azure-14 text-sm font-semibold font-['Plus_Jakarta_Sans'] leading-5">
                    Start Free Trial
                  </button>
                </div>
                <div className="h-11 px-8 rounded-full outline  -outline-offset-2 outline-white/30 flex justify-center items-center">
                  <button className="text-center justify-center text-white text-sm font-semibold font-['Plus_Jakarta_Sans'] leading-5">
                    See How it Works →
                  </button>
                </div>
              </div>

              {/* stat strip */}
              <div className="self-stretch pt-6 border-t border-white/10 inline-flex justify-start items-start gap-10 flex-wrap content-start">
                <div className="self-stretch inline-flex flex-col justify-start items-start">
                  <div className="self-stretch flex flex-col justify-start items-start">
                    <div
                      style={{ color: ORANGE }}
                      className="justify-center  text-2xl font-bold font-['Plus_Jakarta_Sans'] leading-8"
                    >
                      500
                    </div>
                  </div>
                  <div className="self-stretch flex flex-col justify-start items-start">
                    <div className="justify-center text-white/50 text-xs font-normal font-['Plus_Jakarta_Sans'] leading-4">
                      Employees supported
                    </div>
                  </div>
                </div>
                <div className="self-stretch inline-flex flex-col justify-start items-start">
                  <div className="self-stretch flex flex-col justify-start items-start">
                    <div
                      style={{ color: ORANGE }}
                      className="justify-center  text-2xl font-bold font-['Plus_Jakarta_Sans'] leading-8"
                    >
                      Live
                    </div>
                  </div>
                  <div className="self-stretch flex flex-col justify-start items-start">
                    <div className="justify-center text-white/50 text-xs font-normal font-['Plus_Jakarta_Sans'] leading-4">
                      CFO spend dashboard
                    </div>
                  </div>
                </div>
                <div className="self-stretch inline-flex flex-col justify-start items-start">
                  <div className="self-stretch flex flex-col justify-start items-start">
                    <div
                      style={{ color: ORANGE }}
                      className="justify-center  text-2xl font-bold font-['Plus_Jakarta_Sans'] leading-8"
                    >
                      1
                    </div>
                  </div>
                  <div className="self-stretch flex flex-col justify-start items-start">
                    <div className="justify-center text-white/50 text-xs font-normal font-['Plus_Jakarta_Sans'] leading-4">
                      Click project cost report
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT — CFO card */}
            <div
              className="flex-1 min-w-[320px] max-w-[644px] rounded-2xl overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.05)", // deep blue, matches screenshot
                border: "1px solid rgba(255,255,255,0.12)",
                backdropFilter: "blur(16px)",
                boxShadow: "0px 25px 50px -12px rgba(0,0,0,0.50)",
              }}
            >
              {/* card header */}
              <div
                className="px-6 py-4 flex justify-between items-center"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.10)" }}
              >
                <div className="justify-center text-white text-sm font-normal font-['DM_Serif_Display'] leading-5">
                  CFO Travel Report — Q1 2026
                </div>
                {/* "One Click" badge — outlined pill matching screenshot */}
                <div
                  style={{ background: ORANGE_FADE }}
                  className="px-3 py-1 rounded-full inline-flex flex-col justify-start items-start"
                >
                  <div
                    style={{ color: ORANGE }}
                    className="justify-center text-xs font-medium font-['Plus_Jakarta_Sans'] leading-4"
                  >
                    One Click
                  </div>
                </div>
              </div>

              {/* card body */}
              <div className="px-6 py-5">
                <p className="pb-3 justify-center text-white/50 text-xs font-normal font-['Plus_Jakarta_Sans'] leading-4">
                  January — March 2026
                </p>

                {/* metric tiles */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="self-stretch h-24 relative bg-white/5 rounded-xl">
                    <div className="w-64 left-4 top-4 absolute inline-flex flex-col justify-start items-start">
                      <div className="justify-center text-white/40 text-[10px] font-normal font-['Plus_Jakarta_Sans'] uppercase leading-4 tracking-wide">
                        Total Spend
                      </div>
                    </div>
                    <div className="w-64 left-4 top-[35px] absolute inline-flex flex-col justify-start items-start">
                      <div
                        style={{ color: ORANGE }}
                        className="justify-center  text-2xl font-bold font-['Plus_Jakarta_Sans'] leading-8"
                      >
                        ₹38.4L
                      </div>
                    </div>
                    <div className="w-64 left-4 top-[67px] absolute inline-flex flex-col justify-start items-start">
                      <div className="justify-center text-white/40 text-[10px] font-normal font-['Plus_Jakarta_Sans'] leading-4">
                        + 12% vs last Q1
                      </div>
                    </div>
                  </div>
                  <div className="self-stretch h-24 relative bg-white/5 rounded-xl">
                    <div className="w-64 left-4 top-4 absolute inline-flex flex-col justify-start items-start">
                      <div className="justify-center text-white/40 text-[10px] font-normal font-['Plus_Jakarta_Sans'] uppercase leading-4 tracking-wide">
                        Projects Tagged
                      </div>
                    </div>
                    <div className="w-64 left-4 top-[35px] absolute inline-flex flex-col justify-start items-start">
                      <div className="justify-center text-white text-2xl font-bold font-['Plus_Jakarta_Sans'] leading-8">
                        24
                      </div>
                    </div>
                    <div className="w-64 left-4 top-[67px] absolute inline-flex flex-col justify-start items-start">
                      <div className="justify-center text-white/40 text-[10px] font-normal font-['Plus_Jakarta_Sans'] leading-4">
                        247 trips, 89 employees
                      </div>
                    </div>
                  </div>
                </div>

                {/* top projects label */}
                <div className="w-[596px] pt-2 inline-flex flex-col justify-start items-start">
                  <div className="justify-center text-white/40 text-[10px] font-normal font-['Plus_Jakarta_Sans'] uppercase leading-4 tracking-wide">
                    Top Projects by Travel Spend
                  </div>
                </div>

                {/* project rows */}
                <div className="flex flex-col">
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
                      className="py-3 flex justify-between items-center"
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <span className="justify-center text-white/80 text-xs font-normal font-['Plus_Jakarta_Sans'] leading-4">
                        {row.name}
                      </span>
                      <div className="flex items-center gap-3">
                        {/* progress bar track */}
                        <div
                          className="w-[90px] h-[5px] rounded-full overflow-hidden"
                          style={{ background: "rgba(255,255,255,0.12)" }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{ width: row.pct, background: GOLD_HEX }}
                          />
                        </div>
                        <span
                          style={{ color: ORANGE }}
                          className={` text-xs font-semibold leading-4 w-[52px] text-right`}
                        >
                          {row.amount}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* total row */}
                <div
                  className="pt-4 mt-1 flex justify-between items-center"
                  style={{ borderTop: `1px solid ${GOLD_20}` }}
                >
                  <div className="justify-center text-white/80 text-xs font-medium font-['Plus_Jakarta_Sans'] leading-4">
                    Total Q1 Travel Spend
                  </div>
                  <div
                    style={{ color: ORANGE }}
                    className="justify-center text-sm font-bold font-['Plus_Jakarta_Sans'] leading-5"
                  >
                    ₹38,40,000
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════
      TICKER BAR
    ══════════════════════════════════════════════════════════ */}
        <div className="w-full bg-[#020617] border-t border-white/10 py-6 px-4">
          <div className="max-w-7xl mx-auto flex flex-wrap justify-center md:justify-between items-center gap-8 md:gap-4">
            {/* Item 1 */}
            <div className="flex items-center whitespace-nowrap">
              <span className="text-white font-bold text-sm sm:text-base font-['Plus_Jakarta_Sans']">
                200 to 500 people
              </span>
              <span className="text-white/70 font-normal text-sm sm:text-base font-['Plus_Jakarta_Sans']">
                &mdash; fully supported
              </span>
            </div>

            {/* Item 2 */}
            <div className="flex items-center whitespace-nowrap">
              <span className="text-white font-bold text-sm sm:text-base font-['Plus_Jakarta_Sans']">
                CFO dashboard
              </span>
              <span className="text-white/70 font-normal text-sm sm:text-base font-['Plus_Jakarta_Sans']">
                &mdash; live spend by project
              </span>
            </div>

            {/* Item 3 */}
            <div className="flex items-center whitespace-nowrap">
              <span className="text-white font-bold text-sm sm:text-base font-['Plus_Jakarta_Sans']">
                Full role hierarchy
              </span>
              <span className="text-white/70 font-normal text-sm sm:text-base font-['Plus_Jakarta_Sans']">
                &mdash; MD to employee
              </span>
            </div>

            {/* Item 4 */}
            <div className="flex items-center whitespace-nowrap">
              <span className="text-white font-bold text-sm sm:text-base font-['Plus_Jakarta_Sans']">
                Audit ready
              </span>
              <span className="text-white/70 font-normal text-sm sm:text-base font-['Plus_Jakarta_Sans']">
                &mdash; every trip documented
              </span>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════
          YOUR REALITY RIGHT NOW
      ══════════════════════════════════════════════════════════ */}
        <div className={`w-full py-12 bg-${C_SECTION_BG} flex justify-center`}>
          <div className="w-full max-w-[1400px] px-7 flex flex-col gap-12">
            {/* header */}
            <div className="flex flex-col gap-5 pt-1.5">
              <div
                style={{ background: ORANGE }}
                className="w-[512px] px-[5px] py-0.5 inline-flex justify-start items-center gap-2.5"
              >
                <div className="justify-center text-black text-xs font-semibold font-['Plus_Jakarta_Sans'] uppercase leading-4 tracking-[2.40px]">
                  Your Reality Right Now
                </div>
              </div>
              <div className="justify-center">
                <span class="text-black text-5xl font-normal font-['DM_Serif_Display'] leading-[48px]">
                  At this scale — travel
                  <br />
                </span>
                <span
                  style={{ color: ORANGE }}
                  className=" italic text-5xl font-normal font-['DM_Serif_Display'] leading-[48px]"
                >
                  is a serious cost.
                </span>
              </div>
              <p className="justify-center text-[#65758B] text-base font-normal font-['Plus_Jakarta_Sans'] leading-6">
                With 200 to 500 people — travel spend runs into crores annually.
                Without proper systems,
                <br />
                that money is impossible to track or control.
              </p>
            </div>

            {/* pain cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                  className={`bg-${C_WHITE} rounded-2xl p-8 flex flex-col gap-4`}
                  style={{
                    outline: `1px solid ${C_CARD_BORDER.replace("[", "").replace("]", "")}`,
                    outlineOffset: "-1px",
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: GOLD_10 }}
                  >
                    {card.icon}
                  </div>
                  <h3
                    className={`text-${C_NAVY_DEEP} text-base font-normal leading-6`}
                    style={{ fontFamily: "'DM Serif Display', serif" }}
                  >
                    {card.title}
                  </h3>
                  <p
                    className={`text-[#65758B] text-sm font-normal leading-[22.75px]`}
                  >
                    {card.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════
          WHAT TRAVEAMER DOES FOR YOU
      ══════════════════════════════════════════════════════════ */}
        <div className={`w-full py-12 bg-${C_SECTION_BG} flex justify-center`}>
          <div className="w-full max-w-[1400px] px-7 flex flex-col gap-12">
            {/* header */}
            <div className="flex flex-col gap-5 pt-1.5">
              <div
                style={{ background: ORANGE }}
                className="w-[512px] px-[5px] py-0.5 inline-flex justify-start items-center gap-2.5"
              >
                <div className="justify-center text-black text-xs font-semibold font-['Plus_Jakarta_Sans'] uppercase leading-4 tracking-[2.40px]">
                  What Traveamer Does For You
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <div className="self-stretch justify-center">
                  <span className="text-black text-5xl font-normal font-['DM_Serif_Display'] leading-[48px]">
                    Built for scale.
                    <br />
                  </span>
                  <span
                    style={{ color: ORANGE }}
                    className="italic text-5xl font-normal font-['DM_Serif_Display'] leading-[48px]"
                  >
                    Simple to operate.
                  </span>
                </div>
                <p
                  className={`max-w-[672px] text-${C_BODY_TEXT} text-base font-normal leading-6`}
                >
                  Everything your CFO, MD, and Travel Admin needs — in one
                  platform that actually works at 200 to 500 people.
                </p>
              </div>
            </div>

            {/* feature cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
                  className={`bg-${C_WHITE} rounded-2xl p-7 flex flex-col gap-4`}
                  style={{
                    outline: `1px solid ${C_CARD_BORDER.replace("[", "").replace("]", "")}`,
                    outlineOffset: "-1px",
                  }}
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ background: GOLD_10 }}
                  >
                    {card.icon}
                  </div>
                  <h3
                    className={`text-${C_NAVY_DEEP} text-sm font-normal leading-5`}
                    style={{ fontFamily: "'DM Serif Display', serif" }}
                  >
                    {card.title}
                  </h3>
                  <p
                    className={`text-${C_BODY_TEXT} text-xs font-normal leading-[19.5px]`}
                  >
                    {card.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════════════════════════ */}
        <div
          className={`w-full py-12 bg-${C_SECTION_BG} overflow-hidden flex justify-center`}
        >
          <div className="w-full max-w-[1400px] px-7 flex flex-col gap-14">
            {/* header */}
            <div className="flex flex-col gap-5 pt-1.5">
              <div
                style={{ background: ORANGE }}
                className="w-[512px] px-[5px] py-0.5 inline-flex justify-start items-center gap-2.5"
              >
                <div className="justify-center text-black text-xs font-semibold font-['Plus_Jakarta_Sans'] uppercase leading-4 tracking-[2.40px]">
                  How It Works
                </div>
              </div>

              <div className="self-stretch justify-center">
                <span className="text-black text-5xl font-normal font-['DM_Serif_Display'] leading-[48px]">
                  Hundreds of employees.
                  <br />
                </span>
                <span
                  style={{ color: ORANGE }}
                  className=" italic text-5xl font-normal font-['DM_Serif_Display'] leading-[48px]"
                >
                  One clean system.
                </span>
              </div>
            </div>

            {/* step cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                {
                  step: "1",
                  icon: (
                    <FiUsers className="w-6 h-6" style={{ color: GOLD_HEX }} />
                  ),
                  title: "Onboard your organisation",
                  body: "500 employees, your entire directory. Roles assigned. Projects set up. Wallet funded. Full team live in days — not weeks.",
                },
                {
                  step: "2",
                  icon: (
                    <FiSearch className="w-6 h-6" style={{ color: GOLD_HEX }} />
                  ),
                  title: "Employee raises request",
                  body: "Search flights/hotels. Tag to project. Travel Admin gets it instantly in their approval queue.",
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
                  body: "One click. Employee notified. Project cost updated. Auto-tagged. All automatic — no manual work.",
                },
                {
                  step: "4",
                  icon: (
                    <FiBarChart2
                      className="w-6 h-6"
                      style={{ color: GOLD_HEX }}
                    />
                  ),
                  title: "CFO sees it all live",
                  body: "Every booking feeds into the live dashboard. Project costs, department-wise budgets. Reports ready on demand. Always.",
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className={`bg-${C_WHITE} rounded-2xl p-6 flex flex-col gap-4`}
                  style={{
                    outline: `1px solid ${C_CARD_BORDER.replace("[", "").replace("]", "")}`,
                    outlineOffset: "-1px",
                  }}
                >
                  {/* icon + step badge */}
                  <div className="relative inline-flex w-fit">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center"
                      style={{ background: GOLD_10 }}
                    >
                      {item.icon}
                    </div>
                    <span
                      className={`absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-${C_STEP_NUM} text-xs font-bold leading-4`}
                      style={{ background: GOLD_HEX }}
                    >
                      {item.step}
                    </span>
                  </div>

                  <h3
                    className={`text-${C_NAVY_DEEP} text-sm font-normal leading-5`}
                    style={{ fontFamily: "'DM Serif Display', serif" }}
                  >
                    {item.title}
                  </h3>
                  <p
                    className={`text-${C_BODY_TEXT} text-xs font-normal leading-[19.5px]`}
                  >
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════
          CTA SECTION
      ══════════════════════════════════════════════════════════ */}
        <div className="w-full py-10 bg-slate-950 inline-flex flex-col justify-start items-center gap-20">
          <div className="flex flex-col justify-start items-center gap-5">
            <div className="w-[672px] flex flex-col justify-start items-center">
              <div
                style={{ color: ORANGE }}
                className="text-center justify-center  text-xs font-semibold font-['Plus_Jakarta_Sans'] uppercase leading-4 tracking-[2.40px]"
              >
                Get Started Today
              </div>
            </div>
            <div className="w-2xl flex flex-col justify-start items-center">
              <div className="w-[602px] text-center justify-center">
                <span class="text-white text-4xl font-normal font-['DM_Serif_Display'] leading-10">
                  Give your CFO the data.
                  <br />
                </span>
                <span
                  style={{ color: ORANGE }}
                  className="italic text-4xl font-normal font-['DM_Serif_Display'] leading-10"
                >
                  Give your team the freedom.
                </span>
              </div>
            </div>
            <div className="w-96 max-w-96 flex flex-col justify-start items-center">
              <div className="self-stretch text-center justify-center text-white/50 text-base font-normal font-['Plus_Jakarta_Sans'] leading-6">
                Traveamer scales with your organization. Free 30-day trial. Full
                team onboarded in days.
              </div>
            </div>
            <div className="w-2xl inline-flex justify-center items-start gap-3">
              <div
                style={{ background: ORANGE }}
                className="h-11 px-8 relative  rounded-[10px] flex justify-center items-center"
              >
                <div className="w-40 h-11 left-0 top-0 absolute bg-white/0 rounded-[10px] shadow-[0px_4px_6px_-4px_rgba(201,162,64,0.20)] shadow-[0px_10px_15px_-3px_rgba(201,162,64,0.20)]" />
                <div className="text-center justify-center text-sky-950 text-sm font-semibold font-['Plus_Jakarta_Sans'] leading-5">
                  Start Free Trial
                </div>
              </div>
              <div className="h-11 px-8 rounded-[10px] outline-2 -outline-offset-2 outline-white/30 flex justify-center items-center">
                <div className="text-center justify-center text-white text-sm font-medium font-['Plus_Jakarta_Sans'] leading-5">
                  Book a Demo
                </div>
              </div>
            </div>
            <div className="w-[672px] inline-flex justify-center items-start gap-5 flex-wrap content-start">
              <div className="self-stretch pb-px flex justify-start items-center gap-1.5">
                <div className="w-3.5 h-3.5 relative overflow-hidden">
                  <IoIosCheckmark style={{ color: ORANGE }} />
                </div>
                <div className="text-center justify-center text-white/50 text-xs font-normal font-['Plus_Jakarta_Sans'] leading-4">
                  30-day free trial
                </div>
              </div>
              <div className="self-stretch pb-px flex justify-start items-center gap-1.5">
                <div className="w-3.5 h-3.5 relative overflow-hidden">
                  <IoIosCheckmark style={{ color: ORANGE }} />
                </div>
                <div className="text-center justify-center text-white/50 text-xs font-normal font-['Plus_Jakarta_Sans'] leading-4">
                  No credit card required
                </div>
              </div>
              <div className="self-stretch pb-px flex justify-start items-center gap-1.5">
                <div className="w-3.5 h-3.5 relative overflow-hidden">
                  <IoIosCheckmark style={{ color: ORANGE }} />
                </div>
                <div className="text-center justify-center text-white/50 text-xs font-normal font-['Plus_Jakarta_Sans'] leading-4">
                  Live in under 2 hours
                </div>
              </div>
              <div className="self-stretch pb-px flex justify-start items-center gap-1.5">
                <div className="w-3.5 h-3.5 relative overflow-hidden">
                  <IoIosCheckmark style={{ color: ORANGE }} />
                </div>
                <div className="text-center justify-center text-white/50 text-xs font-normal font-['Plus_Jakarta_Sans'] leading-4">
                  GST invoices from day one
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <LandingFooter />
    </>
  );
}
