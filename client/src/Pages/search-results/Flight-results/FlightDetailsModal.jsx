import React, { useState, useEffect } from "react";

import { useDispatch } from "react-redux";
import { IoClose } from "react-icons/io5";
import { AiOutlineInfoCircle } from "react-icons/ai";
import { BsSuitcase } from "react-icons/bs";
import { BiSolidOffer } from "react-icons/bi";
import { FaPlane } from "react-icons/fa";
import { MdReceiptLong, MdLocalGasStation, MdAccessTime, MdRefresh } from "react-icons/md";


import { airlineLogo, formatDate, formatTime } from "../../../utils/formatter";
import { getFareRule } from "../../../Redux/Actions/flight.thunks";
import { processFareRulesData } from "../../../utils/fareRulesParser";

// ─── Cabin Class Map (TBO codes 1–6) ─────────────────────────────────────────

function getCabinClassLabel(code) {
  switch (Number(code)) {
    case 1: return "All";
    case 2: return "Economy";
    case 3: return "Premium Economy";
    case 4: return "Business";
    case 5: return "Premium Business";
    case 6: return "First";
    default: return null;
  }
}

// ─── Fare Rule Formatters ────────────────────────────────────────────────────

/** Converts raw API fee string to a display-friendly label */
function formatFeeAmount(details = "") {
  const raw = String(details).trim();
  const inrMatch = raw.match(/INR\s*([\d,.]+)/i);
  if (inrMatch) {
    const num = parseFloat(inrMatch[1].replace(/,/g, ""));
    return { label: `₹${num.toLocaleString("en-IN")}`, type: "fee" };
  }
  const pctMatch = raw.match(/^(\d+(?:\.\d+)?)%$/);
  if (pctMatch) {
    return { label: `${pctMatch[1]}% of Fare`, type: "percent" };
  }
  if (/^(nil|0)$/i.test(raw)) {
    return { label: "No Charge", type: "free" };
  }
  if (/non.refundable/i.test(raw)) {
    return { label: "Non-Refundable", type: "blocked" };
  }
  if (/discretion|not permitted|not allowed/i.test(raw)) {
    return { label: "Airline Discretion", type: "discretion" };
  }
  return { label: raw, type: "info" };
}

/** Converts From/To/Unit triplet to a human-readable time window */
function formatTimeWindow(from, to, unit = "HOURS") {
  const u = String(unit).toUpperCase() === "HOURS" ? "hrs" : unit?.toLowerCase() || "hrs";
  const f = from?.toString().trim();
  const t = to?.toString().trim();
  if (f && t && t !== "" && t !== "Any") {
    return `${f} – ${t} ${u} before departure`;
  }
  if (f && (!t || t === "" || t === "Any")) {
    return `More than ${f} ${u} before departure`;
  }
  if (!f && t) {
    return `Within ${t} ${u} of departure`;
  }
  return "As per airline policy";
}

// ─── Shared Components ──────────────────────────────────────────────────────

/** Fee badge — colored by type */
function FeeBadge({ details }) {
  const { label, type } = formatFeeAmount(details);
  const colorMap = {
    fee:        "bg-red-50 text-red-700 border-red-200",
    percent:    "bg-orange-50 text-orange-700 border-orange-200",
    free:       "bg-emerald-50 text-emerald-700 border-emerald-200",
    blocked:    "bg-red-100 text-red-800 border-red-300",
    discretion: "bg-slate-100 text-slate-600 border-slate-300",
    info:       "bg-[#C9A84C]/10 text-[#7a5f1a] border-[#C9A84C]/30",
  };
  return (
    <span className={`text-xs font-black px-3 py-1.5 rounded-xl border ${colorMap[type] || colorMap.info}`}>
      {label}
    </span>
  );
}

function FlightSegmentDetail({ segment }) {
  const depTime = segment.Origin?.DepTime;
  const arrTime = segment.Destination?.ArrTime;
  const airlineName = segment.Airline?.AirlineName;
  const airlineCode = segment.Airline?.AirlineCode;
  const flightNumber = segment.Airline?.FlightNumber;
  // Map numeric TBO cabin class code; fall back to FareClass letter only when it's not a number
  const rawCabinClass = segment.CabinClass;
  const fareClassLetter = segment.Airline?.FareClass;
  const cabinClassLabel =
    rawCabinClass != null
      ? getCabinClassLabel(rawCabinClass)
      : (fareClassLetter && isNaN(fareClassLetter) ? fareClassLetter : null);
  const craftType = segment.CraftType || "";

  const from = segment.Origin?.Airport?.CityName;
  const fromCode = segment.Origin?.Airport?.AirportCode;
  const fromTerminal = segment.Origin?.Airport?.Terminal;
  const to = segment.Destination?.Airport?.CityName;
  const toCode = segment.Destination?.Airport?.AirportCode;
  const toTerminal = segment.Destination?.Airport?.Terminal;

  const durationMin = segment.Duration || 0;
  const durationH = Math.floor(durationMin / 60);
  const durationM = durationMin % 60;

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-md bg-white">
      {/* Airline Header Bar */}
      <div className="flex items-center justify-between px-5 py-3 bg-[#0A203E]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm overflow-hidden p-1">
            <img src={airlineLogo(airlineCode)} alt={airlineName} className="w-full h-full object-contain" />
          </div>
          <div>
            <p className="text-sm font-black text-white leading-none">{airlineName}</p>
            <p className="text-[10px] font-bold text-[#C9A84C] uppercase tracking-widest mt-0.5">{airlineCode} · {flightNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {cabinClassLabel && (
            <span className="px-3 py-1 bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-full border border-white/20">
              {cabinClassLabel}
            </span>
          )}
          <span className="px-3 py-1 bg-[#C9A84C] text-[#0A203E] text-[10px] font-black uppercase tracking-widest rounded-full">
            {durationH}h {durationM}m
          </span>
        </div>
      </div>

      {/* Flight Route */}
      <div className="px-6 py-5 flex items-center justify-between gap-4">
        {/* Departure */}
        <div className="text-left min-w-[110px]">
          <p className="text-3xl font-black text-[#0A203E] leading-none">{formatTime(depTime)}</p>
          <p className="text-base font-black text-slate-800 mt-1.5">{fromCode}</p>
          <p className="text-xs font-semibold text-slate-500 mt-0.5 leading-snug">{from}</p>
          {fromTerminal && (
            <span className="inline-block mt-1.5 px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-wider rounded border border-amber-200">
              Terminal {fromTerminal}
            </span>
          )}
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-1.5">{formatDate(depTime)}</p>
        </div>

        {/* Middle connector */}
        <div className="flex-1 flex flex-col items-center gap-1 px-2">
          <div className="w-full flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full border-2 border-[#C9A84C] bg-white shrink-0" />
            <div className="flex-1 h-0.5 bg-gradient-to-r from-[#C9A84C] via-slate-300 to-[#C9A84C]" />
            <div className="w-7 h-7 rounded-full bg-[#C9A84C] flex items-center justify-center shadow-md shrink-0">
              <FaPlane className="text-[#0A203E] text-xs" />
            </div>
            <div className="flex-1 h-0.5 bg-gradient-to-r from-[#C9A84C] via-slate-300 to-[#C9A84C]" />
            <div className="w-2.5 h-2.5 rounded-full border-2 border-[#C9A84C] bg-white shrink-0" />
          </div>
          {craftType && (
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{craftType}</p>
          )}
        </div>

        {/* Arrival */}
        <div className="text-right min-w-[110px]">
          <p className="text-3xl font-black text-[#0A203E] leading-none">{formatTime(arrTime)}</p>
          <p className="text-base font-black text-slate-800 mt-1.5">{toCode}</p>
          <p className="text-xs font-semibold text-slate-500 mt-0.5 leading-snug">{to}</p>
          {toTerminal && (
            <span className="inline-block mt-1.5 px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-wider rounded border border-amber-200">
              Terminal {toTerminal}
            </span>
          )}
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-1.5">{formatDate(arrTime)}</p>
        </div>
      </div>

      {/* Bottom Info Bar */}
      <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
            {segment.Baggage || "15 Kg"} Check-in
          </span>
        </div>
        <div className="w-px h-3 bg-slate-300" />
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
            {segment.CabinBaggage || "7 Kg"} Cabin
          </span>
        </div>
        {segment.IsRefundable !== undefined && (
          <>
            <div className="w-px h-3 bg-slate-300" />
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${segment.IsRefundable ? "bg-emerald-500" : "bg-red-400"}`} />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                {segment.IsRefundable ? "Refundable" : "Non-Refundable"}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function RuleRow({ rule, index }) {
  const timeLabel = formatTimeWindow(rule.From, rule.To, rule.Unit);
  return (
    <div className={`flex items-center justify-between gap-4 px-5 py-4 ${
      index % 2 === 0 ? "bg-white" : "bg-slate-50/60"
    } border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
          <span className="text-slate-500 text-[10px] font-black">{index + 1}</span>
        </div>
        <p className="text-xs font-semibold text-slate-600 leading-snug">{timeLabel}</p>
      </div>
      <FeeBadge details={rule.Details} />
    </div>
  );
}

// ─── Layover Badge ────────────────────────────────────────────────────────────

function LayoverBadge({ arrSeg, depSeg }) {
  const arrTime = new Date(arrSeg.Destination?.ArrTime);
  const depTime = new Date(depSeg.Origin?.DepTime);
  const diffMin = Math.round((depTime - arrTime) / 60000);
  if (diffMin <= 0) return null;
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  const airport = arrSeg.Destination?.Airport?.AirportName || arrSeg.Destination?.Airport?.CityName || "Connecting Airport";
  const code = arrSeg.Destination?.Airport?.AirportCode || "";

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
      <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
        <MdAccessTime className="text-amber-600" size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Layover</p>
        <p className="text-xs font-semibold text-slate-700 mt-0.5">
          {h > 0 ? `${h}h ` : ""}{m}m stop at {airport}{code ? ` (${code})` : ""}
        </p>
      </div>
      <span className="shrink-0 text-[10px] font-black text-amber-700 bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-lg">
        {h > 0 ? `${h}h ${m}m` : `${m}m`}
      </span>
    </div>
  );
}

// ─── Flight Details Modal ────────────────────────────────────────────────

export function FlightDetailsModal({ isOpen, onClose, selectedFlight, selectedFare, traceId }) {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState("flight");
  const [fullFareRules, setFullFareRules] = useState(null);
  const [isFetchingRules, setIsFetchingRules] = useState(false);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const fetchFullRules = async () => {
    const resultIndex = selectedFlight?.ResultIndex || selectedFare?.resultIndex;
    if (!traceId || !resultIndex) return;

    setIsFetchingRules(true);
    try {
      const res = await dispatch(getFareRule({ traceId, resultIndex }));
      if (res?.payload) {
        const parsed = processFareRulesData(
          res.payload.Response?.FareRules || [],
          selectedFlight
        );
        setFullFareRules(parsed);
      }
    } catch (error) {
      console.error("Error fetching fare rules:", error);
    } finally {
      setIsFetchingRules(false);
    }
  };

  if (!isOpen) return null;

  const segmentsArrays = selectedFlight?.Segments || [];
  const fare = selectedFlight?.Fare;
  const isRefundable = selectedFlight?.IsRefundable;
  const allMiniFareRuleGroups = selectedFlight?.MiniFareRules || [];

  // Extract supplier fare class — prefer passed selectedFare prop, else read from segment
  const supplierFareClass =
    selectedFare?.supplierFareClass ||
    segmentsArrays[0]?.[0]?.SupplierFareClass ||
    segmentsArrays[0]?.[0]?.Airline?.FareClass ||
    null;

  // Airline info from first segment
  const firstSeg = segmentsArrays[0]?.[0];
  const airlineName = firstSeg?.Airline?.AirlineName;
  const airlineCode = firstSeg?.Airline?.AirlineCode;

  // Cabin class from fare (numeric TBO code)
  const cabinClassLabel = getCabinClassLabel(selectedFlight?.Fare?.CabinClass);

  return (
    <div className="fixed inset-0 bg-[#0A203E]/75 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-[#0A203E]">
          <div className="flex items-center gap-4">
            {/* Airline Logo */}
            {airlineCode && (
              <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-md p-1.5 shrink-0">
                <img
                  src={`https://pics.avs.io/60/60/${airlineCode}.png`}
                  alt={airlineName}
                  className="w-full h-full object-contain"
                  onError={(e) => { e.target.style.display = "none"; }}
                />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black text-white uppercase tracking-tight leading-none">
                  {airlineName || "Flight Details"}
                </h2>
                {airlineCode && (
                  <span className="text-[10px] font-black text-[#C9A84C] bg-[#C9A84C]/10 border border-[#C9A84C]/30 px-2 py-0.5 rounded-full uppercase tracking-widest">
                    {airlineCode}
                  </span>
                )}
                {cabinClassLabel && (
                  <span className="text-[10px] font-black text-white bg-white/10 border border-white/20 px-2.5 py-0.5 rounded-full uppercase tracking-widest">
                    {cabinClassLabel}
                  </span>
                )}
                {supplierFareClass && (
                  <span className="text-[10px] font-black text-[#0A203E] bg-[#C9A84C] px-3 py-0.5 rounded-full uppercase tracking-widest shadow-sm">
                    {supplierFareClass}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <p className="text-[10px] text-white/70 font-bold uppercase tracking-widest">
                  {segmentsArrays[0]?.[0]?.Origin?.Airport?.CityName} → {segmentsArrays[0]?.[segmentsArrays[0]?.length - 1]?.Destination?.Airport?.CityName}
                </p>
                <span className="w-1 h-1 rounded-full bg-white/30" />
                <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest">
                  {formatDate(segmentsArrays[0]?.[0]?.Origin?.DepTime)}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors text-white/60 hover:text-white shrink-0"
          >
            <IoClose size={22} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-50/50 px-8 border-b border-slate-100">
          <div className="flex gap-8">
            {[
              { id: "flight", label: "Flight Details", icon: <FaPlane /> },
              { id: "fare", label: "Fare Summary", icon: <BiSolidOffer /> },
              { id: "rules", label: "Fare Rules", icon: <AiOutlineInfoCircle /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative py-5 text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-2 transition-all ${
                  activeTab === tab.id
                    ? "text-[#0A203E]"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <span className={`text-sm ${activeTab === tab.id ? "text-[#C9A84C]" : ""}`}>
                  {tab.icon}
                </span>
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#C9A84C] rounded-t-full" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 custom-scrollbar">
          {activeTab === "flight" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {segmentsArrays.map((segments, legIdx) => (
                <div key={legIdx} className="space-y-6">
                  {segmentsArrays.length > 1 && (
                    <div className="flex items-center gap-3">
                      <h3 className="text-xs font-black text-[#C9A84C] uppercase tracking-widest">
                        {legIdx === 0 ? "Onward Journey" : "Return Journey"}
                      </h3>
                      <div className="flex-1 h-px bg-slate-100" />
                    </div>
                  )}
                  {segments.map((seg, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && (
                        <LayoverBadge arrSeg={segments[i - 1]} depSeg={seg} />
                      )}
                      <FlightSegmentDetail segment={seg} />
                    </React.Fragment>
                  ))}
                </div>
              ))}
            </div>
          )}

          {activeTab === "fare" && (
            <div className="max-w-3xl mx-auto">
              {/* Total Banner */}
              <div className="rounded-2xl bg-[#0A203E] p-6 mb-5 flex items-center justify-between shadow-lg">
                <div>
                  <p className="text-[10px] font-black text-white/50 uppercase tracking-widest">Total Payable</p>
                  <p className="text-4xl font-black text-[#C9A84C] mt-1">₹{Math.ceil(fare?.PublishedFare).toLocaleString()}</p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-[#C9A84C]/15 border border-[#C9A84C]/30 flex items-center justify-center">
                  <BiSolidOffer size={28} className="text-[#C9A84C]" />
                </div>
              </div>
              {/* Breakdown */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                {[
                  { label: "Base Fare", value: fare?.BaseFare, icon: <FaPlane className="text-[#C9A84C]" /> },
                  { label: "Taxes & Fees", value: fare?.Tax + (fare?.OtherCharges || 0), icon: <MdReceiptLong className="text-blue-500" /> },
                  { label: "Fuel Surcharge", value: fare?.YQTax || 0, icon: <MdLocalGasStation className="text-orange-500" /> },
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-center px-6 py-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-base">{item.icon}</span>
                      <span className="text-sm font-semibold text-slate-600">{item.label}</span>
                    </div>
                    <span className="text-sm font-black text-slate-800">₹{Math.ceil(item.value || 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "rules" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Quick Info Grid — all values from real data */}
              {(() => {
                const seg = segmentsArrays[0]?.[0];
                const checkInBaggage = seg?.Baggage;
                const cabinBaggage = seg?.CabinBaggage;
                const fareClass = seg?.Airline?.FareClass;

                const infoCards = [
                  {
                    label: "Refund Status",
                    value: isRefundable ? "Refundable" : "Non-Refundable",
                    valueClass: isRefundable ? "text-emerald-600" : "text-red-500",
                    icon: <FaPlane className={`${isRefundable ? "text-emerald-500" : "text-red-500"} rotate-180`} />,
                    iconBg: isRefundable ? "bg-emerald-50" : "bg-red-50",
                    show: true,
                  },
                  {
                    label: "Check-in Baggage",
                    value: checkInBaggage,
                    valueClass: "text-slate-800",
                    icon: <BsSuitcase className="text-emerald-500" />,
                    iconBg: "bg-emerald-50",
                    show: !!checkInBaggage,
                  },
                  {
                    label: "Cabin Baggage",
                    value: cabinBaggage,
                    valueClass: "text-slate-800",
                    icon: <BsSuitcase className="text-blue-500" />,
                    iconBg: "bg-blue-50",
                    show: !!cabinBaggage,
                  },
                  {
                    label: "Fare Class",
                    value: fareClass,
                    valueClass: "text-[#C9A84C]",
                    icon: <BiSolidOffer className="text-[#C9A84C]" />,
                    iconBg: "bg-[#C9A84C]/10",
                    show: !!fareClass,
                  },
                ].filter(c => c.show);

                return (
                  <div className={`grid grid-cols-1 gap-4 mb-8 ${infoCards.length >= 3 ? "md:grid-cols-3" : infoCards.length === 2 ? "md:grid-cols-2" : "md:grid-cols-1"}`}>
                    {infoCards.map((card, i) => (
                      <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg ${card.iconBg} flex items-center justify-center shrink-0`}>
                          {card.icon}
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{card.label}</p>
                          <p className={`text-xs font-black uppercase mt-0.5 ${card.valueClass}`}>{card.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Rules Content */}
              {isFetchingRules ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4 bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
                  <div className="w-12 h-12 border-4 border-[#C9A84C]/20 border-t-[#C9A84C] rounded-full animate-spin"></div>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Syncing with airline database...</p>
                </div>
              ) : fullFareRules ? (
                /* RENDER FULL RULES */
                <div className="space-y-10">
                  {fullFareRules.map((rule, idx) => (
                    <div key={idx} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                      {/* Rule Header */}
                      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 bg-[#0A203E]">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-xl border border-white/20">
                            <span className="text-sm font-black tracking-tight">{rule.origin}</span>
                            <FaPlane className="text-[10px] text-[#C9A84C]" />
                            <span className="text-sm font-black tracking-tight">{rule.destination}</span>
                          </div>
                          <div className="h-6 w-px bg-white/20" />
                          <div>
                            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Fare Class</p>
                            <p className="text-sm font-black text-white leading-none mt-0.5">{rule.fareType || "Standard"}</p>
                          </div>
                        </div>
                        <div className="px-4 py-2 bg-[#C9A84C]/15 border border-[#C9A84C]/30 rounded-xl">
                          <p className="text-[9px] font-black text-white/50 uppercase tracking-widest">Fare Basis</p>
                          <p className="text-sm font-black text-[#C9A84C] tracking-tight mt-0.5">{rule.fareBasisCode || "N/A"}</p>
                        </div>
                      </div>

                      <div className="p-6 space-y-6">
                        {/* Baggage Allowance */}
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                              <BsSuitcase size={13} />
                            </div>
                            <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">Baggage Allowance</h4>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Check-in (Adult/Child)</p>
                              <p className="text-sm font-black text-emerald-600">{rule.baggage?.checkIn || "15 KG"}</p>
                            </div>
                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cabin Baggage</p>
                              <p className="text-sm font-black text-slate-700">{rule.baggage?.cabin || "7 KG"}</p>
                            </div>
                          </div>
                        </div>

                        {/* Cancellation Policy */}
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-red-500">
                              <FaPlane size={11} className="rotate-180" />
                            </div>
                            <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">Cancellation Policy</h4>
                          </div>
                          <div className="rounded-xl border border-slate-100 overflow-hidden">
                            {rule.cancellation?.map((c, i) => (
                              <div key={i} className={`flex items-center justify-between gap-6 px-5 py-4 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/60"} border-b border-slate-100 last:border-0`}>
                                <p className="text-sm font-semibold text-slate-700 leading-snug flex-1">{c.timeRange}</p>
                                <span className="shrink-0 text-xs font-black text-red-600 bg-red-50 border border-red-100 px-3 py-1.5 rounded-lg whitespace-nowrap">{c.fee}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Date Change Policy */}
                        {rule.reissue && rule.reissue.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
                                <MdRefresh size={13} className="rotate-90" />
                              </div>
                              <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">Date Change Policy</h4>
                            </div>
                            <div className="rounded-xl border border-slate-100 overflow-hidden shadow-sm">
                              {rule.reissue.map((r, i) => (
                                <div key={i} className={`flex items-center justify-between gap-6 px-5 py-4 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/60"} border-b border-slate-100 last:border-0`}>
                                  <p className="text-sm font-semibold text-slate-700 leading-snug flex-1">{r.timeRange}</p>
                                  <span className="shrink-0 text-xs font-black text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-lg whitespace-nowrap">{r.fee}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Airline Notes */}
                        {rule.notes && rule.notes.length > 0 && (
                          <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100/50">
                            <div className="flex items-center gap-2 mb-3">
                              <AiOutlineInfoCircle className="text-blue-500" size={14} />
                              <h4 className="text-[10px] font-black text-blue-800 uppercase tracking-widest">Airline Notes</h4>
                            </div>
                            <ul className="space-y-1.5">
                              {rule.notes.slice(0, 8).map((note, nIdx) => (
                                <li key={nIdx} className="flex items-start gap-2">
                                  <span className="text-blue-300 text-xs mt-0.5 shrink-0">›</span>
                                  <span className="text-xs font-medium text-slate-600 leading-relaxed">{note}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : allMiniFareRuleGroups.length > 0 ? (
                /* RENDER MINI RULES */
                <div className="space-y-6">
                  {allMiniFareRuleGroups.map((legRules, legIdx) => (
                    <div key={legIdx} className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Cancellation */}
                        <div>
                           <div className="flex items-center gap-2 mb-4">
                              <div className="w-1.5 h-4 bg-red-500 rounded-full" />
                              <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Cancellation Fee</h4>
                           </div>
                           <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                              {legRules.filter(r => r.Type === "Cancellation" || r.Type === 0).length > 0 ? (
                                legRules.filter(r => r.Type === "Cancellation" || r.Type === 0).map((rule, i) => (
                                  <RuleRow key={i} rule={rule} index={i} />
                                ))
                              ) : (
                                <div className="p-6 flex flex-col gap-3 text-center bg-white">
                                  <p className="text-xs text-slate-400 font-bold italic">Detailed rules unavailable.</p>
                                  {isRefundable && (
                                    <button onClick={fetchFullRules} className="px-4 py-2 bg-slate-50 rounded-lg text-[10px] font-black text-[#C9A84C] uppercase tracking-widest hover:bg-[#C9A84C] hover:text-white transition-all shadow-xs border border-slate-100">
                                      Fetch Detailed Policy
                                    </button>
                                  )}
                                </div>
                              )}
                           </div>
                        </div>
                        {/* Reissue */}
                        <div>
                           <div className="flex items-center gap-2 mb-4">
                              <div className="w-1.5 h-4 bg-[#C9A84C] rounded-full" />
                              <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Date Change Fee</h4>
                           </div>
                           <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                              {legRules.filter(r => r.Type === "Reissue" || r.Type === 1).length > 0 ? (
                                legRules.filter(r => r.Type === "Reissue" || r.Type === 1).map((rule, i) => (
                                  <RuleRow key={i} rule={rule} index={i} />
                                ))
                              ) : (
                                <div className="p-6 flex flex-col gap-3 text-center bg-white">
                                   <p className="text-xs text-slate-400 font-bold italic">No date change rules found.</p>
                                   <button onClick={fetchFullRules} className="px-4 py-2 bg-slate-50 rounded-lg text-[10px] font-black text-[#C9A84C] uppercase tracking-widest hover:bg-[#C9A84C] hover:text-white transition-all shadow-xs border border-slate-100">
                                      Sync with Airline
                                   </button>
                                </div>
                              )}
                           </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* NO MINI RULES - SHOW FETCH BUTTON */
                <div className="bg-slate-50 rounded-[3rem] p-16 border border-dashed border-slate-200 text-center">
                  <div className="w-24 h-24 bg-white rounded-full shadow-lg flex items-center justify-center mx-auto mb-8 text-slate-200">
                    <AiOutlineInfoCircle size={48} />
                  </div>
                  <h3 className="text-xl font-black text-[#0A203E] mb-3">Fare Policies Not Available</h3>
                  <p className="text-sm text-slate-400 font-bold mb-10 max-w-sm mx-auto leading-relaxed">
                    Detailed cancellation and modification charges are not provided by the airline for this specific fare class in the initial search.
                  </p>
                  <button 
                    onClick={fetchFullRules}
                    className="px-12 py-4 bg-[#C9A84C] text-[#0A203E] rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-2xl shadow-[#C9A84C]/30 hover:brightness-110 transition-all active:scale-95 flex items-center gap-3 mx-auto"
                  >
                    <BiSolidOffer className="text-lg" />
                    Fetch Full Fare Rules
                  </button>
                </div>
              )}
              </div>
            )}
          </div>

        {/* Modal Footer */}
        <div className="px-8 py-6 border-t border-slate-100 bg-white flex justify-between items-center shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
           <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Summary:</span>
              <span className="text-2xl font-black text-[#0A203E]">₹{Math.ceil(fare?.PublishedFare).toLocaleString()}</span>
           </div>
           <button
             onClick={onClose}
             className="px-12 py-3.5 bg-[#0A203E] text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:brightness-110 shadow-xl shadow-[#0A203E]/20 transition-all active:scale-95"
           >
             Close Details
           </button>
        </div>
      </div>
    </div>
  );
}
