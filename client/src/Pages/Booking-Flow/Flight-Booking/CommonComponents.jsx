// Common Components
import React, { useMemo, useState } from "react";
import {
  MdAccessTime,
  MdOutlineShield,
  MdOutlineFlight,
  MdEventSeat,
  MdAirplanemodeActive,
  MdCancel,
  MdAutorenew,
  MdWork,
  MdInfo,
} from "react-icons/md";
import {
  FaSuitcase,
  FaWifi,
  FaUtensils,
  FaAngleDown,
  FaAngleUp,
  FaArrowRight,
  FaUser,
  FaPlane,
  FaPlaneArrival,
} from "react-icons/fa";
import {
  BsLuggage,
  BsTag,
  BsCashStack,
  BsCalendar4,
  BsInfoCircleFill,
} from "react-icons/bs";
import { AiOutlineCheck, AiOutlineMinus, AiOutlinePlus } from "react-icons/ai";
import { FaArrowTrendDown, FaPlaneDeparture } from "react-icons/fa6";
import {
  IoAirplaneOutline,
  IoPersonAdd,
  IoPersonRemove,
} from "react-icons/io5";
import { BiTime, BiPurchaseTag } from "react-icons/bi";
import { PiNoteDuotone, PiAirplaneTilt, PiForkKnifeBold } from "react-icons/pi";
import { RiHotelLine } from "react-icons/ri";
import { HiOutlineLocationMarker } from "react-icons/hi";
import { GoPeople } from "react-icons/go";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { useNavigate } from "react-router-dom";

// Updated color scheme - clean and minimal
export const orangeText = "text-blue-600";
export const orangeBg = "bg-blue-600";
export const blueBg = "bg-gray-800";
export const blueText = "text-gray-800";
export const grayText = "text-gray-500";
export const greenText = "text-green-600";
export const lightGreenBg = "bg-green-50";

const normalizeTripInfos = (tripInfos) => {
  if (!tripInfos) return [];
  if (Array.isArray(tripInfos)) return tripInfos;
  if (typeof tripInfos === "object") {
    return Object.values(tripInfos).filter(Array.isArray);
  }
  return [];
};

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
  return parseOneWayData(rawFlightData);
};

const _norm = (v = "") => (v || "").toString().trim().toUpperCase();

const formatPassengers = (passengers = {}) => {
  const adults = passengers.adults || 1;
  const children = passengers.children || 0;
  const infants = passengers.infants || 0;
  let result = `${adults} Adult${adults > 1 ? "s" : ""}`;
  if (children > 0) result += `, ${children} Child${children > 1 ? "ren" : ""}`;
  if (infants > 0) result += `, ${infants} Infant${infants > 1 ? "s" : ""}`;
  return result;
};

export const parseOneWayData = (result) => {
  const segmentGroup = result.Segments?.[0] || [];
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
      },

      aa: {
        city: seg.Destination.Airport.CityName,
        code: seg.Destination.Airport.AirportCode,
        name: seg.Destination.Airport.AirportName,
        terminal: seg.Destination.Airport.Terminal,
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
              60000
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

export const FlightTimeline = ({
  segments = [],
  selectedSeats = {},
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

  const seatDisabled = !isSeatReady;
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
                                  const seatKey = `${journeyType}|${idx}`;
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
                        <button
                          onClick={() => !seatDisabled && openSeatModal(idx)}
                          disabled={seatDisabled}
                          className={`mt-3 w-full flex items-center justify-center gap-2 text-sm font-semibold rounded-lg py-2 transition
    ${
      seatDisabled
        ? "bg-gray-200 text-gray-400 border border-gray-300 cursor-not-allowed"
        : "text-blue-600 border border-blue-600 hover:bg-blue-600 hover:text-white"
    }
  `}
                        >
                          <MdEventSeat />
                          {seatDisabled ? "Seats loading…" : "Select Seats"}
                        </button>
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

// Fare Options Component
export const FareOptions = ({ fareRules = null, fareRulesStatus = "idle" }) => {
  const [open, setOpen] = useState({
    cancellation: false,
    dateChange: false,
    baggage: false,
    important: false,
  });

  const toggle = (key) => setOpen((prev) => ({ ...prev, [key]: !prev[key] }));

  if (fareRulesStatus === "loading") {
    return (
      <div className="text-center py-4 text-gray-600 font-medium">
        Fetching fare rules...
      </div>
    );
  }

  if (!fareRules) {
    return (
      <div className="text-center py-4 text-gray-600 font-medium">
        Fare rules not available for this fare.
      </div>
    );
  }

  const sections = [
    {
      key: "important",
      title: "Important Notes",
      icon: <MdInfo className="text-teal-600 text-xl" />,
      data: fareRules.important,
      bg: "from-teal-50 to-purple-100 border-gray-300",
    },
  ];

  return (
    <div className="space-y-4">
      {sections.map((sec) => (
        <div
          key={sec.key}
          className={`rounded-xl overflow-hidden border shadow-sm bg-linear-to-r ${sec.bg}`}
        >
          {/* Header */}
          <button
            onClick={() => toggle(sec.key)}
            className="w-full flex items-center justify-between p-4"
          >
            <div className="flex items-center gap-3">
              {sec.icon}
              <span className="font-semibold text-gray-900">{sec.title}</span>
            </div>

            <span className="text-gray-700 text-lg">
              {open[sec.key] ? "−" : "+"}
            </span>
          </button>

          {/* Content */}
          {open[sec.key] && (
            <div className="bg-white p-5 border-t border-gray-200 animate-fadeIn">
              {sec.data.length > 0 ? (
                sec.data.map((html, i) => (
                  <div
                    key={i}
                    className="
            prose prose-sm max-w-none
            prose-ul:pl-5
            prose-li:marker:text-purple-500
            prose-strong:text-gray-900
            prose-p:my-2
            text-gray-700
          "
                    dangerouslySetInnerHTML={{
                      __html: html
                        // optional cleanup for better spacing
                        .replace(/<br\s*\/?>/gi, "<br/>")
                        .replace(
                          /FareBasisCode is:\s*(\w+)/i,
                          '<div class="mb-3 inline-flex items-center gap-2 bg-purple-50 border border-purple-200 text-purple-800 px-3 py-1 rounded-lg text-xs font-semibold">Fare Basis Code: $1</div>'
                        ),
                    }}
                  />
                ))
              ) : (
                <p className="text-sm text-gray-600">
                  No information available.
                </p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// Price Summary Component
export const PriceSummary = ({
  parsedFlightData,
  discountAmount = 0,
  selectedSeats = {},
  travelers = [],
}) => {
  if (!parsedFlightData) return null;

  const travelerCount = Math.max(travelers.length || 1);
  const totalBaseFare = parsedFlightData.basePrice || 0;
  const perPassengerBaseFare = Math.round(totalBaseFare / travelerCount);

  const totalSeatPrice = useMemo(() => {
    let sum = 0;
    Object.values(selectedSeats || {}).forEach((v) => {
      if (!v?.priceMap || !v?.list) return;
      v.list.forEach((seat) => {
        sum += v.priceMap[seat] || 0;
      });
    });
    return sum;
  }, [selectedSeats]);

  const taxRate = 0.08;
  const taxAmount = Math.round(totalBaseFare * taxRate);
  const convenienceFee = 99;

  const subtotal = totalBaseFare + taxAmount + convenienceFee + totalSeatPrice;
  const totalAmount = Math.max(0, subtotal - (discountAmount || 0));

  const seatBreakdown = useMemo(() => {
    const rows = [];

    Object.entries(selectedSeats || {}).forEach(([key, value]) => {
      if (!value?.list?.length) return;

      value.list.forEach((seat, index) => {
        rows.push({
          seat,
          price: value.priceMap?.[seat] || 0,
          passenger: `Passenger ${index + 1}`,
          segment: key,
        });
      });
    });

    return rows;
  }, [selectedSeats]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-700 to-gray-800 text-white p-5">
        <h3 className="text-xl font-bold">Fare Summary</h3>
        <p className="text-xs text-gray-300 mt-1">Complete price breakdown</p>
      </div>

      <div className="p-5 space-y-3">
        {/* Base Fare */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">
            Base Fare ({travelerCount} Adult)
          </span>
          <span className="font-semibold text-gray-900">
            ₹{totalBaseFare.toLocaleString()}
          </span>
        </div>

        {/* Taxes */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Taxes & Fees</span>
          <span className="font-semibold text-gray-900">
            ₹{taxAmount.toLocaleString()}
          </span>
        </div>

        {/* Seat Charges */}
        {/* Seat Charges */}
        {totalSeatPrice > 0 && (
          <>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Seat Charges</span>
              <span className="font-semibold text-gray-900">
                ₹{totalSeatPrice.toLocaleString()}
              </span>
            </div>

            {/* Seat breakdown */}
            <div className="mt-2 bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
              {seatBreakdown.map((s, i) => (
                <div
                  key={`${s.seat}-${i}`}
                  className="flex justify-between items-center text-sm"
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-800">
                      Seat {s.seat}
                    </span>
                    <span className="text-xs text-gray-500">{s.passenger}</span>
                  </div>

                  <span className="font-semibold text-gray-900">
                    ₹{s.price.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Convenience Fee */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Convenience Fee</span>
          <span className="font-semibold text-gray-900">₹{convenienceFee}</span>
        </div>

        {/* Discount */}
        {discountAmount > 0 && (
          <div className="flex justify-between items-center text-green-600">
            <span className="text-sm font-semibold">Discount</span>
            <span className="font-semibold">
              -₹{discountAmount.toLocaleString()}
            </span>
          </div>
        )}

        <div className="border-t border-gray-200 pt-3 mt-3 flex justify-between items-center">
          <span className="text-lg font-bold text-gray-900">Total Payable</span>
          <span className="text-xl font-bold text-blue-600">
            ₹{totalAmount.toLocaleString()}
          </span>
        </div>

        {/* Coupon */}
        {/* <div className="pt-3 border-t border-gray-200">
          <input
            type="text"
            value={couponCode}
            onChange={onCouponChange}
            placeholder="Enter coupon code"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            onClick={onApplyCoupon}
            className="mt-2 w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Apply Coupon
          </button>
        </div> */}
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

export const FareRulesAccordion = ({
  fareRules = null,
  fareRulesStatus = "idle",
}) => {
  const [open, setOpen] = useState(true);

  if (fareRulesStatus === "loading") {
    return (
      <div className="py-6 text-center text-gray-500 text-sm">
        Fetching fare rules…
      </div>
    );
  }

  if (!fareRules || !fareRules.important?.length) {
    return (
      <div className="py-6 text-center text-gray-500 text-sm">
        Fare rules not available for this fare.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-purple-200 bg-purple-50/40 shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 bg-purple-50 hover:bg-purple-100 transition"
      >
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 flex items-center justify-center rounded-full bg-purple-600 text-white">
            <MdInfo size={18} />
          </div>
          <div className="text-left">
            <p className="font-semibold text-gray-900">Fare Rules</p>
            <p className="text-xs text-gray-500">
              Cancellation, reissue & airline conditions
            </p>
          </div>
        </div>

        <span className="text-xl font-medium text-gray-600">
          {open ? "−" : "+"}
        </span>
      </button>

      {/* Content */}
      {open && (
        <div className="bg-white px-6 py-5 border-t border-purple-200 space-y-4 animate-fadeIn">
          {fareRules.important.map((html, i) => (
            <div
              key={i}
              className="prose prose-sm max-w-none text-gray-700
                prose-p:leading-relaxed
                prose-ul:pl-5
                prose-li:my-1
                prose-li:marker:text-purple-500"
              dangerouslySetInnerHTML={{
                __html: html
                  // normalize breaks
                  .replace(/<br\s*\/?>/gi, "<br/>")

                  // Fare basis pill
                  .replace(
                    /FareBasisCode is:\s*(\w+)/i,
                    `
                    <div class="mb-4">
                      <span class="inline-flex items-center gap-2 bg-purple-100 text-purple-800 border border-purple-200 px-3 py-1 rounded-full text-xs font-semibold">
                        Fare Basis Code: $1
                      </span>
                    </div>
                    `
                  )

                  // Emphasize important notices
                  .replace(
                    /(GST,.*?EXTRA\.)/gi,
                    `<div class="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm font-medium">$1</div>`
                  ),
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Baggage Table Component
export const BaggageTable = ({ baggageInfo = {}, fareClass = "" }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="border border-gray-300 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <BsLuggage className="text-orange-600" />
          <h4 className="font-bold">Cabin Baggage</h4>
        </div>
        <p className="text-sm text-gray-600">
          {baggageInfo?.cB || "7 Kg per passenger"}
        </p>
      </div>

      <div className="border border-gray-300 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <BsLuggage className="text-orange-600 text-xl" />
          <h4 className="font-bold">Check-In Baggage</h4>
        </div>
        <p className="text-sm text-gray-600">
          {baggageInfo?.iB || "15 Kg per passenger"}
        </p>
      </div>
    </div>
  );
};

export const TravelerForm = ({
  travelers = [],
  addTraveler,
  removeTraveler,
  updateTraveler,
}) => {
  if (!Array.isArray(travelers)) travelers = [];

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
      {/* ================= HEADER ================= */}
      <div className="bg-linear-to-r from-[#1a2957] to-[#24a7c] text-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center shadow-lg">
              <FaUser className="text-white text-xl" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Traveler Details</h2>
              <p className="text-sm text-blue-100 font-medium">
                Enter passenger information
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={addTraveler}
            className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-semibold transition shadow-md"
          >
            <IoPersonAdd size={20} />
            <span>Add Adult</span>
          </button>
        </div>
      </div>

      {/* ================= BODY ================= */}
      <div className="p-6 space-y-6 bg-linear-to-b from-gray-50 to-white">
        {travelers.map((traveler, index) => (
          <div
            key={traveler.id ?? index}
            className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition"
          >
            {/* ===== Traveler Header ===== */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-900 rounded-full flex items-center justify-center">
                  <FaUser className="text-white" />
                </div>
                <h3 className="font-bold text-blue-900 text-lg">
                  {`${index + 1} Adult (12yrs+) `}
                </h3>
              </div>

              {travelers.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeTraveler(traveler.id)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-semibold transition border border-red-200"
                >
                  <IoPersonRemove size={18} />
                  Remove
                </button>
              )}
            </div>

            {/* ===== Name Section ===== */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <select
                  value={traveler.title || "Mr."}
                  onChange={(e) =>
                    updateTraveler(traveler.id, "title", e.target.value)
                  }
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg"
                  required
                >
                  <option>Mr.</option>
                  <option>Ms.</option>
                  <option>Mrs.</option>
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
                    updateTraveler(traveler.id, "firstName", e.target.value)
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
                    updateTraveler(traveler.id, "middleName", e.target.value)
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
                    updateTraveler(traveler.id, "lastName", e.target.value)
                  }
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg"
                  required
                />
              </div>
            </div>

            {/* ===== Primary Adult Extra Fields ===== */}
            {/* {index === 0 && ( */}
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
                  onChange={(phone) =>
                    updateTraveler(traveler.id, "phoneWithCode", phone)
                  }
                  enableSearch
                  containerStyle={{ width: "100%" }}
                  inputStyle={{
                    width: "100%",
                    height: "48px",
                    border: "2px solid #d1d5db",
                    borderRadius: "0.5rem",
                    paddingLeft: "48px",
                  }}
                  required
                />
              </div>
            </div>
            {/*)} */}

            {/* ===== Gender + Age ===== */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
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

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Age <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={12}
                  value={traveler.age ?? ""}
                  onChange={(e) =>
                    updateTraveler(
                      traveler.id,
                      "age",
                      parseInt(e.target.value || "0")
                    )
                  }
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg"
                  required
                />
              </div>
            </div>

            {/* ===== Note ===== */}
            <div className="mt-6 bg-blue-50 border-l-4 border-blue-900 p-4 rounded-lg">
              <p className="text-sm text-gray-700">
                <span className="font-bold text-blue-900">Note:</span> Ensure
                all details match your government ID.
              </p>
            </div>
          </div>
        ))}

        {/* ===== ADD NEW ADULT ===== */}
        <div className="flex justify-center pt-4">
          <button
            type="button"
            onClick={addTraveler}
            className="flex items-center gap-2 px-6 py-3 border-2 border-dashed border-orange-500 text-orange-600 hover:bg-orange-50 rounded-xl font-bold transition"
          >
            <IoPersonAdd size={20} />+ ADD NEW ADULT
          </button>
        </div>
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
  FareOptions,
  PriceSummary,
  ImportantInformation,
  BaggageTable,
  TravelerForm,
  FareRulesAccordion,
  CTABox,
  HotelHomeButton,
  Amenities,
};
