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
    <div className="max-w-[1060px] bg-linear-to-br from-white via-slate-50 to-white border border-slate-200 rounded-2xl transition-all duration-300 overflow-hidden">
      <div className="relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#C9A84C]/5 rounded-full blur-3xl -z-10"></div>

        <div className="p-6">
          <div className="relative">
            {/* ── Header Row ── */}
            <div className="flex items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img src={airlineLogo(airlineCode)}
                    alt={airline}
                    className="w-12 h-12 rounded-xl shadow-md border-2 border-white object-contain"
                    loading="eager"
                    onError={(e) => {
                      e.currentTarget.src = "https://via.placeholder.com/64";
                    }}
                  />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#C9A84C] rounded-full border-2 border-white"></div>
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

               <div className="flex flex-wrap gap-2 items-center">
                 {travelClass && (
                    <span className="mb-1 inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 uppercase">
                      <MdAirlineSeatReclineNormal className="text-[#C9A84C]" /> {travelClass}
                    </span>
                  )}
                 {firstSegment?.NoOfSeatAvailable !== undefined && firstSegment?.NoOfSeatAvailable !== null && (
                    <span className={`mb-1 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border uppercase ${
                      firstSegment.NoOfSeatAvailable <= 5
                        ? "bg-red-50 text-red-700 border-red-200"
                        : firstSegment.NoOfSeatAvailable <= 10
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }`}>
                      <MdAirlineSeatReclineNormal className="text-[14px]" /> {firstSegment.NoOfSeatAvailable} Seats Left
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
            <div className="grid grid-cols-[1fr_auto_1fr] gap-6 items-center">
              <div className="text-left space-y-1">
                <div className="text-2xl font-bold text-slate-800">
                  {departure}
                </div>
                <div className="text-xs font-bold text-[#C9A84C]">
                  {formatDate(depTime)}
                </div>
                <div className="text-sm font-semibold text-slate-700 mt-2">
                  {from}, {fromCountry}
                </div>
                <div className="text-xs text-slate-500">({fromAirport})</div>
                {fromTerminal && (
                  <div className="text-[10px] font-black text-[#C9A84C] bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200 inline-block mt-1 uppercase tracking-wider">
                    T-{fromTerminal}
                  </div>
                )}
              </div>

              <div className="flex flex-col items-center gap-2 px-6">
               
                <div className="relative w-full mb-3">
                  <div className="h-0.5 bg-linear-to-r from-slate-200 via-[#C9A84C] to-slate-200 w-32"></div>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-2 rounded-full shadow-md border border-slate-200">
                    <MdOutlineFlight className="text-[#C9A84C] text-xl rotate-90" />
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
                  {arrival}
                </div>
                <div className="text-xs font-bold text-[#C9A84C]">
                  {formatDate(arrTime)}
                </div>
                <div className="text-sm font-semibold text-slate-700 mt-2">
                  {to}, {toCountry}
                </div>
                <div className="text-xs text-slate-500">({toAirport})</div>
                {toTerminal && (
                  <div className="text-[10px] font-black text-[#C9A84C] bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200 inline-block mt-1 uppercase tracking-wider">
                    T-{toTerminal}
                  </div>
                )}
              </div>
            </div>

            {/* ── Fare Options ── */}
            <div className="mt-5 rounded-xl border border-slate-100 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Fare options
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
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
                      className={`rounded-lg border px-3 py-2 text-left transition ${
                        isSelected
                          ? "border-[#C9A84C] bg-slate-50 shadow-sm"
                          : "border-slate-200 bg-white hover:border-[#C9A84C]/50 hover:bg-slate-50"
                      }`}
                    >
                      <div className="text-xs font-semibold text-slate-600">
                        {fare.supplierFareClass}
                      </div>
                      <div
                        className={`text-sm font-bold ${
                          isSelected ? "text-[#C9A84C]" : "text-slate-800"
                        }`}
                      >
                        &#8377;{Math.ceil(fare.publishedFare).toLocaleString()}
                      </div>
                      {isLowest && (
                        <div className="text-[10px] font-semibold text-emerald-600">
                          Lowest fare
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Bottom Action Row ── */}
            <div className="flex items-center justify-between mt-1">
              <div className="flex flex-wrap gap-3">
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
                  className={`inline-flex items-center gap-1.5 px-4 py-2 text-[11px] font-black rounded-xl border transition-all cursor-pointer uppercase tracking-widest shadow-sm
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
                  className={`flex items-center gap-1.5 px-4 py-2 text-[11px] font-black rounded-xl border uppercase tracking-widest shadow-sm transition-all ${
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
                    className="relative group px-8 py-3 bg-[#0A203E] text-white rounded-xl font-black shadow-lg shadow-[#0A203E]/20 transition-all duration-300 hover:scale-[1.02] active:scale-95 uppercase tracking-widest text-xs"
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
