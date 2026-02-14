//src/Pages/search-results/Flight-results/One-wayFlightCard.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { MdAirlineSeatReclineNormal, MdOutlineFlight } from "react-icons/md";
import { FaSuitcase } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import {
  airlineLogo,
  FLIGHT_STATUS_MAP,
  formatDate,
  formatTime,
} from "../../../utils/formatter";
import { getFareUpsell } from "../../../Redux/Actions/flight.thunks";
import FareUpsellModal from "../../Booking-Flow/Flight-Booking/FareUpsellModal";
import { BsSuitcase } from "react-icons/bs";
import { BiSolidOffer } from "react-icons/bi";

const grayText = "text-slate-500";
const darkText = "text-slate-900";
const primaryText = "text-blue-600";
const primaryBg = "bg-blue-600";
const primaryHover = "hover:bg-blue-700";
const successText = "text-emerald-600";
const successBg = "bg-emerald-50";

export default function OneWayFlightCard({
  flight,
  traceId,
  travelClass,
  onOpenFareUpsell,
}) {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  if (!flight || !flight.Segments?.length || !flight.Segments[0]?.length) {
    return null;
  }

  const handleFareOptionsClick = async () => {
    const res = await dispatch(
      getFareUpsell({
        traceId,
        resultIndex: flight.ResultIndex,
      }),
    );

    // Pass fetched data up to parent
    if (res?.payload) {
      onOpenFareUpsell(res.payload);
    }
  };

  // 🔥 CORRECT TBO SEGMENT ACCESS
  const segments = flight.Segments[0];
  const firstSegment = segments[0];
  const flightStatus =
    firstSegment?.FlightStatus || firstSegment?.Status || "Scheduled";

  const lastSegment = segments[segments.length - 1];

  const airline = firstSegment.Airline?.AirlineName;
  const airlineCode = firstSegment.Airline?.AirlineCode;
  const flightNumber = firstSegment.Airline?.FlightNumber;

  const from = firstSegment.Origin?.Airport?.CityName;
  const fromCode = firstSegment.Origin?.Airport?.AirportCode;
  const fromCountry = firstSegment.Origin?.Airport?.CountryName;
  const fromAirport = firstSegment.Origin?.Airport?.AirportName;

  const to = lastSegment.Destination?.Airport?.CityName;
  const toCode = lastSegment.Destination?.Airport?.AirportCode;
  const toCountry = lastSegment.Destination?.Airport?.CountryName;
  const toAirport = lastSegment.Destination?.Airport?.AirportName;

  const departure = formatTime(firstSegment.Origin?.DepTime);
  const arrival = formatTime(lastSegment.Destination?.ArrTime);

  const depTime = firstSegment.Origin?.DepTime;
  const arrTime = lastSegment.Destination?.ArrTime;

  const durationMin = segments.reduce((sum, s) => sum + (s.Duration || 0), 0);

  const duration = `${Math.floor(durationMin / 60)}h ${durationMin % 60}m`;

  const stops =
    segments.length === 1 ? "Non-stop" : `${segments.length - 1} Stop`;

  const baggage = flight.Fare?.Baggage?.iB || "15 Kg";

  const refundable = flight.IsRefundable;
  const price =  Math.ceil(flight.Fare?.PublishedFare);

  return (
    <div className="max-w-[1060px] bg-linear-to-br from-white via-blue-50/30 to-white border border-blue-200 rounded-2xl transition-all duration-300 overflow-hidden">
      <div className="relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -z-10"></div>

        <div className="p-6">
          {/* <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-slate-600">
                One-Way Journey
              </span>
            </div>
            <div className="px-4 py-1.5 bg-linear-to-r from-blue-600 to-blue-500 text-white text-sm font-semibold rounded-full shadow-md">
              ₹{price?.toLocaleString()}
            </div>
          </div> */}

          {/* FLIGHT SEGMENT */}
          <div className="relative">
            <div className="flex items-center justify-between gap-3 mb-5">
              {/* Airline Info */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img
                    src={airlineLogo(airlineCode)}
                    alt={airline}
                    className="w-12 h-12 rounded-xl shadow-md border-2 border-white object-contain"
                    onError={(e) => {
                      e.currentTarget.src = "https://via.placeholder.com/64";
                    }}
                  />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-600 rounded-full border-2 border-white"></div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <div className="font-bold text-slate-800">{airline}</div>

                    {flightStatus && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          FLIGHT_STATUS_MAP[flightStatus]?.className ||
                          FLIGHT_STATUS_MAP.Scheduled.className
                        }`}
                      >
                        {FLIGHT_STATUS_MAP[flightStatus]?.label || "Scheduled"}
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-500 font-medium">
                    {airlineCode}-{flightNumber}
                  </div>
                </div>
              </div>

              {/* Price Info */}
              <div className="flex flex-col text-center sm:text-right bg-gray-200 rounded-xl p-2">
                <div className="flex items-baseline justify-center sm:justify-start gap-2">
                  <span className="text-3xl font-bold bg-linear-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                    ₹{price?.toLocaleString()}
                  </span>
                </div>
                {/* <div className="text-xs text-slate-600 mt-1 flex flex-wrap justify-center sm:justify-start items-center gap-1">
                  <span>Total for 1 Adult</span>
                  <span className="text-blue-600">•</span>
                  <span className="text-blue-600 font-medium">
                    All taxes included
                  </span>
                </div> */}
              </div>
            </div>

            <div className="grid grid-cols-[1fr_auto_1fr] gap-6 items-center">
              <div className="text-left space-y-1">
                <div className="text-2xl font-bold text-slate-800">
                  {departure}
                </div>
                <div className="text-xs font-medium text-blue-600">
                  {formatDate(depTime)}
                </div>
                <div className="text-sm font-semibold text-slate-700 mt-2">
                  {from}, {fromCountry}
                </div>
                <div className="text-xs text-slate-500">({fromAirport})</div>
              </div>

              <div className="flex flex-col items-center gap-2 px-6">
                <div className="relative w-full mb-3">
                  <div className="h-0.5 bg-linear-to-r from-blue-200 via-blue-400 to-blue-200 w-32"></div>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-2 rounded-full shadow-md border border-blue-200">
                    <MdOutlineFlight className="text-blue-600 text-xl rotate-90" />
                  </div>
                </div>
                <div className="text-xs font-semibold text-slate-600 whitespace-nowrap">
                  {duration}
                </div>
                <div className="px-3 py-1 bg-linear-to-r from-emerald-50 to-emerald-100 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">
                  {stops}
                </div>
              </div>

              <div className="text-right space-y-1">
                <div className="text-2xl font-bold text-slate-800">
                  {arrival},
                </div>
                <div className="text-xs font-medium text-blue-600">
                  {formatDate(arrTime)}
                </div>
                <div className="text-sm font-semibold text-slate-700 mt-2">
                  {to},{toCountry}
                </div>
                <div className="text-xs text-slate-500">({toAirport})</div>
              </div>
            </div>

            {/* Action And Info section */}
            <div className="flex items-center justify-between mt-5">
              <div className="flex flex-wrap gap-3">
                {travelClass && (
                  <span className="inline-flex items-center px-3 py-1.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg border border-blue-200 uppercase">
                    <MdAirlineSeatReclineNormal /> {travelClass}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200">
                  <BsSuitcase /> {baggage}
                </span>
                {refundable && (
                  <span className="inline-flex items-center px-3 py-1.5 bg-linear-to-r from-emerald-50 to-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-200">
                    ✓ Refundable
                  </span>
                )}

                <button
                  onClick={handleFareOptionsClick}
                  className="flex items-center gap-1.5 bg-linear-to-r from-blue-50 to-blue-100  px-3 py-1.5 text-xs font-semibold rounded-lg border border-blue-200 text-blue-600 hover:underline  hover:text-blue-700 transition-colors cursor-pointer"
                >
                  <BiSolidOffer /> Fare Options
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const isInternational = segments.some(
                      (s) =>
                        s.Origin?.Airport?.CountryCode &&
                        s.Destination?.Airport?.CountryCode &&
                        s.Origin.Airport.CountryCode !==
                          s.Destination.Airport.CountryCode,
                    );

                    navigate("/one-way-flight/booking", {
                      state: {
                        selectedFlight: flight,
                        rawFlightData: flight,
                        searchParams: { traceId },
                        tripType: "one-way",
                        isInternational,
                      },
                    });
                  }}
                  className="relative group px-8 py-3.5 bg-linear-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-xl font-semibold shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105"
                >
                  <span className="relative z-10">Book Now</span>
                  <div className="absolute inset-0 bg-white/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
