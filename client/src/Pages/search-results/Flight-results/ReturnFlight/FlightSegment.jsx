// FlightSegment.jsx (Updated MakeMyTrip Style)
import { FaPlane, FaSuitcase } from "react-icons/fa";
import { formatDuration, formatStops, formatTime, getCabinClassLabel } from "../../../../utils/formatter";

export const FlightSegment = ({ data, label, fare, selected }) => (
  <div>
    {/* Main Flight Info Row */}
    <div className="flex items-center justify-between gap-6">
      {/* Left: Airline Info */}
      <div className="flex items-center gap-4 flex-1">
        {/* Airline Logo */}
        <div className="flex shrink-0">
          <img
            src={data.logo}
            className="w-11 h-11 object-contain"
            alt={data.airline}
            onError={(e) => {
              e.target.src = "https://via.placeholder.com/44";
            }}
          />
        </div>

        {/* Airline Name & Flight Number */}
        <div className="min-w-[110px]">
          <div className="font-semibold text-sm text-gray-900 leading-tight">
            {data.airline}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            {data.flightNumber}
          </div>
        </div>

        {/* Departure Info */}
        <div className="text-left min-w-20">
          <div className="text-xl font-bold text-gray-900">
            {formatTime(data.depTime)}
          </div>
          <div className="text-xs text-gray-600 font-medium mt-1">
            {data.fromCity}{" "}
            <span className="text-blue-700 text-xs">
              ( {data.fromAirport} ){" "}
            </span>
          </div>
        </div>

        {/* Duration & Stops Visual */}
        <div className="flex flex-col items-center px-6 min-w-[150px]">
          <div className="text-xs text-gray-500 mb-1.5 font-medium">
            {formatDuration(data.durationMins)}
          </div>

          {/* Flight Path Line */}
          <div className="relative w-full flex items-center">
            <div className="flex-1 border-t-2 border-gray-300"></div>

            {/* Stop Indicator */}
            {data.stops === 0 ? (
              <div className="w-8 h-8 flex items-center justify-center bg-gray-400 rounded-full mx-1.5 shrink-0"> <FaPlane className="text-white" /></div>
            ) : (
              <div className="px-2 flex shrink-0">
                <div className="w-8 h-8 flex items-center justify-center bg-orange-500 rounded-full"> <FaPlane className="text-white" /> </div>
              </div>
            )}

            <div className="flex-1 border-t-2 border-gray-300"></div>
          </div>

          <div
            className={`text-xs mt-1.5 font-medium ${
              data.stops === 0 ? "text-green-600" : "text-gray-600"
            }`}
          >
            {formatStops(data.stops)}
          </div>
        </div>

        {/* Arrival Info */}
        <div className="text-left min-w-20">
          <div className="text-xl font-bold text-gray-900">
            {formatTime(data.arrTime)}
          </div>
          <div className="text-xs text-gray-600 font-medium mt-1">
            {data.toCity}{" "}
            <span className="text-blue-700 text-xs">( {data.toAirport} ) </span>
          </div>
        </div>
      </div>

      {/* Right: Price Section */}
      {fare && (
        <div className="text-right border-l-2 border-gray-100 pl-6 min-w-[130px]">
          <div className="text-2xl font-bold text-gray-900">
            ₹{fare.toLocaleString("en-IN")}
          </div>
          <div className="text-xs text-gray-500 mt-1">per adult</div>
        </div>
      )}
    </div>

    {/* Bottom Tags Row */}
    <div className="flex items-center gap-2 mt-4 pt-3.5 border-t border-gray-100">
      {/* Cabin Class */}
      {data.cabinClassCode && (
        <span className="inline-flex items-center text-xs text-gray-700 bg-gray-100 px-2.5 py-1 rounded-md font-medium">
          {getCabinClassLabel(data.cabinClassCode)}
        </span>
      )}

      {/* Baggage */}
      <span className="inline-flex items-center gap-1.5 text-xs text-gray-700 bg-gray-100 px-2.5 py-1 rounded-md font-medium">
        <FaSuitcase className="text-[10px]" />
        {data.baggage}
      </span>

      {/* Refundable Badge */}
      {data.refundable === true && (
        <span className="inline-flex items-center text-xs text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-md font-semibold">
          ✓ Refundable
        </span>
      )}

      {/* Non-refundable Badge */}
      {data.refundable === false && (
        <span className="inline-flex items-center text-xs text-gray-600 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-md">
          Non-refundable
        </span>
      )}
    </div>
  </div>
);
