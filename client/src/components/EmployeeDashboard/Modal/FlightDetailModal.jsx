// FlightDetailModal.jsx
// Modal version of the flight booking details — mirrors HotelDetailModal pattern.
// Opens on "View Details" from CancelledFlightsPage, fetches full booking via fetchMyBookingById.

import React, { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  FiX,
  FiDownload,
  FiUser,
  FiCreditCard,
  FiCheckCircle,
  FiAlertCircle,
  FiBriefcase,
  FiRefreshCw,
  FiShield,
  FiInfo,
  FiClock,
  FiXCircle,
  FiCalendar,
  FiMapPin,
  FiLayers,
} from "react-icons/fi";
import {
  MdFlightTakeoff,
  MdFlightLand,
  MdVerifiedUser,
  MdCheckCircle,
  MdReceipt,
  MdCancel,
  MdAirplanemodeInactive,
  MdLuggage,
  MdAirlineSeatReclineNormal,
} from "react-icons/md";
import { fetchMyBookingById } from "../../../Redux/Actions/booking.thunks";
import {
  formatDate,
  formatDateTime,
  formatDuration,
  formatTime,
} from "../../../utils/formatter";
import { fetchChangeStatus } from "../../../Redux/Actions/amendmentThunks";

/* ─────────────────────────────────────────────────────────────── */
/*  Primitives                                                     */
/* ─────────────────────────────────────────────────────────────── */

function StatusPill({ status }) {
  const map = {
    Confirmed: "bg-emerald-400/20 text-emerald-300 ring-1 ring-emerald-400/30",
    confirmed: "bg-emerald-400/20 text-emerald-300 ring-1 ring-emerald-400/30",
    ticketed: "bg-emerald-400/20 text-emerald-300 ring-1 ring-emerald-400/30",
    Pending: "bg-amber-400/20 text-amber-300 ring-1 ring-amber-400/30",
    pending: "bg-amber-400/20 text-amber-300 ring-1 ring-amber-400/30",
    Cancelled: "bg-red-400/20 text-red-300 ring-1 ring-red-400/30",
    cancelled: "bg-red-400/20 text-red-300 ring-1 ring-red-400/30",
    cancel_requested:
      "bg-orange-400/20 text-orange-300 ring-1 ring-orange-400/30",
  };
  const dot = {
    Confirmed: "bg-emerald-400",
    confirmed: "bg-emerald-400",
    ticketed: "bg-emerald-400",
    Pending: "bg-amber-400",
    pending: "bg-amber-400",
    Cancelled: "bg-red-400",
    cancelled: "bg-red-400",
    cancel_requested: "bg-orange-400",
  };
  const label =
    status === "cancel_requested"
      ? "Cancel Requested"
      : status
        ? status.charAt(0).toUpperCase() + status.slice(1)
        : "—";

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase ${map[status] || map.Pending}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${dot[status] || dot.Pending}`}
      />
      {label}
    </span>
  );
}

function InfoRow({ label, value, accent }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-400 font-medium">{label}</span>
      <span
        className={`text-[13px] font-semibold ${accent ? "text-teal-600" : "text-slate-800"}`}
      >
        {value || "—"}
      </span>
    </div>
  );
}

function SectionCard({ children, className = "" }) {
  return (
    <div
      className={`bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

function CardLabel({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-2 mb-3 sm:mb-4">
      <span className="bg-cyan-50 rounded-lg p-1.5 flex items-center justify-center shrink-0">
        <Icon size={13} className="text-teal-600" />
      </span>
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
        {label}
      </span>
    </div>
  );
}

function MetaChip({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2 bg-white/[0.07] rounded-xl px-3 py-2.5 border border-white/10">
      <Icon size={13} className="text-white/50 shrink-0" />
      <div>
        <p className="text-[9px] uppercase tracking-widest text-white/40 font-bold leading-none mb-0.5">
          {label}
        </p>
        <p className="text-[13px] font-semibold text-white leading-none">
          {value || "—"}
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Flight Hero Card (dark gradient — mirrors HotelHeroCard)       */
/* ─────────────────────────────────────────────────────────────── */
function FlightHeroCard({ booking }) {
  const flightReq = booking?.flightRequest || {};
  const result = booking?.bookingResult || {};
  const providerRes = result?.providerResponse?.Response?.Response || {};
  const itinerary = providerRes?.FlightItinerary || {};
  const segments =
    booking?.bookingResult?.providerResponse?.Response?.Response
      ?.FlightItinerary?.Segments ||
    booking?.flightRequest?.segments ||
    [];
  const firstSeg = segments[0] || {};
  const lastSeg = segments[segments.length - 1] || {};

  // ── Origin / Destination
  const origin =
    firstSeg?.Origin?.Airport?.AirportCode ||
    firstSeg?.origin?.airportCode ||
    "—";
  const dest =
    lastSeg?.Destination?.Airport?.AirportCode ||
    lastSeg?.destination?.airportCode ||
    "—";
  const originCity =
    firstSeg?.Origin?.Airport?.CityName || firstSeg?.origin?.city || "";
  const destCity =
    lastSeg?.Destination?.Airport?.CityName || lastSeg?.destination?.city || "";
  const originAirport =
    firstSeg?.Origin?.Airport?.AirportName ||
    firstSeg?.origin?.airportName ||
    "";
  const destAirport =
    lastSeg?.Destination?.Airport?.AirportName ||
    lastSeg?.destination?.airportName ||
    "";

  // ── Times
  const depTime =
    firstSeg?.Origin?.DepTime || firstSeg?.departureDateTime || null;
  const arrTime =
    lastSeg?.Destination?.ArrTime || lastSeg?.arrivalDateTime || null;

  // ── Airline
  const airlineName =
    firstSeg?.Airline?.AirlineName || firstSeg?.airlineName || "Airline";
  const airlineCode =
    firstSeg?.Airline?.AirlineCode || firstSeg?.airlineCode || "";
  const flightNumber =
    firstSeg?.Airline?.FlightNumber || firstSeg?.flightNumber || "";

  // ── Duration: sum all segment durations
  const totalMinutes = segments.reduce(
    (acc, s) => acc + (s?.durationMinutes || s?.Duration || 0),
    0,
  );

  // ── Stops
  const stops = Math.max(0, segments.length - 1);

  // ── Class
  const cabinClass =
    firstSeg?.CabinClass ||
    flightReq?.searchQuery?.cabinClass ||
    flightReq?.cabinClass ||
    "Economy";

  // ── PNR / booking ref
  const pnr = result?.pnr || itinerary?.PNRDetails || booking?.pnr || "";
  const executionStatus = "cancelled";

  return (
    <div
      className="rounded-xl overflow-hidden shadow-2xl text-white relative w-full"
      style={{
        background:
          "linear-gradient(140deg, #0d1b2a 0%, #0A4D68 60%, #088395 100%)",
      }}
    >
      {/* grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg,#fff 0px,#fff 1px,transparent 1px,transparent 40px),repeating-linear-gradient(90deg,#fff 0px,#fff 1px,transparent 1px,transparent 40px)",
        }}
      />

      <div className="relative p-4 sm:p-6 grid gap-0">
        {/* ── ROW 1: Airline + status ── */}
        <div className="flex items-start gap-3 pb-4 border-b border-white/10">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
            <MdFlightTakeoff size={20} className="text-white/80" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base sm:text-xl font-black leading-tight">
              {airlineName}
            </p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {airlineCode && (
                <span className="text-[10px] text-white/50 font-mono font-bold">
                  {airlineCode}
                </span>
              )}
              {flightNumber && (
                <span className="text-[10px] text-white/50">
                  · Flight {flightNumber}
                </span>
              )}
            </div>
          </div>
          <StatusPill status={executionStatus || "confirmed"} />
        </div>

        {/* ── ROW 2: Route ── */}
        <div className="grid grid-cols-[1fr_100px_1fr] sm:grid-cols-[1fr_140px_1fr] items-center py-4 sm:py-6 border-b border-white/10 gap-2">
          {/* Origin */}
          <div className="space-y-1">
            <p className="text-[9px] sm:text-[11px] text-white/40 font-bold uppercase tracking-widest">
              From
            </p>
            <p className="text-2xl sm:text-[40px] font-black tracking-tighter leading-none">
              {origin}
            </p>
            <p className="text-xs sm:text-sm text-white/70 font-semibold">
              {originCity}
            </p>
            <p className="text-[9px] sm:text-[10px] text-white/35 line-clamp-1">
              {originAirport}
            </p>
            {depTime && (
              <p className="text-[11px] sm:text-xs text-white/60 font-bold">
                {formatTime(depTime)}
              </p>
            )}
          </div>

          {/* Middle connector */}
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-[8px] sm:text-[10px] font-bold tracking-widest text-white/40 uppercase whitespace-nowrap">
              {totalMinutes ? formatDuration(totalMinutes) : "—"}
            </span>
            <div className="flex items-center gap-0 w-full">
              <span className="w-1.5 h-1.5 rounded-full border-2 border-white/30 shrink-0" />
              <div className="flex-1 border-t border-dashed border-white/20" />
              <MdFlightTakeoff
                size={14}
                className="text-white/40 -rotate-0 shrink-0"
              />
              <div className="flex-1 border-t border-dashed border-white/20" />
              <span className="w-1.5 h-1.5 rounded-full bg-white/30 shrink-0" />
            </div>
            <span className="text-[8px] font-bold tracking-widest text-white/30 uppercase">
              {stops === 0
                ? "Non-stop"
                : `${stops} stop${stops > 1 ? "s" : ""}`}
            </span>
          </div>

          {/* Destination */}
          <div className="text-right space-y-1">
            <p className="text-[9px] sm:text-[11px] text-white/40 font-bold uppercase tracking-widest">
              To
            </p>
            <p className="text-2xl sm:text-[40px] font-black tracking-tighter leading-none">
              {dest}
            </p>
            <p className="text-xs sm:text-sm text-white/70 font-semibold">
              {destCity}
            </p>
            <p className="text-[9px] sm:text-[10px] text-white/35 line-clamp-1">
              {destAirport}
            </p>
            {arrTime && (
              <p className="text-[11px] sm:text-xs text-white/60 font-bold">
                {formatTime(arrTime)}
              </p>
            )}
          </div>
        </div>

        {/* ── ROW 3: Meta chips ── */}
        <div className="grid grid-cols-3 gap-2 py-3 sm:py-4 border-b border-white/10">
          <MetaChip
            icon={MdAirlineSeatReclineNormal}
            label="Class"
            value={cabinClass}
          />
          <MetaChip
            icon={FiCalendar}
            label="Travel Date"
            value={
              depTime
                ? formatDate(depTime, { day: "2-digit", month: "short" })
                : "—"
            }
          />
          <MetaChip
            icon={FiLayers}
            label="Stops"
            value={
              stops === 0 ? "Non-stop" : `${stops} stop${stops > 1 ? "s" : ""}`
            }
          />
        </div>

        {/* ── ROW 4: PNR ── */}
        <div className="pt-3 sm:pt-4">
          {pnr ? (
            <div>
              <p className="text-[8px] sm:text-[9px] uppercase tracking-widest text-white/35 font-bold mb-1">
                PNR / Booking Reference
              </p>
              <p className="text-base sm:text-xl font-black tracking-[0.12em] font-mono text-white">
                {pnr}
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-white/30">
              <FiAlertCircle size={14} />
              <p className="text-[11px] font-medium">PNR not available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Segment timeline row                                           */
/* ─────────────────────────────────────────────────────────────── */
function SegmentRow({ segment, index }) {
  const origin =
    segment?.Origin?.Airport?.AirportCode ||
    segment?.origin?.airportCode ||
    "—";
  const dest =
    segment?.Destination?.Airport?.AirportCode ||
    segment?.destination?.airportCode ||
    "—";
  const originCity =
    segment?.Origin?.Airport?.CityName || segment?.origin?.city || "";
  const destCity =
    segment?.Destination?.Airport?.CityName || segment?.destination?.city || "";
  const originTerminal =
    segment?.Origin?.Airport?.Terminal || segment?.origin?.terminal || "";
  const destTerminal =
    segment?.Destination?.Airport?.Terminal ||
    segment?.destination?.terminal ||
    "";
  const depTime = segment?.Origin?.DepTime || segment?.departureDateTime;
  const arrTime = segment?.Destination?.ArrTime || segment?.arrivalDateTime;
  const airline = segment?.Airline?.AirlineName || segment?.airlineName || "";
  const flightNo =
    segment?.Airline?.FlightNumber || segment?.flightNumber || "";
  const cabinClass = segment?.CabinClass || segment?.cabinClass || "";
  const duration = segment?.Duration || segment?.durationMinutes || 0;
  const baggage = segment?.Baggage || segment?.baggage || "";
  const cabinBaggage = segment?.CabinBaggage || segment?.cabinBaggage || "";

  return (
    <div className="relative pl-6 pb-5 last:pb-0">
      {/* timeline line */}
      <div className="absolute left-[9px] top-3 bottom-0 w-px bg-slate-200 last:hidden" />
      <div className="absolute left-0 top-1 w-[18px] h-[18px] rounded-full bg-teal-500 flex items-center justify-center text-white text-[9px] font-bold">
        {index + 1}
      </div>

      <div className="bg-slate-50 rounded-xl border border-slate-100 p-3 sm:p-4">
        {/* Airline & flight */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MdFlightTakeoff size={14} className="text-teal-500" />
            <span className="text-[12px] font-bold text-slate-800">
              {airline}
            </span>
            {flightNo && (
              <span className="text-[11px] text-slate-400 font-mono">
                {flightNo}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {cabinClass && (
              <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-full">
                {cabinClass}
              </span>
            )}
            {duration > 0 && (
              <span className="text-[10px] text-slate-400 font-medium">
                {formatDuration(duration)}
              </span>
            )}
          </div>
        </div>

        {/* Route times */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 mb-3">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Departure
            </p>
            <p className="text-xl font-black text-slate-800">{origin}</p>
            <p className="text-[11px] text-slate-500 font-medium">
              {originCity}
            </p>
            {originTerminal && (
              <p className="text-[10px] text-slate-400">T{originTerminal}</p>
            )}
            <p className="text-[12px] font-bold text-teal-600 mt-0.5">
              {formatTime(depTime)}
            </p>
            <p className="text-[10px] text-slate-400">{formatDate(depTime)}</p>
          </div>

          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1">
              <div className="w-6 border-t border-dashed border-slate-300" />
              <MdFlightTakeoff size={12} className="text-slate-400" />
              <div className="w-6 border-t border-dashed border-slate-300" />
            </div>
          </div>

          <div className="text-right">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Arrival
            </p>
            <p className="text-xl font-black text-slate-800">{dest}</p>
            <p className="text-[11px] text-slate-500 font-medium">{destCity}</p>
            {destTerminal && (
              <p className="text-[10px] text-slate-400">T{destTerminal}</p>
            )}
            <p className="text-[12px] font-bold text-teal-600 mt-0.5">
              {formatTime(arrTime)}
            </p>
            <p className="text-[10px] text-slate-400">{formatDate(arrTime)}</p>
          </div>
        </div>

        {/* Baggage chips */}
        {(baggage || cabinBaggage) && (
          <div className="flex gap-2 flex-wrap">
            {baggage && (
              <span className="inline-flex items-center gap-1 text-[10px] text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                <MdLuggage size={11} className="text-slate-400" />
                Check-in: {baggage}
              </span>
            )}
            {cabinBaggage && (
              <span className="inline-flex items-center gap-1 text-[10px] text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                <MdLuggage size={11} className="text-slate-400" />
                Cabin: {cabinBaggage}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Main Modal                                                     */
/* ─────────────────────────────────────────────────────────────── */
export default function FlightDetailModal({ isOpen, bookingId, onClose }) {
  const dispatch = useDispatch();
  const overlayRef = useRef(null);

  // ── Redux state — uses the same selectedBooking slice key as fetchMyBookingById populates
  const { selected: booking, loading } = useSelector((s) => s.bookings);
  const { changeStatus } = useSelector((s) => s.amendment);

  const liveStatus = (() => {
    const status = changeStatus?.Response?.ChangeRequestStatus;

    switch (status) {
      case 0:
        return "not_set";
      case 1:
        return "unassigned";
      case 2:
        return "assigned";
      case 3:
        return "acknowledged";
      case 4:
        return "completed";
      case 5:
        return "rejected";
      case 6:
        return "closed";
      case 7:
        return "pending";
      case 8:
        return "other";
      default:
        return null;
    }
  })();

  const getCancellationUI = () => {
    switch (liveStatus) {
      case "completed":
        return {
          text: "Booking Cancelled Successfully",
          bg: "bg-red-50 border-red-100",
          textColor: "text-red-700",
          iconColor: "text-red-500",
        };

      case "rejected":
        return {
          text: "Cancellation Rejected",
          bg: "bg-red-50 border-red-100",
          textColor: "text-red-700",
          iconColor: "text-red-500",
        };

      case "unassigned":
        return {
          text: "Cancellation Requested",
          bg: "bg-orange-50 border-orange-100",
          textColor: "text-orange-700",
          iconColor: "text-orange-500",
        };

      case "assigned":
        return {
          text: "Cancellation Assigned",
          bg: "bg-orange-50 border-orange-100",
          textColor: "text-orange-700",
          iconColor: "text-orange-500",
        };

      case "acknowledged":
        return {
          text: "Cancellation in Progress",
          bg: "bg-orange-50 border-orange-100",
          textColor: "text-orange-700",
          iconColor: "text-orange-500",
        };

      case "pending":
        return {
          text: "Cancellation Pending",
          bg: "bg-amber-50 border-amber-100",
          textColor: "text-amber-700",
          iconColor: "text-amber-500",
        };

      case "closed":
        return {
          text: "Request Closed",
          bg: "bg-slate-50 border-slate-200",
          textColor: "text-slate-700",
          iconColor: "text-slate-500",
        };

      default:
        return {
          text: "Processing cancellation...",
          bg: "bg-orange-50 border-orange-100",
          textColor: "text-orange-700",
          iconColor: "text-orange-500",
        };
    }
  };

  const cancelUI = getCancellationUI();

  // ── Fetch on open
  useEffect(() => {
    if (isOpen && bookingId) {
      dispatch(fetchMyBookingById(bookingId));
    }
  }, [isOpen, bookingId, dispatch]);

  // ── Close on Escape
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // ── Lock body scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!booking?.amendment?.changeRequestId) return;

    // const interval = setInterval(() => {
    dispatch(
      fetchChangeStatus({
        changeRequestId: booking.amendment.changeRequestId,
        bookingId: booking._id,
      }),
    );
    // }, 60000); // every 10 sec

    // return () => clearInterval(interval);
  }, [booking, dispatch]);

  if (!isOpen) return null;

  /* ── Data extraction ── */
  const flightReq = booking?.flightRequest || {};
  const result = booking?.bookingResult || {};
  const providerRes = result?.providerResponse?.Response?.Response || {};
  const itinerary = providerRes?.FlightItinerary || {};
  const segments = itinerary?.Segments || flightReq?.segments || [];
  const passengers =
    itinerary?.Passenger || booking?.travellers || flightReq?.passengers || [];

  const paymentSuccessful =
    booking?.payment?.status === "completed" || !!booking?.pnr;
  const executionStatus = "cancelled";
  const isConfirmed =
    executionStatus === "ticketed" || executionStatus === "confirmed";

  const totalFare =
    booking?.pricingSnapshot?.totalAmount ||
    booking?.totalFare ||
    itinerary?.Fare?.PublishedFare ||
    0;

  const getHeaderBadge = () => {
    if (executionStatus === "cancelled" || liveStatus === "completed") {
      return {
        text: "Cancelled",
        className: "bg-red-100 text-red-700",
        icon: <MdCancel size={11} />,
      };
    }

    if (liveStatus && liveStatus !== "completed") {
      return {
        text: "Cancelling...",
        className: "bg-orange-100 text-orange-700",
        icon: <FiRefreshCw size={11} />,
      };
    }

    if (isConfirmed) {
      return {
        text: "Ticketed",
        className: "bg-emerald-100 text-emerald-800",
        icon: <MdVerifiedUser size={11} />,
      };
    }

    return null;
  };

  const headerBadge = getHeaderBadge();

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        ref={overlayRef}
        onClick={(e) => {
          if (e.target === overlayRef.current) onClose();
        }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
        aria-modal="true"
        role="dialog"
      >
        {/* ── Drawer / Modal panel ── */}
        <div className="relative bg-slate-50 w-full sm:max-w-5xl max-h-[92dvh] sm:max-h-[88vh] rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden shadow-2xl">
          {/* ── Modal header ── */}
          <div className="flex items-center gap-3 px-4 sm:px-5 h-14 border-b border-slate-200 bg-white shrink-0">
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
              <MdFlightTakeoff size={14} className="text-[#0A4D68]" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-[13px] font-bold text-slate-900 truncate">
                Flight Booking Details
              </h2>
              {booking?.bookingReference && (
                <p className="text-[10px] text-slate-400">
                  Ref:{" "}
                  <span className="font-mono font-semibold text-slate-600">
                    {booking.bookingReference}
                  </span>
                </p>
              )}
            </div>

            {headerBadge && (
              <span
                className={`hidden sm:flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold whitespace-nowrap ${headerBadge.className}`}
              >
                {headerBadge.icon}
                {headerBadge.text}
              </span>
            )}

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center border-none cursor-pointer transition-colors shrink-0"
            >
              <FiX size={15} className="text-slate-600" />
            </button>
          </div>

          {/* ── Scrollable content ── */}
          <div className="flex-1 overflow-y-auto">
            {/* Loading state */}
            {loading && (
              <div className="flex flex-col items-center justify-center h-64 gap-4">
                <div className="w-10 h-10 rounded-full border-[3px] border-slate-200 border-t-teal-500 animate-spin" />
                <p className="text-xs text-slate-400 font-medium">
                  Loading booking details…
                </p>
              </div>
            )}

            {/* Error / not found */}
            {!loading && !booking && (
              <div className="flex flex-col items-center justify-center h-64 gap-3">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                  <MdAirplanemodeInactive
                    size={24}
                    className="text-slate-300"
                  />
                </div>
                <p className="text-slate-500 font-semibold text-sm">
                  Booking not found
                </p>
                <p className="text-xs text-slate-400">
                  We couldn't load the details for this booking.
                </p>
              </div>
            )}

            {/* Main content */}
            {!loading && booking && (
              <div className="p-4 sm:p-5 space-y-3 sm:space-y-4">
                {/* ── Flight hero card ── */}
                <FlightHeroCard booking={booking} />

                {/* ── Payment & Booking Status ── */}

                {/* ── Cancellation notice ── */}
                {(executionStatus === "cancelled" ||
                  executionStatus === "cancel_requested") && (
                  <SectionCard>
                    <CardLabel icon={MdCancel} label="Cancellation" />
                    <div
                      className={`flex items-start gap-3 rounded-xl px-4 py-3 border ${cancelUI.bg}`}
                    >
                      <FiXCircle
                        size={16}
                        className={`shrink-0 mt-0.5 ${cancelUI.iconColor}`}
                      />

                      <div>
                        <p
                          className={`text-[13px] font-bold ${cancelUI.textColor}`}
                        >
                          {cancelUI.text}
                        </p>

                        {booking?.amendment?.changeRequestId && (
                          <p className="text-[11px] text-orange-500 mt-1">
                            Request ID: {booking.amendment.changeRequestId}
                          </p>
                        )}

                        {booking?.cancelledAt && (
                          <p className="text-[11px] mt-0.5 text-slate-500">
                            {formatDate(
                              booking.cancelledAt || booking.updatedAt,
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  </SectionCard>
                )}

                {/* ── Passengers ── */}
                {passengers.length > 0 && (
                  <SectionCard>
                    <CardLabel
                      icon={FiUser}
                      label={`Passengers · ${passengers.length}`}
                    />
                    <div className="space-y-3">
                      {passengers.map((p, i) => {
                        const title = p?.Title || p?.title || "";
                        const firstName = p?.FirstName || p?.firstName || "";
                        const lastName = p?.LastName || p?.lastName || "";
                        const type = p?.PaxType || p?.passengerType || "";
                        const ticket =
                          p?.Ticket?.TicketNumber ||
                          p?.ticket?.ticketNumber ||
                          p?.ticketNumber ||
                          "";
                        const seat = p?.SegmentAdditionalInfo?.[0]?.Seat || "";
                        const paxBaggage =
                          p?.SegmentAdditionalInfo?.[0]?.Baggage || "";

                        return (
                          <div
                            key={i}
                            className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5"
                          >
                            <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center shrink-0 text-teal-700 text-[11px] font-black">
                              {`${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase() ||
                                `P${i + 1}`}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-bold text-slate-800 leading-tight">
                                {[title, firstName, lastName]
                                  .filter(Boolean)
                                  .join(" ") || `Passenger ${i + 1}`}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                {type && (
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                                    {type === "1" || type === 1
                                      ? "Adult"
                                      : type === "2" || type === 2
                                        ? "Child"
                                        : type === "3" || type === 3
                                          ? "Infant"
                                          : type}
                                  </span>
                                )}
                                {ticket && (
                                  <span className="text-[10px] font-mono text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded">
                                    {ticket}
                                  </span>
                                )}
                                {seat && (
                                  <span className="text-[10px] text-slate-500">
                                    Seat {seat}
                                  </span>
                                )}
                              </div>
                            </div>
                            {paxBaggage && (
                              <div className="text-right shrink-0">
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                                  Baggage
                                </p>
                                <p className="text-[11px] font-semibold text-slate-600">
                                  {paxBaggage}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </SectionCard>
                )}

                {/* ── Booking References ── */}
                <SectionCard>
                  <CardLabel icon={MdReceipt} label="Booking References" />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1">
                        Booking Ref
                      </p>
                      <p className="text-xs font-black text-slate-800 font-mono break-all">
                        {booking.bookingReference || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1">
                        PNR
                      </p>
                      <p className="text-xs font-black text-slate-800 font-mono break-all">
                        {result?.pnr ||
                          itinerary?.PNRDetails ||
                          booking?.pnr ||
                          "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1">
                        Created
                      </p>
                      <p className="text-xs font-semibold text-slate-700">
                        {booking.createdAt
                          ? formatDateTime(booking.createdAt)
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1">
                        Approved
                      </p>
                      <p className="text-xs font-semibold text-slate-700">
                        {booking.approvedAt
                          ? formatDate(booking.approvedAt)
                          : "—"}
                      </p>
                    </div>
                  </div>
                </SectionCard>
              </div>
            )}
          </div>

          {/* ── Modal footer ── */}
          <div className="shrink-0 px-4 sm:px-5 py-3 border-t border-slate-200 bg-white flex items-center justify-between gap-3">
            <button
              onClick={onClose}
              className="text-xs text-slate-500 hover:text-slate-700 font-medium bg-transparent border-none cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
