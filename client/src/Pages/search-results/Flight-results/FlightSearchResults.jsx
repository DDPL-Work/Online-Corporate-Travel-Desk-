// FlightSearchResults.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { CorporateNavbar } from "../../../layout/CorporateNavbar";
import FlightFilterSidebar from "./Filter-Sidebar";
import OneWayFlightCard from "./One-wayFlightCard";
import MultiCityFlightCard from "./Multi-cityFlightCard";
import SelectedTripSummary from "./ReturnFlight/SelectedTripSummary";
import OnwardFlightList from "./ReturnFlight/OnwardFlightList";
import ReturnFlightList from "./ReturnFlight/ReturnFlightList";
import { useLocation } from "react-router-dom";
import { searchFlights } from "../../../Redux/Actions/flight.thunks";
import { searchFlightsMC } from "../../../Redux/Actions/flight.thunks.MC";
import ReturnInternationalFlightCard from "./ReturnFlight/ReturnInternationalFlightCard";
import ResearchableFlightHeader from "./ResearchableFlightHeader";

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

const toFiniteNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getOneWayFlightKey = (item) => {
  const segment = item?.Segments?.[0]?.[0];
  if (!segment) return null;

  const airlineCode = segment?.Airline?.AirlineCode || "";
  const flightNumber = segment?.Airline?.FlightNumber || "";
  const originCode = segment?.Origin?.Airport?.AirportCode || "";
  const destinationCode = segment?.Destination?.Airport?.AirportCode || "";
  const depTime = segment?.Origin?.DepTime || "";

  return `${airlineCode}_${flightNumber}_${originCode}_${destinationCode}_${depTime}`;
};

const groupFlightsByIdentity = (results = []) => {
  if (!Array.isArray(results) || results.length === 0) return [];

  const groupedMap = new Map();

  results.forEach((item) => {
    const segment = item?.Segments?.[0]?.[0];
    const flightKey = getOneWayFlightKey(item);

    if (!segment || !flightKey) return;

    if (!groupedMap.has(flightKey)) {
      groupedMap.set(flightKey, {
        flightKey,
        flightInfo: item,
        fareOptions: [],
        flightOptionsByResultIndex: {},
        fareOptionIndexByClass: {},
      });
    }

    const group = groupedMap.get(flightKey);

    const supplierFareClass =
      `${segment?.SupplierFareClass || ""}`.trim() || "Standard";
    let fareClassKey = supplierFareClass.toLowerCase();
    if (fareClassKey.includes("inst_series")) {
      fareClassKey = "inst_series";
    }
    const publishedFare = toFiniteNumber(
      item?.Fare?.PublishedFare ?? item?.Fare?.OfferedFare,
      0,
    );

    const fareOption = {
      supplierFareClass,
      publishedFare,
      resultIndex: item?.ResultIndex,
    };

    if (item?.ResultIndex != null) {
      group.flightOptionsByResultIndex[item.ResultIndex] = item;
    }

    const existingIndex = group.fareOptionIndexByClass[fareClassKey];

    if (existingIndex === undefined) {
      group.fareOptionIndexByClass[fareClassKey] = group.fareOptions.length;
      group.fareOptions.push(fareOption);
    } else {
      const existingFare = toFiniteNumber(
        group.fareOptions[existingIndex]?.publishedFare,
        Number.POSITIVE_INFINITY,
      );
      if (publishedFare < existingFare) {
        group.fareOptions[existingIndex] = fareOption;
      }
    }

    const currentBestFare = toFiniteNumber(
      group.flightInfo?.Fare?.PublishedFare ??
        group.flightInfo?.Fare?.OfferedFare,
      Number.POSITIVE_INFINITY,
    );
    if (publishedFare < currentBestFare) {
      group.flightInfo = item;
    }
  });

  return Array.from(groupedMap.values()).map((group) => ({
    flightKey: group.flightKey,
    flightInfo: group.flightInfo,
    flightOptionsByResultIndex: group.flightOptionsByResultIndex,
    fareOptions: [...group.fareOptions].sort(
      (a, b) => a.publishedFare - b.publishedFare,
    ),
  }));
};

const getGroupKey = (item) => {
  if (!item?.Segments || !Array.isArray(item.Segments)) return null;

  return item.Segments.map((leg) => {
    const legArray = Array.isArray(leg) ? leg : [leg];
    return legArray
      .map((seg) => {
        const airlineCode = seg?.Airline?.AirlineCode || "";
        const flightNumber = seg?.Airline?.FlightNumber || "";
        const originCode = seg?.Origin?.Airport?.AirportCode || "";
        const destinationCode = seg?.Destination?.Airport?.AirportCode || "";
        const depTime = seg?.Origin?.DepTime || "";
        const arrTime = seg?.Destination?.ArrTime || "";
        return `${airlineCode}_${flightNumber}_${originCode}_${destinationCode}_${depTime}_${arrTime}`;
      })
      .join("|");
  }).join("||");
};

const groupFlightsByFareOptions = (results = []) => {
  if (!Array.isArray(results) || results.length === 0) return [];

  const groupedMap = new Map();

  results.forEach((item) => {
    const flightKey = getGroupKey(item);
    if (!flightKey) return;

    if (!groupedMap.has(flightKey)) {
      groupedMap.set(flightKey, {
        flightKey,
        flightInfo: item,
        fareOptions: [],
        flightOptionsByResultIndex: {},
      });
    }

    const group = groupedMap.get(flightKey);

    if (item?.ResultIndex != null) {
      group.flightOptionsByResultIndex[item.ResultIndex] = item;
    }

    const supplierFareClass =
      `${item?.Segments?.[0]?.[0]?.SupplierFareClass || ""}`.trim() ||
      "Standard";
    const publishedFare = toFiniteNumber(
      item?.Fare?.PublishedFare ?? item?.Fare?.OfferedFare,
      0,
    );

    const fareOption = {
      supplierFareClass,
      publishedFare,
      resultIndex: item?.ResultIndex,
      fareDetails: item?.Fare,
      refundable: item?.IsRefundable,
      cabinClass: getCabinClassKey(item?.Segments?.[0]?.[0]?.CabinClass),
      baggage: item?.Segments?.[0]?.[0]?.Baggage,
    };

    const existingIndex = group.fareOptions.findIndex((opt) => {
      let optClass = opt.supplierFareClass.toLowerCase();
      let currClass = supplierFareClass.toLowerCase();
      if (optClass.includes("inst_series")) optClass = "inst_series";
      if (currClass.includes("inst_series")) currClass = "inst_series";
      return optClass === currClass;
    });

    if (existingIndex === -1) {
      group.fareOptions.push(fareOption);
    } else {
      const existingFare = toFiniteNumber(
        group.fareOptions[existingIndex]?.publishedFare,
        Number.POSITIVE_INFINITY,
      );
      if (publishedFare < existingFare) {
        group.fareOptions[existingIndex] = fareOption;
      }
    }

    const currentBestFare = toFiniteNumber(
      group.flightInfo?.Fare?.PublishedFare ??
        group.flightInfo?.Fare?.OfferedFare,
      Number.POSITIVE_INFINITY,
    );
    if (publishedFare < currentBestFare) {
      group.flightInfo = item;
    }
  });

  return Array.from(groupedMap.values()).map((group) => ({
    flightKey: group.flightKey,
    flightInfo: group.flightInfo,
    flightOptionsByResultIndex: group.flightOptionsByResultIndex,
    fareOptions: [...group.fareOptions].sort(
      (a, b) => a.publishedFare - b.publishedFare,
    ),
  }));
};

// Helper for cabin class fallback (same as in formatter, but isolated)
const getCabinClassKey = (code) => {
  return code || 2; // Default to Economy if missing
};

/* -------------------- Component -------------------- */
export default function FlightSearchResults() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();
  const { publicBranding } = useSelector((s) => s.landingPage);

  const searchPayload = location.state?.searchPayload;

  // Live search payload — updated when user re-searches from the header
  const [currentSearchPayload, setCurrentSearchPayload] = useState(searchPayload);

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

  const initialFilterState = {
    priceValues: [1000, 70000],
    durationValues: [0, 1440],
    selectedMaxDuration: 1440,
    selectedStops: [],
    selectedTime: "",
    selectedAirlines: [],
    selectedFareTypes: [],
    selectedTerminals: [],
    selectedAirports: [],
    selectedDestinationAirports: [],
    selectedLayoverAirports: [],
    lowCO2: false,
    popularFilters: {
      earlyMorning: false,
      refundable: false,
      directOnly: false,
      shortDuration: false,
    },
  };

  /* ---------------- FILTER STATES ---------------- */
  const [filteredFlights, setFilteredFlights] = useState([]);
  const [sortKey, setSortKey] = useState("Best");

  const PAGE_SIZE = 5;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [onwardFilters, setOnwardFilters] = useState(initialFilterState);
  const [returnFilters, setReturnFilters] = useState(initialFilterState);

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
  const isDomesticRoundTrip =
    Number(journeyType) === 2 && !isInternationalReturnGrouped;

  const activeFiltersState = isDomesticRoundTrip
    ? activeTab === "onward"
      ? onwardFilters
      : returnFilters
    : onwardFilters; // for other trips, use onwardFilters only

  const setActiveFilters = isDomesticRoundTrip
    ? activeTab === "onward"
      ? setOnwardFilters
      : setReturnFilters
    : setOnwardFilters;

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

  /* ---------------- DOMESTIC ROUND TRIP SPLIT ---------------- */

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
      setOnwardFilters((prev) =>
        prev.priceValues[0] === 1000 && prev.priceValues[1] === 70000
          ? { ...prev, priceValues: [priceRange.min, priceRange.max] }
          : prev,
      );

      setReturnFilters((prev) =>
        prev.priceValues[0] === 1000 && prev.priceValues[1] === 70000
          ? { ...prev, priceValues: [priceRange.min, priceRange.max] }
          : prev,
      );
    }
  }, [priceRange]);

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

  const groupedOneWayFlights = useMemo(() => {
    if (Number(journeyType) !== 1) return [];
    return groupFlightsByIdentity(filteredFlights);
  }, [filteredFlights, journeyType]);

  const flightsCount =
    Number(journeyType) === 1
      ? groupedOneWayFlights.length
      : filteredFlights.length || normalizedFlights.length || 0;

  const domesticOnwardFlights = useMemo(() => {
    if (Number(journeyType) !== 2 || isInternationalReturnGrouped) return [];
    return normalizedFlights.filter((f) => {
      const seg = f.Segments?.[0]?.[0];
      return seg?.Origin?.Airport?.AirportCode === fromCode;
    });
  }, [normalizedFlights, journeyType, isInternationalReturnGrouped, fromCode]);

  const domesticReturnFlights = useMemo(() => {
    if (Number(journeyType) !== 2 || isInternationalReturnGrouped) return [];
    return normalizedFlights.filter((f) => {
      const seg = f.Segments?.[0]?.[0];
      return seg?.Origin?.Airport?.AirportCode === toCode;
    });
  }, [normalizedFlights, journeyType, isInternationalReturnGrouped, toCode]);

  const onwardFlights = useMemo(() => {
    if (Number(journeyType) !== 2) return [];
    const filtered = filteredFlights.filter((f) => {
      const seg = f.Segments?.[0]?.[0];
      return seg?.Origin?.Airport?.AirportCode === fromCode;
    });
    return groupFlightsByFareOptions(filtered);
  }, [filteredFlights, journeyType, fromCode]);

  const returnFlights = useMemo(() => {
    if (!selectedOnward) return [];
    const filtered = filteredFlights.filter((f) => {
      const seg = f.Segments?.[0]?.[0];
      return seg?.Origin?.Airport?.AirportCode === toCode;
    });
    return groupFlightsByFareOptions(filtered);
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

  // console.log("Header Route", routeHeader);

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

  // ── Re-search handler called by ResearchableFlightHeader ──────────────────
  const handleReSearch = async (tboStylePayload) => {
    // Convert TBO-style payload (Segments, JourneyType) back to app format
    const jt = Number(tboStylePayload.JourneyType ?? tboStylePayload.journeyType);
    const adults   = tboStylePayload.AdultCount  ?? tboStylePayload.passengers?.adults   ?? 1;
    const children = tboStylePayload.ChildCount  ?? tboStylePayload.passengers?.children ?? 0;
    const infants  = tboStylePayload.InfantCount ?? tboStylePayload.passengers?.infants  ?? 0;
    const CABIN_MAP = { 2: "economy", 3: "premium_economy", 4: "business", 6: "first_class" };
    const cabinClassVal = tboStylePayload.Segments?.[0]?.FlightCabinClass ?? tboStylePayload.cabinClass ?? 2;
    const cabinClassStr = CABIN_MAP[Number(cabinClassVal)] || "economy";

    let appPayload;
    if (jt === 3) {
      // Multi-city
      appPayload = {
        journeyType: 3,
        adults, children, infants,
        cabinClass: cabinClassStr,
        segments: (tboStylePayload.Segments || []).map((s) => ({
          origin:        s.Origin || s.origin,
          destination:   s.Destination || s.destination,
          departureDate: (s.PreferredDepartureTime || s.departureDate || "").split("T")[0],
        })),
      };
      await dispatch(searchFlightsMC(appPayload));
    } else {
      const seg0 = tboStylePayload.Segments?.[0] || {};
      const seg1 = tboStylePayload.Segments?.[1] || {};
      appPayload = {
        journeyType: jt,
        adults, children, infants,
        cabinClass: cabinClassStr,
        origin:        seg0.Origin      || seg0.origin      || "",
        destination:   seg0.Destination || seg0.destination || "",
        departureDate: (seg0.PreferredDepartureTime || seg0.departureDate || "").split("T")[0],
        ...(jt === 2 ? {
          returnDate: (seg1.PreferredDepartureTime || seg1.departureDate || "").split("T")[0],
        } : {}),
      };
      await dispatch(searchFlights(appPayload));
    }

    setCurrentSearchPayload(appPayload);
    // Reset selections & filters on re-search
    setSelectedOnward(null);
    setSelectedReturn(null);
    setActiveTab("onward");
    setOnwardFilters(initialFilterState);
    setReturnFilters(initialFilterState);
  };

  /* ---------------- FILTER LOGIC ---------------- */
  useEffect(() => {
    const {
      priceValues,
      durationValues,
      selectedMaxDuration,
      selectedStops,
      selectedTime,
      selectedAirlines,
      selectedFareTypes,
      selectedTerminals,
      selectedAirports,
      selectedDestinationAirports,
      selectedLayoverAirports,
      popularFilters,
    } = activeFiltersState;

    if (!Array.isArray(normalizedFlights) || normalizedFlights.length === 0) {
      setFilteredFlights([]);
      return;
    }

    // let result = [...normalizedFlights];

    let baseFlights;

    if (Number(journeyType) === 2 && !isInternationalReturnGrouped) {
      baseFlights =
        activeTab === "onward" ? domesticOnwardFlights : domesticReturnFlights;
    } else {
      baseFlights = normalizedFlights;
    }

    let result = [...baseFlights];

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

    /* ---------------- ARRIVAL TIME REMOVED ---------------- */

    /* ---------------- DURATION ---------------- */

    result = result.filter((f) => {
      const duration = getSegments(f)[0]?.Duration || 0;
      return duration <= selectedMaxDuration;
    });

    /* ---------------- TERMINALS (Departure Only) ---------------- */
    if (selectedTerminals.length) {
      result = result.filter((f) =>
        getSegments(f).some((s) =>
          selectedTerminals.includes(s?.Origin?.Airport?.Terminal),
        ),
      );
    }

    /* ---------------- AIRPORTS (Departure & Destination) ---------------- */
    if (selectedAirports.length) {
      result = result.filter((f) => {
        const outsegs = Array.isArray(f.Segments?.[0]) ? f.Segments[0] : [f.Segments?.[0]];
        const originCode = outsegs?.[0]?.Origin?.Airport?.AirportCode;
        return selectedAirports.includes(originCode);
      });
    }

    if (selectedDestinationAirports.length) {
      result = result.filter((f) => {
        const outsegs = Array.isArray(f.Segments?.[0]) ? f.Segments[0] : [f.Segments?.[0]];
        const destCode = outsegs?.[outsegs.length - 1]?.Destination?.Airport?.AirportCode;
        return selectedDestinationAirports.includes(destCode);
      });
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

    /* ---------------- CO2 REMOVED ---------------- */

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
    activeFiltersState,
    sortKey,
    activeTab,
    journeyType,
    isInternationalReturnGrouped,
  ]);

  const renderFlightCard = (flight, idx) => {
    const jt = Number(journeyType);

    if (jt === 1) {
      return (
        <OneWayFlightCard
          key={flight?.flightKey || flight?.flightInfo?.ResultIndex || idx}
          flight={flight}
          traceId={traceId}
          travelClass={cabinClass}
          passengers={
            searchPayload?.passengers || {
              adults: searchPayload?.adults || 1,
              children: searchPayload?.children || 0,
              infants: searchPayload?.infants || 0,
            }
          }
          onOpenFareUpsell={(fareData) => {
            const payloadData = {
              fareUpsellData: fareData,
              searchPayload: searchPayload || location.state?.searchPayload,
              journeyType: 1,
              traceId,
            };
            localStorage.setItem(
              "fareUpsellPayload",
              JSON.stringify(payloadData),
            );
            window.open("/fare-upsell", "_blank");
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
          searchPayload={searchPayload}
          onOpenFareUpsell={(fareData) => {
            const payloadData = {
              fareUpsellData: fareData,
              searchPayload: searchPayload || location.state?.searchPayload,
              journeyType: 3,
              traceId,
            };
            localStorage.setItem(
              "fareUpsellPayload",
              JSON.stringify(payloadData),
            );
            window.open("/fare-upsell", "_blank");
          }}
        />
      );
    }

    return null;
  };

  const showBestTimeBadge =
    headerStats.minPrice &&
    headerStats.maxPrice &&
    headerStats.minPrice < headerStats.maxPrice * 0.6;

  const noFlightsAfterFilters =
    Number(journeyType) === 1
      ? groupedOneWayFlights.length === 0
      : filteredFlights.length === 0;

  if (!loading && flights.length === 0 && !location.state?.searchPayload) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        No flights available
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <CorporateNavbar />

      {/* ================= RE-SEARCH STICKY HEADER ================= */}
      <ResearchableFlightHeader
        routeHeader={routeHeader}
        headerStats={headerStats}
        showBestTimeBadge={false}
        flightsCount={flightsCount}
        sortKey={sortKey}
        setSortKey={setSortKey}
        journeyType={journeyType}
        searchPayload={currentSearchPayload || searchPayload}
        onSearch={handleReSearch}
        onBack={() => {
          const slug = location.state?.companySlug || publicBranding?.companySlug;
          if (slug) navigate(`/travel`);
          else window.history.back();
        }}
      />

      {/* ================= BODY ================= */}
      <div className="max-w-full mx-10  py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* FILTER SIDEBAR */}
          <aside className="lg:col-span-3">
            <div className="sticky top-[165px] h-[calc(100vh-165px)] overflow-y-auto pr-2">
              <FlightFilterSidebar
                flights={normalizedFlights}
                selectedStops={activeFiltersState.selectedStops}
                setSelectedStops={(val) =>
                  setActiveFilters((prev) => ({ ...prev, selectedStops: val }))
                }
                selectedTime={activeFiltersState.selectedTime}
                setSelectedTime={(val) =>
                  setActiveFilters((prev) => ({ ...prev, selectedTime: val }))
                }
                selectedAirlines={activeFiltersState.selectedAirlines}
                setSelectedAirlines={(val) =>
                  setActiveFilters((prev) => ({
                    ...prev,
                    selectedAirlines: val,
                  }))
                }
                selectedFareTypes={activeFiltersState.selectedFareTypes}
                setSelectedFareTypes={(val) =>
                  setActiveFilters((prev) => ({
                    ...prev,
                    selectedFareTypes: val,
                  }))
                }
                selectedTerminals={activeFiltersState.selectedTerminals}
                setSelectedTerminals={(val) =>
                  setActiveFilters((prev) => ({
                    ...prev,
                    selectedTerminals: val,
                  }))
                }
                selectedAirports={activeFiltersState.selectedAirports}
                setSelectedAirports={(val) =>
                  setActiveFilters((prev) => ({
                    ...prev,
                    selectedAirports: val,
                  }))
                }
                selectedDestinationAirports={activeFiltersState.selectedDestinationAirports}
                setSelectedDestinationAirports={(val) =>
                  setActiveFilters((prev) => ({
                    ...prev,
                    selectedDestinationAirports: val,
                  }))
                }
                selectedLayoverAirports={
                  activeFiltersState.selectedLayoverAirports
                }
                setSelectedLayoverAirports={(val) =>
                  setActiveFilters((prev) => ({
                    ...prev,
                    selectedLayoverAirports: val,
                  }))
                }
                lowCO2={activeFiltersState.lowCO2}
                setLowCO2={(val) =>
                  setActiveFilters((prev) => ({ ...prev, lowCO2: val }))
                }
                popularFilters={activeFiltersState.popularFilters}
                setPopularFilters={(val) =>
                  setActiveFilters((prev) => ({ ...prev, popularFilters: val }))
                }
                priceValues={activeFiltersState.priceValues}
                setPriceValues={(val) =>
                  setActiveFilters((prev) => ({ ...prev, priceValues: val }))
                }
                durationValues={activeFiltersState.durationValues}
                setDurationValues={(val) =>
                  setActiveFilters((prev) => ({ ...prev, durationValues: val }))
                }
                selectedMaxDuration={activeFiltersState.selectedMaxDuration}
                setSelectedMaxDuration={(val) =>
                  setActiveFilters((prev) => ({
                    ...prev,
                    selectedMaxDuration: val,
                  }))
                }
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

            {!loading && noFlightsAfterFilters && (
              <div className="bg-white p-6 rounded-lg text-center text-gray-500">
                No flights match your filters
              </div>
            )}

            {/* Return Flight Tabs */}
            {Number(journeyType) === 2 && !isInternationalReturnGrouped && (
              <div className="sticky top-[165px] z-30 bg-slate-50 border-b border-slate-200 rounded-lg shadow-sm">
                <div className="flex gap-1 p-2">
                  {/* ONWARD ROUTE */}
                  <button
                    onClick={() => setActiveTab("onward")}
                    className={`flex-1 px-4 py-2.5 rounded-lg font-bold text-sm transition ${
                      activeTab === "onward"
                        ? "bg-[#C9A84C] text-[#0A203E] shadow"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {fromCity} → {toCity} {selectedOnward && "✓"}
                  </button>

                  {/* RETURN ROUTE */}
                  <button
                    onClick={() => setActiveTab("return")}
                    disabled={!selectedOnward}
                    className={`flex-1 px-4 py-2.5 rounded-lg font-bold text-sm transition ${
                      activeTab === "return"
                        ? "bg-[#C9A84C] text-[#0A203E] shadow"
                        : selectedOnward
                          ? "text-slate-600 hover:bg-slate-100"
                          : "text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    {toCity} → {fromCity} {selectedReturn && "✓"}
                  </button>
                </div>
              </div>
            )}

            {Number(journeyType) === 2 && isInternationalReturnGrouped ? (
              groupFlightsByFareOptions(filteredFlights).map(
                (groupedFlight) => (
                  <ReturnInternationalFlightCard
                    key={groupedFlight.flightKey}
                    group={groupedFlight}
                    traceId={traceId} 
                    onContinue={(selectedVariant) =>
                      navigate("/round-trip-flight/booking", {
                        state: {
                          rawFlightData: selectedVariant, // Pass the specific fare variant
                          traceId,
                          journeyType: 2,
                          isInternational: true,
                          passengers: searchPayload?.passengers || {
                            adults: searchPayload?.adults || 1,
                            children: searchPayload?.children || 0,
                            infants: searchPayload?.infants || 0,
                          },
                        },
                      })
                    }
                    onOpenFareUpsell={(fareData) => {
                      const payloadData = {
                        fareUpsellData: fareData,
                        searchPayload:
                          searchPayload || location.state?.searchPayload,
                        journeyType: 2, // ✅ IMPORTANT
                        traceId,
                      };

                      localStorage.setItem(
                        "fareUpsellPayload",
                        JSON.stringify(payloadData),
                      );

                      window.open("/fare-upsell", "_blank");
                    }}
                  />
                ),
              )
            ) : Number(journeyType) === 2 ? (
              <>
                {/* EXISTING DOMESTIC ROUND TRIP FLOW */}
                {/* {activeTab === "onward" &&  (
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
                )} */}

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
                        passengers: searchPayload?.passengers || {
                          adults: searchPayload?.adults || 1,
                          children: searchPayload?.children || 0,
                          infants: searchPayload?.infants || 0,
                        },
                      },
                    });
                  }}
                />
              </>
            ) : (
              (Number(journeyType) === 1
                ? groupedOneWayFlights
                : filteredFlights
              ).map((flight, idx) => renderFlightCard(flight, idx))
            )}

            {/* Bottom Padding for Sticky Summary */}
            {Number(journeyType) === 2 && <div className="h-24"></div>}
          </section>
        </div>
      </div>
    </div>
  );
}
