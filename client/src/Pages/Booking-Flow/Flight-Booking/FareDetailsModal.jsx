import React, { useState, useMemo } from "react";
import { IoClose } from "react-icons/io5";
import { AiOutlineInfoCircle } from "react-icons/ai";
import { FareOptions, FareRulesAccordion } from "./CommonComponents";
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
  // We still map segment-wise for UI clarity
  if (fareQuote?.Response?.Results?.Fare)
    return fareQuote.Response.Results.Fare;

  if (fareQuote?.onward && fareQuote?.return) {
    return index < fareQuote.onward.Response.Results.Segments.flat().length
      ? fareQuote.onward.Response.Results.Fare
      : fareQuote.return.Response.Results.Fare;
  }

  return null;
};

/* ===========================
   Component
=========================== */

export const FareDetailsModal = ({
  fareQuote,
  fareRule,
  normalizeFareRules,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("summary");

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
     RULES DATA (shared logic)
  =========================== */

  const resolvedFareRule = isRoundTrip ? fareRule?.onward : fareRule;

  return (
    <>
      {/* Trigger */}
      <button
        onClick={toggleModal}
        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow"
      >
        View Fare Rules
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl mx-4 max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-linear-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <AiOutlineInfoCircle className="text-blue-600" />
                Fare Details
              </div>
              <button onClick={toggleModal}>
                <IoClose size={22} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b">
              {[
                { id: "summary", label: "Fare Summary" },
                { id: "rules", label: "Fare Rules" },
                { id: "options", label: "Charges & Policies" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex-1 py-3 text-sm font-medium ${
                    activeTab === t.id
                      ? "border-b-2 border-blue-600 text-blue-700"
                      : "text-gray-600 hover:text-blue-600"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              {/* =======================
                 FARE SUMMARY TABLE
              ======================= */}
              {activeTab === "summary" && (
                <div className="overflow-x-auto bg-white rounded-xl border">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left">Fare Component</th>
                        {segmentColumns.map((c) => (
                          <th
                            key={c.key}
                            className="px-4 py-3 text-center font-semibold"
                          >
                            {c.from} → {c.to}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: "Base Fare", key: "base" },
                        { label: "Taxes", key: "tax" },
                        { label: "Total Fare", key: "total", bold: true },
                        { label: "Refundable", key: "refundable" },
                        { label: "Cabin Class", key: "cabin" },
                      ].map((row) => (
                        <tr key={row.key} className="border-t">
                          <td className="px-4 py-3 font-medium">
                            {row.label}
                          </td>
                          {fareRows.map((r, idx) => (
                            <td
                              key={idx}
                              className={`px-4 py-3 text-center ${
                                row.bold ? "font-semibold" : ""
                              }`}
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
              )}

              {/* =======================
                 FARE RULES
              ======================= */}
              {activeTab === "rules" && (
                <FareRulesAccordion
                  fareRules={normalizeFareRules(resolvedFareRule)}
                  fareRulesStatus={resolvedFareRule ? "succeeded" : "loading"}
                />
              )}

              {/* =======================
                 OPTIONS
              ======================= */}
              {activeTab === "options" && (
                <FareOptions
                  fareRules={
                    fareQuote?.Response?.Results ||
                    fareQuote?.onward?.Response?.Results
                  }
                  fareRulesStatus="succeeded"
                />
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end p-4 border-t bg-white">
              <button
                onClick={toggleModal}
                className="px-5 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
