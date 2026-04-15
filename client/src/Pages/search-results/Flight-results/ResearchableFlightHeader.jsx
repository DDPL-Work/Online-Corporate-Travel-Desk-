// ResearchableFlightHeader.jsx  — Premium redesign
// Drop-in replacement for the sticky header in FlightSearchResults.jsx
// Usage identical to previous version — same props API, zero other changes needed.

import React, { useState, useRef, useEffect } from "react";
import { BsCalendar4, BsChevronDown, BsChevronUp, BsSearch, BsArrowRight } from "react-icons/bs";
import { BiTrendingDown } from "react-icons/bi";
import { IoIosAirplane } from "react-icons/io";
import { MdArrowBack, MdSwapHoriz, MdAdd, MdClose, MdPerson } from "react-icons/md";
import { formatDate } from "../../../utils/formatter";

// ─── helpers ─────────────────────────────────────────────────────────────────

const toISODate = (dateStr) => {
  if (!dateStr) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  if (dateStr.includes("T")) return dateStr.split("T")[0];
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
    const [dd, mm, yyyy] = dateStr.split("-");
    return `${yyyy}-${mm}-${dd}`;
  }
  try {
    const d = new Date(dateStr);
    if (!isNaN(d)) return d.toISOString().split("T")[0];
  } catch (_) {}
  return "";
};

const CABIN_OPTIONS = [
  { label: "Economy",         short: "Economy",   value: 2 },
  { label: "Premium Economy", short: "Prem. Eco", value: 3 },
  { label: "Business",        short: "Business",  value: 4 },
  { label: "First Class",     short: "First",     value: 6 },
];

const CABIN_LABEL = (v) =>
  CABIN_OPTIONS.find((o) => o.value === Number(v))?.short || "Economy";

// ─── primitive UI pieces ──────────────────────────────────────────────────────

function AirportInput({ value, placeholder, onChange }) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%", background: "transparent", border: "none", outline: "none",
        color: "white", fontSize: 15, fontWeight: 600,
        fontFamily: "'DM Sans', sans-serif",
      }}
      className="placeholder-white/30"
    />
  );
}

function DateInput({ value, min, onChange, label }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {label && (
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
          color: "rgba(255,255,255,0.35)", textTransform: "uppercase",
        }}>
          {label}
        </span>
      )}
      <input
        type="date"
        value={value}
        min={min || new Date().toISOString().split("T")[0]}
        onChange={(e) => onChange(e.target.value)}
        style={{
          background: "transparent", border: "none", outline: "none",
          color: "white", fontSize: 14, fontWeight: 600, cursor: "pointer",
          fontFamily: "'DM Sans', sans-serif", colorScheme: "dark",
        }}
      />
    </div>
  );
}

function GlassField({ children, style = {} }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.07)",
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 12, padding: "10px 14px",
      ...style,
    }}>
      {children}
    </div>
  );
}

function FieldLabel({ children }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
      color: "rgba(255,255,255,0.35)", textTransform: "uppercase", marginBottom: 3,
    }}>
      {children}
    </div>
  );
}

function SwapBtn({ onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
        background: hover ? "rgba(99,179,255,0.22)" : "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.15)",
        color: "white", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "background 0.2s",
      }}
    >
      <MdSwapHoriz style={{ fontSize: 20 }} />
    </button>
  );
}

// ─── Passenger & Cabin Picker ────────────────────────────────────────────────

function PassengerCabinPicker({ passengers, cabinClass, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const total = (passengers.adults || 1) + (passengers.children || 0) + (passengers.infants || 0);

  const adjust = (key, delta) => {
    const next = { ...passengers, [key]: Math.max(key === "adults" ? 1 : 0, (passengers[key] || 0) + delta) };
    if (next.infants > next.adults) next.infants = next.adults;
    onChange({ passengers: next, cabinClass });
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((p) => !p)}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "rgba(255,255,255,0.07)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 10, padding: "8px 14px",
          color: "white", cursor: "pointer", fontSize: 13, fontWeight: 600,
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <MdPerson style={{ fontSize: 16, color: "#63b3ff" }} />
        {total} Traveller{total !== 1 ? "s" : ""}
        <span style={{ color: "rgba(255,255,255,0.38)", fontSize: 12 }}>
          · {CABIN_LABEL(cabinClass)}
        </span>
        {open
          ? <BsChevronUp style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }} />
          : <BsChevronDown style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }} />
        }
      </button>

      {open && (
        <div style={{
          position: "absolute", top: 48, left: 0, zIndex: 100,
          background: "#0d1a2e",
          border: "1px solid rgba(99,179,255,0.18)",
          borderRadius: 16, boxShadow: "0 24px 60px rgba(0,0,0,0.65)",
          padding: 20, width: 300, fontFamily: "'DM Sans', sans-serif",
        }}>
          {[
            { key: "adults",   label: "Adults",   sub: "12+ yrs" },
            { key: "children", label: "Children", sub: "2–11 yrs" },
            { key: "infants",  label: "Infants",  sub: "Under 2 yrs" },
          ].map(({ key, label, sub }) => (
            <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "white" }}>{label}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.32)" }}>{sub}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <button onClick={() => adjust(key, -1)} style={{
                  width: 30, height: 30, borderRadius: "50%",
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "rgba(255,255,255,0.05)",
                  color: "white", cursor: "pointer", fontSize: 20, lineHeight: 1,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>−</button>
                <span style={{ fontSize: 15, fontWeight: 800, color: "white", minWidth: 16, textAlign: "center" }}>
                  {passengers[key] || 0}
                </span>
                <button onClick={() => adjust(key, 1)} style={{
                  width: 30, height: 30, borderRadius: "50%",
                  border: "1px solid rgba(99,179,255,0.4)",
                  background: "rgba(99,179,255,0.1)",
                  color: "#63b3ff", cursor: "pointer", fontSize: 20, lineHeight: 1,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>+</button>
              </div>
            </div>
          ))}

          <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "4px 0 16px" }} />

          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.32)", textTransform: "uppercase", marginBottom: 10 }}>
            Cabin class
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {CABIN_OPTIONS.map((opt) => {
              const active = Number(cabinClass) === opt.value;
              return (
                <button key={opt.value} onClick={() => onChange({ passengers, cabinClass: opt.value })} style={{
                  padding: "9px 0", borderRadius: 10, cursor: "pointer",
                  border: active ? "1px solid #63b3ff" : "1px solid rgba(255,255,255,0.09)",
                  background: active ? "rgba(99,179,255,0.16)" : "rgba(255,255,255,0.03)",
                  color: active ? "#63b3ff" : "rgba(255,255,255,0.55)",
                  fontSize: 12, fontWeight: 700, fontFamily: "'DM Sans', sans-serif",
                }}>
                  {opt.label}
                </button>
              );
            })}
          </div>

          <button onClick={() => setOpen(false)} style={{
            marginTop: 16, width: "100%", padding: "10px 0", borderRadius: 10, border: "none",
            background: "linear-gradient(135deg, #2563eb, #1e40af)",
            color: "white", fontSize: 13, fontWeight: 800, cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.03em",
          }}>
            Done
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Journey forms ───────────────────────────────────────────────────────────

function OneWayForm({ payload, onChange }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
      <GlassField style={{ flex: 1, minWidth: 130 }}>
        <FieldLabel>From</FieldLabel>
        <AirportInput value={payload.origin || ""} placeholder="City or airport"
          onChange={(v) => onChange({ ...payload, origin: v })} />
      </GlassField>
      <SwapBtn onClick={() => onChange({ ...payload, origin: payload.destination, destination: payload.origin })} />
      <GlassField style={{ flex: 1, minWidth: 130 }}>
        <FieldLabel>To</FieldLabel>
        <AirportInput value={payload.destination || ""} placeholder="City or airport"
          onChange={(v) => onChange({ ...payload, destination: v })} />
      </GlassField>
      <GlassField style={{ minWidth: 148 }}>
        <DateInput label="Departure" value={toISODate(payload.departureDate)}
          onChange={(v) => onChange({ ...payload, departureDate: v })} />
      </GlassField>
    </div>
  );
}

function RoundTripForm({ payload, onChange }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
      <GlassField style={{ flex: 1, minWidth: 130 }}>
        <FieldLabel>From</FieldLabel>
        <AirportInput value={payload.origin || ""} placeholder="City or airport"
          onChange={(v) => onChange({ ...payload, origin: v })} />
      </GlassField>
      <SwapBtn onClick={() => onChange({ ...payload, origin: payload.destination, destination: payload.origin })} />
      <GlassField style={{ flex: 1, minWidth: 130 }}>
        <FieldLabel>To</FieldLabel>
        <AirportInput value={payload.destination || ""} placeholder="City or airport"
          onChange={(v) => onChange({ ...payload, destination: v })} />
      </GlassField>
      <GlassField style={{ minWidth: 148 }}>
        <DateInput label="Departure" value={toISODate(payload.departureDate)}
          onChange={(v) => onChange({ ...payload, departureDate: v })} />
      </GlassField>
      <GlassField style={{ minWidth: 148 }}>
        <DateInput label="Return" value={toISODate(payload.returnDate)}
          min={toISODate(payload.departureDate)}
          onChange={(v) => onChange({ ...payload, returnDate: v })} />
      </GlassField>
    </div>
  );
}

const EMPTY_SEG = { origin: "", destination: "", departureDate: "" };

function MultiCityForm({ payload, onChange }) {
  const segments = payload.segments?.length ? payload.segments : [EMPTY_SEG, EMPTY_SEG];

  const updateSeg = (idx, field, value) => {
    onChange({ ...payload, segments: segments.map((s, i) => (i === idx ? { ...s, [field]: value } : s)) });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {segments.map((seg, idx) => (
        <div key={idx} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          <div style={{
            fontSize: 10, fontWeight: 800, letterSpacing: "0.1em",
            color: "rgba(99,179,255,0.65)", textTransform: "uppercase", width: 46, flexShrink: 0,
          }}>
            Leg {idx + 1}
          </div>
          <GlassField style={{ flex: 1, minWidth: 110 }}>
            <FieldLabel>From</FieldLabel>
            <AirportInput value={seg.origin} placeholder="City"
              onChange={(v) => updateSeg(idx, "origin", v)} />
          </GlassField>
          <GlassField style={{ flex: 1, minWidth: 110 }}>
            <FieldLabel>To</FieldLabel>
            <AirportInput value={seg.destination} placeholder="City"
              onChange={(v) => updateSeg(idx, "destination", v)} />
          </GlassField>
          <GlassField style={{ minWidth: 148 }}>
            <DateInput label="Date" value={toISODate(seg.departureDate)}
              min={idx > 0 ? toISODate(segments[idx - 1]?.departureDate) : undefined}
              onChange={(v) => updateSeg(idx, "departureDate", v)} />
          </GlassField>
          {segments.length > 2 && (
            <button
              onClick={() => onChange({ ...payload, segments: segments.filter((_, i) => i !== idx) })}
              style={{
                width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.22)",
                color: "rgba(239,68,68,0.7)", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <MdClose style={{ fontSize: 14 }} />
            </button>
          )}
        </div>
      ))}

      {segments.length < 6 && (
        <button
          onClick={() => onChange({ ...payload, segments: [...segments, { ...EMPTY_SEG }] })}
          style={{
            alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 6,
            fontSize: 12, fontWeight: 700, color: "#63b3ff",
            background: "rgba(99,179,255,0.07)",
            border: "1px dashed rgba(99,179,255,0.28)",
            borderRadius: 8, padding: "6px 12px", cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif", marginTop: 2,
          }}
        >
          <MdAdd style={{ fontSize: 15 }} /> Add another city
        </button>
      )}
    </div>
  );
}

// ─── payload utilities ────────────────────────────────────────────────────────

const buildSearchPayload = (draft, originalPayload) => {
  const jt = Number(draft.journeyType);
  const counts = {
    AdultCount:  draft.passengers?.adults   ?? originalPayload?.AdultCount  ?? 1,
    ChildCount:  draft.passengers?.children ?? originalPayload?.ChildCount  ?? 0,
    InfantCount: draft.passengers?.infants  ?? originalPayload?.InfantCount ?? 0,
  };

  if (jt === 1) return {
    ...originalPayload, ...counts, JourneyType: 1,
    Segments: [{
      ...(originalPayload?.Segments?.[0] || {}),
      Origin: draft.origin, Destination: draft.destination,
      FlightCabinClass: draft.cabinClass || 2,
      PreferredDepartureTime: draft.departureDate ? `${draft.departureDate}T00:00:00` : "",
    }],
  };

  if (jt === 2) return {
    ...originalPayload, ...counts, JourneyType: 2,
    Segments: [
      { ...(originalPayload?.Segments?.[0] || {}), Origin: draft.origin, Destination: draft.destination, FlightCabinClass: draft.cabinClass || 2, PreferredDepartureTime: draft.departureDate ? `${draft.departureDate}T00:00:00` : "" },
      { ...(originalPayload?.Segments?.[1] || {}), Origin: draft.destination, Destination: draft.origin, FlightCabinClass: draft.cabinClass || 2, PreferredDepartureTime: draft.returnDate ? `${draft.returnDate}T00:00:00` : "" },
    ],
  };

  if (jt === 3) return {
    ...originalPayload, ...counts, JourneyType: 3,
    Segments: (draft.segments || []).map((seg, i) => ({
      ...(originalPayload?.Segments?.[i] || {}),
      Origin: seg.origin, Destination: seg.destination,
      FlightCabinClass: draft.cabinClass || 2,
      PreferredDepartureTime: seg.departureDate ? `${seg.departureDate}T00:00:00` : "",
    })),
  };

  return originalPayload;
};

const deriveDraft = (searchPayload, journeyType) => {
  const jt = Number(journeyType);
  const passengers = {
    adults:   searchPayload?.AdultCount  ?? searchPayload?.passengers?.adults   ?? 1,
    children: searchPayload?.ChildCount  ?? searchPayload?.passengers?.children ?? 0,
    infants:  searchPayload?.InfantCount ?? searchPayload?.passengers?.infants  ?? 0,
  };
  const cabinClass = searchPayload?.Segments?.[0]?.FlightCabinClass ?? searchPayload?.cabinClass ?? 2;

  if (jt === 1) return {
    journeyType: 1, passengers, cabinClass,
    origin:      searchPayload?.Segments?.[0]?.Origin      || "",
    destination: searchPayload?.Segments?.[0]?.Destination || "",
    departureDate: toISODate(searchPayload?.Segments?.[0]?.PreferredDepartureTime || searchPayload?.departureDate),
  };
  if (jt === 2) return {
    journeyType: 2, passengers, cabinClass,
    origin:      searchPayload?.Segments?.[0]?.Origin      || "",
    destination: searchPayload?.Segments?.[0]?.Destination || "",
    departureDate: toISODate(searchPayload?.Segments?.[0]?.PreferredDepartureTime || searchPayload?.departureDate),
    returnDate:    toISODate(searchPayload?.Segments?.[1]?.PreferredDepartureTime || searchPayload?.ReturnDate || searchPayload?.returnDate),
  };
  if (jt === 3) return {
    journeyType: 3, passengers, cabinClass,
    segments: (searchPayload?.Segments || searchPayload?.segments || []).map((s) => ({
      origin:       s.Origin || s.origin || "",
      destination:  s.Destination || s.destination || "",
      departureDate: toISODate(s.PreferredDepartureTime || s.departureDate || ""),
    })),
  };
  return { journeyType: jt, passengers, cabinClass };
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

const BG = "linear-gradient(135deg, #0b1628 0%, #0f2044 55%, #0c1a36 100%)";
const BORDER = "1px solid rgba(99,179,255,0.1)";
const FONT = "'DM Sans', sans-serif";
const SORT_TABS = ["Best", "Cheapest", "Early depart", "Late depart"];

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
  const [draft, setDraft] = useState(() => deriveDraft(searchPayload, journeyType));

  useEffect(() => {
    if (!editMode) setDraft(deriveDraft(searchPayload, journeyType));
  }, [searchPayload, journeyType]);

  const handleSearch = () => {
    onSearch(buildSearchPayload(draft, searchPayload));
    setEditMode(false);
  };

  const wrapStyle = {
    position: "sticky", top: 0, zIndex: 40,
    background: BG,
    borderBottom: BORDER,
    boxShadow: "0 4px 40px rgba(0,0,0,0.45)",
    fontFamily: FONT,
  };

  const inner = {
    maxWidth: "100%", margin: "0 40px",
    padding: "12px 0 0",
  };

  // ── COLLAPSED ─────────────────────────────────────────────────────────────
  if (!editMode) {
    return (
      <div style={wrapStyle}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Serif+Display&display=swap" rel="stylesheet" />

        <div style={inner}>
          {/* top row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>

            {/* Back */}
            <button onClick={onBack} style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "none", border: "none",
              color: "rgba(255,255,255,0.45)", cursor: "pointer",
              fontSize: 13, fontWeight: 600, fontFamily: FONT, transition: "color 0.2s",
            }}
              onMouseEnter={(e) => e.currentTarget.style.color = "#63b3ff"}
              onMouseLeave={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.45)"}
            >
              <MdArrowBack style={{ fontSize: 18 }} />
              Back to search
            </button>

            {/* Route pills + modify */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                {routeHeader.map((r, idx) => (
                  <React.Fragment key={idx}>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 10,
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 12, padding: "8px 16px",
                    }}>
                      <div style={{ lineHeight: 1.2 }}>
                        <div style={{
                          fontSize: 15, fontWeight: 700, color: "white",
                          display: "flex", alignItems: "center", gap: 6,
                          fontFamily: "'DM Serif Display', serif",
                        }}>
                          {r.fromCity}
                          <IoIosAirplane style={{ color: "#63b3ff", fontSize: 15 }} />
                          {r.toCity}
                        </div>
                        <div style={{
                          fontSize: 11, color: "rgba(255,255,255,0.38)", fontWeight: 500,
                          display: "flex", alignItems: "center", gap: 4, marginTop: 3,
                        }}>
                          <BsCalendar4 style={{ color: "#63b3ff", fontSize: 10 }} />
                          {formatDate(r.depDate)}
                        </div>
                      </div>
                    </div>
                    {idx < routeHeader.length - 1 && (
                      <BsArrowRight style={{ color: "rgba(99,179,255,0.4)", fontSize: 13 }} />
                    )}
                  </React.Fragment>
                ))}
              </div>

              {/* Modify pill */}
              <button
                onClick={() => setEditMode(true)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "rgba(99,179,255,0.09)",
                  border: "1px solid rgba(99,179,255,0.28)",
                  borderRadius: 20, padding: "5px 14px",
                  color: "#63b3ff", fontSize: 11, fontWeight: 700,
                  cursor: "pointer", letterSpacing: "0.05em",
                  fontFamily: FONT, transition: "background 0.2s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(99,179,255,0.18)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "rgba(99,179,255,0.09)"}
              >
                <BsSearch style={{ fontSize: 10 }} />
                MODIFY SEARCH
              </button>
            </div>

            {/* Cheapest badge */}
            <div style={{
              background: "rgba(34,197,94,0.08)",
              border: "1px solid rgba(34,197,94,0.18)",
              borderRadius: 12, padding: "8px 14px",
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <BiTrendingDown style={{ color: "#4ade80", fontSize: 20 }} />
              <div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  Cheapest
                </div>
                <div style={{ fontSize: 17, fontWeight: 800, color: "#4ade80", lineHeight: 1.1 }}>
                  {headerStats.minPrice ? `₹${headerStats.minPrice.toLocaleString()}` : "—"}
                </div>
              </div>
            </div>
          </div>

          {/* sort + count row */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            borderTop: "1px solid rgba(255,255,255,0.06)", padding: "8px 0",
          }}>
            <div style={{ display: "flex", gap: 4 }}>
              {SORT_TABS.map((tab) => {
                const active = sortKey === tab;
                return (
                  <button key={tab} onClick={() => setSortKey(tab)} style={{
                    padding: "6px 16px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                    fontFamily: FONT, cursor: "pointer", transition: "all 0.15s",
                    border: active ? "1px solid rgba(37,99,235,0.7)" : "1px solid rgba(255,255,255,0.09)",
                    background: active ? "linear-gradient(135deg, #2563eb, #1d4ed8)" : "rgba(255,255,255,0.04)",
                    color: active ? "white" : "rgba(255,255,255,0.45)",
                    letterSpacing: "0.02em",
                  }}>
                    {tab}
                  </button>
                );
              })}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "rgba(255,255,255,0.38)", fontWeight: 600 }}>
              <span>
                <span style={{ color: "white", fontWeight: 800, fontSize: 16 }}>{flightsCount}</span> flights found
              </span>
              {showBestTimeBadge && (
                <span style={{
                  background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.22)",
                  borderRadius: 20, padding: "3px 10px", color: "#4ade80", fontSize: 11, fontWeight: 700,
                }}>
                  Best time to book
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── EXPANDED (EDIT) ───────────────────────────────────────────────────────
  return (
    <div style={wrapStyle}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Serif+Display&display=swap" rel="stylesheet" />

      <div style={{ ...inner, padding: "14px 0" }}>
        {/* journey switcher + passengers row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
          <div style={{
            display: "flex", gap: 2,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.09)",
            borderRadius: 10, padding: 3,
          }}>
            {[{ label: "One Way", value: 1 }, { label: "Round Trip", value: 2 }, { label: "Multi City", value: 3 }].map(({ label, value }) => {
              const active = Number(draft.journeyType) === value;
              return (
                <button key={value} onClick={() => setDraft((d) => ({ ...d, journeyType: value }))} style={{
                  padding: "7px 18px", borderRadius: 8, border: "none", cursor: "pointer",
                  background: active ? "linear-gradient(135deg, #2563eb, #1d4ed8)" : "transparent",
                  color: active ? "white" : "rgba(255,255,255,0.4)",
                  fontSize: 12, fontWeight: 700, fontFamily: FONT,
                  letterSpacing: "0.02em", transition: "all 0.15s",
                }}>
                  {label}
                </button>
              );
            })}
          </div>

          <PassengerCabinPicker
            passengers={draft.passengers}
            cabinClass={draft.cabinClass}
            onChange={({ passengers, cabinClass }) => setDraft((d) => ({ ...d, passengers, cabinClass }))}
          />
        </div>

        {/* route form */}
        <div style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 16, padding: 14, marginBottom: 14,
        }}>
          {Number(draft.journeyType) === 1 && <OneWayForm payload={draft} onChange={setDraft} />}
          {Number(draft.journeyType) === 2 && <RoundTripForm payload={draft} onChange={setDraft} />}
          {Number(draft.journeyType) === 3 && <MultiCityForm payload={draft} onChange={setDraft} />}
        </div>

        {/* actions */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10 }}>
          <button
            onClick={() => { setDraft(deriveDraft(searchPayload, journeyType)); setEditMode(false); }}
            style={{
              padding: "9px 20px", borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.09)",
              background: "transparent", color: "rgba(255,255,255,0.45)",
              fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: FONT,
            }}
          >
            Cancel
          </button>

          <button
            onClick={handleSearch}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "9px 26px", borderRadius: 10, border: "none",
              background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
              color: "white", fontSize: 13, fontWeight: 800, cursor: "pointer",
              fontFamily: FONT, letterSpacing: "0.03em",
              boxShadow: "0 4px 20px rgba(37,99,235,0.4)",
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 28px rgba(37,99,235,0.6)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(37,99,235,0.4)"; }}
          >
            <BsSearch style={{ fontSize: 13 }} />
            Search Flights
          </button>
        </div>
      </div>
    </div>
  );
}