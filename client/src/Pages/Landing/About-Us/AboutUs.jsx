import HeroBg from "../../../assets/About-us-hero.svg";
import LandingFooter from "../../../layout/LandingFooter";
import LandingHeader from "../../../layout/LandingHeader";

// ─── Section Divider ─────────────────────────────────────────────────────────
function GoldDivider() {
  return (
    <div className="w-full max-w-[512px] h-[2px] bg-gradient-to-r from-[#C9A240] to-white" />
  );
}

// ─── Belief Item ─────────────────────────────────────────────────────────────
function BeliefItem({ number, text }) {
  return (
    <div className="relative bg-white border border-black/[0.08] p-8 flex items-start gap-6 h-full">
      {/* Left blue accent bar */}
      <div className="absolute left-0 top-0 h-full w-[3px] bg-gradient-to-b from-[#051D8C] to-[#030E30]" />
      <span className="text-[#051D8C] text-[13px] font-bold font-['DM_Sans'] tracking-[1px] leading-[19.5px] min-w-[28px] pt-0.5">
        {number}
      </span>
      <p className="text-black text-[18px] font-medium font-['DM_Sans'] leading-[26.1px]">
        {text}
      </p>
    </div>
  );
}

// ─── Comparison Row ──────────────────────────────────────────────────────────
function ComparisonRow({ others, traveamer, isFirst = false }) {
  return (
    <div
      className={`grid grid-cols-2  ${!isFirst ? "border-t border-black/[0.08]" : ""}`}
    >
      <div className="px-4 py-4 md:px-8 md:py-6">
        <p className="text-[#666666] text-[14px] md:text-[16px] font-['Plus_Jakarta_Sans'] leading-[22px] md:leading-[24.8px]">
          {others}
        </p>
      </div>
      <div className="px-4 py-4 md:px-8 md:py-6 border-l-4 border-[#051D8C]">
        <p className="text-[#0A0A0A] text-[15px] md:text-[17px] font-medium font-['DM_Sans'] leading-[23px] md:leading-[25.5px]">
          {traveamer}
        </p>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function AboutUs() {
  return (
    <div className="min-h-screen bg-white font-['Plus_Jakarta_Sans']">
      <LandingHeader />

      {/* ── HERO SECTION ─────────────────────────────────────────────────── */}
      <section
        className="relative w-full min-h-[720px] bg-cover bg-center overflow-hidden flex items-center"
        style={{ backgroundImage: `url(${HeroBg})` }}
      >
        {/* Deep Blue/Dark Overlay */}
        <div className="absolute inset-0 bg-[#051D8C]/50 pointer-events-none" />

        {/* Stronger Bottom Gradient for Cinematic Look */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#051D8C]/10 via-transparent to-[#030E30]/80 pointer-events-none" />

        <div className="relative w-full max-w-[1340px] mx-auto px-6 md:px-10 py-16 md:py-20 flex flex-col items-center gap-10 md:gap-12">
          {/* Headline Pill - Wider and more prominent */}

          <div
            className="w-full max-w-[880.95px] px-6 sm:px-10 md:px-14 bg-[#D4AF37] rounded-[28px] sm:rounded-[40px] md:rounded-[62px] inline-flex flex-col justify-center items-center mx-auto"
          >
            <div
              className="text-center justify-center text-black text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold font-['DM_Sans'] leading-tight md:leading-[88px]"
            >
              Who We Are
            </div>
          </div>

          {/* Body text - Updated weights and sizing */}
          <div className="flex flex-col gap-6 md:gap-8 max-w-[870px] text-center">
            <p className="text-white text-[15px] md:text-[20px] font-medium font-['Plus_Jakarta_Sans'] leading-relaxed tracking-tight opacity-95">
              Traveamer is India's corporate travel management platform built
              exclusively for MSMEs, growing businesses, and independent
              professionals.
            </p>
            <p className="text-white/90 text-[18px] md:text-[21px] font-medium font-['Plus_Jakarta_Sans'] leading-relaxed tracking-tight">
              We are not a travel agency. We are not a booking engine. We are
              the system that sits behind every business trip — making sure it
              is approved, documented, and tracked to the right project before
              the employee even boards the flight.
            </p>
          </div>
        </div>
      </section>

      {/* ── THE PROBLEM WE SAW ───────────────────────────────────────────── */}
      <section className="w-full max-w-[1340px] mx-auto px-6 md:px-10 py-16 md:py-20 flex flex-col items-start gap-6 text-left">
        <GoldDivider />
        <h2 className="text-[#0A0A0A] text-[36px] md:text-[52px] font-bold font-['DM_Sans'] leading-[1.1] md:leading-[54.6px]">
          The Problem We Saw
        </h2>
        <h3 className="text-[#0A0A0A] text-[20px] md:text-[26px] font-bold font-['DM_Sans'] leading-[1.3] md:leading-[35.1px]">
          Business travel in India is broken for most
          <br />
          companies.
        </h3>
        <p className="w-full max-w-[900px] text-[#4A4A4A] text-[18px] font-['Plus_Jakarta_Sans'] leading-[28.8px]">
          Not because people are careless. But because there was never a proper
          system built for them. Approvals happen on WhatsApp. Bookings happen
          on personal cards. Expenses are tracked on spreadsheets — if at all.
          Month end becomes a scramble. Productive hours are lost chasing
          receipts, following up on reimbursements, and answering questions that
          a proper system would have already answered. The result — travel
          becomes a source of confusion, delay, and wasted time. For the
          employee. For the finance team. For the business owner.
        </p>
        <div className="bg-gradient-to-br from-[#051D8C] to-[#030E30] px-6 py-4 self-start">
          <p className="text-white text-[18px] font-bold font-['DM_Sans'] leading-[27px]">
            Traveamer was built to change that.
          </p>
        </div>
      </section>

      {/* ── WHAT WE BELIEVE ─────────────────────────────────────────────── */}
      <section className="w-full max-w-[1340px] mx-auto px-6 md:px-10 pb-16 md:pb-20 flex flex-col items-start gap-6 text-left">
        <div className="max-w-[760px] flex flex-col gap-6">
          <GoldDivider />
          <h2 className="text-[#0A0A0A] text-[36px] md:text-[52px] font-bold font-['DM_Sans'] leading-[1.1] md:leading-[54.6px]">
            What We Believe
          </h2>
          <p className="text-[#3A3A3A] text-[18px] font-['Plus_Jakarta_Sans'] leading-[28.8px]">
            We believe every business deserves to be organised.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 w-full mt-6 gap-5">
          {/* Row 1: 01 & 02 */}
          <BeliefItem
            number="01"
            text="Every trip should have a clear purpose and a clear record."
          />
          <BeliefItem
            number="02"
            text="Every approval should happen through a process — not a phone call."
          />
          {/* Row 2: 03 & 04 */}
          <BeliefItem
            number="03"
            text="Every business cost should be tracked to the right project automatically."
          />
          <BeliefItem
            number="04"
            text="Every team member should have the right level of access and independence."
          />
          {/* Row 3: 05 in left column only */}
          <BeliefItem
            number="05"
            text="Every business owner should have complete visibility — without being involved in every decision."
          />
        </div>

        <p className="text-center text-[#0A0A0A] text-[20px] md:text-[28px] font-medium font-['DM_Sans'] leading-[1.4] md:leading-[39.2px] mt-12 w-full max-w-[900px] mx-auto">
          Structure is not bureaucracy. Structure is what allows a business to
          <br className="hidden md:block" />
          grow without losing control.
        </p>
      </section>

      {/* ── WHAT MAKES US DIFFERENT ─────────────────────────────────────── */}
      <section className="w-full max-w-[1340px] mx-auto px-6 md:px-10 pb-20 md:pb-28 flex flex-col items-center gap-12 md:gap-16 text-center">
        <div className="flex flex-col items-center gap-6 max-w-[820px]">
          {/* Short Centered Gold Divider */}
          <GoldDivider />

          <h2 className="text-[#0A0A0A] text-[36px] md:text-[52px] font-bold font-['DM_Sans'] leading-[1.1] md:leading-[54.6px] tracking-tight">
            What Makes Us Different
          </h2>
          <p className="text-[#666666] text-[16px] md:text-[18px] font-['Plus_Jakarta_Sans'] leading-relaxed">
            Built specifically for Indian MSMEs — not adapted from a foreign
            product.
          </p>
        </div>

        {/* Comparison table */}
        <div className="w-full max-w-[1000px] border border-black/[0.08] shadow-sm overflow-hidden bg-white">
          {/* Table headers */}
          <div className="grid grid-cols-2">
            <div className="px-6 py-6 md:px-10 md:py-8 bg-white border-r border-black/[0.08] flex items-center">
              <p className="text-[#999999] text-[10px] md:text-[11px] font-bold font-['Plus_Jakarta_Sans'] uppercase tracking-[2px] leading-none">
                What others do
              </p>
            </div>
            <div className="px-6 py-6 md:px-10 md:py-8 bg-[#051D8C] flex items-center">
              <p className="text-white text-[10px] md:text-[11px] font-bold font-['Plus_Jakarta_Sans'] uppercase tracking-[2px] leading-none">
                What Traveamer does
              </p>
            </div>
          </div>

          {/* Table rows */}
          {[
            {
              o: "Built for large enterprises",
              t: "Built for 1 to 500 person businesses",
            },
            {
              o: "Complex setup — needs IT",
              t: "Live in 2 hours — no IT needed",
            },
            {
              o: "Generic, Formal / Informal approval flows",
              t: "Approval flow designed for Indian business culture",
            },
            {
              o: "No project cost tracking / or use of spreadsheets",
              t: "Every trip mandatory tagged to a project",
            },
            {
              o: "Booking dependent on Third Party",
              t: "Your team books directly in 60 seconds.",
            },
            {
              o: "One size fits all",
              t: "Adapts to your company size automatically",
            },
          ].map((row, i) => (
            <div
              key={i}
              className={`grid grid-cols-2 ${i !== 0 ? "border-t border-black/[0.08]" : ""}`}
            >
              <div className="px-6 py-5 md:px-10 md:py-7 flex items-center">
                <p className="text-[#666666] text-[14px] md:text-[16px] font-['Plus_Jakarta_Sans'] leading-relaxed text-left">
                  {row.o}
                </p>
              </div>
              <div className="px-6 py-5 md:px-10 md:py-7 border-l-[3px] border-[#051D8C] flex items-center bg-blue-50/10">
                <p className="text-[#0A0A0A] text-[15px] md:text-[17px] font-semibold font-['Plus_Jakarta_Sans'] leading-relaxed text-left">
                  {row.t}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── OUR APPROACH ─────────────────────────────────────────────────── */}
      <section className="w-full bg-[#0A0A0A] py-16 md:py-24">
        <div className="w-full max-w-[1340px] mx-auto px-6 md:px-10 flex flex-col md:flex-row items-start gap-8 md:gap-12">
          <h2 className="text-white text-[36px] md:text-[52px] font-bold font-['DM_Sans'] leading-[1.1] md:leading-[54.6px] md:min-w-[280px]">
            Our Approach
          </h2>
          <div className="flex flex-col gap-6 md:gap-7 flex-1">
            <h3 className="text-white text-[24px] md:text-[34px] font-bold font-['DM_Sans'] leading-[1.3] md:leading-[42.5px]">
              We make your business organised. Not
              <br className="hidden md:block" />
              just your travel.
            </h3>
            <p className="text-white/75 text-[17px] font-['Plus_Jakarta_Sans'] leading-[29.75px]">
              When travel is structured — everything connected to it becomes
              structured too. Approvals are documented. Costs are allocated.
              Reports are ready. Time is saved. Communication is reduced. And
              the business owner has clarity — without being involved in every
              small decision.
            </p>
            <p className="text-white/75 text-[17px] font-['Plus_Jakarta_Sans'] leading-[29.75px]">
              Traveamer is not just a booking tool. It is the system that brings
              order to one of the most unstructured parts of running a business
              in India.
            </p>
          </div>
        </div>
      </section>

      {/* ── WHERE WE ARE TODAY ───────────────────────────────────────────── */}
      <section className="w-full max-w-[1340px] mx-auto px-6 md:px-10 py-16 md:py-24 flex flex-col items-center gap-14 md:gap-20 text-center">
        <div className="flex flex-col items-center gap-6 md:gap-8 max-w-[860px]">
          {/* Short Centered Gold Divider */}
          <GoldDivider />

          <div className="flex flex-col gap-2">
            <h2 className="text-[#0A0A0A] text-[36px] md:text-[52px] font-bold font-['DM_Sans'] leading-tight tracking-tight">
              Where We Are Today
            </h2>
            <h3 className="text-[#0A0A0A] text-[42px] md:text-[64px] font-bold font-['DM_Sans'] leading-tight tracking-tighter">
              Traveamer is here.
            </h3>
          </div>

          <div className="flex flex-col gap-8 max-w-[820px]">
            <p className="text-[#666666] text-[18px] md:text-[20px] font-['Plus_Jakarta_Sans'] leading-relaxed">
              Built, tested, and ready for businesses that are serious about
              bringing structure to their operations.
            </p>
            <p className="text-[#666666] text-[18px] md:text-[20px] font-['Plus_Jakarta_Sans'] leading-relaxed">
              We are not waiting to be discovered. We are here to make a
              difference — to every business that is tired of managing travel
              through WhatsApp messages, scattered receipts, and informal
              approvals.
            </p>
          </div>
        </div>

        {/* CTA Banner */}
        <div className="relative w-full bg-gradient-to-br from-[#051D8C] to-[#030E30] overflow-hidden rounded-sm min-h-[240px] flex items-center justify-center py-10 px-6 shadow-xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12)_0%,transparent_70%)] pointer-events-none" />
          <p className="relative z-10 text-white text-[28px]  font-bold font-['DM_Sans'] leading-tight text-center max-w-[900px]">
            If your business is ready for structure — Traveamer
            <br className="hidden md:block" />
            is ready for you.
          </p>
        </div>
      </section>

      {/* ── FOOTER── */}
      <LandingFooter />
    </div>
  );
}
