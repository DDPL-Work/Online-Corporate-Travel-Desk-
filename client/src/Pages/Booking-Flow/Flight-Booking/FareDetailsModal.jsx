import React, { useState, useMemo } from "react";
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

const extractSegmentsFromFareQuote = (fareQuote) => {
  // ONE-WAY
  if (fareQuote?.Response?.Results?.Segments) {
    return fareQuote.Response.Results.Segments.flat();
  }

  // ROUND-TRIP
  const onwardSegs =
    fareQuote?.onward?.Response?.Results?.Segments?.flat() || [];
  const returnSegs =
    fareQuote?.return?.Response?.Results?.Segments?.flat() || [];

  return [...onwardSegs, ...returnSegs];
};

const extractFareFromQuote = (fareQuote, index) => {
  // Per-segment fare is usually SAME for all segments
  if (fareQuote?.Response?.Results?.Fare) {
    return fareQuote.Response.Results.Fare;
  }

  const onwardFare = fareQuote?.onward?.Response?.Results?.Fare;
  const returnFare = fareQuote?.return?.Response?.Results?.Fare;

  if (onwardFare && !returnFare) return onwardFare;
  if (returnFare && !onwardFare) return returnFare;

  if (onwardFare && returnFare) {
    const onwardSegCount =
      fareQuote?.onward?.Response?.Results?.Segments?.flat?.()?.length || 0;
    return index < onwardSegCount ? onwardFare : returnFare;
  }

  return null;
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

  const segmentColumns = useMemo(
    () =>
      segments.map((seg) => ({
        key: getSegmentKey(seg),
        from: seg.Origin.Airport.CityName,
        to: seg.Destination.Airport.CityName,
      })),
    [segments],
  );

  const fareRows = useMemo(() => {
    return segmentColumns.map((_, idx) => {
      const fare = extractFareFromQuote(fareQuote, idx);
      if (!fare) return null;

      return {
        base: fare.BaseFare ?? fare.PublishedFare ?? 0,
        tax: fare.Tax ?? 0,
        total: fare.PublishedFare ?? fare.BaseFare + fare.Tax,
        refundable: fare.Refundable ? "Yes" : "No",
        cabin: fare.CabinClass || "Economy",
      };
    });
  }, [fareQuote, segmentColumns]);

  /* ===========================
     RULES DATA
  =========================== */

  const onwardFareData = useMemo(() => {
     let rules = fareRule?.onward?.Response?.FareRules || fareRule?.Response?.FareRules || [];
     let quote = fareQuote?.onward?.Response?.Results || fareQuote?.Response?.Results || [];
     return processFareRulesData(rules, quote);
  }, [fareRule, fareQuote]);

  const returnFareData = useMemo(() => {
     if (!isRoundTrip) return [];
     let rules = fareRule?.return?.Response?.FareRules || [];
     let quote = fareQuote?.return?.Response?.Results || [];
     return processFareRulesData(rules, quote);
  }, [fareRule, fareQuote, isRoundTrip]);

  return (
    <>
      {/* Trigger */}
      <button
        onClick={toggleModal}
        className="px-6 py-2.5 bg-[#0A203E] hover:brightness-110 text-white text-[11px] font-black rounded-xl shadow-lg shadow-[#0A203E]/20 transition-all uppercase tracking-widest"
      >
        View Fare Rules
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-[#0A203E]/60 backdrop-blur-md flex items-center justify-center z-50 animate-fadeIn p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-white/20">
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 bg-white">
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
            <div className="flex bg-slate-50/50 px-8 border-b border-slate-100">
              {[
                { id: "summary", label: "Fare Summary" },
                { id: "rules", label: "Fare Rules & Policies" },
                { id: "options", label: "Fare Options" },
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
            <div className="flex-1 overflow-y-auto p-8 bg-white custom-scrollbar">
              {/* FARE SUMMARY TABLE */}
              {activeTab === "summary" && (
                <div className="bg-slate-50/30 rounded-3xl p-1 border border-slate-100">
                  <div className="overflow-x-auto rounded-[1.4rem]">
                    <table className="w-full text-sm border-separate border-spacing-0">
                      <thead>
                        <tr className="bg-[#0A203E]">
                          <th className="px-6 py-4 text-left text-[11px] font-black text-[#C9A84C] uppercase tracking-widest border-b border-[#C9A84C]/10 first:rounded-tl-2xl">Fare Component</th>
                          {segmentColumns.map((c, idx) => (
                            <th
                              key={c.key}
                              className={`px-6 py-4 text-center text-[11px] font-black text-white uppercase tracking-widest border-b border-[#C9A84C]/10 ${idx === segmentColumns.length - 1 ? 'rounded-tr-2xl' : ''}`}
                            >
                              {c.from} <span className="text-[#C9A84C] mx-1">→</span> {c.to}
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
            </div>

            {/* Footer */}
            <div className="flex justify-end px-8 py-6 border-t border-slate-100 bg-white">
              <button
                onClick={toggleModal}
                className="px-8 py-3 bg-[#0A203E] text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:brightness-110 shadow-lg shadow-[#0A203E]/20 transition-all active:scale-95"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
