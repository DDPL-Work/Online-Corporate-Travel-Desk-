import React from "react";
import { useNavigate } from "react-router-dom";
import { MdOutlineFlight } from "react-icons/md";
import { FaSuitcase } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";

const grayText = "text-slate-500";
const darkText = "text-slate-900";
const primaryText = "text-blue-600";
const primaryBg = "bg-blue-600";
const primaryHover = "hover:bg-blue-700";
const successText = "text-emerald-600";
const successBg = "bg-emerald-50";

export const getAirlineLogo = (code) => {
  if (!code) return "https://via.placeholder.com/64";
  return `https://images.kiwi.com/airlines/64x64/${code}.png`;
};

const formatTime12Hr = (dateTime) => {
  if (!dateTime) return "N/A";

  const date = new Date(dateTime);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

export default function OneWayFlightCard({ flight, traceId }) {
  const navigate = useNavigate();

  if (!flight || !flight.Segments?.length || !flight.Segments[0]?.length) {
    return null;
  }

  // 🔥 CORRECT TBO SEGMENT ACCESS
  const segments = flight.Segments[0];
  const firstSegment = segments[0];
  const lastSegment = segments[segments.length - 1];

  const airline = firstSegment.Airline?.AirlineName;
  const airlineCode = firstSegment.Airline?.AirlineCode;
  const flightNumber = firstSegment.Airline?.FlightNumber;

  const from = firstSegment.Origin?.Airport?.CityName;
  const fromCode = firstSegment.Origin?.Airport?.AirportCode;

  const to = lastSegment.Destination?.Airport?.CityName;
  const toCode = lastSegment.Destination?.Airport?.AirportCode;

  const departure = formatTime12Hr(firstSegment.Origin?.DepTime);
  const arrival = formatTime12Hr(lastSegment.Destination?.ArrTime);

  const durationMin = segments.reduce((sum, s) => sum + (s.Duration || 0), 0);

  const duration = `${Math.floor(durationMin / 60)}h ${durationMin % 60}m`;

  const stops =
    segments.length === 1 ? "Direct" : `${segments.length - 1} Stop`;

  // const baggage = segments.Baggage || "N/A";
  const baggage = flight.Fare?.Baggage?.iB || "15 Kg";

  const refundable = flight.IsRefundable;
  const price = flight.Fare?.PublishedFare;

  return (
    <div className="w-full max-w-[1060px] bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      {/* AIRLINE HEADER */}
      <div className="flex items-center gap-3 mb-4">
        <img
          src={getAirlineLogo(airlineCode)}
          alt={airline}
          className="w-8 h-8 object-contain"
          onError={(e) => {
            e.currentTarget.src = "https://via.placeholder.com/64";
          }}
        />

        <div>
          <div className="font-semibold text-slate-800">{airline}</div>
          <div className="text-sm text-slate-400">
            {airlineCode}-{flightNumber}
          </div>
        </div>
      </div>

      {/* FLIGHT TIMELINE */}
      <div className="flex items-center justify-between">
        {/* FROM */}
        <div>
          <div className={`text-2xl font-bold ${darkText}`}>{departure}</div>
          <div className={grayText}>{from}</div>
          <div className="text-sm text-slate-400">({fromCode})</div>
        </div>

        {/* CENTER */}
        <div className="flex flex-col items-center flex-1 px-6">
          <div className="w-full flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-300"></div>
            <MdOutlineFlight className={`${primaryText} rotate-90`} />
            <div className="flex-1 h-px bg-slate-300"></div>
          </div>

          <div className="text-sm text-slate-600 mt-1">{duration}</div>
          <div className={`text-sm font-medium ${successText}`}>{stops}</div>
        </div>

        {/* TO */}
        <div className="text-right">
          <div className={`text-2xl font-bold ${darkText}`}>{arrival}</div>
          <div className={grayText}>{to}</div>
          <div className="text-sm text-slate-400">({toCode})</div>
        </div>
      </div>

      {/* TAGS */}
      <div className="flex flex-wrap gap-2 mt-4 text-sm">
        <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full">
          Economy
        </span>

        <span className="flex items-center gap-1 text-slate-600">
          <FaSuitcase className="w-4 h-4" />
          {baggage}
        </span>

        {refundable && (
          <span
            className={`${successBg} ${successText} px-3 py-1 rounded-full`}
          >
            ✓ Refundable
          </span>
        )}
      </div>

      {/* PRICE & CTA */}
      <div className="flex items-center justify-between border-t border-slate-200 mt-5 pt-4">
        <div className="text-2xl font-bold text-slate-900">
          ₹{price?.toLocaleString()}
        </div>

        <button
          onClick={() =>
            navigate("/one-way-flight/booking", {
              state: {
                selectedFlight: flight, // ✅ FULL FLIGHT OBJECT
                rawFlightData: flight, // ✅ SAME OBJECT (DO NOT TRANSFORM)
                searchParams: {
                  traceId,
                },
                tripType: "one-way",
              },
            })
          }
          className={`${primaryBg} ${primaryHover} text-white px-8 py-2 rounded-lg font-semibold transition`}
        >
          Select
        </button>
      </div>
    </div>
  );
}
