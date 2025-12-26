import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BsCalendar4 } from "react-icons/bs";
import { BiTrendingDown } from "react-icons/bi";

import OneWayFlightCard from "./One-wayFlightCard";
import FlightFilterSidebar from "./Filter-Sidebar";

import { ONE_WAY_OVERRIDE } from "../../../data/dummyData";
import { MdArrowBack } from "react-icons/md";
import EmployeeHeader from "../../EmployeeDashboard/Employee-Header";
import { useDispatch, useSelector } from "react-redux";
import { searchFlights } from "../../../Redux/Actions/flight.thunks";
import MultiCityFlightCard from "./Multi-cityFlightCard";
import ReturnFlightCard from "./ReturnFlightCard";

/* -------------------- Component -------------------- */
export default function FlightSearchResults() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  /* ---------------- FILTER STATES ---------------- */
  const [filteredFlights, setFilteredFlights] = useState([]);

  const [priceValues, setPriceValues] = useState([1000, 70000]);
  const [selectedMaxPrice, setSelectedMaxPrice] = useState(70000);

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
    loading,
    error,
  } = useSelector((state) => state.flights);

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

  const flightsCount = filteredFlights.length || flights.length || 0;

  useEffect(() => {
    const lockScroll = () => {
      document.body.style.overflow = "hidden";
    };

    const unlockScroll = () => {
      document.body.style.overflow = "auto";
    };

    // Lock immediately on results page
    lockScroll();

    return () => unlockScroll();
  }, []);

  useEffect(() => {
    dispatch(
      searchFlights({
        origin: ONE_WAY_OVERRIDE.from.code,
        destination: ONE_WAY_OVERRIDE.to.code,
        adults: 1,
        children: 0,
        journeyType: 2,
        cabinClass: "Economy",
        directFlight: false,
      })
    );
  }, [dispatch]);

  const getSegments = (flight) => {
    if (!flight?.Segments) return [];
    return Array.isArray(flight.Segments[0])
      ? flight.Segments.flat()
      : flight.Segments;
  };

  const headerStats = React.useMemo(() => {
    if (!Array.isArray(flights) || flights.length === 0) {
      return {
        minPrice: null,
        maxPrice: null,
        cheapestDate: null,
      };
    }

    let minPrice = Infinity;
    let maxPrice = 0;
    let cheapestFlight = null;

    flights.forEach((f) => {
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
  }, [flights]);

  /* ---------------- FILTER LOGIC ---------------- */
  useEffect(() => {
    if (!Array.isArray(flights) || flights.length === 0) {
      setFilteredFlights([]);
      return;
    }

    let result = [...flights];

    /* ---------------- PRICE ---------------- */
    result = result.filter(
      (f) => (f?.Fare?.PublishedFare ?? 0) <= selectedMaxPrice
    );

    /* ---------------- STOPS ---------------- */
    if (selectedStops.length) {
      result = result.filter((f) => {
        const stops = getSegments(f).length - 1;

        if (selectedStops.includes("Direct")) return stops === 0;
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
        const arr = new Date(
          getSegments(f).at(-1)?.Destination?.ArrTime
        ).getHours();

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
        // Best = Cheapest + Short duration balance
        result.sort((a, b) => {
          const priceDiff =
            (a?.Fare?.PublishedFare || 0) - (b?.Fare?.PublishedFare || 0);

          const durDiff =
            (getSegments(a)[0]?.Duration || 0) -
            (getSegments(b)[0]?.Duration || 0);

          return priceDiff * 0.7 + durDiff * 0.3;
        });
    }
    setVisibleCount(PAGE_SIZE);

    setFilteredFlights(result);
  }, [
    flights,
    selectedMaxPrice,
    selectedStops,
    selectedTime,
    selectedArrivalTime,
    selectedAirlines,
    selectedFlightNumbers,
    selectedTerminals,
    selectedAirports,
    selectedLayoverAirports,
    selectedMaxDuration,
    popularFilters,
    sortKey,
  ]);

  const lockBodyScroll = () => {
    document.body.style.overflow = "hidden";
  };

  const unlockBodyScroll = () => {
    document.body.style.overflow = "auto";
  };

  const renderFlightCard = (flight, idx) => {
    if (journeyType === 2 && flight?.Segments?.length < 2) {
      return <OneWayFlightCard key={idx} flight={flight} traceId={traceId} />;
    }

    if (journeyType === 1) {
      return <OneWayFlightCard key={idx} flight={flight} traceId={traceId} />;
    }

    if (journeyType === 2) {
      return <ReturnFlightCard key={idx} flight={flight} />;
    }

    if (journeyType === 3) {
      return <MultiCityFlightCard key={idx} segments={flight.Segments} />;
    }

    return null;
  };

  const showBestTimeBadge =
    headerStats.minPrice &&
    headerStats.maxPrice &&
    headerStats.minPrice < headerStats.maxPrice * 0.6;

  useEffect(() => {
    console.log("Flights from redux:", flights);
  }, [flights]);

  if (!loading && flights.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        No flights available
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-white">
      <EmployeeHeader />
      {/* ================= HEADER ================= */}
      <div className="bg-white mx-32 px-4 rounded-xl shadow-md relative">
        <div className="max-w-7xl mx-auto  py-3 space-y-6">
          {/* 🔙 BACK BUTTON */}
          <button
            onClick={() => navigate("/search-flight")}
            className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            <MdArrowBack className="text-lg" />
            Back to search
          </button>

          {/* ROUTE + MONTH PRICE */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-4xl font-bold text-slate-900">
              {fromCity}
              <span className="mx-3 text-slate-400">→</span>
              {toCity}
            </h1>

            <p className="text-sm text-slate-500 mt-1">
              {departureDate} ·{" "}
              {journeyType === 1
                ? "One Way"
                : journeyType === 2
                ? "Round Trip"
                : "Multi City"}
            </p>

            <div className="flex items-center gap-3 border rounded-lg px-4 py-2 bg-white">
              <BiTrendingDown className="text-green-600 text-lg" />
              <span className="text-slate-600">Cheapest this month:</span>
              <span className="font-bold text-slate-900">
                {headerStats.minPrice
                  ? `₹${headerStats.minPrice.toLocaleString()}`
                  : "--"}
              </span>

              <button className="ml-2 flex items-center gap-2 px-3 py-1 border rounded-md hover:bg-slate-100">
                <BsCalendar4 />
                View month
              </button>
            </div>
          </div>

          {/* PRICE GRAPH BAR */}
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <div>
              <div className="font-semibold text-slate-800">Price graph:</div>
              <div className="text-sm text-slate-600">
                {headerStats.minPrice && headerStats.maxPrice ? (
                  <>
                    ₹{headerStats.minPrice.toLocaleString()} – ₹
                    {headerStats.maxPrice.toLocaleString()}
                    {headerStats.cheapestDate && (
                      <> | Cheapest: {headerStats.cheapestDate}</>
                    )}
                  </>
                ) : (
                  "Price data unavailable"
                )}
              </div>
            </div>

            <button className="px-4 py-2 border border-blue-400 text-blue-600 rounded-lg hover:bg-blue-100">
              +3 days
            </button>
          </div>

          {/* SORT + META */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex gap-2">
              {["Best", "Cheapest", "Early depart", "Late depart"].map(
                (tab) => (
                  <button
                    key={tab}
                    onClick={() => setSortKey(tab)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                      sortKey === tab
                        ? "bg-blue-500 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {tab}
                  </button>
                )
              )}
            </div>

            <div className="flex items-center gap-4 text-sm text-slate-600">
              <span>{flightsCount} flights found</span>
              {showBestTimeBadge && (
                <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 font-semibold">
                  Best time to book
                </span>
              )}
            </div>
          </div>

          {/* FILTER INFO */}
          <div className="text-sm text-slate-600">
            <span className="font-semibold text-slate-900">
              2 filters active
            </span>{" "}
            <button className="text-blue-500 font-medium hover:underline">
              Clear all filters
            </button>
          </div>
        </div>
      </div>

      {/* ================= BODY ================= */}
      <div
        className="max-w-7xl mx-auto py-6 grid grid-cols-1 lg:grid-cols-12 gap-6"
        style={{
          height: "calc(100vh - 160px)", // header + top content
        }}
      >
        {/* FILTER SIDEBAR */}
        <aside
          className="lg:col-span-3 h-full overflow-y-auto"
          onMouseEnter={lockBodyScroll}
          onMouseLeave={unlockBodyScroll}
        >
          <FlightFilterSidebar
            flights={flights}
            selectedMaxPrice={selectedMaxPrice}
            setSelectedMaxPrice={setSelectedMaxPrice}
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
        </aside>

        {/* RESULTS */}
        <section
          className="lg:col-span-9 space-y-6 relative overflow-y-auto"
          onMouseEnter={lockBodyScroll}
          onMouseLeave={unlockBodyScroll}
        >
          {loading && (
            <div className="p-6 text-center text-slate-500">
              Searching flights…
            </div>
          )}

          {!loading && filteredFlights.length === 0 && (
            <div className="bg-white p-6 rounded-lg text-center text-gray-500">
              No flights match your filters
            </div>
          )}

          {filteredFlights
            .slice(0, visibleCount)
            .map((flight, idx) => renderFlightCard(flight, idx))}
          {visibleCount < filteredFlights.length && !loading && (
            <div className="flex justify-center py-6">
              <button
                onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                className="px-6 py-2 rounded-lg border border-blue-500 text-blue-600 font-semibold hover:bg-blue-50"
              >
                Load more flights
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
