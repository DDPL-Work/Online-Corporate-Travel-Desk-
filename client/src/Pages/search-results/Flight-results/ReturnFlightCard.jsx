import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MdOutlineFlight } from "react-icons/md";
import { FaSuitcase } from "react-icons/fa";
import { parseRoundTrip } from "../../../utils/parseReturnFlight";

/* ================= HELPERS ================= */
const formatTime = (d) =>
  d
    ? new Date(d).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : "--";

const formatDuration = (mins = 0) => `${Math.floor(mins / 60)}h ${mins % 60}m`;

const airlineLogo = (code) =>
  code
    ? `https://images.kiwi.com/airlines/64x64/${code}.png`
    : "https://via.placeholder.com/40";

/* ================= PARSER ================= */
const parseJourney = (segments = []) => {
  if (!Array.isArray(segments) || segments.length === 0) return null;

  const first = segments[0];
  const last = segments[segments.length - 1];

  const totalDuration = segments.reduce(
    (sum, s) => sum + (s?.Duration || 0),
    0
  );

  return {
    airline: first?.Airline?.AirlineName || "—",
    flightNumber: `${first?.Airline?.AirlineCode || ""}-${
      first?.Airline?.FlightNumber || ""
    }`,
    fromCode: first?.Origin?.Airport?.AirportCode || "—",
    toCode: last?.Destination?.Airport?.AirportCode || "—",
    departure: formatTime(first?.Origin?.DepTime),
    arrival: formatTime(last?.Destination?.ArrTime),
    duration: formatDuration(totalDuration),
    stops: segments.length === 1 ? "Direct" : `${segments.length - 1} Stop`,
    baggage: first?.Baggage || "—",
    refundable: true,
    logo: airlineLogo(first?.Airline?.AirlineCode),
  };
};

/* ================= COMPONENT ================= */
export default function ReturnFlightCard({ flight }) {
  const navigate = useNavigate();
  const parsedTrip = useMemo(() => parseRoundTrip(flight?.Segments), [flight]);

  if (!parsedTrip) return null;

  const onwardJourney = parsedTrip.onward;
  const returnJourney = parsedTrip.return;

  if (!onwardJourney) return null;

  return (
    <div className="max-w-[1060px] bg-white border rounded-lg p-4 shadow-sm">
      <span className="px-3 py-1 bg-blue-50 text-blue-700 text-sm font-semibold rounded-full">
        Round Trip
      </span>

      {/* JOURNEY */}
      <FlightSegment data={onwardJourney} />
      {returnJourney && (
        <>
          <div className="border-t my-3" />
          <FlightSegment data={returnJourney} />
        </>
      )}

      {/* FOOTER */}
      <div className="flex justify-between items-center border-t pt-3 mt-3">
        <div>
          <div className="text-2xl font-bold">
            ₹{flight?.Fare?.PublishedFare?.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500">Total for 1 Adult</div>
        </div>

        <button
          onClick={() =>
            navigate("/booking", {
              state: {
                traceId: flight.TraceId,
                resultIndex: flight.ResultIndex,
              },
            })
          }
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
        >
          Select Flights
        </button>
      </div>
    </div>
  );
}

/* ================= SEGMENT ================= */
const FlightSegment = ({ data }) => (
  <div className="py-3">
    <div className="flex items-center gap-2 mt-2">
      <img src={data.logo} className="w-7 h-7" alt="" />
      <span className="font-semibold">{data.airline}</span>
      <span className="text-xs text-gray-400">{data.flightNumber}</span>
    </div>

    <div className="flex justify-between items-center mt-3">
      <div>
        <div className="text-lg font-bold">{data.departure}</div>
        <div className="text-slate-500">{data.fromCode}</div>
      </div>

      <div className="text-center">
        <MdOutlineFlight className="text-blue-600 rotate-90" />
        <div className="text-xs">{data.duration}</div>
        <div className="text-emerald-600 text-xs">{data.stops}</div>
      </div>

      <div>
        <div className="text-lg font-bold">{data.arrival}</div>
        <div className="text-slate-500">{data.toCode}</div>
      </div>
    </div>

    <div className="flex gap-2 mt-2 text-xs">
      <span className="bg-blue-50 px-2 py-1 rounded">Economy</span>
      <span className="flex items-center gap-1">
        <FaSuitcase /> {data.baggage}
      </span>
      {data.refundable && (
        <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded">
          Refundable
        </span>
      )}
    </div>
  </div>
);
