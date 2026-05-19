/**
 * FareRulesRenderer.jsx
 *
 * Production-grade airline fare rules renderer.
 *
 * Sections rendered:
 *  1. FareInclusions grid     — ✅/❌ icon chips
 *  2. MiniFareRules summary   — cancellation + reissue penalty cards
 *  3. Airline policy document — smart section accordion from raw HTML/text
 *
 * Safe: DOMPurify sanitizes all HTML, no dangerouslySetInnerHTML escape hatches.
 */

import React, { useMemo, useState } from "react";
import DOMPurify from "dompurify";
import parse, { domToReact, attributesToProps } from "html-react-parser";
import {
  FaPlane,
  FaSuitcaseRolling,
  FaUtensils,
  FaChair,
  FaCocktail,
  FaStar,
} from "react-icons/fa";
import {
  MdRefresh,
  MdOutlineDoNotDisturb,
  MdCheckCircle,
  MdExpandMore,
  MdExpandLess,
  MdReadMore,
} from "react-icons/md";
import { BsSuitcase2, BsBagCheck } from "react-icons/bs";
import { IoChevronDown, IoChevronUp } from "react-icons/io5";

// ─── Airline section-code map ─────────────────────────────────────────────────
// Covers IATA fare rule section codes that airlines embed in FareRuleDetail text
const SECTION_MAP = {
  AP: { label: "Advance Reservation & Ticketing", emoji: "📅", severity: "info" },
  PE: { label: "Penalties, Changes & Cancellations", emoji: "⚠️", severity: "warning" },
  BG: { label: "Baggage Allowance", emoji: "🧳", severity: "info" },
  SR: { label: "Stopovers & Rerouting", emoji: "✈️", severity: "info" },
  TC: { label: "Tickets & Combinations", emoji: "🎫", severity: "info" },
  MR: { label: "Minimum Stay Requirements", emoji: "📅", severity: "info" },
  MX: { label: "Maximum Stay", emoji: "⏰", severity: "info" },
  CO: { label: "Combinability Rules", emoji: "🔄", severity: "info" },
  RG: { label: "Rerouting Rules", emoji: "↩️", severity: "info" },
  FN: { label: "Fare Notes", emoji: "📝", severity: "info" },
  CH: { label: "Children & Infant Discounts", emoji: "👶", severity: "info" },
  TF: { label: "Transfer Rules", emoji: "🔀", severity: "info" },
  HI: { label: "Higher Intermediate Point", emoji: "📈", severity: "info" },
  OB: { label: "Open Jaw & Returns", emoji: "🔓", severity: "info" },
  EL: { label: "Eligibility", emoji: "✅", severity: "info" },
  SO: { label: "Stopovers", emoji: "🛑", severity: "info" },
  TD: { label: "Tour Discount", emoji: "💰", severity: "info" },
  SU: { label: "Surcharges", emoji: "💸", severity: "warning" },
  FL: { label: "Flight Applications", emoji: "🛫", severity: "info" },
  SA: { label: "Sales Restrictions", emoji: "🚫", severity: "warning" },
  TK: { label: "Ticketing Provisions", emoji: "🎟️", severity: "info" },
  TR: { label: "Transfers", emoji: "🔀", severity: "info" },
  DA: { label: "Day/Time Application", emoji: "🕐", severity: "info" },
  SE: { label: "Seasons", emoji: "🗓️", severity: "info" },
  CD: { label: "Children Discounts", emoji: "👦", severity: "info" },
};

// ─── Smart airline text → sections parser ────────────────────────────────────
/**
 * Detects airline fare rule section codes (e.g. "AP.", "PE.", "BG.") in raw text
 * and splits the content into named sections for accordion display.
 */
function parseAirlineTextSections(rawText) {
  if (!rawText || typeof rawText !== "string") return [];

  // Strip HTML tags for section detection (we'll still render HTML separately)
  const plainText = rawText
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<p[^>]*>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n");

  // Pattern: 2-uppercase-letter code followed by period at start of line or after whitespace
  const sectionPattern = /(?:^|\n)\s*\b([A-Z]{2})\.\s+([A-Z][^\n]{0,80})/gm;

  const matches = [];
  let match;
  while ((match = sectionPattern.exec(plainText)) !== null) {
    if (SECTION_MAP[match[1]]) {
      matches.push({
        code: match[1],
        title: match[2].trim(),
        startIdx: match.index,
      });
    }
  }

  if (matches.length === 0) return [];

  const sections = matches.map((m, i) => {
    const start = plainText.indexOf(m.title, m.startIdx);
    const end = i < matches.length - 1 ? matches[i + 1].startIdx : plainText.length;
    const content = plainText.slice(start + m.title.length, end).trim();
    return {
      code: m.code,
      meta: SECTION_MAP[m.code],
      title: SECTION_MAP[m.code].label,
      content: content
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 3)
        .join("\n"),
    };
  });

  return sections.filter((s) => s.content.length > 0);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Single inclusion chip — ✅ or ❌ with label */
function InclusionChip({ item }) {
  const icons = {
    checkin: <BsSuitcase2 size={13} />,
    cabin: <BsBagCheck size={13} />,
    meal: <FaUtensils size={12} />,
    seat: <FaChair size={12} />,
    lounge: <FaCocktail size={12} />,
    priority: <FaStar size={12} />,
    refund: <MdRefresh size={14} />,
    change: <FaPlane size={12} />,
  };

  const icon = icons[item.key] || <MdCheckCircle size={14} />;

  return (
    <div
      className={`flex items-center gap-2.5 rounded-2xl px-4 py-2.5 border transition-all ${
        item.positive
          ? "bg-emerald-50 border-emerald-200 text-emerald-800"
          : "bg-red-50 border-red-200 text-red-700"
      }`}
    >
      <span
        className={`flex-shrink-0 ${item.positive ? "text-emerald-600" : "text-red-500"}`}
      >
        {item.positive ? (
          <MdCheckCircle size={15} />
        ) : (
          <MdOutlineDoNotDisturb size={15} />
        )}
      </span>
      <span className="text-xs font-bold leading-tight">{item.label}</span>
    </div>
  );
}

/** Section accordion panel for a single airline fare rule code section */
function SectionAccordion({ section, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const isWarning = section.meta?.severity === "warning";

  // Convert content text to bullet points
  const bullets = section.content
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 3)
    .flatMap((l) => {
      // Split on sentence-enders to create bullet points
      return l.split(/(?<=[.!?])\s+(?=[A-Z])/).map((s) => s.trim());
    })
    .filter((l) => l.length > 5);

  return (
    <div
      className={`rounded-2xl border overflow-hidden transition-all ${
        isWarning
          ? "border-amber-200 bg-amber-50/30"
          : "border-slate-200 bg-white"
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between gap-4 px-5 py-4 text-left transition-colors ${
          isWarning
            ? "hover:bg-amber-50/60"
            : "hover:bg-slate-50"
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="text-lg leading-none">{section.meta?.emoji || "📄"}</span>
          <div>
            <p className="text-xs font-black text-slate-700 uppercase tracking-wide">
              {section.title}
            </p>
            <p className="text-[10px] font-bold text-slate-400 mt-0.5">
              {section.code} · {bullets.length} rule{bullets.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <span className="shrink-0 text-slate-400">
          {open ? <IoChevronUp size={16} /> : <IoChevronDown size={16} />}
        </span>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-2 border-t border-slate-100">
          {bullets.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {bullets.map((bullet, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                  <span className="text-[13px] font-medium text-slate-700 leading-relaxed">
                    {bullet}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-slate-400 italic">
              {section.content}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** Penalty row inside the mini-fare summary cards */
function PenaltyRow({ item, index }) {
  return (
    <div
      className={`flex items-center justify-between gap-4 px-5 py-3.5 ${
        index % 2 === 0 ? "bg-white" : "bg-slate-50/60"
      } border-b border-slate-100 last:border-0`}
    >
      <p className="text-xs font-semibold text-slate-600 leading-snug flex-1 min-w-0">
        {item.timeRange}
      </p>
      <FeeBadge fee={item.fee} />
    </div>
  );
}

function FeeBadge({ fee }) {
  const raw = String(fee || "").trim();
  let colorClass = "bg-slate-100 text-slate-700 border-slate-200";
  if (/non.refundable|not permitted|not allowed/i.test(raw)) {
    colorClass = "bg-red-100 text-red-800 border-red-200";
  } else if (/no charge|free|₹\s*0\b/i.test(raw)) {
    colorClass = "bg-emerald-100 text-emerald-800 border-emerald-200";
  } else if (/INR|₹|\d/.test(raw)) {
    colorClass = "bg-orange-50 text-orange-800 border-orange-200";
  } else if (/discretion|policy/i.test(raw)) {
    colorClass = "bg-slate-100 text-slate-600 border-slate-200";
  }

  return (
    <span
      className={`shrink-0 text-[11px] font-black px-3 py-1.5 rounded-xl border ${colorClass}`}
    >
      {raw || "As per policy"}
    </span>
  );
}

/** Scrollable policy container for extremely long airline HTML rules */
function ScrollablePolicyWrapper({ children }) {
  return (
    <div className="relative border border-slate-200 bg-white sm:bg-slate-50 rounded-2xl overflow-hidden shadow-sm">
      <div className="max-h-[65vh] sm:max-h-[55vh] overflow-y-auto p-4 sm:p-6 custom-scrollbar">
        {children}
      </div>
    </div>
  );
}

// ─── HTML renderer options (html-react-parser) ────────────────────────────────
function buildHtmlParserOptions() {
  return {
    replace: (domNode) => {
      if (domNode.type === "text") {
        const text = domNode.data || "";
        if (/\s{3,}|---|\.\.\./.test(text)) {
          return (
            <span className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-slate-600 font-mono tracking-tight">
              {text}
            </span>
          );
        }
        return text;
      }

      if (domNode.type !== "tag") return undefined;
      const { name, children, attribs } = domNode;
      const props = attributesToProps(attribs || {});

      switch (name) {
        case "table":
          return (
            <div className="w-full overflow-x-auto my-5 rounded-2xl border border-slate-200 shadow-sm bg-white">
              <table className="w-full text-left border-collapse min-w-[480px]" {...props}>
                {domToReact(children, buildHtmlParserOptions())}
              </table>
            </div>
          );
        case "thead":
          return (
            <thead className="bg-[#0A203E]">
              {domToReact(children, buildHtmlParserOptions())}
            </thead>
          );
        case "tbody":
          return (
            <tbody className="divide-y divide-slate-100">
              {domToReact(children, buildHtmlParserOptions())}
            </tbody>
          );
        case "tr":
          return (
            <tr className="even:bg-slate-50 hover:bg-slate-100 transition-colors">
              {domToReact(children, buildHtmlParserOptions())}
            </tr>
          );
        case "th":
          return (
            <th
              className="px-5 py-3 text-[10px] font-black text-[#C9A84C] uppercase tracking-widest whitespace-nowrap border-b border-[#C9A84C]/20"
              {...props}
            >
              {domToReact(children, buildHtmlParserOptions())}
            </th>
          );
        case "td":
          return (
            <td
              className="px-5 py-3.5 text-sm font-semibold text-slate-700 align-top"
              {...props}
            >
              {domToReact(children, buildHtmlParserOptions())}
            </td>
          );
        case "fieldset":
          return (
            <div className="border border-slate-200 rounded-2xl p-5 my-4 bg-slate-50">
              {domToReact(children, buildHtmlParserOptions())}
            </div>
          );
        case "legend":
          return (
            <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 px-2">
              {domToReact(children, buildHtmlParserOptions())}
            </p>
          );
        case "ul":
          return (
            <ul className="list-none space-y-1.5 my-3">
              {domToReact(children, buildHtmlParserOptions())}
            </ul>
          );
        case "li":
          return (
            <li className="flex items-start gap-2.5 text-sm text-slate-700">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
              <span className="leading-relaxed">
                {domToReact(children, buildHtmlParserOptions())}
              </span>
            </li>
          );
        case "p":
          return (
            <p className="text-sm text-slate-700 leading-relaxed my-2">
              {domToReact(children, buildHtmlParserOptions())}
            </p>
          );
        case "strong":
        case "b":
          return (
            <strong className="font-black text-slate-900">
              {domToReact(children, buildHtmlParserOptions())}
            </strong>
          );
        case "h3":
        case "h4":
        case "h5":
          return (
            <p className="text-xs font-black text-slate-600 uppercase tracking-widest mt-4 mb-2">
              {domToReact(children, buildHtmlParserOptions())}
            </p>
          );
        default:
          return undefined;
      }
    },
  };
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function FareRulesRenderer({ rule }) {
  const rawHtml = rule?.rawHtml || "";
  const inclusions = rule?.fareInclusions;
  const hasSections = Boolean(rawHtml);

  // 1. Parse airline text into smart sections
  const airlineSections = useMemo(() => parseAirlineTextSections(rawHtml), [rawHtml]);
  const hasSmartSections = airlineSections.length > 0;

  // 2. Sanitize + parse HTML for raw fallback rendering
  const parsedHtmlContent = useMemo(() => {
    if (!rawHtml) return null;

    const preProcessed = rawHtml
      .replace(/\r\n|\r|\n/g, " ")
      .replace(/(<br\s*\/?>[\s]*){3,}/gi, "<br/><br/>");

    const sanitized = DOMPurify.sanitize(preProcessed, {
      ALLOWED_TAGS: [
        "p", "div", "span", "ul", "ol", "li",
        "table", "thead", "tbody", "tr", "td", "th",
        "strong", "b", "i", "em", "br",
        "h1", "h2", "h3", "h4", "h5", "h6",
        "a", "fieldset", "legend", "u", "pre",
      ],
      ALLOWED_ATTR: ["href", "target", "rel", "colspan", "rowspan", "border", "class"],
    });

    return parse(sanitized, buildHtmlParserOptions());
  }, [rawHtml]);

  if (!rule) return null;

  return (
    <div className="fare-rules-renderer space-y-8">

      {/* ── SECTION 1: Fare Inclusions ──────────────────────────────────────── */}
      {inclusions?.items?.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center">
              <MdCheckCircle size={14} className="text-emerald-600" />
            </div>
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              Included in This Fare
            </h4>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {inclusions.items.map((item) => (
              <InclusionChip key={item.key} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* ── SECTION 2: Mini Fare Rules (Cancellation + Date Change) ──────────── */}
      {(rule.cancellation?.length > 0 || rule.reissue?.length > 0) && (
        <div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Cancellation */}
            {rule.cancellation?.length > 0 && (
              <div className="rounded-2xl border border-red-100 overflow-hidden bg-white">
                <div className="flex items-center gap-2 px-5 py-4 bg-red-50/50 border-b border-red-100">
                  <div className="w-6 h-6 rounded-lg bg-red-100 flex items-center justify-center">
                    <FaPlane size={10} className="text-red-500 rotate-180" />
                  </div>
                  <h4 className="text-[10px] font-black text-red-700 uppercase tracking-widest">
                    Cancellation Policy
                  </h4>
                </div>
                <div className="divide-y divide-slate-50">
                  {rule.cancellation.map((c, i) => (
                    <PenaltyRow key={i} item={c} index={i} />
                  ))}
                </div>
              </div>
            )}

            {/* Date Change */}
            {rule.reissue?.length > 0 && (
              <div className="rounded-2xl border border-blue-100 overflow-hidden bg-white">
                <div className="flex items-center gap-2 px-5 py-4 bg-blue-50/50 border-b border-blue-100">
                  <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center">
                    <MdRefresh size={13} className="text-blue-500" />
                  </div>
                  <h4 className="text-[10px] font-black text-blue-700 uppercase tracking-widest">
                    Date Change Policy
                  </h4>
                </div>
                <div className="divide-y divide-slate-50">
                  {rule.reissue.map((r, i) => (
                    <PenaltyRow key={i} item={r} index={i} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SECTION 3: Airline Policy Document ───────────────────────────────── */}
      {hasSections && (
        <div>
          <div className="flex items-center gap-4 py-2 mb-5">
            <div className="h-px flex-1 bg-slate-100" />
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] whitespace-nowrap">
              Detailed Airline Policy
            </span>
            <div className="h-px flex-1 bg-slate-100" />
          </div>

          {hasSmartSections ? (
            /* Smart Accordion Sections */
            <ScrollablePolicyWrapper>
              <div className="space-y-2">
                {airlineSections.map((section, i) => (
                  <SectionAccordion
                    key={`${section.code}-${i}`}
                    section={section}
                    defaultOpen={i === 0}
                  />
                ))}
              </div>
            </ScrollablePolicyWrapper>
          ) : (
            /* Fallback: styled HTML render inside scrollable area */
            <ScrollablePolicyWrapper>
              <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed">
                {parsedHtmlContent}
              </div>
            </ScrollablePolicyWrapper>
          )}

          {/* Also show raw HTML alongside smart sections when tables/rich content exists */}
          {hasSmartSections && /<table/i.test(rawHtml) && (
            <div className="mt-5">
              <details className="group">
                <summary className="flex items-center gap-2 cursor-pointer text-[11px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors list-none select-none">
                  <MdReadMore size={16} />
                  View Original Formatted Document
                  <span className="ml-auto group-open:rotate-180 transition-transform">
                    <IoChevronDown size={14} />
                  </span>
                </summary>
                <div className="mt-3">
                  <ScrollablePolicyWrapper>
                    <div className="prose prose-sm max-w-none text-slate-700">
                      {parsedHtmlContent}
                    </div>
                  </ScrollablePolicyWrapper>
                </div>
              </details>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!hasSections && !inclusions?.items?.length && !rule.cancellation?.length && (
        <div className="text-center py-10 text-slate-400">
          <p className="text-sm font-semibold">No detailed fare rules available from the airline.</p>
        </div>
      )}
    </div>
  );
}
