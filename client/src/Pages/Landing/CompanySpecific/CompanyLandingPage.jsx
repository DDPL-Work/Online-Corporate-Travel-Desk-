import React, { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { getPublicBrandingBySlug } from "../../../Redux/Actions/landingPageThunks";
import {
  FiLock,
  FiShield,
  FiKey,
  FiRefreshCw,
  FiSearch,
  FiFileText,
  FiCreditCard,
  FiMail,
  FiArrowRight,
  FiMonitor,
  FiMap,
  FiEdit,
  FiZap,
  FiDollarSign,
  FiPhone,
} from "react-icons/fi";
import LandingFooter from "../../../layout/LandingFooter";
import LandingHeader from "../../../layout/LandingHeader";
import { airlineLogo } from "../../../utils/formatter";
import { HiOutlineDocumentCheck, HiOutlineShieldCheck } from "react-icons/hi2";
import { HiOutlineClipboardList } from "react-icons/hi";
import { FaPaperPlane, FaSearch } from "react-icons/fa";
import { GiJusticeStar } from "react-icons/gi";

const GOLD = "#C9A84C";

export default function CompanyLandingPage() {
  const { slug } = useParams();
  const dispatch = useDispatch();
  const { publicBranding } = useSelector((s) => s.landingPage);

  useEffect(() => {
    if (slug) {
      localStorage.setItem("companySlug", slug);
      dispatch(getPublicBrandingBySlug(slug));
    }
  }, [slug, dispatch]);

  const branding = publicBranding;

  return (
    <div className="w-full min-h-screen relative bg-white overflow-x-hidden font-['Plus_Jakarta_Sans']">
      <LandingHeader />

      {/* ── HERO SECTION ── */}
      <section className="relative w-full bg-[linear-gradient(348deg,#003399_0%,#000D26_100%)] overflow-hidden pt-[122px] pb-[112px]">
        <div className="max-w-[1280px] mx-auto px-6 flex flex-col lg:flex-row justify-between items-start gap-16">
          
          {/* Top text block */}
          <div className="flex flex-col justify-start items-start gap-[23px] w-full lg:max-w-[584px] z-10">
            {/* Version badge */}
            <div className="inline-flex justify-start items-center bg-white rounded-full px-3 py-1.5 outline outline-1 outline-black/10 gap-2">
              <div className="rounded-full w-1.5 h-1.5 bg-[#00BC7D]" />
              <span className="text-[#4F5661] text-xs font-normal leading-4">
                Enterprise Travel Portal
              </span>
            </div>

            {/* Headline */}
            <div className="flex flex-col justify-start items-start font-['DM_Sans'] text-6xl font-bold leading-[63px]">
              <span className="text-white">Welcome to the</span>
              <span className="text-[#C9A240]">
                {branding?.branding?.landingPageTitle || branding?.corporateName || "Company Name"}
              </span>
              <span className="text-white">Travel Portal.</span>
            </div>

            {/* Subtitle */}
            <div className="flex flex-col justify-start items-start max-w-[576px]">
              <p className="text-white text-lg font-normal leading-[29.25px]">
                Book, manage, and track your business travel with integrated approval<br className="hidden sm:block" />workflows and project-linked expenses.
              </p>
            </div>

            {/* Trust badges */}
            <div className="inline-flex flex-wrap justify-start items-center pt-6 gap-8">
              {[
                { icon: <FiLock size={16} className="text-white" />, label: "SOC 2 Type II" },
                { icon: <FiShield size={16} className="text-white" />, label: "AES-256 Encrypted" },
                { icon: <FiKey size={16} className="text-white" />, label: "SSO Enabled" },
              ].map(({ icon, label }) => (
                <div key={label} className="inline-flex justify-start items-center gap-2">
                  {icon}
                  <span className="text-white text-xs font-normal leading-4">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Login Card ── */}
          <div className="relative bg-white overflow-hidden w-full lg:w-[604px] h-[444px] rounded-[19px] outline outline-[1.18px] outline-black/5 flex flex-col md:flex-row shadow-2xl z-10">
            {/* Left blue panel */}
            <div className="relative overflow-hidden w-full md:w-[263px] h-[200px] md:h-full bg-[linear-gradient(119deg,#051D8C_0%,#030E30_100%)] flex-shrink-0">
              {/* Grid overlay */}
              <div className="absolute w-[263px] h-full left-0 top-9 opacity-15 bg-[linear-gradient(90deg,rgba(0,0,0,0.05)_2%,transparent_2%),linear-gradient(180deg,rgba(0,0,0,0.05)_2%,transparent_2%)]" />
              {/* Glow circle */}
              <div className="absolute rounded-full w-[226px] h-[226px] -left-12 top-[293px] bg-white/5 shadow-[47px_47px_47px_rgba(255,255,255,0.05)] blur-[24px]" />

              {/* Left panel content */}
              <div className="absolute flex flex-col justify-start items-start w-[206px] pt-2 left-7 top-7 gap-3">
                {/* Top label */}
                <div className="inline-flex justify-start items-center pb-3 opacity-80 gap-2.5">
                  <div className="rounded-full w-2 h-2 bg-[#00D492]" />
                  <span className="text-white text-xs font-normal leading-[17.7px] tracking-[3px]">
                    {branding?.corporateName?.toUpperCase() || "NEXUS"}
                  </span>
                </div>

                {/* Welcome pill */}
                <div className="inline-flex justify-start items-center rounded-full px-3 py-1 bg-white/15 backdrop-blur-sm gap-2">
                  <FiMonitor size={14} className="text-white" />
                  <span className="text-white text-xs font-bold leading-[17.7px] tracking-wide">
                    WELCOME
                  </span>
                </div>

                {/* Tagline */}
                <div className="flex flex-col justify-start items-start pt-3">
                  <h3 className="text-white text-[28px] font-['DM_Sans'] font-bold leading-[35px]">
                  { branding?.branding?.landingPageTitle || branding?.corporateName} Travel Portal
                  </h3>
                </div>

                <div className="hidden md:flex flex-col justify-start items-start">
                  <p className="text-white/70 text-sm font-normal leading-[23px]">
                    Join 5,000+ {branding?.branding?.landingPageTitle || branding?.corporateName} teams<br />managing smarter business<br />travel.
                  </p>
                </div>
              </div>

              {/* Stats row */}
              <div className="hidden md:flex absolute items-center left-5 bottom-[33px] gap-1.5">
                {[
                  { value: "30%", label: "Saved", width: "64px" },
                  { value: "24/7", label: "Support", width: "74px" },
                  { value: "500+", label: "Airlines", width: "75px" },
                ].map(({ value, label, width }) => (
                  <div key={label} className="inline-flex flex-col justify-start items-start p-2.5 bg-white/10 rounded-[9px] outline outline-[1px] outline-white/10 backdrop-blur-sm gap-0.5" style={{ width }}>
                    <span className="text-white text-[16px] font-['DM_Sans'] font-bold leading-6">
                      {value}
                    </span>
                    <span className="text-white text-[10px] font-normal uppercase leading-4 tracking-wide opacity-70">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right sign-in panel */}
            <div className="flex-1 flex flex-col justify-start items-start p-8 gap-7 bg-white">
              <div className="w-full inline-flex justify-between items-start">
                <div className="inline-flex flex-col justify-start items-start gap-1">
                  <span className="text-[#4F5661] text-xs font-normal leading-5 tracking-[3px]">
                    AUTHENTICATION
                  </span>
                  <span className="text-black text-[28px] font-['DM_Sans'] font-bold leading-[38px]">
                    Sign In
                  </span>
                </div>
                <div className="inline-flex flex-col justify-center items-center rounded-full w-8 h-8 outline outline-1 outline-black/10">
                  <FiKey size={16} className="text-[#4F5661]" />
                </div>
              </div>

              <div className="w-full border-t border-black/5" />

              <div className="flex flex-col justify-start items-start gap-1">
                <span className="text-black text-[19px] font-['DM_Sans'] font-bold leading-7">
                  Access your {branding?.branding?.landingPageTitle || branding?.corporateName} travel desk
                </span>
                <span className="text-[#4F5661] textsm font-normal leading-6">
                  Continue with your {branding?.branding?.landingPageTitle || branding?.corporateName} identity provider to securely sign in.
                </span>
              </div>

              {/* SSO Provider buttons */}
              <div className="w-full flex justify-center items-center gap-3.5">
                {/* Google */}
                <button className="bg-white inline-flex justify-center items-center w-16 h-16 rounded-xl outline outline-1 outline-black/10 hover:bg-gray-50 transition-colors shadow-sm p-4">
                  <img src="/Google.svg" alt="Google" className="w-full h-full object-contain" />
                </button>
                {/* Microsoft */}
                <button className="bg-white inline-flex justify-center items-center w-16 h-16 rounded-xl outline outline-1 outline-black/10 hover:bg-gray-50 transition-colors shadow-sm p-4">
                  <img src="/MicroSoft.svg" alt="Microsoft" className="w-full h-full object-contain" />
                </button>
                {/* Zoho */}
                <button className="bg-white inline-flex justify-center items-center w-16 h-16 rounded-xl outline outline-1 outline-black/10 hover:bg-gray-50 transition-colors shadow-sm p-4">
                  <img src="/Zoho.svg" alt="Zoho" className="w-full h-full object-contain" />
                </button>
              </div>

              {/* SSO note */}
              <div className="w-full inline-flex justify-center items-center gap-2 pt-2">
                <FiLock size={16} className="text-[#051D8C]" />
                <span className="text-[#4F5661] text-[10px] font-normal leading-5 text-center">
                  Secure SSO via your {branding?.branding?.landingPageTitle || branding?.corporateName} identity provider
                </span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── CANCEL / RESCHEDULE SECTION ── */}
      <section className="w-full bg-white py-24">
        <div className="max-w-[1280px] mx-auto px-6 flex flex-col gap-12">
          
          {/* Section header */}
          <div className="w-full flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div className="flex flex-col justify-start items-start max-w-[576px] gap-3">
              <span className="text-[#4F5661] text-xs font-normal uppercase leading-4 tracking-[2.4px]">
                Plans Change. We Adapt.
              </span>
              <h2 className="text-black text-4xl font-['DM_Sans'] font-bold leading-10">
                Cancel or reschedule, in one click.
              </h2>
              <p className="text-[#4F5661] text-base font-normal leading-6 pt-1">
                Modify any confirmed booking instantly. Refunds route back to your project wallet<br className="hidden sm:block" />automatically.
              </p>
            </div>
            <div className="inline-flex justify-start items-center bg-white rounded-full px-4 py-2 outline outline-1 outline-black/10 gap-2 shadow-sm">
              <div className="rounded-full w-1.5 h-1.5 bg-[#00BC7D]" />
              <span className="text-black text-xs font-normal leading-4">Avg. processing ·</span>
              <span className="text-black text-xs font-bold leading-4">2 min 14 sec</span>
            </div>
          </div>

          {/* Cards column */}
          <div className="w-full flex flex-col lg:flex-row items-start gap-8">
            <div className="flex flex-col gap-6 w-full lg:max-w-[480px]">
              
              {/* Auto-refund card */}
              <div className="flex flex-col justify-between items-start bg-white rounded-2xl p-6 outline outline-1 outline-black/10 shadow-sm w-full">
                <div className="w-full inline-flex justify-between items-center">
                  <div className="inline-flex justify-start items-center gap-2">
                    <FiCreditCard size={16} className="text-[#4F5661]" />
                    <span className="text-[#4F5661] text-xs font-normal leading-4 tracking-[0.6px]">AUTO-REFUND</span>
                  </div>
                  <div className="inline-flex flex-col justify-start items-start rounded-full px-2 py-1 bg-[#ECFDF5]">
                    <span className="text-[#007A55] text-[10px] font-bold leading-[15px]">INSTANT</span>
                  </div>
                </div>
                <div className="w-full flex flex-col justify-start items-start pt-4 gap-1">
                  <span className="text-black text-[30px] font-['DM_Sans'] font-bold leading-9">₹ 8,420</span>
                  <span className="text-[#4F5661] text-xs font-normal leading-4">Credited to NX-4471 wallet within 60 seconds.</span>
                </div>
                <div className="w-full flex flex-col justify-start items-start pt-4">
                  <div className="w-full relative overflow-hidden rounded-full h-1.5 bg-black/5">
                    <div className="absolute rounded-full w-[80%] h-1.5 left-0 top-0 bg-[linear-gradient(179deg,#051D8C_0%,#030E30_100%)]" />
                  </div>
                </div>
              </div>

              {/* Suggested Reschedule card */}
              <div className="w-full flex flex-col justify-start items-start bg-white rounded-2xl pt-6 pb-12 px-6 outline outline-1 outline-black/10 shadow-sm gap-5">
                <div className="inline-flex justify-start items-center gap-2">
                  <FiRefreshCw size={16} className="text-[#4F5661]" />
                  <span className="text-[#4F5661] text-xs font-normal leading-4 tracking-[0.6px]">SUGGESTED RESCHEDULE</span>
                </div>
                <div className="w-full flex flex-col justify-start items-start gap-2">
                  {[
                    { flight: "6E 2148", time: "Wed · 08:10", price: "₹ +0" },
                    { flight: "AI 503", time: "Wed · 14:25", price: "₹ +320" },
                    { flight: "UK 845", time: "Thu · 06:55", price: "₹ -180" },
                  ].map(({ flight, time, price }) => (
                    <div key={flight} className="w-full flex justify-between items-center rounded-lg py-2.5 px-3 hover:bg-gray-50 transition-colors border border-transparent hover:border-black/5 cursor-pointer">
                      <span className="text-black text-xs font-bold leading-4 w-1/3 text-left">{flight}</span>
                      <span className="text-[#4F5661] text-xs font-normal leading-4 w-1/3 text-center">{time}</span>
                      <span className="text-[#051D8C] text-xs font-bold leading-4 w-1/3 text-right">{price}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* How it works – dark card */}
            <div className="flex-1 w-full relative overflow-hidden flex flex-col justify-start items-start rounded-2xl p-8 bg-[linear-gradient(144deg,#051D8C_0%,#030E30_100%)] shadow-xl gap-2 min-h-[520px]">
              {/* Grid bg */}
              <div className="absolute inset-0 opacity-10 bg-[linear-gradient(90deg,rgba(0,0,0,0.05)_2%,transparent_2%),linear-gradient(180deg,rgba(0,0,0,0.05)_2%,transparent_2%)]" />
              {/* Glow */}
              <div className="absolute rounded-full w-[288px] h-[288px] -right-16 -top-16 bg-white/10 blur-[40px] pointer-events-none" />

              <div className="w-full inline-flex justify-between items-center relative z-10">
                <div className="inline-flex justify-start items-center opacity-80 gap-2">
                  <FiFileText size={14} className="text-white" />
                  <span className="text-white text-[10px] font-normal leading-[15px] tracking-[2.5px]">HOW IT WORKS · 4 STEPS</span>
                </div>
                <div className="inline-flex flex-col justify-start items-start rounded-full px-2.5 py-1 bg-[#00D492]/20">
                  <span className="text-[#A4F4CF] text-[10px] font-bold leading-[15px]">UNDER 3 MIN</span>
                </div>
              </div>

              <div className="w-full flex flex-col justify-start items-start pt-4 relative z-10">
                <h3 className="text-white text-2xl font-['DM_Sans'] font-bold leading-8">Cancel or reschedule, step by step.</h3>
              </div>
              <div className="flex flex-col justify-start items-start max-w-[448px] relative z-10">
                <p className="text-white/70 text-sm font-normal leading-5">A guided flow — no support tickets, no waiting on email approvals.</p>
              </div>

              <div className="w-full flex flex-col justify-start items-start pt-6 gap-5 relative z-10">
                {[
                  { step: "STEP 01", title: "Open the trip", desc: "Go to My Trips and pick the booking you want to change or cancel.", icon: FiMap },
                  { step: "STEP 02", title: "Choose an action", desc: "Select Reschedule, Modify, or Cancel — fare rules and penalties show upfront.", icon: FiEdit },
                  { step: "STEP 03", title: "Auto-approval", desc: "Within policy? It clears instantly. Out of policy? One-tap manager approval is requested.", icon: FiZap },
                  { step: "STEP 04", title: "Confirmation & refund", desc: "New itinerary lands in your inbox. Refunds route back to your project wallet automatically.", icon: FiDollarSign },
                ].map(({ step, title, desc, icon: Icon }) => (
                  <div key={step} className="w-full flex items-start gap-4">
                    <div className="flex flex-col justify-center items-center rounded-xl w-10 h-10 flex-shrink-0 bg-white/10 outline outline-1 outline-white/15 backdrop-blur-sm group-hover:bg-white/20 transition-colors">
                      <Icon size={16} className="text-white" />
                    </div>
                    <div className="flex-1 flex flex-col justify-start items-start gap-0.5">
                      <span className="text-white/50 text-[10px] font-bold leading-[15px] tracking-[2px]">{step}</span>
                      <span className="text-white text-base font-['DM_Sans'] font-bold leading-6">{title}</span>
                      <span className="text-white/70 text-xs font-normal leading-5 pt-0.5">{desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS (IT OPS) SECTION ── */}
      <section className="w-full bg-[#F9FAFB] py-24 relative">
        <div className="max-w-[1280px] mx-auto px-6 flex flex-col gap-12 relative z-10">
          <div className="flex flex-col justify-start items-start max-w-[672px] gap-3">
            <span className="text-[#4F5661] text-xs font-normal uppercase leading-4 tracking-[2.4px]">How it works</span>
            <h2 className="text-black text-4xl font-['DM_Sans'] font-bold leading-10">Streamlined for IT Operations.</h2>
            <p className="text-[#4F5661] text-base font-normal leading-6 pt-1">Four steps. Zero friction. Every rupee allocated.</p>
          </div>

          <div className="w-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 pt-8">
            {[
              { tag: "DISCOVER · 01", title: "Search & Plan", desc: "Search across 500+ airlines and 800K+ properties using your project context.", time: "30 sec", icons:FaSearch  },
              { tag: "REQUEST · 02", title: "Tag & Submit", desc: "Attach your Project Cost ID — every rupee allocated to the right client engagement.", time: "1 min", icons:HiOutlineDocumentCheck  },
              { tag: "APPROVE · 03", title: "One-Click Verify", desc: "Your Travel Admin or Manager approves directly inside the portal — no email chains.", time: "Avg 4 min", icons:HiOutlineShieldCheck  },
              { tag: "DEPART · 04", title: "Take Off", desc: "Confirmed itinerary in your inbox. Boarding pass in your wallet. You're ready.", time: "Instant", icons:FaPaperPlane  },
            ].map(({ tag, title, desc, time,icons:Icon }) => (
              <div key={tag} className="flex flex-col justify-start items-start gap-6 relative group cursor-pointer hover:-translate-y-2 transition-all duration-300 ease-out">
                <div className="inline-flex justify-start items-start gap-4 w-full">
                  <div className="relative inline-flex flex-col justify-center items-center rounded-2xl w-14 h-14 bg-[linear-gradient(135deg,#051D8C_0%,#030E30_100%)] shadow-lg shadow-[#051D8C]/20 transition-all duration-300 group-hover:scale-110 group-hover:shadow-[#051D8C]/40 group-hover:-translate-y-1 z-10">
                      <Icon size={24} className="text-white transform transition-transform duration-300 group-hover:scale-110" />
                  </div>
                  <div className="flex-1 inline-flex flex-col justify-start items-start gap-1 pt-1">
                    <span className="text-[#051D8C] text-[10px] font-bold leading-[15px] tracking-[2px]">{tag}</span>
                    <span className="text-black text-xl font-['DM_Sans'] font-bold leading-7 group-hover:text-[#051D8C] transition-colors duration-300">{title}</span>
                  </div>
                </div>
                <div className="flex flex-col justify-between items-start bg-white rounded-2xl pt-5 pb-5 px-5 outline outline-1 outline-black/10 w-full min-h-[170px] shadow-sm transition-all duration-300 group-hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] group-hover:outline-black/20">
                  <p className="text-[#4F5661] text-sm font-normal leading-6 whitespace-pre-line">{desc}</p>
                  <div className="w-full inline-flex justify-between items-center pt-4 mt-4 border-t border-black/5">
                    <div className="inline-flex justify-start items-center gap-[6px]">
                      <GiJusticeStar size={12} className="text-[#051D8C] transition-transform duration-300 group-hover:rotate-180" />
                      <span className="text-[#4F5661] text-[10px] font-normal uppercase leading-[15px] tracking-[0.5px]">Est. time</span>
                    </div>
                    <span className="text-black text-xs font-bold leading-4 bg-[#F9FAFB] px-2 py-1 rounded-md">{time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── GLOBAL REACH SECTION ── */}
      <section className="w-full bg-white py-24">
        <div className="max-w-[1280px] mx-auto px-6 flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-20">
          
          {/* Left Text Content */}
          <div className="flex flex-col justify-start items-start gap-4 flex-1">
            <span className="text-[#8B929E] text-[13px] font-medium uppercase leading-5 tracking-[1.5px]">
              INTEGRATED NETWORK
            </span>
            <h2 className="text-black text-[40px] font-['DM_Sans'] font-bold leading-[48px] -tracking-[0.5px]">
              Global Reach, Local Support.
            </h2>
            <p className="text-[#64748B] text-[17px] font-normal leading-7 pt-1 max-w-[420px]">
              Direct API integrations with India's leading carriers and worldwide hospitality partners.
            </p>

            {/* Stats */}
            <div className="flex items-start gap-20 pt-8">
              <div className="inline-flex flex-col justify-start items-start gap-1">
                <div className="flex items-center">
                  <span className="text-black text-[40px] font-['DM_Sans'] font-bold leading-none">500</span>
                  <span className="text-[#051D8C] text-[40px] font-['DM_Sans'] font-bold leading-none">+</span>
                </div>
                <span className="text-[#8B929E] text-[13px] font-normal pt-2">Airlines worldwide</span>
              </div>
              <div className="inline-flex flex-col justify-start items-start gap-1">
                <div className="flex items-center">
                  <span className="text-black text-[40px] font-['DM_Sans'] font-bold leading-none">800K</span>
                  <span className="text-[#051D8C] text-[40px] font-['DM_Sans'] font-bold leading-none">+</span>
                </div>
                <span className="text-[#8B929E] text-[13px] font-normal pt-2">Properties globally</span>
              </div>
            </div>
          </div>

          {/* Right Partners Grid */}
          <div className="flex-1 w-full max-w-[580px] bg-white rounded-xl outline outline-1 outline-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden p-0.5">
            <div className="w-full bg-gray-100/80 grid grid-cols-2 gap-[1px] rounded-[10px] overflow-hidden">
              {[
                { name: "IndiGo", code: "6E", type: "airline" },
                { name: "Air India", code: "AI", type: "airline" },
                { name: "Vistara", code: "UK", type: "airline" },
                { name: "SpiceJet", code: "SG", type: "airline" },
                { name: "Taj Hotels", logo: "/Taj Hotels logo.svg", type: "hotel" },
                { name: "ITC Hotels", logo: "/ITC Hotels logo.svg", type: "hotel" },
                { name: "Marriott", logo: "/Marriott logo.svg", type: "hotel" },
                { name: "Hyatt", logo: "/Hyatt logo.svg", type: "hotel" }
              ].map(({ name, code, type, logo }) => {
                const logoUrl = type === "airline" 
                  ? airlineLogo(code) 
                  : logo;

                return (
                  <div key={name} className="flex justify-start items-center bg-white h-[88px] px-10 hover:bg-gray-50 transition-colors gap-4 cursor-pointer">
                    <div className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0 bg-white">
                      <img src={logoUrl} alt={name} className="w-full h-full object-contain mix-blend-multiply" />
                    </div>
                    <span className="text-[#1E293B] text-[15px] font-bold font-['DM_Sans']">{name}</span>
                  </div>
                );
              })}
            </div>
          </div>
          
        </div>
      </section>

      {/* ── SECURITY SECTION ── */}
      <section className="relative w-full overflow-hidden flex flex-col justify-center items-center bg-[linear-gradient(164deg,#051D8C_0%,#030E30_100%)] py-28">
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(90deg,rgba(0,0,0,0.05)_2%,transparent_2%),linear-gradient(180deg,rgba(0,0,0,0.05)_2%,transparent_2%)] pointer-events-none" />
        {/* Glow */}
        <div className="absolute rounded-full w-[514px] h-[514px] -right-32 -top-32 bg-white/5 blur-[40px] pointer-events-none" />

        <div className="max-w-[1280px] w-full mx-auto px-6 flex flex-col md:flex-row justify-between items-center relative z-10 gap-16">
          <div className="flex flex-col justify-start items-start gap-[15px] w-full md:max-w-[600px]">
            <span className="text-white/70 text-xs font-normal uppercase leading-4 tracking-[3px]">
              Security & Compliance
            </span>
            <h2 className="text-white text-5xl md:text-[48px] font-['DM_Sans'] font-bold leading-tight pb-1">
              Enterprise-Grade<br />Security.
            </h2>
            <p className="text-white/75 text-lg font-normal leading-relaxed pt-2">
              All {branding?.branding?.landingPageTitle || branding?.corporateName || "corporate"} travel data is encrypted and stored securely.<br className="hidden lg:block" />
              Detailed travel reports — by project and by date — are available<br className="hidden lg:block" />
              for the finance team at any time.
            </p>
            <div className="flex flex-wrap items-start gap-4 pt-6">
              {[
                { icon: <FiShield size={16} className="text-white" />, label: "Data Encrypted" },
                { icon: <FiLock size={16} className="text-white" />, label: "SOC 2 · ISO 27001" },
              ].map(({ icon, label }) => (
                <div key={label} className="inline-flex justify-start items-center rounded-xl px-4 py-3 bg-white/10 outline outline-1 outline-white/10 backdrop-blur-sm gap-3 shadow-lg">
                  {icon}
                  <span className="text-white text-sm font-medium leading-5">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Decorative circles */}
          <div className="relative w-[360px] h-[360px] flex-shrink-0 hidden md:flex items-center justify-center">
            {/* Concentric rings */}
            <div className="absolute inset-0 rounded-full border border-white/5" />
            <div className="absolute inset-[30px] rounded-full border border-white/10" />
            <div className="absolute inset-[60px] rounded-full border border-white/15" />
            <div className="absolute inset-[90px] rounded-full border border-white/20" />
            
            {/* Pulsing effect circle */}
            <div className="absolute inset-[90px] rounded-full bg-white/10 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" />
            <div className="absolute inset-[90px] rounded-full bg-white/10 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" style={{ animationDelay: '1.5s' }} />

            {/* Central glass box */}
            <div className="relative w-[100px] h-[100px] rounded-[25px] bg-white/10 outline outline-1 outline-white/20 backdrop-blur-md shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center justify-center z-10">
              <HiOutlineShieldCheck size={44} className="text-white" />
            </div>

            {/* Floating solid box */}
            <div className="absolute bottom-[44px] right-[44px] w-[68px] h-[68px] rounded-[20px] bg-white shadow-[0_20px_40px_rgba(0,0,0,0.25)] flex items-center justify-center z-20 hover:scale-105 transition-transform duration-300">
              <FiLock size={24} className="text-black" />
            </div>
          </div>
        </div>
      </section>

      {/* ── SUPPORT SECTION ── */}
      <section className="w-full bg-white py-24 pb-32">
        <div className="max-w-[1280px] mx-auto px-6 flex flex-col gap-12">
          <div className="flex flex-col justify-start items-start gap-3">
            <span className="text-[#4F5661] text-xs font-normal uppercase leading-4 tracking-[2.4px]">Support</span>
            <h2 className="text-black text-4xl font-['DM_Sans'] font-bold leading-10">Need Assistance?</h2>
            <p className="text-[#4F5661] text-base font-normal leading-6 pt-1 max-w-[448px]">
              Our team is ready to help — Monday to Saturday, 9 AM to 7 PM IST.
            </p>
          </div>

          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Help Center */}
            <div className="flex flex-col justify-start items-start rounded-2xl pt-6 pb-11 px-6 outline outline-1 outline-black/10 shadow-sm gap-1 hover:shadow-lg transition-shadow cursor-pointer bg-white group">
              <FiSearch size={24} className="text-black mb-5 group-hover:text-[#C9A84C] transition-colors" />
              <h3 className="text-black text-lg font-['DM_Sans'] font-bold leading-7">Help Center</h3>
              <p className="text-[#4F5661] text-sm font-normal leading-5">Step-by-step guides</p>
              <div className="inline-flex justify-start items-center gap-1.5 pt-5 group-hover:pl-1 transition-all">
                <span className="text-black text-sm font-bold leading-5 group-hover:text-[#C9A84C]">Browse</span>
                <FiArrowRight size={14} className="text-black group-hover:text-[#C9A84C]" />
              </div>
            </div>

            {/* Email Support */}
            <a 
              href={`mailto:${branding?.branding?.supportEmail || "support@traveamer.com"}`}
              className="flex flex-col justify-start items-start rounded-2xl pt-6 pb-11 px-6 outline outline-1 outline-black/10 shadow-sm gap-1 hover:shadow-lg transition-shadow cursor-pointer bg-white group no-underline"
            >
              <FiMail size={24} className="text-black mb-5 group-hover:text-[#C9A84C] transition-colors" />
              <h3 className="text-black text-lg font-['DM_Sans'] font-bold leading-7">Email Support</h3>
              <p className="text-[#4F5661] text-sm font-normal leading-5">
                {branding?.branding?.supportEmail || "support@traveamer.com"}
              </p>
              <div className="inline-flex justify-start items-center gap-1.5 pt-5 group-hover:pl-1 transition-all">
                <span className="text-black text-sm font-bold leading-5 group-hover:text-[#C9A84C]">Email us</span>
                <FiArrowRight size={14} className="text-black group-hover:text-[#C9A84C]" />
              </div>
            </a>

            {/* Phone Support */}
            <a 
              href={`tel:${branding?.branding?.supportPhone || "+91 12345 67890"}`}
              className="flex flex-col justify-start items-start rounded-2xl pt-6 pb-11 px-6 outline outline-1 outline-black/10 shadow-sm gap-1 hover:shadow-lg transition-shadow cursor-pointer bg-white group no-underline"
            >
              <FiPhone size={24} className="text-black mb-5 group-hover:text-[#C9A84C] transition-colors" />
              <h3 className="text-black text-lg font-['DM_Sans'] font-bold leading-7">Phone Support</h3>
              <p className="text-[#4F5661] text-sm font-normal leading-5">
                {branding?.branding?.supportPhone || "+91 12345 67890"}
              </p>
              <div className="inline-flex justify-start items-center gap-1.5 pt-5 group-hover:pl-1 transition-all">
                <span className="text-black text-sm font-bold leading-5 group-hover:text-[#C9A84C]">Call us</span>
                <FiArrowRight size={14} className="text-black group-hover:text-[#C9A84C]" />
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <LandingFooter />
    </div>
  );
}