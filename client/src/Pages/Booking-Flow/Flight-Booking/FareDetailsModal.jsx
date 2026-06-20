import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { IoClose } from "react-icons/io5";
import { AiOutlineInfoCircle } from "react-icons/ai";
import { FareRulesAccordion, FareOptions } from "./CommonComponents";
import { processFareRulesData } from "../../../utils/fareRulesParser";
import "./Fares.css";

/* ===========================
   Helpers
=========================== */

const formatCurrency = (v) =>
  typeof v === "number" ? `₹${v.toLocaleString("en-IN")}` : "—";

const getSegmentKey = (seg) =>
  `${seg.Origin.Airport.CityName}-${seg.Destination.Airport.CityName}`;

const getUnifiedResults = (fareQuote) => {
  if (fareQuote?.Response?.Results) {
    return Array.isArray(fareQuote.Response.Results) ? fareQuote.Response.Results[0] : fareQuote.Response.Results;
  }
  if (fareQuote?.onward?.Response?.Results && !fareQuote?.return) {
    const res = fareQuote.onward.Response.Results;
    return Array.isArray(res) ? res[0] : res;
  }
  return null;
};

const extractSegmentsFromFareQuote = (fareQuote) => {
  // ONE-WAY / MULTI-CITY
  const unified = getUnifiedResults(fareQuote);
  if (unified?.Segments) {
    return unified.Segments.flat();
  }

  // ROUND-TRIP
  const onwardRes = getUnifiedResults(fareQuote?.onward);
  const returnRes = getUnifiedResults(fareQuote?.return);
  
  const onwardSegs = onwardRes?.Segments?.flat() || [];
  const returnSegs = returnRes?.Segments?.flat() || [];

  return [...onwardSegs, ...returnSegs];
};

const extractAirlineRemark = (fareQuote) => {
  // ONE-WAY / MULTI-CITY
  const unified = getUnifiedResults(fareQuote);
  if (unified?.AirlineRemark) {
    return unified.AirlineRemark;
  }

  // ROUND-TRIP
  const onwardRes = getUnifiedResults(fareQuote?.onward);
  const returnRes = getUnifiedResults(fareQuote?.return);
  
  const onwardRemark = onwardRes?.AirlineRemark;
  const returnRemark = returnRes?.AirlineRemark;

  if (onwardRemark && returnRemark) return `${onwardRemark} | ${returnRemark}`;
  return onwardRemark || returnRemark || "";
};



/* ===========================
   Component
=========================== */

export const FareDetailsModal = ({
  fareQuote,
  fareRule,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("rules");

  const toggleModal = () => setIsOpen((v) => !v);

  const isRoundTrip = Boolean(fareQuote?.onward && fareQuote?.return);

  /* ===========================
     SEGMENT DATA
  =========================== */

  const segments = useMemo(
    () => extractSegmentsFromFareQuote(fareQuote),
    [fareQuote],
  );

  const fareColumns = useMemo(() => {
    // Determine the actual results object (handle both array and object formats)
    const unifiedResults = getUnifiedResults(fareQuote);

    // If it's a unified fare (One-Way, Multi-City, or International Round Trip)
    if (unifiedResults?.Fare) {
      const firstSeg = unifiedResults.Segments?.flat()?.[0];
      const lastSeg = unifiedResults.Segments?.flat()?.slice(-1)?.[0];
      return [{
        key: "unified",
        title: "Entire Itinerary",
        from: firstSeg?.Origin?.Airport?.CityName || "Origin",
        to: lastSeg?.Destination?.Airport?.CityName || "Destination",
        fare: unifiedResults.Fare,
        refundable: unifiedResults.IsRefundable,
        cabin: unifiedResults.Segments?.flat()?.[0]?.CabinClass || "Economy",
      }];
    }
    
    // If it's a split fare (Domestic Round Trip)
    if (fareQuote?.onward && fareQuote?.return) {
      const getRes = (q) => {
        const res = q?.Response?.Results;
        return Array.isArray(res) ? res[0] : res;
      };
      
      const oRes = getRes(fareQuote.onward);
      const rRes = getRes(fareQuote.return);
      
      const oFirst = oRes?.Segments?.flat()?.[0];
      const oLast = oRes?.Segments?.flat()?.slice(-1)?.[0];
      
      const rFirst = rRes?.Segments?.flat()?.[0];
      const rLast = rRes?.Segments?.flat()?.slice(-1)?.[0];
      
      return [
        {
          key: "onward",
          title: "Onward Journey",
          from: oFirst?.Origin?.Airport?.CityName || "Origin",
          to: oLast?.Destination?.Airport?.CityName || "Destination",
          fare: oRes?.Fare,
          refundable: oRes?.IsRefundable,
          cabin: oRes?.Segments?.flat()?.[0]?.CabinClass || "Economy",
        },
        {
          key: "return",
          title: "Return Journey",
          from: rFirst?.Origin?.Airport?.CityName || "Origin",
          to: rLast?.Destination?.Airport?.CityName || "Destination",
          fare: rRes?.Fare,
          refundable: rRes?.IsRefundable,
          cabin: rRes?.Segments?.flat()?.[0]?.CabinClass || "Economy",
        }
      ].filter(f => f.fare);
    }
    
    return [];
  }, [fareQuote]);

  const fareRows = useMemo(() => {
    return fareColumns.map((col) => {
      const fare = col.fare;
      return {
        base: fare?.BaseFare ?? fare?.PublishedFare ?? 0,
        tax: fare?.Tax ?? 0,
        total: fare?.PublishedFare ?? fare?.BaseFare + fare?.Tax,
        refundable: col.refundable ? "Yes" : "No",
        cabin: col.cabin || "Economy",
      };
    });
  }, [fareColumns]);

  /* ===========================
     RULES DATA
  =========================== */

  const onwardFareData = useMemo(() => {
     let rules = fareRule?.onward?.Response?.FareRules || fareRule?.Response?.FareRules || [];
     
     const unifiedRes = getUnifiedResults(fareQuote);
     let quote;
     if (unifiedRes) {
       quote = unifiedRes;
     } else if (fareQuote?.onward && fareQuote?.return) {
       const res = fareQuote.onward.Response?.Results;
       quote = Array.isArray(res) ? res[0] : res;
     } else {
       quote = [];
     }

     return processFareRulesData(rules, quote);
  }, [fareRule, fareQuote]);

  const returnFareData = useMemo(() => {
     if (!isRoundTrip) return [];
     let rules = fareRule?.return?.Response?.FareRules || [];
     
     let quote = [];
     if (fareQuote?.onward && fareQuote?.return) {
       const res = fareQuote.return.Response?.Results;
       quote = Array.isArray(res) ? res[0] : res;
     }
     
     return processFareRulesData(rules, quote);
  }, [isRoundTrip, fareRule, fareQuote]);

  /* ===========================
     UPSELL DATA
  =========================== */

  const upsellOptions = useMemo(() => {
    let options = [];
    
    // First, check unified results (One-Way, Multi-City, Int'l RT)
    const unifiedRes = getUnifiedResults(fareQuote);
    if (unifiedRes?.UpsellOptionsList?.UpsellList) {
      options = options.concat(unifiedRes.UpsellOptionsList.UpsellList);
    }
    
    // If not unified, check split fares (Domestic RT)
    if (!unifiedRes && fareQuote?.onward && fareQuote?.return) {
      const getRes = (q) => {
        const res = q?.Response?.Results;
        return Array.isArray(res) ? res[0] : res;
      };
      
      const oRes = getRes(fareQuote.onward);
      if (oRes?.UpsellOptionsList?.UpsellList) {
        options = options.concat(oRes.UpsellOptionsList.UpsellList);
      }
      
      const rRes = getRes(fareQuote.return);
      if (rRes?.UpsellOptionsList?.UpsellList) {
        options = options.concat(rRes.UpsellOptionsList.UpsellList);
      }
    }
    
    return options || [];
  }, [fareQuote]);

  return (
    <>
      {/* Trigger */}
      <button
        onClick={toggleModal}
        className="px-6 py-2.5 bg-[#0A203E] hover:brightness-110 text-white text-[11px] font-black rounded-xl shadow-lg shadow-[#0A203E]/20 transition-all uppercase tracking-widest"
      >
        View Fare Rules
      </button>

      {isOpen && createPortal(
        <div className="fixed inset-0 bg-[#0A203E]/60 backdrop-blur-md flex items-center justify-center z-[9999] animate-fadeIn sm:p-4">
          <div className="bg-white sm:rounded-[2rem] shadow-2xl w-full h-full sm:h-auto max-h-[100dvh] sm:max-h-[90vh] lg:max-w-5xl flex flex-col overflow-hidden border border-white/20">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 sm:px-8 sm:py-6 border-b border-slate-100 bg-white shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#C9A84C] rounded-2xl flex items-center justify-center shadow-lg shadow-[#C9A84C]/20">
                  <AiOutlineInfoCircle className="text-[#0A203E] text-2xl" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-[#0A203E] uppercase tracking-tight">Fare Details</h2>
                  <p className="text-[10px] text-[#C9A84C] font-black uppercase tracking-widest mt-0.5">Comprehensive pricing & rules</p>
                </div>
              </div>
              <button 
                onClick={toggleModal}
                className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors text-slate-400 hover:text-[#0A203E]"
              >
                <IoClose size={24} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex bg-slate-50/50 px-4 sm:px-8 border-b border-slate-100 shrink-0 overflow-x-auto custom-scrollbar">
              {[
                { id: "summary", label: "Fare Summary" },
                { id: "rules", label: "Fare Rules & Policies" },
                { id: "options", label: "Fare Options" },
                ...(upsellOptions.length > 0
                  ? [{ id: "upsell", label: "Upsell Features" }]
                  : []),
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`relative py-5 px-6 text-xs font-black uppercase tracking-widest transition-all ${
                    activeTab === t.id
                      ? "text-[#0A203E]"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  {t.label}
                  {activeTab === t.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#C9A84C] rounded-t-full shadow-[0_-2px_10px_rgba(201,168,76,0.5)]"></div>
                  )}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-white custom-scrollbar min-h-0 relative">
              {/* FARE SUMMARY TABLE */}
              {activeTab === "summary" && (
                <div className="bg-slate-50/30 rounded-3xl p-1 border border-slate-100">
                  <div className="overflow-x-auto rounded-[1.4rem]">
                    <table className="w-full text-sm border-separate border-spacing-0">
                      <thead>
                        <tr className="bg-[#0A203E]">
                          <th className="px-6 py-4 text-left text-[11px] font-black text-[#C9A84C] uppercase tracking-widest border-b border-[#C9A84C]/10 first:rounded-tl-2xl">Fare Component</th>
                          {fareColumns.map((c, idx) => (
                            <th
                              key={c.key}
                              className={`px-6 py-4 text-center text-[11px] font-black text-white uppercase tracking-widest border-b border-[#C9A84C]/10 ${idx === fareColumns.length - 1 ? 'rounded-tr-2xl' : ''}`}
                            >
                              <div className="flex flex-col items-center">
                                <span>{c.title}</span>
                                <span className="text-[9px] text-[#C9A84C] mt-0.5">{c.from} → {c.to}</span>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {[
                          { label: "Base Fare", key: "base" },
                          { label: "Taxes & Surcharges", key: "tax" },
                          { label: "Total Fare", key: "total", bold: true, highlight: true },
                          { label: "Refundable", key: "refundable" },
                          { label: "Cabin Class", key: "cabin" },
                        ].map((row, rIdx) => (
                          <tr key={row.key} className={`group ${row.highlight ? 'bg-[#0A203E]/5' : 'hover:bg-slate-50 transition-colors'}`}>
                            <td className={`px-6 py-5 font-bold text-slate-700 border-b border-slate-100 ${rIdx === 4 ? 'rounded-bl-2xl border-b-0' : ''}`}>
                              {row.label}
                            </td>
                            {fareRows.map((r, idx) => (
                              <td
                                key={idx}
                                className={`px-6 py-5 text-center border-b border-slate-100 ${row.bold ? "font-black text-[#0A203E] text-base" : "text-slate-600 font-semibold"} ${rIdx === 4 && idx === fareRows.length - 1 ? 'rounded-br-2xl border-b-0' : ''}`}
                              >
                                {row.key.includes("Fare") || row.key === "total"
                                  ? formatCurrency(r?.[row.key])
                                  : r?.[row.key] ?? "—"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* FARE RULES & POLICIES */}
              {activeTab === "rules" && (
                <div className="space-y-8">
                   <div className="bg-[#0A203E] rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-[#C9A84C]/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                      <h3 className="text-lg font-black uppercase tracking-widest mb-2">Policy Overview</h3>
                      <p className="text-xs text-[#C9A84C] font-bold">Standard airline regulations apply based on your selected fare class.</p>
                   </div>
                   {(() => {
                     const remark = extractAirlineRemark(fareQuote);
                     if (!remark) return null;
                     return (
                       <div className="bg-[#C9A84C]/10 border border-[#C9A84C]/30 p-5 rounded-2xl flex items-start gap-3.5 shadow-sm">
                         <div className="w-10 h-10 rounded-xl bg-[#C9A84C]/25 flex items-center justify-center text-[#0A203E] shrink-0">
                           <AiOutlineInfoCircle size={20} className="text-[#0A203E]" />
                         </div>
                         <div className="flex-1">
                           <h4 className="text-xs font-black text-[#0A203E] uppercase tracking-widest mb-1.5">Airline Remark</h4>
                           <div className="space-y-1.5 mt-1.5">
                             {remark.split(/,\s*/).map((item, idx) => <div key={idx} className="flex items-center gap-2 mt-1 first:mt-0"><span className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] shrink-0" /><span className="text-xs text-slate-700 font-bold">{item.replace(/Segment\s*(\d+)/gi, (m, n) => segments[parseInt(n, 10)] ? `${segments[parseInt(n, 10)].Origin?.Airport?.AirportCode || `Seg ${n}`} → ${segments[parseInt(n, 10)].Destination?.Airport?.AirportCode || ""}` : m)}</span></div>)}
                           </div>
                         </div>
                       </div>
                     );
                   })()}
                   <FareRulesAccordion parsedRules={onwardFareData} title={isRoundTrip ? "Onward Flight Fare Rules" : ""} />
                   {isRoundTrip && <FareRulesAccordion parsedRules={returnFareData} title="Return Flight Fare Rules" />}
                </div>
              )}

              {/* FARE OPTIONS */}
              {activeTab === "options" && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-4">
                     <div className="w-1.5 h-6 bg-[#C9A84C] rounded-full" />
                     <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Available Fare Classes</h4>
                  </div>
                  <FareOptions
                    fareRules={fareQuote?.Response?.Results || fareQuote?.onward?.Response?.Results}
                    fareRulesStatus={
                      fareQuote?.Response?.Results || fareQuote?.onward?.Response?.Results ? "succeeded" : "loading"
                    }
                  />
                </div>
              )}

              {/* UPSELL FEATURES */}
              {activeTab === "upsell" && upsellOptions.length > 0 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-4">
                     <div className="w-1.5 h-6 bg-[#C9A84C] rounded-full" />
                     <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Included Fare Features</h4>
                  </div>
                  <div className="space-y-6">
                    {upsellOptions.map((upsell, uIdx) => {
                      const included = upsell.ServicesList?.filter((s) => s.IsIncluded === "Yes" || s.IsChargeable === "No") || [];
                      const notIncluded = upsell.ServicesList?.filter((s) => s.IsIncluded === "No" && s.IsChargeable === "Yes") || [];

                      return (
                        <div key={uIdx} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                          <div className="bg-[#0A203E] px-6 py-4 flex items-center justify-between">
                            <div>
                              <h5 className="text-white font-bold text-lg">{upsell.FareFamilyName || "Selected Fare"}</h5>
                              {upsellOptions.length > 1 && (
                                <p className="text-[10px] text-[#C9A84C] uppercase tracking-widest font-bold mt-0.5">
                                  {upsell.FlightInfoIndex === "1" ? "Onward Journey" : upsell.FlightInfoIndex === "2" ? "Return Journey" : `Flight Index ${upsell.FlightInfoIndex}`}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Included */}
                            <div>
                              <h6 className="text-xs font-black text-emerald-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <span className="bg-emerald-100 text-emerald-600 rounded-full w-5 h-5 flex items-center justify-center text-[10px]">✓</span>
                                Included Features
                              </h6>
                              <div className="space-y-3">
                                {included.map((srv, sIdx) => {
                                  const parts = srv.UpsellDescription?.split("|") || [];
                                  return (
                                    <div key={sIdx} className="flex flex-col">
                                      <span className="text-sm font-bold text-slate-800">{parts[0]}</span>
                                      {parts[1] && <span className="text-xs text-slate-500 font-medium">{parts[1]}</span>}
                                    </div>
                                  );
                                })}
                                {included.length === 0 && <p className="text-xs text-slate-400">No specific features included.</p>}
                              </div>
                            </div>

                            {/* Chargeable */}
                            <div>
                              <h6 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <span className="bg-slate-100 text-slate-400 rounded-full w-5 h-5 flex items-center justify-center text-[10px]">+</span>
                                Chargeable / Not Included
                              </h6>
                              <div className="space-y-3">
                                {notIncluded.map((srv, sIdx) => {
                                  const parts = srv.UpsellDescription?.split("|") || [];
                                  return (
                                    <div key={sIdx} className="flex flex-col opacity-75">
                                      <span className="text-sm font-bold text-slate-600">{parts[0]}</span>
                                      {parts[1] && <span className="text-xs text-slate-400 font-medium">{parts[1]}</span>}
                                    </div>
                                  );
                                })}
                                {notIncluded.length === 0 && <p className="text-xs text-slate-400">All features included.</p>}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end px-6 py-4 sm:px-8 sm:py-6 border-t border-slate-100 bg-white shrink-0 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
              <button
                onClick={toggleModal}
                className="px-8 py-3 bg-[#0A203E] text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:brightness-110 shadow-lg shadow-[#0A203E]/20 transition-all active:scale-95"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
