// SelectedTripSummary.jsx (Enhanced – MakeMyTrip Style)
import { MdOutlineFlight } from "react-icons/md";
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
  if (!onward) return null;

  const onwardData = getJourney(onward);
  const returnData = ret ? getJourney(ret) : null;

  const onwardFare = Math.ceil(onward?.Fare?.PublishedFare) || 0;
  const returnFare = Math.ceil(ret?.Fare?.PublishedFare) || 0;
  const totalFare = onwardFare + returnFare;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-50">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between gap-10">
          {/* LEFT: FLIGHT DETAILS */}
          <div className="flex items-center gap-10 flex-1">
            {/* ONWARD */}
            {onwardData && (
              <div className="flex items-center gap-4">
                <img
                  src={airlineLogo(onwardData.airlineCode)}
                  alt={onwardData.airline}
                  className="w-9 h-9 object-contain"
                />

                <div>
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-800 uppercase tracking-wider">
                    <span>{onwardData.fromCode}</span>
                    <MdOutlineFlight className="text-[#C9A84C] rotate-90" />
                    <span>{onwardData.toCode}</span>
                  </div>

                  <div className="text-xs text-gray-500 mt-0.5">
                    {onwardData.airline} · {onwardData.flightNo}
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5 font-medium">
                    {formatDate(onwardData.depTime)} ·{" "}
                    <span className="text-[#0A203E] font-bold">{formatTime(onwardData.depTime)}</span> –{" "}
                    <span className="text-[#0A203E] font-bold">{formatTime(onwardData.arrTime)}</span>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {onwardData.fromTerminal && (
                      <span className="px-1.5 py-0.5 bg-slate-50 text-slate-600 text-[9px] font-bold uppercase rounded border border-slate-200">
                        T-{onwardData.fromTerminal} (Dep)
                      </span>
                    )}
                    {onwardData.toTerminal && (
                      <span className="px-1.5 py-0.5 bg-slate-50 text-slate-600 text-[9px] font-bold uppercase rounded border border-slate-200">
                        T-{onwardData.toTerminal} (Arr)
                      </span>
                    )}
                    {onwardData.stops > 0 && (
                      <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 text-[9px] font-bold uppercase rounded border border-amber-100">
                        {onwardData.stops} Stop{onwardData.stops > 1 ? "s" : ""}{" "}
                        {onwardData.stopCities?.length > 0
                          ? `via ${onwardData.stopCities.join(", ")}`
                          : ""}
                      </span>
                    )}
                    <span className="px-1.5 py-0.5 bg-slate-50 text-slate-600 text-[9px] font-bold uppercase rounded border border-slate-200">
                      CLASS: {onwardData.cabinClass}
                    </span>
                    <span className="px-1.5 py-0.5 bg-slate-100 text-[#C9A84C] text-[9px] font-black uppercase rounded border border-slate-200">
                      FARE: {onwardData.supplierFareClass}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* DIVIDER */}
            {onwardData && returnData && (
              <div className="h-12 w-px bg-slate-200"></div>
            )}

            {/* RETURN */}
            {returnData ? (
              <div className="flex items-center gap-4">
                <img
                  src={airlineLogo(returnData.airlineCode)}
                  alt={returnData.airline}
                  className="w-9 h-9 object-contain"
                />

                <div>
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-800 uppercase tracking-wider">
                    <span>{returnData.fromCode}</span>
                    <MdOutlineFlight className="text-[#C9A84C] rotate-90" />
                    <span>{returnData.toCode}</span>
                  </div>

                  <div className="text-xs text-gray-500 mt-0.5">
                    {returnData.airline} · {returnData.flightNo}
                  </div>

                  <div className="text-xs text-slate-600 mt-0.5 font-medium">
                    {formatDate(returnData.depTime)} ·{" "}
                    <span className="text-[#0A203E] font-bold">{formatTime(returnData.depTime)}</span> –{" "}
                    <span className="text-[#0A203E] font-bold">{formatTime(returnData.arrTime)}</span>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {returnData.fromTerminal && (
                      <span className="px-1.5 py-0.5 bg-slate-50 text-slate-600 text-[9px] font-bold uppercase rounded border border-slate-200">
                        T-{returnData.fromTerminal} (Dep)
                      </span>
                    )}
                    {returnData.toTerminal && (
                      <span className="px-1.5 py-0.5 bg-slate-50 text-slate-600 text-[9px] font-bold uppercase rounded border border-slate-200">
                        T-{returnData.toTerminal} (Arr)
                      </span>
                    )}
                    {returnData.stops > 0 && (
                      <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 text-[9px] font-bold uppercase rounded border border-amber-100">
                        {returnData.stops} Stop{returnData.stops > 1 ? "s" : ""}{" "}
                        {returnData.stopCities?.length > 0
                          ? `via ${returnData.stopCities.join(", ")}`
                          : ""}
                      </span>
                    )}
                    <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-bold uppercase rounded border border-slate-200">
                      CLASS: {returnData.cabinClass}
                    </span>
                    <span className="px-1.5 py-0.5 bg-slate-100 text-[#C9A84C] text-[9px] font-black uppercase rounded border border-slate-200">
                      FARE: {returnData.supplierFareClass}
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
              disabled={!ret}
              onClick={async () => {
                console.log("CLICK WORKING");
                const isDomesticRoundTrip =
                  onward?.Segments?.[0]?.length === 1 &&
                  ret?.Segments?.[0]?.length === 1;

                // ✅ CASE 1: DOMESTIC ROUND TRIP → DUAL API
                if (isDomesticRoundTrip) {
                  if (!onward?.ResultIndex || !ret?.ResultIndex) return;

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

                  window.open("/fare-upsell", "_blank");
                }

                // ✅ CASE 2: ALL OTHER → KEEP OLD FLOW
                else {
                  const res = await dispatch(
                    getFareUpsell({
                      traceId,
                      resultIndex: onward.ResultIndex,
                    }),
                  );

                  localStorage.setItem(
                    "fareUpsellPayload",
                    JSON.stringify({
                      fareUpsellData: res.payload,
                      traceId,
                      journeyType,
                    }),
                  );

                  window.open("/fare-upsell", "_blank");
                }
              }}
              className="px-6 py-3 bg-white text-slate-600 font-black rounded-xl border border-slate-200 hover:text-[#0A203E] hover:border-[#0A203E]/30 transition-all cursor-pointer disabled:opacity-50 uppercase tracking-widest text-xs"
            >
              More Fares
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
    </div>
  );
}
