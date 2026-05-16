import { useState, useEffect, useRef } from "react";
import LandingHeader from "../../../layout/LandingHeader";
import { FiChevronDown, FiSearch } from "react-icons/fi";
import LandingFooter from "../../../layout/LandingFooter";

// ─── FAQ Data ─────────────────────────────────────────────────────────────────
const FAQ_SECTIONS = [
  {
    id: "about-traveamer",
    number: "01",
    title: "About Traveamer",
    items: [
      {
        q: "What is Traveamer?",
        a: "Traveamer is a corporate travel management platform built specifically for Indian MSMEs and independent professionals. It lets your team book flights and hotels, get approvals, and tag every trip to a project — all in one place.",
      },
      {
        q: "Who is Traveamer built for?",
        a: "Traveamer is built for any business or professional where travel needs to be organised and tracked. From a solo CA visiting clients to a 500-person manufacturing company — Traveamer adapts to your size.",
      },
      {
        q: "Is Traveamer built for India specifically?",
        a: "Yes. Traveamer is built from the ground up for how Indian businesses operate — the approval culture, the MSME reality, the project-based billing, and the need for clean documentation for CAs and auditors.",
      },
    ],
  },
  {
    id: "getting-started",
    number: "02",
    title: "Getting Started",
    items: [
      {
        q: "How long does it take to set up?",
        a: "Most companies are live within 2 hours. You connect your SSO, add your team, set up your projects, and recharge your travel wallet. That is all.",
      },
      {
        q: "Do my employees need to download an app?",
        a: "No. Traveamer works on any browser — desktop or mobile. No app download required.",
      },
      {
        q: "Can my team log in with their existing company accounts?",
        a: "Yes. Traveamer supports SSO login via Google Workspace, Microsoft 365, and Zoho Workplace. Employees log in with the same account they use every day.",
      },
      {
        q: "Do I need an IT team to set up Traveamer?",
        a: "No. Traveamer is designed to be set up by a non-technical person. Your Travel Admin or office manager can have it running without any IT involvement.",
      },
    ],
  },
  {
    id: "how-it-works",
    number: "03",
    title: "How It Works",
    items: [
      {
        q: "How does the approval process work?",
        a: "Employee raises a travel request. Travel Admin reviews and approves in one click. Manager is notified and kept informed. Employee then books directly. Everything is documented automatically.",
      },
      {
        q: "Can the MD or senior leadership book without approval?",
        a: "Yes. Super Users — typically MD, Directors, or senior leadership — can book directly without going through the approval process.",
      },
      {
        q: "What is a Project Cost ID?",
        a: "A Project Cost ID is a unique tag assigned to every trip. It tells Traveamer which project or client the travel cost belongs to. It is mandatory on every booking so every rupee is always allocated to the right place.",
      },
      {
        q: "Who creates the Project Cost IDs?",
        a: "The Travel Admin creates and manages all projects in the system. Employees select from the list when raising a request. Admin confirms or corrects at approval.",
      },
      {
        q: "Can a secretary book on behalf of a senior person?",
        a: "Yes. The Secretary or EA role allows someone to book travel on behalf of assigned principals. Every booking clearly shows who booked and on whose behalf.",
      },
      {
        q: "What happens if the manager is unavailable?",
        a: "The Travel Admin can approve independently. The system does not wait for the manager — it ensures every request is handled without delay.",
      },
    ],
  },
  {
    id: "booking",
    number: "04",
    title: "Booking",
    items: [
      {
        q: "Which airlines are available on Traveamer?",
        a: "Traveamer covers 500+ airlines across 190+ countries — including all major domestic Indian carriers like IndiGo, Air India, Vistara, and SpiceJet.",
      },
      {
        q: "Which hotels can my team book?",
        a: "Traveamer covers 800,000+ properties worldwide — from budget business hotels to premium chains across all Indian cities and internationally.",
      },
      {
        q: "Can employees select their own seats?",
        a: "Yes — based on their seat rights configured by the Travel Admin. Basic employees get free seats. Standard and senior employees can access paid seats within their allowed limits.",
      },
      {
        q: "What if an employee already booked outside Traveamer?",
        a: "The employee can upload their receipt. The claim is processed and the cost is tagged to the relevant Project Cost ID.",
      },
    ],
  },
  {
    id: "pricing-wallet",
    number: "05",
    title: "Pricing & Wallet",
    items: [
      {
        q: "How does Traveamer charge?",
        a: "Traveamer charges a small convenience fee per booking. There is no monthly subscription or platform fee. You only pay when your team books.",
      },
      {
        q: "What is the Travel Wallet?",
        a: "The Travel Wallet is a dedicated company account for all travel bookings. Finance team recharges it. Every booking deducts automatically. Live balance is always visible.",
      },
      {
        q: "Is there a minimum recharge amount for the wallet?",
        a: "No minimum. Recharge as much or as little as you need — via UPI, NEFT, or IMPS.",
      },
    ],
  },
  {
    id: "security-data",
    number: "06",
    title: "Security & Data",
    items: [
      {
        q: "Is our company data safe?",
        a: "Yes. All data is encrypted and stored securely. We do not share your company's travel data with any third party.",
      },
      {
        q: "Can I export our travel data?",
        a: "Yes. All travel reports — by project, by employee, by date — can be exported for your CA or finance team at any time.",
      },
    ],
  },
  {
    id: "cancellations-changes",
    number: "07",
    title: "Cancellations & Changes",
    items: [
      {
        q: "Can employees cancel a booking on Traveamer?",
        a: "Yes. Employees can raise a cancellation request directly on the platform. Travel Admin reviews and processes it. Cancellation charges — if any — are shown upfront before confirming.",
      },
      {
        q: "Can bookings be modified after confirmation?",
        a: "Yes. Date changes, hotel modifications, and flight changes can be requested through the platform. Subject to airline and hotel cancellation and modification policies.",
      },
      {
        q: "What happens to the refund when a booking is cancelled?",
        a: "Refunds — after applicable cancellation charges — are credited back to the company travel wallet automatically. The Project Cost ID ledger is updated accordingly.",
      },
      {
        q: "What if the airline cancels or reschedules the flight?",
        a: "Traveamer notifies the employee and Travel Admin immediately. Options for rebooking or refund are presented and the employee can act directly on the platform.",
      },
      {
        q: "Who can raise a cancellation request?",
        a: "The employee who made the booking or the Travel Admin can raise a cancellation request. Final processing is always done by the Travel Admin.",
      },
    ],
  },
  {
    id: "support",
    number: "08",
    title: "Support",
    items: [
      {
        q: "What kind of support does Traveamer offer?",
        a: "Traveamer offers email and chat support for all users. For onboarding and setup, a dedicated onboarding specialist assists your Travel Admin to get the platform live.",
      },
      {
        q: "What are the support hours?",
        a: "Support is available Monday to Saturday — 9AM to 7PM IST. Emergency travel support is available outside these hours for active bookings.",
      },
      {
        q: "How quickly does Traveamer respond to support requests?",
        a: "We aim to respond to all support queries within 4 business hours. Urgent booking issues are prioritised and addressed within 1 hour.",
      },
      {
        q: "Is there a help centre or documentation available?",
        a: "Yes. Traveamer has a comprehensive help centre with step-by-step guides for every feature for Travel Admins, employees, and managers. Available 24/7.",
      },
      {
        q: "Can Traveamer help with onboarding our team?",
        a: "Yes. Our onboarding team will guide your Travel Admin through the complete setup — SSO connection, employee onboarding, project setup, and wallet activation.",
      },
    ],
  },
  {
    id: "travel-admin",
    number: "09",
    title: "Travel Admin Specific",
    items: [
      {
        q: "Can there be more than one Travel Admin?",
        a: "Currently, Traveamer supports one Travel Admin per company. This is intentional, keeping operations centralised and clean.",
      },
      {
        q: "What happens if the Travel Admin is on leave?",
        a: "The company owner or Super User can temporarily handle approvals. We recommend designating a backup before planned leave.",
      },
      {
        q: "Can the Travel Admin see all bookings across the company?",
        a: "Yes. Travel Admin has full visibility of every booking, every approval, every pending request, and the live wallet balance — all from one dashboard.",
      },
    ],
  },
  {
    id: "independent-professionals",
    number: "10",
    title: "For Independent Professionals",
    items: [
      {
        q: "I work alone — do I need an approval workflow?",
        a: "No. If you register as a solo professional or a firm of under 10 people, there is no approval workflow. You search, book, and tag to your client directly.",
      },
      {
        q: "How do I track which trip was for which client?",
        a: "Every trip is tagged to a Project Cost ID — which in your case is your client name or engagement. Your monthly report shows exactly how much you spent per client.",
      },
      {
        q: "Can I use Traveamer for personal travel too?",
        a: "Traveamer is built for business travel only. All bookings require a Project Cost ID and are recorded for business documentation purposes.",
      },
    ],
  },
];

// ─── FAQ Accordion Item ───────────────────────────────────────────────────────
function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-black/[0.08]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 py-5 text-left hover:bg-slate-50/40 px-1 transition-colors"
      >
        <span className="text-[#0A0A0A] text-[16px] font-semibold font-['DM_Sans'] leading-[24px] flex-1">
          {q}
        </span>
        <div
          className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 transition-colors ${
            open ? "bg-[#051D8C]" : "bg-slate-100"
          }`}
        >
          <FiChevronDown
            size={14}
            className={`transition-transform duration-200 ${
              open ? "rotate-180 text-white" : "text-slate-500"
            }`}
          />
        </div>
      </button>
      {open && (
        <div className="pb-5 px-1">
          <p className="text-[#3A3A3A] text-[15px] font-['Plus_Jakarta_Sans'] leading-[26px]">
            {a}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function FAQs() {
  const [activeCategory, setActiveCategory] = useState("about-traveamer");
  const [searchQuery, setSearchQuery] = useState("");
  const isClickScrolling = useRef(false);

  // ── IntersectionObserver: sync sidebar with scroll position ────────────────
  useEffect(() => {
    const sectionIds = FAQ_SECTIONS.map((s) => s.id);
    const observers = [];

    const callback = (entries) => {
      // Skip if the user triggered a click-scroll (avoid flicker)
      if (isClickScrolling.current) return;

      // Pick the entry that is most visible and closest to the top
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

      if (visible.length > 0) {
        setActiveCategory(visible[0].target.id);
      }
    };

    const observer = new IntersectionObserver(callback, {
      root: null,
      rootMargin: "-10% 0px -60% 0px",
      threshold: 0,
    });

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const filteredSections = FAQ_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) =>
        searchQuery === "" ||
        item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.a.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((s) => s.items.length > 0);

  const handleCategoryClick = (id) => {
    setActiveCategory(id);
    isClickScrolling.current = true;
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    // Re-enable observer tracking after scroll animation (~800ms)
    setTimeout(() => { isClickScrolling.current = false; }, 900);
  };

  return (
    <div className="min-h-screen bg-white font-['Plus_Jakarta_Sans']">
      <LandingHeader />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative w-full bg-gradient-to-br from-[#051D8C] to-[#030E30] overflow-hidden">
        <div className="absolute top-[-80px] right-[-40px] w-[400px] h-[400px] rounded-full bg-[radial-gradient(ellipse_70%_70%_at_50%_50%,rgba(120,140,255,0.3)_0%,rgba(120,140,255,0)_70%)] blur-[10px] pointer-events-none" />

        <div className="max-w-[1340px] mx-auto px-6 md:px-10 py-16 relative z-10 flex flex-col gap-6">
          {/* Label */}
          <div className="w-full max-w-[798px] px-2.5 py-0.5 bg-[#C9A240] inline-flex flex-col justify-center items-start">
            <div className="inline-flex justify-start items-center gap-3">
              <div className="inline-flex flex-col justify-start items-start">
                <div className="justify-center text-black/90 text-xs font-bold font-['Plus_Jakarta_Sans'] uppercase leading-4 tracking-[2.50px]">
                  Help Centre
                </div>
              </div>
            </div>
          </div>

          <h1 className="text-white text-[42px] md:text-[60px] font-bold font-['DM_Sans'] leading-[1.1] max-w-[700px]">
            Frequently Asked<br className="hidden md:block" />Questions
          </h1>

          <p className="text-white/80 text-[17px] font-light font-['Plus_Jakarta_Sans'] leading-[28px] max-w-[680px]">
            Everything you need to know about Traveamer — from setup and approvals to wallets, bookings and support.
          </p>

          {/* Search */}
          <div className="relative max-w-[560px] mt-2">
            <div className="pl-12 pr-5 pt-4 pb-5 bg-white rounded-full outline outline-1 outline-offset-[-1px] outline-[#D9D9D9] flex justify-center items-start overflow-hidden">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[#666666]" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for a topic (e.g., Wallet, Approvals)..."
                className="flex-1 w-full bg-transparent text-[#0A0A0A] placeholder-[#A3A3A3] text-[16px] font-normal font-['Plus_Jakarta_Sans'] focus:outline-none"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
      <div className="max-w-[1340px] mx-auto px-6 md:px-10 py-16 flex flex-col md:flex-row gap-8 md:gap-12 items-start">

        {/* ── LEFT SIDEBAR ───────────────────────────────────────────────── */}
        <aside className="w-full md:w-[220px] shrink-0 md:sticky top-8 overflow-x-auto md:overflow-visible scrollbar-hide border-b border-black/[0.08] md:border-none pb-2 md:pb-0 z-20 bg-white">
          <p className="text-[#0A0A0A] text-[12px] font-bold font-['Plus_Jakarta_Sans'] uppercase tracking-[2px] mb-4 hidden md:block">
            Categories
          </p>
          <nav className="flex md:flex-col gap-6 md:gap-0 whitespace-nowrap md:whitespace-normal">
            {FAQ_SECTIONS.map((section) => {
              const isActive = activeCategory === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => handleCategoryClick(section.id)}
                  className={`flex items-center gap-0 text-left pb-3 md:pb-0 md:py-3 border-b-[3px] md:border-b-0 md:border-l-[3px] md:pl-3 transition-all ${
                    isActive
                      ? "border-[#051D8C] text-[#051D8C] font-bold"
                      : "border-transparent md:border-black/[0.08] text-[#3A3A3A] font-normal hover:border-[#051D8C]/40 hover:text-[#051D8C]"
                  } text-[13px] font-['Plus_Jakarta_Sans'] leading-[20px]`}
                >
                  {section.title}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* ── FAQ SECTIONS ───────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col gap-14 min-w-0">
          {(searchQuery ? filteredSections : FAQ_SECTIONS).map((section) => (
            <div key={section.id} id={section.id} className="scroll-mt-8">
              {/* Section header */}
              <div className="flex items-center gap-4 mb-6">
                <span className="text-[#051D8C] text-[13px] font-bold font-['DM_Sans'] tracking-[1px]">
                  {section.number}
                </span>
                <h2 className="text-[#0A0A0A] text-[22px] md:text-[26px] font-bold font-['DM_Sans'] leading-[1.2] md:leading-[34px]">
                  {section.title}
                </h2>
              </div>

              {/* Accordion items */}
              <div className="border border-black/[0.08] px-4 md:px-6">
                {section.items.map((item, i) => (
                  <FAQItem key={i} q={item.q} a={item.a} />
                ))}
              </div>
            </div>
          ))}

          {searchQuery && filteredSections.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <p className="text-[#0A0A0A] text-[20px] font-bold font-['DM_Sans']">No results found</p>
              <p className="text-[#3A3A3A] text-[15px] font-['Plus_Jakarta_Sans']">
                Try a different keyword, or{" "}
                <a href="/legal/contact-us" className="text-[#051D8C] underline">contact us</a> directly.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── CTA BANNER ───────────────────────────────────────────────────── */}
      <section className="max-w-[1340px] mx-auto px-6 md:px-10 pb-24">
        <div className="relative w-full bg-gradient-to-br from-[#051D8C] to-[#030E30] overflow-hidden rounded-sm flex flex-col items-center justify-center gap-5 px-6 md:px-8 text-center py-10 md:py-14">
          <div className="absolute top-[-60px] right-[-40px] w-[400px] h-[300px] rounded-full bg-[radial-gradient(ellipse_70%_70%_at_50%_50%,rgba(255,255,255,0.15)_0%,rgba(255,255,255,0)_70%)] pointer-events-none" />
          <p className="relative z-10 text-white text-[26px] md:text-[34px] font-bold font-['DM_Sans'] leading-[1.2] md:leading-[44px]">
            Still have questions?
          </p>
          <p className="relative z-10 text-white/75 text-[16px] font-['Plus_Jakarta_Sans'] leading-[27px] max-w-[480px]">
            Our team is happy to walk you through anything. Reach out and we'll get back to you quickly.
          </p>
          <a
            href="/legal/contact-us"
            className="relative z-10 mt-1 inline-block bg-[#C9A84C] text-black text-[14px] font-semibold font-['Plus_Jakarta_Sans'] px-8 py-3 rounded-full hover:brightness-110 transition-all"
          >
            Contact Us
          </a>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <LandingFooter />
    </div>
  );
}
