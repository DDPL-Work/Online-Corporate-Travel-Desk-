// ResearchableFlightHeader.jsx
// MMT-style inline header with read/edit toggle (Tailwind CSS)
// Default: read-only view with "Modify Search" button
// On click: inputs become editable, button becomes "Search"

import React, { useState, useRef, useEffect } from "react";
import { FaExchangeAlt, FaPlane } from "react-icons/fa";
import {
  MdFlightTakeoff,
  MdFlightLand,
  MdArrowBack,
  MdPerson,
  MdKeyboardArrowDown,
  MdEdit,
} from "react-icons/md";
import { BsCalendar3, BsSearch, BsChevronDown } from "react-icons/bs";
import { airportDatabase } from "../../../data/airportDatabase";
import TravelersClassModal from "../../../components/FlightSearchComponents/TravelersClassModal";

/* ─── cabin ──────────────────────────────────────────────────────────────────── */
const CABIN_OPTIONS = [
  { label: "Economy",         value: "economy"         },
  { label: "Premium Economy", value: "premium_economy" },
  { label: "Business",        value: "business"        },
  { label: "First Class",     value: "first_class"     },
  { label: "Premium Business",     value: "premium_business"     }, 
];
const CABIN_TBO = { 2: "economy", 3: "premium_economy", 4: "business", 6: "first_class", 7: "premium_business" };
const TBO_CABIN = { economy: 2, premium_economy: 3, business: 4, first_class: 6, premium_business: 7 };
const cabinLabel = (v) => CABIN_OPTIONS.find((o) => o.value === v)?.label || "Economy";

/* ─── helpers ────────────────────────────────────────────────────────────────── */
const toISO = (s) => {
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (s.includes("T")) return s.split("T")[0];
  try { const d = new Date(s); if (!isNaN(d)) return d.toISOString().split("T")[0]; } catch (_) {}
  return "";
};

const fmtDate = (iso) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "2-digit" });
  } catch (_) { return iso; }
};

const getAirport  = (code) => airportDatabase.find((a) => a.iata_code === code);
const airportDisp = (code) => { const a = getAirport(code); return a ? `${a.city}, ${a.country}` : code || "—"; };
const airportSub  = (code) => { const a = getAirport(code); return a ? `${code} · ${a.name?.slice(0, 28)}` : ""; };

const SORT_TABS = ["Best", "Cheapest", "Early depart", "Late depart"];

/* ─── derive / build payload ─────────────────────────────────────────────────── */
const derive = (payload, journeyType) => {
  const jt = Number(journeyType) || 1;
  const adults   = payload?.AdultCount  ?? payload?.adults   ?? payload?.passengers?.adults   ?? 1;
  const children = payload?.ChildCount  ?? payload?.children ?? payload?.passengers?.children ?? 0;
  const infants  = payload?.InfantCount ?? payload?.infants  ?? payload?.passengers?.infants  ?? 0;
  const cabRaw   = payload?.Segments?.[0]?.FlightCabinClass ?? payload?.cabinClass ?? "economy";
  const cabin    = typeof cabRaw === "number" ? (CABIN_TBO[cabRaw] || "economy") : cabRaw;
  const origin      = payload?.Segments?.[0]?.Origin      || payload?.origin      || "";
  const destination = payload?.Segments?.[0]?.Destination || payload?.destination || "";
  const dep = toISO(payload?.Segments?.[0]?.PreferredDepartureTime || payload?.departureDate);
  const ret = toISO(payload?.Segments?.[1]?.PreferredDepartureTime || payload?.returnDate || payload?.ReturnDate);

  if (jt === 3) {
    return { journeyType: 3, passengers: { adults, children, infants }, cabin,
      segments: (payload?.Segments || payload?.segments || []).map((s) => ({
        origin:        s.Origin      || s.origin      || "",
        destination:   s.Destination || s.destination || "",
        departureDate: toISO(s.PreferredDepartureTime || s.departureDate || ""),
      })) };
  }
  return { journeyType: jt, passengers: { adults, children, infants }, cabin, origin, destination, departureDate: dep, returnDate: ret };
};

const buildPayload = (draft, original) => {
  const jt = Number(draft.journeyType);
  const counts = { AdultCount: draft.passengers.adults, ChildCount: draft.passengers.children, InfantCount: draft.passengers.infants };
  const cc = TBO_CABIN[draft.cabin] || 2;
  if (jt === 1) return { ...original, ...counts, JourneyType: 1,
    Segments: [{ ...(original?.Segments?.[0] || {}), Origin: draft.origin, Destination: draft.destination, FlightCabinClass: cc, PreferredDepartureTime: draft.departureDate ? `${draft.departureDate}T00:00:00` : "" }] };
  if (jt === 2) return { ...original, ...counts, JourneyType: 2,
    Segments: [
      { ...(original?.Segments?.[0] || {}), Origin: draft.origin, Destination: draft.destination, FlightCabinClass: cc, PreferredDepartureTime: draft.departureDate ? `${draft.departureDate}T00:00:00` : "" },
      { ...(original?.Segments?.[1] || {}), Origin: draft.destination, Destination: draft.origin, FlightCabinClass: cc, PreferredDepartureTime: draft.returnDate ? `${draft.returnDate}T00:00:00` : "" },
    ] };
  if (jt === 3) return { ...original, ...counts, JourneyType: 3,
    Segments: (draft.segments || []).map((s, i) => ({ ...(original?.Segments?.[i] || {}), Origin: s.origin, Destination: s.destination, FlightCabinClass: cc, PreferredDepartureTime: s.departureDate ? `${s.departureDate}T00:00:00` : "" })) };
  return original;
};

/* ─── Vertical divider ───────────────────────────────────────────────────────── */
const Div = ({ editMode }) => (
  <div className={`w-px h-11 shrink-0 self-center ${editMode ? "bg-blue-200" : "bg-gray-200"}`} />
);

/* ─── Airport Autocomplete ───────────────────────────────────────────────────── */
function AirportAutocomplete({ value, onChange, placeholder }) {
  const [q, setQ]       = useState("");
  const [hits, setHits] = useState([]);
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);
  const dropRef  = useRef(null);

  useEffect(() => {
    if (value) {
      const a = getAirport(value);
      setQ(a ? `${a.city}, ${a.country}` : value);
    } else {
      setQ("");
    }
  }, [value]);

  useEffect(() => {
    const h = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target) && inputRef.current && !inputRef.current.contains(e.target))
        setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleChange = (e) => {
    const v = e.target.value;
    setQ(v);
    if (v.length > 1) {
      const s = v.toLowerCase();
      setHits(airportDatabase.filter((a) =>
        a.city.toLowerCase().includes(s) || a.iata_code.toLowerCase().includes(s) ||
        a.name.toLowerCase().includes(s) || (a.country && a.country.toLowerCase().includes(s))
      ).slice(0, 8));
      setOpen(true);
    } else { setHits([]); setOpen(false); }
  };

  const select = (a) => {
    onChange({ code: a.iata_code, city: a.city, country: a.country, ...a });
    setOpen(false);
  };

  return (
    <div className="relative flex-1 min-w-0">
      <div className="flex items-center gap-1.5 w-full">
        <input
          ref={inputRef}
          type="text"
          value={q}
          onChange={handleChange}
          onFocus={() => q.length > 1 && setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full border-none outline-none bg-transparent text-[14px] font-extrabold text-gray-900 font-inter placeholder:text-gray-400 placeholder:font-semibold"
        />
      </div>

      {open && hits.length > 0 && (
        <div ref={dropRef} className="absolute top-[calc(100%+8px)] -left-2 w-[300px] z-[200] bg-white border border-gray-200 rounded-xl shadow-2xl max-h-[280px] overflow-y-auto">
          <div className="px-3.5 py-1.5 bg-gray-50 border-b border-gray-100 text-[9px] font-bold tracking-widest text-gray-400 uppercase sticky top-0">Airports</div>
          {hits.map((a, i) => (
            <div key={i} onClick={() => select(a)}
              className="flex items-center justify-between px-3.5 py-2.5 cursor-pointer border-b border-gray-50 hover:bg-blue-50 transition-colors">
              <div className="flex items-center gap-2.5">
                <div className="w-[30px] h-[30px] rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                  <FaPlane className="text-[11px] text-[#2F80B7]" />
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-gray-800">{a.city}, {a.country}</div>
                  <div className="text-[11px] text-gray-400">{a.name?.slice(0, 34)}</div>
                </div>
              </div>
              <span className="text-[12px] font-bold text-[#2F80B7] bg-blue-50 px-2 py-0.5 rounded-md">{a.iata_code}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Passenger & Cabin picker ───────────────────────────────────────────────── */
function PaxCabin({ passengers, cabin, onChange, editMode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const total = (passengers.adults || 1) + (passengers.children || 0) + (passengers.infants || 0);

  return (
    <div ref={ref} className={`relative ${editMode ? "cursor-pointer" : "cursor-default"}`}>
      <div
        onClick={() => editMode && setOpen(!open)}
        className="flex items-center gap-1.5 h-full w-full"
      >
        <span className="text-[14px] font-extrabold text-gray-900 whitespace-nowrap">
          {total} Adult{total !== 1 ? "s" : ""}, {cabinLabel(cabin).slice(0, 8)}
        </span>
        {editMode && <BsChevronDown className="text-gray-500 text-[10px] ml-auto" />}
      </div>

      {open && editMode && (
        <TravelersClassModal
          onClose={() => setOpen(false)}
          onApply={(data) => {
            const selectedOpt = CABIN_OPTIONS.find(o => o.label === data.travelClass);
            onChange({
              passengers: { adults: data.adults, children: data.children, infants: data.infants },
              cabin: selectedOpt ? selectedOpt.value : "economy"
            });
          }}
          modalPosition={{ top: "calc(100% + 12px)", left: "auto", right: 0, width: 320 }}
          initialData={{
            passengers,
            travelClass: cabinLabel(cabin),
          }}
        />
      )}
    </div>
  );
}



/* ─── Trip Type Dropdown ─────────────────────────────────────────────────────── */
function TripTypeDropdown({ value, onChange, editMode, journeyLabel }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const labels = {
    1: "One Way",
    2: "Round Trip",
    3: "Multi City"
  };

  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} className={`relative flex flex-col flex-shrink-0 min-w-[130px] bg-white border ${editMode ? 'border-[#2F80B7] bg-blue-50 cursor-pointer shadow-md z-[100]' : 'border-gray-300 cursor-default shadow-sm'} rounded-[8px] px-3.5 py-2 transition-colors`}
      onClick={() => editMode && setOpen(!open)}
    >
      <div className="text-[10px] font-bold tracking-wider text-gray-500 uppercase flex items-center gap-1.5 mb-[2px]">
        Trip Type {editMode && <BsChevronDown className="text-[#2F80B7] text-[10px] font-extrabold ml-auto" />}
      </div>
      <div className="text-[14px] font-extrabold text-gray-900">{editMode ? labels[value] : journeyLabel}</div>

      {open && editMode && (
        <div className="absolute top-[calc(100%+8px)] left-0 w-full min-w-[140px] z-[200] bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          {[
            { label: "One Way", val: 1 },
            { label: "Round Trip", val: 2 },
            { label: "Multi City", val: 3 },
          ].map(opt => (
            <div 
              key={opt.val}
              onClick={(e) => { e.stopPropagation(); onChange(opt.val); setOpen(false); }}
              className={`px-4 py-2.5 text-[13px] font-bold cursor-pointer transition-colors border-b border-gray-50 last:border-b-0 ${value === opt.val ? 'bg-blue-50 text-[#2F80B7]' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN EXPORT
═══════════════════════════════════════════════════════════════════════════════ */
export default function ResearchableFlightHeader({
  routeHeader = [],
  headerStats = {},
  showBestTimeBadge = false,
  flightsCount = 0,
  sortKey = "Best",
  setSortKey = () => {},
  journeyType,
  searchPayload,
  onSearch = () => {},
  onBack = () => {},
}) {
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft]       = useState(() => derive(searchPayload, journeyType));
  const [loading, setLoading]   = useState(false);

  const jt = Number(editMode ? draft?.journeyType : journeyType) || 1;
  const staticJtLabel = Number(journeyType) === 2 ? "Round Trip" : Number(journeyType) === 3 ? "Multi City" : "One Way";
  const journeyLabel = editMode ? (jt === 2 ? "Round Trip" : jt === 3 ? "Multi City" : "One Way") : staticJtLabel;

  // Reset draft to latest payload when exiting edit or payload changes
  useEffect(() => {
    if (!editMode) setDraft(derive(searchPayload, journeyType));
  }, [searchPayload, journeyType, editMode]);

  // Ensure default segments for multi-city exist when switching
  useEffect(() => {
    if (jt === 3 && (!draft.segments || draft.segments.length === 0)) {
      setDraft(d => ({
        ...d,
        segments: [
          { origin: d.origin, destination: d.destination, departureDate: d.departureDate },
          { origin: d.destination, destination: "", departureDate: d.returnDate || d.departureDate }
        ]
      }));
    }
  }, [jt]);

  const handleSearch = async () => {
    setLoading(true);
    try {
      await onSearch(buildPayload(draft, searchPayload));
      setEditMode(false);
    } finally {
      setLoading(false);
    }
  };

  const cancelEdit = () => {
    setDraft(derive(searchPayload, journeyType));
    setEditMode(false);
  };

  /* ── ONE-WAY / ROUND-TRIP row ── */
  const renderMainRow = () => (
    <div className="flex items-stretch gap-2 py-3 w-full animate-fadeIn transition-colors duration-200 flex-wrap">
      
      {/* TRIP TYPE */}
      <TripTypeDropdown value={jt} onChange={(v) => setDraft({ ...draft, journeyType: v })} editMode={editMode} journeyLabel={staticJtLabel} />

      {/* FROM */}
      <div className={`flex flex-col flex-[1.4] min-w-0 px-3.5 py-2 border rounded-[8px] transition-colors shadow-sm
        ${editMode ? "border-[#2F80B7] bg-blue-50" : "border-gray-300 bg-white hover:border-[#2F80B7]"}
      `}>
        <div className="text-[10px] font-bold tracking-wider text-gray-500 uppercase mb-[2px]">From</div>
        {editMode ? (
          <AirportAutocomplete
            value={draft.origin}
            onChange={(a) => setDraft((d) => ({ ...d, origin: a.code }))}
            placeholder="City or airport"
          />
        ) : (
          <div className="text-[14px] font-extrabold text-gray-900 truncate">
            {airportDisp(draft.origin)}
          </div>
        )}
      </div>

      {/* SWAP ICON */}
      <div className="flex items-center justify-center shrink-0 w-6">
        <FaExchangeAlt 
          onClick={() => editMode && setDraft((d) => ({ ...d, origin: d.destination, destination: d.origin }))}
          className={`text-[15px] transition-colors ${editMode ? 'text-[#2F80B7] hover:text-blue-800 cursor-pointer' : 'text-[#8eb5ce]'}`} 
        />
      </div>

      {/* TO */}
      <div className={`flex flex-col flex-[1.4] min-w-0 px-3.5 py-2 border rounded-[8px] transition-colors shadow-sm
        ${editMode ? "border-[#2F80B7] bg-blue-50" : "border-gray-300 bg-white hover:border-[#2F80B7]"}
      `}>
        <div className="text-[10px] font-bold tracking-wider text-gray-500 uppercase mb-[2px]">To</div>
        {editMode ? (
          <AirportAutocomplete
            value={draft.destination}
            onChange={(a) => setDraft((d) => ({ ...d, destination: a.code }))}
            placeholder="City or airport"
          />
        ) : (
          <div className="text-[14px] font-extrabold text-gray-900 truncate">
            {airportDisp(draft.destination)}
          </div>
        )}
      </div>

      {/* DEPART */}
      <div className={`flex flex-col shrink-0 min-w-[135px] px-3.5 py-2 border rounded-[8px] transition-colors shadow-sm
        ${editMode ? "border-[#2F80B7] bg-blue-50" : "border-gray-300 bg-white hover:border-[#2F80B7]"}
      `}>
        <div className="text-[10px] font-bold tracking-wider text-gray-500 uppercase mb-[2px]">Depart</div>
        {editMode ? (
          <input
            type="date"
            value={draft.departureDate}
            min={new Date().toISOString().split("T")[0]}
            onChange={(e) => setDraft((d) => ({ ...d, departureDate: e.target.value }))}
            className="border-none outline-none bg-transparent text-[14px] font-extrabold text-gray-900 cursor-pointer font-inter w-full"
          />
        ) : (
          <div className="text-[14px] font-extrabold text-gray-900">
            {fmtDate(draft.departureDate)}
          </div>
        )}
      </div>

      {/* RETURN */}
      <div className={`flex flex-col shrink-0 min-w-[135px] px-3.5 py-2 border rounded-[8px] transition-colors shadow-sm
        ${editMode && jt === 2 ? "border-[#2F80B7] bg-blue-50" : "border-gray-300 bg-white hover:border-[#2F80B7]"}
        ${jt === 1 ? "opacity-50 pointer-events-none bg-gray-50 hover:border-gray-300" : ""}
      `}>
        <div className="text-[10px] font-bold tracking-wider text-gray-500 uppercase mb-[2px]">Return</div>
        {editMode && jt === 2 ? (
          <input
            type="date"
            value={draft.returnDate || ""}
            min={draft.departureDate}
            onChange={(e) => setDraft((d) => ({ ...d, returnDate: e.target.value }))}
            className="border-none outline-none bg-transparent text-[14px] font-extrabold text-gray-900 cursor-pointer font-inter w-full"
          />
        ) : (
          <div className={`text-[14px] font-extrabold ${jt === 1 ? "text-gray-400" : "text-gray-900"}`}>
            {jt === 1 ? "Select Return" : fmtDate(draft.returnDate)}
          </div>
        )}
      </div>

      {/* PASSENGER & CLASS */}
      <div className={`flex flex-col shrink-0 min-w-[155px] px-3.5 py-2 border rounded-[8px] transition-colors shadow-sm
        ${editMode ? "border-[#2F80B7] bg-blue-50" : "border-gray-300 bg-white hover:border-[#2F80B7]"}
      `}>
        <div className="text-[10px] font-bold tracking-wider text-gray-500 uppercase mb-[2px]">Passenger &amp; Class</div>
        <PaxCabin
          passengers={draft.passengers}
          cabin={draft.cabin}
          onChange={({ passengers, cabin }) => setDraft((d) => ({ ...d, passengers, cabin }))}
          editMode={editMode}
        />
      </div>

      {/* CTA ACTIONS */}
      <div className="flex items-center gap-2 pl-1 shrink-0">
        {editMode ? (
          <>
            <button
              onClick={cancelEdit}
              className="px-4 h-[44px] rounded-[8px] border border-gray-300 bg-white text-gray-500 text-[13px] font-bold font-inter cursor-pointer shadow-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSearch}
              disabled={loading}
              className={`flex items-center justify-center gap-1.5 pl-6 pr-6 h-[44px] rounded-[8px] border-none text-white text-[14px] font-bold font-inter uppercase transition-transform shadow-md min-w-[130px]
                ${loading ? "bg-blue-300 cursor-not-allowed" : "bg-[#67A6E4] hover:bg-[#5b95cd] cursor-pointer"}
              `}
            >
              {loading ? "..." : "SEARCH"}
            </button>
          </>
        ) : (
          <button
            onClick={() => setEditMode(true)}
            className="flex items-center justify-center gap-1.5 px-6 h-[44px] rounded-[8px] border-none bg-gradient-to-r from-[#87CAFE] to-[#71ACFE] text-white text-[14px] font-bold font-inter uppercase cursor-pointer shadow-md min-w-[130px] transition-opacity hover:opacity-90"
          >
            MODIFY
          </button>
        )}
      </div>

    </div>
  );

  /* ── MULTI-CITY row ── */
  const renderMultiCity = () => (
    <div className={`p-4 px-5 transition-colors duration-200 flex flex-col gap-3 ${editMode ? "bg-[#f0f8ff]" : "bg-white"}`}>
      {/* TRIP TYPE TOGGLE FOR MULTI-CITY (Only needed in edit mode to swap back, but fits nice as headers) */}
      <div className="flex w-full items-center">
         <TripTypeDropdown value={jt} onChange={(v) => setDraft({ ...draft, journeyType: v })} editMode={editMode} journeyLabel={staticJtLabel} />
      </div>

      <div className="border border-gray-100 bg-white rounded-xl overflow-hidden shadow-sm">
        {(draft.segments || []).map((seg, idx) => {
        const fromA = getAirport(seg.origin);
        const toA   = getAirport(seg.destination);
        const isNotLast = idx < draft.segments.length - 1;
        
        return (
          <div key={idx} className={`flex items-center gap-0 ${isNotLast ? "border-b border-gray-100 pb-2.5 mb-2.5" : ""}`}>
            <div className="text-[10px] font-extrabold text-[#2F80B7] uppercase tracking-[0.08em] mr-3 w-7 shrink-0">#{idx + 1}</div>

            {/* From */}
            <div className="flex-1 min-w-0 pr-3.5">
              <div className="text-[9px] font-bold tracking-widest text-gray-500 uppercase mb-[3px]">From</div>
              {editMode
                ? <AirportAutocomplete value={seg.origin} onChange={(a) => { const s = [...draft.segments]; s[idx] = { ...s[idx], origin: a.code }; setDraft((d) => ({ ...d, segments: s })); }} placeholder="City" icon={<MdFlightTakeoff />} />
                : <div className="text-[14px] font-bold text-gray-900">{fromA ? `${fromA.city}, ${fromA.country}` : seg.origin || "—"}</div>
              }
            </div>

            <Div editMode={editMode} />

            {/* To */}
            <div className="flex-1 min-w-0 px-3.5">
              <div className="text-[9px] font-bold tracking-widest text-gray-500 uppercase mb-[3px]">To</div>
              {editMode
                ? <AirportAutocomplete value={seg.destination} onChange={(a) => { const s = [...draft.segments]; s[idx] = { ...s[idx], destination: a.code }; setDraft((d) => ({ ...d, segments: s })); }} placeholder="City" icon={<MdFlightLand />} />
                : <div className="text-[14px] font-bold text-gray-900">{toA ? `${toA.city}, ${toA.country}` : seg.destination || "—"}</div>
              }
            </div>

            <Div editMode={editMode} />

            {/* Date */}
            <div className="shrink-0 px-3.5">
              <div className="text-[9px] font-bold tracking-widest text-gray-500 uppercase mb-[3px]">Date</div>
              {editMode ? (
                <div className="flex items-center gap-1.5">
                  <BsCalendar3 className="text-[#2F80B7] text-[13px]" />
                  <input type="date" value={seg.departureDate}
                    min={idx > 0 ? draft.segments[idx - 1]?.departureDate : new Date().toISOString().split("T")[0]}
                    onChange={(e) => { const s = [...draft.segments]; s[idx] = { ...s[idx], departureDate: e.target.value }; setDraft((d) => ({ ...d, segments: s })); }}
                    className="border-none outline-none bg-transparent text-[14px] font-bold text-gray-900 cursor-pointer" />
                </div>
              ) : (
                <div className="text-[14px] font-bold text-gray-900">{fmtDate(seg.departureDate)}</div>
              )}
            </div>
          </div>
        );
      })}

      </div>

      {/* Pax + CTA */}
      <div className="flex items-center justify-between pt-3 mt-1">
        <div>
          <div className="text-[9px] font-bold tracking-widest text-gray-500 uppercase mb-[3px]">Passenger &amp; Class</div>
          <PaxCabin passengers={draft.passengers} cabin={draft.cabin}
            onChange={({ passengers, cabin }) => setDraft((d) => ({ ...d, passengers, cabin }))} editMode={editMode} />
        </div>
        <div className="flex gap-2">
          {editMode ? (
            <>
              <button onClick={cancelEdit} className="px-4 py-[9px] rounded-lg border-[1.5px] border-gray-200 bg-white text-gray-500 text-[13px] font-bold cursor-pointer">Cancel</button>
              <button onClick={handleSearch} disabled={loading}
                className="flex items-center gap-1.5 px-6 py-[9px] rounded-lg border-none bg-gradient-to-b from-[#2F80B7] to-[#1F8DB7] text-white text-[13px] font-extrabold cursor-pointer shadow-[0_4px_16px_rgba(47,128,183,0.4)] uppercase">
                <BsSearch className="text-[12px]" /> {loading ? "Searching…" : "Search"}
              </button>
            </>
          ) : (
            <button onClick={() => setEditMode(true)}
              className="flex items-center gap-1.5 px-5 py-[9px] rounded-lg border-[1.5px] border-[#2F80B7] bg-white text-[#2F80B7] text-[13px] font-bold cursor-pointer hover:bg-blue-50 transition-colors">
              <MdEdit className="text-[14px]" /> Modify Search
            </button>
          )}
        </div>
      </div>
    </div>
  );

  /* ══ RENDER ══ */
  return (
    <div className="sticky top-0 z-40 font-inter">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* ── Dark brand top strip ── */}
      <div className="bg-gradient-to-r from-[#1a3a5c] to-[#1F4D7B] py-[7px] px-10 flex items-center justify-between">
        <button onClick={onBack}
          className="flex items-center gap-1.5 bg-transparent border-none text-white/65 cursor-pointer text-[12px] font-semibold p-0 hover:text-white transition-colors">
          <MdArrowBack className="text-[16px]" /> Back to search
        </button>
        <div className="flex items-center gap-3.5 text-[12px] text-white/50">
          <span className="bg-[#2f80b7]/30 border border-[#2f80b7]/50 rounded-full px-2.5 py-0.5 text-white/85 font-bold text-[11px] tracking-[0.04em]">
            {journeyLabel}
          </span>
          <span className="font-medium">{flightsCount} flights found</span>
        </div>
      </div>

      {/* ── White search bar ── */}
      <div className="bg-white border-b border-gray-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)] relative z-10 w-full">
        <div className="px-6 lg:px-10 max-w-full">
          {(jt === 1 || jt === 2) && renderMainRow()}
          {jt === 3 && renderMultiCity()}
        </div>
      </div>

      {/* ── Sort + count bar ── */}
      <div className="bg-slate-50 border-b border-gray-200 py-[7px] px-10 flex items-center justify-between">
        <div className="flex gap-1.5">
          {SORT_TABS.map((tab) => {
            const active = sortKey === tab;
            return (
              <button key={tab} onClick={() => setSortKey(tab)}
                className={`px-4 py-1.5 rounded-full text-[12px] font-bold cursor-pointer transition-all duration-150 font-inter 
                  ${active 
                    ? "border-[1.5px] border-[#2F80B7] bg-gradient-to-b from-[#2F80B7] to-[#1F8DB7] text-white shadow-[0_2px_8px_rgba(47,128,183,0.25)]" 
                    : "border-[1.5px] border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                  }
                `}>
                {tab}
              </button>
            );
          })}
        </div>
        <div className="text-[13px] text-gray-500 font-medium">
          <span className="font-extrabold text-[16px] text-gray-900 mr-1">{flightsCount}</span>flights found
        </div>
      </div>
    </div>
  );
}