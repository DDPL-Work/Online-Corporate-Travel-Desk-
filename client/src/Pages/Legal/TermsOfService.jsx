import React, { useEffect, useState } from "react";
import LandingHeader from "../../layout/LandingHeader";


function SectionTitle({ children }) {
  return (
    <h2 className="text-[#0A2540] text-[22px] font-bold font-['DM_Sans'] leading-[30px] mb-4">
      {children}
    </h2>
  );
}

function Para({ children }) {
  return (
    <p className="text-[#334155] text-[15px] font-['Plus_Jakarta_Sans'] leading-6">{children}</p>
  );
}

function BulletList({ items }) {
  return (
    <ul className="pl-6 space-y-2">
      {items.map((item, i) => (
        <li key={i} className="text-[#334155] text-[15px] font-['Plus_Jakarta_Sans'] leading-6 list-disc">{item}</li>
      ))}
    </ul>
  );
}

export default function TermsOfService() {
  const [activeId, setActiveId] = useState("f-terms");

  const flightSections = [
    { id: "f-terms", label: "Terms of the Airlines" },
    { id: "f-codeshare", label: "Code Share" },
    { id: "f-pricing", label: "Pricing" },
    { id: "f-documents", label: "Travel Documents" },
    { id: "f-checkin", label: "Check-in Terms" },
    { id: "f-segments", label: "Use of Flight Segments" },
    { id: "f-changes", label: "Changes to Existing Booking" },
    { id: "f-refund", label: "Refund" }
  ];

  const hotelSections = [
    { id: "h-role", label: "Role of Traveamer & Liability" },
    { id: "h-info", label: "Information from the Hotel" },
    { id: "h-responsibilities", label: "Responsibilities of the User" },
    { id: "h-charges", label: "Additional Charges by the Hotel" },
    { id: "h-payment", label: "Payment for Bookings" },
    { id: "h-links", label: "Third-Party Links" }
  ];

  useEffect(() => {
    const allIds = [...flightSections.map(s => s.id), ...hotelSections.map(s => s.id)];

    const handleScroll = () => {
      // Check if we hit the bottom of the page
      const scrollY = window.scrollY || window.pageYOffset;
      const innerHeight = window.innerHeight;
      const scrollHeight = document.documentElement.scrollHeight;

      if (scrollY + innerHeight >= scrollHeight - 20) {
        setActiveId(hotelSections[hotelSections.length - 1].id);
        return;
      }

      // Find the last section whose top has crossed the 300px threshold
      let found = false;
      for (let i = allIds.length - 1; i >= 0; i--) {
        const el = document.getElementById(allIds[i]);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 300) {
            setActiveId(allIds[i]);
            found = true;
            break;
          }
        }
      }
      
      // Fallback to the first item if we are at the very top
      if (!found) {
        setActiveId(allIds[0]);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Trigger once on mount

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) {
      const yOffset = -120; // Accounts for sticky header
      const y = el.getBoundingClientRect().top + window.scrollY + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const isFlightActive = flightSections.some(s => s.id === activeId);
  const isHotelActive = hotelSections.some(s => s.id === activeId);

  return (
    <div className="w-full min-h-screen relative bg-white font-['Plus_Jakarta_Sans'] flex flex-col">
      <LandingHeader />

       {/* ── Highlighted Last Updated bar ── */}
      <div className="w-full bg-[#D4AF37]/10  border-b border-[#D4AF37]/20 px-6 py-3 flex items-center justify-center lg:justify-end gap-2">
        
       
          <span className="text-[#0A2540] text-xs font-semibold font-['Plus_Jakarta_Sans']">
            Last Updated · <span className="text-[#D4AF37]">22 Apr 2026</span>
          </span>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-[1441px] mx-auto flex flex-col lg:flex-row justify-start items-start px-4 lg:px-12 pt-8 lg:pt-12 pb-[63.99px]">
          
        {/* Sidebar */}
        <aside className="hidden lg:flex w-full lg:w-[320px] lg:flex-shrink-0 lg:sticky lg:top-[121px] flex-col justify-start items-start overflow-hidden mb-8 lg:mb-0">
            <div className="w-full p-6 bg-white/70 rounded-[18px] outline outline-1 outline-offset-[-1px] outline-[#0A2540]/15 flex flex-col justify-start items-start gap-4">
                <div className="w-full flex flex-col justify-start items-start">
                    <div className="w-full flex flex-col justify-center text-[#D4AF37] text-[10px] font-normal uppercase leading-[15px] tracking-[2.40px]">Progress Tracker</div>
                </div>
                <div className="w-full flex flex-col justify-start items-start gap-7">
                    {/* Flight Tickets Tracker */}
                    <div className="w-full flex flex-col justify-start items-end gap-3">
                        <div className="w-full flex justify-start items-center gap-2.5 cursor-pointer" onClick={() => scrollTo("s1")}>
                            <div className="w-[15px] h-[15px] relative overflow-hidden">
                                <div className={`w-[11.37px] h-[11.37px] left-[1.88px] top-[1.76px] absolute outline outline-[1.25px] outline-offset-[-0.63px] ${isFlightActive ? 'outline-[#D4AF37]' : 'outline-[#0A2540]/30'}`} />
                            </div>
                            <div className="flex flex-col justify-start items-start">
                                <div className={`flex flex-col justify-center text-xs font-bold font-['DM_Sans'] uppercase leading-[18px] ${isFlightActive ? 'text-[#0A2540]' : 'text-[#0A2540]/70'}`}>Flight Tickets</div>
                            </div>
                        </div>
                        <div className="w-[231px] border-l border-[#0A2540]/15 flex flex-col justify-start items-start gap-1">
                            {flightSections.map((item) => {
                                const isActive = activeId === item.id;
                                return (
                                  <div key={item.id} onClick={() => scrollTo(item.id)} className={`w-full py-[6px] pl-[16px] border-l-[2px] flex flex-col justify-start items-start cursor-pointer transition-colors ${isActive ? 'border-[#D4AF37]' : 'border-transparent hover:bg-black/5'}`}>
                                      <div className={`flex flex-col justify-center text-[13px] leading-[19.5px] ${isActive ? 'text-[#0A2540] font-semibold' : 'text-[#0A2540]/60 font-normal'}`}>
                                          {item.label}
                                      </div>
                                  </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Hotels Tracker */}
                    <div className="w-full flex flex-col justify-start items-end gap-3">
                        <div className="w-full flex justify-start items-center gap-2.5 cursor-pointer" onClick={() => scrollTo("s2")}>
                            <div className="w-[15px] h-[15px] relative overflow-hidden">
                                <div className={`w-[3.75px] h-[0.63px] left-[5.63px] top-[9.38px] absolute outline outline-[1.25px] outline-offset-[-0.63px] ${isHotelActive ? 'outline-[#D4AF37]' : 'outline-[#0A2540]/70'}`} />
                                <div className={`w-[10px] h-[12.50px] left-[2.50px] top-[1.25px] absolute outline outline-[1.25px] outline-offset-[-0.63px] ${isHotelActive ? 'outline-[#D4AF37]' : 'outline-[#0A2540]/70'}`} />
                            </div>
                            <div className="flex flex-col justify-start items-start">
                                <div className={`flex flex-col justify-center text-xs font-bold font-['DM_Sans'] uppercase leading-[18px] ${isHotelActive ? 'text-[#0A2540]' : 'text-[#0A2540]/85'}`}>Hotels</div>
                            </div>
                        </div>
                        <div className="w-[231px] border-l border-[#0A2540]/15 flex flex-col justify-start items-start gap-1">
                            {hotelSections.map((item) => {
                                const isActive = activeId === item.id;
                                return (
                                  <div key={item.id} onClick={() => scrollTo(item.id)} className={`w-full py-[6px] pl-[16px] border-l-[2px] flex flex-col justify-start items-start cursor-pointer transition-colors ${isActive ? 'border-[#D4AF37]' : 'border-transparent hover:bg-black/5'}`}>
                                      <div className={`flex flex-col justify-center text-[13px] leading-[19.5px] ${isActive ? 'text-[#0A2540] font-semibold' : 'text-[#0A2540]/60 font-normal'}`}>
                                          {item.label}
                                      </div>
                                  </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 w-full flex flex-col justify-start items-start gap-10 lg:pl-10">
            {/* Header Banner */}
            <div className="w-full py-10 lg:py-16 px-6 lg:px-12 bg-gradient-to-br from-[#003399] to-[#000D26] flex flex-col justify-start items-start gap-5">
                <div className="w-full max-w-[610px] pl-2.5 bg-[#D4AF37] flex flex-col justify-start items-start">
                    <div className="w-full flex flex-col justify-center text-black text-[11px] font-normal uppercase leading-[16.5px] tracking-[3.30px]">Traveamer · Legal</div>
                </div>
                <div className="w-full flex flex-col justify-start items-start">
                    <div className="flex flex-col justify-center text-white text-[40px] md:text-[56px] lg:text-[72px] font-extrabold font-['DM_Sans'] leading-tight lg:leading-[73.44px]">Terms of Service.</div>
                </div>
                <div className="w-full max-w-[672px] pt-[3.10px] pb-[11.99px] flex flex-col justify-start items-start">
                    <div className="flex flex-col justify-center text-white text-base lg:text-[17px] font-normal leading-relaxed lg:leading-[27.2px]">The agreement that governs your use of Traveamer for flight tickets and hotel<br className="hidden lg:block"/>bookings — read carefully, in full.</div>
                </div>
                <div className="w-full h-px bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />
            </div>

            {/* Section 01 Container */}
            <div id="s1" className="w-full pt-10 lg:pt-[71px] pb-10 lg:pb-[63.99px] px-5 lg:px-12 relative bg-white rounded-[14px] outline outline-1 outline-offset-[-1px] outline-[#0A2540]/5 flex flex-col justify-start items-start gap-4 shadow-[0px_8px_20px_-10px_rgba(10,37,64,0.08),0px_30px_60px_-28px_rgba(10,37,64,0.18),inset_0px_1px_0px_1px_rgba(255,255,255,0.60)]">
                
                <div className="w-full flex flex-col justify-start items-start gap-3">
                    <div className="w-full max-w-[325px] px-2.5 bg-[#C9A240] flex flex-col justify-start items-start">
                        <div className="w-full flex flex-col justify-center text-black text-[11px] font-normal uppercase leading-[16.5px] tracking-[2.42px]">Section 01 · Flight Tickets</div>
                    </div>
                    {/* 1 */}
                    <div className="w-full pb-1 flex flex-col justify-start items-start">
                        <div className="w-full flex flex-col justify-center text-[#0A2540] text-[28px] md:text-[36px] font-bold font-['DM_Sans'] leading-tight lg:leading-[39.6px]">Terms of the Airlines</div>
                    </div>
                    <div className="w-16 h-px bg-[#D4AF37]" />
                </div>

                <div id="f-terms" className="w-full pt-2 flex flex-col justify-start items-start gap-[1.59px] scroll-mt-24">
                  <div className="space-y-4">
                    <Para>The airline tickets available through the Website are subject to the terms & conditions of the concerned airline, including but not limited to cancellation and refund policies.</Para>
                    <Para>Traveamer merely acts as a facilitator to enable the User to book a flight ticket. The contract of service for utilization of the flight is always between the User and the concerned airline.</Para>
                    <Para>Airlines retain the right to reschedule flight times, route, change or cancel flights or itineraries independent of and without prior intimation to Traveamer. As a facilitator Traveamer has no control or authority over the logistics of the airlines and therefore is not liable for any loss, direct or incidental, that a User may incur due to such change or cancellation of a flight.</Para>
                    <Para>Different tickets on the same airline may carry different restrictions or include different services and price.</Para>
                    <Para>The baggage allowance on given fare is as per the terms decided by the airline, and Traveamer has no role to play in the same. Some of the fares shown in the booking flow are “hand baggage fares” which do not entitle the User for free check in baggage and therefore the User will be required to pay separately for check in baggage. The prices for adding check-in baggage to a booking may vary from airline to airline. The User is advised to contact the airlines for detailed costs.</Para>
                </div>
                </div>
{/* 2 */}
                <div id="f-codeshare" className="w-full pt-[24px] flex flex-col justify-start items-start gap-[1.59px] scroll-mt-24">
                    <SectionTitle>Code Share</SectionTitle>
                    <div className="space-y-4">
                    <Para>Some airlines enter into &quot;code share&quot; agreements with other Airlines. This means that on certain routes, the airline carrier selling or marketing the flight ticker does not fly its own aircraft to that destination. Instead, it contracts or partners with another airline to fly to that destination. The partner airline is listed as &quot;operated by&quot; in the booking flow.</Para>
                    <Para>If your flight is a code share, it will be disclosed to you in the booking process and prior to payment.</Para>
                    <Para>Traveamer will disclose any such code-share arrangements to the User, only when the ticketing airline discloses it to Traveamer in the first place.</Para>
                </div>
                </div>

                <div id="f-pricing" className="w-full pt-[24px] flex flex-col justify-start items-start gap-[1.59px] scroll-mt-24">
                    <SectionTitle>Pricing</SectionTitle>
                    <div className="space-y-4">
                    <Para>The total price displayed on the Website on the payment page usually includes base fare, applicable government taxes and convenience fee. Users are required to pay the entire amount prior to the confirmation of their booking(s). In the event the User does not pay the entire amount, Traveamer reserves its right to cancel the booking. User agrees to pay all statutory taxes, surcharges and fees, as applicable on the date of travel.</Para>
                    <Para>To avail infant fares, the age of the child must be under 24 months throughout the entire itinerary. This includes both onward and return journeys. If the infant is 24 months or above on the return journey, User will be required to make a separate booking using a child fare. Any infants or children must be accompanied by an adult as per the terms of the airlines.</Para>
                </div>
                </div>

                <div id="f-documents" className="w-full pt-[24px] flex flex-col justify-start items-start gap-[1.60px] scroll-mt-24">
                    <SectionTitle>Travel Documents</SectionTitle>
                    <div className="space-y-4">
                    <Para>It shall be the sole responsibility of the User to ensure they are in possession of valid travel documents such as identity proof, passport, visa (including transit visa) etc. to undertake the travel. User agrees that in case of inability to travel for not carrying valid travel documents, Traveamer shall in no way be held liable.</Para>
                    <Para>User understands that the information (if any) provided by Traveamer regarding the travel documents is only advisory in nature and can’t be considered conclusive. The User shall ensure checking the requirements of travel with the respective airlines of the respective jurisdictions the User may transit through or choose to visit.</Para>
                </div>
                </div>

                <div id="f-checkin" className="w-full pt-[24px] flex flex-col justify-start items-start gap-[1.59px] scroll-mt-24">
                    <SectionTitle>Check-in Terms</SectionTitle>
                    <div className="space-y-4"> 
                    <Para>User should check with the airlines directly regarding the check-in timings. Usually, check-in begins 2 hours before departure for domestic flights, and 3 hours before departure for international flights.</Para>
                    <Para>User should carry valid identification proofs, passport, age proofs as may be required to prove the identity, nationality and age of the passengers travelling on a ticket, including infants.</Para>
                </div>
                </div>

                <div id="f-segments" className="w-full pt-[24px] flex flex-col justify-start items-start gap-[1.59px] scroll-mt-24">
                    <SectionTitle>Use of Flight Segments</SectionTitle>
                    <div className="space-y-4">
                    <Para>In the event User does not embark on the onward journey, the entire PNR pertaining to that booking shall be automatically cancelled by the airline. In such a scenario Traveamer has no control in the said process nor will be obligated to provide alternate bookings to the User. The cancellation penalty in such an event shall be as per the applicable airline rules.</Para>
                </div>
                </div>

                <div id="f-changes" className="w-full pt-[24px] flex flex-col justify-start items-start gap-[1.60px] scroll-mt-24">
                    <SectionTitle>Changes to Existing Booking</SectionTitle>
                    <div className="space-y-4">
                    <Para>Any changes that are made to any existing booking shall be subject to certain charges levied by the respective airline, apart from the service fee charged by Traveamer.</Para>
                    <Para>The User shall be obligated to pay applicable charges in the event of any alteration or modification to an existing booking. However, depending on the airline&apos;s policy and fare class, charges for changes or modifications to existing bookings may vary.</Para>
                </div>
                </div>

                <div id="f-refund" className="w-full pt-[24px] flex flex-col justify-start items-start gap-[1.59px] scroll-mt-24">
                    <SectionTitle>Refund</SectionTitle>
                    <div className="space-y-4">
                    <Para>Refunds will be processed as per the airline fare rules and cancellation policy. Such refunds shall be subject to Traveamer receiving the same from the airlines. However, the convenience fee paid to Traveamer paid at the time of booking is a non- refundable fee.</Para>
                    <Para>All cancellations made directly with the airline need to be intimated to Traveamer, in order to initiate the process of refund. The processing time for refunds may vary depending on the mode of payment, bank etc. The refund shall be processed after deducting the Traveamer service fee which is independent of the convenience fee as mentioned above.</Para>
                    <Para>The refund will be credited to the same account from which the payment was made. For example, if the User used a credit card, Traveamer will make an appropriate charge reversal to the same credit card; like-wise if the User used a debit card, Traveamer will credit the money to the same debit card.</Para>
                    <Para>In the event of cancellation and refund of partially utilized tickets, upfront discount and promo code discount availed at the time of booking would be deducted from the refund amount.</Para>
                </div>
                </div>

                {/* Info Card */}
                <div className="w-full max-w-[867px] mt-[36px] p-7 bg-gradient-to-b from-[#FFFAF0] to-[#FFF6E0] rounded-[14px] outline outline-1 outline-offset-[-1px] outline-[#D4AF37] flex flex-col sm:flex-row justify-start items-start gap-5 shadow-[0px_10px_30px_-12px_rgba(212,175,55,0.45)]">
                    <div className="w-10 h-10 bg-[#D4AF37] rounded-full flex justify-center items-center flex-shrink-0">
                        <div className="text-center flex flex-col justify-center text-black text-base font-bold font-['DM_Sans'] leading-6">₹</div>
                    </div>
                    <div className="flex-1 flex flex-col justify-start items-start gap-[7px]">
                        <div className="w-full flex flex-col justify-start items-start">
                            <div className="flex flex-col justify-center text-[#8A6A14] text-[10px] font-normal uppercase leading-[15px] tracking-[2.20px]">Important · Read Carefully</div>
                        </div>
                        <div className="w-full flex flex-col justify-start items-start">
                            <div className="flex flex-col justify-center text-[#0A2540] text-[16.8px] font-bold font-['DM_Sans'] leading-[25.2px]">Refunds processing time will be 07-10 working days, upon receiving the same from Airline/Hotels/or Suppliers.</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Divider */}
            <div className="w-full py-2 flex justify-start items-center gap-6">
                <div className="flex-1 h-px bg-[#0A2540]/15" />
                <div className="relative">
                    <div className="flex flex-col justify-center text-[#D4AF37] text-[11px] font-normal uppercase leading-[16.5px] tracking-[3.30px]">Section 02</div>
                </div>
                <div className="flex-1 h-px bg-[#0A2540]/15" />
            </div>

            {/* Section 02 Container */}
            <div id="s2" className="w-full pt-10 lg:pt-[79px] pb-10 lg:pb-[81.59px] px-5 lg:px-12 relative bg-white rounded-[14px] outline outline-1 outline-offset-[-1px] outline-[#0A2540]/5 flex flex-col justify-start items-start gap-[11.30px] shadow-[0px_8px_20px_-10px_rgba(10,37,64,0.08),0px_30px_60px_-28px_rgba(10,37,64,0.18),inset_0px_1px_0px_1px_rgba(255,255,255,0.60)]">
                
                <div className="w-full flex flex-col justify-start items-start gap-[11.3px]">
                    <div className="w-full max-w-[733px] px-2.5 bg-[#C9A240] flex flex-col justify-start items-start">
                        <div className="w-full flex flex-col justify-center text-black text-[11px] font-normal uppercase leading-[16.5px] tracking-[2.42px]">Section 02 · Hotels</div>
                    </div>
                    <div className="w-full pb-[4.70px] flex flex-col justify-start items-start">
                        <div className="w-full flex flex-col justify-center text-[#0A2540] text-[28px] md:text-[36px] font-bold font-['DM_Sans'] leading-tight lg:leading-[39.6px]">Role of Traveamer and Limitation of Liability of<br className="hidden lg:block"/>Traveamer</div>
                    </div>
                    <div className="w-16 h-px bg-[#D4AF37]" />
                </div>

                <div id="h-role" className="w-full pt-2 flex flex-col justify-start items-start gap-[1.60px] scroll-mt-24">
                  <div className="space-y-4">
                    <Para>traveamer acts as a facilitator and merely provides an online platform to the User to select and book a particular hotel. Hotels in this context includes all categories of accommodations such as hotels, home-stays, bed and breakfast stays, farm-houses and any other alternate accommodations.</Para>
                    <Para>All the information pertaining to the hotel including the category of the hotel, images, room type, amenities and facilities available at the hotel are as per the information provided by the hotel to Traveamer. This information is for reference only. Any discrepancy that may exist between the website pictures and actual settings of the hotel shall be raised by the User with the hotel directly, and shall be resolved between the User and hotel. Traveamer will have no responsibility in that process of resolution, and shall not take any liability for such discrepancies.</Para>
                </div>
                </div>

                <div id="h-info" className="w-full pt-[24px] flex flex-col justify-start items-start gap-[1.59px] scroll-mt-24">
                    <SectionTitle>Information from the Hotel and the Terms of the Hotel</SectionTitle>
                     <div className="space-y-4">
                    <Para>The hotel booking voucher which Traveamer issues to a User is solely based on the information provided or updated by the hotel regarding the inventory availability. In no circumstances can Traveamer be held liable for failure on part of a hotel to accommodate the User with a confirmed booking, the standard of service or any insufficiency in the services, or any other service related issues at the hotel. The liability of Traveamer in case of denial of check-in by a hotel for any reason what-so-ever including over-booking, system or technical errors, or unavailability of rooms etc., will be limited to either providing a similar alternate accommodation at the discretion of Traveamer (subject to availability at that time), or refunding the booking amount (to the extent paid) to the User. Any other service related issues should be directly resolved by the User with the hotel.</Para>
                    <Para>Hotels reserves the sole right of admission and Traveamer has no say whatsoever in admission or denial for admission by the hotel. Unmarried or unrelated couples may not be allowed to check-in by some hotels as per their policies. Similarly, accommodation may be denied to guests posing as a couple if suitable proof of identification is not presented at the time check-in. Some hotels may also not allow local residents to check-in as guests. Traveamer will not be responsible for any check-in denied by the hotel due to the aforesaid reasons or any other reason not under the control of Traveamer. No refund would be applicable in case the hotel denies check-in under such circumstances.</Para>
                </div>
                </div>

                <div id="h-responsibilities" className="w-full pt-[24px] flex flex-col justify-start items-start gap-[1.59px] scroll-mt-24">
                    <SectionTitle>Responsibilities of the User</SectionTitle>
                     <div className="space-y-4">
                    <Para>The User would be liable to make good any damage(s) caused by any act of him/ her/ or their accompanying guests (willful/negligent) to the property of the hotel in any manner whatsoever. The extent and the amount of the damage so caused would be determined by the concerned hotel. Traveamer would not, in any way, intervene in the same.</Para>
                    <Para>The primary guest must be at least 18 years old to be able to check into the hotel.</Para>
                    <Para>The User has to be in possession of a valid identity proof and address proof, at the time of check-in. The hotel shall be within its rights to deny check-in to a User if a valid identity proof is not presented at the time of check-in.</Para>
                    <Para>Check-in time, check-out time, and any changes in those timings, will be as per hotel policy &amp; terms. Early check-in or late check-out request is subject to availability and the hotel may charge an additional fee for providing such services.</Para>
                </div>
                </div>

                <div id="h-charges" className="w-full pt-[24px] flex flex-col justify-start items-start gap-[1.60px] scroll-mt-24">
                    <SectionTitle>Additional Charges by the Hotel</SectionTitle>
                     <div className="space-y-4">
                    <Para>The booking amount paid by the User is only for stay at the hotel. Some bookings may include breakfast and/ or meals as confirmed at the time of booking. Any other services utilized by the User at the hotel, including laundry, room service, internet, telephone, extra food, drinks, beverages etc. shall be paid by the User directly to the hotel.</Para>
                    <Para>Hotels may charge a mandatory meal surcharge on festive periods like Christmas, New Year&apos;s Eve or other festivals as decided by the hotel. All additional charges (including mandatory meal surcharges) need to be cleared directly at the hotel. Traveamer will have no control over waiving the same.</Para>
                </div>
                </div>

                <div id="h-payment" className="w-full pt-[24px] flex flex-col justify-start items-start gap-[1.59px] scroll-mt-24">
                    <SectionTitle>Payment for Bookings and Any Additional Payments</SectionTitle>
                     <div className="space-y-4">
                    <Para>Booking of a hotel can be “Prepaid”, as per the options made available by a hotel on the Website of Traveamer.</Para>
                    <Para>In “Prepaid” model, the total booking amount is paid by the User at the time of booking itself. Such total booking amount includes the hotel reservation rate, taxes, service fees as may be charged on behalf of the actual service provider, and any additional booking fee or convenience fee charged by Traveamer.</Para>
                    <Para>At the hotel’s or Traveamer’s sole discretion on case to case basis, the User may also be provided with an option to make a part payment to Traveamer at the time of confirmation of a booking. The balance booking amount shall be paid as per the terms of the bookings. For security purposes, the User must provide Traveamer with correct credit or debit card details. Traveamer may cancel the booking at its sole discretion in case such bank or credit card details as provided by the User are found incorrect.</Para>
                    <Para>Some banks and card issuing companies charge their account holders a transaction fee when the card issuer and the merchant location (as defined by the card brand, e.g. Visa, MasterCard, American Express) are in different countries. If a User has any questions about the fees or any exchange rate applied, they may contact their bank or the card issuing company through which payment was made.</Para>
                    <Para>Some accommodation suppliers may require User and/or the other persons, on behalf of whom the booking is made, to present a credit card or cash deposit upon check-in to cover additional expenses that may be incurred during their stay. Such deposit is unrelated to any payment received by Traveamer and solely at the behest of the Hotel.</Para>
                    <Para>In “Pay at hotel” model, the concerned hotel will collect the entire payment against the booking at the time of check-in. In case of international bookings, the payment will be charged in local currency or in any other currency, as decided by the hotel. For security purposes, the User must provide Traveamer with correct credit or debit card details. Traveamer may cancel the booking at its sole discretion in case such bank or credit card details as provided by the User are found incorrect.</Para>
                </div>
                </div>

                <div id="h-links" className="w-full pt-[24px] flex flex-col justify-start items-start gap-[1.59px] scroll-mt-24">
                    <SectionTitle>Payment for Bookings and Any Additional Payments (Third-Party Links)</SectionTitle>
                    <div className="space-y-4">
                    <Para>The Website may contain links to third party websites. Traveamer does not control such websites and is not responsible for its contents. If a User accesses any third-party website, the same shall be done entirely at the User’s risk and Traveamer shall assume no liability for the same.</Para>
                    <Para>Traveamer is not responsible for any errors, omissions or representations on any of its pages, links or any linked website pages to the extent such information is updated or provided directly by the Service Providers or the advertisers.</Para>
                    <Para>Traveamer does not endorse any advertisers on its Website, or any linked sites in any manner. The Users are requested to verify the accuracy of all information provided on the third-party web pages.</Para>
                    <Para>The linked sites are not under the control of Traveamer and hence Traveamer is not responsible for the contents of any linked site(s) or any further links on such site(s), or any changes or updates to such sites. Traveamer is providing these links to the Users only as a convenience.</Para>
                </div>
                </div>
            </div>

            {/* Footer Divider */}
            <div className="w-full pt-[24px] flex flex-col justify-start items-center gap-[24px]">
                <div className="w-[128px] h-px bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />
                <div className="flex flex-col justify-center items-center text-center text-[#0A2540]/50 text-[12px] font-normal uppercase leading-[18px] tracking-[3.60px]">© Traveamer · All Rights Reserved</div>
            </div>
            
        </main>
      </div>
    </div>
  );
}
