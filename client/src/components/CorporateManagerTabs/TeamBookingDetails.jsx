import React, { useEffect, useState, useRef } from "react";
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
  FiPackage,
  FiMapPin,
  FiTag,
  FiFileText,
  FiCalendar,
  FiClock,
  FiShield,
  FiChevronDown,
  FiChevronUp,
  FiChevronLeft,
  FiChevronRight,
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
  FiEye,
  FiUsers,
  FiMenu,
} from "react-icons/fi";
import { getTeamExecutedFlightRequestById } from "../../Redux/Actions/manager.thunk";
import { downloadTicketPdf } from "../../Redux/Actions/booking.thunks";
import { MdVerifiedUser } from "react-icons/md";
import {
  fetchCancellationCharges,
  fullCancellation,
  partialCancellation,
  fetchChangeStatus,
  createCancellationQuery,
} from "../../Redux/Actions/amendmentThunks";
import { checkReissueEligibility, fetchOfflineReissueRequestByBooking, createReissueRequest } from "../../Redux/Actions/reissueThunks";
import { resetAmendmentState } from "../../Redux/Slice/amendmentSlice";
import { clearEligibility } from "../../Redux/Slice/reissueSlice";
import {
  formatDate,
  formatTime,
  formatDuration,
  formatDateWithYear,
  getCabinClassLabel,
  airlineLogo,
  FLIGHT_STATUS_MAP,
} from "../../utils/formatter";
import Swal from "sweetalert2";
import ReissueModal from "../EmployeeDashboard/ReissueModal";

/* ────────────────────────────────────────────────────────────── */
/*  Utility helpers (unchanged)                                   */
/* ────────────────────────────────────────────────────────────── */

function getOfflineReissueBadgeMeta(status) {
  switch (status) {
    case "RAISED":
      return {
        label: "Offline Reissue Requested",
        className: "bg-amber-50 text-amber-700 border border-amber-100",
      };
    case "ASSIGNED":
    case "IN_PROGRESS":
    case "WAITING_AIRLINE":
      return {
        label: "Processing Reissue",
        className: "bg-blue-50 text-blue-700 border border-blue-100",
      };
    case "TICKET_GENERATED":
    case "COMPLETED":
      return {
        label: "Reissued Ticket Ready",
        className: "bg-emerald-50 text-emerald-700 border border-emerald-100",
      };
    case "REJECTED":
      return {
        label: "Reissue Rejected",
        className: "bg-rose-50 text-rose-700 border border-rose-100",
      };
    case "FAILED":
      return {
        label: "Reissue Failed",
        className: "bg-rose-50 text-rose-700 border border-rose-100",
      };
    default:
      return {
        label: "Offline Reissue Requested",
        className: "bg-slate-50 text-slate-700 border border-slate-100",
      };
  }
}

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

  const airlineInfo = [
    segments.map((s) => `${s.origin?.airportCode || s.origin?.code}-${s.destination?.airportCode || s.destination?.code} ${s.airlineCode} ${s.flightNumber}`).join(" · "),
    cabinClassLabel,
  ]
    .filter((v) => v && v !== "—")
    .join(" · ");

  // Total stops across all segments
  const totalStops = segments.length - 1;
  const stopLabel =
    totalStops === 0
      ? "Non-stop"
      : `${totalStops} Stop${totalStops > 1 ? "s" : ""} · ${segments
          .slice(0, -1)
          .map((s) => s.destination?.airportCode || s.destination?.code)
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

  const originAirportName = resolveAirportName(
    journeyOrigin?.airportCode || journeyOrigin?.code,
    true,
  );
  const destAirportName = resolveAirportName(
    journeyDestination?.airportCode || journeyDestination?.code,
    false,
  );

  return (
    <div className="bg-white border border-[#EAE4D9] mb-6">
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
             {airlineInfo}
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

/* ─────────────────────────────────────────────────────────────── */
/*  Payment & Booking Status                                       */
/* ─────────────────────────────────────────────────────────────── */
function PaymentStatusCard({
  booking,
  paymentSuccessful,
  isConfirmed,
  isTravelAdmin,
}) {
  const items = [
    {
      label: "Payment",
      value: paymentSuccessful ? "Completed" : "Pending",
      ok: paymentSuccessful,
      icon: paymentSuccessful ? (
        <FiCheckCircle size={13} />
      ) : (
        <FiAlertCircle size={13} />
      ),
      hidden: !isTravelAdmin,
    },
    {
      label: "Ticket",
      value: isConfirmed ? "Issued" : "Processing…",
      ok: isConfirmed,
      icon: isConfirmed ? (
        <FiCheckCircle size={13} />
      ) : (
        <FiRefreshCw size={13} className="animate-spin" />
      ),
    },
    {
      label: "Passengers",
      value: booking?.travellers?.length || 1,
      ok: null,
      icon: <FiUsers size={13} />,
    },
    {
      label: "Purpose",
      value: booking?.purposeOfTravel || "—",
      ok: null,
      icon: <FiBriefcase size={13} />,
    },
  ].filter((item) => !item.hidden);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-[1px] border border-[#EAE4D9] bg-[#EAE4D9] mb-8">
      {items.map((item, i) => (
        <div key={i} className="bg-white p-5">
          <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-2">
            {item.label}
          </div>
          <div
            className={`flex items-center gap-[6px] text-[15px] font-semibold ${
              item.ok === true
                ? "text-[#2C7A4B]"
                : item.ok === false
                  ? "text-[#8A6200]"
                  : "text-[#1A1714]"
            }`}
          >
            <span
              className={
                item.ok === true
                  ? "text-[#2C7A4B]"
                  : item.ok === false
                    ? "text-[#8A6200]"
                    : "text-[#A89F94]"
              }
            >
              {item.icon}
            </span>
            {item.value}
          </div>
        </div>
      ))}
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
      <SectionHeader num={1} title="Seat, Meal, Baggage & Special Services" />

      {/* One card per passenger */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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

          return (
            <div
              key={travelerIdx}
              className="bg-white border border-[#EAE4D9] p-5 shadow-sm"
            >
              {/* Passenger header */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-4 border-b border-[#EAE4D9]">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#FDF8EE] border border-[#F0E0A8] flex items-center justify-center shrink-0">
                    <FiUser size={13} className="text-[#B5862A]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-[#1A1714] leading-none truncate">
                      {travelerName(idx)}
                    </p>
                    <p className="text-[10px] text-[#A89F94] font-semibold uppercase tracking-widest mt-1">
                      {paxTypeLabel}
                    </p>
                  </div>
                </div>
                {passengerTotal > 0 && !isEmployee && (
                  <span className="text-[14px] font-bold text-[#1A1714] shrink-0 font-['DM_Mono'] tracking-wide">
                    ₹{passengerTotal}
                  </span>
                )}
              </div>

              <div className="space-y-3">
                {/* Seats */}
                {data.seats.map((s, i) => (
                  <div
                    key={`seat-${i}`}
                    className="flex items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-md bg-[#FDF8EE] flex items-center justify-center text-[9px] font-bold text-[#B5862A] shrink-0 mt-0.5">
                        S
                      </span>
                      <div className="min-w-0">
                        <p className="text-[12px] font-medium text-[#1A1714] break-words">
                          Seat {s.seatNo}
                        </p>
                        {segRoute(s.segmentIndex) && (
                          <p className="text-[10px] text-[#A89F94] uppercase tracking-wide break-all mt-0.5">
                            {segRoute(s.segmentIndex)}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-[12px] font-semibold text-[#1A1714] shrink-0 text-right">
                      {s.price > 0 ? (!isEmployee ? `₹${s.price}` : "Selected") : "Free"}
                    </span>
                  </div>
                ))}

                {/* Meals */}
                {data.meals.map((m, i) => (
                  <div
                    key={`meal-${i}`}
                    className="flex items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-md bg-[#FDF8EE] flex items-center justify-center text-[9px] font-bold text-[#B5862A] shrink-0 mt-0.5">
                        M
                      </span>
                      <div className="min-w-0">
                        <p className="text-[12px] font-medium text-[#1A1714] break-words">
                          {m.code}
                          {m.description && typeof m.description === "string"
                            ? ` · ${m.description}`
                            : ""}
                        </p>
                        {segRoute(m.segmentIndex) && (
                          <p className="text-[10px] text-[#A89F94] uppercase tracking-wide break-all mt-0.5">
                            {segRoute(m.segmentIndex)}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-[12px] font-semibold text-[#1A1714] shrink-0 text-right">
                      {m.price > 0 ? (
                        !isEmployee ? `₹${m.price}` : "Selected"
                      ) : (
                        <span className="text-[11px] text-[#A89F94] italic font-normal">
                          Complimentary
                        </span>
                      )}
                    </span>
                  </div>
                ))}

                {/* Baggage */}
                {data.baggage.map((b, i) => (
                  <div
                    key={`bag-${i}`}
                    className="flex items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-md bg-[#FDF8EE] flex items-center justify-center text-[9px] font-bold text-[#B5862A] shrink-0 mt-0.5">
                        B
                      </span>
                      <div className="min-w-0">
                        <p className="text-[12px] font-medium text-[#1A1714] break-words">
                          Baggage · {b.weight || b.description || "Extra"}
                        </p>
                        {segRoute(b.segmentIndex) && (
                          <p className="text-[10px] text-[#A89F94] uppercase tracking-wide break-all mt-0.5">
                            {segRoute(b.segmentIndex)}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-[12px] font-semibold text-[#1A1714] shrink-0 text-right">
                      {b.price > 0 ? (!isEmployee ? `₹${b.price}` : "Selected") : "Free"}
                    </span>
                  </div>
                ))}

                {/* Special Services */}
                {data.specialServices.map((s, i) => (
                  <div
                    key={`special-${i}`}
                    className="flex items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-md bg-[#FDF8EE] flex items-center justify-center text-[9px] font-bold text-[#B5862A] shrink-0 mt-0.5">
                        SS
                      </span>
                      <div className="min-w-0">
                        <p className="text-[12px] font-medium text-[#1A1714] break-words">
                          {s.text || s.Text || s.code || s.Code || "Special Service"}
                        </p>
                        {segRoute(s.segmentIndex) && (
                          <p className="text-[10px] text-[#A89F94] uppercase tracking-wide break-all mt-0.5">
                            {segRoute(s.segmentIndex)}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-[12px] font-semibold text-[#1A1714] shrink-0 text-right">
                      {(s.price > 0 || s.Price > 0) ? (!isEmployee ? `₹${s.price || s.Price}` : "Selected") : "Free"}
                    </span>
                  </div>
                ))}
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

        return grandTotal > 0 && !isEmployee ? (
          <div className="mt-6 flex justify-between items-center pt-4 border-t border-[#EAE4D9]">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#B5862A]">
              Total Add-on Charges
            </span>
            <span className="text-[16px] font-bold text-[#1A1714] font-['DM_Mono']">
              ₹{grandTotal}
            </span>
          </div>
        ) : null;
      })()}
    </div>
  );
}

const getTicketDate = (b) => {
  if (b.ticketedAt) return b.ticketedAt;
  const onwardIssueDate = b.bookingResult?.onwardResponse?.Response?.Response?.FlightItinerary?.Passenger?.[0]?.Ticket?.IssueDate;
  if (onwardIssueDate) return onwardIssueDate;
  const providerIssueDate = b.bookingResult?.providerResponse?.Response?.Response?.FlightItinerary?.Passenger?.[0]?.Ticket?.IssueDate;
  if (providerIssueDate) return providerIssueDate;
  if (b.executionStatus === "ticketed") return b.updatedAt;
  return null;
};

/* ────────────────────────────────────────────────────────────── */
/*  Booking History / Timeline                                    */
/* ────────────────────────────────────────────────────────────── */
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
      date: booking.approvedAt || booking.rejectedAt,
      desc: (() => {
        if (booking.rejectedAt) {
          return `Rejected by ${booking.approvedBy?.name?.firstName || ""} ${booking.approvedBy?.name?.lastName || ""} (${booking.approvedBy?.email || booking.approverEmail || "N/A"})`;
        }
        if (booking.approvedAt) {
          const requesterId = booking.userId?._id || booking.userId;
          const approverId = booking.approverId || booking.approvedBy?._id || booking.approvedBy;
          
          if (booking.approverName === "Auto Approve" || (requesterId && approverId && requesterId.toString() === approverId.toString())) {
            return "Auto Approved by System (Travel Policy)";
          }
          
          return `Approved by ${booking.approvedBy?.name?.firstName || ""} ${booking.approvedBy?.name?.lastName || ""} (${booking.approvedBy?.email || booking.approverEmail || "N/A"})`;
        }
        return "Awaiting approval";
      })(),
      icon: <FiCheckCircle size={14} />,
      active: !!(booking.approvedAt || booking.rejectedAt),
    },
    {
      label: "Ticketing",
      date: getTicketDate(booking),
      desc: isTicketed ? "E-ticket generated and sent to employee" : "Final ticketing pending",
      icon: <FiTag size={14} />,
      active: isTicketed,
    }
  ];

  if (isCancelled) {
    steps.push({
      label: "Cancelled",
      date: booking.cancelledAt || booking.cancellation?.cancelledAt || booking.updatedAt,
      desc: `Booking cancelled. ${booking.cancellation?.reason ? `Reason: ${booking.cancellation.reason}` : ""}`,
      icon: <FiXCircle size={14} className="text-red-500" />,
      active: true,
      isError: true,
    });
  }

  return (
    <div className="bg-white border border-[#EAE4D9] p-8 mb-10">
      <SectionHeader num={null} title="Booking Timeline & History" />
      
      <div className="relative mt-2">
        {/* Vertical line */}
        <div className="absolute left-[15px] top-2 bottom-2 w-[1px] bg-[#EAE4D9]" />
        
        <div className="space-y-8">
          {steps.map((step, idx) => (
            <div key={idx} className="relative pl-10">
              {/* Dot */}
              <div className={`absolute left-0 top-0 w-8 h-8 rounded-full border flex items-center justify-center bg-white z-10 transition-colors ${
                step.isError ? "border-red-500 text-red-600" :
                step.active ? "border-[#B5862A] text-[#B5862A]" : "border-[#EAE4D9] text-[#A89F94]"
              }`}>
                {step.icon}
              </div>
              
              <div className={step.active ? "opacity-100" : "opacity-40"}>
                <div className="flex flex-wrap items-center gap-3 mb-1">
                  <p className={`text-[13px] font-semibold ${step.active ? "text-[#1A1714]" : "text-[#A89F94]"}`}>
                    {step.label}
                  </p>
                  {step.date && (
                    <span className="text-[10px] font-bold text-[#B5862A] px-2 py-[2px] bg-[#FDF8EE] border border-[#F0E0A8] uppercase tracking-widest font-['DM_Mono']">
                      {formatDate(step.date)} · {formatTime(step.date)}
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-[#7A7068] font-medium">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
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

  const miniRules = fareSnapshot?.miniFareRules || [];

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
    <div className="bg-white border border-[#EAE4D9] p-8 mb-10">
      <SectionHeader num={null} title="Fare Rules" />

      <div className="space-y-6 mt-2">
          {rules.map((r, i) => (
            <div key={i} className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#B5862A]">
                  {r.label} Journey
                </span>
                <div className="flex-1 border-t border-[#EAE4D9] border-dashed" />
              </div>

              <div className="space-y-3">
                {r.rules.map((rule, j) => {
                  const lines = parseRuleDetail(rule.FareRuleDetail);

                  return (
                    <div
                      key={j}
                      className="bg-white border border-[#EAE4D9] transition-all duration-300"
                    >
                      <div className="w-full px-5 py-4 flex items-center justify-between text-left">
                        <div className="flex items-center gap-4">
                          <div className="w-[6px] h-[6px] bg-[#B5862A]" />
                          <div>
                            <p className="text-[13px] font-bold text-[#1A1714] uppercase tracking-tight">
                              {rule.Origin} → {rule.Destination}
                            </p>
                            <p className="text-[10px] text-[#A89F94] font-semibold uppercase tracking-widest mt-0.5">
                              {rule.Airline} · {rule.FareBasisCode}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="px-5 pb-5 pt-2 border-t border-[#EAE4D9] bg-[#FAF8F4]">
                        {lines.length > 0 ? (
                          <div className="space-y-3 mt-3">
                            {lines.map((l, k) => (
                              <div key={k} className="flex gap-2.5">
                                {l.type === "bullet" && (
                                  <span className="text-[#B5862A] mt-1 text-[8px]">
                                    ●
                                  </span>
                                )}
                                <p
                                  className={`text-[12px] leading-relaxed ${l.type === "bullet" ? "text-[#7A7068]" : "text-[#1A1714] font-medium"}`}
                                >
                                  {l.text}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-[#A89F94] italic mt-3">
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

          {miniRules.length > 0 && (
            <div className="space-y-4 mt-8">
              <div className="flex items-center gap-2 px-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#B5862A]">
                  Mini Fare Rules
                </span>
                <div className="flex-1 border-t border-[#EAE4D9] border-dashed" />
              </div>
              <div className="space-y-3">
                {miniRules.map((sectorRules, index) => (
                  <div key={`mini-${index}`} className="bg-white border border-[#EAE4D9] overflow-hidden">
                    {sectorRules.map((mr, mrIdx) => (
                      <div key={mrIdx} className="px-5 py-4 border-b border-[#EAE4D9] last:border-0 flex justify-between items-center">
                        <div>
                          <p className="text-[13px] font-bold text-[#1A1714] uppercase tracking-tight">
                            {mr.Type}
                          </p>
                          <p className="text-[10px] text-[#A89F94] font-semibold uppercase tracking-widest mt-0.5">
                            {mr.JourneyPoints}
                          </p>
                        </div>
                        <div className="text-[13px] font-bold text-[#B5862A]">
                          {mr.Details}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}


        </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Main page component                                            */
/* ─────────────────────────────────────────────────────────────── */
export default function TeamBookingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const passengerTableRef = useRef(null);

  const scrollTable = (direction) => {
    if (passengerTableRef.current) {
      const scrollAmount = 250;
      passengerTableRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };
  const { teamBookingDetail: booking, loadingTeamBookingDetail: loading } =
    useSelector((s) => s.manager);
  const userRole = useSelector((s) => s.auth?.user?.role);
  const sessionRole =
    sessionStorage.getItem("userRole") || sessionStorage.getItem("role");
  const isEmployee =
    userRole === "employee" ||
    userRole === "manager" ||
    sessionRole === "employee" ||
    sessionRole === "manager";

  const [amendmentType, setAmendmentType] = useState(null);
  const [showPartialCancel, setShowPartialCancel] = useState(false);
  const [showCancellationModal, setShowCancellationModal] = useState(false);
  const [showReissueModal, setShowReissueModal] = useState(false);
  const [activeTab, setActiveTab] = useState("flight_details");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ── Reissue eligibility ──
  const { eligibility, eligibilityLoading, bookingOfflineRequest } = useSelector((s) => s.reissue);
  const isOnlineEligible = eligibility?.support?.onlineReissueAllowed === true;
  const isOfflineRequired = Boolean(eligibility) && !isOnlineEligible;
  const offlineReissueBadge = bookingOfflineRequest
    ? getOfflineReissueBadgeMeta(bookingOfflineRequest.status)
    : null;

  const bookingAmendmentStatus = booking?.amendment?.status || "";
  const cancelRequested =
    sessionStorage.getItem(`cancelRequested_${booking?._id}`) === "true";
  const isCancelled =
    ["cancelled", "cancel_requested"].includes(
      booking?.executionStatus?.toLowerCase(),
    ) ||
    (isEmployee && cancelRequested);

  useEffect(() => {
    if (id) dispatch(getTeamExecutedFlightRequestById(id));
  }, [id, dispatch]);

  // ── Check reissue eligibility when booking loads ──
  useEffect(() => {
    if (
      booking?._id &&
      booking?.bookingType === "flight" &&
      booking?.executionStatus === "ticketed"
    ) {
      dispatch(checkReissueEligibility(booking._id));
      dispatch(fetchOfflineReissueRequestByBooking(booking._id));
    }
    return () => {
      dispatch(clearEligibility());
    };
  }, [booking?._id, booking?.executionStatus, dispatch]);

  // ── Listen for reissue modal trigger from CancellationModal ──
  useEffect(() => {
    const handler = () => setShowReissueModal(true);
    window.addEventListener("openReissueModal", handler);
    return () => window.removeEventListener("openReissueModal", handler);
  }, []);

  useEffect(() => {
    if (
      !booking?._id ||
      !["ticket_pending", "on_hold"].includes((booking.executionStatus || "").toLowerCase())
    )
      return;
    const iv = setInterval(
      () => dispatch(getTeamExecutedFlightRequestById(booking._id)),
      15000,
    );
    return () => clearInterval(iv);
  }, [booking?._id, booking?.executionStatus, dispatch]);

  if (loading || !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-teal-500 rounded-full animate-spin" />
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
  const upsellList = fareQuoteResults[0]?.UpsellOptionsList?.UpsellList || booking.flightRequest?.pricing?.Results?.[0]?.UpsellOptionsList?.UpsellList || [];

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
    <div className="bg-[#FAF8F4] min-h-screen font-['DM_Sans'] selection:bg-[#B5862A20] selection:text-[#B5862A]">
      <style>{`
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
      `}</style>

      {/* ── Sticky nav ── */}
      <div className="sticky top-0 z-40 bg-white border-b border-[#EAE4D9]">
        {/* Top Row */}
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-[#7A7068] hover:text-[#1A1714] transition-colors"
          >
            <FiArrowLeft size={14} /> <span className="hidden sm:inline">Back</span><span className="sm:hidden">Back</span>
          </button>
          
          <div className="flex items-center gap-2 sm:gap-4">
            {(booking.orderId || booking.bookingReference) && (
              <span className="hidden sm:inline text-[11px] text-[#A89F94]">
                Order ID:{" "}
                <strong className="text-[#1A1714] font-['DM_Mono']">
                  {booking.orderId || booking.bookingReference}
                </strong>
              </span>
            )}
            {(executionStatus === "ticketed" || executionStatus === "confirmed" || executionStatus === "booked") && !isCancelled && (
              <div className="flex items-center gap-2">
                <span className="hidden sm:flex items-center gap-[6px] text-[10px] font-semibold tracking-[0.1em] uppercase text-[#2C7A4B] bg-[#EDF7F2] border border-[#C3E4D2] px-[12px] py-1">
                  <MdVerifiedUser size={11} /> Ticket Issued
                </span>
                <button
                  onClick={() => dispatch(downloadTicketPdf({ bookingId: booking._id }))}
                  className="flex items-center gap-[6px] text-[10px] font-semibold tracking-[0.1em] uppercase text-[#B5862A] border border-[#B5862A] px-[12px] py-1 hover:bg-[#B5862A] hover:text-[#FAF8F4] transition-colors"
                >
                  <FiDownload size={11} /> <span className="hidden sm:inline">Download Ticket</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tabs Navigation (Desktop & Mobile) */}
        <div className="max-w-[1440px] mx-auto relative border-t border-[#EAE4D9]">
          {/* Mobile Dropdown Button */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="w-full flex items-center justify-between bg-[#FAF8F4] border-b border-[#EAE4D9] px-4 py-3 text-[13px] font-bold text-[#1A1714]"
            >
              <span className="flex items-center gap-2">
                <FiMenu className="text-[#B5862A]" size={16} />
                {activeTab === "flight_details" && "Flight Details"}
                {activeTab === "project" && "Project Details"}
                {activeTab === "charges_rules" && "Charges and rules"}
                {activeTab === "passengers" && "Passengers"}
                {activeTab === "upsell_options" && "Upsell Options"}
                {activeTab === "amendment" && "Amendment"}
                {activeTab === "history" && "Booking Life Cycle"}
              </span>
              <FiChevronDown
                size={16}
                className={`text-[#B5862A] transition-transform duration-300 ${mobileMenuOpen ? 'rotate-180' : ''}`}
              />
            </button>
          </div>

          {/* Desktop Tabs / Mobile Dropdown Content */}
          <div className={`
            md:flex items-end gap-0 overflow-x-auto w-full px-4 sm:px-6
            ${mobileMenuOpen ? 'flex flex-col absolute top-full left-0 right-0 bg-white border-b border-[#EAE4D9] shadow-lg z-50 p-2' : 'hidden'}
          `}>
            {[
              { id: "flight_details", label: "Flight Details" },
              { id: "project", label: "Project Details" },
              { id: "charges_rules", label: "Charges and rules" },
              { id: "passengers", label: "Passengers" },
              ...(upsellList && upsellList.length > 0 ? [{ id: "upsell_options", label: "Upsell Options" }] : []),
              { id: "amendment", label: "Amendment" },
              { id: "history", label: "Booking Life Cycle" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setMobileMenuOpen(false);
                }}
                className={`
                  shrink-0 text-[11px] font-semibold tracking-[0.12em] uppercase transition-colors whitespace-nowrap relative
                  ${mobileMenuOpen ? 'w-full text-left px-4 py-3 border-b border-[#EAE4D9] last:border-0' : 'px-4 py-3 border-b-2'}
                  ${
                    activeTab === tab.id
                      ? "text-[#1A1714] bg-[#FAF8F4] md:bg-transparent md:border-[#B5862A]"
                      : "text-[#A89F94] border-transparent hover:text-[#7A7068]"
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-[1440px] mx-auto px-6 lg:px-10 py-10 pb-24 space-y-6">
        {/* ── Dynamic Header ── */}
        {(() => {
          let label = "Reservation";
          let title = isCancelled ? "The trip is cancelled." : location.state?.isPastTrip ? "The trip is completed." : "The trip is confirmed.";
          let subtitle = "A clean, single-page record of the itinerary, passengers and payment.";

          if (activeTab === "project") {
            label = "Project Details";
            title = "Project & Approvals";
            subtitle = "Information about the project code and the approval workflow for this trip.";
          } else if (activeTab === "charges_rules") {
            label = "Pricing Breakdown";
            title = "Charges & Fare Rules";
            subtitle = "Detailed breakdown of the total fare, taxes, and airline policies.";
          } else if (activeTab === "passengers") {
            label = "Traveller Information";
            title = "Passengers";
            subtitle = "List of all passengers travelling on this reservation.";
          } else if (activeTab === "upsell_options") {
            label = "Upgrades & Add-ons";
            title = "Upsell Options";
            subtitle = "Available upgrades and premium options for this reservation.";
          } else if (activeTab === "amendment") {
            label = "Modifications";
            title = "Amendments & Options";
            subtitle = "Manage cancellations, reissues, and support queries for this booking.";
          } else if (activeTab === "history") {
            label = "Audit Trail";
            title = "Booking Life Cycle";
            subtitle = "Chronological history of status changes and events for this reservation.";
          }

          return (
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#8B7355] mb-2">
                  {label}
                </p>
                <h1 className="text-[36px] font-black text-gray-900 tracking-tight leading-none mb-3">
                  {title}
                </h1>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {subtitle}
                </p>
              </div>
            </div>
          );
        })()}

        

        {/* Tab Contents */}
        <div className="pt-4">
          {activeTab === "flight_details" && (
            <div className={`grid grid-cols-1 gap-6 ${userRole === "travel-admin" ? "lg:grid-cols-3" : ""}`}>
              <div className={`space-y-6 ${userRole === "travel-admin" ? "lg:col-span-2" : ""}`}>
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

                {/* Payment Status Card */}
                <PaymentStatusCard
                  booking={booking}
                  paymentSuccessful={paymentSuccessful}
                  isConfirmed={executionStatus === "ticketed" || executionStatus === "confirmed"}
                  isTravelAdmin={userRole === "travel-admin"}
                />
                
                {/* SSR Section */}
                <SSRSection
                  ssrSnapshot={ssrSnapshot}
                  travellers={travellers}
                  segments={allSegments}
                  isEmployee={isEmployee}
                />
              </div>

              {/* Fare summary (for travel-admin) */}
              {userRole === "travel-admin" && (
                <div className="lg:col-span-1">
                  <div className="bg-[#FAF8F4] border border-[#EAE4D9] p-6 sticky top-[140px]">
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

                    {/* ── SSR Charges: only render if any SSR data exists ── */}
                    {(() => {
                      const seats = ssrSnapshot?.seats || [];
                      const meals = ssrSnapshot?.meals || [];
                      const baggage = ssrSnapshot?.baggage || [];
                      const hasSSR =
                        seats.length > 0 || meals.length > 0 || baggage.length > 0;
                      if (!hasSSR) return null;

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
                        <div className="mt-4 bg-[#FAF7F2] border border-[#E8E0D0] rounded-xl p-4">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-[#A07840] mb-3 flex items-center gap-1.5">
                            <FiPackage size={11} /> Seat, Meal &amp; Baggage Charges
                          </p>

                          {seats.map((s, i) => (
                            <div
                              key={`seat-${i}`}
                              className="flex justify-between items-center py-1.5 border-b border-[#EDE8E0] last:border-0 text-[12px]"
                            >
                              <span className="text-gray-500">
                                Seat · {s.seatNo} &nbsp;
                                <span className="text-[11px] text-gray-400">
                                  ({travelerName(s.travelerIndex)}
                                  {segLabel(s.segmentIndex)
                                    ? ` · ${segLabel(s.segmentIndex)}`
                                    : ""}
                                  )
                                </span>
                              </span>
                              <span className="font-semibold text-gray-800">
                                ₹{s.price || 0}
                              </span>
                            </div>
                          ))}

                          {meals.map((m, i) => (
                            <div
                              key={`meal-${i}`}
                              className="flex justify-between items-center py-1.5 border-b border-[#EDE8E0] last:border-0 text-[12px]"
                            >
                              <span className="text-gray-500">
                                Meal · {m.code} &nbsp;
                                <span className="text-[11px] text-gray-400">
                                  ({travelerName(m.travelerIndex)}
                                  {segLabel(m.segmentIndex)
                                    ? ` · ${segLabel(m.segmentIndex)}`
                                    : ""}
                                  )
                                </span>
                              </span>
                              {m.price > 0 ? (
                                <span className="font-semibold text-gray-800">
                                  ₹{m.price}
                                </span>
                              ) : (
                                <span className="text-[11px] text-gray-400 italic">
                                  Complimentary
                                </span>
                              )}
                            </div>
                          ))}

                          {baggage.map((b, i) => (
                            <div
                              key={`bag-${i}`}
                              className="flex justify-between items-center py-1.5 border-b border-[#EDE8E0] last:border-0 text-[12px]"
                            >
                              <span className="text-gray-500">
                                Baggage · {b.weight || b.description || "Extra"} &nbsp;
                                <span className="text-[11px] text-gray-400">
                                  ({travelerName(b.travelerIndex)}
                                  {segLabel(b.segmentIndex)
                                    ? ` · ${segLabel(b.segmentIndex)}`
                                    : ""}
                                  )
                                </span>
                              </span>
                              <span className="font-semibold text-gray-800">
                                ₹{b.price || 0}
                              </span>
                            </div>
                          ))}

                          <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-dashed border-[#D8CEB8] text-[12px]">
                            <span className="text-gray-500 font-semibold">
                              SSR Total
                            </span>
                            <span className="font-semibold text-gray-900">
                              ₹{ssrTotal.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    {pricingSnap?.totalAmount != null && (
                      <div className="mt-5 pt-5 border-t border-[#EAE4D9]">
                        <div className="flex justify-between items-end">
                          <div>
                            <div className="text-[12px] font-semibold text-[#1A1714]">
                              Total Paid
                            </div>
                            <div className="text-[10px] text-[#A89F94] mt-[2px]">
                              incl. taxes & fees
                            </div>
                          </div>
                          <div className="font-['Cormorant_Garamond'] text-[24px] font-bold text-[#1A1714]">
                            ₹{Number(pricingSnap.totalAmount).toLocaleString("en-IN")}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "project" && (
            <div className="space-y-6">
              <BookingSummaryCard
                booking={booking}
                displayPnr={pnrsByJourney.onward || null}
              />
              
        
            </div>
          )}

          {activeTab === "charges_rules" && (
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

                        <div className="pt-6 border-t border-[#EAE4D9] flex gap-4">
                          {eligibilityLoading ? (
                            <button
                              disabled
                              className="inline-flex items-center gap-2 px-5 py-[10px] bg-[#EAE4D9] text-[#7A7068] border-none font-['DM_Sans'] text-[11px] font-semibold tracking-[0.12em] uppercase cursor-not-allowed"
                            >
                              <FiLoader size={12} className="animate-spin" /> Checking...
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                window.dispatchEvent(new Event("openReissueModal"));
                              }}
                              className="inline-flex items-center gap-2 px-5 py-[10px] bg-white border border-[#B5862A] text-[#B5862A] font-['DM_Sans'] text-[11px] font-semibold tracking-[0.12em] uppercase hover:bg-[#FAF8F4] transition-colors"
                            >
                              <FiRefreshCw size={12} /> {isOnlineEligible ? "Reissue Online" : "Raise Reissue Request"}
                            </button>
                          )}
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

          {activeTab === "passengers" && (
            <div className="bg-[#F5F0E8] rounded-2xl border border-[#E8E0D0] p-5">
              <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-[#8B7355]">
                    Passengers · {travellers.length}
                  </p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-0.5">
                    Listed once for the entire trip
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => scrollTable("left")}
                    className="w-7 h-7 rounded-full bg-white border border-[#E0D8C8] flex items-center justify-center text-[#A07840] hover:bg-[#F5F0E8] transition active:scale-95 shadow-sm"
                    title="Scroll Left"
                  >
                    <FiChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollTable("right")}
                    className="w-7 h-7 rounded-full bg-white border border-[#E0D8C8] flex items-center justify-center text-[#A07840] hover:bg-[#F5F0E8] transition active:scale-95 shadow-sm"
                    title="Scroll Right"
                  >
                    <FiChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Travelers Table */}
              <div className="bg-white rounded-xl border border-[#E8E0D0] overflow-hidden shadow-sm">
                <div ref={passengerTableRef} className="overflow-x-auto scroll-smooth">
                  <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead>
                      <tr className="bg-gray-50 border-b border-[#E8E0D0] text-[10px] font-bold uppercase tracking-widest text-[#8B7355]">
                        <th className="px-6 py-4">Passenger Name</th>
                        <th className="px-4 py-4">Type</th>
                        <th className="px-4 py-4">Gender</th>
                        <th className="px-4 py-4">Date of Birth</th>
                        <th className="px-4 py-4">Ticket Details</th>
                        <th className="px-4 py-4">Add-ons</th>
                        <th className="px-6 py-4 text-right">Contact/Identity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
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
                          <tr key={trav._id || idx} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-[#F5F0E8] flex items-center justify-center shrink-0 border border-[#E0D8C8]">
                                  <FiUser size={16} className="text-[#A07840]" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="text-[14px] font-bold text-gray-900 leading-none">
                                      {trav.title} {trav.firstName} {trav.lastName}
                                    </p>
                                    {trav.isLeadPassenger && (
                                      <FiStar size={12} className="text-amber-500" title="Lead Passenger" />
                                    )}
                                  </div>
                                  <p className="text-[11px] text-gray-400 font-mono mt-1 uppercase tracking-tight">
                                    {trav.nationality || "Nationality N/A"}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-5">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                                {formatPaxType(trav.paxType)}
                              </span>
                            </td>
                            <td className="px-4 py-5">
                              <p className="text-[13px] font-semibold text-gray-700 capitalize">
                                {trav.gender || "—"}
                              </p>
                            </td>
                            <td className="px-4 py-5">
                              <p className="text-[12px] font-medium text-gray-600">
                                {trav.dateOfBirth ? formatDateWithYear(trav.dateOfBirth) : "—"}
                              </p>
                            </td>
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

          {activeTab === "amendment" && (
            <div className="space-y-6">
              {showCancellationChargesBtn ? (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        Amendment actions
                      </p>
                      <p className="text-xs text-gray-500">
                        Ticket is live — changes apply immediately
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {eligibilityLoading ? (
                        <span className="flex items-center gap-1.5 px-4 py-2 bg-slate-50 text-slate-400 rounded-lg text-sm font-semibold">
                          <FiLoader size={14} className="animate-spin" /> Checking...
                        </span>
                      ) : bookingOfflineRequest ? (
                        <button
                          onClick={() => navigate(`/my-reissued?bookingId=${booking._id}`)}
                          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition"
                        >
                          <FiEye size={14} /> View Reissue Status
                        </button>
                      ) : isOnlineEligible ? (
                        <button
                          onClick={() => setShowReissueModal(true)}
                          className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-semibold hover:bg-indigo-100 transition"
                        >
                          <FiRefreshCw size={14} /> Reissue Online
                        </button>
                      ) : (
                        <button
                          onClick={() => setShowReissueModal(true)}
                          className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-lg text-sm font-semibold hover:bg-amber-100 transition"
                        >
                          <FiFileText size={14} /> Raise Reissue Request
                        </button>
                      )}
                      <button
                        onClick={() => setShowCancellationModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-semibold hover:bg-red-100"
                      >
                        <FiXCircle size={14} /> Cancellation Charges
                      </button>
                    </div>
                  </div>
                  {eligibility && !eligibilityLoading && (
                    <div className={`mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold ${
                      bookingOfflineRequest
                        ? offlineReissueBadge?.className || "bg-slate-50 text-slate-700 border border-slate-100"
                        : isOnlineEligible
                          ? "bg-green-50 text-green-700 border border-green-100"
                          : "bg-amber-50 text-amber-700 border border-amber-100"
                    }`}>
                      {bookingOfflineRequest ? (
                        <>
                          <FiCheckCircle size={13} /> {offlineReissueBadge?.label}
                          {bookingOfflineRequest.requestId ? ` • ${bookingOfflineRequest.requestId}` : ""}
                        </>
                      ) : isOnlineEligible ? (
                        <><FiCheckCircle size={13} /> Online Reissue Available</>
                      ) : (
                        <><FiAlertCircle size={13} /> Offline Reissue Required — This booking/fare does not support online reissue</>
                      )}
                    </div>
                  )}
                  <p className="text-[11px] text-gray-400 mt-3">
                    Charges may apply as per fare rules. Cancellation cannot be
                    undone.
                  </p>
                </div>
              ) : isTravelPassed ? (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
                  <FiAlertCircle size={24} className="text-gray-400 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-gray-800">
                    No Amendments Available
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Amendments cannot be made because the travel date has already passed.
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
                  <FiAlertCircle size={24} className="text-gray-400 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-gray-800">
                    No Amendments Available
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Amendments are only available for confirmed and ticketed bookings.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "upsell_options" && upsellList?.length > 0 && (
            <div className="space-y-6">
              {upsellList.map((upsell, i) => {
                const segIdx = parseInt(upsell.FlightInfoIndex) - 1;
                const matchedSeg = booking?.flightRequest?.segments?.[segIdx];
                return (
                <div key={i} className="bg-white border border-[#EAE4D9] p-6 rounded-xl shadow-sm transition-all duration-300">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#EAE4D9]">
                    <div className="flex items-center gap-3">
                      <span className="text-[12px] font-bold uppercase tracking-widest text-[#B5862A] bg-[#FDF8EE] px-3 py-1 rounded-md border border-[#F0E0A8]">
                        {upsell.FareFamilyName || upsell.FareFamilyCode}
                      </span>
                      <span className="text-[10px] text-[#A89F94] font-semibold uppercase tracking-wider">
                        Code: {upsell.FareFamilyCode}
                      </span>
                    </div>
                    {matchedSeg && (
                      <div className="flex items-center gap-2 text-[12px] text-[#1A1714] font-bold bg-[#FAF8F4] border border-[#EAE4D9] px-3 py-1.5 rounded-md">
                        <span>{matchedSeg.origin?.airportCode} → {matchedSeg.destination?.airportCode}</span>
                        <span className="text-[#A89F94] mx-1">|</span>
                        <span className="text-[#8B7355]">{matchedSeg.airlineCode} {matchedSeg.flightNumber}</span>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {upsell.ServicesList?.map((service, j) => (
                      <div key={j} className="flex items-start gap-3 bg-[#FAF8F4] p-4 rounded-lg border border-[#EAE4D9]">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${service.IsIncluded === "Yes" ? "bg-[#EDF7F2] text-[#2C7A4B] border border-[#C3E4D2]" : "bg-white border border-[#EAE4D9] text-[#A89F94]"}`}>
                          {service.IsIncluded === "Yes" ? <FiCheckCircle size={12} /> : (service.IsChargeable === "Yes" ? <span className="text-[10px] font-bold">₹</span> : <span className="text-[12px] font-bold">-</span>)}
                        </div>
                        <div>
                          <p className="text-[12px] font-bold text-[#1A1714] leading-tight mb-1">
                            {service.UpsellDescription}
                          </p>
                          <p className="text-[9px] font-bold tracking-widest uppercase">
                            {service.IsIncluded === "Yes" ? (
                              <span className="text-[#2C7A4B]">Included</span>
                            ) : (service.IsChargeable === "Yes" ? (
                              <span className="text-[#B5862A]">Chargeable</span>
                            ) : (
                              <span className="text-[#A89F94]">Not Included</span>
                            ))}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            </div>
          )}

          {activeTab === "history" && (
            <div className="space-y-6">
              <BookingHistory booking={booking} />
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      {showCancellationModal && (
        <CancellationModal
          booking={booking}
          isOnlineEligible={isOnlineEligible}
          eligibilityLoading={eligibilityLoading}
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
      {showReissueModal && (
        <ReissueModal
          booking={booking}
          onClose={() => setShowReissueModal(false)}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  ★ CANCELLATION CHARGES MODAL (FROM EMPLOYEE DASHBOARD)        */
/* ─────────────────────────────────────────────────────────────── */

function CancellationModal({ booking, onClose, onSuccess, isOnlineEligible, eligibilityLoading }) {
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
      await dispatch(getTeamExecutedFlightRequestById(booking._id));
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
      await dispatch(getTeamExecutedFlightRequestById(booking._id));
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
      await dispatch(getTeamExecutedFlightRequestById(booking._id));
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
      await dispatch(getTeamExecutedFlightRequestById(booking._id));
    } catch (err) {
      setChargesError(err?.message || "Failed to create query");
      setStep("error");
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={step !== "processing" ? onClose : undefined}
      />
      <div className="relative bg-white border border-[#EAE4D9] w-full max-w-lg shadow-2xl font-['DM_Sans']">
        <div className="px-6 py-4 border-b border-[#EAE4D9] flex justify-between items-center bg-[#FDF8EE]">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-6 h-6 border border-[#B5341A] bg-[#FDF1EE]">
              <FiXCircle size={12} className="text-[#B5341A]" />
            </span>
            <div>
              <h2 className="text-[14px] font-bold text-[#1A1714] tracking-[0.04em]">
                {step === "reissue" ? "Reissue Flight" : "Cancellation"}
              </h2>
              <p className="text-[11px] text-[#A89F94] mt-0.5 font-['DM_Mono']">
                Order ID · {booking.orderId || booking.bookingReference}
              </p>
            </div>
          </div>
          {step !== "processing" && (
            <button
              onClick={onClose}
              className="w-6 h-6 border border-[#EAE4D9] hover:bg-[#FAF8F4] flex items-center justify-center transition-colors bg-white text-[#A89F94]"
            >
              <FiX size={12} />
            </button>
          )}
        </div>

        <div className="p-6">
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
            <div className="space-y-6">
              <div className="bg-[#FAF8F4] border border-[#EAE4D9] p-5 space-y-3">
                <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-2">
                  Cancellation Charges
                </p>
                {cancellationCharge != null ? (
                  <div className="flex justify-between items-center">
                    <span className="text-[13px] text-[#7A7068] font-medium">Airline Fee</span>
                    <span className="text-[15px] font-bold text-[#1A1714]">₹{cancellationCharge}</span>
                  </div>
                ) : (
                  <p className="text-[12px] text-[#A89F94] italic font-['DM_Mono']">Fetching real-time charges from airline...</p>
                )}
                {refundedAmount != null && (
                  <div className="flex justify-between items-center pt-3 border-t border-[#EAE4D9]">
                    <span className="text-[13px] text-[#7A7068] font-medium">Estimated Refund</span>
                    <span className="text-[15px] font-bold text-[#2C7A4B]">₹{refundedAmount}</span>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-[#A89F94]">Select Action</p>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setStep("full-confirm")}
                    className="flex flex-col items-center justify-center gap-3 p-5 border border-[#EAE4D9] bg-white hover:bg-[#FDF1EE] hover:border-[#F0C4BA] transition-colors group"
                  >
                    <span className="flex items-center justify-center w-8 h-8 border border-[#EAE4D9] bg-[#FAF8F4] group-hover:bg-[#FDF1EE] group-hover:border-[#F0C4BA] transition-colors">
                      <FiXCircle className="text-[#B5341A]" size={14} />
                    </span>
                    <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#1A1714]">Full Cancel</span>
                  </button>
                  {hasReturn && (
                    <button
                      onClick={() => setStep("partial-select")}
                      className="flex flex-col items-center justify-center gap-3 p-5 border border-[#EAE4D9] bg-white hover:bg-[#FDF8EE] hover:border-[#F0E0A8] transition-colors group"
                    >
                      <span className="flex items-center justify-center w-8 h-8 border border-[#EAE4D9] bg-[#FAF8F4] group-hover:bg-[#FDF8EE] group-hover:border-[#F0E0A8] transition-colors">
                        <FiAlertCircle className="text-[#8A6200]" size={14} />
                      </span>
                      <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#1A1714]">Partial Cancel</span>
                    </button>
                  )}
                  <button
                    onClick={() => setStep("reissue")}
                    className="flex flex-col items-center justify-center gap-3 p-5 border border-[#EAE4D9] bg-white hover:bg-[#EDF7F2] hover:border-[#C3E4D2] transition-colors group"
                  >
                    <span className="flex items-center justify-center w-8 h-8 border border-[#EAE4D9] bg-[#FAF8F4] group-hover:bg-[#EDF7F2] group-hover:border-[#C3E4D2] transition-colors">
                      <FiRefreshCw className="text-[#2C7A4B]" size={14} />
                    </span>
                    <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#1A1714]">Reissue</span>
                  </button>
                  <button
                    onClick={() => setShowQueryModal(true)}
                    className="flex flex-col items-center justify-center gap-3 p-5 border border-[#EAE4D9] bg-white hover:bg-[#FAF8F4] transition-colors group"
                  >
                    <span className="flex items-center justify-center w-8 h-8 border border-[#EAE4D9] bg-[#FAF8F4] transition-colors">
                      <FiMessageSquare className="text-[#A89F94]" size={14} />
                    </span>
                    <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#1A1714]">Raise Query</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === "full-confirm" && (
            <div className="space-y-4">
              <div className="p-4 bg-[#FDF1EE] border border-[#F0C4BA]">
                <p className="text-[13px] text-[#B5341A]">
                  Are you sure you want to cancel the entire booking? This action cannot be undone.
                </p>
              </div>
              <textarea
                placeholder="Remarks (optional)..."
                className="w-full p-4 border border-[#EAE4D9] bg-[#FAF8F4] text-[13px] text-[#1A1714] focus:outline-none focus:border-[#B5862A] placeholder:text-[#A89F94] font-['DM_Sans'] transition-colors resize-y min-h-[100px]"
                rows={3}
                value={remarksText}
                onChange={(e) => setRemarksText(e.target.value)}
              />
              <div className="flex gap-4 pt-2">
                <button
                  onClick={() => setStep("charges")}
                  className="flex-1 py-[10px] bg-white border border-[#EAE4D9] text-[#7A7068] font-['DM_Sans'] text-[11px] font-semibold tracking-[0.12em] uppercase hover:bg-[#FAF8F4] transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleFullCancel}
                  className="flex-1 py-[10px] bg-[#B5341A] text-white border-none font-['DM_Sans'] text-[11px] font-semibold tracking-[0.12em] uppercase hover:bg-[#8A2510] transition-colors"
                >
                  Confirm Full Cancel
                </button>
              </div>
            </div>
          )}

          {step === "partial-select" && (
            <div className="space-y-5">
              <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-[#A89F94]">Select Journey to Cancel</p>
              <div className="grid gap-3">
                <label className={`relative flex items-center justify-between p-4 border cursor-pointer transition-colors ${selectedJourney === "onward" ? "border-[#B5862A] bg-[#FDF8EE]" : "border-[#EAE4D9] bg-white hover:bg-[#FAF8F4]"}`}>
                  <input
                    type="radio"
                    name="pj"
                    className="absolute opacity-0"
                    onChange={() => setSelectedJourney("onward")}
                  />
                  <span className="text-[13px] font-semibold text-[#1A1714]">Onward: <span className="font-normal text-[#7A7068]">{sectorLabel(onwardSegs)}</span></span>
                  {selectedJourney === "onward" && <FiCheckCircle className="text-[#B5862A]" />}
                </label>
                {hasReturn && (
                  <label className={`relative flex items-center justify-between p-4 border cursor-pointer transition-colors ${selectedJourney === "return" ? "border-[#B5862A] bg-[#FDF8EE]" : "border-[#EAE4D9] bg-white hover:bg-[#FAF8F4]"}`}>
                    <input
                      type="radio"
                      name="pj"
                      className="absolute opacity-0"
                      onChange={() => setSelectedJourney("return")}
                    />
                    <span className="text-[13px] font-semibold text-[#1A1714]">Return: <span className="font-normal text-[#7A7068]">{sectorLabel(returnSegs)}</span></span>
                    {selectedJourney === "return" && <FiCheckCircle className="text-[#B5862A]" />}
                  </label>
                )}
              </div>
              <div className="flex gap-4 pt-2">
                <button onClick={() => setStep("charges")} className="flex-1 py-[10px] bg-white border border-[#EAE4D9] text-[#7A7068] font-['DM_Sans'] text-[11px] font-semibold tracking-[0.12em] uppercase hover:bg-[#FAF8F4] transition-colors">Back</button>
                <button
                  disabled={!selectedJourney}
                  onClick={() => setStep("partial-confirm")}
                  className="flex-1 py-[10px] bg-[#B5341A] text-white border-none font-['DM_Sans'] text-[11px] font-semibold tracking-[0.12em] uppercase hover:bg-[#8A2510] disabled:bg-[#D4A8A0] transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === "partial-confirm" && (
            <div className="space-y-4">
              <div className="p-4 bg-[#FDF8EE] border border-[#F0E0A8]">
                <p className="text-[13px] text-[#8A6200]">
                  Confirm cancellation for {selectedJourney} journey ({selectedJourney === "onward" ? sectorLabel(onwardSegs) : sectorLabel(returnSegs)}).
                </p>
              </div>
              <textarea
                placeholder="Remarks (optional)..."
                className="w-full p-4 border border-[#EAE4D9] bg-[#FAF8F4] text-[13px] text-[#1A1714] focus:outline-none focus:border-[#B5862A] placeholder:text-[#A89F94] font-['DM_Sans'] transition-colors resize-y min-h-[100px]"
                rows={3}
                value={remarksText}
                onChange={(e) => setRemarksText(e.target.value)}
              />
              <div className="flex gap-4 pt-2">
                <button onClick={() => setStep("partial-select")} className="flex-1 py-[10px] bg-white border border-[#EAE4D9] text-[#7A7068] font-['DM_Sans'] text-[11px] font-semibold tracking-[0.12em] uppercase hover:bg-[#FAF8F4] transition-colors">Back</button>
                <button onClick={handlePartialCancel} className="flex-1 py-[10px] bg-[#B5341A] text-white border-none font-['DM_Sans'] text-[11px] font-semibold tracking-[0.12em] uppercase hover:bg-[#8A2510] transition-colors">Confirm Partial Cancel</button>
              </div>
            </div>
          )}

          {step === "reissue" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-[#A89F94]">New Travel Date</p>
                <input
                  type="date"
                  className="w-full p-3 border border-[#EAE4D9] bg-white text-[13px] text-[#1A1714] focus:outline-none focus:border-[#B5862A] font-['DM_Sans'] transition-colors"
                  value={reissueDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setReissueDate(e.target.value)}
                />
              </div>
              {hasReturn && (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-[#A89F94]">New Return Date</p>
                  <input
                    type="date"
                    className="w-full p-3 border border-[#EAE4D9] bg-white text-[13px] text-[#1A1714] focus:outline-none focus:border-[#B5862A] font-['DM_Sans'] transition-colors"
                    value={returnReissueDate}
                    min={reissueDate || new Date().toISOString().split("T")[0]}
                    onChange={(e) => setReturnReissueDate(e.target.value)}
                  />
                </div>
              )}
              <textarea
                placeholder="Reason for reissue..."
                className="w-full p-4 border border-[#EAE4D9] bg-[#FAF8F4] text-[13px] text-[#1A1714] focus:outline-none focus:border-[#B5862A] placeholder:text-[#A89F94] font-['DM_Sans'] transition-colors resize-y min-h-[100px]"
                rows={3}
                value={remarksText}
                onChange={(e) => setRemarksText(e.target.value)}
              />
              <div className="flex gap-4 pt-2">
                <button onClick={() => setStep("charges")} className="flex-1 py-[10px] bg-white border border-[#EAE4D9] text-[#7A7068] font-['DM_Sans'] text-[11px] font-semibold tracking-[0.12em] uppercase hover:bg-[#FAF8F4] transition-colors">Back</button>
                <button
                  disabled={!reissueDate || (hasReturn && !returnReissueDate)}
                  onClick={handleReissue}
                  className="flex-1 py-[10px] bg-[#B5862A] text-white border-none font-['DM_Sans'] text-[11px] font-semibold tracking-[0.12em] uppercase hover:bg-[#966B1F] disabled:bg-[#D8CEB8] transition-colors"
                >
                  Submit Reissue
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showQueryModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowQueryModal(false)} />
          <div className="relative bg-white border border-[#EAE4D9] w-full max-w-md shadow-2xl font-['DM_Sans']">
            <div className="px-6 py-4 border-b border-[#EAE4D9] bg-[#FDF8EE] flex justify-between items-center">
              <h2 className="text-[14px] font-bold text-[#1A1714] tracking-[0.04em]">Raise Support Query</h2>
              <button onClick={() => setShowQueryModal(false)} className="text-[#A89F94] hover:text-[#1A1714] transition-colors"><FiX size={14} /></button>
            </div>
            
            <div className="p-6">
              <p className="text-[12px] text-[#A89F94] mb-6">Our support team will manually process your cancellation request.</p>
              <div className="mb-6">
                <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-2">Priority</p>
                <select
                  value={queryPriority}
                  onChange={(e) => setQueryPriority(e.target.value)}
                  className="w-full border border-[#EAE4D9] bg-white text-[13px] text-[#1A1714] focus:outline-none focus:border-[#B5862A] font-['DM_Sans'] px-4 py-3 transition-colors"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </div>
              <div className="mb-8">
                <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-2">Remarks</p>
                <textarea
                  rows={4}
                  value={queryRemarks}
                  onChange={(e) => setQueryRemarks(e.target.value)}
                  placeholder="Describe your request details..."
                  className="w-full border border-[#EAE4D9] bg-[#FAF8F4] text-[13px] text-[#1A1714] focus:outline-none focus:border-[#B5862A] placeholder:text-[#A89F94] font-['DM_Sans'] p-4 resize-y min-h-[100px] transition-colors"
                />
              </div>
              <div className="flex gap-4">
                <button onClick={() => setShowQueryModal(false)} className="flex-1 py-[10px] bg-white border border-[#EAE4D9] text-[#7A7068] font-['DM_Sans'] text-[11px] font-semibold tracking-[0.12em] uppercase hover:bg-[#FAF8F4] transition-colors">Cancel</button>
                <button onClick={handleRaiseQuery} className="flex-1 py-[10px] bg-[#1A1714] text-white border-none font-['DM_Sans'] text-[11px] font-semibold tracking-[0.12em] uppercase hover:bg-[#000000] transition-colors">Submit Request</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}

function AmendmentModal({ type, booking, onClose }) {
  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999]">
      <div className="bg-white border border-[#EAE4D9] w-full max-w-xl shadow-2xl font-['DM_Sans']">
        <div className="flex justify-between items-center px-6 py-4 border-b border-[#EAE4D9] bg-[#FDF8EE]">
          <h2 className="text-[14px] font-bold text-[#1A1714] tracking-[0.04em]">
            {type === "cancel" && "Cancel Ticket"}
            {type === "reschedule" && "Reschedule Flight"}
            {type === "modify" && "Modify Traveller"}
          </h2>
          <button onClick={onClose} className="w-6 h-6 border border-[#EAE4D9] hover:bg-[#FAF8F4] flex items-center justify-center transition-colors bg-white text-[#A89F94]">
            <FiX size={12} />
          </button>
        </div>
        <div className="p-6">
          {type === "cancel" && <CancelScreen booking={booking} onClose={onClose} />}
          {type === "reschedule" && <RescheduleScreen booking={booking} onClose={onClose} />}
          {type === "modify" && <ModifyTravellerScreen booking={booking} onClose={onClose} />}
        </div>
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
      await dispatch(getTeamExecutedFlightRequestById(booking._id));
      navigate("/manager/total-cancelled-bookings");
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {charges && (
        <div className="bg-[#FAF8F4] border border-[#EAE4D9] p-5 space-y-3">
          <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-[#A89F94]">Cancellation Charges</p>
          <div className="flex justify-between items-center">
            <span className="text-[13px] text-[#7A7068] font-medium">Airline Charges</span>
            <span className="text-[15px] font-bold text-[#1A1714]">₹{charges?.AirlineCharge || 0}</span>
          </div>
          <div className="flex justify-between items-center pt-3 border-t border-[#EAE4D9]">
            <span className="text-[13px] text-[#7A7068] font-medium">Service Fee</span>
            <span className="text-[15px] font-bold text-[#1A1714]">₹{charges?.ServiceCharge || 0}</span>
          </div>
        </div>
      )}
      <label className="flex items-start gap-3 text-[13px] text-[#1A1714] cursor-pointer">
        <input
          type="checkbox"
          checked={confirm}
          onChange={(e) => setConfirm(e.target.checked)}
          className="mt-1 border-[#EAE4D9] text-[#B5862A] focus:ring-[#B5862A]"
        />
        I confirm cancellation
      </label>
      <div className="flex justify-end gap-4 pt-2">
        <button onClick={onClose} className="px-5 py-[10px] bg-white border border-[#EAE4D9] text-[#7A7068] font-['DM_Sans'] text-[11px] font-semibold tracking-[0.12em] uppercase hover:bg-[#FAF8F4] transition-colors">Close</button>
        <button
          onClick={handleCancel}
          disabled={!confirm || loading}
          className="px-5 py-[10px] bg-[#B5341A] text-white border-none font-['DM_Sans'] text-[11px] font-semibold tracking-[0.12em] uppercase hover:bg-[#8A2510] disabled:bg-[#D4A8A0] transition-colors"
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
      <div className="space-y-2">
        <label className="text-[10px] font-semibold tracking-[0.15em] uppercase text-[#A89F94]">Select New Date</label>
        <input
          type="date"
          value={newDate}
          onChange={(e) => setNewDate(e.target.value)}
          className="w-full border border-[#EAE4D9] bg-white text-[13px] text-[#1A1714] focus:outline-none focus:border-[#B5862A] font-['DM_Sans'] px-4 py-3 transition-colors"
        />
      </div>
      <div className="flex justify-end gap-4 pt-2">
        <button onClick={onClose} className="px-5 py-[10px] bg-white border border-[#EAE4D9] text-[#7A7068] font-['DM_Sans'] text-[11px] font-semibold tracking-[0.12em] uppercase hover:bg-[#FAF8F4] transition-colors">Close</button>
        <button onClick={onClose} className="px-5 py-[10px] bg-[#B5862A] text-white border-none font-['DM_Sans'] text-[11px] font-semibold tracking-[0.12em] uppercase hover:bg-[#966B1F] transition-colors">Confirm Reschedule</button>
      </div>
    </div>
  );
}

function ModifyTravellerScreen({ booking, onClose }) {
  const traveller = booking.travellers?.[0];
  const [phone, setPhone] = useState(traveller?.phoneWithCode || "");
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-[10px] font-semibold tracking-[0.15em] uppercase text-[#A89F94]">Update Phone</label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full border border-[#EAE4D9] bg-white text-[13px] text-[#1A1714] focus:outline-none focus:border-[#B5862A] font-['DM_Sans'] px-4 py-3 transition-colors"
        />
      </div>
      <div className="flex justify-end gap-4 pt-2">
        <button onClick={onClose} className="px-5 py-[10px] bg-white border border-[#EAE4D9] text-[#7A7068] font-['DM_Sans'] text-[11px] font-semibold tracking-[0.12em] uppercase hover:bg-[#FAF8F4] transition-colors">Close</button>
        <button className="px-5 py-[10px] bg-[#1A1714] text-white border-none font-['DM_Sans'] text-[11px] font-semibold tracking-[0.12em] uppercase hover:bg-[#000000] transition-colors">Save Changes</button>
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
      await dispatch(getTeamExecutedFlightRequestById(booking._id));
      navigate("/manager/total-cancelled-bookings");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999]">
      <div className="bg-white border border-[#EAE4D9] w-full max-w-xl shadow-2xl font-['DM_Sans']">
        <div className="flex justify-between items-center px-6 py-4 border-b border-[#EAE4D9] bg-[#FDF8EE]">
          <h2 className="text-[14px] font-bold text-[#1A1714] tracking-[0.04em]">Partial Cancellation</h2>
          <button onClick={onClose} className="w-6 h-6 border border-[#EAE4D9] hover:bg-[#FAF8F4] flex items-center justify-center transition-colors bg-white text-[#A89F94]">
            <FiX size={12} />
          </button>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-[#A89F94] mb-3">Select Route</p>
            <div className="space-y-3">
              <label className={`relative flex items-center p-4 border cursor-pointer transition-colors ${selectedJourney === "onward" ? "border-[#B5862A] bg-[#FDF8EE]" : "border-[#EAE4D9] bg-white hover:bg-[#FAF8F4]"}`}>
                <input
                  type="radio"
                  name="route"
                  className="absolute opacity-0"
                  disabled={!onwardSegments.length}
                  checked={selectedJourney === "onward"}
                  onChange={() => setSelectedJourney("onward")}
                />
                <span className="text-[13px] font-semibold text-[#1A1714]">Onward: <span className="font-normal text-[#7A7068]">{sectorLabel(onwardSegments)}</span></span>
                {selectedJourney === "onward" && <FiCheckCircle className="text-[#B5862A] ml-auto" />}
              </label>
              {hasReturn && (
                <label className={`relative flex items-center p-4 border cursor-pointer transition-colors ${selectedJourney === "return" ? "border-[#B5862A] bg-[#FDF8EE]" : "border-[#EAE4D9] bg-white hover:bg-[#FAF8F4]"}`}>
                  <input
                    type="radio"
                    name="route"
                    className="absolute opacity-0"
                    checked={selectedJourney === "return"}
                    onChange={() => setSelectedJourney("return")}
                  />
                  <span className="text-[13px] font-semibold text-[#1A1714]">Return: <span className="font-normal text-[#7A7068]">{sectorLabel(returnSegments)}</span></span>
                  {selectedJourney === "return" && <FiCheckCircle className="text-[#B5862A] ml-auto" />}
                </label>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-4 pt-2 border-t border-[#EAE4D9]">
            <button onClick={onClose} className="px-5 py-[10px] bg-white border border-[#EAE4D9] text-[#7A7068] font-['DM_Sans'] text-[11px] font-semibold tracking-[0.12em] uppercase hover:bg-[#FAF8F4] transition-colors">Close</button>
            <button onClick={handleSubmit} disabled={!selectedJourney || loading} className="px-5 py-[10px] bg-[#B5341A] text-white border-none font-['DM_Sans'] text-[11px] font-semibold tracking-[0.12em] uppercase hover:bg-[#8A2510] disabled:bg-[#D4A8A0] transition-colors">
              {loading ? "Submitting..." : "Submit Cancellation"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
