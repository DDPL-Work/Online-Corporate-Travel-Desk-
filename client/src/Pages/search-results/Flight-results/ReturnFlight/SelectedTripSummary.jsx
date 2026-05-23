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
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between gap-10">
          {/* LEFT: FLIGHT DETAILS */}
          <div className="flex items-center gap-10 flex-1">
            {/* ONWARD */}
            {onwardData && (
              <div className="flex items-center gap-4">
                <img src={airlineLogo(onwardData.airlineCode)}
                  alt={onwardData.airline}
                  className="w-9 h-9 object-contain" loading="eager" />
                <div>
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-800 uppercase tracking-wider">
                    <span>{onwardData.fromCode}</span>
                    <MdOutlineFlight className="text-[#C9A84C] rotate-90" />
                    <span>{onwardData.toCode}</span>
                  </div>

                  <div className="text-[10px] text-slate-500 font-medium uppercase tracking-widest mt-0.5">
                    {onwardData.airline} · {onwardData.flightNo}
                  </div>
                  <div className="text-[11px] text-[#0A203E] font-bold mt-1">
                    {formatTime(onwardData.depTime)} – {formatTime(onwardData.arrTime)}
                    <span className="text-slate-400 font-medium ml-2 border-l border-slate-200 pl-2">
                      {formatDate(onwardData.depTime)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* DIVIDER */}
            {onwardData && returnData && (
              <div className="h-10 w-px bg-slate-200"></div>
            )}

            {/* RETURN */}
            {returnData ? (
              <div className="flex items-center gap-4">
                <img src={airlineLogo(returnData.airlineCode)}
                  alt={returnData.airline}
                  className="w-9 h-9 object-contain" loading="eager" />

                <div>
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-800 uppercase tracking-wider">
                    <span>{returnData.fromCode}</span>
                    <MdOutlineFlight className="text-[#C9A84C] rotate-90" />
                    <span>{returnData.toCode}</span>
                  </div>

                  <div className="text-[10px] text-slate-500 font-medium uppercase tracking-widest mt-0.5">
                    {returnData.airline} · {returnData.flightNo}
                  </div>

                  <div className="text-[11px] text-[#0A203E] font-bold mt-1">
                    {formatTime(returnData.depTime)} – {formatTime(returnData.arrTime)}
                    <span className="text-slate-400 font-medium ml-2 border-l border-slate-200 pl-2">
                      {formatDate(returnData.depTime)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-[#C9A84C] font-bold bg-slate-50 px-6 py-2.5 rounded-xl border border-[#C9A84C]/20 uppercase tracking-widest animate-pulse">
                Select return flight to continue
              </div>
            )}
          </div>

          {/* RIGHT: PRICE + CTA */}
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Payable</div>
              <div className="text-2xl font-black text-[#0A203E]">
                ₹{totalFare.toLocaleString("en-IN")}
              </div>
            </div>

            <button
              disabled={!ret || isLoadingMoreFares}
              onClick={async () => {
                if (!ret || isLoadingMoreFares) return;
                const newTab = window.open("/fare-upsell", "_blank");
                setIsLoadingMoreFares(true);
                try {
                  const isDomesticRoundTrip =
                    onward?.Segments?.[0]?.length === 1 &&
                    ret?.Segments?.[0]?.length === 1;

                  // ✅ CASE 1: DOMESTIC ROUND TRIP → DUAL API
                  if (isDomesticRoundTrip) {
                    if (!onward?.ResultIndex || !ret?.ResultIndex) {
                      if (newTab) newTab.close();
                      return;
                    }

                    const onwardRes = await dispatch(
                      getFareUpsell({
                        traceId,
                        resultIndex: onward.ResultIndex,
                      }),
                    );

                    const returnRes = await dispatch(
                      getFareUpsell({
                        traceId,
                        resultIndex: ret.ResultIndex,
                      }),
                    );

                    const onwardErr = onwardRes.payload?.Response;
                    const returnErr = returnRes.payload?.Response;

                    const onwardBlocked = onwardErr && (
                      Number(onwardErr.ResponseStatus) === 2 ||
                      (onwardErr.Error && onwardErr.Error.ErrorCode !== undefined && onwardErr.Error.ErrorCode !== 0)
                    );
                    const returnBlocked = returnErr && (
                      Number(returnErr.ResponseStatus) === 2 ||
                      (returnErr.Error && returnErr.Error.ErrorCode !== undefined && returnErr.Error.ErrorCode !== 0)
                    );

                    // If both fail or are not allowed, block navigation
                    if (onwardBlocked && returnBlocked) {
                      if (newTab) newTab.close();
                      Swal.fire({
                        title: "Fare Options",
                        text: onwardErr?.Error?.ErrorMessage || "No extra fare options are available for this flight.",
                        icon: "info",
                        confirmButtonColor: "#0A203E",
                      });
                      return;
                    }

                    localStorage.setItem(
                      "fareUpsellPayload",
                      JSON.stringify({
                        onward: onwardRes.payload,
                        return: returnRes.payload,
                        traceId,
                        journeyType: 2,
                        type: "domesticRT", // 🔥 IMPORTANT FLAG
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
              className={`px-6 py-3 font-black rounded-xl border uppercase tracking-widest text-xs transition-all ${
                isLoadingMoreFares
                  ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
                  : "bg-white text-slate-600 border-slate-200 hover:text-[#0A203E] hover:border-[#0A203E]/30 cursor-pointer"
              }`}
            >
              {isLoadingMoreFares ? (
                <>
                  <span className="inline-block animate-spin w-3 h-3 border-2 border-slate-400 border-t-slate-600 rounded-full mr-1.5" />
                  Loading...
                </>
              ) : (
                "More Fares"
              )}
            </button>

            <button
              disabled={!ret}
              onClick={onContinue}
              className="px-12 py-3 bg-[#0A203E] text-white text-lg font-black rounded-xl
                disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed
                hover:brightness-110 active:scale-95 transition-all
                shadow-lg hover:shadow-[#0A203E]/20 disabled:shadow-none uppercase tracking-widest text-xs"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
