// FlightSegment.jsx (Updated MakeMyTrip Style)
import { FaPlane, FaSuitcase } from "react-icons/fa";
import { formatDuration, formatStops, formatTime, getCabinClassLabel } from "../../../../utils/formatter";

export const FlightSegment = ({ data, label, fare, selected }) => (
  <div className="flex flex-col w-full">
    {/* Main Flight Info Row */}
    <div className="flex items-center justify-between gap-4">
      {/* Left: Airline Info */}
      <div className="flex items-center gap-3 w-[160px] shrink-0">
        <div className="w-10 h-10 rounded shadow-sm bg-white border border-gray-100 flex items-center justify-center shrink-0 overflow-hidden p-1">
          <img
            src={data.logo}
            className="w-full h-full object-contain"
            alt={data.airline}
            onError={(e) => {
              e.target.src = "https://via.placeholder.com/32";
            }}
          />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-[13px] text-gray-900 leading-tight">
            {data.airline}
          </span>
          <span className="text-[11px] text-gray-500 mt-0.5">
            {data.flightNumber}
          </span>
        </div>
      </div>

      {/* Middle: Flight Times and Path */}
      <div className="flex items-center justify-between flex-1 px-2">
        {/* Departure */}
        <div className="flex flex-col items-start w-[120px]">
          <span className="text-lg font-black text-gray-900 leading-none">
            {formatTime(data.depTime)}
          </span>
          <span className="text-[11px] text-gray-600 mt-1">
            {data.fromCity} <span className="text-[#C9A84C] font-bold">( {data.fromAirport} )</span>
          </span>
          {data.fromTerminal && (
            <span className="text-[9px] font-bold text-[#C9A84C] bg-slate-50 px-1.5 py-0.5 rounded border border-[#C9A84C]/20 mt-1 uppercase">
              T-{data.fromTerminal}
            </span>
          )}
        </div>

        {/* Path / Duration */}
        <div className="flex flex-col items-center w-[140px] px-2">
          <span className="text-[11px] text-gray-500 font-medium mb-1">
            {formatDuration(data.durationMins)}
          </span>
          <div className="w-full flex items-center relative">
            <div className="flex-1 h-[1px] bg-slate-200"></div>
            <div className="w-4 h-4 bg-[#C9A84C] rounded-full flex items-center justify-center mx-1 shrink-0 shadow-sm">
              <FaPlane className="text-white text-[8px]" />
            </div>
            <div className="flex-1 h-[1px] bg-slate-200"></div>
          </div>
          <span className={`text-[10px] mt-1 font-medium ${data.stops === 0 ? "text-emerald-600" : "text-gray-500"}`}>
            {formatStops(data.stops)}
          </span>
        </div>

        {/* Arrival */}
        <div className="flex flex-col items-end w-[120px]">
          <span className="text-lg font-black text-gray-900 leading-none">
            {formatTime(data.arrTime)}
          </span>
          <span className="text-[11px] text-gray-600 mt-1 text-right">
            {data.toCity} <span className="text-[#C9A84C] font-bold">( {data.toAirport} )</span>
          </span>
          {data.toTerminal && (
            <span className="text-[9px] font-bold text-[#C9A84C] bg-slate-50 px-1.5 py-0.5 rounded border border-[#C9A84C]/20 mt-1 uppercase text-right">
              T-{data.toTerminal}
            </span>
          )}
        </div>
      </div>

      {/* Right: Price Section */}
      <div className="shrink-0 min-w-[120px] pl-4 border-l border-gray-200/60 flex flex-col items-end justify-center">
        {fare && (
          <>
            <span className="text-xl font-black text-gray-900 leading-none">
              ₹{fare.toLocaleString("en-IN")}
            </span>
            <span className="text-[10px] text-gray-500 mt-1">per adult</span>
          </>
        )}
      </div>
    </div>

    {/* Bottom Tags Row */}
    <div className="flex items-center gap-2 mt-3 pt-3">
      {data.cabinClassCode && (
        <span className="inline-flex items-center text-[10px] text-gray-600 bg-white border border-gray-200 px-2 py-0.5 rounded font-medium shadow-sm">
          {getCabinClassLabel(data.cabinClassCode)}
        </span>
      )}
      <span className="inline-flex items-center gap-1.5 text-[10px] text-gray-600 bg-white border border-gray-200 px-2 py-0.5 rounded font-medium shadow-sm">
        <FaSuitcase className="text-gray-400 text-[10px]" />
        {data.baggage}
      </span>
      <span className={`inline-flex items-center text-[10px] px-2 py-0.5 rounded font-medium shadow-sm border ${data.refundable ? 'text-gray-600 bg-white border-gray-200' : 'text-gray-600 bg-gray-50 border-gray-200'}`}>
        {data.refundable ? 'Refundable' : 'Non-refundable'}
      </span>
    </div>
  </div>
);