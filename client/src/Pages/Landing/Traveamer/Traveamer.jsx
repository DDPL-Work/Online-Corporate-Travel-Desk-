import { FaChevronDown, FaArrowRight } from "react-icons/fa";
import { IoCheckmark } from "react-icons/io5";
import { BsChat, BsCreditCard, BsTable, BsArrowRepeat } from "react-icons/bs";
import LandingFooter from "../../../layout/LandingFooter";
import LandingHeader from "../../../layout/LandingHeader";

// ─── Reusable Badge ────────────────────────────────────────────────────────────
const Badge = ({ label, gold = false, dark = false }) => (
  <div
    className={`w-fit inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${
      gold
        ? "bg-[#C9A240]"
        : dark
        ? "bg-white/5 outline outline-1 outline-white/20"
        : "bg-white outline outline-1 outline-black/10"
    }`}
  >
    {!dark && (
      <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-[#051D8C] to-[#030E30] shrink-0" />
    )}
    <span
      className={`text-[11px] font-normal uppercase tracking-[1.98px] font-['DM_Sans'] ${
        dark ? "text-white/80" : "text-black"
      }`}
    >
      {label}
    </span>
  </div>
);

// ─── Navbar ────────────────────────────────────────────────────────────────────
const Navbar = () => (
  <nav className="w-full bg-[#F5F5F5] px-1 py-5 flex items-center justify-between">
    <div className="flex items-center gap-2 pl-4">
      {/* Logo placeholder */}
      <div className="w-[137px] h-7 bg-gradient-to-br from-[#051D8C] to-[#030E30] rounded flex items-center justify-center">
        <span className="text-white font-bold text-sm font-['DM_Sans'] tracking-wide">
          Traveamer
        </span>
      </div>
    </div>

    <div className="flex items-center gap-8">
      {["Platform", "Who It's For"].map((item) => (
        <button
          key={item}
          className="flex items-center gap-2 text-[#000D26] text-sm font-medium font-['Plus_Jakarta_Sans'] leading-5 hover:opacity-70 transition-opacity"
        >
          {item} <FaChevronDown size={10} />
        </button>
      ))}
      {["Why Us", "About Us", "FAQs"].map((item) => (
        <button
          key={item}
          className="text-[#000D26] text-sm font-medium font-['Plus_Jakarta_Sans'] leading-5 hover:opacity-70 transition-opacity"
        >
          {item}
        </button>
      ))}
    </div>

    <div className="flex items-center gap-4 pr-4">
      <button className="text-black text-sm font-medium font-['Plus_Jakarta_Sans'] leading-5 hover:opacity-70 transition-opacity">
        Login
      </button>
      <button className="h-10 px-4 bg-[#C9A84C] shadow-[0_0_40px_rgba(60,131,246,0.15)] rounded-full text-black text-sm font-medium font-['Plus_Jakarta_Sans'] leading-5 hover:opacity-90 transition-opacity">
        Sign Up
      </button>
    </div>
  </nav>
);

// ─── Hero Section ──────────────────────────────────────────────────────────────
const HeroSection = () => (
  <section className="w-full bg-gradient-to-b from-[#003399] to-[#000D26] overflow-hidden py-20 px-4">
    <div className="max-w-[1280px] mx-auto px-6 flex items-start gap-8">
      {/* Left: Copy */}
      <div className="flex-1 flex flex-col gap-6">
        <Badge label="Built for Indian MSMEs" />

        <div className="flex flex-col">
          <h1 className="text-[72px] font-bold font-['DM_Sans'] leading-[1.02]">
            <span className="text-white">Bring </span>
            <span className="text-[#C9A240]">structure</span>
            <span className="text-white"> to your</span>
            <br />
            <span className="text-white">business travel.</span>
          </h1>
        </div>

        <div className="max-w-[576px]">
          <p className="text-white text-lg font-['DM_Sans'] font-normal leading-7">
            We are not just a booking engine. We are the system that sits behind
            every business trip—making sure it is approved, documented, and
            tracked to the right project before the employee even boards the
            flight.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-5 pt-3">
          <button className="relative flex items-center gap-2 px-7 py-4 bg-[#C9A240] rounded-full font-['DM_Sans'] text-black text-sm font-semibold leading-5 shadow-[0_30px_80px_-30px_rgba(5,29,140,0.35)] hover:brightness-105 transition-all">
            Start structuring today <FaArrowRight size={13} />
          </button>
          <div className="flex flex-col gap-1">
            <span className="text-white text-sm font-medium font-['DM_Sans'] leading-[17.5px]">
              Live in 2 hours.
            </span>
            <span className="text-white text-sm font-normal font-['DM_Sans'] leading-[17.5px]">
              No monthly subscription.
            </span>
          </div>
        </div>
      </div>

      {/* Right: Approval Card */}
      <div className="w-[525px] shrink-0">
        <div className="bg-white rounded-[26px] p-3 outline outline-1 outline-black/10 shadow-[0_40px_80px_-40px_rgba(5,29,140,0.45)]">
          {/* Card Header */}
          <div className="flex items-center justify-between px-5 py-4 bg-black rounded-[22px]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#051D8C] to-[#030E30] flex items-center justify-center">
                <span className="text-white text-xs font-bold font-['DM_Sans']">
                  T
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-white/60 text-[10px] font-normal uppercase tracking-[1.8px] font-['DM_Sans']">
                  Approval Request
                </span>
                <span className="text-white text-sm font-semibold font-['DM_Sans'] leading-5">
                  Delhi → Mumbai
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-[rgba(255,185,0,0.20)] rounded-full text-[#FFD230] text-[10px] font-semibold uppercase tracking-[0.5px] font-['DM_Sans']">
              Pending
            </span>
          </div>

          {/* Card Body */}
          <div className="flex flex-col gap-4 p-5">
            {/* Employee / Cost row */}
            <div className="flex justify-between items-end pb-4 border-b border-black/10">
              <div className="flex flex-col">
                <span className="text-[#53555B] text-[11px] font-normal uppercase tracking-[0.55px] font-['DM_Sans']">
                  Employee
                </span>
                <span className="text-black text-base font-semibold font-['DM_Sans'] leading-6">
                  Rahul Sharma
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[#53555B] text-[11px] font-normal uppercase tracking-[0.55px] font-['DM_Sans']">
                  Total Cost
                </span>
                <span className="text-black text-base font-semibold font-['DM_Sans'] leading-6">
                  ₹8,450
                </span>
              </div>
            </div>

            {/* Project Tag */}
            <div className="flex flex-col gap-2 p-4 bg-[rgba(20,21,137,0.04)] rounded-[18px] outline outline-1 outline-[rgba(20,21,137,0.25)]">
              <span className="text-[#051D8C] text-[10px] font-semibold uppercase tracking-[1.8px] font-['DM_Sans']">
                ⌗ Project Cost Tag (Mandatory)
              </span>
              <div className="flex justify-between items-center">
                <span className="text-[#051D8C] text-lg font-bold font-['DM_Sans'] leading-7">
                  PRJ-MUM-402
                </span>
                <span className="text-[#53555B] text-xs font-normal font-['DM_Sans'] leading-4">
                  Client Pitch
                </span>
              </div>
            </div>

            {/* Payment Method */}
            <div className="flex flex-col gap-2 p-4 bg-[rgba(0,188,125,0.05)] rounded-[18px] outline outline-1 outline-[rgba(0,188,125,0.25)]">
              <span className="text-[#007A55] text-[10px] font-semibold uppercase tracking-[1.8px] font-['DM_Sans']">
                ✓ Payment Method
              </span>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#00BC7D]" />
                <span className="text-black text-sm font-semibold font-['DM_Sans'] leading-5">
                  Company Travel Wallet
                </span>
              </div>
            </div>

            {/* Approve Button */}
            <button className="flex items-center justify-center gap-2 w-full py-3.5 bg-black rounded-[18px] hover:opacity-90 transition-opacity">
              <span className="w-5 h-5 rounded-full bg-[#00BC7D] flex items-center justify-center">
                <IoCheckmark size={11} className="text-black font-bold" />
              </span>
              <span className="text-white text-sm font-semibold font-['DM_Sans'] leading-5">
                Approve &amp; Issue Ticket
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
);

// ─── The Conflict Section ──────────────────────────────────────────────────────
const conflictItems = [
  {
    icon: <BsChat size={18} />,
    title: "WhatsApp Approvals",
    desc: "Approvals happen informally. No central record, no clear policy, leading to confusion and delayed bookings.",
  },
  {
    icon: <BsCreditCard size={18} />,
    title: "Personal Cards",
    desc: "Employees book on personal cards. Month-end becomes a scramble of chasing receipts and reimbursements.",
  },
  {
    icon: <BsTable size={18} />,
    title: "Spreadsheet Chaos",
    desc: "Expenses are tracked manually. Finance wastes hours allocating costs to projects at the last minute.",
  },
  {
    icon: <BsArrowRepeat size={18} />,
    title: "Lost Refunds & Hidden Fees",
    desc: "No transparency on cancellation charges across portals. Tracking these penalties and reconciling refunds wastes enormous energy.",
  },
];

const ConflictSection = () => (
  <section className="max-w-[1280px] mx-auto px-6 py-16">
    <div className="max-w-[768px] flex flex-col gap-5 mb-8">
      <Badge label="The Conflict" gold />
      <h2 className="text-[56px] font-bold font-['DM_Sans'] leading-[58.8px] text-black">
        Business travel is broken.
      </h2>
      <p className="text-[#53555B] text-lg font-normal font-['DM_Sans'] leading-7">
        Not because people are careless. But because MSMEs were forced to use
        tools that weren&apos;t built for them.
      </p>
    </div>

    {/* Horizontal scrolling cards */}
    <div className="w-full overflow-x-auto rounded-[22px] outline outline-1 outline-black/10">
      <div className="flex min-w-max">
        {conflictItems.map((item, i) => (
          <div
            key={i}
            className="flex flex-col gap-3 p-8 bg-white w-72 shrink-0 border-r last:border-r-0 border-black/10"
          >
            <div className="w-11 h-11 rounded-[18px] outline outline-1 outline-black/10 flex items-center justify-center text-black">
              {item.icon}
            </div>
            <h3 className="text-black text-lg font-semibold font-['DM_Sans'] leading-7 mt-3">
              {item.title}
            </h3>
            <p className="text-[#53555B] text-sm font-normal font-['DM_Sans'] leading-[22.75px]">
              {item.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

// ─── Three Steps Section ───────────────────────────────────────────────────────
const steps = [
  {
    num: "01",
    title: "Employee Requests & Tags",
    desc: "They search for flights and hotels in our app. They mandatorily select a Project Cost ID before submitting. If an option is out of policy, the app handles it.",
  },
  {
    num: "02",
    title: "Manager 1-Click Approves",
    desc: 'You get an email summary with the exact cost and project tag. You click "Approve" and the ticket is issued immediately. The cost deducts from the company wallet.',
  },
  {
    num: "03",
    title: "Finance Gets 1 Clean Invoice",
    desc: "No chasing employees for receipts. Finance gets ONE invoice at month-end. Every rupee is already allocated to the correct project.",
  },
];

const ThreeStepsSection = () => (
  <section className="max-w-[1280px] mx-auto px-6 py-16">
    <div className="max-w-[768px] flex flex-col gap-5 mb-20">
      <Badge label="The Traveamer Order" gold />
      <h2 className="text-[56px] font-bold font-['DM_Sans'] leading-[58.8px] text-black">
        Three steps to complete clarity.
      </h2>
      <p className="text-[#53555B] text-lg font-normal font-['DM_Sans'] leading-7">
        We replaced many spreadsheets and long email chains with a foolproof,
        structured workflow.
      </p>
    </div>

    <div className="relative flex flex-col gap-14">
      {/* Vertical line */}
      <div className="absolute left-7 top-2 w-px h-[calc(100%-80px)] bg-black/10" />

      {steps.map((step, i) => (
        <div key={i} className="flex flex-col gap-0">
          {/* Step badge row */}
          <div className="flex items-center gap-5 pb-10">
            <div className="relative w-14 h-14 shrink-0 rounded-full bg-gradient-to-br from-[#051D8C] to-[#030E30] flex items-center justify-center shadow-[0_10px_30px_-10px_rgba(5,29,140,0.60)]">
              <span className="text-white text-base font-bold font-['DM_Sans'] leading-6">
                {step.num}
              </span>
            </div>
            <span className="text-[#53555B] text-[11px] font-normal uppercase tracking-[2.42px] font-['DM_Sans']">
              Step {step.num}
            </span>
          </div>

          {/* Step content */}
          <div className="flex flex-col gap-3">
            <h3 className="text-black text-[30px] font-semibold font-['DM_Sans'] leading-9">
              {step.title}
            </h3>
            <p className="max-w-[672px] text-[#53555B] text-base font-normal font-['DM_Sans'] leading-6">
              {step.desc}
            </p>
          </div>
        </div>
      ))}
    </div>
  </section>
);

// ─── Adaptability Section ──────────────────────────────────────────────────────
const AdaptabilitySection = () => (
  <section className="max-w-[1280px] mx-auto px-6 py-16 flex flex-col gap-8">
    <div className="max-w-[768px] flex flex-col gap-5">
      <Badge label="Adaptability" gold />
      <h2 className="text-[56px] font-bold font-['DM_Sans'] leading-[58.8px] text-black">
        Adapts to your company size
        <br />
        automatically.
      </h2>
    </div>

    {/* Two persona cards */}
    <div className="flex flex-col gap-0 outline outline-1 outline-black/10 rounded-[14px] overflow-hidden">
      {[
        {
          badge: "MSMEs · 1–500 Employees",
          title: "For growing teams",
          desc: "Set up your Travel Admin, invite your team via Google Workspace / M365 SSO, configure approval chains, and bring instant order to your operations.",
        },
        {
          badge: "Solo Professionals",
          title: "For independent specialists",
          desc: "For independent CAs, lawyers and consultants. No approval workflows. Just search, book, and directly tag costs to your client ID for easy billing.",
        },
      ].map((card, i) => (
        <div
          key={i}
          className="flex flex-col gap-3 p-10 bg-white shadow-[0_12px_30px_-18px_rgba(0,0,0,0.10)] border-b last:border-b-0 border-black/10"
        >
          <Badge label={card.badge} />
          <h3 className="text-black text-2xl font-semibold font-['DM_Sans'] leading-8 mt-3">
            {card.title}
          </h3>
          <p className="text-[#53555B] text-base font-normal font-['DM_Sans'] leading-6">
            {card.desc}
          </p>
        </div>
      ))}
    </div>

    {/* Pricing CTA */}
    <div className="relative w-full rounded-[26px] bg-gradient-to-br from-[#051D8C] to-[#030E30] overflow-hidden px-16 py-18 flex flex-col gap-12">
      {/* subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(0,0,0,0.04) 2%, rgba(0,0,0,0) 2%), linear-gradient(180deg, rgba(0,0,0,0.04) 2%, rgba(0,0,0,0) 2%)",
        }}
      />

      <div className="relative flex flex-col gap-5">
        <Badge label="Pricing" dark />
        <h2 className="text-white text-5xl font-bold font-['DM_Sans'] leading-[50.4px]">
          No subscriptions.
          <br />
          No software fees.
        </h2>
        <p className="max-w-[576px] text-white/75 text-base font-normal font-['DM_Sans'] leading-6">
          We believe in simple, transparent pricing. Traveamer does not charge a
          monthly platform fee. You only pay a small convenience fee when your
          team actually makes a booking.
        </p>
      </div>

      <div className="relative flex flex-col gap-3">
        {[
          "Free setup & SSO integration",
          "Free unlimited users & projects",
          "Free 24/7 dedicated support",
        ].map((item) => (
          <div
            key={item}
            className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-[14px] outline outline-1 outline-white/10"
          >
            <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center shrink-0">
              <IoCheckmark size={10} className="text-black font-bold" />
            </span>
            <span className="text-white text-sm font-normal font-['DM_Sans'] leading-5">
              {item}
            </span>
          </div>
        ))}
      </div>
    </div>
  </section>
);

// ─── Final CTA Section ─────────────────────────────────────────────────────────
const FinalCTASection = () => (
  <section className="max-w-[896px] mx-auto px-6 py-16 flex flex-col items-center gap-6 text-center">
    <Badge label="The Final Structure" gold />

    <div className="max-w-[768px] flex flex-col items-center">
      <h2 className="text-[60px] font-bold font-['DM_Sans'] leading-[63px] text-black">
        If your business is ready for
      </h2>
      <div>
        <span className="text-[60px] font-bold font-['DM_Sans'] leading-[63px] text-[#051D8C]">
          structure
        </span>
        <span className="text-[60px] font-bold font-['DM_Sans'] leading-[63px] text-black">
          , we are ready for
          <br />
          you.
        </span>
      </div>
    </div>

    <p className="max-w-[576px] text-[#53555B] text-base font-normal font-['DM_Sans'] leading-6">
      Most companies are live within 2 hours. Our onboarding team will assist
      your Travel Admin to get the platform fully set up today.
    </p>

    <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
      <button className="relative flex items-center gap-2 px-7 py-4 bg-gradient-to-br from-[#051D8C] to-[#030E30] rounded-full text-white text-sm font-semibold font-['DM_Sans'] leading-5 shadow-[0_30px_80px_-30px_rgba(5,29,140,0.35)] hover:brightness-110 transition-all">
        Start your setup <FaArrowRight size={13} />
      </button>
      <button className="px-7 py-4 bg-white rounded-full outline outline-1 outline-black/[0.18] text-black text-sm font-semibold font-['DM_Sans'] leading-5 hover:bg-gray-50 transition-colors">
        Contact our team
      </button>
    </div>
  </section>
);

// ─── Footer ────────────────────────────────────────────────────────────────────
const Footer = () => (
  <footer className="w-full border-t border-[#000D26] px-12 py-8 flex items-center justify-between">
    <div className="w-[118px] h-6 bg-gradient-to-br from-[#051D8C] to-[#030E30] rounded flex items-center justify-center">
      <span className="text-white font-bold text-xs font-['DM_Sans'] tracking-wide">
        Traveamer
      </span>
    </div>

    <p className="text-[#04112F] text-xs font-normal font-['Plus_Jakarta_Sans'] leading-4">
      © 2026 Traveamer. All rights reserved.
    </p>

    <div className="flex items-center gap-6">
      {["Privacy", "Terms", "Contact"].map((link) => (
        <a
          key={link}
          href="#"
          className="text-[#04112F] text-xs font-normal font-['Plus_Jakarta_Sans'] leading-4 hover:underline"
        >
          {link}
        </a>
      ))}
    </div>
  </footer>
);

// ─── Page Root ─────────────────────────────────────────────────────────────────
const Traveamer = () => {
  return (
    <div className="w-full bg-white overflow-x-hidden">
      <LandingHeader />
      <HeroSection />
      <ConflictSection />
      <ThreeStepsSection />
      <AdaptabilitySection />
      <FinalCTASection />
      <LandingFooter />
    </div>
  );
};

export default Traveamer;
