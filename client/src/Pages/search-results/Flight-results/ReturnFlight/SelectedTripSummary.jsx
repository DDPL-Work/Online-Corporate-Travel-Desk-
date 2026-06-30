// SelectedTripSummary.jsx (Enhanced – MakeMyTrip Style)
import { MdOutlineFlight } from "react-icons/md";
import { useState } from "react";
import { createPortal } from "react-dom";
import Swal from "sweetalert2";
import {
  airlineLogo,
  formatDate,
  formatTime,
  CABIN_MAP,
} from "../../../../utils/formatter";
import { useDispatch, useSelector } from "react-redux";
import { getFareUpsell } from "../../../../Redux/Actions/flight.thunks";

const getJourney = (flight) => {
  const segs = flight?.Segments?.[0];
  if (!segs || !segs.length) return null;

  const first = segs[0];
  const last = segs[segs.length - 1];

  return {
    airline: first.Airline.AirlineName,
    airlineCode: first.Airline.AirlineCode,
    flightNo: `${first.Airline.AirlineCode}-${first.Airline.FlightNumber}`,
    fromCode: first.Origin.Airport.AirportCode,
    toCode: last.Destination.Airport.AirportCode,
    depTime: first.Origin.DepTime,
    arrTime: last.Destination.ArrTime,
    supplierFareClass: first.SupplierFareClass || "Standard",
    cabinClass: CABIN_MAP?.[first.CabinClass] || "Economy",
    fromTerminal: first.Origin.Airport.Terminal,
    toTerminal: last.Destination.Airport.Terminal,
    stops: segs.length - 1,
    stopCities: segs
      .slice(0, -1)
      .map((s) => s.Destination?.Airport?.AirportCode)
      .filter(Boolean),
  };
};

export default function SelectedTripSummary({ onward, ret, onContinue }) {
  const dispatch = useDispatch();
  const { traceId, journeyType } = useSelector((state) => state.flights);
  const [isLoadingMoreFares, setIsLoadingMoreFares] = useState(false);

  if (!onward) return null;

  const onwardData = getJourney(onward);
  const returnData = ret ? getJourney(ret) : null;

  const onwardFare = Math.ceil(onward?.Fare?.PublishedFare) || 0;
  const returnFare = Math.ceil(ret?.Fare?.PublishedFare) || 0;
  const totalFare = onwardFare + returnFare;

  return createPortal(
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 lg:gap-10 w-full overflow-hidden">
          {/* LEFT: FLIGHT DETAILS */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 md:gap-10 flex-1 min-w-0">
            {/* ONWARD */}
            {onwardData && (
              <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
                <img src={airlineLogo(onwardData.airlineCode)}
                  alt={onwardData.airline}
                  className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 object-contain shrink-0" loading="eager" />
                <div className="min-w-0 w-full">
                  <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wider">
                    <span className="truncate">{onwardData.fromCode}</span>
                    <MdOutlineFlight className="text-[#C9A84C] rotate-90 text-sm sm:text-base shrink-0" />
                    <span className="truncate">{onwardData.toCode}</span>
                  </div>

                  <div className="text-[9px] sm:text-[10px] text-slate-500 font-medium uppercase tracking-widest mt-0.5 truncate">
                    {onwardData.airline} · {onwardData.flightNo}
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-[#0A203E] font-bold mt-1 flex flex-wrap items-center gap-1">
                    <span className="whitespace-nowrap">{formatTime(onwardData.depTime)} – {formatTime(onwardData.arrTime)}</span>
                    <span className="text-slate-400 font-medium sm:ml-2 sm:border-l sm:border-slate-200 sm:pl-2 whitespace-nowrap">
                      {formatDate(onwardData.depTime)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* DIVIDER */}
            {onwardData && returnData && (
              <div className="hidden sm:block h-10 w-px bg-slate-200 shrink-0"></div>
            )}

            {/* RETURN */}
            {returnData ? (
              <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
                <img src={airlineLogo(returnData.airlineCode)}
                  alt={returnData.airline}
                  className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 object-contain shrink-0" loading="eager" />

                <div className="min-w-0 w-full">
                  <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wider">
                    <span className="truncate">{returnData.fromCode}</span>
                    <MdOutlineFlight className="text-[#C9A84C] rotate-90 text-sm sm:text-base shrink-0" />
                    <span className="truncate">{returnData.toCode}</span>
                  </div>

                  <div className="text-[9px] sm:text-[10px] text-slate-500 font-medium uppercase tracking-widest mt-0.5 truncate">
                    {returnData.airline} · {returnData.flightNo}
                  </div>

                  <div className="text-[10px] sm:text-[11px] text-[#0A203E] font-bold mt-1 flex flex-wrap items-center gap-1">
                    <span className="whitespace-nowrap">{formatTime(returnData.depTime)} – {formatTime(returnData.arrTime)}</span>
                    <span className="text-slate-400 font-medium sm:ml-2 sm:border-l sm:border-slate-200 sm:pl-2 whitespace-nowrap">
                      {formatDate(returnData.depTime)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-[10px] sm:text-sm text-[#C9A84C] font-bold bg-slate-50 px-3 sm:px-6 py-2 sm:py-2.5 rounded-xl border border-[#C9A84C]/20 uppercase tracking-widest animate-pulse truncate w-full text-center sm:text-left">
                Select return flight
              </div>
            )}
          </div>

          {/* RIGHT: PRICE + CTA */}
          <div className="flex flex-row items-center justify-between sm:justify-end gap-3 sm:gap-4 md:gap-6 shrink-0 w-full lg:w-auto">
            <div className="text-left sm:text-right shrink-0">
              <div className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Payable</div>
              <div className="text-lg sm:text-xl md:text-2xl font-black text-[#0A203E] whitespace-nowrap">
                ₹{totalFare.toLocaleString("en-IN")}
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                disabled={!ret || isLoadingMoreFares}
                onClick={async () => {
                  if (!ret || isLoadingMoreFares) return;
                  const newTab = window.open("/fare-upsell", "_blank");
                  setIsLoadingMoreFares(true);
                  try {
                    // ✅ CASE 1: DOMESTIC ROUND TRIP -> Fetch Combined Fare Upsell
                    if (Number(journeyType) === 2) {
                      if (!onward.ResultIndex || !ret.ResultIndex) {
                        if (newTab) newTab.close();
                        return;
                      }

                      const combinedResultIndex = `${onward.ResultIndex},${ret.ResultIndex}`;
                      
                      const combinedRes = await dispatch(
                        getFareUpsell({
                          traceId,
                          resultIndex: combinedResultIndex,
                        }),
                      );

                      const payloadData = combinedRes.payload;

                      let isBlocked = false;
                      let errorMessage = "No extra fare options are available for this flight.";

                      if (payloadData?.isSplitResponse) {
                        const onwardErr = payloadData.onward?.Response;
                        const returnErr = payloadData.return?.Response;

                        const isOnwardBlocked = onwardErr && (
                          Number(onwardErr.ResponseStatus) === 2 ||
                          (onwardErr.Error && onwardErr.Error.ErrorCode !== undefined && onwardErr.Error.ErrorCode !== 0)
                        );
                        
                        const isReturnBlocked = returnErr && (
                          Number(returnErr.ResponseStatus) === 2 ||
                          (returnErr.Error && returnErr.Error.ErrorCode !== undefined && returnErr.Error.ErrorCode !== 0)
                        );

                        if (isOnwardBlocked || isReturnBlocked) {
                           isBlocked = true;
                           errorMessage = onwardErr?.Error?.ErrorMessage || returnErr?.Error?.ErrorMessage || errorMessage;
                        }
                      } else {
                        const combinedErr = payloadData?.Response;
                        isBlocked = combinedErr && (
                          Number(combinedErr.ResponseStatus) === 2 ||
                          (combinedErr.Error && combinedErr.Error.ErrorCode !== undefined && combinedErr.Error.ErrorCode !== 0)
                        );
                        if (isBlocked) errorMessage = combinedErr?.Error?.ErrorMessage || errorMessage;
                      }

                      // If blocked
                      if (isBlocked) {
                        if (newTab) newTab.close();
                        Swal.fire({
                          title: "Fare Options",
                          text: errorMessage,
                          icon: "info",
                          confirmButtonColor: "#0A203E",
                        });
                        return;
                      }

                      localStorage.setItem(
                        "fareUpsellPayload",
                        JSON.stringify({
                          fareUpsellData: payloadData,
                          traceId,
                          journeyType: 2,
                          type: payloadData?.isSplitResponse ? "domesticRT" : "combinedRT",
                        }),
                      );
                    }

                    // ✅ CASE 2: ALL OTHER → KEEP OLD FLOW
                    else {
                      const res = await dispatch(
                        getFareUpsell({
                          traceId,
                          resultIndex: onward.ResultIndex,
                        }),
                      );

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
                          journeyType,
                        }),
                      );
                    }
                  } catch (e) {
                    if (newTab) newTab.close();
                  } finally {
                    setIsLoadingMoreFares(false);
                  }
                }}
                className={`px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 font-black rounded-xl border uppercase tracking-widest text-[10px] sm:text-xs transition-all whitespace-nowrap ${
                  isLoadingMoreFares
                    ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
                    : "bg-white text-slate-600 border-slate-200 hover:text-[#0A203E] hover:border-[#0A203E]/30 cursor-pointer"
                }`}
              >
                {isLoadingMoreFares ? (
                  <>
                    <span className="inline-block animate-spin w-3 h-3 border-2 border-slate-400 border-t-slate-600 rounded-full mr-1.5" />
                    <span className="hidden xs:inline">Loading...</span>
                  </>
                ) : (
                  <>
                    <span className="sm:hidden">Fares</span>
                    <span className="hidden sm:inline">More Fares</span>
                  </>
                )}
              </button>

              <button
                disabled={!ret}
                onClick={onContinue}
                className="px-4 sm:px-8 md:px-12 py-2 sm:py-2.5 md:py-3 bg-[#0A203E] text-white text-[10px] sm:text-base md:text-lg font-black rounded-xl
                  disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed
                  hover:brightness-110 active:scale-95 transition-all
                  shadow-lg hover:shadow-[#0A203E]/20 disabled:shadow-none uppercase tracking-widest whitespace-nowrap shrink-0"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}