import React, { useEffect, useMemo, useState } from "react";
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

const normalizeDateInput = (value) => {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 8);
  if (!digits) return "";
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

const parseDisplayDate = (value) => {
  const match = String(value || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return "";

  const [, day, month, year] = match;
  const isoDate = `${year}-${month}-${day}`;
  const date = new Date(`${isoDate}T00:00:00`);

  if (Number.isNaN(date.getTime())) return "";
  if (date.getFullYear() !== Number(year)) return "";
  if (date.getMonth() + 1 !== Number(month)) return "";
  if (date.getDate() !== Number(day)) return "";

  return isoDate;
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

const normalizeJourneyGroup = (segments = [], journeyType = "onward") => {
  const normalizedSegments = toArray(segments);
  const first = normalizedSegments[0] || {};
  const last = normalizedSegments[normalizedSegments.length - 1] || first;
  const durationMinutes = getDurationFromSegments(normalizedSegments);

  return {
    journeyType,
    label: journeyType === "return" ? "Return" : "Onward",
    origin: getSegmentAirport(first, "Origin") || PLACEHOLDER,
    destination: getSegmentAirport(last, "Destination") || PLACEHOLDER,
    departureTime: getSegmentTime(first, "Origin"),
    arrivalTime: getSegmentTime(last, "Destination"),
    departureDate: getSegmentTime(first, "Origin"),
    durationMinutes,
    duration: formatDuration(durationMinutes),
    stops: Math.max(normalizedSegments.length - 1, 0),
    airlineCode: first?.Airline?.AirlineCode || first?.AirlineCode || "",
    airlineName: first?.Airline?.AirlineName || first?.AirlineName || "Airline",
    flightNumber: first?.Airline?.FlightNumber || first?.FlightNumber || "",
    baggage:
      first?.Baggage ||
      first?.CabinBaggage ||
      PLACEHOLDER,
    segments: normalizedSegments.map((segment) => ({
      origin: getSegmentAirport(segment, "Origin"),
      destination: getSegmentAirport(segment, "Destination"),
      departureTime: getSegmentTime(segment, "Origin"),
      arrivalTime: getSegmentTime(segment, "Destination"),
      airlineCode: segment?.Airline?.AirlineCode || "",
      airlineName: segment?.Airline?.AirlineName || "Airline",
      flightNumber: segment?.Airline?.FlightNumber || segment?.FlightNumber || "",
      duration: segment?.Duration ? formatDuration(segment.Duration) : null,
      baggage: segment?.Baggage || segment?.CabinBaggage || null,
      journeyType,
    })),
  };
};

const buildJourneyGroups = (rawSegments) => {
  const groups = Array.isArray(rawSegments) ? rawSegments : [];
  const hasNestedGroups = groups.some(Array.isArray);

  if (hasNestedGroups) {
    return groups
      .map((group, index) =>
        normalizeJourneyGroup(group, index === 1 ? "return" : "onward"),
      )
      .filter((group) => group.segments.length);
  }

  const fallbackGroup = normalizeJourneyGroup(groups, "onward");
  return fallbackGroup.segments.length ? [fallbackGroup] : [];
};

const flattenJourneyGroups = (journeyGroups = []) =>
  journeyGroups.flatMap((group) => toArray(group?.segments));

const getOptionFlightLabel = (option) =>
  toArray(option?.journeyGroups).length > 1
    ? `${option?.airlineName || option?.airlineCode || "Airline"} Roundtrip`
    : `${option?.airlineName || option?.airlineCode || "Airline"} ${option?.airlineCode || ""} ${option?.flightNumber || ""}`.trim();

const getOptionRouteLabel = (option) =>
  toArray(option?.journeyGroups)
    .map((group) => `${group?.origin || PLACEHOLDER} -> ${group?.destination || PLACEHOLDER}`)
    .join(" | ") || `${option?.origin || PLACEHOLDER} -> ${option?.destination || PLACEHOLDER}`;

const getOptionScheduleLabel = (option) =>
  toArray(option?.journeyGroups)
    .map((group) => {
      const dateLabel = formatDate(group?.departureDate);
      const timeLabel = `${formatFlightTime(group?.departureTime)} -> ${formatFlightTime(group?.arrivalTime)}`;
      return dateLabel !== PLACEHOLDER ? `${group?.label}: ${dateLabel} | ${timeLabel}` : `${group?.label}: ${timeLabel}`;
    })
    .join(" | ") || `${formatFlightTime(option?.departureTime)} -> ${formatFlightTime(option?.arrivalTime)}`;

const normalizeOnlineFlightOptions = ({ rawResults, oldFare }) => {
  return toArray(rawResults).map((result, index) => {
    const journeyGroups = buildJourneyGroups(result?.Segments);
    const segments = flattenJourneyGroups(journeyGroups);
    const firstGroup = journeyGroups[0] || {};
    const lastGroup = journeyGroups[journeyGroups.length - 1] || firstGroup;
    const first = firstGroup.segments?.[0] || {};
    const last = lastGroup.segments?.[lastGroup.segments.length - 1] || first;
    const totalStops = journeyGroups.reduce(
      (count, group) => count + Math.max(toArray(group?.segments).length - 1, 0),
      0,
    );
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
      airlineCode: firstGroup?.airlineCode || "",
      airlineName: firstGroup?.airlineName || "Airline",
      flightNumber: firstGroup?.flightNumber || "",
      origin: firstGroup?.origin || PLACEHOLDER,
      destination: lastGroup?.destination || PLACEHOLDER,
      departureDate: firstGroup?.departureDate || getSegmentTime(first, "Origin"),
      departureTime: firstGroup?.departureTime || getSegmentTime(first, "Origin"),
      arrivalTime: lastGroup?.arrivalTime || getSegmentTime(last, "Destination"),
      durationMinutes: journeyGroups.reduce(
        (total, group) => total + Number(group?.durationMinutes || 0),
        0,
      ),
      duration: formatDuration(
        journeyGroups.reduce((total, group) => total + Number(group?.durationMinutes || 0), 0),
      ),
      stops: totalStops,
      noOfSeatAvailable: noOfSeats,
      lowSeatWarning: noOfSeats !== null && Number(noOfSeats) <= 3,
      cabin: getCabinLabel(
        result?.Fare?.CabinClass ||
          first?.CabinClass ||
          result?.ResultFareType,
      ),
      baggage:
        firstGroup?.baggage ||
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
      journeyGroups,
      segments,
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

function StepBadge({ active, complete, label, number }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black ${
          complete
            ? "bg-emerald-600 text-white"
            : active
              ? "bg-[#0A4D68] text-white"
              : "bg-slate-100 text-slate-500"
        }`}
      >
        {complete ? <FiCheckCircle size={14} /> : number}
      </span>
      <span className={`text-xs font-bold uppercase tracking-[0.18em] ${active ? "text-slate-900" : "text-slate-400"}`}>
        {label}
      </span>
    </div>
  );
}

function PricingRow({ label, value, strong = false }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
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
      <div className="flex items-start justify-between gap-3 text-sm">
        <span className="text-slate-500 leading-snug">{label}</span>
        <span className={`font-semibold shrink-0 ${colour}`}>
          {prefix}{formatMoney(Math.abs(amt), currency)}
        </span>
      </div>
      {helpText && (
        <p className="mt-0.5 text-[10px] leading-tight text-slate-400">{helpText}</p>
      )}
    </div>
  );
}

/** Section divider with label for the new sectioned pricing layout. */
function PricingSection({ label }) {
  return (
    <p className="pt-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">{label}</p>
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
  const journeyGroups = toArray(option.journeyGroups);
  const hasTimings = option.departureTime && option.arrivalTime;
  const depTime = hasTimings ? formatFlightTime(option.departureTime) : PLACEHOLDER;
  const arrTime = hasTimings ? formatFlightTime(option.arrivalTime) : PLACEHOLDER;
  const travelDate = hasTimings ? formatDate(option.departureTime) : formatDate(option.departureDate);

  return (
    <div
      className={`rounded-3xl border p-5 shadow-sm transition ${
        selected
          ? "border-[#0A4D68] bg-[#f4fbff] shadow-[0_18px_50px_rgba(10,77,104,0.12)]"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        {/* LEFT — Flight identity + schedule */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-4">
            <img src={airlineLogo(option.airlineCode)}
              alt={option.airlineCode || "Airline"}
              className="h-12 w-12 shrink-0 rounded-2xl border border-slate-200 bg-white object-contain p-2" loading="eager" />
            <div className="min-w-0 flex-1">
              {/* Airline + badges row */}
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-base font-black text-slate-900">
                  {getOptionFlightLabel(option)}
                </p>
                {option.isNdc && (
                  <span className="rounded-full bg-gradient-to-r from-violet-600 to-purple-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
                    NDC
                  </span>
                )}
                {option.lowSeatWarning && (
                  <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-rose-700">
                    Only {option.noOfSeatAvailable} left
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-sm font-semibold text-slate-500">
                {option.airlineCode || PLACEHOLDER}{option.flightNumber ? ` · ${option.flightNumber}` : ""}
              </p>

              {/* Main schedule block */}
              <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  {/* Origin */}
                  <div className="text-center">
                    <p className="text-2xl font-black text-slate-900">{depTime}</p>
                    <p className="mt-0.5 text-sm font-bold text-slate-600">{option.origin || PLACEHOLDER}</p>
                  </div>
                  {/* Arrow + duration */}
                  <div className="flex flex-1 flex-col items-center gap-1">
                    <p className="text-[11px] font-semibold text-slate-400">
                      {option.duration || ""}
                    </p>
                    <div className="flex w-full items-center gap-1">
                      <div className="h-px flex-1 bg-slate-300" />
                      <span className="text-slate-400">✈</span>
                      <div className="h-px flex-1 bg-slate-300" />
                    </div>
                    <p className="text-[11px] font-semibold text-slate-400">
                      {formatStops(option.stops)}
                    </p>
                  </div>
                  {/* Destination */}
                  <div className="text-center">
                    <p className="text-2xl font-black text-slate-900">{arrTime}</p>
                    <p className="mt-0.5 text-sm font-bold text-slate-600">{option.destination || PLACEHOLDER}</p>
                  </div>
                </div>
                {travelDate && travelDate !== PLACEHOLDER && (
                  <p className="mt-2 text-center text-xs font-medium text-slate-400">{travelDate}</p>
                )}
                {journeyGroups.length > 1 && (
                  <div className="mt-3 space-y-2 border-t border-slate-200 pt-3">
                    {journeyGroups.map((group) => (
                      <div
                        key={`${group.label}-${group.origin}-${group.destination}-${group.departureTime || ""}`}
                        className="rounded-2xl bg-white px-3 py-2"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                            {group.label}
                          </p>
                          <p className="text-xs font-semibold text-slate-500">
                            {group.duration || PLACEHOLDER}
                          </p>
                        </div>
                        <p className="mt-1 text-sm font-bold text-slate-800">
                          {group.origin || PLACEHOLDER}{" -> "}{group.destination || PLACEHOLDER}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatDate(group.departureDate)} | {formatFlightTime(group.departureTime)}{" -> "}{formatFlightTime(group.arrivalTime)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cabin / baggage tags */}
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                  {option.cabin || "Economy"}
                </span>
                {option.baggage && option.baggage !== PLACEHOLDER && (
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                    Bag: {option.baggage}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — Pricing panel (airline-grade sectioned breakdown) */}
        <div className="w-full rounded-3xl border border-slate-100 bg-slate-50 p-4 xl:max-w-[320px]">
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
              <div className="mt-3 space-y-1">
                {/* ── Section 1: Original Ticket Value ── */}
                <PricingSection label="Original Ticket Value" />
                <PricingRow label="Previously Paid" value={formatMoney(previouslyPaid, option.currency)} />
                <div className="my-2 border-t border-slate-200" />
                {/* ── Section 2: New Itinerary Cost ── */}
                <PricingSection label="New Itinerary Cost" />
                <PricingRow label="New Flight Fare" value={formatMoney(newFlightFare, option.currency)} />
                <div className="my-2 border-t border-slate-200" />
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
                <div className="mt-3 rounded-2xl bg-white px-4 py-3 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                    {isRefund ? "Refund Due" : "Net Additional Collection"}
                  </p>
                  <p className={`mt-2 text-2xl font-black ${isRefund ? "text-emerald-600" : "text-slate-900"}`}>
                    {formatMoney(Math.abs(netSettlement), option.currency)}
                  </p>
                </div>
              </div>
            );
          })()}
          <div className="mt-4 flex flex-wrap gap-2">
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
                  ? "bg-[#0A4D68] text-white"
                  : "border border-[#0A4D68] text-[#0A4D68] hover:bg-[#eef8fc]"
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
                const layoverMins = prevSeg && prevSeg.journeyType === segment.journeyType
                  ? calcLayoverMinutes(prevSeg.arrivalTime, segment.departureTime)
                  : null;
                return (
                  <div key={`${segment.origin}-${segment.destination}-${index}`}>
                    {layoverMins !== null && (
                      <div className="flex items-center gap-2 py-2 pl-4 text-xs font-semibold text-amber-700">
                        <span className="h-4 w-0.5 rounded bg-amber-300" />
                        Layover at {prevSeg?.destination || ""}: {formatDuration(layoverMins)}
                      </div>
                    )}
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-slate-900">
                            {segment.origin || PLACEHOLDER} → {segment.destination || PLACEHOLDER}
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
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#eef8fc] text-[#0A4D68]">
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
    offlineCreateLoading,
    offlineSearchResults,
    offlineSearchPagination,
    offlineSearchLoading,
    offlineSearchError,
  } = useSelector((state) => state.reissue);

  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [departureDateInput, setDepartureDateInput] = useState("");
  const [returnDateInput, setReturnDateInput] = useState("");
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

  const segments = Array.isArray(booking?.flightRequest?.segments)
    ? booking.flightRequest.segments
    : [];
  const isRoundTrip = segments.some(
    (segment) => (segment?.journeyType || "").toString().toLowerCase() === "return",
  );
  const oldFare = Number(booking?.pricingSnapshot?.totalAmount || 0);
  const isOnlineEligible =
    eligibility?.eligible === true && eligibility?.mode === "ONLINE";
  const showOfflineFlow =
    eligibility?.mode === "OFFLINE" || Boolean(offlineFallback);
  const eligibilityReasons = toArray(
    offlineFallback?.reasons || eligibility?.reasons,
  );

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

  const todayIso = new Date().toISOString().split("T")[0];
  const isDepartureDateValid = Boolean(departureDate) && departureDate >= todayIso;
  const isReturnDateValid =
    !isRoundTrip ||
    (Boolean(returnDate) && returnDate >= (departureDate || todayIso));
  const canSearch = isDepartureDateValid && isReturnDateValid;
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
              : 6;

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
          reasons: response?.reasons || [],
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
      setOfflineSearchId(null);
      setSelectedOption(null);
      setSearchPage(page);
      setCurrentStep(STEP.SEARCH_RESULTS);
      toast.error(error || OFFLINE_SEARCH_FALLBACK_MESSAGE);
    }
  };

  const handleDepartureDateChange = (event) => {
    const formattedValue = normalizeDateInput(event.target.value);
    const parsedValue = parseDisplayDate(formattedValue);

    setDepartureDateInput(formattedValue);
    setDepartureDate(parsedValue);

    if (returnDate && parsedValue && returnDate < parsedValue) {
      setReturnDate("");
      setReturnDateInput("");
    }
  };

  const handleReturnDateChange = (event) => {
    const formattedValue = normalizeDateInput(event.target.value);
    const parsedValue = parseDisplayDate(formattedValue);

    setReturnDateInput(formattedValue);
    setReturnDate(parsedValue);
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
        status: response?.status || "PENDING_ASSIGNMENT",
      });
      toast.success(
        "Your reissue request has been submitted successfully. Currently awaiting OPS assignment.",
      );
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
      <div className="rounded-3xl border border-[#0A4D68]/20 bg-[linear-gradient(180deg,#f8fdff_0%,#eef8fc_100%)] p-4">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#0A4D68]">
          Selected Flight
        </p>
        <p className="mt-3 text-lg font-black text-slate-900">
          {getOptionFlightLabel(selectedOption)}
        </p>
        <p className="mt-2 text-sm font-semibold text-slate-700">
          {getOptionRouteLabel(selectedOption)}
        </p>
        <p className="mt-1 text-sm text-slate-600">
          {getOptionScheduleLabel(selectedOption)}
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
              <div className="my-2 border-t border-[#0A4D68]/10" />
              {/* Section 2 */}
              <PricingSection label="New Itinerary Cost" />
              <PricingRow label="New Flight Fare" value={formatMoney(newFlightFare, currency)} />
              {newSSR > 0 && <PricingRow label="New SSR Total" value={formatMoney(newSSR, currency)} />}
              <div className="my-2 border-t border-[#0A4D68]/10" />
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
                <p className={`mt-2 text-2xl font-black ${isRefund ? "text-emerald-600" : "text-[#0A4D68]"}`}>
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
      <div className="rounded-3xl border border-[#0A4D68]/15 bg-[linear-gradient(180deg,#f8fdff_0%,#f1f8fb_100%)] p-5">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0A4D68]">
          Confirmation Summary
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              Selected Flight
            </p>
            <p className="mt-2 text-sm font-bold text-slate-900">
              {getOptionFlightLabel(selectedOption)}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {getOptionRouteLabel(selectedOption)}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {getOptionScheduleLabel(selectedOption)}
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
            : successSnapshot?.status === "PENDING_ASSIGNMENT"
              ? "Your reissue request has been submitted successfully. Currently awaiting OPS assignment."
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
  const headerMessage = showOfflineFlow
    ? offlineFallback?.message ||
      eligibility?.message ||
      eligibilityReasons[0] ||
      "Online reissue is unavailable for this booking. Choose a preferred date, review replacement flights, and submit the request for operations processing."
    : isOnlineEligible
      ? "This booking supports online reissue. Search, select, quote, and confirm in one flow."
      : "This booking requires offline servicing.";

  const showBackButton =
    !showOfflineFlow &&
    [STEP.SEARCH_RESULTS, STEP.FARE_QUOTE, STEP.CONFIRMATION].includes(currentStep);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="mx-auto flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
          <div>
            <h2 className="text-xl font-black text-slate-900">{modalTitle}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {booking?.bookingReference || booking?.orderId || booking?._id}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:bg-slate-50"
          >
            <FiX size={18} />
          </button>
        </div>

        {!showOfflineFlow && (
          <div className="border-b border-slate-100 bg-slate-50 px-5 py-4 sm:px-6">
            <div className="flex flex-wrap gap-4">
              <StepBadge number="1" label="Form" active={onlineStepIndex === 1} complete={onlineStepIndex > 1} />
              <StepBadge number="2" label="Search" active={onlineStepIndex === 2} complete={onlineStepIndex > 2} />
              <StepBadge number="3" label="Quote" active={onlineStepIndex === 3} complete={onlineStepIndex > 3} />
              <StepBadge number="4" label="Confirm" active={onlineStepIndex === 4} complete={onlineStepIndex > 4} />
              <StepBadge number="5" label="Process" active={onlineStepIndex === 5} complete={onlineStepIndex > 5} />
              <StepBadge number="6" label="Success" active={onlineStepIndex === 6} complete={false} />
            </div>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {eligibilityLoading && (
            <div className="flex flex-col items-center justify-center gap-3 py-20">
              <FiLoader size={28} className="animate-spin text-[#0A4D68]" />
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
                              : "Offline servicing required"}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">{headerMessage}</p>
                        {showOfflineFlow && eligibilityReasons.length > 0 && (
                          <div className="mt-3 space-y-1">
                            {eligibilityReasons.slice(0, 3).map((reason) => (
                              <p
                                key={reason}
                                className="text-xs font-medium text-slate-600"
                              >
                                {reason}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {currentStep === STEP.FARE_QUOTE && renderOnlineQuoteStep()}
                  {currentStep === STEP.CONFIRMATION && renderConfirmationStep()}

                  {[STEP.FORM, STEP.SEARCH_RESULTS].includes(currentStep) && (
                    <>
                      <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
                        <div className="rounded-3xl border border-slate-200 bg-white p-4">
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                              <label className="mb-2 block text-sm font-semibold text-slate-700">
                                {showOfflineFlow ? "Preferred Travel Date" : "New Departure Date"}
                              </label>
                              <input
                                type="text"
                                inputMode="numeric"
                                maxLength={10}
                                placeholder="dd/mm/yyyy"
                                value={departureDateInput}
                                onChange={handleDepartureDateChange}
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#0A4D68] focus:ring-1 focus:ring-[#0A4D68]"
                              />
                              {departureDateInput.length === 10 && !isDepartureDateValid && (
                                <p className="mt-2 text-xs text-rose-600">
                                  Enter a valid future date in dd/mm/yyyy format.
                                </p>
                              )}
                            </div>

                            {isRoundTrip && (
                              <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">
                                  {showOfflineFlow ? "Preferred Return Date" : "New Return Date"}
                                </label>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  maxLength={10}
                                  placeholder="dd/mm/yyyy"
                                  value={returnDateInput}
                                  onChange={handleReturnDateChange}
                                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#0A4D68] focus:ring-1 focus:ring-[#0A4D68]"
                                />
                                {returnDateInput.length === 10 && !isReturnDateValid && (
                                  <p className="mt-2 text-xs text-rose-600">
                                    Enter a valid return date in dd/mm/yyyy format.
                                  </p>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="mt-4">
                            <label className="mb-2 block text-sm font-semibold text-slate-700">
                              Remarks
                            </label>
                            <textarea
                              value={remarks}
                              onChange={(event) => setRemarks(event.target.value)}
                              rows={4}
                              placeholder="Add servicing notes or schedule flexibility for the reissue team"
                              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#0A4D68] focus:ring-1 focus:ring-[#0A4D68]"
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
          <div className="border-t border-slate-100 bg-white px-5 py-4 sm:px-6">
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
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <FiArrowLeft size={15} />
                    Back
                  </button>
                )}

                {currentStep !== STEP.PROCESSING && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
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
                      className="inline-flex items-center gap-2 rounded-2xl bg-[#0A4D68] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#08394d] disabled:opacity-50"
                    >
                      {offlineSearchLoading ? <FiLoader className="animate-spin" /> : <FiRefreshCw size={15} />}
                      Search Flights
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleOnlineSearch}
                      disabled={createLoading || !canSearch}
                      className="inline-flex items-center gap-2 rounded-2xl bg-[#0A4D68] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#08394d] disabled:opacity-50"
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
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#0A4D68] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#08394d] disabled:opacity-50"
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
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#0A4D68] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#08394d] disabled:opacity-50"
                  >
                    {quoteLoading ? <FiLoader className="animate-spin" /> : <FiFileText size={15} />}
                    Get Fare Quote
                  </button>
                )}

                {currentStep === STEP.FARE_QUOTE && (
                  <button
                    type="button"
                    onClick={() => setCurrentStep(STEP.CONFIRMATION)}
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#0A4D68] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#08394d]"
                  >
                    Continue to Confirmation
                  </button>
                )}

                {currentStep === STEP.CONFIRMATION && (
                  <button
                    type="button"
                    onClick={handleConfirmOnlineReissue}
                    disabled={confirmLoading}
                    className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
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
    </div>
  );
}
