import { useState } from "react";
import { createPortal } from "react-dom";
import AuthModal from "../../Auth/AuthModal";
import { FaChevronDown, FaArrowRight } from "react-icons/fa";
import { IoCheckmark } from "react-icons/io5";
import { BsChat, BsCreditCard, BsTable, BsArrowRepeat } from "react-icons/bs";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import LandingFooter from "../../../layout/LandingFooter";
import LandingHeader from "../../../layout/LandingHeader";
import api from "../../../API/axios";

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

// ─── Hero Section ──────────────────────────────────────────────────────────────
const HeroSection = ({ onStartSetup }) => (
  <section className="w-full bg-gradient-to-b from-[#003399] to-[#000D26] overflow-hidden py-12 lg:py-20 px-4">
    <div className="max-w-[1280px] mx-auto px-2 lg:px-6 flex flex-col lg:flex-row items-center lg:items-start gap-12 lg:gap-8">
      {/* Left: Copy */}
      <div className="flex-1 flex flex-col gap-6 w-full items-center text-center lg:items-start lg:text-left">
        <Badge label="Built for Indian MSMEs" />

        <div className="flex flex-col w-full">
          <h1 className="text-[44px] md:text-[56px] lg:text-[72px] font-bold font-['DM_Sans'] leading-[1.1] lg:leading-[1.02]">
            <span className="text-white">Bring </span>
            <span className="text-[#C9A240]">structure</span>
            <span className="text-white"> to your</span>
            <br className="hidden lg:block" />
            <span className="text-white"> business travel.</span>
          </h1>
        </div>

        <div className="max-w-[576px] mx-auto lg:mx-0">
          <p className="text-white text-base lg:text-lg font-['DM_Sans'] font-normal leading-6 lg:leading-7">
            We are not just a booking engine. We are the system that sits behind
            every business trip—making sure it is approved, documented, and
            tracked to the right project before the employee even boards the
            flight.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-5 pt-3">
          <button 
            onClick={onStartSetup}
            className="relative flex items-center justify-center gap-2 px-7 py-4 bg-[#C9A240] rounded-full font-['DM_Sans'] text-black text-sm font-semibold leading-5 shadow-[0_30px_80px_-30px_rgba(5,29,140,0.35)] hover:brightness-105 transition-all w-full sm:w-auto"
          >
            Start structuring today <FaArrowRight size={13} />
          </button>
          <div className="flex flex-col gap-1 items-center sm:items-start">
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
      <div className="w-full lg:w-[525px] shrink-0 max-w-[525px] mx-auto lg:mx-0">
        <div className="bg-white rounded-[26px] p-3 outline outline-1 outline-black/10 shadow-[0_40px_80px_-40px_rgba(5,29,140,0.45)]">
          {/* Card Header */}
          <div className="flex items-center justify-between px-4 lg:px-5 py-4 bg-black rounded-[22px]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#051D8C] to-[#030E30] flex items-center justify-center shrink-0">
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
            <span className="px-2.5 py-1 bg-[rgba(255,185,0,0.20)] rounded-full text-[#FFD230] text-[10px] font-semibold uppercase tracking-[0.5px] font-['DM_Sans'] shrink-0">
              Pending
            </span>
          </div>

          {/* Card Body */}
          <div className="flex flex-col gap-4 p-4 lg:p-5">
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
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
                <span className="text-[#051D8C] text-base sm:text-lg font-bold font-['DM_Sans'] leading-7">
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

    {/* Responsive grid/flex cards */}
    <div className="w-full rounded-[22px] outline outline-1 outline-black/10 overflow-hidden flex flex-col lg:flex-row">
      {conflictItems.map((item, i) => (
        <div
          key={i}
          className="flex-1 flex flex-col gap-3 p-8 xl:p-10 bg-white border-b lg:border-b-0 lg:border-r last:border-b-0 lg:last:border-r-0 border-black/10"
        >
          <div className="w-11 h-11 rounded-full outline outline-1 outline-black/10 flex items-center justify-center text-black shrink-0">
            {item.icon}
          </div>
          <h3 className="text-black text-lg font-bold font-['DM_Sans'] leading-7 mt-3">
            {item.title}
          </h3>
          <p className="text-[#53555B] text-sm font-normal font-['DM_Sans'] leading-6">
            {item.desc}
          </p>
        </div>
      ))}
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

    <div className="relative flex flex-col gap-12 md:gap-16">
      {/* Vertical line */}
      <div className="absolute left-7 top-0 w-px h-full bg-black/10 hidden md:block" />

      {steps.map((step, i) => (
        <div key={i} className="flex flex-col md:flex-row md:items-start gap-4 md:gap-16 relative z-10">
          {/* Step badge row */}
          <div className="flex items-center gap-6 shrink-0 md:w-[220px]">
            <div className="relative w-14 h-14 shrink-0 rounded-full bg-gradient-to-br from-[#051D8C] to-[#030E30] flex items-center justify-center shadow-[0_10px_30px_-10px_rgba(5,29,140,0.60)]">
              <span className="text-white text-base font-bold font-['DM_Sans'] leading-6">
                {step.num}
              </span>
            </div>
            <span className="text-[#53555B] text-[11px] font-medium uppercase tracking-[2.42px] font-['DM_Sans']">
              Step {step.num}
            </span>
          </div>

          {/* Step content */}
          <div className="flex flex-col gap-3 md:pt-2">
            <h3 className="text-black text-[28px] md:text-[30px] font-bold font-['DM_Sans'] leading-9">
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
    <div className="flex flex-col md:flex-row gap-5 w-full">
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
          className="flex-1 flex flex-col gap-3 p-8 md:p-10 bg-white rounded-[14px] outline outline-1 outline-black/10 shadow-[0_12px_30px_-18px_rgba(0,0,0,0.10)]"
        >
          <div className="flex items-start">
            <Badge label={card.badge} />
          </div>
          <h3 className="text-black text-2xl font-bold font-['DM_Sans'] leading-8 mt-3">
            {card.title}
          </h3>
          <p className="text-[#53555B] text-base font-normal font-['DM_Sans'] leading-6">
            {card.desc}
          </p>
        </div>
      ))}
    </div>

    {/* Pricing CTA */}
    <div className="relative w-full rounded-[26px] bg-gradient-to-br from-[#051D8C] to-[#030E30] overflow-hidden px-10 py-12 md:px-16 md:py-16 flex flex-col md:flex-row items-center justify-between gap-12">
      {/* subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(0,0,0,0.04) 2%, rgba(0,0,0,0) 2%), linear-gradient(180deg, rgba(0,0,0,0.04) 2%, rgba(0,0,0,0) 2%)",
        }}
      />

      <div className="relative flex flex-col gap-6 flex-1">
        <Badge label="Pricing" dark />
        <div className="flex flex-col gap-4">
          <h2 className="text-white text-4xl md:text-5xl font-bold font-['DM_Sans'] leading-tight md:leading-[50.4px]">
            No subscriptions.
            <br />
            No software fees.
          </h2>
          <p className="max-w-[500px] text-white/75 text-base font-normal font-['DM_Sans'] leading-7">
            We believe in simple, transparent pricing. Traveamer does not charge a
            monthly platform fee. You only pay a small convenience fee when your
            team actually makes a booking.
          </p>
        </div>
      </div>

      <div className="relative flex flex-col gap-4 flex-1 max-w-[440px] w-full">
        {[
          "Free setup & SSO integration",
          "Free unlimited users & projects",
          "Free 24/7 dedicated support",
        ].map((item) => (
          <div
            key={item}
            className="flex items-center gap-4 px-5 py-4 bg-white/5 rounded-[14px] outline outline-1 outline-white/10"
          >
            <span className="w-[22px] h-[22px] rounded-full bg-white flex items-center justify-center shrink-0">
              <IoCheckmark size={14} className="text-[#051D8C] font-bold" />
            </span>
            <span className="text-white text-sm font-medium font-['DM_Sans'] leading-5">
              {item}
            </span>
          </div>
        ))}
      </div>
    </div>
  </section>
);

// ─── Contact Modal ─────────────────────────────────────────────────────────────
const ContactModal = ({ onClose }) => {
  const [form, setForm] = useState({
    fullName: "",
    workEmail: "",
    phone: "",
    companyName: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const response = await api.post("/contact-leads/submit", form);
      if (response.data?.success) {
        setSubmitted(true);
      }
    } catch (error) {
      console.error("Failed to submit contact lead:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-6"
      style={{ backgroundColor: "rgba(3,14,48,0.78)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[900px] bg-white rounded-[28px] overflow-hidden shadow-[0_60px_120px_-20px_rgba(5,29,140,0.55)] flex flex-col md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Left: Branding Panel ── */}
        <div className="relative bg-gradient-to-br from-[#051D8C] to-[#030E30] px-8 py-10 md:w-[340px] shrink-0 flex flex-col justify-between overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-white/[0.04]" />
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-[#C9A240]/[0.08]" />
          <div className="absolute bottom-24 right-4 w-20 h-20 rounded-full bg-white/[0.03]" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-white/60 hover:text-white md:hidden"
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          <div className="relative flex flex-col gap-6">
            {/* Logo */}
            <img src="/logo-traveamer.svg"
              alt="Traveamer"
              className="h-7 w-auto object-contain self-start" loading="eager" />

            <div className="flex flex-col gap-3">
              <Badge label="Get in Touch" dark />
              <h2 className="text-white text-[30px] font-bold font-['DM_Sans'] leading-[1.2]">
                Let&apos;s get your<br />team structured.
              </h2>
              <p className="text-white/60 text-sm font-['DM_Sans'] leading-[1.7]">
                Fill in your details and our onboarding team will reach out ASAP — no spam, ever.
              </p>
            </div>

            {/* Trust signals */}
            <div className="flex flex-col gap-3 mt-2">
              {[
                "Live in under 2 hours",
                "Dedicated onboarding support",
                "No commitment required",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-[#C9A240]/20 border border-[#C9A240]/40 flex items-center justify-center shrink-0">
                    <IoCheckmark size={11} className="text-[#C9A240]" />
                  </span>
                  <span className="text-white/75 text-sm font-['DM_Sans']">{item}</span>
                </div>
              ))}
            </div>
          </div>


        </div>

        {/* ── Right: Form Panel ── */}
        <div className="flex-1 flex flex-col overflow-y-auto max-h-[90vh] md:max-h-screen">
          {/* Close button (desktop) */}
          <div className="hidden md:flex justify-end px-8 pt-7 pb-0">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-black/[0.06] hover:bg-black/10 transition-colors flex items-center justify-center text-black/40 hover:text-black/70"
            >
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {submitted ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-5 px-10 py-14 text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#051D8C] to-[#030E30] flex items-center justify-center shadow-[0_16px_40px_-10px_rgba(5,29,140,0.45)]">
                <IoCheckmark size={34} className="text-[#C9A240]" />
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-black text-2xl font-bold font-['DM_Sans']">
                  We&apos;ll be in touch soon!
                </h3>
                <p className="text-[#53555B] text-sm font-['DM_Sans'] leading-6 max-w-[320px] mx-auto">
                  Thanks for reaching out. Our onboarding team will contact you at{" "}
                  <strong className="text-[#051D8C]">{form.workEmail}</strong> ASAP.
                </p>
              </div>
              <button
                onClick={onClose}
                className="mt-2 px-8 py-3.5 bg-gradient-to-br from-[#051D8C] to-[#030E30] rounded-full text-white text-sm font-semibold font-['DM_Sans'] hover:brightness-110 transition-all shadow-[0_10px_30px_-10px_rgba(5,29,140,0.45)]"
              >
                Back to Traveamer
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-8 md:px-10 py-8 md:py-10">
              <div className="flex flex-col gap-1">
                <h3 className="text-black text-xl font-bold font-['DM_Sans']">Contact our team</h3>
                <p className="text-[#53555B] text-sm font-['DM_Sans']">All fields are required.</p>
              </div>

              {/* Full Name + Work Email */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-[#030E30] text-[11px] font-semibold font-['DM_Sans'] uppercase tracking-[1.3px]">
                    Full Name <span className="text-[#C9A240]">*</span>
                  </label>
                  <input
                    name="fullName"
                    value={form.fullName}
                    onChange={handleChange}
                    required
                    placeholder="Rahul Sharma"
                    className="w-full h-12 px-4 rounded-[12px] border border-black/[0.10] bg-[#F7F8FC] text-black text-sm font-['DM_Sans'] placeholder:text-[#B0B3BD] focus:outline-none focus:border-[#051D8C] focus:ring-2 focus:ring-[#051D8C]/10 transition-all"
                  />
                </div>
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-[#030E30] text-[11px] font-semibold font-['DM_Sans'] uppercase tracking-[1.3px]">
                    Work Email <span className="text-[#C9A240]">*</span>
                  </label>
                  <input
                    name="workEmail"
                    type="email"
                    value={form.workEmail}
                    onChange={handleChange}
                    required
                    placeholder="rahul@company.com"
                    className="w-full h-12 px-4 rounded-[12px] border border-black/[0.10] bg-[#F7F8FC] text-black text-sm font-['DM_Sans'] placeholder:text-[#B0B3BD] focus:outline-none focus:border-[#051D8C] focus:ring-2 focus:ring-[#051D8C]/10 transition-all"
                  />
                </div>
              </div>

              {/* Phone + Company */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-[#030E30] text-[11px] font-semibold font-['DM_Sans'] uppercase tracking-[1.3px]">
                    Phone Number <span className="text-[#C9A240]">*</span>
                  </label>
                  <div className="phone-input-wrapper">
                    <PhoneInput
                      country="in"
                      value={form.phone}
                      onChange={(phone) =>
                        setForm((prev) => ({ ...prev, phone }))
                      }
                      enableSearch
                      inputProps={{
                        name: "phone",
                        required: true,
                        placeholder: "98765 43210",
                      }}
                      containerStyle={{ width: "100%" }}
                      inputStyle={{
                        width: "100%",
                        height: "48px",
                        borderRadius: "12px",
                        border: "1px solid rgba(0,0,0,0.10)",
                        backgroundColor: "#F7F8FC",
                        fontSize: "14px",
                        fontFamily: "DM Sans, sans-serif",
                        color: "#000",
                        paddingLeft: "52px",
                      }}
                      buttonStyle={{
                        borderRadius: "12px 0 0 12px",
                        border: "1px solid rgba(0,0,0,0.10)",
                        borderRight: "none",
                        backgroundColor: "#F7F8FC",
                        paddingLeft: "8px",
                        paddingRight: "4px",
                      }}
                      dropdownStyle={{
                        borderRadius: "12px",
                        border: "1px solid rgba(0,0,0,0.10)",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
                        fontFamily: "DM Sans, sans-serif",
                        fontSize: "13px",
                      }}
                    />
                  </div>
                </div>
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-[#030E30] text-[11px] font-semibold font-['DM_Sans'] uppercase tracking-[1.3px]">
                    Company Name <span className="text-[#C9A240]">*</span>
                  </label>
                  <input
                    name="companyName"
                    value={form.companyName}
                    onChange={handleChange}
                    required
                    placeholder="Acme Pvt. Ltd."
                    className="w-full h-12 px-4 rounded-[12px] border border-black/[0.10] bg-[#F7F8FC] text-black text-sm font-['DM_Sans'] placeholder:text-[#B0B3BD] focus:outline-none focus:border-[#051D8C] focus:ring-2 focus:ring-[#051D8C]/10 transition-all"
                  />
                </div>
              </div>

              {/* Message */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[#030E30] text-[11px] font-semibold font-['DM_Sans'] uppercase tracking-[1.3px]">
                  Message / Requirement <span className="text-[#C9A240]">*</span>
                </label>
                <textarea
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  required
                  rows={4}
                  placeholder="Tell us about your team size, current travel challenges, and what you're looking for..."
                  className="w-full px-4 py-3.5 rounded-[12px] border border-black/[0.10] bg-[#F7F8FC] text-black text-sm font-['DM_Sans'] placeholder:text-[#B0B3BD] focus:outline-none focus:border-[#051D8C] focus:ring-2 focus:ring-[#051D8C]/10 transition-all resize-none leading-6"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center justify-center gap-2.5 w-full py-4 bg-gradient-to-br from-[#051D8C] to-[#030E30] rounded-[14px] text-white text-sm font-semibold font-['DM_Sans'] leading-5 shadow-[0_16px_40px_-10px_rgba(5,29,140,0.50)] hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Sending..." : "Send Message"} <FaArrowRight size={13} />
              </button>

              <p className="text-center text-[#B0B3BD] text-xs font-['DM_Sans']">
                We typically respond ASAP. No spam, ever.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

// ─── Final CTA Section ─────────────────────────────────────────────────────────
const FinalCTASection = ({ onContactOpen, onStartSetup }) => (
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
      <button 
        onClick={onStartSetup}
        className="relative flex items-center gap-2 px-7 py-4 bg-gradient-to-br from-[#051D8C] to-[#030E30] rounded-full text-white text-sm font-semibold font-['DM_Sans'] leading-5 shadow-[0_30px_80px_-30px_rgba(5,29,140,0.35)] hover:brightness-110 transition-all"
      >
        Start your setup <FaArrowRight size={13} />
      </button>
      <button
        onClick={onContactOpen}
        className="px-7 py-4 bg-white rounded-full outline outline-1 outline-black/[0.18] text-black text-sm font-semibold font-['DM_Sans'] leading-5 hover:bg-gray-50 transition-colors"
      >
        Contact our team
      </button>
    </div>
  </section>
);

// ─── Page Root ─────────────────────────────────────────────────────────────────
const Traveamer = () => {
  const [contactOpen, setContactOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  return (
    <div className="w-full bg-white overflow-x-hidden">
      <LandingHeader />
      <HeroSection onStartSetup={() => setAuthModalOpen(true)} />
      <ConflictSection />
      <ThreeStepsSection />
      <AdaptabilitySection />
      <FinalCTASection 
        onContactOpen={() => setContactOpen(true)} 
        onStartSetup={() => setAuthModalOpen(true)}
      />
      <LandingFooter />

      {contactOpen && (
        <ContactModal onClose={() => setContactOpen(false)} />
      )}
      
      {authModalOpen && (
        <AuthModal onClose={() => setAuthModalOpen(false)} initialStep={1} />
      )}
    </div>
  );
};

export default Traveamer;
