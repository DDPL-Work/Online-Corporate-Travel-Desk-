import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
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
  FiInfo,
  FiChevronDown,
  FiChevronUp,
  FiStar,
  FiXCircle,
  FiAlertTriangle,
  FiDollarSign,
  FiX,
  FiLoader,
  FiStopCircle,
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
  airlineThemes,
  FLIGHT_STATUS_MAP,
} from "../../utils/formatter";
import Swal from "sweetalert2";

/* ─────────────────────────────────────────────────────────────── */
/*  Utility helpers                                                */
/* ─────────────────────────────────────────────────────────────── */

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
    refundedAmount: firstDefined(info?.RefundedAmount, root?.RefundedAmount),
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

/* ─────────────────────────────────────────────────────────────── */
/*  Shared primitives                                              */
/* ─────────────────────────────────────────────────────────────── */

function StatusPill({ status, size = "sm" }) {
  const map = {
    Confirmed: "bg-emerald-400/20 text-emerald-300 ring-1 ring-emerald-400/30",
    Pending: "bg-amber-400/20   text-amber-300   ring-1 ring-amber-400/30",
    Cancelled: "bg-red-400/20     text-red-300     ring-1 ring-red-400/30",
    ticketed: "bg-emerald-400/20 text-emerald-300 ring-1 ring-emerald-400/30",
    approved: "bg-blue-400/20 text-blue-300 ring-1 ring-blue-400/30",
    pending: "bg-amber-400/20   text-amber-300   ring-1 ring-amber-400/30",
    cancelled: "bg-red-400/20     text-red-300     ring-1 ring-red-400/30",
  };
  const dot = {
    Confirmed: "bg-emerald-400",
    Pending: "bg-amber-400",
    Cancelled: "bg-red-400",
    ticketed: "bg-emerald-400",
    approved: "bg-blue-400",
    pending: "bg-amber-400",
    cancelled: "bg-red-400",
  };
  const key = status?.toLowerCase() || "pending";
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase ${map[key] || map.Pending}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot[key] || dot.Pending}`} />
      {status}
    </span>
  );
}

function InfoRow({ label, value, accent, mono }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-400 font-medium">{label}</span>
      <span
        className={`text-[13px] font-semibold ${accent ? "text-teal-600" : "text-slate-800"} ${mono ? "font-mono tracking-wide" : ""}`}
      >
        {value ?? "—"}
      </span>
    </div>
  );
}

function BentoCard({ children, className = "" }) {
  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

function CardLabel({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      <span className="bg-cyan-50 rounded-lg p-1.5 flex items-center justify-center">
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

function RouteConnector({ duration, stops = 0 }) {
  return (
    <div className="flex flex-col items-center gap-1 px-2">
      <span className="text-[10px] font-bold tracking-widest text-white/40 uppercase">
        {duration}
      </span>
      <div className="flex items-center gap-0 w-full">
        <span className="w-2 h-2 rounded-full border-2 border-white/30 shrink-0" />
        <div className="flex-1 relative flex items-center">
          <div className="w-full border-t border-dashed border-white/20" />
          <span className="absolute left-1/2 -translate-x-1/2 -translate-y-[55%] text-sm select-none">
            ✈
          </span>
        </div>
        <span className="w-2 h-2 rounded-full bg-white/30 shrink-0" />
      </div>
      <span className="text-[9px] font-bold tracking-widest text-white/30 uppercase">
        {stops === 0 ? "Non-stop" : `${stops} stop${stops > 1 ? "s" : ""}`}
      </span>
    </div>
  );
}

function LayoverBanner({ prevSeg, nextSeg }) {
  const mins = layoverMinutes(prevSeg, nextSeg);
  const airport =
    prevSeg?.destination?.airportCode || prevSeg?.destination?.city || "—";
  const city = prevSeg?.destination?.city || "";
  return (
    <div className="flex items-center gap-3 px-4 py-3 my-3 rounded-xl bg-white/10 border border-white/15">
      <FiClock size={13} className="text-amber-300 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-black uppercase tracking-widest text-amber-300 mb-0.5">
          Layover · {airport} {city ? `(${city})` : ""}
        </p>
        <div className="flex items-center gap-4 text-[11px] text-white/50">
          <span>Arrive {formatTime(prevSeg.arrivalDateTime)}</span>
          <span className="text-white/25">→</span>
          <span>Depart {formatTime(nextSeg.departureDateTime)}</span>
          <span className="ml-auto font-semibold text-amber-200">
            {formatLayoverDuration(mins)}
          </span>
        </div>
      </div>
    </div>
  );
}

function FareClassBadge({ label, color }) {
  const bgStyle = color
    ? { backgroundColor: color + "33", borderColor: color + "66" }
    : {};
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black tracking-wide border"
      style={bgStyle}
    >
      <FiStar
        size={10}
        style={color ? { color } : {}}
        className={!color ? "text-teal-400" : ""}
      />
      <span style={color ? { color } : { color: "#2dd4bf" }}>{label}</span>
    </span>
  );
}

function SegmentRow({ seg, fareClassInfo, isFirst, isLast }) {
  return (
    <div className="grid grid-cols-[1fr_160px_1fr] items-center py-5 border-b border-white/10 last:border-0">
      <div className="space-y-1">
        {isFirst && (
          <p className="text-[11px] text-white/40 font-bold uppercase tracking-widest">
            From
          </p>
        )}
        <p className="text-[40px] font-black tracking-tighter leading-none">
          {seg?.origin?.city}
        </p>
        <p className="text-sm text-white/70 font-medium">
          {seg?.origin?.airportCode}
        </p>
        {seg?.origin?.terminal && (
          <p className="text-[10px] text-white/30">
            Terminal {seg.origin.terminal}
          </p>
        )}
        <div className="flex items-baseline gap-2 mt-1">
          <p className="text-xl font-black">
            {formatTime(seg?.departureDateTime)}
          </p>
          <p className="text-xs text-white/40">
            {formatDate(seg?.departureDateTime)}
          </p>
        </div>
      </div>

      <RouteConnector duration={formatDuration(seg?.durationMinutes)} />

      <div className="text-right space-y-1">
        {isFirst && (
          <p className="text-[11px] text-white/40 font-bold uppercase tracking-widest">
            To
          </p>
        )}
        <p className="text-[40px] font-black tracking-tighter leading-none">
          {seg?.destination?.city}
        </p>
        <p className="text-sm text-white/70 font-medium">
          {seg?.destination?.airportCode}
        </p>
        {seg?.destination?.terminal && (
          <p className="text-[10px] text-white/30">
            Terminal {seg.destination.terminal}
          </p>
        )}
        <div className="flex items-baseline gap-2 justify-end mt-1">
          <p className="text-xl font-black">
            {formatTime(seg?.arrivalDateTime)}
          </p>
          <p className="text-xs text-white/40">
            {formatDate(seg?.arrivalDateTime)}
          </p>
        </div>
      </div>
    </div>
  );
}

function JourneyCard({
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

  let supplierFareClass = null;
  let fareClassColor = null;

  if (journeyType === "onward") {
    const fi = safeGet(
      bookingResult,
      "onwardResponse",
      "Response",
      "Response",
      "FlightItinerary",
    );
    supplierFareClass =
      fi?.SupplierFareClasses || fi?.FareClassification?.split?.("#")?.[0];
    fareClassColor = fi?.FareClassification?.split?.("#")?.[1];
  } else if (journeyType === "return") {
    const fi = safeGet(
      bookingResult,
      "returnResponse",
      "Response",
      "Response",
      "FlightItinerary",
    );
    supplierFareClass =
      fi?.SupplierFareClasses || fi?.FareClassification?.split?.("#")?.[0];
    fareClassColor = fi?.FareClassification?.split?.("#")?.[1];
  }

  if (!supplierFareClass && fareQuoteResults?.length) {
    const idx = journeyType === "return" ? 1 : 0;
    const result = fareQuoteResults[idx] || fareQuoteResults[0];
    supplierFareClass =
      result?.Segments?.[0]?.[0]?.SupplierFareClass ||
      result?.FareClassification?.Type;
    fareClassColor = result?.FareClassification?.Color;
    if (!supplierFareClass)
      supplierFareClass = result?.Segments?.[0]?.[0]?.FareClassification?.Type;
  }

  const theme = airlineThemes?.[firstSeg?.airlineCode] || {
    primary: "#0A2540",
    secondary: "#0c3352",
  };
  const gradient = `linear-gradient(140deg, ${theme.primary} 0%, ${theme.secondary} 60%, ${theme.primary} 100%)`;

  const statusLabel = FLIGHT_STATUS_MAP?.["Confirmed"]?.label || "Confirmed";

  let ticketNumber = null;
  let issueDate = null;
  let validatingAirline = null;

  const responseKey =
    journeyType === "return" ? "returnResponse" : "onwardResponse";
  const fi = safeGet(
    bookingResult,
    responseKey,
    "Response",
    "Response",
    "FlightItinerary",
  );
  if (fi) {
    ticketNumber = fi.Passenger?.[0]?.Ticket?.TicketNumber;
    issueDate = fi.Passenger?.[0]?.Ticket?.IssueDate;
    validatingAirline = fi.ValidatingAirlineCode;
  }

  return (
    <div
      className="rounded-2xl overflow-hidden shadow-2xl text-white relative"
      style={{ background: gradient }}
    >
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg,#fff 0px,#fff 1px,transparent 1px,transparent 40px),repeating-linear-gradient(90deg,#fff 0px,#fff 1px,transparent 1px,transparent 40px)",
        }}
      />

      <div className="relative p-6 grid gap-0">
        <div className="flex items-center gap-3 pb-5 border-b border-white/10">
          {airlineLogo?.(firstSeg?.airlineCode) ? (
            <img
              src={airlineLogo(firstSeg.airlineCode)}
              alt=""
              className="w-10 h-10 rounded-xl object-contain bg-white/10 p-1.5 shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-sm font-black shrink-0">
              {firstSeg?.airlineCode}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate">
              {firstSeg?.airlineName}
            </p>
            <p className="text-[11px] text-white/50 mt-0.5">
              {segments
                .map((s) => `${s.airlineCode} ${s.flightNumber}`)
                .join(" → ")}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-white/30 bg-white/10 px-2.5 py-1 rounded-full">
              {journeyType === "return" ? "↩ Return" : "↗ Onward"}
            </span>
            <StatusPill status={statusLabel} />
          </div>
        </div>

        {supplierFareClass && (
          <div className="py-3 border-b border-white/10 flex items-center gap-2">
            <FareClassBadge label={supplierFareClass} color={fareClassColor} />
            <span className="text-[10px] text-white/30 font-medium">
              Fare Class
            </span>
          </div>
        )}

        <div className="border-b border-white/10">
          {segments.map((seg, i) => (
            <React.Fragment key={i}>
              {i > 0 && (
                <LayoverBanner prevSeg={segments[i - 1]} nextSeg={seg} />
              )}
              <SegmentRow
                seg={seg}
                isFirst={i === 0}
                isLast={i === segments.length - 1}
              />
            </React.Fragment>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2.5 py-4 border-b border-white/10">
          <MetaChip
            icon={FiPackage}
            label="Check-in"
            value={firstSeg?.baggage?.checkIn}
          />
          <MetaChip
            icon={FiPackage}
            label="Cabin bag"
            value={firstSeg?.baggage?.cabin}
          />
          <MetaChip
            icon={FiMapPin}
            label="Terminal"
            value={firstSeg?.origin?.terminal || "N/A"}
          />
        </div>

        {ticketNumber && (
          <div className="grid grid-cols-3 gap-2.5 py-4 border-b border-white/10">
            <MetaChip
              icon={FiFileText}
              label="Ticket No."
              value={ticketNumber}
            />
            <MetaChip
              icon={FiCalendar}
              label="Issue Date"
              value={issueDate ? formatDate(issueDate) : "—"}
            />
            <MetaChip
              icon={FiTag}
              label="Validating Airline"
              value={validatingAirline}
            />
          </div>
        )}

        {paymentSuccessful && (
          <div className="pt-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-[9px] uppercase tracking-widest text-white/35 font-bold mb-1">
                Booking Reference (PNR)
              </p>
              {pnr ? (
                <p className="text-xl font-black tracking-[0.15em] font-mono text-white">
                  {pnr}
                </p>
              ) : (
                <div className="flex items-center gap-2">
                  <FiRefreshCw
                    size={13}
                    className="text-white/40 animate-spin"
                  />
                  <span className="text-sm text-white/40 font-semibold">
                    Awaiting assignment…
                  </span>
                </div>
              )}
            </div>

            {pnr && showDownload && (
              <button
                onClick={() => onDownload(journeyType)}
                disabled={isDownloading}
                className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-900 hover:bg-slate-100 rounded-xl text-[13px] font-bold transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0 shadow-md"
              >
                <FiDownload size={14} />
                {isDownloading ? "Downloading…" : "Download Ticket"}
              </button>
            )}
          </div>
        )}

        {!paymentSuccessful && (
          <div className="pt-4 flex items-center gap-2 text-white/30">
            <FiAlertCircle size={14} />
            <p className="text-xs font-medium">
              Complete payment to view PNR and download ticket
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  SSR Section                                                    */
/* ─────────────────────────────────────────────────────────────── */
function SSRSection({ ssrSnapshot, travellers, segments, isEmployee }) {
  if (!ssrSnapshot) return null;

  const { seats = [], meals = [], baggage = [] } = ssrSnapshot;
  if (!seats.length && !meals.length && !baggage.length) return null;

  const travelerMap = {};
  travellers.forEach((t, idx) => {
    travelerMap[idx] = `${t.title} ${t.firstName} ${t.lastName}`;
  });

  const journeyTypes = [
    ...new Set(segments.map((s) => s.journeyType || "onward")),
  ];

  return (
    <BentoCard className="md:col-span-2">
      <CardLabel icon={FiStar} label="SSR — Seats, Meals & Extras" />
      <div className="grid gap-4 md:grid-cols-2">
        {journeyTypes.map((jt) => {
          const jtSeats = seats.filter((s) => s.journeyType === jt);
          const jtMeals = meals.filter((m) => m.journeyType === jt);
          const jtBaggage = baggage.filter((b) => b.journeyType === jt);
          const jtSegs = segments.filter(
            (s) => (s.journeyType || "onward") === jt,
          );

          return (
            <div
              key={jt}
              className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"
            >
              <p className="text-xs font-black uppercase tracking-widest text-teal-600 mb-3">
                {jt === "return" ? "↩ Return" : "↗ Onward"}
              </p>

              {jtSegs.map((seg, si) => {
                const segSeats = jtSeats.filter((s) => s.segmentIndex === si);
                const segMeals = jtMeals.filter((m) => m.segmentIndex === si);
                const segBag = jtBaggage.filter((b) => b.segmentIndex === si);

                return (
                  <div key={si} className="mb-4 last:mb-0">
                    <p className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wider">
                      {seg.origin?.airportCode} → {seg.destination?.airportCode}
                    </p>

                    {segSeats.map((seat, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-center py-1.5 border-b border-slate-100 last:border-0"
                      >
                        <div>
                          <p className="text-xs font-semibold text-slate-700">
                            Seat: {seat.seatNo}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {travelerMap[seat.travelerIndex] ||
                              `Traveller ${seat.travelerIndex + 1}`}
                          </p>
                        </div>
                        {!isEmployee && seat.price > 0 && (
                          <span className="text-xs font-bold text-slate-600">
                            ₹{seat.price}
                          </span>
                        )}
                      </div>
                    ))}

                    {segMeals.map((meal, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-center py-1.5 border-b border-slate-100 last:border-0"
                      >
                        <div>
                          <p className="text-xs font-semibold text-slate-700">
                            Meal: {meal.code}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Qty: {meal.description || 1} ·{" "}
                            {travelerMap[meal.travelerIndex] ||
                              `Traveller ${meal.travelerIndex + 1}`}
                          </p>
                        </div>
                        {!isEmployee && meal.price > 0 && (
                          <span className="text-xs font-bold text-slate-600">
                            ₹{meal.price}
                          </span>
                        )}
                      </div>
                    ))}

                    {segBag.map((b, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-center py-1.5 border-b border-slate-100 last:border-0"
                      >
                        <div>
                          <p className="text-xs font-semibold text-slate-700">
                            Extra Baggage: {b.weight || b.description || "—"}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {travelerMap[b.travelerIndex] ||
                              `Traveller ${b.travelerIndex + 1}`}
                          </p>
                        </div>
                        {!isEmployee && b.price > 0 && (
                          <span className="text-xs font-bold text-slate-600">
                            ₹{b.price}
                          </span>
                        )}
                      </div>
                    ))}

                    {!segSeats.length && !segMeals.length && !segBag.length && (
                      <p className="text-[11px] text-slate-300 italic">
                        No SSR for this segment
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </BentoCard>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Booking Summary card                                           */
/* ─────────────────────────────────────────────────────────────── */
function BookingSummaryCard({ booking, displayPnr }) {
  return (
    <div className="">
      <CardLabel icon={FiFileText} label="Booking Summary" />
      <div className="grid grid-cols-1 gap-x-8">
        <div>
          <InfoRow label="Project Name" value={booking.projectName} />
          <InfoRow label="Project Code" value={booking.projectCodeId} />
          <InfoRow label="Project Client" value={booking.projectClient} />
          <InfoRow label="Approver Email" value={booking.approverEmail} />
          <InfoRow label="Approver Role" value={booking.approverRole} />
          {booking.approverComments && (
            <InfoRow
              label="Approver Comments"
              value={booking.approverComments}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Invoice Section (role-gated)                                   */
/* ─────────────────────────────────────────────────────────────── */
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

  if (onwardFI?.InvoiceNo) {
    invoices.push({
      label: "Onward",
      no: onwardFI.InvoiceNo,
      amount: onwardFI.InvoiceAmount,
      date: onwardFI.InvoiceCreatedOn,
      status: onwardFI.InvoiceStatus,
    });
  }
  if (returnFI?.InvoiceNo) {
    invoices.push({
      label: "Return",
      no: returnFI.InvoiceNo,
      amount: returnFI.InvoiceAmount,
      date: returnFI.InvoiceCreatedOn,
      status: returnFI.InvoiceStatus,
    });
  }

  if (!invoices.length) return null;

  return (
    <BentoCard className="md:col-span-2">
      <CardLabel icon={FiFileText} label="Invoice Details" />
      <div className="grid gap-3 md:grid-cols-2">
        {invoices.map((inv, i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"
          >
            <p className="text-xs font-black uppercase tracking-widest text-teal-600 mb-2">
              {inv.label} Invoice
            </p>
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
    </BentoCard>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Fare Rules collapsible                                         */
/* ─────────────────────────────────────────────────────────────── */
function FareRulesSection({ bookingResult }) {
  const [open, setOpen] = useState(false);

  const rules = [];
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

  if (onwardFI?.FareRules?.length)
    rules.push({ label: "Onward", rules: onwardFI.FareRules });
  if (returnFI?.FareRules?.length)
    rules.push({ label: "Return", rules: returnFI.FareRules });

  if (!rules.length) return null;

  return (
    <BentoCard className="md:col-span-2">
      <button
        className="w-full flex items-center justify-between"
        onClick={() => setOpen((v) => !v)}
      >
        <CardLabel icon={FiShield} label="Fare Rules" />
        {open ? (
          <FiChevronUp size={16} className="text-slate-400" />
        ) : (
          <FiChevronDown size={16} className="text-slate-400" />
        )}
      </button>
      {open && (
        <div className="mt-2 space-y-4">
          {rules.map((r, i) => (
            <div key={i}>
              <p className="text-xs font-black uppercase tracking-widest text-teal-600 mb-2">
                   {r.label}
                 </p>
              {r.rules.map((rule, j) => (
                <div key={j} className="mb-3">
                  <p className="text-xs font-semibold text-slate-600">
                    {rule.Origin} → {rule.Destination} · {rule.Airline} ·{" "}
                    {rule.FareBasisCode}
                  </p>
                  {rule.FareRuleDetail && (
                    <div
                      className="text-xs text-slate-500 mt-1 prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: rule.FareRuleDetail }}
                    />
                  )}
               </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </BentoCard>
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
        throw new Error("No ChangeRequestId returned");
      }

      setProcessingLabel("Waiting for airline confirmation…");
      let status = "requested";
      let attempts = 0;
      let finalInfo = null;

      while (
        (status === "requested" || status === "in_progress") &&
        attempts < 3
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
          const crInfo =
            resItem.payload?.Response?.TicketCRInfo?.[0] ||
            resItem.payload?.Response;

          const apiStatus = crInfo?.ChangeRequestStatus;
          finalInfo = crInfo;

          if (apiStatus !== 4) {
            allCompleted = false;
          }
        }

        status = allCompleted ? "completed" : "in_progress";
      }

      if (status === "failed")
        throw new Error("Cancellation failed by airline/supplier");

      sessionStorage.setItem(`cancelRequested_${booking._id}`, "true");
      setShouldFetchCharges(false);

      // 🔥 CLOSE MODAL IMMEDIATELY
      onClose();
      await dispatch(fetchMyBookingById(booking._id));

      setSuccessData({
        type: "full",
        status,
        cancellationCharge:
          finalInfo?.CancellationCharge ??
          parsedCharges?.[0]?.cancellationCharge,

        refundedAmount:
          finalInfo?.RefundedAmount ?? parsedCharges?.[0]?.refundedAmount,
        creditNoteNo: finalInfo?.CreditNoteNo ?? creditNoteNo,
      });
      setStep("success");
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

      // 🔥 CLOSE MODAL IMMEDIATELY
      onClose();

      await dispatch(fetchMyBookingById(booking._id));

      setSuccessData({
        type: "partial",
        route: sectorLabel(
          selectedJourney === "return" ? returnSegs : onwardSegs,
        ),
      });
      setStep("success");
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
      await dispatch(fetchMyBookingById(booking._id));
      setSuccessData({ type: "reissue", newDate: reissueDate });
      setStep("success");
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

      setSuccessData({
        type: "query",
        queryId: res.payload?.queryId,
      });

      setStep("success");
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
                {parsedCharges.map((c, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center text-sm"
                  >
                    <span className="text-slate-600">
                      {c.bookingId ? `Booking ${c.bookingId}` : "Flight"}
                    </span>
                    <span className="font-black text-red-600">
                      ₹{c.cancellationCharge}
                    </span>
                  </div>
                ))}
                {parsedCharges.map((c, i) => (
                  <div
                    key={i}
                    className="flex justify-between text-sm border-t pt-2"
                  >
                    <span className="text-slate-600">Refund</span>
                    <span className="font-black text-emerald-600">
                      ₹{c.refundedAmount}
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
  const isEmployee = userRole === "employee" || sessionRole === "employee";

  const [downloading, setDownloading] = useState(null);
  const [amendmentType, setAmendmentType] = useState(null);
  const [showPartialCancel, setShowPartialCancel] = useState(false);
  // ★ NEW state
  const [showCancellationModal, setShowCancellationModal] = useState(false);

  const cancelRequested =
    sessionStorage.getItem(`cancelRequested_${booking?._id}`) === "true";
  const isCancelled =
    booking?.executionStatus === "cancelled" || (isEmployee && cancelRequested);

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
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
        <div className="w-11 h-11 rounded-full border-[3px] border-slate-200 border-t-teal-500 animate-spin" />
        <p className="text-sm text-slate-400 font-medium">
          Loading booking details…
        </p>
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

  const journeyMap = {};
  allSegments.forEach((seg) => {
    const jt = seg.journeyType || "onward";
    if (!journeyMap[jt]) journeyMap[jt] = [];
    journeyMap[jt].push(seg);
  });
  const journeyTypes = Object.keys(journeyMap);
  const isRoundTrip = journeyTypes.includes("return");
  const isOneWay = !isRoundTrip;

  const isInternationalRT =
    allSegments.length > 1 &&
    allSegments.some(
      (f) => f.origin?.country !== "IN" || f.destination?.country !== "IN",
    ) &&
    allSegments.some((f) => f.journeyType === "return");

  const pnrsByJourney = isInternationalRT
    ? {
        onward: booking.bookingResult?.pnr || null,
        return: booking.bookingResult?.pnr || null,
      }
    : {
        onward:
          booking.bookingResult?.onwardPNR ||
          booking.bookingResult?.pnr ||
          null,
        return: booking.bookingResult?.returnPNR || null,
      };

  const displayPnr =
    booking.bookingResult?.pnr ||
    (pnrsByJourney.onward && pnrsByJourney.return
      ? `${pnrsByJourney.onward} / ${pnrsByJourney.return}`
      : pnrsByJourney.onward || null);

  const paymentSuccessful = booking.payment?.status === "completed";
  const executionStatus = isCancelled ? "cancelled" : booking.executionStatus;

  const handleDownloadTicket = async (journeyType) => {
    if (!pnrsByJourney[journeyType]) return;
    setDownloading(journeyType);
    await dispatch(downloadTicketPdf({ bookingId: booking._id, journeyType }));
    setDownloading(null);
  };

  const departureTime = allSegments?.[0]?.departureDateTime;
  const isTravelPassed = departureTime && new Date() > new Date(departureTime);

  const seatSelections = ssrSnapshot?.seats || [];
  const mealSelections = ssrSnapshot?.meals || [];
  const totalSeatPrice = seatSelections.reduce(
    (sum, s) => sum + (s?.price || 0),
    0,
  );
  const totalMealPrice = mealSelections.reduce(
    (sum, m) => sum + (m?.price || 0),
    0,
  );

  let baseFare = 0;
  let tax = 0;
  let refundable = false;

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

  // ★ Show cancellation charges button condition:
  // ticket is issued, payment done, not cancelled, travel not passed
  const showCancellationChargesBtn =
    paymentSuccessful &&
    executionStatus === "ticketed" &&
    !isCancelled &&
    !isTravelPassed;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* ── Header bar ── */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-5 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition"
          >
            <FiArrowLeft size={16} />
            Back
          </button>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-slate-400">
              {booking.bookingReference}
            </span>
            <StatusPill status={executionStatus} />
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-5 py-8 pb-24 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ── 1. Journey Cards ── */}
        {journeyTypes.map((jt, jIdx) => {
          const segs = journeyMap[jt] || [];
          const isOdd = journeyTypes.length % 2 !== 0;
          const isLast = jIdx === journeyTypes.length - 1;
          const spanFull = journeyTypes.length === 1 || (isOdd && isLast);
          return (
            <div key={jt} className={spanFull ? "md:col-span-2" : ""}>
              <JourneyCard
                journeyType={jt}
                segments={segs}
                pnr={pnrsByJourney[jt]}
                paymentSuccessful={paymentSuccessful}
                downloading={downloading}
                onDownload={handleDownloadTicket}
                showDownload={isRoundTrip}
                fareQuoteResults={fareQuoteResults}
                bookingResult={bookingResult}
              />
            </div>
          );
        })}

        {/* ── Global Download (One-Way) ── */}
        {isOneWay && paymentSuccessful && pnrsByJourney.onward && (
          <div className="md:col-span-2 flex justify-end">
            <button
              onClick={() => handleDownloadTicket("onward")}
              disabled={downloading === "onward"}
              className="flex items-center gap-2 px-6 py-3 bg-teal-600 text-white hover:bg-teal-700 rounded-xl text-sm font-bold transition-all duration-150 disabled:opacity-50 shadow-lg"
            >
              <FiDownload size={15} />
              {downloading === "onward" ? "Downloading…" : "Download Ticket"}
            </button>
          </div>
        )}

        <div className="md:col-span-2">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* ── 2. Passenger Details ── */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <CardLabel icon={FiUser} label="Passenger Details" />

                {travellers.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No traveller details available.
                  </p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {travellers.map((trav, idx) => (
                      <div
                        key={trav._id || idx}
                        className="rounded-xl border border-slate-200 bg-slate-50 hover:bg-white transition-all p-4 shadow-sm hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div>
                            <p className="text-base font-bold text-slate-900">
                              {trav.title} {trav.firstName} {trav.lastName}
                            </p>
                            {trav.email && (
                              <p className="text-xs text-slate-400 mt-0.5">
                                {trav.email}
                              </p>
                            )}
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 bg-teal-50 px-2.5 py-1 rounded-full">
                            {formatPaxType(trav.paxType)}
                          </span>
                        </div>

                        <div className="space-y-1">
                          {trav.phoneWithCode && (
                            <InfoRow label="Phone" value={trav.phoneWithCode} />
                          )}
                          <InfoRow label="Gender" value={trav.gender} />
                          <InfoRow
                            label="DOB"
                            value={
                              trav.dateOfBirth
                                ? formatDateWithYear(trav.dateOfBirth)
                                : "—"
                            }
                          />
                          <InfoRow
                            label="Nationality"
                            value={trav.nationality}
                          />
                          {trav.passportNumber && (
                            <InfoRow
                              label="Passport"
                              value={trav.passportNumber}
                              mono
                            />
                          )}
                          {trav.passportExpiry && (
                            <InfoRow
                              label="Expiry"
                              value={formatDateWithYear(trav.passportExpiry)}
                            />
                          )}
                          {typeof trav.linkedAdultIndex === "number" &&
                            trav.linkedAdultIndex >= 0 && (
                              <InfoRow
                                label="Linked Adult"
                                value={`Traveller ${trav.linkedAdultIndex + 1}`}
                              />
                            )}
                        </div>

                        {trav.isLeadPassenger && (
                          <div className="mt-3 flex items-center gap-2 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full w-fit">
                            <FiCheckCircle size={12} />
                            Lead passenger
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── 3. Booking Summary ── */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sticky top-20">
                <BookingSummaryCard booking={booking} displayPnr={displayPnr} />
              </div>
            </div>
          </div>
        </div>

        {/* ── 4. SSR Details ── */}
        <SSRSection
          ssrSnapshot={ssrSnapshot}
          travellers={travellers}
          segments={allSegments}
          isEmployee={isEmployee}
        />

        {/* ── 5. Fare Summary (role-gated) ── */}
        {!isEmployee && (
          <BentoCard>
            <CardLabel icon={FiCreditCard} label="Fare Summary" />
            <InfoRow label="Base Fare" value={`₹${baseFare}`} />
            <InfoRow label="Tax" value={`₹${tax}`} />
            {totalSeatPrice > 0 && (
              <InfoRow label="Seat Charges" value={`₹${totalSeatPrice}`} />
            )}
            {totalMealPrice > 0 && (
              <InfoRow label="Meal Charges" value={`₹${totalMealPrice}`} />
            )}
            {isRoundTrip && fareSnapshot && (
              <div className="mt-4 space-y-2 text-xs text-slate-500">
                <p className="font-semibold text-slate-700">Fare Breakdown</p>
                {fareSnapshot.onwardFare && (
                  <div className="flex justify-between">
                    <span>Onward (Base + Tax)</span>
                    <span>
                      ₹{Math.ceil(fareSnapshot.onwardFare.PublishedFare)}
                    </span>
                  </div>
                )}
                {fareSnapshot.returnFare && (
                  <div className="flex justify-between">
                    <span>Return (Base + Tax)</span>
                    <span>
                      ₹{Math.ceil(fareSnapshot.returnFare.PublishedFare)}
                    </span>
                  </div>
                )}
              </div>
            )}
            <InfoRow label="Currency" value={pricingSnap?.currency || "INR"} />
            <InfoRow
              label="Refundable"
              value={refundable ? "Yes" : "No"}
              accent={refundable}
            />
            {pricingSnap?.totalAmount != null && (
              <div className="mt-4 bg-gradient-to-r from-cyan-50 to-teal-50 rounded-xl px-4 py-4 flex justify-between items-center border border-teal-100">
                <span className="text-sm text-teal-700 font-semibold">
                  Total Paid Amount
                </span>
                <span className="text-2xl font-black text-slate-900">
                  ₹{pricingSnap.totalAmount}
                </span>
              </div>
            )}
          </BentoCard>
        )}

        {/* ── 6. Invoice Details (role-gated) ── */}
        <InvoiceSection bookingResult={bookingResult} isEmployee={isEmployee} />

        {/* ── 7. Payment & Booking Status ── */}
        <BentoCard className="md:col-span-2">
          <CardLabel icon={FiCreditCard} label="Payment & Booking Status" />
          <div className="grid grid-cols-3 gap-3">
            <div
              className={`rounded-xl p-4 flex flex-col gap-1.5 border ${paymentSuccessful ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100"}`}
            >
              <div className="flex items-center gap-2 mb-1">
                {paymentSuccessful ? (
                  <FiCheckCircle size={16} className="text-emerald-500" />
                ) : (
                  <FiAlertCircle size={16} className="text-amber-500" />
                )}
                <span
                  className={`text-[10px] font-black uppercase tracking-widest ${paymentSuccessful ? "text-emerald-600" : "text-amber-600"}`}
                >
                  Payment
                </span>
              </div>
              <p
                className={`text-lg font-black ${paymentSuccessful ? "text-emerald-800" : "text-amber-800"}`}
              >
                {paymentSuccessful ? "Successful" : "Pending"}
              </p>
            </div>

            <div
              className={`rounded-xl p-4 flex flex-col gap-1.5 border ${executionStatus === "ticketed" ? "bg-emerald-50 border-emerald-100" : executionStatus === "cancelled" ? "bg-red-50 border-red-100" : "bg-amber-50 border-amber-100"}`}
            >
              <div className="flex items-center gap-2 mb-1">
                {executionStatus === "ticketed" ? (
                  <FiCheckCircle size={16} className="text-emerald-500" />
                ) : executionStatus === "cancelled" ? (
                  <FiAlertCircle size={16} className="text-red-500" />
                ) : executionStatus === "on_hold" ? (
                  <FiAlertCircle size={16} className="text-amber-500" />
                ) : (
                  <FiRefreshCw
                    size={16}
                    className="text-amber-500 animate-spin"
                  />
                )}
                <span
                  className={`text-[10px] font-black uppercase tracking-widest ${executionStatus === "ticketed" ? "text-emerald-600" : executionStatus === "cancelled" ? "text-red-600" : "text-amber-600"}`}
                >
                  Ticket Status
                </span>
              </div>
              <p
                className={`text-lg font-black ${executionStatus === "ticketed" ? "text-emerald-800" : executionStatus === "cancelled" ? "text-red-800" : "text-amber-800"}`}
              >
                {executionStatus === "ticketed"
                  ? "Issued"
                  : executionStatus === "cancelled"
                    ? "Cancelled"
                    : executionStatus === "on_hold"
                      ? "On Hold"
                      : "Issuing…"}
              </p>
              {executionStatus === "ticket_pending" && (
                <p className="text-[11px] text-amber-500">
                  Refreshes every 15s
                </p>
              )}
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col gap-1.5">
              <div className="flex items-center gap-2 mb-1">
                <FiBriefcase size={16} className="text-slate-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Purpose
                </span>
              </div>
              <p className="text-lg font-black text-slate-800">
                {booking.purposeOfTravel || "—"}
              </p>
            </div>

            {["ticket_pending", "on_hold"].includes(executionStatus) && (
              <div className="col-span-3 mt-3 flex justify-end">
                <button
                  onClick={async () => {
                    try {
                      await dispatch(manualTicketNonLcc(booking._id));
                      Swal.fire({
                        icon: "info",
                        title: "Retrying Ticket",
                        text: "We are attempting ticket issuance again...",
                        timer: 2000,
                        showConfirmButton: false,
                      });
                    } catch {
                      Swal.fire({
                        icon: "error",
                        title: "Retry Failed",
                        text: "Please try again later",
                      });
                    }
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl text-sm font-bold"
                >
                  <FiRefreshCw size={14} />
                  Retry Ticket
                </button>
              </div>
            )}
          </div>
        </BentoCard>

        {/* ── 8. Fare Rules (collapsible) ── */}
        <FareRulesSection bookingResult={bookingResult} />

        {/* ── 9. Amendment Actions ── */}
        {paymentSuccessful &&
          executionStatus === "ticketed" &&
          !isTravelPassed && (
            <div className="md:col-span-2 rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-sm">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/60">
                <span className="w-8 h-8 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                  <FiAlertCircle size={14} className="text-red-600" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 leading-none">
                    Amendment actions
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Ticket is live — changes apply immediately
                  </p>
                </div>

                <div className="flex items-center gap-2.5 px-5 py-4">
                  <button
                    onClick={() => setShowCancellationModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 hover:border-red-300 rounded-xl text-sm font-semibold transition-all"
                  >
                    <FiXCircle size={14} className="text-red-500" />
                    Cancellation Charges
                  </button>
                </div>
              </div>

              <p className="px-5 pb-4 text-[11px] text-slate-400">
                Charges may apply as per fare rules. Cancellation cannot be
                undone.
              </p>
            </div>
          )}
      </main>

      {/* ── Modals ── */}
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

      {/* ★ NEW Cancellation Charges Modal ── */}
      {showCancellationModal && (
        <CancellationModal
          booking={booking}
          onClose={() => {
            setShowCancellationModal(false);
            dispatch(resetAmendmentState());
          }}
          onSuccess={() => {
            setShowCancellationModal(false);
          }}
        />
      )}
    </div>
  );
}
