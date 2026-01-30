// Common Components
import React, { useMemo, useState } from "react";
import {
  MdCancel,
  MdDateRange,
  MdEventSeat,
  MdInfo,
  MdLuggage,
} from "react-icons/md";
import { FaWifi, FaUser, FaPlaneArrival } from "react-icons/fa";
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

// Updated color scheme - clean and minimal
export const orangeText = "text-blue-600";
export const orangeBg = "bg-blue-600";
export const blueBg = "bg-gray-800";
export const blueText = "text-gray-800";
export const grayText = "text-gray-500";
export const greenText = "text-green-600";
export const lightGreenBg = "bg-green-50";

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
    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-12">
      {segments.map((segment, idx) => {
        const dep = formatDateTime(segment.dt);
        const arr = formatDateTime(segment.at);

        return (
          <div key={idx} className="relative">
            {/* HORIZONTAL FLIGHT ROW */}
            <div className="flex items-center justify-between relative">
              {/* Departure */}
              <div className="flex flex-col items-center text-center w-1/4">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center mb-2 shadow-md">
                  <FaPlaneDeparture className="text-white text-sm" />
                </div>
                <p className="text-lg font-bold text-gray-900">{dep.time}</p>
                <p className="text-xs text-gray-500">{dep.date}</p>
                <p className="text-xs text-gray-500">{segment.da?.name}</p>
                <p className="mt-1 font-semibold text-gray-900">
                  {segment.da?.city}
                  {/* ({segment.da?.code}) */}
                </p>
                <p className="text-xs text-blue-600 font-medium">
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
                      <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow duration-300 min-w-[220px]">
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
                                    <div className=" bg-green-50 border border-green-200 rounded-lg p-1.5">
                                      <p className="text-xs font-semibold text-green-600">
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
                              return "Seats loading…";
                            if (isSeatReady === "error")
                              return "Unable to load seats";
                            if (isSeatReady === "none")
                              return "No seats available";
                            if (isSeatReady === true) return "Select Seats";
                            return "Seats loading…";
                          };

                          const seatDisabled = isSeatReady !== true;

                          return (
                            <button
                              onClick={() =>
                                !seatDisabled && openSeatModal(idx)
                              }
                              disabled={seatDisabled}
                              className={`mt-3 w-full flex items-center justify-center gap-2 text-sm font-semibold rounded-lg py-2 transition
        ${
          seatDisabled
            ? "bg-gray-200 text-gray-400 border border-gray-300 cursor-not-allowed"
            : "text-blue-600 border border-blue-600 hover:border-[#0A4D68] hover:bg-[#0A4D68] hover:text-white"
        }
      `}
                            >
                              <MdEventSeat />
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
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center mb-2 shadow-md">
                  <FaPlaneArrival className="text-white text-sm" />
                </div>
                <p className="text-lg font-bold text-gray-900">{arr.time}</p>
                <p className="text-xs text-gray-500">{arr.date}</p>
                <p className="text-xs text-gray-500">{segment.aa?.name}</p>
                <p className="mt-1 font-semibold text-gray-900">
                  {segment.aa?.city}
                  {/* ({segment.aa?.code}) */}
                </p>
                <p className="text-xs text-blue-600 font-medium">
                  Terminal {segment.aa?.terminal || "N/A"}
                </p>
              </div>
            </div>

            {/* Layover */}
            {idx < segments.length - 1 && (
              <div className="flex justify-center mx-auto mt-14">
                <div className="flex items-center gap-2 px-6 h-10 rounded-lg bg-blue-50 border border-blue-200 text-sm font-medium text-blue-700 shadow-sm">
                  <HiOutlineLocationMarker className="text-blue-600" />
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
          <div className="px-6 py-4 bg-linear-to-r from-blue-50 to-blue-100 border-b border-gray-200">
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

export const MealSelectionCards = ({
  meals = [],
  selectedMeals = {},
  onToggleMeal,
  journeyType,
  flightIndex,
  travelersCount = 1,
  onClearMeals,
  onConfirm,
}) => {
  const normalizedMeals = normalizeSSRList(meals).filter(
    (m) => m.Code !== "NoMeal",
  );

  if (!normalizedMeals.length) {
    return (
      <p className="text-sm text-gray-500 text-center py-6">
        No meals available for this flight
      </p>
    );
  }

  const key = `${journeyType}|${flightIndex}`;
  const selected = selectedMeals[key] || [];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
          🍱 Choose Your Meal
        </h2>
        <button
          onClick={() => onClearMeals?.(journeyType, flightIndex)}
          className="text-sm font-semibold text-gray-500 hover:text-red-600"
        >
          Clear All
        </button>
      </div>

      {/* Meal Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {normalizedMeals.map((meal, idx) => {
          const isSelected = selected.some((m) => m.Code === meal.Code);

          return (
            <div
              key={idx}
              className={`group relative border rounded-2xl p-4 flex flex-col justify-between shadow-sm transition-all duration-200 hover:shadow-lg ${
                isSelected
                  ? "border-green-500 bg-green-50"
                  : "border-gray-200 bg-white hover:border-orange-400"
              }`}
            >
              {/* Top Section */}
              <div className="flex gap-4 items-center">
                {/* Icon */}
                <div
                  className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 transition ${
                    isSelected ? "bg-green-100" : "bg-orange-50"
                  }`}
                >
                  <PiForkKnifeBold
                    className={`text-2xl transition ${
                      isSelected ? "text-green-600" : "text-orange-600"
                    }`}
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-800 text-sm sm:text-base truncate">
                    {meal.AirlineDescription || "Meal Option"}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {meal.Description || "Delicious in-flight meal"}
                  </p>
                </div>
              </div>

              {/* Price + Button */}
              <div className="mt-4 flex justify-between items-center">
                <div className="text-lg font-bold text-orange-600">
                  ₹{meal.Price}
                </div>
                <button
                  onClick={() =>
                    onToggleMeal(journeyType, flightIndex, meal, travelersCount)
                  }
                  className={`px-4 py-1.5 text-sm font-semibold rounded-full shadow-sm transition-all duration-200 ${
                    isSelected
                      ? "bg-red-500 text-white hover:bg-red-600"
                      : "bg-orange-600 text-white hover:bg-orange-700"
                  }`}
                >
                  {isSelected ? "Remove" : "Add Meal"}
                </button>
              </div>

              {/* Selection Ribbon (MMT style) */}
              {isSelected && (
                <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">
                  Selected
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Actions */}
      <div className="flex justify-end items-center gap-3 pt-3 border-t border-gray-200">
        <button
          onClick={onConfirm}
          className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
        >
          Confirm Selection
        </button>
      </div>
    </div>
  );
};

export const FareOptions = ({ fareRules = null, fareRulesStatus = "idle" }) => {
  const [open, setOpen] = useState({
    cancellation: true,
    dateChange: true,
    important: false,
  });

  const toggle = (key) => setOpen((prev) => ({ ...prev, [key]: !prev[key] }));

  // 🔒 LOGIC UNCHANGED
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
      icon: <MdCancel size={20} />,
      color: "text-red-600",
      data: cancellationRules,
      hasData: cancellationRules.length > 0,
    },
    {
      key: "dateChange",
      title: "Date Change Charges",
      icon: <MdDateRange size={20} />,
      color: "text-orange-600",
      data: reissueRules,
      hasData: reissueRules.length > 0,
    },
    {
      key: "important",
      title: "Important Information",
      icon: <AiOutlineInfoCircle size={20} />,
      color: "text-blue-600",
      data: { fareBasisCode, airlineRemark, isRefundable },
      hasData: !!(fareBasisCode || airlineRemark || isRefundable !== undefined),
    },
  ];

  // 🔒 RENDER LOGIC UNCHANGED — only classes & structure polished
  return (
    <div className="space-y-5">
      {sections.map(
        (sec) =>
          sec.hasData && (
            <div
              key={sec.key}
              className="border border-gray-200 bg-white rounded-xl shadow-sm overflow-hidden transition-all hover:shadow-md"
            >
              {/* Header */}
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
                  <IoChevronUp className="text-gray-500" size={18} />
                ) : (
                  <IoChevronDown className="text-gray-500" size={18} />
                )}
              </button>

              {/* Body */}
              {open[sec.key] && (
                <div className="px-6 py-4 bg-white border-t border-gray-100 animate-fadeIn space-y-3">
                  {/* Cancellation */}
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

                  {/* Date Change */}
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

                  {/* Important */}
                  {sec.key === "important" && (
                    <div className="space-y-3">
                      {sec.data.fareBasisCode && (
                        <div className="p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
                          <p className="text-xs text-gray-600 font-medium uppercase">
                            Fare Basis Code
                          </p>
                          <p className="font-semibold text-blue-900 text-sm">
                            {sec.data.fareBasisCode}
                          </p>
                        </div>
                      )}
                      {sec.data.isRefundable !== undefined && (
                        <div
                          className={`p-3 border-l-4 rounded ${
                            sec.data.isRefundable
                              ? "bg-green-50 border-green-500"
                              : "bg-red-50 border-red-500"
                          }`}
                        >
                          <p className="text-xs text-gray-600 font-medium uppercase">
                            Refund Policy
                          </p>
                          <p
                            className={`font-semibold text-sm ${
                              sec.data.isRefundable
                                ? "text-green-800"
                                : "text-red-800"
                            }`}
                          >
                            {sec.data.isRefundable
                              ? "Refundable"
                              : "Non-Refundable"}
                          </p>
                        </div>
                      )}
                      {sec.data.airlineRemark && (
                        <div className="p-3 bg-gray-50 border-l-4 border-gray-400 rounded">
                          <p className="text-xs text-gray-600 font-medium uppercase">
                            Airline Remark
                          </p>
                          <p className="text-xs text-gray-700 mt-1 leading-relaxed">
                            {sec.data.airlineRemark.split(".")[0]}.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ),
      )}
    </div>
  );
};

export const FareRulesAccordion = ({
  fareRules = null,
  fareRulesStatus = "idle",
}) => {
  const [open, setOpen] = useState(true);

  // ✅ Extract airline data dynamically from API
  // ✅ Extract airline + routing details dynamically and safely
  const airlineInfo =
    fareRules?.data?.Response?.FareRules?.[0] ||
    fareRules?.Response?.FareRules?.[0] ||
    fareRules?.FareRules?.[0] ||
    null;

  // ✅ Normalize airline code (handles SG / 6E / AI / uk etc.)
  const normalizeAirlineCode = (code = "") =>
    code
      .toString()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");

  const airlineCode = normalizeAirlineCode(
    airlineInfo?.AirlineCode || airlineInfo?.Airline || "",
  );

  // ✅ Dynamic airline name fallback
  const airlineName =
    airlineInfo?.AirlineName ||
    airlineInfo?.Airline ||
    airlineCode ||
    "Unknown Airline";

  const origin = airlineInfo?.Origin || "";
  const destination = airlineInfo?.Destination || "";

  // ✅ Theme gradient (dynamic from airlineThemes map)
  const gradient =
    airlineThemes[airlineCode]?.gradient || airlineThemes.DEFAULT.gradient;

  // 🔒 Original Logic (Unchanged)
  const rules =
    fareRules?.FareRules ||
    fareRules?.Response?.FareRules ||
    fareRules?.data?.Response?.FareRules ||
    [];

  const parseFareRuleDetail = (detail) => {
    if (!detail) return null;
    const fareBasisMatch = detail.match(/The FareBasisCode is:\s*(\w+)/i);
    const fareBasisCode = fareBasisMatch ? fareBasisMatch[1] : null;
    const domesticMatch = detail.match(
      /Domestic([\s\S]*?)(?=International|$)/i,
    );
    const internationalMatch = detail.match(/International([\s\S]*?)(?=\*|$)/i);
    const importantNotes = detail.match(/\*[^\r\n]+/g) || [];
    return {
      fareBasisCode,
      domestic: domesticMatch ? domesticMatch[1].trim() : null,
      international: internationalMatch ? internationalMatch[1].trim() : null,
      importantNotes: importantNotes.map((note) =>
        note.replace(/^\*\s*/, "").trim(),
      ),
    };
  };

  const parseBaggageTable = (text) => {
    if (!text) return [];
    const lines = text.split(/\r\n/).filter((l) => l.trim());
    const baggageLines = lines.filter(
      (l) => l.includes("Ex ") && l.includes("Kgs"),
    );
    return baggageLines
      .map((line) => {
        const parts = line.split(/\s+(\d+\s*Kgs?)/i);
        if (parts.length >= 2) {
          return { sector: parts[0].trim(), allowance: parts[1].trim() };
        }
        return null;
      })
      .filter(Boolean);
  };

  // 🔒 Data formatting preserved, UI enhanced
  const formatFareRuleContent = (detail) => {
    const parsed = parseFareRuleDetail(detail);
    if (!parsed) return null;

    const domesticBaggage = parsed.domestic
      ? parseBaggageTable(parsed.domestic)
      : [];
    const internationalBaggage = parsed.international
      ? parseBaggageTable(parsed.international)
      : [];

    return (
      <div className="space-y-8">
        {/* Fare Basis Highlight */}
        {parsed.fareBasisCode && (
          <div
            className={`flex items-center justify-between bg-linear-to-r ${gradient} text-white rounded-xl shadow p-4`}
          >
            <div>
              <p className="text-xs opacity-90 uppercase tracking-wide">
                Fare Basis Code
              </p>
              <h3 className="text-lg font-bold tracking-wider">
                {parsed.fareBasisCode}
              </h3>
            </div>
            <div className="bg-white/20 text-white px-3 py-1 rounded-md text-sm font-medium">
              Airline Rule Info
            </div>
          </div>
        )}

        {/* Domestic Fare Section */}
        {parsed.domestic && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 bg-blue-50 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <span className="text-xl">✈️</span>
                <h3 className="text-sm font-semibold text-gray-800">
                  Domestic Fare Rules
                </h3>
              </div>
              {domesticBaggage.length > 0 && (
                <div className="bg-green-100 text-green-800 px-3 py-1 rounded-md text-xs font-semibold">
                  Free Baggage: {domesticBaggage[0]?.allowance}
                </div>
              )}
            </div>
            <div className="p-5 text-sm text-gray-700 leading-relaxed">
              <p>{parsed.domestic.split(/(?=Free baggage)/i)[0].trim()}</p>
            </div>
          </div>
        )}

        {/* International Fare Section */}
        {parsed.international && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 bg-indigo-50 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <span className="text-xl">🌍</span>
                <h3 className="text-sm font-semibold text-gray-800">
                  International Fare Rules
                </h3>
              </div>
            </div>

            <div className="p-5 text-sm text-gray-700 leading-relaxed">
              <p>{parsed.international.split(/(?=Free baggage)/i)[0].trim()}</p>

              {internationalBaggage.length > 0 && (
                <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800 text-sm mb-3 flex items-center gap-2">
                    🧳 Free Baggage Allowance by Sector
                  </h4>
                  <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {internationalBaggage.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center px-3 py-2 bg-white rounded-md border border-gray-200 hover:border-blue-400 shadow-sm"
                      >
                        <span className="text-xs text-gray-700 font-medium">
                          {item.sector}
                        </span>
                        <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">
                          {item.allowance}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Important Notes */}
        {parsed.importantNotes.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-800">
              Important Notes
            </h4>
            {parsed.importantNotes.map((note, idx) => {
              const isGst =
                note.toUpperCase().includes("GST") ||
                note.toUpperCase().includes("EXTRA");
              const isTime = note.toUpperCase().includes("HOURS BEFORE");
              return (
                <div
                  key={idx}
                  className={`flex items-start gap-3 p-4 rounded-lg border text-sm shadow-sm ${
                    isGst
                      ? "bg-amber-50 border-amber-300 text-amber-800"
                      : isTime
                        ? "bg-yellow-50 border-yellow-300 text-yellow-800"
                        : "bg-blue-50 border-blue-200 text-blue-800"
                  }`}
                >
                  <span className="text-lg leading-none">
                    {isGst ? "⚠️" : isTime ? "🕐" : "ℹ️"}
                  </span>
                  <p className="flex-1 leading-relaxed">{note}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // 🔒 Core logic preserved
  if (fareRulesStatus === "loading") {
    return (
      <div className="border border-gray-200 bg-white rounded-xl p-8 text-center">
        <div className="loader mx-auto mb-3"></div>
        <p className="text-gray-600 text-sm">Loading fare rules...</p>
      </div>
    );
  }

  let fareRuleDetails = null;
  if (fareRules?.important?.length) fareRuleDetails = fareRules.important;
  else if (fareRules?.data?.Response?.FareRules?.length)
    fareRuleDetails = fareRules.data.Response.FareRules.map(
      (r) => r.FareRuleDetail,
    ).filter(Boolean);
  else if (fareRules?.Response?.FareRules?.length)
    fareRuleDetails = fareRules.Response.FareRules.map(
      (r) => r.FareRuleDetail,
    ).filter(Boolean);
  else if (fareRules?.FareRules?.length)
    fareRuleDetails = fareRules.FareRules.map((r) => r.FareRuleDetail).filter(
      Boolean,
    );
  else if (Array.isArray(fareRules))
    fareRuleDetails = fareRules
      .map((r) =>
        typeof r === "string" ? r : r.FareRuleDetail || r.important?.[0],
      )
      .filter(Boolean);
  else if (fareRules?.FareRuleDetail)
    fareRuleDetails = [fareRules.FareRuleDetail];

  if (!fareRuleDetails || fareRuleDetails.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500 text-sm">
        Fare rules not available for this fare.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
      {/* Accordion Header */}
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-6 py-4 bg-linear-to-r ${gradient} text-white font-semibold tracking-wide hover:brightness-110 transition`}
      >
        <div className="flex items-center gap-3">
          <img
            src={airlineLogo(airlineCode)}
            alt={airlineName}
            className="w-8 h-8 rounded-full bg-white p-1"
          />
          <div className="flex flex-col text-left">
            <span className="text-sm font-medium">{airlineName}</span>
            {origin && destination && (
              <span className="text-xs opacity-80">
                {origin} → {destination}
              </span>
            )}
          </div>
        </div>
        {open ? (
          <IoChevronUp className="text-white" size={20} />
        ) : (
          <IoChevronDown className="text-white" size={20} />
        )}
      </button>

      {/* Accordion Content */}
      {open && (
        <div className="bg-gray-50 px-6 py-6 animate-fadeIn space-y-10">
          {fareRuleDetails.map((detail, i) => (
            <div key={i}>{formatFareRuleContent(detail)}</div>
          ))}
        </div>
      )}

      {/* Animations */}
      <style>{`
        .loader {
          width: 24px;
          height: 24px;
          border: 3px solid #3b82f6;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-in-out; }
      `}</style>
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
  onSendForApproval,
  loading = false,
}) => {
  if (!parsedFlightData) return null;

  const travelerCount = Math.max(travelers.length || 1);

  const baseFare = parsedFlightData.baseFare || 0;
  const taxFare = parsedFlightData.taxFare || 0;

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
        sum += Number(meal.Price || 0);
      });
    });

    return sum;
  }, [selectedMeals]);

  const totalBaggagePrice = useMemo(() => {
    let sum = 0;

    Object.values(selectedBaggage || {}).forEach((bag) => {
      if (!bag) return;
      sum += Number(bag.Price || 0) * travelers.length;
    });

    return sum;
  }, [selectedBaggage, travelers.length]);

  const subtotal =
    baseFare + taxFare + totalSeatPrice + totalMealPrice + totalBaggagePrice;

  const totalAmount = Math.max(0, subtotal - discountAmount);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-linear-to-r from-gray-700 to-gray-800 text-white p-5">
        <h3 className="text-xl font-bold">Fare Summary</h3>
        <p className="text-xs text-gray-300 mt-1">Complete price breakdown</p>
      </div>

      <div className="p-5 space-y-3">
        {/* Base Fare */}
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">
            Base Fare ({travelerCount} Adult)
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

        <div className="border-t border-gray-200 pt-3 mt-3 flex justify-between">
          <span className="text-lg font-bold">Total Payable</span>
          <span className="text-xl font-bold text-blue-600">
            ₹{totalAmount.toLocaleString()}
          </span>
        </div>

        <div
          onClick={!loading ? onSendForApproval : undefined}
          className={`text-white font-bold px-3 py-1.5 flex items-center justify-center rounded-xl
    ${
      loading
        ? "bg-gray-400 cursor-not-allowed"
        : "bg-blue-600 hover:bg-[#0A4D68] cursor-pointer"
    }
  `}
        >
          {loading ? "Submitting..." : "Send For Approval"}
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
  const sections = [
    {
      key: "fareRules",
      title: "Fare Rules",
      content: fareRules
        ? [
            "Cancellation Policy:",
            ...fareRules.cancellation.map((x) => "• " + x),
            "",
            "Date Change Policy:",
            ...fareRules.dateChange.map((x) => "• " + x),
            "",
            "Baggage Rules:",
            ...fareRules.baggage.map((x) => "• " + x),
            "",
            "Important Information:",
            ...fareRules.important.map((x) => "• " + x),
          ]
        : [
            fareRulesStatus === "loading"
              ? "Fetching fare rules..."
              : "No fare rules available for this fare.",
          ],
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

// Baggage Table Component
export const BaggageTable = ({
  baggage = [],
  selectable = false,
  selectedBaggage = null,
  onAddBaggage,
  onClearBaggage,
  onConfirm,
}) => {
  if (!Array.isArray(baggage) || baggage.length === 0) {
    return (
      <p className="text-sm text-gray-500 text-center py-6">
        No baggage information available
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-800 flex items-center gap-2">
          🧳 Choose Your Baggage
        </h2>
        {selectable && (
          <button
            onClick={onClearBaggage}
            className="text-sm font-semibold text-gray-500 hover:text-red-600 transition"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Baggage Options Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {baggage.map((bag, idx) => {
          const isAdded =
            selectedBaggage?.Code === bag.Code &&
            selectedBaggage?.Weight === bag.Weight;

          return (
            <div
              key={idx}
              className={`relative border rounded-2xl p-5 shadow-sm transition-all duration-200 hover:shadow-md flex flex-col justify-between ${
                isAdded
                  ? "border-blue-600 bg-blue-50"
                  : "border-gray-200 bg-white hover:border-blue-300"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                {/* Left: Baggage Info */}
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      isAdded ? "bg-blue-100" : "bg-sky-50"
                    }`}
                  >
                    <BsLuggage
                      className={`text-xl ${
                        isAdded ? "text-blue-700" : "text-blue-500"
                      }`}
                    />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800 text-sm sm:text-base">
                      {bag.Weight === 0
                        ? "No Extra Baggage"
                        : `${bag.Weight} Kg Extra`}
                    </h4>
                    <p className="text-xs text-gray-500">
                      {bag.Description || "Add more luggage allowance"}
                    </p>
                  </div>
                </div>

                {/* Right: Action Button */}
                {selectable && (
                  <button
                    onClick={() => onAddBaggage?.(bag)}
                    disabled={isAdded}
                    className={`px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-full transition-all duration-200 shadow-sm ${
                      isAdded
                        ? "bg-gray-300 text-gray-700 cursor-default"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}
                  >
                    {isAdded ? "Added" : "Add"}
                  </button>
                )}
              </div>

              {/* Price */}
              <div className="flex justify-between items-center">
                <p className="text-lg sm:text-xl font-bold text-blue-700">
                  ₹{bag.Price}
                </p>
                {isAdded && (
                  <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                    Selected
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Actions */}
      {selectable && (
        <div className="flex justify-end items-center gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={onConfirm}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition"
          >
            Confirm Selection
          </button>
        </div>
      )}
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
}) => {
  if (!Array.isArray(travelers)) travelers = [];

  const isInternational =
    isIntlFromProp ?? isInternationalTrip(parsedFlightData);

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
      {/* ================= HEADER ================= */}
      <div className="bg-linear-to-r from-[#1a2957] to-[#24a7c] text-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-900 rounded-full flex items-center justify-center shadow-lg">
              <FaUser className="text-white text-xl" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Traveler Details</h2>
              <p className="text-sm text-blue-100 font-medium">
                Enter passenger information
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ================= BODY ================= */}
      <div className="p-6 space-y-6 bg-linear-to-b from-gray-50 to-white">
        {/* ================= PURPOSE OF TRAVEL ================= */}
        <div className="bg-white border-2 border-blue-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-blue-900 mb-2">
            Purpose of Travel <span className="text-red-500">*</span>
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

        {travelers.map((traveler, index) => (
          <div
            key={traveler.id ?? index}
            className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition"
          >
            {/* ===== Name Section ===== */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <select
                  value={traveler.title || "MR"}
                  onChange={(e) =>
                    updateTraveler(traveler.id, "title", e.target.value)
                  }
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg"
                  required
                >
                  <option value="MR">Mr</option>
                  <option value="MRS">Mrs</option>
                  <option value="MS">Ms</option>
                  <option value="MISS">Miss</option>
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

                      // ✅ Get ISO country code (e.g. "in", "us", "gb")
                      const isoCode = countryData?.countryCode?.toUpperCase();
                      if (isoCode) {
                        try {
                          const regionNames = new Intl.DisplayNames(["en"], {
                            type: "region",
                          });
                          const nationality = regionNames.of(isoCode); // e.g. "India", "United States"
                          updateTraveler(
                            traveler.id,
                            "nationality",
                            nationality,
                          );
                        } catch (err) {
                          console.warn("Failed to resolve country name:", err);
                        }
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
                    value={traveler.nationality || "India"}
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
                  value={traveler.gender || ""}
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
                  Date of Birth <span className="text-red-500">*</span>
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
                  required
                />
              </div>

              {/* Calculated Age (Read-only) */}
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
            </div>

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
      </div>
    </div>
  );
};

export const CTABox = () => {
  return (
    <div className="bg-linear-to-r from-blue-50 to-blue-100 border-l-4 border-blue-900 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-900 rounded-full flex items-center justify-center shrink-0">
          <BsInfoCircleFill className="text-white text-lg" />
        </div>
        <div>
          <p className="text-sm font-bold text-blue-900">Need Help?</p>
          <p className="text-xs text-gray-700">
            Call us at{" "}
            <span className="font-bold text-blue-900">1800-123-4567</span>
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
      <div className="flex items-center gap-2">
        <RiHotelLine className="text-orange-600 text-xl font-bold" />
        <span className="text-base font-semibold text-gray-900">
          Need a Hotel?
        </span>
      </div>
      <p className="text-xs text-gray-600">
        Save up to 20% when booking hotel with your flight
      </p>
      <button
        onClick={() => navigate("/search-hotel")}
        className="w-full py-3 border border-gray-300 text-gray-900 rounded-lg text-sm font-semibold hover:bg-blue-600 hover:text-white transition duration-500 cursor-pointer"
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
  BaggageTable,
  TravelerForm,
  FareRulesAccordion,
  CTABox,
  HotelHomeButton,
  Amenities,
  MealSelectionCards,
};
