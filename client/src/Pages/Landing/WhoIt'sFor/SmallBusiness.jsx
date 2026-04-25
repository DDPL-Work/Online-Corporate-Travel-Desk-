import {
  MdOutlineFlightTakeoff,
  MdOutlineHotel,
  MdOutlineAccountBalanceWallet,
  MdOutlineTag,
  MdOutlineHistory,
  MdOutlineApproval,
  MdOutlineWhatsapp,
  MdOutlineCreditCardOff,
  MdOutlineAnalytics,
  MdOutlinePeople,
  MdOutlineSettings,
  MdOutlineBarChart,
} from "react-icons/md";
import { HiCheck, HiArrowRight, HiOutlineSparkles } from "react-icons/hi";
import { BsBuildingsFill } from "react-icons/bs";
import LandingHeader from "../../../layout/LandingHeader";
import LandingFooter from "../../../layout/LandingFooter";

/* ─────────────── tokens ─────────────── */
const ORANGE = "#C9A84C";
const DARK = "#000D26";
const AZURE_DARK = "#0C4A6E";
const AZURE_MID = "#475569";

/* ─────────────────────────────────────────────
   HERO
───────────────────────────────────────────── */
function Hero() {
  return (
    <section className="relative bg-linear-to-l from-blue-900 to-slate-950 overflow-hidden min-h-[600px] xl:min-h-screen flex items-center">
      {/* ambient glows */}
      <div
        className="absolute -top-40 right-[-120px] w-[700px] h-[700px] rounded-full opacity-10 pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${ORANGE} 0%, transparent 65%)`,
        }}
      />
      <div
        className="absolute -bottom-20 left-[-60px] w-[450px] h-[450px] rounded-full opacity-10 pointer-events-none"
        style={{
          background: "radial-gradient(circle, #3B82F6 0%, transparent 65%)",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 py-16 md:py-20 lg:py-20 flex flex-col lg:grid lg:grid-cols-2 gap-12 lg:gap-16 items-center text-center lg:text-left">
        {/* LEFT – copy */}
        <div className="flex flex-col items-center lg:items-start gap-7">
          {/* pill */}
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 backdrop-blur-sm w-fit"
            style={{ background: "rgba(255,255,255,0.08)" }}
          >
            <span className="text-white/80 text-[10px] sm:text-xs font-normal">
              🏢&nbsp; Who It's For · Small Business · 10 to 50 People
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-normal leading-[1.1] text-white font-['DM_Serif_Display']">
            Get organized <br /> before it becomes <br />
            <span className="italic" style={{ color: ORANGE }}>
              chaos.
            </span>
          </h1>

          <div className="text-white/70 text-base sm:text-lg font-normal font-['Plus_Jakarta_Sans'] leading-relaxed max-w-[500px] mx-auto lg:mx-0">
            You have a small team. Travel is starting to happen. Someone is
            managing it on WhatsApp and it is already getting messy. Traveamer
            gives you structure before you need to untangle it later.
          </div>

         <div className="flex flex-col sm:flex-row gap-3 mt-1 justify-center lg:justify-start">
  <button
    className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-base font-semibold shadow-lg transition-all duration-200 hover:brightness-110 active:scale-95 text-center"
    style={{ background: ORANGE, color: AZURE_DARK }}
  >
    Start Free Trial
  </button>
  
  <button className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-base font-medium text-white border border-white/30 hover:border-white/60 transition-all duration-200 flex items-center justify-center gap-2">
    See How it Works <HiArrowRight />
  </button>
</div>

          {/* stats */}
          <div className="flex flex-wrap gap-8 sm:gap-10 pt-6 justify-center lg:justify-start">
            {[
              { val: "2hrs", label: "Setup time from zero" },
              { val: "1", label: "Travel Admin runs it all" },
              { val: "100%", label: "Every trip documented" },
            ].map((s) => (
              <div key={s.label} className="flex flex-col gap-1">
                <span
                  className="text-2xl sm:text-3xl font-normal font-['DM_Serif_Display'] leading-none"
                  style={{ color: ORANGE }}
                >
                  {s.val}
                </span>
                <span className="text-white/50 text-[10px] sm:text-xs uppercase tracking-wide">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT – travel request card */}
        <div className="bg-white rounded-2xl shadow-2xl p-5 sm:p-8 flex flex-col gap-5 w-full max-w-[500px] mx-auto lg:mx-0">
          {/* card header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <MdOutlineFlightTakeoff
                className="w-5 h-5 shrink-0"
                style={{ color: ORANGE }}
              />
              <span className="text-sky-950 text-base sm:text-lg font-normal font-['DM_Serif_Display'] leading-tight">
                Travel Request — Small Team
              </span>
            </div>
            <span
              className="px-3 py-1 rounded-full text-black text-[10px] font-bold whitespace-nowrap w-fit"
              style={{ background: ORANGE }}
            >
              PENDING APPROVAL
            </span>
          </div>

          {/* employee */}
          <div className="flex flex-col gap-2">
            <label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">
              Trip Details
            </label>
            <div className="px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-0.5">
              <span className="text-slate-950 text-sm font-semibold">Priya Shah</span>
              <span className="text-slate-500 text-[10px]">
                Sales Executive
              </span>
            </div>
          </div>

          {/* route + date */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Route", value: "Delhi → Jaipur" },
              { label: "Date", value: "26 April" },
            ].map((f) => (
              <div
                key={f.label}
                className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-0.5"
              >
                <span className="text-[10px] text-slate-500 uppercase tracking-wide font-bold">
                  {f.label}
                </span>
                <span className="text-slate-900 text-sm font-bold">
                  {f.value}
                </span>
              </div>
            ))}
          </div>

          {/* flight + hotel */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Flight", value: "IndiGo · ₹3,200" },
              { label: "Hotel", value: "₹4,500 / night" },
            ].map((f) => (
              <div
                key={f.label}
                className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-0.5"
              >
                <span className="text-[10px] text-slate-500 uppercase tracking-wide font-bold">
                  {f.label}
                </span>
                <span className="text-slate-900 text-sm font-bold">
                  {f.value}
                </span>
              </div>
            ))}
          </div>

          {/* project cost ID */}
          <div
            className="rounded-xl border p-4 flex flex-col gap-1"
            style={{ borderColor: ORANGE, background: `${ORANGE}0D` }}
          >
            <span
              className="text-[10px] font-bold uppercase tracking-wider"
              style={{ color: ORANGE }}
            >
              Project Cost ID
            </span>
            <span className="text-slate-900 text-sm font-semibold">
              Jaipur Client — Q2 Review
            </span>
          </div>

          {/* CTA */}
          <button
            className="w-full py-4 rounded-xl text-sm font-bold shadow-md transition-all hover:brightness-110 active:scale-95 mt-2"
            style={{ background: ORANGE, color: AZURE_DARK }}
          >
            SEARCH HOTELS
          </button>
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
    { bold: "Live in 2 hours", rest: "— zero IT required" },
    { bold: "One Travel Admin", rest: " manages everything" },
    { bold: "Every trip tagged ", rest: "to a project" },
    { bold: "Company wallet ", rest: "pays directly" },
  ];

  return (
    <div className="bg-slate-950 border-t border-white/10 py-8 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        {/* The wrapper that handles the animation on mobile and static grid on desktop */}
        <div className="flex w-max md:w-full md:justify-center items-center gap-x-12 animate-infinite-scroll md:animate-none">
          
          {/* First Set of Items */}
          <div className="flex items-center gap-x-12">
            {items.map((it, idx) => (
              <p key={`set1-${idx}`} className="text-white/80 text-sm flex items-center gap-1 whitespace-nowrap">
                <span className="font-bold">{it.bold}</span>
                <span className="font-normal opacity-60">{it.rest}</span>
              </p>
            ))}
          </div>

          {/* Second Identical Set (Visible only on mobile for the loop) */}
          <div className="flex md:hidden items-center gap-x-12">
            {items.map((it, idx) => (
              <p key={`set2-${idx}`} className="text-white/80 text-sm flex items-center gap-1 whitespace-nowrap">
                <span className="font-bold">{it.bold}</span>
                <span className="font-normal opacity-60">{it.rest}</span>
              </p>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   PAIN POINTS
───────────────────────────────────────────── */
function PainPoints() {
  const cards = [
    {
      icon: <MdOutlineWhatsapp size={24} />,
      title: "Travel happens on WhatsApp",
      body: "Employee messages the boss. Boss says yes. Someone books. Nobody documents. Month end — nobody knows what was spent or why.",
    },
    {
      icon: <MdOutlineCreditCardOff size={24} />,
      title: "Stop reimbursing from personal cards",
      body: "Employees pay from their own pockets and then chase reimbursements for weeks. It's slow, annoying, and error-prone.",
    },
    {
      icon: <MdOutlineAnalytics size={24} />,
      title: "No idea what travel costs",
      body: "The MD asks how much was spent on travel last quarter. Nobody has a clean answer. It takes 2 days to compile from scattered sources.",
    },
  ];

  return (
    <section className="bg-slate-50 py-20 px-6">
      <div className="max-w-7xl mx-auto flex flex-col gap-12 items-start">
        {/* header */}
        <div className="flex flex-col gap-6 items-start">
          <div
            style={{ background: ORANGE }}
            className="w-full lg:w-[519px] px-4 py-1 items-start justify-start rounded-sm mx-auto lg:mx-0"
          >
           
              Your Reality Right Now
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-normal leading-tight text-black font-['DM_Serif_Display']">
            You know this feeling <br />
            <span className="italic" style={{ color: ORANGE }}>
              too well.
            </span>
          </h2>
          <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto lg:mx-0">
            Small teams travel too. And without a system — even 10 people can create a lot of travel chaos.
          </p>
        </div>

        {/* cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {cards.map((c) => (
            <div
              key={c.title}
              className="bg-white rounded-2xl border border-slate-200 p-8 flex flex-col items-center lg:items-start gap-5 text-center lg:text-left hover:shadow-lg transition-all duration-300"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: `${ORANGE}18` }}
              >
                <span style={{ color: ORANGE }}>{c.icon}</span>
              </div>
              <h3 className="text-slate-950 text-xl font-normal font-['DM_Serif_Display']">
                {c.title}
              </h3>
              <p className="text-slate-600 text-base leading-relaxed">{c.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   FEATURES
───────────────────────────────────────────── */
function Features() {
  const features = [
    {
      icon: <MdOutlineFlightTakeoff size={20} />,
      title: "Flight & Hotel Inventory",
      body: "Employees search and book directly on Traveamer. Live inventory. Fast booking. No agent needed. PNR confirmed in seconds.",
    },
    {
      icon: <MdOutlineApproval size={20} />,
      title: "Simple Approval Flow",
      body: "Employee raises a request. Travel Admin approves in one click. Manager stays informed. Everything documented automatically.",
    },
    {
      icon: <MdOutlineTag size={20} />,
      title: "Project Cost ID",
      body: "Every trip is tagged to a project or client. At any time — see exactly what each project has cost you in travel. Ready for your CA.",
    },
    {
      icon: <MdOutlineAccountBalanceWallet size={20} />,
      title: "Company Travel Wallet",
      body: "Recharge once. Every booking deducts from the company wallet automatically. Clean, organised, and always tracked.",
    },
    {
      icon: <MdOutlineSettings size={20} />,
      title: "Policy Enforcement",
      body: "Set spending limits per role or department. The system auto-validates every request — no manual checking needed.",
    },
    {
      icon: <MdOutlineHistory size={20} />,
      title: "Full Audit Trail",
      body: "Every approval, every booking, every transaction — permanently documented. Your CA gets clean data. Your MD gets clear answers.",
    },
  ];

  return (
    <section className="bg-white py-20 px-6 border-t border-slate-100">
      <div className="max-w-7xl mx-auto flex flex-col gap-12 items-start">
        {/* header */}
        <div className="flex flex-col gap-6 items-start">
          <div
            style={{ background: ORANGE }}
            className="w-full lg:w-[519px] px-4 py-1 items-start justify-start rounded-sm mx-auto lg:mx-0"
          >
           
              What Traveamer Does For You
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-normal leading-tight text-black font-['DM_Serif_Display']">
            Everything you need. <br />
            <span className="italic" style={{ color: ORANGE }}>
              Nothing you don't.
            </span>
          </h2>
          <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto lg:mx-0">
            A small business needs a simple system — not enterprise software.
            Traveamer is designed to be up and running in 2 hours.
          </p>
        </div>

        {/* grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-slate-50 rounded-2xl border border-slate-200 p-8 flex flex-col items-center lg:items-start gap-4 text-center lg:text-left hover:shadow-md transition-all duration-300 group"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-200"
                style={{ background: "rgba(14,42,62,0.05)" }}
              >
                <span className="text-sky-950 group-hover:text-orange-500 transition-colors duration-200">
                  {f.icon}
                </span>
              </div>
              <h3 className="text-slate-950 text-xl font-normal font-['DM_Serif_Display']">
                {f.title}
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   STEPS (dark gradient)
───────────────────────────────────────────── */
function Steps() {
  const steps = [
    {
      n: "01",
      icon: <MdOutlinePeople size={28} />,
      title: "Connect your team",
      body: "Add your core staff in minutes. No IT department needed.",
    },
    {
      n: "02",
      icon: <MdOutlineSettings size={28} />,
      title: "Set the rules",
      body: "Tell the system what they can spend. Policies enforced automatically.",
    },
    {
      n: "03",
      icon: <MdOutlineBarChart size={28} />,
      title: "Track the growth",
      body: "Watch your travel data turn into business insights.",
    },
  ];

  return (
    <section className="relative bg-linear-to-l from-blue-900 to-slate-950 overflow-hidden py-24 px-6">
      {/* ghost text decoration */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none opacity-5">
        <span className="text-[120px] sm:text-[200px] font-bold text-white whitespace-nowrap font-['DM_Sans']">
          Step by Step
        </span>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto flex flex-col gap-16">
        {/* header */}
        <div className="flex flex-col gap-6 text-center lg:text-left items-center lg:items-start max-w-xl mx-auto lg:mx-0">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-normal leading-tight text-white font-['DM_Serif_Display']">
            From Startup to{" "}
            <span className="italic" style={{ color: ORANGE }}>
              Scale-up.
            </span>
          </h2>
          <p className="text-white/50 text-base sm:text-lg leading-relaxed">
            Three simple steps to professionalize your travel.
          </p>
        </div>

        {/* step cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-12 sm:gap-8 max-w-5xl mx-auto w-full">
          {steps.map((s) => (
            <div
              key={s.n}
              className="flex flex-col items-center text-center gap-6"
            >
              {/* icon box with badge */}
              <div className="relative">
                <div className="w-20 h-20 bg-white rounded-2xl flex justify-center items-center shadow-2xl">
                  <span className="text-slate-950">{s.icon}</span>
                </div>
                <div
                  className="absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-slate-950 shadow-lg"
                  style={{ background: ORANGE }}
                >
                  {s.n}
                </div>
              </div>

              <h3
                className="text-2xl font-normal font-['DM_Serif_Display']"
                style={{ color: ORANGE }}
              >
                {s.title}
              </h3>
              <p className="text-white/80 text-sm sm:text-base leading-relaxed">{s.body}</p>
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
  const perks = ["Set up in 5 minutes", "No hidden fees", "Cancel anytime"];

  return (
    <section
      className="py-20 px-6 flex flex-col items-center text-center"
      style={{ background: DARK }}
    >
      <span
        className="text-xs font-semibold tracking-[0.2em] uppercase mb-6"
        style={{ color: ORANGE }}
      >
        Get Started Today
      </span>

      <h2 className="text-2xl sm:text-4xl lg:text-5xl font-normal font-['DM_Serif_Display'] text-white leading-tight max-w-3xl">
        Make your business <br />
        <span style={{ color: ORANGE }} className="italic text-3xl sm:text-4xl lg:text-5xl">travel professional today.</span>
      </h2>

      <p className="text-white/50 text-base sm:text-lg leading-relaxed max-w-2xl mt-6">
        Join hundreds of Indian MSMEs who replaced travel chaos with Traveamer. Free 30-day trial. No credit card needed.
      </p>

      <div className="flex flex-wrap justify-center gap-4 mt-10">
        <button
          className="h-12 px-8 rounded-xl text-sm font-bold shadow-lg transition-all hover:brightness-110 active:scale-95"
          style={{ background: ORANGE, color: AZURE_DARK }}
        >
          START FREE TRIAL
        </button>
        <button className="h-12 px-10 rounded-xl text-sm font-semibold text-white border-2 border-white/20 hover:border-white/40 transition-all">
          BOOK A DEMO
        </button>
      </div>

      <div className="mt-10 flex flex-wrap justify-center gap-x-10 gap-y-3">
        {perks.map((p) => (
          <div key={p} className="flex items-center gap-2">
            <HiCheck className="w-5 h-5 shrink-0" style={{ color: ORANGE }} />
            <span className="text-white/60 text-sm font-medium">{p}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   ROOT
───────────────────────────────────────────── */
export default function SmallBusiness() {
  return (
    <div className="w-full font-['Plus_Jakarta_Sans']">
      <LandingHeader />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=DM+Sans:wght@700&display=swap');
      `}</style>
      <Hero />
      <InfoBar />
      <PainPoints />
      <Features />
      <Steps />
      <CTA />
      <LandingFooter />
    </div>
  );
}
