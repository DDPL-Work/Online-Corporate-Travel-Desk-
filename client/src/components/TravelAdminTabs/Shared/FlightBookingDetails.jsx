import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  FiArrowLeft,
  FiDownload,
  FiUser,
  FiCreditCard,
  FiCheckCircle,
  FiAlertCircle,
  FiBriefcase,
  FiRefreshCw,
  FiUsers,
  FiPackage,
  FiMapPin,
  FiTag,
  FiFileText,
  FiCalendar,
  FiClock,
  FiShield,
  FiChevronDown,
  FiChevronUp,
  FiStar,
  FiXCircle,
  FiAlertTriangle,
  FiX,
  FiLoader,
  FiMail,
  FiMessageSquare,
  FiGlobe,
  FiPhone,
  FiInfo,
  FiHash,
} from "react-icons/fi";
import { MdVerifiedUser } from "react-icons/md";
import { getFlightBookingByIdAdmin } from "../../../Redux/Actions/travelAdmin.thunks";
import { downloadTicketPdf } from "../../../Redux/Actions/booking.thunks";
import {
  fetchCancellationCharges,
  fullCancellation,
  partialCancellation,
  fetchChangeStatus,
  createCancellationQuery,
} from "../../../Redux/Actions/amendmentThunks";
import { createReissueRequest } from "../../../Redux/Actions/reissueThunks";
import { resetAmendmentState } from "../../../Redux/Slice/amendmentSlice";
import {
  formatDate,
  formatTime,
  formatDuration,
  formatDateWithYear,
  getCabinClassLabel,
  airlineLogo,
  FLIGHT_STATUS_MAP,
} from "../../../utils/formatter";
import Swal from "sweetalert2";
import ReissueModal from "../../EmployeeDashboard/ReissueModal";

/* ────────────────────────────────────────────────────────────── */
/*  Utility helpers (unchanged)                                   */
/* ────────────────────────────────────────────────────────────── */
function formatPaxType(paxType) {
  const map = { ADULT: "Adult", CHILD: "Child", INFANT: "Infant" };
  return map[paxType] || paxType || "Unknown";
}

function safeGet(obj, ...keys) {
  return keys.reduce((acc, key) => (acc != null ? acc[key] : undefined), obj);
}

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null);
}

function extractCancellationChargeInfo(response) {
  const root = response?.Response || response || {};
  const cancelChargeDetails = Array.isArray(root?.CancelChargeDetails)
    ? root.CancelChargeDetails[0]
    : root?.CancelChargeDetails;
  const ticketCrInfo = Array.isArray(root?.TicketCRInfo)
    ? root.TicketCRInfo[0]
    : root?.TicketCRInfo;
  const info = cancelChargeDetails || ticketCrInfo || {};
  return {
    cancellationCharge: firstDefined(
      info?.CancellationCharge,
      info?.Charge,
      root?.CancellationCharge,
    ),
    refundedAmount: firstDefined(
      info?.RefundedAmount,
      info?.RefundAmount,
      root?.RefundedAmount,
      root?.RefundAmount,
    ),
    creditNoteNo: firstDefined(info?.CreditNoteNo, root?.CreditNoteNo),
    errorMessage: root?.Error?.ErrorMessage || response?.message || null,
  };
}

function layoverMinutes(prevSeg, nextSeg) {
  const arr = new Date(prevSeg.arrivalDateTime);
  const dep = new Date(nextSeg.departureDateTime);
  return Math.round((dep - arr) / 60000);
}

function formatLayoverDuration(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m layover` : `${m}m layover`;
}

/* ────────────────────────────────────────────────────────────── */
/*  Shared primitives (restyled)                                  */
/* ────────────────────────────────────────────────────────────── */
function StatusPill({ status }) {
  const s = (status || "").toLowerCase();
  const labelMap = {
    voucher_generated: "Confirmed",
    booked: "Booked",
    confirmed: "Confirmed",
    cancelled: "Cancelled",
    cancel_requested: "Cancel Requested",
    amendment_requested: "Cancelled",
    amendment_in_progress: "Cancelled",
    amendment_completed: "Cancelled",
    ticketed: "Confirmed",
  };
  const label = labelMap[s] || status;
  const isAmendment = s.startsWith("amendment_");
  const isCancelled = ["cancelled", "cancel_requested"].includes(s) || isAmendment;
  const isConfirmed = ["confirmed", "voucher_generated", "booked", "ticketed"].includes(s);

  const colors = isCancelled
    ? "bg-[#FDF1EE] text-[#B5341A] border-[#F0C4BA]"
    : isConfirmed
      ? "bg-[#EDF7F2] text-[#2C7A4B] border-[#C3E4D2]"
      : "bg-[#FDF8EE] text-[#8A6200] border-[#F0E0A8]";

  const dotColor = isCancelled
    ? "bg-[#B5341A]"
    : isConfirmed
      ? "bg-[#2C7A4B]"
      : "bg-[#8A6200]";

  return (
    <span
      className={`inline-flex items-center gap-[5px] px-[10px] py-[3px] rounded-[2px] border text-[10px] font-semibold tracking-[0.12em] uppercase ${colors}`}
    >
      <span className={`w-[6px] h-[6px] rounded-full ${dotColor}`} />
      {label}
    </span>
  );
}

function SectionHeader({ num, title }) {
  return (
    <div className="flex items-center pb-3 border-b border-[#EAE4D9] mb-6">
      {num && (
        <span className="text-[12px] font-semibold tracking-[0.15em] text-[#B5862A] mr-4 uppercase">
          0{num}
        </span>
      )}
      <h2 className="font-['Cormorant_Garamond'] text-[22px] font-semibold text-[#1A1714] md:text-[18px]">
        {title}
      </h2>
    </div>
  );
}

function InfoRow({ label, value, accent, mono }) {
  return (
    <div className="flex flex-col gap-1 py-3 border-b border-[#EAE4D9] last:border-0">
      <span className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94]">
        {label}
      </span>
      <span
        className={`text-[13px] font-medium ${
          accent ? "text-[#B5862A]" : "text-[#1A1714]"
        } ${mono ? "font-['DM_Mono'] tracking-wide" : ""}`}
      >
        {value || "—"}
      </span>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────── */
/*  New light flight card component (replaces JourneyCard)       */
/* ────────────────────────────────────────────────────────────── */
function FlightCard({
  journeyType,
  segments,
  pnr,
  paymentSuccessful,
  fareQuoteResults,
  bookingResult,
}) {
  const [expandedLayover, setExpandedLayover] = useState(null);
  const firstSeg = segments[0];
  const lastSeg = segments[segments.length - 1];

  // Resolve airline info string
  const airlineInfo = [
    firstSeg?.airlineName,
    segments.map((s) => `${s.airlineCode} ${s.flightNumber}`).join(" · "),
    getCabinClassLabel?.(firstSeg?.cabinClass) || "Economy",
  ]
    .filter(Boolean)
    .join(" · ");

  // Total stops across all segments
  const totalStops = segments.length - 1;
  const stopLabel =
    totalStops === 0
      ? "Non-stop"
      : `${totalStops} Stop${totalStops > 1 ? "s" : ""} · ${segments
          .slice(0, -1)
          .map((s) => s.destination?.airportCode)
          .join(", ")}`;

  // Overall journey duration: departure of first seg → arrival of last seg
  const journeyOrigin = firstSeg?.origin;
  const journeyDestination = lastSeg?.destination;
  const departureTime = formatTime(firstSeg?.departureDateTime);
  const arrivalTime = formatTime(lastSeg?.arrivalDateTime);

  const totalMinutes =
    segments.reduce((sum, s) => sum + (s.durationMinutes || 0), 0) +
    segments.slice(0, -1).reduce((sum, s, i) => {
      return sum + layoverMinutes(s, segments[i + 1]);
    }, 0);

  const totalDuration = formatDuration(totalMinutes);

  // Helper to find airport names from deeper data structures
  const resolveAirportName = (code, isOrigin) => {
    // 1. Check if already in segment (unlikely but safe)
    const segMatch = segments.find(
      (s) =>
        (isOrigin ? s.origin?.airportCode || s.origin?.code : s.destination?.airportCode || s.destination?.code) ===
        code,
    );
    const existing = isOrigin
      ? segMatch?.origin?.airportName || segMatch?.origin?.AirportName
      : segMatch?.destination?.airportName ||
        segMatch?.destination?.AirportName;
    if (existing) return existing;

    // 2. Check bookingResult (confirmed itinerary)
    const itinerary =
      journeyType === "return"
        ? bookingResult?.returnResponse?.Response?.Response?.FlightItinerary
        : (bookingResult?.onwardResponse || bookingResult?.providerResponse)
            ?.Response?.Response?.FlightItinerary;

    const tboSegs = itinerary?.Segments || [];
    const tboMatch = tboSegs.find(
      (s) =>
        (isOrigin
          ? s.Origin?.Airport?.AirportCode
          : s.Destination?.Airport?.AirportCode) === code,
    );
    if (tboMatch)
      return isOrigin
        ? tboMatch.Origin?.Airport?.AirportName
        : tboMatch.Destination?.Airport?.AirportName;

    // 3. Check fareQuoteResults (pre-booking snapshot)
    for (const res of fareQuoteResults || []) {
      for (const segGroup of res.Segments || []) {
        for (const s of segGroup) {
          const matchCode = isOrigin
            ? s.Origin?.Airport?.AirportCode
            : s.Destination?.Airport?.AirportCode;
          if (matchCode === code)
            return isOrigin
              ? s.Origin?.Airport?.AirportName
              : s.Destination?.Airport?.AirportName;
        }
      }
    }
    return null;
  };

  const resolveCabinClass = () => {
    if (firstSeg?.cabinClass) return firstSeg.cabinClass;
    for (const res of fareQuoteResults || []) {
      for (const segGroup of res.Segments || []) {
        for (const s of segGroup) {
          if (s.Airline?.FlightNumber === firstSeg?.flightNumber && s.Airline?.AirlineCode === firstSeg?.airlineCode) {
             return s.CabinClass;
          }
        }
      }
    }
    return null;
  };

  const resolveSupplierFare = () => {
    for (const res of fareQuoteResults || []) {
      for (const segGroup of res.Segments || []) {
        for (const s of segGroup) {
          if (s.Airline?.FlightNumber === firstSeg?.flightNumber && s.Airline?.AirlineCode === firstSeg?.airlineCode) {
             return s.SupplierFareClass || s.FareClassification?.Type;
          }
        }
      }
    }
    return null;
  };

  const cabinClassCode = resolveCabinClass();
  const cabinClassLabel = typeof cabinClassCode === "number" ? getCabinClassLabel(cabinClassCode) : "Economy";
  const supplierFare = resolveSupplierFare() || cabinClassLabel;

  const airlineInfoStr = [
    segments.map((s) => `${s.origin?.airportCode || s.origin?.code}-${s.destination?.airportCode || s.destination?.code} ${s.airlineCode} ${s.flightNumber}`).join(" · "),
    cabinClassLabel,
  ]
    .filter((v) => v && v !== "—")
    .join(" · ");

  const originAirportName = resolveAirportName(
    journeyOrigin?.airportCode || journeyOrigin?.code,
    true,
  );
  const destAirportName = resolveAirportName(
    journeyDestination?.airportCode || journeyDestination?.code,
    false,
  );

  return (
    <div className="bg-white border border-[#EAE4D9]">
      {/* Top bar */}
      <div className="px-6 py-[10px] border-b border-[#EAE4D9] flex justify-between items-center">
        <span className="text-[9px] font-semibold tracking-[0.18em] uppercase text-[#A89F94]">
          {journeyType === "return" ? "Return Journey" : "Onward Journey"}
        </span>
        <div className="flex items-center gap-3">
          {supplierFare && (
            <span className="text-[10px] font-semibold tracking-wide uppercase text-[#1A1714] bg-[#FAF8F4] px-2 py-0.5 rounded-sm border border-[#EAE4D9]">
              {supplierFare}
            </span>
          )}
          {pnr && (
            <span className="flex items-center gap-[6px] text-[11px] text-[#B5862A] border border-[#B5862A] px-[10px] py-[2px]">
              <FiTag size={11} />
              PNR · {pnr}
            </span>
          )}
        </div>
      </div>

      {/* Body: image + details */}
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,340px)_1fr] gap-0">
        {/* Airline Logo block */}
        <div className="relative min-h-[280px] overflow-hidden bg-[#F0EBE1] flex flex-col items-center justify-center p-8 border-b md:border-b-0 md:border-r border-[#EAE4D9]">
           <img src={airlineLogo(firstSeg?.airlineCode)} className="w-24 h-24 object-contain mb-4 drop-shadow-sm" alt={firstSeg?.airlineName} />
           <p className="font-['Cormorant_Garamond'] text-[24px] font-bold text-[#1A1714] text-center leading-tight">
             {firstSeg?.airlineName || "Airline"}
           </p>
           <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mt-3 text-center leading-relaxed">
             {airlineInfoStr}
           </p>
        </div>

        {/* Right content */}
        <div className="p-6 md:p-9">
          <div className="mb-6">
            <h1 className="font-['Cormorant_Garamond'] text-[32px] md:text-[36px] font-bold leading-[1.1] text-[#1A1714] mb-2">
              {journeyOrigin?.city} to {journeyDestination?.city}
            </h1>
            <div className="flex items-center gap-3 flex-wrap mb-[6px]">
              <span className="flex items-center gap-1 text-[12px] text-[#7A7068]">
                <FiMapPin size={13} className="text-[#B5862A]" />
                {originAirportName} → {destAirportName}
              </span>
            </div>
          </div>

          <hr className="border-t border-[#EAE4D9] my-5" />

          {/* Departure / Arrival Grid */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 mb-6">
            <div>
              <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-1">
                Departure
              </div>
              <div className="font-['Cormorant_Garamond'] text-[32px] font-bold leading-none mb-[2px] text-[#1A1714]">
                {departureTime}
              </div>
              <div className="text-[13px] text-[#7A7068] font-medium">
                {formatDate(firstSeg?.departureDateTime)}
              </div>
              <div className="text-[12px] text-[#8B7355] mt-1 font-medium">
                {originAirportName || journeyOrigin?.airportCode || journeyOrigin?.code} <br /> Terminal: {journeyOrigin?.terminal || "Not Available"}
              </div>
            </div>

            <div className="text-center px-2">
              <div className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#A89F94] mb-2">
                {totalDuration}
              </div>
              <div className="flex items-center gap-1">
                <span className="w-[6px] h-[6px] rounded-full border border-[#EAE4D9] inline-block" />
                <div className="flex-1 border-t border-dashed border-[#EAE4D9] w-8 md:w-12" />
                <FiClock size={14} className="text-[#A89F94]" />
                <div className="flex-1 border-t border-dashed border-[#EAE4D9] w-8 md:w-12" />
                <span className="w-[6px] h-[6px] rounded-full bg-[#B5862A] inline-block" />
              </div>
              <div className="text-[10px] text-[#A89F94] mt-2 max-w-[80px] text-center mx-auto">
                {stopLabel}
              </div>
            </div>

            <div className="text-right">
              <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-1">
                Arrival
              </div>
              <div className="font-['Cormorant_Garamond'] text-[32px] font-bold leading-none mb-[2px] text-[#1A1714]">
                {arrivalTime}
              </div>
              <div className="text-[13px] text-[#7A7068] font-medium">
                {formatDate(lastSeg?.arrivalDateTime)}
              </div>
              <div className="text-[12px] text-[#8B7355] mt-1 font-medium">
                {destAirportName || journeyDestination?.airportCode} <br /> Terminal: {journeyDestination?.terminal || "Not Available"}
              </div>
            </div>
          </div>

          {/* Segment Details & Baggage */}
          <div className="space-y-0 border border-[#EAE4D9] rounded-lg overflow-hidden mt-6">
            {segments.map((seg, i) => {
              const nextSeg = segments[i + 1];
              const layoverMins = nextSeg ? layoverMinutes(seg, nextSeg) : null;
              
              return (
                <React.Fragment key={i}>
                  <div className="flex flex-wrap items-center justify-between text-[12px] bg-white px-4 py-3 border-b border-[#EAE4D9] last:border-0 gap-4">
                    <div className="flex flex-wrap items-center gap-3 min-w-[150px]">
                      <span className="font-bold text-[#1A1714]">
                        {seg.origin?.airportCode} → {seg.destination?.airportCode}
                      </span>
                     
                    </div>
                    <div className="flex items-center gap-4 text-[#7A7068] font-medium text-[11px]">
                      <span className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded">
                        <FiBriefcase size={12} className="text-gray-400" />
                        Cabin: <strong className="text-gray-700">{seg.baggage?.cabin || "Included"}</strong>
                      </span>
                      <span className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded">
                        <FiBriefcase size={12} className="text-[#B5862A]" />
                        Check-in: <strong className="text-gray-700">{seg.baggage?.checkIn || "Included"}</strong>
                      </span>
                    </div>
                  </div>

                  {nextSeg && (
                    <div className="flex items-center text-[11px] text-[#7A7068] bg-[#FAF8F4] px-4 py-2 border-b border-[#EAE4D9]">
                      <div className="flex items-center gap-2">
                        <FiRefreshCw size={11} className="text-[#B5862A]" />
                        <span><strong className="text-[#1A1714] font-medium">{formatLayoverDuration(layoverMins)}</strong> in {seg.destination?.city} ({seg.destination?.airportCode})</span>
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────── */
/*  SSR Section (restyled)                                         */
/* ────────────────────────────────────────────────────────────── */
function SSRSection({ ssrSnapshot, travellers, segments, isEmployee }) {
  if (!ssrSnapshot) return null;

  const seats = ssrSnapshot?.seats || [];
  const meals = ssrSnapshot?.meals || [];
  const baggage = ssrSnapshot?.baggage || [];
  const specialServices = ssrSnapshot?.specialServices || [];
  const hasSSR =
    seats.length > 0 ||
    meals.length > 0 ||
    baggage.length > 0 ||
    specialServices.length > 0;

  if (!hasSSR) return null;

  // Build traveler name map by index
  const travelerName = (idx) => {
    const t = travellers[idx];
    return t
      ? `${t.title} ${t.firstName} ${t.lastName}`
      : `Passenger ${idx + 1}`;
  };

  // Build segment route label by index
  const segRoute = (segIdx) => {
    const seg = segments[segIdx];
    if (!seg) return null;
    return `${seg.origin?.airportCode || seg.Origin?.Airport?.AirportCode} → ${seg.destination?.airportCode || seg.Destination?.Airport?.AirportCode}`;
  };

  // Group all SSR items by travelerIndex
  // Shape: { [travelerIndex]: { seats: [], meals: [], baggage: [], specialServices: [] } }
  const byTraveler = {};

  travellers.forEach((_, idx) => {
    byTraveler[idx] = { seats: [], meals: [], baggage: [], specialServices: [] };
  });

  seats.forEach((s) => {
    if (byTraveler[s.travelerIndex]) byTraveler[s.travelerIndex].seats.push(s);
  });
  meals.forEach((m) => {
    if (byTraveler[m.travelerIndex]) byTraveler[m.travelerIndex].meals.push(m);
  });
  baggage.forEach((b) => {
    if (byTraveler[b.travelerIndex])
      byTraveler[b.travelerIndex].baggage.push(b);
  });
  specialServices.forEach((s) => {
    if (byTraveler[s.travelerIndex])
      byTraveler[s.travelerIndex].specialServices.push(s);
  });

  // Only include travelers that actually have at least one SSR
  const activeTravelers = Object.entries(byTraveler).filter(
    ([, data]) =>
      data.seats.length > 0 ||
      data.meals.length > 0 ||
      data.baggage.length > 0 ||
      data.specialServices.length > 0,
  );

  if (!activeTravelers.length) return null;

  return (
    <div className="mb-10 bg-white border border-[#EAE4D9] p-8">
      <SectionHeader title="Seat, Meal, Baggage & Special Services" />

      {/* One card per passenger */}
      <div className="grid grid-cols-1 gap-6">
        {activeTravelers.map(([travelerIdx, data]) => {
          const idx = parseInt(travelerIdx);
          const t = travellers[idx];
          const paxTypeLabel =
            t?.paxType === "ADULT"
              ? "Adult"
              : t?.paxType === "CHILD"
                ? "Child"
                : t?.paxType === "INFANT"
                  ? "Infant"
                  : "Passenger";

          const passengerTotal = [
            ...data.seats.map((s) => s.price || 0),
            ...data.meals.map((m) => m.price || 0),
            ...data.baggage.map((b) => b.price || 0),
            ...data.specialServices.map((s) => s.price || s.Price || 0),
          ].reduce((a, b) => a + b, 0);

          // Get unique segments for this passenger's SSRs
          const uniqueSegs = Array.from(
            new Set([
              ...data.seats.map((s) => s.segmentIndex),
              ...data.meals.map((m) => m.segmentIndex),
              ...data.baggage.map((b) => b.segmentIndex),
              ...data.specialServices.map((s) => s.segmentIndex),
            ])
          ).sort((a, b) => a - b);

          const renderItems = (items, getLabel) => {
            if (!items || items.length === 0) return <span className="text-[#D5C5A8]">-</span>;
            return items.map((item, i) => {
              const p = item.price || item.Price || 0;
              return (
                <div key={i} className="mb-1 last:mb-0">
                  {getLabel(item)}{" "}
                  <span className="text-[#A89F94] font-normal text-[11px]">
                    ({p > 0 ? `₹${p}` : "Free"})
                  </span>
                </div>
              );
            });
          };

          return (
            <div
              key={travelerIdx}
              className="bg-white border border-[#EAE4D9] shadow-sm"
            >
              {/* Passenger header */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-4 border-b border-[#EAE4D9] bg-[#FAF8F4]">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-white border border-[#D5C5A8] flex items-center justify-center shrink-0">
                    <FiUser size={13} className="text-[#B5862A]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-[#1A1714] leading-none truncate mb-1">
                      {travelerName(idx)}
                    </p>
                    <p className="text-[10px] text-[#A89F94] font-semibold uppercase tracking-widest leading-none">
                      {paxTypeLabel}
                    </p>
                  </div>
                </div>
                {passengerTotal > 0 && (
                  <span className="text-[14px] font-bold text-[#1A1714] shrink-0 font-['DM_Mono'] tracking-wide">
                    ₹{passengerTotal}
                  </span>
                )}
              </div>

              <div className="overflow-x-auto">
                <div className="min-w-[600px]">
                  {/* Table Header */}
                  <div className="grid grid-cols-[1fr_1fr_1.5fr_1fr_1fr] gap-4 px-4 py-3 border-b border-[#EAE4D9] bg-white">
                    <div className="text-[10px] font-bold tracking-[0.15em] text-[#B5862A] uppercase">Route</div>
                    <div className="text-[10px] font-bold tracking-[0.15em] text-[#A89F94] uppercase">Seat</div>
                    <div className="text-[10px] font-bold tracking-[0.15em] text-[#A89F94] uppercase">Meal</div>
                    <div className="text-[10px] font-bold tracking-[0.15em] text-[#A89F94] uppercase">Baggage</div>
                    <div className="text-[10px] font-bold tracking-[0.15em] text-[#A89F94] uppercase">Special Service</div>
                  </div>

                  {/* Table Rows */}
                  {uniqueSegs.map((segIdx) => {
                    const segSeats = data.seats.filter((s) => s.segmentIndex === segIdx);
                    const segMeals = data.meals.filter((m) => m.segmentIndex === segIdx);
                    const segBaggage = data.baggage.filter((b) => b.segmentIndex === segIdx);
                    const segSS = data.specialServices.filter((s) => s.segmentIndex === segIdx);

                    return (
                      <div
                        key={segIdx}
                        className="grid grid-cols-[1fr_1fr_1.5fr_1fr_1fr] gap-4 px-4 py-4 border-b border-[#EAE4D9] last:border-0 bg-white items-start"
                      >
                        <div className="text-[12px] font-bold text-[#1A1714] mt-0.5">
                          {segRoute(segIdx)}
                        </div>
                        <div className="text-[12px] font-semibold text-[#1A1714]">
                          {renderItems(segSeats, (s) => s.seatNo)}
                        </div>
                        <div className="text-[12px] font-semibold text-[#1A1714]">
                          {renderItems(
                            segMeals,
                            (m) =>
                              m.airlineDescription || m.code +
                              (m.description && typeof m.description === "string"
                                ? ` · ${m.description}`
                                : "")
                          )}
                        </div>
                        <div className="text-[12px] font-semibold text-[#1A1714]">
                          {renderItems(segBaggage, (b) => b.weight || b.description || "Extra Baggage")}
                        </div>
                        <div className="text-[12px] font-semibold text-[#1A1714]">
                          {renderItems(
                            segSS,
                            (s) => s.text || s.Text || s.code || s.Code || "Special Service"
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Grand total across all passengers */}
      {(() => {
        const grandTotal = [
          ...seats.map((s) => s.price || 0),
          ...meals.map((m) => m.price || 0),
          ...baggage.map((b) => b.price || 0),
          ...specialServices.map((s) => s.price || s.Price || 0),
        ].reduce((a, b) => a + b, 0);

        return grandTotal > 0 ? (
          <div className="mt-4 flex justify-between items-center pt-4 border-t border-[#E0D8C8]">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#8B7355]">
              Total Add-on Charges
            </span>
            <span className="text-[15px] font-bold text-gray-900">
              ₹{grandTotal}
            </span>
          </div>
        ) : null;
      })()}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────── */
/*  Fare Summary Card component                                   */
/* ────────────────────────────────────────────────────────────── */
function FareSummaryCard({ baseFare, tax, pricingSnap, refundable, ssrSnapshot, travellers, allSegments }) {
  const seats = ssrSnapshot?.seats || [];
  const meals = ssrSnapshot?.meals || [];
  const baggage = ssrSnapshot?.baggage || [];
  const hasSSR = seats.length > 0 || meals.length > 0 || baggage.length > 0;

  const travelerName = (idx) => {
    const t = travellers[idx];
    return t
      ? `${t.title} ${t.firstName} ${t.lastName}`
      : `Pax ${idx + 1}`;
  };
  const segLabel = (segIdx) => {
    const seg = allSegments[segIdx];
    if (!seg) return "";
    return `${seg.origin?.airportCode}→${seg.destination?.airportCode}`;
  };

  const ssrTotal = [
    ...seats.map((s) => s.price || 0),
    ...meals.map((m) => m.price || 0),
    ...baggage.map((b) => b.price || 0),
  ].reduce((a, b) => a + b, 0);

  return (
    <div className="bg-[#FAF8F4] border border-[#EAE4D9] p-6">
      <div className="text-[11px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-5 flex items-center gap-2">
        <FiCreditCard size={14} className="text-[#B5862A]" /> Fare Summary
      </div>
      <div className="grid grid-cols-1 gap-x-6">
        <InfoRow
          label="Currency"
          value={pricingSnap?.currency || "INR"}
        />
        <InfoRow
          label="Refundable"
          value={refundable ? "Yes" : "No"}
          accent={refundable}
        />
      </div>


      {hasSSR && (
        <div className="mt-4 bg-[#FAF7F2] border border-[#EAE4D9] p-4">
          <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-[#B5862A] mb-3 flex items-center gap-1.5">
            <FiPackage size={11} /> Seat, Meal &amp; Baggage Charges
          </p>
          <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-dashed border-[#D8CEB8] text-[12px]">
            <span className="text-[#A89F94] font-semibold tracking-wide">SSR Total</span>
            <span className="font-['DM_Mono'] font-semibold text-[#1A1714]">₹{ssrTotal.toFixed(2)}</span>
          </div>
        </div>
      )}

      {pricingSnap?.totalAmount != null && (
        <div className="mt-5 pt-5 border-t border-[#EAE4D9]">
          <div className="flex justify-between items-end">
            <div>
              <div className="text-[12px] font-semibold text-[#1A1714]">Total Paid</div>
              <div className="text-[10px] text-[#A89F94] mt-[2px]">incl. taxes &amp; fees</div>
            </div>
            <div className="font-['Cormorant_Garamond'] text-[24px] font-bold text-[#1A1714]">
              ₹{Number(pricingSnap.totalAmount).toLocaleString("en-IN")}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────── */
/*  Booking Summary card (restyled)                               */
/* ────────────────────────────────────────────────────────────── */
function BookingSummaryCard({ booking, displayPnr }) {
  const isConfirmed =
    booking.executionStatus === "ticketed" ||
    (booking.executionStatus === "cancelled" && !!booking.bookingResult?.pnr);

  const approverName = (() => {
    const requesterId = booking.userId?._id || booking.userId;
    const approverId =
      booking.approverId || booking.approvedBy?._id || booking.approvedBy;
    if (
      booking.approverName === "Auto Approve" ||
      (requesterId &&
        approverId &&
        requesterId.toString() === approverId.toString())
    ) {
      return "Auto Approved (System)";
    }
    return booking.approvedBy?.name
      ? `${booking.approvedBy.name.firstName} ${booking.approvedBy.name.lastName}`
      : booking.approverName || "—";
  })();

  const requesterName =
    booking.requesterDetails?.name ||
    (booking.userId?.name
      ? `${booking.userId.name.firstName} ${booking.userId.name.lastName}`
      : booking.travellers?.[0]
        ? `${booking.travellers[0].firstName} ${booking.travellers[0].lastName}`
        : "—");

  const sections = [
    {
      heading: "Project Information",
      fields: [
        {
          label: "Order ID",
          value: booking.orderId || "—",
          icon: <FiHash size={11} />,
        },
        {
          label: "Project Name",
          value: booking.projectName || "—",
          icon: <FiBriefcase size={11} />,
        },
        {
          label: "Project Code",
          value: booking.projectId || booking.projectCodeId || "—",
          icon: <FiTag size={11} />,
        },
        {
          label: "Project Client",
          value: booking.projectClient || "—",
          icon: <FiBriefcase size={11} />,
        },
      ],
    },
    {
      heading: "Requester Details",
      fields: [
        {
          label: "Requester Name",
          value: requesterName,
          icon: <FiUser size={11} />,
        },
        {
          label: "Requester Email",
          value:
            booking.requesterDetails?.email ||
            booking.userId?.email ||
            booking.travellers?.[0]?.email ||
            "—",
          icon: <FiMail size={11} />,
          isEmail: true,
        },
        {
          label: "Purpose of Travel",
          value: booking.purposeOfTravel || booking.purpose || "—",
          icon: <FiBriefcase size={11} />,
        },
      ],
    },
    {
      heading: "Approval Details",
      fields: [
        {
          label: "Selected Approver",
          value: approverName,
          icon: <FiUser size={11} />,
        },
        {
          label: "Approver Email",
          value: booking.approverEmail || booking.approvedBy?.email || "—",
          icon: <FiMail size={11} />,
          isEmail: true,
        },
        {
          label: "Approver Role",
          value: booking.approverRole
            ? booking.approverRole
                .replace(/-/g, " ")
                .replace(/\b\w/g, (c) => c.toUpperCase())
            : "—",
          icon: <FiShield size={11} />,
        },
        ...(booking.approvedBy?.name
          ? [
              {
                label: "Approved By",
                value:
                  `${booking.approvedBy.name.firstName || ""} ${booking.approvedBy.name.lastName || ""}`.trim() ||
                  "—",
                icon: <FiUser size={11} />,
              },
              {
                label: "Approved By Email",
                value: booking.approvedBy?.email || "—",
                icon: <FiMail size={11} />,
                isEmail: true,
              },
              {
                label: "Approved By Role",
                value: booking.approvedBy?.role
                  ? booking.approvedBy.role
                      .replace(/-/g, " ")
                      .replace(/\b\w/g, (c) => c.toUpperCase())
                  : "—",
                icon: <FiShield size={11} />,
              },
            ]
          : []),
        ...(booking.approverComments
          ? [
              {
                label: "Approver Comments",
                value: booking.approverComments,
                icon: <FiMessageSquare size={11} />,
              },
            ]
          : []),
        ...(isConfirmed && getTicketDate(booking)
          ? [
              {
                label: "Ticketed At",
                value: `${formatDate(getTicketDate(booking))} ${formatTime(getTicketDate(booking))}`,
                icon: <FiClock size={11} />,
              },
            ]
          : []),
      ],
    },
  ];

  return (
    <section>
      <SectionHeader num={null} title="Corporate Audit" />
      <div className="bg-white border border-[#EAE4D9] overflow-hidden">
        {sections.map((section, si) => (
          <div key={si} className={si > 0 ? "border-t border-[#EAE4D9]" : ""}>
            {/* Section heading */}
            <div className="px-6 pt-5 pb-3 bg-[#FAF8F4]">
              <div className="text-[9px] font-bold tracking-[0.18em] uppercase text-[#B5862A]">
                {section.heading}
              </div>
            </div>

            {/* Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 divide-[#EAE4D9]">
              {section.fields.map((field, fi) => (
                <div
                  key={fi}
                  className={`px-6 py-5 ${
                    fi % 3 !== 2 ? "sm:border-r border-[#EAE4D9]" : ""
                  } ${fi >= 3 ? "border-t border-[#EAE4D9]" : ""}`}
                >
                  <div className="flex items-center gap-1.5 text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-2">
                    <span className="text-[#B5862A]">{field.icon}</span>
                    {field.label}
                  </div>
                  <div
                    className={`text-[13px] font-semibold text-[#1A1714] leading-snug ${
                      field.isEmail ? "break-all" : ""
                    }`}
                  >
                    {field.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}


/* ────────────────────────────────────────────────────────────── */
/*  Fare Rules (restyled)                                         */
/* ────────────────────────────────────────────────────────────── */
function FareRulesSection({ bookingResult, fareSnapshot, booking }) {
  const onwardFI =
    safeGet(
      bookingResult,
      "onwardResponse",
      "Response",
      "Response",
      "FlightItinerary",
    ) ||
    safeGet(
      bookingResult,
      "providerResponse",
      "Response",
      "Response",
      "FlightItinerary",
    );
  const returnFI = safeGet(
    bookingResult,
    "returnResponse",
    "Response",
    "Response",
    "FlightItinerary",
  );
  const singleFI =
    safeGet(bookingResult, "Response", "Response", "FlightItinerary") ||
    safeGet(bookingResult, "raw", "Response", "Response", "FlightItinerary");

  const rules = [];
  if (onwardFI?.FareRules?.length)
    rules.push({
      label: "Onward",
      journeyType: "onward",
      rules: onwardFI.FareRules,
    });
  if (returnFI?.FareRules?.length)
    rules.push({
      label: "Return",
      journeyType: "return",
      rules: returnFI.FareRules,
    });

  if (!rules.length && singleFI?.FareRules?.length)
    rules.push({
      label: "Onward",
      journeyType: "onward",
      rules: singleFI.FareRules,
    });

  const fareQuoteRules = safeGet(booking, "flightRequest", "fareQuote", "Results", 0, "FareRules") || 
                         safeGet(booking, "flightRequest", "pricing", "Results", 0, "FareRules");

  if (!rules.length && fareQuoteRules?.length) {
    rules.push({
      label: "Fare",
      journeyType: "all",
      rules: fareQuoteRules,
    });
  }

  // Get mini rules from fareSnapshot or fareQuote
  let miniRules = fareSnapshot?.miniFareRules || safeGet(booking, "flightRequest", "fareQuote", "Results", 0, "MiniFareRules") || [];
  if (miniRules.length > 0 && !Array.isArray(miniRules[0])) {
      miniRules = [miniRules];
  }

  if (!rules.length && !miniRules.length) return null;

  const parseRuleDetail = (html) => {
    if (!html) return [];
    const items = [];
    const liMatches = html.matchAll(/<li>([\s\S]*?)<\/li>/gi);
    for (const match of liMatches) {
      const text = match[1]
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (text) items.push({ type: "bullet", text });
    }
    const withoutLists = html
      .replace(/<ul[\s\S]*?<\/ul>/gi, "")
      .replace(/<ol[\s\S]*?<\/ol>/gi, "");
    const paragraphText = withoutLists
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/\r/g, "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    return [
      ...paragraphText.map((t) => ({ type: "paragraph", text: t })),
      ...items,
    ];
  };

  return (
    <div className="bg-white border border-[#EAE4D9] overflow-hidden">
      <div className="w-full flex items-center justify-between px-8 py-5 border-b border-[#EAE4D9]">
        <div className="flex items-center gap-3">
          <FiFileText size={14} className="text-[#B5862A]" />
          <span className="text-[12px] font-semibold tracking-[0.15em] uppercase text-[#1A1714]">
            Fare Rules &amp; Policies
          </span>
        </div>
      </div>

      <div className="px-8 pb-8 pt-6 space-y-8">
        {rules.map((r, i) => (
          <div key={i} className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#A07840]">
                {r.label} Journey
              </span>
              <div className="flex-1 border-t border-[#E8E0D0] border-dashed" />
            </div>

            <div className="space-y-3">
              {r.rules.map((rule, j) => {
                const lines = parseRuleDetail(rule.FareRuleDetail);

                return (
                  <div
                    key={j}
                    className="bg-white rounded-xl border border-[#E8E0D0]"
                  >
                    <div className="w-full px-4 py-3 flex items-center justify-between text-left">
                      <div className="flex items-center gap-3">
                        <div className="w-[6px] h-[6px] rounded-full bg-[#B5862A]" />
                        <div>
                          <p className="text-[13px] font-semibold text-[#1A1714] uppercase tracking-tight">
                            {rule.Origin} → {rule.Destination}
                          </p>
                          <p className="text-[10px] text-[#A89F94] font-medium uppercase tracking-widest mt-0.5">
                            {rule.Airline} · {rule.FareBasisCode}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="px-4 pb-4 pt-1 border-t border-[#F5F0E8]">
                      {lines.length > 0 ? (
                        <div className="space-y-3 mt-3">
                          {lines.map((l, k) => (
                            <div key={k} className="flex gap-2.5">
                              {l.type === "bullet" && (
                                <span className="text-[#A07840] mt-1 text-[8px]">
                                  ●
                                </span>
                              )}
                              <p
                                className={`text-[12px] leading-relaxed ${l.type === "bullet" ? "text-gray-600" : "text-gray-800 font-medium"}`}
                              >
                                {l.text}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-gray-400 italic mt-3">
                          No additional details available for this sector.
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {miniRules.length > 0 && (() => {
          const flatMiniRules = Array.isArray(miniRules) ? miniRules.flat().filter(Boolean) : [];
          const groupedMiniRules = flatMiniRules.reduce((acc, rule) => {
              const route = rule.JourneyPoints || "All Routes";
              if (!acc[route]) acc[route] = [];
              acc[route].push(rule);
              return acc;
          }, {});

          return (
            <div className="space-y-6 mt-8">
              <div className="flex items-center gap-2 px-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#B5862A]">
                  Mini Fare Rules
                </span>
                <div className="flex-1 border-t border-[#EAE4D9] border-dashed" />
              </div>
              
              {Object.entries(groupedMiniRules).map(([route, rulesForRoute], index) => (
                <div key={`mini-route-${index}`} className="space-y-3">
                  <div className="px-1">
                    <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#A89F94]">
                      Route: <span className="text-[#1A1714]">{route}</span>
                    </span>
                  </div>
                  <div className="bg-white border border-[#EAE4D9] rounded-xl overflow-hidden">
                    {rulesForRoute.map((mr, mrIdx) => (
                      <div key={mrIdx} className="px-5 py-4 border-b border-[#EAE4D9] last:border-0 flex justify-between items-center hover:bg-gray-50 transition-colors">
                        <div>
                          <p className="text-[13px] font-bold text-[#1A1714] uppercase tracking-tight">
                            {mr.Type}
                          </p>
                          {(mr.From !== null || mr.To !== null || mr.Unit) && (
                            <p className="text-[10px] text-[#A89F94] font-medium uppercase tracking-widest mt-1">
                              {mr.From !== null && mr.From !== "" ? `From ${mr.From}` : ""} {mr.To !== null && mr.To !== "" ? `To ${mr.To}` : ""} {mr.Unit || ""}
                            </p>
                          )}
                        </div>
                        <div className="text-[14px] font-bold text-[#B5862A]">
                          {mr.Details}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Booking History / Timeline                                     */
/* ─────────────────────────────────────────────────────────────── */
const getTicketDate = (b) => {
  if (b.ticketedAt) return b.ticketedAt;
  const onwardIssueDate = b.bookingResult?.onwardResponse?.Response?.Response?.FlightItinerary?.Passenger?.[0]?.Ticket?.IssueDate;
  if (onwardIssueDate) return onwardIssueDate;
  const providerIssueDate = b.bookingResult?.providerResponse?.Response?.Response?.FlightItinerary?.Passenger?.[0]?.Ticket?.IssueDate;
  if (providerIssueDate) return providerIssueDate;
  if (b.executionStatus === "ticketed") return b.updatedAt;
  return null;
};

function BookingHistory({ booking }) {
  const isCancelled = booking.executionStatus === "cancelled" || !!booking.cancellation;
  const isTicketed = booking.executionStatus === "ticketed" || (isCancelled && !!booking.bookingResult?.pnr);

  const steps = [
    {
      label: "Request Created",
      date: booking.createdAt,
      desc: `Requested by ${booking.userId?.name?.firstName || ""} ${booking.userId?.name?.lastName || ""} (${booking.userId?.email || "N/A"})`,
      icon: <FiClock size={14} />,
      active: true,
    },
    {
      label: "Approval Status",
      date: booking.approvedAt || booking.rejectedAt || (["approved", "rejected"].includes(booking.requestStatus) ? booking.updatedAt : null),
      desc: (() => {
        const isRejected = booking.rejectedAt || booking.requestStatus === "rejected";
        const isApproved = booking.approvedAt || booking.requestStatus === "approved";
        
        if (isRejected) {
          return `Rejected by ${booking.approvedBy?.name?.firstName || booking.approverName || ""} ${booking.approvedBy?.name?.lastName || ""} (${booking.approvedBy?.email || booking.approverEmail || "N/A"})`;
        }
        if (isApproved) {
          const reqEmail = booking.userId?.email || booking.requesterDetails?.email;
          const appEmail = booking.approvedBy?.email || booking.approverEmail;
          const isSameUser = reqEmail && appEmail && reqEmail === appEmail;
          if (booking.approverName === "Auto Approve" || isSameUser) {
             return "Auto Approved by System (Travel Policy)";
          }
          return `Approved by ${booking.approvedBy?.name?.firstName || booking.approverName || ""} ${booking.approvedBy?.name?.lastName || ""} (${booking.approvedBy?.email || booking.approverEmail || "N/A"})`;
        }
        return "Waiting for manager approval";
      })(),
      icon: <FiShield size={14} />,
      active: !!(booking.approvedAt || booking.rejectedAt || ["approved", "rejected"].includes(booking.requestStatus)),
    },
    {
      label: "Ticketing",
      date: getTicketDate(booking),
      desc: isTicketed ? "E-ticket generated and sent to employee" : "Final ticketing pending",
      icon: <FiTag size={14} />,
      active: isTicketed,
    },
    {
      label: "Cancellation",
      date: booking.cancelledAt || (isCancelled ? booking.updatedAt : null),
      desc: isCancelled ? "Booking has been cancelled" : "No cancellation requested",
      icon: <FiXCircle size={14} />,
      active: isCancelled,
      isLast: true,
    },
  ];

  const hasOnlineReissue = 
    (booking.amendment && booking.amendment.type === "AMENDMENT") ||
    (booking.amendment && booking.amendment.status === "completed" && !isCancelled);

  if (hasOnlineReissue) {
    steps.push({
      label: "Reissue Requested",
      date: booking.amendment?.requestedAt || booking.updatedAt,
      desc: `A request to reissue this booking was raised.`,
      icon: <FiRefreshCw size={14} />,
      active: true,
    });
    steps.push({
      label: "Ticket Reissued",
      date: booking.amendment?.updatedAt || booking.updatedAt,
      desc: `Booking has been successfully reissued.`,
      icon: <FiCheckCircle size={14} />,
      active: true,
    });
  }

  const formatDate = (d) => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const formatTime = (d) => new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

  return (
    <div className="bg-white border border-[#EAE4D9] mb-6">
      <div className="px-8 py-6 border-b border-[#EAE4D9]">
        <p className="text-[11px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-1">Audit Trail</p>
        <h2 className="font-['Cormorant_Garamond'] text-[22px] font-semibold text-[#1A1714]">Booking Life Cycle</h2>
      </div>

      <div className="px-8 py-8 relative">
        <div className="absolute left-[43px] top-8 bottom-8 w-px bg-[#EAE4D9]" />

        <div className="space-y-8">
          {steps.map((step, idx) => (
            <div key={idx} className="relative flex gap-6">
              <div className={`relative z-10 w-8 h-8 flex items-center justify-center border transition-colors duration-300 shrink-0 ${
                step.active ? "bg-[#B5862A] border-[#B5862A] text-white" : "bg-white border-[#EAE4D9] text-[#D8D0C8]"
              }`}>
                {step.icon}
              </div>

              <div className="flex-1 pt-1 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                  <p className={`text-[12px] font-semibold tracking-[0.1em] uppercase ${
                    step.active ? "text-[#1A1714]" : "text-[#A89F94]"
                  }`}>
                    {step.label}
                  </p>
                  {step.date && (
                    <span className="text-[10px] font-semibold text-[#B5862A] border border-[#EAE4D9] bg-[#FAF8F4] px-2 py-[2px] tracking-wide">
                      {formatDate(step.date)} · {formatTime(step.date)}
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-[#7A7068] font-medium leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Main page component                                            */
/* ─────────────────────────────────────────────────────────────── */
export default function FlightBookingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  // Detect where we came from: cancelled bookings table or total bookings table
  const searchParams = new URLSearchParams(location.search);
  const source = searchParams.get("source"); // "cancelled" | null
    const backPath =
    source === "cancelled"
      ? "/total-cancelled-bookings"
      : source === "past"
        ? "/past-trips"
        : source === "upcoming"
          ? "/upcoming-trips"
          : source === "wallet"
            ? "/corporate-wallet"
            : source === "postpaid"
              ? "/credit-utilization"
              : "/total-bookings";

  const backLabel =
    source === "cancelled"
      ? "Cancelled Bookings"
      : source === "past"
        ? "Past Trips"
        : source === "upcoming"
          ? "Upcoming Trips"
          : source === "wallet"
            ? "Corporate Wallet"
            : source === "postpaid"
              ? "Postpaid Credit Ledger"
              : "Total Bookings";

  const {
    singleBooking: booking,
    loadingSingleBooking: loading,
    errorSingleBooking: error,
  } = useSelector((s) => s.adminBooking);
  const userRole = useSelector((s) => s.auth?.user?.role);
  const isEmployee = false; // Admin view — always false

  const [amendmentType, setAmendmentType] = useState(null);
  const [showPartialCancel, setShowPartialCancel] = useState(false);
  const [showCancellationModal, setShowCancellationModal] = useState(false);

  const bookingAmendmentStatus = booking?.amendment?.status || "";
  const cancelRequested = sessionStorage.getItem(`cancelRequested_${booking?._id}`) === "true";
  const isCancelled = ["cancelled", "cancel_requested"].includes(booking?.executionStatus?.toLowerCase()) || cancelRequested;

  const isOnlineReissue = booking?.amendment?.type === "AMENDMENT";
  const isAmendmentPending = bookingAmendmentStatus === "requested" || bookingAmendmentStatus === "in_progress";
  const isReissued = booking?.executionStatus?.toLowerCase() === "reissued" || (bookingAmendmentStatus === "completed" && (!isCancelled || isOnlineReissue));
  const isReissuePending = isAmendmentPending && (!isCancelled || isOnlineReissue);
  const hasReissue = isReissued || isReissuePending || isOnlineReissue;

  useEffect(() => {
    if (id) dispatch(getFlightBookingByIdAdmin(id));
  }, [id, dispatch]);

  useEffect(() => {
    if (
      !booking?._id ||
      !["ticket_pending", "on_hold"].includes((booking.executionStatus || "").toLowerCase())
    )
      return;
    const iv = setInterval(
      () => dispatch(getFlightBookingByIdAdmin(booking._id)),
      15000,
    );
    return () => clearInterval(iv);
  }, [booking?._id, booking?.executionStatus, dispatch]);

  const [activeTab, setActiveTab] = useState("flight_details");

  if (loading || !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F4]">
        <div className="w-8 h-8 border-[1.5px] border-[#EAE4D9] border-t-[#B5862A] animate-spin" />
      </div>
    );
  }

  const allSegments = booking.flightRequest?.segments || [];
  const travellers = booking.travellers || [];
  const pricingSnap = booking.pricingSnapshot;
  const fareSnapshot = booking.flightRequest?.fareSnapshot;
  const ssrSnapshot = booking.flightRequest?.ssrSnapshot;
  const fareQuoteResults = booking.flightRequest?.fareQuote?.Results || [];
  const bookingResult = booking.bookingResult;

  // Group segments by journey type
  const journeyMap = {};
  allSegments.forEach((seg) => {
    const jt = seg.journeyType || "onward";
    if (!journeyMap[jt]) journeyMap[jt] = [];
    journeyMap[jt].push(seg);
  });
  const journeyTypes = Object.keys(journeyMap);
  const isRoundTrip = journeyTypes.includes("return");
  const isOneWay = !isRoundTrip;

  // PNR handling for international RT vs domestic
  let pnrsByJourney = {};
  if (
    isRoundTrip &&
    allSegments.some(
      (s) => s.origin?.country !== "IN" || s.destination?.country !== "IN",
    )
  ) {
    pnrsByJourney = {
      onward: booking.bookingResult?.pnr || null,
      return: booking.bookingResult?.pnr || null,
    };
  } else {
    pnrsByJourney = {
      onward:
        booking.bookingResult?.onwardPNR || booking.bookingResult?.pnr || null,
      return: booking.bookingResult?.returnPNR || null,
    };
  }

  const paymentSuccessful = booking.payment?.status === "completed";
  const executionStatus = isCancelled ? "cancelled" : (booking.executionStatus || "").toLowerCase();
  const reason = isCancelled ? "cancelled" : (booking.flightRequest?.reason || "");
  const departureTime = allSegments?.[0]?.departureDateTime;
  const isTravelPassed = departureTime && new Date() > new Date(departureTime);
  const showCancellationChargesBtn =
    (paymentSuccessful || executionStatus === "ticketed") &&
    executionStatus === "ticketed" &&
    !isCancelled &&
    !isTravelPassed;

  // Fare summary calculations (simplified)
  let baseFare = 0,
    tax = 0,
    refundable = false;
  if (isRoundTrip && fareSnapshot) {
    baseFare =
      (fareSnapshot.onwardFare?.BaseFare || 0) +
      (fareSnapshot.returnFare?.BaseFare || 0);
    tax =
      (fareSnapshot.onwardFare?.Tax || 0) + (fareSnapshot.returnFare?.Tax || 0);
    refundable =
      fareSnapshot.onwardFare?.IsRefundable ||
      fareSnapshot.returnFare?.IsRefundable;
  } else if (fareSnapshot) {
    baseFare = fareSnapshot?.baseFare || 0;
    tax = fareSnapshot?.tax || 0;
    refundable = fareSnapshot?.refundable || false;
  }

  return (
    <div className="min-h-screen bg-[#FAF8F4] font-['DM_Sans']">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-white border-b border-[#EAE4D9]">
        {/* Top bar: back + order ID + status */}
        <div className="max-w-[1440px] mx-auto px-6 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate(backPath, { state: location.state })}
            className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-[#7A7068] hover:text-[#1A1714] transition-colors"
          >
            <FiArrowLeft size={14} /> {backLabel}
          </button>
          <div className="flex items-center gap-4">
            <span className="text-[11px] text-[#A89F94]">
              Order ID:{" "}
              <strong className="text-[#1A1714] font-['DM_Mono']">{booking.orderId}</strong>
            </span>
            {(executionStatus === "ticketed" || executionStatus === "confirmed" || executionStatus === "booked") && !isCancelled && (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-[6px] text-[10px] font-semibold tracking-[0.1em] uppercase text-[#2C7A4B] bg-[#EDF7F2] border border-[#C3E4D2] px-[12px] py-1">
                  <MdVerifiedUser size={11} /> Ticket Issued
                </span>
                            <button
                              onClick={() => dispatch(downloadTicketPdf({ bookingId: booking._id }))}
                              className="flex items-center gap-[6px] text-[10px] font-semibold tracking-[0.1em] uppercase text-[#B5862A] border border-[#B5862A] px-[12px] py-1 hover:bg-[#B5862A] hover:text-[#FAF8F4] transition-colors"
                            >
                              <FiDownload size={11} /> Download Ticket
                            </button>
                          </div>
                        )}
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="max-w-[1440px] mx-auto px-6 flex items-end gap-0 border-t border-[#EAE4D9] overflow-x-auto">
          {[
            { id: "flight_details", label: "Flight Details" },
            { id: "project_details", label: "Project Details" },
            { id: "cancellation", label: "Fare Rules & Policies" },
            { id: "passengers", label: "Passengers" },
            { id: "amendment", label: "Cancellation" },
            { id: "history", label: "Booking Life Cycle" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 px-4 py-3 text-[11px] font-semibold tracking-[0.12em] uppercase transition-colors whitespace-nowrap relative border-b-2 ${
                activeTab === tab.id
                  ? "text-[#1A1714] border-[#B5862A]"
                  : "text-[#A89F94] border-transparent hover:text-[#7A7068]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-[1440px] mx-auto px-6 lg:px-10 py-10 pb-24 space-y-6">
        {/* Dynamic Page Heading */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-2">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-2">
              {activeTab === "flight_details" ? "Reservation" :
               activeTab === "passengers" ? "Travellers" :
               activeTab === "project_details" ? "Internal" :
               activeTab === "cancellation" ? "Policies" :
               activeTab === "amendment" ? "Modifications" :
               activeTab === "history" ? "History" : "Details"}
            </p>
            <h1 className="font-['Cormorant_Garamond'] text-[42px] font-bold text-[#1A1714] tracking-tight leading-none mb-3">
              {activeTab === "flight_details" ? (isCancelled ? "The trip is cancelled." : (location.state?.isPastTrip || source === "past") ? "The trip is completed." : "The trip is confirmed.") :
               activeTab === "passengers" ? `Passengers (${travellers.length})` :
               activeTab === "project_details" ? "Project Details" :
               activeTab === "cancellation" ? "Fare Rules & Policies" :
               activeTab === "amendment" ? "Cancellation & Amendment" :
               activeTab === "history" ? "Booking Life Cycle" : "Booking Details"}
            </h1>
            <p className="text-sm text-[#7A7068] leading-relaxed">
              {activeTab === "flight_details" ? "A single-page record of the itinerary, passengers and payment." :
               activeTab === "passengers" ? "Listed once for the entire trip." :
               activeTab === "project_details" ? "Corporate project and approval details." :
               activeTab === "cancellation" ? "Airline policies for this booking." :
               activeTab === "amendment" ? "Request or view changes to your booking." :
               activeTab === "history" ? "Complete timeline of events for this booking." : ""}
            </p>
          </div>
        </div>


        {activeTab === "flight_details" && (
          <div className="space-y-8">
            

            {/* Flight cards + Fare Summary side-by-side */}
            <div
              className="flex flex-col lg:flex-row lg:items-start gap-6"
            >
              <div
                className="w-full lg:w-2/3 space-y-6 min-w-0"
              >
                {/* Flight cards */}
                {journeyTypes.map((jt) => (
                  <FlightCard
                    key={jt}
                    journeyType={jt}
                    segments={journeyMap[jt]}
                    pnr={pnrsByJourney[jt]}
                    paymentSuccessful={paymentSuccessful}
                    fareQuoteResults={fareQuoteResults}
                    bookingResult={bookingResult}
                  />
                ))}
              </div>

              {/* Fare summary (right sticky column) */}
              <div className="w-full lg:w-1/3 lg:sticky lg:top-[200px]">
                <FareSummaryCard
                  baseFare={baseFare}
                  tax={tax}
                  pricingSnap={pricingSnap}
                  refundable={refundable}
                  ssrSnapshot={ssrSnapshot}
                  travellers={travellers}
                  allSegments={allSegments}
                />
              </div>
              
            </div>

             <SSRSection
              ssrSnapshot={ssrSnapshot}
              travellers={travellers}
              segments={allSegments}
              isEmployee={isEmployee}
            />
            {/* Payment & Booking Status */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-[1px] border border-[#EAE4D9] bg-[#EAE4D9]">
              <div className="bg-white p-5">
                <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-2">
                  Payment
                </div>
                <div
                  className={`flex items-center gap-[6px] text-[15px] font-semibold ${
                    paymentSuccessful ? "text-[#2C7A4B]" : "text-[#8A6200]"
                  }`}
                >
                  {paymentSuccessful ? (
                    <FiCheckCircle size={13} />
                  ) : (
                    <FiAlertCircle size={13} />
                  )}
                  <span>{paymentSuccessful ? "Completed" : "Pending"}</span>
                </div>
              </div>

              <div className="bg-white p-5">
                <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-2">
                  Ticket
                </div>
                <div
                  className={`flex items-center gap-[6px] text-[15px] font-semibold ${
                    executionStatus === "ticketed" || executionStatus === "confirmed"
                      ? "text-[#2C7A4B]"
                      : "text-[#8A6200]"
                  }`}
                >
                  {executionStatus === "ticketed" || executionStatus === "confirmed" ? (
                    <FiCheckCircle size={13} />
                  ) : (
                    <FiRefreshCw size={13} className="animate-spin" />
                  )}
                  <span>
                    {executionStatus === "ticketed" || executionStatus === "confirmed"
                      ? "Issued"
                      : "Processing…"}
                  </span>
                </div>
              </div>

              <div className="bg-white p-5">
                <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-2">
                  Passengers
                </div>
                <div className="flex items-center gap-[6px] text-[15px] font-semibold text-[#1A1714]">
                  <FiUsers size={13} className="text-[#A89F94]" />
                  <span>{booking.travellers?.length || travellers?.length || 1}</span>
                </div>
              </div>

              <div className="bg-white p-5 truncate">
                <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-2">
                  Purpose
                </div>
                <div className="flex items-center gap-[6px] text-[15px] font-semibold text-[#1A1714] truncate">
                  <FiBriefcase size={13} className="text-[#A89F94]" shrink-0 />
                  <span className="truncate">{booking.purposeOfTravel || booking.purpose || "—"}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "passengers" && (
          <div className="space-y-6">
            
            {/* Passenger Section */}
            <div className="bg-white border border-[#EAE4D9] overflow-hidden">
              {/* Header */}
              <div className="px-8 py-5 border-b border-[#EAE4D9] flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.15em] uppercase text-[#A89F94]">Passengers</p>
                  <h2 className="font-['Cormorant_Garamond'] text-[22px] font-semibold text-[#1A1714]">
                    {travellers.length} Traveller{travellers.length !== 1 ? "s" : ""}
                  </h2>
                </div>
                <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-[#A89F94]">
                  Listed once for the entire trip
                </span>
              </div>

              {/* Travelers Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[900px]">
                  <thead>
                    <tr className="bg-[#FAF8F4] border-b border-[#EAE4D9] text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94]">
                      <th className="px-6 py-4">Passenger Name</th>
                      <th className="px-4 py-4">Type</th>
                      <th className="px-4 py-4">Gender</th>
                      <th className="px-4 py-4">Date of Birth</th>
                      <th className="px-4 py-4">Ticket Details</th>
                      <th className="px-4 py-4">Add-ons</th>
                      <th className="px-6 py-4 text-right">Contact/Identity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAE4D9]">
                      {travellers.map((trav, idx) => {
                        const seatSSR = ssrSnapshot?.seats?.find(
                          (s) => s.travelerIndex === idx,
                        );
                        const seatNo = seatSSR?.seatNo;

                        const onwardPassengers =
                          safeGet(
                            bookingResult,
                            "onwardResponse",
                            "Response",
                            "Response",
                            "FlightItinerary",
                            "Passenger",
                          ) || [];
                        const returnPassengers =
                          safeGet(
                            bookingResult,
                            "returnResponse",
                            "Response",
                            "Response",
                            "FlightItinerary",
                            "Passenger",
                          ) || [];
                        const singleTripPassengers =
                          safeGet(
                            bookingResult,
                            "providerResponse",
                            "Response",
                            "Response",
                            "FlightItinerary",
                            "Passenger",
                          ) || [];

                        const isRoundTripBooking =
                          onwardPassengers.length > 0 || returnPassengers.length > 0;
                        const resolvedOnwardPax = isRoundTripBooking
                          ? onwardPassengers
                          : singleTripPassengers;
                        const resolvedReturnPax = isRoundTripBooking
                          ? returnPassengers
                          : [];

                        const TicketId = resolvedOnwardPax[idx]?.Ticket?.TicketId;
                        const onwardTicket =
                          resolvedOnwardPax[idx]?.Ticket?.TicketNumber || null;
                        const returnTicket =
                          resolvedReturnPax[idx]?.Ticket?.TicketNumber || null;

                      return (
                        <tr key={trav._id || idx} className="hover:bg-[#FAF8F4] transition-colors">
                          {/* Name Column */}
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 flex items-center justify-center shrink-0 border border-[#EAE4D9] bg-[#FDF8EE]">
                                <FiUser size={15} className="text-[#B5862A]" />
                              </div>
                              <div>
                                  <div className="flex items-center gap-2">
                                    <p className="text-[14px] font-semibold text-[#1A1714] leading-none">
                                      {trav.title} {trav.firstName} {trav.lastName}
                                    </p>
                                    {trav.isLeadPassenger && (
                                      <FiStar size={11} className="text-[#B5862A]" title="Lead Passenger" />
                                    )}
                                  </div>
                                  <p className="text-[10px] text-[#A89F94] font-['DM_Mono'] mt-1 uppercase tracking-tight">
                                    {trav.nationality || "Nationality N/A"}
                                  </p>
                                </div>
                            </div>
                          </td>

                          {/* Type Column */}
                          <td className="px-4 py-5">
                            <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#7A7068] bg-[#FAF8F4] border border-[#EAE4D9] px-2 py-0.5">
                              {formatPaxType(trav.paxType)}
                            </span>
                          </td>

                          {/* Gender Column */}
                          <td className="px-4 py-5">
                            <p className="text-[13px] font-medium text-[#1A1714] capitalize">
                              {trav.gender || "—"}
                            </p>
                          </td>

                          {/* DOB Column */}
                          <td className="px-4 py-5">
                            <p className="text-[12px] font-medium text-[#7A7068]">
                              {trav.dateOfBirth ? formatDateWithYear(trav.dateOfBirth) : "—"}
                            </p>
                          </td>

                            {/* Ticket Details Column */}
                            <td className="px-4 py-5">
                              <div className="space-y-1.5">
                                {TicketId && (
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">ID:</span>
                                    <span className="text-[11px] font-mono font-bold bg-gray-900 text-white px-2 py-0.5 rounded shadow-sm">
                                      {TicketId}
                                    </span>
                                  </div>
                                )}
                                {onwardTicket && (
                                  <div className="flex items-center gap-2">
                                    <FiTag size={10} className="text-emerald-500" />
                                    <span className="text-[11px] font-mono text-gray-700">{onwardTicket}</span>
                                  </div>
                                )}
                                {returnTicket && returnTicket !== onwardTicket && (
                                  <div className="flex items-center gap-2">
                                    <FiTag size={10} className="text-blue-500" />
                                    <span className="text-[11px] font-mono text-gray-700">{returnTicket}</span>
                                  </div>
                                )}
                                {!onwardTicket && !returnTicket && <p className="text-[11px] text-gray-400 italic">No tickets issued</p>}
                              </div>
                            </td>

                            {/* Add-ons Column */}
                            <td className="px-4 py-5">
                              {seatNo ? (
                                <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-100 text-amber-700 px-2.5 py-1 rounded-lg">
                                  <span className="text-[10px] font-bold uppercase">Seat</span>
                                  <span className="text-[12px] font-black">{seatNo}</span>
                                </div>
                              ) : (
                                <span className="text-[11px] text-gray-400">—</span>
                              )}
                            </td>

                            {/* Contact/Identity Column */}
                            <td className="px-6 py-5 text-right">
                              <div className="flex flex-col items-end gap-1">
                                {trav.phoneWithCode && (
                                  <div className="flex items-center gap-1.5 text-gray-600">
                                    <span className="text-[12px] font-semibold">{trav.phoneWithCode}</span>
                                    <FiPhone size={11} className="text-gray-400" />
                                  </div>
                                )}
                                {trav.email && (
                                  <div className="flex items-center gap-1.5 text-gray-500 max-w-[180px] truncate">
                                    <span className="text-[11px] break-all">{trav.email}</span>
                                    <FiMail size={11} className="text-gray-400" />
                                  </div>
                                )}
                                {trav.passportNumber && (
                                  <div className="flex items-center gap-1.5 text-slate-500 mt-0.5">
                                    <span className="text-[11px] font-mono bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded">
                                      {trav.passportNumber}
                                    </span>
                                    <FiCreditCard size={11} className="text-gray-400" />
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "project_details" && (
          <div className="space-y-6">
            <BookingSummaryCard
              booking={booking}
              displayPnr={pnrsByJourney.onward || null}
            />
          </div>
        )}

        {activeTab === "cancellation" && (
          <div className="space-y-6">
            
            <FareRulesSection bookingResult={bookingResult} fareSnapshot={fareSnapshot} booking={booking} />
            
            {/* Cancellation Details */}
            {isCancelled &&
              (() => {
                const raw = booking.amendment?.response || booking.amendment?.raw;
                let totalRefund = 0;
                let totalCharge = 0;
                let creditNotes = [];
                let providerRemarks = [];

                const onwardBookingId =
                  booking.bookingResult?.onwardResponse?.Response?.Response
                    ?.BookingId ||
                  booking.bookingResult?.providerResponse?.Response?.Response
                    ?.BookingId;
                const returnBookingId =
                  booking.bookingResult?.returnResponse?.Response?.Response
                    ?.BookingId;

                const sectorBreakdown = [];

                const getSectorLabel = (bId) => {
                  if (bId && bId === onwardBookingId) {
                    const segs =
                      booking.flightRequest?.segments?.filter(
                        (s) => s.journeyType === "onward",
                      ) || [];
                    if (segs.length > 0) {
                      return `Onward: ${segs[0].origin?.airportCode} → ${segs[segs.length - 1].destination?.airportCode}`;
                    }
                    return "Onward Journey";
                  }
                  if (bId && bId === returnBookingId) {
                    const segs =
                      booking.flightRequest?.segments?.filter(
                        (s) => s.journeyType === "return",
                      ) || [];
                    if (segs.length > 0) {
                      return `Return: ${segs[0].origin?.airportCode} → ${segs[segs.length - 1].destination?.airportCode}`;
                    }
                    return "Return Journey";
                  }
                  return "Booking Segment";
                };

                if (Array.isArray(raw)) {
                  raw.forEach((item) => {
                    const info = item.response?.Response?.TicketCRInfo?.[0];
                    if (info) {
                      totalRefund += Number(info.RefundedAmount || 0);
                      totalCharge += Number(info.CancellationCharge || 0);
                      if (info.CreditNoteNo && info.CreditNoteNo !== "—")
                        creditNotes.push(info.CreditNoteNo);
                      if (info.Remarks && info.Remarks !== "Successful")
                        providerRemarks.push(info.Remarks);

                      sectorBreakdown.push({
                        label: getSectorLabel(item.bookingId),
                        refund: info.RefundedAmount,
                        charge: info.CancellationCharge,
                        creditNote: info.CreditNoteNo,
                        remarks: info.Remarks,
                      });
                    }
                  });
                } else {
                  const info = raw?.Response?.TicketCRInfo?.[0];
                  totalRefund = Number(
                    info?.RefundedAmount || booking.amendment?.refundedAmount || 0,
                  );
                  totalCharge = Number(
                    info?.CancellationCharge ||
                      booking.amendment?.cancellationCharge ||
                      0,
                  );
                  if (info?.CreditNoteNo) creditNotes.push(info.CreditNoteNo);
                  if (info?.Remarks) providerRemarks.push(info.Remarks);
                }

                const displayRefund =
                  totalRefund || booking.amendment?.refundedAmount || "—";
                const displayCharge =
                  totalCharge || booking.amendment?.cancellationCharge || "—";
                const displayCreditNote =
                  creditNotes.length > 0 ? creditNotes.join(", ") : "—";
                const displayRemarks =
                  providerRemarks.length > 0
                    ? providerRemarks.join(" | ")
                    : Array.isArray(raw)
                      ? "Successful"
                      : "";

                return (
                  <div className="space-y-6">
                    {/* Total Aggregated Summary */}
                    <div className="bg-white border border-[#EAE4D9] p-8">
                      <div className="flex items-center justify-between mb-8">
                        <p className="text-[12px] font-semibold tracking-[0.15em] uppercase text-[#1A1714]">
                          Overall Cancellation Summary
                        </p>
                        <div className="flex items-center gap-1.5 px-3 py-1 border border-[#F0C4BA] bg-[#FDF1EE]">
                          <span className="w-1.5 h-1.5 bg-[#B5341A] animate-pulse" />
                          <span className="text-[9px] font-bold uppercase text-[#B5341A] tracking-wider">
                            {booking.amendment?.status || "Cancelled"}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
                        <div>
                          <p className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-2">
                            Cancelled On
                          </p>
                          <p className="text-[14px] font-semibold text-[#1A1714]">
                            {new Date(
                              booking.updatedAt || booking.amendment?.requestedAt,
                            ).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "long",
                              year: "numeric",
                            })}
                          </p>
                        </div>

                        <div>
                          <p className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-2">
                            Total Refund
                          </p>
                          <p className="text-[14px] font-semibold text-[#2C7A4B]">
                            ₹{displayRefund}
                          </p>
                        </div>

                        <div>
                          <p className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-2">
                            Total Charges
                          </p>
                          <p className="text-[14px] font-semibold text-[#B5341A]">
                            ₹{displayCharge}
                          </p>
                        </div>

                        <div>
                          <p className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-2">
                            Credit Note(s)
                          </p>
                          <p className="text-[14px] font-semibold text-[#1A1714] font-['DM_Mono']">
                            {displayCreditNote}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Sector Breakdown Breakdown */}
                    {sectorBreakdown.length > 1 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {sectorBreakdown.map((sector, idx) => (
                          <div
                            key={idx}
                            className="bg-[#FAF8F4] border border-[#EAE4D9] p-6"
                          >
                            <div className="flex items-center justify-between mb-4">
                              <p className="text-[10px] font-bold text-[#1A1714] uppercase tracking-wider flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                {sector.label}
                              </p>
                            </div>
                            <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                              <div>
                                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                                  Refund
                                </p>
                                <p className="text-sm font-bold text-emerald-600">
                                  ₹{sector.refund || "0"}
                                </p>
                              </div>
                              <div>
                                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                                  Charge
                                </p>
                                <p className="text-sm font-bold text-red-500">
                                  ₹{sector.charge || "0"}
                                </p>
                              </div>
                              <div>
                                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                                  Credit Note
                                </p>
                                <p className="text-sm font-mono font-bold text-slate-700">
                                  {sector.creditNote || "—"}
                                </p>
                              </div>
                              <div>
                                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                                  Remarks
                                </p>
                                <p
                                  className="text-xs font-semibold text-blue-600 truncate"
                                  title={sector.remarks}
                                >
                                  {sector.remarks || "Successful"}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Remarks Section */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                            <FiAlertCircle size={14} className="text-slate-400" />
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">
                              Cancellation Reason
                            </p>
                            <p className="text-sm text-gray-600 italic">
                              "
                              {booking.cancellation?.reason ||
                                booking.amendment?.remarks ||
                                "User Requested"}
                              "
                            </p>
                          </div>
                        </div>

                        {(displayRemarks ||
                          (Array.isArray(raw) && raw.length > 0)) && (
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                              <FiInfo size={14} className="text-blue-400" />
                            </div>
                            <div>
                              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">
                                Provider Remarks
                              </p>
                              <p className="text-sm text-blue-600 font-medium">
                                {displayRemarks || "Successful"}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
          </div>
        )}

        {activeTab === "amendment" && (
          <div className="space-y-8">
            {/* Cancellation / Amendment Response — shown when cancelled or amendment requested */}
            {!hasReissue && (isCancelled || (bookingAmendmentStatus && bookingAmendmentStatus !== "not_requested")) && (() => {
              const raw = booking.amendment?.response || booking.amendment?.raw;
              let totalRefund = 0;
              let totalCharge = 0;
              let creditNotes = [];
              let providerRemarks = [];
              const sectorBreakdown = [];

              const onwardBookingId =
                booking.bookingResult?.onwardResponse?.Response?.Response?.BookingId ||
                booking.bookingResult?.providerResponse?.Response?.Response?.BookingId;
              const returnBookingId =
                booking.bookingResult?.returnResponse?.Response?.Response?.BookingId;

              const getSectorLabel = (bId) => {
                if (bId && bId === onwardBookingId) {
                  const segs = booking.flightRequest?.segments?.filter((s) => s.journeyType === "onward") || [];
                  return segs.length > 0 ? `Onward: ${segs[0].origin?.airportCode} → ${segs[segs.length - 1].destination?.airportCode}` : "Onward Journey";
                }
                if (bId && bId === returnBookingId) {
                  const segs = booking.flightRequest?.segments?.filter((s) => s.journeyType === "return") || [];
                  return segs.length > 0 ? `Return: ${segs[0].origin?.airportCode} → ${segs[segs.length - 1].destination?.airportCode}` : "Return Journey";
                }
                return "Booking Segment";
              };

              if (Array.isArray(raw)) {
                raw.forEach((item) => {
                  const info = item.response?.Response?.TicketCRInfo?.[0];
                  if (info) {
                    totalRefund += Number(info.RefundedAmount || 0);
                    totalCharge += Number(info.CancellationCharge || 0);
                    if (info.CreditNoteNo && info.CreditNoteNo !== "—") creditNotes.push(info.CreditNoteNo);
                    if (info.Remarks && info.Remarks !== "Successful") providerRemarks.push(info.Remarks);
                    sectorBreakdown.push({ label: getSectorLabel(item.bookingId), refund: info.RefundedAmount, charge: info.CancellationCharge, creditNote: info.CreditNoteNo, remarks: info.Remarks });
                  }
                });
              } else {
                const info = raw?.Response?.TicketCRInfo?.[0];
                totalRefund = Number(info?.RefundedAmount || booking.amendment?.refundedAmount || 0);
                totalCharge = Number(info?.CancellationCharge || booking.amendment?.cancellationCharge || 0);
                if (info?.CreditNoteNo) creditNotes.push(info.CreditNoteNo);
                if (info?.Remarks) providerRemarks.push(info.Remarks);
              }

              const displayRefund = totalRefund || booking.amendment?.refundedAmount || "—";
              const displayCharge = totalCharge || booking.amendment?.cancellationCharge || "—";
              const displayCreditNote = creditNotes.length > 0 ? creditNotes.join(", ") : "—";
              const displayRemarks = providerRemarks.length > 0 ? providerRemarks.join(" | ") : Array.isArray(raw) ? "Successful" : "";

              const amendStatus = booking.amendment?.status || (isCancelled ? "cancelled" : "");
              const statusLabel = { requested: "Pending", in_progress: "In Progress", approved: "Approved", rejected: "Rejected", cancelled: "Cancelled" }[amendStatus] || amendStatus;
              const statusColor = { requested: "text-[#8A6200] bg-[#FDF8EE] border-[#F0E0A8]", in_progress: "text-[#1A4A7A] bg-[#EEF4FD] border-[#C0D4F0]", approved: "text-[#2C7A4B] bg-[#EDF7F2] border-[#C3E4D2]", rejected: "text-[#B5341A] bg-[#FDF1EE] border-[#F0C4BA]", cancelled: "text-[#B5341A] bg-[#FDF1EE] border-[#F0C4BA]" }[amendStatus] || "text-[#1A1714] bg-[#FAF8F4] border-[#EAE4D9]";

              return (
                <div className="bg-white border border-[#EAE4D9] overflow-hidden">
                  {/* Status header */}
                  <div className="px-6 py-4 border-b border-[#EAE4D9] flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="text-[9px] font-bold tracking-[0.18em] uppercase text-[#A89F94]">{hasReissue ? "Reissue Status" : "Cancellation Status"}</div>
                      {statusLabel && (
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold tracking-[0.12em] uppercase border ${statusColor}`}>
                          {statusLabel}
                        </span>
                      )}
                    </div>
                    {(booking.updatedAt || booking.amendment?.requestedAt) && (
                      <div className="text-[11px] text-[#A89F94]">
                        {new Date(booking.updatedAt || booking.amendment?.requestedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}
                      </div>
                    )}
                  </div>

                  {/* Financial summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-[#EAE4D9] border-b border-[#EAE4D9]">
                    <div className="px-6 py-5">
                      <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-2">Total Refund</div>
                      <div className="text-[18px] font-bold text-[#2C7A4B]">{displayRefund !== "—" ? `₹${Number(displayRefund).toLocaleString("en-IN")}` : "—"}</div>
                    </div>
                    <div className="px-6 py-5">
                      <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-2">{hasReissue ? "Reissue Charges" : "Cancellation Charges"}</div>
                      <div className="text-[18px] font-bold text-[#B5341A]">{displayCharge !== "—" ? `₹${Number(displayCharge).toLocaleString("en-IN")}` : "—"}</div>
                    </div>
                    <div className="px-6 py-5">
                      <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-2">Credit Note(s)</div>
                      <div className="text-[14px] font-semibold text-[#1A1714] font-['DM_Mono']">{displayCreditNote}</div>
                    </div>
                    <div className="px-6 py-5">
                      <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-2">{hasReissue ? "Reissue Reason" : "Cancellation Reason"}</div>
                      <div className="text-[13px] font-medium text-[#1A1714] italic">"{booking.cancellation?.reason || booking.amendment?.remarks || "User Requested"}"</div>
                    </div>
                  </div>

                  {/* Provider remarks */}
                  {displayRemarks && (
                    <div className="px-6 py-4 bg-[#EEF4FD] border-b border-[#C0D4F0] flex items-start gap-3">
                      <FiInfo size={13} className="text-[#1A4A7A] shrink-0 mt-0.5" />
                      <p className="text-[12px] text-[#1A4A7A] font-medium">{displayRemarks}</p>
                    </div>
                  )}

                  {/* Sector breakdown */}
                  {sectorBreakdown.length > 1 && (
                    <div className="p-6 border-b border-[#EAE4D9] bg-[#FAF8F4]">
                      <div className="text-[9px] font-bold tracking-[0.18em] uppercase text-[#B5862A] mb-4">Per-Sector Breakdown</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {sectorBreakdown.map((sector, idx) => (
                          <div key={idx} className="bg-white border border-[#EAE4D9] p-5">
                            <p className="text-[10px] font-bold text-[#1A1714] uppercase tracking-wider mb-4 flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#A89F94]" />
                              {sector.label}
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-1">Refund</div>
                                <div className="text-[14px] font-bold text-[#2C7A4B]">₹{sector.refund || "0"}</div>
                              </div>
                              <div>
                                <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-1">Charges</div>
                                <div className="text-[14px] font-bold text-[#B5341A]">₹{sector.charge || "0"}</div>
                              </div>
                              {sector.creditNote && sector.creditNote !== "—" && (
                                <div className="col-span-2">
                                  <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-1">Credit Note</div>
                                  <div className="text-[12px] font-semibold font-['DM_Mono'] text-[#1A1714]">{sector.creditNote}</div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Active booking — show amendment action buttons */}
            {!isCancelled && (
              hasReissue ? (
                <div className="bg-white border border-[#EAE4D9] p-8 text-center flex flex-col items-center">
                  <FiCheckCircle size={24} className="text-[#2C7A4B] mb-3" />
                  <p className="text-[14px] font-bold text-[#1A1714]">
                    {isReissued ? "Booking Reissued" : "Re-issue in Progress"}
                  </p>
                  <p className="text-[12px] text-[#7A7068] mt-2 max-w-md">
                    {isReissued
                      ? "This booking has been successfully reissued. No further actions can be taken on this ticket."
                      : "A re-issue request is currently being processed for this booking."}
                  </p>
                </div>
              ) : showCancellationChargesBtn ? (
                <div className="bg-white border border-[#EAE4D9] p-6">
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                    <div>
                      <p className="text-[13px] font-semibold text-[#1A1714]">Amendment Actions</p>
                      <p className="text-[11px] text-[#A89F94] mt-0.5">Ticket is live — changes apply immediately</p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <button onClick={() => setShowCancellationModal(true)} className="inline-flex items-center gap-2 px-5 py-[10px] bg-[#B5341A] text-white text-[11px] font-semibold tracking-[0.12em] uppercase hover:bg-[#8A2510] transition">
                        <FiXCircle size={12} /> Cancellation Charges
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-[#A89F94] mt-4">Charges may apply as per fare rules. Cancellation cannot be undone.</p>
                </div>
              ) : isTravelPassed ? (
                <div className="bg-white border border-[#EAE4D9] p-8 text-center">
                  <FiAlertCircle size={24} className="text-[#A89F94] mx-auto mb-3" />
                  <p className="text-[13px] font-semibold text-[#1A1714]">No Amendments Available</p>
                  <p className="text-[12px] text-[#7A7068] mt-1">Amendments cannot be made because the travel date has already passed.</p>
                </div>
              ) : (
                <div className="bg-white border border-[#EAE4D9] p-8 text-center">
                  <FiAlertCircle size={24} className="text-[#A89F94] mx-auto mb-3" />
                  <p className="text-[13px] font-semibold text-[#1A1714]">No Amendments Available</p>
                  <p className="text-[12px] text-[#7A7068] mt-1">Amendments are only available for confirmed and ticketed bookings.</p>
                </div>
              )
            )}
          </div>
        )}

{activeTab === "history" && (
          <div className="space-y-6">
            
            <BookingHistory booking={booking} />
          </div>
        )}
      </main>

      {/* Modals */}
      {createPortal(
        <>
          {showCancellationModal && (
            <CancellationModal
              booking={booking}
              onClose={() => {
                setShowCancellationModal(false);
                dispatch(resetAmendmentState());
              }}
              onSuccess={() => setShowCancellationModal(false)}
            />
          )}
          {amendmentType && (
            <AmendmentModal
              type={amendmentType}
              booking={booking}
              onClose={() => setAmendmentType(null)}
            />
          )}
          {showPartialCancel && (
            <PartialCancelModal
              booking={booking}
              onClose={() => setShowPartialCancel(false)}
            />
          )}
        </>,
        document.body
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  ★ CANCELLATION CHARGES MODAL (FROM EMPLOYEE DASHBOARD)        */
/* ─────────────────────────────────────────────────────────────── */

function CancellationModal({ booking, onClose, onSuccess }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const totalFare =
    booking?.pricingSnapshot?.totalAmount ||
    booking?.totalFare ||
    booking?.fare?.totalFare ||
    booking?.bookingResult?.providerResponse?.Response?.Response
      ?.FlightItinerary?.Fare?.PublishedFare ||
    0;

  const [step, setStep] = useState("loading"); // starts loading charges
  const [charges, setCharges] = useState(null);
  const [chargesError, setChargesError] = useState(null);

  const [selectedJourney, setSelectedJourney] = useState(null);
  const [reissueDate, setReissueDate] = useState("");
  const [returnReissueDate, setReturnReissueDate] = useState("");
  const [remarksText, setRemarksText] = useState("");
  const [successData, setSuccessData] = useState(null);
  const [processingLabel, setProcessingLabel] = useState("Processing…");
  const [shouldFetchCharges, setShouldFetchCharges] = useState(true);

  const [showQueryModal, setShowQueryModal] = useState(false);
  const [queryPriority, setQueryPriority] = useState("MEDIUM");
  const [queryRemarks, setQueryRemarks] = useState("");

  const segments = booking?.flightRequest?.segments || [];
  const journeyTypeOf = (seg) => {
    const jt = (seg?.journeyType || "").toString().toLowerCase();
    return jt === "return" ? "return" : "onward";
  };
  const onwardSegs = segments.filter((s) => journeyTypeOf(s) === "onward");
  const returnSegs = segments.filter((s) => journeyTypeOf(s) === "return");
  const hasReturn = returnSegs.length > 0;

  const sectorLabel = (segList) => {
    if (!segList.length) return "N/A";
    const first = segList[0];
    const last = segList[segList.length - 1];
    return `${first?.origin?.airportCode || "?"} → ${last?.destination?.airportCode || "?"}`;
  };

  useEffect(() => {
    const isCancelled = sessionStorage.getItem(
      `cancelRequested_${booking._id}`,
    );

    if (isCancelled === "true" || !shouldFetchCharges) {
      return;
    }

    (async () => {
      try {
        const res = await dispatch(fetchCancellationCharges(booking._id));

        if (!fetchCancellationCharges.fulfilled.match(res)) {
          throw new Error("Failed to fetch charges");
        }

        setCharges(res.payload);
        setStep("charges");
      } catch (err) {
        console.warn("Charges API failed → allowing actions");
        setChargesError(err.message);
        setCharges(null); 
        setStep("charges"); 
      }
    })();
  }, [booking._id, dispatch, shouldFetchCharges]);

  const isMulti = charges?.isRoundTrip;
  const chargeList = isMulti
    ? charges?.data || []
    : charges
      ? [{ bookingId: null, response: charges }]
      : [];

  const parsedCharges = chargeList.map((item) => {
    const info = extractCancellationChargeInfo(item.response);
    return {
      bookingId: item.bookingId,
      cancellationCharge: info?.cancellationCharge ?? null,
      refundedAmount: info?.refundedAmount ?? null,
      creditNoteNo: info?.creditNoteNo ?? null,
      errorMessage: info?.errorMessage ?? null,
    };
  });
  
  const creditNoteNo = parsedCharges?.[0]?.creditNoteNo ?? charges?.CreditNoteNo ?? null;
  const cancellationCharge = parsedCharges?.[0]?.cancellationCharge ?? null;
  const refundedAmount = parsedCharges?.[0]?.refundedAmount ?? null;

  const handleFullCancel = async () => {
    setStep("processing");
    setProcessingLabel("Submitting cancellation request…");
    try {
      const res = await dispatch(
        fullCancellation({
          bookingId: booking._id,
          remarks: remarksText || undefined,
        }),
      );
      let changeRequestIds = [];
      const responses = res.payload?.data || [];

      if (responses.length > 0) {
        changeRequestIds = responses
          .map(
            (item) =>
              item?.response?.Response?.TicketCRInfo?.[0]?.ChangeRequestId ||
              item?.response?.Response?.ChangeRequestId,
          )
          .filter(Boolean);
      } else {
        const singleId =
          res.payload?.Response?.TicketCRInfo?.[0]?.ChangeRequestId ||
          res.payload?.Response?.ChangeRequestId;
        if (singleId) changeRequestIds = [singleId];
      }

      if (!changeRequestIds.length) {
        throw new Error("No ChangeRequestId returned");
      }

      sessionStorage.setItem(`cancelRequested_${booking._id}`, "true");
      setShouldFetchCharges(false);
      toast.success("Cancellation request submitted successfully");
      onClose();
      await dispatch(getFlightBookingByIdAdmin(booking._id));
      navigate("/manager/total-cancelled-bookings");
    } catch (err) {
      setChargesError(err?.message || "Cancellation failed. Please try again.");
      setStep("error");
    }
  };

  const buildSectors = () => {
    const pick = selectedJourney === "return" ? returnSegs : onwardSegs;
    return pick
      .map((seg) => ({
        Origin: seg?.origin?.airportCode,
        Destination: seg?.destination?.airportCode,
      }))
      .filter((s) => s.Origin && s.Destination);
  };

  const handlePartialCancel = async () => {
    const sectors = buildSectors();
    if (!sectors.length) return;
    setStep("processing");
    setProcessingLabel("Submitting partial cancellation…");
    try {
      const res = await dispatch(
        partialCancellation({
          bookingId: booking._id,
          segments: sectors,
          remarks: remarksText || "User requested partial cancellation",
        }),
      );
      if (res.error) throw new Error(res.payload || "Partial cancellation failed");

      sessionStorage.setItem(`cancelRequested_${booking._id}`, "true");
      setShouldFetchCharges(false);
      toast.success("Partial cancellation request submitted successfully");
      onClose();
      await dispatch(getFlightBookingByIdAdmin(booking._id));
      navigate("/manager/total-cancelled-bookings");
    } catch (err) {
      setChargesError(err?.message || "Partial cancellation failed.");
      setStep("error");
    }
  };

  const handleReissue = async () => {
    if (!reissueDate) return;
    if (hasReturn && !returnReissueDate) {
      setChargesError("Please select the updated return travel date.");
      setStep("error");
      return;
    }
    setStep("processing");
    setProcessingLabel("Submitting reissue request…");
    try {
      const request = await dispatch(
        createReissueRequest({
          bookingId: booking._id,
          newJourney: {
            departureDate: reissueDate,
            ...(hasReturn ? { returnDate: returnReissueDate } : {}),
          },
          remarks: remarksText || "User requested reissue",
        }),
      ).unwrap();
      toast.success(
        `${request.reissueId} created in ${request.mode?.toLowerCase?.() || "servicing"} mode`,
      );
      onClose();
      await dispatch(getFlightBookingByIdAdmin(booking._id));
    } catch (err) {
      setChargesError(err?.message || "Reissue failed. Please try again.");
      setStep("error");
    }
  };

  const handleRaiseQuery = async () => {
    try {
      setShowQueryModal(false);
      setStep("processing");
      setProcessingLabel("Creating cancellation query...");

      const payload = {
        bookingId: booking._id,
        orderId: booking.orderId || booking.bookingReference,
        priority: queryPriority,
        remarks: queryRemarks || "User requested cancellation but charges API failed",
        corporate: {
          companyId: booking?.companyId,
          companyName: booking?.companyName,
          employeeId: booking?.employeeId,
          employeeName: booking?.user?.name,
          employeeEmail: booking?.user?.email,
        },
        bookingSnapshot: {
          journeyType: booking?.tripType,
          travelDate: booking?.travelDate,
          returnDate: booking?.returnDate,
          totalFare: booking?.fare?.totalFare,
          baseFare: booking?.fare?.baseFare,
          taxes: booking?.fare?.taxes,
          serviceFee: booking?.fare?.serviceFee,
          airline: booking?.airline,
          pnr: booking?.pnr,
          sectors: booking?.flightRequest?.segments?.map((seg) => ({
            origin: seg?.origin?.airportCode,
            destination: seg?.destination?.airportCode,
            departureTime: seg?.departureDateTime,
            arrivalTime: seg?.arrivalDateTime,
            airline: seg?.airlineCode,
            flightNumber: seg?.flightNumber,
          })) || [],
        },
        passengers: booking?.travellers?.map((pax) => ({
          name: `${pax.title} ${pax.firstName} ${pax.lastName}`,
          type: pax.paxType,
          ticketNumber: pax.ticketNumber,
        })) || [],
        user: {
          id: booking?.user?._id,
          name: booking?.user?.name,
          email: booking?.user?.email,
          phone: booking?.user?.phone,
        },
        logs: [
          {
            action: "CREATED",
            by: "USER",
            message: "Cancellation query created from UI",
          },
        ],
      };

      const res = await dispatch(createCancellationQuery(payload));
      if (!createCancellationQuery.fulfilled.match(res)) {
        throw new Error(res.payload || "Failed to create query");
      }
      toast.success("Cancellation query created successfully");
      onClose();
      await dispatch(getFlightBookingByIdAdmin(booking._id));
    } catch (err) {
      setChargesError(err?.message || "Failed to create query");
      setStep("error");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={step !== "processing" ? onClose : undefined}
      />
      <div className="relative bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <span className="bg-red-50 rounded-xl p-2">
              <FiXCircle size={16} className="text-red-500" />
            </span>
            <div>
              <h2 className="text-base font-black text-slate-900">
                {step === "reissue" ? "Reissue Flight" : "Cancellation"}
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Order ID · {booking.orderId || booking.bookingReference}
              </p>
            </div>
          </div>
          {step !== "processing" && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition"
            >
              <FiX size={15} className="text-slate-500" />
            </button>
          )}
        </div>

        <div className="px-6 py-5">
          {step === "loading" && (
            <div className="flex flex-col items-center gap-3 py-10">
              <div className="w-10 h-10 rounded-full border-[3px] border-slate-200 border-t-red-400 animate-spin" />
              <p className="text-sm text-slate-400 font-medium">
                Fetching cancellation charges…
              </p>
            </div>
          )}

          {step === "processing" && (
            <div className="flex flex-col items-center gap-3 py-10">
              <div className="w-10 h-10 rounded-full border-[3px] border-slate-200 border-t-indigo-400 animate-spin" />
              <p className="text-sm text-slate-500 font-medium text-center">
                {processingLabel}
              </p>
              <p className="text-xs text-slate-400">Please do not close this window</p>
            </div>
          )}

          {step === "error" && (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
                <FiAlertTriangle size={24} className="text-red-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 mb-1">Something went wrong</p>
                <p className="text-xs text-slate-400">{chargesError}</p>
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {step === "charges" && (
            <div className="space-y-5">
              <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-4 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 mb-1">
                  Cancellation Charges
                </p>
                {cancellationCharge != null ? (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-amber-800 font-medium">Airline Fee</span>
                    <span className="text-lg font-black text-amber-900">₹{cancellationCharge}</span>
                  </div>
                ) : (
                  <p className="text-xs text-amber-600 italic">Fetching real-time charges from airline...</p>
                )}
                {refundedAmount != null && (
                  <div className="flex justify-between items-center pt-2 border-t border-amber-200">
                    <span className="text-sm text-amber-800 font-medium">Estimated Refund</span>
                    <span className="text-lg font-black text-emerald-700">₹{refundedAmount}</span>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Action</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setStep("full-confirm")}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl border border-red-100 bg-red-50/50 hover:bg-red-50 transition"
                  >
                    <FiXCircle className="text-red-500" size={20} />
                    <span className="text-xs font-bold text-red-700">Full Cancel</span>
                  </button>
                  {hasReturn && (
                    <button
                      onClick={() => setStep("partial-select")}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl border border-amber-100 bg-amber-50/50 hover:bg-amber-50 transition"
                    >
                      <FiAlertCircle className="text-amber-500" size={20} />
                      <span className="text-xs font-bold text-amber-700">Partial Cancel</span>
                    </button>
                  )}
                  <button
                    onClick={() => setStep("reissue")}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl border border-indigo-100 bg-indigo-50/50 hover:bg-indigo-50 transition"
                  >
                    <FiRefreshCw className="text-indigo-500" size={20} />
                    <span className="text-xs font-bold text-indigo-700">Reissue</span>
                  </button>
                  <button
                    onClick={() => setShowQueryModal(true)}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition"
                  >
                    <FiMessageSquare className="text-slate-500" size={20} />
                    <span className="text-xs font-bold text-slate-700">Raise Query</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === "full-confirm" && (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                <p className="text-sm text-red-700 font-medium">
                  Are you sure you want to cancel the entire booking? This action cannot be undone.
                </p>
              </div>
              <textarea
                placeholder="Remarks (optional)..."
                className="w-full p-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500"
                rows={3}
                value={remarksText}
                onChange={(e) => setRemarksText(e.target.value)}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setStep("charges")}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold text-sm rounded-xl"
                >
                  Back
                </button>
                <button
                  onClick={handleFullCancel}
                  className="flex-1 py-3 bg-red-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-red-200"
                >
                  Confirm Full Cancel
                </button>
              </div>
            </div>
          )}

          {step === "partial-select" && (
            <div className="space-y-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Select Journey to Cancel</p>
              <div className="grid gap-3">
                <label className={`relative flex items-center justify-between p-4 rounded-xl border cursor-pointer transition ${selectedJourney === "onward" ? "border-amber-500 bg-amber-50" : "border-slate-100 hover:bg-slate-50"}`}>
                  <input
                    type="radio"
                    name="pj"
                    className="absolute opacity-0"
                    onChange={() => setSelectedJourney("onward")}
                  />
                  <span className="text-sm font-bold text-slate-700">Onward: {sectorLabel(onwardSegs)}</span>
                  {selectedJourney === "onward" && <FiCheckCircle className="text-amber-500" />}
                </label>
                {hasReturn && (
                  <label className={`relative flex items-center justify-between p-4 rounded-xl border cursor-pointer transition ${selectedJourney === "return" ? "border-amber-500 bg-amber-50" : "border-slate-100 hover:bg-slate-50"}`}>
                    <input
                      type="radio"
                      name="pj"
                      className="absolute opacity-0"
                      onChange={() => setSelectedJourney("return")}
                    />
                    <span className="text-sm font-bold text-slate-700">Return: {sectorLabel(returnSegs)}</span>
                    {selectedJourney === "return" && <FiCheckCircle className="text-amber-500" />}
                  </label>
                )}
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep("charges")} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold text-sm rounded-xl">Back</button>
                <button
                  disabled={!selectedJourney}
                  onClick={() => setStep("partial-confirm")}
                  className="flex-1 py-3 bg-amber-500 text-white font-bold text-sm rounded-xl disabled:opacity-50"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === "partial-confirm" && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                <p className="text-sm text-amber-700 font-medium">
                  Confirm cancellation for {selectedJourney} journey ({selectedJourney === "onward" ? sectorLabel(onwardSegs) : sectorLabel(returnSegs)}).
                </p>
              </div>
              <textarea
                placeholder="Remarks (optional)..."
                className="w-full p-3 border border-slate-200 rounded-xl text-sm"
                rows={3}
                value={remarksText}
                onChange={(e) => setRemarksText(e.target.value)}
              />
              <div className="flex gap-3">
                <button onClick={() => setStep("partial-select")} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold text-sm rounded-xl">Back</button>
                <button onClick={handlePartialCancel} className="flex-1 py-3 bg-amber-500 text-white font-bold text-sm rounded-xl">Confirm Partial Cancel</button>
              </div>
            </div>
          )}

          {step === "reissue" && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">New Travel Date</p>
                <input
                  type="date"
                  className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500"
                  value={reissueDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setReissueDate(e.target.value)}
                />
              </div>
              {hasReturn && (
                <div className="space-y-1.5">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">New Return Date</p>
                  <input
                    type="date"
                    className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500"
                    value={returnReissueDate}
                    min={reissueDate || new Date().toISOString().split("T")[0]}
                    onChange={(e) => setReturnReissueDate(e.target.value)}
                  />
                </div>
              )}
              <textarea
                placeholder="Reason for reissue..."
                className="w-full p-3 border border-slate-200 rounded-xl text-sm"
                rows={3}
                value={remarksText}
                onChange={(e) => setRemarksText(e.target.value)}
              />
              <div className="flex gap-3">
                <button onClick={() => setStep("charges")} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold text-sm rounded-xl">Back</button>
                <button
                  disabled={!reissueDate || (hasReturn && !returnReissueDate)}
                  onClick={handleReissue}
                  className="flex-1 py-3 bg-indigo-500 text-white font-bold text-sm rounded-xl disabled:opacity-50"
                >
                  Submit Reissue
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showQueryModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowQueryModal(false)} />
          <div className="relative bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl">
            <h2 className="text-2xl font-black text-slate-900 mb-2">Raise Support Query</h2>
            <p className="text-sm text-slate-500 mb-8">Our support team will manually process your cancellation request.</p>
            <div className="mb-6">
              <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">Priority</p>
              <select
                value={queryPriority}
                onChange={(e) => setQueryPriority(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
            <div className="mb-8">
              <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">Remarks</p>
              <textarea
                rows={4}
                value={queryRemarks}
                onChange={(e) => setQueryRemarks(e.target.value)}
                placeholder="Describe your request details..."
                className="w-full border border-slate-200 rounded-xl p-4 text-sm"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowQueryModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl">Cancel</button>
              <button onClick={handleRaiseQuery} className="flex-1 py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-xl shadow-slate-200">Submit Request</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AmendmentModal({ type, booking, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-xl p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-extrabold">
            {type === "cancel" && "Cancel Ticket"}
            {type === "reschedule" && "Reschedule Flight"}
            {type === "modify" && "Modify Traveller"}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        {type === "cancel" && <CancelScreen booking={booking} onClose={onClose} />}
        {type === "reschedule" && <RescheduleScreen booking={booking} onClose={onClose} />}
        {type === "modify" && <ModifyTravellerScreen booking={booking} onClose={onClose} />}
      </div>
    </div>
  );
}

function CancelScreen({ booking, onClose }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [charges, setCharges] = useState(null);

  useEffect(() => {
    const fetchCharges = async () => {
      const res = await dispatch(fetchCancellationCharges(booking._id));
      if (res.payload) setCharges(res.payload);
    };
    fetchCharges();
  }, [booking._id, dispatch]);

  const handleCancel = async () => {
    if (!confirm) return;
    try {
      setLoading(true);
      const res = await dispatch(fullCancellation({ bookingId: booking._id }));
      sessionStorage.setItem(`cancelRequested_${booking._id}`, "true");
      toast.success("Cancellation request submitted successfully");
      await dispatch(getFlightBookingByIdAdmin(booking._id));
      navigate("/manager/total-cancelled-bookings");
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {charges && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm space-y-2">
          <p className="font-semibold text-amber-800">Cancellation Charges</p>
          <div className="flex justify-between">
            <span>Airline Charges</span>
            <span>₹{charges?.AirlineCharge || 0}</span>
          </div>
          <div className="flex justify-between">
            <span>Service Fee</span>
            <span>₹{charges?.ServiceCharge || 0}</span>
          </div>
        </div>
      )}
      <label className="flex items-start gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={confirm}
          onChange={(e) => setConfirm(e.target.checked)}
        />
        I confirm cancellation
      </label>
      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="px-4 py-2 bg-slate-100 rounded-lg">Close</button>
        <button
          onClick={handleCancel}
          disabled={!confirm || loading}
          className="px-4 py-2 bg-red-600 text-white rounded-lg"
        >
          {loading ? "Processing..." : "Cancel Ticket"}
        </button>
      </div>
    </div>
  );
}

function RescheduleScreen({ booking, onClose }) {
  const [newDate, setNewDate] = useState("");
  return (
    <div className="space-y-4">
      <label className="text-sm font-semibold">Select New Date</label>
      <input
        type="date"
        value={newDate}
        onChange={(e) => setNewDate(e.target.value)}
        className="w-full border border-slate-200 rounded-lg px-3 py-2"
      />
      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="px-4 py-2 text-sm font-semibold bg-slate-100 rounded-lg">Close</button>
        <button onClick={onClose} className="px-4 py-2 text-sm font-bold bg-blue-600 text-white rounded-lg">Confirm Reschedule</button>
      </div>
    </div>
  );
}

function ModifyTravellerScreen({ booking, onClose }) {
  const traveller = booking.travellers?.[0];
  const [phone, setPhone] = useState(traveller?.phoneWithCode || "");
  return (
    <div className="space-y-4">
      <label className="text-sm font-semibold">Update Phone</label>
      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className="w-full border border-slate-200 rounded-lg px-3 py-2"
      />
      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="px-4 py-2 text-sm font-semibold bg-slate-100 rounded-lg">Close</button>
        <button className="px-4 py-2 text-sm font-bold bg-indigo-600 text-white rounded-lg">Save Changes</button>
      </div>
    </div>
  );
}

function PartialCancelModal({ booking, onClose }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [selectedJourney, setSelectedJourney] = useState(null);
  const [remarks, setRemarks] = useState("User requested partial cancellation");
  const [loading, setLoading] = useState(false);

  const segments = booking?.flightRequest?.segments || [];
  const journeyTypeOf = (seg) => {
    const jt = (seg?.journeyType || "").toString().toLowerCase();
    return jt === "return" ? "return" : "onward";
  };
  const onwardSegments = segments.filter((s) => journeyTypeOf(s) === "onward");
  const returnSegments = segments.filter((s) => journeyTypeOf(s) === "return");
  const hasReturn = returnSegments.length > 0;

  useEffect(() => {
    if (!hasReturn) setSelectedJourney("onward");
  }, [hasReturn]);

  const sectorLabel = (segList) => {
    if (!segList.length) return "N/A";
    const first = segList[0];
    const last = segList[segList.length - 1];
    return `${first?.origin?.airportCode || "-"} → ${last?.destination?.airportCode || "-"}`;
  };

  const handleSubmit = async () => {
    if (!selectedJourney) return;
    const sectors = onwardSegments.map(s => ({ Origin: s.origin.airportCode, Destination: s.destination.airportCode }));
    try {
      setLoading(true);
      await dispatch(partialCancellation({ bookingId: booking._id, segments: sectors, remarks }));
      sessionStorage.setItem(`cancelRequested_${booking._id}`, "true");
      onClose();
      await dispatch(getFlightBookingByIdAdmin(booking._id));
      navigate("/manager/total-cancelled-bookings");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-xl p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-extrabold">Partial Cancellation</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-xs font-bold uppercase text-slate-400 mb-2">Select Route</p>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="route"
                  disabled={!onwardSegments.length}
                  checked={selectedJourney === "onward"}
                  onChange={() => setSelectedJourney("onward")}
                />
                <span>Onward ({sectorLabel(onwardSegments)})</span>
              </label>
              {hasReturn && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="route"
                    checked={selectedJourney === "return"}
                    onChange={() => setSelectedJourney("return")}
                  />
                  <span>Return ({sectorLabel(returnSegments)})</span>
                </label>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-500 hover:bg-slate-100">Close</button>
            <button onClick={handleSubmit} disabled={!selectedJourney || loading} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700">
              {loading ? "Submitting..." : "Submit Cancellation"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
