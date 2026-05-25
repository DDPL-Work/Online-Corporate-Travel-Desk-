import React from "react";
import {
  FiCheckCircle,
  FiClock,
  FiDownload,
  FiEye,
  FiFileText,
  FiRepeat,
  FiUser,
  FiX,
  FiXCircle,
  FiArrowRight,
  FiInfo,
  FiActivity,
} from "react-icons/fi";
import {
  getRequestId,
  getPnr,
  getUserName,
  getUserEmail,
  getCorporateName,
  getStatusTone,
  getRequestedDate,
  getStatus,
  resolvePayload,
  resolveAirline,
  resolveDeparture,
  resolveArrival,
  resolveDuration,
  resolveJourneyType,
  resolveCabinClass,
  resolveTotalFare,
  resolveOldFare,
  resolveNewFare,
  resolveFareDifference,
  resolveRefund,
  resolveReissueCharge,
  resolveBookingRef,
  resolvePrimarySegment,
  resolveFinancialBreakdown,
  resolveDisplayRoute,
  resolveWorkflowType,
} from "../../../utils/reissueResolvers";

/* ─────────────────────────────────────────────────────────────────
   FORMATTERS
   ───────────────────────────────────────────────────────────────── */
const formatCurrency = (val, currency = "INR") => {
  if (!val && val !== 0) return "N/A";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 0,
  }).format(Number(val) || 0);
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

/* ─────────────────────────────────────────────────────────────────
   LABEL VALUE CELL
   ───────────────────────────────────────────────────────────────── */
function LV({ label, value, mono = false }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
        {label}
      </p>
      <p
        className={`mt-1 text-sm font-semibold ${mono ? "font-mono" : ""} text-slate-800 break-words`}
      >
        {value || "N/A"}
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   ENTERPRISE REISSUE CONTROL PANEL
   ───────────────────────────────────────────────────────────────── */
export default function LegacyReissueDetailModal({
  request: requestData,
  onClose,
  onStatusUpdate,
}) {
  if (!requestData) return null;

  const req = resolvePayload(requestData);

  const uid = getRequestId(req);
  const pnr = getPnr(req);
  // Booking ref — metadata.orderId is the most reliable source for offline reissues
  const ref = resolveBookingRef(req);

  // Employee name — check metadata.employeeName if user/employee objects are empty
  const empName =
    req?.requesterDetails?.name ||
    req?.employee?.name ||
    req?.user?.name ||
    req?.metadata?.employeeName ||
    req?.corporate?.employeeName ||
    getUserName(req);
  const email = getUserEmail(req);
  const corporateName = getCorporateName(req);
  const reason =
    req.reason ||
    req.remarks ||
    req.resolutionNote ||
    req.metadata?.reason ||
    "No reason provided";
  const type = resolveWorkflowType(req);
  const date = getRequestedDate(req);
  const status = getStatus(req);
  const tone = getStatusTone(status);

  const bookingInfo = {
    journeyType: resolveJourneyType(req),
    airline: resolveAirline(req),
    flightNumber:
      req?.displayInfo?.flightNumber ||
      resolvePrimarySegment(req)?.flightNumber ||
      req?.selectedFlight?.flightNumber ||
      req?.bookingSnapshot?.flightNumber ||
      req?.preferredJourney?.flightNumber ||
      "N/A",

    route: (() => {
      if (req?.displayInfo?.route) return req.displayInfo.route;
      const seg = resolvePrimarySegment(req);
      const lastSeg =
        (Array.isArray(req?.selectedSegments) && req.selectedSegments.length > 0
          ? req.selectedSegments[req.selectedSegments.length - 1]
          : null) ||
        (Array.isArray(req?.segments) && req.segments.length > 0
          ? req.segments[req.segments.length - 1]
          : null) ||
        seg;
      const o = seg?.origin || req?.preferredJourney?.origin || req?.origin;
      const d =
        lastSeg?.destination ||
        req?.preferredJourney?.destination ||
        req?.destination;
      if (o && d) return `${o} → ${d}`;
      if (req?.metadata?.selectedRoute)
        return req.metadata.selectedRoute.replace(/-/g, " → ");
      return "N/A";
    })(),

    departure: resolveDeparture(req),
    arrival: resolveArrival(req),
    duration: resolveDuration(req),
    stops:
      req?.displayInfo?.stops ??
      resolvePrimarySegment(req)?.stops ??
      req?.preferredJourney?.stops ??
      req?.selectedFlight?.stops ??
      0,
    cabin: resolveCabinClass(req),

    fare: resolveNewFare(req),
    oldFare: resolveOldFare(req),
    fareDifference: resolveFareDifference(req),
    reissueCharge: resolveReissueCharge(req),
    refund: resolveRefund(req),
    totalEstimate: resolveTotalFare(req),

    currency:
      req?.displayInfo?.currency ||
      req?.currency ||
      req?.reissuePricingSnapshot?.currency ||
      req?.preferredJourney?.currency ||
      "INR",
  };
  bookingInfo.route = resolveDisplayRoute(req);
  const financialBreakdown = resolveFinancialBreakdown(req);

  // Safe Arrays
  const passengers = Array.isArray(req.passengers) ? req.passengers : [];
  const segments = Array.isArray(req.selectedSegments)
    ? req.selectedSegments
    : Array.isArray(req.segments)
      ? req.segments
      : [];
  const timeline = Array.isArray(req.timeline)
    ? [...req.timeline].sort((a, b) => new Date(b.at) - new Date(a.at))
    : Array.isArray(req.logs)
      ? [...req.logs].reverse()
      : [];

  // Reissue History Extraction
  const oldFlight = req.reissueHistory?.[0]?.oldFlight?.[0];
  const newFlight = req.reissueHistory?.[0]?.newFlight?.[0];

  // Ticket URL
  const ticketUrl =
    req?.revisedTicketUrl ||
    req?.generatedTicketUrl ||
    req?.downloadEndpoints?.ticket ||
    req?.timeline?.find((t) => t?.metadata?.generatedTicketUrl)?.metadata
      ?.generatedTicketUrl ||
    req?.reissueHistory?.[0]?.pdfUrl ||
    null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="max-h-[96vh] w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 shrink-0 bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0A4D68] to-[#088395] text-white shadow-sm">
              <FiRepeat size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Reissue Control Panel
              </h2>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5 font-mono">
                ID: {uid}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span
              className={`px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest border ${tone} shadow-sm`}
            >
              {status}
            </span>
            <button
              onClick={onClose}
              className="h-10 w-10 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition shadow-sm"
            >
              <FiX size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-6 space-y-6 bg-slate-50/30">
          {/* Core Info & Employee Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-3">
              <LV label="PNR" value={pnr} mono />
              <LV label="Booking Ref" value={ref} mono />
              <LV label="Type" value={type} />
              <LV label="Requested" value={date} />
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-[#0A4D68]/10 text-[#0A4D68] flex items-center justify-center font-black text-lg shrink-0">
                {empName[0]?.toUpperCase() || <FiUser size={20} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-0.5">
                  Employee
                </p>
                <p className="font-bold text-slate-800 truncate">{empName}</p>
                <p className="text-xs text-slate-500 truncate">{email}</p>
                {corporateName && corporateName !== "N/A" && (
                  <p className="text-[10px] font-extrabold text-[#088395] uppercase tracking-wider mt-1 truncate">
                    {corporateName}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
              <FiInfo size={14} /> Reason for Request
            </p>
            <p className="text-sm text-slate-700 leading-relaxed font-medium">
              {reason}
            </p>
          </div>

          {/* SECTION: FLIGHT DETAILS */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-4">
              Flight Details
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-6">
              <div>
                <p className="text-xs text-slate-400">Airline</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">
                  {bookingInfo.airline}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Route</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">
                  {bookingInfo.route}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Journey Type</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">
                  {bookingInfo.journeyType}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Stops</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">
                  {bookingInfo.stops}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Departure</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">
                  {formatDateTime(bookingInfo.departure)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Arrival</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">
                  {formatDateTime(bookingInfo.arrival)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Duration</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">
                  {bookingInfo.duration}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Cabin</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">
                  {bookingInfo.cabin}
                </p>
              </div>
            </div>
          </div>

          {/* SECTION: ORIGINAL FLIGHT vs REISSUED FLIGHT */}
          {oldFlight && newFlight && (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-4 text-center">
                  Original Flight
                </p>
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="text-xs font-semibold text-slate-500">
                      Route
                    </span>
                    <span className="text-sm font-bold text-slate-800">
                      {oldFlight.origin?.airportCode || oldFlight.origin} →{" "}
                      {oldFlight.destination?.airportCode ||
                        oldFlight.destination}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="text-xs font-semibold text-slate-500">
                      Flight No
                    </span>
                    <span className="text-sm font-bold text-slate-800">
                      {oldFlight.airlineCode || oldFlight.airline}{" "}
                      {oldFlight.flightNumber}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="text-xs font-semibold text-slate-500">
                      Departure
                    </span>
                    <span className="text-sm font-bold text-slate-800">
                      {formatDateTime(oldFlight.departureTime)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-500">
                      Arrival
                    </span>
                    <span className="text-sm font-bold text-slate-800">
                      {formatDateTime(oldFlight.arrivalTime)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-blue-200 bg-blue-50/30 p-5 shadow-sm">
                <p className="text-[11px] font-black uppercase tracking-widest text-blue-600 mb-4 text-center">
                  Reissued Flight
                </p>
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-blue-100">
                    <span className="text-xs font-semibold text-blue-700">
                      Route
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      {newFlight.origin?.airportCode || newFlight.origin} →{" "}
                      {newFlight.destination?.airportCode ||
                        newFlight.destination}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-blue-100">
                    <span className="text-xs font-semibold text-blue-700">
                      Flight No
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      {newFlight.airlineName || newFlight.airlineCode}{" "}
                      {newFlight.flightNumber}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-blue-100">
                    <span className="text-xs font-semibold text-blue-700">
                      Departure
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      {formatDateTime(newFlight.departureTime)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-blue-700">
                      Arrival
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      {formatDateTime(newFlight.arrivalTime)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION: PRICING BREAKDOWN */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-4">
              Pricing Breakdown
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <p className="text-[10px] uppercase font-bold text-slate-400">
                  Previously Paid
                </p>
                <p className="text-sm font-black text-slate-700 mt-1">
                  {formatCurrency(financialBreakdown.previouslyPaid, financialBreakdown.currency)}
                </p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <p className="text-[10px] uppercase font-bold text-slate-400">
                  New Flight
                </p>
                <p className="text-sm font-black text-slate-700 mt-1">
                  {formatCurrency(financialBreakdown.newFlight, financialBreakdown.currency)}
                </p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <p className="text-[10px] uppercase font-bold text-slate-400">
                  New SSR
                </p>
                <p className="text-sm font-black text-slate-700 mt-1">
                  {formatCurrency(financialBreakdown.newSSR, financialBreakdown.currency)}
                </p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <p className="text-[10px] uppercase font-bold text-slate-400">
                  SSR Refund
                </p>
                <p className="text-sm font-black text-slate-700 mt-1">
                  {formatCurrency(financialBreakdown.ssrRefund, financialBreakdown.currency)}
                </p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <p className="text-[10px] uppercase font-bold text-slate-400">
                  Reissue Penalty
                </p>
                <p className="text-sm font-black text-slate-700 mt-1">
                  {formatCurrency(financialBreakdown.reissuePenalty, financialBreakdown.currency)}
                </p>
              </div>
              <div className={`rounded-xl p-3 border ${
                financialBreakdown.netRefund > 0
                  ? "bg-emerald-50 border-emerald-200"
                  : "bg-rose-50 border-rose-200"
              }`}>
                <p className={`text-[10px] uppercase font-bold ${
                  financialBreakdown.netRefund > 0 ? "text-emerald-700" : "text-rose-700"
                }`}>
                  {financialBreakdown.netRefund > 0 ? "Net Refund" : "Net Collection"}
                </p>
                <p className={`text-sm font-black mt-1 ${
                  financialBreakdown.netRefund > 0 ? "text-emerald-800" : "text-rose-800"
                }`}>
                  {formatCurrency(
                    financialBreakdown.netRefund > 0
                      ? financialBreakdown.netRefund
                      : financialBreakdown.netCollection,
                    financialBreakdown.currency,
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* CUMULATIVE FINANCIAL LEDGER */}
          {req.financialLedger && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <p className="text-[11px] font-black uppercase tracking-widest text-[#0A4D68] flex items-center gap-2">
                <FiFileText size={14} /> Cumulative Financial Ledger
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Column 1: Original Cost Structure */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b pb-1.5">
                    Original Booking Cost Structure
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <p className="text-slate-400 font-medium">Ticket Base Fare</p>
                      <p className="font-bold text-slate-800 mt-0.5">
                        {formatCurrency(req.financialLedger.originalBaseFare, bookingInfo.currency)}
                      </p>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <p className="text-slate-400 font-medium">Ticket Taxes</p>
                      <p className="font-bold text-slate-800 mt-0.5">
                        {formatCurrency(req.financialLedger.originalTaxes, bookingInfo.currency)}
                      </p>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <p className="text-slate-400 font-medium">Original Seats SSR</p>
                      <p className="font-bold text-slate-800 mt-0.5">
                        {formatCurrency(req.financialLedger.originalSeatSSR, bookingInfo.currency)}
                      </p>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <p className="text-slate-400 font-medium">Original Meals SSR</p>
                      <p className="font-bold text-slate-800 mt-0.5">
                        {formatCurrency(req.financialLedger.originalMealSSR, bookingInfo.currency)}
                      </p>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <p className="text-slate-400 font-medium">Original Baggage SSR</p>
                      <p className="font-bold text-slate-800 mt-0.5">
                        {formatCurrency(req.financialLedger.originalBaggageSSR, bookingInfo.currency)}
                      </p>
                    </div>
                    <div className="bg-indigo-50 p-2.5 rounded-lg border border-indigo-100">
                      <p className="text-indigo-600 font-black">Original Total Paid</p>
                      <p className="font-black text-indigo-900 mt-0.5">
                        {formatCurrency((req.financialLedger.originalTicketAmount || 0) + (req.financialLedger.originalSSR || 0), bookingInfo.currency)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Column 2: Cumulative Modification Totals */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b pb-1.5">
                    Cumulative Modification Totals
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <p className="text-slate-400 font-medium">Total Airline Penalties</p>
                      <p className="font-bold text-slate-800 mt-0.5">
                        {formatCurrency(req.financialLedger.cumulativeReissueCharges, bookingInfo.currency)}
                      </p>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <p className="text-slate-400 font-medium">Total New SSR Cost</p>
                      <p className="font-bold text-slate-800 mt-0.5">
                        {formatCurrency(req.financialLedger.cumulativeSSR, bookingInfo.currency)}
                      </p>
                    </div>
                    <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-100">
                      <p className="text-amber-600 font-bold">Total Additional Collections</p>
                      <p className="font-bold text-amber-800 mt-0.5">
                        {formatCurrency(req.financialLedger.cumulativeCollections, bookingInfo.currency)}
                      </p>
                    </div>
                    <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-100">
                      <p className="text-emerald-600 font-bold">Total Refunds Issued</p>
                      <p className="font-bold text-emerald-800 mt-0.5">
                        {formatCurrency(req.financialLedger.cumulativeRefunds, bookingInfo.currency)}
                      </p>
                    </div>
                    <div className="bg-blue-50 p-2.5 rounded-lg border border-blue-100 col-span-2">
                      <div className="flex justify-between items-center">
                        <p className="text-blue-700 font-black">Net Paid To Date</p>
                        <p className="font-black text-blue-900 text-sm">
                          {formatCurrency(req.financialLedger.totalNetPaid, bookingInfo.currency)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* REISSUE CYCLE HISTORY */}
          {Array.isArray(req.pricingHistory) && req.pricingHistory.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <p className="text-[11px] font-black uppercase tracking-widest text-[#0A4D68] flex items-center gap-2">
                <FiClock size={14} /> Reissue Lifecycle & Pricing History
              </p>
              
              <div className="space-y-4">
                {req.pricingHistory.map((cycle, idx) => (
                  <div key={idx} className="border border-slate-100 rounded-xl overflow-hidden shadow-sm bg-slate-50/50">
                    <div className="bg-slate-100/70 px-4 py-3 flex justify-between items-center border-b border-slate-200/50">
                      <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                        Reissue Cycle {cycle.cycle || idx + 1}
                      </span>
                      <span className="text-xs text-slate-400 font-semibold font-mono">
                        {formatDateTime(cycle.createdAt)}
                      </span>
                    </div>

                    <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Left: Flight Details snapshot */}
                      <div className="space-y-2 text-xs">
                        <p className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                          Flight Costs Snapshot
                        </p>
                        <div className="space-y-1.5">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Base Fare:</span>
                            <span className="font-semibold text-slate-700">{formatCurrency(cycle.newBaseFare, bookingInfo.currency)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Taxes & Fees:</span>
                            <span className="font-semibold text-slate-700">{formatCurrency(cycle.newTaxes, bookingInfo.currency)}</span>
                          </div>
                          <div className="flex justify-between border-t pt-1.5 mt-1.5 font-bold">
                            <span className="text-slate-500">Flight Total:</span>
                            <span className="text-slate-800">{formatCurrency(cycle.newFare, bookingInfo.currency)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Middle: SSR Reconciliation details */}
                      <div className="space-y-2 text-xs">
                        <p className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                          SSR Delta Reconciliation
                        </p>
                        <div className="space-y-1.5">
                          <div className="flex justify-between">
                            <span className="text-slate-400">New SSR Total:</span>
                            <span className="font-semibold text-slate-700">{formatCurrency(cycle.newSSR, bookingInfo.currency)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Reusable SSR Value:</span>
                            <span className="font-semibold text-emerald-600">-{formatCurrency(cycle.reusableSSRValue, bookingInfo.currency)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Refundable SSR Value:</span>
                            <span className="font-semibold text-blue-600">{formatCurrency(cycle.refundSSRValue, bookingInfo.currency)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Additional SSR Charge:</span>
                            <span className="font-semibold text-amber-600">+{formatCurrency(cycle.additionalSSRValue, bookingInfo.currency)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Net Settlement (airline-grade breakdown) */}
                      <div className="space-y-2 text-xs bg-[#0A4D68]/5 p-3 rounded-lg border border-[#0A4D68]/10 col-span-1 md:col-span-1">
                        <p className="font-bold text-[#0A4D68] uppercase tracking-wider text-[10px]">
                          Net Settlement
                        </p>

                        {/* Section 1: Original Ticket Value */}
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 pt-1">
                          Original Ticket Value
                        </p>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Previously Paid:</span>
                          <span className="font-semibold text-slate-700">
                            {formatCurrency(cycle.previousTotalPaid ?? cycle.alreadyPaid, bookingInfo.currency)}
                          </span>
                        </div>

                        {/* Section 2: New Itinerary Cost */}
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 pt-1">
                          New Itinerary Cost
                        </p>
                        <div className="flex justify-between">
                          <span className="text-slate-500">New Flight Fare:</span>
                          <span className="font-semibold text-slate-700">
                            {formatCurrency(cycle.newFare, bookingInfo.currency)}
                          </span>
                        </div>
                        {Number(cycle.newSSR || 0) > 0 && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">New SSR Total:</span>
                            <span className="font-semibold text-slate-700">
                              {formatCurrency(cycle.newSSR, bookingInfo.currency)}
                            </span>
                          </div>
                        )}

                        {/* Section 3: Reissue Adjustments */}
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 pt-1">
                          Reissue Adjustments
                        </p>
                        {(() => {
                          const prevPaid = Number(cycle.previousTotalPaid ?? cycle.alreadyPaid ?? 0);
                          const newFare  = Number(cycle.newFare ?? 0);
                          const adj = cycle.flightAdjustment != null
                            ? Number(cycle.flightAdjustment)
                            : newFare - prevPaid;
                          const isNeg = adj < 0;
                          return (
                            <div className="flex justify-between">
                              <span className="text-slate-500">Flight Fare Adj:</span>
                              <span className={`font-semibold ${isNeg ? "text-rose-600" : "text-emerald-700"}`}>
                                {isNeg ? "−" : "+"}{formatCurrency(Math.abs(adj), bookingInfo.currency)}
                              </span>
                            </div>
                          );
                        })()}
                        <div className="flex justify-between">
                          <span className="text-slate-500">Airline Reissue Penalty:</span>
                          <span className="font-semibold text-slate-700">
                            +{formatCurrency(cycle.reissueCharge ?? cycle.airlinePenalty, bookingInfo.currency)}
                          </span>
                        </div>

                        {/* Section 4: Final Settlement */}
                        <div className="border-t border-slate-300 pt-1.5 mt-1.5 space-y-0.5">
                          {Number(cycle.additionalCollection || 0) > 0 && (
                            <div className="flex justify-between font-bold">
                              <span className="text-slate-600">Net Additional Collection:</span>
                              <span className="text-amber-700">
                                +{formatCurrency(cycle.additionalCollection, bookingInfo.currency)}
                              </span>
                            </div>
                          )}
                          {Number(cycle.refundAmount || 0) > 0 && (
                            <div className="flex justify-between font-bold">
                              <span className="text-slate-600">Refund Due:</span>
                              <span className="text-emerald-700">
                                −{formatCurrency(cycle.refundAmount, bookingInfo.currency)}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between font-black text-sm text-[#0A4D68] pt-0.5 border-t border-slate-200">
                            <span>Final Net Paid:</span>
                            <span>{formatCurrency(cycle.totalPaidAfterCycle, bookingInfo.currency)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TWO COLUMN: OPS ASSIGNMENT & SLA */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-4">
                OPS Assignment
              </p>
              {req.assignedOpsMember ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                      {req.assignedOpsMember.name?.[0] || "O"}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        {req.assignedOpsMember.name || "Assigned"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {req.assignedOpsMember.email}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">
                        Department
                      </p>
                      <p className="text-xs font-semibold text-slate-700">
                        {req.assignedOpsMember.department || "Operations"}
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">
                        Assigned At
                      </p>
                      <p className="text-xs font-semibold text-slate-700">
                        {formatDateTime(req.assignedAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-24 flex items-center justify-center border border-dashed border-slate-200 rounded-xl bg-slate-50">
                  <p className="text-xs font-semibold text-slate-400">
                    Not yet assigned to OPS
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-4">
                SLA & Processing
              </p>
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <span className="text-xs font-semibold text-slate-500">
                    SLA Deadline
                  </span>
                  <span className="text-sm font-bold text-slate-800">
                    {req.slaDeadline ? formatDateTime(req.slaDeadline) : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <span className="text-xs font-semibold text-slate-500">
                    First Response
                  </span>
                  <span className="text-sm font-bold text-slate-800">
                    {req.firstResponseAt
                      ? formatDateTime(req.firstResponseAt)
                      : "Pending"}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <span className="text-xs font-semibold text-slate-500">
                    SLA Status
                  </span>
                  {req.breached ? (
                    <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded text-xs font-bold">
                      Breached
                    </span>
                  ) : req.overdue ? (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-bold">
                      Overdue
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-bold">
                      On Track
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-500">
                    Expected Timeline
                  </span>
                  <span className="text-sm font-bold text-slate-800">
                    {req.metadata?.expectedProcessingTimeline || "Standard"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION: TICKET INFORMATION */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-4">
              Ticket Information
            </p>
            {ticketUrl ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-widest text-emerald-600 mb-1 flex items-center gap-2">
                      <FiCheckCircle size={12} /> Ticket Generated
                    </p>
                    <p className="text-sm text-emerald-800 font-medium">
                      Your revised itinerary is ready for download.
                    </p>
                  </div>
                  <div className="flex gap-3 w-full md:w-auto">
                    <button
                      onClick={() =>
                        window.open(ticketUrl, "_blank", "noopener,noreferrer")
                      }
                      className="flex-1 md:flex-none inline-flex justify-center items-center gap-2 px-4 py-2.5 bg-white border border-emerald-200 rounded-xl text-sm font-bold text-emerald-700 hover:bg-emerald-50 transition shadow-sm"
                    >
                      <FiEye size={16} /> View Ticket
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const response = await fetch(ticketUrl);
                          const blob = await response.blob();
                          const blobUrl = window.URL.createObjectURL(blob);
                          const link = document.createElement("a");
                          link.href = blobUrl;
                          link.download = `reissue-ticket-${uid}.pdf`;
                          document.body.appendChild(link);
                          link.click();
                          link.remove();
                          window.URL.revokeObjectURL(blobUrl);
                        } catch (error) {
                          console.error("Failed to download ticket:", error);
                          window.open(ticketUrl, "_blank");
                        }
                      }}
                      className="flex-1 md:flex-none inline-flex justify-center items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition shadow-sm"
                    >
                      <FiDownload size={16} /> Download
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 flex flex-col items-center justify-center text-center">
                <FiFileText size={24} className="text-slate-300 mb-2" />
                <p className="text-sm text-slate-500 font-semibold">
                  Ticket Not Yet Generated
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  The revised ticket will be available here once processing is
                  complete.
                </p>
              </div>
            )}
          </div>

          {/* SECTION: RAW SEGMENTS & PASSENGERS */}
          <div className="grid md:grid-cols-2 gap-4">
            {segments.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-3">
                  Requested Segments
                </p>
                <div className="space-y-3">
                  {segments.map((s, i) => (
                    <div
                      key={i}
                      className="rounded-xl bg-slate-50 border border-slate-100 p-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-bold text-slate-900">
                          {s.origin || s.Origin || "?"} →{" "}
                          {s.destination || s.Destination || "?"}
                        </p>
                        <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-[10px] font-bold rounded">
                          Seg {i + 1}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-slate-500 font-medium">
                        <span>
                          {s.airlineName || s.airline || "Airline"}{" "}
                          {s.flightNumber ? s.flightNumber : ""}
                        </span>
                        <span>{s.duration ? `${s.duration}m` : ""}</span>
                      </div>
                      {(s.departureTime || s.arrivalTime) && (
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200/60">
                          <p className="text-[11px] text-slate-500 font-semibold">
                            {formatDateTime(s.departureTime)}
                          </p>
                          <FiArrowRight size={10} className="text-slate-300" />
                          <p className="text-[11px] text-slate-500 font-semibold">
                            {formatDateTime(s.arrivalTime)}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {passengers.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-3">
                  Passengers
                </p>
                <div className="space-y-2">
                  {passengers.map((p, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center">
                          <FiUser size={14} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">
                            {p.name || `Passenger ${i + 1}`}
                          </p>
                          <p className="text-[10px] uppercase font-bold text-slate-400">
                            {p.type || "Adult"}
                          </p>
                        </div>
                      </div>
                      {p.ticketNumber && (
                        <span className="text-[11px] font-mono font-bold text-slate-500 px-2 py-1 bg-white rounded border border-slate-200">
                          {p.ticketNumber}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SECTION: TIMELINE */}
          {timeline.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-5 flex items-center gap-2">
                <FiActivity size={14} /> Audit Timeline
              </p>
              <div className="relative pl-4 border-l border-slate-200 space-y-6 pb-2">
                {timeline.map((item, i) => (
                  <div key={i} className="relative">
                    <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#0A4D68] ring-4 ring-slate-50" />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-800">
                          {item.action || item.title || item.status || "Event"}
                        </p>
                        {item.status && (
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-black uppercase rounded border border-slate-200">
                            {item.status}
                          </span>
                        )}
                      </div>
                      {(item.message || item.description) && (
                        <p className="text-sm text-slate-600 mt-1">
                          {item.message || item.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        <p className="text-xs font-semibold text-slate-400">
                          {formatDateTime(item.at || item.timestamp)}
                        </p>
                        {(item.by || item.actorRole || item.actionBy) && (
                          <>
                            <span className="text-slate-300">•</span>
                            <p className="text-xs font-semibold text-slate-500">
                              By{" "}
                              {item.by ||
                                item.actionByName ||
                                item.actionBy ||
                                item.actorRole}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Admin Actions */}
          {status === "PENDING" && onStatusUpdate && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
              <div>
                <p className="text-sm font-bold text-slate-800">
                  Pending Decision
                </p>
                <p className="text-xs text-slate-500">
                  This request is awaiting your approval to proceed.
                </p>
              </div>
              <div className="flex gap-3 shrink-0 w-full sm:w-auto">
                <button
                  onClick={() => {
                    onStatusUpdate(
                      req._id || req.id || req.requestId,
                      "APPROVED",
                    );
                    onClose();
                  }}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-black hover:bg-emerald-700 transition flex items-center justify-center gap-2 shadow-sm"
                >
                  <FiCheckCircle size={16} /> Approve
                </button>
                <button
                  onClick={() => {
                    onStatusUpdate(
                      req._id || req.id || req.requestId,
                      "REJECTED",
                    );
                    onClose();
                  }}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-white border border-rose-200 text-rose-600 rounded-xl text-sm font-black hover:bg-rose-50 transition flex items-center justify-center gap-2 shadow-sm"
                >
                  <FiXCircle size={16} /> Reject
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
