import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MdOutlineFlight, MdAirlineSeatReclineNormal } from "react-icons/md";
import { BiSolidOffer } from "react-icons/bi";
import Swal from "sweetalert2";

import { FlightDetailsModal } from "../FlightDetailsModal";
import {
  airlineLogo,
  FLIGHT_STATUS_MAP,
  formatDate,
  formatDuration,
  formatTime,
  getCabinClassLabel,
} from "../../../../utils/formatter";
import { useDispatch } from "react-redux";
import { getFareUpsell } from "../../../../Redux/Actions/flight.thunks";

export default function ReturnInternationalFlightCard({
  group,
  onContinue,
  traceId,
  onOpenFareUpsell,
}) {
  const dispatch = useDispatch();
  const [showFareDetails, setShowFareDetails] = useState(false);
  const [isLoadingMoreFares, setIsLoadingMoreFares] = useState(false);
  const [selectedResultIndex, setSelectedResultIndex] = useState(
    group.flightInfo.ResultIndex,
  );

  const flight =
    group.flightOptionsByResultIndex[selectedResultIndex] || group.flightInfo;

  const onward = flight?.Segments?.[0] || [];
  const ret = flight?.Segments?.[1] || [];
  if (!onward.length || !ret.length) return null;

  const finalPrice = Math.ceil(flight?.Fare?.PublishedFare ?? 0);
  const travelClass = getCabinClassLabel(flight?.Fare?.CabinClass ?? 2);

  const handleMoreFaresClick = async () => {
    if (selectedResultIndex == null || isLoadingMoreFares) return;

    setIsLoadingMoreFares(true);
    try {
      const newTab = window.open("/fare-upsell", "_blank");

      if (!newTab) {
        alert("Popup blocked! Please allow popups.");
        return;
      }

      const res = await dispatch(
        getFareUpsell({
          traceId,
          resultIndex: selectedResultIndex,
        }),
      );

      if (res?.payload) {
        const errorResponse = res.payload?.Response;
        const isBlocked = errorResponse && (
          Number(errorResponse.ResponseStatus) === 2 ||
          (errorResponse.Error && errorResponse.Error.ErrorCode !== undefined && errorResponse.Error.ErrorCode !== 0)
        );
        if (isBlocked) {
          if (newTab) newTab.close();
          Swal.fire({
            title: "Fare Options",
            text: errorResponse?.Error?.ErrorMessage || "No extra fare options are available for this flight.",
            icon: "info",
            confirmButtonColor: "#0A203E",
          });
          return;
        }

        localStorage.setItem(
          "fareUpsellPayload",
          JSON.stringify({
            fareUpsellData: res.payload,
            traceId,
            journeyType: 2,
          }),
        );

        if (newTab) newTab.location.reload();
      } else {
        if (newTab) newTab.close();
      }
    } finally {
      setIsLoadingMoreFares(false);
    }
  };

  const renderFlightLeg = (segments, label, isLast) => {
    const firstSeg = segments[0];
    const lastSeg = segments[segments.length - 1];
    const airline = firstSeg?.Airline?.AirlineName;
    const airlineCode = firstSeg?.Airline?.AirlineCode;
    const flightNumber = firstSeg?.Airline?.FlightNumber;
    const from = firstSeg?.Origin?.Airport?.CityName;
    const fromCode = firstSeg?.Origin?.Airport?.AirportCode;

    const to = lastSeg?.Destination?.Airport?.CityName;
    const toCode = lastSeg?.Destination?.Airport?.AirportCode;

    const departure = formatTime(firstSeg?.Origin?.DepTime);
    const arrival = formatTime(lastSeg?.Destination?.ArrTime);
    const depDate = formatDate(firstSeg?.Origin?.DepTime);
    const arrDate = formatDate(lastSeg?.Destination?.ArrTime);

    const durationMin = segments.reduce((sum, s) => sum + (s.Duration || 0), 0);
    const duration = `${Math.floor(durationMin / 60)}h ${durationMin % 60}m`;

    const stopCities = segments.slice(0, -1).map(s => s.Destination?.Airport?.AirportCode).filter(Boolean);
    const stops = segments.length === 1 
      ? "Non-stop" 
      : `${segments.length - 1} Stop${segments.length > 2 ? 's' : ''} ${stopCities.length ? `via ${stopCities.join(', ')}` : ''}`;

    return (
      <div className={`relative py-3 sm:py-4 ${!isLast ? "border-b border-slate-100" : ""}`}>
        {/* Header Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="relative shrink-0">
              <img src={airlineLogo(airlineCode)}
                alt={airline}
                className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg shadow-sm border border-slate-100 object-contain bg-white"
                loading="lazy"
                onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/32"; }}
              />
            </div>
            <div className="min-w-0 flex items-center flex-wrap gap-1.5">
              <div className="font-bold text-slate-700 text-[11px] sm:text-xs truncate">{airline}</div>
              <div className="text-[10px] text-slate-500 font-medium">
                {airlineCode}-{flightNumber}
              </div>
              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-bold uppercase tracking-wider ml-1">
                {label}
              </span>
            </div>
          </div>
        </div>

        {/* Flight Timeline */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-3 sm:gap-6 items-center">
          {/* Departure */}
          <div className="text-left min-w-0">
            <div className="text-sm sm:text-lg font-bold text-slate-800">{departure}</div>
            <div className="text-[9px] sm:text-[10px] font-bold text-[#C9A84C]">{depDate}</div>
            <div className="text-[10px] sm:text-xs font-semibold text-slate-600 mt-0.5 truncate">{from} <span className="hidden sm:inline">({fromCode})</span></div>
          </div>

          {/* Duration & Stops */}
          <div className="flex flex-col items-center px-2 sm:px-4 w-full min-w-[100px] sm:min-w-[140px]">
            <div className="text-[9px] sm:text-[10px] font-semibold text-slate-500 mb-1">{duration}</div>
            <div className="relative w-full flex items-center justify-center">
              <div className="absolute w-full h-[1px] bg-slate-200"></div>
              <div className="relative z-10 bg-white px-1 text-[#C9A84C]">
                <MdOutlineFlight className="rotate-90 text-[14px] sm:text-[16px]" />
              </div>
            </div>
            <div className="text-[9px] sm:text-[10px] font-bold text-emerald-600 mt-1">{stops}</div>
          </div>

          {/* Arrival */}
          <div className="text-right min-w-0">
            <div className="text-sm sm:text-lg font-bold text-slate-800">{arrival}</div>
            <div className="text-[9px] sm:text-[10px] font-bold text-[#C9A84C]">{arrDate}</div>
            <div className="text-[10px] sm:text-xs font-semibold text-slate-600 mt-0.5 truncate">{to} <span className="hidden sm:inline">({toCode})</span></div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-[1060px] mx-auto bg-linear-to-br from-white via-slate-50 to-white border border-slate-200 rounded-2xl transition-all duration-300 overflow-hidden shadow-sm hover:shadow-md">
      <div className="relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#C9A84C]/5 rounded-full blur-3xl -z-10"></div>

        <div className="p-3 sm:p-4 md:p-5">
          {/* Flight Legs */}
          <div className="flex flex-col">
            {renderFlightLeg(onward, "Onward", false)}
            {renderFlightLeg(ret, "Return", true)}
          </div>

          {/* Fare Options Selector */}
          {group.fareOptions && group.fareOptions.length > 0 && (
            <div className="mt-3 rounded-xl border border-slate-100 p-2 sm:p-3">
              <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Fare options
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5 sm:gap-2">
                {group.fareOptions.map((fare, idx) => {
                  const isFareSelected = selectedResultIndex === fare.resultIndex;
                  return (
                    <button
                      key={fare.resultIndex || idx}
                      onClick={() => setSelectedResultIndex(fare.resultIndex)}
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
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bottom Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-100">
            <div className="flex flex-wrap gap-1.5 sm:gap-3">
              <button
                type="button"
                onClick={() => setShowFareDetails((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 text-[9px] sm:text-[11px] font-black rounded-xl border transition-all cursor-pointer uppercase tracking-widest shadow-sm whitespace-nowrap
                  ${
                    showFareDetails
                      ? "bg-[#0A203E] text-white border-[#0A203E]"
                      : "bg-white text-slate-600 border-slate-200 hover:border-[#0A203E]/30 hover:text-[#0A203E]"
                  }`}
              >
                Flight Details
              </button>

              <button
                onClick={handleMoreFaresClick}
                disabled={isLoadingMoreFares}
                className={`flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 text-[9px] sm:text-[11px] font-black rounded-xl border uppercase tracking-widest shadow-sm transition-all whitespace-nowrap ${
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
              <div className="text-right mr-2 hidden sm:block">
                <p className="text-lg md:text-xl font-extrabold text-[#0A203E] leading-none">
                  &#8377;{finalPrice.toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => onContinue(flight)}
                className="relative group px-4 sm:px-8 py-2 sm:py-3 bg-[#C9A84C] text-[#0A203E] rounded-xl font-black shadow-lg shadow-[#C9A84C]/20 transition-all duration-300 hover:scale-[1.02] active:scale-95 uppercase tracking-widest text-[10px] sm:text-xs whitespace-nowrap"
              >
                <span className="relative z-10">Select & Continue</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <FlightDetailsModal 
        isOpen={showFareDetails}
        onClose={() => setShowFareDetails(false)}
        selectedFlight={flight} 
        traceId={traceId}
      />
    </div>
  );
}
