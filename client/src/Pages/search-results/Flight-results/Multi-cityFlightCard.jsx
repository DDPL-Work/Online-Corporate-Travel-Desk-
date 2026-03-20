//src/Pages/search-results/Flight-results/Multi-cityFlightCard.jsx
import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { MdOutlineFlight, MdAirlineSeatReclineNormal } from "react-icons/md";
import { BsSuitcase } from "react-icons/bs";
import { BiSolidOffer } from "react-icons/bi";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import {
  airlineLogo,
  FLIGHT_STATUS_MAP,
  formatDate,
  formatTime,
} from "../../../utils/formatter";
import { getFareUpsell } from "../../../Redux/Actions/flight.thunks";

export default function MultiCityFlightCard({
  segments = [],
  fare,
  traceId,
  onOpenFareUpsell,
  travelClass,
  resultIndex,
}) {
  const [openIndex, setOpenIndex] = useState(-1);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  if (!Array.isArray(segments) || segments.length === 0) return null;

  // Normalize → each leg is always an array
  const legs = useMemo(
    () => segments.map((leg) => (Array.isArray(leg) ? leg : [leg])),
    [segments],
  );

  // ---------------- PRICE CALCULATION ----------------
  const totalDuration = useMemo(() => {
    return legs.reduce(
      (sum, leg) => sum + leg.reduce((d, s) => d + (s.Duration || 0), 0),
      0,
    );
  }, [legs]);

  const totalPrice = fare?.OfferedFare || fare?.PublishedFare || 0;

  const getLegPrice = (leg) => {
    if (!totalDuration || !totalPrice) return 0;
    const legDuration = leg.reduce((d, s) => d + (s.Duration || 0), 0);
    return Math.round((legDuration / totalDuration) * totalPrice);
  };

  // ----------------------------------------------------------

  const handleFareOptionsClick = async (resultIndex) => {
    if (!traceId || !resultIndex) return;

    const res = await dispatch(getFareUpsell({ traceId, resultIndex }));

    if (res?.payload && onOpenFareUpsell) {
      onOpenFareUpsell(res.payload);
    }
  };

  // ---------------------------------------------------

  return (
    <div className="max-w-[1060px] bg-linear-to-br from-white via-blue-50/40 to-white border border-blue-200 rounded-2xl transition-all duration-300 overflow-hidden shadow-sm">
      <div className="relative p-6">
        {/* Each Flight Leg */}
        {legs.map((segments, i) => {
          if (!segments.length) return null;

          const firstSegment = segments[0];
          const lastSegment = segments[segments.length - 1];
          const airline = firstSegment.Airline?.AirlineName;
          const airlineCode = firstSegment.Airline?.AirlineCode;
          const flightNumber = firstSegment.Airline?.FlightNumber;

          const depTime = firstSegment.Origin?.DepTime;
          const arrTime = lastSegment.Destination?.ArrTime;

          const from = firstSegment.Origin?.Airport?.CityName;
          const to = lastSegment.Destination?.Airport?.CityName;

          const durationMin = segments.reduce(
            (sum, s) => sum + (s.Duration || 0),
            0,
          );
          const duration = `${Math.floor(durationMin / 60)}h ${
            durationMin % 60
          }m`;
          const stops =
            segments.length === 1 ? "Non-stop" : `${segments.length - 1} Stop`;

          const price = getLegPrice(segments);
          const baggage = segments[0]?.Baggage || "15 Kg";
          const refundable = segments[0]?.IsRefundable;
          const flightStatus =
            firstSegment?.FlightStatus || firstSegment?.Status || "Scheduled";

          return (
            <div key={i} className="border border-blue-100 rounded-xl mb-4">
              <button
                onClick={() => setOpenIndex(openIndex === i ? -1 : i)}
                className="flex justify-between w-full items-center px-4 py-1.5 bg-blue-50/40 hover:bg-blue-100/40 rounded-t-xl transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={airlineLogo(airlineCode)}
                    alt={airline}
                    className="w-8 h-8 border border-gray-200 rounded-md object-contain"
                  />
                  <div className="flex  flex-col text-left">
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
                  {/* <span className="text-sm text-gray-600">{duration}</span> */}
                  <span className="font-semibold text-blue-700">
                    ₹{price.toLocaleString()}
                  </span>
                  {openIndex === i ? (
                    <FaChevronUp className="text-blue-600" />
                  ) : (
                    <FaChevronDown className="text-blue-600" />
                  )}
                </div>
              </button>

              {openIndex === i && (
                <div className="p-4 space-y-4 bg-white rounded-b-xl">
                  {/* Flight Timing */}
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-6 mt-3">
                    <div className="text-left space-y-1">
                      <div className="text-lg font-bold text-slate-800">
                        {formatTime(depTime)}
                      </div>
                      <div className="text-xs font-medium text-blue-600">
                        {formatDate(depTime)}
                      </div>
                      <div className="text-sm font-semibold text-slate-700 mt-2">
                        {from}
                      </div>
                    </div>

                    <div className="flex flex-col items-center gap-2">
                      <div className="relative w-full mb-3">
                        <div className="h-0.5 bg-linear-to-r from-blue-200 via-blue-400 to-blue-200 w-32"></div>
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-2 rounded-full shadow-md border border-blue-200">
                          <MdOutlineFlight className="text-blue-600 text-lg rotate-90" />
                        </div>
                      </div>
                      <div className="text-xs font-semibold text-slate-600 whitespace-nowrap">
                        {duration}
                      </div>
                      <div className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">
                        {stops}
                      </div>
                    </div>

                    <div className="text-right space-y-1">
                      <div className="text-lg font-bold text-slate-800">
                        {formatTime(arrTime)}
                      </div>
                      <div className="text-xs font-medium text-blue-600">
                        {formatDate(arrTime)}
                      </div>
                      <div className="text-sm font-semibold text-slate-700 mt-2">
                        {to}
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    {travelClass && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg border border-blue-200 uppercase">
                        <MdAirlineSeatReclineNormal /> {travelClass}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200">
                      <BsSuitcase /> {baggage}
                    </span>
                    {refundable && (
                      <span className="inline-flex items-center px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-200">
                        ✓ Refundable
                      </span>
                    )}
                    <button
                      onClick={() => handleFareOptionsClick(resultIndex)}
                      className="inline-flex items-center gap-1.5 bg-blue-50 px-3 py-1.5 text-xs font-semibold rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-100 transition hover:underline cursor-pointer"
                    >
                      <BiSolidOffer /> Fare Options
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Footer */}
        <div className="flex items-center justify-between mt-6">
          <div className="text-left">
            <div className="text-3xl font-bold bg-linear-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
              ₹{totalPrice.toLocaleString()}
            </div>
            <div className="text-xs text-slate-600 mt-1 font-medium">
              Total (incl. taxes)
            </div>
          </div>
          <button
            onClick={() => {
              const isInternational = legs.some((leg) =>
                leg.some(
                  (s) =>
                    s.Origin?.Airport?.CountryCode &&
                    s.Destination?.Airport?.CountryCode &&
                    s.Origin.Airport.CountryCode !==
                      s.Destination.Airport.CountryCode,
                ),
              );

              navigate("/multi-city-flight/booking", {
                state: {
                  selectedFlight: {
                    ResultIndex: resultIndex,
                    Fare: fare,
                  },
                  rawFlightData: {
                    Segments: segments,
                  },
                  searchParams: {
                    traceId,
                  },
                  tripType: "multi-city",
                  isInternational,
                },
              });
            }}
            className="relative group px-8 py-3.5 bg-linear-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-xl font-semibold shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 cursor-pointer"
          >
            <span className="relative z-10">Select</span>
            <div className="absolute inset-0 bg-white/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </button>
        </div>
      </div>
    </div>
  );
}
