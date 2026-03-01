// components/HotelDetails/Amenities.jsx
import React, { useState, useMemo } from "react";
import {
  MdWifi,
  MdPool,
  MdFitnessCenter,
  MdRestaurant,
  MdSpa,
  MdAcUnit,
  MdLocalBar,
  MdRoomService,
  MdBusiness,
  MdLocalLaundryService,
  MdChildCare,
  MdAccessible,
  MdElevator,
  MdOutdoorGrill,
  MdCoffee,
  MdSmokeFree,
  MdSecurity,
  MdHotTub,
  MdExpandMore,
  MdExpandLess,
  MdCheckCircle,
  MdMeetingRoom,
  MdLocalParking,
  MdAirportShuttle,
  MdBreakfastDining,
  MdKitchen,
  MdNightlife,
  MdBalcony,
  MdVerified,
} from "react-icons/md";
import {
  FaWifi,
  FaParking,
  FaSwimmingPool,
  FaDumbbell,
  FaUtensils,
  FaSpa,
  FaSnowflake,
  FaGlassMartini,
  FaCoffee,
  FaConciergeBell,
  FaShuttleVan,
  FaLeaf,
  FaBriefcase,
  FaFirstAid,
  FaTv,
  FaLock,
  FaUmbrellaBeach,
  FaChild,
  FaWheelchair,
  FaPaw,
  FaFireExtinguisher,
  FaNewspaper,
  FaBus,
  FaCar,
  FaTshirt,
  FaRegSmile,
  FaSun,
  FaCheck,
} from "react-icons/fa";
import { GiVacuumCleaner, GiTennisCourt } from "react-icons/gi";
import { BsStars, BsBuildingCheck } from "react-icons/bs";

/* ─────────────────────────────────────────
   Keyword → { icon, category } map
   Accepts raw string from HotelFacilities[]
───────────────────────────────────────── */
const KEYWORD_MAP = [
  // Internet
  {
    keys: ["wifi", "wi-fi", "internet", "broadband", "wireless"],
    icon: MdWifi,
    category: "Internet & Tech",
  },
  // Parking & Transport
  {
    keys: ["valet parking", "free valet"],
    icon: FaConciergeBell,
    category: "Transport",
  },
  {
    keys: ["self parking", "uncovered parking", "parking", "secured parking"],
    icon: FaParking,
    category: "Transport",
  },
  {
    keys: [
      "airport shuttle",
      "airport transportation",
      "area shuttle",
      "shuttle",
    ],
    icon: FaShuttleVan,
    category: "Transport",
  },
  {
    keys: ["limo", "town car", "limousine"],
    icon: FaCar,
    category: "Transport",
  },
  { keys: ["bus", "train", "transit"], icon: FaBus, category: "Transport" },
  // Pool & Wellness
  {
    keys: ["outdoor pool", "indoor pool", "swimming pool", "pool"],
    icon: FaSwimmingPool,
    category: "Pool & Wellness",
  },
  {
    keys: ["hot tub", "jacuzzi", "whirlpool", "hydrotherapy"],
    icon: MdHotTub,
    category: "Pool & Wellness",
  },
  {
    keys: ["full-service spa", "spa treatment", "spa services", "spa"],
    icon: MdSpa,
    category: "Pool & Wellness",
  },
  {
    keys: ["fitness", "health club", "gym", "workout", "weight"],
    icon: MdFitnessCenter,
    category: "Pool & Wellness",
  },
  { keys: ["yoga", "meditation"], icon: FaSun, category: "Pool & Wellness" },
  {
    keys: ["beach", "cabana"],
    icon: FaUmbrellaBeach,
    category: "Pool & Wellness",
  },
  { keys: ["tennis"], icon: GiTennisCourt, category: "Pool & Wellness" },
  // Food & Drink
  {
    keys: [
      "breakfast",
      "continental breakfast",
      "free breakfast",
      "vegetarian breakfast",
    ],
    icon: MdBreakfastDining,
    category: "Food & Drink",
  },
  {
    keys: ["restaurant", "dining", "gourmet", "cuisine", "buffet"],
    icon: FaUtensils,
    category: "Food & Drink",
  },
  {
    keys: ["bar/lounge", "bar", "lounge", "poolside bar", "cocktail"],
    icon: FaGlassMartini,
    category: "Food & Drink",
  },
  {
    keys: ["coffee shop", "cafe", "café", "tea"],
    icon: FaCoffee,
    category: "Food & Drink",
  },
  { keys: ["room service"], icon: FaConciergeBell, category: "Food & Drink" },
  {
    keys: ["bbq", "barbecue", "grill"],
    icon: MdOutdoorGrill,
    category: "Food & Drink",
  },
  {
    keys: ["minibar", "mini bar"],
    icon: FaGlassMartini,
    category: "Food & Drink",
  },
  {
    keys: ["vegan", "vegetarian menu"],
    icon: FaLeaf,
    category: "Food & Drink",
  },
  // Business
  {
    keys: ["business center", "business centre"],
    icon: FaBriefcase,
    category: "Business",
  },
  {
    keys: ["conference", "meeting room", "banquet", "convention"],
    icon: MdMeetingRoom,
    category: "Business",
  },
  { keys: ["concierge"], icon: FaConciergeBell, category: "Services" },
  // Services
  {
    keys: ["laundry", "dry clean"],
    icon: MdLocalLaundryService,
    category: "Services",
  },
  {
    keys: ["housekeeping", "cleaning", "change of bed", "daily"],
    icon: GiVacuumCleaner,
    category: "Services",
  },
  { keys: ["newspaper"], icon: FaNewspaper, category: "Services" },
  {
    keys: ["luggage", "baggage", "storage"],
    icon: FaBriefcase,
    category: "Services",
  },
  {
    keys: ["tour", "ticket assistance"],
    icon: FaRegSmile,
    category: "Services",
  },
  {
    keys: ["hair salon", "salon", "barber"],
    icon: FaRegSmile,
    category: "Services",
  },
  {
    keys: ["24-hour front desk", "front desk", "reception"],
    icon: BsBuildingCheck,
    category: "Services",
  },
  { keys: ["butler"], icon: FaConciergeBell, category: "Services" },
  // Room Features
  {
    keys: ["air conditioning", "air-conditioning"],
    icon: MdAcUnit,
    category: "Room Features",
  },
  {
    keys: ["flat-screen", "tv", "television", "cable"],
    icon: FaTv,
    category: "Room Features",
  },
  {
    keys: ["balcony", "terrace", "rooftop terrace"],
    icon: MdBalcony,
    category: "Room Features",
  },
  {
    keys: ["kitchen", "kitchenette", "microwave", "refrigerator"],
    icon: MdKitchen,
    category: "Room Features",
  },
  {
    keys: ["shower", "bathroom", "toiletries"],
    icon: MdCheckCircle,
    category: "Room Features",
  },
  // Eco & Sustainability
  {
    keys: [
      "eco-friendly",
      "solar",
      "recycl",
      "sustainable",
      "carbon",
      "led",
      "energy-efficient",
      "biodegradable",
      "compostable",
      "plastic",
      "green cleaning",
      "annual carbon",
    ],
    icon: FaLeaf,
    category: "Eco & Sustainability",
  },
  // Safety & Security
  {
    keys: ["safe deposit", "safe", "locker"],
    icon: FaLock,
    category: "Safety",
  },
  { keys: ["first aid", "emergency"], icon: FaFirstAid, category: "Safety" },
  {
    keys: ["fire extinguisher", "smoke detector"],
    icon: FaFireExtinguisher,
    category: "Safety",
  },
  {
    keys: ["smoke-free", "non-smoking"],
    icon: MdSmokeFree,
    category: "Safety",
  },
  {
    keys: ["cctv", "surveillance", "security", "well-lit"],
    icon: MdSecurity,
    category: "Safety",
  },
  {
    keys: [
      "thermometer",
      "health check",
      "health of guests",
      "distancing",
      "sanitiz",
      "disinfect",
      "face mask",
      "barrier",
      "sealed",
      "stationery",
      "tableware",
      "single-use",
    ],
    icon: MdVerified,
    category: "Safety",
  },
  // Accessibility
  {
    keys: ["wheelchair", "accessible", "stair-free", "braille"],
    icon: FaWheelchair,
    category: "Accessibility",
  },
  { keys: ["elevator", "lift"], icon: MdElevator, category: "Accessibility" },
  // Family
  {
    keys: ["babysit", "childcare", "child", "kids", "family"],
    icon: FaChild,
    category: "Family",
  },
  { keys: ["pet", "animals", "dog"], icon: FaPaw, category: "Family" },
  // Outdoor
  { keys: ["garden"], icon: FaLeaf, category: "Outdoor" },
  { keys: ["outdoor", "poolside"], icon: FaUmbrellaBeach, category: "Outdoor" },
];

/* Resolve a raw string facility label to icon + category */
const resolveAmenity = (label) => {
  const lower = label.toLowerCase();
  for (const entry of KEYWORD_MAP) {
    if (entry.keys.some((k) => lower.includes(k))) {
      return { icon: entry.icon, category: entry.category };
    }
  }
  return { icon: MdCheckCircle, category: "Other" };
};

/* ─────────────────────────────────────────
   Category color styles
───────────────────────────────────────── */
const CAT_STYLE = {
  "Internet & Tech": {
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: "text-blue-600",
    badge: "bg-blue-100 text-blue-700",
  },
  Transport: {
    bg: "bg-cyan-50",
    border: "border-cyan-200",
    icon: "text-cyan-600",
    badge: "bg-cyan-100 text-cyan-700",
  },
  "Pool & Wellness": {
    bg: "bg-teal-50",
    border: "border-teal-200",
    icon: "text-teal-600",
    badge: "bg-teal-100 text-teal-700",
  },
  "Food & Drink": {
    bg: "bg-amber-50",
    border: "border-amber-200",
    icon: "text-amber-600",
    badge: "bg-amber-100 text-amber-700",
  },
  Business: {
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    icon: "text-indigo-600",
    badge: "bg-indigo-100 text-indigo-700",
  },
  Services: {
    bg: "bg-purple-50",
    border: "border-purple-200",
    icon: "text-purple-600",
    badge: "bg-purple-100 text-purple-700",
  },
  "Room Features": {
    bg: "bg-sky-50",
    border: "border-sky-200",
    icon: "text-sky-600",
    badge: "bg-sky-100 text-sky-700",
  },
  "Eco & Sustainability": {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    icon: "text-emerald-600",
    badge: "bg-emerald-100 text-emerald-700",
  },
  Safety: {
    bg: "bg-red-50",
    border: "border-red-200",
    icon: "text-red-500",
    badge: "bg-red-100 text-red-600",
  },
  Accessibility: {
    bg: "bg-orange-50",
    border: "border-orange-200",
    icon: "text-orange-600",
    badge: "bg-orange-100 text-orange-700",
  },
  Family: {
    bg: "bg-pink-50",
    border: "border-pink-200",
    icon: "text-pink-600",
    badge: "bg-pink-100 text-pink-700",
  },
  Outdoor: {
    bg: "bg-lime-50",
    border: "border-lime-200",
    icon: "text-lime-600",
    badge: "bg-lime-100 text-lime-700",
  },
  Other: {
    bg: "bg-slate-50",
    border: "border-slate-200",
    icon: "text-slate-500",
    badge: "bg-slate-100 text-slate-600",
  },
};

const getCatStyle = (cat) => CAT_STYLE[cat] || CAT_STYLE.Other;

/* ─── Single chip ─── */
const AmenityChip = ({ label, style }) => {
  const { icon: Icon } = resolveAmenity(label);
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border ${style.bg} ${style.border} hover:shadow-sm hover:-translate-y-0.5 transition-all duration-150`}
    >
      <span className={`shrink-0 ${style.icon}`}>
        <Icon style={{ fontSize: 14 }} />
      </span>
      <span className="text-xs font-medium text-slate-700 leading-tight capitalize">
        {label}
      </span>
    </div>
  );
};

/* ─── Category group ─── */
const CategoryGroup = ({ category, items, style, defaultOpen }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-slate-50 transition"
      >
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${style.badge}`}
          >
            {category}
          </span>
          <span className="text-[11px] text-slate-400 font-medium">
            {items.length} item{items.length !== 1 ? "s" : ""}
          </span>
        </div>
        {open ? (
          <MdExpandLess className="text-slate-400 text-lg shrink-0" />
        ) : (
          <MdExpandMore className="text-slate-400 text-lg shrink-0" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 bg-white">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {items.map((label, i) => (
              <AmenityChip key={i} label={label} style={style} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────
   Main Amenities
   Props: amenities — string[] from HotelFacilities
───────────────────────────────────────── */
const Amenities = ({ amenities = [] }) => {
  const [showAll, setShowAll] = useState(false);

  const grouped = useMemo(() => {
    const map = {};

    amenities.filter(Boolean).forEach((raw) => {
      // Strip noisy patterns like "Number of bars/lounges - 1" → "Bar/Lounges"
      // Keep these as readable labels but skip pure numeric entries
      const cleaned = raw
        .replace(/^Number of (.+?) - \d+$/i, (_, name) => name)
        .replace(/^Conference space size \([^)]+\) - \d+$/i, "")
        .trim();

      if (!cleaned || /^\d+$/.test(cleaned)) return;

      const { category } = resolveAmenity(cleaned);
      if (!map[category]) map[category] = [];
      map[category].push(cleaned);
    });

    // Sort: most items first, Other last
    return Object.entries(map).sort(([catA, a], [catB, b]) => {
      if (catA === "Other") return 1;
      if (catB === "Other") return -1;
      return b.length - a.length;
    });
  }, [amenities]);

  const visibleGroups = showAll ? grouped : grouped.slice(0, 4);
  const hiddenCount = grouped.length - 4;

  if (!grouped.length) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#0a2540] flex items-center justify-center shrink-0">
            <BsStars className="text-white text-base" />
          </div>
          <div>
            <h2 className="font-black text-[#0a2540] text-base leading-none">
              Amenities
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {amenities.filter(Boolean).length} facilities · {grouped.length}{" "}
              categories
            </p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-1.5 flex-wrap justify-end max-w-xs">
          {grouped.slice(0, 5).map(([cat]) => {
            const style = getCatStyle(cat);
            return (
              <span
                key={cat}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${style.badge}`}
              >
                {cat}
              </span>
            );
          })}
          {grouped.length > 5 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
              +{grouped.length - 5} more
            </span>
          )}
        </div>
      </div>

      {/* Groups */}
      <div className="p-4 flex flex-col gap-3">
        {visibleGroups.map(([category, items], i) => (
          <CategoryGroup
            key={category}
            category={category}
            items={items}
            style={getCatStyle(category)}
            defaultOpen={i < 2}
          />
        ))}

        {grouped.length > 4 && (
          <button
            onClick={() => setShowAll((v) => !v)}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-slate-200 text-[#0d7fe8] font-bold text-xs hover:border-[#0d7fe8] hover:bg-blue-50 transition w-full"
          >
            {showAll ? (
              <>
                <MdExpandLess className="text-base" /> Show Less
              </>
            ) : (
              <>
                <MdExpandMore className="text-base" /> Show {hiddenCount} More
                Categories
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default Amenities;
