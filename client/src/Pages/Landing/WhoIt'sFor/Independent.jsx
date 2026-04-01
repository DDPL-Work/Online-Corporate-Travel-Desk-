import {
  FiAward,
  FiBriefcase,
  FiCalendar,
  FiCheck,
  FiCreditCard,
  FiFileText,
  FiHeart,
  FiMapPin,
  FiSearch,
  FiTag,
  FiTrendingUp,
  FiUser,
} from "react-icons/fi";
import { PiScalesBold } from "react-icons/pi";
import { TbRuler2 } from "react-icons/tb";
import LandingFooter from "../../../layout/LandingFooter";
import LandingHeader from "../../../layout/LandingHeader";

/* ─────────────────────────────────────────────
   DATA
───────────────────────────────────────────── */

const featuresHero = [
  { title: "Work Alone", sub: "no approval needed" },
  { title: "Tag every trip", sub: "to the right client" },
  { title: "Book flights & hotels", sub: "in one place" },
  { title: "Client cost report", sub: "always ready" },
];

const personas = [
  {
    icon: <FiBriefcase size={22} className="text-[#000D26]" />,
    title: "CA & Accountants",
    desc: "Client audits, tax visits, & meeting your practice clients. Every trip tagged to the right client engagement.",
  },
  {
    icon: <FiHeart size={22} className="text-[#FF2424]" />,
    title: "Wedding Planners",
    desc: "Venue recces, vendor meetings, destination wedding travel. Know exactly what each wedding costs you in travel.",
  },
  {
    icon: <TbRuler2 size={22} className="text-[#3C83F6]" />,
    title: "Architects & Designers",
    desc: "Site visits, client meetings, material sourcing trips. Every project's travel cost tracked and documented.",
  },
  {
    icon: <FiTrendingUp size={22} className="text-[#FE92D6]" />,
    title: "Consultants",
    desc: "Client offices, project sites, strategy sessions. Bill your travel accurately — because every visit is on record.",
  },
  {
    icon: <PiScalesBold size={22} className="text-[#C9A84C]" />,
    title: "Legal Professionals",
    desc: "Court visits, client meetings, arbitrations across cities. Travel costs per client — always documented.",
  },
  {
    icon: <FiCalendar size={22} className="text-[#D97706]" />,
    title: "Event Managers",
    desc: "Venue visits, vendor coordination, event execution. Know how much each event costs you before the invoice goes out.",
  },
];

const features = [
  {
    icon: <FiMapPin size={16} className="text-black" />,
    title: "Book flights & hotels fast",
    desc: "Search live inventory and book directly on Traveamer. No travel agent. No waiting. Flights, hotels, conferences, under 60 seconds — from anywhere, on any device.",
  },
  {
    icon: <FiTag size={16} className="text-black" />,
    title: "Tag every trip to a client",
    desc: "Every booking is tagged with the client or project you want it tied to. At any time — you can trace exactly how much travel has gone into each client relationship. Useful for billing. Essential for you.",
  },
  {
    icon: <FiCreditCard size={16} className="text-black" />,
    title: "One dedicated travel wallet",
    desc: "Keep your business travel completely separate from personal expenses. Recharge your Traveamer wallet and every booking deducts from it. Clean records. No mixing of accounts.",
  },
];

const clientData = [
  {
    name: "Reliance Industries",
    detail: "Flights, 2 cab rides",
    amount: "₹8,400",
    color: "#C9A84C",
  },
  {
    name: "Tata Steel",
    detail: "Hotel, cab rides",
    amount: "₹12,200",
    color: "#003399",
  },
  {
    name: "Mahindra Group",
    detail: "3 cabs, Meetings",
    amount: "₹5,600",
    color: "#C9A84C",
  },
  {
    name: "Sun Pharma",
    detail: "Flights, Conference",
    amount: "₹4,200",
    color: "#003399",
  },
];

const steps = [
  {
    num: 1,
    icon: <FiSearch size={20} className="text-[#003399]" />,
    title: "Sign up & set up clients",
    desc: "Create your account. Add your clients or projects. Takes 3 minutes, done once.",
  },
  {
    num: 2,
    icon: <FiTag size={20} className="text-[#003399]" />,
    title: "Search & book directly",
    desc: "Search flights and hotels on Traveamer. Pick your option, click and book. No agent needed.",
  },
  {
    num: 3,
    icon: <FiUser size={20} className="text-[#003399]" />,
    title: "Tag to your client",
    desc: "Select which client this trip is for. One tag, this cost is now tracked against that client automatically.",
  },
  {
    num: 4,
    icon: <FiFileText size={20} className="text-[#003399]" />,
    title: "See your client report",
    desc: "At any time — see exactly how much travel each client has cost you. Ready for billing, tax, or your own clarity.",
  },
];

const perks = [
  "Free to start",
  "No approval workflow",
  "Set up in 5 minutes",
  "Every trip tagged to a client",
];

/* ─────────────────────────────────────────────
   BOOKING CARD
───────────────────────────────────────────── */
const BookingCard = () => (
  <div className="w-[573px] h-[498px] relative bg-white rounded-[20px] shadow-[0px_8px_10px_0px_rgba(0,0,0,0.25)] overflow-hidden">
    {/* ── Header ── */}
    <div className="w-[573px] h-14 px-5 left-0 top-0 absolute bg-slate-950/95 inline-flex justify-between items-center">
      <div className="flex justify-start items-start gap-4">
        <span className="text-white text-sm font-semibold font-['DM_Sans'] leading-5">
          My Travel
        </span>
        <span className="text-white text-sm font-semibold font-['DM_Sans'] leading-5">
          April 2026
        </span>
      </div>
      <div className="px-3 py-1 bg-amber-400/10 rounded-full">
        <span className="text-[#FBBD23] text-xs font-normal font-['Plus_Jakarta_Sans'] leading-4">
          Personal Dashboard
        </span>
      </div>
    </div>

    {/* ── Filter Pills ── */}
    <div className="w-[553px] pl-5 left-0 top-[82px] absolute inline-flex justify-start items-start gap-6">
      {/* CA */}
      <div className="px-3 py-1.5 rounded-xl outline -outline-offset-1 outline-[#C9A84C] flex justify-start items-center gap-1.5">
        <FiBriefcase size={14} className="text-slate-900" />
        <span className="text-slate-900 text-xs font-medium font-['Plus_Jakarta_Sans'] leading-4">
          CA
        </span>
      </div>
      {/* Wedding Planner */}
      <div className="px-3 py-1.5 rounded-xl outline -outline-offset-1 outline-[#C9A84C] flex justify-start items-center gap-1.5">
        <FiCalendar size={14} className="text-slate-900" />
        <span className="text-slate-900 text-xs font-normal font-['Plus_Jakarta_Sans'] leading-4">
          Wedding Planner
        </span>
      </div>
      {/* Consultant */}
      <div className="px-3 py-1.5 rounded-xl outline -outline-offset-1 outline-[#C9A84C] flex justify-start items-center gap-1.5">
        <FiTrendingUp size={14} className="text-slate-900" />
        <span className="text-slate-900 text-xs font-normal font-['Plus_Jakarta_Sans'] leading-4">
          Consultant
        </span>
      </div>
      {/* Event Coordinator */}
      <div className="px-3 py-1.5 rounded-xl outline -outline-offset-1 outline-[#C9A84C] flex justify-start items-center gap-1.5">
        <FiAward size={14} className="text-slate-900" />
        <span className="text-slate-900 text-xs font-normal font-['Plus_Jakarta_Sans'] leading-4">
          Event Coordinator
        </span>
      </div>
    </div>

    {/* ── How is it billed + Fields ── */}
    <div className="w-[533px] left-5 top-[142px] absolute inline-flex flex-col justify-start items-start gap-3">
      {/* Label */}
      <div className="self-stretch">
        <span className="text-slate-900 text-xs font-normal font-['Plus_Jakarta_Sans'] uppercase leading-4 tracking-wide">
          How is it billed
        </span>
      </div>

      {/* FROM / TO / DATE / COST — all stacked full width */}
      <div className="self-stretch space-y-3">
        <div className="flex items-center justify-center gap-3">
          <div className="self-stretch w-[260.5px] h-[61px] px-4 py-3 bg-slate-900/5 rounded-2xl inline-flex flex-col justify-start items-start gap-0.5">
            <div className="self-stretch flex flex-col justify-start items-start">
              <div className="self-stretch justify-center text-slate-900/40 text-[10px] font-normal font-['Plus_Jakarta_Sans'] uppercase leading-4 tracking-wide">
                From
              </div>
            </div>
            <div className="self-stretch flex flex-col justify-start items-start">
              <div className="self-stretch justify-center text-slate-900 text-sm font-medium font-['Plus_Jakarta_Sans'] leading-5">
                Mumbai
              </div>
            </div>
          </div>
          <div className="self-stretch w-[260.5px] h-[61px] px-4 py-3 bg-slate-900/5 rounded-2xl inline-flex flex-col justify-start items-start gap-0.5">
            <div className="self-stretch flex flex-col justify-start items-start">
              <div className="self-stretch justify-center text-slate-900/40 text-[10px] font-normal font-['Plus_Jakarta_Sans'] uppercase leading-4 tracking-wide">
                To
              </div>
            </div>
            <div className="self-stretch flex flex-col justify-start items-start">
              <div className="self-stretch justify-center text-slate-900 text-sm font-medium font-['Plus_Jakarta_Sans'] leading-5">
                Pune
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-3">
          <div className="self-stretch w-[260.5px] h-[61px] px-4 py-3 bg-slate-900/5 rounded-2xl inline-flex flex-col justify-start items-start gap-0.5">
            <div className="self-stretch flex flex-col justify-start items-start">
              <div className="self-stretch justify-center text-slate-900/40 text-[10px] font-normal font-['Plus_Jakarta_Sans'] uppercase leading-4 tracking-wide">
                Date
              </div>
            </div>
            <div className="self-stretch flex flex-col justify-start items-start">
              <div className="self-stretch justify-center text-slate-900 text-sm font-medium font-['Plus_Jakarta_Sans'] leading-5">
                24 April
              </div>
            </div>
          </div>
          <div className="self-stretch w-[260.5px] h-[61px] px-4 py-3 bg-slate-900/5 rounded-2xl inline-flex flex-col justify-start items-start gap-0.5">
            <div className="self-stretch flex flex-col justify-start items-start">
              <div className="self-stretch justify-center text-slate-900/40 text-[10px] font-normal font-['Plus_Jakarta_Sans'] uppercase leading-4 tracking-wide">
                Cost
              </div>
            </div>
            <div className="self-stretch flex flex-col justify-start items-start">
              <div className="self-stretch justify-center text-slate-900 text-sm font-medium font-['Plus_Jakarta_Sans'] leading-5">
                ₹2,800
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* ── Tag to Client ── */}
    <div className="w-[534px] left-5 top-[337px] absolute inline-flex flex-col justify-start items-start gap-2">
      <span className="text-slate-950 text-xs font-bold font-['Plus_Jakarta_Sans'] uppercase leading-4 tracking-wide">
        Tag to Client
      </span>
      <div className="self-stretch px-4 py-3 bg-orange-400/10 rounded-2xl inline-flex justify-start items-center gap-2">
        <FiTag size={14} className="text-black" />
        <span className="text-slate-900 text-sm font-medium font-['Plus_Jakarta_Sans'] leading-5">
          Reliance Industries — FY26 Audit
        </span>
      </div>
    </div>

    {/* ── CTA Button ── */}
    <div className="w-[533px] py-3 left-5 top-[428px] absolute bg-[#C9A84C] rounded-2xl inline-flex justify-center items-center cursor-pointer hover:bg-orange-400 transition-all">
      <span className="text-slate-900 text-sm font-semibold font-['Plus_Jakarta_Sans'] leading-5">
        ✦ Book &amp; Tag to Client
      </span>
    </div>
  </div>
);

/* ─────────────────────────────────────────────
   PAGE
───────────────────────────────────────────── */
export default function Independent() {
  return (
    <div className="min-h-screen flex flex-col font-sans">
      <LandingHeader />
      <main className="flex-1">
        {/* ── HERO ── */}
        <section className="w-full bg-linear-to-bl from-[#003399] to-[#000D26] overflow-hidden">
          <div className="max-w-[1200px] mx-auto px-8 pt-16 pb-20 flex flex-col lg:flex-row items-start justify-between gap-16">
            {/* Left Content */}
            <div className="flex-1 max-w-[540px]">
              {/* "Who it's For · Independent Professionals"
                  text-orange-400 text-xs font-semibold font-['Plus_Jakarta_Sans'] uppercase leading-4 tracking-widest */}
              <p className="text-[#C9A84C] text-xs font-semibold font-['Plus_Jakarta_Sans'] uppercase leading-4 tracking-widest mb-6">
                Who it's For · Independent Professionals
              </p>

              {/* "You travel for your clients."
                  text-white text-6xl font-normal font-['DM_Serif_Display'] leading-[60px] */}
              <h1 className="text-white text-6xl font-normal font-['DM_Serif_Display'] leading-[60px] mb-0">
                You travel
                <br />
                for your clients.
              </h1>

              {/* "Track it."
                  text-orange-400 text-6xl font-normal font-['DM_Serif_Display'] leading-[60px]
                  Note: DM Serif Display is inherently italic in its display weight */}
              <h2 className="text-[#C9A84C] text-6xl font-normal font-['DM_Serif_Display'] leading-[60px] italic mb-8">
                Track it.
              </h2>

              {/* Body text
                  text-gray-400 text-base font-normal font-['Plus_Jakarta_Sans'] leading-6 */}
              <p className="text-gray-400 text-base font-normal font-['Plus_Jakarta_Sans'] leading-6 mb-10 max-w-[390px]">
                Whether you're a CA, wedding planner, architect, or consultant —
                every client visit deserves to be documented. Book fast, tag to
                your client, and always know what each relationship costs you.
              </p>

              {/* Buttons */}
              <div className="flex flex-wrap gap-3 mb-12">
                {/* "Get Started Free" — text-slate-900 text-sm font-semibold font-['Plus_Jakarta_Sans'] leading-5 */}
                <button className="px-6 py-3 bg-[#C9A84C] text-slate-900 text-sm font-semibold font-['Plus_Jakarta_Sans'] leading-5 rounded-[10px] shadow-[0px_4px_16px_rgba(251,189,35,0.30)] hover:bg-orange-500 transition-colors">
                  Get Started Free
                </button>
                {/* "See How it Works →" — text-white text-sm font-medium font-['Plus_Jakarta_Sans'] leading-5 */}
                <button className="px-6 py-3 text-white text-sm font-medium font-['Plus_Jakarta_Sans'] leading-5 rounded-[10px] border border-white/25 hover:bg-white/10 transition-colors">
                  See How it Works →
                </button>
              </div>

              {/* Stats */}
              <div className="flex gap-10">
                {[
                  { stat: "60s", desc: "Route any\nflight in time" },
                  { stat: "1", desc: "Click client\ncost report" },
                  { stat: "0", desc: "Approvals\nalways needed" },
                ].map(({ stat, desc }) => (
                  <div key={stat} className="flex flex-col gap-1">
                    {/* stat — text-white text-3xl font-bold font-['DM_Sans'] leading-9 */}
                    <span className="text-white text-3xl font-bold font-['DM_Sans'] leading-9">
                      {stat}
                    </span>
                    {/* desc — text-gray-400 text-xs font-normal font-['Plus_Jakarta_Sans'] leading-4 */}
                    <span className="text-gray-400 text-xs font-normal font-['Plus_Jakarta_Sans'] leading-4 whitespace-pre-line">
                      {desc}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Booking Card */}
            <div className="w-full lg:w-auto flex justify-center lg:justify-end mt-8 lg:mt-0">
              <BookingCard />
            </div>
          </div>
        </section>

        {/* ── FEATURE BANNER ── */}
        <div className="w-full bg-slate-950 py-6">
          <div className="w-[1545px] mx-auto px-[98px] grid grid-cols-2 md:grid-cols-4 gap-[121px] ">
            {featuresHero.map(({ title, sub }) => (
              <div
                key={title}
                className="flex flex-col items-center text-center gap-2.5"
              >
                {/* title — text-white text-lg font-normal font-['DM_Serif_Display'] leading-8 */}
                <span className="self-stretch h-6 text-center justify-center text-white text-lg font-normal font-['DM_Serif_Display'] leading-8">
                  {title}
                </span>
                {/* sub — text-white text-base font-light font-['Plus_Jakarta_Sans'] leading-5 */}
                <span className="self-stretch text-center justify-center text-white text-base font-light font-['Plus_Jakarta_Sans'] leading-5">
                  {sub}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── WHO THIS IS FOR ── */}
        <section className="w-full bg-slate-50 py-20 overflow-hidden">
          <div className="max-w-[1340px] mx-auto px-8">
            {/* Heading */}
            <div className="mb-12">
              {/* Label — text-black text-xs font-semibold font-['Plus_Jakarta_Sans'] uppercase leading-4 tracking-widest */}
              <div className="inline-block px-[5px] w-[519px] py-0.5 bg-[#C9A84C] mb-5">
                <span className="text-black text-xs font-semibold font-['Plus_Jakarta_Sans'] uppercase leading-4 tracking-widest">
                  —— Who this is for
                </span>
              </div>

              {/* "Built for professionals who work independently."
                  "Built for" + "professionals" = text-black text-5xl font-normal font-['DM_Serif_Display'] leading-[50px]
                  "who work independently." = text-blue-900 text-5xl font-normal font-['DM_Serif_Display'] leading-[50px] */}
              <h2 className="text-black text-5xl font-normal font-['DM_Serif_Display'] leading-[50px] mb-4">
                <span className="italic">Built for </span>
                <span className="not-italic">professionals</span>
                <br />
                <span className="text-blue-900 italic">
                  who work independently.
                </span>
              </h2>

              {/* Subtitle — text-stone-500 text-base font-normal font-['Plus_Jakarta_Sans'] leading-5 */}
              <p className="text-stone-500 text-base font-normal font-['Plus_Jakarta_Sans'] leading-5 max-w-md">
                If you travel to clients — not for a company — Traveamer is
                designed for you. Fit
                <br />
                10 people. No complexity. Just organised.
              </p>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {personas.map(({ icon, title, desc }) => (
                <div
                  key={title}
                  className="bg-white rounded-2xl shadow-[0px_2px_11px_rgba(4,13,22,0.20)] border border-orange-400/60 p-7 flex flex-col gap-3 hover:shadow-[0px_4px_16px_rgba(4,13,22,0.12)] transition-shadow"
                >
                  <div className="w-9 h-9 flex items-center justify-center">
                    {icon}
                  </div>
                  {/* title — text-black text-base font-normal font-['DM_Serif_Display'] leading-5 */}
                  <h3 className="text-black text-base font-normal font-['DM_Serif_Display'] leading-5">
                    {title}
                  </h3>
                  {/* desc — text-stone-500 text-xs font-normal font-['Plus_Jakarta_Sans'] leading-5 */}
                  <p className="text-stone-500 text-xs font-normal font-['Plus_Jakarta_Sans'] leading-5">
                    {desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── WHAT TRAVEAMER DOES ── */}
        <section className="w-full bg-slate-50 py-20">
          <div className="max-w-[1340px] mx-auto px-8 flex flex-col lg:flex-row gap-16 items-start justify-between">
            {/* Left */}
            <div className="flex-1 max-w-[600px]">
              {/* Label */}
              <div className="inline-block px-[5px] w-[519px] py-0.5 bg-[#C9A84C] mb-4">
                <span className="text-black  text-xs font-semibold font-['Plus_Jakarta_Sans'] uppercase leading-4 tracking-widest">
                  —— What traveamer does for you
                </span>
              </div>

              {/* "Three things. Nothing more."
                  "Three things." = text-black text-5xl font-normal font-['DM_Serif_Display'] leading-[50px]
                  "Nothing more." = text-blue-900 text-5xl font-normal font-['DM_Serif_Display'] leading-[50px] */}
              <h2 className="text-5xl font-normal font-['DM_Serif_Display'] leading-[50px] mb-3">
                <span className="text-black">Three things.</span>
                <br />
                <span className="text-blue-900 italic">Nothing more.</span>
              </h2>

              {/* Subtitle — text-stone-500 text-sm font-normal font-['Plus_Jakarta_Sans'] leading-5 */}
              <p className="text-stone-500 text-sm font-normal font-['Plus_Jakarta_Sans'] leading-5 mb-10 max-w-lg">
                No complexity. No approval workflows. No admin features you'll
                never use.
                <br />
                Just the three things an independent professional actually
                needs.
              </p>

              <div className="flex flex-col gap-8">
                {features.map(({ icon, title, desc }) => (
                  <div key={title} className="flex gap-4 items-start">
                    <div className="w-9 h-9 min-w-9 bg-[#C9A84C] rounded-xl flex justify-center items-center">
                      {icon}
                    </div>
                    <div>
                      {/* feature title — text-slate-950 text-base font-normal font-['DM_Serif_Display'] leading-5 */}
                      <h3 className="text-slate-950 text-base font-normal font-['DM_Serif_Display'] leading-5 mb-1">
                        {title}
                      </h3>
                      {/* feature desc — text-stone-500 text-xs font-normal font-['Plus_Jakarta_Sans'] leading-5 */}
                      <p className="text-stone-500 text-xs font-normal font-['Plus_Jakarta_Sans'] leading-5">
                        {desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Client Spend Card */}
            <div className="w-full lg:w-[580px] bg-white rounded-2xl shadow-[0px_5px_12px_rgba(4,13,22,0.20)] border border-stone-300/10 p-6 flex flex-col gap-5">
              <div className="flex justify-between items-center">
                <div>
                  {/* "Client Travel Spend — April 2024"
                      text-slate-950 text-sm font-bold font-['Plus_Jakarta_Sans'] leading-5 */}
                  <p className="text-slate-950 text-sm font-bold font-['Plus_Jakarta_Sans'] leading-5">
                    Client Travel Spend — April 2024
                  </p>
                  {/* "4 clients · 8 trips · This month"
                      text-stone-500 text-xs font-normal font-['Plus_Jakarta_Sans'] leading-4 */}
                  <p className="text-stone-500 text-xs font-normal font-['Plus_Jakarta_Sans'] leading-4 mt-0.5">
                    4 clients · 8 trips · This month
                  </p>
                </div>
                {/* "⬡ Full Report" — text-orange-400 text-[10px] font-normal font-['Plus_Jakarta_Sans'] leading-4 */}
                <button className="px-2.5 py-1 rounded-full border border-orange-400/20 text-[#C9A84C] text-[10px] font-normal font-['Plus_Jakarta_Sans'] leading-4 hover:bg-orange-400/5 transition-colors">
                  ⬡ Full Report
                </button>
              </div>

              <div className="flex flex-col">
                {clientData.map(({ name, detail, amount, color }, idx) => (
                  <div
                    key={name}
                    className={`flex justify-between items-center py-3.5 ${
                      idx < clientData.length - 1
                        ? "border-b border-gray-700/50"
                        : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <div className="pb-0.5">
                        {/* client name — text-slate-950 text-sm font-semibold font-['Plus_Jakarta_Sans'] leading-5 */}
                        <p className="text-slate-950 text-sm font-semibold font-['Plus_Jakarta_Sans'] leading-5">
                          {name}
                        </p>
                        {/* client detail — text-stone-500 text-xs font-normal font-['Plus_Jakarta_Sans'] leading-4 */}
                        <p className="text-stone-500 text-xs font-normal font-['Plus_Jakarta_Sans'] leading-4">
                          {detail}
                        </p>
                      </div>
                    </div>
                    {/* amount — text-blue-900 text-sm font-semibold font-['DM_Sans'] leading-5 */}
                    <span className="text-blue-900 text-sm font-semibold font-['DM_Sans'] leading-5">
                      {amount}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-gray-700/50">
                {/* "Total This Month" — text-stone-500 text-xs font-medium font-['Plus_Jakarta_Sans'] leading-4 */}
                <span className="text-stone-500 text-xs font-medium font-['Plus_Jakarta_Sans'] leading-4">
                  Total This Month
                </span>
                {/* "₹43,400" — text-orange-400 text-base font-bold font-['DM_Sans'] leading-6 */}
                <span className="text-[#C9A84C] text-base font-bold font-['DM_Sans'] leading-6">
                  ₹43,400
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section className="w-full bg-slate-50 py-20">
          <div className="max-w-[1340px] mx-auto px-8">
            <div className="mb-14">
              {/* Label */}
              <div className="inline-block px-[5px] w-[519px] py-0.5 bg-[#C9A84C] mb-4">
                <span className="text-black text-xs font-semibold font-['Plus_Jakarta_Sans'] uppercase leading-4 tracking-widest">
                  —— How it works
                </span>
              </div>

              {/* "Search. Book. Tag. Done."
                  "Search. Book. Tag." = text-black text-5xl font-bold font-['DM_Sans'] leading-[50px]
                  "Done." = text-blue-900 text-5xl font-bold font-['DM_Sans'] leading-[50px] — italic per screenshot */}
              <h2 className="text-5xl font-bold font-['DM_Sans'] leading-[50px] mb-3">
                <span className="text-black font-bold">Search. Book. Tag.</span>
                <br />
                <span className="text-blue-900 italic">Done.</span>
              </h2>

              {/* Subtitle — text-stone-500 text-sm font-normal font-['Plus_Jakarta_Sans'] leading-5 */}
              <p className="text-stone-500 text-sm font-normal font-['Plus_Jakarta_Sans'] leading-5 max-w-md">
                Four steps. No approval. No waiting. Just you and your next
                client visit — organised.
              </p>
            </div>

            <div className="relative">
              {/* Connector line */}
              <div className="hidden lg:block absolute top-10 left-[10%] right-[10%] h-0.5 bg-linear-to-r from-blue-500 via-blue-500 to-blue-500/60 z-0" />

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 relative z-10">
                {steps.map(({ num, icon, title, desc }) => (
                  <div
                    key={num}
                    className="flex flex-col items-center text-center"
                  >
                    <div className="relative mb-6">
                      <div className="w-20 h-20 bg-white rounded-full shadow-[0px_0px_40px_rgba(60,131,246,0.15)] border-2 border-blue-900 flex justify-center items-center">
                        {icon}
                      </div>
                      <div className="absolute -top-2 -right-2 w-7 h-7 bg-blue-900 rounded-full flex justify-center items-center">
                        {/* step number — text-white text-xs font-bold font-['Inter'] leading-4 */}
                        <span className="text-white text-xs font-bold font-['Inter'] leading-4">
                          {num}
                        </span>
                      </div>
                    </div>
                    {/* step title — text-slate-950 text-xl font-normal font-['DM_Serif_Display'] leading-7 */}
                    <h3 className="text-slate-950 text-xl font-normal font-['DM_Serif_Display'] leading-7 mb-2">
                      {title}
                    </h3>
                    {/* step desc — text-stone-500 text-sm font-normal font-['Plus_Jakarta_Sans'] leading-6 */}
                    <p className="text-stone-500 text-sm font-normal font-['Plus_Jakarta_Sans'] leading-6 max-w-[200px]">
                      {desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="w-full bg-slate-950 py-20 overflow-hidden">
          <div className="max-w-[1400px] mx-auto px-8 flex flex-col items-center text-center gap-6">
            {/* "Your next client visit deserves better tracking."
                "Your next client visit" = text-white text-5xl font-normal font-['DM_Serif_Display'] leading-[48px]
                "deserves better tracking." = text-orange-400 text-5xl font-normal font-['DM_Serif_Display'] leading-[48px] */}
            <h2 className="text-5xl font-normal font-['DM_Serif_Display'] leading-12 max-w-2xl">
              <span className="text-white">Your next client visit</span>
              <br />
              <span className="text-[#C9A84C] italic">
                deserves better tracking.
              </span>
            </h2>

            {/* Subtitle — text-gray-400 text-sm font-normal font-['Plus_Jakarta_Sans'] leading-5 */}
            <p className="text-gray-400 text-sm font-normal font-['Plus_Jakarta_Sans'] leading-5 max-w-sm pb-4">
              Free to get started. No credit card. No complexity. Just organised
              travel — built for the way you work.
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              {/* "Get Started Free" — text-slate-900 text-sm font-semibold font-['Plus_Jakarta_Sans'] leading-5 */}
              <button className="px-8 py-3.5 bg-[#C9A84C] text-slate-900 text-sm font-semibold font-['Plus_Jakarta_Sans'] leading-5 rounded-2xl hover:bg-orange-400 transition-colors">
                Get Started Free
              </button>
              {/* "Book a Demo ↗" — text-white text-sm font-medium font-['Plus_Jakarta_Sans'] leading-5 */}
              <button className="px-8 py-3.5 text-white text-sm font-medium font-['Plus_Jakarta_Sans'] leading-5 rounded-2xl border border-white/25 hover:bg-white/10 transition-colors">
                Book a Demo ↗
              </button>
            </div>

            <div className="flex flex-wrap justify-center gap-6 mt-2">
              {perks.map((perk) => (
                <div key={perk} className="flex items-center gap-1.5">
                  {/* checkmark icon — color orange-400 per Figma */}
                  <FiCheck
                    size={12}
                    className="text-[#C9A84C]"
                    strokeWidth={2.5}
                  />
                  {/* perk text — text-gray-400 text-xs font-normal font-['Plus_Jakarta_Sans'] leading-4 */}
                  <span className="text-gray-400 text-xs font-normal font-['Plus_Jakarta_Sans'] leading-4">
                    {perk}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
