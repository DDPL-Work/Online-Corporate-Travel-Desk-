// FlightSearchResults.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { BsCalendar4 } from "react-icons/bs";
import { BiTrendingDown } from "react-icons/bi";
import { IoIosAirplane } from "react-icons/io";
import { MdArrowBack } from "react-icons/md";
import EmployeeHeader from "../../EmployeeDashboard/Employee-Header";
import FlightFilterSidebar from "./Filter-Sidebar";
import OneWayFlightCard from "./One-wayFlightCard";
import MultiCityFlightCard from "./Multi-cityFlightCard";
import SelectedTripSummary from "./ReturnFlight/SelectedTripSummary";
import OnwardFlightList from "./ReturnFlight/OnwardFlightList";
import ReturnFlightList from "./ReturnFlight/ReturnFlightList";
import { formatDate } from "../../../utils/formatter";
import { useLocation } from "react-router-dom";
import { searchFlights } from "../../../Redux/Actions/flight.thunks";
import FareUpsellModal from "../../Booking-Flow/Flight-Booking/FareUpsellModal";
import ReturnInternationalFlightCard from "./ReturnFlight/ReturnInternationalFlightCard";

const extractRoutes = (flights, journeyType) => {
  if (!Array.isArray(flights) || flights.length === 0) return [];

  // ONE WAY
  if (journeyType === 1) {
    const seg = flights[0]?.Segments?.[0]?.[0];
    if (!seg) return [];
    return [
      {
        fromCity: seg.Origin.Airport.CityName,
        toCity: seg.Destination.Airport.CityName,
        depDate: seg.Origin.DepTime,
      },
    ];
  }

  // MULTI CITY
  if (journeyType === 3) {
    return flights
      .map((f) => {
        const seg = f?.Segments?.[0]?.[0];
        if (!seg) return null;
        return {
          fromCity: seg.Origin.Airport.CityName,
          toCity: seg.Destination.Airport.CityName,
          depDate: seg.Origin.DepTime,
        };
      })
      .filter(Boolean);
  }

  return [];
};

const normalizeSearchDate = (dateStr) => {
  if (!dateStr) return null;

  // If already ISO with time → safe
  if (dateStr.includes("T")) return dateStr;

  // If YYYY-MM-DD → make ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return `${dateStr}T00:00:00`;
  }

  // If DD-MM-YYYY → convert
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
    const [dd, mm, yyyy] = dateStr.split("-");
    return `${yyyy}-${mm}-${dd}T00:00:00`;
  }

  return null;
};

/* -------------------- Component -------------------- */
export default function FlightSearchResults() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();

  const searchPayload = location.state?.searchPayload;

  const onwardSearchDate = normalizeSearchDate(
    searchPayload?.Segments?.[0]?.PreferredDepartureTime ||
      searchPayload?.departureDate,
  );

  const returnSearchDate = normalizeSearchDate(
    searchPayload?.returnDate ||
      searchPayload?.ReturnDate ||
      searchPayload?.Segments?.[1]?.OriginTime,
  );

  const [activeTab, setActiveTab] = useState("onward");

  const [fareUpsellOpen, setFareUpsellOpen] = useState(false);
  const [selectedFareUpsell, setSelectedFareUpsell] = useState(null);

  /* ---------------- FILTER STATES ---------------- */
  const [filteredFlights, setFilteredFlights] = useState([]);

  const [priceValues, setPriceValues] = useState([1000, 70000]);

  const [durationValues, setDurationValues] = useState([0, 1440]);
  const [selectedMaxDuration, setSelectedMaxDuration] = useState(1440);

  const [selectedStops, setSelectedStops] = useState([]);
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedArrivalTime, setSelectedArrivalTime] = useState("");

  const [selectedAirlines, setSelectedAirlines] = useState([]);
  const [selectedFlightNumbers, setSelectedFlightNumbers] = useState([]);
  const [selectedFareTypes, setSelectedFareTypes] = useState([]);
  const [selectedTerminals, setSelectedTerminals] = useState([]);
  const [selectedAirports, setSelectedAirports] = useState([]);
  const [selectedLayoverAirports, setSelectedLayoverAirports] = useState([]);
  const [lowCO2, setLowCO2] = useState(false);

  const [sortKey, setSortKey] = useState("Best");

  const PAGE_SIZE = 5;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [popularFilters, setPopularFilters] = useState({
    earlyMorning: false,
    refundable: false,
    directOnly: false,
    shortDuration: false,
  });

  const {
    searchResults: flights,
    traceId,
    journeyType,
    cabinClass,
    loading,
    error,
  } = useSelector((state) => state.flights);

  const [selectedOnward, setSelectedOnward] = useState(null);
  const [selectedReturn, setSelectedReturn] = useState(null);

  const isInternationalReturnGrouped =
    Number(journeyType) === 2 &&
    Array.isArray(flights) &&
    flights.some(
      (f) =>
        Array.isArray(f?.Segments) &&
        f.Segments.length === 2 &&
        Array.isArray(f.Segments[0]) &&
        Array.isArray(f.Segments[1]),
    );
  const normalizedFlights = useMemo(() => {
    if (Number(journeyType) !== 2) return flights;

    // Domestic round trip → flat
    if (!isInternationalReturnGrouped) {
      return flights.flat();
    }

    // International return → KEEP grouped
    return flights;
  }, [flights, journeyType, isInternationalReturnGrouped]);

  const routes = useMemo(() => {
    if (Number(journeyType) === 3) {
      return (searchPayload?.segments || []).map((seg) => ({
        fromCity: seg.origin,
        toCity: seg.destination,
        depDate: seg.departureDate,
      }));
    }

    return extractRoutes(flights, Number(journeyType));
  }, [journeyType, flights, searchPayload]);

  const priceRange = useMemo(() => {
    if (!normalizedFlights.length) {
      return { min: 0, max: 0 };
    }

    const prices = normalizedFlights
      .map((f) => f?.Fare?.OfferedFare || f?.Fare?.PublishedFare || 0)
      .filter(Boolean);

    if (!prices.length) {
      return { min: 0, max: 0 };
    }

    return {
      min: Math.floor(Math.min(...prices) / 100) * 100,
      max: Math.ceil(Math.max(...prices) / 100) * 100,
    };
  }, [normalizedFlights]);

  // ✅ Auto-update price filter when range changes
  useEffect(() => {
    if (priceRange.max > 0) {
      setPriceValues([priceRange.min, priceRange.max]);
    }
  }, [priceRange]);

  const activeFilters = useMemo(
    () => ({
      price:
        priceValues[0] !== priceRange?.min ||
        priceValues[1] !== priceRange?.max,

      stops: selectedStops.length > 0,
      airlines: selectedAirlines.length > 0,
      fareTypes: selectedFareTypes.length > 0,
      flightNumbers: selectedFlightNumbers.length > 0,
      terminals: selectedTerminals.length > 0,
      airports: selectedAirports.length > 0,
      layovers: selectedLayoverAirports.length > 0,

      departureTime: !!selectedTime,
      arrivalTime: !!selectedArrivalTime,

      duration:
        durationValues[0] !== 0 || durationValues[1] !== selectedMaxDuration,

      popular:
        popularFilters.earlyMorning ||
        popularFilters.refundable ||
        popularFilters.directOnly ||
        popularFilters.shortDuration,

      lowCO2,
    }),
    [
      priceValues,
      selectedStops,
      selectedAirlines,
      selectedFareTypes,
      selectedFlightNumbers,
      selectedTerminals,
      selectedAirports,
      selectedLayoverAirports,
      selectedTime,
      selectedArrivalTime,
      durationValues,
      selectedMaxDuration,
      popularFilters,
      lowCO2,
    ],
  );

  // ================= HEADER FLIGHT (SAFE) =================
  const firstFlight = flights?.[0];
  const segments = firstFlight?.Segments?.[0] || [];

  const firstSegment = segments[0];
  const lastSegment = segments[segments.length - 1];

  const fromCity = firstSegment?.Origin?.Airport?.CityName || "";
  const fromCode = firstSegment?.Origin?.Airport?.AirportCode || "";

  const toCity = lastSegment?.Destination?.Airport?.CityName || "";
  const toCode = lastSegment?.Destination?.Airport?.AirportCode || "";

  const departureDate = firstSegment?.Origin?.DepTime
    ? new Date(firstSegment.Origin.DepTime).toLocaleDateString("en-IN", {
        weekday: "short",
        day: "2-digit",
        month: "short",
      })
    : "";

  const flightsCount = filteredFlights.length || normalizedFlights.length || 0;

  const onwardFlights = useMemo(() => {
    if (Number(journeyType) !== 2) return [];
    return filteredFlights.filter((f) => {
      const seg = f.Segments?.[0]?.[0];
      return seg?.Origin?.Airport?.AirportCode === fromCode;
    });
  }, [filteredFlights, journeyType, fromCode]);

  const returnFlights = useMemo(() => {
    if (!selectedOnward) return [];
    return filteredFlights.filter((f) => {
      const seg = f.Segments?.[0]?.[0];
      return seg?.Origin?.Airport?.AirportCode === toCode;
    });
  }, [filteredFlights, selectedOnward, toCode]);

  const routeHeader = useMemo(() => {
    const jt = Number(journeyType);

    // MULTI CITY → derive from API flights
    if (jt === 3) {
      if (!Array.isArray(flights) || flights.length === 0) return [];

      const firstItinerary = flights[0];

      if (!Array.isArray(firstItinerary?.Segments)) return [];

      return firstItinerary.Segments.map((leg) => {
        const seg = leg?.[0];
        if (!seg) return null;

        return {
          fromCity: seg.Origin?.Airport?.CityName || "",
          toCity: seg.Destination?.Airport?.CityName || "",
          depDate: seg.Origin?.DepTime || "",
        };
      }).filter(Boolean);
    }

    // ROUND TRIP
    if (jt === 2) {
      return [
        { fromCity, toCity, depDate: onwardSearchDate },
        { fromCity: toCity, toCity: fromCity, depDate: returnSearchDate },
      ];
    }

    // ONE WAY
    return extractRoutes(flights, jt);
  }, [
    journeyType,
    flights,
    fromCity,
    toCity,
    onwardSearchDate,
    returnSearchDate,
  ]);

  console.log("Header Route", routeHeader);

  const getSegments = (flight) => {
    if (!flight?.Segments) return [];
    return Array.isArray(flight.Segments[0])
      ? flight.Segments.flat()
      : flight.Segments;
  };

  const headerStats = React.useMemo(() => {
    if (!Array.isArray(normalizedFlights) || normalizedFlights.length === 0) {
      return {
        minPrice: null,
        maxPrice: null,
        cheapestDate: null,
      };
    }

    let minPrice = Infinity;
    let maxPrice = 0;
    let cheapestFlight = null;

    normalizedFlights.forEach((f) => {
      const price = f?.Fare?.OfferedFare || f?.Fare?.PublishedFare || 0;
      if (!price) return;

      if (price < minPrice) {
        minPrice = price;
        cheapestFlight = f;
      }
      if (price > maxPrice) {
        maxPrice = price;
      }
    });

    const cheapestDate = cheapestFlight
      ? new Date(
          getSegments(cheapestFlight)[0]?.Origin?.DepTime,
        ).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
        })
      : null;

    return {
      minPrice: minPrice === Infinity ? null : minPrice,
      maxPrice,
      cheapestDate,
    };
  }, [normalizedFlights]);

  useEffect(() => {
    // Reload-safe flight fetch
    if (flights.length === 0 && !loading && location.state?.searchPayload) {
      dispatch(searchFlights(location.state.searchPayload));
    }
  }, []);

  /* ---------------- FILTER LOGIC ---------------- */
  useEffect(() => {
    if (!Array.isArray(normalizedFlights) || normalizedFlights.length === 0) {
      setFilteredFlights([]);
      return;
    }

    let result = [...normalizedFlights];

    /* ---------------- PRICE ---------------- */
    // result = result.filter(
    //   (f) => (f?.Fare?.PublishedFare ?? 0) <= selectedMaxPrice
    // );

    result = result.filter((f) => {
      const price = f?.Fare?.OfferedFare || f?.Fare?.PublishedFare || 0;
      return price >= priceValues[0] && price <= priceValues[1];
    });

    /* ---------------- STOPS ---------------- */
    if (selectedStops.length) {
      result = result.filter((f) => {
        let stops = 0;
        // FOR INTERNATIONAL GROUPED: Count max stops per leg
        if (Array.isArray(f.Segments[0])) {
          stops = Math.max(...f.Segments.map((leg) => leg.length - 1));
        } else {
          stops = getSegments(f).length - 1;
        }

        if (
          selectedStops.includes("Non-Stop") ||
          selectedStops.includes("Non-stop")
        ) {
          if (stops === 0) return true;
        }
        if (selectedStops.includes("1 stop")) {
          if (stops === 1) return true;
        }
        if (selectedStops.includes("2+ stops")) {
          if (stops >= 2) return true;
        }
        return false;
      });
    }

    /* ---------------- DIRECT ONLY ---------------- */
    if (popularFilters.directOnly) {
      result = result.filter((f) => {
        if (Array.isArray(f.Segments[0])) {
          return f.Segments.every((leg) => leg.length === 1);
        }
        return getSegments(f).length === 1;
      });
    }

    /* ---------------- REFUNDABLE ---------------- */
    if (popularFilters.refundable) {
      result = result.filter((f) => f?.IsRefundable);
    }

    if (selectedFareTypes.length) {
      result = result.filter((f) => {
        return selectedFareTypes.some((type) => {
          if (type === "Refundable") return f?.IsRefundable;
          if (type === "Non-Refundable") return !f?.IsRefundable;
          if (type === "LCC") return f?.IsLCC;
          if (type === "Full Service") return !f?.IsLCC;
          return true;
        });
      });
    }

    // EARLY MORNING
    if (popularFilters.earlyMorning) {
      result = result.filter((f) => {
        const hour = new Date(getSegments(f)[0]?.Origin?.DepTime).getHours();
        return hour < 8;
      });
    }

    // SHORT DURATION (< 3 hrs)
    if (popularFilters.shortDuration) {
      result = result.filter((f) => {
        const duration = getSegments(f)[0]?.Duration || 0;
        return duration <= 180;
      });
    }

    /* ---------------- AIRLINES ---------------- */
    if (selectedAirlines.length) {
      result = result.filter((f) =>
        getSegments(f).some((s) =>
          selectedAirlines.includes(s?.Airline?.AirlineName),
        ),
      );
    }

    /* ---------------- FLIGHT NUMBERS ---------------- */
    if (selectedFlightNumbers.length) {
      result = result.filter((f) =>
        getSegments(f).some((s) =>
          selectedFlightNumbers.includes(
            `${s?.Airline?.AirlineCode}-${s?.Airline?.FlightNumber}`,
          ),
        ),
      );
    }

    /* ---------------- DEPARTURE TIME ---------------- */
    if (selectedTime) {
      result = result.filter((f) => {
        const dep = new Date(getSegments(f)[0]?.Origin?.DepTime).getHours();

        if (selectedTime === "Morning") return dep >= 6 && dep < 12;
        if (selectedTime === "Afternoon") return dep >= 12 && dep < 18;
        if (selectedTime === "Evening") return dep >= 18 && dep < 24;
        if (selectedTime === "Night") return dep < 6;

        return true;
      });
    }

    /* ---------------- ARRIVAL TIME ---------------- */
    if (selectedArrivalTime) {
      result = result.filter((f) => {
        const segs = getSegments(f);
        const lastSeg = segs[segs.length - 1];
        const arr = new Date(lastSeg?.Destination?.ArrTime).getHours();

        if (selectedArrivalTime === "Morning") return arr >= 6 && arr < 12;
        if (selectedArrivalTime === "Afternoon") return arr >= 12 && arr < 18;
        if (selectedArrivalTime === "Evening") return arr >= 18 && arr < 24;
        if (selectedArrivalTime === "Night") return arr < 6;

        return true;
      });
    }

    /* ---------------- DURATION ---------------- */

    result = result.filter((f) => {
      const duration = getSegments(f)[0]?.Duration || 0;
      return duration <= selectedMaxDuration;
    });

    /* ---------------- TERMINALS ---------------- */
    if (selectedTerminals.length) {
      result = result.filter((f) =>
        getSegments(f).some(
          (s) =>
            selectedTerminals.includes(
              `Dep: ${s?.Origin?.Airport?.Terminal}`,
            ) ||
            selectedTerminals.includes(
              `Arr: ${s?.Destination?.Airport?.Terminal}`,
            ),
        ),
      );
    }

    /* ---------------- AIRPORTS ---------------- */
    if (selectedAirports.length) {
      result = result.filter((f) =>
        getSegments(f).some(
          (s) =>
            selectedAirports.includes(s?.Origin?.Airport?.AirportCode) ||
            selectedAirports.includes(s?.Destination?.Airport?.AirportCode),
        ),
      );
    }

    /* ---------------- LAYOVER AIRPORTS ---------------- */
    if (selectedLayoverAirports.length) {
      result = result.filter((f) => {
        const segs = getSegments(f);
        return segs
          .slice(0, -1)
          .some((s) =>
            selectedLayoverAirports.includes(
              s?.Destination?.Airport?.AirportCode,
            ),
          );
      });
    }

    /* ---------------- CO2 ---------------- */
    if (lowCO2) {
      result = result.filter((f) => f?.CO2Emission && f.CO2Emission < 100);
    }

    /* ---------------- SORTING ---------------- */
    switch (sortKey) {
      case "Cheapest":
        result.sort((a, b) => {
          const priceA = a?.Fare?.OfferedFare || a?.Fare?.PublishedFare || 0;
          const priceB = b?.Fare?.OfferedFare || b?.Fare?.PublishedFare || 0;
          return priceA - priceB;
        });
        break;

      case "Early depart":
        result.sort(
          (a, b) =>
            new Date(getSegments(a)[0]?.Origin?.DepTime) -
            new Date(getSegments(b)[0]?.Origin?.DepTime),
        );
        break;

      case "Late depart":
        result.sort(
          (a, b) =>
            new Date(getSegments(b)[0]?.Origin?.DepTime) -
            new Date(getSegments(a)[0]?.Origin?.DepTime),
        );
        break;

      case "Best":
      default:
        result.sort((a, b) => {
          const priceA = a?.Fare?.OfferedFare || a?.Fare?.PublishedFare || 0;
          const priceB = b?.Fare?.OfferedFare || b?.Fare?.PublishedFare || 0;
          const priceDiff = priceA - priceB;

          const durDiff =
            (getSegments(a)[0]?.Duration || 0) -
            (getSegments(b)[0]?.Duration || 0);

          return priceDiff * 0.7 + durDiff * 0.3;
        });
    }

    setFilteredFlights(result);

    if (Number(journeyType) !== 2) {
      setVisibleCount(PAGE_SIZE);
    }
  }, [
    normalizedFlights,
    priceValues,
    durationValues,
    selectedStops,
    selectedTime,
    selectedArrivalTime,
    selectedAirlines,
    selectedFlightNumbers,
    selectedFareTypes,
    selectedTerminals,
    selectedAirports,
    selectedLayoverAirports,
    selectedMaxDuration,
    popularFilters,
    lowCO2,
    sortKey,
  ]);

  const renderFlightCard = (flight, idx) => {
    const jt = Number(journeyType);

    if (jt === 1) {
      return (
        <OneWayFlightCard
          key={idx}
          flight={flight}
          traceId={traceId}
          travelClass={cabinClass}
          onOpenFareUpsell={(fareData) => {
            setSelectedFareUpsell(fareData);
            setFareUpsellOpen(true);
          }}
        />
      );
    }

    if (jt === 3) {
      return (
        <MultiCityFlightCard
          key={flight.ResultIndex}
          segments={flight.Segments}
          fare={{ ...flight.Fare }} // 🔥 clone to avoid reference reuse
          traceId={traceId}
          travelClass={cabinClass}
          resultIndex={flight.ResultIndex}
        />
      );
    }

    return null;
  };

  const showBestTimeBadge =
    headerStats.minPrice &&
    headerStats.maxPrice &&
    headerStats.minPrice < headerStats.maxPrice * 0.6;

  if (!loading && flights.length === 0 && !location.state?.searchPayload) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        No flights available
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <EmployeeHeader />

      {/* ================= STICKY HEADER ================= */}
      <div className="sticky top-0 z-40 bg-blue-50 shadow-md">
        <div className="max-w-full mx-10 py-3">
          {/* Route Header */}
          <div className="flex items-start justify-between mb-4">
            {/* Back Button */}
            <button
              onClick={() => navigate("/search-flight", { replace: true })}
              className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              <MdArrowBack className="text-lg" />
              Back to search
            </button>

            {/* ==================== ROUTES HEADER ==================== */}
            <div className="flex flex-col">
              <div className="flex items-center flex-wrap gap-3">
                {routeHeader.map((r, idx) => (
                  <React.Fragment key={idx}>
                    {/* Each Route Leg */}
                    <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-sm hover:shadow-md transition-all duration-200">
                      <div className="flex flex-col leading-tight">
                        <h2 className="text-lg font-semibold flex items-center text-gray-900">
                          {r.fromCity}
                          <span className="mx-1 text-blue-600">
                            <IoIosAirplane />{" "}
                          </span>
                          {r.toCity}
                        </h2>

                        <div className="flex items-center text-gray-500 text-xs font-medium mt-1">
                          <BsCalendar4 className="mr-1.5 text-blue-500" />
                          {formatDate(r.depDate)}
                        </div>
                      </div>
                    </div>

                    {/* Visual Connector (Between legs) */}
                    {idx < routeHeader.length - 1 && (
                      <div className="flex items-center justify-center text-gray-400 mx-1">
                        <span className="text-lg">+</span>
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Cheapest */}
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-2 ml-4">
                <BiTrendingDown className="text-green-600" />
                <span className="text-gray-600">Cheapest:</span>
                <span className="font-bold text-gray-900">
                  {headerStats.minPrice
                    ? `₹${headerStats.minPrice.toLocaleString()}`
                    : "--"}
                </span>
              </div>
            </div>
          </div>

          {/* Sort Tabs */}
          <div className="flex items-center justify-between border-t border-gray-200 pt-3">
            <div className="flex gap-2">
              {["Best", "Cheapest", "Early depart", "Late depart"].map(
                (tab) => (
                  <button
                    key={tab}
                    onClick={() => setSortKey(tab)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                      sortKey === tab
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {tab}
                  </button>
                ),
              )}
            </div>

            <div className="text-sm text-gray-600">
              {flightsCount} flights found
              {showBestTimeBadge && (
                <span className="ml-2 px-2 py-1 rounded-full bg-green-50 text-green-700 text-xs font-semibold">
                  Best time to book
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ================= BODY ================= */}
      <div className="max-w-full mx-10  py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* FILTER SIDEBAR */}
          <aside className="lg:col-span-3">
            <div className="sticky top-[120px] h-[calc(100vh-120px)] overflow-y-auto pr-2">
              <FlightFilterSidebar
                flights={normalizedFlights}
                // selectedMaxPrice={selectedMaxPrice}
                // setSelectedMaxPrice={setSelectedMaxPrice}
                selectedStops={selectedStops}
                setSelectedStops={setSelectedStops}
                selectedTime={selectedTime}
                setSelectedTime={setSelectedTime}
                selectedArrivalTime={selectedArrivalTime}
                setSelectedArrivalTime={setSelectedArrivalTime}
                selectedAirlines={selectedAirlines}
                setSelectedAirlines={setSelectedAirlines}
                selectedFlightNumbers={selectedFlightNumbers}
                setSelectedFlightNumbers={setSelectedFlightNumbers}
                selectedFareTypes={selectedFareTypes}
                setSelectedFareTypes={setSelectedFareTypes}
                selectedTerminals={selectedTerminals}
                setSelectedTerminals={setSelectedTerminals}
                selectedAirports={selectedAirports}
                setSelectedAirports={setSelectedAirports}
                selectedLayoverAirports={selectedLayoverAirports}
                setSelectedLayoverAirports={setSelectedLayoverAirports}
                lowCO2={lowCO2}
                setLowCO2={setLowCO2}
                popularFilters={popularFilters}
                setPopularFilters={setPopularFilters}
                priceValues={priceValues}
                setPriceValues={setPriceValues}
                durationValues={durationValues}
                setDurationValues={setDurationValues}
                selectedMaxDuration={selectedMaxDuration}
                setSelectedMaxDuration={setSelectedMaxDuration}
              />
            </div>
          </aside>

          {/* RESULTS */}
          <section className="lg:col-span-9 space-y-4">
            {loading && (
              <div className="p-6 text-center text-gray-500">
                Searching flights…
              </div>
            )}

            {!loading && filteredFlights.length === 0 && (
              <div className="bg-white p-6 rounded-lg text-center text-gray-500">
                No flights match your filters
              </div>
            )}

            {/* Return Flight Tabs */}
            {Number(journeyType) === 2 && !isInternationalReturnGrouped && (
              <div className="sticky top-[119px] z-30 bg-gray-300 border-b border-gray-200 rounded-lg shadow-sm">
                <div className="flex gap-1 p-2">
                  {/* ONWARD ROUTE */}
                  <button
                    onClick={() => setActiveTab("onward")}
                    className={`flex-1 px-4 py-2.5 rounded-lg font-semibold text-sm transition ${
                      activeTab === "onward"
                        ? "bg-blue-600 text-white shadow"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {fromCity} → {toCity} {selectedOnward && "✓"}
                  </button>

                  {/* RETURN ROUTE */}
                  <button
                    onClick={() => setActiveTab("return")}
                    disabled={!selectedOnward}
                    className={`flex-1 px-4 py-2.5 rounded-lg font-semibold text-sm transition ${
                      activeTab === "return"
                        ? "bg-blue-600 text-white shadow"
                        : selectedOnward
                          ? "text-gray-700 hover:bg-gray-100"
                          : "text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {toCity} → {fromCity} {selectedReturn && "✓"}
                  </button>
                </div>
              </div>
            )}

            {Number(journeyType) === 2 && isInternationalReturnGrouped ? (
              filteredFlights.map((flight) => (
                <ReturnInternationalFlightCard
                  key={flight.ResultIndex}
                  flight={flight}
                  onContinue={() =>
                    navigate("/round-trip-flight/booking", {
                      state: {
                        rawFlightData: flight, // ✅ PASS FULL GROUPED FLIGHT
                        traceId,
                        journeyType: 2,
                        isInternational: true,
                      },
                    })
                  }
                />
              ))
            ) : Number(journeyType) === 2 ? (
              <>
                {/* EXISTING DOMESTIC ROUND TRIP FLOW */}
                {activeTab === "onward" && (
                  <OnwardFlightList
                    flights={onwardFlights}
                    selectedFlight={selectedOnward}
                    onSelect={(flight) => {
                      setSelectedOnward(flight);
                      setActiveTab("return");
                    }}
                  />
                )}

                {activeTab === "return" && (
                  <ReturnFlightList
                    flights={returnFlights}
                    enabled={!!selectedOnward}
                    selectedFlight={selectedReturn}
                    onSelect={setSelectedReturn}
                  />
                )}

                <SelectedTripSummary
                  onward={selectedOnward}
                  ret={selectedReturn}
                  onContinue={() => {
                    const onwardSegments = selectedOnward?.Segments?.[0] || [];
                    const returnSegments = selectedReturn?.Segments?.[0] || [];

                    const isInternational =
                      onwardSegments.some(
                        (s) =>
                          s.Origin?.Airport?.CountryCode &&
                          s.Destination?.Airport?.CountryCode &&
                          s.Origin.Airport.CountryCode !==
                            s.Destination.Airport.CountryCode,
                      ) ||
                      returnSegments.some(
                        (s) =>
                          s.Origin?.Airport?.CountryCode &&
                          s.Destination?.Airport?.CountryCode &&
                          s.Origin.Airport.CountryCode !==
                            s.Destination.Airport.CountryCode,
                      );

                    navigate("/round-trip-flight/booking", {
                      state: {
                        rawFlightData: {
                          onward: selectedOnward,
                          return: selectedReturn,
                        },
                        traceId,
                        isInternational,
                      },
                    });
                  }}
                />
              </>
            ) : (
              filteredFlights.map((flight, idx) =>
                renderFlightCard(flight, idx),
              )
            )}

            {/* Bottom Padding for Sticky Summary */}
            {Number(journeyType) === 2 && <div className="h-24"></div>}
          </section>
        </div>
      </div>

      <FareUpsellModal
        isOpen={fareUpsellOpen}
        onClose={() => setFareUpsellOpen(false)}
        fareUpsellData={selectedFareUpsell}
      />
    </div>
  );
}
