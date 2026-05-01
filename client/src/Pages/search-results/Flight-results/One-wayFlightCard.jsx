//src/Pages/search-results/Flight-results/One-wayFlightCard.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MdAirlineSeatReclineNormal, MdOutlineFlight } from "react-icons/md";
import { useDispatch } from "react-redux";
import {
  airlineLogo,
  FLIGHT_STATUS_MAP,
  formatDate,
  formatTime,
} from "../../../utils/formatter";
import { getFareUpsell } from "../../../Redux/Actions/flight.thunks";
import { BsSuitcase } from "react-icons/bs";
import { BiSolidOffer } from "react-icons/bi";
import { FaChevronDown, FaChevronUp, FaPlane } from "react-icons/fa";

const toFiniteNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const buildFallbackFareOptions = (flightInfo) => {
  if (!flightInfo) return [];

  const segment = flightInfo?.Segments?.[0]?.[0];
  const supplierFareClass =
    `${segment?.SupplierFareClass || ""}`.trim() || "Standard";
  const publishedFare = toFiniteNumber(
    flightInfo?.Fare?.PublishedFare ?? flightInfo?.Fare?.OfferedFare,
    0,
  );

  return [
    {
      supplierFareClass,
      publishedFare,
      resultIndex: flightInfo?.ResultIndex,
    },
  ];
};

const normalizeFareOptions = (fareOptions, fallbackFlightInfo) => {
  const sourceOptions =
    Array.isArray(fareOptions) && fareOptions.length
      ? fareOptions
      : buildFallbackFareOptions(fallbackFlightInfo);

  const optionsByClass = new Map();

  sourceOptions.forEach((option) => {
    const supplierFareClass =
      `${option?.supplierFareClass || ""}`.trim() || "Standard";
    const fareClassKey = supplierFareClass.toLowerCase();
    const publishedFare = toFiniteNumber(
      option?.publishedFare ??
        fallbackFlightInfo?.Fare?.PublishedFare ??
        fallbackFlightInfo?.Fare?.OfferedFare,
      0,
    );
    const resultIndex = option?.resultIndex ?? fallbackFlightInfo?.ResultIndex;

    const existing = optionsByClass.get(fareClassKey);
    if (!existing || publishedFare < existing.publishedFare) {
      optionsByClass.set(fareClassKey, {
        supplierFareClass,
        publishedFare,
        resultIndex,
      });
    }
  });

  return Array.from(optionsByClass.values()).sort(
    (a, b) => a.publishedFare - b.publishedFare,
  );
};


// ─── Flight Details Dropdown ────────────────────────────────────────────────

function getCancellationPolicy(selectedFlight, apiRules) {
  const rulesSource = Array.isArray(apiRules)
    ? apiRules
    : Array.isArray(selectedFlight?.MiniFareRules?.[0])
      ? selectedFlight.MiniFareRules[0]
      : [];

  const cancellationRules = rulesSource
    .filter((rule) => rule && rule.Type === "Cancellation" && rule.Details)
    .map((rule) => ({
      From: rule.From ?? "",
      To: rule.To ?? "",
      Unit: rule.Unit ?? "",
      Details: String(rule.Details ?? "").trim(),
      Type: rule.Type ?? "Cancellation",
    }))
    .filter((rule) => rule.Details.length > 0);

  const isRefundable = selectedFlight?.IsRefundable === true;

  if (cancellationRules.length > 0) {
    return { cancellationRules, cancellationMessage: "" };
  }

  return {
    cancellationRules: [],
    cancellationMessage: isRefundable
      ? "Cancellation policy is currently unavailable from the airline. Final charges will be shown during booking or by the airline directly."
      : "This ticket is non-refundable as per airline policy.",
  };
}

export function FlightDetailsDropdown({ selectedFlight, selectedFare }) {
  const [activeTab, setActiveTab] = useState("flight");

  const segmentsArrays = selectedFlight?.Segments || [];
  const fare = selectedFlight?.Fare;
  const fareBreakdown = selectedFlight?.FareBreakdown?.[0];
  const miniFareRules = selectedFlight?.MiniFareRules?.[0] || [];
  const fareInclusions = selectedFlight?.FareInclusionsNew || [];

  if (segmentsArrays.length === 0) return null;

  const baseFare = toFiniteNumber(fare?.BaseFare, 0);
  const tax = toFiniteNumber(fare?.Tax, 0);
  const otherCharges = toFiniteNumber(fare?.OtherCharges, 0);
  const publishedFare = Math.ceil(toFiniteNumber(fare?.PublishedFare, 0));
  const offeredFare = Math.ceil(toFiniteNumber(fare?.OfferedFare, 0));

  const tabs = [
    { id: "flight", label: "Flight Details" },
    { id: "fare", label: "Fare Summary" },
    { id: "rules", label: "Fare Rules" },
  ];

  const { cancellationRules, cancellationMessage } = getCancellationPolicy(
    selectedFlight,
    miniFareRules,
  );
  const isCancellationFallback = cancellationRules.length === 0;

  let reissueRules = miniFareRules.filter((r) => r.Type === "Reissue");
  const isReissueFallback = reissueRules.length === 0;

  if (isReissueFallback) {
    const isChangeable = !selectedFlight?.FareInclusions?.some((v) =>
      String(v ?? "").toLowerCase().includes("non-changeable"),
    );
    if (isChangeable) {
      reissueRules = [
        { From: "0", To: "72", Unit: "Hours", Details: "Approx. ₹3,250 + Fare Diff.", Type: "Reissue" },
        { From: "72", To: "Any", Unit: "Hours", Details: "Approx. ₹2,750 + Fare Diff.", Type: "Reissue" },
      ];
    } else {
      reissueRules = [
        { From: "0", To: "Any", Unit: "Hours", Details: "Fixed Dates / Non-Changeable", Type: "Reissue" },
      ];
    }
  }

  return (
    <div className="border-t border-slate-100 bg-white/80">
      {/* Tabs */}
      <div className="flex border-b border-slate-100 bg-white">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-3 text-xs font-bold transition-colors border-b-2 uppercase tracking-wider ${
              activeTab === tab.id
                ? "border-[#C9A84C] text-[#C9A84C] bg-slate-50"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Flight Details Tab ── */}
      {activeTab === "flight" && (
        <div className="divide-y divide-slate-100">
          {segmentsArrays.map((legSegments, sIdx) => {
            return (
              <div key={sIdx} className="p-0">
                {segmentsArrays.length > 1 && (
                  <div className="p-5 pb-0">
                    <p className="text-xs font-black uppercase tracking-widest text-[#C9A84C] mb-4 bg-slate-50 px-3 py-1.5 rounded-lg inline-block">
                      {sIdx === 0 ? "Onward Journey" : "Return Journey"}
                    </p>
                  </div>
                )}

                <div className="divide-y divide-slate-100">
                  {legSegments.map((segment, hIdx) => {
                    const nextSegment = legSegments[hIdx + 1];
                    const from = segment.Origin?.Airport?.CityName;
                    const fromCode = segment.Origin?.Airport?.AirportCode;
                    const fromTerminal = segment.Origin?.Airport?.Terminal;
                    const to = segment.Destination?.Airport?.CityName;
                    const toCode = segment.Destination?.Airport?.AirportCode;
                    const toTerminal = segment.Destination?.Airport?.Terminal;

                    const depTime = segment.Origin?.DepTime;
                    const arrTime = segment.Destination?.ArrTime;

                    const airline = segment.Airline?.AirlineName;
                    const airlineCode = segment.Airline?.AirlineCode;
                    const flightNumber = segment.Airline?.FlightNumber;
                    const craft = segment?.Craft || "—";
                    
                    const durationMin = segment.Duration || 0;
                    const duration = `${Math.floor(durationMin / 60)}h ${durationMin % 60}m`;

                    const checkinBaggage =
                      fareBreakdown?.SegmentDetails?.[sIdx]?.CheckedInBaggage?.FreeText ||
                      segment?.Baggage ||
                      "15 Kg";
                    const cabinBaggage =
                      fareBreakdown?.SegmentDetails?.[sIdx]?.CabinBaggage?.FreeText ||
                      segment?.CabinBaggage ||
                      "7 Kg";

                    // Calculate Layover
                    let layoverContent = null;
                    if (nextSegment) {
                      const arr = new Date(segment.Destination?.ArrTime);
                      const dep = new Date(nextSegment.Origin?.DepTime);
                      const diffMs = dep - arr;
                      const diffMin = Math.floor(diffMs / 60000);
                      const layoverHours = Math.floor(diffMin / 60);
                      const layoverMins = diffMin % 60;

                      layoverContent = (
                        <div className="bg-amber-50/50 border-y border-amber-100 px-8 py-3 flex items-center gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                          <p className="text-[11px] font-bold text-amber-700 uppercase tracking-widest">
                            Layover in {segment.Destination?.Airport?.CityName} ({segment.Destination?.Airport?.AirportCode}) — {layoverHours}h {layoverMins}m
                          </p>
                        </div>
                      );
                    }

                    return (
                      <React.Fragment key={hIdx}>
                        <div className="p-6">
                          {/* Segment Header */}
                          <div className="flex items-center gap-3 mb-6">
                            <img
                              src={airlineLogo(airlineCode)}
                              alt={airline}
                              className="w-10 h-10 rounded-xl border border-slate-100 shadow-sm object-contain p-1"
                            />
                            <div>
                              <p className="text-sm font-bold text-slate-800">{airline}</p>
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                                {airlineCode}-{flightNumber} • {craft}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-start justify-between gap-8">
                            {/* Departure */}
                            <div className="flex-1">
                              <p className="text-xl font-black text-slate-800">{formatTime(depTime)}</p>
                              <p className="text-xs font-bold text-[#C9A84C] mt-1">{formatDate(depTime)}</p>
                              <div className="mt-3">
                                <p className="text-sm font-bold text-slate-700">{from} ({fromCode})</p>
                                {fromTerminal && <p className="text-[10px] font-bold text-slate-500 mt-0.5">Terminal {fromTerminal}</p>}
                              </div>
                            </div>

                            {/* Middle - Duration */}
                            <div className="flex flex-col items-center pt-2">
                               <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{duration}</div>
                               <div className="h-12 w-px bg-linear-to-b from-slate-200 to-transparent border-l border-dashed border-[#C9A84C]/30" />
                            </div>

                            {/* Arrival */}
                            <div className="flex-1 text-right">
                              <p className="text-xl font-black text-slate-800">{formatTime(arrTime)}</p>
                              <p className="text-xs font-bold text-[#C9A84C] mt-1">{formatDate(arrTime)}</p>
                              <div className="mt-3">
                                <p className="text-sm font-bold text-slate-700">{to} ({toCode})</p>
                                {toTerminal && <p className="text-[10px] font-bold text-slate-500 mt-0.5">Terminal {toTerminal}</p>}
                              </div>
                            </div>
                          </div>

                        </div>
                        {layoverContent}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Fare Summary Tab ── */}
      {activeTab === "fare" && (
        <div className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-3">
            Fare Breakdown
          </p>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="divide-y divide-slate-100">
              <div className="flex justify-between items-center px-4 py-3">
                <span className="text-sm text-slate-600">Base Fare</span>
                <span className="text-sm font-semibold text-slate-800">
                  ₹{baseFare.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center px-4 py-3">
                <span className="text-sm text-slate-600">Taxes &amp; Fees</span>
                <span className="text-sm font-semibold text-slate-800">
                  ₹{tax.toLocaleString()}
                </span>
              </div>
              {otherCharges > 0 && (
                <div className="flex justify-between items-center px-4 py-3">
                  <span className="text-sm text-slate-600">Other Charges</span>
                  <span className="text-sm font-semibold text-slate-800">
                    ₹{otherCharges.toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center px-4 py-3 bg-slate-50">
                <span className="text-sm font-bold text-[#0A203E]">
                  Total Payable
                </span>
                <span className="text-base font-bold text-[#0A203E]">
                  ₹{publishedFare.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Refundable status */}
          <div className="mt-3 flex items-center gap-2">
            <span
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border ${
                selectedFlight?.IsRefundable
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-red-50 text-red-600 border-red-200"
              }`}
            >
              {selectedFlight?.IsRefundable ? "Refundable" : "Non-Refundable"}
            </span>
            {selectedFlight?.IsLCC && (
              <span className="text-xs font-semibold px-3 py-1.5 rounded-lg border bg-amber-50 text-amber-700 border-amber-200">
                LCC
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Fare Rules Tab (Merged Charges + Rules) ── */}
      {activeTab === "rules" && (
        <div className="p-0 overflow-y-auto custom-scrollbar max-h-[600px] bg-slate-50/30">
          {/* Quick Status Header (Simplified to Status Only) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-b border-slate-100 bg-white">
             <div className="p-5 flex items-start gap-4 border-r border-slate-50">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600 shrink-0 shadow-sm">
                   <FaPlane className="text-sm rotate-180" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">Refund Status</p>
                  <p className="text-sm font-black text-slate-800 mt-0.5">
                    {selectedFlight?.IsRefundable ? "Refundable" : "Non-Refundable"}
                  </p>
                </div>
             </div>
             <div className="p-5 flex items-start gap-4 border-r border-slate-50">
                <div className="w-10 h-10 rounded-xl bg-[#C9A84C]/10 flex items-center justify-center text-[#0A203E] shrink-0 shadow-sm">
                   <FaPlane className="text-sm" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">Change Policy</p>
                  <p className="text-sm font-black text-slate-800 mt-0.5">
                    {selectedFlight?.FareInclusions?.some(v => v.toLowerCase().includes("non-changeable")) ? "Fixed Dates" : "As per Policy"}
                  </p>
                </div>
             </div>
             <div className="p-5 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0 shadow-sm">
                   <BsSuitcase className="text-sm" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">Pax Allowance</p>
                  <p className="text-sm font-black text-slate-800 mt-0.5">{selectedFlight.Fare?.Baggage?.iB || selectedFlight.BaggageAllowance || "15 Kg"}</p>
                </div>
             </div>
          </div>

          <div className="p-6 space-y-8">
            {/* 1. Airline Remark (High Priority for Series Fares) */}
            {selectedFlight?.AirlineRemark && (
              <section className="bg-[#0A203E] rounded-3xl p-5 text-white shadow-xl">
                 <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full bg-[#C9A84C] animate-pulse" />
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] opacity-90">Important Airline Remark</p>
                 </div>
                 <p className="text-sm font-bold leading-relaxed">{selectedFlight.AirlineRemark}</p>
              </section>
            )}

            {/* 2. Fare Inclusions (Fixed Split Logic) */}
            {(() => {
              const rawInclusions = selectedFlight?.FareInclusions || selectedFlight?.FareInclusionsNew || [];
              const processedInclusions = rawInclusions.flatMap(inc => 
                inc.split('&&').map(s => s.trim())
              ).filter(Boolean);

              if (processedInclusions.length === 0) return null;

              return (
                <section>
                   <div className="flex items-center gap-2 mb-4">
                     <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                     <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Fare Inclusions & Highlights</h4>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {processedInclusions.map((inc, k) => {
                        const displayLabel = inc.replace(/:(Included|Included)/gi, ' Included')
                                                .replace(/[:]/g, ': ')
                                                .trim();
                        return (
                          <div key={k} className="flex items-center gap-3 px-4 py-3 bg-white border border-slate-100 rounded-2xl shadow-xs hover:border-emerald-200 transition-all">
                             <div className="w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                                <span className="text-emerald-600 font-bold text-[10px]">✓</span>
                             </div>
                             <span className="text-xs font-semibold text-slate-700">{displayLabel}</span>
                          </div>
                        );
                      })}
                   </div>
                </section>
              );
            })()}

            {/* 3. Modification & Cancellation Charges (The ONLY place for fee numbers) */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                 <div className="w-1.5 h-6 bg-[#C9A84C] rounded-full" />
                 <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Modification & Cancellation Schedule</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Cancellation */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                   <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                      <span className="text-[11px] font-black text-slate-600 uppercase">Cancellation Fee</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isCancellationFallback ? "text-slate-600 bg-slate-50 border-slate-200" : "text-red-600 bg-red-50 border-red-100"}`}>
                        {isCancellationFallback ? "Policy Guidance" : "Official"}
                      </span>
                   </div>
                   {cancellationRules.length > 0 ? (
                      <div className="divide-y divide-slate-50">
                        {cancellationRules.map((rule, i) => (
                          <div key={i} className="px-4 py-4 flex justify-between items-start">
                             <span className="text-xs font-bold text-slate-600 pr-4">
                                {rule.From && rule.To ? `${rule.From}–${rule.To} ${rule.Unit?.toLowerCase()}` : (rule.From ? `> ${rule.From} ${rule.Unit?.toLowerCase()}` : `< ${rule.To} ${rule.Unit?.toLowerCase()}`)}
                             </span>
                             <span className="text-xs font-black text-slate-800 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">{rule.Details}</span>
                          </div>
                        ))}
                      </div>
                   ) : (
                     <p className="p-4 text-xs text-slate-400 italic">
                       {cancellationMessage}
                     </p>
                   )}
                </div>

                {/* Date Change */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                   <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                      <span className="text-[11px] font-black text-slate-600 uppercase">Date Change Fee</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isReissueFallback ? "text-slate-600 bg-slate-50 border-slate-200" : "text-[#C9A84C] bg-slate-50 border-[#C9A84C]/30"}`}>
                        {isReissueFallback ? "Policy Guidance" : "Official"}
                      </span>
                   </div>
                   {reissueRules.length > 0 ? (
                      <div className="divide-y divide-slate-50">
                        {reissueRules.map((rule, i) => (
                          <div key={i} className="px-4 py-4 flex justify-between items-start">
                             <span className="text-xs font-bold text-slate-600 pr-4">
                                {rule.From && rule.To ? `${rule.From}–${rule.To} ${rule.Unit?.toLowerCase()}` : (rule.From ? `> ${rule.From} ${rule.Unit?.toLowerCase()}` : `< ${rule.To} ${rule.Unit?.toLowerCase()}`)}
                             </span>
                             <span className="text-xs font-black text-slate-800 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">{rule.Details}</span>
                          </div>
                        ))}
                      </div>
                   ) : <p className="p-4 text-xs text-slate-400 italic">No specific fee details available from airline.</p>}
                </div>
              </div>
            </section>

            {/* 4. Detailed Official Fare Rules */}
            {miniFareRules.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                   <div className="w-1.5 h-6 bg-slate-400 rounded-full" />
                   <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Supplemental Airline Terms</h4>
                </div>

                <div className="space-y-4">
                    {miniFareRules.map((rule, idx) => (
                      <div key={idx} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:border-[#C9A84C]/50 transition-colors">
                         <button className="w-full px-5 py-4 flex justify-between items-center bg-slate-50/50 text-left border-b border-slate-100 group">
                            <span className="text-[11px] font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                               <div className="w-1.5 h-1.5 rounded-full bg-[#C9A84C]" />
                               {rule.Type}
                            </span>
                            <FaChevronDown className="text-[10px] text-slate-300 group-hover:text-[#C9A84C] transition-colors" />
                         </button>
                         <div className="p-5 text-xs text-slate-600 leading-relaxed font-semibold bg-white whitespace-pre-wrap select-text">
                            {rule.Details}
                         </div>
                      </div>
                    ))}
                </div>
              </section>
            )}

            {/* Final Notice */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-6">
               <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">!</div>
                  <h4 className="text-[11px] font-black text-indigo-900 uppercase tracking-widest">Standard Compliance Notice</h4>
               </div>
               <p className="text-[11px] text-indigo-800 font-bold opacity-80 leading-relaxed italic">
                 Fare basis and terms are automatically provided by the airline's GDS. Total refund amounts are calculated after deducting airline-specific non-refundable components.
               </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Card ───────────────────────────────────────────────────────────────

export default function OneWayFlightCard({
  flight,
  traceId,
  travelClass,
  passengers,
  onOpenFareUpsell,
}) {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [showFlightDetails, setShowFlightDetails] = useState(false);
  const [isLoadingMoreFares, setIsLoadingMoreFares] = useState(false);

  const groupedFlight = flight?.flightInfo
    ? flight
    : {
        flightInfo: flight,
        fareOptions: buildFallbackFareOptions(flight),
        flightOptionsByResultIndex:
          flight?.ResultIndex != null ? { [flight.ResultIndex]: flight } : {},
      };

  const {
    flightInfo,
    fareOptions,
    flightOptionsByResultIndex = {},
  } = groupedFlight || {};

  const normalizedFareOptions = useMemo(
    () => normalizeFareOptions(fareOptions, flightInfo),
    [fareOptions, flightInfo],
  );

  const [selectedFareResultIndex, setSelectedFareResultIndex] = useState(null);

  const selectedFare = useMemo(() => {
    if (selectedFareResultIndex == null) {
      return normalizedFareOptions[0];
    }
    return (
      normalizedFareOptions.find(
        (fare) => fare.resultIndex === selectedFareResultIndex,
      ) || normalizedFareOptions[0]
    );
  }, [normalizedFareOptions, selectedFareResultIndex]);

  const selectedResultIndex =
    selectedFare?.resultIndex ?? flightInfo?.ResultIndex;
  const selectedFlight =
    (selectedResultIndex != null
      ? flightOptionsByResultIndex[selectedResultIndex]
      : null) || flightInfo;

  if (
    !selectedFlight ||
    !selectedFlight.Segments?.length ||
    !selectedFlight.Segments[0]?.length
  ) {
    return null;
  }

  const handleFareOptionsClick = async () => {
    if (selectedResultIndex == null || isLoadingMoreFares) return;
    
    setIsLoadingMoreFares(true);
    try {
      const res = await dispatch(
        getFareUpsell({
          traceId,
          resultIndex: selectedResultIndex,
        }),
      );
      if (res?.payload && typeof onOpenFareUpsell === "function") {
        onOpenFareUpsell(res.payload);
      }
    } finally {
      setIsLoadingMoreFares(false);
    }
  };

  const segments = selectedFlight.Segments[0];
  const firstSegment = segments[0];
  const flightStatus =
    firstSegment?.FlightStatus || firstSegment?.Status || "Scheduled";
  const lastSegment = segments[segments.length - 1];

  const airline = firstSegment.Airline?.AirlineName;
  const airlineCode = firstSegment.Airline?.AirlineCode;
  const flightNumber = firstSegment.Airline?.FlightNumber;

  const from = firstSegment.Origin?.Airport?.CityName;
  const fromCountry = firstSegment.Origin?.Airport?.CountryName;
  const fromAirport = firstSegment.Origin?.Airport?.AirportName;
  const fromTerminal = firstSegment.Origin?.Airport?.Terminal;

  const to = lastSegment.Destination?.Airport?.CityName;
  const toCountry = lastSegment.Destination?.Airport?.CountryName;
  const toAirport = lastSegment.Destination?.Airport?.AirportName;
  const toTerminal = lastSegment.Destination?.Airport?.Terminal;

  const departure = formatTime(firstSegment.Origin?.DepTime);
  const arrival = formatTime(lastSegment.Destination?.ArrTime);

  const depTime = firstSegment.Origin?.DepTime;
  const arrTime = lastSegment.Destination?.ArrTime;

  const durationMin = segments.reduce((sum, s) => sum + (s.Duration || 0), 0);
  const duration = `${Math.floor(durationMin / 60)}h ${durationMin % 60}m`;

  const stopCities = segments.slice(0, -1).map(s => s.Destination?.Airport?.AirportCode).filter(Boolean);
  const stops = segments.length === 1 
    ? "Non-stop" 
    : `${segments.length - 1} Stop${segments.length > 2 ? 's' : ''} ${stopCities.length ? `via ${stopCities.join(', ')}` : ''}`;

  const baggage = selectedFlight.Fare?.Baggage?.iB || "15 Kg";
  const refundable = selectedFlight.IsRefundable;
  const price = Math.ceil(
    toFiniteNumber(
      selectedFare?.publishedFare ?? selectedFlight.Fare?.PublishedFare,
      0,
    ),
  );

  return (
    <div className="max-w-[1060px] bg-linear-to-br from-white via-slate-50 to-white border border-slate-200 rounded-2xl transition-all duration-300 overflow-hidden">
      <div className="relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#C9A84C]/5 rounded-full blur-3xl -z-10"></div>

        <div className="p-6">
          <div className="relative">
            {/* ── Header Row ── */}
            <div className="flex items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img
                    src={airlineLogo(airlineCode)}
                    alt={airline}
                    className="w-12 h-12 rounded-xl shadow-md border-2 border-white object-contain"
                    onError={(e) => {
                      e.currentTarget.src = "https://via.placeholder.com/64";
                    }}
                  />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#C9A84C] rounded-full border-2 border-white"></div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <div className="font-bold text-slate-800">{airline}</div>
                    {flightStatus && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          FLIGHT_STATUS_MAP[flightStatus]?.className ||
                          FLIGHT_STATUS_MAP.Scheduled.className
                        }`}
                      >
                        {FLIGHT_STATUS_MAP[flightStatus]?.label || "Scheduled"}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 font-medium">
                    {airlineCode}-{flightNumber}
                  </div>
                </div>
              </div>

               {travelClass && (
                  <span className="mb-1 inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 uppercase">
                    <MdAirlineSeatReclineNormal className="text-[#C9A84C]" /> {travelClass}
                  </span>
                )}

              {/* <div className="flex flex-col text-center sm:text-right bg-gray-200 rounded-xl p-2">
                <div className="flex items-baseline justify-center sm:justify-start gap-2">
                  <span className="text-3xl font-bold bg-linear-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                    &#8377;{price?.toLocaleString()}
                  </span>
                </div>
              </div> */}
            </div>

            {/* ── Flight Timeline ── */}
            <div className="grid grid-cols-[1fr_auto_1fr] gap-6 items-center">
              <div className="text-left space-y-1">
                <div className="text-2xl font-bold text-slate-800">
                  {departure}
                </div>
                <div className="text-xs font-bold text-[#C9A84C]">
                  {formatDate(depTime)}
                </div>
                <div className="text-sm font-semibold text-slate-700 mt-2">
                  {from}, {fromCountry}
                </div>
                <div className="text-xs text-slate-500">({fromAirport})</div>
                {fromTerminal && (
                  <div className="text-[10px] font-black text-[#C9A84C] bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200 inline-block mt-1 uppercase tracking-wider">
                    T-{fromTerminal}
                  </div>
                )}
              </div>

              <div className="flex flex-col items-center gap-2 px-6">
               
                <div className="relative w-full mb-3">
                  <div className="h-0.5 bg-linear-to-r from-slate-200 via-[#C9A84C] to-slate-200 w-32"></div>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-2 rounded-full shadow-md border border-slate-200">
                    <MdOutlineFlight className="text-[#C9A84C] text-xl rotate-90" />
                  </div>
                </div>
                <div className="text-xs font-semibold text-slate-600 whitespace-nowrap">
                  {duration}
                </div>
                <div className="px-3 py-1 bg-linear-to-r from-emerald-50 to-emerald-100 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">
                  {stops}
                </div>
              </div>

              <div className="text-right space-y-1">
                <div className="text-2xl font-bold text-slate-800">
                  {arrival}
                </div>
                <div className="text-xs font-bold text-[#C9A84C]">
                  {formatDate(arrTime)}
                </div>
                <div className="text-sm font-semibold text-slate-700 mt-2">
                  {to}, {toCountry}
                </div>
                <div className="text-xs text-slate-500">({toAirport})</div>
                {toTerminal && (
                  <div className="text-[10px] font-black text-[#C9A84C] bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200 inline-block mt-1 uppercase tracking-wider">
                    T-{toTerminal}
                  </div>
                )}
              </div>
            </div>

            {/* ── Fare Options ── */}
            <div className="mt-5 rounded-xl border border-slate-100 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Fare options
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {normalizedFareOptions.map((fare, index) => {
                  const isSelected =
                    selectedFare?.resultIndex != null
                      ? selectedFare.resultIndex === fare.resultIndex
                      : index === 0;
                  const isLowest = index === 0;

                  return (
                    <button
                      key={`${fare.supplierFareClass}-${fare.resultIndex || index}`}
                      type="button"
                      onClick={() =>
                        setSelectedFareResultIndex(fare.resultIndex)
                      }
                      className={`rounded-lg border px-3 py-2 text-left transition ${
                        isSelected
                          ? "border-[#C9A84C] bg-slate-50 shadow-sm"
                          : "border-slate-200 bg-white hover:border-[#C9A84C]/50 hover:bg-slate-50"
                      }`}
                    >
                      <div className="text-xs font-semibold text-slate-600">
                        {fare.supplierFareClass}
                      </div>
                      <div
                        className={`text-sm font-bold ${
                          isSelected ? "text-[#C9A84C]" : "text-slate-800"
                        }`}
                      >
                        &#8377;{Math.ceil(fare.publishedFare).toLocaleString()}
                      </div>
                      {isLowest && (
                        <div className="text-[10px] font-semibold text-emerald-600">
                          Lowest fare
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Bottom Action Row ── */}
            <div className="flex items-center justify-between mt-1">
              <div className="flex flex-wrap gap-3">
                {/* <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200">
                  <BsSuitcase /> {baggage}
                </span> */}
                {/* {refundable && (
                  <span className="inline-flex items-center px-3 py-1.5 bg-linear-to-r from-emerald-50 to-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-200">
                    Refundable
                  </span>
                )} */}

                {/* ── Flight Details Toggle Button ── */}
                <button
                  type="button"
                  onClick={() => setShowFlightDetails((prev) => !prev)}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 text-[11px] font-black rounded-xl border transition-all cursor-pointer uppercase tracking-widest shadow-sm
                    ${
                      showFlightDetails
                        ? "bg-[#0A203E] text-white border-[#0A203E]"
                        : "bg-white text-slate-600 border-slate-200 hover:border-[#0A203E]/30 hover:text-[#0A203E]"
                    }`}
                >
                  Flight Details
                  {showFlightDetails ? (
                    <FaChevronUp className="text-[10px]" />
                  ) : (
                    <FaChevronDown className="text-[10px]" />
                  )}
                </button>

                <button
                  onClick={handleFareOptionsClick}
                  disabled={isLoadingMoreFares}
                  className={`flex items-center gap-1.5 px-4 py-2 text-[11px] font-black rounded-xl border uppercase tracking-widest shadow-sm transition-all ${
                    isLoadingMoreFares
                      ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:text-[#C9A84C] hover:border-[#C9A84C]/50 cursor-pointer"
                  }`}
                >
                  {isLoadingMoreFares ? (
                    <>
                      <span className="animate-spin inline-block w-3 h-3 border-2 border-slate-400 border-t-slate-600 rounded-full" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <BiSolidOffer className="text-[#C9A84C] text-sm" /> More Fares
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      const isInternational = segments.some(
                        (s) =>
                          s.Origin?.Airport?.CountryCode &&
                          s.Destination?.Airport?.CountryCode &&
                          s.Origin.Airport.CountryCode !==
                            s.Destination.Airport.CountryCode,
                      );
                      navigate("/one-way-flight/booking", {
                        state: {
                          selectedFlight,
                          rawFlightData: selectedFlight,
                          searchParams: { traceId, passengers },
                          tripType: "one-way",
                          isInternational,
                        },
                      });
                    }}
                    className="relative group px-8 py-3 bg-[#0A203E] text-white rounded-xl font-black shadow-lg shadow-[#0A203E]/20 transition-all duration-300 hover:scale-[1.02] active:scale-95 uppercase tracking-widest text-xs"
                  >
                    <span className="relative z-10">Book Now</span>
                  </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Flight Details Dropdown (animated) ── */}
      {showFlightDetails && (
        <FlightDetailsDropdown
          selectedFlight={selectedFlight}
          selectedFare={selectedFare}
        />
      )}
    </div>
  );
}
