import React, { useState, useMemo, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { selectFareFamily } from "../../../Redux/Slice/flightSearchSlice";
import {
  MdClose,
  MdAirlineSeatReclineExtra,
  MdFlight,
  MdCheck,
  MdRemove,
  MdCurrencyRupee,
  MdInfo,
  MdWorkspacePremium,
  MdLuggage,
  MdEventSeat,
  MdWifi,
  MdRestaurant,
  MdStar,
  MdLoop,
  MdMoneyOff,
  MdFlightTakeoff,
  MdChevronLeft,
  MdChevronRight,
} from "react-icons/md";
import { BsStarFill } from "react-icons/bs";

// ─── helpers (unchanged) ─────────────────────────────────────────────────────
const fmt = (n) => "₹" + Math.round(n).toLocaleString("en-IN");

function getCabinLabel(cabinClass, fareClass) {
  const fc = (fareClass || "").toUpperCase();
  if (cabinClass === 6) return "First";
  if (cabinClass === 4) return "Business";
  if (cabinClass === 3) return "Premium Economy";
  if (cabinClass === 2) {
    if (fc.includes("PREMIUM")) return "Premium Economy";
    return "Economy";
  }
  return "Economy";
}

function normalizeResults(results = [], traceId = "") {
  return results.map((r) => {
    const seg0 = r.Segments?.[0]?.[0];
    const fareClass = seg0?.SupplierFareClass || "";
    const cabinClass = seg0?.CabinClass ?? 2;
    const cabin = getCabinLabel(cabinClass, fareClass);

    const services = r.UpsellOptionsList?.UpsellList?.[0]?.ServicesList || [];

    const included = (code) =>
      services.some((s) => s.Code === code && s.IsIncluded === "Yes");
    const chargeable = (code) =>
      services.some((s) => s.Code === code && s.IsChargeable === "Yes");

    const seg0Baggage = r.FareBreakdown?.[0]?.SegmentDetails?.[0];

    return {
      id: r.ResultIndex,
      ResultIndex: r.ResultIndex,
      traceId,
      rawResult: r,
      name: r.FareClassification?.Type || fareClass,
      offeredFare: r.Fare?.OfferedFare ?? 0,
      publishedFare: r.Fare?.PublishedFare ?? 0,
      baseFare: r.Fare?.BaseFare ?? 0,
      tax: r.Fare?.Tax ?? 0,
      cabin,
      cabinClass,
      checkedBags: parseInt(seg0Baggage?.CheckedInBaggage?.Value || "1", 10),
      cabinBags: parseInt(seg0Baggage?.CabinBaggage?.Value || "1", 10),
      changeBefore: included("06I")
        ? "free"
        : chargeable("06I")
        ? "paid"
        : "no",
      changeAfter: included("06J") ? "free" : chargeable("06J") ? "paid" : "no",
      refundBefore: included("06K")
        ? "free"
        : chargeable("06K")
        ? "paid"
        : "no",
      refundAfter: included("06L") ? "free" : chargeable("06L") ? "paid" : "no",
      seatStd: included("050") ? "free" : chargeable("050") ? "paid" : "no",
      seatPreferred: included("05Z")
        ? "free"
        : chargeable("05Z")
        ? "paid"
        : "no",
      seatExtraLeg: included("PZS")
        ? "free"
        : chargeable("PZS")
        ? "paid"
        : "no",
      mealIntl: included("019"),
      mealEurope: included("018") ? "free" : chargeable("018") ? "paid" : "no",
      ife: included("0B1"),
      wifi: included("0CL") ? "free" : chargeable("0CL") ? "paid" : "no",
      lounge: included("0BX") ? "free" : chargeable("0BX") ? "paid" : "no",
      miles: included("057"),
      bonusMiles: included("06P"),
      carbonOffset: included("0EO"),
      upgrade: included("058") ? "free" : chargeable("058") ? "paid" : "no",
      priorityCheckin: included("03P"),
      priorityBaggage: included("0LF"),
      priorityBoarding: included("0G6"),
      airlineRemark: r.AirlineRemark || "",
      lastTicketDate: r.LastTicketDate || "",
      isRefundable: r.IsRefundable,
      source: r.Source,
      noOfSeats: seg0?.NoOfSeatAvailable ?? 9,
      miniFareRules: r.MiniFareRules?.[0] || [],
      fareRules: r.FareRules || [],
      segments: r.Segments?.[0] || [],
    };
  });
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

function getPassengerCounts(searchPayload = {}) {
  return (
    searchPayload?.passengers || {
      adults: searchPayload?.adults || 1,
      children: searchPayload?.children || 0,
      infants: searchPayload?.infants || 0,
    }
  );
}

function isInternationalFlight(result) {
  const segments = Array.isArray(result?.Segments) ? result.Segments.flat() : [];
  return segments.some(
    (s) =>
      s?.Origin?.Airport?.CountryCode &&
      s?.Destination?.Airport?.CountryCode &&
      s.Origin.Airport.CountryCode !== s.Destination.Airport.CountryCode
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

function statusLabel(val) {
  if (val === "free") return { status: "yes", text: "Free" };
  if (val === "paid") return { status: "paid", text: "Chargeable" };
  return { status: "no", text: "Not available" };
}

// ─── feature groups (unchanged structure) ────────────────────────────────────
const FEATURE_GROUPS = [
  {
    group: "Baggage",
    icon: MdLuggage,
    features: [
      {
        key: "bags",
        label: "Check-in baggage",
        getValue: (f) => ({
          status: "yes",
          text: `${f.checkedBags} PC × 23 kg`,
        }),
      },
      {
        key: "cabinBag",
        label: "Cabin baggage",
        getValue: (f) => ({ status: "yes", text: `${f.cabinBags} PC × 8 kg` }),
      },
    ],
  },
  {
    group: "Flexibility",
    icon: MdLoop,
    features: [
      {
        key: "changeBefore",
        label: "Date change (before dep)",
        getValue: (f) => statusLabel(f.changeBefore),
      },
      {
        key: "changeAfter",
        label: "Date change (after dep)",
        getValue: (f) => statusLabel(f.changeAfter),
      },
      {
        key: "refundBefore",
        label: "Cancellation refund",
        getValue: (f) => statusLabel(f.refundBefore),
      },
    ],
  },
  {
    group: "Seat",
    icon: MdEventSeat,
    features: [
      {
        key: "seatStd",
        label: "Standard seat",
        getValue: (f) => statusLabel(f.seatStd),
      },
      {
        key: "seatPreferred",
        label: "Preferred seat",
        getValue: (f) => statusLabel(f.seatPreferred),
      },
      {
        key: "seatExtraLeg",
        label: "Extra legroom",
        getValue: (f) => statusLabel(f.seatExtraLeg),
      },
    ],
  },
  {
    group: "Comfort",
    icon: MdRestaurant,
    features: [
      {
        key: "mealIntl",
        label: "Meal (intercontinental)",
        getValue: (f) => ({
          status: f.mealIntl ? "yes" : "no",
          text: f.mealIntl ? "Included" : "Not available",
        }),
      },
      { key: "wifi", label: "Wi-Fi", getValue: (f) => statusLabel(f.wifi) },
      {
        key: "ife",
        label: "Inflight entertainment",
        getValue: (f) => ({
          status: f.ife ? "yes" : "no",
          text: f.ife ? "Included" : "Not available",
        }),
      },
    ],
  },
  {
    group: "Miles",
    icon: MdStar,
    features: [
      {
        key: "miles",
        label: "Miles accrual",
        getValue: (f) => ({
          status: f.miles ? "yes" : "no",
          text: f.miles ? "Eligible" : "Not applicable",
        }),
      },
      {
        key: "bonusMiles",
        label: "110% bonus miles",
        getValue: (f) => ({
          status: f.bonusMiles ? "yes" : "no",
          text: f.bonusMiles ? "110% earned" : "Standard",
        }),
      },
    ],
  },
  {
    group: "Extras",
    icon: MdFlightTakeoff,
    features: [
      {
        key: "upgrade",
        label: "Upgrade eligibility",
        getValue: (f) => statusLabel(f.upgrade),
      },
      {
        key: "lounge",
        label: "Lounge access",
        getValue: (f) => statusLabel(f.lounge),
      },
      {
        key: "priorityBoarding",
        label: "Priority boarding",
        getValue: (f) => ({
          status: f.priorityBoarding ? "yes" : "no",
          text: f.priorityBoarding ? "Included" : "Not available",
        }),
      },
      {
        key: "priorityCheckin",
        label: "Priority check-in",
        getValue: (f) => ({
          status: f.priorityCheckin ? "yes" : "no",
          text: f.priorityCheckin ? "Included" : "Not available",
        }),
      },
      {
        key: "priorityBaggage",
        label: "Priority baggage",
        getValue: (f) => ({
          status: f.priorityBaggage ? "yes" : "no",
          text: f.priorityBaggage ? "Included" : "Not available",
        }),
      },
    ],
  },
];

// ─── cabin config (updated with lighter, modern colors) ──────────────────────
const CABIN_CFG = {
  Economy: {
    tab: "bg-blue-600 text-white border-blue-600",
    topAccent: "border-t-blue-500",
    popularBar: "bg-blue-600 text-white",
    selectActive: "bg-blue-600 hover:bg-blue-700 text-white",
    selectIdle: "border border-blue-300 text-blue-600 hover:bg-blue-50",
    price: "text-blue-700",
    badge: "bg-blue-100 text-blue-800",
    cabinBadge: "bg-blue-50 text-blue-700 border-blue-200",
    groupIcon: "text-blue-500",
    ring: "ring-blue-200",
  },
  "Premium Economy": {
    tab: "bg-violet-600 text-white border-violet-600",
    topAccent: "border-t-violet-500",
    popularBar: "bg-violet-600 text-white",
    selectActive: "bg-violet-600 hover:bg-violet-700 text-white",
    selectIdle: "border border-violet-300 text-violet-600 hover:bg-violet-50",
    price: "text-violet-700",
    badge: "bg-violet-100 text-violet-800",
    cabinBadge: "bg-violet-50 text-violet-700 border-violet-200",
    groupIcon: "text-violet-500",
    ring: "ring-violet-200",
  },
  Business: {
    tab: "bg-amber-600 text-white border-amber-600",
    topAccent: "border-t-amber-500",
    popularBar: "bg-amber-600 text-white",
    selectActive: "bg-amber-600 hover:bg-amber-700 text-white",
    selectIdle: "border border-amber-300 text-amber-600 hover:bg-amber-50",
    price: "text-amber-700",
    badge: "bg-amber-100 text-amber-800",
    cabinBadge: "bg-amber-50 text-amber-700 border-amber-200",
    groupIcon: "text-amber-500",
    ring: "ring-amber-200",
  },
  First: {
    tab: "bg-rose-600 text-white border-rose-600",
    topAccent: "border-t-rose-500",
    popularBar: "bg-rose-600 text-white",
    selectActive: "bg-rose-600 hover:bg-rose-700 text-white",
    selectIdle: "border border-rose-300 text-rose-600 hover:bg-rose-50",
    price: "text-rose-700",
    badge: "bg-rose-100 text-rose-800",
    cabinBadge: "bg-rose-50 text-rose-700 border-rose-200",
    groupIcon: "text-rose-500",
    ring: "ring-rose-200",
  },
};

// ─── sub-components ──────────────────────────────────────────────────────────
function StatusIcon({ status }) {
  if (status === "yes")
    return (
      <span className="inline-flex items-center justify-center size-[18px] rounded-full bg-emerald-100 shrink-0">
        <MdCheck size={11} className="text-emerald-600" />
      </span>
    );
  if (status === "paid")
    return (
      <span className="inline-flex items-center justify-center size-[18px] rounded-full bg-amber-100 shrink-0">
        <MdCurrencyRupee size={10} className="text-amber-600" />
      </span>
    );
  return (
    <span className="inline-flex items-center justify-center size-[18px] shrink-0">
      <MdRemove size={13} className="text-gray-300" />
    </span>
  );
}

function CabinBadge({ cabin }) {
  const cfg = CABIN_CFG[cabin] || CABIN_CFG.Economy;
  const icons = {
    Economy: <MdFlight size={11} />,
    "Premium Economy": <MdAirlineSeatReclineExtra size={11} />,
    Business: <MdWorkspacePremium size={11} />,
    First: <BsStarFill size={9} />,
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.cabinBadge}`}
    >
      {icons[cabin] || icons.Economy} {cabin}
    </span>
  );
}

function SegmentRow({ segments }) {
  if (!segments.length) return null;
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

  return (
    <div className="flex items-center gap-2 mt-2.5">
      <span className="text-[13px] font-semibold text-gray-800">
        {fmtT(dep)}
      </span>
      <span className="text-[10px] text-gray-500 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded">
        {first.Origin?.Airport?.AirportCode}
      </span>
      <div className="flex-1 flex items-center relative min-w-0">
        <div className="flex-1 h-px bg-gray-300" />
        {segments.length > 1 && (
          <span className="absolute left-1/2 -translate-x-1/2 text-[9px] text-amber-600 bg-white border border-gray-200 px-1.5 py-0.5 rounded whitespace-nowrap z-10">
            {segments.length - 1} stop ·{" "}
            {segments[0].Destination?.Airport?.AirportCode}
          </span>
        )}
        <div className="flex-1 h-px bg-gray-300" />
      </div>
      <span className="text-[10px] text-gray-500 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded">
        {last.Destination?.Airport?.AirportCode}
      </span>
      <span className="text-[13px] font-semibold text-gray-800">
        {fmtT(arr)}
      </span>
      <span className="text-[10px] text-gray-500 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded ml-1">
        {hh}h {mm}m
      </span>
    </div>
  );
}

// ─── FareCard (now filters out unavailable features) ─────────────────────────
function FareCard({
  fare,
  cfg,
  isSelected,
  isPopular,
  onSelect,
  featureGroups,
}) {
  const saving =
    fare.publishedFare > fare.offeredFare
      ? fare.publishedFare - fare.offeredFare
      : 0;
  const lowSeats = fare.noOfSeats <= 3;

  // Filter feature groups: keep only groups that have at least one visible feature
  const visibleGroups = featureGroups
    .map((group) => {
      const visibleFeatures = group.features.filter((feat) => {
        const { status } = feat.getValue(fare);
        return status !== "no";
      });
      return visibleFeatures.length > 0
        ? { ...group, features: visibleFeatures }
        : null;
    })
    .filter(Boolean);

  return (
    <div
      className={`relative flex flex-col rounded-xl border bg-white transition-all duration-200
        ${
          isSelected
            ? `border-t-2 ${cfg.topAccent} ring-2 ${cfg.ring} border-gray-300`
            : "border border-gray-200 shadow-sm hover:shadow-md"
        }`}
    >
      {/* Popular banner */}
      {isPopular && (
        <div
          className={`rounded-t-xl text-center text-[9px] font-bold py-[5px] tracking-widest ${cfg.popularBar}`}
        >
          ★ MOST POPULAR
        </div>
      )}
      {!isPopular && <div className="h-[5px]" />}

      {/* Card header */}
      <div className="px-4 pt-3 pb-4 border-b border-gray-100">
        <div className="flex items-start justify-between gap-1 mb-2">
          <p className="text-[13px] font-semibold text-gray-800 capitalize leading-tight">
            {fare.name.toLowerCase()}
          </p>
          {isSelected && (
            <span
              className={`shrink-0 text-[8.5px] px-1.5 py-0.5 rounded-full font-semibold ${cfg.badge}`}
            >
              Selected
            </span>
          )}
        </div>

        <p className={`text-[26px] font-bold leading-none ${cfg.price}`}>
          {fmt(fare.publishedFare)}
        </p>
        <p className="text-[9.5px] text-gray-500 mt-0.5">
          per person · incl. taxes
        </p>

        {/* {saving > 0 && (
          <div className="flex items-center gap-2 mt-1.5">
            <p className="text-[9.5px] text-gray-400 line-through">
              {fmt(fare.publishedFare)}
            </p>
            <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
              Save {fmt(saving)}
            </span>
          </div>
        )} */}

        {lowSeats && (
          <p className="flex items-center gap-1 text-[10px] text-red-500 font-semibold mt-2">
            <span className="size-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
            Only {fare.noOfSeats} seats left!
          </p>
        )}

        <div className="flex flex-wrap gap-1 mt-2.5">
          {fare.isRefundable && (
            <span className="text-[8.5px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
              Refundable
            </span>
          )}
          {!lowSeats && (
            <span className="text-[8.5px] text-gray-500 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded">
              {fare.noOfSeats} seats avail.
            </span>
          )}
        </div>
      </div>

      {/* Feature groups (only visible ones) */}
      <div className="flex-1 px-4 py-3 space-y-3.5">
        {visibleGroups.map(({ group, icon: Icon, features }) => (
          <div key={group}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Icon size={11} className={cfg.groupIcon} />
              <span className="text-[9px] uppercase tracking-widest text-gray-500 font-semibold">
                {group}
              </span>
            </div>
            <div className="space-y-1">
              {features.map(({ key, label, getValue }) => {
                const { status, text } = getValue(fare);
                return (
                  <div key={key} className="flex items-center gap-2">
                    <StatusIcon status={status} />
                    <span className="text-[11.5px] text-gray-600 leading-snug flex-1">
                      {label}
                    </span>
                    <span
                      className={`text-[11px] font-medium shrink-0
                        ${
                          status === "paid"
                            ? "text-amber-600"
                            : status === "yes"
                            ? "text-gray-700"
                            : "text-gray-400"
                        }`}
                    >
                      {text}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Select button */}
      <div className="px-4 pb-4 pt-2">
        <button
          onClick={() => onSelect(fare)}
          className={`w-full h-10 rounded-lg text-[12.5px] font-semibold transition-all cursor-pointer
            ${isSelected ? cfg.selectActive : cfg.selectIdle}`}
        >
          {isSelected ? "✓ Selected" : "Select this fare"}
        </button>
      </div>
    </div>
  );
}

// ─── main component (with carousel) ──────────────────────────────────────────
export default function FareUpsellModal({
  isOpen,
  onClose,
  fareUpsellData,
  searchPayload,
  journeyType,
  searchTraceId,
}) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    selectedFareFamily,
    traceId: reduxTraceId,
    journeyType: reduxJourneyType,
  } = useSelector((s) => s.flights);

  const [activeCat, setActiveCat] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const cardContainerRef = useRef(null);
  const CARDS_PER_VIEW = 4; // can be made responsive, kept simple

  const responseData = useMemo(
    () => extractUpsellResponse(fareUpsellData),
    [fareUpsellData]
  );

  const activeJourneyType = Number(journeyType || reduxJourneyType || 1);

  const traceId = useMemo(
    () => searchTraceId || responseData?.TraceId || reduxTraceId || "",
    [searchTraceId, responseData, reduxTraceId]
  );

  const allFares = useMemo(() => {
    const raw = Array.isArray(responseData?.Results)
      ? responseData.Results.flat()
      : [];
    return normalizeResults(raw, traceId);
  }, [responseData, traceId]);

  const categories = useMemo(() => {
    const seen = new Set();
    const order = ["Economy", "Premium Economy", "Business", "First"];
    allFares.forEach((f) => seen.add(f.cabin));
    return order.filter((c) => seen.has(c));
  }, [allFares]);

  const resolvedCat = useMemo(() => {
    if (activeCat && categories.includes(activeCat)) return activeCat;
    if (
      selectedFareFamily?.cabin &&
      categories.includes(selectedFareFamily.cabin)
    )
      return selectedFareFamily.cabin;
    return categories[0] || "Economy";
  }, [activeCat, categories, selectedFareFamily]);

  const catFares = useMemo(
    () => allFares.filter((f) => f.cabin === resolvedCat),
    [allFares, resolvedCat]
  );

  // Show business extras only for Business / First cabins
  const featureGroups = useMemo(() => {
    const isBusinessOrFirst =
      resolvedCat === "Business" || resolvedCat === "First";
    if (isBusinessOrFirst) return FEATURE_GROUPS;
    return FEATURE_GROUPS.filter(
      (g) =>
        g.group !== "Extras" || g.features.some((f) => f.key === "upgrade")
    );
  }, [resolvedCat]);

  const airlineRemark = allFares[0]?.airlineRemark || "";

  const routeInfo = useMemo(() => {
    const first = allFares[0];
    if (!first) return {};
    const segs = first.segments;
    const origin = segs[0]?.Origin?.Airport;
    const dest = segs[segs.length - 1]?.Destination?.Airport;
    const airline = segs[0]?.Airline?.AirlineName;
    const flightNos = segs
      .map((s) => s.Airline?.AirlineCode + s.Airline?.FlightNumber)
      .join(" + ");
    const depDate = segs[0]?.Origin?.DepTime
      ? new Date(segs[0].Origin.DepTime).toLocaleDateString("en-IN", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "";
    return { origin, dest, airline, flightNos, depDate };
  }, [allFares]);

  // Carousel controls
  const totalCards = catFares.length;
  const maxIndex = Math.max(0, totalCards - CARDS_PER_VIEW);
  const visibleFares = catFares.slice(
    currentIndex,
    currentIndex + CARDS_PER_VIEW
  );

  const canScrollPrev = currentIndex > 0;
  const canScrollNext = currentIndex < maxIndex;

  const handlePrev = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => Math.min(maxIndex, prev + 1));
  };

  // Reset carousel index when category changes or data changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [resolvedCat, catFares]);

  function handleSelect(fare) {
    const selectedResult = fare?.rawResult;
    if (!selectedResult) return;

    const passengers = getPassengerCounts(searchPayload);
    const isInternational = isInternationalFlight(selectedResult);

    dispatch(selectFareFamily(fare));

    if (activeJourneyType === 3) {
      navigate("/multi-city-flight/booking", {
        state: {
          selectedFlight: selectedResult,
          rawFlightData: selectedResult,
          searchParams: { traceId, passengers },
          tripType: "multi-city",
          isInternational,
        },
      });
      onClose();
      return;
    }

    if (activeJourneyType === 2) {
      navigate("/round-trip-flight/booking", {
        state: {
          rawFlightData: isGroupedRoundTrip(selectedResult)
            ? selectedResult
            : { onward: selectedResult, return: selectedResult },
          traceId,
          journeyType: 2,
          isInternational,
          passengers,
        },
      });
      onClose();
      return;
    }

    navigate("/one-way-flight/booking", {
      state: {
        selectedFlight: selectedResult,
        rawFlightData: selectedResult,
        searchParams: { traceId, passengers },
        tripType: "one-way",
        isInternational,
      },
    });
    onClose();
  }

  if (!isOpen) return null;

  const cfg = CABIN_CFG[resolvedCat] || CABIN_CFG.Economy;

  const popularIdx =
    resolvedCat === "Economy" || resolvedCat === "Premium Economy" ? 1 : 0;

  const tabIcons = {
    Economy: <MdFlight size={13} />,
    "Premium Economy": <MdAirlineSeatReclineExtra size={13} />,
    Business: <MdWorkspacePremium size={13} />,
    First: <BsStarFill size={11} />,
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-start justify-center overflow-y-auto py-4 px-2"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-5xl shadow-xl overflow-hidden my-2">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-200 bg-white">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-[15px] font-semibold text-gray-800">
                Choose your fare
              </h2>
              {routeInfo.origin && <CabinBadge cabin={resolvedCat} />}
            </div>

            {routeInfo.origin && (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2">
                <span className="text-[13px] font-semibold text-gray-800">
                  {routeInfo.origin.CityName}
                  <span className="text-gray-500 font-normal ml-1">
                    ({routeInfo.origin.AirportCode})
                  </span>
                  <span className="mx-2 text-gray-400">→</span>
                  {routeInfo.dest.CityName}
                  <span className="text-gray-500 font-normal ml-1">
                    ({routeInfo.dest.AirportCode})
                  </span>
                </span>
                <span className="text-gray-300">·</span>
                <span className="text-[11px] text-gray-600 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded">
                  {routeInfo.airline}
                </span>
                <span className="text-[11px] text-gray-600 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded font-mono tracking-tight">
                  {routeInfo.flightNos}
                </span>
                <span className="text-[11px] text-gray-600 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded">
                  {routeInfo.depDate}
                </span>
              </div>
            )}

            {allFares[0] && <SegmentRow segments={allFares[0].segments} />}
          </div>

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100 shrink-0"
          >
            <MdClose size={18} />
          </button>
        </div>

        {/* Airline remark */}
        {airlineRemark && (
          <div className="mx-5 mt-3 flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 border-l-4 border-l-amber-500 rounded-r-lg">
            <MdInfo className="text-amber-600 shrink-0 mt-px" size={14} />
            <p className="text-[11.5px] text-amber-800 leading-snug">
              {airlineRemark}
            </p>
          </div>
        )}

        {/* Cabin tabs */}
        {categories.length > 1 && (
          <div className="flex gap-2 px-5 pt-3 pb-0 overflow-x-auto scrollbar-none">
            {categories.map((cat) => {
              const isActive = resolvedCat === cat;
              const count = allFares.filter((f) => f.cabin === cat).length;
              const catCfg = CABIN_CFG[cat] || CABIN_CFG.Economy;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCat(cat)}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11.5px] font-medium border transition-all whitespace-nowrap
                    ${
                      isActive
                        ? catCfg.tab
                        : "text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                >
                  {tabIcons[cat]}
                  {cat}
                  <span
                    className={`text-[10px] ${isActive ? "opacity-70" : "text-gray-400"}`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Carousel area */}
        <div className="p-5">
          {catFares.length === 0 ? (
            <div className="py-16 text-center">
              <MdFlight className="mx-auto mb-3 text-gray-300" size={40} />
              <p className="font-medium text-gray-500">
                No fare options available for {resolvedCat}
              </p>
              <p className="text-sm mt-1 text-gray-400">
                Please select a different cabin class above.
              </p>
            </div>
          ) : (
            <div className="relative">
              {/* Cards container */}
              <div
                ref={cardContainerRef}
                className="grid gap-4"
                style={{
                  gridTemplateColumns: `repeat(${CARDS_PER_VIEW}, minmax(0, 1fr))`,
                }}
              >
                {visibleFares.map((fare, idx) => {
                  const globalIdx = currentIndex + idx;
                  const isSelected =
                    selectedFareFamily?.id === fare.id ||
                    selectedFareFamily?.ResultIndex === fare.id;
                  const isPopular = globalIdx === popularIdx;

                  return (
                    <FareCard
                      key={fare.id}
                      fare={fare}
                      cfg={cfg}
                      isSelected={isSelected}
                      isPopular={isPopular}
                      onSelect={handleSelect}
                      featureGroups={featureGroups}
                    />
                  );
                })}
              </div>

              {/* Navigation arrows */}
              {totalCards > CARDS_PER_VIEW && (
                <>
                  <button
                    onClick={handlePrev}
                    disabled={!canScrollPrev}
                    className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-8 h-8 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center transition-all ${
                      canScrollPrev
                        ? "text-gray-700 hover:bg-gray-50 hover:shadow-lg"
                        : "text-gray-300 cursor-not-allowed opacity-50"
                    }`}
                    aria-label="Previous fares"
                  >
                    <MdChevronLeft size={20} />
                  </button>
                  <button
                    onClick={handleNext}
                    disabled={!canScrollNext}
                    className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-8 h-8 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center transition-all ${
                      canScrollNext
                        ? "text-gray-700 hover:bg-gray-50 hover:shadow-lg"
                        : "text-gray-300 cursor-not-allowed opacity-50"
                    }`}
                    aria-label="Next fares"
                  >
                    <MdChevronRight size={20} />
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex flex-wrap items-center justify-between gap-y-2">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
            <span className="flex items-center gap-1.5 text-[11px] text-gray-600">
              <span className="inline-flex items-center justify-center size-[16px] rounded-full bg-emerald-100">
                <MdCheck size={10} className="text-emerald-600" />
              </span>
              Included free
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-gray-600">
              <span className="inline-flex items-center justify-center size-[16px] rounded-full bg-amber-100">
                <MdCurrencyRupee size={9} className="text-amber-600" />
              </span>
              Available at extra cost
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-gray-600">
              <span className="inline-flex items-center justify-center size-[16px]">
                <MdRemove size={12} className="text-gray-400" />
              </span>
              Not available
            </span>
          </div>

          <div className="flex items-center gap-3 text-[10.5px] text-gray-500">
            <span className="text-gray-300">·</span>
            <span>
              Last ticket:{" "}
              <span className="text-gray-700 font-medium">
                {allFares[0]?.lastTicketDate
                  ? new Date(allFares[0].lastTicketDate).toLocaleDateString(
                      "en-IN",
                      {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      }
                    )
                  : "—"}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
