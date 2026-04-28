// ResearchableFlightHeader.jsx
// MMT-style inline header with always-editable search fields

import React, { useState, useRef, useEffect } from "react";
import { FaExchangeAlt, FaPlane } from "react-icons/fa";
import { MdFlightTakeoff, MdFlightLand, MdArrowBack, MdPerson, MdKeyboardArrowDown } from "react-icons/md";
import { BsChevronDown, BsCalendar4 } from "react-icons/bs";
import { airportDatabase } from "../../../data/airportDatabase";
import TravelersClassModal from "../../../components/FlightSearchComponents/TravelersClassModal";
import CustomCalendar from "../../../components/CustomCalendar";

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
              className="flex items-center justify-between px-3.5 py-2.5 cursor-pointer border-b border-gray-50 hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-2.5">
                <div className="w-[30px] h-[30px] rounded-full bg-slate-50 flex items-center justify-center shrink-0">
                  <FaPlane className="text-[11px] text-[#C9A84C]" />
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-gray-800">{a.city}, {a.country}</div>
                  <div className="text-[11px] text-gray-400">{a.name?.slice(0, 34)}</div>
                </div>
              </div>
              <span className="text-[12px] font-bold text-[#C9A84C] bg-slate-100 px-2 py-0.5 rounded-md">{a.iata_code}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Passenger & Cabin picker ───────────────────────────────────────────────── */
function PaxCabin({ passengers, cabin, onChange, isOpen, onToggle }) {
  const ref = useRef(null);

  const total = (passengers.adults || 1) + (passengers.children || 0) + (passengers.infants || 0);

  return (
    <div ref={ref} className="relative cursor-pointer">
      <div
        onClick={onToggle}
        className="flex items-center gap-1.5 h-full w-full"
      >
        <span className="text-[14px] font-extrabold text-gray-900 whitespace-nowrap">
          {total} Adult{total !== 1 ? "s" : ""}, {cabinLabel(cabin).slice(0, 8)}
        </span>
        <BsChevronDown className="text-gray-500 text-[10px] ml-auto" />
      </div>

      {isOpen && (
        <TravelersClassModal
          onClose={onToggle}
          onApply={(data) => {
            const selectedOpt = CABIN_OPTIONS.find(o => o.label === data.travelClass);
            onChange({
              passengers: { adults: data.adults, children: data.children, infants: data.infants },
              cabin: selectedOpt ? selectedOpt.value : "economy"
            });
          }}
          modalPosition={{ top: "calc(100% + 12px)", left: "auto", right: 0, width: 640, zIndex: 1000 }}
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
function TripTypeDropdown({ value, onChange, journeyLabel, isOpen, onToggle }) {
  const ref = useRef(null);

  const labels = {
    1: "One Way",
    2: "Round Trip",
  };

  return (
    <div ref={ref} className="relative flex flex-col shrink-0 min-w-[120px] px-3.5 py-2 border border-[#C9A84C]/30 bg-[#C9A84C]/5 rounded-[8px] shadow-sm cursor-pointer"
         onClick={onToggle}>
      <div className="text-[10px] font-bold tracking-wider text-gray-500 uppercase mb-[2px]">Trip Type</div>
      <div className="flex items-center gap-1.5">
         <div className="text-[14px] font-extrabold text-gray-900">{labels[value] || journeyLabel}</div>
         <BsChevronDown className="text-gray-500 text-[10px] ml-auto" />
      </div>

      {isOpen && (
        <div className="absolute top-[calc(100%+8px)] left-0 w-full min-w-[160px] bg-white rounded-xl shadow-2xl border border-gray-100 z-[1001] overflow-hidden"
             onClick={e => e.stopPropagation()}>
          {[
            { label: "One Way", val: 1 },
            { label: "Round Trip", val: 2 },
          ].map(opt => (
            <div 
              key={opt.val}
              onClick={(e) => { e.stopPropagation(); onChange(opt.val); onToggle(); }}
              className={`px-4 py-2.5 text-[13px] font-bold cursor-pointer transition-colors border-b border-gray-50 last:border-b-0 ${value === opt.val ? 'bg-slate-50 text-[#C9A84C]' : 'text-gray-700 hover:bg-gray-50'}`}
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
  const [draft, setDraft]       = useState(() => derive(searchPayload, journeyType));
  const [loading, setLoading]   = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null); // 'dep', 'ret', 'pax', 'trip'

  const jt = Number(draft?.journeyType) || 1;
  const journeyLabel = jt === 2 ? "Round Trip" : jt === 3 ? "Multi City" : "One Way";

  // Reset draft to latest payload when payload changes
  useEffect(() => {
    setDraft(derive(searchPayload, journeyType));
  }, [searchPayload, journeyType]);

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
    } finally {
      setLoading(false);
    }
  };

  /* ── ONE-WAY / ROUND-TRIP row ── */
  const renderMainRow = () => (
    <div className="flex items-stretch gap-2 py-3 w-full animate-fadeIn transition-colors duration-200 flex-wrap">
      {/* TRIP TYPE */}
      <TripTypeDropdown 
        value={jt} 
        isOpen={openDropdown === "trip"}
        onToggle={() => setOpenDropdown(openDropdown === "trip" ? null : "trip")}
        onChange={(v) => { setDraft({ ...draft, journeyType: v }); setOpenDropdown(null); }} 
        journeyLabel={journeyLabel} 
      />

      {/* FROM */}
      <div className="flex flex-col flex-[1.4] min-w-0 px-3.5 py-2 border rounded-[8px] transition-colors shadow-sm border-slate-200 bg-slate-50">
        <div className="text-[10px] font-bold tracking-wider text-gray-500 uppercase mb-[2px]">From</div>
        <AirportAutocomplete
          value={draft.origin}
          onChange={(a) => setDraft((d) => ({ ...d, origin: a.code }))}
          placeholder="City or airport"
        />
      </div>

      {/* SWAP ICON */}
      <div className="flex items-center justify-center shrink-0 w-6">
        <FaExchangeAlt 
          onClick={() => setDraft((d) => ({ ...d, origin: d.destination, destination: d.origin }))}
          className="text-[15px] transition-colors text-[#C9A84C] hover:text-[#b08f3a] cursor-pointer"
        />
      </div>

      {/* TO */}
      <div className="flex flex-col flex-[1.4] min-w-0 px-3.5 py-2 border rounded-[8px] transition-colors shadow-sm border-slate-200 bg-slate-50">
        <div className="text-[10px] font-bold tracking-wider text-gray-500 uppercase mb-[2px]">To</div>
        <AirportAutocomplete
          value={draft.destination}
          onChange={(a) => setDraft((d) => ({ ...d, destination: a.code }))}
          placeholder="City or airport"
        />
      </div>

      <div className="relative flex flex-col shrink-0 min-w-[135px] px-3.5 py-2 border rounded-[8px] transition-colors shadow-sm border-slate-200 bg-slate-50 cursor-pointer"
           onClick={() => setOpenDropdown(openDropdown === "dep" ? null : "dep")}>
        <div className="text-[10px] font-bold tracking-wider text-gray-500 uppercase mb-[2px]">Depart</div>
        <div className="flex items-center gap-2">
           <BsCalendar4 className="text-[#C9A84C] text-xs" />
           <div className="text-[14px] font-extrabold text-gray-900">
             {fmtDate(draft.departureDate)}
           </div>
        </div>
        
        {openDropdown === "dep" && (
          <div className="absolute top-[calc(100%+8px)] right-0 z-[300]" onClick={e => e.stopPropagation()}>
            <CustomCalendar 
              value={draft.departureDate} 
              onChange={(val) => { setDraft({ ...draft, departureDate: val }); setOpenDropdown(null); }} 
              onClose={() => setOpenDropdown(null)}
            />
          </div>
        )}
      </div>

      {/* RETURN */}
      <div className="relative flex flex-col shrink-0 min-w-[135px] px-3.5 py-2 border border-slate-200 bg-slate-50 rounded-[8px] shadow-sm cursor-pointer" 
           onClick={() => jt === 2 && setOpenDropdown(openDropdown === "ret" ? null : "ret")}>
        <div className="text-[10px] font-bold tracking-wider text-gray-500 uppercase mb-[2px]">Return</div>
        <div className="flex items-center gap-2">
           <BsCalendar4 className={jt === 2 ? "text-[#C9A84C] text-xs" : "text-gray-400 text-xs"} />
           <div className={`text-[14px] font-extrabold ${jt === 1 ? "text-gray-400" : "text-gray-900"}`}>
             {jt === 1 ? "Select Return" : fmtDate(draft.returnDate)}
           </div>
        </div>
        {openDropdown === "ret" && jt === 2 && (
          <div className="absolute top-[calc(100%+8px)] right-0 z-[300]" onClick={e => e.stopPropagation()}>
            <CustomCalendar 
              value={draft.returnDate} 
              minDate={draft.departureDate}
              onChange={(val) => { setDraft({ ...draft, returnDate: val }); setOpenDropdown(null); }} 
              onClose={() => setOpenDropdown(null)}
            />
          </div>
        )}
      </div>

      {/* PASSENGERS & CLASS */}
      <div className="flex flex-col shrink-0 min-w-[160px] px-3.5 py-2 border border-slate-200 bg-slate-50 rounded-[8px] shadow-sm">
        <div className="text-[10px] font-bold tracking-wider text-gray-500 uppercase mb-[2px]">Passengers & Class</div>
        <PaxCabin 
          passengers={draft.passengers} 
          cabin={draft.cabin} 
          isOpen={openDropdown === "pax"}
          onToggle={() => setOpenDropdown(openDropdown === "pax" ? null : "pax")}
          onChange={({ passengers, cabin }) => { setDraft((d) => ({ ...d, passengers, cabin })); setOpenDropdown(null); }} 
        />
      </div>

      {/* CTA */}
      <div className="flex items-center ml-auto pl-2">
        <button
          onClick={handleSearch}
          disabled={loading}
          className={`flex items-center justify-center gap-1.5 px-8 h-[44px] rounded-[8px] border-none text-[#0A203E] text-[14px] font-extrabold uppercase transition-all shadow-md
            ${loading ? "bg-slate-200 cursor-not-allowed" : "bg-[#C9A84C] hover:brightness-110 cursor-pointer active:scale-95"}
          `}
        >
          {loading ? "..." : "SEARCH"}
        </button>
      </div>
    </div>
  );

  /* ── MULTI-CITY row ── */
  const renderMultiCity = () => (
    <div className="p-4 px-5 transition-colors duration-200 flex flex-col gap-3 bg-slate-50">
      <div className="flex w-full items-center">
         <TripTypeDropdown value={jt} onChange={(v) => setDraft({ ...draft, journeyType: v })} journeyLabel={journeyLabel} />
      </div>

      <div className="border border-gray-100 bg-white rounded-xl overflow-hidden shadow-sm">
        {(draft.segments || []).map((seg, idx) => {
          const isNotLast = idx < draft.segments.length - 1;
          return (
            <div key={idx} className={`flex items-center gap-0 p-3 ${isNotLast ? "border-b border-gray-100" : ""}`}>
              <div className="text-[10px] font-extrabold text-[#C9A84C] uppercase tracking-[0.08em] mr-3 w-7 shrink-0">#{idx + 1}</div>

              {/* From */}
              <div className="flex-1 min-w-0 pr-3.5">
                <div className="text-[9px] font-bold tracking-widest text-gray-500 uppercase mb-[3px]">From</div>
                <AirportAutocomplete value={seg.origin} onChange={(a) => { const s = [...draft.segments]; s[idx] = { ...s[idx], origin: a.code }; setDraft((d) => ({ ...d, segments: s })); }} placeholder="City" icon={<MdFlightTakeoff />} />
              </div>

              <div className="w-px h-8 bg-gray-100 mx-1" />

              {/* To */}
              <div className="flex-1 min-w-0 px-3.5">
                <div className="text-[9px] font-bold tracking-widest text-gray-500 uppercase mb-[3px]">To</div>
                <AirportAutocomplete value={seg.destination} onChange={(a) => { const s = [...draft.segments]; s[idx] = { ...s[idx], destination: a.code }; setDraft((d) => ({ ...d, segments: s })); }} placeholder="City" icon={<MdFlightLand />} />
              </div>

              <div className="w-px h-8 bg-gray-100 mx-1" />

              {/* Date */}
              <div className="relative shrink-0 px-3.5 cursor-pointer" onClick={() => setOpenDropdown(openDropdown === `mc-${idx}` ? null : `mc-${idx}`)}>
                <div className="text-[9px] font-bold tracking-widest text-gray-500 uppercase mb-[3px]">Date</div>
                <div className="flex items-center gap-1.5">
                  <BsCalendar4 className="text-[#C9A84C] text-[13px]" />
                  <div className="text-[14px] font-bold text-gray-900">{fmtDate(seg.departureDate)}</div>
                </div>
                {openDropdown === `mc-${idx}` && (
                  <div className="absolute top-[calc(100%+8px)] right-0 z-[300]" onClick={e => e.stopPropagation()}>
                    <CustomCalendar 
                      value={seg.departureDate} 
                      minDate={idx > 0 ? draft.segments[idx - 1]?.departureDate : new Date().toISOString().split("T")[0]}
                      onChange={(val) => { const s = [...draft.segments]; s[idx] = { ...s[idx], departureDate: val }; setDraft((d) => ({ ...d, segments: s })); setOpenDropdown(null); }} 
                      onClose={() => setOpenDropdown(null)}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pax + CTA for Multi-City */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex flex-col px-3.5 py-1.5 border border-slate-200 bg-slate-50 rounded-[8px] min-w-[180px]">
          <div className="text-[10px] font-bold tracking-wider text-gray-500 uppercase mb-[2px]">Passengers & Class</div>
          <PaxCabin 
            passengers={draft.passengers} 
            cabin={draft.cabin} 
            isOpen={openDropdown === "pax-mc"}
            onToggle={() => setOpenDropdown(openDropdown === "pax-mc" ? null : "pax-mc")}
            onChange={({ passengers, cabin }) => { setDraft((d) => ({ ...d, passengers, cabin })); setOpenDropdown(null); }} 
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={loading}
          className={`flex items-center justify-center gap-1.5 px-10 h-[44px] rounded-[8px] border-none text-[#0A203E] text-[14px] font-extrabold uppercase transition-all shadow-md
            ${loading ? "bg-slate-200 cursor-not-allowed" : "bg-[#C9A84C] hover:brightness-110 cursor-pointer active:scale-95"}
          `}
        >
          {loading ? "..." : "SEARCH"}
        </button>
      </div>
    </div>
  );

  /* ══ RENDER ══ */
  return (
    <div className="sticky top-0 z-40 font-inter">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* ── Dark brand top strip ── */}
      <div className="bg-gradient-to-r from-[#0A203E] to-[#1a3a5a] py-[7px] px-10 flex items-center justify-between">
        <button onClick={onBack}
          className="flex items-center gap-1.5 bg-transparent border-none text-white/65 cursor-pointer text-[12px] font-semibold p-0 hover:text-white transition-colors">
          <MdArrowBack className="text-[16px]" /> Back to search
        </button>
        <div className="flex items-center gap-3.5 text-[12px] text-white/50">
          <span className="bg-[#C9A84C]/20 border border-[#C9A84C]/30 rounded-full px-2.5 py-0.5 text-[#C9A84C] font-bold text-[11px] tracking-[0.04em]">
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
                    ? "border-[1.5px] border-[#0A203E] bg-[#0A203E] text-white shadow-lg" 
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