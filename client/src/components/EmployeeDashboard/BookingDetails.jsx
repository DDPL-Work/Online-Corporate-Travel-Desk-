import React, { useEffect, useState } from "react";
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
} from "react-icons/fi";
import {
  downloadTicketPdf,
  fetchMyBookingById,
  manualTicketNonLcc,
} from "../../Redux/Actions/booking.thunks";
import {
  fetchCancellationCharges,
  fullCancellation,
  partialCancellation,
  amendBooking,
  fetchChangeStatus,
  createCancellationQuery,
} from "../../Redux/Actions/amendmentThunks";
import { resetAmendmentState } from "../../Redux/Slice/amendmentSlice";
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
import ReissueModal from "./ReissueModal";

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
function StatusPill({ status, size = "sm" }) {
  const map = {
    Confirmed: "bg-green-100 text-green-800",
    Pending: "bg-amber-100 text-amber-800",
    Cancelled: "bg-red-100 text-red-800",
    ticketed: "bg-green-100 text-green-800",
    approved: "bg-blue-100 text-blue-800",
    pending: "bg-amber-100 text-amber-800",
    cancelled: "bg-red-100 text-red-800",
  };
  const key = status?.toLowerCase() || "pending";
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase ${map[key] || map.pending}`}
    >
      {status}
    </span>
  );
}

function InfoRow({ label, value, accent, mono }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-500 font-medium">{label}</span>
      <span
        className={`text-[13px] font-semibold ${accent ? "text-teal-600" : "text-gray-800"} ${mono ? "font-mono tracking-wide" : ""}`}
      >
        {value ?? "—"}
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
  downloading,
  onDownload,
  showDownload,
  fareQuoteResults,
  bookingResult,
}) {
  const firstSeg = segments[0];
  const lastSeg = segments[segments.length - 1];
  const isDownloading = downloading === journeyType;

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
    const segMatch = segments.find(s => (isOrigin ? s.origin?.airportCode : s.destination?.airportCode) === code);
    const existing = isOrigin ? (segMatch?.origin?.airportName || segMatch?.origin?.AirportName) : (segMatch?.destination?.airportName || segMatch?.destination?.AirportName);
    if (existing) return existing;

    // 2. Check bookingResult (confirmed itinerary)
    const itinerary = journeyType === "return" 
      ? bookingResult?.returnResponse?.Response?.Response?.FlightItinerary 
      : (bookingResult?.onwardResponse || bookingResult?.providerResponse)?.Response?.Response?.FlightItinerary;
    
    const tboSegs = itinerary?.Segments || [];
    const tboMatch = tboSegs.find(s => (isOrigin ? s.Origin?.Airport?.AirportCode : s.Destination?.Airport?.AirportCode) === code);
    if (tboMatch) return isOrigin ? tboMatch.Origin?.Airport?.AirportName : tboMatch.Destination?.Airport?.AirportName;

    // 3. Check fareQuoteResults (pre-booking snapshot)
    for (const res of (fareQuoteResults || [])) {
      for (const segGroup of (res.Segments || [])) {
        for (const s of segGroup) {
          const matchCode = isOrigin ? s.Origin?.Airport?.AirportCode : s.Destination?.Airport?.AirportCode;
          if (matchCode === code) return isOrigin ? s.Origin?.Airport?.AirportName : s.Destination?.Airport?.AirportName;
        }
      }
    }
    return null;
  };

  const originAirportName = resolveAirportName(journeyOrigin?.airportCode, true);
  const destAirportName = resolveAirportName(journeyDestination?.airportCode, false);

  return (
    <div className="bg-[#F5F0E8] rounded-2xl border border-[#E0D8C8] overflow-hidden">
      {/* Card header row */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E0D8C8]">
        <div className="flex items-center gap-2">
          <span className="text-[#A07840] text-xs">
            {journeyType === "return" ? "↙" : "↗"}
          </span>
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#8B7355]">
            {journeyType === "return" ? "Return" : "One-Way"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {pnr && (
            <span className="inline-flex items-center gap-1.5 bg-gray-900 text-white rounded-full px-3.5 py-1.5">
              <span className="text-[9px] font-bold uppercase tracking-widest opacity-50">
                PNR
              </span>
              <span className="font-mono text-[13px] font-bold">{pnr}</span>
            </span>
          )}
          <span className="text-[11px] text-[#8B7355] font-medium tracking-wide">
            {airlineInfo}
          </span>
        </div>
      </div>

      {/* Main flight row */}
      <div className="px-5 pt-5 pb-4">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          {/* Origin */}
          <div>
            <p className="text-[11px] font-bold text-[#8B7355] uppercase tracking-wider mb-2">
              {formatDate(firstSeg?.departureDateTime)}
            </p>
            <p className="text-[44px] font-black tracking-tight leading-none text-gray-900">
              {departureTime}
            </p>
            <div className="flex flex-col gap-0.5 mt-2">
              <div className="flex items-baseline gap-2">
                <span className="text-[15px] font-bold text-gray-900">
                  {journeyOrigin?.airportCode}
                </span>
                <span className="text-[12px] text-[#8B7355] font-medium uppercase tracking-wide">
                  {journeyOrigin?.city}
                </span>
              </div>
              <p className="text-[10px] text-gray-400 font-medium leading-tight">
                {originAirportName}
              </p>
            </div>
          </div>

          {/* Connector */}
          <div className="flex flex-col items-center gap-1.5 min-w-[160px]">
            <span className="text-[11px] font-semibold text-[#8B7355]">
              {totalDuration}
            </span>
            <div className="flex items-center w-full gap-0">
              <div className="flex-1 border-t-[1.5px] border-dashed border-[#C8B898]" />
              <span className="mx-2 text-[#A07840] text-sm">✈</span>
              <div className="flex-1 border-t-[1.5px] border-dashed border-[#C8B898]" />
            </div>
            <span className="text-[10px] font-semibold text-[#8B7355] uppercase tracking-wide">
              {stopLabel}
            </span>
          </div>

          {/* Destination */}
          <div className="text-right">
            <p className="text-[11px] font-bold text-[#8B7355] uppercase tracking-wider mb-2">
              {formatDate(lastSeg?.arrivalDateTime)}
            </p>
            <p className="text-[44px] font-black tracking-tight leading-none text-gray-900">
              {arrivalTime}
            </p>
            <div className="flex flex-col gap-0.5 mt-2">
              <div className="flex items-baseline gap-2 justify-end">
                <span className="text-[12px] text-[#8B7355] font-medium uppercase tracking-wide">
                  {journeyDestination?.city}
                </span>
                <span className="text-[15px] font-bold text-gray-900">
                  {journeyDestination?.airportCode}
                </span>
              </div>
              <p className="text-[10px] text-gray-400 font-medium leading-tight">
                {destAirportName}
              </p>
            </div>
          </div>
        </div>

        {/* Layover banners (between segments) */}
        {segments.length > 1 && (
          <div className="mt-4 space-y-2">
            {segments.slice(0, -1).map((seg, i) => (
              <div
                key={i}
                className="flex items-center gap-3 bg-white/60 border border-[#E0D8C8] rounded-xl px-4 py-2.5"
              >
                <span className="text-[#A07840] text-xs shrink-0">◎</span>
                <div className="flex-1 min-w-0">
                  <span className="text-[13px] font-semibold text-gray-800">
                    {seg.destination?.airportCode}
                  </span>
                  <span className="text-[12px] text-[#8B7355] font-medium ml-1.5 uppercase tracking-wide">
                    {seg.destination?.city}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-[#8B7355] shrink-0">
                  {seg.destination?.terminal &&
                    segments[i + 1]?.origin?.terminal && (
                      <span className="font-medium">
                        T{seg.destination.terminal} → T
                        {segments[i + 1].origin.terminal}
                      </span>
                    )}
                  <span className="flex items-center gap-1 font-semibold">
                    <FiClock size={11} />
                    {formatLayoverDuration(
                      layoverMinutes(seg, segments[i + 1]),
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Baggage chips footer */}
      <div className="px-5 pb-4 flex items-center gap-2 flex-wrap">
        {firstSeg?.origin?.terminal && (
          <span className="text-[11px] font-semibold px-3 py-1.5 rounded-full border border-[#D8CEB8] bg-white/50 text-[#6B5B3E]">
            T{firstSeg.origin.terminal}
          </span>
        )}
        {firstSeg?.baggage?.cabin && (
          <span className="text-[11px] font-semibold px-3 py-1.5 rounded-full border border-[#D8CEB8] bg-white/50 text-[#6B5B3E]">
            {firstSeg.baggage.cabin} Cab
          </span>
        )}
        {firstSeg?.baggage?.checkIn && (
          <span className="text-[11px] font-semibold px-3 py-1.5 rounded-full border border-[#D8CEB8] bg-white/50 text-[#6B5B3E]">
            {firstSeg.baggage.checkIn} Check
          </span>
        )}
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
  const hasSSR = seats.length > 0 || meals.length > 0 || baggage.length > 0;

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
    return `${seg.origin?.airportCode} → ${seg.destination?.airportCode}`;
  };

  // Group all SSR items by travelerIndex, then by segmentIndex
  // Shape: { [travelerIndex]: { seats: [], meals: [], baggage: [] } }
  const byTraveler = {};

  travellers.forEach((_, idx) => {
    byTraveler[idx] = { seats: [], meals: [], baggage: [] };
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

  // Only include travelers that actually have at least one SSR
  const activeTravelers = Object.entries(byTraveler).filter(
    ([, data]) =>
      data.seats.length > 0 || data.meals.length > 0 || data.baggage.length > 0,
  );

  if (!activeTravelers.length) return null;

  return (
    <div className="bg-[#F5F0E8] rounded-2xl border border-[#E8E0D0] p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <FiStar size={13} className="text-[#A07840]" />
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#8B7355]">
          Seat, Meal &amp; Baggage Add-ons
        </span>
      </div>

      {/* One card per passenger */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          ].reduce((a, b) => a + b, 0);

          return (
            <div
              key={travelerIdx}
              className="bg-white rounded-xl border border-[#E8E0D0] p-4"
            >
              {/* Passenger header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#F5F0E8] border border-[#E0D8C8] flex items-center justify-center shrink-0">
                    <FiUser size={12} className="text-[#A07840]" />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-gray-900 leading-none">
                      {travelerName(idx)}
                    </p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">
                      {paxTypeLabel}
                    </p>
                  </div>
                </div>
                {passengerTotal > 0 && (
                  <span className="text-[12px] font-bold text-gray-900">
                    ₹{passengerTotal}
                  </span>
                )}
              </div>

              <div className="border-t border-[#F0EBE0] pt-3 space-y-2">
                {/* Seats */}
                {data.seats.map((s, i) => (
                  <div
                    key={`seat-${i}`}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-[#F5F0E8] flex items-center justify-center text-[9px] font-bold text-[#A07840]">
                        S
                      </span>
                      <div>
                        <p className="text-[12px] font-semibold text-gray-800">
                          Seat {s.seatNo}
                        </p>
                        {segRoute(s.segmentIndex) && (
                          <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                            {segRoute(s.segmentIndex)}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-[12px] font-semibold text-gray-700">
                      {s.price > 0 ? `₹${s.price}` : "Free"}
                    </span>
                  </div>
                ))}

                {/* Meals */}
                {data.meals.map((m, i) => (
                  <div
                    key={`meal-${i}`}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-[#F5F0E8] flex items-center justify-center text-[9px] font-bold text-[#A07840]">
                        M
                      </span>
                      <div>
                        <p className="text-[12px] font-semibold text-gray-800">
                          {m.code}
                          {m.description && typeof m.description === "string"
                            ? ` · ${m.description}`
                            : ""}
                        </p>
                        {segRoute(m.segmentIndex) && (
                          <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                            {segRoute(m.segmentIndex)}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-[12px] font-semibold text-gray-700">
                      {m.price > 0 ? (
                        `₹${m.price}`
                      ) : (
                        <span className="text-[11px] text-gray-400 italic font-normal">
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
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-[#F5F0E8] flex items-center justify-center text-[9px] font-bold text-[#A07840]">
                        B
                      </span>
                      <div>
                        <p className="text-[12px] font-semibold text-gray-800">
                          {b.weight || b.description || "Extra Baggage"}
                        </p>
                        {segRoute(b.segmentIndex) && (
                          <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                            {segRoute(b.segmentIndex)}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-[12px] font-semibold text-gray-700">
                      {b.price > 0 ? `₹${b.price}` : "Free"}
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
/*  Booking Summary card (restyled)                               */
/* ────────────────────────────────────────────────────────────── */
function BookingSummaryCard({ booking, displayPnr }) {
  const approvalStatus = booking.approvalStatus || booking.status;
  const isApproved =
    approvalStatus === "approved" ||
    approvalStatus === "Approved" ||
    booking.executionStatus === "ticketed";

  const topFields = [
    {
      icon: <FiBriefcase size={11} className="text-[#A07840]" />,
      label: "Project Name",
      value: booking.projectName,
    },
    {
      icon: <FiTag size={11} className="text-[#A07840]" />,
      label: "Project Code",
      value: booking.projectCodeId,
    },
    {
      icon: <FiBriefcase size={11} className="text-[#A07840]" />,
      label: "Project Client",
      value: booking.projectClient,
    },
    {
      icon: <FiMail size={11} className="text-[#A07840]" />,
      label: "Approver Email",
      value: booking.approverEmail,
    },
    {
      icon: <FiShield size={11} className="text-[#A07840]" />,
      label: "Approver Role",
      value: booking.approverRole,
    },
    {
      icon: <FiMessageSquare size={11} className="text-[#A07840]" />,
      label: "Approver Comments",
      value: booking.approverComments || "—",
    },
  ];

  // Payment info (bottom row)
  const paymentStatus = booking.payment?.status || "—";
  const amountPaid = booking.pricingSnapshot?.totalAmount
    ? `₹${booking.pricingSnapshot.totalAmount}`
    : booking.fare?.totalFare
      ? `₹${booking.fare.totalFare}`
      : "—";
  const paymentMethod =
    booking.payment?.method || booking.payment?.gateway || "—";
  const transactionId =
    booking.payment?.transactionId || booking.payment?.orderId || "—";

  return (
    <div className="bg-[#F5F0E8] rounded-2xl border border-[#E8E0D0] overflow-hidden">
      {/* ── Top: Booking Summary ── */}
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <FiBriefcase size={13} className="text-[#A07840]" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#8B7355]">
              Booking Summary
            </span>
          </div>
          {isApproved && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-emerald-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Approved
            </span>
          )}
        </div>

        {/* 3-column fields grid */}
        <div className="grid grid-cols-3 gap-x-6 gap-y-5">
          {topFields.map((field, i) => (
            <div key={i}>
              <div className="flex items-center gap-1 mb-1">
                {field.icon}
                <span className="text-[9px] font-bold uppercase tracking-widest text-[#8B7355]">
                  {field.label}
                </span>
              </div>
              <p className="text-[13px] font-semibold text-gray-900 break-words leading-snug">
                {field.value || "—"}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Bottom: Payment Status row ── */}
      <div className="border-t border-[#E0D8C8] grid grid-cols-2 divide-x divide-[#E0D8C8]">
        {[
          {
            label: "Status",
            value: paymentStatus,
            valueClass:
              paymentStatus === "completed"
                ? "text-emerald-700"
                : paymentStatus === "failed"
                  ? "text-red-600"
                  : "text-amber-700",
          },
          {
            label: "Amount Paid",
            value: amountPaid,
            valueClass: "text-gray-900",
          },
          // {
          //   label: "Method",
          //   value: paymentMethod,
          //   valueClass: "text-gray-900",
          // },
          // {
          //   label: "Transaction",
          //   value: transactionId,
          //   valueClass: "text-gray-900 font-mono text-[11px]",
          // },
        ].map((col, i) => (
          <div key={i} className="px-4 py-3">
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#8B7355] mb-1">
              {col.label}
            </p>
            <p
              className={`text-[13px] font-semibold truncate ${col.valueClass}`}
            >
              {col.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
/* ────────────────────────────────────────────────────────────── */
/*  Invoice Section (restyled)                                     */
/* ────────────────────────────────────────────────────────────── */
function InvoiceSection({ bookingResult, isEmployee }) {
  if (isEmployee) return null;

  const invoices = [];

  const onwardFI = safeGet(
    bookingResult,
    "onwardResponse",
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
  const singleFI = safeGet(
    bookingResult,
    "providerResponse",
    "Response",
    "Response",
    "FlightItinerary",
  );

  if (onwardFI?.InvoiceNo) {
    invoices.push({
      label: "Onward",
      no: onwardFI.InvoiceNo,
      amount: onwardFI.InvoiceAmount,
      date: onwardFI.InvoiceCreatedOn,
    });
  }
  if (returnFI?.InvoiceNo) {
    invoices.push({
      label: "Return",
      no: returnFI.InvoiceNo,
      amount: returnFI.InvoiceAmount,
      date: returnFI.InvoiceCreatedOn,
    });
  }

  // Fallback for one-way trips
  if (!invoices.length && singleFI?.InvoiceNo) {
    invoices.push({
      label: "Onward",
      no: singleFI.InvoiceNo,
      amount: singleFI.InvoiceAmount,
      date: singleFI.InvoiceCreatedOn,
    });
  }

  if (!invoices.length) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-2">
        <FiFileText size={14} /> Invoice Details
      </h3>
      <div className="grid gap-4 md:grid-cols-2">
        {invoices.map((inv, i) => (
          <div
            key={i}
            className="border border-gray-100 rounded-lg p-3 bg-gray-50"
          >
            <p className="text-sm font-semibold mb-2">{inv.label} Invoice</p>
            <InfoRow label="Invoice No." value={inv.no} mono />
            <InfoRow
              label="Invoice Date"
              value={inv.date ? formatDate(inv.date) : "—"}
            />
            <InfoRow
              label="Invoice Amount"
              value={inv.amount != null ? `₹${inv.amount}` : "—"}
              accent
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────── */
/*  Fare Rules (restyled, non-collapsible by default)            */
/* ────────────────────────────────────────────────────────────── */

function FareRulesSection({ bookingResult }) {
  const [open, setOpen] = useState(true);

  const rules = [];

  // ── Round-trip paths ──
  const onwardFI = safeGet(
    bookingResult,
    "onwardResponse",
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

  // ── One-way path ──
  const singleFI =
    safeGet(
      bookingResult,
      "providerResponse",
      "Response",
      "Response",
      "FlightItinerary",
    ) ||
    safeGet(
      bookingResult,
      "providerResponse",
      "raw",
      "Response",
      "Response",
      "FlightItinerary",
    );

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

  // Fallback: one-way trip — only add if round-trip paths yielded nothing
  if (!rules.length && singleFI?.FareRules?.length)
    rules.push({
      label: "Onward",
      journeyType: "onward",
      rules: singleFI.FareRules,
    });

  if (!rules.length) return null;

  const staticNotes = [
    "GST, RAF and any other applicable charges are extra.",
    "Fees are indicative per pax and per sector.",
    "Domestic: submit cancellation/reissue request at least 2 hours before the airline policy time limit.",
    "International: submit cancellation/reissue request at least 4 hours before the airline policy time limit.",
  ];

  return (
    <div className="bg-[#F5F0E8] rounded-2xl border border-[#E8E0D0] p-5">
      {/* Section header */}
      <button
        className="w-full flex items-center justify-between mb-5"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <span className="text-[#A07840]">
            <FiFileText size={14} />
          </span>
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#8B7355]">
            Fare Rules
          </span>
        </div>
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#8B7355]">
          As per Airline Policy
        </span>
      </button>

      {open && (
        <>
          {/* Rule cards grid */}
          {rules.map((r, i) => {
            const firstRule = r.rules[0];
            const airlineCode = firstRule?.Airline || "";
            const fareBasis = firstRule?.FareBasisCode || "";
            const origin = firstRule?.Origin || "";
            const destination =
              r.rules[r.rules.length - 1]?.Destination ||
              firstRule?.Destination ||
              "";

            // ── Parse HTML into clean structured lines ──
            const parseRuleDetail = (html) => {
              if (!html) return [];
              // Extract <li> items first
              const liItems = [];
              const liMatches = html.matchAll(/<li>([\s\S]*?)<\/li>/gi);
              for (const match of liMatches) {
                const text = match[1]
                  .replace(/<[^>]+>/g, " ")
                  .replace(/\s+/g, " ")
                  .trim();
                if (text) liItems.push({ type: "bullet", text });
              }

              // Extract text outside of <ul>/<ol> blocks as paragraph lines
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

              const paragraphs = paragraphText.map((t) => ({
                type: "paragraph",
                text: t,
              }));

              return [...paragraphs, ...liItems];
            };

            return (
              <div
                key={i}
                className="bg-white rounded-xl border border-[#E8E0D0] p-4"
              >
                {/* Card header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#A07840] text-xs">
                      {r.journeyType === "return" ? "↙" : "↗"}
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-[#8B7355]">
                      {r.label}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#8B7355] font-medium">
                    {airlineCode} · {fareBasis}
                  </span>
                </div>

                {/* Route */}
                <p className="text-[22px] font-bold text-gray-900 tracking-tight mb-3">
                  {origin} → {destination}
                </p>

                {/* Fare basis pill */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#8B7355]">
                    Fare Basis
                  </span>
                  <span className="bg-gray-900 text-white text-[11px] font-bold px-3 py-1 rounded-full font-mono">
                    {fareBasis}
                  </span>
                </div>

                {/* All fare rules for this journey — parsed cleanly */}
                <div className="space-y-4">
                  {r.rules.map((rule, j) => {
                    const lines = parseRuleDetail(rule.FareRuleDetail);
                    const paragraphs = lines.filter(
                      (l) => l.type === "paragraph",
                    );
                    const bullets = lines.filter((l) => l.type === "bullet");

                    // Skip rules with no content at all
                    if (!lines.length && j > 0) return null;

                    return (
                      <div
                        key={j}
                        className={
                          j > 0 ? "pt-3 border-t border-[#F0EBE0]" : ""
                        }
                      >
                        {/* Sub-route label for multi-leg rules */}
                        {j > 0 && (
                          <p className="text-[11px] font-bold text-[#8B7355] uppercase tracking-wider mb-2">
                            {rule.Origin} → {rule.Destination}
                          </p>
                        )}

                        {/* Paragraph lines */}
                        {paragraphs.map((p, k) => (
                          <p
                            key={k}
                            className="text-[13px] text-gray-600 leading-relaxed mb-2 last:mb-0"
                          >
                            {p.text}
                          </p>
                        ))}

                        {/* Bullet list items */}
                        {bullets.length > 0 && (
                          <ul className="mt-2 space-y-1.5">
                            {bullets.map((b, k) => (
                              <li key={k} className="flex items-start gap-2.5">
                                <span className="text-[#A07840] mt-[3px] shrink-0 text-[10px]">
                                  ●
                                </span>
                                <span className="text-[13px] text-gray-600 leading-relaxed">
                                  {b.text}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}

                        {/* Empty state for rules with no detail */}
                        {!lines.length && (
                          <p className="text-[12px] text-gray-400 italic">
                            No additional details available for this sector.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Static policy notes */}
          {/* <ul className="space-y-2 border-t border-[#E0D8C8] pt-4">
            {staticNotes.map((note, i) => (
              <li
                key={i}
                className="flex items-start gap-2.5 text-[13px] text-gray-600"
              >
                <span className="text-[#A07840] mt-0.5 shrink-0 text-xs">
                  ●
                </span>
                {note}
              </li>
            ))}
          </ul> */}
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  ★ CANCELLATION CHARGES MODAL (NEW)                            */
/* ─────────────────────────────────────────────────────────────── */

/**
 * Step machine:
 *  "charges"         → show fetched charges + 3 action buttons
 *  "full-confirm"    → confirm dialog for full cancellation
 *  "partial-select"  → route selection for partial cancellation
 *  "partial-confirm" → confirm partial after route chosen
 *  "reissue"         → date picker for reissue
 *  "processing"      → spinner while API call in flight
 *  "success"         → success summary
 *  "error"           → error fallback
 */
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
  const [remarksText, setRemarksText] = useState("");
  const [successData, setSuccessData] = useState(null);
  const [processingLabel, setProcessingLabel] = useState("Processing…");
  const [shouldFetchCharges, setShouldFetchCharges] = useState(true);

  const [showQueryModal, setShowQueryModal] = useState(false);
  // const [showReissueModal, setShowReissueModal] = useState(false);
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

  // Fetch charges on mount
  useEffect(() => {
    const isCancelled = sessionStorage.getItem(
      `cancelRequested_${booking._id}`,
    );

    // 🚫 STOP API after cancellation OR manual block
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
        setCharges(null); // important
        setStep("charges"); // ✅ fallback instead of blocking UI
      }
    })();
  }, [booking._id, dispatch, shouldFetchCharges]);

  // Extract TicketCRInfo[0] from charges response
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
  const creditNoteNo =
    parsedCharges?.[0]?.creditNoteNo ?? charges?.CreditNoteNo ?? null;
  const cancellationCharge = parsedCharges?.[0]?.cancellationCharge ?? null;
  const refundedAmount = parsedCharges?.[0]?.refundedAmount ?? null;

  /* ── Full Cancellation ── */
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
        // Fallback for direct response structure
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

      await dispatch(fetchMyBookingById(booking._id));
      // Force page refresh or reload if needed by navigating or reloading
      navigate("/my-cancelled-bookings");
    } catch (err) {
      setChargesError(err?.message || "Cancellation failed. Please try again.");
      setStep("error");
    }
  };

  /* ── Partial Cancellation ── */
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
      if (res.error)
        throw new Error(res.payload || "Partial cancellation failed");

      sessionStorage.setItem(`cancelRequested_${booking._id}`, "true");
      setShouldFetchCharges(false);

      toast.success("Partial cancellation request submitted successfully");
      onClose();

      await dispatch(fetchMyBookingById(booking._id));
      navigate("/my-cancelled-bookings");
    } catch (err) {
      setChargesError(err?.message || "Partial cancellation failed.");
      setStep("error");
    }
  };

  /* ── Reissue ── */
  const handleReissue = async () => {
    if (!reissueDate) return;
    setStep("processing");
    setProcessingLabel("Submitting reissue request…");
    try {
      const res = await dispatch(
        amendBooking({
          bookingId: booking._id,
          segments: [{ newDate: reissueDate }],
          remarks: remarksText || "User requested reissue",
        }),
      );
      if (res.error) throw new Error(res.payload || "Reissue failed");
      toast.success("Reissue request submitted successfully");
      onClose();

      await dispatch(fetchMyBookingById(booking._id));
    } catch (err) {
      setChargesError(err?.message || "Reissue failed. Please try again.");
      setStep("error");
    }
  };

  const handleSuccessClose = () => {
    dispatch(resetAmendmentState());
    onClose();
    if (successData?.type === "full" || successData?.type === "partial") {
      navigate("/my-cancelled-bookings");
    }
  };

  const handleRaiseQuery = async () => {
    try {
      setShowQueryModal(false);
      setStep("processing");
      setProcessingLabel("Creating cancellation query...");

      const payload = {
        bookingId: booking._id,
        bookingReference: booking.bookingReference,
        priority: queryPriority,
        remarks:
          queryRemarks || "User requested cancellation but charges API failed",

        /* ✅ CORPORATE */
        corporate: {
          companyId: booking?.companyId,
          companyName: booking?.companyName,
          employeeId: booking?.employeeId,
          employeeName: booking?.user?.name,
          employeeEmail: booking?.user?.email,
        },

        /* ✅ BOOKING SNAPSHOT */
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

          sectors:
            booking?.flightRequest?.segments?.map((seg) => ({
              origin: seg?.origin?.airportCode,
              destination: seg?.destination?.airportCode,
              departureTime: seg?.departureDateTime,
              arrivalTime: seg?.arrivalDateTime,
              airline: seg?.airlineCode,
              flightNumber: seg?.flightNumber,
            })) || [],
        },

        /* ✅ PASSENGERS */
        passengers:
          booking?.travellers?.map((pax) => ({
            name: `${pax.title} ${pax.firstName} ${pax.lastName}`,
            type: pax.paxType,
            ticketNumber: pax.ticketNumber,
          })) || [],

        /* ✅ USER */
        user: {
          id: booking?.user?._id,
          name: booking?.user?.name,
          email: booking?.user?.email,
          phone: booking?.user?.phone,
        },

        /* ✅ LOGS */
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

      await dispatch(fetchMyBookingById(booking._id));
    } catch (err) {
      setChargesError(err?.message || "Failed to create query");
      setStep("error");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={step !== "processing" ? onClose : undefined}
      />

      {/* Panel */}
      <div className="relative bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
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
                Booking · {booking.bookingReference}
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

        {/* Body */}
        <div className="px-6 py-5">
          {/* ── Loading ── */}
          {step === "loading" && (
            <div className="flex flex-col items-center gap-3 py-10">
              <div className="w-10 h-10 rounded-full border-[3px] border-slate-200 border-t-red-400 animate-spin" />
              <p className="text-sm text-slate-400 font-medium">
                Fetching cancellation charges…
              </p>
            </div>
          )}

          {/* ── Processing ── */}
          {step === "processing" && (
            <div className="flex flex-col items-center gap-3 py-10">
              <div className="w-10 h-10 rounded-full border-[3px] border-slate-200 border-t-indigo-400 animate-spin" />
              <p className="text-sm text-slate-500 font-medium text-center">
                {processingLabel}
              </p>
              <p className="text-xs text-slate-400">
                Please do not close this window
              </p>
            </div>
          )}

          {/* ── Error ── */}
          {step === "error" && (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
                <FiAlertTriangle size={24} className="text-red-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 mb-1">
                  Something went wrong
                </p>
                <p className="text-xs text-slate-400">{chargesError}</p>
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Close
                </button>
                {/* <button
                  onClick={() => {
                    setStep("loading");
                    setChargesError(null);
                  }}
                  className="px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition"
                >
                  Retry
                </button> */}
              </div>
            </div>
          )}

          {/* ── Success ── */}
          {step === "success" && successData && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center">
                <FiCheckCircle size={28} className="text-emerald-500" />
              </div>
              <div>
                <p className="text-base font-black text-slate-800 mb-1">
                  {successData.type === "full" && "Cancellation Successful"}
                  {successData.type === "partial" &&
                    "Partial Cancellation Submitted"}
                  {successData.type === "reissue" &&
                    "Reissue Request Submitted"}
                  {successData.type === "query" && "Request Submitted"}
                </p>
                <p className="text-xs text-slate-400">
                  {successData.type === "full" &&
                  successData.status !== "completed"
                    ? "Your request is being processed. You'll be notified shortly."
                    : successData.type === "full"
                      ? "Your ticket has been cancelled successfully."
                      : successData.type === "partial"
                        ? `Route ${successData.route} cancellation submitted.`
                        : successData.type === "reissue"
                          ? `Reissue for ${successData.newDate} submitted.`
                          : successData.type === "query"
                            ? "Your cancellation request has been raised successfully. Our support team will process it shortly."
                            : ""}
                </p>
              </div>

              {/* Refund summary for full cancel */}
              {successData.type === "full" && (
                <div className="w-full bg-slate-50 rounded-xl p-4 space-y-2 text-left">
                  {successData.cancellationCharge != null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">
                        Cancellation Charge
                      </span>
                      <span className="font-bold text-red-600">
                        ₹{successData.cancellationCharge}
                      </span>
                    </div>
                  )}
                  {successData.refundedAmount != null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Refund Amount</span>
                      <span className="font-bold text-emerald-600">
                        ₹{successData.refundedAmount}
                      </span>
                    </div>
                  )}
                  {successData.creditNoteNo && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Credit Note No.</span>
                      <span className="font-mono text-xs font-semibold text-slate-700">
                        {successData.creditNoteNo}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={handleSuccessClose}
                className="w-full mt-2 py-3 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-800 transition"
              >
                {successData.type === "full" || successData.type === "partial"
                  ? "Go to Cancelled Bookings"
                  : "Close"}
              </button>
            </div>
          )}

          {/* ── Charges view ── */}
          {step === "charges" && (
            <div className="space-y-5">
              {/* Charges breakdown */}
              <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-4 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 mb-1">
                  Cancellation Charges
                </p>
                <div className="flex justify-between items-center text-sm pb-1">
                  <span className="text-slate-600">Total Fare</span>
                  <span className="font-black text-slate-800">
                    ₹{totalFare}
                  </span>
                </div>
                {parsedCharges.map((c, i) => (
                  <div
                    key={`charge-${i}`}
                    className="flex justify-between items-center text-sm border-t border-amber-200/50 pt-2"
                  >
                    <span className="text-slate-600">
                      {c.bookingId
                        ? `Cancellation Charge (Booking ${c.bookingId})`
                        : "Cancellation Charge"}
                    </span>
                    <span className="font-black text-red-600">
                      ₹{c.cancellationCharge ?? "0"}
                    </span>
                  </div>
                ))}
                {parsedCharges.map((c, i) => (
                  <div
                    key={`refund-${i}`}
                    className="flex justify-between text-sm border-t border-amber-200/50 pt-2"
                  >
                    <span className="text-slate-600 font-bold">
                      Refund Amount
                    </span>
                    <span className="font-black text-emerald-600">
                      ₹{c.refundedAmount ?? "0"}
                    </span>
                  </div>
                ))}
                {creditNoteNo && (
                  <div className="flex justify-between items-center text-sm border-t border-amber-200 pt-2">
                    <span className="text-slate-600">Credit Note</span>
                    <span className="font-mono text-xs font-semibold text-slate-700">
                      {creditNoteNo}
                    </span>
                  </div>
                )}
                {(parsedCharges.length === 0 || chargesError) && (
                  <p className="text-xs text-amber-600 italic">
                    {chargesError
                      ? "Unable to fetch charges. You can still proceed with cancellation. Final charges will be applied as per airline rules."
                      : "Charges not available. They will be applied as per fare rules."}
                  </p>
                )}
              </div>

              {/* Mini fare rules quick reference */}
              {/* {booking?.flightRequest?.fareSnapshot?.miniFareRules?.length >
                0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                    Fare Rules Summary
                  </p>
                  {booking.flightRequest.fareSnapshot.miniFareRules
                    .flat()
                    .map((rule, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-xs"
                      >
                        <span
                          className={`font-semibold ${rule.Type === "Cancellation" ? "text-red-600" : "text-blue-600"}`}
                        >
                          {rule.Type} · {rule.JourneyPoints}
                        </span>
                        <span className="text-slate-600">{rule.Details}</span>
                      </div>
                    ))}
                </div>
              )} */}

              {/* 3 action buttons */}
              <div className="grid grid-cols-1 gap-2 pt-1">
                <button
                  onClick={() => setStep("full-confirm")}
                  className="w-full py-3 bg-red-600 text-white font-bold text-sm rounded-xl hover:bg-red-700 transition flex items-center justify-center gap-2"
                >
                  <FiXCircle size={15} />
                  Full Cancellation
                </button>

                {hasReturn && (
                  <button
                    onClick={() => setStep("partial-select")}
                    className="w-full py-3 bg-amber-500 text-white font-bold text-sm rounded-xl hover:bg-amber-600 transition flex items-center justify-center gap-2"
                  >
                    <FiAlertTriangle size={15} />
                    Partial Cancellation
                  </button>
                )}

                <button
                  onClick={() => setStep("reissue")}
                  className="w-full py-3 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition flex items-center justify-center gap-2"
                >
                  <FiCalendar size={15} />
                  Reissue Flight
                </button>

                {/* ✅ NEW BUTTON (ONLY WHEN API FAILS) */}
                {(chargesError || parsedCharges.length === 0) && (
                  <button
                    onClick={() => setShowQueryModal(true)}
                    className="w-full py-3 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-800 transition flex items-center justify-center gap-2"
                  >
                    <FiFileText size={15} />
                    Raise Cancellation Request
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Full cancel confirm ── */}
          {step === "full-confirm" && (
            <div className="space-y-5">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
                <FiAlertTriangle
                  size={18}
                  className="text-red-500 shrink-0 mt-0.5"
                />
                <div>
                  <p className="text-sm font-bold text-red-800 mb-1">
                    This action cannot be undone
                  </p>
                  <p className="text-xs text-red-600">
                    Your ticket will be cancelled permanently. Refund (if
                    applicable) will be processed as per fare rules.
                  </p>
                </div>
              </div>

              {cancellationCharge != null && (
                <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Cancellation Charge</span>
                    <span className="font-bold text-red-600">
                      ₹{cancellationCharge}
                    </span>
                  </div>
                  {refundedAmount != null && (
                    <div className="flex justify-between text-sm border-t border-slate-200 pt-2">
                      <span className="text-slate-500 font-semibold">
                        You will receive
                      </span>
                      <span className="font-black text-emerald-600">
                        ₹{refundedAmount}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                  Remarks (optional)
                </p>
                <textarea
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-200 transition"
                  rows={2}
                  placeholder="Reason for cancellation…"
                  value={remarksText}
                  onChange={(e) => setRemarksText(e.target.value)}
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setStep("charges")}
                  className="flex-1 py-2.5 text-sm font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Back
                </button>
                <button
                  onClick={handleFullCancel}
                  className="flex-1 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition"
                >
                  Confirm Cancellation
                </button>
              </div>
            </div>
          )}

          {/* ── Partial cancel — route selection ── */}
          {step === "partial-select" && (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">
                  Select Route to Cancel
                </p>
                <div className="space-y-2">
                  {onwardSegs.length > 0 && (
                    <label
                      className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition ${selectedJourney === "onward" ? "border-amber-400 bg-amber-50" : "border-slate-200 bg-slate-50 hover:border-slate-300"}`}
                    >
                      <input
                        type="radio"
                        name="route"
                        value="onward"
                        checked={selectedJourney === "onward"}
                        onChange={() => setSelectedJourney("onward")}
                        className="accent-amber-500"
                      />
                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          ↗ Onward
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {sectorLabel(onwardSegs)}
                        </p>
                      </div>
                    </label>
                  )}
                  {returnSegs.length > 0 && (
                    <label
                      className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition ${selectedJourney === "return" ? "border-amber-400 bg-amber-50" : "border-slate-200 bg-slate-50 hover:border-slate-300"}`}
                    >
                      <input
                        type="radio"
                        name="route"
                        value="return"
                        checked={selectedJourney === "return"}
                        onChange={() => setSelectedJourney("return")}
                        className="accent-amber-500"
                      />
                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          ↩ Return
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {sectorLabel(returnSegs)}
                        </p>
                      </div>
                    </label>
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                  Remarks (optional)
                </p>
                <textarea
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-300"
                  rows={2}
                  placeholder="Add a note…"
                  value={remarksText}
                  onChange={(e) => setRemarksText(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setStep("charges")}
                  className="flex-1 py-2.5 text-sm font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep("partial-confirm")}
                  disabled={!selectedJourney}
                  className="flex-1 py-2.5 text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-40 rounded-xl transition"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* ── Partial cancel confirm ── */}
          {step === "partial-confirm" && (
            <div className="space-y-5">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                <FiAlertTriangle
                  size={18}
                  className="text-amber-500 shrink-0 mt-0.5"
                />
                <div>
                  <p className="text-sm font-bold text-amber-800 mb-1">
                    Confirm Partial Cancellation
                  </p>
                  <p className="text-xs text-amber-700">
                    Cancelling:{" "}
                    <strong>
                      {selectedJourney === "return"
                        ? `↩ Return · ${sectorLabel(returnSegs)}`
                        : `↗ Onward · ${sectorLabel(onwardSegs)}`}
                    </strong>
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setStep("partial-select")}
                  className="flex-1 py-2.5 text-sm font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Back
                </button>
                <button
                  onClick={handlePartialCancel}
                  className="flex-1 py-2.5 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition"
                >
                  Confirm
                </button>
              </div>
            </div>
          )}

          {/* ── Reissue ── */}
          {step === "reissue" && (
            <div className="space-y-5">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
                <FiInfo size={18} className="text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-blue-800 mb-1">
                    Reissue Flight
                  </p>
                  <p className="text-xs text-blue-600">
                    Select a new travel date. Reissue charges may apply as per
                    fare rules.
                  </p>
                  {booking?.flightRequest?.fareSnapshot?.miniFareRules && (
                    <p className="text-xs text-blue-500 mt-1 font-semibold">
                      Reissue fee:{" "}
                      {booking.flightRequest.fareSnapshot.miniFareRules
                        .flat()
                        .find((r) => r.Type === "Reissue")?.Details ||
                        "As per fare rules"}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                  New Travel Date
                </p>
                <input
                  type="date"
                  value={reissueDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setReissueDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                  Remarks (optional)
                </p>
                <textarea
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
                  rows={2}
                  placeholder="Add a note…"
                  value={remarksText}
                  onChange={(e) => setRemarksText(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setStep("charges")}
                  className="flex-1 py-2.5 text-sm font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Back
                </button>
                <button
                  onClick={handleReissue}
                  disabled={!reissueDate}
                  className="flex-1 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-xl transition"
                >
                  Confirm Reissue
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showQueryModal && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 shadow-xl">
            <h3 className="text-sm font-bold mb-4 text-slate-800">
              Raise Cancellation Query
            </h3>

            {/* Priority */}
            <div className="mb-3">
              <p className="text-xs font-semibold text-slate-500 mb-1">
                Priority
              </p>
              <select
                value={queryPriority}
                onChange={(e) => setQueryPriority(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>

            {/* Remarks */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-500 mb-1">
                Remarks
              </p>
              <textarea
                rows={3}
                value={queryRemarks}
                onChange={(e) => setQueryRemarks(e.target.value)}
                placeholder="Describe your issue..."
                className="w-full border border-slate-200 rounded-lg p-2 text-sm"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowQueryModal(false)}
                className="flex-1 py-2 bg-slate-100 text-sm rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={handleRaiseQuery}
                className="flex-1 py-2 bg-slate-900 text-white text-sm rounded-lg"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Legacy Amendment Modals (unchanged)                           */
/* ─────────────────────────────────────────────────────────────── */
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
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>
        {type === "cancel" && (
          <CancelScreen booking={booking} onClose={onClose} />
        )}
        {type === "reschedule" && (
          <RescheduleScreen booking={booking} onClose={onClose} />
        )}
        {type === "modify" && (
          <ModifyTravellerScreen booking={booking} onClose={onClose} />
        )}
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
    const isCancelled = sessionStorage.getItem(
      `cancelRequested_${booking._id}`,
    );

    if (isCancelled === "true") return;

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
      let changeRequestIds = [];

      if (res.payload?.isRoundTrip) {
        changeRequestIds = res.payload.data
          ?.map(
            (item) =>
              item?.response?.Response?.TicketCRInfo?.[0]?.ChangeRequestId,
          )
          .filter(Boolean);
      } else {
        const singleId =
          res.payload?.Response?.TicketCRInfo?.[0]?.ChangeRequestId ||
          res.payload?.Response?.ChangeRequestId;

        if (singleId) changeRequestIds = [singleId];
      }

      if (!changeRequestIds.length) {
        throw new Error("No ChangeRequestId");
      }
      let status = "requested";
      let attempts = 0;
      while (
        (status === "requested" || status === "in_progress") &&
        attempts < 2
      ) {
        attempts++;
        await new Promise((r) => setTimeout(r, 4000));
        const statusResponses = await Promise.all(
          changeRequestIds.map((id) =>
            dispatch(
              fetchChangeStatus({
                changeRequestId: id,
                bookingId: booking._id,
              }),
            ),
          ),
        );
        let allCompleted = true;

        for (const resItem of statusResponses) {
          const apiStatus =
            resItem.payload?.Response?.TicketCRInfo?.[0]?.ChangeRequestStatus;

          if (apiStatus !== 4) {
            allCompleted = false;
          }
        }

        status = allCompleted ? "completed" : "in_progress";
      }
      if (status === "failed")
        throw new Error("Cancellation failed by airline/supplier");

      sessionStorage.setItem(`cancelRequested_${booking._id}`, "true");

      if (status !== "completed") {
        Swal.fire({
          icon: "info",
          title: "Cancellation in Progress",
          text: "Your cancellation request is being processed. Please check status later.",
        });
        navigate("/my-cancelled-bookings");
        onClose();
        return;
      }
      await dispatch(fetchMyBookingById(booking._id));
      navigate("/my-cancelled-bookings");
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      dispatch(fetchMyBookingById(booking._id));
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
        <button onClick={onClose} className="px-4 py-2 bg-slate-100 rounded-lg">
          Close
        </button>
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
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-semibold bg-slate-100 rounded-lg"
        >
          Close
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-bold bg-blue-600 text-white rounded-lg"
        >
          Confirm Reschedule
        </button>
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
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-semibold bg-slate-100 rounded-lg"
        >
          Close
        </button>
        <button className="px-4 py-2 text-sm font-bold bg-indigo-600 text-white rounded-lg">
          Save Changes
        </button>
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

  const buildSectors = () => {
    const pick = selectedJourney === "return" ? returnSegments : onwardSegments;
    return pick.map((seg) => ({
      Origin: seg?.origin?.airportCode,
      Destination: seg?.destination?.airportCode,
    }));
  };

  const handleSubmit = async () => {
    if (!selectedJourney) return;
    const sectors = buildSectors().filter((s) => s.Origin && s.Destination);
    if (!sectors.length) return;
    try {
      setLoading(true);
      const res = await dispatch(
        partialCancellation({
          bookingId: booking._id,
          segments: sectors,
          remarks,
        }),
      );
      if (res.error)
        throw new Error(res.payload || "Partial cancellation failed");
      sessionStorage.setItem(`cancelRequested_${booking._id}`, "true");
      // 🔥 CLOSE MODAL IMMEDIATELY
      onClose();
      await dispatch(fetchMyBookingById(booking._id));
      Swal.fire({
        icon: "success",
        title: "Cancellation request submitted successfully",
        timer: 2000,
        showConfirmButton: false,
      });
      navigate("/my-cancelled-bookings");
      onClose();
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Failed to submit cancellation",
        text: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-xl p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-extrabold">Partial Cancellation</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-xs font-bold uppercase text-slate-400 mb-2">
              Select Route
            </p>
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
          <div>
            <p className="text-xs font-bold uppercase text-slate-400 mb-2">
              Remarks (optional)
            </p>
            <textarea
              className="w-full border border-slate-200 rounded-lg p-2 text-sm"
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-500 hover:bg-slate-100"
              disabled={loading}
            >
              Close
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedJourney || loading}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50"
            >
              {loading ? "Submitting..." : "Submit Cancellation"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Main page component                                            */
/* ─────────────────────────────────────────────────────────────── */
export default function BookingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { selected: booking, loading } = useSelector((s) => s.bookings);
  const userRole = useSelector((s) => s.auth?.user?.role);
  const sessionRole =
    sessionStorage.getItem("userRole") || sessionStorage.getItem("role");
  const isEmployee = userRole === "employee" || userRole === "manager" || sessionRole === "employee" || sessionRole === "manager";

  const [downloading, setDownloading] = useState(null);
  const [amendmentType, setAmendmentType] = useState(null);
  const [showPartialCancel, setShowPartialCancel] = useState(false);
  const [showCancellationModal, setShowCancellationModal] = useState(false);

  const cancelRequested =
    sessionStorage.getItem(`cancelRequested_${booking?._id}`) === "true";
  const isCancelled =
    ["cancelled", "cancel_requested"].includes(booking?.executionStatus?.toLowerCase()) ||
    (isEmployee && cancelRequested);

  useEffect(() => {
    if (id) dispatch(fetchMyBookingById(id));
  }, [id, dispatch]);

  useEffect(() => {
    if (
      !booking?._id ||
      !["ticket_pending", "on_hold"].includes(booking.executionStatus)
    )
      return;
    const iv = setInterval(
      () => dispatch(fetchMyBookingById(booking._id)),
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
  const executionStatus = isCancelled ? "cancelled" : booking.executionStatus;
  const departureTime = allSegments?.[0]?.departureDateTime;
  const isTravelPassed = departureTime && new Date() > new Date(departureTime);
  const showCancellationChargesBtn =
    paymentSuccessful &&
    executionStatus === "ticketed" &&
    !isCancelled &&
    !isTravelPassed;

  const handleDownloadTicket = async (journeyType) => {
    if (!pnrsByJourney[journeyType]) return;
    setDownloading(journeyType);
    await dispatch(downloadTicketPdf({ bookingId: booking._id, journeyType }));
    setDownloading(null);
  };

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
    <div className="min-h-screen bg-gray-50">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            <FiArrowLeft size={16} /> Back
          </button>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 font-mono">
                {booking.bookingReference}
              </span>
              <StatusPill status={executionStatus} />
            </div>

            {paymentSuccessful && !isCancelled && (
              <div className="flex items-center gap-2 border-l border-gray-200 pl-4 ml-1">
                {pnrsByJourney.onward && (
                  <button
                    onClick={() => handleDownloadTicket("onward")}
                    disabled={downloading === "onward"}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800 transition disabled:opacity-50 shadow-sm"
                  >
                    <FiDownload size={13} className="text-teal-400" />
                    {downloading === "onward" ? "Downloading" : isRoundTrip ? "Ticket (Onward)" : "Download Ticket"}
                  </button>
                )}
                {isRoundTrip && pnrsByJourney.return && (
                  <button
                    onClick={() => handleDownloadTicket("return")}
                    disabled={downloading === "return"}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800 transition disabled:opacity-50 shadow-sm"
                  >
                    <FiDownload size={13} className="text-teal-400" />
                    {downloading === "return" ? "Downloading" : "Ticket (Return)"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-5 py-8 pb-24 space-y-6">
        {/* ── Header: "Your trip is confirmed" ── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#8B7355] mb-2">
              Reservation
            </p>
            <h1 className="text-[36px] font-black text-gray-900 tracking-tight leading-none mb-3">
              {isCancelled ? "Your trip is cancelled." : "Your trip is confirmed."}
            </h1>
            <p className="text-sm text-gray-500  leading-relaxed">
              A clean, single-page record of your itinerary, passengers and
              payment.
            </p>
          </div>
        </div>
        {/* Flight cards */}
        {journeyTypes.map((jt) => (
          <FlightCard
            key={jt}
            journeyType={jt}
            segments={journeyMap[jt]}
            pnr={pnrsByJourney[jt]}
            paymentSuccessful={paymentSuccessful}
            downloading={downloading}
            onDownload={handleDownloadTicket}
            showDownload={isRoundTrip}
            fareQuoteResults={fareQuoteResults}
            bookingResult={bookingResult}
          />
        ))}
        {/* Global download button for one-way */}
        {/* {isOneWay && paymentSuccessful && pnrsByJourney.onward && (
          <div className="flex justify-end">
            <button
              onClick={() => handleDownloadTicket("onward")}
              disabled={downloading === "onward"}
              className="flex items-center gap-2 px-5 py-2 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 disabled:opacity-50"
            >
              <FiDownload size={14} />{" "}
              {downloading === "onward" ? "Downloading…" : "Download E-Ticket"}
            </button>
          </div>
        )} */}
        {/* ── Passenger Section ── */}
        <div className="bg-[#F5F0E8] rounded-2xl border border-[#E8E0D0] p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#8B7355]">
              Passengers · {travellers.length}
            </p>
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#8B7355]">
              Listed once for the entire trip
            </p>
          </div>

          {/* Travelers Table */}
          <div className="bg-white rounded-xl border border-[#E8E0D0] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
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
                        {/* Name Column */}
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

                        {/* Type Column */}
                        <td className="px-4 py-5">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                            {formatPaxType(trav.paxType)}
                          </span>
                        </td>

                        {/* Gender Column */}
                        <td className="px-4 py-5">
                          <p className="text-[13px] font-semibold text-gray-700 capitalize">
                            {trav.gender || "—"}
                          </p>
                        </td>

                        {/* DOB Column */}
                        <td className="px-4 py-5">
                          <p className="text-[12px] font-medium text-gray-600">
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
        {/* Two-column block: Passenger + Booking Summary */}
        {/* Booking summary (right column) */}
        <div className="lg:col-span-1">
          <BookingSummaryCard
            booking={booking}
            displayPnr={pnrsByJourney.onward || null}
          />
        </div>
        {/* SSR Section */}
        <SSRSection
          ssrSnapshot={ssrSnapshot}
          travellers={travellers}
          segments={allSegments}
          isEmployee={isEmployee}
        />
        {/* Fare summary (for non-employee) */}
        {!isEmployee && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-2">
              <FiCreditCard size={14} /> Fare Summary
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
              <InfoRow label="Base Fare" value={`₹${baseFare}`} />
              <InfoRow label="Tax" value={`₹${tax}`} />
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
              <div className="mt-4 bg-teal-50 rounded-lg p-4 flex justify-between items-center">
                <span className="font-semibold text-teal-800">Total Paid</span>
                <span className="text-2xl font-black text-gray-900">
                  ₹{pricingSnap.totalAmount}
                </span>
              </div>
            )}
          </div>
        )}
        {/* Invoice Section */}
        {/* <InvoiceSection bookingResult={bookingResult} isEmployee={isEmployee} /> */}
        {/* Payment & Ticket Status */}
        <div className="bg-[#F5F0E8] rounded-2xl border border-[#E8E0D0] overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 flex items-center justify-between border-b border-[#E0D8C8]">
            <div className="flex items-center gap-2">
              <FiCreditCard size={13} className="text-[#A07840]" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#8B7355]">
                Payment & Booking Status
              </span>
            </div>

            {/* Retry button — only when pending/on_hold */}
            {["ticket_pending", "on_hold"].includes(executionStatus) && (
              <button
                onClick={async () => {
                  try {
                    await dispatch(manualTicketNonLcc(booking._id));
                    Swal.fire({
                      icon: "info",
                      title: "Retrying Ticket",
                      timer: 2000,
                      showConfirmButton: false,
                    });
                  } catch {
                    Swal.fire({ icon: "error", title: "Retry Failed" });
                  }
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gray-900 text-white rounded-full text-[11px] font-bold hover:bg-gray-800 transition-all"
              >
                <FiRefreshCw size={11} /> Retry Ticket
              </button>
            )}
          </div>

          {/* 3-column status grid */}
          <div className="grid grid-cols-3 divide-x divide-[#E0D8C8]">
            {!isEmployee && (
            <div className="px-5 py-4">
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#8B7355] mb-2">
                Payment
              </p>
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    paymentSuccessful ? "bg-emerald-500" : "bg-amber-400"
                  }`}
                />
                <p
                  className={`text-[15px] font-bold ${
                    paymentSuccessful ? "text-emerald-700" : "text-amber-700"
                  }`}
                >
                  {paymentSuccessful ? "Successful" : "Pending"}
                </p>
              </div>
              {/* {paymentSuccessful && (
                <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wide">
                  {booking.payment?.method || "—"}
                </p>
              )} */}
            </div>
            )}

            {/* Ticket Status */}
            <div className="px-5 py-4">
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#8B7355] mb-2">
                Ticket Status
              </p>
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    executionStatus === "ticketed"
                      ? "bg-emerald-500"
                      : executionStatus === "cancelled"
                        ? "bg-red-500"
                        : "bg-amber-400"
                  }`}
                />
                <p
                  className={`text-[15px] font-bold ${
                    executionStatus === "ticketed"
                      ? "text-emerald-700"
                      : executionStatus === "cancelled"
                        ? "text-red-700"
                        : "text-amber-700"
                  }`}
                >
                  {executionStatus === "ticketed"
                    ? "Issued"
                    : executionStatus === "cancelled"
                      ? "Cancelled"
                      : executionStatus === "on_hold"
                        ? "On Hold"
                        : "Issuing…"}
                </p>
              </div>
              {executionStatus === "ticket_pending" && (
                <p className="text-[10px] text-amber-500 mt-1 uppercase tracking-wide flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Refreshing every 15s
                </p>
              )}
            </div>

            {/* Purpose of Travel */}
            <div className="px-5 py-4">
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#8B7355] mb-2">
                Purpose
              </p>
              <p className="text-[15px] font-bold text-gray-900 leading-snug">
                {booking.purposeOfTravel || "—"}
              </p>
            </div>
          </div>
        </div>
        {/* Fare Rules */}
        <FareRulesSection bookingResult={bookingResult} />

        {/* Cancellation Details (Bottom) */}
        {isCancelled && (() => {
          const raw = booking.amendment?.raw;
          let totalRefund = 0;
          let totalCharge = 0;
          let creditNotes = [];
          let providerRemarks = [];
          
          const onwardBookingId = booking.bookingResult?.onwardResponse?.Response?.Response?.BookingId || booking.bookingResult?.providerResponse?.Response?.Response?.BookingId;
          const returnBookingId = booking.bookingResult?.returnResponse?.Response?.Response?.BookingId;

          const sectorBreakdown = [];

          const getSectorLabel = (bId) => {
            if (bId && bId === onwardBookingId) {
              const segs = booking.flightRequest?.segments?.filter(s => s.journeyType === "onward") || [];
              if (segs.length > 0) {
                return `Onward: ${segs[0].origin?.airportCode} → ${segs[segs.length-1].destination?.airportCode}`;
              }
              return "Onward Journey";
            }
            if (bId && bId === returnBookingId) {
              const segs = booking.flightRequest?.segments?.filter(s => s.journeyType === "return") || [];
              if (segs.length > 0) {
                return `Return: ${segs[0].origin?.airportCode} → ${segs[segs.length-1].destination?.airportCode}`;
              }
              return "Return Journey";
            }
            return "Booking Segment";
          };

          if (Array.isArray(raw)) {
            raw.forEach(item => {
              const info = item.response?.Response?.TicketCRInfo?.[0];
              if (info) {
                totalRefund += Number(info.RefundedAmount || 0);
                totalCharge += Number(info.CancellationCharge || 0);
                if (info.CreditNoteNo && info.CreditNoteNo !== "—") creditNotes.push(info.CreditNoteNo);
                if (info.Remarks && info.Remarks !== "Successful") providerRemarks.push(info.Remarks);
                
                sectorBreakdown.push({
                  label: getSectorLabel(item.bookingId),
                  refund: info.RefundedAmount,
                  charge: info.CancellationCharge,
                  creditNote: info.CreditNoteNo,
                  remarks: info.Remarks
                });
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
          const displayRemarks = providerRemarks.length > 0 ? providerRemarks.join(" | ") : (Array.isArray(raw) ? "Successful" : "");

          return (
            <div className="space-y-6 mt-8">
              {/* Total Aggregated Summary */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8B7355]">
                    Overall Cancellation Summary
                  </p>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-50 border border-red-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-[9px] font-bold uppercase text-red-600 tracking-wider">
                      {booking.amendment?.status || "Cancelled"}
                    </span>
                  </div>
                </div>

                <div className="p-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                        Cancelled On
                      </p>
                      <p className="text-[15px] font-bold text-gray-900">
                        {new Date(booking.updatedAt || booking.amendment?.requestedAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                        Total Refund
                      </p>
                      <p className="text-[15px] font-bold text-emerald-600">
                        ₹{displayRefund}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                        Total Charges
                      </p>
                      <p className="text-[15px] font-bold text-red-500">
                        ₹{displayCharge}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                        Credit Note(s)
                      </p>
                      <p className="text-[15px] font-bold text-gray-900 font-mono">
                        {displayCreditNote}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sector Breakdown Breakdown */}
              {sectorBreakdown.length > 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sectorBreakdown.map((sector, idx) => (
                    <div key={idx} className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[11px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          {sector.label}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                        <div>
                          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Refund</p>
                          <p className="text-sm font-bold text-emerald-600">₹{sector.refund || "0"}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Charge</p>
                          <p className="text-sm font-bold text-red-500">₹{sector.charge || "0"}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Credit Note</p>
                          <p className="text-sm font-mono font-bold text-slate-700">{sector.creditNote || "—"}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Remarks</p>
                          <p className="text-xs font-semibold text-blue-600 truncate" title={sector.remarks}>
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
                        "{booking.cancellation?.reason || booking.amendment?.remarks || "User Requested"}"
                      </p>
                    </div>
                  </div>

                  {(displayRemarks || (Array.isArray(raw) && raw.length > 0)) && (
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
        {/* Amendment actions */}
        {paymentSuccessful &&
          executionStatus === "ticketed" &&
          !isCancelled &&
          !isTravelPassed && (
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
                <button
                  onClick={() => setShowCancellationModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-semibold hover:bg-red-100"
                >
                  <FiXCircle size={14} /> Cancellation Charges
                </button>
              </div>
              <p className="text-[11px] text-gray-400 mt-3">
                Charges may apply as per fare rules. Cancellation cannot be
                undone.
              </p>
            </div>
          )}

        {/* ── Sticky Download Button (bottom-right) ── */}
        {/* {paymentSuccessful && !isCancelled &&
          (pnrsByJourney.onward || pnrsByJourney.return) && (
            <div className="fixed bottom-6 right-6 z-30 flex flex-col gap-2 items-end">
              {isRoundTrip ? (
                <>
                  <button
                    onClick={() => handleDownloadTicket("onward")}
                    disabled={downloading === "onward"}
                    className="flex items-center gap-2 px-5 py-3 bg-[#C49B44] text-white rounded-full text-[12px] font-bold shadow-lg hover:bg-[#a8832f] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FiDownload size={14} />
                    {downloading === "onward"
                      ? "Downloading…"
                      : "Download · Onward"}
                  </button>
                  {pnrsByJourney.return && (
                    <button
                      onClick={() => handleDownloadTicket("return")}
                      disabled={downloading === "return"}
                      className="flex items-center gap-2 px-5 py-3 bg-white border border-[#D8CEB8] text-gray-800 rounded-full text-[12px] font-bold shadow-lg hover:bg-[#F5F0E8] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FiDownload size={14} />
                      {downloading === "return"
                        ? "Downloading…"
                        : "Download · Return"}
                    </button>
                  )}
                </>
              ) : (
                <button
                  onClick={() => handleDownloadTicket("onward")}
                  disabled={downloading === "onward"}
                  className="flex items-center gap-2 px-5 py-3 bg-[#C49B44] text-white rounded-full text-[12px] font-bold shadow-lg hover:bg-[#a8832f] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiDownload size={14} />
                  {downloading === "onward"
                    ? "Downloading…"
                    : "Download Ticket"}
                </button>
              )}
            </div>
          )} */}
      </main>

      {/* Modals – keep your existing modal components */}
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
    </div>
  );
}
