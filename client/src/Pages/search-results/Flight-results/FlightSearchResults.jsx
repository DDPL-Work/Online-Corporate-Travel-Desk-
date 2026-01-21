// FlightSearchResults.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { BsCalendar4 } from "react-icons/bs";
import { BiTrendingDown } from "react-icons/bi";

import OneWayFlightCard from "./One-wayFlightCard";
import FlightFilterSidebar from "./Filter-Sidebar";

import { MdArrowBack } from "react-icons/md";
import EmployeeHeader from "../../EmployeeDashboard/Employee-Header";
import { useDispatch, useSelector } from "react-redux";
import MultiCityFlightCard from "./Multi-cityFlightCard";
import SelectedTripSummary from "./ReturnFlight/SelectedTripSummary";
import OnwardFlightList from "./ReturnFlight/OnwardFlightList";
import ReturnFlightList from "./ReturnFlight/ReturnFlightList";
import { formatDate } from "../../../utils/formatter";
import { useLocation } from "react-router-dom";
import { searchFlights } from "../../../Redux/Actions/flight.thunks";
import FareUpsellModal from "../../Booking-Flow/Flight-Booking/FareUpsellModal";

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

  // // ROUND TRIP
  // if (journeyType === 2 && flights.length >= 2) {
  //   const onward = flights[0]?.Segments?.[0]?.[0];
  //   const ret = flights[1]?.Segments?.[0]?.[0];
  //   if (!onward || !ret) return [];

  //   return [
  //     {
  //       fromCity: onward.Origin.Airport.CityName,
  //       toCity: onward.Destination.Airport.CityName,
  //       depDate: onward.Origin.DepTime,
  //     },
  //     {
  //       fromCity: ret.Origin.Airport.CityName,
  //       toCity: ret.Destination.Airport.CityName,
  //       depDate: ret.Origin.DepTime,
  //     },
  //   ];
  // }

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
      searchPayload?.departureDate
  );

  const returnSearchDate = normalizeSearchDate(
    searchPayload?.returnDate ||
      searchPayload?.ReturnDate ||
      searchPayload?.Segments?.[1]?.OriginTime
  );

  const [activeTab, setActiveTab] = useState("onward");

  const [fareUpsellOpen, setFareUpsellOpen] = useState(false);
  const [selectedFareUpsell, setSelectedFareUpsell] = useState(null);

  /* ---------------- FILTER STATES ---------------- */
  const [filteredFlights, setFilteredFlights] = useState([]);

  const [priceValues, setPriceValues] = useState([1000, 70000]);
  // const [selectedMaxPrice, setSelectedMaxPrice] = useState(70000);

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

  const normalizedFlights = useMemo(() => {
    return Number(journeyType) === 2 ? flights.flat() : flights;
  }, [flights, journeyType]);

  const [selectedOnward, setSelectedOnward] = useState(null);
  const [selectedReturn, setSelectedReturn] = useState(null);

  const routes = useMemo(
    () => extractRoutes(flights, Number(journeyType)),
    [flights, journeyType]
  );

  // ================= HEADER FLIGHT (SAFE) =================
  const firstFlight = flights?.[0];
  const segments = firstFlight?.Segments?.[0] || [];

  const firstSegment = segments[0];
  const lastSegment = segments[segments.length - 1];

  const origin = firstSegment?.Origin;
  const destination = firstSegment?.Destination;

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
    if (Number(journeyType) !== 2) {
      return extractRoutes(flights, Number(journeyType));
    }

    return [
      {
        fromCity,
        toCity,
        depDate: onwardSearchDate,
      },
      {
        fromCity: toCity,
        toCity: fromCity,
        depDate: returnSearchDate,
      },
    ];
  }, [journeyType, fromCity, toCity, onwardSearchDate, returnSearchDate]);

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
      const price = f?.Fare?.PublishedFare ?? 0;
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
          getSegments(cheapestFlight)[0]?.Origin?.DepTime
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
      const price = f?.Fare?.PublishedFare ?? 0;
      return price >= priceValues[0] && price <= priceValues[1];
    });

    /* ---------------- STOPS ---------------- */
    if (selectedStops.length) {
      result = result.filter((f) => {
        const stops = getSegments(f).length - 1;

        if (selectedStops.includes("Non-stop")) return stops === 0;
        if (selectedStops.includes("1 stop")) return stops === 1;
        if (selectedStops.includes("2+ stops")) return stops >= 2;
        return true;
      });
    }

    /* ---------------- DIRECT ONLY ---------------- */
    if (popularFilters.directOnly) {
      result = result.filter((f) => getSegments(f).length === 1);
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
          selectedAirlines.includes(s?.Airline?.AirlineName)
        )
      );
    }

    /* ---------------- FLIGHT NUMBERS ---------------- */
    if (selectedFlightNumbers.length) {
      result = result.filter((f) =>
        getSegments(f).some((s) =>
          selectedFlightNumbers.includes(
            `${s?.Airline?.AirlineCode}-${s?.Airline?.FlightNumber}`
          )
        )
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
    // if (Number(journeyType) !== 2) {
    //   result = result.filter((f) => {
    //     const duration = getSegments(f)[0]?.Duration || 0;
    //     return duration <= selectedMaxDuration;
    //   });
    // }

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
              `Dep: ${s?.Origin?.Airport?.Terminal}`
            ) ||
            selectedTerminals.includes(
              `Arr: ${s?.Destination?.Airport?.Terminal}`
            )
        )
      );
    }

    /* ---------------- AIRPORTS ---------------- */
    if (selectedAirports.length) {
      result = result.filter((f) =>
        getSegments(f).some(
          (s) =>
            selectedAirports.includes(s?.Origin?.Airport?.AirportCode) ||
            selectedAirports.includes(s?.Destination?.Airport?.AirportCode)
        )
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
              s?.Destination?.Airport?.AirportCode
            )
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
        result.sort(
          (a, b) =>
            (a?.Fare?.PublishedFare || 0) - (b?.Fare?.PublishedFare || 0)
        );
        break;

      case "Early depart":
        result.sort(
          (a, b) =>
            new Date(getSegments(a)[0]?.Origin?.DepTime) -
            new Date(getSegments(b)[0]?.Origin?.DepTime)
        );
        break;

      case "Late depart":
        result.sort(
          (a, b) =>
            new Date(getSegments(b)[0]?.Origin?.DepTime) -
            new Date(getSegments(a)[0]?.Origin?.DepTime)
        );
        break;

      case "Best":
      default:
        result.sort((a, b) => {
          const priceDiff =
            (a?.Fare?.PublishedFare || 0) - (b?.Fare?.PublishedFare || 0);

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
          key={`${flight.ResultIndex}`}
          segments={flight.Segments}
          travelClass={cabinClass}
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

            {/* Routes */}
            <div className="flex flex-col">
              <div className="flex items-center gap-4 flex-wrap">
                {routeHeader.map((r, idx) => (
                  <React.Fragment key={idx}>
                    <div className="flex items-center gap-3 justify-center">
                      <h1 className="text-2xl font-bold text-gray-900">
                        {r.fromCity} → {r.toCity}
                      </h1>
                      <span className="text-sm text-gray-500">
                        ({formatDate(r.depDate)})
                      </span>
                    </div>

                    {idx < routes.length - 1 && (
                      <span className="text-gray-400 text-xl">◉</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Cheapest */}
            <div className="flex items-center gap-2 text-sm">
              <BiTrendingDown className="text-green-600" />
              <span className="text-gray-600">Cheapest:</span>
              <span className="font-bold text-gray-900">
                {headerStats.minPrice
                  ? `₹${headerStats.minPrice.toLocaleString()}`
                  : "--"}
              </span>
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
                )
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
            {Number(journeyType) === 2 && (
              <div className="sticky top-[119px] z-30 bg-gray-300 border-b border-gray-200 rounded-lg shadow-sm">
                <div className="flex gap-1 p-2">
                  <button
                    onClick={() => setActiveTab("onward")}
                    className={`flex-1 px-4 py-2.5 rounded-lg font-semibold text-sm transition ${
                      activeTab === "onward"
                        ? "bg-blue-600 text-white shadow"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    Onward Flights {selectedOnward && "✓"}
                  </button>

                  <button
                    onClick={() => setActiveTab("return")}
                    disabled={!selectedOnward}
                    className={`flex-1 px-4 py-2.5 rounded-lg font-semibold text-sm transition ${
                      activeTab === "return"
                        ? "bg-blue-600 text-white shadow"
                        : selectedOnward
                        ? "text-gray-600 hover:bg-gray-100"
                        : "text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    Return Flights {selectedReturn && "✓"}
                  </button>
                </div>
              </div>
            )}

            {Number(journeyType) === 2 ? (
              <>
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
                  onContinue={() =>
                    navigate("/round-trip-flight/booking", {
                      state: {
                        rawFlightData: {
                          onward: selectedOnward,
                          return: selectedReturn,
                        },
                        traceId,
                      },
                    })
                  }
                />
              </>
            ) : (
              filteredFlights.map((flight, idx) =>
                renderFlightCard(flight, idx)
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
