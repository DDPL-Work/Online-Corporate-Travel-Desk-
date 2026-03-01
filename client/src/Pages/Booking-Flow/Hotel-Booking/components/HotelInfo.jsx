// components/HotelDetails/HotelInfo.jsx
import React, { useState, useMemo } from "react";
import {
  MdHotel,
  MdRestaurant,
  MdSpa,
  MdLocationOn,
  MdPolicy,
  MdInfo,
  MdCheckCircle,
  MdWarningAmber,
  MdPool,
  MdExpandMore,
  MdExpandLess,
  MdLogin,
  MdLogout,
  MdAccessTime,
  MdAttractions,
  MdSummarize,
} from "react-icons/md";
import {
  FaBed,
  FaUtensils,
  FaLeaf,
  FaShuttleVan,
  FaLandmark,
  FaCheckCircle,
  FaExclamationTriangle,
  FaStar,
} from "react-icons/fa";
import { BsBuilding, BsInfoCircleFill } from "react-icons/bs";
import { GiMeditation } from "react-icons/gi";

/* ─────────────────────────────────────────
   Parse raw HTML description from API
   into structured section objects
───────────────────────────────────────── */
const parseDescription = (raw) => {
  if (!raw || typeof raw !== "string") return [];

  const parser = new DOMParser();
  const doc = parser.parseFromString(raw, "text/html");

  const sections = [];
  const paragraphs = Array.from(doc.querySelectorAll("p"));

  /* ---------------------------------------
     CASE 1: Structured HTML sections
  ---------------------------------------- */
  paragraphs.forEach((p) => {
    let title = "";
    let text = "";
    let items = [];

    const strong = p.querySelector("strong");

    if (strong) {
      title = strong.textContent.replace(/:?\s*$/, "").trim();

      const clone = p.cloneNode(true);
      clone.querySelectorAll("strong").forEach((s) => s.remove());
      text = clone.textContent.trim();
    } else {
      const rawText = p.textContent.trim();
      if (rawText.includes(":")) {
        const splitIndex = rawText.indexOf(":");
        title = rawText.substring(0, splitIndex).trim();
        text = rawText.substring(splitIndex + 1).trim();
      }
    }

    const ul = p.querySelector("ul");
    if (ul) {
      items = Array.from(ul.querySelectorAll("li")).map((li) =>
        li.textContent.trim(),
      );
    }

    if (title) {
      sections.push({ title, text, items });
    }
  });

  /* ---------------------------------------
     CASE 2: If NO structured sections found
     → treat entire description as Overview
  ---------------------------------------- */
  if (sections.length === 0) {
    // Extract plain text without tags
    const plainText = doc.body.textContent.replace(/\s+/g, " ").trim();

    if (plainText) {
      sections.push({
        title: "Overview",
        text: plainText,
        items: [],
      });
    }
  }

  /* ---------------------------------------
     Disclaimer Detection
  ---------------------------------------- */
  const bold = doc.querySelector("b");
  if (bold) {
    sections.push({
      title: "Disclaimer",
      text: bold.textContent.trim(),
      items: [],
      isDisclaimer: true,
    });
  }

  return sections;
};

/* ─────────────────────────────────────────
   Section metadata map
───────────────────────────────────────── */
const SECTION_META = {
  "Hotel Overview": {
    icon: BsBuilding,
    iconColor: "text-blue-600",
    badgeBg: "bg-blue-100",
    borderColor: "border-blue-200",
    headerBg: "bg-blue-50",
  },
  Accommodations: {
    icon: FaBed,
    iconColor: "text-purple-600",
    badgeBg: "bg-purple-100",
    borderColor: "border-purple-200",
    headerBg: "bg-purple-50",
  },
  Amenities: {
    icon: MdPool,
    iconColor: "text-emerald-600",
    badgeBg: "bg-emerald-100",
    borderColor: "border-emerald-200",
    headerBg: "bg-emerald-50",
  },
  "Dining Options": {
    icon: FaUtensils,
    iconColor: "text-amber-600",
    badgeBg: "bg-amber-100",
    borderColor: "border-amber-200",
    headerBg: "bg-amber-50",
  },
  "Nearby Location & Transportation": {
    icon: FaShuttleVan,
    iconColor: "text-cyan-600",
    badgeBg: "bg-cyan-100",
    borderColor: "border-cyan-200",
    headerBg: "bg-cyan-50",
  },
  "Nearby Attractions": {
    icon: FaLandmark,
    iconColor: "text-pink-600",
    badgeBg: "bg-pink-100",
    borderColor: "border-pink-200",
    headerBg: "bg-pink-50",
  },
  "Wellness And Activities": {
    icon: GiMeditation,
    iconColor: "text-teal-600",
    badgeBg: "bg-teal-100",
    borderColor: "border-teal-200",
    headerBg: "bg-teal-50",
  },
  "Policies & Check-In Instructions": {
    icon: MdPolicy,
    iconColor: "text-orange-600",
    badgeBg: "bg-orange-100",
    borderColor: "border-orange-200",
    headerBg: "bg-orange-50",
  },
  Summary: {
    icon: FaStar,
    iconColor: "text-indigo-600",
    badgeBg: "bg-indigo-100",
    borderColor: "border-indigo-200",
    headerBg: "bg-indigo-50",
  },
  Disclaimer: {
    icon: FaExclamationTriangle,
    iconColor: "text-slate-500",
    badgeBg: "bg-slate-100",
    borderColor: "border-slate-200",
    headerBg: "bg-slate-50",
  },
};

const getMeta = (title) =>
  SECTION_META[title] || {
    icon: MdInfo,
    iconColor: "text-blue-600",
    badgeBg: "bg-blue-100",
    borderColor: "border-blue-200",
    headerBg: "bg-blue-50",
  };

/* ─────────────────────────────────────────
   Individual Section Card
───────────────────────────────────────── */
const SectionCard = ({ section, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  const meta = getMeta(section.title);
  const Icon = meta.icon;

  return (
    <div
      className={`rounded-xl border overflow-hidden transition-all duration-200 ${meta.borderColor}`}
    >
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between px-4 py-3 ${meta.headerBg} hover:brightness-95 transition`}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={`${meta.badgeBg} rounded-lg w-8 h-8 flex items-center justify-center shrink-0`}
          >
            <Icon className={`${meta.iconColor} text-base`} />
          </div>
          <span className="font-black text-[#0a2540] text-sm">
            {section.title}
          </span>
        </div>
        {open ? (
          <MdExpandLess className="text-slate-400 text-xl shrink-0" />
        ) : (
          <MdExpandMore className="text-slate-400 text-xl shrink-0" />
        )}
      </button>

      {/* Body */}
      {open && (
        <div className="px-4 py-3 bg-white">
          {/* Paragraph text */}
          {section.text && !section.isDisclaimer && (
            <p className="text-sm text-slate-600 leading-relaxed">
              {section.text}
            </p>
          )}

          {/* Disclaimer style */}
          {section.isDisclaimer && (
            <div className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <FaExclamationTriangle className="text-slate-400 text-sm shrink-0 mt-0.5" />
              <p className="text-xs text-slate-500 italic">{section.text}</p>
            </div>
          )}

          {/* List items */}
          {section.items.length > 0 && (
            <ul className={`space-y-2 ${section.text ? "mt-3" : ""}`}>
              {section.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <FaCheckCircle className="text-emerald-500 text-xs shrink-0 mt-1" />
                  <span className="text-sm text-slate-600 leading-relaxed">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────
   Check-In / Check-Out Card
───────────────────────────────────────── */
const CheckTimesCard = ({ checkIn, checkOut }) => (
  <div className="bg-[#0a2540] rounded-xl p-4 flex items-center gap-0">
    <div className="flex-1 flex flex-col items-center gap-1 py-2">
      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mb-1">
        <MdLogin className="text-white text-xl" />
      </div>
      <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">
        Check-In
      </span>
      <span className="text-white font-black text-lg leading-none">
        {" "}
        {checkIn || "—"}
      </span>
      <span className="text-[10px] text-white/40">Earliest arrival</span>
    </div>

    {/* Divider */}
    <div className="flex flex-col items-center gap-1 px-4">
      <div className="w-px h-12 bg-white/10" />
      <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
        <MdAccessTime className="text-white/50 text-xs" />
      </div>
      <div className="w-px h-12 bg-white/10" />
    </div>

    <div className="flex-1 flex flex-col items-center gap-1 py-2">
      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mb-1">
        <MdLogout className="text-white text-xl" />
      </div>
      <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">
        Check-Out
      </span>
      <span className="text-white font-black text-lg leading-none">
        {checkOut || "—"}
      </span>
      <span className="text-[10px] text-white/40">Latest departure</span>
    </div>
  </div>
);

const ContactCard = ({ contact }) => {
  if (!contact?.phone && !contact?.email && !contact?.website) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
          <MdLocationOn className="text-blue-600 text-base" />
        </div>
        <h3 className="font-black text-[#0a2540] text-sm">
          Contact Information
        </h3>
      </div>

      <div className="p-4 space-y-3 text-sm text-slate-700">
        {contact.phone && (
          <div>
            <span className="font-semibold">Phone:</span>{" "}
            <a
              href={`tel:${contact.phone}`}
              className="text-[#0d7fe8] hover:underline"
            >
              {contact.phone}
            </a>
          </div>
        )}

        {contact.email && (
          <div>
            <span className="font-semibold">Email:</span>{" "}
            <a
              href={`mailto:${contact.email}`}
              className="text-[#0d7fe8] hover:underline"
            >
              {contact.email}
            </a>
          </div>
        )}

        {contact.website && (
          <div>
            <span className="font-semibold">Website:</span>{" "}
            <a
              href={contact.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#0d7fe8] hover:underline break-all"
            >
              {contact.website}
            </a>
          </div>
        )}

        {contact.fax && (
          <div>
            <span className="font-semibold">Fax:</span> {contact.fax}
          </div>
        )}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────
   Main HotelInfo
───────────────────────────────────────── */
const HotelInfo = ({ description = "", checkIn, checkOut, contact = {} }) => {
  const [showAll, setShowAll] = useState(false);

  const sections = useMemo(() => parseDescription(description), [description]);

  // Sections to show by default (first 3), rest behind "Show more"
  const visibleSections = showAll ? sections : sections.slice(0, 3);
  const hiddenCount = sections.length - 3;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* ── Header ── */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#0a2540] flex items-center justify-center shrink-0">
          <MdHotel className="text-white text-lg" />
        </div>
        <div>
          <h2 className="font-black text-[#0a2540] text-base leading-none">
            About the Hotel
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {sections.filter((s) => !s.isDisclaimer).length} sections
          </p>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {/* ── Check times ── */}
        {(checkIn || checkOut) && (
          <CheckTimesCard checkIn={checkIn} checkOut={checkOut} />
        )}

        <ContactCard contact={contact} />

        {/* ── Section Cards ── */}
        {visibleSections.map((section, i) => (
          <SectionCard
            key={section.title + i}
            section={section}
            defaultOpen={i === 0}
          />
        ))}

        {/* ── Show more / less ── */}
        {sections.length > 3 && (
          <button
            onClick={() => setShowAll((v) => !v)}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-slate-200 text-[#0d7fe8] font-bold text-xs hover:border-[#0d7fe8] hover:bg-blue-50 transition w-full"
          >
            {showAll ? (
              <>
                <MdExpandLess className="text-base" />
                Show Less
              </>
            ) : (
              <>
                <MdExpandMore className="text-base" />
                Show {hiddenCount} More Section{hiddenCount !== 1 ? "s" : ""}
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default HotelInfo;
