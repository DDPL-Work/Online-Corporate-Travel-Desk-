import React from "react";
import LandingHeader from "../../layout/LandingHeader";
import LandingFooter from "../../layout/LandingFooter";

const ContactUs = () => {
  return (
    <div className="min-h-screen w-full flex flex-col bg-white font-['Plus_Jakarta_Sans'] overflow-x-hidden">
      <LandingHeader />

      <main className="flex-grow relative bg-white pb-10">
        {/* Full-Width Hero Section Background */}
        <div
          className="relative w-full h-[280px] lg:h-[246px] overflow-hidden"
          style={{
            background: "linear-gradient(173deg, #051D8C 0%, #030E30 100%)",
          }}
        >
          {/* Subtle Overlay (Full Width) */}
          <div className="absolute left-0 top-0 w-full h-full opacity-[0.07] bg-white pointer-events-none" />

          {/* Gold Bottom Border Line (Full Width) */}
          <div
            className="absolute left-0 bottom-0 w-full h-[1px]"
            style={{
              background:
                "linear-gradient(90deg, rgba(220.25, 176.85, 72.94, 0) 0%, #DCB149 50%, rgba(220.25, 176.85, 72.94, 0) 100%)",
            }}
          />

          {/* Hero Content Container */}
          <div className="relative mx-auto w-full max-w-[1440px] h-full">
            {/* Desktop Hero Content (>= 1024px) */}
            <div className="hidden lg:flex w-full h-full pt-8 px-6 flex-col justify-center items-center gap-[14.80px]">
              <div className="self-stretch flex justify-center items-center gap-3">
                <div className="flex flex-col justify-start items-start">
                  <div className="text-[#DCB149] text-[12px] font-normal uppercase leading-4 tracking-[3.60px]">
                    get in touch
                  </div>
                </div>
              </div>
              <div className="self-stretch flex flex-col justify-center items-center">
                <div className="text-center text-white text-[72px] font-bold font-['DM_Sans'] leading-[75.60px]">
                  CONTACT US
                </div>
              </div>
            </div>

            {/* Mobile/Tablet Hero Content (< 1024px) */}
            <div className="lg:hidden flex flex-col items-center justify-center h-full px-6 gap-4 text-center">
                <span className="text-[#DCB149] text-xs font-normal uppercase tracking-[3.60px]">get in touch</span>
                <h1 className="text-white text-4xl md:text-6xl font-bold font-['DM_Sans'] leading-tight">CONTACT US</h1>
            </div>
          </div>
        </div>

        {/* Floating Info Card Container */}
        <div className="relative z-10 mx-auto w-full max-w-[1440px] px-6 xl:px-16">
          
          {/* Desktop Card (>= 1024px) */}
          <div className="hidden lg:flex relative mt-[-60px] mb-20 w-full max-w-5xl mx-auto bg-white shadow-[0px_4px_18.1px_rgba(5,29,140,0.30)] overflow-hidden rounded-[16px] pointer-events-auto p-12 lg:p-16">
            <div className="flex w-full items-stretch justify-between relative">
              {/* Left Column */}
              <div className="flex-1 pr-8 lg:pr-16 flex flex-col justify-center gap-6">
                <div className="text-[#DCB549] text-[15px] font-bold font-['DM_Sans'] uppercase leading-5 tracking-[3.60px]">
                  Traveamer Array Pvt Limited
                </div>
                <div className="text-[#DCB149] text-[20px] font-bold font-['DM_Sans'] uppercase leading-5 tracking-[3.60px]">
                  delhi head office
                </div>
                <div className="text-[#0B111F] text-[16px] font-normal uppercase leading-[26px] tracking-[3.60px]">
                  B1-632, Janakpuri<br />
                  Co-Offiz 2nd Floor<br />
                  New Delhi - 110018
                </div>
              </div>

              {/* Vertical Divider */}
              <div
                className="w-[1px] min-h-[200px]"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(220, 176, 72, 0) 0%, #DCB149 50%, rgba(220, 176, 72, 0) 100%)",
                }}
              />

              {/* Right Column */}
              <div className="flex-1 pl-8 lg:pl-16 flex flex-col justify-center gap-8 lg:gap-10">
                {/* Telephone */}
                <div className="flex flex-col gap-4">
                  <div className="text-[#DCB149] text-[20px] font-bold font-['DM_Sans'] uppercase leading-5 tracking-[3.60px]">
                    TELEPHONE
                  </div>
                  <a href="tel:+918793353355" className="text-[#0B111F] text-[16px] font-normal uppercase leading-[26px] tracking-[3.60px] hover:text-[#DCB149] transition-colors">
                    +91-8793353355
                  </a>
                </div>

                {/* Email */}
                <div className="flex flex-col gap-4">
                  <div className="text-[#DCB149] text-[20px] font-bold font-['DM_Sans'] uppercase leading-5 tracking-[3.60px]">
                    Email
                  </div>
                  <a href="mailto:contact@traveamer.com" className="text-[#0B111F] text-[16px] font-normal uppercase leading-[26px] tracking-[3.60px] hover:text-[#DCB149] transition-colors break-all">
                    contact@traveamer.com
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile/Tablet Card Layout (< 1024px) */}
          <div className="lg:hidden relative mt-[-60px] mb-20 z-20">
            <div className="bg-white shadow-[0px_4px_18.1px_rgba(5,29,140,0.30)] rounded-[16px] p-8 md:p-12 flex flex-col gap-10">
              {/* Delhi Head Office */}
              <div className="flex flex-col gap-4">
                <div className="text-[#DCB549] text-sm md:text-base font-bold font-['DM_Sans'] uppercase tracking-[3px]">Traveamer Array Pvt Limited</div>
                <div className="text-[#DCB149] text-lg font-bold font-['DM_Sans'] uppercase tracking-[3px]">delhi head office</div>
                <div className="text-[#0B111F] text-sm md:text-base font-normal uppercase leading-relaxed tracking-[1px]">
                  B1-632, Janakpuri<br />Co-Offiz 2nd Floor<br />New Delhi - 110018
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Telephone */}
                <div className="flex flex-col gap-4">
                  <div className="text-[#DCB149] text-lg font-bold font-['DM_Sans'] uppercase tracking-[3px]">TELEPHONE</div>
                  <a href="tel:+918793353355" className="text-[#0B111F] text-base font-normal uppercase tracking-[1px] hover:text-[#DCB149] transition-colors">+91-8793353355</a>
                </div>

                {/* Email */}
                <div className="flex flex-col gap-4">
                  <div className="text-[#DCB149] text-lg font-bold font-['DM_Sans'] uppercase tracking-[3px]">Email</div>
                  <a href="mailto:contact@traveamer.com" className="text-[#0B111F] text-base font-normal uppercase tracking-[1px] hover:text-[#DCB149] transition-colors break-all">contact@traveamer.com</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
};

export default ContactUs;
