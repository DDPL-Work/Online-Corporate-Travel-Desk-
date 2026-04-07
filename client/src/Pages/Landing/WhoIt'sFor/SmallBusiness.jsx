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
const AZURE_DARK = "#0C4A6E"; // sky-950
const AZURE_MID = "#475569"; // slate-600 approx

/* ─────────────────────────────────────────────
   HERO
───────────────────────────────────────────── */
function Hero() {
  return (
    <section className="relative bg-gradient-to-l from-blue-900 to-slate-950 overflow-hidden min-h-screen">
      {/* ambient glows */}
      <div
        className="absolute top-[-160px] right-[-120px] w-[700px] h-[700px] rounded-full opacity-10 pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${ORANGE} 0%, transparent 65%)`,
        }}
      />
      <div
        className="absolute bottom-[-80px] left-[-60px] w-[450px] h-[450px] rounded-full opacity-10 pointer-events-none"
        style={{
          background: "radial-gradient(circle, #3B82F6 0%, transparent 65%)",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 py-20 lg:py-28 grid lg:grid-cols-2 gap-16 items-center">
        {/* LEFT – copy */}
        <div className="flex flex-col gap-7 lg:pt-8">
          {/* pill */}
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 backdrop-blur-sm w-fit"
            style={{ background: "rgba(255,255,255,0.08)" }}
          >
            <span className="text-white/80 text-xs font-normal">
              🏢&nbsp; Who It's For · Small Business · 10 to 50 People
            </span>
          </div>

          <h1 className="text-5xl sm:text-6xl font-normal leading-[1.05] text-white font-['DM_Serif_Display']">
            Get organized <br /> before it becomes <br />
            <span className="italic" style={{ color: ORANGE }}>
              chaos.
            </span>
          </h1>

          <div className="self-stretch justify-center text-white/70 text-lg font-normal font-['Plus_Jakarta_Sans'] leading-7">
            You have a small team. Travel is starting to happen. Someone is
            managing it on WhatsApp and it is already getting messy. Traveamer
            gives you structure before you need to untangle it <br /> later.
          </div>

          <div className="flex flex-wrap gap-3 mt-1">
            <button
              className="px-7 py-3.5 rounded-xl text-base font-semibold shadow-lg transition-all duration-200 hover:brightness-110 active:scale-95"
              style={{ background: ORANGE, color: AZURE_DARK }}
            >
              Start Free Trial
            </button>
            <button className="px-7 py-3.5 rounded-xl text-base font-medium text-white border border-white/30 hover:border-white/60 transition-all duration-200 flex items-center gap-2">
              See How it Works <HiArrowRight />
            </button>
          </div>

          {/* stats */}
          <div className="flex gap-10 pt-6 ">
            {[
              { val: "2hrs", label: "Setup time from zero" },
              { val: "1", label: "Travel Admin runs it all" },
              { val: "100%", label: "Every trip documented" },
            ].map((s) => (
              <div key={s.label} className="flex flex-col gap-1">
                <span
                  className="text-2xl font-normal font-['DM_Serif_Display'] leading-8"
                  style={{ color: ORANGE }}
                >
                  {s.val}
                </span>
                <span className="text-white/50 text-sm leading-5">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT – travel request card */}
        <div className="bg-white rounded-2xl shadow-2xl p-7 flex flex-col gap-5">
          {/* card header */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <MdOutlineFlightTakeoff
                className="w-5 h-5"
                style={{ color: ORANGE }}
              />
              <span className="text-sky-950 text-lg font-normal font-['DM_Serif_Display']">
                Travel Request — Small Team
              </span>
            </div>
            <span
              className="px-3 py-1 rounded-full text-black text-xs font-medium whitespace-nowrap"
              style={{ background: ORANGE }}
            >
              Pending Approval
            </span>
          </div>

          {/* employee */}
          <div className="flex flex-col gap-1.5">
            <label className="text-slate-500 text-xs font-medium">
              Trip Details
            </label>
            <div className="px-3 py-3 bg-slate-100 rounded-xl border border-gray-200 flex flex-col gap-0.5">
              <span className="text-black text-sm">Priya Shah</span>
              <span className="text-slate-400 text-[10px]">
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
                className="p-3 rounded-lg border border-slate-200 flex flex-col gap-0.5"
              >
                <span className="text-[10px] text-slate-400 uppercase tracking-wide">
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
                className="p-3 rounded-lg border border-slate-200 flex flex-col gap-0.5"
              >
                <span className="text-[10px] text-slate-400 uppercase tracking-wide">
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
              className="text-xs font-bold uppercase tracking-wide"
              style={{ color: ORANGE }}
            >
              Project Cost ID
            </span>
            <span className="text-slate-900 text-sm font-medium">
              Jaipur Client — Q2 Review
            </span>
          </div>

          {/* CTA */}
          <button
            className="w-full py-3.5 rounded-xl text-sm font-semibold shadow-md transition-all hover:brightness-110 active:scale-95"
            style={{ background: ORANGE, color: AZURE_DARK }}
          >
            Search Hotels
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
    <div className="bg-slate-950 border-t border-white/10 py-4">
      <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-center gap-x-10 gap-y-2">
        {items.map((it) => (
          <p key={it.bold} className="text-white/80 text-sm whitespace-nowrap">
            <span className="font-bold">{it.bold}</span>
            <span className="font-normal">{it.rest}</span>
          </p>
        ))}
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
      icon: <MdOutlineWhatsapp size={22} />,
      title: "Travel happens on WhatsApp",
      body: "Employee messages the boss. Boss says yes. Someone books. Nobody documents. Month end — nobody knows what was spent or why.",
    },
    {
      icon: <MdOutlineCreditCardOff size={22} />,
      title: "Stop reimbursing from personal cards",
      body: "Employees pay from their own pockets and then chase reimbursements for weeks. It's slow, annoying, and error-prone.",
    },
    {
      icon: <MdOutlineAnalytics size={22} />,
      title: "No idea what travel costs",
      body: "The MD asks how much was spent on travel last quarter. Nobody has a clean answer. It takes 2 days to compile from emails and bank statements.",
    },
  ];

  return (
    <section className="bg-slate-50 py-20 px-6">
      <div className="max-w-7xl mx-auto flex flex-col gap-12">
        {/* header */}
        <div className="flex flex-col gap-4 max-w-2xl">
          <div
            style={{ background: ORANGE }}
            className="w-[512px] px-[5px] py-0.5  inline-flex flex-col justify-start items-start"
          >
            <div className="justify-center text-black text-xs font-semibold font-['Plus_Jakarta_Sans'] uppercase leading-4 tracking-[2.40px]">
              Your Reality Right Now
            </div>
          </div>
          <h2 className="text-5xl font-normal leading-tight text-black font-['DM_Serif_Display']">
            You know this feeling <br />
            <span className="italic" style={{ color: ORANGE }}>
              too well.
            </span>
          </h2>
          <p className="text-slate-600 text-lg leading-7">
            Small teams travel too. And without a system — even 10 <br /> people
            can create a lot of travel chaos.
          </p>
        </div>

        {/* cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {cards.map((c) => (
            <div
              key={c.title}
              className="bg-white rounded-2xl border border-slate-200 p-7 flex flex-col gap-4 hover:shadow-lg transition-shadow duration-300"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: `${ORANGE}18` }}
              >
                <span style={{ color: ORANGE }}>{c.icon}</span>
              </div>
              <h3 className="text-slate-950 text-xl font-normal font-['DM_Serif_Display'] leading-7">
                {c.title}
              </h3>
              <p className="text-slate-600 text-base leading-6">{c.body}</p>
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
    <section className="bg-slate-50 py-20 px-6 border-t border-slate-100">
      <div className="max-w-7xl mx-auto flex flex-col gap-12">
        {/* header */}
        <div className="flex flex-col gap-4 max-w-2xl">
          <div
            style={{ background: ORANGE }}
            className="w-[512px] px-[5px] py-0.5  inline-flex flex-col justify-start items-start"
          >
            <div className="justify-center text-black text-xs font-semibold font-['Plus_Jakarta_Sans'] uppercase leading-4 tracking-[2.40px]">
              What Traveamer Does For You
            </div>
          </div>
          <h2 className="text-5xl font-normal leading-tight text-black font-['DM_Serif_Display']">
            Everything you need. <br />
            <span className="italic" style={{ color: ORANGE }}>
              Nothing you don't.
            </span>
          </h2>
          <p className="text-slate-600 text-lg leading-7">
            A small business needs a simple system — not enterprise software.
            Traveamer is designed to be up and running in 2 hours.
          </p>
        </div>

        {/* grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-white rounded-2xl border border-slate-200 p-7 flex flex-col gap-3 hover:shadow-md transition-shadow duration-300 group"
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center transition-colors duration-200"
                style={{ background: "rgba(14,42,62,0.05)" }}
              >
                <span className="text-sky-950 group-hover:text-orange-500 transition-colors duration-200">
                  {f.icon}
                </span>
              </div>
              <h3 className="text-slate-950 text-lg font-normal font-['DM_Serif_Display'] leading-7">
                {f.title}
              </h3>
              <p className="text-slate-600 text-sm leading-6">{f.body}</p>
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
    <section className="relative bg-linear-to-l from-blue-900 to-slate-950 overflow-hidden py-20 px-6">
      {/* ghost text decoration */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none">
        <span className="text-[200px] font-bold text-white/3 whitespace-nowrap font-['DM_Sans']">
          Step by Step
        </span>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto flex flex-col gap-16">
        {/* header */}
        <div className="flex flex-col gap-4 max-w-xl">
          <h2 className="text-5xl font-normal leading-tight text-white font-['DM_Serif_Display']">
            From Startup to{" "}
            <span className="italic" style={{ color: ORANGE }}>
              Scale-up.
            </span>
          </h2>
          <p className="text-white/50 text-lg leading-7">
            Three simple steps to professionalize your travel.
          </p>
        </div>

        {/* step cards */}
        <div className="grid sm:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {steps.map((s) => (
            <div
              key={s.n}
              className="flex flex-col items-center text-center gap-5"
            >
              {/* icon box with badge */}
              <div className="relative">
                <div className="w-20 py-6 bg-white rounded-2xl flex justify-center items-center">
                  <span className="text-slate-950">{s.icon}</span>
                </div>
                <div
                  className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-slate-950"
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
              <p className="text-white text-base leading-6">{s.body}</p>
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
      className="mt-15 py-10 px-6 flex flex-col items-center text-center"
      style={{ background: DARK }}
    >
      <span
        className="text-xs font-semibold tracking-[0.2em] uppercase mb-5"
        style={{ color: ORANGE }}
      >
        Get Started Today
      </span>

      <div className="w-[602px] text-center justify-center"><span className="text-white text-4xl font-normal font-['DM_Serif_Display'] leading-10">Make your business </span><span style={{ color: ORANGE}} className=" text-4xl font-normal font-['DM_Serif_Display'] leading-10">travel professional today.</span></div>

     <div className="self-stretch text-center justify-center text-white/50 text-base font-normal font-['Plus_Jakarta_Sans'] leading-6">Join hundreds of Indian MSMEs who replaced travel chaos <br /> with Traveamer. Free 30-day trial. No credit card needed.</div>
      <div className="flex flex-wrap justify-center gap-3 mt-8">
        <button
          className="h-11 px-8 rounded-[10px] text-sm font-semibold transition-all hover:brightness-110 active:scale-95"
          style={{ background: ORANGE, color: AZURE_DARK }}
        >
          Start Free Trial
        </button>
        <button className="h-11 px-8 rounded-[10px] text-sm font-medium text-white border-2 border-white/30 hover:border-white/60 transition-all">
          Book a Demo
        </button>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-x-8 gap-y-2">
        {perks.map((p) => (
          <div key={p} className="flex items-center gap-2">
            <HiCheck className="w-4 h-4 shrink-0" style={{ color: ORANGE }} />
            <span className="text-white/60 text-sm">{p}</span>
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
