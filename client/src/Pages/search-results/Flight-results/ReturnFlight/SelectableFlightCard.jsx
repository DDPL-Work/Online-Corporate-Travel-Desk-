import React, { useState, useEffect } from "react";
import { MdAirlineSeatReclineNormal, MdOutlineFlight } from "react-icons/md";
import {
  airlineLogo,
  FLIGHT_STATUS_MAP,
  formatDate,
  formatTime,
  getJourneyDurationString,
} from "../../../../utils/formatter";
import { FlightDetailsModal } from "../FlightDetailsModal";

export default function SelectableFlightCard({
  group,
  selected,
  selectedFlight,
  onSelect,
  traceId,
}) {
  const defaultResultIndex = group.flightInfo.ResultIndex;
  const initialResultIndex =
    selected && selectedFlight
      ? selectedFlight.ResultIndex
      : defaultResultIndex;

  const [viewingResultIndex, setViewingResultIndex] =
    useState(initialResultIndex);
  const [showFlightDetails, setShowFlightDetails] = useState(false);

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
  
  const isCardActivelySelected =
    selected && selectedFlight?.ResultIndex === activeFlight.ResultIndex;

  const segments = activeFlight.Segments[0];
  const firstSegment = segments[0];
  const flightStatus =
    firstSegment?.FlightStatus || firstSegment?.Status || "Scheduled";
  const lastSegment = segments[segments.length - 1];

  const airline = firstSegment.Airline?.AirlineName;
  const airlineCode = firstSegment.Airline?.AirlineCode;
  const flightNumber = firstSegment.Airline?.FlightNumber;

  const from = firstSegment.Origin?.Airport?.CityName;
  const fromCountry = firstSegment.Origin?.Airport?.CountryName;
  const fromAirport = firstSegment.Origin?.Airport?.AirportCode || firstSegment.Origin?.Airport?.AirportName;
  const fromTerminal = firstSegment.Origin?.Airport?.Terminal;

  const to = lastSegment.Destination?.Airport?.CityName;
  const toCountry = lastSegment.Destination?.Airport?.CountryName;
  const toAirport = lastSegment.Destination?.Airport?.AirportCode || lastSegment.Destination?.Airport?.AirportName;
  const toTerminal = lastSegment.Destination?.Airport?.Terminal;

  const departure = formatTime(firstSegment.Origin?.DepTime);
  const arrival = formatTime(lastSegment.Destination?.ArrTime);

  const depTime = firstSegment.Origin?.DepTime;
  const arrTime = lastSegment.Destination?.ArrTime;

  const duration = getJourneyDurationString(segments);

  const stopCities = segments.slice(0, -1).map(s => s.Destination?.Airport?.AirportCode).filter(Boolean);
  const stops = segments.length === 1 
    ? "Non-stop" 
    : `${segments.length - 1} Stop${segments.length > 2 ? 's' : ''} ${stopCities.length ? `via ${stopCities.join(', ')}` : ''}`;

  const travelClass = group.fareOptions?.[0]?.supplierFareClass || "Economy";

  return (
    <div className={`w-full max-w-[1060px] mx-auto bg-linear-to-br from-white via-slate-50 to-white rounded-2xl transition-all duration-300 overflow-hidden ${
      selected
        ? "border-2 border-[#C9A84C] shadow-lg ring-2 ring-[#C9A84C]/10"
        : "border border-slate-200 hover:border-[#C9A84C]/50 hover:shadow-md"
    }`}>
      <div className="relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#C9A84C]/5 rounded-full blur-3xl -z-10"></div>

        <div className="p-3 sm:p-4 md:p-5">
          <div className="relative">
            {/* ── Header Row ── */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="relative shrink-0">
                  <img src={airlineLogo(airlineCode)}
                    alt={airline}
                    className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-xl shadow-md border-2 border-white object-contain"
                    loading="eager"
                    onError={(e) => {
                      e.currentTarget.src = "https://via.placeholder.com/64";
                    }}
                  />
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-[#C9A84C] rounded-full border-2 border-white"></div>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center flex-wrap gap-1.5">
                    <div className="font-bold text-slate-800 text-xs sm:text-sm md:text-base truncate max-w-[110px] sm:max-w-none">{airline}</div>
                    {flightStatus && (
                      <span
                        className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold whitespace-nowrap ${
                          FLIGHT_STATUS_MAP[flightStatus]?.className ||
                          FLIGHT_STATUS_MAP.Scheduled.className
                        }`}
                      >
                        {FLIGHT_STATUS_MAP[flightStatus]?.label || "Scheduled"}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] sm:text-xs text-slate-500 font-medium">
                    {airlineCode}-{flightNumber}
                  </div>
                </div>
              </div>

               <div className="flex flex-wrap gap-1.5 sm:gap-2 items-center">
                 {travelClass && (
                    <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 bg-slate-50 text-slate-700 text-[9px] sm:text-xs font-bold rounded-lg border border-slate-200 uppercase whitespace-nowrap">
                      <MdAirlineSeatReclineNormal className="text-[#C9A84C]" /> {travelClass}
                    </span>
                  )}
                 {firstSegment?.NoOfSeatAvailable !== undefined && firstSegment?.NoOfSeatAvailable !== null && (
                    <span className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 text-[9px] sm:text-xs font-bold rounded-lg border uppercase whitespace-nowrap ${
                      firstSegment.NoOfSeatAvailable <= 5
                        ? "bg-red-50 text-red-700 border-red-200"
                        : firstSegment.NoOfSeatAvailable <= 10
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }`}>
                      <MdAirlineSeatReclineNormal className="text-[12px] sm:text-[14px]" /> {firstSegment.NoOfSeatAvailable} Seats Left
                    </span>
                  )}
               </div>
            </div>

            {/* ── Flight Timeline ── */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-6 items-center">
              <div className="text-left space-y-0.5 min-w-0">
                <div className="text-base sm:text-xl md:text-2xl font-bold text-slate-800">
                  {departure}
                </div>
                <div className="text-[10px] sm:text-xs font-bold text-[#C9A84C]">
                  {formatDate(depTime)}
                </div>
                <div className="text-[11px] sm:text-sm font-semibold text-slate-700 mt-1 truncate">
                  {from}, {fromCountry}
                </div>
                <div className="text-[10px] sm:text-xs text-slate-500 truncate hidden sm:block">({fromAirport})</div>
                {fromTerminal && (
                  <div className="text-[9px] sm:text-[10px] font-black text-[#C9A84C] bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-200 inline-block mt-0.5 uppercase tracking-wider">
                    T-{fromTerminal}
                  </div>
                )}
              </div>

              <div className="flex flex-col items-center gap-1 sm:gap-2 px-1 sm:px-6">
                <div className="relative w-full mb-1 sm:mb-3">
                  <div className="h-0.5 bg-linear-to-r from-slate-200 via-[#C9A84C] to-slate-200 w-full max-w-16 sm:max-w-32 mx-auto"></div>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-1 sm:p-2 rounded-full shadow-md border border-slate-200">
                    <MdOutlineFlight className="text-[#C9A84C] text-sm sm:text-xl rotate-90" />
                  </div>
                </div>
                <div className="text-[10px] sm:text-xs font-semibold text-slate-600 whitespace-nowrap">
                  {duration}
                </div>
                <div className="px-1.5 sm:px-3 py-0.5 sm:py-1 bg-linear-to-r from-emerald-50 to-emerald-100 text-emerald-700 text-[9px] sm:text-xs font-bold rounded-full border border-emerald-200 text-center leading-tight">
                  {stops}
                </div>
              </div>

              <div className="text-right space-y-0.5 min-w-0">
                <div className="text-base sm:text-xl md:text-2xl font-bold text-slate-800">
                  {arrival}
                </div>
                <div className="text-[10px] sm:text-xs font-bold text-[#C9A84C]">
                  {formatDate(arrTime)}
                </div>
                <div className="text-[11px] sm:text-sm font-semibold text-slate-700 mt-1 truncate">
                  {to}, {toCountry}
                </div>
                <div className="text-[10px] sm:text-xs text-slate-500 truncate hidden sm:block">({toAirport})</div>
                {toTerminal && (
                  <div className="text-[9px] sm:text-[10px] font-black text-[#C9A84C] bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-200 inline-block mt-0.5 uppercase tracking-wider">
                    T-{toTerminal}
                  </div>
                )}
              </div>
            </div>

            {/* ── Fare Options ── */}
            <div className="mt-3 rounded-xl border border-slate-100 p-2 sm:p-3">
              <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Fare options
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5 sm:gap-2">
                {group.fareOptions.map((fare, index) => {
                  const isFareSelected = viewingResultIndex === fare.resultIndex;
                  const isLowest = index === 0;

                  return (
                    <button
                      key={`${fare.supplierFareClass}-${fare.resultIndex || index}`}
                      type="button"
                      onClick={() => setViewingResultIndex(fare.resultIndex)}
                      className={`rounded-lg border px-2.5 py-1.5 sm:px-3 sm:py-2 text-left transition ${
                        isFareSelected
                          ? "border-[#C9A84C] bg-slate-50 shadow-sm"
                          : "border-slate-200 bg-white hover:border-[#C9A84C]/50 hover:bg-slate-50"
                      }`}
                    >
                      <div className="text-[10px] sm:text-xs font-semibold text-slate-600">
                        {fare.supplierFareClass}
                      </div>
                      <div
                        className={`text-xs sm:text-sm font-bold ${
                          isFareSelected ? "text-[#C9A84C]" : "text-slate-800"
                        }`}
                      >
                        &#8377;{Math.ceil(fare.publishedFare).toLocaleString()}
                      </div>
                      {isLowest && (
                        <div className="text-[9px] sm:text-[10px] font-semibold text-emerald-600">
                          Lowest fare
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Bottom Action Row ── */}
            <div className="flex flex-wrap items-center justify-between gap-2 mt-2 sm:mt-1">
              <div className="flex flex-wrap gap-1.5 sm:gap-3">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setShowFlightDetails(true); }}
                  className={`inline-flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 text-[9px] sm:text-[11px] font-black rounded-xl border transition-all cursor-pointer uppercase tracking-widest shadow-sm whitespace-nowrap
                    ${
                      showFlightDetails
                        ? "bg-[#0A203E] text-white border-[#0A203E]"
                        : "bg-white text-slate-600 border-slate-200 hover:border-[#0A203E]/30 hover:text-[#0A203E]"
                    }`}
                >
                  Flight Details
                </button>
              </div>

              <div className="flex items-center gap-3">
                {isCardActivelySelected ? (
                  <div className="flex items-center gap-1.5 bg-[#C9A84C] text-[#0A203E] px-4 sm:px-8 py-2 sm:py-3 rounded-xl border border-[#C9A84C]/50 font-black text-[10px] sm:text-xs shadow-sm transition-all uppercase tracking-widest">
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
                    className="relative group px-4 sm:px-8 py-2 sm:py-3 bg-[#0A203E] hover:bg-[#1a3a5a] text-white rounded-xl font-black shadow-lg shadow-[#0A203E]/20 transition-all duration-300 hover:scale-[1.02] active:scale-95 uppercase tracking-widest text-[10px] sm:text-xs whitespace-nowrap cursor-pointer"
                  >
                    <span className="relative z-10">{selected ? "Update Fare" : "Select"}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <FlightDetailsModal
        isOpen={showFlightDetails}
        onClose={() => setShowFlightDetails(false)}
        selectedFlight={activeFlight}
        traceId={traceId}
      />
    </div>
  );
}

