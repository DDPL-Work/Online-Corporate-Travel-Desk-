// components/HotelDetails/Attractions.jsx
import React, { useState, useMemo } from "react";
import {
  MdExpandMore, MdExpandLess, MdLocationOn, MdAttractions,
  MdMuseum, MdLocalAirport, MdPark, MdStadium,
} from "react-icons/md";
import {
  FaLandmark, FaUniversity, FaTree, FaShoppingCart, FaTheaterMasks,
  FaMapMarkerAlt, FaMosque, FaPlane, FaTrain, FaBus, FaFutbol,
  FaSwimmingPool, FaGolfBall, FaWater, FaCamera, FaShoppingBag,
  FaMountain, FaChild,
} from "react-icons/fa";
import { GiGreekTemple,  GiBirdCage } from "react-icons/gi";
import { BsBuildings } from "react-icons/bs";

/* ─────────────────────────────────────────
   Smart keyword → { icon, color, bg, border, badge, category }
───────────────────────────────────────── */
const resolveAttraction = (name) => {
  const lower = name.toLowerCase();

  // ── Transport ──
  if (lower.includes("airport") || lower.includes("intl.") || lower.includes("international airport") || lower.includes("(bom)") || lower.includes("(del)") || lower.includes("(lko)"))
    return { icon: FaPlane,        color: "text-sky-600",    bg: "bg-sky-50",     border: "border-sky-200",    badge: "bg-sky-100 text-sky-700",     category: "Transport" };
  if (lower.includes("railway") || lower.includes("station") || lower.includes("metro"))
    return { icon: FaTrain,        color: "text-slate-600",  bg: "bg-slate-50",   border: "border-slate-200",  badge: "bg-slate-100 text-slate-700",  category: "Transport" };
  if (lower.includes("bus") || lower.includes("terminal"))
    return { icon: FaBus,          color: "text-slate-600",  bg: "bg-slate-50",   border: "border-slate-200",  badge: "bg-slate-100 text-slate-700",  category: "Transport" };

  // ── Religious ──
  if (lower.includes("temple") || lower.includes("mandir") || lower.includes("tirth") || lower.includes("math") || lower.includes("devi") || lower.includes("shiva") || lower.includes("ram") || lower.includes("krishna") || lower.includes("radha"))
    return { icon: GiGreekTemple,  color: "text-orange-600", bg: "bg-orange-50",  border: "border-orange-200", badge: "bg-orange-100 text-orange-700", category: "Religious" };
  if (lower.includes("mosque") || lower.includes("masjid") || lower.includes("imambara") || lower.includes("dargah") || lower.includes("harana"))
    return { icon: FaMosque,       color: "text-green-700",  bg: "bg-green-50",   border: "border-green-200",  badge: "bg-green-100 text-green-700",  category: "Religious" };
  if (lower.includes("church") || lower.includes("cathedral"))
    return { icon: FaLandmark,     color: "text-indigo-600", bg: "bg-indigo-50",  border: "border-indigo-200", badge: "bg-indigo-100 text-indigo-700", category: "Religious" };

  // ── Nature & Parks ──
  if (lower.includes("falls") || lower.includes("waterfall"))
    return { icon: FaWater,color: "text-blue-600",   bg: "bg-blue-50",    border: "border-blue-200",   badge: "bg-blue-100 text-blue-700",    category: "Nature" };
  if (lower.includes("lake") || lower.includes("river") || lower.includes("beach") || lower.includes("sea"))
    return { icon: FaWater,        color: "text-blue-600",   bg: "bg-blue-50",    border: "border-blue-200",   badge: "bg-blue-100 text-blue-700",    category: "Nature" };
  if (lower.includes("bird sanctuary") || lower.includes("sanctuary") || lower.includes("wildlife"))
    return { icon: GiBirdCage,     color: "text-lime-600",   bg: "bg-lime-50",    border: "border-lime-200",   badge: "bg-lime-100 text-lime-700",    category: "Nature" };
  if (lower.includes("botanical") || lower.includes("garden") || lower.includes("park") || lower.includes("bagh") || lower.includes("forest") || lower.includes("hills") || lower.includes("valley") || lower.includes("mango"))
    return { icon: FaTree,         color: "text-emerald-600",bg: "bg-emerald-50", border: "border-emerald-200",badge: "bg-emerald-100 text-emerald-700",category: "Parks & Nature" };
  if (lower.includes("fort") || lower.includes("hill"))
    return { icon: FaMountain,     color: "text-stone-600",  bg: "bg-stone-50",   border: "border-stone-200",  badge: "bg-stone-100 text-stone-700",  category: "Parks & Nature" };
  if (lower.includes("zoo") || lower.includes("safari"))
    return { icon: FaTree,         color: "text-lime-600",   bg: "bg-lime-50",    border: "border-lime-200",   badge: "bg-lime-100 text-lime-700",    category: "Parks & Nature" };

  // ── Museums & Heritage ──
  if (lower.includes("museum") || lower.includes("gallery"))
    return { icon: MdMuseum,       color: "text-amber-700",  bg: "bg-amber-50",   border: "border-amber-200",  badge: "bg-amber-100 text-amber-700",  category: "Museums & Heritage" };
  if (lower.includes("monument") || lower.includes("memorial") || lower.includes("residency") || lower.includes("mahal") || lower.includes("manzil") || lower.includes("moti") || lower.includes("chowk") || lower.includes("1857"))
    return { icon: FaLandmark,     color: "text-yellow-700", bg: "bg-yellow-50",  border: "border-yellow-200", badge: "bg-yellow-100 text-yellow-700", category: "Museums & Heritage" };

  // ── Education ──
  if (lower.includes("college") || lower.includes("university") || lower.includes("school") || lower.includes("institute"))
    return { icon: FaUniversity,   color: "text-purple-600", bg: "bg-purple-50",  border: "border-purple-200", badge: "bg-purple-100 text-purple-700", category: "Education" };

  // ── Sports ──
  if (lower.includes("stadium") || lower.includes("cricket") || lower.includes("sports") || lower.includes("dy patil"))
    return { icon: FaFutbol,       color: "text-red-600",    bg: "bg-red-50",     border: "border-red-200",    badge: "bg-red-100 text-red-700",      category: "Sports" };
  if (lower.includes("golf"))
    return { icon: FaGolfBall,     color: "text-green-600",  bg: "bg-green-50",   border: "border-green-200",  badge: "bg-green-100 text-green-700",  category: "Sports" };

  // ── Shopping ──
  if (lower.includes("mall") || lower.includes("market") || lower.includes("bazaar") || lower.includes("shopping") || lower.includes("grand central") || lower.includes("seawoods grand"))
    return { icon: FaShoppingBag,  color: "text-pink-600",   bg: "bg-pink-50",    border: "border-pink-200",   badge: "bg-pink-100 text-pink-700",    category: "Shopping" };

  // ── Entertainment ──
  if (lower.includes("wonder park") || lower.includes("cinema") || lower.includes("theater") || lower.includes("amusement") || lower.includes("entertainment"))
    return { icon: FaChild,        color: "text-violet-600", bg: "bg-violet-50",  border: "border-violet-200", badge: "bg-violet-100 text-violet-700", category: "Entertainment" };

  // Default
  return { icon: FaCamera,        color: "text-[#0d7fe8]",  bg: "bg-blue-50",    border: "border-blue-200",   badge: "bg-blue-100 text-blue-700",    category: "Sightseeing" };
};

/* ─────────────────────────────────────────
   Attraction Card
───────────────────────────────────────── */
const AttractionCard = ({ name, index, meta }) => {
  const Icon = meta.icon;
  return (
    <div className={`group flex items-center gap-3 p-3 rounded-xl border ${meta.border} ${meta.bg} hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 cursor-default`}>
      {/* Number */}
      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black ${meta.badge}`}>
        {index + 1}
      </div>
      {/* Icon */}
      <span className={`shrink-0 ${meta.color}`}>
        <Icon style={{ fontSize: 15 }} />
      </span>
      {/* Name */}
      <span className="text-xs font-semibold text-slate-700 leading-tight flex-1">{name}</span>
      {/* Pin */}
      <MdLocationOn className="text-slate-300 group-hover:text-[#0d7fe8] transition text-base shrink-0" />
    </div>
  );
};

/* ─────────────────────────────────────────
   Main Attractions
   Props: attractions — API object {"1) ": "Name", ...}
───────────────────────────────────────── */
const Attractions = ({ attractions = {} }) => {
  const [showAll, setShowAll] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");

  const list = useMemo(() =>
    Object.values(attractions)
      .map((n) => n?.trim())
      .filter(Boolean)
      .map((name) => ({ name, meta: resolveAttraction(name) })),
    [attractions]
  );

  const categories = useMemo(() => {
    const cats = [...new Set(list.map((a) => a.meta.category))];
    return ["All", ...cats];
  }, [list]);

  const filtered = useMemo(() =>
    activeCategory === "All" ? list : list.filter((a) => a.meta.category === activeCategory),
    [list, activeCategory]
  );

  const LIMIT = 8;
  const visible = showAll ? filtered : filtered.slice(0, LIMIT);
  const hiddenCount = filtered.length - LIMIT;

  if (!list.length) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#0a2540] flex items-center justify-center shrink-0">
            <MdAttractions className="text-white text-lg" />
          </div>
          <div>
            <h2 className="font-black text-[#0a2540] text-base leading-none">Nearby Attractions</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {list.length} places · within reach of the hotel
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-full px-3 py-1">
          <div className="w-1.5 h-1.5 rounded-full bg-[#0d7fe8] animate-pulse" />
          <span className="text-[11px] font-bold text-[#0d7fe8]">Near Hotel</span>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* Category Tabs */}
        {categories.length > 2 && (
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {categories.map((cat) => {
              const isActive = activeCategory === cat;
              const sample = list.find((a) => a.meta.category === cat);
              const badge = sample?.meta.badge || "bg-slate-100 text-slate-600";
              return (
                <button
                  key={cat}
                  onClick={() => { setActiveCategory(cat); setShowAll(false); }}
                  className={`shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-full border transition-all whitespace-nowrap ${
                    isActive
                      ? "bg-[#0a2540] text-white border-[#0a2540] shadow-sm"
                      : `${badge} border-transparent hover:opacity-80`
                  }`}
                >
                  {cat}
                  {cat !== "All" && (
                    <span className="ml-1 opacity-60">
                      ({list.filter((a) => a.meta.category === cat).length})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
          {visible.map(({ name, meta }, i) => (
            <AttractionCard key={name} name={name} index={i} meta={meta} />
          ))}
        </div>

        {/* Show more */}
        {filtered.length > LIMIT && (
          <button
            onClick={() => setShowAll((v) => !v)}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-slate-200 text-[#0d7fe8] font-bold text-xs hover:border-[#0d7fe8] hover:bg-blue-50 transition w-full"
          >
            {showAll
              ? <><MdExpandLess className="text-base" /> Show Less</>
              : <><MdExpandMore className="text-base" /> Show {hiddenCount} More Attractions</>
            }
          </button>
        )}
      </div>
    </div>
  );
};

export default Attractions;