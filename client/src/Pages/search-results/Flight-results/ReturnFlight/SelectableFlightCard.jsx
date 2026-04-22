import React, { useState, useEffect } from "react";
import { parseSingleJourney } from "../../../../utils/parseReturnFlight";
import { FlightSegment } from "./FlightSegment";
import { FlightDetailsDropdown } from "../One-wayFlightCard";

export default function SelectableFlightCard({ group, selected, selectedFlight, onSelect }) {
  const defaultResultIndex = group.flightInfo.ResultIndex;
  const initialResultIndex = (selected && selectedFlight) ? selectedFlight.ResultIndex : defaultResultIndex;
  
  const [viewingResultIndex, setViewingResultIndex] = useState(initialResultIndex);
  const [showDetails, setShowDetails] = useState(false);

  // Sync state if external selection changes to THIS card or AWAY from this card
  useEffect(() => {
    if (selected && selectedFlight) {
      setViewingResultIndex(selectedFlight.ResultIndex);
    } else if (!selected) {
      setViewingResultIndex(defaultResultIndex);
    }
  }, [selected, selectedFlight, defaultResultIndex]);

  const activeFlight = group.flightOptionsByResultIndex[viewingResultIndex] || group.flightInfo;
  const journey = parseSingleJourney(activeFlight.Segments[0]);
  const currentFare = Math.ceil(activeFlight.Fare?.PublishedFare);
  
  const isCardActivelySelected = selected && selectedFlight?.ResultIndex === activeFlight.ResultIndex;

  return (
    <div
      className={`bg-blue-100 rounded-lg transition-all duration-200 ${
        selected

          ? "border-2 border-emerald-500 shadow-lg ring-2 ring-green-200"
          : "border border-gray-200 hover:border-emerald-300 hover:shadow-md"
      }`}
    >
      <div className="p-5 relative border-b border-blue-50/50">
        <FlightSegment data={journey} fare={currentFare} selected={selected} />
        
        <div className="mt-4 flex items-center justify-end">
          {isCardActivelySelected ? (
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg border border-emerald-200 font-bold text-sm shadow-xs transition-all">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Selected
            </div>
          ) : (
            <button
              onClick={() => onSelect(activeFlight)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold text-sm shadow-md transition-all active:scale-95"
            >
              {selected ? "Update Fare" : "Select Flight"}
            </button>
          )}
        </div>
      </div>

      {/* Always Show View Details Toggle */}
      <div className="px-5 pb-2 pt-3 flex justify-between items-center bg-blue-50/10 border-t border-blue-50">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Flight Actions</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowDetails(!showDetails);
          }}
          className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-blue-100 transition-colors bg-white border border-blue-100 shadow-sm"
        >
          {showDetails ? "Hide Content ▲" : "View Details ▼"}
        </button>
      </div>

      {/* Expanded Flight Details Dropdown */}
      {showDetails && (
        <div className="border-t border-blue-200">
          <FlightDetailsDropdown selectedFlight={activeFlight} />
        </div>
      )}

      {/* Always Show Fare Options */}
      {group.fareOptions && group.fareOptions.length > 0 && (
        <div className="px-5 pb-3">
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-blue-100">
            {group.fareOptions.map((fare, idx) => {
              const isActiveLocal = viewingResultIndex === fare.resultIndex;
              return (
                <button
                  key={fare.resultIndex || idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewingResultIndex(fare.resultIndex);
                    setShowDetails(true); // Auto expand details so they actually see the difference
                  }}
                  className={`flex flex-col items-center justify-center px-4 py-2 rounded-xl border transition-all active:scale-95 ${
                    isActiveLocal
                      ? "bg-blue-500 text-white border-blue-600 shadow-md ring-2 ring-blue-200 ring-offset-1"
                      : "bg-white text-blue-800 border-blue-300 hover:border-blue-400 hover:bg-blue-50 shadow-sm"
                  }`}
                >
                  <span className="text-[11px] font-medium opacity-90 tracking-wide uppercase">{fare.supplierFareClass}</span>
                  <span className="text-[15px] font-bold mt-0.5">₹{Math.ceil(fare.publishedFare).toLocaleString()}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Selection Footer */}
      {selected && (
        <div className="px-5 -mt-6 pb-3 rounded-b-lg pointer-events-none">
          <div className="flex items-center justify-end">
            <div className="flex items-center gap-2 text-green-700 bg-white rounded-full">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
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
