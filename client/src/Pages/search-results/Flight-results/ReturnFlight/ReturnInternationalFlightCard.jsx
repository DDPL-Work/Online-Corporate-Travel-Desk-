//return international flight card
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MdOutlineFlight, MdAirlineSeatReclineNormal } from "react-icons/md";
import { BsSuitcase } from "react-icons/bs";
import { BiSolidOffer } from "react-icons/bi";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
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

export default function ReturnInternationalFlightCard({ group, onContinue }) {
  const [openSection, setOpenSection] = useState(null);
  const [selectedResultIndex, setSelectedResultIndex] = useState(group.flightInfo.ResultIndex);

  const flight = group.flightOptionsByResultIndex[selectedResultIndex] || group.flightInfo;

  const onward = flight?.Segments?.[0] || [];
  const ret = flight?.Segments?.[1] || [];
  if (!onward.length || !ret.length) return null;

  const finalPrice = Math.ceil(flight?.Fare?.PublishedFare ?? 0);
  const refundable = flight?.IsRefundable === true;
  const travelClass = getCabinClassLabel(flight?.Fare?.CabinClass ?? 2);

  const handleToggle = (key) =>
    setOpenSection(openSection === key ? null : key);

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
      <div className="border border-blue-100 rounded-xl mb-4">
        {/* ---------- Collapsible Header ---------- */}
        <button
          onClick={() => handleToggle(label)}
          className="flex justify-between w-full items-center px-4 py-1.5 bg-blue-50/40 hover:bg-blue-100/40 rounded-t-xl transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <img
              src={airlineLogo(airlineCode)}
              alt={airline}
              className="w-8 h-8 border border-gray-200 rounded-md object-contain"
            />
            <div className="flex flex-col text-left">
              <div className="font-medium text-gray-800">
                {from} → {to}
              </div>
              <div className="text-xs text-gray-500">
                {airlineCode}-{flightNumber}
              </div>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                FLIGHT_STATUS_MAP[flightStatus]?.className ||
                FLIGHT_STATUS_MAP.Scheduled.className
              }`}
            >
              {FLIGHT_STATUS_MAP[flightStatus]?.label || "Scheduled"}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-semibold text-blue-700 text-sm">{label}</span>
            {openSection === label ? (
              <FaChevronUp className="text-blue-600" />
            ) : (
              <FaChevronDown className="text-blue-600" />
            )}
          </div>
        </button>

        {/* ---------- Expanded Flight Details ---------- */}
        {openSection === label && (
          <div className="p-4 bg-white rounded-b-xl space-y-6">
            {(() => {
              const firstSeg = segments[0];
              const lastSeg = segments[segments.length - 1];
              const from = firstSeg?.Origin?.Airport?.CityName;
              const to = lastSeg?.Destination?.Airport?.CityName;
              const dep = firstSeg?.Origin?.DepTime;
              const arr = lastSeg?.Destination?.ArrTime;
              const totalDurationMin = getTotalDuration(segments);
              const stopsLabel = getStopsLabel(segments);

              return (
                <div className="border-b border-gray-100 pb-4 last:border-none">
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-6">
                    {/* Departure */}
                    <div className="text-left">
                      <div className="text-lg font-bold text-slate-800">
                        {formatTime(dep)}
                      </div>
                      <div className="text-xs font-medium text-blue-600">
                        {formatDate(dep)}
                      </div>
                      <div className="text-sm font-semibold text-slate-700 mt-2">
                        {from}
                      </div>
                    </div>

                    {/* Middle */}
                    <div className="flex flex-col items-center gap-1">
                      <div className="relative w-full mb-2">
                        <div className="h-0.5 bg-linear-to-r from-blue-200 via-blue-400 to-blue-200 w-32"></div>
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-1 rounded-full shadow-md border border-blue-200">
                          <MdOutlineFlight className="text-blue-600 rotate-90 text-lg" />
                        </div>
                      </div>
                      <p className="text-xs font-medium text-slate-600">
                        {formatDuration(totalDurationMin)}
                      </p>
                      <p className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-semibold rounded-full border border-emerald-200">
                        {stopsLabel}
                      </p>
                    </div>

                    {/* Arrival */}
                    <div className="text-right">
                      <div className="text-lg font-bold text-slate-800">
                        {formatTime(arr)}
                      </div>
                      <div className="text-xs font-medium text-blue-600">
                        {formatDate(arr)}
                      </div>
                      <div className="text-sm font-semibold text-slate-700 mt-2">
                        {to}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ---------- Tags ---------- */}
            <div className="flex flex-wrap gap-2 mt-3">
              {travelClass && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg border border-blue-200 uppercase">
                  <MdAirlineSeatReclineNormal /> {travelClass}
                </span>
              )}
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200">
                <BsSuitcase /> {segments[0]?.Baggage || "15 Kg"}
              </span>
              {refundable && (
                <span className="inline-flex items-center px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-200">
                  ✓ Refundable
                </span>
              )}
              <div className="inline-flex items-center gap-1.5 bg-blue-50 px-3 py-1.5 text-xs font-semibold rounded-lg border border-blue-200 text-blue-600">
                <BiSolidOffer /> {group.fareOptions?.length || 1} Fare Options
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-[1060px] bg-white border border-blue-200 rounded-2xl overflow-hidden shadow-sm transition-all duration-300">
      <div className="p-6">
        {renderFlightLeg(onward, "Onward")}
        {renderFlightLeg(ret, "Return")}

        {/* Fare Options Selector */}
        {group.fareOptions && group.fareOptions.length > 0 && (
          <div className="mt-4 border-t border-gray-100 pt-5">
            <h4 className="text-sm font-semibold text-gray-800 mb-3">Select Fare Option:</h4>
            <div className="flex flex-wrap gap-3">
              {group.fareOptions.map((fare, idx) => {
                const isFareSelected = selectedResultIndex === fare.resultIndex;
                return (
                  <button
                    key={fare.resultIndex || idx}
                    onClick={() => setSelectedResultIndex(fare.resultIndex)}
                    className={`flex flex-col px-4 py-2 rounded-xl border transition-all ${
                      isFareSelected
                        ? "bg-blue-600 border-blue-600 text-white shadow-md transform scale-[1.02]"
                        : "bg-white border-blue-200 text-blue-800 hover:border-blue-400 hover:bg-blue-50"
                    }`}
                  >
                    <span className={`text-[11px] font-semibold tracking-wide uppercase ${isFareSelected ? 'text-blue-100' : 'text-blue-600'}`}>
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

        <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-100">
          <div className="text-left">
            <p className="text-3xl font-bold bg-linear-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
              ₹{finalPrice.toLocaleString()}
            </p>
            <p className="text-xs text-slate-600 mt-1 font-medium">
              Total (incl. taxes)
            </p>
          </div>
          <button
            onClick={() => onContinue(flight)}
            className="relative group px-8 py-3 bg-linear-to-r from-blue-600 to-blue-500 text-white rounded-xl font-semibold shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02]"
          >
            Select & Continue
          </button>
        </div>
      </div>
    </div>
  );
}
