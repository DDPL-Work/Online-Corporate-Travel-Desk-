import React, { useState, useMemo, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import { createPortal } from "react-dom";
import { selectFareFamily } from "../../../Redux/Slice/flightSearchSlice";
import { getFareRule } from "../../../Redux/Actions/flight.thunks";
import { processFareRulesData } from "../../../utils/fareRulesParser";
import FareRulesRenderer from "../../../components/flight-details/FareRulesRenderer";
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
  MdClose,
} from "react-icons/md";
import { BsStarFill } from "react-icons/bs";
import LandingHeader from "../../../layout/LandingHeader";

// ─── Premium palette ──────────────────────────────────────────────────────────
const C = {
  black: "#000000",
  navy: "#000D26",
  navyDeep: "#04112F",
  navyMid: "#0A243D",
  nearBlack: "#0C0C0C",
  navyDark: "#102238",
  muted: "#65758B",
  gold: "#C9A240",
  border: "#E1E7EF",
  lightGray: "#F5F5F5",
  offWhite: "#F8FAFC",
  white: "#FFFFFF",
};
const GOLD = "#C9A240";
const GOLD_10 = "rgba(201,162,64,0.10)";
const GOLD_20 = "rgba(201,162,64,0.20)";
const GOLD_30 = "rgba(201,162,64,0.30)";
const WHITE_5 = "rgba(255,255,255,0.05)";
const WHITE_10 = "rgba(255,255,255,0.10)";
const WHITE_20 = "rgba(255,255,255,0.20)";
const WHITE_40 = "rgba(255,255,255,0.40)";
const WHITE_60 = "rgba(255,255,255,0.60)";
const HERO_TOP = "#000D26";
const HERO_SPLIT = "#F8FAFC";
const CARD_BORDER = "rgba(255,255,255,0.10)";
const FIELD_BG = "#FFFFFF";
const FIELD_BORDER = "#E1E7EF";
const FIELD_FOCUS = "#C9A240";
const FIELD_TEXT = "#000D26";
const FIELD_MUTED = "#65758B";

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
    color: C.navy,
    bgColor: C.offWhite,
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
    color: GOLD,
    bgColor: GOLD_10,
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
    color: C.navyMid,
    bgColor: C.offWhite,
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
    color: C.navy,
    bgColor: C.offWhite,
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
    color: GOLD,
    bgColor: GOLD_10,
    keywords: ["miles", "mileage", "reward", "points", "accrual", "bonus"],
  },
  {
    group: "Priority Services",
    icon: "priority",
    color: C.navyDark,
    bgColor: C.offWhite,
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
    color: GOLD,
    bgColor: GOLD_10,
    keywords: ["upgrade"],
  },
];

const OTHER_GROUP = {
  group: "Other Benefits",
  icon: "other",
  color: C.muted,
  bgColor: C.lightGray,
};

function categorizeServices(servicesList = []) {
  const grouped = {};

  servicesList.forEach((svc) => {
    if (!svc.UpsellDescription) return;
    const [labelRaw, descRaw] = svc.UpsellDescription.split("|");
    let description = (descRaw || labelRaw).trim();

    description = description.replace(/^[A-Z]{3}-[A-Z]{3}:\s*/i, "");

    const lowerDesc = description.toLowerCase();

    const status =
      svc.IsIncluded === "Yes"
        ? "included"
        : svc.IsChargeable === "Yes"
          ? "chargeable"
          : "unavailable";

    let matchedGroup = null;
    for (const cat of SERVICE_CATEGORY_RULES) {
      if (cat.keywords.some((kw) => lowerDesc.includes(kw))) {
        matchedGroup = cat.group;
        break;
      }
    }
    const groupKey = matchedGroup || OTHER_GROUP.group;
    if (!grouped[groupKey]) grouped[groupKey] = [];

    const exists = grouped[groupKey].some((s) => s.description === description);
    if (!exists && description) {
      grouped[groupKey].push({ description, status });
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

    const seg0Baggage = r.FareBreakdown?.[0]?.SegmentDetails?.[0];
    const checkedBagVal = seg0Baggage?.CheckedInBaggage?.Value;
    const cabinBagVal = seg0Baggage?.CabinBaggage?.Value;
    const checkedBagPieces = seg0Baggage?.CheckedInBaggage?.NoOfPiece;
    const checkedBagFreeText = seg0Baggage?.CheckedInBaggage?.FreeText;

    const fareFamilyName =
      r.UpsellOptionsList?.UpsellList?.[0]?.FareFamilyName ||
      r.FareClassification?.Type;

    const miniRules = (r.MiniFareRules?.[0] || []).map((rule) => ({
      type: rule.Type,
      details: rule.Details,
      points: rule.JourneyPoints,
    }));

    const allMiniRules = (r.MiniFareRules || []).map((group) =>
      (group || []).map((rule) => ({
        type: rule.Type,
        details: rule.Details,
        points: rule.JourneyPoints,
      })),
    );

    const allBaggage = (r.FareBreakdown?.[0]?.SegmentDetails || []).map(
      (segBaggage) => ({
        flightInfoIndex: segBaggage.FlightInfoIndex,
        checkedBagVal: segBaggage.CheckedInBaggage?.Value,
        checkedBagPieces: segBaggage.CheckedInBaggage?.NoOfPiece,
        checkedBagFreeText: segBaggage.CheckedInBaggage?.FreeText,
        cabinBagVal: segBaggage.CabinBaggage?.Value,
        cabinBagFreeText: segBaggage.CabinBaggage?.FreeText,
      }),
    );

    const allFareClasses = (r.Segments || []).map((segGroup) => {
      return (
        segGroup[0]?.SupplierFareClass || segGroup[0]?.Airline?.FareClass || ""
      );
    });

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
      allMiniRules,
      allBaggage,
      allFareClasses,
      segments: r.Segments?.[0],
      allSegments: r.Segments,
      upsellLists: r.UpsellOptionsList?.UpsellList || [],
      ranking: r.SmartChoiceRanking,
    };
  });
}

// ─── Cabin theme config ───────────────────────────────────────────────────────
const CABIN_CFG = {
  Economy: {
    accent: C.navy,
    accentLight: C.offWhite,
    accentRing: C.border,
    popularBg: `from-[${C.navy}] to-[${C.navyMid}]`,
    tabActive: `bg-[${C.navy}] text-white border-transparent shadow-md shadow-[${C.navy}]/20`,
    tabIdle: `text-[${C.muted}] border-[${C.border}] bg-white hover:text-[${C.navy}] hover:bg-[${C.offWhite}]`,
    selectBtn: `bg-[${C.navy}] hover:bg-[${C.navyMid}] text-white shadow-md shadow-[${C.navy}]/20`,
    selectBtnOutline: `border-2 border-[${C.border}] text-[${C.navy}] hover:bg-[${C.offWhite}]`,
    icon: MdFlight,
  },
  "Premium Economy": {
    accent: GOLD,
    accentLight: GOLD_10,
    accentRing: GOLD_20,
    popularBg: `from-[${GOLD}] to-[#d8b75c]`,
    tabActive: `bg-[${GOLD}] text-[${C.navy}] border-transparent shadow-md shadow-[${GOLD}]/20`,
    tabIdle: `text-[${C.muted}] border-[${C.border}] bg-white hover:text-[${GOLD}] hover:bg-[${C.offWhite}]`,
    selectBtn: `bg-[${GOLD}] hover:bg-[#b5903a] text-[${C.navy}] shadow-md shadow-[${GOLD}]/20`,
    selectBtnOutline: `border-2 border-[${GOLD}]/30 text-[${GOLD}] hover:bg-[${C.offWhite}]`,
    icon: MdAirlineSeatReclineExtra,
  },
  Business: {
    accent: C.navy,
    accentLight: C.offWhite,
    accentRing: C.border,
    popularBg: `from-[${C.navy}] to-[${C.navyMid}]`,
    tabActive: `bg-[${C.navy}] text-[${GOLD}] border-[${GOLD}]/30 shadow-md shadow-[${C.navy}]/20`,
    tabIdle: `text-[${C.muted}] border-[${C.border}] bg-white hover:text-[${C.navy}] hover:bg-[${C.offWhite}]`,
    selectBtn: `bg-[${C.navy}] hover:bg-[${C.navyMid}] text-[${GOLD}] shadow-md shadow-[${C.navy}]/20 border border-[${GOLD}]/40`,
    selectBtnOutline: `border-2 border-[${C.navy}]/30 text-[${C.navy}] hover:bg-[${C.offWhite}]`,
    icon: MdWorkspacePremium,
  },
  First: {
    accent: GOLD,
    accentLight: GOLD_10,
    accentRing: GOLD_20,
    popularBg: `from-[${GOLD}] to-[#a8863a]`,
    tabActive: `bg-[${GOLD}] text-[${C.navy}] border-transparent shadow-md shadow-[${GOLD}]/30`,
    tabIdle: `text-[${C.muted}] border-[${C.border}] bg-white hover:text-[${GOLD}] hover:bg-[${C.offWhite}]`,
    selectBtn: `bg-[${GOLD}] hover:bg-[#a8863a] text-[${C.navy}] shadow-md shadow-[${GOLD}]/30`,
    selectBtnOutline: `border-2 border-[${GOLD}] text-[${GOLD}] hover:bg-[${C.offWhite}]`,
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
      <span
        className="inline-flex items-center justify-center size-4 rounded-full shrink-0"
        style={{ background: GOLD_10 }}
      >
        <MdCurrencyRupee size={9} style={{ color: GOLD }} />
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
    <div
      className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 rounded-2xl px-4 sm:px-5 py-4 mt-4 text-left"
      style={{ background: WHITE_5, border: `1px solid ${WHITE_10}` }}
    >
      {/* Origin */}
      <div className="text-left min-w-16">
        <p className="text-lg sm:text-xl font-bold text-white font-mono tracking-tight">
          {fmtT(dep)}
        </p>
        <p className="text-[11px] font-bold mt-0.5" style={{ color: WHITE_60 }}>
          {first.Origin?.Airport?.AirportCode}
        </p>
        <p className="text-[10px]" style={{ color: WHITE_40 }}>
          {first.Origin?.Airport?.CityName}
        </p>
      </div>

      {/* Line */}
      <div className="flex-1 flex flex-col items-center gap-1.5 px-0 sm:px-2">
        <div className="flex items-center w-full gap-1.5">
          <div className="flex-1 h-px" style={{ background: WHITE_20 }} />
          <div
            className="size-7 rounded-full shadow-sm flex items-center justify-center shrink-0"
            style={{ background: WHITE_10, border: `1px solid ${WHITE_20}` }}
          >
            <MdFlightTakeoff size={14} style={{ color: GOLD }} />
          </div>
          <div className="flex-1 h-px" style={{ background: WHITE_20 }} />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span
            className="text-[10px] font-semibold"
            style={{ color: WHITE_60 }}
          >
            {hh}h {mm}m
          </span>
          {stops > 0 ? (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full text-center"
              style={{
                color: GOLD,
                background: GOLD_10,
                border: `1px solid ${GOLD_30}`,
              }}
            >
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
      <div className="text-right min-w-16">
        <p className="text-lg sm:text-xl font-bold text-white font-mono tracking-tight">
          {fmtT(arr)}
        </p>
        <p className="text-[11px] font-bold mt-0.5" style={{ color: WHITE_60 }}>
          {last.Destination?.Airport?.AirportCode}
        </p>
        <p className="text-[10px]" style={{ color: WHITE_40 }}>
          {last.Destination?.Airport?.CityName}
        </p>
      </div>

      {/* Per-leg detail */}
      {segments.length > 0 && (
        <div
          className="hidden lg:flex flex-col gap-1 pl-4 ml-2"
          style={{ borderLeft: `1px solid ${WHITE_10}` }}
        >
          {segments.map((seg, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 text-[10px]"
              style={{ color: WHITE_40 }}
            >
              <span className="font-semibold" style={{ color: WHITE_60 }}>
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
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
          style={{ background: C.offWhite, border: `1px solid ${C.border}` }}
        >
          <span
            className="text-[10px] font-semibold"
            style={{ color: C.muted }}
          >
            {rule.type}:
          </span>
          <span className="text-[10px] font-bold" style={{ color: C.navy }}>
            {rule.details}
          </span>
        </div>
      ))}
    </div>
  );
}

function FareCard({
  fare,
  cfg,
  isSelected,
  isPopular,
  onSelect,
  onViewFareRules,
  journeyTab,
  bookingPath,
  bookingPayload,
}) {
  const [expanded, setExpanded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState(0);

  const servicesToUse =
    journeyTab === "onward"
      ? fare.onwardServices
      : journeyTab === "return"
        ? fare.returnServices
        : null;

  const groupedServices = servicesToUse
    ? categorizeServices(servicesToUse)
    : fare.categorizedServices;

  const includedCount = groupedServices.reduce(
    (acc, g) => acc + g.services.filter((s) => s.status === "included").length,
    0,
  );

  const hasHiddenItems = groupedServices.some((g) =>
    g.services.some((s) => s.status === "unavailable"),
  );

  const renderGroupedServices = (categories) => (
    <>
      {categories.map((group) => {
        const GroupIcon = ICON_MAP[group.icon] || MdUpdate;
        const displayed = expanded
          ? group.services
          : group.services.filter((s) => s.status !== "unavailable");
        if (!displayed.length) return null;

        return (
          <div
            key={group.group}
            className="rounded-xl p-3.5"
            style={{
              background: "rgba(248,250,252,0.7)",
              border: `1px solid ${C.border}`,
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div
                className="size-7 rounded-lg flex items-center justify-center shrink-0 shadow-sm"
                style={{ background: group.bgColor }}
              >
                <GroupIcon size={16} style={{ color: group.color }} />
              </div>
              <span className="text-[13px] font-black uppercase tracking-widest text-slate-700">
                {group.group}
              </span>
            </div>

            <div className="space-y-2.5 pl-1">
              {displayed.map((svc, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <StatusIcon status={svc.status} />
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className="text-[14px] text-slate-800 font-medium leading-relaxed">
                      {svc.description}
                    </p>
                  </div>
                  <span
                    className={`text-[11px] font-bold shrink-0 uppercase tracking-wider px-2 py-0.5 rounded-md ${
                      svc.status === "included"
                        ? "bg-emerald-50 text-emerald-700"
                        : svc.status === "chargeable"
                          ? ""
                          : "bg-slate-100 text-slate-500"
                    }`}
                    style={
                      svc.status === "chargeable"
                        ? { background: GOLD_10, color: "#8a6d22" }
                        : undefined
                    }
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
    </>
  );

  return (
    <div
      className="relative flex flex-col rounded-2xl bg-white transition-all duration-300 hover:scale-[1.015] hover:shadow-xl"
      style={{
        border: isSelected ? `2.5px solid ${GOLD}` : `1.5px solid ${C.border}`,
        boxShadow: isSelected
          ? `0 12px 30px -10px ${GOLD_30}, 0 0 0 1px ${GOLD}`
          : "0 1px 2px rgba(0,0,0,0.04)",
        transform: isSelected ? "scale(1.01)" : undefined,
      }}
    >
      {/* Popular banner */}
      {isPopular && (
        <div
          className="text-white text-center text-[9.5px] font-black tracking-[0.18em] py-2 uppercase shadow-inner"
          style={{
            background: `linear-gradient(to right, ${C.navy}, ${GOLD}, ${C.navy})`,
          }}
        >
          ★ MOST POPULAR ★
        </div>
      )}

      {/* Accent bar */}
      {!isPopular && (
        <div
          className="h-1.5 w-full"
          style={{ background: isSelected ? GOLD : C.border }}
        />
      )}

      {/* Header */}
      <div
        className="p-4"
        style={{
          borderBottom: `1px dashed ${C.border}`,
          background: "rgba(248,250,252,0.4)",
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3
              className="text-sm font-black truncate"
              style={{ color: C.navy }}
            >
              {fare.fareFamilyName}
            </h3>
            <p
              className="text-[11px] font-medium mt-0.5"
              style={{ color: C.muted }}
            >
              {fare.cabin}
            </p>
          </div>
          <div className="text-right shrink-0">
            {fare.discount > 0 && (
              <p className="text-[10px] font-bold text-emerald-600 line-through mb-0.5">
                {fmt(fare.publishedFare)}
              </p>
            )}
            <p
              className="text-xl font-black tracking-tight"
              style={{ color: C.navy }}
            >
              {fmt(fare.offeredFare)}
            </p>
          </div>
        </div>

        {/* Badges */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {fare.allFareClasses?.[0] && (
            <span
              className="text-[9.5px] px-2 py-0.5 rounded-full font-bold uppercase"
              style={{
                color: C.navy,
                background: GOLD_10,
                border: `1px solid ${GOLD_30}`,
              }}
            >
              Class: {fare.allFareClasses[0]}
            </span>
          )}
          {fare.isRefundable ? (
            <span className="text-[9.5px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
              Refundable
            </span>
          ) : (
            <span className="text-[9.5px] text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full font-medium">
              Non-refundable
            </span>
          )}
          {fare.noOfSeats <= 5 ? (
            <span className="text-[9.5px] text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-red-500 animate-pulse" />
              {fare.noOfSeats} left!
            </span>
          ) : (
            <span
              className="text-[9.5px] px-2 py-0.5 rounded-full"
              style={{
                color: C.muted,
                background: C.offWhite,
                border: `1px solid ${C.border}`,
              }}
            >
              {fare.noOfSeats} seats
            </span>
          )}
          <span className="text-[9.5px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
            {includedCount} free benefits
          </span>
        </div>

        {/* Baggage summary */}
        <div
          className="mt-3.5 flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left"
          style={{
            background: "rgba(0,13,38,0.04)",
            border: `1px dashed rgba(0,13,38,0.18)`,
          }}
        >
          <MdLuggage size={18} style={{ color: C.navy }} className="shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-extrabold" style={{ color: C.navy }}>
              Check-in: {fare.checkedBagPieces} pc × {fare.checkedBagVal} kg
              {" · "}Cabin: {fare.cabinBagVal} kg
            </p>
            {fare.checkedBagFreeText && (
              <p
                className="text-[9.5px] mt-0.5 leading-snug"
                style={{ color: C.muted }}
              >
                {fare.checkedBagFreeText}
              </p>
            )}
          </div>
        </div>

        <MiniRulesBadges rules={fare.miniRules} />
      </div>

      {/* Services — Important Info only (max 3 items) */}
      <div className="flex-1 px-4 py-3 space-y-2">
        {groupedServices
          .flatMap((g) => g.services)
          .filter((s) => s.status === "included")
          .slice(0, 3)
          .map((svc, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <StatusIcon status={svc.status} />
              <p className="text-[12px] text-slate-700 font-medium leading-snug flex-1">
                {svc.description}
              </p>
            </div>
          ))}

        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowModal(true);
          }}
          className="text-[12px] font-bold underline underline-offset-2 mt-2 inline-block transition-colors"
          style={{ color: C.navy }}
        >
          View full details
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onViewFareRules) onViewFareRules(fare);
          }}
          className="text-[12px] font-bold text-slate-600 hover:text-slate-900 underline underline-offset-2 mt-2 ml-4 inline-block transition-colors"
        >
          View Fare Rules
        </button>
      </div>

      {/* Full Details Modal */}
      {showModal &&
        createPortal(
          <div
            className="fixed inset-0 z-9999 flex items-center justify-center p-4 backdrop-blur-sm"
            style={{ background: "rgba(0,13,38,0.6)" }}
            onClick={(e) => {
              e.stopPropagation();
              setShowModal(false);
            }}
          >
            <div
              className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="p-5 flex items-center justify-between shrink-0"
                style={{ borderBottom: `1px solid ${C.border}` }}
              >
                <div>
                  <h3
                    className="text-[20px] font-black"
                    style={{ color: C.navy }}
                  >
                    {fare.fareFamilyName} Benefits
                  </h3>
                  <p
                    className="text-[13px] font-medium mt-0.5"
                    style={{ color: C.muted }}
                  >
                    {fare.cabin}
                  </p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="size-8 rounded-full flex items-center justify-center transition-colors"
                  style={{ background: C.lightGray, color: C.muted }}
                >
                  <MdClose size={20} />
                </button>
              </div>

              {fare.upsellLists?.length > 1 && (
                <div
                  className="px-5 pt-3 flex gap-2 border-b shrink-0"
                  style={{ borderColor: C.border }}
                >
                  {fare.upsellLists.map((ul, uIdx) => {
                    let routeTitle = uIdx === 0 ? "Onward" : "Return";
                    if (
                      fare.allSegments &&
                      fare.allSegments[uIdx] &&
                      fare.allSegments[uIdx].length > 0
                    ) {
                      const segs = fare.allSegments[uIdx];
                      routeTitle = `${segs[0].Origin.Airport.AirportCode} - ${segs[segs.length - 1].Destination.Airport.AirportCode} (${uIdx === 0 ? "Onward" : "Return"})`;
                    }
                    const isActive = activeModalTab === uIdx;
                    return (
                      <button
                        key={uIdx}
                        onClick={() => setActiveModalTab(uIdx)}
                        className="px-4 py-2 text-[13px] font-black transition-all border-b-2"
                        style={{
                          borderColor: isActive ? GOLD : "transparent",
                          color: isActive ? C.navy : C.muted,
                        }}
                      >
                        {routeTitle}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="p-5 overflow-y-auto space-y-5">
                {fare.upsellLists?.length > 1 ? (
                  (() => {
                    const ul = fare.upsellLists[activeModalTab];
                    if (!ul) return null;
                    const services = ul.ServicesList || [];
                    const seenLabels = new Set();
                    const uniqueServices = [];
                    services.forEach((svc) => {
                      const label =
                        svc.UpsellDescription?.split("|")[0]?.trim() || "";
                      if (!seenLabels.has(label)) {
                        seenLabels.add(label);
                        uniqueServices.push(svc);
                      }
                    });
                    const categorized = categorizeServices(uniqueServices);

                    const bag = fare.allBaggage?.[activeModalTab];
                    const mRules = fare.allMiniRules?.[activeModalTab] || [];

                    return (
                      <div className="space-y-4">
                        {bag && (
                          <div
                            className="rounded-xl p-3.5"
                            style={{
                              background: "rgba(248,250,252,0.7)",
                              border: `1px solid ${C.border}`,
                            }}
                          >
                            <div className="flex items-center gap-2 mb-3">
                              <div
                                className="size-7 rounded-lg flex items-center justify-center shrink-0 shadow-sm"
                                style={{ background: GOLD_10 }}
                              >
                                <MdLuggage size={16} style={{ color: GOLD }} />
                              </div>
                              <span className="text-[13px] font-black uppercase tracking-widest text-slate-700">
                                Baggage Allowance
                              </span>
                            </div>
                            <div className="space-y-2.5 pl-1">
                              <div className="flex items-start gap-3">
                                <StatusIcon status="included" />
                                <div className="flex-1 min-w-0 pt-0.5">
                                  <p className="text-[14px] text-slate-800 font-medium leading-relaxed">
                                    Check-in: {bag.checkedBagPieces} pc ×{" "}
                                    {bag.checkedBagVal} kg
                                    <br />
                                    <span className="text-[11px] text-slate-500">
                                      {bag.checkedBagFreeText}
                                    </span>
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-start gap-3">
                                <StatusIcon status="included" />
                                <div className="flex-1 min-w-0 pt-0.5">
                                  <p className="text-[14px] text-slate-800 font-medium leading-relaxed">
                                    Cabin: {bag.cabinBagVal} kg
                                    <br />
                                    <span className="text-[11px] text-slate-500">
                                      {bag.cabinBagFreeText}
                                    </span>
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {mRules.length > 0 && (
                          <div
                            className="rounded-xl p-3.5"
                            style={{
                              background: "rgba(248,250,252,0.7)",
                              border: `1px solid ${C.border}`,
                            }}
                          >
                            <div className="flex items-center gap-2 mb-3">
                              <div
                                className="size-7 rounded-lg flex items-center justify-center shrink-0 shadow-sm"
                                style={{ background: GOLD_10 }}
                              >
                                <MdInfo size={16} style={{ color: GOLD }} />
                              </div>
                              <span className="text-[13px] font-black uppercase tracking-widest text-slate-700">
                                Cancellation & Changes
                              </span>
                            </div>
                            <div className="space-y-2.5 pl-1">
                              {mRules.map((rule, rIdx) => (
                                <div
                                  key={rIdx}
                                  className="flex items-start gap-3"
                                >
                                  <StatusIcon
                                    status={
                                      rule.type === "Reissue"
                                        ? "chargeable"
                                        : "unavailable"
                                    }
                                  />
                                  <div className="flex-1 min-w-0 pt-0.5">
                                    <p className="text-[14px] text-slate-800 font-medium leading-relaxed">
                                      {rule.type}: {rule.details}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {renderGroupedServices(categorized)}
                      </div>
                    );
                  })()
                ) : (
                  <div className="space-y-4">
                    {fare.allBaggage?.[0] && (
                      <div
                        className="rounded-xl p-3.5"
                        style={{
                          background: "rgba(248,250,252,0.7)",
                          border: `1px solid ${C.border}`,
                        }}
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <div
                            className="size-7 rounded-lg flex items-center justify-center shrink-0 shadow-sm"
                            style={{ background: GOLD_10 }}
                          >
                            <MdLuggage size={16} style={{ color: GOLD }} />
                          </div>
                          <span className="text-[13px] font-black uppercase tracking-widest text-slate-700">
                            Baggage Allowance
                          </span>
                        </div>
                        <div className="space-y-2.5 pl-1">
                          <div className="flex items-start gap-3">
                            <StatusIcon status="included" />
                            <div className="flex-1 min-w-0 pt-0.5">
                              <p className="text-[14px] text-slate-800 font-medium leading-relaxed">
                                Check-in: {fare.allBaggage[0].checkedBagPieces}{" "}
                                pc × {fare.allBaggage[0].checkedBagVal} kg
                                <br />
                                <span className="text-[11px] text-slate-500">
                                  {fare.allBaggage[0].checkedBagFreeText}
                                </span>
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <StatusIcon status="included" />
                            <div className="flex-1 min-w-0 pt-0.5">
                              <p className="text-[14px] text-slate-800 font-medium leading-relaxed">
                                Cabin: {fare.allBaggage[0].cabinBagVal} kg
                                <br />
                                <span className="text-[11px] text-slate-500">
                                  {fare.allBaggage[0].cabinBagFreeText}
                                </span>
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {fare.allMiniRules?.[0]?.length > 0 && (
                      <div
                        className="rounded-xl p-3.5"
                        style={{
                          background: "rgba(248,250,252,0.7)",
                          border: `1px solid ${C.border}`,
                        }}
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <div
                            className="size-7 rounded-lg flex items-center justify-center shrink-0 shadow-sm"
                            style={{ background: GOLD_10 }}
                          >
                            <MdInfo size={16} style={{ color: GOLD }} />
                          </div>
                          <span className="text-[13px] font-black uppercase tracking-widest text-slate-700">
                            Cancellation & Changes
                          </span>
                        </div>
                        <div className="space-y-2.5 pl-1">
                          {fare.allMiniRules[0].map((rule, rIdx) => (
                            <div key={rIdx} className="flex items-start gap-3">
                              <StatusIcon
                                status={
                                  rule.type === "Reissue"
                                    ? "chargeable"
                                    : "unavailable"
                                }
                              />
                              <div className="flex-1 min-w-0 pt-0.5">
                                <p className="text-[14px] text-slate-800 font-medium leading-relaxed">
                                  {rule.type}: {rule.details}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {renderGroupedServices(groupedServices)}
                  </div>
                )}

                {hasHiddenItems && (
                  <button
                    onClick={() => setExpanded((p) => !p)}
                    className="text-[13px] font-bold flex items-center justify-center gap-1.5 w-full py-2 rounded-xl transition-colors"
                    style={{ color: GOLD, background: GOLD_10 }}
                  >
                    {expanded
                      ? "▲ Hide unavailable services"
                      : "▼ Show unavailable services"}
                  </button>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Select button */}
      <div className="px-4 pb-4 pt-2 mt-auto">
        {bookingPath ? (
          <a
            href={bookingPath}
            target="_blank"
            rel="noreferrer"
            onClick={() => {
              if (bookingPayload) {
                localStorage.setItem(
                  "flightBookingState",
                  JSON.stringify(bookingPayload),
                );

                const token = sessionStorage.getItem("token");
                if (token) {
                  localStorage.setItem("tab_sync_token", token);
                  localStorage.setItem(
                    "tab_sync_role",
                    sessionStorage.getItem("role") || "",
                  );
                  localStorage.setItem(
                    "tab_sync_user",
                    sessionStorage.getItem("user") || "",
                  );
                }
              }
            }}
            className="w-full h-11 flex items-center justify-center rounded-xl text-[13px] font-black transition-all duration-150 cursor-pointer"
            style={
              isSelected
                ? {
                    background: GOLD,
                    color: C.navy,
                    border: `1px solid ${GOLD}`,
                    boxShadow: `0 6px 16px -6px ${GOLD_30}`,
                  }
                : {
                    border: `2px solid rgba(0,13,38,0.2)`,
                    color: C.navy,
                    background: C.white,
                  }
            }
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
            className="w-full h-11 rounded-xl text-[13px] font-black transition-all duration-150 cursor-pointer"
            style={
              isSelected
                ? {
                    background: GOLD,
                    color: C.navy,
                    border: `1px solid ${GOLD}`,
                    boxShadow: `0 6px 16px -6px ${GOLD_30}`,
                  }
                : {
                    border: `2px solid rgba(0,13,38,0.2)`,
                    color: C.navy,
                    background: C.white,
                  }
            }
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

  const rawFareUpsellData =
    stateData.fareUpsellData || localData.fareUpsellData;

  const fareUpsellData = isDomesticRT
    ? rawFareUpsellData?.onward
    : rawFareUpsellData;

  const onwardUpsell = isDomesticRT ? rawFareUpsellData?.onward : null;
  const returnUpsell = isDomesticRT ? rawFareUpsellData?.return : null;
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

  const [showFareRulesModal, setShowFareRulesModal] = useState(false);
  const [fareRulesData, setFareRulesData] = useState(null);
  const [isFetchingRules, setIsFetchingRules] = useState(false);
  const [selectedFareForRules, setSelectedFareForRules] = useState(null);

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
    if (isInternationalRT) return ["Economy"];

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

  const buildRouteInfo = (fares) => {
    const first = fares[0];
    if (!first) return {};

    const allSegGroups = first.allSegments || [first.segments];

    const routes = allSegGroups
      .map((segs) => {
        if (!segs || segs.length === 0) return null;
        const origin = segs[0]?.Origin?.Airport;
        const dest = segs[segs.length - 1]?.Destination?.Airport;
        const airline = segs[0]?.Airline?.AirlineName;
        const flightNos = segs
          .map(
            (s) =>
              `${s.Airline?.AirlineCode || ""}${s.Airline?.FlightNumber || ""}`,
          )
          .join(" · ");
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
        const routeLabel =
          origin && dest ? `${origin.AirportCode}-${dest.AirportCode}` : "";
        return {
          origin,
          dest,
          airline,
          flightNos,
          depDate,
          aircraft,
          routeLabel,
        };
      })
      .filter(Boolean);

    if (routes.length === 0) return {};

    const origin = routes[0].origin;
    const dest = routes[0].dest;
    const airline = [...new Set(routes.map((r) => r.airline))].join(" & ");
    const flightNos = routes.map((r) => r.flightNos).join(" | ");
    const depDate =
      routes.length > 1
        ? routes
            .map((r, i) => `${i === 0 ? "Out" : "In"}: ${r.depDate}`)
            .join(" · ")
        : routes[0].depDate;
    const aircraft = [...new Set(routes.flatMap((r) => r.aircraft.split(", ")))]
      .filter(Boolean)
      .join(", ");
    const routeLabel = routes.map((r) => r.routeLabel).join(" | ");

    return {
      origin,
      dest,
      airline,
      flightNos,
      depDate,
      aircraft,
      routeLabel,
      routes,
    };
  };

  const routeInfo = useMemo(() => buildRouteInfo(allFares), [allFares]);
  const onwardRouteInfo = useMemo(
    () => buildRouteInfo(onwardFares),
    [onwardFares],
  );
  const returnRouteInfo = useMemo(
    () => buildRouteInfo(returnFares),
    [returnFares],
  );

  // For domesticRT, use tab-specific route info; otherwise use allFares info
  const activeRouteInfo = isDomesticRT
    ? activeJourneyTab === "onward"
      ? onwardRouteInfo
      : returnRouteInfo
    : routeInfo;

  const airlineRemark =
    (isDomesticRT ? activeFares[0] : allFares[0])?.airlineRemark || "";
  const lastTicketDateSrc = (isDomesticRT ? activeFares[0] : allFares[0])
    ?.lastTicketDate;
  const lastTicketDate = lastTicketDateSrc
    ? new Date(lastTicketDateSrc).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

  const popularIdx = 1;

  const [selectedOnwardFare, setSelectedOnwardFare] = useState(null);
  const [selectedReturnFare, setSelectedReturnFare] = useState(null);

  const totalRoundTripPrice = useMemo(() => {
    const onwardFarePrice = selectedOnwardFare ? selectedOnwardFare.publishedFare : (onwardFares[0]?.publishedFare || 0);
    const returnFarePrice = selectedReturnFare ? selectedReturnFare.publishedFare : (returnFares[0]?.publishedFare || 0);
    
    return onwardFarePrice + returnFarePrice;
  }, [selectedOnwardFare, selectedReturnFare, onwardFares, returnFares]);

  function handleSelect(fare) {
    if (!isDomesticRT) {
      const isInternational = isInternationalFlight(fare.rawResult);
      const journeyType = activeJourneyType || 1;

      const bookingPath =
        journeyType === 2
          ? "/round-trip-flight/booking"
          : "/one-way-flight/booking";

      navigate(bookingPath, {
        state: {
          selectedFlight: fare.rawResult,
          rawFlightData: fare.rawResult,
          traceId, 
          resultIndex: fare.rawResult.ResultIndex,
          searchParams: {
            traceId,
            passengers: getPassengerCounts(searchPayload),
          },
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

  const handleViewFareRules = async (fare) => {
    setSelectedFareForRules(fare);
    setShowFareRulesModal(true);
    setIsFetchingRules(true);

    let rIdx = fare.rawResult.ResultIndex;
    if (isDomesticRT) {
      if (activeJourneyTab === "onward") {
        rIdx = `${fare.rawResult.ResultIndex},${selectedReturnFare?.rawResult?.ResultIndex}`;
      } else {
        rIdx = `${selectedOnwardFare?.rawResult?.ResultIndex},${fare.rawResult.ResultIndex}`;
      }
    }

    try {
      const response = await dispatch(
        getFareRule({ traceId, resultIndex: rIdx }),
      ).unwrap();
      const rawRules = response?.Response?.FareRules;
      if (rawRules) {
        setFareRulesData(processFareRulesData(rawRules));
      } else {
        setFareRulesData([]);
      }
    } catch (err) {
      console.error(err);
      setFareRulesData([]);
    } finally {
      setIsFetchingRules(false);
    }
  };

  const tabIcons = {
    Economy: <MdFlight size={13} />,
    "Premium Economy": <MdAirlineSeatReclineExtra size={13} />,
    Business: <MdWorkspacePremium size={13} />,
    First: <BsStarFill size={11} />,
  };

  return (
    <div className="min-h-screen font-sans" style={{ background: HERO_SPLIT }}>
      <LandingHeader />

      {/* ── Full-width Flight header ── */}
      <div
        className="w-full px-4 sm:px-8 py-5 sm:py-6 text-white"
        style={{
          background: `linear-gradient(135deg, ${HERO_TOP} 0%, ${C.navyDeep} 55%, ${C.navyDark} 100%)`,
          borderBottom: `1px solid ${WHITE_10}`,
        }}
      >
        <div
          className="max-w-7xl mx-auto flex flex-wrap items-start justify-between gap-4 pb-5"
          style={{ borderBottom: `1px solid ${WHITE_10}` }}
        >
          {/* Route */}
          <div className="text-left">
            <p
              className="text-[10px] font-extrabold uppercase tracking-[0.12em] mb-3"
              style={{ color: GOLD }}
            >
              Select your fare
            </p>
            {activeRouteInfo.routes && activeRouteInfo.routes.length > 1 ? (
              <div className="flex flex-col gap-4">
                {activeRouteInfo.routes.map((rt, i) => (
                  <div key={i} className="flex items-center gap-2 sm:gap-3">
                    <div className="text-left">
                      <p className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight leading-none">
                        {rt.origin?.AirportCode}
                      </p>
                      <p
                        className="text-[11px] mt-0.5"
                        style={{ color: WHITE_60 }}
                      >
                        {rt.origin?.CityName}, {rt.origin?.CountryCode}
                      </p>
                    </div>
                    {i === 0 ? (
                      <MdFlightTakeoff
                        size={18}
                        className="mx-1 animate-pulse"
                        style={{ color: GOLD }}
                      />
                    ) : (
                      <MdFlightTakeoff
                        size={18}
                        className="mx-1 animate-pulse"
                        style={{ color: GOLD, transform: "scaleX(-1)" }}
                      />
                    )}
                    <div className="text-left">
                      <p className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight leading-none">
                        {rt.dest?.AirportCode}
                      </p>
                      <p
                        className="text-[11px] mt-0.5"
                        style={{ color: WHITE_60 }}
                      >
                        {rt.dest?.CityName}, {rt.dest?.CountryCode}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              activeRouteInfo.origin && (
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="text-left">
                    <p className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight leading-none">
                      {activeRouteInfo.origin.AirportCode}
                    </p>
                    <p
                      className="text-[11px] mt-0.5"
                      style={{ color: WHITE_60 }}
                    >
                      {activeRouteInfo.origin.CityName},{" "}
                      {activeRouteInfo.origin.CountryCode}
                    </p>
                  </div>
                  <MdFlightTakeoff
                    size={18}
                    className="mx-1 animate-pulse"
                    style={{ color: GOLD }}
                  />
                  <div className="text-left">
                    <p className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight leading-none">
                      {activeRouteInfo.dest?.AirportCode}
                    </p>
                    <p
                      className="text-[11px] mt-0.5"
                      style={{ color: WHITE_60 }}
                    >
                      {activeRouteInfo.dest?.CityName},{" "}
                      {activeRouteInfo.dest?.CountryCode}
                    </p>
                  </div>
                </div>
              )
            )}
          </div>

          {/* Meta pills */}
          {activeRouteInfo.origin && (
            <div className="flex flex-wrap gap-2 pt-1">
              {activeRouteInfo.airline && (
                <span
                  className="text-[11px] font-semibold text-white px-3 py-1.5 rounded-full"
                  style={{
                    background: WHITE_10,
                    border: `1px solid ${WHITE_20}`,
                  }}
                >
                  {activeRouteInfo.airline}
                </span>
              )}
              {activeRouteInfo.flightNos && (
                <span
                  className="text-[11px] font-mono text-white px-3 py-1.5 rounded-full"
                  style={{
                    background: WHITE_10,
                    border: `1px solid ${WHITE_20}`,
                  }}
                >
                  {activeRouteInfo.flightNos}
                </span>
              )}
              {activeRouteInfo.aircraft && (
                <span
                  className="text-[11px] px-3 py-1.5 rounded-full"
                  style={{
                    color: WHITE_60,
                    background: WHITE_5,
                    border: `1px solid ${WHITE_10}`,
                  }}
                >
                  {activeRouteInfo.aircraft}
                </span>
              )}
              {activeRouteInfo.depDate && (
                <span
                  className="text-[11px] font-black px-3 py-1.5 rounded-full"
                  style={{
                    color: GOLD,
                    background: GOLD_10,
                    border: `1px solid ${GOLD_30}`,
                  }}
                >
                  {activeRouteInfo.depDate}
                </span>
              )}
              {lastTicketDate && (
                <span
                  className="text-[11px] px-3 py-1.5 rounded-full"
                  style={{
                    color: WHITE_60,
                    background: WHITE_5,
                    border: `1px solid ${WHITE_10}`,
                  }}
                >
                  Last ticket:{" "}
                  <span className="font-semibold" style={{ color: GOLD }}>
                    {lastTicketDate}
                  </span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Segment timing row */}
        {activeFares[0] && (
          <div className="max-w-7xl mx-auto pt-4">
            <SegmentRow segments={activeFares[0].segments} />
          </div>
        )}
      </div>

      {/* ── Content area ── */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Airline remark */}
        {airlineRemark && (
          <div
            className="mb-4 flex items-start gap-3 px-4 py-3 rounded-xl"
            style={{
              background: GOLD_10,
              border: `1px solid ${GOLD_30}`,
              borderLeft: `4px solid ${GOLD}`,
            }}
          >
            <MdInfo
              className="shrink-0 mt-0.5"
              size={16}
              style={{ color: GOLD }}
            />
            <p
              className="text-[11.5px] leading-relaxed"
              style={{ color: "#7a611f" }}
            >
              {(() => {
                const remark = airlineRemark || "";
                return remark.replace(/(.+?)\1{3,}/g, "$1");
              })()}
            </p>
          </div>
        )}

        {/* ── Journey Tabs (Onward / Return) ── */}
        {activeJourneyType === 2 && isDomesticRT && (
          <div className="mb-1">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveJourneyTab("onward")}
                className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer"
                style={
                  activeJourneyTab === "onward"
                    ? {
                        background: C.navy,
                        color: C.white,
                        border: `1px solid ${C.navy}`,
                        boxShadow: "0 8px 18px -8px rgba(0,13,38,0.4)",
                      }
                    : {
                        background: C.white,
                        color: C.muted,
                        border: `1px solid ${C.border}`,
                      }
                }
              >
                <MdFlightTakeoff size={14} />
                <span className="font-mono font-black tracking-widest">
                  {onwardRouteInfo.routeLabel || "Onward"}
                </span>
              </button>

              <button
                onClick={() => setActiveJourneyTab("return")}
                className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer"
                style={
                  activeJourneyTab === "return"
                    ? {
                        background: C.navy,
                        color: C.white,
                        border: `1px solid ${C.navy}`,
                        boxShadow: "0 8px 18px -8px rgba(0,13,38,0.4)",
                      }
                    : {
                        background: C.white,
                        color: C.muted,
                        border: `1px solid ${C.border}`,
                      }
                }
              >
                <MdFlight size={14} style={{ transform: "rotate(180deg)" }} />
                <span className="font-mono font-black tracking-widest">
                  {returnRouteInfo.routeLabel || "Return"}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* ── Cabin tabs ── */}
        {!isInternationalRT && categories.length > 1 && (
          <div className="pt-4">
            <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5">
              {categories.map((cat) => {
                const isActive = resolvedCat === cat;
                const catCfg = CABIN_CFG[cat] || CABIN_CFG.Economy;
                const count = allFares.filter((f) => f.cabin === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCat(cat)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-bold transition-all whitespace-nowrap"
                    style={
                      isActive
                        ? cat === "Premium Economy" || cat === "First"
                          ? {
                              background: GOLD,
                              color: C.navy,
                              border: "1px solid transparent",
                              boxShadow: `0 8px 18px -8px ${GOLD_30}`,
                            }
                          : {
                              background: C.navy,
                              color: cat === "Business" ? GOLD : C.white,
                              border:
                                cat === "Business"
                                  ? `1px solid ${GOLD_30}`
                                  : "1px solid transparent",
                              boxShadow: "0 8px 18px -8px rgba(0,13,38,0.4)",
                            }
                        : {
                            color: C.muted,
                            border: `1px solid ${C.border}`,
                            background: C.white,
                          }
                    }
                  >
                    {tabIcons[cat]}
                    {cat}
                    <span
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                      style={
                        isActive
                          ? { background: "rgba(255,255,255,0.25)" }
                          : { background: C.lightGray, color: C.muted }
                      }
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
        <div className="py-4 sm:py-6">
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
                  gridTemplateColumns: `repeat(${Math.min(visibleFares.length, 4)}, minmax(240px, 320px))`,
                  justifyContent: visibleFares.length < 3 ? "start" : "stretch",
                }}
              >
                {visibleFares.map((fare, idx) => {
                  const globalIdx = currentIndex + idx;
                  const isSelected = isDomesticRT
                    ? (activeJourneyTab === "onward" 
                        ? (selectedOnwardFare?.id === fare.id || selectedOnwardFare?.ResultIndex === fare.id || selectedOnwardFare?.rawResult?.ResultIndex === fare.rawResult?.ResultIndex)
                        : (selectedReturnFare?.id === fare.id || selectedReturnFare?.ResultIndex === fare.id || selectedReturnFare?.rawResult?.ResultIndex === fare.rawResult?.ResultIndex))
                    : (selectedFareFamily?.id === fare.id ||
                      selectedFareFamily?.ResultIndex === fare.id);
                  return (
                    <FareCard
                      key={fare.id}
                      fare={fare}
                      cfg={cfg}
                      isSelected={isSelected}
                      isPopular={globalIdx === popularIdx}
                      onSelect={handleSelect}
                      onViewFareRules={handleViewFareRules}
                      journeyTab={activeJourneyTab}
                      bookingPath={
                        !isDomesticRT
                          ? activeJourneyType === 2
                            ? "/round-trip-flight/booking"
                            : "/one-way-flight/booking"
                          : null
                      }
                      bookingPayload={
                        !isDomesticRT
                          ? {
                              selectedFlight: fare.rawResult,
                              rawFlightData: fare.rawResult,
                              traceId, 
                              resultIndex: fare.rawResult.ResultIndex,
                              searchParams: {
                                traceId,
                                passengers: getPassengerCounts(searchPayload),
                              },
                              tripType:
                                activeJourneyType === 2
                                  ? "round-trip"
                                  : "one-way",
                              isInternational: isInternationalFlight(
                                fare.rawResult,
                              ),
                            }
                          : null
                      }
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
                    className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-5 w-10 h-10 rounded-full shadow-lg items-center justify-center transition-all z-10 cursor-pointer"
                    style={
                      canScrollPrev
                        ? {
                            background: C.navy,
                            border: `1px solid ${C.navy}`,
                            color: C.white,
                          }
                        : {
                            background: C.lightGray,
                            border: `1px solid ${C.border}`,
                            color: "#cbd5e1",
                            cursor: "not-allowed",
                            opacity: 0.4,
                          }
                    }
                  >
                    <MdChevronLeft size={24} />
                  </button>
                  <button
                    onClick={() =>
                      setCurrentIndex((p) => Math.min(maxIndex, p + 1))
                    }
                    disabled={!canScrollNext}
                    className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-5 w-10 h-10 rounded-full shadow-lg items-center justify-center transition-all z-10 cursor-pointer"
                    style={
                      canScrollNext
                        ? {
                            background: C.navy,
                            border: `1px solid ${C.navy}`,
                            color: C.white,
                          }
                        : {
                            background: C.lightGray,
                            border: `1px solid ${C.border}`,
                            color: "#cbd5e1",
                            cursor: "not-allowed",
                            opacity: 0.4,
                          }
                    }
                  >
                    <MdChevronRight size={24} />
                  </button>
                  {/* Mobile nav row */}
                  <div className="sm:hidden flex items-center justify-center gap-3 mt-4">
                    <button
                      onClick={() => setCurrentIndex((p) => Math.max(0, p - 1))}
                      disabled={!canScrollPrev}
                      className="w-9 h-9 rounded-full flex items-center justify-center"
                      style={
                        canScrollPrev
                          ? { background: C.navy, color: C.white }
                          : { background: C.lightGray, color: "#cbd5e1" }
                      }
                    >
                      <MdChevronLeft size={20} />
                    </button>
                    <button
                      onClick={() =>
                        setCurrentIndex((p) => Math.min(maxIndex, p + 1))
                      }
                      disabled={!canScrollNext}
                      className="w-9 h-9 rounded-full flex items-center justify-center"
                      style={
                        canScrollNext
                          ? { background: C.navy, color: C.white }
                          : { background: C.lightGray, color: "#cbd5e1" }
                      }
                    >
                      <MdChevronRight size={20} />
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {isDomesticRT && (
            <div
              className="mt-6 p-4 sm:p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4"
              style={{
                background: "rgba(0,13,38,0.04)",
                border: `1px solid rgba(0,13,38,0.08)`,
              }}
            >
              <div className="flex flex-col text-left">
                <span
                  className="text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: C.muted }}
                >
                  Total Combined Fare
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span
                    className="text-2xl font-black"
                    style={{ color: C.navy }}
                  >
                    {fmt(totalRoundTripPrice)}
                  </span>
                  <span
                    className="text-xs font-medium"
                    style={{ color: C.muted }}
                  >
                    for 1 traveler
                  </span>
                </div>
                <p className="text-[11px] mt-1" style={{ color: C.muted }}>
                  Onward:{" "}
                  <span className="font-semibold text-slate-700">
                    {fmt(selectedOnwardFare ? selectedOnwardFare.publishedFare : (onwardFares[0]?.publishedFare || 0))}
                  </span>{" "}
                  · Return:{" "}
                  <span className="font-semibold text-slate-700">
                    {fmt(selectedReturnFare ? selectedReturnFare.publishedFare : (returnFares[0]?.publishedFare || 0))}
                  </span>
                </p>
              </div>
              <a
                href="/round-trip-flight/booking"
                target="_blank"
                rel="noreferrer"
                onClick={(e) => {
                  const finalOnward = selectedOnwardFare || onwardFares[0];
                  const finalReturn = selectedReturnFare || returnFares[0];

                  if (!finalOnward || !finalReturn) {
                    e.preventDefault();
                    return;
                  }
                  const stateObj = {
                    rawFlightData: {
                      onward: finalOnward.rawResult,
                      return: finalReturn.rawResult,
                    },
                    traceId,
                    journeyType: 2,
                    passengers: getPassengerCounts(searchPayload),
                  };
                  localStorage.setItem(
                    "flightBookingState",
                    JSON.stringify(stateObj),
                  );

                  const token = sessionStorage.getItem("token");
                  if (token) {
                    localStorage.setItem("tab_sync_token", token);
                    localStorage.setItem(
                      "tab_sync_role",
                      sessionStorage.getItem("role") || "",
                    );
                    localStorage.setItem(
                      "tab_sync_user",
                      sessionStorage.getItem("user") || "",
                    );
                  }
                }}
                className="w-full md:w-auto flex items-center justify-center px-8 h-13 font-black rounded-xl uppercase tracking-widest transition-all cursor-pointer"
                style={{
                  background: GOLD,
                  color: C.navy,
                  boxShadow: `0 16px 30px -12px ${GOLD_30}`,
                }}
              >
                Continue to Booking
              </a>
            </div>
          )}
        </div>
      </div>

      {/* ── Footer legend ── */}
      <div
        className="py-4 flex flex-wrap items-center justify-between gap-3 border-t"
        style={{ borderColor: C.border }}
      >
        <div className="flex flex-wrap items-center gap-5">
          <span
            className="flex items-center gap-1.5 text-[11px] font-medium"
            style={{ color: C.muted }}
          >
            <span className="inline-flex items-center justify-center size-4 rounded-full bg-emerald-100">
              <MdCheck size={10} className="text-emerald-600" />
            </span>
            Included free
          </span>
          <span
            className="flex items-center gap-1.5 text-[11px] font-medium"
            style={{ color: C.muted }}
          >
            <span
              className="inline-flex items-center justify-center size-4 rounded-full"
              style={{ background: GOLD_10 }}
            >
              <MdCurrencyRupee size={9} style={{ color: GOLD }} />
            </span>
            Chargeable
          </span>
          <span
            className="flex items-center gap-1.5 text-[11px] font-medium"
            style={{ color: C.muted }}
          >
            <span className="inline-flex items-center justify-center size-4">
              <MdRemove size={13} className="text-slate-300" />
            </span>
            Not available
          </span>
        </div>
        <p className="text-[10.5px]" style={{ color: "#94a3b8" }}>
          All prices per person · inclusive of taxes & fees
        </p>
      </div>

      {/* Fare Rules Modal */}
      {showFareRulesModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm"
            style={{ background: "rgba(0,13,38,0.6)" }}
            onClick={() => setShowFareRulesModal(false)}
          >
            <div
              className="bg-white rounded-2xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="p-5 flex items-center justify-between shrink-0"
                style={{ borderBottom: `1px solid ${C.border}` }}
              >
                <div>
                  <h3
                    className="text-[20px] font-black"
                    style={{ color: C.navy }}
                  >
                    Fare Rules
                  </h3>
                  <p
                    className="text-[13px] font-medium mt-0.5"
                    style={{ color: C.muted }}
                  >
                    {selectedFareForRules?.fareFamilyName} ·{" "}
                    {selectedFareForRules?.cabin}
                  </p>
                </div>
                <button
                  onClick={() => setShowFareRulesModal(false)}
                  className="size-8 rounded-full flex items-center justify-center transition-colors"
                  style={{ background: C.lightGray, color: C.muted }}
                >
                  <MdClose size={20} />
                </button>
              </div>

              <div
                className="p-5 overflow-y-auto"
                style={{ background: C.offWhite }}
              >
                {isFetchingRules ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <MdLoop
                      className="animate-spin text-4xl mb-4"
                      style={{ color: GOLD }}
                    />
                    <p className="font-medium" style={{ color: C.muted }}>
                      Fetching fare rules...
                    </p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {selectedFareForRules?.allMiniRules?.map(
                      (miniGroup, mIdx) => {
                        if (!miniGroup || miniGroup.length === 0) return null;
                        return (
                          <div
                            key={`mini-${mIdx}`}
                            className="bg-white p-4 rounded-xl shadow-sm border border-slate-200"
                          >
                            <div className="flex items-center gap-2 mb-3">
                              <div
                                className="size-8 rounded-lg flex items-center justify-center shrink-0"
                                style={{ background: GOLD_10 }}
                              >
                                <MdInfo size={18} style={{ color: GOLD }} />
                              </div>
                              <span className="text-[14px] font-black uppercase tracking-widest text-slate-700">
                                Quick Rules: {miniGroup[0]?.points || "Journey"}
                              </span>
                            </div>
                            <div className="space-y-2">
                              {miniGroup.map((rule, rIdx) => (
                                <div
                                  key={rIdx}
                                  className="flex justify-between items-center text-sm py-2 border-b border-slate-100 last:border-0"
                                >
                                  <span className="font-semibold text-slate-600">
                                    {rule.type}
                                  </span>
                                  <span className="font-bold text-slate-800">
                                    {rule.details}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      },
                    )}

                    {fareRulesData && fareRulesData.length > 0 ? (
                      fareRulesData.map((rule, idx) => (
                        <div key={`detailed-${idx}`}>
                          {fareRulesData.length > 1 && (
                            <div
                              className="flex items-center gap-3 mb-6 p-3 rounded-xl shadow-sm"
                              style={{
                                background: C.white,
                                border: `1px solid ${C.border}`,
                              }}
                            >
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                style={{ background: C.navy }}
                              >
                                <MdFlight
                                  size={16}
                                  className="text-white transform rotate-90"
                                />
                              </div>
                              <div>
                                <h4
                                  className="text-sm font-black uppercase tracking-wider"
                                  style={{ color: C.navy }}
                                >
                                  {rule.origin} to {rule.destination}
                                </h4>
                                <p
                                  className="text-[10px] font-bold uppercase tracking-widest mt-0.5"
                                  style={{ color: C.muted }}
                                >
                                  {rule.airline} •{" "}
                                  {rule.fareType || "Standard Fare"}
                                </p>
                              </div>
                            </div>
                          )}
                          <FareRulesRenderer rule={rule} />
                        </div>
                      ))
                    ) : (
                      <div
                        className="text-center py-10"
                        style={{ color: C.muted }}
                      >
                        <p className="font-bold">
                          No detailed fare rules available
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}