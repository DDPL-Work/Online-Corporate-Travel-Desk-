// Common Components
import React, { useMemo, useState } from "react";
import {
  MdCancel,
  MdDateRange,
  MdEventSeat,
  MdInfo,
  MdLuggage,
} from "react-icons/md";
import {
  FaWifi,
  FaUser,
  FaPlaneArrival,
  FaConciergeBell,
} from "react-icons/fa";
import { BsLuggage, BsTag, BsInfoCircleFill } from "react-icons/bs";
import {
  AiOutlineInfoCircle,
  AiOutlineMinus,
  AiOutlinePlus,
} from "react-icons/ai";
import { FaPlaneDeparture } from "react-icons/fa6";
import {
  IoChevronDown,
  IoChevronUp,
  IoPersonAdd,
  IoPersonRemove,
} from "react-icons/io5";
import { PiForkKnifeBold } from "react-icons/pi";
import { RiHotelLine } from "react-icons/ri";
import { HiOutlineLocationMarker } from "react-icons/hi";
import { LuInfo } from "react-icons/lu";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { useNavigate } from "react-router-dom";
import { airlineLogo, airlineThemes } from "../../../utils/formatter";
import "./Fares.css"; // custom animation + minor overrides

// Updated color scheme - corporate premium
export const orangeText = "text-[#C9A84C]";
export const orangeBg = "bg-[#C9A84C]";
export const blueBg = "bg-[#0A203E]";
export const blueText = "text-[#0A203E]";
export const grayText = "text-slate-500";
export const greenText = "text-[#C9A84C]";
export const lightGreenBg = "bg-slate-50";

// Helper functions
export const formatTime = (dateTimeString) => {
  if (!dateTimeString) return "N/A";
  try {
    const d = new Date(dateTimeString);
    if (isNaN(d.getTime())) return "N/A";
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "N/A";
  }
};

export const formatDate = (dateTimeString) => {
  if (!dateTimeString) return "N/A";
  try {
    const date = new Date(dateTimeString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch (e) {
    return "N/A";
  }
};

export const formatDurationCompact = (totalMinutes) => {
  if (typeof totalMinutes !== "number" || Number.isNaN(totalMinutes))
    return "0h:00m";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h:${minutes.toString().padStart(2, "0")}m`;
};

export const getAirlineLogo = (code) => {
  if (!code) return "https://via.placeholder.com/64";
  return `https://images.kiwi.com/airlines/64x64/${code}.png`;
};

export const formatDuration = (totalMinutes) => {
  if (!totalMinutes) return "0h 00m";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
};

// Flight Data Parsing Functions
export const parseFlightData = (rawFlightData) => {
  if (!rawFlightData?.Segments?.length) return null;

  // ✅ MULTI-CITY ONLY
  if (rawFlightData.Segments.length > 1) {
    return {
      type: "multi-city",

      allSegmentsData: rawFlightData.Segments.map((leg, idx) => {
        const parsed = parseOneWayData({ ...rawFlightData, Segments: [leg] });

        return {
          legIndex: idx,
          from: parsed.flightData.from,
          to: parsed.flightData.to,
          date: parsed.flightData.date,
          segments: parsed.segments,
        };
      }),

      // Header helpers (used ONLY in booking page)
      flightData: {
        from: rawFlightData.Segments[0][0].Origin.Airport.CityName,
        to: rawFlightData.Segments[rawFlightData.Segments.length - 1].slice(
          -1,
        )[0].Destination.Airport.CityName,
        date: rawFlightData.Segments[0][0].Origin.DepTime,
      },
    };
  }

  // 🔒 ONE-WAY & ROUND-TRIP UNCHANGED
  return parseOneWayData(rawFlightData);
};

export const parseOneWayData = (result) => {
  // const segmentGroup = result.Segments?.[0] || [];
  const segmentGroup =
    result?.Segments?.[0] ||
    result?.FareQuote?.Results?.[0]?.Segments?.[0] ||
    result?.Results?.[0]?.Segments?.[0] ||
    [];

  if (!segmentGroup.length) return null;

  const segments = segmentGroup.map((seg, idx) => {
    const next = segmentGroup[idx + 1];

    return {
      dt: seg.Origin.DepTime,
      at: seg.Destination.ArrTime,

      da: {
        city: seg.Origin.Airport.CityName,
        code: seg.Origin.Airport.AirportCode,
        name: seg.Origin.Airport.AirportName,
        terminal: seg.Origin.Airport.Terminal,
        countryCode: seg.Origin.Airport.CountryCode,
      },

      aa: {
        city: seg.Destination.Airport.CityName,
        code: seg.Destination.Airport.AirportCode,
        name: seg.Destination.Airport.AirportName,
        terminal: seg.Destination.Airport.Terminal,
        countryCode: seg.Destination.Airport.CountryCode,
      },

      fD: {
        aI: {
          code: seg.Airline.AirlineCode,
          name: seg.Airline.AirlineName,
        },
        fN: seg.Airline.FlightNumber,
        eT: seg.Craft,
      },

      duration: seg.Duration,

      layoverTime: next
        ? Math.max(
            0,
            (new Date(next.Origin.DepTime) -
              new Date(seg.Destination.ArrTime)) /
              60000,
          )
        : 0,
    };
  });

  const first = segmentGroup[0];
  const last = segmentGroup[segmentGroup.length - 1];

  return {
    type: "one-way",
    segments,
    basePrice: Math.round(result.Fare?.PublishedFare || 0),

    flightData: {
      from: first.Origin.Airport.CityName,
      to: last.Destination.Airport.CityName,
      date: first.Origin.DepTime,
      airline: first.Airline.AirlineName,
      airlineCode: first.Airline.AirlineCode,
      flightNumber: first.Airline.FlightNumber,
      duration: segments.reduce((s, x) => s + x.duration, 0),
      stops: segments.length - 1,
    },

    baggageInfo: result.Fare?.Baggage || {},
    fareClass: result.Fare?.FareClassification?.Type || "ECONOMY",
    isRefundable: result.IsRefundable,
  };
};

const calculateDurationInMinutes = (segments = []) => {
  if (!segments.length) return 0;

  const start = new Date(segments[0].dt);
  const end = new Date(segments[segments.length - 1].at);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;

  return Math.round((end - start) / 60000);
};

export const parseRoundTripBooking = ({ onward, return: ret }) => {
  if (!onward || !ret) return null;

  const onwardParsed = parseOneWayData(onward);
  const returnParsed = parseOneWayData(ret);

  return {
    type: "round-trip",

    onwardSegments: onwardParsed.segments,
    returnSegments: returnParsed.segments,

    onwardData: onwardParsed.flightData,
    returnData: returnParsed.flightData,

    basePrice:
      (onward.Fare?.PublishedFare || 0) + (ret.Fare?.PublishedFare || 0),

    baggageInfo: onwardParsed.baggageInfo,
    isRefundable: onwardParsed.isRefundable && returnParsed.isRefundable,

    // ✅ SEPARATE DURATIONS (THIS FIXES THE UI)
    totalDuration: calculateDurationInMinutes(onwardParsed.segments),
    returnTotalDuration: calculateDurationInMinutes(returnParsed.segments),
  };
};

export const FlightTimeline = ({
  segments = [],
  selectedSeats = {},
  baseSegmentIndex = 0,
  openSeatModal,
  journeyType = "onward",
  isSeatReady = false,
}) => {
  const formatDateTime = (value) => {
    const d = new Date(value);
    return {
      time: d.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
      date: d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    };
  };

  if (!segments.length) {
    return <p className="text-gray-500">No flight segments available.</p>;
  }

  // const seatDisabled = !isSeatReady;
  const seatDisabled = isSeatReady !== true;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-12 shadow-sm">
      {segments.map((segment, idx) => {
        const dep = formatDateTime(segment.dt);
        const arr = formatDateTime(segment.at);

        return (
          <div key={idx} className="relative">
            {/* HORIZONTAL FLIGHT ROW */}
            <div className="flex items-center justify-between relative">
              {/* Departure */}
              <div className="flex flex-col items-center text-center w-1/4">
                <div className="w-10 h-10 rounded-full bg-[#0A203E] flex items-center justify-center mb-2 shadow-md">
                  <FaPlaneDeparture className="text-[#C9A84C] text-sm" />
                </div>
                <p className="text-lg font-bold text-slate-900">{dep.time}</p>
                <p className="text-xs text-slate-500">{dep.date}</p>
                <p className="text-xs text-slate-500">{segment.da?.name}</p>
                <p className="mt-1 font-bold text-slate-900">
                  {segment.da?.city}
                  {/* ({segment.da?.code}) */}
                </p>
                <p className="text-[10px] font-black text-[#C9A84C] uppercase tracking-widest mt-1">
                  Terminal {segment.da?.terminal || "N/A"}
                </p>
              </div>

              {/* Dotted Line */}
              <div className="flex-1 relative mx-2">
                <div className="animated-dotted-line"></div>
                <div className="absolute inset-x-0 top-0 -translate-y-12">
                  <div className="flex justify-center">
                    <div className="bg-white px-6">
                      {/* Flight card in the center */}
                      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow duration-300 min-w-[220px]">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <img
                              src={getAirlineLogo(segment.fD?.aI?.code)}
                              alt="airline"
                              className="w-8 h-8 rounded"
                              onError={(e) =>
                                (e.target.src =
                                  "https://via.placeholder.com/40")
                              }
                            />
                            <div className="flex items-center gap-4">
                              <div>
                                <p className="font-semibold text-gray-900 text-sm">
                                  {segment.fD?.aI?.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {segment.fD?.aI?.code}-{segment.fD?.fN}
                                </p>
                              </div>

                              <div>
                                {/* Selected seats */}
                                {(() => {
                                  const actualIndex = baseSegmentIndex + idx;
                                  const seatKey = `${journeyType}|${actualIndex}`;
                                  const seats =
                                    selectedSeats?.[seatKey]?.list || [];
                                  if (!seats.length) return null;
                                  return (
                                    <div className=" bg-slate-50 border border-slate-200 rounded-lg p-1.5">
                                      <p className="text-xs font-bold text-[#C9A84C]">
                                        Seats: {seats.join(", ")}
                                      </p>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500">
                          Duration: {formatDurationCompact(segment.duration)} •{" "}
                          {segment.fD?.eT || "Aircraft"}
                        </p>
                        {(() => {
                          const getSeatButtonText = () => {
                            if (isSeatReady === "loading")
                              return "SSR loading…";
                            if (isSeatReady === "error")
                              return "Unable to load ssr";
                            if (isSeatReady === "none")
                              return "No ssr available";
                            if (isSeatReady === true) return "Select SSR";
                            return "SSR loading…";
                          };

                          const seatDisabled = isSeatReady !== true;

                          return (
                            <button
                              onClick={() =>
                                !seatDisabled && openSeatModal(idx)
                              }
                              disabled={seatDisabled}
                              className={`mt-3 w-full flex items-center justify-center gap-2 text-sm font-bold rounded-xl py-2.5 transition cursor-pointer uppercase tracking-widest text-[11px]
        ${
          seatDisabled
            ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
            : "text-[#C9A84C] border border-[#C9A84C]/30 hover:bg-[#C9A84C] hover:text-[#0A203E]"
        }
      `}
                            >
                              <FaConciergeBell />
                              {getSeatButtonText()}
                            </button>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Arrival */}
              <div className="flex flex-col items-center text-center w-1/4">
                <div className="w-10 h-10 rounded-full bg-[#0A203E] flex items-center justify-center mb-2 shadow-md">
                  <FaPlaneArrival className="text-[#C9A84C] text-sm" />
                </div>
                <p className="text-lg font-bold text-gray-900">{arr.time}</p>
                <p className="text-xs text-gray-500">{arr.date}</p>
                <p className="text-xs text-gray-500">{segment.aa?.name}</p>
                <p className="mt-1 font-bold text-slate-900">
                  {segment.aa?.city}
                  {/* ({segment.aa?.code}) */}
                </p>
                <p className="text-[10px] font-black text-[#C9A84C] uppercase tracking-widest mt-1">
                  Terminal {segment.aa?.terminal || "N/A"}
                </p>
              </div>
            </div>

            {/* Layover */}
            {idx < segments.length - 1 && (
              <div className="flex justify-center mx-auto mt-14">
                <div className="flex items-center gap-2 px-6 h-10 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-700 shadow-sm uppercase tracking-widest text-[10px]">
                  <HiOutlineLocationMarker className="text-[#C9A84C]" />
                  <span>
                    Layover at{" "}
                    <span className="font-semibold text-gray-900">
                      {segment.aa?.city}
                    </span>
                    {" • "}
                    {formatDurationCompact(segment.layoverTime || 60)}
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

/* ======================================================
   ROUND TRIP FLIGHT TIMELINE
   (Wrapper over FlightTimeline)
   ====================================================== */

export const RoundTripFlightTimeline = ({
  segments = [],
  isReturnJourney = false,
  selectedSeats = {},
  openSeatModal,
  isSeatReady,
  isInternational = false,
  onwardCount = 0,
}) => {
  const journeyType = isReturnJourney ? "return" : "onward";
  const seatReady = Boolean(isSeatReady);

  if (!segments.length) return null;

  return (
    <FlightTimeline
      segments={segments}
      journeyType={journeyType}
      selectedSeats={selectedSeats}
      baseSegmentIndex={isReturnJourney && isInternational ? onwardCount : 0}
      openSeatModal={(segmentIndex) =>
        openSeatModal(segments[segmentIndex], segmentIndex, journeyType)
      }
      isSeatReady={seatReady}
    />
  );
};

/* ======================================================
   MULTI CITY FLIGHT TIMELINE
   ====================================================== */

export const MultiCityFlightTimeline = ({
  allSegmentsData = [],
  selectedSeats = {},
  openSeatModal,
  isSeatReady = false,
}) => {
  if (!Array.isArray(allSegmentsData) || allSegmentsData.length === 0) {
    return (
      <p className="text-sm text-gray-500 text-center py-6">
        No flight details available.
      </p>
    );
  }

  return (
    <div className="space-y-12">
      {allSegmentsData.map((leg, legIndex) => (
        <div
          key={legIndex}
          className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
        >
          {/* ===== LEG HEADER ===== */}
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {leg.from} → {leg.to}
                </h3>
              </div>
            </div>
          </div>

          {/* ===== LEG BODY ===== */}
          <div className="p-6 bg-slate-50">
            <FlightTimeline
              segments={leg.segments}
              selectedSeats={selectedSeats}
              openSeatModal={(segmentIndex) =>
                openSeatModal?.("multi-city", legIndex, segmentIndex)
              }
              journeyType={`multi-${legIndex}`}
              isSeatReady={isSeatReady}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export const normalizeSSRList = (list = []) => {
  if (!Array.isArray(list)) return [];

  // Flatten one level if needed
  const flat = Array.isArray(list[0]) ? list.flat() : list;

  const map = new Map();

  flat.forEach((meal) => {
    if (!meal || meal.Code === "NoMeal") return;

    // Deduplicate by Meal Code (correct key)
    if (!map.has(meal.Code)) {
      map.set(meal.Code, meal);
    }
  });

  return Array.from(map.values());
};


const airlineNames = {
  IX: "Air India Express",
  "6E": "IndiGo",
  AI: "Air India",
  SG: "SpiceJet",
  UK: "Vistara",
  QP: "Akasa Air",
};



// ─── Single Rule Card ────────────────────────────────────────────────────────
const RuleCard = ({ fareRule, theme }) => {
  const [open, setOpen] = useState(true);
  const { origin, destination, fareBasisCode, baggage, mealAndSeat, cancellation, reissue, notes } = fareRule;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-xs hover:shadow-md transition-shadow duration-300 overflow-hidden mb-5">
      {/* Card Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between px-6 py-5 bg-[#0A203E] text-white group`}
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-[10px] font-black uppercase tracking-wider shrink-0 transition-transform group-hover:scale-105">
            {origin || "?"}
          </div>
          <div className="text-left flex flex-col justify-center">
            <p className="font-bold text-sm tracking-wide text-white drop-shadow-sm">
              {origin} → {destination}
            </p>
            {fareBasisCode && (
              <p className="text-[11px] font-medium text-white/80 mt-1 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-white/60"></span>
                Fare basis: {fareBasisCode}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 group-hover:bg-white/20 transition-colors">
          {open ? <IoChevronUp size={16} /> : <IoChevronDown size={16} />}
        </div>
      </button>

      {open && (
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50">
          
          {/* Baggage */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden transition-all hover:border-[#C9A84C]/50 hover:shadow-sm">
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100 bg-slate-50/50">
               <span className="text-lg">🧳</span><span className="text-xs font-bold uppercase tracking-widest text-[#0A203E]">Baggage Details</span>
            </div>
            <div className="px-1 py-1">
               <div className="flex justify-between px-4 py-2.5 items-center group">
                 <span className="text-[12px] font-medium text-slate-500 group-hover:text-slate-700 transition-colors">Check-in</span>
                 <span className="text-[12px] font-bold px-3 py-1 rounded-md bg-slate-100 text-slate-800 border border-slate-200">{baggage?.checkIn}</span>
               </div>
               <div className="flex justify-between px-4 py-2.5 items-center group">
                 <span className="text-[12px] font-medium text-slate-500 group-hover:text-slate-700 transition-colors">Cabin / Hand</span>
                 <span className="text-[12px] font-bold px-3 py-1 rounded-md bg-slate-100 text-slate-800 border border-slate-200">{baggage?.cabin}</span>
               </div>
            </div>
          </div>

          {/* Cancellation */}
          <div className="rounded-xl border border-red-100 bg-white shadow-xs overflow-hidden transition-all hover:border-red-300 hover:shadow-sm">
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-red-50 bg-gradient-to-r from-red-50/50 to-transparent">
               <span className="text-lg">❌</span><span className="text-xs font-bold uppercase tracking-widest text-red-800">Cancellation Policy</span>
            </div>
            <div className="px-1 py-1 divide-y divide-slate-50">
               {cancellation?.map((c, i) => {
                  const isNotAllowed = c.fee && (c.fee.toLowerCase().includes("not allowed") || c.fee.toLowerCase().includes("strictly not permitted"));
                  return <div key={i} className="flex flex-col gap-2 px-4 py-3 group">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide group-hover:text-slate-700 transition-colors">{c.timeRange}</span>
                    <span className={`text-[12px] font-semibold leading-relaxed ${isNotAllowed ? 'text-red-600' : 'text-slate-800'}`}>{c.fee}</span>
                  </div>;
               })}
            </div>
          </div>

          {/* Reissue */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden transition-all hover:border-[#C9A84C]/50 hover:shadow-sm">
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100 bg-slate-50/50">
               <span className="text-lg">🔄</span><span className="text-xs font-bold uppercase tracking-widest text-[#0A203E]">Date Change Policy</span>
            </div>
            <div className="px-1 py-1 divide-y divide-slate-50">
               {reissue?.map((c, i) => {
                  const isNotAllowed = c.fee && (c.fee.toLowerCase().includes("not allowed") || c.fee.toLowerCase().includes("strictly not permitted"));
                  return <div key={i} className="flex flex-col gap-2 px-4 py-3 group">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide group-hover:text-slate-700 transition-colors">{c.timeRange}</span>
                    <span className={`text-[12px] font-semibold leading-relaxed ${isNotAllowed ? 'text-orange-600' : 'text-slate-800'}`}>{c.fee}</span>
                  </div>;
               })}
            </div>
          </div>

          {/* Meal & Seat */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden transition-all hover:border-[#C9A84C]/50 hover:shadow-sm">
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100 bg-slate-50/50">
               <span className="text-lg">🍽️</span><span className="text-xs font-bold uppercase tracking-widest text-[#0A203E]">Meals & Seats</span>
            </div>
            <div className="px-1 py-1">
               <div className="flex flex-col gap-1.5 px-4 py-2.5">
                 <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Meal Service</span>
                 <span className="text-[12px] font-medium text-slate-700 leading-relaxed">{mealAndSeat?.meal}</span>
               </div>
               <div className="flex flex-col gap-1.5 px-4 py-2.5 border-t border-slate-50">
                 <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Seat Selection</span>
                 <span className="text-[12px] font-medium text-slate-700 leading-relaxed">{mealAndSeat?.seat}</span>
               </div>
            </div>
          </div>

          {/* Notes Full Width */}
          {notes && notes.length > 0 && (
            <div className="md:col-span-2 pt-2">
               <div className="flex items-center gap-2 mb-3">
                 <span className="w-1 h-3 bg-indigo-500 rounded-full"></span>
                 <p className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">Important Provisions</p>
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                 {notes.map((note, i) => {
                    if(!note) return null;
                    const isWarning = note.toUpperCase().includes("GST") || note.toUpperCase().includes("EXTRA") || note.toUpperCase().includes("NOT PERMITTED");
                    return (
                      <div key={i} className={`flex items-start gap-3 text-sm px-4 py-3.5 rounded-xl border transition-all hover:shadow-sm ${isWarning ? "bg-gradient-to-br from-amber-50 to-white border-amber-200" : "bg-gradient-to-br from-indigo-50/50 to-white border-indigo-100"}`}>
                        <span className="mt-0.5 text-[16px] shrink-0">{isWarning ? "⚠️" : "📌"}</span>
                        <span className={`text-[12.5px] leading-relaxed font-medium ${isWarning ? 'text-amber-900' : 'text-slate-700'}`}>{note}</span>
                      </div>
                    );
                 })}
               </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export const FareRulesAccordion = ({ parsedRules = [], title = "" }) => {
  if (!parsedRules || parsedRules.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-400 text-sm">
        Fare rules not available.
      </div>
    );
  }

  // Derive airline from first rule
  const airlineCode = (parsedRules[0]?.airline || "").toUpperCase();
  const theme = airlineThemes[airlineCode] || airlineThemes.DEFAULT;
  const name = airlineNames[airlineCode] || airlineCode;

  return (
    <div className="space-y-3">
      {title && <h3 className="font-bold text-lg text-gray-800 mb-2">{title}</h3>}
      {/* Airline Header Banner */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl bg-[#0A203E] text-white shadow`}>
        <img
          src={airlineLogo(airlineCode)}
          alt={name}
          className="w-9 h-9 rounded-full bg-white p-0.5 object-contain"
          onError={(e) => { e.target.style.display = "none"; }}
        />
        <div>
          <p className="font-semibold text-sm">{name}</p>
          <p className="text-xs opacity-75">
            {parsedRules.map((r) => `${r.origin} → ${r.destination}`).join("  ·  ")}
          </p>
        </div>
      </div>

      {parsedRules.map((rule, i) => (
        <RuleCard key={i} fareRule={rule} theme={theme} />
      ))}
    </div>
  );
};

// Price Summary Component
export const PriceSummary = ({
  parsedFlightData,
  discountAmount = 0,
  selectedSeats = {},
  selectedMeals = {},
  selectedBaggage = {},
  travelers = [],
  approver,
  approverLoading,
  approverError,
  onSendForApproval,
  loading = false,
  disabled = false,
  approvalRequired = true,
}) => {
  if (!parsedFlightData) return null;

  const travelerCount = Math.max(travelers.length || 1);
  const baseFareIsTotal = parsedFlightData.baseFareIsTotal === true;

  const baseFare = Math.ceil(parsedFlightData.baseFare) || 0;
  const taxFare =
    Math.ceil(parsedFlightData.taxFare) +
    Math.ceil(parsedFlightData.otherCharges);

  const totalSeatPrice = useMemo(() => {
    let sum = 0;
    Object.values(selectedSeats || {}).forEach((v) => {
      if (!v?.priceMap || !v?.list) return;
      v.list.forEach((seat) => {
        sum += Number(v.priceMap[seat] || 0);
      });
    });
    return sum;
  }, [selectedSeats]);

  const totalMealPrice = useMemo(() => {
    let sum = 0;

    Object.values(selectedMeals || {}).forEach((meals) => {
      if (!Array.isArray(meals)) return;
      meals.forEach((meal) => {
        if (meal?.Price) {
          sum += Number(meal.Price || 0);
        }
      });
    });

    return sum;
  }, [selectedMeals]);

  const totalBaggagePrice = useMemo(() => {
    let sum = 0;

    Object.values(selectedBaggage || {}).forEach((bag) => {
      if (bag?.Price) {
        sum += Number(bag.Price || 0) * travelers.length;
      }
    });

    return sum;
  }, [selectedBaggage, travelers.length]);

  const subtotal =
    baseFare + taxFare + totalSeatPrice + totalMealPrice + totalBaggagePrice;

  const totalAmount = Math.max(0, subtotal - discountAmount);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-[#0A203E] text-white p-5 border-b border-[#C9A84C]/20">
        <h3 className="text-xl font-black uppercase tracking-tight">Fare Summary</h3>
        <p className="text-[10px] text-[#C9A84C] font-black uppercase tracking-widest mt-1">Complete price breakdown</p>
      </div>

      <div className="p-5 space-y-3">
        {/* Base Fare */}
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">
            {baseFareIsTotal
              ? "Total Fare (Incl.Taxes & Extra charges)"
              : `Base Fare (${travelerCount} Adult)`}
          </span>
          <span className="font-semibold">₹{baseFare.toLocaleString()}</span>
        </div>

        {/* Taxes */}
        {taxFare > 0 && (
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Taxes & Fees</span>
            <span className="font-semibold">₹{taxFare.toLocaleString()}</span>
          </div>
        )}

        {/* Seat Charges */}
        {totalSeatPrice > 0 && (
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Seat Charges</span>
            <span className="font-semibold">
              ₹{totalSeatPrice.toLocaleString()}
            </span>
          </div>
        )}

        {/* Baggage Charges */}
        {totalBaggagePrice > 0 && (
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Extra Baggage</span>
            <span className="font-semibold">
              ₹{totalBaggagePrice.toLocaleString()}
            </span>
          </div>
        )}

        {/* Meal Charges */}
        {totalMealPrice > 0 && (
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Meals</span>
            <span className="font-semibold">
              ₹{totalMealPrice.toLocaleString()}
            </span>
          </div>
        )}

        {/* Discount */}
        {discountAmount > 0 && (
          <div className="flex justify-between text-green-600">
            <span className="text-sm font-semibold">Discount</span>
            <span className="font-semibold">
              -₹{discountAmount.toLocaleString()}
            </span>
          </div>
        )}

        <div className="border-t border-slate-200 pt-4 mt-2 flex justify-between items-center">
          <span className="text-base font-black text-slate-900 uppercase tracking-tight">Total Payable</span>
          <span className="text-2xl font-black text-[#0A203E]">
            ₹{totalAmount.toLocaleString()}
          </span>
        </div>

        <button
          type="button"
          onClick={!loading && !disabled ? onSendForApproval : undefined}
          disabled={loading || disabled}
          className={`w-full text-white font-black px-3 py-4 flex items-center justify-center rounded-xl transition-all uppercase tracking-widest text-xs shadow-lg
            ${
              loading || disabled
                ? "bg-slate-300 text-slate-500 cursor-not-allowed shadow-none"
                : "bg-[#0A203E] hover:brightness-110 shadow-[#0A203E]/20"
            }`}
        >
          {loading ? "Submitting..." : disabled ? "Complete details to submit" : (approvalRequired ? "Send For Approval" : "Confirm & Book")}
        </button>
        {/* Approver Message */}
        <div className="mt-3 text-sm text-center">
          {approverLoading && (
            <p className="text-gray-500">Fetching approver details...</p>
          )}

          {approverError && <p className="text-red-500">{approverError}</p>}

          {approvalRequired && !approverLoading && approver && (
            <p className="text-gray-700">
              Your request will be sent to{" "}
              <span className="font-semibold">{approver.name}</span> (
              {approver.email})
            </p>
          )}

          {/* {!approverLoading && !approver && !approverError && (
            <p className="text-red-500">
              No approver assigned to your account.
            </p>
          )} */}
        </div>
      </div>
    </div>
  );
};

// Important Information Component
export const ImportantInformation = ({
  expandedSections = {},
  onToggleSection,
  fareRules = null,
  fareRulesStatus = "idle",
}) => {
  const fareRuleContent = [];
  if (fareRulesStatus === "loading") {
    fareRuleContent.push("Fetching fare rules...");
  } else if (!fareRules || fareRules.length === 0) {
    fareRuleContent.push("No fare rules available for this fare.");
  } else {
    const firstRule = Array.isArray(fareRules) ? fareRules[0] : fareRules;
    fareRuleContent.push(
      "Cancellation Policy:",
      ...(firstRule?.cancellation || []).map((x) => `• ${x.timeRange}: ${x.fee}`),
      "",
      "Date Change Policy:",
      ...(firstRule?.reissue || []).map((x) => `• ${x.timeRange}: ${x.fee}`),
      "",
      "Baggage Rules:",
      `• Check-in: ${firstRule?.baggage?.checkIn || "N/A"}`,
      `• Cabin: ${firstRule?.baggage?.cabin || "N/A"}`,
      ""
    );
    if (firstRule?.notes?.length > 0) {
      fareRuleContent.push("Important Information:");
      fareRuleContent.push(
        ...firstRule.notes.slice(0, 5).map((x) => `• ${x}`)
      );
    }
  }

  const sections = [
    {
      key: "fareRules",
      title: "Fare Rules",
      content: fareRuleContent,
    },
    {
      key: "checkIn",
      title: "Check-in Policy",
      content: [
        "• Web check-in opens 48 hours before departure",
        "• Airport check-in: 2 hours before domestic, 3 hours before international",
        "• Boarding gate closes 25 minutes before departure",
      ],
    },
    {
      key: "travelDocs",
      title: "Travel Documents",
      content: [
        "• Valid government-issued photo ID required",
        "• Passport mandatory for international flights",
        "• Visa requirements vary by destination",
      ],
    },
  ];

  return (
    <div className="space-y-3">
      {sections.map((section) => (
        <div
          key={section.key}
          className="border border-gray-200 rounded-lg overflow-hidden"
        >
          <button
            onClick={() => onToggleSection(section.key)}
            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition"
          >
            <span className="font-semibold text-gray-900">{section.title}</span>
            {expandedSections[section.key] ? (
              <AiOutlineMinus className="text-gray-600" />
            ) : (
              <AiOutlinePlus className="text-gray-600" />
            )}
          </button>
          {expandedSections[section.key] && (
            <div className="p-4 space-y-2 text-sm text-gray-600 bg-white">
              {section.content.map((line, idx) => (
                <p key={idx}>{line}</p>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const isInternationalTrip = (parsedFlightData) => {
  if (!parsedFlightData) return false;

  const checkSegments = (segments = []) =>
    segments.some(
      (s) =>
        s?.da?.countryCode &&
        s?.aa?.countryCode &&
        s.da.countryCode !== s.aa.countryCode,
    );

  if (parsedFlightData.type === "one-way") {
    return checkSegments(parsedFlightData.segments);
  }

  if (parsedFlightData.type === "round-trip") {
    return (
      checkSegments(parsedFlightData.onwardSegments) ||
      checkSegments(parsedFlightData.returnSegments)
    );
  }

  if (parsedFlightData.type === "multi-city") {
    return (parsedFlightData.allSegmentsData || []).some((seg) =>
      checkSegments(seg.segments),
    );
  }

  return false;
};

const calculateAgeFromDOB = (dob) => {
  if (!dob) return "";

  const birthDate = new Date(dob);
  const today = new Date();

  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();

  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
};

export const TravelerForm = ({
  travelers = [],
  updateTraveler,
  errors = {},
  parsedFlightData,
  purposeOfTravel,
  setPurposeOfTravel,
  isInternational: isIntlFromProp,
  onAddTraveler,
  canAddMore = false,
  gstDetails = { gstin: "", legalName: "", address: "", gstEmail:"", },
  setGstDetails = () => {},
}) => {
  if (!Array.isArray(travelers)) travelers = [];

  const isInternational =
    isIntlFromProp ?? isInternationalTrip(parsedFlightData);

  const adultOptions = travelers
    .map((t, idx) =>
      t?.type === "INFANT" || t?.type === "CHILD"
        ? null
        : { value: idx, label: `Adult ${idx + 1}` },
    )
    .filter(Boolean);

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
      {/* ================= HEADER ================= */}
      <div className="bg-[#0A203E] text-white p-6 border-b border-[#C9A84C]/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#C9A84C] rounded-full flex items-center justify-center shadow-lg shadow-[#C9A84C]/20">
              <FaUser className="text-[#0A203E] text-xl" />
            </div>
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tight">Traveler Details</h2>
              <p className="text-[11px] text-[#C9A84C] font-black uppercase tracking-widest mt-0.5">
                Enter passenger information
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ================= BODY ================= */}
      <div className="p-6 space-y-6 bg-linear-to-b from-gray-50 to-white">
        {/* ================= PURPOSE OF TRAVEL ================= */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-black text-[#0A203E] uppercase tracking-widest mb-3">
            Purpose of Travel <span className="text-[#C9A84C]">*</span>
          </h3>

          <textarea
            rows={3}
            value={purposeOfTravel || ""}
            onChange={(e) => setPurposeOfTravel(e.target.value)}
            placeholder="E.g. Client meeting, Project deployment, Training, Conference"
            className={`w-full px-4 py-3 border-2 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.purposeOfTravel ? "border-red-400" : "border-gray-300"
            }`}
            required
          />

          {errors.purposeOfTravel && (
            <p className="text-sm text-red-600 mt-1 font-medium">
              {errors.purposeOfTravel}
            </p>
          )}

          <p className="text-xs text-gray-500 mt-2">
            This information is mandatory for approval by the travel
            administrator.
          </p>
        </div>

        {/* ================= GST DETAILS ================= */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-black text-[#0A203E] uppercase tracking-widest">
              GST Details
            </h3>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded uppercase tracking-wider">
              Fetched from Profile
            </span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                GSTIN
              </label>
              <input
                type="text"
                value={gstDetails.gstin || ""}
                readOnly
                placeholder="GSTIN"
                className="w-full px-4 py-3 border-2 border-gray-100 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed font-medium"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Legal Name
              </label>
              <input
                type="text"
                value={gstDetails.legalName || ""}
                readOnly
                placeholder="Company legal name"
                className="w-full px-4 py-3 border-2 border-gray-100 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed font-medium"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                GST Email
              </label>
              <input
                type="text"
                value={gstDetails.gstEmail || ""}
                readOnly
                placeholder="GST Email"
                className="w-full px-4 py-3 border-2 border-gray-100 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed font-medium"
              />
            </div>
            <div className="lg:col-span-3">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Billing Address
              </label>
              <input
                type="text"
                value={gstDetails.address || ""}
                readOnly
                placeholder="Street, City, State, PIN"
                className="w-full px-4 py-3 border-2 border-gray-100 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed font-medium"
              />
            </div>
          </div>
          <p className="mt-4 text-[11px] text-gray-400 italic">
            * Note: GST details are managed by your Travel Administrator. Please contact them for any corrections.
          </p>
        </div>

        {travelers.map((traveler, index) => (
          <div
            key={traveler.id ?? index}
            className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition"
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase">
                  Passenger {index + 1}
                </p>
                <p className="text-sm font-bold text-gray-800">
                  {(traveler.type || "ADULT").toUpperCase()}
                </p>
              </div>
              {traveler.type === "INFANT" && (
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-[#0A203E] text-[#C9A84C] font-black uppercase tracking-widest">
                  Linked Passenger Required
                </span>
              )}
            </div>
            {/* ===== Name Section ===== */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <select
                  value={traveler.title || "MR"}
                  onChange={(e) => {
                    const newTitle = e.target.value;
                    let newGender = traveler.gender;
                    if (["MR", "MSTR"].includes(newTitle)) newGender = "MALE";
                    if (["MRS", "MS", "MISS"].includes(newTitle)) newGender = "FEMALE";
                    
                    updateTraveler(traveler.id, "title", newTitle);
                    if (newGender) updateTraveler(traveler.id, "gender", newGender);
                  }}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg"
                  required
                >
                  {((traveler.type || "ADULT") === "ADULT"
                    ? ["MR", "MRS", "MS", "MISS"]
                    : ["MSTR", "MISS"]
                  ).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt === "MSTR" ? "Master" : opt === "MR" ? "Mr" : opt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={traveler.firstName || ""}
                  onChange={(e) =>
                    updateTraveler(
                      traveler.id,
                      "firstName",
                      e.target.value.toUpperCase().replace(/[^A-Z ]/g, ""),
                    )
                  }
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Middle Name
                </label>
                <input
                  type="text"
                  value={traveler.middleName || ""}
                  onChange={(e) =>
                    updateTraveler(
                      traveler.id,
                      "middleName",
                      e.target.value.toUpperCase().replace(/[^A-Z ]/g, ""),
                    )
                  }
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={traveler.lastName || ""}
                  onChange={(e) =>
                    updateTraveler(
                      traveler.id,
                      "lastName",
                      e.target.value.toUpperCase().replace(/[^A-Z ]/g, ""),
                    )
                  }
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg"
                  required
                />
              </div>
            </div>

            {/* ===== Primary Adult Extra Fields ===== */}
            {index === 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={traveler.email || ""}
                    onChange={(e) =>
                      updateTraveler(traveler.id, "email", e.target.value)
                    }
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <PhoneInput
                    country={"in"}
                    value={traveler.phoneWithCode || ""}
                    onChange={(phone, countryData) => {
                      updateTraveler(traveler.id, "phoneWithCode", phone);

                      // set nationality to 2-letter ISO code
                      const isoCode = countryData?.countryCode?.toUpperCase();
                      if (isoCode) {
                        updateTraveler(traveler.id, "nationality", isoCode);
                      }
                    }}
                    enableSearch
                    containerStyle={{ width: "100%" }}
                    inputStyle={{
                      width: "100%",
                      height: "48px",
                      border: errors?.[index]?.phoneWithCode
                        ? "2px solid #ef4444"
                        : "2px solid #d1d5db",
                      borderRadius: "0.5rem",
                      paddingLeft: "48px",
                    }}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Nationality<span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={traveler.nationality || "IN"}
                    readOnly
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
                  />
                </div>
              </div>
            )}

            {/* ===== Gender + DOB + Calculated Age ===== */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
              {/* Gender */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Gender <span className="text-red-500">*</span>
                </label>
                <select
                  value={traveler.gender || "MALE"}
                  onChange={(e) =>
                    updateTraveler(traveler.id, "gender", e.target.value)
                  }
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg"
                  required
                >
                  <option value="">Select Gender</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              {/* DOB */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={traveler.dob || ""}
                  onChange={(e) => {
                    const dob = e.target.value;
                    const age = calculateAgeFromDOB(dob);

                    updateTraveler(traveler.id, "dob", dob);
                    updateTraveler(traveler.id, "age", age); // derived
                  }}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg"
                />
              </div>

              {/* Calculated Age (Read-only) */}
              {traveler.dob && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Age (Auto-calculated)
                  </label>
                  <input
                    type="text"
                    value={traveler.age || ""}
                    readOnly
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
                  />
                </div>
              )}
            </div>

            {traveler.type === "INFANT" && adultOptions.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Linked Adult <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={
                      typeof traveler.linkedAdultIndex === "number"
                        ? traveler.linkedAdultIndex
                        : ""
                    }
                    onChange={(e) =>
                      updateTraveler(
                        traveler.id,
                        "linkedAdultIndex",
                        Number(e.target.value),
                      )
                    }
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg"
                    required
                  >
                    <option value="" disabled>
                      Select adult
                    </option>
                    {adultOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {errors?.[index]?.linkedAdultIndex && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors[index].linkedAdultIndex}
                    </p>
                  )}
                </div>
              </div>
            )}

            {isInternational && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Passport Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={traveler.passportNumber || ""}
                    onChange={(e) =>
                      updateTraveler(
                        traveler.id,
                        "passportNumber",
                        e.target.value,
                      )
                    }
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg"
                    required
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Passport Issue <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={traveler.PassportIssueDate || ""}
                      onChange={(e) =>
                        updateTraveler(
                          traveler.id,
                          "PassportIssueDate",
                          e.target.value,
                        )
                      }
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Passport Expiry <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={traveler.passportExpiry || ""}
                      onChange={(e) =>
                        updateTraveler(
                          traveler.id,
                          "passportExpiry",
                          e.target.value,
                        )
                      }
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ===== Note ===== */}
            <div className="mt-6 bg-blue-50 border-l-4 border-blue-900 p-4 rounded-lg">
              <p className="text-sm text-gray-700">
                <span className="font-bold text-blue-900">Note:</span> Ensure
                all details match your government ID.
              </p>
            </div>
          </div>
        ))}

        {canAddMore && (
          <button
            type="button"
            onClick={onAddTraveler}
            className="w-full py-3 border-2 border-dashed border-blue-200 text-blue-700 font-semibold rounded-lg hover:border-blue-400 hover:bg-blue-50 transition"
          >
            + Add Traveler
          </button>
        )}
      </div>
    </div>
  );
};

export const CTABox = () => {
  return (
    <div className="bg-[#0A203E] rounded-2xl p-5 shadow-lg border border-[#C9A84C]/20 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#C9A84C]/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
      <div className="flex items-center gap-4 relative z-10">
        <div className="w-12 h-12 bg-[#C9A84C] rounded-full flex items-center justify-center shrink-0 shadow-lg shadow-[#C9A84C]/20">
          <BsInfoCircleFill className="text-[#0A203E] text-xl" />
        </div>
        <div>
          <p className="text-[10px] font-black text-[#C9A84C] uppercase tracking-widest">Need Assistance?</p>
          <p className="text-sm font-bold text-white mt-0.5">
            Call us at <span className="text-[#C9A84C]">1800-123-4567</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export const HotelHomeButton = () => {
  const navigate = useNavigate();
  return (
    <div className="bg-white rounded-lg border border-gray-300 p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-[#C9A84C] rounded-xl flex items-center justify-center shadow-lg shadow-[#C9A84C]/20">
          <RiHotelLine className="text-[#0A203E] text-xl font-bold" />
        </div>
        <span className="text-base font-black text-[#0A203E] uppercase tracking-tight">
          Need a Hotel?
        </span>
      </div>
      {/* <p className="text-xs text-gray-600">
        Save up to 20% when booking hotel with your flight
      </p> */}
      <button
        onClick={() => navigate("/travel", { state: { activeTab: "hotel" } })}
        className="w-full py-3 border border-[#0A203E] text-[#0A203E] rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#0A203E] hover:text-white transition-all duration-300 cursor-pointer shadow-sm active:scale-95"
      >
        Browse Hotels
      </button>
    </div>
  );
};

export const Amenities = () => {
  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200">
      <h4 className="text-sm font-semibold text-gray-900 mb-3">Amenities</h4>
      <div className="flex flex-wrap gap-2">
        <span className="px-3 py-1.5 border border-gray-300 text-gray-900 rounded-full text-xs font-medium flex items-center gap-1.5">
          <FaWifi />
          Wi-Fi
        </span>
        <span className="px-3 py-1.5 border border-gray-300 text-gray-900 rounded-full text-xs font-medium flex items-center gap-1.5">
          <PiForkKnifeBold />
          Meal
        </span>
        <span className="px-3 py-1.5 border border-gray-300 text-gray-900 rounded-full text-xs font-medium flex items-center gap-1.5">
          <BsTag />
          Power
        </span>
      </div>
    </div>
  );
};

// ─── Fare Options ────────────────────────────────────────────────────────
export const FareOptions = ({ fareRules = null, fareRulesStatus = "idle" }) => {
  const [open, setOpen] = useState({
    cancellation: true,
    dateChange: true,
    important: false,
  });
  const toggle = (key) => setOpen((prev) => ({ ...prev, [key]: !prev[key] }));

  if (fareRulesStatus === "loading") {
    return (
      <div className="flex flex-col items-center justify-center bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="loader mb-3"></div>
        <p className="text-gray-600 text-sm">Loading fare rules...</p>
      </div>
    );
  }

  if (!fareRules) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 text-center text-gray-500 text-sm">
         Fare rules not available for this fare.
      </div>
    );
  }

  const results = fareRules?.Response?.Results || fareRules;
  const miniFareRules = Array.isArray(results?.MiniFareRules)
    ? results.MiniFareRules.flat()
    : [];

  const cancellationRules = miniFareRules.filter(
    (rule) => rule.Type === "Cancellation",
  );
  const reissueRules = miniFareRules.filter((rule) => rule.Type === "Reissue");

  const fareBasisCode = results?.FareRules?.[0]?.FareBasisCode || "";
  const airlineRemark = results?.AirlineRemark || "";
  const isRefundable = results?.IsRefundable;

  const formatTimeRange = (from, to, unit) => {
    if (!from && !to) return "Anytime";
    if (from && !to)
      return `More than ${from} ${unit.toLowerCase()} before departure`;
    if (!from && to) return `Within ${to} ${unit.toLowerCase()} of departure`;
    return `${from}-${to} ${unit.toLowerCase()} before departure`;
  };

  const sections = [
    {
      key: "cancellation",
      title: "Cancellation Charges",
      icon: <span className="text-xl">❌</span>,
      color: "text-[#0A203E]",
      data: cancellationRules,
      hasData: cancellationRules.length > 0,
    },
    {
      key: "dateChange",
      title: "Date Change Charges",
      icon: <span className="text-xl">🔄</span>,
      color: "text-[#0A203E]",
      data: reissueRules,
      hasData: reissueRules.length > 0,
    },
    {
      key: "important",
      title: "Important Information",
      icon: <span className="text-xl">ℹ️</span>,
      color: "text-[#C9A84C]",
      data: { fareBasisCode, airlineRemark, isRefundable },
      hasData: !!(fareBasisCode || airlineRemark || isRefundable !== undefined),
    },
  ];

  return (
    <div className="space-y-5">
      {sections.map(
        (sec) =>
          sec.hasData && (
            <div
              key={sec.key}
              className="border border-gray-200 bg-white rounded-xl shadow-sm overflow-hidden transition-all hover:shadow-md"
            >
              <button
                onClick={() => toggle(sec.key)}
                className="w-full flex items-center justify-between px-6 py-4 bg-gray-50 hover:bg-gray-100 transition"
              >
                <div className="flex items-center gap-3">
                  <span className={sec.color}>{sec.icon}</span>
                  <span className="font-semibold text-gray-800 text-sm md:text-base">
                    {sec.title}
                  </span>
                </div>
                {open[sec.key] ? (
                  <span className="text-gray-500 text-sm">▲</span>
                ) : (
                  <span className="text-gray-500 text-sm">▼</span>
                )}
              </button>
              {open[sec.key] && (
                <div className="px-6 py-4 bg-white border-t border-gray-100 animate-fadeIn space-y-3">
                  {sec.key === "cancellation" &&
                    sec.data.map((rule, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-start py-2 border-b last:border-0 border-gray-100"
                      >
                        <div className="flex-1 pr-4">
                          <p className="font-medium text-gray-800 text-sm">
                            {formatTimeRange(rule.From, rule.To, rule.Unit)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {rule.JourneyPoints}
                          </p>
                        </div>
                        <p className="text-right font-semibold text-gray-900 text-sm">
                          {rule.Details}
                        </p>
                      </div>
                    ))}
                  {sec.key === "dateChange" &&
                    sec.data.map((rule, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-start py-2 border-b last:border-0 border-gray-100"
                      >
                        <div className="flex-1 pr-4">
                          <p className="font-medium text-gray-800 text-sm">
                            {formatTimeRange(rule.From, rule.To, rule.Unit)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {rule.JourneyPoints}
                          </p>
                        </div>
                        <p className="text-right font-semibold text-gray-900 text-sm">
                          {rule.Details}
                        </p>
                      </div>
                    ))}
                  {sec.key === "important" && (
                    <div className="space-y-3 text-sm text-gray-700">
                      {sec.data.fareBasisCode && (
                        <div className="flex items-center justify-between py-1">
                          <span className="text-gray-500">Fare Basis</span>
                          <span className="font-bold uppercase tracking-wider text-gray-900 bg-gray-100 px-2 py-0.5 rounded">
                            {sec.data.fareBasisCode}
                          </span>
                        </div>
                      )}
                      {sec.data.isRefundable !== undefined && (
                        <div className="flex items-center justify-between py-1 border-t border-gray-50 pt-3">
                          <span className="text-gray-500">Refund Type</span>
                          <span
                            className={`font-semibold px-2 py-0.5 rounded ${
                              sec.data.isRefundable
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {sec.data.isRefundable ? "Refundable" : "Non-Refundable"}
                          </span>
                        </div>
                      )}
                      {sec.data.airlineRemark && (
                        <div className="mt-3 p-4 bg-[#0A203E]/5 border border-[#0A203E]/10 rounded-xl text-xs leading-relaxed text-[#0A203E]">
                          <span className="font-black uppercase tracking-widest text-[10px] text-[#C9A84C] block mb-1">
                            Airline Remark
                          </span>
                          <span className="font-bold">
                            {(() => {
                              const remark = sec.data.airlineRemark || "";
                              return remark.replace(/(.+?)\1{3,}/g, "$1");
                            })()}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
      )}
    </div>
  );
};

export default {
  orangeText,
  orangeBg,
  blueBg,
  blueText,
  grayText,
  greenText,
  lightGreenBg,
  formatTime,
  formatDate,
  getAirlineLogo,
  formatDuration,
  formatDurationCompact,
  parseFlightData,
  FlightTimeline,
  RoundTripFlightTimeline,
  FareOptions,
  PriceSummary,
  ImportantInformation,
  TravelerForm,
  FareRulesAccordion,
  CTABox,
  HotelHomeButton,
  Amenities,
};
