import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import LandingHeader from "../../layout/LandingHeader";

const SECTIONS = [
  { id: "sA", label: "Introduction", letter: "A" },
  { id: "sB", label: "Users Outside India", letter: "B" },
  { id: "sC", label: "Information We Collect", letter: "C" },
  { id: "sD", label: "How We Use Your Data", letter: "D" },
  { id: "sE", label: "Data Retention", letter: "E" },
  { id: "sF", label: "Cookies & Session Data", letter: "F" },
  { id: "sG", label: "Sharing of Information", letter: "G" },
  { id: "sH", label: "Disclosure of Information", letter: "H" },
  { id: "sI", label: "Opt-out of Promotions", letter: "I" },
  { id: "sJ", label: "How We Protect Your Data", letter: "J" },
  { id: "sK", label: "Withdrawal of Consent", letter: "K" },
  { id: "sL", label: "Your Rights", letter: "L" },
  { id: "sM", label: "Eligibility", letter: "M" },
  { id: "sN", label: "Changes to this Policy", letter: "N" },
];

const TOTAL = SECTIONS.length;

function SectionTitle({ children }) {
  return (
    <h2 className="text-[#0A2540] text-[22px] font-bold font-['DM_Sans'] leading-[30px] mb-4">
      {children}
    </h2>
  );
}

function Para({ children }) {
  return (
    <p className="text-[#334155] text-[15px] font-['Plus_Jakarta_Sans'] leading-6 mb-4">
      {children}
    </p>
  );
}

function BulletList({ items }) {
  return (
    <ul className="pl-6 space-y-2 mb-4">
      {items.map((item, i) => (
        <li
          key={i}
          className="text-[#334155] text-[15px] font-['Plus_Jakarta_Sans'] leading-6 "
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

function CircularProgress({ pct, allDone }) {
  const r = 16;
  const circ = 2 * Math.PI * r;
  const dash = circ * (pct / 100);
  return (
    <div className="relative w-10 h-10 flex-shrink-0">
      <svg width="40" height="40" viewBox="0 0 40 40" className="-rotate-90">
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="3"
        />
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          stroke={allDone ? "#22c55e" : "#DCB149"}
          strokeWidth="3"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.4s ease, stroke 0.4s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {allDone ? (
          <svg width="16" height="13" viewBox="0 0 16 13" fill="none">
            <path
              d="M1.5 6.5L5.5 10.5L14.5 1.5"
              stroke="#22c55e"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <span className="text-[10px] font-bold text-white leading-none">
            {pct}%
          </span>
        )}
      </div>
    </div>
  );
}

function NavItem({ num, label, active, reviewed, onClick, itemRef }) {
  return (
    <button
      ref={itemRef}
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 group ${
        active ? "bg-[#DCB149]/10" : "hover:bg-black/5"
      }`}
    >
      <div className="relative flex flex-col items-center flex-shrink-0">
        <span
          className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-semibold leading-none transition-all duration-300 z-10 ${
            reviewed
              ? "bg-green-500 text-white"
              : active
                ? "bg-[#DCB149] text-[#0A2540]"
                : "bg-[#0A2540]/5 text-[#0A2540]/70"
          }`}
        >
          {reviewed ? (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path
                d="M1 4L3.5 6.5L9 1"
                stroke="white"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            num
          )}
        </span>
      </div>
      <span
        className={`text-sm leading-snug font-['Plus_Jakarta_Sans'] transition-colors ${
          active
            ? "text-[#0A2540] font-semibold"
            : reviewed
              ? "text-green-700 font-medium"
              : "text-[#334155] font-medium"
        }`}
      >
        {label}
      </span>
    </button>
  );
}

function SuccessModal({ onClose }) {
  return (
    <div
      className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 flex flex-col items-center gap-5 animate-[modalIn_0.3s_ease]"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "modalIn 0.3s ease" }}
      >
        <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center">
          <svg width="38" height="30" viewBox="0 0 38 30" fill="none">
            <path
              d="M3 15L13 25L35 3"
              stroke="#22c55e"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-[#0A2540] text-2xl font-bold font-['DM_Sans']">
            Privacy Policy Accepted!
          </h2>
          <p className="text-[#334155] text-sm font-['Plus_Jakarta_Sans'] leading-6">
            Thank you for reviewing the Traveamer Privacy Policy. Your
            acceptance has been recorded.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-[#DCB149]/10 rounded-xl px-4 py-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#DCB149] block" />
          <span className="text-[#0A2540] text-xs font-semibold">
            Accepted on{" "}
            {new Date().toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
        </div>
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

export default function PrivacyPolicy() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("sA");
  const [reviewedSections, setReviewedSections] = useState(new Set());
  const [showModal, setShowModal] = useState(false);
  const scrollContainerRef = useRef(null);
  const itemRefs = useRef({});

  const reviewedCount = reviewedSections.size;
  const pct = Math.round((reviewedCount / TOTAL) * 100);
  const allDone = reviewedCount === TOTAL;

  useEffect(() => {
    const observers = [];
    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return;

      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveSection(id);
            setReviewedSections((prev) => new Set([...prev, id]));
          }
        },
        { rootMargin: "-20% 0px -50% 0px", threshold: 0 },
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  // Sync sidebar scroll with active section
  useEffect(() => {
    if (
      activeSection &&
      itemRefs.current[activeSection] &&
      scrollContainerRef.current
    ) {
      const activeEl = itemRefs.current[activeSection];
      const container = scrollContainerRef.current;

      const scrollPos =
        activeEl.offsetTop -
        container.offsetTop -
        container.clientHeight / 2 +
        activeEl.clientHeight / 2;
      container.scrollTo({
        top: Math.max(0, scrollPos),
        behavior: "smooth",
      });
    }
  }, [activeSection]);

  const scrollTo = (id) => {
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleAccept = () => setShowModal(true);
  const handleModalClose = () => {
    setShowModal(false);
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col font-['Plus_Jakarta_Sans']">
      <LandingHeader />

      <div className="relative bg-gradient-to-b from-[#051D8C] to-[#030E30] px-6 lg:px-32 py-12 lg:py-16 overflow-hidden">
        <div className="absolute left-0 bottom-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#DCB149] to-transparent opacity-50" />
        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-[1.67px] border-[#DCB149] rounded-sm flex items-center justify-center p-0.5">
              <div className="w-1.5 h-1 border-[1.67px] border-[#DCB149] rounded-[1px]" />
            </div>
            <span className="text-[#DCB149] text-xs uppercase tracking-[3.6px]">
              Privacy Policy
            </span>
          </div>
          <h1 className="text-white text-[40px] md:text-[56px] lg:text-[72px] font-bold font-['DM_Sans'] leading-[1.1]">
            A Quiet Promise
            <br />
            <span className="text-[#DCB149]">to Safeguard Your Trust.</span>
          </h1>
          <p className="text-white/80 text-base lg:text-[18px] font-['DM_Sans'] leading-[1.8] max-w-[672px] mt-2">
            How Traveamer collects, uses, protects, and respects your personal
            information — read in full, written in plain language, governed by
            law.
          </p>
        </div>
      </div>

      <div className="flex-1 max-w-[1340px] mx-auto w-full px-4 lg:px-8 py-8 pb-32">
        <div className="flex gap-8 items-start h-full">
          <aside className="hidden lg:flex flex-col w-[280px] flex-shrink-0 sticky top-[72px] max-h-[calc(100vh-120px)] bg-white rounded-2xl border border-[#0A2540]/5 p-5 shadow-[0px_8px_24px_-12px_rgba(10,37,64,0.08)]">
            <div className="flex items-center justify-between mb-4 px-1">
              <p className="text-[#051D8C] text-[12px] font-bold font-['DM_Sans'] uppercase tracking-[3px]">
                Table of Contents
              </p>
            </div>

            <div className="relative flex-1 overflow-hidden flex flex-col">
              <div className="absolute left-[23px] top-6 bottom-6 w-[1px] bg-[#0A2540]/5 z-0" />
              <div
                className="absolute left-[23px] top-6 w-[1px] bg-[#DCB149] z-0 transition-all duration-500 ease-out"
                style={{ height: `calc(${pct}% - 24px)` }}
              />

              <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto pr-2 space-y-1 custom-scrollbar scroll-smooth"
                style={{ scrollbarWidth: "thin" }}
              >
                {SECTIONS.map((s) => (
                  <NavItem
                    key={s.id}
                    itemRef={(el) => (itemRefs.current[s.id] = el)}
                    num={s.letter}
                    label={s.label}
                    active={activeSection === s.id}
                    reviewed={reviewedSections.has(s.id)}
                    onClick={() => scrollTo(s.id)}
                  />
                ))}
              </div>
            </div>

            <div className="mt-6 p-4 bg-[#F8FAFC] rounded-xl border border-[#0A2540]/5 flex flex-col gap-2">
              <span className="text-[#DCB149] text-[10px] font-bold uppercase tracking-[2px]">
                Critical Notice
              </span>
              <p className="text-[#334155] text-[11px] leading-[17px]">
                Withdrawal of consent may inhibit our ability to confirm or
                service your bookings. Read Section B.
              </p>
            </div>
          </aside>

          <main className="flex-1 min-w-0">
            <div className="bg-white rounded-[18px] border border-[#0A2540]/5 shadow-[0px_8px_24px_-12px_rgba(10,37,64,0.12),0px_1px_2px_rgba(10,37,64,0.04)] overflow-hidden">
              <div className="px-5 lg:px-10 py-8 lg:py-10 space-y-12">
                <section id="sA" className="scroll-mt-28">
                  <div className="flex flex-col gap-2 mb-4">
                    <div className="flex items-center gap-4">
                      <span className="text-[#DCB149] text-5xl font-bold font-['DM_Sans'] leading-none">
                        A
                      </span>
                      <SectionTitle>Introduction</SectionTitle>
                    </div>
                    <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-[#DCB149] to-transparent mt-2" />
                  </div>
                  <div className="space-y-2 mt-6">
                    <Para>
                      Traveamer recognizes the importance of privacy of its
                      users and also of maintaining confidentiality of the
                      information provided by its users as a responsible data
                      controller and data processor.
                    </Para>
                    <Para>
                      This Privacy Policy provides for the practices for
                      handling and securing user's Personal Information (defined
                      hereunder) by Traveamer.
                    </Para>
                    <Para>
                      This Privacy Policy is applicable to any person (‘User’)
                      who purchases, intends to purchase, or inquire about any
                      product(s) or service(s) made available by Traveamer
                      through any of Traveamer's customer interface channels
                      including its website, & offline channels.
                    </Para>
                    <Para>
                      For the purpose of this Privacy Policy, wherever the
                      context so requires "you" or "your" shall mean User and
                      the term "we", "us", "our" shall mean Traveamer. For the
                      purpose of this Privacy Policy, Website means the
                      website(s), mobile site(s) and mobile app(s).
                    </Para>
                    <Para>
                      By using or accessing the Website or other Sales Channels,
                      the User hereby agrees with the terms of this Privacy
                      Policy and the contents herein. If you disagree with this
                      Privacy Policy please do not use or access our Website or
                      other Sales Channels.
                    </Para>
                    <Para>
                      This Privacy Policy does not apply to any website(s),
                      mobile sites and mobile apps of third parties, even if
                      their websites/products are linked to our Website. User
                      should take note that information and privacy practices of
                      Traveamer's business partners, advertisers, sponsors or
                      other sites to which Traveamer provides hyperlink(s), may
                      be materially different from this Privacy Policy.
                      Accordingly, it is recommended that you review the privacy
                      statements and policies of any such third parties with
                      whom they interact.
                    </Para>
                    <Para>
                      This Privacy Policy is an integral part of your User
                      Agreement with Traveamer and all capitalized terms used,
                      but not otherwise defined herein, shall have the
                      respective meanings as ascribed to them in the User
                      Agreement.
                    </Para>
                  </div>
                </section>

                <section id="sB" className="scroll-mt-28">
                  <div className="flex flex-col gap-2 mb-4">
                    <div className="flex items-center gap-4">
                      <span className="text-[#DCB149] text-5xl font-bold font-['DM_Sans'] leading-none">
                        B
                      </span>
                      <SectionTitle>
                        USERS OUTSIDE THE GEOGRAPHICAL LIMITS OF INDIA
                      </SectionTitle>
                    </div>
                    <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-[#DCB149] to-transparent mt-2" />
                  </div>
                  <div className="space-y-2 mt-6">
                    <Para>
                      Please note that the data shared with Traveamer shall be
                      primarily processed in India and such other jurisdictions
                      where a third party engaged by Traveamer may process the
                      data on its behalf. By agreeing to this policy, you are
                      providing Traveamer with your explicit consent to process
                      your personal information for the purpose(s) defined in
                      this policy. The data protection regulations in India or
                      such other jurisdictions mentioned above may differ from
                      those of your country of residence.
                    </Para>
                    <Para>
                      If you have any concerns in the processing your data and
                      wish to withdraw your consent, you may do so by writing to
                      the following email id:{" "}
                      <a
                        href="mailto:contact@traveamer.com"
                        className="text-[#051D8C] underline"
                      >
                        contact@traveamer.com
                      </a>
                    </Para>
                    <Para>
                      However, if such processing of data is essential for us to
                      be able to provide a service(s) to you, then we may not be
                      able to serve or confirm your bookings after your
                      withdrawal of consent. For instance, if you make a booking
                      (flight or hotel), then certain personal information of
                      yours like contact details, gender, dietary preferences,
                      choice of room with smoking facility, any medical
                      condition which may require specific attention or facility
                      etc. may have to be shared by us with our vendors, and
                      they may further process this information for making
                      suitable arrangements for you during your trip.
                    </Para>
                    <Para>
                      A withdrawal of consent by you for us to process your
                      information may:
                    </Para>
                    <BulletList
                      items={[
                        "severely inhibit our ability to serve you properly and in such case, we may have to refuse the booking altogether, or",
                        "unreasonably restrict us to service your booking (if a booking is already made) which may further affect your trip or may compel us to cancel your booking.",
                      ]}
                    />
                  </div>
                </section>

                <section id="sC" className="scroll-mt-28">
                  <div className="flex flex-col gap-2 mb-4">
                    <div className="flex items-center gap-4">
                      <span className="text-[#DCB149] text-5xl font-bold font-['DM_Sans'] leading-none">
                        C
                      </span>
                      <SectionTitle>
                        TYPE OF INFORMATION WE COLLECT AND ITS LEGAL BASIS
                      </SectionTitle>
                    </div>
                    <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-[#DCB149] to-transparent mt-2" />
                  </div>
                  <div className="space-y-2 mt-6">
                    <Para>
                      The information as detailed below is collected for us to
                      be able to provide the services chosen by you and also to
                      fulfill our legal obligations as well as our obligations
                      towards third parties as per our User Agreement.
                    </Para>
                    <Para>
                      "Personal Information" of User shall include the
                      information shared by the User and collected by us for the
                      following purposes:
                    </Para>
                    <Para>
                      1- Registration on the Website:{" "}
                      <span className="italic">
                        Information which you provide while subscribing to or
                        registering on the Website, including but not limited to
                        information about your personal identity such as name,
                        gender, marital status, religion, age, profile picture,
                        your contact details such as your email address, postal
                        addresses, frequent flyer number, telephone (mobile or
                        otherwise) and/or fax numbers. The information may also
                        include information such as your banking details
                        (including credit/debit card) and any other information
                        relating to your income and/or lifestyle; billing
                        information payment history etc. (as shared by you).
                      </span>
                    </Para>
                    <Para>
                      2- Other information: We many also collect some other
                      information and documents including but not limited to:
                    </Para>
                    <BulletList
                      items={[
                        "Transactional history (other than banking details) about your e-commerce activities, buying behavior.",
                        "Your usernames, passwords, email addresses and other security-related information used by you in relation to our Services.",
                        "Data either created by you or by a third party and which you wish to store on our servers such as image files, documents etc.",
                        "Data available in public domain or received from any third party including social media channels, including but not limited to personal or non-personal information from your linked social media channels (like name, email address, friend list, profile pictures or any other information that is permitted to be received as per your account settings) as a part of your account information.",
                        "Information pertaining any other traveler(s) for who you make a booking through your registered Traveamer. In such case, you must confirm and represent that each of the other traveler(s) for whom a booking has been made, has agreed to have the information shared by you disclosed to us and further be shared by us with the concerned service provider(s).",
                        "If you request Traveamer to provide visa related services, then copies of your passport, bank statements, originals of the filled in application forms, photographs, and any other information which may be required by the respective embassy to process your visa application.",
                        "For international bookings, Users, in compliance with the Liberalized Remittance Scheme (LRS) of RBI or any other law may be required to provide details such as their PAN information or passport details number or any such information required by Service Provider.",
                        "In case you opt for contactless check-in at Hotels, then copies of your government identification like aadhar, driving license, election card etc., Self-declaration and any other information like date of birth, destination/origin of travel and place of residence that may be required by the concerned Hotel to honor your hotel booking.",
                      ]}
                    />
                    <Para>
                      Such information shall be strictly used for the aforesaid
                      specified & lawful purpose only. User further understands
                      that Traveamer may share this information with the end
                      service provider or any other third party for provision
                      and facilitation of the desired booking. Traveamer will
                      always redact all/any sensitive & confidential information
                      contained in the vaccination certificate, passbook, bank
                      statement or any other identity card submitted for the
                      purpose of availing a service, promotional offer or
                      booking a product on the Website. In case a User does not
                      wish to provide this information or opts for deletion of
                      the information already provided, Traveamer may not be
                      able to process the desired booking request. Traveamer
                      will never share any of the above information collected
                      including PAN card details, Vaccination status &
                      certificate, Passport details, Aadhar Card details without
                      their prior consent unless otherwise such action is
                      required by any law enforcement authority for
                      investigation, by court order or in reference to any legal
                      process.
                    </Para>
                    <div className="p-5 border-l-[3px] border-[#DCB149] rounded-lg shadow-[0px_0px_30px_-6px_rgba(220,176,72,0.50)] bg-white flex flex-col gap-2 my-4">
                      <span className="text-[#DCB149] text-[10px] font-['Segoe_UI_Symbol'] uppercase tracking-[3px]">
                        Critical Notice
                      </span>
                      <Para>
                        Traveamer will never share any of the above information
                        collected including PAN card details, Vaccination status
                        & certificate, Passport details, Aadhar Card details
                        without their prior consent unless otherwise such action
                        is required by any law enforcement authority for
                        investigation, by court order or in reference to any
                        legal process.
                      </Para>
                    </div>
                  </div>
                </section>

                <section id="sD" className="scroll-mt-28">
                  <div className="flex flex-col gap-2 mb-4">
                    <div className="flex items-center gap-4">
                      <span className="text-[#DCB149] text-5xl font-bold font-['DM_Sans'] leading-none">
                        D
                      </span>
                      <SectionTitle>
                        HOW WE USE YOUR PERSONAL INFORMATION
                      </SectionTitle>
                    </div>
                    <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-[#DCB149] to-transparent mt-2" />
                  </div>
                  <div className="space-y-2 mt-6">
                    <Para>
                      The Personal Information collected maybe used in the
                      following manner:
                    </Para>
                    <Para>
                      While making a booking: we may use Personal Information
                      including, payment details which include cardholder name,
                      credit/debit card number (in encrypted form) with
                      expiration date, banking details, wallet details etc. as
                      shared and allowed to be stored by you. We may also use
                      the information of travelers list as available in or
                      linked with your account. This information is presented to
                      the User at the time of making a booking to enable you to
                      complete your bookings expeditiously.
                    </Para>
                    <Para>
                      We may also use your Personal Information for several
                      reasons including but not limited to:
                    </Para>
                    <BulletList
                      items={[
                        "0- confirm your reservations with respective service providers;",
                        "1- keep you informed of the transaction status;",
                        "2- send booking confirmations either via sms or Whatsapp or any other messaging service;",
                        "3- send any updates or changes to your booking(s);",
                        "4- allow our customer service to contact you, if necessary;",
                        "5- customize the content of our website, mobile site and mobile app;",
                        "6- request for reviews of products or services or any other improvements;",
                        "7- send verification message(s) or email(s);",
                        "8- Validate/authenticate your account and to prevent any misuse or abuse.",
                        "9- contact you on your birthday/anniversary to offer a special gift or offer.",
                      ]}
                    />
                    <Para>
                      SURVEYS: We value opinions and comments from our Users and
                      frequently conduct surveys, both online and offline.
                      Participation in these surveys is entirely optional.
                      Typically, the information received is aggregated, and
                      used to make improvements to Website, other Sales
                      Channels, services and to develop appealing content,
                      features and promotions for members based on the results
                      of the surveys. Identity of the survey participants is
                      anonymous unless otherwise stated in the survey.
                    </Para>
                    <Para>
                      MARKETING PROMOTIONS, RESEARCH AND PROGRAMS: Marketing
                      promotions, research and programs help us to identify your
                      preferences, develop programs and improve user experience.
                      Traveamer frequently sponsors promotions to give its Users
                      the opportunity to win great travel and travel related
                      prizes. Personal Information collected by us for such
                      activities may include contact information and survey
                      questions. We use such Personal Information to notify
                      contest winners and survey information to develop
                      promotions and product improvements. As a registered User,
                      you will also occasionally receive updates from us about
                      fare sales in your area, special offers, new services,
                      other noteworthy items (like savings and benefits on
                      airfares, hotel reservations, holiday packages, car
                      rentals and other travel services) and marketing programs.
                    </Para>
                    <Para>
                      In addition, you may look forward to receiving periodic
                      marketing emails, newsletters and exclusive promotions
                      offering special deals.
                    </Para>
                    <Para>
                      From time to time we may add or enhance services available
                      on the Website. To the extent these services are provided,
                      and used by you, we will use the Personal Information you
                      provide to facilitate the service(s) requested. For
                      example, if you email us with a question, we will use your
                      email address, name, nature of the question, etc. to
                      respond to your question. We may also store such Personal
                      Information to assist us in making the Website the better
                      and easier to use for our Users.
                    </Para>
                  </div>
                </section>

                <section id="sE" className="scroll-mt-28">
                  <div className="flex flex-col gap-2 mb-4">
                    <div className="flex items-center gap-4">
                      <span className="text-[#DCB149] text-5xl font-bold font-['DM_Sans'] leading-none">
                        E
                      </span>
                      <SectionTitle>
                        HOW LONG DO WE KEEP YOUR PERSONAL INFORMATION?
                      </SectionTitle>
                    </div>
                    <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-[#DCB149] to-transparent mt-2" />
                  </div>
                  <div className="space-y-2 mt-6">
                    <Para>
                      Traveamer will retain your Personal Information on its
                      servers for as long as is reasonably necessary for the
                      purposes listed in this policy. In some circumstances we
                      may retain your Personal Information longer periods of
                      time, for instance where we are required to do so in
                      accordance with any legal, regulatory, tax or accounting
                      requirements.
                    </Para>
                    <Para>
                      Where your personal data is no longer required we will
                      ensure it is either securely deleted or stored in a way
                      which means it will no longer be used by the business.
                    </Para>
                    <Para>
                      In case user wishes to delete their account, they can send
                      mail to{" "}
                      <a
                        href="mailto:contact@traveamer.com"
                        className="text-[#051D8C] underline"
                      >
                        contact@traveamer.com
                      </a>
                    </Para>
                  </div>
                </section>

                <section id="sF" className="scroll-mt-28">
                  <div className="flex flex-col gap-2 mb-4">
                    <div className="flex items-center gap-4">
                      <span className="text-[#DCB149] text-5xl font-bold font-['DM_Sans'] leading-none">
                        F
                      </span>
                      <SectionTitle>Cookies & Session Data</SectionTitle>
                    </div>
                    <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-[#DCB149] to-transparent mt-2" />
                  </div>
                  <div className="space-y-2 mt-6">
                    <Para>
                      1- Cookies: Traveamer uses cookies to personalize your
                      experience on the Website and the advertisements that
                      maybe displayed. Traveamer's use of cookies is similar to
                      that of any other reputable online companies. <br />
                      Cookies are small pieces of information that are stored by
                      your browser on your device's hard drive. Cookies allow us
                      to serve you better and more efficiently. Cookies also
                      allow ease of access, by logging you in without having to
                      type your login name each time (only your password is
                      needed); we may also use such cookies to display any
                      advertisement(s) to you while you are on the Website or to
                      send you offers focusing on destinations which may be of
                      your interest.
                    </Para>
                    <Para>
                      A cookie may also be placed by our advertising servers, or
                      third party advertising companies. Such cookies are used
                      for purposes of tracking the effectiveness of advertising
                      served by us on any website, and also to use aggregated
                      statistics about your visits to the Website in order to
                      provide advertisements in the Website or any other website
                      about services that may be of potential interest to you.
                      The third party advertising companies or advertisement
                      providers may also employ technology that is used to
                      measure the effectiveness of the advertisements. All such
                      information is anonymous. This anonymous information is
                      collected through the use of a pixel tag, which is an
                      industry standard technology and is used by all major
                      websites. They may use this anonymous information about
                      your visits to the Website in order to provide
                      advertisements about goods and services of potential
                      interest to you. No Personal Information is collected
                      during this process. The information so collected during
                      this process, is anonymous, and does not link online
                      actions to a User.
                    </Para>
                    <Para>
                      Most web browsers automatically accept cookies. Of course,
                      by changing the options on your web browser or using
                      certain software programs, you can control how and whether
                      cookies will be accepted by your browser. Traveamer
                      supports your right to block any unwanted internet
                      activity, especially that of unscrupulous websites.
                      However, blocking Traveamer cookies may disable certain
                      features on the Website, and may hinder an otherwise
                      seamless experience to purchase or use certain services
                      available on the Website. Please note that it is possible
                      to block cookie activity from certain websites while
                      permitting cookies from websites you trust.
                    </Para>
                    <Para>
                      2- Automatic Logging of Session Data: Each time you access
                      the Website your session data gets logged. Session data
                      may consist of various aspects like the IP address,
                      operating system and type of browser software being used
                      and the activities conducted by the User while on the
                      Website. We collect session data because it helps us
                      analyze User's choices, browsing pattern including the
                      frequency of visits and duration for which a User is
                      logged on. It also helps us diagnose problems with our
                      servers and lets us better administer our systems. The
                      aforesaid information cannot identify any User personally.
                      However, it may be possible to determine a User's Internet
                      Service Provider (ISP), and the approximate geographic
                      location of User's point of connectivity through the above
                      session data.
                    </Para>
                  </div>
                </section>

                <section id="sG" className="scroll-mt-28">
                  <div className="flex flex-col gap-2 mb-4">
                    <div className="flex items-center gap-4">
                      <span className="text-[#DCB149] text-5xl font-bold font-['DM_Sans'] leading-none">
                        G
                      </span>
                      <SectionTitle>
                        WITH WHOM YOUR PERSONAL INFORMATION IS SHARED
                      </SectionTitle>
                    </div>
                    <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-[#DCB149] to-transparent mt-2" />
                  </div>
                  <div className="space-y-2 mt-6">
                    <Para>
                      1- Service Providers and suppliers: Your information shall
                      be shared with the end service providers like airlines,
                      hotels, bus service providers, cab rental, railways or any
                      other suppliers who are responsible for fulfilling your
                      booking. You may note that while making a booking with
                      Traveamer you authorize us to share your information with
                      the said service providers and suppliers. It is pertinent
                      to note that Traveamer does not authorize the end service
                      provider to use your information for any other purpose(s)
                      except as may be for fulfilling their part of service.
                      However, how the said service providers/suppliers use the
                      information shared with them is beyond the purview and
                      control of Traveamer as they process Personal Information
                      as independent data controllers, and hence we cannot be
                      made accountable for the same. You are therefore advised
                      to review the privacy policies of the respective service
                      provider or supplier whose services you choose to avail.
                    </Para>
                    <Para>
                      Traveamer does not sell or rent individual customer names
                      or other Personal Information of Users to third parties
                      except sharing of such information with our business /
                      alliance partners or vendors who are engaged by us for
                      providing various referral services and for sharing
                      promotional and other benefits to our customers from time
                      to time basis their booking history with us.
                    </Para>
                    <Para>
                      2. DISCLOSURE OF INFORMATION • In addition to the
                      circumstances described above, Traveamer may disclose
                      User's Personal Information if required to do so:
                    </Para>
                    <Para>
                      3. by law, required by any enforcement authority for
                      investigation, by court order or in reference to any legal
                      process;
                    </Para>
                    <Para>
                      3. by law, required by any enforcement authority for
                      investigation, by court order or in reference to any legal
                      process;
                    </Para>
                    <Para>4. to conduct our business;</Para>
                    <Para>
                      5. for regulatory, internal compliance and audit
                      exercise(s)
                    </Para>
                    <Para>6. to secure our systems; or</Para>
                    <Para>
                      7. to enforce or protect our rights or properties of
                      Traveamer or any or all of its affiliates, associates,
                      employees, directors or officers or when we have reason to
                      believe that disclosing Personal Information of User(s) is
                      necessary to identify, contact or bring legal action
                      against someone who may be causing interference with our
                      rights or properties, whether intentionally or otherwise,
                      or when anyone else could be harmed by such activities.
                      Such disclosure and storage may take place without your
                      knowledge. In that case, we shall not be liable to you or
                      any third party for any damages howsoever arising from
                      such disclosure and storage.
                    </Para>
                  </div>
                </section>

                <section id="sH" className="scroll-mt-28">
                  <div className="flex flex-col gap-2 mb-4">
                    <div className="flex items-center gap-4">
                      <span className="text-[#DCB149] text-5xl font-bold font-['DM_Sans'] leading-none">
                        H
                      </span>
                      <SectionTitle>Disclosure of Information</SectionTitle>
                    </div>
                    <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-[#DCB149] to-transparent mt-2" />
                  </div>
                  <div className="space-y-2 mt-6">
                    <Para>
                      DISCLOSURE OF INFORMATION: Traveamer may disclose User's
                      Personal Information if required to do so: by law, for
                      investigation, by court order, to conduct our business,
                      for regulatory audit, to secure our systems, or to protect
                      our rights or properties.
                    </Para>
                  </div>
                </section>

                <section id="sI" className="scroll-mt-28">
                  <div className="flex flex-col gap-2 mb-4">
                    <div className="flex items-center gap-4">
                      <span className="text-[#DCB149] text-5xl font-bold font-['DM_Sans'] leading-none">
                        I
                      </span>
                      <SectionTitle>
                        HOW CAN YOU OPT-OUT OF RECEIVING OUR PROMOTIONAL E
                        MAILS?
                      </SectionTitle>
                    </div>
                    <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-[#DCB149] to-transparent mt-2" />
                  </div>
                  <div className="space-y-2 mt-6">
                    <Para>
                      You will occasionally receive e-mail updates from us about
                      fare sales in your area, special offers, new Traveamer
                      services, and other noteworthy items. We hope you will
                      find these updates interesting and informative. If you
                      wish not to receive them, please click on the
                      "unsubscribe" link or follow the instructions in each
                      e-mail message.
                    </Para>
                  </div>
                </section>

                <section id="sJ" className="scroll-mt-28">
                  <div className="flex flex-col gap-2 mb-4">
                    <div className="flex items-center gap-4">
                      <span className="text-[#DCB149] text-5xl font-bold font-['DM_Sans'] leading-none">
                        J
                      </span>
                      <SectionTitle>
                        HOW WE PROTECT YOUR PERSONAL INFORMATION?
                      </SectionTitle>
                    </div>
                    <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-[#DCB149] to-transparent mt-2" />
                  </div>
                  <div className="space-y-2 mt-6">
                    <Para>
                      All payments on the Website are secured. This means all
                      Personal Information you provide is transmitted using TLS
                      (Transport Layer Security) encryption. TSL is a proven
                      coding system that lets your browser automatically
                      encrypt, or scramble, data before you send it to us.
                      Website has stringent security measures in place to
                      protect the loss, misuse, and alteration of the
                      information under our control. Whenever you change or
                      access your account information, we offer the use of a
                      secure server. Once your information is in our possession
                      we adhere to strict security guidelines, protecting it
                      against unauthorized access.
                    </Para>
                  </div>
                </section>

                <section id="sK" className="scroll-mt-28">
                  <div className="flex flex-col gap-2 mb-4">
                    <div className="flex items-center gap-4">
                      <span className="text-[#DCB149] text-5xl font-bold font-['DM_Sans'] leading-none">
                        K
                      </span>
                      <SectionTitle>
                        WITHDRAWAL OF CONSENT AND PERMISSION
                      </SectionTitle>
                    </div>
                    <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-[#DCB149] to-transparent mt-2" />
                  </div>
                  <div className="space-y-2 mt-6">
                    <Para>
                      You may withdraw your consent to submit any or all
                      Personal Information or decline to provide any permissions
                      on its Website as covered above at any time. In case, you
                      choose to do so then your access to the Website may be
                      limited, or we might not be able to provide the services
                      to you. You may withdraw your consent by sending an email
                      to{" "}
                      <a
                        href="mailto:contact@traveamer.com"
                        className="text-[#051D8C] underline"
                      >
                        contact@traveamer.com
                      </a>
                      .
                    </Para>
                  </div>
                </section>

                <section id="sL" className="scroll-mt-28">
                  <div className="flex flex-col gap-2 mb-4">
                    <div className="flex items-center gap-4">
                      <span className="text-[#DCB149] text-5xl font-bold font-['DM_Sans'] leading-none">
                        L
                      </span>
                      <SectionTitle>
                        YOUR RIGHTS QUA PERSONAL INFORMATION
                      </SectionTitle>
                    </div>
                    <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-[#DCB149] to-transparent mt-2" />
                  </div>
                  <div className="space-y-2 mt-6">
                    <Para>
                      You may access your Personal Information from your user
                      account with Traveamer. You may also correct your personal
                      information or delete such information (except some
                      mandatory fields) from your user account directly. If you
                      don’t have such a user account, then you write to{" "}
                      <a
                        href="mailto:contact@traveamer.com"
                        className="text-[#0B111F] underline"
                      >
                        contact@traveamer.com
                      </a>
                      .
                    </Para>
                  </div>
                </section>

                <section id="sM" className="scroll-mt-28">
                  <div className="flex flex-col gap-2 mb-4">
                    <div className="flex items-center gap-4">
                      <span className="text-[#DCB149] text-5xl font-bold font-['DM_Sans'] leading-none">
                        M
                      </span>
                      <SectionTitle>
                        ELIGIBILITY TO TRANSACT WITH Traveamer
                      </SectionTitle>
                    </div>
                    <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-[#DCB149] to-transparent mt-2" />
                  </div>
                  <div className="space-y-2 mt-6">
                    <Para>
                      You must atleast 18 years of age to transact directly with
                      Traveamer and also to consent to the processing of your
                      personal data.
                    </Para>
                  </div>
                </section>

                <section id="sN" className="scroll-mt-28">
                  <div className="flex flex-col gap-2 mb-4">
                    <div className="flex items-center gap-4">
                      <span className="text-[#DCB149] text-5xl font-bold font-['DM_Sans'] leading-none">
                        N
                      </span>
                      <SectionTitle>CHANGES TO THE PRIVACY POLICY</SectionTitle>
                    </div>
                    <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-[#DCB149] to-transparent mt-2" />
                  </div>
                  <div className="space-y-2 mt-6">
                    <Para>
                      Changes: We reserve the rights to revise the Privacy
                      Policy from time to time to suit various legal, business
                      and customer requirement. We will duly notify the users as
                      may be necessary.{" "}
                      <a
                        href="mailto:contact@traveamer.com"
                        className="text-[#051D8C] underline"
                      >
                        contact@traveamer.com
                      </a>
                      .
                    </Para>
                  </div>
                </section>

                <div className="mt-12 p-8 lg:p-10 bg-gradient-to-br from-[#051D8C] to-[#030E30] rounded-[14px] shadow-[0px_20px_60px_-20px_rgba(3,14,47,0.45)] flex flex-col gap-3">
                  <span className="text-[#DCB149] text-[10px] font-['Plus_Jakarta_Sans'] uppercase tracking-[3.5px]">
                    Data Protection Office
                  </span>
                  <h3 className="text-white text-[30px] font-bold font-['DM_Sans'] leading-[37.5px]">
                    Questions, withdrawals, or deletion requests?
                  </h3>
                  <p className="text-white/80 text-[15.8px] font-['Plus_Jakarta_Sans'] leading-[28.8px] max-w-xl mb-3">
                    Write to our Privacy team — we respond to every legitimate
                    request in a timely, lawful manner.
                  </p>
                  <a
                    href="mailto:contact@traveamer.com"
                    className="inline-flex items-center gap-2 bg-[#DCB149] text-[#030E30] px-5 py-2.5 rounded-full w-max text-sm font-['Plus_Jakarta_Sans']"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M2.66663 4H13.3333C14.0697 4 14.6666 4.59695 14.6666 5.33333V10.6667C14.6666 11.403 14.0697 12 13.3333 12H2.66663C1.93025 12 1.33329 11.403 1.33329 10.6667V5.33333C1.33329 4.59695 1.93025 4 2.66663 4Z"
                        stroke="#030E30"
                        strokeWidth="1.33"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M14.6666 4L8.35824 8.73132C8.15082 8.88688 7.84904 8.88688 7.64161 8.73132L1.33329 4"
                        stroke="#030E30"
                        strokeWidth="1.33"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    contact@traveamer.com
                  </a>
                </div>

                <div className="pt-6 border-t border-[#0A2540]/10 text-center">
                  <p className="text-[#334155]/70 text-sm">
                    You have reached the end of the Privacy Policy.
                  </p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Acceptance Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pointer-events-none">
        <div className="max-w-[1340px] mx-auto pointer-events-auto">
          <div className={`rounded-[24px] border px-4 lg:px-6 py-4 lg:py-4 flex flex-col sm:flex-row items-center gap-4 shadow-[0px_20px_40px_-20px_rgba(10,37,64,0.5)] transition-all duration-500 ${
            allDone
              ? "bg-[#0A2540] border-white/10"
              : "bg-[#0A2540]/95 border-white/10 backdrop-blur-md"
          }`}>
            <div className="flex items-center gap-4 w-full">
              <CircularProgress pct={pct} allDone={allDone} />
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm lg:text-[15px] font-bold font-['DM_Sans'] leading-tight lg:leading-snug">
                  {allDone ? "You've reviewed the entire privacy policy" : `Reading privacy policy… ${reviewedCount} of ${TOTAL}`}
                </p>
                <p className="text-white/60 text-[11px] lg:text-xs mt-0.5">
                  {allDone
                    ? "Tap 'Accept & Continue' to confirm agreement."
                    : "Scroll to the end to enable the button."}
                </p>
              </div>
            </div>

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
                className={`flex-1 sm:flex-none px-6 py-2.5 lg:py-2.5 text-xs lg:text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
                  allDone
                    ? "bg-[#DCB149] text-[#0A2540] hover:bg-[#c9a432] active:scale-[0.98] cursor-pointer"
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

      {showModal && <SuccessModal onClose={handleModalClose} />}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(10, 37, 64, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(10, 37, 64, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(10, 37, 64, 0.2);
        }
      `}</style>
    </div>
  );
}
