import React, { useState, useMemo, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import { selectFareFamily } from "../../../Redux/Slice/flightSearchSlice";
import {
  MdFlight,
  MdCheck,
  MdRemove,
  MdCurrencyRupee,
  MdInfo,
  MdWorkspacePremium,
  MdLuggage,
  MdEventSeat,
  MdRestaurant,
  MdStar,
  MdLoop,
  MdFlightTakeoff,
  MdChevronLeft,
  MdChevronRight,
  MdArrowBack,
  MdAirlineSeatReclineExtra,
  MdWifi,
  MdPriorityHigh,
  MdCardMembership,
  MdUpdate,
} from "react-icons/md";
import { BsStarFill } from "react-icons/bs";
import LandingHeader from "../../../layout/LandingHeader";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) => "₹" + Math.round(n).toLocaleString("en-IN");

function getCabinLabel(cabinClass) {
  if (cabinClass === 6) return "First";
  if (cabinClass === 4) return "Business";
  if (cabinClass === 3) return "Premium Economy";
  return "Economy";
}

function isInternationalFlight(result) {
  const segments = Array.isArray(result?.Segments)
    ? result.Segments.flat()
    : [];
  return segments.some(
    (s) =>
      s?.Origin?.Airport?.CountryCode &&
      s?.Destination?.Airport?.CountryCode &&
      s.Origin.Airport.CountryCode !== s.Destination.Airport.CountryCode,
  );
}

function isGroupedRoundTrip(result) {
  return (
    Array.isArray(result?.Segments) &&
    result.Segments.length === 2 &&
    Array.isArray(result.Segments[0]) &&
    Array.isArray(result.Segments[1])
  );
}

function getPassengerCounts(searchPayload = {}) {
  return (
    searchPayload?.passengers || {
      adults: searchPayload?.adults || 1,
      children: searchPayload?.children || 0,
      infants: searchPayload?.infants || 0,
    }
  );
}

function extractUpsellResponse(payload) {
  if (!payload || typeof payload !== "object") return null;
  return (
    payload.Response ||
    payload.data?.Response ||
    payload.data?.data?.Response ||
    null
  );
}

// ─── Service categorizer (purely from UpsellDescription strings) ───────────────
// API format: "Carry on baggage|Taking bags on board"
// We group by keyword matching on the label portion.

const ICON_MAP = {
  baggage: MdLuggage,
  flexibility: MdLoop,
  seat: MdEventSeat,
  meals: MdRestaurant,
  wifi: MdWifi,
  rewards: MdStar,
  priority: MdPriorityHigh,
  upgrade: MdCardMembership,
  other: MdUpdate,
};

const SERVICE_CATEGORY_RULES = [
  {
    group: "Baggage",
    icon: "baggage",
    color: "#0ea5e9",
    bgColor: "#f0f9ff",
    keywords: [
      "cabin baggage",
      "carry on",
      "carry-on",
      "checked baggage",
      "check in",
      "baggage",
      "extra baggage",
    ],
  },
  {
    group: "Flexibility",
    icon: "flexibility",
    color: "#8b5cf6",
    bgColor: "#f5f3ff",
    keywords: [
      "reissue",
      "rebooking",
      "date change",
      "refund",
      "cancell",
      "no show",
    ],
  },
  {
    group: "Seat",
    icon: "seat",
    color: "#f59e0b",
    bgColor: "#fffbeb",
    keywords: ["seat", "legroom", "advance seat"],
  },
  {
    group: "Meals & Comfort",
    icon: "meals",
    color: "#10b981",
    bgColor: "#ecfdf5",
    keywords: ["meal", "food", "dining", "inflight meal", "maharajah", "snack"],
  },
  {
    group: "Connectivity",
    icon: "wifi",
    color: "#3b82f6",
    bgColor: "#eff6ff",
    keywords: [
      "wifi",
      "wi-fi",
      "internet",
      "usb",
      "power",
      "socket",
      "entertainment",
    ],
  },
  {
    group: "Miles & Rewards",
    icon: "rewards",
    color: "#f97316",
    bgColor: "#fff7ed",
    keywords: ["miles", "mileage", "reward", "points", "accrual", "bonus"],
  },
  {
    group: "Priority Services",
    icon: "priority",
    color: "#ec4899",
    bgColor: "#fdf2f8",
    keywords: [
      "priority",
      "fast track",
      "boarding",
      "checkin",
      "check-in",
      "lounge",
    ],
  },
  {
    group: "Upgrades",
    icon: "upgrade",
    color: "#14b8a6",
    bgColor: "#f0fdfa",
    keywords: ["upgrade"],
  },
];

const OTHER_GROUP = {
  group: "Other Benefits",
  icon: "other",
  color: "#6b7280",
  bgColor: "#f9fafb",
};

function categorizeServices(servicesList = []) {
  const grouped = {};

  servicesList.forEach((svc) => {
    if (!svc.UpsellDescription) return;
    const [labelRaw, descRaw] = svc.UpsellDescription.split("|");
    const label = labelRaw?.trim() || "";
    const description = descRaw?.trim() || "";
    const lowerLabel = label.toLowerCase();

    const status =
      svc.IsIncluded === "Yes"
        ? "included"
        : svc.IsChargeable === "Yes"
          ? "chargeable"
          : "unavailable";

    let matchedGroup = null;
    for (const cat of SERVICE_CATEGORY_RULES) {
      if (cat.keywords.some((kw) => lowerLabel.includes(kw))) {
        matchedGroup = cat.group;
        break;
      }
    }
    const groupKey = matchedGroup || OTHER_GROUP.group;
    if (!grouped[groupKey]) grouped[groupKey] = [];

    // Deduplicate by label within group
    const exists = grouped[groupKey].some((s) => s.label === label);
    if (!exists) {
      grouped[groupKey].push({ label, description, status });
    }
  });

  const result = [];
  for (const cat of SERVICE_CATEGORY_RULES) {
    if (grouped[cat.group]?.length) {
      result.push({ ...cat, services: grouped[cat.group] });
    }
  }
  if (grouped[OTHER_GROUP.group]?.length) {
    result.push({ ...OTHER_GROUP, services: grouped[OTHER_GROUP.group] });
  }
  return result;
}

// ─── Normalize API results ────────────────────────────────────────────────────
function normalizeResults(results = [], traceId = "") {
  return results.map((r) => {
    const seg0 = r.Segments?.[0]?.[0];
    const cabinClass = seg0?.CabinClass;
    const cabin = getCabinLabel(cabinClass);

    // Merge all services from UpsellList (deduplicated by label)
    const seenLabels = new Set();
    const allServices = [];
    (r.UpsellOptionsList?.UpsellList || []).forEach((ul) => {
      (ul.ServicesList || []).forEach((svc) => {
        const label = svc.UpsellDescription?.split("|")[0]?.trim() || "";
        if (!seenLabels.has(label)) {
          seenLabels.add(label);
          allServices.push(svc);
        }
      });
    });

    const categorizedServices = categorizeServices(allServices);

    // Baggage from FareBreakdown
    const seg0Baggage = r.FareBreakdown?.[0]?.SegmentDetails?.[0];
    const checkedBagVal = seg0Baggage?.CheckedInBaggage?.Value;
    const cabinBagVal = seg0Baggage?.CabinBaggage?.Value;
    const checkedBagPieces = seg0Baggage?.CheckedInBaggage?.NoOfPiece;
    const checkedBagFreeText = seg0Baggage?.CheckedInBaggage?.FreeText;

    // Fare family name from UpsellList
    const fareFamilyName =
      r.UpsellOptionsList?.UpsellList?.[0]?.FareFamilyName ||
      r.FareClassification?.Type;

    // Mini fare rules
    const miniRules = (r.MiniFareRules?.[0] || []).map((rule) => ({
      type: rule.Type,
      details: rule.Details,
      points: rule.JourneyPoints,
    }));

    return {
      id: r.ResultIndex,
      ResultIndex: r.ResultIndex,
      traceId,
      rawResult: r,
      fareFamilyName,
      cabin,
      cabinClass,
      offeredFare: r.Fare?.OfferedFare,
      publishedFare: r.Fare?.PublishedFare,
      baseFare: r.Fare?.BaseFare,
      tax: r.Fare?.Tax,
      isRefundable: r.IsRefundable,
      noOfSeats: seg0?.NoOfSeatAvailable,
      checkedBagVal,
      checkedBagPieces,
      checkedBagFreeText,
      cabinBagVal,
      airlineRemark: r.AirlineRemark,
      lastTicketDate: r.LastTicketDate,
      categorizedServices,
      miniRules,
      segments: r.Segments?.[0],
      ranking: r.SmartChoiceRanking,
    };
  });
}

// ─── Cabin theme config ───────────────────────────────────────────────────────
const CABIN_CFG = {
  Economy: {
    accent: "#0A203E",
    accentLight: "#f0f4f8",
    accentRing: "#d0dbf0",
    popularBg: "from-[#0A203E] to-[#1a3a5a]",
    tabActive:
      "bg-[#0A203E] text-white border-transparent shadow-md shadow-[#0A203E]/20",
    tabIdle:
      "text-slate-500 border-slate-200 bg-white hover:text-[#0A203E] hover:bg-slate-50",
    selectBtn:
      "bg-[#0A203E] hover:bg-[#1a3a5a] text-white shadow-md shadow-[#0A203E]/20",
    selectBtnOutline: "border-2 border-slate-200 text-[#0A203E] hover:bg-slate-50",
    icon: MdFlight,
  },
  "Premium Economy": {
    accent: "#C9A84C",
    accentLight: "#fcfaf4",
    accentRing: "#f1e8d0",
    popularBg: "from-[#C9A84C] to-[#d4b96a]",
    tabActive:
      "bg-[#C9A84C] text-[#0A203E] border-transparent shadow-md shadow-[#C9A84C]/20",
    tabIdle:
      "text-slate-500 border-slate-200 bg-white hover:text-[#C9A84C] hover:bg-slate-50",
    selectBtn:
      "bg-[#C9A84C] hover:bg-[#d4b96a] text-[#0A203E] shadow-md shadow-[#C9A84C]/20",
    selectBtnOutline:
      "border-2 border-[#C9A84C]/30 text-[#C9A84C] hover:bg-slate-50",
    icon: MdAirlineSeatReclineExtra,
  },
  Business: {
    accent: "#0A203E",
    accentLight: "#f0f4f8",
    accentRing: "#d0dbf0",
    popularBg: "from-[#0A203E] to-[#1a3a5a]",
    tabActive:
      "bg-[#0A203E] text-[#C9A84C] border-[#C9A84C]/30 shadow-md shadow-[#0A203E]/20",
    tabIdle:
      "text-slate-500 border-slate-200 bg-white hover:text-[#0A203E] hover:bg-slate-50",
    selectBtn:
      "bg-[#0A203E] hover:bg-[#1a3a5a] text-[#C9A84C] shadow-md shadow-[#0A203E]/20 border border-[#C9A84C]/40",
    selectBtnOutline:
      "border-2 border-[#0A203E]/30 text-[#0A203E] hover:bg-slate-50",
    icon: MdWorkspacePremium,
  },
  First: {
    accent: "#C9A84C",
    accentLight: "#fcfaf4",
    accentRing: "#f1e8d0",
    popularBg: "from-[#C9A84C] to-[#b5953e]",
    tabActive:
      "bg-[#C9A84C] text-[#0A203E] border-transparent shadow-md shadow-[#C9A84C]/30",
    tabIdle:
      "text-slate-500 border-slate-200 bg-white hover:text-[#C9A84C] hover:bg-slate-50",
    selectBtn:
      "bg-[#C9A84C] hover:bg-[#b5953e] text-[#0A203E] shadow-md shadow-[#C9A84C]/30",
    selectBtnOutline: "border-2 border-[#C9A84C] text-[#C9A84C] hover:bg-slate-50",
    icon: BsStarFill,
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusIcon({ status }) {
  if (status === "included")
    return (
      <span className="inline-flex items-center justify-center size-4 rounded-full bg-emerald-100 shrink-0">
        <MdCheck size={10} className="text-emerald-600" />
      </span>
    );
  if (status === "chargeable")
    return (
      <span className="inline-flex items-center justify-center size-4 rounded-full bg-amber-100 shrink-0">
        <MdCurrencyRupee size={9} className="text-amber-600" />
      </span>
    );
  return (
    <span className="inline-flex items-center justify-center size-4 shrink-0">
      <MdRemove size={12} className="text-slate-300" />
    </span>
  );
}

function SegmentRow({ segments }) {
  if (!segments?.length) return null;
  const first = segments[0];
  const last = segments[segments.length - 1];
  const dep = new Date(first.Origin?.DepTime);
  const arr = new Date(last.Destination?.ArrTime);
  const totalMin = Math.round((arr - dep) / 60000);
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  const fmtT = (d) =>
    d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  const stops = segments.length - 1;

  return (
    <div className="flex items-center gap-4 bg-white/5 rounded-2xl border border-white/10 px-5 py-4 mt-4 text-left">
      {/* Origin */}
      <div className="text-left min-w-[64px]">
        <p className="text-xl font-bold text-white font-mono tracking-tight">
          {fmtT(dep)}
        </p>
        <p className="text-[11px] font-bold text-slate-300 mt-0.5">
          {first.Origin?.Airport?.AirportCode}
        </p>
        <p className="text-[10px] text-slate-400">
          {first.Origin?.Airport?.CityName}
        </p>
      </div>

      {/* Line */}
      <div className="flex-1 flex flex-col items-center gap-1.5 px-2">
        <div className="flex items-center w-full gap-1.5">
          <div className="flex-1 h-px bg-white/20" />
          <div className="size-7 rounded-full bg-white/10 border border-white/20 shadow-sm flex items-center justify-center shrink-0">
            <MdFlightTakeoff size={14} className="text-[#C9A84C]" />
          </div>
          <div className="flex-1 h-px bg-white/20" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-slate-300">
            {hh}h {mm}m
          </span>
          {stops > 0 ? (
            <span className="text-[10px] font-bold text-[#C9A84C] bg-[#C9A84C]/10 border border-[#C9A84C]/30 px-2 py-0.5 rounded-full">
              {stops} stop{stops > 1 ? "s" : ""} · via{" "}
              {segments
                .slice(0, -1)
                .map((s) => s.Destination?.Airport?.AirportCode)
                .join(", ")}
            </span>
          ) : (
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/20 border border-emerald-800/30 px-2 py-0.5 rounded-full">
              Non-stop
            </span>
          )}
        </div>
      </div>

      {/* Destination */}
      <div className="text-right min-w-[64px]">
        <p className="text-xl font-bold text-white font-mono tracking-tight">
          {fmtT(arr)}
        </p>
        <p className="text-[11px] font-bold text-slate-300 mt-0.5">
          {last.Destination?.Airport?.AirportCode}
        </p>
        <p className="text-[10px] text-slate-400">
          {last.Destination?.Airport?.CityName}
        </p>
      </div>

      {/* Per-leg detail */}
      {segments.length > 0 && (
        <div className="hidden lg:flex flex-col gap-1 border-l border-white/10 pl-4 ml-2">
          {segments.map((seg, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 text-[10px] text-slate-400"
            >
              <span className="font-semibold text-slate-200">
                {seg.Airline?.AirlineCode}
                {seg.Airline?.FlightNumber}
              </span>
              <span>·</span>
              <span>{seg.Craft}</span>
              <span>·</span>
              <span>
                {seg.Origin?.Airport?.AirportCode} →{" "}
                {seg.Destination?.Airport?.AirportCode}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MiniRulesBadges({ rules }) {
  if (!rules?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-3">
      {rules.map((rule, i) => (
        <div
          key={i}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200"
        >
          <span className="text-[10px] font-semibold text-slate-500">
            {rule.type}:
          </span>
          <span className="text-[10px] font-bold text-slate-700">
            {rule.details}
          </span>
        </div>
      ))}
    </div>
  );
}

function FareCard({ fare, cfg, isSelected, isPopular, onSelect, journeyTab, bookingPath, bookingPayload }) {
  const [expanded, setExpanded] = useState(false);

  const servicesToUse =
    journeyTab === "onward" ? fare.onwardServices : fare.returnServices;

  const groupedServices = categorizeServices(servicesToUse);

  const includedCount = groupedServices.reduce(
    (acc, g) => acc + g.services.filter((s) => s.status === "included").length,
    0,
  );

  const hasHiddenItems = groupedServices.some((g) =>
    g.services.some((s) => s.status === "unavailable"),
  );

  return (
    <div
      className={`relative flex flex-col rounded-2xl bg-white transition-all duration-300 hover:scale-[1.015] hover:shadow-xl ${
        isSelected ? "scale-[1.01] shadow-2xl" : "shadow-md shadow-slate-100"
      }`}
      style={{
        border: isSelected ? "2.5px solid #C9A84C" : "1.5px solid #e2e8f0",
        boxShadow: isSelected
          ? "0 12px 30px -10px rgba(199, 168, 76, 0.25), 0 0 0 1px #C9A84C"
          : undefined,
      }}
    >
      {/* Popular banner */}
      {isPopular && (
        <div
          className="bg-gradient-to-r from-[#0A203E] via-[#C9A84C] to-[#0A203E] text-white text-center text-[9.5px] font-black tracking-[0.18em] py-2 uppercase shadow-inner"
        >
          ★ MOST POPULAR ★
        </div>
      )}

      {/* Accent bar */}
      {!isPopular && (
        <div
          className="h-1.5 w-full"
          style={{ background: isSelected ? "#C9A84C" : "#e2e8f0" }}
        />
      )}

      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-100 text-left">
        {/* Fare family + badges */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="text-left">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-400">
              {fare.cabin}
            </p>
            <p
              className="text-[15px] font-black mt-0.5"
              style={{ color: isSelected ? "#C9A84C" : "#1e293b" }}
            >
              {fare.fareFamilyName}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {isSelected && (
              <span
                className="text-[9px] px-2 py-0.5 rounded-full font-black border bg-[#C9A84C]/10 border-[#C9A84C]/40 text-[#C9A84C]"
              >
                ✓ Selected
              </span>
            )}
            {fare.isRefundable && (
              <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-emerald-50 border border-emerald-200 text-emerald-700">
                Refundable
              </span>
            )}
          </div>
        </div>

        {/* Price */}
        <p
          className="text-[28px] font-black leading-none tracking-tight"
          style={{ color: isSelected ? "#0A203E" : "#0f172a" }}
        >
          {fmt(fare.publishedFare)}
        </p>
        <p className="text-[10px] text-slate-400 mt-0.5">
          per person · incl. taxes
        </p>
        {fare.offeredFare > 0 && fare.offeredFare < fare.publishedFare && (
          <div className="mt-1.5 inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200/50 rounded-lg px-2.5 py-0.5 text-emerald-700 font-extrabold text-[10.5px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Net payable: {fmt(fare.offeredFare)}
          </div>
        )}

        {/* Seats + included count */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {fare.noOfSeats <= 5 ? (
            <span className="flex items-center gap-1 text-[9.5px] text-red-600 font-bold bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
              <span className="size-1.5 rounded-full bg-red-500 animate-pulse" />
              {fare.noOfSeats} left!
            </span>
          ) : (
            <span className="text-[9.5px] text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">
              {fare.noOfSeats} seats
            </span>
          )}
          <span className="text-[9.5px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
            {includedCount} free benefits
          </span>
        </div>

        {/* Baggage summary — from FareBreakdown, always shown */}
        <div className="mt-3.5 flex items-center gap-2.5 bg-[#0a203e]/5 rounded-xl px-3.5 py-2.5 border border-dashed border-[#0a203e]/20 text-left">
          <MdLuggage size={18} className="text-[#0a203e] shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-extrabold text-[#0a203e]">
              Check-in: {fare.checkedBagPieces} pc × {fare.checkedBagVal} kg
              {" · "}Cabin: {fare.cabinBagVal} kg
            </p>
            {fare.checkedBagFreeText && (
              <p className="text-[9.5px] text-slate-500 mt-0.5 leading-snug">
                {fare.checkedBagFreeText}
              </p>
            )}
          </div>
        </div>

        {/* Mini fare rules */}
        <MiniRulesBadges rules={fare.miniRules} />
      </div>

      {/* Services — fully dynamic, grouped by category */}
      <div className="flex-1 px-4 py-3 space-y-3">
        {groupedServices.map((group) => {
          const GroupIcon = ICON_MAP[group.icon] || MdUpdate;
          const displayed = expanded
            ? group.services
            : group.services.filter((s) => s.status !== "unavailable");
          if (!displayed.length) return null;

          return (
            <div key={group.group}>
              {/* Group label */}
              <div className="flex items-center gap-1.5 mb-1.5">
                <div
                  className="size-5 rounded-md flex items-center justify-center shrink-0"
                  style={{ background: group.bgColor }}
                >
                  <GroupIcon size={11} style={{ color: group.color }} />
                </div>
                <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-slate-400">
                  {group.group}
                </span>
              </div>

              {/* Services */}
              <div className="space-y-1.5 pl-1">
                {displayed.map((svc, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <StatusIcon status={svc.status} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-slate-700 font-medium leading-snug">
                        {svc.label}
                      </p>
                      {svc.description && (
                        <p className="text-[10px] text-slate-400 leading-snug">
                          {svc.description}
                        </p>
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-semibold shrink-0 ${
                        svc.status === "included"
                          ? "text-emerald-600"
                          : svc.status === "chargeable"
                            ? "text-amber-600"
                            : "text-slate-300"
                      }`}
                    >
                      {svc.status === "included"
                        ? "Free"
                        : svc.status === "chargeable"
                          ? "Paid"
                          : "N/A"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Toggle hidden items */}
        {hasHiddenItems && (
          <button
            onClick={() => setExpanded((p) => !p)}
            className="text-[10px] font-semibold text-slate-400 hover:text-slate-700 flex items-center gap-1 transition-colors mt-1"
          >
            {expanded ? "▲ Show less" : "▼ Show unavailable services"}
          </button>
        )}
      </div>

      {/* Select button */}
      <div className="px-4 pb-4 pt-2 mt-auto">
        {bookingPath ? (
          <a
            href={bookingPath}
            target="_blank"
            rel="noreferrer"
            onClick={() => {
              if (bookingPayload) {
                localStorage.setItem("flightBookingState", JSON.stringify(bookingPayload));
                
                const token = sessionStorage.getItem("token");
                if (token) {
                  localStorage.setItem("tab_sync_token", token);
                  localStorage.setItem("tab_sync_role", sessionStorage.getItem("role") || "");
                  localStorage.setItem("tab_sync_user", sessionStorage.getItem("user") || "");
                }
              }
            }}
            className={`w-full h-11 flex items-center justify-center rounded-xl text-[13px] font-black transition-all duration-150 cursor-pointer border ${
              isSelected 
                ? "bg-[#C9A84C] text-[#0A203E] border-[#C9A84C] hover:bg-[#b5953e] hover:scale-[1.02] shadow-md shadow-[#C9A84C]/25" 
                : "border-2 border-[#0A203E]/20 text-[#0A203E] bg-white hover:bg-slate-50 hover:border-[#0A203E]/40"
            }`}
          >
            {isSelected ? (
              <span className="flex items-center justify-center gap-2">
                <MdCheck size={16} /> Selected
              </span>
            ) : (
              "Select this fare"
            )}
          </a>
        ) : (
          <button
            onClick={() => onSelect(fare)}
            className={`w-full h-11 rounded-xl text-[13px] font-black transition-all duration-150 cursor-pointer border ${
              isSelected 
                ? "bg-[#C9A84C] text-[#0A203E] border-[#C9A84C] hover:bg-[#b5953e] hover:scale-[1.02] shadow-md shadow-[#C9A84C]/25" 
                : "border-2 border-[#0A203E]/20 text-[#0A203E] bg-white hover:bg-slate-50 hover:border-[#0A203E]/40"
            }`}
          >
            {isSelected ? (
              <span className="flex items-center justify-center gap-2">
                <MdCheck size={16} /> Selected
              </span>
            ) : (
              "Select this fare"
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function FareUpsellPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const stateData = location.state || {};
  const localDataJSON = localStorage.getItem("fareUpsellPayload");
  const localData = localDataJSON ? JSON.parse(localDataJSON) : {};

  const isDomesticRT = localData?.type === "domesticRT";

  const fareUpsellData = !isDomesticRT
    ? stateData.fareUpsellData || localData.fareUpsellData
    : null;

  const onwardUpsell = isDomesticRT ? localData?.onward : null;
  const returnUpsell = isDomesticRT ? localData?.return : null;
  const searchPayload = stateData.searchPayload || localData.searchPayload;
  const journeyType = stateData.journeyType || localData.journeyType;
  const searchTraceId = stateData.traceId || localData.traceId;

  const {
    selectedFareFamily,
    traceId: reduxTraceId,
    journeyType: reduxJourneyType,
  } = useSelector((s) => s.flights);

  const [activeCat, setActiveCat] = useState(null);
  const [activeJourneyTab, setActiveJourneyTab] = useState("onward");
  const [currentIndex, setCurrentIndex] = useState(0);
  const CARDS_PER_VIEW = 4;

  const responseData = useMemo(
    () => extractUpsellResponse(fareUpsellData),
    [fareUpsellData],
  );
  const activeJourneyType = Number(journeyType || reduxJourneyType || 1);
  const traceId = useMemo(
    () => searchTraceId || responseData?.TraceId || reduxTraceId || "",
    [searchTraceId, responseData, reduxTraceId],
  );
  useEffect(() => {
    if (activeJourneyType !== 2) {
      setActiveJourneyTab("onward");
    }
  }, [activeJourneyType]);

  const allFares = useMemo(() => {
    const raw = Array.isArray(responseData?.Results)
      ? responseData.Results.flat()
      : [];

    const normalized = normalizeResults(raw, traceId);

    return normalized.map((fare) => {
      const upsellList = fare.rawResult?.UpsellOptionsList?.UpsellList || [];

      const onwardServices = [];
      const returnServices = [];

      upsellList.forEach((item) => {
        const idx = Number(item.FlightInfoIndex);

        if (idx === 1 || idx === 2) {
          onwardServices.push(...item.ServicesList);
        } else if (idx === 3 || idx === 4) {
          returnServices.push(...item.ServicesList);
        }
      });

      return {
        ...fare,
        onwardServices,
        returnServices,
      };
    });
  }, [responseData, traceId]);

  const onwardFares = useMemo(() => {
    if (!isDomesticRT) return [];

    const res = extractUpsellResponse(onwardUpsell);
    const raw = Array.isArray(res?.Results) ? res.Results.flat() : [];
    return normalizeResults(raw, traceId);
  }, [onwardUpsell, traceId, isDomesticRT]);

  const returnFares = useMemo(() => {
    if (!isDomesticRT) return [];

    const res = extractUpsellResponse(returnUpsell);
    const raw = Array.isArray(res?.Results) ? res.Results.flat() : [];
    return normalizeResults(raw, traceId);
  }, [returnUpsell, traceId, isDomesticRT]);

  const firstFare = allFares?.[0]?.rawResult;

  const isInternationalRT =
    activeJourneyType === 2 && firstFare && !isGroupedRoundTrip(firstFare);

  const cabinOrder = ["Economy", "Premium Economy", "Business", "First"];
  const categories = useMemo(() => {
    if (isInternationalRT) return ["Economy"]; // force single tab

    const seen = new Set(allFares.map((f) => f.cabin));
    return cabinOrder.filter((c) => seen.has(c));
  }, [allFares, isInternationalRT]);

  const resolvedCat = useMemo(() => {
    if (activeCat && categories.includes(activeCat)) return activeCat;
    if (
      selectedFareFamily?.cabin &&
      categories.includes(selectedFareFamily.cabin)
    )
      return selectedFareFamily.cabin;
    return categories[0] || "Economy";
  }, [activeCat, categories, selectedFareFamily]);

  const activeFares = isDomesticRT
    ? activeJourneyTab === "onward"
      ? onwardFares
      : returnFares
    : allFares;

  const catFares = useMemo(
    () => activeFares.filter((f) => f.cabin === resolvedCat),
    [activeFares, resolvedCat],
  );

  const cfg = CABIN_CFG[resolvedCat] || CABIN_CFG.Economy;
  const totalCards = catFares.length;
  const maxIndex = Math.max(0, totalCards - CARDS_PER_VIEW);
  const visibleFares = catFares.slice(
    currentIndex,
    currentIndex + CARDS_PER_VIEW,
  );
  const canScrollPrev = currentIndex > 0;
  const canScrollNext = currentIndex < maxIndex;

  useEffect(() => {
    setCurrentIndex(0);
  }, [resolvedCat]);

  // Route info — derived purely from allFares data
  const routeInfo = useMemo(() => {
    const first = allFares[0];
    if (!first) return {};
    const segs = first.segments || [];
    const origin = segs[0]?.Origin?.Airport;
    const dest = segs[segs.length - 1]?.Destination?.Airport;
    const airline = segs[0]?.Airline?.AirlineName;
    const flightNos = segs
      .map((s) => `${s.Airline?.AirlineCode || ""}${s.Airline?.FlightNumber || ""}`)
      .join(" + ");
    const depDate = segs[0]?.Origin?.DepTime
      ? new Date(segs[0].Origin.DepTime).toLocaleDateString("en-IN", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "";
    const aircraft = [
      ...new Set(segs.map((s) => s.Craft).filter(Boolean)),
    ].join(", ");
    return { origin, dest, airline, flightNos, depDate, aircraft };
  }, [allFares]);

  const airlineRemark = allFares[0]?.airlineRemark || "";
  const lastTicketDate = allFares[0]?.lastTicketDate
    ? new Date(allFares[0].lastTicketDate).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

  // Most popular: the second fare (index 1) per cabin (as in original)
  const popularIdx = 1;

  const [selectedOnwardFare, setSelectedOnwardFare] = useState(null);
  const [selectedReturnFare, setSelectedReturnFare] = useState(null);

  const totalRoundTripPrice = useMemo(() => {
    return (selectedOnwardFare?.publishedFare || 0) + (selectedReturnFare?.publishedFare || 0);
  }, [selectedOnwardFare, selectedReturnFare]);

  function handleSelect(fare) {
    if (!isDomesticRT) {
      // For non-domestic RT, navigate to booking details page
      const isInternational = isInternationalFlight(fare.rawResult);
      const journeyType = activeJourneyType || 1; // 1 = one-way, 2 = round-trip
      
      const bookingPath = journeyType === 2 
        ? "/round-trip-flight/booking"
        : "/one-way-flight/booking";
      
      navigate(bookingPath, {
        state: {
          selectedFlight: fare.rawResult,
          rawFlightData: fare.rawResult,
          searchParams: { traceId, passengers: getPassengerCounts(searchPayload) },
          tripType: journeyType === 2 ? "round-trip" : "one-way",
          isInternational,
        },
      });
      return;
    }

    if (activeJourneyTab === "onward") {
      setSelectedOnwardFare(fare);
    } else {
      setSelectedReturnFare(fare);
    }
  }

  const tabIcons = {
    Economy: <MdFlight size={13} />,
    "Premium Economy": <MdAirlineSeatReclineExtra size={13} />,
    Business: <MdWorkspacePremium size={13} />,
    First: <BsStarFill size={11} />,
  };

  return (
    <div className="min-h-screen bg-slate-100/60 font-sans">
      <LandingHeader />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Back */}
        {/* <button
          onClick={() => navigate(-1)}
          className="mb-5 flex items-center gap-2 text-[13px] font-semibold text-slate-500 hover:text-slate-800 transition-colors group"
        >
          <span className="size-7 rounded-full bg-white border border-slate-200 flex items-center justify-center group-hover:border-slate-300 shadow-sm transition-colors">
            <MdArrowBack size={15} />
          </span>
          Back to results
        </button> */}

        {/* Card shell */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
          {/* ── Flight header ── */}
          <div className="px-6 py-6 bg-[#0A203E] text-white border-b border-[#0A203E]/95">
            <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-white/10">
              {/* Route */}
              <div className="text-left">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#C9A84C] mb-3">
                  Select your fare
                </p>
                {routeInfo.origin && (
                  <div className="flex items-center gap-3">
                    <div className="text-left">
                      <p className="text-3xl font-extrabold text-white font-mono tracking-tight leading-none">
                        {routeInfo.origin.AirportCode}
                      </p>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        {routeInfo.origin.CityName},{" "}
                        {routeInfo.origin.CountryCode}
                      </p>
                    </div>
                    <MdFlightTakeoff
                      size={20}
                      className="text-[#C9A84C] mx-1 animate-pulse"
                    />
                    <div className="text-left">
                      <p className="text-3xl font-extrabold text-white font-mono tracking-tight leading-none">
                        {routeInfo.dest?.AirportCode}
                      </p>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        {routeInfo.dest?.CityName},{" "}
                        {routeInfo.dest?.CountryCode}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Meta pills */}
              {routeInfo.origin && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {routeInfo.airline && (
                    <span className="text-[11px] font-semibold text-white bg-white/10 border border-white/20 px-3 py-1.5 rounded-full">
                      {routeInfo.airline}
                    </span>
                  )}
                  {routeInfo.flightNos && (
                    <span className="text-[11px] font-mono text-white bg-white/10 border border-white/20 px-3 py-1.5 rounded-full">
                      {routeInfo.flightNos}
                    </span>
                  )}
                  {routeInfo.aircraft && (
                    <span className="text-[11px] text-slate-200 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
                      {routeInfo.aircraft}
                    </span>
                  )}
                  {routeInfo.depDate && (
                    <span
                      className="text-[11px] font-black px-3 py-1.5 rounded-full border bg-[#C9A84C]/10 border-[#C9A84C]/30 text-[#C9A84C]"
                    >
                      {routeInfo.depDate}
                    </span>
                  )}
                  {lastTicketDate && (
                    <span className="text-[11px] text-slate-300 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
                      Last ticket:{" "}
                      <span className="font-semibold text-[#C9A84C]">
                        {lastTicketDate}
                      </span>
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Segment timing row */}
            {allFares[0] && <SegmentRow segments={allFares[0].segments} />}
          </div>

          {/* Airline remark */}
          {airlineRemark && (
            <div className="mx-6 mt-4 flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 border-l-4 border-l-amber-400 rounded-xl">
              <MdInfo className="text-amber-500 shrink-0 mt-0.5" size={16} />
              <p className="text-[11.5px] text-amber-800 leading-relaxed">
                {(() => {
                  const remark = airlineRemark || "";
                  return remark.replace(/(.+?)\1{3,}/g, "$1");
                })()}
              </p>
            </div>
          )}

          {/* ── Journey Tabs (Onward / Return) ── */}
          {activeJourneyType === 2 && (
            <div className="px-6 pt-5">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveJourneyTab("onward")}
                  className={`px-6 py-2.5 rounded-xl text-sm font-black border transition-all cursor-pointer uppercase tracking-wider ${
                    activeJourneyTab === "onward"
                      ? "bg-[#0A203E] text-white border-[#0A203E] shadow-lg"
                      : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  ✈️ Onward
                </button>

                <button
                  onClick={() => setActiveJourneyTab("return")}
                  className={`px-6 py-2.5 rounded-xl text-sm font-black border transition-all cursor-pointer uppercase tracking-wider ${
                    activeJourneyTab === "return"
                      ? "bg-[#0A203E] text-white border-[#0A203E] shadow-lg"
                      : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  🔁 Return
                </button>
              </div>
            </div>
          )}

          {/* ── Cabin tabs ── */}
          {!isInternationalRT && categories.length > 1 && (
            <div className="px-6 pt-5">
              <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5">
                {categories.map((cat) => {
                  const isActive = resolvedCat === cat;
                  const catCfg = CABIN_CFG[cat] || CABIN_CFG.Economy;
                  const count = allFares.filter((f) => f.cabin === cat).length;
                  return (
                    <button
                      key={cat}
                      onClick={() => setActiveCat(cat)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-bold border transition-all whitespace-nowrap ${
                        isActive ? catCfg.tabActive : catCfg.tabIdle
                      }`}
                    >
                      {tabIcons[cat]}
                      {cat}
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                          isActive
                            ? "bg-white/25"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Fare cards ── */}
          <div className="p-6">
            {catFares.length === 0 ? (
              <div className="py-20 text-center">
                <MdFlight className="mx-auto mb-3 text-slate-300" size={48} />
                <p className="font-bold text-slate-400 text-lg">
                  No fares available for {resolvedCat}
                </p>
                <p className="text-sm mt-1 text-slate-400">
                  Please select a different cabin class.
                </p>
              </div>
            ) : (
              <div className="relative">
                <div
                  className="grid gap-4"
                  style={{
                    gridTemplateColumns: `repeat(${Math.min(CARDS_PER_VIEW, visibleFares.length)}, minmax(0, 1fr))`,
                  }}
                >
                  {visibleFares.map((fare, idx) => {
                    const globalIdx = currentIndex + idx;
                    const isSelected =
                      selectedFareFamily?.id === fare.id ||
                      selectedFareFamily?.ResultIndex === fare.id;
                    return (
                      <FareCard
                        key={fare.id}
                        fare={fare}
                        cfg={cfg}
                        isSelected={isSelected}
                        isPopular={globalIdx === popularIdx}
                        onSelect={handleSelect}
                        journeyTab={activeJourneyTab}
                        bookingPath={!isDomesticRT ? (activeJourneyType === 2 ? "/round-trip-flight/booking" : "/one-way-flight/booking") : null}
                        bookingPayload={!isDomesticRT ? {
                          selectedFlight: fare.rawResult,
                          rawFlightData: fare.rawResult,
                          searchParams: { traceId, passengers: getPassengerCounts(searchPayload) },
                          tripType: activeJourneyType === 2 ? "round-trip" : "one-way",
                          isInternational: isInternationalFlight(fare.rawResult),
                        } : null}
                      />
                    );
                  })}
                </div>

                {/* Carousel nav */}
                {totalCards > CARDS_PER_VIEW && (
                  <>
                    <button
                      onClick={() => setCurrentIndex((p) => Math.max(0, p - 1))}
                      disabled={!canScrollPrev}
                      className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-5 w-10 h-10 rounded-full border shadow-lg flex items-center justify-center transition-all z-10 cursor-pointer ${
                        canScrollPrev
                          ? "bg-[#0A203E] border-[#0A203E] text-white hover:bg-[#1a3a5a] hover:scale-105"
                          : "bg-slate-100 border-slate-200 text-slate-300 cursor-not-allowed opacity-40"
                      }`}
                    >
                      <MdChevronLeft size={24} />
                    </button>
                    <button
                      onClick={() =>
                        setCurrentIndex((p) => Math.min(maxIndex, p + 1))
                      }
                      disabled={!canScrollNext}
                      className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-5 w-10 h-10 rounded-full border shadow-lg flex items-center justify-center transition-all z-10 cursor-pointer ${
                        canScrollNext
                          ? "bg-[#0A203E] border-[#0A203E] text-white hover:bg-[#1a3a5a] hover:scale-105"
                          : "bg-slate-100 border-slate-200 text-slate-300 cursor-not-allowed opacity-40"
                      }`}
                    >
                      <MdChevronRight size={24} />
                    </button>
                  </>
                )}
              </div>
            )}

            {isDomesticRT && (
              <div className="mt-6 p-5 bg-[#0a203e]/5 border border-[#0a203e]/10 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex flex-col text-left">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Combined Fare</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black text-[#0A203E]">
                      {fmt(totalRoundTripPrice)}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">for 1 traveler</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Onward: <span className="font-semibold text-slate-700">{selectedOnwardFare ? fmt(selectedOnwardFare.publishedFare) : "Not selected"}</span> · Return: <span className="font-semibold text-slate-700">{selectedReturnFare ? fmt(selectedReturnFare.publishedFare) : "Not selected"}</span>
                  </p>
                </div>
                <a
                  href={(!selectedOnwardFare || !selectedReturnFare) ? "#" : "/round-trip-flight/booking"}
                  target={(!selectedOnwardFare || !selectedReturnFare) ? "_self" : "_blank"}
                  rel="noreferrer"
                  onClick={(e) => {
                    if (!selectedOnwardFare || !selectedReturnFare) {
                      e.preventDefault();
                      return;
                    }
                    const stateObj = {
                      onward: {
                        ...selectedOnwardFare.rawResult,
                        ResultIndex: selectedOnwardFare.ResultIndex,
                      },
                      return: {
                        ...selectedReturnFare.rawResult,
                        ResultIndex: selectedReturnFare.ResultIndex,
                      },
                      traceId,
                      journeyType: 2,
                    };
                    localStorage.setItem("flightBookingState", JSON.stringify(stateObj));
                    
                    const token = sessionStorage.getItem("token");
                    if (token) {
                      localStorage.setItem("tab_sync_token", token);
                      localStorage.setItem("tab_sync_role", sessionStorage.getItem("role") || "");
                      localStorage.setItem("tab_sync_user", sessionStorage.getItem("user") || "");
                    }
                  }}
                  className={`flex items-center justify-center px-8 h-13 font-black rounded-xl uppercase tracking-widest transition-all cursor-pointer ${
                    (!selectedOnwardFare || !selectedReturnFare)
                      ? "bg-slate-100 text-slate-400 shadow-none pointer-events-none"
                      : "bg-[#C9A84C] text-[#0A203E] shadow-xl hover:bg-[#b5953e] hover:scale-[1.02]"
                  }`}
                >
                  Continue with Selected Fares
                </a>
              </div>
            )}
          </div>

          {/* ── Footer legend ── */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-5">
              <span className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                <span className="inline-flex items-center justify-center size-4 rounded-full bg-emerald-100">
                  <MdCheck size={10} className="text-emerald-600" />
                </span>
                Included free
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                <span className="inline-flex items-center justify-center size-4 rounded-full bg-amber-100">
                  <MdCurrencyRupee size={9} className="text-amber-600" />
                </span>
                Chargeable
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                <span className="inline-flex items-center justify-center size-4">
                  <MdRemove size={13} className="text-slate-300" />
                </span>
                Not available
              </span>
            </div>
            <p className="text-[10.5px] text-slate-400">
              All prices per person · inclusive of taxes & fees
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
