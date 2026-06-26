//src/Pages/search-results/Flight-results/One-wayFlightCard.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MdAirlineSeatReclineNormal, MdOutlineFlight } from "react-icons/md";
import { useDispatch } from "react-redux";
import {
  airlineLogo,
  FLIGHT_STATUS_MAP,
  formatDate,
  formatTime,
} from "../../../utils/formatter";
import { getFareUpsell, getFareRule } from "../../../Redux/Actions/flight.thunks";
import { BiSolidOffer } from "react-icons/bi";
import { FlightDetailsModal } from "./FlightDetailsModal";

const toFiniteNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const buildFallbackFareOptions = (flightInfo) => {
  if (!flightInfo) return [];

  const segment = flightInfo?.Segments?.[0]?.[0];
  const supplierFareClass =
    `${segment?.SupplierFareClass || ""}`.trim() || "Standard";
  const publishedFare = toFiniteNumber(
    flightInfo?.Fare?.PublishedFare ?? flightInfo?.Fare?.OfferedFare,
    0,
  );

  return [
    {
      supplierFareClass,
      publishedFare,
      resultIndex: flightInfo?.ResultIndex,
    },
  ];
};

const normalizeFareOptions = (fareOptions, fallbackFlightInfo) => {
  const sourceOptions =
    Array.isArray(fareOptions) && fareOptions.length
      ? fareOptions
      : buildFallbackFareOptions(fallbackFlightInfo);

  const optionsByClass = new Map();

  sourceOptions.forEach((option) => {
    const supplierFareClass =
      `${option?.supplierFareClass || ""}`.trim() || "Standard";
    const fareClassKey = supplierFareClass.toLowerCase();
    const publishedFare = toFiniteNumber(
      option?.publishedFare ??
        fallbackFlightInfo?.Fare?.PublishedFare ??
        fallbackFlightInfo?.Fare?.OfferedFare,
      0,
    );
    const resultIndex = option?.resultIndex ?? fallbackFlightInfo?.ResultIndex;

    const existing = optionsByClass.get(fareClassKey);
    if (!existing || publishedFare < existing.publishedFare) {
      optionsByClass.set(fareClassKey, {
        supplierFareClass,
        publishedFare,
        resultIndex,
      });
    }
  });

  return Array.from(optionsByClass.values()).sort(
    (a, b) => a.publishedFare - b.publishedFare,
  );
};





// ─── Main Card ───────────────────────────────────────────────────────────────

export default function OneWayFlightCard({
  flight,
  traceId,
  travelClass,
  passengers,
  onOpenFareUpsell,
}) {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [showFlightDetails, setShowFlightDetails] = useState(false);
  const [isLoadingMoreFares, setIsLoadingMoreFares] = useState(false);

  const groupedFlight = flight?.flightInfo
    ? flight
    : {
        flightInfo: flight,
        fareOptions: buildFallbackFareOptions(flight),
        flightOptionsByResultIndex:
          flight?.ResultIndex != null ? { [flight.ResultIndex]: flight } : {},
      };

  const {
    flightInfo,
    fareOptions,
    flightOptionsByResultIndex = {},
  } = groupedFlight || {};

  const normalizedFareOptions = useMemo(
    () => normalizeFareOptions(fareOptions, flightInfo),
    [fareOptions, flightInfo],
  );

  const [selectedFareResultIndex, setSelectedFareResultIndex] = useState(null);

  const selectedFare = useMemo(() => {
    if (selectedFareResultIndex == null) {
      return normalizedFareOptions[0];
    }
    return (
      normalizedFareOptions.find(
        (fare) => fare.resultIndex === selectedFareResultIndex,
      ) || normalizedFareOptions[0]
    );
  }, [normalizedFareOptions, selectedFareResultIndex]);

  const selectedResultIndex =
    selectedFare?.resultIndex ?? flightInfo?.ResultIndex;
  const selectedFlight =
    (selectedResultIndex != null
      ? flightOptionsByResultIndex[selectedResultIndex]
      : null) || flightInfo;

  if (
    !selectedFlight ||
    !selectedFlight.Segments?.length ||
    !selectedFlight.Segments[0]?.length
  ) {
    return null;
  }

  const handleFareOptionsClick = async () => {
    if (selectedResultIndex == null || isLoadingMoreFares) return;
    
    const newTab = window.open("/fare-upsell", "_blank");
    setIsLoadingMoreFares(true);
    try {
      const res = await dispatch(
        getFareUpsell({
          traceId,
          resultIndex: selectedResultIndex,
        }),
      );
      if (res?.payload && typeof onOpenFareUpsell === "function") {
        onOpenFareUpsell(res.payload, newTab);
      } else {
        if (newTab) newTab.close();
      }
    } catch (e) {
      if (newTab) newTab.close();
    } finally {
      setIsLoadingMoreFares(false);
    }
  };

  const segments = selectedFlight.Segments[0];
  const firstSegment = segments[0];
  const flightStatus =
    firstSegment?.FlightStatus || firstSegment?.Status || "Scheduled";
  const lastSegment = segments[segments.length - 1];

  const airline = firstSegment.Airline?.AirlineName;
  const airlineCode = firstSegment.Airline?.AirlineCode;
  const flightNumber = firstSegment.Airline?.FlightNumber;

  const from = firstSegment.Origin?.Airport?.CityName;
  const fromCountry = firstSegment.Origin?.Airport?.CountryName;
  const fromAirport = firstSegment.Origin?.Airport?.AirportName;
  const fromTerminal = firstSegment.Origin?.Airport?.Terminal;

  const to = lastSegment.Destination?.Airport?.CityName;
  const toCountry = lastSegment.Destination?.Airport?.CountryName;
  const toAirport = lastSegment.Destination?.Airport?.AirportName;
  const toTerminal = lastSegment.Destination?.Airport?.Terminal;

  const departure = formatTime(firstSegment.Origin?.DepTime);
  const arrival = formatTime(lastSegment.Destination?.ArrTime);

  const depTime = firstSegment.Origin?.DepTime;
  const arrTime = lastSegment.Destination?.ArrTime;

  const durationMin = segments.reduce((sum, s) => sum + (s.Duration || 0), 0);
  const duration = `${Math.floor(durationMin / 60)}h ${durationMin % 60}m`;

  const stopCities = segments.slice(0, -1).map(s => s.Destination?.Airport?.AirportCode).filter(Boolean);
  const stops = segments.length === 1 
    ? "Non-stop" 
    : `${segments.length - 1} Stop${segments.length > 2 ? 's' : ''} ${stopCities.length ? `via ${stopCities.join(', ')}` : ''}`;

  const baggage = selectedFlight.Fare?.Baggage?.iB || "15 Kg";
  const refundable = selectedFlight.IsRefundable;
  const price = Math.ceil(
    toFiniteNumber(
      selectedFare?.publishedFare ?? selectedFlight.Fare?.PublishedFare,
      0,
    ),
  );

  return (
    <div className="w-full max-w-[1060px] mx-auto bg-linear-to-br from-white via-slate-50 to-white border border-slate-200 rounded-2xl transition-all duration-300 overflow-hidden">
      <div className="relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#C9A84C]/5 rounded-full blur-3xl -z-10"></div>

        <div className="p-3 sm:p-4 md:p-5">
          <div className="relative">
            {/* ── Header Row ── */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="relative shrink-0">
                  <img src={airlineLogo(airlineCode)}
                    alt={airline}
                    className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-xl shadow-md border-2 border-white object-contain"
                    loading="eager"
                    onError={(e) => {
                      e.currentTarget.src = "https://via.placeholder.com/64";
                    }}
                  />
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-[#C9A84C] rounded-full border-2 border-white"></div>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center flex-wrap gap-1.5">
                    <div className="font-bold text-slate-800 text-xs sm:text-sm md:text-base truncate max-w-[110px] sm:max-w-none">{airline}</div>
                    {flightStatus && (
                      <span
                        className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold whitespace-nowrap ${
                          FLIGHT_STATUS_MAP[flightStatus]?.className ||
                          FLIGHT_STATUS_MAP.Scheduled.className
                        }`}
                      >
                        {FLIGHT_STATUS_MAP[flightStatus]?.label || "Scheduled"}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] sm:text-xs text-slate-500 font-medium">
                    {airlineCode}-{flightNumber}
                  </div>
                </div>
              </div>

               <div className="flex flex-wrap gap-1.5 sm:gap-2 items-center">
                 {travelClass && (
                    <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 bg-slate-50 text-slate-700 text-[9px] sm:text-xs font-bold rounded-lg border border-slate-200 uppercase whitespace-nowrap">
                      <MdAirlineSeatReclineNormal className="text-[#C9A84C]" /> {travelClass}
                    </span>
                  )}
                 {firstSegment?.NoOfSeatAvailable !== undefined && firstSegment?.NoOfSeatAvailable !== null && (
                    <span className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 text-[9px] sm:text-xs font-bold rounded-lg border uppercase whitespace-nowrap ${
                      firstSegment.NoOfSeatAvailable <= 5
                        ? "bg-red-50 text-red-700 border-red-200"
                        : firstSegment.NoOfSeatAvailable <= 10
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }`}>
                      <MdAirlineSeatReclineNormal className="text-[12px] sm:text-[14px]" /> {firstSegment.NoOfSeatAvailable} Seats Left
                    </span>
                  )}
               </div>

              {/* <div className="flex flex-col text-center sm:text-right bg-gray-200 rounded-xl p-2">
                <div className="flex items-baseline justify-center sm:justify-start gap-2">
                  <span className="text-3xl font-bold bg-linear-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                    &#8377;{price?.toLocaleString()}
                  </span>
                </div>
              </div> */}
            </div>

            {/* ── Flight Timeline ── */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-6 items-center">
              <div className="text-left space-y-0.5 min-w-0">
                <div className="text-base sm:text-xl md:text-2xl font-bold text-slate-800">
                  {departure}
                </div>
                <div className="text-[10px] sm:text-xs font-bold text-[#C9A84C]">
                  {formatDate(depTime)}
                </div>
                <div className="text-[11px] sm:text-sm font-semibold text-slate-700 mt-1 truncate">
                  {from}, {fromCountry}
                </div>
                <div className="text-[10px] sm:text-xs text-slate-500 truncate hidden sm:block">({fromAirport})</div>
                {fromTerminal && (
                  <div className="text-[9px] sm:text-[10px] font-black text-[#C9A84C] bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-200 inline-block mt-0.5 uppercase tracking-wider">
                    T-{fromTerminal}
                  </div>
                )}
              </div>

              <div className="flex flex-col items-center gap-1 sm:gap-2 px-1 sm:px-6">
                <div className="relative w-full mb-1 sm:mb-3">
                  <div className="h-0.5 bg-linear-to-r from-slate-200 via-[#C9A84C] to-slate-200 w-full max-w-16 sm:max-w-32 mx-auto"></div>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-1 sm:p-2 rounded-full shadow-md border border-slate-200">
                    <MdOutlineFlight className="text-[#C9A84C] text-sm sm:text-xl rotate-90" />
                  </div>
                </div>
                <div className="text-[10px] sm:text-xs font-semibold text-slate-600 whitespace-nowrap">
                  {duration}
                </div>
                <div className="px-1.5 sm:px-3 py-0.5 sm:py-1 bg-linear-to-r from-emerald-50 to-emerald-100 text-emerald-700 text-[9px] sm:text-xs font-bold rounded-full border border-emerald-200 text-center leading-tight">
                  {stops}
                </div>
              </div>

              <div className="text-right space-y-0.5 min-w-0">
                <div className="text-base sm:text-xl md:text-2xl font-bold text-slate-800">
                  {arrival}
                </div>
                <div className="text-[10px] sm:text-xs font-bold text-[#C9A84C]">
                  {formatDate(arrTime)}
                </div>
                <div className="text-[11px] sm:text-sm font-semibold text-slate-700 mt-1 truncate">
                  {to}, {toCountry}
                </div>
                <div className="text-[10px] sm:text-xs text-slate-500 truncate hidden sm:block">({toAirport})</div>
                {toTerminal && (
                  <div className="text-[9px] sm:text-[10px] font-black text-[#C9A84C] bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-200 inline-block mt-0.5 uppercase tracking-wider">
                    T-{toTerminal}
                  </div>
                )}
              </div>
            </div>

            {/* ── Fare Options ── */}
            <div className="mt-3 rounded-xl border border-slate-100 p-2 sm:p-3">
              <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Fare options
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5 sm:gap-2">
                {normalizedFareOptions.map((fare, index) => {
                  const isSelected =
                    selectedFare?.resultIndex != null
                      ? selectedFare.resultIndex === fare.resultIndex
                      : index === 0;
                  const isLowest = index === 0;

                  return (
                    <button
                      key={`${fare.supplierFareClass}-${fare.resultIndex || index}`}
                      type="button"
                      onClick={() =>
                        setSelectedFareResultIndex(fare.resultIndex)
                      }
                      className={`rounded-lg border px-2.5 py-1.5 sm:px-3 sm:py-2 text-left transition ${
                        isSelected
                          ? "border-[#C9A84C] bg-slate-50 shadow-sm"
                          : "border-slate-200 bg-white hover:border-[#C9A84C]/50 hover:bg-slate-50"
                      }`}
                    >
                      <div className="text-[10px] sm:text-xs font-semibold text-slate-600">
                        {fare.supplierFareClass}
                      </div>
                      <div
                        className={`text-xs sm:text-sm font-bold ${
                          isSelected ? "text-[#C9A84C]" : "text-slate-800"
                        }`}
                      >
                        &#8377;{Math.ceil(fare.publishedFare).toLocaleString()}
                      </div>
                      {isLowest && (
                        <div className="text-[9px] sm:text-[10px] font-semibold text-emerald-600">
                          Lowest fare
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Bottom Action Row ── */}
            <div className="flex flex-wrap items-center justify-between gap-2 mt-2 sm:mt-1">
              <div className="flex flex-wrap gap-1.5 sm:gap-3">
                {/* <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200">
                  <BsSuitcase /> {baggage}
                </span> */}
                {/* {refundable && (
                  <span className="inline-flex items-center px-3 py-1.5 bg-linear-to-r from-emerald-50 to-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-200">
                    Refundable
                  </span>
                )} */}

                {/* ── Flight Details Toggle Button ── */}
                <button
                  type="button"
                  onClick={() => setShowFlightDetails((prev) => !prev)}
                  className={`inline-flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 text-[9px] sm:text-[11px] font-black rounded-xl border transition-all cursor-pointer uppercase tracking-widest shadow-sm whitespace-nowrap
                    ${
                      showFlightDetails
                        ? "bg-[#0A203E] text-white border-[#0A203E]"
                        : "bg-white text-slate-600 border-slate-200 hover:border-[#0A203E]/30 hover:text-[#0A203E]"
                    }`}
                >
                  Flight Details
                </button>

                <button
                  onClick={handleFareOptionsClick}
                  disabled={isLoadingMoreFares}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 text-[9px] sm:text-[11px] font-black rounded-xl border uppercase tracking-widest shadow-sm transition-all whitespace-nowrap ${
                    isLoadingMoreFares
                      ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:text-[#C9A84C] hover:border-[#C9A84C]/50 cursor-pointer"
                  }`}
                >
                  {isLoadingMoreFares ? (
                    <>
                      <span className="animate-spin inline-block w-3 h-3 border-2 border-slate-400 border-t-slate-600 rounded-full" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <BiSolidOffer className="text-[#C9A84C] text-sm" /> More Fares
                    </>
                  )}
                </button>
              </div>

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
                      const payload = {
                        selectedFlight,
                        rawFlightData: selectedFlight,
                        searchParams: { traceId, passengers },
                        tripType: "one-way",
                        isInternational,
                      };
                      
                      localStorage.setItem("flightBookingState", JSON.stringify(payload));
                      
                      const token = sessionStorage.getItem("token");
                      if (token) {
                        localStorage.setItem("tab_sync_token", token);
                        localStorage.setItem("tab_sync_role", sessionStorage.getItem("role") || "");
                        localStorage.setItem("tab_sync_user", sessionStorage.getItem("user") || "");
                      }
                      
                      window.open("/one-way-flight/booking", "_blank");
                    }}
                    className="relative group px-4 sm:px-8 py-2 sm:py-3 bg-[#0A203E] text-white rounded-xl font-black shadow-lg shadow-[#0A203E]/20 transition-all duration-300 hover:scale-[1.02] active:scale-95 uppercase tracking-widest text-[10px] sm:text-xs whitespace-nowrap"
                  >
                    <span className="relative z-10">Book Now</span>
                  </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Flight Details Dropdown (animated) ── */}
      <FlightDetailsModal
        isOpen={showFlightDetails}
        onClose={() => setShowFlightDetails(false)}
        selectedFlight={selectedFlight}
        selectedFare={selectedFare}
        traceId={traceId}
      />
    </div>
  );
}