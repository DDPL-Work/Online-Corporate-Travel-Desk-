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
      <section className="relative w-full min-h-[650px] bg-gradient-to-br from-[#051D8C] to-[#030E30] overflow-hidden flex items-center">
        {/* Glow effects */}
        <div className="absolute bottom-[-80px] left-[-100px] w-[525px] h-[563px] rounded-full bg-[radial-gradient(ellipse_70.71%_70.71%_at_50%_50%,rgba(80,100,220,0.25)_0%,rgba(80,100,220,0)_70%)] blur-[10px] pointer-events-none" />

        <div className="relative w-full max-w-[1340px] mx-auto px-6 md:px-10 py-16 md:py-20 flex flex-col items-center gap-6 md:gap-8">
          {/* Label bar */}
          {/* <div className="w-full max-w-[820px] px-2.5 py-0.5 bg-[#C9A240] inline-flex flex-col justify-center items-start">
            <div className="inline-flex justify-start items-center gap-3">
              <div className="w-8 h-px bg-black/60" />
              <div className="inline-flex flex-col justify-start items-start">
                <div className="justify-center text-black/90 text-xs font-bold font-['Plus_Jakarta_Sans'] uppercase leading-4 tracking-[2.50px]">
                  About Us — Content
                </div>
              </div>
            </div>
          </div> */}

          {/* Headline */}
          <h1 className="text-[#C9A240] text-[48px] md:text-[72px] lg:text-[88px] font-bold font-['DM_Sans'] leading-[1.1] md:leading-[1] max-w-[881px] text-center">
            Who We Are
          </h1>

          {/* Body text */}
          <div className="flex flex-col gap-6 max-w-[820px] text-center">
            <p className="text-white/90 text-[19px] font-light font-['Plus_Jakarta_Sans'] leading-[31.35px]">
              Traveamer is India's corporate travel management platform built
              exclusively for MSMEs, growing businesses, and independent
              professionals.
            </p>
            <p className="text-white/80 text-[19px] font-light font-['Plus_Jakarta_Sans'] leading-[31.35px]">
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

        <p className="text-left text-[#0A0A0A] text-[20px] md:text-[28px] font-medium font-['DM_Sans'] leading-[1.4] md:leading-[39.2px] mt-8 w-full max-w-[800px]">
          Structure is not bureaucracy. Structure is what allows a business to
          <br className="hidden md:block" />
          grow without losing control.
        </p>
      </section>

      {/* ── WHAT MAKES US DIFFERENT ─────────────────────────────────────── */}
      <section className="w-full max-w-[1340px] mx-auto px-6 md:px-10 pb-20 md:pb-28 flex flex-col items-start gap-10 md:gap-14 text-left">
        <div className="flex flex-col items-start gap-6 max-w-[760px]">
          <GoldDivider />
          <h2 className="text-[#0A0A0A] text-[36px] md:text-[52px] font-bold font-['DM_Sans'] leading-[1.1] md:leading-[54.6px]">
            What Makes Us Different
          </h2>
          <p className="text-[#3A3A3A] text-[18px] font-['Plus_Jakarta_Sans'] leading-[28.8px]">
            Built specifically for Indian MSMEs — not adapted from a foreign
            product.
          </p>
        </div>

        {/* Comparison table */}
        <div className="w-full border border-black/[0.08] overflow-hidden">
          {/* Table headers */}
          <div className="grid grid-cols-2">
            <div className="px-4 py-4 md:px-8 md:py-7 bg-white border-r border-black/[0.08]">
              <p className="text-[#999999] text-[10px] md:text-[11px] font-bold font-['Plus_Jakarta_Sans'] uppercase tracking-[1.5px] md:tracking-[2.5px] leading-[1.5] md:leading-[16.5px]">
                What others do
              </p>
            </div>
            <div className="px-4 py-4 md:px-8 md:py-7 bg-gradient-to-br from-[#051D8C] to-[#030E30]">
              <p className="text-white text-[10px] md:text-[11px] font-bold font-['Plus_Jakarta_Sans'] uppercase tracking-[1.5px] md:tracking-[2.5px] leading-[1.5] md:leading-[16.5px]">
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
              o: "One size fits all",
              t: "Adapts to your company size automatically",
            },
          ].map((row, i) => (
            <ComparisonRow
              key={i}
              others={row.o}
              traveamer={row.t}
              isFirst={i === 0}
            />
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
      <section className="w-full max-w-[1340px] mx-auto px-6 md:px-10 py-16 md:py-24 flex flex-col items-start gap-14 md:gap-20 text-left">
        <div className="flex flex-col items-start gap-5 md:gap-7 max-w-[860px]">
          <GoldDivider />
          <h2 className="text-[#0A0A0A] text-[36px] md:text-[52px] font-bold font-['DM_Sans'] leading-[1.1] md:leading-[54.6px]">
            Where We Are Today
          </h2>
          <h3 className="text-[#0A0A0A] text-[42px] md:text-[64px] font-bold font-['DM_Sans'] leading-[1.1] md:leading-[67.2px]">
            Traveamer is here.
          </h3>
          <div className="flex flex-col gap-6 max-w-[680px]">
            <p className="text-[#3A3A3A] text-[17px] font-['Plus_Jakarta_Sans'] leading-[29.75px]">
              Built, tested, and ready for businesses that are serious about
              bringing structure to their operations.
            </p>
            <p className="text-[#3A3A3A] text-[17px] font-['Plus_Jakarta_Sans'] leading-[29.75px]">
              We are not waiting to be discovered. We are here to make a
              difference — to every business that is tired of managing travel
              through WhatsApp messages, scattered receipts, and informal
              approvals.
            </p>
          </div>
        </div>

        {/* CTA Banner */}
        <div className="relative w-full bg-gradient-to-br from-[#051D8C] to-[#030E30] overflow-hidden rounded-sm min-h-[211px] flex flex-col items-start justify-center py-10 md:py-0 px-8 md:px-12">
          <div className="absolute top-[-84px] right-[-60px] w-[535px] h-[331px] rounded-full bg-[radial-gradient(ellipse_70.71%_70.71%_at_50%_50%,rgba(255,255,255,0.18)_0%,rgba(255,255,255,0)_70%)]" />
          <p className="relative z-10 text-white text-[28px] md:text-[44px] font-bold font-['DM_Sans'] leading-[1.2] md:leading-[52.8px] text-left">
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
