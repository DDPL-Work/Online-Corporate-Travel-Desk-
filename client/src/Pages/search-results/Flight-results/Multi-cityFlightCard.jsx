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
import { FlightDetailsDropdown } from "./One-wayFlightCard";
import { getFareUpsell } from "../../../Redux/Actions/flight.thunks";

export default function MultiCityFlightCard({
  segments = [],
  fare,
  traceId,
  onOpenFareUpsell,
  travelClass,
  resultIndex,
  searchPayload,
}) {
  const [openIndex, setOpenIndex] = useState(-1);
  const [showDetails, setShowDetails] = useState(false);
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

  // return (
  return (
    <div className="max-w-[1060px] bg-linear-to-br from-white via-slate-50 to-white border border-slate-200 rounded-2xl transition-all duration-300 overflow-hidden shadow-sm">
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
          const stopCities = segments.slice(0, -1).map(s => s.Destination?.Airport?.AirportCode).filter(Boolean);
          const stops = segments.length === 1 
            ? "Non-stop" 
            : `${segments.length - 1} Stop${segments.length > 2 ? 's' : ''} ${stopCities.length ? `via ${stopCities.join(', ')}` : ''}`;

          const price = getLegPrice(segments);
          const baggage = segments[0]?.Baggage || "15 Kg";
          const refundable = segments[0]?.IsRefundable;
          const flightStatus =
            firstSegment?.FlightStatus || firstSegment?.Status || "Scheduled";

          return (
            <div key={i} className="border border-slate-100 rounded-xl mb-4 overflow-hidden">
              <button
                onClick={() => setOpenIndex(openIndex === i ? -1 : i)}
                className="flex justify-between w-full items-center px-4 py-1.5 bg-slate-50/50 hover:bg-slate-100 rounded-t-xl transition-colors cursor-pointer"
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
                  <span className="font-bold text-[#0A203E]">
                    ₹{price.toLocaleString()}
                  </span>
                  {openIndex === i ? (
                    <FaChevronUp className="text-[#C9A84C]" />
                  ) : (
                    <FaChevronDown className="text-[#C9A84C]" />
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
                      <div className="text-xs font-bold text-[#C9A84C]">
                        {formatDate(depTime)}
                      </div>
                      <div className="text-sm font-semibold text-slate-700 mt-2">
                        {from}
                      </div>
                      {firstSegment.Origin?.Airport?.Terminal && (
                        <div className="text-[10px] font-black text-[#C9A84C] bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200 inline-block mt-1 uppercase tracking-wider">
                          T-{firstSegment.Origin.Airport.Terminal}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-center gap-2">
                      <div className="relative w-full mb-3">
                        <div className="h-0.5 bg-linear-to-r from-slate-200 via-[#C9A84C] to-slate-200 w-32"></div>
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-2 rounded-full shadow-md border border-slate-200">
                          <MdOutlineFlight className="text-[#C9A84C] text-lg rotate-90" />
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
                      <div className="text-xs font-bold text-[#C9A84C]">
                        {formatDate(arrTime)}
                      </div>
                      <div className="text-sm font-semibold text-slate-700 mt-2">
                        {to}
                      </div>
                      {lastSegment.Destination?.Airport?.Terminal && (
                        <div className="text-[10px] font-black text-[#C9A84C] bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200 inline-block mt-1 uppercase tracking-wider">
                          T-{lastSegment.Destination.Airport.Terminal}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    {travelClass && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 uppercase">
                        <MdAirlineSeatReclineNormal className="text-[#C9A84C]" /> {travelClass}
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
                      className="inline-flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                    >
                      <BiSolidOffer className="text-[#C9A84C]" /> Fare Options
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* --- Global Details Section --- */}
        <div className="mt-4 flex flex-col gap-4">
           <div className="flex justify-between items-center bg-slate-50/50 px-4 py-2 rounded-xl border border-slate-200">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pricing & Policy Center</span>
            <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-[11px] font-black text-[#C9A84C] hover:text-[#0A203E] flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 shadow-sm transition-all uppercase tracking-widest"
              >
                {showDetails ? "Hide Fare Details" : "View Fare Details"}
                {showDetails ? <FaChevronUp /> : <FaChevronDown />}
              </button>
           </div>
           
           {showDetails && (
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
                 <FlightDetailsDropdown selectedFlight={{ Segments: legs, Fare: fare, ...segments[0] }} />
              </div>
           )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-6">
          <div className="text-left">
            <div className="text-3xl font-black text-[#0A203E]">
              ₹{totalPrice.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5 font-black uppercase tracking-widest">
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
                    passengers:
                      searchPayload?.passengers || {
                        adults: searchPayload?.adults || 1,
                        children: searchPayload?.children || 0,
                        infants: searchPayload?.infants || 0,
                      },
                  },
                  tripType: "multi-city",
                  isInternational,
                },
              });
            }}
            className="px-10 py-3.5 bg-[#0A203E] text-white rounded-xl font-black shadow-lg shadow-[#0A203E]/20 transition-all duration-300 hover:scale-[1.02] active:scale-95 uppercase tracking-widest text-xs"
          >
            Book Now
          </button>
        </div>
      </div>
    </div>
  );
}
