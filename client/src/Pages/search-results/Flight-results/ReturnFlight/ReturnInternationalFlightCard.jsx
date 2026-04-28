//return international flight card
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MdOutlineFlight, MdAirlineSeatReclineNormal } from "react-icons/md";
import { BsSuitcase } from "react-icons/bs";
import { BiSolidOffer } from "react-icons/bi";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import { FlightDetailsDropdown } from "../One-wayFlightCard";
import {
  airlineLogo,
  FLIGHT_STATUS_MAP,
  formatDate,
  formatDuration,
  formatStops,
  formatTime,
  getCabinClassLabel,
  getStopsLabel,
  getTotalDuration,
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
  const [selectedResultIndex, setSelectedResultIndex] = useState(
    group.flightInfo.ResultIndex,
  );

  const flight =
    group.flightOptionsByResultIndex[selectedResultIndex] || group.flightInfo;

  const onward = flight?.Segments?.[0] || [];
  const ret = flight?.Segments?.[1] || [];
  if (!onward.length || !ret.length) return null;

  const finalPrice = Math.ceil(flight?.Fare?.PublishedFare ?? 0);
  const refundable = flight?.IsRefundable === true;
  const travelClass = getCabinClassLabel(flight?.Fare?.CabinClass ?? 2);

  const handleToggle = (key) =>
    setOpenSection(openSection === key ? null : key);

  const handleMoreFaresClick = async () => {
    if (selectedResultIndex == null) return;

    // ✅ STEP 1: OPEN TAB IMMEDIATELY (IMPORTANT)
    const newTab = window.open("/fare-upsell", "_blank");

    // ❗ If blocked → stop
    if (!newTab) {
      alert("Popup blocked! Please allow popups.");
      return;
    }

    // ✅ STEP 2: CALL API
    const res = await dispatch(
      getFareUpsell({
        traceId,
        resultIndex: selectedResultIndex,
      }),
    );

    // ✅ STEP 3: STORE DATA
    if (res?.payload) {
      localStorage.setItem(
        "fareUpsellPayload",
        JSON.stringify({
          fareUpsellData: res.payload,
          traceId,
          journeyType: 2,
        }),
      );

      // ✅ OPTIONAL: refresh tab after data ready
      newTab.location.reload();
    }
  };

  const renderFlightLeg = (segments, label) => {
    const firstSeg = segments[0];
    const lastSeg = segments[segments.length - 1];
    const airline = firstSeg?.Airline?.AirlineName;
    const airlineCode = firstSeg?.Airline?.AirlineCode;
    const flightNumber = firstSeg?.Airline?.FlightNumber;
    const from = firstSeg?.Origin?.Airport?.CityName;
    const to = lastSeg?.Destination?.Airport?.CityName;
    const flightStatus =
      firstSeg?.FlightStatus || firstSeg?.Status || "Scheduled";

    return (
      <div className="border border-slate-100 rounded-xl mb-3 overflow-hidden">
        {/* ---------- Basic Flight Info Header ---------- */}
        <div className="flex justify-between w-full items-center px-4 py-3 bg-slate-50/50 rounded-xl">
          <div className="flex items-center gap-3">
            <img
              src={airlineLogo(airlineCode)}
              alt={airline}
              className="w-10 h-10 border border-slate-200 rounded-lg object-contain bg-white p-1"
            />
            <div className="flex flex-col text-left">
              <div className="font-bold text-slate-800 text-sm">
                {from} → {to}
              </div>
              <div className="text-xs text-slate-500 font-medium">
                {airlineCode}-{flightNumber}
              </div>
              <div className="flex gap-2 mt-1">
                {firstSeg?.Origin?.Airport?.Terminal && (
                  <span className="text-[10px] font-black text-[#C9A84C] bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 uppercase tracking-wider">
                    T-{firstSeg.Origin.Airport.Terminal} (Dep)
                  </span>
                )}
                {lastSeg?.Destination?.Airport?.Terminal && (
                  <span className="text-[10px] font-black text-[#C9A84C] bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 uppercase tracking-wider">
                    T-{lastSeg.Destination.Airport.Terminal} (Arr)
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
             <div className="text-xs font-semibold text-slate-600 whitespace-nowrap">
                {formatDuration(getTotalDuration(segments))}
             </div>
             <p className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-200 uppercase tracking-wide">
                {getStopsLabel(segments)}
             </p>
          </div>
          <div className="text-right">
             <div className="text-sm font-bold text-slate-800">
                {formatTime(segments[0]?.Origin?.DepTime)} - {formatTime(segments[segments.length - 1]?.Destination?.ArrTime)}
             </div>
             <div className="text-xs font-semibold text-[#C9A84C]">
                <span className="bg-slate-100 px-2 py-0.5 rounded-full">{label}</span>
             </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-[1060px] bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm transition-all duration-300">
      <div className="p-6">
        {renderFlightLeg(onward, "Onward")}
        {renderFlightLeg(ret, "Return")}

        {/* Fare Options Selector */}
        {group.fareOptions && group.fareOptions.length > 0 && (
          <div className="mt-4 border-t border-gray-100 pt-5">
            <h4 className="text-sm font-semibold text-gray-800 mb-3">
              Select Fare Option:
            </h4>
            <div className="flex flex-wrap gap-3">
              {group.fareOptions.map((fare, idx) => {
                const isFareSelected = selectedResultIndex === fare.resultIndex;
                return (
                  <button
                    key={fare.resultIndex || idx}
                    onClick={() => setSelectedResultIndex(fare.resultIndex)}
                    className={`flex flex-col px-4 py-2 rounded-xl border transition-all ${
                      isFareSelected
                        ? "bg-[#C9A84C] border-[#C9A84C] text-[#0A203E] shadow-md transform scale-[1.02]"
                        : "bg-white border-slate-200 text-slate-800 hover:border-[#C9A84C]/50 hover:bg-slate-50"
                    }`}
                  >
                    <span
                      className={`text-[11px] font-extrabold tracking-wide uppercase ${isFareSelected ? "text-[#0A203E]/60" : "text-[#C9A84C]"}`}
                    >
                      {fare.supplierFareClass}
                    </span>
                    <span className="text-lg font-bold mt-0.5">
                      ₹{Math.ceil(fare.publishedFare).toLocaleString()}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mt-6 pt-5 border-t border-gray-100">
          <div className="text-left">
            <p className="text-2xl md:text-3xl font-extrabold text-[#0A203E] leading-none">
              ₹{finalPrice.toLocaleString()}
            </p>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1">
              Total (incl. taxes)
            </p>
          </div>

          <div className="flex items-center gap-2 md:gap-3 flex-wrap justify-end">
            {/* ✅ VIEW FARE DETAILS EXPLICITLY */}
            <button
              onClick={() => setShowFareDetails((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-xl border transition-colors ${
                showFareDetails
                  ? "bg-[#0A203E] text-white border-[#0A203E]"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              View Fare Details
              {showFareDetails ? (
                <FaChevronUp className="text-[10px]" />
              ) : (
                <FaChevronDown className="text-[10px]" />
              )}
            </button>

            {/* ✅ ONLY ONE MORE FARES BUTTON */}
            <button
              onClick={handleMoreFaresClick}
              className="inline-flex items-center gap-1.5 bg-slate-50 px-4 py-2 text-sm font-bold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 transition"
            >
              <BiSolidOffer className="text-[#C9A84C]" /> More Fares
            </button>

            {/* EXISTING BUTTON */}
            <button
              onClick={() => onContinue(flight)}
              className="relative group px-10 py-3.5 bg-[#C9A84C] text-[#0A203E] rounded-xl font-extrabold shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02] uppercase tracking-wider text-sm"
            >
              Select & Continue
            </button>
          </div>
        </div>
      </div>
      
      {/* Expanded Fare Details via Generic Dropdown */}
      {showFareDetails && (
        <div className="border-t border-slate-200">
          <FlightDetailsDropdown selectedFlight={flight} />
        </div>
      )}
    </div>
  );
}
