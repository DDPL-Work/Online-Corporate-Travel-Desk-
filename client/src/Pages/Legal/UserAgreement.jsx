// client/src/Pages/Legal/UserAgreement.jsx

import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import LandingHeader from "../../layout/LandingHeader";

const SECTIONS = [
  { id: "s1",  label: "Applicability" },
  { id: "s2",  label: "Eligibility to Use" },
  { id: "s3",  label: "Content" },
  { id: "s4",  label: "Website" },
  { id: "s5",  label: "Limited Liability of Traveamer" },
  { id: "s6",  label: "User's Responsibility" },
  { id: "s7",  label: "Security and Account Information" },
  { id: "s8",  label: "Fees and Payment" },
  { id: "s9",  label: "Usage of Mobile Number" },
  { id: "s10", label: "Compliance of LRS" },
  { id: "s11", label: "Obligation to Obtain Visa" },
  { id: "s12", label: "Force Majeure" },
  { id: "s13", label: "Right to Refuse" },
  { id: "s14", label: "Right to Cancel" },
  { id: "s15", label: "Indemnification" },
  { id: "s16", label: "Payment Related Terms" },
  { id: "s17", label: "Miscellaneous" },
];

const TOTAL = SECTIONS.length;

/* ── Circular Progress Ring ── */
function CircularProgress({ pct, allDone }) {
  const r = 16;
  const circ = 2 * Math.PI * r;
  const dash = circ * (pct / 100);
  return (
    <div className="relative w-10 h-10 flex-shrink-0">
      <svg width="40" height="40" viewBox="0 0 40 40" className="-rotate-90">
        <circle cx="20" cy="20" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
        <circle
          cx="20" cy="20" r={r} fill="none"
          stroke={allDone ? "#22c55e" : "#D4AF37"}
          strokeWidth="3"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.4s ease, stroke 0.4s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {allDone ? (
          <svg width="16" height="13" viewBox="0 0 16 13" fill="none">
            <path d="M1.5 6.5L5.5 10.5L14.5 1.5" stroke="#22c55e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          <span className="text-[10px] font-bold text-white leading-none">{pct}%</span>
        )}
      </div>
    </div>
  );
}

/* ── Nav Item ── */
function NavItem({ num, label, active, reviewed, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 ${
        active ? "bg-[#D4AF37]/10" : "hover:bg-black/5"
      }`}
    >
      <span className={`w-6 h-6 flex-shrink-0 rounded-lg flex items-center justify-center text-[11px] font-semibold leading-none transition-all duration-300 ${
        reviewed
          ? "bg-green-500 text-white"
          : active
          ? "bg-[#D4AF37] text-[#0A2540]"
          : "bg-[#0A2540]/5 text-[#0A2540]/70"
      }`}>
        {reviewed ? (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : num}
      </span>
      <span className={`text-sm leading-snug font-['Plus_Jakarta_Sans'] transition-colors ${
        active ? "text-[#0A2540] font-semibold" : reviewed ? "text-green-700 font-medium" : "text-[#334155] font-medium"
      }`}>
        {label}
      </span>
    </button>
  );
}

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

/* ── Success Modal ── */
function SuccessModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4"
      onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 flex flex-col items-center gap-5 animate-[modalIn_0.3s_ease]"
        onClick={e => e.stopPropagation()}
        style={{ animation: "modalIn 0.3s ease" }}
      >
        {/* Icon */}
        <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center">
          <svg width="38" height="30" viewBox="0 0 38 30" fill="none">
            <path d="M3 15L13 25L35 3" stroke="#22c55e" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        {/* Text */}
        <div className="text-center space-y-2">
          <h2 className="text-[#0A2540] text-2xl font-bold font-['DM_Sans']">Agreement Accepted!</h2>
          <p className="text-[#334155] text-sm font-['Plus_Jakarta_Sans'] leading-6">
            Thank you for reviewing and accepting the Traveamer User Agreement. Your acceptance has been recorded.
          </p>
        </div>

        {/* Date badge */}
        <div className="flex items-center gap-2 bg-[#D4AF37]/10 rounded-xl px-4 py-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] block" />
          <span className="text-[#0A2540] text-xs font-semibold">
            Accepted on {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
          </span>
        </div>

        {/* Button */}
        <button
          onClick={onClose}
          className="w-full py-3 bg-[#0A2540] text-white rounded-xl text-sm font-semibold font-['Plus_Jakarta_Sans'] hover:bg-[#0d2f50] transition-colors"
        >
          Return to Previous Page
        </button>
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.92) translateY(12px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════ */
export default function UserAgreement() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("s1");
  const [reviewedSections, setReviewedSections] = useState(new Set());
  const [showModal, setShowModal] = useState(false);

  const reviewedCount = reviewedSections.size;
  const pct = Math.round((reviewedCount / TOTAL) * 100);
  const allDone = reviewedCount === TOTAL;

  /* ── Mark sections reviewed on intersection ── */
  useEffect(() => {
    const observers = [];
    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return;

      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveSection(id);
            setReviewedSections(prev => new Set([...prev, id]));
          }
        },
        { rootMargin: "-20% 0px -50% 0px", threshold: 0 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach(o => o.disconnect());
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleAccept = () => setShowModal(true);
  const handleModalClose = () => {
    setShowModal(false);
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col font-['Plus_Jakarta_Sans']">
      <LandingHeader />

      {/* ── Highlighted Last Updated bar ── */}
      <div className="w-full bg-[#D4AF37]/10  border-b border-[#D4AF37]/20 px-6 py-3 flex items-center justify-center lg:justify-end gap-2">
        
          <span className="text-[#0A2540] text-xs font-semibold font-['Plus_Jakarta_Sans']">
            Last Updated · <span className="text-[#D4AF37]">21 Apr 2026</span>
          </span>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 max-w-[1340px] mx-auto w-full px-4 py-8 pb-28">
        <div className="flex gap-8 items-start">

          {/* ── LEFT: Quick Navigation ── */}
          <aside className="hidden lg:flex flex-col w-[260px] flex-shrink-0 sticky top-[72px] max-h-[calc(100vh-100px)]">
            <p className="text-[#334155]/60 text-[11px] font-semibold uppercase tracking-[2.16px] mb-1 px-3">
              Quick Navigation
            </p>


            <div className="overflow-y-auto mt-3 pr-2 flex flex-col gap-0.5">
              {SECTIONS.map((s, i) => (
                <NavItem
                  key={s.id}
                  num={i + 1}
                  label={s.label}
                  active={activeSection === s.id}
                  reviewed={reviewedSections.has(s.id)}
                  onClick={() => scrollTo(s.id)}
                />
              ))}
            </div>
          </aside>

          {/* ── RIGHT: Content ── */}
          <main className="flex-1 min-w-0">
            <div className="bg-white rounded-[18px] border border-[#0A2540]/5 shadow-[0px_8px_24px_-12px_rgba(10,37,64,0.12),0px_1px_2px_rgba(10,37,64,0.04)] overflow-hidden">

              {/* ── Hero Banner ── */}
              <div className="bg-gradient-to-br from-[#003399] to-[#000D26] px-6 lg:px-10 py-8 lg:py-10">
                <p className="text-[#D4AF37] text-xs font-semibold uppercase tracking-[2.16px] mb-3">Legal · Effective Immediately</p>
                <h1 className="text-white text-2xl md:text-[34px] font-bold font-['DM_Sans'] leading-tight lg:leading-[42px] mb-3">Traveamer User Agreement</h1>
                <p className="text-[#EEEEEE] text-sm lg:text-[15px] leading-6">Please review the following 17 sections carefully. Scroll to the bottom to enable acceptance.</p>
              </div>

              {/* ── Sections ── */}
              <div className="px-5 lg:px-10 py-8 lg:py-10 space-y-12">

                {/* 1 */}
                <section id="s1" className="scroll-mt-28">
                  <SectionTitle>1. Applicability</SectionTitle>
                  <div className="space-y-4">
                    <Para>This User Agreement along with Terms of Service (collectively, the "User Agreement") forms
the terms and conditions for the use of services and products of Traveamer.</Para>
                    <Para>Any person ("User") who inquiries about or purchases any products or services of Traveamer
through its websites, sales persons, offices, call centers, branch offices, etc. (all the aforesaid platforms
collectively referred to as "Sales Channels") agree to be governed by this User Agreement. The websites of
Traveamer are collectively referred to as 'Website'.</Para>
                    <Para>Both User and Traveamer are individually referred to as 'Party' and collectively referred to as
'Parties' to the User Agreement.</Para>
                    <Para>"Terms of Service" available on Traveamer's website details out terms & conditions applicable on
various services or products facilitated by Traveamer. The User should refer to the relevant Terms of Service
applicable for the given product or service as booked by the User. Such Terms of Service are binding on the
User.</Para>
                  </div>
                </section>

                {/* 2 */}
                <section id="s2" className="scroll-mt-28">
                  <SectionTitle>2. Eligibility to Use</SectionTitle>
                  <div className="space-y-4">
                    <Para>The User must be atleast 18 years of age and must possess the legal authority to enter into an agreement so as become a User and use the services of Traveamer. If you are a minor or are below the age of 18 years, you shall not register as a User of the Website and shall not transact on or use the Website.</Para>
                    <Para>As a minor if you wish to use or transact on the Website, such use or transaction shall only be made by a person of legal contracting age (legal guardian or parents). We reserve the right to terminate your membership and/or block access to the Website if it is discovered that you are a minor or incompetent to contract according to the law or any information pertaining to your age entered at the time of creation of account is false.</Para>
                    <Para>Before using the Website, approaching any Sales Channels or procuring the services of Traveamer, the Users shall compulsorily read and understand this User Agreement, and shall be deemed to have accepted this User Agreement as a binding document that governs User’s dealings and transactions with Traveamer. If the User does not agree with any part of this Agreement, then the User must not avail Traveamer's services and must not access or approach the Sales Channels of Traveamer.</Para>
                    <Para>All rights and liabilities of the User and Traveamer with respect to any services or product facilitated by Traveamer shall be restricted to the scope of this User Agreement.</Para>
                  </div>
                </section>

                {/* 3 */}
                <section id="s3" className="scroll-mt-28">
                  <SectionTitle>3. Content</SectionTitle>
                  <div className="space-y-4">
                    <Para>All content provided through various Sales Channels, including but not limited to audio, images, software, text, icons and such similar content ("Content"), are registered by Traveamer and protected under applicable intellectual property laws. User cannot use this Content for any other purpose, except as specified herein.</Para>
                    <Para>User agrees to follow all instructions provided by Traveamer which will prescribe the way such User may use the Content.</Para>
                    <Para>There are a number of proprietary logos, service marks and trademarks displayed on the Website and through other Sales Channels of Traveamer, as may be applicable. Traveamer does not grant the User a license, right or authority to utilize such proprietary logos, service marks, or trademarks in any manner. Any unauthorized use of the Content, will be in violation of the applicable law.</Para>
                    <Para>Traveamer respects the intellectual property rights of others. If you notice any act of infringement on the Website, you are requested to send us a written notice/ intimation which must include the following information:</Para>
                    <BulletList items={["Clear identification of such copyrighted work that you claim has been infringed;","Location of the material on the Website, including but not limited to the link of the infringing material;","The proof that the alleged copyrighted work is owned by you;","Contact information;"]} />
                    <Para>The aforesaid notices can be sent to Traveamer by email at <a href="mailto:contact@traveamer.com" className="text-[#0A2540] underline">contact@traveamer.com</a></Para>
                  </div>
                </section>

                {/* 4 */}
                <section id="s4" className="scroll-mt-28">
                  <SectionTitle>4. Website</SectionTitle>
                  <div className="space-y-4">
                    <Para>The Website is meant to be used by bonafide User(s) for a lawful use.</Para>
                    <Para>User shall not distribute exchange, modify, sell or transmit anything from the Website, including but not limited to any text, images, audio and video, for any business, commercial or public purpose.</Para>
                    <Para>The User Agreement grants a limited, non-exclusive, non-transferable right to use this Website as expressly permitted in this User Agreement. The User agrees not to interrupt or attempt to interrupt the operation of the Website in any manner whatsoever.</Para>
                    <Para>Access to certain features of the Website may only be available to registered User(s). The process of registration, may require the User to answer certain questions or provide certain information that may or may not be personal in nature. Some such fields may be mandatory or optional. User represents and warrants that all information supplied to Traveamer is true and accurate.</Para>
                    <Para>Traveamer reserves the right, in its sole discretion, to terminate the access to the Website and the services offered on the same or any portion thereof at any time, without notice, for general maintenance or any other reason whatsoever.</Para>
                    <Para>Traveamer will always make its best endeavors to ensure that the content on its websites or other sales channels are free of any virus or such other malwares. However, any data or information downloaded or otherwise obtained through the use of the Website or any other Sales Channel is done entirely at the User's own discretion and risk.</Para>
                    <Para>Traveamer reserves the right to periodically make improvements or changes in its Website at any time without any prior notice to the User. User(s) are requested to report any content on the Website which is deemed to be unlawful, objectionable, libelous, defamatory, obscene, harassing, invasive to privacy, abusive, fraudulent, against any religious beliefs, spam, or is violative of any applicable law to <a href="mailto:contact@traveamer.com" className="text-[#0A2540] underline">contact@traveamer.com</a>On receiving such report, Traveamer reserves the right to investigate and/or take such action as the Company may deem appropriate.</Para>
                  </div>
                </section>

                {/* 5 */}
                <section id="s5" className="scroll-mt-28">
                  <SectionTitle>5. Limited Liability of Traveamer</SectionTitle>
                  <div className="space-y-4">
                    <Para>Unless Traveamer explicitly acts as a reseller in certain scenarios, Traveamer always acts as a facilitator by connecting the User with the respective service providers like airlines, hotels etc. (collectively referred to as “Service Providers”). Traveamer’s liability is limited to providing the User with a confirmed booking as selected by the User.</Para>
                    <Para>Any issues or concerns faced by the User at the time of availing any such services shall be the sole responsibility of the Service Provider. Traveamer will have no liability with respect to the acts, omissions, errors, representations, warranties, breaches or negligence on part of any Service Provider</Para>
                    <Para>Unless explicitly committed by Traveamer as a part of any product or service:</Para>
                    <BulletList items={["Traveamer assumes no liability for the standard of services as provided by the respective Service Providers.","Traveamer provides no guarantee with regard to their quality or fitness as represented.","Traveamer doesn't guarantee the availability of any services as listed by a Service Provider."]} />
                    <Para>By making a booking, User understands Traveamer merely provides a technology platform for booking of services and products and the ultimate liability rests on the respective Service Provider and not Traveamer. Thus the ultimate contract of service is between User and Service Provider.</Para>
                    <Para>User further understands that the information displayed on the Website with respect to any service is displayed as furnished by the Service Provider. Traveamer, therefore cannot be held liable in case if the information provided by the Service Provider is found to be inaccurate, inadequate or obsolete or in contravention of any laws, rules, regulations or directions in force.</Para>
                  </div>
                </section>

                {/* 6 */}
                <section id="s6" className="scroll-mt-28">
                  <SectionTitle>6. User's Responsibility</SectionTitle>
                  <div className="space-y-4">
                    <Para>Users are advised to check the description of the services and products carefully before making a booking. User(s) agree to be bound by all the conditions as contained in booking confirmation or as laid out in the confirmed booking voucher. These conditions are also to be read in consonance with the User Agreement.</Para>
                    <Para>If a User intends to make a booking on behalf of another person, it shall be the responsibility of the User to inform such person about the terms of this Agreement, including all rules and restrictions applicable thereto.</Para>
                    <Para>The User undertakes to abide by all procedures and guidelines, as modified from time to time, in connection with the use of the services available through Traveamer. The User further undertakes to comply with all applicable laws, regulations, orders, directions etc. issued by either the Central Government, State Government, District Authorities or any other statutory body empowered to do so w.r.t use of services or for each transaction.</Para>
                    <Para>The services are provided on an "as is" and "as available" basis. Traveamer may change the features or functionality of the services being provided at any time, in its sole discretion, without any prior notice. Traveamer expressly disclaims all warranties of any kind, whether express or implied, including, but not limited to the implied warranties of merchantability, reasonably fit for all purposes. No advice or information, whether oral or written, which the User obtains from Traveamer or through the services opted shall create any warranty not expressly made herein or in the terms and conditions of the services.</Para>
                    <Para>User also authorizes Traveamer’s representative to contact such user over phone, message and email. This consent shall supersede any preferences set by such User through national customer preference register (NCPR) or any other similar preferences.</Para>
                  </div>
                </section>

                {/* 7 */}
                <section id="s7" className="scroll-mt-28">
                  <SectionTitle>7. Security and Account Related Information</SectionTitle>
                  <div className="space-y-4">
                    <Para>While registering on the Website, the User will have to choose a password to access that User’s account and User shall be solely responsible for maintaining the confidentiality of both the password and the account as well as for all activities on the account. It is the duty of the User to notify Traveamer immediately in writing of any unauthorized use of their password or account or any other breach of security. Traveamer will not be liable for any loss that may be incurred by the User as a result of unauthorized use of the password or account, either with or without the User’s knowledge. The User shall not use anyone else's account at any time.</Para>
                    <Para>For logging-in or sign-up on the Website and/or mobile & web applications, the User has an option to voluntarily sign-up or login through a phone number verification tool integrated with a third-party partner of Traveamer. For the avoidance of doubt, login or sign-up of the User via such SDK verification process will at all times be subject to the User giving its consent to Traveamer for engaging the third-party partner. Under this login or sign-up option, no Personal Information or Data of the User will be shared by Traveamer with the third-party partner.</Para>
                    <Para>User understands that any information that is provided to this Website may be read or intercepted by others due to any breach of security at the User’s end.</Para>
                    <Para>Traveamer keeps all the data in relation to credit card, debit card, bank information etc. secured and in an encrypted form in compliance with the applicable laws and regulations. However, for cases of fraud detection, offering bookings on credit (finance) etc., Traveamer may at times verify certain information of its Users like their credit score, as and when required.</Para>
                    <Para>Additionally, Traveamer may share your Personal Information in an anonymized and/ or aggregated form with a third party that Traveamer may engage to perform certain tasks on its behalf, including but not limited to payment processing, data hosting, data processing , credit score and assessing credit worthiness for offering bookings on credit in accordance with the applicable laws.</Para>
                    <Para>Traveamer adopts the best industry standard to secure the information as provided by the User. However, Traveamer cannot guarantee that there will never be any security breach of its systems which may have an impact on User’s information too.</Para>
                    <Para>The data of the User as available with Traveamer may be shared with concerned law enforcement agencies for any lawful or investigation purpose without the consent of the User.</Para>
                  </div>
                </section>

                {/* 8 */}
                <section id="s8" className="scroll-mt-28">
                  <SectionTitle>8. Fees and Payment</SectionTitle>
                  <div className="space-y-4">
                    <Para>In addition to the cost of booking as charged by the Service Providers, Traveamer reserves the right to charge certain fees in the nature of convenience fees or service fees. Traveamer further reserves the right to alter any and all fees from time to time. Any such additional fees, including fee towards any modifications thereof, will be displayed to the User before confirming the booking or collecting the payment from such User.</Para>
                    <Para>In cases of short charging of the booking amount, taxes, statutory fee, convenience fee etc., owing to any technical error or other reason, Traveamer shall reserve the right to deduct, charge or claim the balance amount from the User and the User shall pay such balance amount to Traveamer. In cases where the short charge is claimed prior to the utilization of the booking, Traveamer will be at liberty to cancel such bookings if the amount is not paid before the utilization date.</Para>
                    <Para>Any increase in the price charged by Traveamer on account of change in rate of taxes or imposition of new taxes, levies by Government shall have to be borne by the User. Such imposition of taxes, levies may be without prior notice and could also be retrospective but will always be as per applicable law.</Para>
                    <Para>In the rare circumstance of a booking not getting confirmed for any reason whatsoever, Traveamer will process the refund of the booking amount paid by the User and intimate the User about the same. Traveamer is not under any obligation to provide an alternate booking in lieu of or to compensate or replace the unconfirmed booking. All subsequent bookings will be treated as new transactions. Any refunds occasioned by cancellations (including user initiated cancellations, service provider initiated cancellations or force majeure related cancellations) shall be processed as per the policies of the service provider and subject to receipt of refunds from service provider. Service providers have absolute control over the refund policy, and the service provider is solely responsible for determining the amount of refund to be provided. Traveamer shall make all efforts to process refunds within 24 hours of receipt of refund from the service provider. For refunds relating to transactions more than 6 months old, Traveamer shall make all efforts to process refunds within 96 hours post receipt of refund from service provider and receipt of banking details from customer. Please reach out to the grievance officer if you have reason to believe that a refund has not been processed within these timelines.</Para>
                    <div className="flex items-start gap-4 p-5 bg-[#D4AF37]/15 rounded-[14px] border border-[#D4AF37]/40">
                      <div className="w-9 h-9 flex-shrink-0 bg-[#D4AF37]/30 rounded-[10px] flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                          <rect x="2.5" y="2.5" width="15" height="15" rx="2" stroke="#0A2540" strokeWidth="1.83"/>
                          <line x1="10" y1="5.83" x2="10" y2="11.67" stroke="#0A2540" strokeWidth="1.83"/>
                          <circle cx="10" cy="14" r="0.92" fill="#0A2540"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-[#0A2540]/80 text-[10px] font-semibold uppercase tracking-[1.92px] mb-1">Refund Processing Window</p>
                        <p className="text-[#0A2540] text-lg font-bold font-['DM_Sans']">Processing time for refunds — 07 to 10 Working days.</p>
                      </div>
                    </div>
                    <Para>The User shall be completely responsible for all charges, fees, duties, taxes, and assessments arising out of the use of the service, as per the applicable laws</Para>
                    <Para>The User agrees and understands that all payments shall only be made to bank accounts of Traveamer. Traveamer or its agents, representatives or employees shall never ask a customer to transfer money to any private account or to an account not held in the name of Traveamer. The User agrees that if that user transfers any amount against any booking or transaction to any bank account that is not legitimately held by Traveamer or to any personal account of any person, Traveamer shall not be held liable for the same. User shall not hold any right to recover from Traveamer any amount which is transferred by the User to any third party.</Para>
                    <Para>The User will not share his personal sensitive information like credit/debit card number, CVV, OTP, card expiry date, user IDs, passwords etc. with any person including the agents, employees or representatives of Traveamer. The User shall immediately inform Traveamer if such details are demanded by any of its agents' employees or representatives. Traveamer shall not be liable for any loss that the User incurs for sharing the aforesaid details.</Para>
                    <Para>Refunds, if any, on cancelled bookings will always be processed to the respective account or the banking instrument (credit card, wallet etc.) from which payment was made for that booking.</Para>
                    <Para>Refunds will be processed in 07-10 working days upon receiving from supplier.</Para>
                    <Para>Booking(s) made by the User through Traveamer are subject to the applicable cancellation policy as set out on the booking page or as communicated to the customers in writing.</Para>
                    <Para>Traveamer provides various modes of making payments on the Website for transacting, like UPI, Credit/Debit Cards of various banks, Net Banking facility of all major banks, Traveamer and third party Wallets, Gift Cards, EMI and more.</Para>
                  </div>
                </section>

                {/* 9 */}
                <section id="s9" className="scroll-mt-28">
                  <SectionTitle>9. Usage of the Mobile Number, Communication Details of the User by Traveamer</SectionTitle>
                  <div className="space-y-4">
                    <Para>Traveamer will send booking confirmation, itinerary information, cancellation, payment confirmation, refund status, schedule change or any such other information relevant for the transaction or booking made by the User, via SMS, internet-based messaging applications like WhatsApp, voice call, e-mail or any other alternate communication detail provided by the User at the time of booking.</Para>
                    <Para>Traveamer may also contact the User through the modes mentioned above for any pending or failed bookings, to know the preference of the User for concluding the booking and also to help the User for the same.</Para>
                    <Para>The User hereby unconditionally consents that such communications via SMS, internet-based messaging applications like WhatsApp, voice call, email or any other mode by Traveamer are:</Para>
                    <BulletList items={["Upon the request and authorization of the User;","'Transactional' and not an 'unsolicited commercial communication' as per the guidelines of Telecom Regulation Authority of India (TRAI), and","In compliance with the relevant guidelines of TRAI or such other authority in India and abroad."]} />
                    <Para>The User will indemnify Traveamer against all types of losses and damages incurred by Traveamer due to any action taken by TRAI, Access Providers (as per TRAI regulations) or any other authority due to any erroneous complaint raised by the User on Traveamer with respect to the communications mentioned above or due to a wrong number or email id being provided by the User for any reason whatsoever.</Para>
                  </div>
                </section>

                {/* 10 */}
                <section id="s10" className="scroll-mt-28">
                  <SectionTitle>10. Compliance of Liberalized Remittance Scheme (LRS)</SectionTitle>
                  <div className="space-y-4">
                    <Para>The RBI mandates collection of PAN details for all transactions made under Liberalized Remittance Scheme (LRS) which include any international booking made on the Website or through Sales Channels. The User warrants and confirms that PAN details of the User/traveler will be shared by the User on or before the cut-off date prescribed by Traveamer either at the time of booking or after the booking is made. In case the traveler is a minor, Traveamer will require PAN details of the parent/guardian of such minor. The User further confirms that non-compliance of this requirement may result in cancellation of the booking.</Para>
                    <Para>The User warrants and confirms that the total amount of foreign exchange purchased or remitted during the current financial year, through all sources in India (including the current transaction) falls within the permissible limit prescribed by the RBI. The User further confirms that foreign exchange, if any, purchased by User for the purpose of international travel under the current booking will be utilized for the purpose indicated above.</Para>
                    <Para>The User authorizes Traveamer to retrieve User’s/ traveler’s (in case booking on someone’s behalf) PAN details from Users profile, previous bookings or share User/traveller’s data with third party(ies) for collecting or verifying PAN details solely for the purposes mentioned in this Agreement.</Para>
                    <Para>The User understands Traveamer does not collect User’s PAN details without consent. If the User wishes to opt of providing the same or wishes to delete it if already provided, the User may do so by accessing the profile information through the Desktop.</Para>
                  </div>
                </section>

                {/* 11 */}
                <section id="s11" className="scroll-mt-28">
                  <SectionTitle>11. Obligation to Obtain Visa</SectionTitle>
                  <div className="space-y-4">
                    <Para>International bookings made through Traveamer are subject to the requirements of visa including but not limited to transit visa, OK TO BOARD which are to be obtained by the User as per the requirement of their travel bookings and the requirements of the countries the User intends to visit or transit through.</Para>
                    <Para>Traveamer is not responsible for any issues, including inability to travel, arising out of such visa requirements and is also not liable to refund any amount to the User for being unable to utilize the booking due to absence or denial of visa, irrespective whether or not the User has availed the services of Traveamer for the visa process too. Refund, if any, will be as per the applicable terms of booking and cancellation policy.</Para>
                  </div>
                </section>

                {/* 12 */}
                <section id="s12" className="scroll-mt-28">
                  <SectionTitle>12. Force Majeure</SectionTitle>
                  <div className="space-y-4">
                    <Para>There can be exceptional circumstances where Traveamer and / or the Service Providers may be unable to honor the confirmed bookings due to various reasons like act of God, labor unrest, insolvency, business exigencies, government decisions, terrorist activity, any operational and technical issues, route and flight cancellations etc. or any other reason beyond the control of Traveamer. If Traveamer has advance knowledge of any such situations where dishonor of bookings may happen, it will make its best efforts to provide similar alternative to the User or refund the booking amount after deducting applicable service charges, if supported and refunded by that respective service operators. The User agrees that Traveamer being merely a facilitator of the services and products booked, cannot be held responsible for any such Force Majeure circumstance. The User has to contact the Service Provider directly for any further resolutions and refunds.</Para>
                    <Para>The User agrees that in the event of non-confirmation of booking due to any technical reasons (like network downtime, disconnection with third party platforms such as payment gateways, banks etc.) or any other similar failures, Traveamer’s obligation shall be limited refunding the booking amount, if any, received from the customer. Such refund shall completely discharge Traveamer from all liabilities with respect to that transaction. Additional liabilities, if any, shall be borne by the User.</Para>
                    <Para>In no event shall Traveamer and be liable for any direct, indirect, punitive, incidental, special or consequential damages, and any other damages like damages for loss of use, data or profits, arising out of or in any way connected with the use or performance of the Website or any other Sales Channel.</Para>
                  </div>
                </section>

                {/* 13 */}
                <section id="s13" className="scroll-mt-28">
                  <SectionTitle>13. Right to Refuse</SectionTitle>
                  <div className="space-y-4">
                    <Para>Traveamer at its sole discretion reserves the right to not accept any booking without assigning any reason thereof.</Para>
                    <Para>Traveamer will not provide any service or share confirmed booking details till such time the complete consideration is received from the User.</Para>
                    <Para>In addition to other remedies and recourse available to Traveamer under this User Agreement or under applicable law, Traveamer may limit the User's activity, warn other</Para>
                    <Para>Users of the User's actions, immediately suspend or terminate the User's registration, or refuse to provide the User with access to the Website if:</Para>
                    <BulletList items={["The User is in breach of this User Agreement; or","Traveamer is unable to verify or authenticate any information provided by the User; or","Traveamer believes that the User's actions may infringe on any third-party rights or breach any applicable law or otherwise result in any liability for the User, other Users of Traveamer."]} />
                    <Para>Once a User has been suspended or terminated, such User shall not register or attempt to register with Traveamer with different credentials, or use the Website in any manner whatsoever until such User is reinstated by Traveamer. Traveamer may at any time in its sole discretion reinstate suspended users.</Para>
                    <Para>If a User breaches this User Agreement, Traveamer reserves the right to recover any amounts due to be paid by the User to Traveamer, and to take appropriate legal action as it deems necessary.</Para>
                    <Para>The User shall not write or send any content to Traveamer which is, or communicate with Traveamer using language or content which is:</Para>
                    <BulletList items={["Abusive, threatening, offensive, defamatory, coercive, obscene, belligerent, glorifying violence, vulgar, sexually explicit, pornographic, illicit or otherwise objectionable;","Contrary to any applicable law;","Violates third parties' intellectual property rights;","A spam; or","In breach of any other part of these terms and conditions of use."]} />
                    <Para>If the User violates any of the aforesaid terms, Traveamer shall be at liberty to take appropriate legal action against the User.</Para>
                  </div>
                </section>

                {/* 14 */}
                <section id="s14" className="scroll-mt-28">
                  <SectionTitle>14. Right to Cancel</SectionTitle>
                  <div className="space-y-4">
                    <Para>The User expressly undertakes to provide Traveamer with correct and valid information while making use of the Website under this User Agreement, and not to make any misrepresentation of facts. Any default on part of the User would disentitle the User from availing the services from Traveamer.</Para>
                    <Para>In case Traveamer discovers or has reasons to believe at any time during or after receiving a request for services from the User that the request for services is either unauthorized or the information provided by the User or any of the travelers is not correct or that any fact has been misrepresented by that User, Traveamer shall be entitled to appropriate legal remedies against the User, including cancellation of the bookings, without any prior intimation to the User. In such an event, Traveamer shall not be responsible or liable for any loss or damage that may be caused to the User or any other person in the booking, as a consequence of such cancellation of booking or services.</Para>
                    <Para>If any judicial, quasi-judicial, investigation agency, government authority approaches Traveamer to cancel any booking, Traveamer will cancel the same without approaching the concerned User whose booking has been cancelled.</Para>
                    <Para>The User shall not hold Traveamer responsible for any loss or damage arising out of measures taken by Traveamer for safeguarding its own interest and that of its genuine customers. This would also include Traveamer denying or cancelling any bookings on account of suspected fraud transactions.</Para>
                  </div>
                </section>

                {/* 15 */}
                <section id="s15" className="scroll-mt-28">
                  <SectionTitle>15. Indemnification</SectionTitle>
                  <div className="space-y-4">
                    <Para>The User agrees to indemnify, defend and hold harmless Traveamer, its affiliates and their respective officers, directors, lawful successors and assigns from and against any and all losses, liabilities, claims, damages, costs and expenses (including legal fees and disbursements in connection therewith and interest chargeable thereon) asserted against or incurred by such indemnified persons, that arise out of, result from, or may be payable by virtue of, any breach of any representation or warranty provided by the User, or non-performance of any covenant by the User.</Para>
                    <Para>The User shall be solely liable for any breach of any country specific rules and regulations or general code of conduct and Traveamer cannot be held responsible for the same.</Para>
                  </div>
                </section>

                {/* 16 */}
                <section id="s16" className="scroll-mt-28">
                  <SectionTitle>16. Payment Related Terms & Conditions</SectionTitle>
                  <div className="space-y-4">
                    <Para>Traveamer acts as a Third Party Application Provider (TPAP) under Payment facilitator through payment gateways</Para>
                    <Para>Traveamer is a TPAP authorized to facilitate payments through PSP Bank(s). For this purpose Phonepe shall act as the PSP. Traveamer is a service provider and participates in payment collection through the PSP Bank.</Para>
                    <Para>Through the agreement entered into between Traveamer, Phonepe, Traveamer shall facilitate grievances, complaints and provide resolution to the customers using payment gateway services for payments.</Para>
                    <Para>In case of refunds: Refunds will be processed in 07 to 10 working days, upon receiving from its suppliers.</Para>
                    <p className="text-[#0A2540] text-[17px] font-medium font-['DM_Sans'] mt-4">FAQs</p>
                    <Para><span className="font-bold text-[#0A2540]">What is PSP bank?</span> Payment Service Provider (PSP) is the banking company authorized to act as a service provider under the Payment Gateway framework. PSP engages the Third Party Application Provider (TPAP) to provide Payment services (UPI, Net banking, Credit cards, debit Card payments) to the end-user customers.</Para>
                    <Para><span className="font-bold text-[#0A2540]">What is TPAPs?</span> Third Party Application Provider (TPAP) is an entity that provides the UPI compliant app(s) to the end-user customers to facilitate UPI based payment transactions</Para>
                    <p className="text-[#0A2540] text-[17px] font-medium font-['DM_Sans'] mt-4">Roles & Responsibilities of TPAP</p>
                    <BulletList items={["TPAP is a service provider and participates in payment gateway services through PSP Bank.","TPAP is responsible to comply with all the requirements prescribed by PSP Bank.","TPAP is responsible to ensure that its systems are adequately secure to function on the payment gateways."]} />
                    <p className="text-[#0A2540] text-[17px] font-medium font-['DM_Sans'] mt-4">Dispute Redressal Mechanism</p>
                    <Para>Every end-user customer can raise a complaint with respect to the transaction, on the Traveamer website by sending email to <a href="mailto:contact@traveamer.com" className="text-[#0A2540] underline">contact@traveamer.com</a></Para>
                  </div>
                </section>

                {/* 17 */}
                <section id="s17" className="scroll-mt-28">
                  <SectionTitle>17. Miscellaneous</SectionTitle>
                  <div className="space-y-5">
                    <Para><span className="font-bold text-[#0A2540]">SEVERABILITY:</span> If any provision of this User Agreement is determined to be invalid or unenforceable in whole or in part, such invalidity or unenforceability shall attach only to such provision or part of such provision and the remaining part of such provision and all other provisions of this User Agreement shall continue to be in full force and effect.</Para>
                    <Para><span className="font-bold text-[#0A2540]">JURISDICTION:</span> This Agreement is subject to interpretation as per the laws of India, and the parties shall refer any unresolved disputes to the exclusive jurisdiction of courts in Delhi.</Para>
                    <Para><span className="font-bold text-[#0A2540]">AMENDMENT TO THE USER AGREEMENT:</span> Traveamer reserves the right to change the User Agreement from time to time. The User is responsible for regularly reviewing the User Agreement.</Para>
                    <Para><span className="font-bold text-[#0A2540]">CONFIDENTIALITY:</span> Any information which is specifically mentioned by Traveamer as confidential shall be maintained confidentially by the User and shall not be disclosed unless as required by law or to serve the purpose of this User Agreement and the obligations of both the parties herein.</Para>
                    <Para><span className="font-bold text-[#0A2540]">FEEDBACK FROM CUSTOMER:</span> Goibibo would like to know the feedback of the Users for improving its services. The User hereby authorizes Goibibo to contact the User for their feedback on various services offered by Goibibo. Such feedback may be collected through emails, telephone calls, SMS or any other medium from time to time. In case the User chooses not to be contacted, such User shall write to Goibibo for specific exclusion at privacy@go-mmt.com.</Para>
                    <Para><span className="font-bold text-[#0A2540]">PRIVACY POLICY:</span> User shall also refer to Traveamer’s <a href="/privacy-policy" className="text-blue-500 underline">Privacy Policy</a> available on Traveamer’s website which governs use of the Websites. By using the Website, User agrees to the terms of the Privacy Policy and accordingly consents to the use of the User’s personal information by Traveamer in accordance with the terms of the Privacy Policy.</Para>
                    <Para><span className="font-bold text-[#0A2540]">GRIEVANCE REDRESSAL:</span> Traveamer strongly believes in resolving the issues raised by the User(s). In the event if user feels that it’s concern has not been resolved to it’s satisfaction, User may contact our grievance officer, who shall endeavour to redress the concern within 30 working days from the date of escalation. To reach the grievance officer, User(s) are advised to escalate to the grievance officer only when they have already raised their complaint which has not been resolved to their satisfaction, or their concern has not been resolved within 30 working days from the date of ticket generation. User(s) will be required to share their booking reference number and the ticket ID generated for their complaint, for any escalations to the Grievance Officer by sending mail to the following below details. </Para>
                    <Para> In compliance of the Information Technology Act, 2000 and rules made thereunder and also in compliance of the Consumer Protection (E-Commerce) Rules, 2020 the name and contact details of the Grievance Officer are herein as under:</Para>
                    {/* Grievance Officer Card */}
                    <div className="bg-[#F8FAFC] rounded-[14px] border border-[#0A2540]/10 px-4 lg:px-5 py-6 lg:py-7 mt-4">
                      <p className="text-[#0A2540]/70 text-[10px] lg:text-[11px] font-semibold uppercase tracking-[1.92px] mb-4">Grievance Officer Details</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-3">
                        {[
                          { label: "Name", value: "Mr. Karan Ahuja" },
                          { label: "Email", value: "contact@traveamer.com" },
                          { label: "Address", value: "Traveamer, B1, 632, Janakpuri, New Delhi - 110058" },
                          { label: "Working hours", value: "Mon to Fri (9:00 to 18:00)" },
                        ].map(({ label, value }) => (
                          <div key={label} className="flex flex-col gap-0.5">
                            <p className="text-[#334155]/60 text-xs lg:text-sm">{label}</p>
                            <p className="text-[#0A2540] text-sm font-medium leading-relaxed">{value}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* End of agreement */}
                    <div className="pt-6 border-t border-[#0A2540]/10 text-center">
                      <p className="text-[#334155]/70 text-sm">You have reached the end of the User Agreement.</p>
                    </div>
                  </div>
                </section>

              </div>
            </div>
          </main>
        </div>
      </div>

      {/* ── Fixed Bottom Acceptance Bar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pointer-events-none">
        <div className="max-w-[1340px] mx-auto pointer-events-auto">
          <div className={`rounded-[24px] border px-4 lg:px-6 py-4 lg:py-4 flex flex-col sm:flex-row items-center gap-4 shadow-[0px_20px_40px_-20px_rgba(10,37,64,0.5)] transition-all duration-500 ${
            allDone
              ? "bg-[#0A2540] border-white/10"
              : "bg-[#0A2540]/95 border-white/10 backdrop-blur-md"
          }`}>

            {/* Top Row: Progress Info */}
            <div className="flex items-center gap-4 w-full">
              <CircularProgress pct={pct} allDone={allDone} />
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm lg:text-[15px] font-bold font-['DM_Sans'] leading-tight lg:leading-snug">
                  {allDone ? "You've reviewed the entire agreement" : `Reading agreement… ${reviewedCount} of ${TOTAL}`}
                </p>
                <p className="text-white/60 text-[11px] lg:text-xs mt-0.5">
                  {allDone
                    ? "Tap 'Accept & Continue' to confirm agreement."
                    : "Scroll to the end to enable the button."}
                </p>
              </div>
            </div>

            {/* Bottom Row / Right Side: Actions */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end border-t border-white/10 pt-3 sm:border-t-0 sm:pt-0">
              <button
                onClick={() => navigate(-1)}
                className="px-4 py-2 lg:py-2.5 text-xs lg:text-sm font-medium text-white/60 hover:text-white transition-colors rounded-xl"
              >
                Decline
              </button>
              <button
                onClick={handleAccept}
                disabled={!allDone}
                title={!allDone ? `Review all ${TOTAL} sections to enable this button` : ""}
                className={`flex-1 sm:flex-none px-6 py-2.5 lg:py-2.5 text-xs lg:text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
                  allDone
                    ? "bg-[#D4AF37] text-[#0A2540] hover:bg-[#c9a432] active:scale-[0.98] cursor-pointer"
                    : "bg-white/10 text-white/30 cursor-not-allowed"
                }`}
              >
                {allDone ? "Accept & Continue" : `${TOTAL - reviewedCount} left`}
                {allDone && (
                  <svg width="14" height="12" viewBox="0 0 14 12" fill="none">
                    <path d="M1 6H13M8 1L13 6L8 11" stroke="#0A2540" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Success Modal ── */}
      {showModal && <SuccessModal onClose={handleModalClose} />}
    </div>
  );
}
