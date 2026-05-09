import React from "react";
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
} from "react-icons/fi";
import LandingFooter from "../../../layout/LandingFooter";
import LandingHeader from "../../../layout/LandingHeader";


export default function CompanyLandingPage() {
  return (
    <div className="relative bg-white overflow-hidden" style={{ width: "100%", height: "100%" }}>

      {/* ── HEADER ── */}
      <LandingHeader />

      {/* ── HERO SECTION ── */}
      <div
        className="absolute overflow-hidden"
        style={{
          width: 1442,
          height: 730,
          left: -1,
          top: 80,
          background: "linear-gradient(348deg, #003399 0%, #000D26 100%)",
        }}
      >
        <div
          className="absolute inline-flex flex-col justify-start items-start"
          style={{
            width: 1280,
            height: 1034.5,
            maxWidth: 1280,
            paddingBottom: 112,
            paddingLeft: 24,
            paddingRight: 24,
            left: 81,
            top: 122,
          }}
        >
          {/* Top text block */}
          <div className="self-stretch inline-flex flex-col justify-start items-start" style={{ gap: 23.10 }}>

            {/* Version badge */}
            <div
              className="inline-flex justify-start items-center bg-white rounded-full"
              style={{
                paddingLeft: 12,
                paddingRight: 12,
                paddingTop: 6,
                paddingBottom: 6,
                outline: "1px rgba(0,0,0,0.10) solid",
                outlineOffset: "-1px",
                gap: 8,
              }}
            >
              <div className="rounded-full" style={{ width: 6, height: 6, background: "#00BC7D" }} />
              <span
                className="flex flex-col justify-center"
                style={{ color: "#4F5661", fontSize: 12, fontFamily: "Plus Jakarta Sans", fontWeight: 400, lineHeight: "16px" }}
              >
                Enterprise Travel Portal · v2.4
              </span>
            </div>

            {/* Headline */}
            <div className="self-stretch flex flex-col justify-start items-start" style={{ paddingTop: 0.9 }}>
              <div className="self-stretch flex flex-col justify-center">
                <span style={{ color: "white", fontSize: 60, fontFamily: "DM Sans", fontWeight: 700, lineHeight: "63px", wordWrap: "break-word" }}>Welcome to the<br /></span>
                <span style={{ color: "#C9A240", fontSize: 60, fontFamily: "DM Sans", fontWeight: 700, lineHeight: "63px", wordWrap: "break-word" }}>Nexus Systems<br /></span>
                <span style={{ color: "white", fontSize: 60, fontFamily: "DM Sans", fontWeight: 700, lineHeight: "63px", wordWrap: "break-word" }}>Travel Portal.</span>
              </div>
            </div>

            {/* Subtitle */}
            <div className="flex flex-col justify-start items-start" style={{ width: 576, maxWidth: 576 }}>
              <span
                className="flex flex-col justify-center text-white"
                style={{ fontSize: 18, fontFamily: "Plus Jakarta Sans", fontWeight: 400, lineHeight: "29.25px" }}
              >
                Book, manage, and track your business travel with integrated approval<br />workflows and project-linked expenses.
              </span>
            </div>

            {/* Trust badges */}
            <div className="self-stretch inline-flex justify-start items-center" style={{ paddingTop: 24.9, gap: 32 }}>
              {[
                { icon: <FiLock size={16} color="white" />, label: "SOC 2 Type II" },
                { icon: <FiShield size={16} color="white" />, label: "AES-256 Encrypted" },
                { icon: <FiKey size={16} color="white" />, label: "SSO Enabled" },
              ].map(({ icon, label }) => (
                <div key={label} className="inline-flex justify-start items-center" style={{ gap: 8 }}>
                  {icon}
                  <span
                    className="flex flex-col justify-center text-white"
                    style={{ fontSize: 12, fontFamily: "Plus Jakarta Sans", fontWeight: 400, lineHeight: "16px" }}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Login Card ── */}
          <div
            className="relative bg-white overflow-hidden"
            style={{
              width: 603.79,
              height: 444,
              borderRadius: 18.87,
              outline: "1.18px rgba(0,0,0,0.05) solid",
              outlineOffset: "-1.18px",
            }}
          >
            {/* Right sign-in panel */}
            <div
              className="absolute inline-flex flex-col justify-start items-start"
              style={{
                width: 348,
                height: 444,
                paddingTop: 33.02,
                paddingBottom: 69.58,
                paddingLeft: 33.02,
                paddingRight: 33.02,
                left: 255,
                top: 1,
                gap: 27.71,
              }}
            >
              <div className="self-stretch inline-flex justify-between items-start">
                <div className="inline-flex flex-col justify-start items-start" style={{ gap: 4.72 }}>
                  <span
                    className="self-stretch flex flex-col justify-center"
                    style={{ color: "#4F5661", fontSize: 11.79, fontFamily: "Plus Jakarta Sans", fontWeight: 400, lineHeight: "17.69px", letterSpacing: 2.95 }}
                  >
                    AUTHENTICATION
                  </span>
                  <span
                    className="self-stretch flex flex-col justify-center"
                    style={{ color: "black", fontSize: 28.3, fontFamily: "DM Sans", fontWeight: 700, lineHeight: "37.74px" }}
                  >
                    Sign In
                  </span>
                </div>
                <div
                  className="inline-flex flex-col justify-start items-start rounded-full"
                  style={{
                    width: 33.02,
                    height: 33.02,
                    outline: "1.18px rgba(0,0,0,0.10) solid",
                    outlineOffset: "-1.18px",
                  }}
                >
                  <div className="relative overflow-hidden" style={{ width: 16.51, height: 16.51 }}>
                    <div className="absolute" style={{ width: 8.25, height: 8.25, left: 4.13, top: 4.13, outline: "1.38px #4F5661 solid", outlineOffset: "-0.69px" }} />
                  </div>
                </div>
              </div>

              <div className="self-stretch" style={{ height: 1.18, borderTop: "1.18px rgba(0,0,0,0.06) solid" }} />

              <div className="self-stretch flex flex-col justify-start items-start" style={{ gap: 3.83 }}>
                <span
                  className="self-stretch flex flex-col justify-center"
                  style={{ color: "black", fontSize: 18.87, fontFamily: "DM Sans", fontWeight: 700, lineHeight: "28.3px" }}
                >
                  Access your Nexus travel desk
                </span>
                <span
                  className="self-stretch flex flex-col justify-center"
                  style={{ color: "#4F5661", fontSize: 14.15, fontFamily: "Plus Jakarta Sans", fontWeight: 400, lineHeight: "23px", paddingBottom: 0.88 }}
                >
                  Continue with your Nexus identity provider to securely sign in.
                </span>
              </div>

              {/* SSO Provider buttons */}
              <div className="self-stretch inline-flex justify-center items-center" style={{ gap: 14.15 }}>
                {/* Google */}
                <div
                  className="bg-white inline-flex flex-col justify-start items-start"
                  style={{ width: 66.04, height: 66.04, borderRadius: 14.15, outline: "1.18px rgba(0,0,0,0.10) solid", outlineOffset: "-1.18px" }}
                >
                  <div className="relative overflow-hidden" style={{ width: 23.59, height: 23.59 }}>
                    <div className="absolute" style={{ width: 11.3, height: 10.91, left: 11.79, top: 9.83, background: "#4285F4" }} />
                    <div className="absolute" style={{ width: 18.18, height: 9.34, left: 1.38, top: 14.25, background: "#34A853" }} />
                    <div className="absolute" style={{ width: 5.41, height: 10.81, left: 0, top: 6.39, background: "#FE7B02" }} />
                    <div className="absolute" style={{ width: 18.18, height: 9.34, left: 1.38, top: 0, background: "#FE3F21" }} />
                  </div>
                </div>
                {/* Microsoft */}
                <div
                  className="bg-white inline-flex flex-col justify-start items-start"
                  style={{ width: 66.04, height: 66.04, borderRadius: 14.15, outline: "1.18px rgba(0,0,0,0.10) solid", outlineOffset: "-1.18px" }}
                >
                  <div className="relative overflow-hidden" style={{ width: 23.59, height: 23.59 }}>
                    <div className="absolute" style={{ width: 11.2, height: 11.2, left: 0, top: 0, background: "#F25022" }} />
                    <div className="absolute" style={{ width: 11.2, height: 11.2, left: 12.38, top: 0, background: "#7FBA00" }} />
                    <div className="absolute" style={{ width: 11.2, height: 11.2, left: 0, top: 12.38, background: "#00A4EF" }} />
                    <div className="absolute" style={{ width: 11.2, height: 11.2, left: 12.38, top: 12.38, background: "#FE7B02" }} />
                  </div>
                </div>
                {/* SAP */}
                <div
                  className="bg-white inline-flex flex-col justify-center items-center"
                  style={{ width: 66, height: 65, borderRadius: 14.15, outline: "1.18px rgba(0,0,0,0.10) solid", outlineOffset: "-1.18px" }}
                >
                  <div className="relative overflow-hidden" style={{ width: 48, height: 21 }}>
                    <div className="absolute" style={{ width: 16.17, height: 16.09, left: 11.32, top: 0.38, background: "#089949" }} />
                    <div className="absolute" style={{ width: 13.54, height: 13.48, left: 34.13, top: 3, background: "#F9B21D" }} />
                    <div className="absolute" style={{ width: 14.75, height: 14.67, left: 0.34, top: 1.8, background: "#E42527" }} />
                    <div className="absolute" style={{ width: 12.96, height: 9.03, left: 23.27, top: 1.98, background: "#226DB4" }} />
                    <div className="absolute" style={{ width: 13.47, height: 11.94, left: 24.37, top: 4.53, background: "#226DB4" }} />
                    <div className="absolute" style={{ width: 1.89, height: 2.36, left: 14.84, top: 18.23, background: "black" }} />
                    <div className="absolute" style={{ width: 2.44, height: 2.43, left: 19.75, top: 18.19, background: "black" }} />
                    <div className="absolute" style={{ width: 2.05, height: 2.36, left: 25.43, top: 18.23, background: "black" }} />
                    <div className="absolute" style={{ width: 2.44, height: 2.43, left: 30.72, top: 18.19, background: "black" }} />
                  </div>
                </div>
              </div>

              {/* SSO note */}
              <div className="self-stretch inline-flex justify-center items-center" style={{ gap: 9.43 }}>
                <FiLock size={16} color="#051D8C" />
                <span
                  className="text-center flex flex-col justify-center"
                  style={{ color: "#4F5661", fontSize: 12.97, fontFamily: "Plus Jakarta Sans", fontWeight: 400, lineHeight: "19.46px" }}
                >
                  Secure SSO via your Nexus identity provider
                </span>
              </div>
            </div>

            {/* Left blue panel */}
            <div
              className="absolute overflow-hidden"
              style={{
                width: 262.98,
                height: 444.59,
                left: 0,
                top: 0,
                background: "linear-gradient(119deg, #051D8C 0%, #030E30 100%)",
              }}
            >
              {/* Grid overlay */}
              <div
                className="absolute"
                style={{
                  width: 262.98,
                  height: 409.21,
                  left: 0,
                  top: 35.38,
                  opacity: 0.15,
                  background:
                    "linear-gradient(90deg, rgba(0,0,0,0.05) 2%, rgba(0,0,0,0) 2%), linear-gradient(180deg, rgba(0,0,0,0.05) 2%, rgba(0,0,0,0) 2%)",
                }}
              />
              {/* Glow circle */}
              <div
                className="absolute rounded-full"
                style={{
                  width: 226.42,
                  height: 226.42,
                  left: -47.17,
                  top: 293.64,
                  background: "rgba(255,255,255,0.06)",
                  boxShadow: "47.17px 47.17px 47.17px",
                  filter: "blur(23.59px)",
                }}
              />

              {/* Left panel content */}
              <div
                className="absolute inline-flex flex-col justify-start items-start"
                style={{ width: 206.37, paddingTop: 7.67, left: 28.3, top: 28.3, gap: 12.97 }}
              >
                {/* Top label */}
                <div className="inline-flex justify-start items-center" style={{ paddingBottom: 13.56, opacity: 0.8, gap: 9.43 }}>
                  <div className="rounded-full" style={{ width: 7.08, height: 7.08, background: "#00D492" }} />
                  <span
                    className="flex flex-col justify-center text-white"
                    style={{ fontSize: 11.79, fontFamily: "Plus Jakarta Sans", fontWeight: 400, lineHeight: "17.69px", letterSpacing: 2.95 }}
                  >
                    NEXUS · v2.4
                  </span>
                </div>

                {/* Welcome pill */}
                <div
                  className="inline-flex justify-start items-center rounded-full"
                  style={{
                    paddingLeft: 11.79,
                    paddingRight: 11.79,
                    paddingTop: 4.72,
                    paddingBottom: 4.72,
                    background: "rgba(255,255,255,0.15)",
                    backdropFilter: "blur(4.72px)",
                    gap: 7.08,
                  }}
                >
                  <FiMonitor size={14} color="white" />
                  <span
                    className="flex flex-col justify-center text-white"
                    style={{ fontSize: 11.79, fontFamily: "Plus Jakarta Sans", fontWeight: 700, lineHeight: "17.69px", letterSpacing: 0.59 }}
                  >
                    WELCOME
                  </span>
                </div>

                {/* Tagline */}
                <div className="self-stretch flex flex-col justify-start items-start" style={{ paddingTop: 12.38 }}>
                  <span
                    className="self-stretch flex flex-col justify-center text-white"
                    style={{ fontSize: 28.3, fontFamily: "DM Sans", fontWeight: 700, lineHeight: "35.38px" }}
                  >
                    Corporate<br />Travel,<br />Reimagined.
                  </span>
                </div>

                <div className="self-stretch flex flex-col justify-start items-start">
                  <span
                    className="self-stretch flex flex-col justify-center"
                    style={{ color: "rgba(255,255,255,0.70)", fontSize: 14.15, fontFamily: "Plus Jakarta Sans", fontWeight: 400, lineHeight: "23px" }}
                  >
                    Join 5,000+ Nexus teams<br />managing smarter business<br />travel.
                  </span>
                </div>
              </div>

              {/* Stats row */}
              <div
                className="absolute inline-flex items-center"
                style={{ left: 18.87, top: 345.53, gap: 5.9 }}
              >
                {[
                  { value: "30%", label: "Saved", width: 63.68 },
                  { value: "24/7", label: "Support", width: 74.29 },
                  { value: "500+", label: "Airlines", width: 75.47 },
                ].map(({ value, label, width }) => (
                  <div
                    key={label}
                    className="inline-flex flex-col justify-start items-start"
                    style={{
                      width,
                      padding: 9.43,
                      background: "rgba(255,255,255,0.08)",
                      borderRadius: 9.43,
                      outline: "1.18px rgba(255,255,255,0.10) solid",
                      outlineOffset: "-1.18px",
                      backdropFilter: "blur(4.72px)",
                      gap: 1.18,
                    }}
                  >
                    <span
                      className="self-stretch flex flex-col justify-center text-white"
                      style={{ fontSize: 16.51, fontFamily: "DM Sans", fontWeight: 700, lineHeight: "23.59px" }}
                    >
                      {value}
                    </span>
                    <span
                      className="self-stretch flex flex-col justify-center text-white"
                      style={{ fontSize: 10.61, fontFamily: "Plus Jakarta Sans", fontWeight: 400, textTransform: "uppercase", lineHeight: "15.92px", letterSpacing: 0.53, opacity: 0.7 }}
                    >
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── CANCEL / RESCHEDULE SECTION ── */}
      <div className="absolute" style={{ width: 1340, height: 797, left: 50, top: 908 }}>

        {/* Section header */}
        <div
          className="absolute inline-flex justify-between items-end flex-wrap"
          style={{ width: 1340, height: 132, left: 0, top: 0, alignContent: "flex-end" }}
        >
          <div className="inline-flex flex-col justify-start items-start" style={{ maxWidth: 576, gap: 12 }}>
            <span
              className="self-stretch flex flex-col justify-center"
              style={{ color: "#4F5661", fontSize: 12, fontFamily: "Plus Jakarta Sans", fontWeight: 400, textTransform: "uppercase", lineHeight: "16px", letterSpacing: 2.4 }}
            >
              Plans Change. We Adapt.
            </span>
            <span
              className="self-stretch flex flex-col justify-center"
              style={{ color: "black", fontSize: 36, fontFamily: "DM Sans", fontWeight: 700, lineHeight: "40px" }}
            >
              Cancel or reschedule, in one click.
            </span>
            <div className="self-stretch flex flex-col justify-start items-start" style={{ paddingTop: 4 }}>
              <span
                className="self-stretch flex flex-col justify-center"
                style={{ color: "#4F5661", fontSize: 16, fontFamily: "Plus Jakarta Sans", fontWeight: 400, lineHeight: "24px" }}
              >
                Modify any confirmed booking instantly. Refunds route back to your project wallet<br />automatically.
              </span>
            </div>
          </div>
          <div
            className="inline-flex justify-start items-center bg-white rounded-full"
            style={{
              paddingLeft: 16,
              paddingRight: 16,
              paddingTop: 8,
              paddingBottom: 8,
              outline: "1px rgba(0,0,0,0.10) solid",
              outlineOffset: "-1px",
              gap: 8,
            }}
          >
            <div className="rounded-full" style={{ width: 6, height: 6, background: "#00BC7D" }} />
            <span className="flex flex-col justify-center" style={{ color: "black", fontSize: 12, fontFamily: "Plus Jakarta Sans", fontWeight: 400, lineHeight: "16px" }}>Avg. processing ·</span>
            <span className="flex flex-col justify-center" style={{ color: "black", fontSize: 12, fontFamily: "Plus Jakarta Sans", fontWeight: 700, lineHeight: "16px" }}>2 min 14 sec</span>
          </div>
        </div>

        {/* Cards column */}
        <div
          className="absolute inline-flex flex-col justify-start items-start"
          style={{ width: 1340, height: 521, left: 0, top: 180 }}
        >
          <div className="self-stretch flex flex-col justify-start items-start" style={{ height: 521 }}>

            {/* Auto-refund card */}
            <div
              className="self-stretch inline-flex flex-col justify-between items-start bg-white rounded-2xl"
              style={{ padding: 24, outline: "1px rgba(0,0,0,0.08) solid", outlineOffset: "-1px" }}
            >
              <div className="self-stretch inline-flex justify-between items-center">
                <div className="inline-flex justify-start items-center" style={{ gap: 8 }}>
                  <FiCreditCard size={16} color="#4F5661" />
                  <span style={{ color: "#4F5661", fontSize: 12, fontFamily: "Plus Jakarta Sans", fontWeight: 400, lineHeight: "16px", letterSpacing: 0.6 }}>AUTO-REFUND</span>
                </div>
                <div
                  className="inline-flex flex-col justify-start items-start rounded-full"
                  style={{ paddingLeft: 8, paddingRight: 8, paddingTop: 4, paddingBottom: 4, background: "#ECFDF5" }}
                >
                  <span style={{ color: "#007A55", fontSize: 10, fontFamily: "Plus Jakarta Sans", fontWeight: 700, lineHeight: "15px" }}>INSTANT</span>
                </div>
              </div>
              <div className="self-stretch flex flex-col justify-start items-start" style={{ paddingTop: 16 }}>
                <div className="self-stretch flex flex-col justify-start items-start" style={{ gap: 4 }}>
                  <span className="self-stretch flex flex-col justify-center" style={{ color: "black", fontSize: 30, fontFamily: "DM Sans", fontWeight: 700, lineHeight: "36px" }}>₹ 8,420</span>
                  <span className="self-stretch flex flex-col justify-center" style={{ color: "#4F5661", fontSize: 12, fontFamily: "Plus Jakarta Sans", fontWeight: 400, lineHeight: "16px" }}>Credited to NX-4471 wallet within 60 seconds.</span>
                </div>
              </div>
              <div className="self-stretch flex flex-col justify-start items-start" style={{ height: 22, paddingTop: 16 }}>
                <div className="self-stretch relative overflow-hidden rounded-full" style={{ height: 6, background: "rgba(0,0,0,0.05)" }}>
                  <div
                    className="absolute rounded-full"
                    style={{ width: 334.14, height: 6, left: 0, top: 0, background: "linear-gradient(179deg, #051D8C 0%, #030E30 100%)" }}
                  />
                </div>
              </div>
            </div>

            {/* Suggested Reschedule card */}
            <div
              className="self-stretch inline-flex flex-col justify-start items-start bg-white rounded-2xl"
              style={{
                paddingTop: 25,
                paddingBottom: 52.5,
                paddingLeft: 24,
                paddingRight: 24,
                outline: "1px rgba(0,0,0,0.08) solid",
                outlineOffset: "-1px",
                gap: 23,
              }}
            >
              <div className="inline-flex justify-start items-center" style={{ gap: 8 }}>
                <FiRefreshCw size={16} color="#4F5661" />
                <span style={{ color: "#4F5661", fontSize: 12, fontFamily: "Plus Jakarta Sans", fontWeight: 400, lineHeight: "16px", letterSpacing: 0.6 }}>SUGGESTED RESCHEDULE</span>
              </div>
              <div className="self-stretch flex flex-col justify-start items-start" style={{ gap: 8 }}>
                {[
                  { flight: "6E 2148", time: "Wed · 08:10", price: "₹ +0" },
                  { flight: "AI 503", time: "Wed · 14:25", price: "₹ +320" },
                  { flight: "UK 845", time: "Thu · 06:55", price: "₹ -180" },
                ].map(({ flight, time, price }) => (
                  <div
                    key={flight}
                    className="self-stretch inline-flex justify-between items-center rounded-lg"
                    style={{ paddingTop: 10, paddingBottom: 10, paddingLeft: 12, paddingRight: 12 }}
                  >
                    <span className="text-center flex flex-col justify-center" style={{ color: "black", fontSize: 12, fontFamily: "Plus Jakarta Sans", fontWeight: 700, lineHeight: "16px" }}>{flight}</span>
                    <span className="text-center flex flex-col justify-center" style={{ color: "#4F5661", fontSize: 12, fontFamily: "Plus Jakarta Sans", fontWeight: 400, lineHeight: "16px" }}>{time}</span>
                    <span className="text-center flex flex-col justify-center" style={{ color: "#051D8C", fontSize: 12, fontFamily: "Plus Jakarta Sans", fontWeight: 700, lineHeight: "16px" }}>{price}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* How it works – dark card */}
          <div
            className="self-stretch relative overflow-hidden inline-flex flex-col justify-start items-start rounded-2xl"
            style={{
              padding: 32,
              background: "linear-gradient(144deg, #051D8C 0%, #030E30 100%)",
              boxShadow: "0px 10px 30px -10px rgba(5,29,140,0.35)",
              gap: 8,
            }}
          >
            {/* Grid bg */}
            <div
              className="absolute"
              style={{
                width: 793.59,
                height: 519,
                left: 0,
                top: 0,
                opacity: 0.1,
                background: "linear-gradient(90deg, rgba(0,0,0,0.05) 2%, rgba(0,0,0,0) 2%), linear-gradient(180deg, rgba(0,0,0,0.05) 2%, rgba(0,0,0,0) 2%)",
              }}
            />
            {/* Glow */}
            <div
              className="absolute rounded-full"
              style={{ width: 288, height: 288, left: 601.59, top: -96, background: "rgba(255,255,255,0.05)", filter: "blur(32px)" }}
            />

            <div className="self-stretch inline-flex justify-between items-center">
              <div className="inline-flex justify-start items-center" style={{ opacity: 0.8, gap: 8 }}>
                <FiFileText size={14} color="white" />
                <span style={{ color: "white", fontSize: 10, fontFamily: "Plus Jakarta Sans", fontWeight: 400, lineHeight: "15px", letterSpacing: 2.5 }}>HOW IT WORKS · 4 STEPS</span>
              </div>
              <div
                className="inline-flex flex-col justify-start items-start rounded-full"
                style={{ paddingLeft: 10, paddingRight: 10, paddingTop: 4, paddingBottom: 4, background: "rgba(0,212,146,0.20)" }}
              >
                <span style={{ color: "#A4F4CF", fontSize: 10, fontFamily: "Plus Jakarta Sans", fontWeight: 700, lineHeight: "15px" }}>UNDER 3 MIN</span>
              </div>
            </div>

            <div className="self-stretch flex flex-col justify-start items-start" style={{ paddingTop: 16 }}>
              <span className="self-stretch flex flex-col justify-center text-white" style={{ fontSize: 24, fontFamily: "DM Sans", fontWeight: 700, lineHeight: "32px" }}>Cancel or reschedule, step by step.</span>
            </div>
            <div style={{ width: 448, maxWidth: 448 }} className="flex flex-col justify-start items-start">
              <span className="flex flex-col justify-center" style={{ color: "rgba(255,255,255,0.70)", fontSize: 14, fontFamily: "Plus Jakarta Sans", fontWeight: 400, lineHeight: "20px" }}>A guided flow — no support tickets, no waiting on email approvals.</span>
            </div>

            <div className="self-stretch flex flex-col justify-start items-start" style={{ paddingTop: 24, gap: 20 }}>
              {[
                { step: "STEP 01", title: "Open the trip", desc: "Go to My Trips and pick the booking you want to change or cancel." },
                { step: "STEP 02", title: "Choose an action", desc: "Select Reschedule, Modify, or Cancel — fare rules and penalties show upfront." },
                { step: "STEP 03", title: "Auto-approval", desc: "Within policy? It clears instantly. Out of policy? One-tap manager approval is requested." },
                { step: "STEP 04", title: "Confirmation & refund", desc: "New itinerary lands in your inbox. Refunds route back to your project wallet automatically." },
              ].map(({ step, title, desc }) => (
                <div key={step} className="self-stretch inline-flex justify-start items-start" style={{ gap: 16 }}>
                  <div
                    className="inline-flex flex-col justify-start items-start rounded-xl"
                    style={{
                      width: 40,
                      height: 40,
                      background: "rgba(255,255,255,0.10)",
                      outline: "1px rgba(255,255,255,0.15) solid",
                      outlineOffset: "-1px",
                      backdropFilter: "blur(4px)",
                    }}
                  >
                    <FiFileText size={16} color="white" />
                  </div>
                  <div className="flex-1 self-stretch inline-flex flex-col justify-start items-start" style={{ gap: 2 }}>
                    <span className="self-stretch flex flex-col justify-center" style={{ color: "rgba(255,255,255,0.50)", fontSize: 10, fontFamily: "Plus Jakarta Sans", fontWeight: 700, lineHeight: "15px", letterSpacing: 2 }}>{step}</span>
                    <span className="self-stretch flex flex-col justify-center text-white" style={{ fontSize: 16, fontFamily: "DM Sans", fontWeight: 700, lineHeight: "24px" }}>{title}</span>
                    <span className="self-stretch flex flex-col justify-center" style={{ color: "rgba(255,255,255,0.70)", fontSize: 12, fontFamily: "Plus Jakarta Sans", fontWeight: 400, lineHeight: "19.5px", paddingTop: 1 }}>{desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── HOW IT WORKS (IT OPS) SECTION ── */}
      <div
        className="absolute inline-flex flex-col justify-start items-start"
        style={{ width: 1280, maxWidth: 1280, paddingLeft: 24, paddingRight: 24, left: 80, top: 1741, gap: 48 }}
      >
        <div className="flex flex-col justify-start items-start" style={{ width: 672, maxWidth: 672, gap: 12 }}>
          <span className="self-stretch flex flex-col justify-center" style={{ color: "#4F5661", fontSize: 12, fontFamily: "Plus Jakarta Sans", fontWeight: 400, textTransform: "uppercase", lineHeight: "16px", letterSpacing: 2.4 }}>How it works</span>
          <span className="self-stretch flex flex-col justify-center" style={{ color: "black", fontSize: 36, fontFamily: "DM Sans", fontWeight: 700, lineHeight: "40px" }}>Streamlined for IT Operations.</span>
          <div className="self-stretch flex flex-col justify-start items-start" style={{ paddingTop: 4 }}>
            <span className="self-stretch flex flex-col justify-center" style={{ color: "#4F5661", fontSize: 16, fontFamily: "Plus Jakarta Sans", fontWeight: 400, lineHeight: "24px" }}>Four steps. Zero friction. Every rupee allocated.</span>
          </div>
        </div>

        <div className="self-stretch relative flex flex-col justify-start items-start" style={{ paddingTop: 32 }}>
          <div className="self-stretch inline-flex flex-col justify-start items-start">
            {[
              { tag: "DISCOVER · 01", title: "Search & Plan", desc: "Search across 500+ airlines and 800K+ properties using your project context.", time: "30 sec" },
              { tag: "REQUEST · 02", title: "Tag & Submit", desc: "Attach your Project Cost ID — every\nrupee allocated to the right client\nengagement.", time: "1 min" },
              { tag: "APPROVE · 03", title: "One-Click Verify", desc: "Your Travel Admin or Manager\napproves directly inside the portal — no email chains.", time: "Avg 4 min" },
              { tag: "DEPART · 04", title: "Take Off", desc: "Confirmed itinerary in your inbox.\nBoarding pass in your wallet. You're\nready.", time: "Instant" },
            ].map(({ tag, title, desc, time }, i) => (
              <div key={tag} className="self-stretch inline-flex flex-col justify-start items-start" style={{ gap: 24, marginBottom: i < 3 ? 24 : 0 }}>
                <div className="self-stretch inline-flex justify-start items-start" style={{ gap: 16 }}>
                  <div
                    className="relative inline-flex flex-col justify-start items-start rounded-2xl"
                    style={{
                      width: 56,
                      height: 56,
                      background: "linear-gradient(135deg, #051D8C 0%, #030E30 100%)",
                      boxShadow: "0px 10px 30px -10px rgba(5,29,140,0.35)",
                    }}
                  >
                    <FiSearch size={20} color="white" />
                  </div>
                  <div className="flex-1 inline-flex flex-col justify-start items-start" style={{ gap: 4 }}>
                    <span className="self-stretch flex flex-col justify-center" style={{ color: "#051D8C", fontSize: 10, fontFamily: "Plus Jakarta Sans", fontWeight: 700, lineHeight: "15px", letterSpacing: 2 }}>{tag}</span>
                    <span className="self-stretch flex flex-col justify-center" style={{ color: "black", fontSize: 20, fontFamily: "DM Sans", fontWeight: 700, lineHeight: "28px" }}>{title}</span>
                  </div>
                </div>
                <div
                  className="self-stretch flex flex-col justify-start items-start bg-white rounded-2xl"
                  style={{ paddingTop: 19.38, paddingBottom: 20, paddingLeft: 20, paddingRight: 20, outline: "1px rgba(0,0,0,0.08) solid", outlineOffset: "-1px", gap: 16 }}
                >
                  <span className="self-stretch flex flex-col justify-center" style={{ color: "#4F5661", fontSize: 14, fontFamily: "Plus Jakarta Sans", fontWeight: 400, lineHeight: "22.75px", whiteSpace: "pre-line" }}>{desc}</span>
                  <div className="self-stretch inline-flex justify-between items-center" style={{ paddingTop: 16, borderTop: "1px rgba(0,0,0,0.06) solid" }}>
                    <div className="inline-flex justify-start items-center" style={{ gap: 6 }}>
                      <FiMonitor size={12} color="#051D8C" />
                      <span className="flex flex-col justify-center" style={{ color: "#4F5661", fontSize: 10, fontFamily: "Plus Jakarta Sans", fontWeight: 400, textTransform: "uppercase", lineHeight: "15px", letterSpacing: 0.5 }}>Est. time</span>
                    </div>
                    <span className="flex flex-col justify-center" style={{ color: "black", fontSize: 12, fontFamily: "Plus Jakarta Sans", fontWeight: 700, lineHeight: "16px" }}>{time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── GLOBAL REACH SECTION ── */}
      <div
        className="absolute inline-flex flex-col justify-start items-start"
        style={{ width: 1232, height: 405, left: 104, top: 2287 }}
      >
        <div className="self-stretch inline-flex flex-col justify-start items-start" style={{ gap: 12 }}>
          <span className="self-stretch flex flex-col justify-center" style={{ color: "#4F5661", fontSize: 12, fontFamily: "Plus Jakarta Sans", fontWeight: 400, textTransform: "uppercase", lineHeight: "16px", letterSpacing: 2.4 }}>Integrated Network</span>
          <span className="self-stretch flex flex-col justify-center" style={{ color: "black", fontSize: 36, fontFamily: "DM Sans", fontWeight: 700, lineHeight: "40px" }}>Global Reach, Local Support.</span>
          <div style={{ width: 448, maxWidth: 448, paddingTop: 4 }} className="flex flex-col justify-start items-start">
            <span className="flex flex-col justify-center" style={{ color: "#4F5661", fontSize: 16, fontFamily: "Plus Jakarta Sans", fontWeight: 400, lineHeight: "24px" }}>Direct API integrations with India's leading carriers and<br />worldwide hospitality partners.</span>
          </div>

          {/* Stats */}
          <div className="self-stretch inline-flex flex-col justify-start items-start" style={{ height: 92, paddingTop: 28 }}>
            {[
              { num: "500", plus: "+", label: "Airlines worldwide" },
              { num: "800K", plus: "+", label: "Properties globally" },
            ].map(({ num, plus, label }) => (
              <div key={label} className="self-stretch inline-flex flex-col justify-start items-start" style={{ gap: 4 }}>
                <div className="self-stretch flex flex-col justify-center">
                  <span style={{ color: "black", fontSize: 36, fontFamily: "DM Sans", fontWeight: 700, lineHeight: "40px", display: "inline" }}>{num}</span>
                  <span style={{ color: "#051D8C", fontSize: 36, fontFamily: "DM Sans", fontWeight: 700, lineHeight: "40px", display: "inline" }}>{plus}</span>
                </div>
                <span className="self-stretch flex flex-col justify-center" style={{ color: "#4F5661", fontSize: 14, fontFamily: "Plus Jakarta Sans", fontWeight: 400, lineHeight: "20px" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Partners list */}
        <div
          className="self-stretch inline-flex flex-col justify-start items-start bg-white rounded-2xl"
          style={{ padding: 8, outline: "1px rgba(0,0,0,0.08) solid", outlineOffset: "-1px" }}
        >
          <div
            className="self-stretch overflow-hidden rounded-xl inline-flex flex-col justify-start items-start"
            style={{ height: 387, background: "rgba(0,0,0,0.06)" }}
          >
            {["IndiGo", "Air India", "Vistara", "SpiceJet", "Taj Hotels", "ITC Hotels", "Marriott", "Hyatt"].map((name) => (
              <div
                key={name}
                className="self-stretch inline-flex justify-center items-center bg-white"
                style={{ height: 96, paddingLeft: 16, paddingRight: 16, opacity: 0.8, gap: 12 }}
              >
                <img src="https://placehold.co/28x28" alt={name} style={{ width: 28, height: 28 }} />
                <span className="flex flex-col justify-center" style={{ color: "black", fontSize: 14, fontFamily: "DM Sans", fontWeight: 700, lineHeight: "20px" }}>{name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── SECURITY SECTION ── */}
      <div
        className="absolute overflow-hidden inline-flex flex-col justify-center items-center"
        style={{
          width: 1440,
          height: 491,
          left: 0,
          top: 2789,
          background: "linear-gradient(164deg, #051D8C 0%, #030E30 100%)",
        }}
      >
        {/* Grid overlay */}
        <div
          className="absolute"
          style={{
            width: 1440,
            height: 490.53,
            left: 0,
            top: 0,
            opacity: 0.08,
            background: "linear-gradient(90deg, rgba(0,0,0,0.05) 2%, rgba(0,0,0,0) 2%), linear-gradient(180deg, rgba(0,0,0,0.05) 2%, rgba(0,0,0,0) 2%)",
          }}
        />
        {/* Glow */}
        <div
          className="absolute rounded-full"
          style={{ width: 514, height: 514, left: 1043, top: -84, background: "rgba(255,255,255,0.04)", filter: "blur(32px)" }}
        />

        <div
          className="inline-flex flex-col justify-start items-start"
          style={{
            width: 1280,
            height: 554.53,
            maxWidth: 1280,
            paddingLeft: 24,
            paddingRight: 24,
            paddingTop: 112,
            paddingBottom: 112,
          }}
        >
          <div className="self-stretch inline-flex flex-col justify-start items-start" style={{ gap: 15.2 }}>
            <span
              className="self-stretch flex flex-col justify-center text-white"
              style={{ opacity: 0.7, fontSize: 12, fontFamily: "Plus Jakarta Sans", fontWeight: 400, textTransform: "uppercase", lineHeight: "16px", letterSpacing: 3 }}
            >
              Security &amp; Compliance
            </span>
            <div className="self-stretch flex flex-col justify-start items-start" style={{ paddingBottom: 0.58 }}>
              <span className="self-stretch flex flex-col justify-center text-white" style={{ fontSize: 48, fontFamily: "DM Sans", fontWeight: 700, lineHeight: "50.4px" }}>Enterprise-Grade<br />Security.</span>
            </div>
            <div style={{ width: 512, maxWidth: 512, paddingTop: 8.05 }} className="flex flex-col justify-start items-start">
              <span className="flex flex-col justify-center" style={{ color: "rgba(255,255,255,0.75)", fontSize: 18, fontFamily: "Plus Jakarta Sans", fontWeight: 400, lineHeight: "29.25px" }}>
                All Nexus Systems travel data is encrypted and stored securely.<br />
                Detailed travel reports — by project and by date — are available<br />
                for the finance team at any time.
              </span>
            </div>
            <div className="self-stretch inline-flex justify-start items-start flex-wrap" style={{ paddingTop: 24.8, gap: 16 }}>
              {[
                { icon: <FiShield size={16} color="white" />, label: "Data Encrypted" },
                { icon: <FiLock size={16} color="white" />, label: "SOC 2 · ISO 27001" },
              ].map(({ icon, label }) => (
                <div
                  key={label}
                  className="self-stretch inline-flex justify-start items-center rounded-xl"
                  style={{
                    paddingLeft: 16,
                    paddingRight: 16,
                    paddingTop: 12,
                    paddingBottom: 12,
                    background: "rgba(255,255,255,0.08)",
                    outline: "1px rgba(255,255,255,0.10) solid",
                    outlineOffset: "-1px",
                    backdropFilter: "blur(4px)",
                    gap: 12,
                  }}
                >
                  {icon}
                  <span className="flex flex-col justify-center text-white" style={{ fontSize: 14, fontFamily: "Plus Jakarta Sans", fontWeight: 500, lineHeight: "20px" }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Decorative circles */}
          <div className="self-stretch flex flex-col justify-start items-start" style={{ height: 288 }}>
            <div className="relative" style={{ width: 288, height: 288 }}>
              <div className="absolute rounded-full" style={{ width: 288, height: 288, left: 0, top: 0, background: "rgba(255,255,255,0.04)" }} />
              <div className="absolute rounded-full" style={{ width: 240, height: 240, left: 24, top: 24, border: "1px rgba(255,255,255,0.10) solid" }} />
              <div className="absolute rounded-full" style={{ width: 192, height: 192, left: 48, top: 48, border: "1px rgba(255,255,255,0.15) solid" }} />
              <div
                className="absolute inline-flex flex-col justify-start items-start rounded-3xl"
                style={{
                  width: 128,
                  height: 128,
                  left: 0,
                  top: 0,
                  background: "rgba(255,255,255,0.08)",
                  outline: "1px rgba(255,255,255,0.20) solid",
                  outlineOffset: "-1px",
                  backdropFilter: "blur(12px)",
                  boxShadow: "0px 25px 50px -12px rgba(0,0,0,0.25)",
                }}
              >
                <FiLock size={56} color="white" />
              </div>
              <div
                className="absolute bg-white inline-flex flex-col justify-start items-start rounded-2xl"
                style={{ width: 64, height: 64, left: 208, top: 232, boxShadow: "0px 25px 50px -12px rgba(0,0,0,0.25)" }}
              >
                <FiShield size={24} color="black" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── SUPPORT SECTION ── */}
      <div
        className="absolute inline-flex flex-col justify-start items-start"
        style={{ width: 1232, height: 212, left: 104, top: 3427 }}
      >
        <div className="self-stretch inline-flex flex-col justify-start items-start" style={{ gap: 12 }}>
          <span className="self-stretch flex flex-col justify-center" style={{ color: "#4F5661", fontSize: 12, fontFamily: "Plus Jakarta Sans", fontWeight: 400, textTransform: "uppercase", lineHeight: "16px", letterSpacing: 2.4 }}>Support</span>
          <span className="self-stretch flex flex-col justify-center" style={{ color: "black", fontSize: 36, fontFamily: "DM Sans", fontWeight: 700, lineHeight: "40px" }}>Need Assistance?</span>
          <div style={{ width: 448, maxWidth: 448, paddingTop: 4 }} className="flex flex-col justify-start items-start">
            <span className="flex flex-col justify-center" style={{ color: "#4F5661", fontSize: 16, fontFamily: "Plus Jakarta Sans", fontWeight: 400, lineHeight: "24px" }}>Our team is ready to help — Monday to Saturday, 9 AM to 7<br />PM IST.</span>
          </div>
        </div>

        <div className="self-stretch inline-flex justify-start items-start" style={{ gap: 20 }}>
          {/* Help Center */}
          <div
            className="flex-1 self-stretch inline-flex flex-col justify-start items-start rounded-2xl"
            style={{ paddingTop: 24, paddingBottom: 46, paddingLeft: 24, paddingRight: 24, outline: "1px rgba(0,0,0,0.08) solid", outlineOffset: "-1px", gap: 4 }}
          >
            <FiSearch size={20} color="black" />
            <div className="self-stretch flex flex-col justify-start items-start" style={{ paddingTop: 20 }}>
              <span className="self-stretch flex flex-col justify-center" style={{ color: "black", fontSize: 18, fontFamily: "DM Sans", fontWeight: 700, lineHeight: "28px" }}>Help Center</span>
            </div>
            <span className="self-stretch flex flex-col justify-center" style={{ color: "#4F5661", fontSize: 14, fontFamily: "Plus Jakarta Sans", fontWeight: 400, lineHeight: "20px" }}>Step-by-step guides</span>
            <div className="inline-flex justify-start items-center" style={{ paddingTop: 20, gap: 4 }}>
              <span className="flex flex-col justify-center" style={{ color: "black", fontSize: 14, fontFamily: "Plus Jakarta Sans", fontWeight: 700, lineHeight: "20px" }}>Browse</span>
              <FiArrowRight size={14} color="black" />
            </div>
          </div>

          {/* Email Support */}
          <div
            className="flex-1 self-stretch inline-flex flex-col justify-start items-start rounded-2xl"
            style={{ paddingTop: 24, paddingBottom: 46, paddingLeft: 24, paddingRight: 24, outline: "1px rgba(0,0,0,0.08) solid", outlineOffset: "-1px", gap: 4 }}
          >
            <FiMail size={20} color="black" />
            <div className="self-stretch flex flex-col justify-start items-start" style={{ paddingTop: 20 }}>
              <span className="self-stretch flex flex-col justify-center" style={{ color: "black", fontSize: 18, fontFamily: "DM Sans", fontWeight: 700, lineHeight: "28px" }}>Email Support</span>
            </div>
            <span className="self-stretch flex flex-col justify-center" style={{ color: "#4F5661", fontSize: 14, fontFamily: "Plus Jakarta Sans", fontWeight: 400, lineHeight: "20px" }}>support@traveamer.com</span>
            <div className="inline-flex justify-start items-center" style={{ paddingTop: 20, gap: 4 }}>
              <span className="flex flex-col justify-center" style={{ color: "black", fontSize: 14, fontFamily: "Plus Jakarta Sans", fontWeight: 700, lineHeight: "20px" }}>Email us</span>
              <FiArrowRight size={14} color="black" />
            </div>
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <LandingFooter />

    </div>
  );
}