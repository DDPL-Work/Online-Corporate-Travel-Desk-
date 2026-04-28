import React, { useState, useEffect } from "react";
import { parseSingleJourney } from "../../../../utils/parseReturnFlight";
import { FlightSegment } from "./FlightSegment";
import { FlightDetailsDropdown } from "../One-wayFlightCard";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";

export default function SelectableFlightCard({
  group,
  selected,
  selectedFlight,
  onSelect,
}) {
  const defaultResultIndex = group.flightInfo.ResultIndex;
  const initialResultIndex =
    selected && selectedFlight
      ? selectedFlight.ResultIndex
      : defaultResultIndex;

  const [viewingResultIndex, setViewingResultIndex] =
    useState(initialResultIndex);
  const [showDetails, setShowDetails] = useState(false);

  // Sync state if external selection changes to THIS card or AWAY from this card
  useEffect(() => {
    if (selected && selectedFlight) {
      setViewingResultIndex(selectedFlight.ResultIndex);
    } else if (!selected) {
      setViewingResultIndex(defaultResultIndex);
    }
  }, [selected, selectedFlight, defaultResultIndex]);

  const activeFlight =
    group.flightOptionsByResultIndex[viewingResultIndex] || group.flightInfo;
  const journey = parseSingleJourney(activeFlight.Segments[0]);
  const currentFare = Math.ceil(activeFlight.Fare?.PublishedFare);

  const isCardActivelySelected =
    selected && selectedFlight?.ResultIndex === activeFlight.ResultIndex;

  const actionButtonNode = (
    <div className="shrink-0 flex items-center justify-end">
      {isCardActivelySelected ? (
        <div className="flex items-center gap-1.5 bg-[#C9A84C] text-[#0A203E] px-3 py-1.5 rounded-md border border-[#C9A84C]/50 font-bold text-[11px] shadow-sm transition-all uppercase tracking-wider">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          Selected
        </div>
      ) : (
        <button
          onClick={() => onSelect(activeFlight)}
          className="bg-[#0A203E] hover:bg-[#1a3a5a] text-white px-5 py-1.5 rounded-md font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
        >
          {selected ? "Update Fare" : "Select"}
        </button>
      )}
    </div>
  );

  return (
    <div
      className={`bg-slate-50/50 rounded-lg transition-all duration-200 ${
        selected
          ? "border-2 border-[#C9A84C] shadow-lg ring-2 ring-[#C9A84C]/10"
          : "border border-slate-200 hover:border-[#C9A84C]/50 hover:shadow-md"
      }`}
    >
      <div className="p-3 pb-3 relative border-b border-slate-200/50">
        <FlightSegment 
          data={journey} 
          fare={currentFare} 
          selected={selected} 
        />
      </div>

      {/* Always Show Fare Options (Card Style) */}
      {group.fareOptions && group.fareOptions.length > 0 ? (
        <div className="px-5 pb-4 bg-white/20">
          <div className="pt-3 flex justify-between items-end gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">
                Fare options
              </p>
              <div className="flex flex-wrap gap-2">
                {group.fareOptions.map((fare, index) => {
                  const isActiveLocal = viewingResultIndex === fare.resultIndex;
                  const isLowest = index === 0;

                  return (
                    <button
                      key={`${fare.supplierFareClass}-${fare.resultIndex || index}`}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewingResultIndex(fare.resultIndex);
                        setShowDetails(true);
                      }}
                      className={`rounded-lg border px-3 py-2 text-left transition ${
                        isActiveLocal
                          ? "border-[#C9A84C] bg-white shadow-sm ring-1 ring-[#C9A84C]/20"
                          : "border-slate-200 bg-white hover:border-[#C9A84C]/30 hover:bg-slate-50"
                      }`}
                    >
                      <div className="text-xs font-semibold text-slate-600">
                        {fare.supplierFareClass}
                      </div>
                      <div
                        className={`text-sm font-bold mt-0.5 ${
                          isActiveLocal ? "text-[#C9A84C]" : "text-slate-800"
                        }`}
                      >
                        &#8377;{Math.ceil(fare.publishedFare).toLocaleString()}
                      </div>
                      {isLowest && (
                        <div className="text-[10px] font-semibold text-emerald-600 mt-0.5">
                          Lowest fare
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            
            {actionButtonNode}
          </div>
        </div>
      ) : (
        <div className="px-5 pb-4 pt-3 flex justify-end bg-transparent">
          {actionButtonNode}
        </div>
      )}

      {/* View Details Toggle */}
      <div className="px-5 pb-3 pt-3 flex justify-end items-center bg-slate-50/50 border-t border-slate-200">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowDetails(!showDetails);
          }}
          className="text-xs font-bold text-slate-700 hover:text-[#C9A84C] flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-slate-100 transition-colors bg-white border border-slate-200 shadow-sm cursor-pointer"
        >
          {showDetails ? (
            <>Hide Details <FaChevronUp className="text-[10px]" /></>
          ) : (
            <>View Details <FaChevronDown className="text-[10px]" /></>
          )}
        </button>
      </div>

      {/* Expanded Flight Details Dropdown */}
      {showDetails && (
        <div className="border-t border-slate-200 bg-white">
          <FlightDetailsDropdown selectedFlight={activeFlight} />
        </div>
      )}

      {/* Selection Footer */}
      {selected && (
        <div className="px-5 -mt-5 pb-2 rounded-b-lg pointer-events-none">
          <div className="flex items-center justify-end">
            <div className="flex items-center gap-2 text-[#C9A84C] bg-white rounded-full shadow-sm">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
