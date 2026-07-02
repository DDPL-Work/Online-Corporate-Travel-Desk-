import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  FiAlertCircle,
  FiArrowLeft,
  FiCheckCircle,
  FiChevronDown,
  FiChevronUp,
  FiClock,
  FiFileText,
  FiLoader,
  FiRefreshCw,
  FiSend,
  FiShield,
  FiX,
} from "react-icons/fi";
import { toast } from "react-toastify";
import {
  checkReissueEligibility,
  confirmReissueRequest,
  createOfflineReissueRequest,
  createReissueRequest,
  previewReissueQuote,
  searchOfflineReissueOptions,
} from "../../Redux/Actions/reissueThunks";
import CustomDatePicker from "../Shared/CustomDatePicker";
import {
  clearEligibility,
  clearOfflineSearchState,
  resetOfflineState,
  resetReissueState,
} from "../../Redux/Slice/reissueSlice";
import { fetchMyBookingById } from "../../Redux/Actions/booking.thunks";
import { airlineLogo } from "../../utils/formatter";

const STEP = {
  FORM: "FORM",
  SEARCH_RESULTS: "SEARCH_RESULTS",
  FARE_QUOTE: "FARE_QUOTE",
  CONFIRMATION: "CONFIRMATION",
  PROCESSING: "PROCESSING",
  SUCCESS: "SUCCESS",
};

const OFFLINE_SEARCH_FALLBACK_MESSAGE =
  "We could not automatically load alternative flights for this booking. You can still submit an offline reissue request.";
const PLACEHOLDER = "--";

const toArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.flat(Infinity).filter(Boolean);
  return [value].filter(Boolean);
};

const formatFlightTime = (value) => {
  if (!value) return PLACEHOLDER;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return PLACEHOLDER;
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const formatDate = (value) => {
  if (!value) return PLACEHOLDER;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return PLACEHOLDER;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (value) => {
  if (!value) return PLACEHOLDER;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return PLACEHOLDER;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatMoney = (value, currency = "INR") => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "N/A";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatStops = (stops) => {
  if (Number(stops) <= 0) return "Non-stop";
  if (Number(stops) === 1) return "1 stop";
  return `${stops} stops`;
};

const formatDuration = (value) => {
  // Offline API returns a pre-formatted string e.g. "1h 50m" — pass through directly
  if (typeof value === "string" && value && !/^\d+$/.test(value.trim())) return value;
  const totalMinutes = Number(value);
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return null;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
};

// Calculate layover minutes between two ISO datetime strings
const calcLayoverMinutes = (prevArrival, nextDeparture) => {
  if (!prevArrival || !nextDeparture) return null;
  const diff = new Date(nextDeparture).getTime() - new Date(prevArrival).getTime();
  if (!Number.isFinite(diff) || diff <= 0) return null;
  return Math.round(diff / 60000);
};

const getCabinLabel = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "Economy";
  if (normalized.includes("business")) return "Business";
  if (normalized.includes("premium economy")) return "Premium Economy";
  if (normalized.includes("first")) return "First Class";
  return "Economy";
};

const getSegmentAirport = (segment, side) =>
  segment?.[side]?.Airport?.AirportCode ||
  segment?.[side]?.AirportCode ||
  segment?.[side]?.airportCode ||
  segment?.[side?.toLowerCase?.()] ||
  null;

const getSegmentTime = (segment, side) =>
  segment?.[side === "Origin" ? "Origin" : "Destination"]?.[side === "Origin" ? "DepTime" : "ArrTime"] ||
  segment?.[side === "Origin" ? "departureTime" : "arrivalTime"] ||
  segment?.[side === "Origin" ? "departureDateTime" : "arrivalDateTime"] ||
  null;

const getDurationFromSegments = (segments) =>
  toArray(segments).reduce((total, segment) => {
    const value = Number(segment?.Duration || segment?.durationMinutes || segment?.duration || 0);
    return Number.isFinite(value) ? total + value : total;
  }, 0);

const normalizeOnlineFlightOptions = ({ rawResults, oldFare }) => {
  return toArray(rawResults).map((result, index) => {
    // TBO Results structure: Results = [[seg1, seg2, ...]] (one-way) or [[onward...], [return...]]
    // Segments field: Segments = [[seg1, seg2]] — first element is the segments array for the journey
    const rawSegs = result?.Segments;
    const segments = toArray(
      Array.isArray(rawSegs?.[0]) ? rawSegs[0] : (rawSegs || [])
    );
    const first = segments[0] || {};
    const last = segments[segments.length - 1] || first;
    const newFare = Number(
      result?.Fare?.PublishedFare ??
        result?.Fare?.OfferedFare ??
        result?.Fare?.BaseFare ??
        0,
    );
    const supplierCharge = Number(
      result?.Fare?.SupplierReissueCharges ??
        result?.SupplierReissueCharges ??
        0,
    );
    const fareDifference = Math.max(newFare - Number(oldFare || 0), 0);
    const totalCollection = fareDifference + supplierCharge;
    const noOfSeats = result?.NoOfSeatAvailable ?? null;

    return {
      id: `${result?.ResultIndex ?? index}`,
      resultIndex: result?.ResultIndex ?? index,
      raw: result,
      airlineCode: first?.Airline?.AirlineCode || first?.AirlineCode || "",
      airlineName: first?.Airline?.AirlineName || first?.AirlineName || "Airline",
      flightNumber: first?.Airline?.FlightNumber || first?.FlightNumber || "",
      origin: getSegmentAirport(first, "Origin") || PLACEHOLDER,
      destination: getSegmentAirport(last, "Destination") || PLACEHOLDER,
      departureDate: getSegmentTime(first, "Origin"),
      departureTime: getSegmentTime(first, "Origin"),
      arrivalTime: getSegmentTime(last, "Destination"),
      durationMinutes: getDurationFromSegments(segments),
      duration: formatDuration(getDurationFromSegments(segments)),
      stops: Math.max(segments.length - 1, 0),
      noOfSeatAvailable: noOfSeats,
      lowSeatWarning: noOfSeats !== null && Number(noOfSeats) <= 3,
      cabin: getCabinLabel(
        result?.Fare?.CabinClass ||
          first?.CabinClass ||
          result?.ResultFareType,
      ),
      baggage:
        first?.Baggage ||
        first?.CabinBaggage ||
        result?.Fare?.BaggageAllowance ||
        PLACEHOLDER,
      oldFare: Number(oldFare || 0),
      newFare,
      fareDifference,
      reissueCharge: supplierCharge,
      totalCollection,
      currency: result?.Fare?.Currency || "INR",
      isNdc: !!(result?.SupplierFareClass || result?.FareClassification?.Type),
      fareBadge: result?.SupplierFareClass || result?.ResultFareType || null,
      segments: segments.map((segment) => ({
        origin: getSegmentAirport(segment, "Origin"),
        destination: getSegmentAirport(segment, "Destination"),
        departureTime: getSegmentTime(segment, "Origin"),
        arrivalTime: getSegmentTime(segment, "Destination"),
        airlineCode: segment?.Airline?.AirlineCode || "",
        airlineName: segment?.Airline?.AirlineName || "Airline",
        flightNumber: segment?.Airline?.FlightNumber || segment?.FlightNumber || "",
        duration: segment?.Duration ? formatDuration(segment.Duration) : null,
        baggage: segment?.Baggage || segment?.CabinBaggage || null,
      })),
    };
  });
};

const extractRuleMessages = (rules) => {
  if (!rules) return [];
  const ruleArray = Array.isArray(rules) ? rules : Object.values(rules);
  return ruleArray
    .map((rule) => {
      if (!rule) return null;
      if (typeof rule === "string") return rule;
      return (
        rule?.Description ||
        rule?.Details ||
        rule?.Detail ||
        null
      );
    })
    .filter(Boolean)
    .slice(0, 4);
};

function StepBadge({ active, complete, label, number, isFirst, isLast }) {
  return (
    <div className="relative flex flex-col items-center flex-1 text-center">
      {!isFirst && (
        <div className={`absolute top-3 w-full right-[50%] h-0.5 ${complete || active ? "bg-[#003399]" : "bg-slate-200"}`} />
      )}
      
      <div
        className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all ${
          complete
            ? "bg-[#003399] border-[#003399] text-white"
            : active
              ? "bg-white border-[#003399] text-[#003399] shadow-[0_0_0_3px_rgba(0,51,153,0.1)]"
              : "bg-white border-slate-200 text-slate-400"
        }`}
      >
        {complete ? <FiCheckCircle size={12} /> : <span className="text-[10px] font-black">{number}</span>}
      </div>
      
      <span className={`mt-2 text-[10px] font-bold uppercase tracking-[0.18em] ${active ? "text-[#003399]" : complete ? "text-slate-700" : "text-slate-400"}`}>
        {label}
      </span>
    </div>
  );
}

function PricingRow({ label, value, strong = false }) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className={strong ? "font-semibold text-slate-800" : "text-slate-500"}>
        {label}
      </span>
      <span className={strong ? "font-bold text-slate-900" : "font-semibold text-slate-700"}>
        {value}
      </span>
    </div>
  );
}

/** Signed adjustment row: negative = red, positive = normal. Shows +/− prefix. */
function PricingAdjustmentRow({ label, rawAmount, currency, helpText, forcePositive = false }) {
  const amt = Number(rawAmount);
  const isNeg = !forcePositive && amt < 0;
  const isPos = forcePositive || amt > 0;
  const prefix = isNeg ? "−" : isPos ? "+" : "";
  const colour = isNeg ? "text-rose-600" : isPos ? "text-emerald-700" : "text-slate-500";
  return (
    <div>
      <div className="flex items-start justify-between gap-2 text-xs">
        <span className="text-slate-500 leading-snug">{label}</span>
        <span className={`font-semibold shrink-0 ${colour}`}>
          {prefix}{formatMoney(Math.abs(amt), currency)}
        </span>
      </div>
      {helpText && (
        <p className="text-[9px] leading-tight text-slate-400">{helpText}</p>
      )}
    </div>
  );
}

/** Section divider with label for the new sectioned pricing layout. */
function PricingSection({ label }) {
  return (
    <p className="pt-1 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">{label}</p>
  );
}

function FlightOptionCard({
  option,
  selected,
  expanded,
  onToggleDetails,
  onSelect,
  mode,
}) {
  const hasTimings = option.departureTime && option.arrivalTime;
  const depTime = hasTimings ? formatFlightTime(option.departureTime) : PLACEHOLDER;
  const arrTime = hasTimings ? formatFlightTime(option.arrivalTime) : PLACEHOLDER;
  const travelDate = hasTimings ? formatDate(option.departureTime) : formatDate(option.departureDate);
  const departureDateStr = hasTimings ? formatDate(option.departureTime) : travelDate;
  const arrivalDateStr = hasTimings ? formatDate(option.arrivalTime) : travelDate;

  const firstSeg = option.segments?.[0];
  const lastSeg = option.segments?.[option.segments.length - 1] || firstSeg;

  const originCity = option.originCity || firstSeg?.origin?.city;
  const originAirportName = option.originAirportName || firstSeg?.origin?.name;
  const originTerminal = option.originTerminal || firstSeg?.origin?.terminal;

  const destCity = option.destinationCity || lastSeg?.destination?.city;
  const destAirportName = option.destinationAirportName || lastSeg?.destination?.name;
  const destTerminal = option.destinationTerminal || lastSeg?.destination?.terminal;

  const supplier = option.supplier || firstSeg?.supplierFareClass;
  const fareClass = option.fareClass || firstSeg?.fareClass;
  const cabinClass = option.cabin || option.cabinClass;

  const layoversList = option.layovers || (
    option.segments?.length > 1
      ? option.segments.slice(0, -1).map(s => s.destination?.code || s.destination?.name || s.destination)
      : []
  );

  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm transition ${
        selected
          ? "border-[#003399] bg-[#f4fbff] shadow-[0_18px_50px_rgba(0,51,153,0.12)]"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        {/* LEFT — Flight identity + schedule */}
        <div className="min-w-0 flex-1">
          {/* Top row: Airline & Pills */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src={airlineLogo(option.airlineCode)}
                alt={option.airlineCode || "Airline"}
                className="h-10 w-10 shrink-0 rounded-xl border border-slate-200 bg-white object-contain p-1.5 shadow-sm" loading="eager" />
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <p className="text-base font-bold text-slate-800">
                    {option.airlineName || option.airlineCode || "Airline"}
                  </p>
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-emerald-600">
                    Confirmed
                  </span>
                  {option.isNdc && (
                    <span className="rounded-full bg-gradient-to-r from-violet-600 to-purple-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
                      NDC
                    </span>
                  )}
                </div>
                <p className="text-[13px] font-medium text-slate-500">
                  {option.airlineCode || PLACEHOLDER}{option.flightNumber ? `-${option.flightNumber}` : ""}
                </p>
              </div>
            </div>

            {/* Top Right Pills */}
            <div className="flex flex-wrap items-center gap-2">
              {cabinClass && (
                <span className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold uppercase text-slate-700 shadow-sm">
                  <span className="text-amber-500">💺</span> {cabinClass}
                </span>
              )}
              {option.noOfSeatAvailable && (
                <span className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold uppercase text-amber-700 shadow-sm">
                  <span className="text-amber-600">🪑</span> {option.noOfSeatAvailable} SEATS LEFT
                </span>
              )}
            </div>
          </div>

          {/* Main schedule block */}
          <div className="mt-6 flex items-start gap-4">
            {/* Origin */}
            <div className="flex w-36 shrink-0 flex-col gap-0.5">
              <p className="text-2xl font-black text-slate-900">{depTime}</p>
              <p className="text-[13px] font-bold text-amber-600">
                {departureDateStr && departureDateStr !== PLACEHOLDER ? departureDateStr : travelDate}
              </p>
              <p className="mt-1 text-sm font-bold text-slate-800">
                {originCity || option.origin || PLACEHOLDER}, India
              </p>
              {originAirportName && (
                <p className="text-xs font-medium text-slate-500">({originAirportName})</p>
              )}
              {originTerminal && (
                <div className="mt-1.5 inline-flex w-fit items-center rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-slate-500">
                  T-{originTerminal.replace(/[^0-9]/g, "") || originTerminal}
                </div>
              )}
            </div>

            {/* Arrow + duration */}
            <div className="flex flex-1 flex-col items-center justify-center pt-2">
              <div className="relative flex w-full max-w-[200px] items-center">
                <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-amber-200 to-transparent" />
                <div className="absolute left-1/2 flex -translate-x-1/2 items-center justify-center rounded-full border border-slate-200 bg-white p-1.5 shadow-sm">
                  <span className="rotate-90 text-[14px] text-amber-500 leading-none" style={{ transform: "rotate(90deg) translateY(-1px)" }}>✈</span>
                </div>
              </div>
              <p className="mt-3 text-[12px] font-bold text-slate-500">
                {option.duration || ""}
              </p>
              <span className={`mt-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${option.stops === 0 ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                {formatStops(option.stops)}
              </span>
              {(layoversList && layoversList.length > 0) && (
                <p className="mt-1 text-[10px] font-medium text-amber-600">
                  Layover: {Array.isArray(layoversList) ? layoversList.map(l => l?.airportCode || l).join(", ") : layoversList}
                </p>
              )}
            </div>

            {/* Destination */}
            <div className="flex w-36 shrink-0 flex-col items-end gap-0.5 text-right">
              <p className="text-2xl font-black text-slate-900">{arrTime}</p>
              <p className="text-[13px] font-bold text-amber-600">
                {arrivalDateStr && arrivalDateStr !== PLACEHOLDER ? arrivalDateStr : travelDate}
              </p>
              <p className="mt-1 text-sm font-bold text-slate-800">
                {destCity || option.destination || PLACEHOLDER}, India
              </p>
              {destAirportName && (
                <p className="text-xs font-medium text-slate-500">({destAirportName})</p>
              )}
              {destTerminal && (
                <div className="mt-1.5 inline-flex w-fit items-center rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-slate-500">
                  T-{destTerminal.replace(/[^0-9]/g, "") || destTerminal}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT — Pricing panel (airline-grade sectioned breakdown) */}
        <div className="w-full rounded-xl border border-slate-100 bg-slate-50 p-3 lg:max-w-[300px] shrink-0 flex flex-col justify-between">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
            {mode === "ONLINE" ? "Online Reissue Estimate" : "Offline Reissue Estimate"}
          </p>
          {(() => {
            const previouslyPaid = Number(option.oldFare || 0);
            const newFlightFare  = Number(option.newFare ?? option.fare ?? 0);
            const penalty        = Number(option.reissueCharge || 0);
            const flightAdj      = newFlightFare - previouslyPaid;
            const netSettlement  = flightAdj + penalty;
            const isRefund       = netSettlement < 0;
            return (
              <div className="mt-2 space-y-1">
                {/* ── Section 1: Original Ticket Value ── */}
                <PricingSection label="Original Ticket Value" />
                <PricingRow label="Previously Paid" value={formatMoney(previouslyPaid, option.currency)} />
                <div className="my-1 border-t border-slate-200" />
                {/* ── Section 2: New Itinerary Cost ── */}
                <PricingSection label="New Itinerary Cost" />
                <PricingRow label="New Flight Fare" value={formatMoney(newFlightFare, option.currency)} />
                <div className="my-1 border-t border-slate-200" />
                {/* ── Section 3: Reissue Adjustments ── */}
                <PricingSection label="Reissue Adjustments" />
                <PricingAdjustmentRow
                  label="Flight Fare Adjustment"
                  rawAmount={flightAdj}
                  currency={option.currency}
                  helpText="Difference between previously ticketed fare and newly selected itinerary."
                />
                {penalty > 0 && (
                  <PricingAdjustmentRow
                    label="Airline Reissue Penalty"
                    rawAmount={penalty}
                    currency={option.currency}
                    helpText="Penalty charged by airline for ticket modification."
                    forcePositive
                  />
                )}
                {/* ── Section 4: Final Settlement ── */}
                <div className="mt-2 rounded-xl bg-white px-3 py-2 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    {isRefund ? "Refund Amount" : "Need to Pay"}
                  </p>
                  <p className={`mt-1 text-lg font-black ${isRefund ? "text-emerald-600" : "text-slate-900"}`}>
                    {formatMoney(Math.abs(netSettlement), option.currency)}
                  </p>
                </div>
              </div>
            );
          })()}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onToggleDetails}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {expanded ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
              {expanded ? "Hide Details" : "View Details"}
            </button>
            <button
              type="button"
              onClick={onSelect}
              className={`rounded-2xl px-4 py-2 text-sm font-bold transition ${
                selected
                  ? "bg-[#003399] text-white"
                  : "border border-[#003399] text-[#003399] hover:bg-[#eef8fc]"
              }`}
            >
              {selected ? "✓ Selected" : "Select Flight"}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded segment details with layovers */}
      {expanded && (
        <div className="mt-5 border-t border-slate-100 pt-5">
          {option.segments?.length ? (
            <div className="space-y-2">
              {option.segments.map((segment, index) => {
                const prevSeg = index > 0 ? option.segments[index - 1] : null;
                const layoverMins = prevSeg
                  ? calcLayoverMinutes(prevSeg.arrivalTime, segment.departureTime)
                  : null;
                return (
                  <div key={`${segment.origin?.code || segment.origin}-${segment.destination?.code || segment.destination}-${index}`}>
                    {layoverMins !== null && (
                      <div className="flex items-center gap-2 py-2 pl-4 text-xs font-semibold text-amber-700">
                        <span className="h-4 w-0.5 rounded bg-amber-300" />
                        Layover at {prevSeg?.destination?.code || prevSeg?.destination || ""}: {formatDuration(layoverMins)}
                      </div>
                    )}
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-slate-900">
                            {segment.origin?.code || segment.origin || PLACEHOLDER} → {segment.destination?.code || segment.destination || PLACEHOLDER}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {segment.airlineName || segment.airlineCode || "Airline"}
                            {segment.flightNumber ? ` · ${segment.flightNumber}` : ""}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-900">
                            {formatFlightTime(segment.departureTime)} → {formatFlightTime(segment.arrivalTime)}
                          </p>
                          {segment.duration && (
                            <p className="mt-0.5 text-xs text-slate-400">{segment.duration}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500">
              Detailed segment information is not available for this option.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProcessingState({ label }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#eef8fc] text-[#003399]">
        <FiLoader size={28} className="animate-spin" />
      </div>
      <div>
        <p className="text-lg font-black text-slate-900">{label}</p>
        <p className="mt-2 text-sm text-slate-500">
          Please keep this window open while we complete the reissue workflow.
        </p>
      </div>
    </div>
  );
}

export default function ReissueModal({ booking, onClose }) {
  const dispatch = useDispatch();
  const {
    eligibility,
    eligibilityLoading,
    eligibilityError,
    createLoading,
    quoteLoading,
    confirmLoading,
    requestDetail,
    offlineCreateLoading,
    offlineSearchResults,
    offlineSearchPagination,
    offlineSearchLoading,
    offlineSearchError,
  } = useSelector((state) => state.reissue);

  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [currentStep, setCurrentStep] = useState(STEP.FORM);
  const [selectedOption, setSelectedOption] = useState(null);
  const [expandedOptionId, setExpandedOptionId] = useState(null);
  const [searchPage, setSearchPage] = useState(1);
  const [offlineSearchId, setOfflineSearchId] = useState(null);
  const [offlineFallback, setOfflineFallback] = useState(null);
  const [onlineSearchPayload, setOnlineSearchPayload] = useState(null);
  const [onlineOptions, setOnlineOptions] = useState([]);
  const [quoteSnapshot, setQuoteSnapshot] = useState(null);
  const [processingLabel, setProcessingLabel] = useState("Processing reissue...");
  const [successSnapshot, setSuccessSnapshot] = useState(null);

  const travelDateISO =
    booking?.bookingSnapshot?.sectors?.[0]?.departureTime ||
    booking?.bookingResult?.sectors?.[0]?.departureTime ||
    booking?.journeyDate ||
    new Date().toISOString();
  const minTravelDate = travelDateISO.split("T")[0];

  const segments = Array.isArray(booking?.flightRequest?.segments)
    ? booking.flightRequest.segments
    : [];
  const isRoundTrip = segments.some(
    (segment) => (segment?.journeyType || "").toString().toLowerCase() === "return",
  );
  const oldFare = Number(booking?.pricingSnapshot?.totalAmount || 0);
  const isOnlineEligible = eligibility?.support?.onlineReissueAllowed === true;
  // CORRECT FLOW:
  // showOfflineFlow is driven EXCLUSIVELY by offlineFallback (set after the actual
  // API search attempt confirms online is unavailable). The eligibility badge informs
  // the user but does NOT prematurely switch the UI to offline mode.
  // This ensures: user clicks Search → API called → THEN mode is determined.
  const showOfflineFlow = Boolean(offlineFallback);

  useEffect(() => {
    if (booking?._id) {
      dispatch(checkReissueEligibility(booking._id));
    }

    return () => {
      dispatch(clearEligibility());
      dispatch(clearOfflineSearchState());
      dispatch(resetReissueState());
      dispatch(resetOfflineState());
    };
  }, [booking?._id, dispatch]);

  useEffect(() => {
    // Do NOT reset when in SUCCESS or PROCESSING — those are terminal/in-flight states
    // that must not be wiped by date or mode changes.
    if (currentStep === STEP.SUCCESS || currentStep === STEP.PROCESSING) return;

    setSelectedOption(null);
    setExpandedOptionId(null);
    setOnlineOptions([]);
    setQuoteSnapshot(null);
    setSuccessSnapshot(null);
    setOnlineSearchPayload(null);
    setCurrentStep(STEP.FORM);
    dispatch(clearOfflineSearchState());
  }, [departureDate, returnDate, showOfflineFlow, dispatch]);

  const quoteRules = useMemo(
    () => extractRuleMessages(quoteSnapshot?.miniFareRules),
    [quoteSnapshot?.miniFareRules],
  );

  const offlineSearchSummary = useMemo(() => {
    if (!selectedOption) return null;
    return {
      currency: selectedOption.currency || "INR",
      oldFare: selectedOption.oldFare,
      newFare: selectedOption.fare || selectedOption.newFare,
      fareDifference: selectedOption.fareDifference,
      reissueCharge: selectedOption.reissueCharge,
      totalCollection: selectedOption.totalEstimate,
    };
  }, [selectedOption]);

  const onlineQuoteSummary = useMemo(() => {
    if (!quoteSnapshot) return null;
    return {
      currency: quoteSnapshot?.billingReservation?.metadata?.currency || "INR",
      fareDifference: quoteSnapshot.fareDifference || 0,
      reissueCharge: quoteSnapshot.reissueCharges || 0,
              totalCollection: quoteSnapshot.totalAdjustment || 0,
    };
  }, [quoteSnapshot]);

  const canSearch =
    Boolean(departureDate) && (!isRoundTrip || Boolean(returnDate));
  const onlineStepIndex =
    currentStep === STEP.FORM
      ? 1
      : currentStep === STEP.SEARCH_RESULTS
        ? 2
        : currentStep === STEP.FARE_QUOTE
          ? 3
          : currentStep === STEP.CONFIRMATION
            ? 4
            : currentStep === STEP.PROCESSING
              ? 5
              : currentStep === STEP.SUCCESS
                ? 6
                : 1;

  const offlineStepIndex =
    currentStep === STEP.FORM
      ? 1
      : currentStep === STEP.SEARCH_RESULTS
        ? 2
        : currentStep === STEP.PROCESSING
          ? 3
          : currentStep === STEP.SUCCESS
            ? 4
            : 1;

  const handleOnlineSearch = async (event) => {
    event?.preventDefault?.();
    if (!canSearch) {
      toast.error("Please select the required travel dates first.");
      return;
    }

    try {
      const response = await dispatch(
        createReissueRequest({
          bookingId: booking._id,
          newJourney: {
            departureDate,
            ...(isRoundTrip ? { returnDate } : {}),
          },
          remarks: remarks || "User requested reissue",
        }),
      ).unwrap();

      const routedOffline =
        response?.mode === "OFFLINE" ||
        response?.status === "OFFLINE_REQUIRED" ||
        response?.success === false;

      if (routedOffline) {
        setOfflineFallback({
          message:
            response?.message ||
            "Online reissue is unavailable for this booking. Please continue with offline servicing.",
        });
        setCurrentStep(STEP.FORM);
        return;
      }

      const normalized = normalizeOnlineFlightOptions({
        rawResults: response?.flightOptions,
        oldFare,
      });

      if (!normalized.length) {
        toast.error("No online reissue options were returned for the selected dates.");
        return;
      }

      setOnlineSearchPayload({
        requestId: response.reissueRequestId,
        reissueId: response.reissueId,
        miniFareRules: response.miniFareRules || [],
      });
      setOnlineOptions(normalized);
      setSelectedOption(null);
      setQuoteSnapshot(null);
      setCurrentStep(STEP.SEARCH_RESULTS);
    } catch (error) {
      toast.error(error || "Failed to search reissue options");
    }
  };

  const handleOfflineSearch = async (page = 1) => {
    if (!canSearch) {
      toast.error("Please select the required travel dates first.");
      return;
    }

    try {
      const response = await dispatch(
        searchOfflineReissueOptions({
          bookingId: booking._id,
          departureDate,
          returnDate: returnDate || undefined,
          page,
          limit: 10,
        }),
      ).unwrap();

      setOfflineSearchId(response.searchId);
      setSearchPage(page);
      setCurrentStep(STEP.SEARCH_RESULTS);
      setSelectedOption((currentSelection) => {
        if (!currentSelection) return null;
        return (
          response.results?.find(
            (option) =>
              String(option.resultIndex) === String(currentSelection.resultIndex),
          ) || null
        );
      });
    } catch (error) {
      toast.error(error || OFFLINE_SEARCH_FALLBACK_MESSAGE);
    }
  };

  const handlePreviewQuote = async () => {
    if (!selectedOption || !onlineSearchPayload?.requestId) {
      toast.error("Please select a flight before continuing.");
      return;
    }

    try {
      const response = await dispatch(
        previewReissueQuote({
          requestId: onlineSearchPayload.requestId,
          resultIndex: selectedOption.resultIndex,
        }),
      ).unwrap();
      setQuoteSnapshot(response);
      setCurrentStep(STEP.FARE_QUOTE);
    } catch (error) {
      toast.error(error || "Failed to get the final fare quote");
    }
  };

  const handleConfirmOnlineReissue = async () => {
    if (!onlineSearchPayload?.requestId) {
      toast.error("Reissue request context is missing. Please search again.");
      return;
    }

    try {
      setProcessingLabel("Confirming your online reissue...");
      setCurrentStep(STEP.PROCESSING);
      const response = await dispatch(
        confirmReissueRequest({
          requestId: onlineSearchPayload.requestId,
          remarks: remarks.trim() || undefined,
        }),
      ).unwrap();

      setSuccessSnapshot({
        type: "ONLINE",
        requestId: response.reissueId,
        pnr:
          response?.newPnr ||
          quoteSnapshot?.originalPnr ||
          booking?.pnr ||
          booking?.bookingResult?.pnr ||
          PLACEHOLDER,
      });
      await dispatch(fetchMyBookingById(booking._id));
      setCurrentStep(STEP.SUCCESS);
    } catch (error) {
      setCurrentStep(STEP.CONFIRMATION);
      toast.error(error || "Failed to confirm the reissue request");
    }
  };

  const submitOfflineRequest = async () => {
    if (!selectedOption) {
      toast.error("Please select a replacement flight before submitting.");
      return;
    }

    try {
      setProcessingLabel("Submitting your offline reissue request...");
      setCurrentStep(STEP.PROCESSING);
      const response = await dispatch(
        createOfflineReissueRequest({
          bookingId: booking._id,
          preferredDate: departureDate,
          remarks: remarks || "Employee requested offline reissue",
          preferredFlight: {
            searchId: offlineSearchId,
            resultIndex: selectedOption.resultIndex,
            departureDate,
            returnDate: returnDate || undefined,
          },
        }),
      ).unwrap();

      setSuccessSnapshot({
        type: "OFFLINE",
        requestId: response.requestId,
        pnr: booking?.bookingResult?.pnr || booking?.pnr || PLACEHOLDER,
      });
      await dispatch(fetchMyBookingById(booking._id));
      setCurrentStep(STEP.SUCCESS);
    } catch (error) {
      setCurrentStep(STEP.SEARCH_RESULTS);
      const message = error?.message || error;
      if (error?.code === "OFFLINE_REISSUE_ALREADY_EXISTS") {
        toast.error(
          `${message} Existing request ${error?.data?.existingRequestId || ""}`.trim(),
        );
      } else {
        toast.error(message || "Failed to submit the offline reissue request.");
      }
    }
  };

  const renderSidebarSummary = () => {
    if (!selectedOption) {
      return (
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-start gap-3">
            <FiClock className="mt-0.5 shrink-0 text-slate-400" size={16} />
            <div>
              <p className="text-sm font-bold text-slate-900">
                {showOfflineFlow ? "Search replacement flights" : "Search online reissue options"}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {showOfflineFlow
                  ? "Select one replacement flight before you can submit the request to operations."
                  : "We will load reissue-eligible flight options with fare difference and airline reissue penalty."}
              </p>
            </div>
          </div>
        </div>
      );
    }

    const summary = showOfflineFlow ? offlineSearchSummary : onlineQuoteSummary || selectedOption;
    const currency = summary?.currency || selectedOption.currency || "INR";

    return (
      <div className="rounded-3xl border border-[#003399]/20 bg-[linear-gradient(180deg,#f8fdff_0%,#eef8fc_100%)] p-4">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#003399]">
          Selected Flight
        </p>
        <p className="mt-3 text-lg font-black text-slate-900">
          {selectedOption.airlineName || selectedOption.airlineCode || "Airline"}{" "}
          {selectedOption.airlineCode || ""} {selectedOption.flightNumber || ""}
        </p>
        <p className="mt-2 text-sm font-semibold text-slate-700">
          {selectedOption.origin || PLACEHOLDER} {"->"} {selectedOption.destination || PLACEHOLDER}
        </p>
        <p className="mt-1 text-sm text-slate-600">
          {formatFlightTime(selectedOption.departureTime)} {"->"} {formatFlightTime(selectedOption.arrivalTime)}
        </p>
        {(() => {
          const previouslyPaid = Number(summary?.alreadyPaid ?? summary?.previouslyPaid ?? summary?.oldFare ?? selectedOption.oldFare ?? 0);
          const newFlightFare  = Number(summary?.newFare ?? selectedOption.newFare ?? selectedOption.fare ?? 0);
          const newSSR         = Number(summary?.newSSR ?? summary?.newSSRTotal ?? 0);
          const penalty        = Number(summary?.airlinePenalty ?? summary?.reissueCharge ?? summary?.airlineReissuePenalty ?? selectedOption.reissueCharge ?? 0);
          const flightAdj      = summary?.flightAdjustment != null ? Number(summary.flightAdjustment) : newFlightFare - previouslyPaid;
          const rawNet         = summary?.netPayable ?? summary?.totalCollection ?? summary?.totalEstimate ?? selectedOption.totalCollection;
          const netSettlement  = rawNet != null ? Number(rawNet) : flightAdj + newSSR + penalty;
          const isRefund       = (summary?.isRefund) || netSettlement < 0;
          return (
            <div className="mt-4 space-y-1">
              {/* Section 1 */}
              <PricingSection label="Original Ticket Value" />
              <PricingRow label="Previously Paid" value={formatMoney(previouslyPaid, currency)} />
              <div className="my-2 border-t border-[#003399]/10" />
              {/* Section 2 */}
              <PricingSection label="New Itinerary Cost" />
              <PricingRow label="New Flight Fare" value={formatMoney(newFlightFare, currency)} />
              {newSSR > 0 && <PricingRow label="New SSR Total" value={formatMoney(newSSR, currency)} />}
              <div className="my-2 border-t border-[#003399]/10" />
              {/* Section 3 */}
              <PricingSection label="Reissue Adjustments" />
              <PricingAdjustmentRow
                label="Flight Fare Adjustment"
                rawAmount={flightAdj}
                currency={currency}
                helpText="Difference between previously ticketed fare and newly selected itinerary."
              />
              {penalty > 0 && (
                <PricingAdjustmentRow
                  label="Airline Reissue Penalty"
                  rawAmount={penalty}
                  currency={currency}
                  helpText="Penalty charged by airline for ticket modification."
                  forcePositive
                />
              )}
              {/* Section 4 */}
              <div className="mt-3 rounded-2xl bg-white px-4 py-3 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                  {isRefund ? "Refund Due" : "Net Additional Collection"}
                </p>
                <p className={`mt-2 text-2xl font-black ${isRefund ? "text-emerald-600" : "text-[#003399]"}`}>
                  {formatMoney(Math.abs(netSettlement), currency)}
                </p>
              </div>
            </div>
          );
        })()}
      </div>
    );
  };

  const renderOnlineQuoteStep = () => (
    <div className="space-y-5">
      <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-4">
        <div className="flex items-start gap-3">
          <FiShield className="mt-0.5 shrink-0 text-emerald-600" />
          <div>
            <p className="text-sm font-bold text-slate-900">Final fare quote ready</p>
            <p className="mt-1 text-sm text-slate-600">
              Review the final payable amount before continuing to confirmation.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
            Final Payable
          </p>
          <div className="mt-4 space-y-1.5">
            <PricingAdjustmentRow
              label="Flight Fare Adjustment"
              rawAmount={quoteSnapshot?.flightAdjustment ?? quoteSnapshot?.fareDifference}
              currency="INR"
              helpText="Difference between previously ticketed fare and newly selected itinerary."
            />
            {Number(quoteSnapshot?.reissueCharges ?? quoteSnapshot?.reissueCharge ?? 0) > 0 && (
              <PricingAdjustmentRow
                label="Airline Reissue Penalty"
                rawAmount={quoteSnapshot?.reissueCharges ?? quoteSnapshot?.reissueCharge}
                currency="INR"
                helpText="Penalty charged by airline for ticket modification."
                forcePositive
              />
            )}
            <div className="pt-1 border-t border-slate-100">
              <PricingRow
                label={quoteSnapshot?.isRefund ? "Refund Due" : "Net Additional Collection"}
                value={formatMoney(
                  quoteSnapshot?.netPayable ?? quoteSnapshot?.totalAdjustment,
                  "INR",
                )}
                strong
              />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
            Fare Conditions
          </p>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <p>Fare validity: Immediate confirmation recommended. Supplier validity timestamp was not returned.</p>
            <p>
              Billing reservation: {quoteSnapshot?.billingReservation?.status || "reserved"}
            </p>
            {quoteRules.length ? (
              quoteRules.map((rule, index) => (
                <div key={`${rule}-${index}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                  {rule}
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                Airline conditions will continue to apply as per the quoted fare rules and supplier reissue policy.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderConfirmationStep = () => (
    <div className="space-y-5">
      <div className="rounded-3xl border border-[#003399]/15 bg-[linear-gradient(180deg,#f8fdff_0%,#f1f8fb_100%)] p-5">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#003399]">
          Confirmation Summary
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              Selected Flight
            </p>
            <p className="mt-2 text-sm font-bold text-slate-900">
              {selectedOption?.airlineName || selectedOption?.airlineCode || "Airline"}{" "}
              {selectedOption?.flightNumber || ""}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {selectedOption?.origin || PLACEHOLDER} {"->"} {selectedOption?.destination || PLACEHOLDER}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {formatDate(selectedOption?.departureDate)} {"|"} {formatFlightTime(selectedOption?.departureTime)}
            </p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              Final Payable
            </p>
            <p className="mt-2 text-2xl font-black text-slate-900">
              {formatMoney(quoteSnapshot?.totalAdjustment, "INR")}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              PNR continuity retained: {booking?.bookingResult?.pnr || booking?.pnr || PLACEHOLDER}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSuccessStep = () => (
    <div className="flex flex-col items-center justify-center gap-5 py-20 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
        <FiCheckCircle size={38} />
      </div>
      <div>
        <p className="text-2xl font-black text-slate-900">
          {successSnapshot?.type === "ONLINE"
            ? "Your reissue has been completed"
            : "Your offline reissue request has been submitted"}
        </p>
        <p className="mt-2 text-sm text-slate-500">
          {successSnapshot?.type === "ONLINE"
            ? "Your booking has been refreshed and the latest ticket will remain available from the same booking page."
            : "Our servicing team will continue processing the selected replacement flight under the same booking journey."}
        </p>
      </div>
      <div className="rounded-3xl border border-slate-200 bg-slate-50 px-6 py-5 text-left">
        <PricingRow label="Reference" value={successSnapshot?.requestId || PLACEHOLDER} />
        <PricingRow label="Active PNR" value={successSnapshot?.pnr || PLACEHOLDER} />
      </div>
    </div>
  );

  const modalTitle = showOfflineFlow ? "Offline Reissue Request" : "Reissue Flight";
  // Header message logic:
  // - If offline fallback is active: show the reason from the API
  // - If online eligible: show online confirmation
  // - If not online eligible but no fallback yet: inform user that online check will run on Search
  const headerMessage = showOfflineFlow
    ? offlineFallback?.message ||
      "Online reissue is unavailable for this booking. Choose a preferred date, review replacement flights, and submit the request for operations processing."
    : isOnlineEligible
      ? "This booking supports online reissue. Search, select, quote, and confirm in one flow."
      : "We will attempt an online reissue search. If unavailable, you will be guided through offline servicing.";

  const showBackButton =
    !showOfflineFlow &&
    [STEP.SEARCH_RESULTS, STEP.FARE_QUOTE, STEP.CONFIRMATION].includes(currentStep);

  return createPortal(
    <div className="fixed inset-0 z-99999 flex items-center justify-center p-4 bg-[#1A1C20]/60 backdrop-blur-md overflow-y-auto">
      <div className="bg-white rounded-4xl shadow-2xl w-full max-w-6xl my-2 overflow-hidden flex flex-col max-h-[96vh]">
        <div className="bg-linear-to-r from-[#003399] to-[#000d26] px-6 py-4 text-white flex justify-between items-center shrink-0 shadow-lg relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#C9A84C]/20 rounded-lg text-[#C9A84C]">
              <FiRefreshCw size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight uppercase">
                {modalTitle}
              </h2>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5 tracking-widest">
                Order ID: {booking?.bookingReference || booking?.orderId || booking?._id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-white/10 p-2 rounded-full transition-colors text-slate-400"
          >
            <FiX size={22} />
          </button>
        </div>

        {showOfflineFlow ? (
          <div className="border-b border-slate-200 bg-slate-50/50 px-5 py-6 sm:px-10 shrink-0 overflow-hidden">
            <div className="flex w-full items-start justify-between">
              <StepBadge number="1" label="Select Date" active={offlineStepIndex === 1} complete={offlineStepIndex > 1} isFirst={true} />
              <StepBadge number="2" label="Search Flights" active={offlineStepIndex === 2} complete={offlineStepIndex > 2} />
              <StepBadge number="3" label="Submit Request" active={offlineStepIndex === 3} complete={offlineStepIndex > 3} />
              <StepBadge number="4" label="Success" active={offlineStepIndex === 4} complete={false} isLast={true} />
            </div>
          </div>
        ) : (
          <div className="border-b border-slate-200 bg-slate-50/50 px-5 py-6 sm:px-10 shrink-0 overflow-hidden">
            <div className="flex w-full items-start justify-between">
              <StepBadge number="1" label="Select Date" active={onlineStepIndex === 1} complete={onlineStepIndex > 1} isFirst={true} />
              <StepBadge number="2" label="Search Flights" active={onlineStepIndex === 2} complete={onlineStepIndex > 2} />
              <StepBadge number="3" label="Fare Quote" active={onlineStepIndex === 3} complete={onlineStepIndex > 3} />
              <StepBadge number="4" label="Confirm & Pay" active={onlineStepIndex === 4} complete={onlineStepIndex > 4} />
              <StepBadge number="5" label="Submit Request" active={onlineStepIndex === 5} complete={onlineStepIndex > 5} />
              <StepBadge number="6" label="Success" active={onlineStepIndex === 6} complete={false} isLast={true} />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6 space-y-6 custom-scrollbar">
          {eligibilityLoading && (
            <div className="flex flex-col items-center justify-center gap-3 py-20">
              <FiLoader size={28} className="animate-spin text-[#003399]" />
              <p className="text-sm font-medium text-slate-500">
                Checking reissue eligibility for this booking...
              </p>
            </div>
          )}

          {!eligibilityLoading && eligibilityError && (
            <div className="rounded-3xl border border-rose-100 bg-rose-50 p-4">
              <div className="flex items-start gap-3">
                <FiAlertCircle className="mt-0.5 shrink-0 text-rose-500" />
                <div>
                  <p className="text-sm font-bold text-rose-800">Eligibility check failed</p>
                  <p className="mt-1 text-sm text-rose-700">{eligibilityError}</p>
                </div>
              </div>
            </div>
          )}

          {eligibility && !eligibilityLoading && !eligibilityError && (
            <div className="space-y-5">
              {currentStep !== STEP.PROCESSING && currentStep !== STEP.SUCCESS && (
                <>
                  <div
                    className={`rounded-3xl border p-4 ${
                      showOfflineFlow
                        ? "border-amber-100 bg-amber-50"
                        : isOnlineEligible
                          ? "border-emerald-100 bg-emerald-50"
                          : "border-blue-100 bg-blue-50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {showOfflineFlow ? (
                        <FiAlertCircle className="mt-0.5 shrink-0 text-amber-600" />
                      ) : isOnlineEligible ? (
                        <FiCheckCircle className="mt-0.5 shrink-0 text-emerald-600" />
                      ) : (
                        <FiRefreshCw className="mt-0.5 shrink-0 text-blue-600" />
                      )}
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {showOfflineFlow
                            ? "Offline servicing required"
                            : isOnlineEligible
                              ? "Online reissue available"
                              : "Online reissue will be attempted"}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">{headerMessage}</p>
                      </div>
                    </div>
                  </div>

                  {currentStep === STEP.FARE_QUOTE && renderOnlineQuoteStep()}
                  {currentStep === STEP.CONFIRMATION && renderConfirmationStep()}

                  {[STEP.FORM, STEP.SEARCH_RESULTS].includes(currentStep) && (
                    <>
                      <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                              <label className="mb-2 block text-xs font-bold text-slate-500 uppercase tracking-widest">
                                {showOfflineFlow ? "Preferred Travel Date" : "New Departure Date"}
                              </label>
                              <CustomDatePicker
                                value={departureDate}
                                minDate={minTravelDate}
                                onChange={(val) => setDepartureDate(val || "")}
                                placeholder="Select departure date"
                              />
                            </div>

                            {isRoundTrip && (
                              <div>
                                <label className="mb-2 block text-xs font-bold text-slate-500 uppercase tracking-widest">
                                  {showOfflineFlow ? "Preferred Return Date" : "New Return Date"}
                                </label>
                                <CustomDatePicker
                                  value={returnDate}
                                  minDate={departureDate || minTravelDate}
                                  onChange={(val) => setReturnDate(val || "")}
                                  placeholder="Select return date"
                                />
                              </div>
                            )}
                          </div>

                          <div className="mt-4">
                            <label className="mb-2 block text-xs font-bold text-slate-500 uppercase tracking-widest">
                              Remarks
                            </label>
                            <textarea
                              value={remarks}
                              onChange={(event) => setRemarks(event.target.value)}
                              rows={4}
                              placeholder="Add servicing notes or schedule flexibility for the reissue team"
                              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003399]/20 focus:border-[#003399] transition-all text-sm font-medium text-slate-900 placeholder:text-slate-400"
                            />
                          </div>
                        </div>

                        {renderSidebarSummary()}
                      </div>

                      {currentStep === STEP.SEARCH_RESULTS && (
                        <>
                          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-bold text-slate-900">
                                  {showOfflineFlow ? "Available replacement flights" : "Available online reissue options"}
                                </p>
                                <p className="mt-1 text-sm text-slate-500">
                                  {showOfflineFlow
                                    ? `${offlineSearchPagination?.total || 0} result(s)`
                                    : `${onlineOptions.length} result(s)`}
                                </p>
                              </div>
                              {showOfflineFlow && (
                                <button
                                  type="button"
                                  onClick={() => handleOfflineSearch(searchPage)}
                                  disabled={offlineSearchLoading || !canSearch}
                                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                                >
                                  {offlineSearchLoading ? <FiLoader className="animate-spin" /> : <FiRefreshCw size={14} />}
                                  Refresh
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="space-y-4">
                            {(showOfflineFlow ? offlineSearchResults : onlineOptions).map((option) => (
                              <FlightOptionCard
                                key={String(option.resultIndex)}
                                option={
                                  showOfflineFlow
                                    ? {
                                        ...option,
                                        oldFare: option.oldFare,
                                        newFare: option.fare || option.newFare,
                                        totalCollection: option.totalEstimate,
                                        cabin: option.cabinClass || "Economy",
                                        baggage: option.baggage || PLACEHOLDER,
                                      }
                                    : option
                                }
                                selected={String(selectedOption?.resultIndex) === String(option.resultIndex)}
                                expanded={expandedOptionId === option.resultIndex}
                                onToggleDetails={() =>
                                  setExpandedOptionId((current) =>
                                    current === option.resultIndex ? null : option.resultIndex,
                                  )
                                }
                                onSelect={() => setSelectedOption(option)}
                                mode={showOfflineFlow ? "OFFLINE" : "ONLINE"}
                              />
                            ))}
                          </div>

                          {showOfflineFlow && !offlineSearchResults?.length && (
                            <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-600">
                              {offlineSearchError || OFFLINE_SEARCH_FALLBACK_MESSAGE}
                            </div>
                          )}

                          {showOfflineFlow && offlineSearchPagination?.pages > 1 && (
                            <div className="flex items-center justify-between rounded-3xl border border-slate-200 bg-slate-50 p-4">
                              <button
                                type="button"
                                onClick={() => handleOfflineSearch(Math.max(1, searchPage - 1))}
                                disabled={searchPage <= 1 || offlineSearchLoading}
                                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
                              >
                                Previous
                              </button>
                              <span className="text-sm text-slate-600">
                                Page {searchPage} of {offlineSearchPagination.pages}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleOfflineSearch(
                                    Math.min(offlineSearchPagination.pages, searchPage + 1),
                                  )
                                }
                                disabled={
                                  searchPage >= offlineSearchPagination.pages ||
                                  offlineSearchLoading
                                }
                                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
                              >
                                Next
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}
                </>
              )}

              {currentStep === STEP.PROCESSING && (
                <ProcessingState label={processingLabel} />
              )}

              {currentStep === STEP.SUCCESS && renderSuccessStep()}
            </div>
          )}
        </div>

        {eligibility && !eligibilityLoading && !eligibilityError && (
          <div className="border-t border-slate-200 bg-white px-5 py-4 sm:px-6 shrink-0">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-slate-500">
                {currentStep === STEP.SUCCESS
                  ? "The booking dashboard now resolves to the latest active ticket."
                  : showOfflineFlow
                    ? "Replacement flight selection is mandatory for offline reissue."
                    : "Online reissue follows search, quote, confirmation, and ticketing in sequence."}
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                {showBackButton && (
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentStep((current) =>
                        current === STEP.FARE_QUOTE ? STEP.SEARCH_RESULTS : STEP.FARE_QUOTE,
                      )
                    }
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    <FiArrowLeft size={15} />
                    Back
                  </button>
                )}

                {currentStep !== STEP.PROCESSING && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    {currentStep === STEP.SUCCESS ? "Close" : "Cancel"}
                  </button>
                )}

                {currentStep === STEP.FORM && (
                  showOfflineFlow ? (
                    <button
                      type="button"
                      onClick={() => handleOfflineSearch(1)}
                      disabled={offlineSearchLoading || !canSearch}
                      className="inline-flex items-center gap-2 bg-linear-to-r from-[#003399] to-[#000d26] px-6 py-2.5 rounded-xl font-bold text-white shadow-md hover:shadow-lg hover:opacity-90 transition-all disabled:opacity-50"
                    >
                      {offlineSearchLoading ? <FiLoader className="animate-spin" /> : <FiRefreshCw size={15} />}
                      Search Flights
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleOnlineSearch}
                      disabled={createLoading || !canSearch}
                      className="inline-flex items-center gap-2 bg-linear-to-r from-[#003399] to-[#000d26] px-6 py-2.5 rounded-xl font-bold text-white shadow-md hover:shadow-lg hover:opacity-90 transition-all disabled:opacity-50"
                    >
                      {createLoading ? <FiLoader className="animate-spin" /> : <FiRefreshCw size={15} />}
                      Search Reissue Options
                    </button>
                  )
                )}

                {currentStep === STEP.SEARCH_RESULTS && showOfflineFlow && (
                  <button
                    type="button"
                    onClick={submitOfflineRequest}
                    disabled={offlineCreateLoading || !selectedOption}
                    className="inline-flex items-center gap-2 bg-linear-to-r from-[#003399] to-[#000d26] px-6 py-2.5 rounded-xl font-bold text-white shadow-md hover:shadow-lg hover:opacity-90 transition-all disabled:opacity-50"
                  >
                    {offlineCreateLoading ? <FiLoader className="animate-spin" /> : <FiSend size={15} />}
                    Submit Reissue Request
                  </button>
                )}

                {currentStep === STEP.SEARCH_RESULTS && !showOfflineFlow && (
                  <button
                    type="button"
                    onClick={handlePreviewQuote}
                    disabled={quoteLoading || !selectedOption}
                    className="inline-flex items-center gap-2 bg-linear-to-r from-[#003399] to-[#000d26] px-6 py-2.5 rounded-xl font-bold text-white shadow-md hover:shadow-lg hover:opacity-90 transition-all disabled:opacity-50"
                  >
                    {quoteLoading ? <FiLoader className="animate-spin" /> : <FiFileText size={15} />}
                    Get Fare Quote
                  </button>
                )}

                {currentStep === STEP.FARE_QUOTE && (
                  <button
                    type="button"
                    onClick={() => setCurrentStep(STEP.CONFIRMATION)}
                    className="inline-flex items-center gap-2 bg-linear-to-r from-[#003399] to-[#000d26] px-6 py-2.5 rounded-xl font-bold text-white shadow-md hover:shadow-lg hover:opacity-90 transition-all"
                  >
                    Continue to Confirmation
                  </button>
                )}

                {currentStep === STEP.CONFIRMATION && (
                  <button
                    type="button"
                    onClick={handleConfirmOnlineReissue}
                    disabled={confirmLoading}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    {confirmLoading ? <FiLoader className="animate-spin" /> : <FiCheckCircle size={15} />}
                    Confirm Reissue
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
