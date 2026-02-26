// src/Pages/EmployeeDashboard/FlightSearch.jsx
import React, { useEffect, useRef, useState } from "react";
import {
  FaExchangeAlt,
  FaCalendarAlt,
  FaPlaneDeparture,
  FaPlaneArrival,
  FaUser,
  FaSearch,
  FaHotel,
  FaPlane,
  FaTrain,
  FaBus,
  FaUmbrellaBeach,
  FaMapMarkerAlt,
  FaChevronDown,
} from "react-icons/fa";
import { MdArrowForward, MdAltRoute } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import TravelersClassModal from "../../components/FlightSearchComponents/TravelersClassModal";
import EmployeeHeader from "./Employee-Header";
import { airportDatabase } from "../../data/airportDatabase";
import { useFlightSearch } from "../../context/FlightSearchContext";
import { searchFlights } from "../../Redux/Actions/flight.thunks";
import { searchFlightsMC } from "../../Redux/Actions/flight.thunks.MC";
import { ToastWithTimer } from "../../utils/ToastConfirm";

/* ─────────────────────────────────────────────
   Airport Autocomplete — logic untouched
───────────────────────────────────────────── */
const AirportSearchInput = ({ value, onChange, placeholder, id, error }) => {
  const [query, setQuery] = useState(value || "");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (value && value !== query) setQuery(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        inputRef.current &&
        !inputRef.current.contains(e.target)
      )
        setShowSuggestions(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const input = e.target.value;
    setQuery(input);
    if (input.length > 1) {
      const filtered = airportDatabase.filter((airport) => {
        const s = input.toLowerCase();
        return (
          airport.city.toLowerCase().includes(s) ||
          airport.iata_code.toLowerCase().includes(s) ||
          airport.country.toLowerCase().includes(s) ||
          airport.name.toLowerCase().includes(s)
        );
      });
      setSuggestions(filtered.slice(0, 10));
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectAirport = (airport) => {
    setQuery(`${airport.city} (${airport.iata_code})`);
    onChange({ code: airport.iata_code, city: airport.city, ...airport });
    setShowSuggestions(false);
  };

  return (
    <div className="relative">
      <div
        className={`flex items-center gap-2 border-2 rounded-xl px-3 py-2.5 bg-white transition-all
          ${showSuggestions ? "border-blue-600 shadow-sm" : error ? "border-red-400" : "border-gray-200 hover:border-blue-400"}`}
      >
        <FaMapMarkerAlt className="text-blue-500 shrink-0 text-xs" />
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => query.length > 1 && setShowSuggestions(true)}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full text-sm font-medium text-gray-800 placeholder-gray-400 outline-none bg-transparent"
        />
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-2xl max-h-60 overflow-y-auto"
        >
          <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100 sticky top-0">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">
              Airports
            </p>
          </div>
          {suggestions.map((airport, index) => (
            <div
              key={`${airport.iata_code}-${index}`}
              onClick={() => handleSelectAirport(airport)}
              className="flex items-center justify-between px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-0 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <FaPlane className="text-blue-600 text-xs" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 group-hover:text-blue-700">
                    {airport.city}, {airport.country}
                  </p>
                  <p className="text-xs text-gray-400">{airport.name}</p>
                </div>
              </div>
              <span className="ml-2 text-sm font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">
                {airport.iata_code}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────
   Constants
───────────────────────────────────────────── */
const CABIN_CLASS_MAP = {
  Economy: "economy",
  Business: "business",
  First: "first",
  "Premium Economy": "economy",
};

const NAV_TABS = [
  { id: "/search-flight", label: "Flights", icon: <FaPlane /> },
  { id: "/search-hotel", label: "Hotels", icon: <FaHotel /> },
];

/* ─────────────────────────────────────────────
   Field wrapper with label
───────────────────────────────────────────── */
const FieldBox = ({ label, icon, children, className = "" }) => (
  <div className={className}>
    <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
      <span className="text-blue-600">{icon}</span>
      {label}
    </label>
    {children}
  </div>
);

/* ─────────────────────────────────────────────
   Main Page
───────────────────────────────────────────── */
export default function FlightSearchPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [activePage, setActivePage] = useState("flight");
  const [tripType, setTripType] = useState("one-way");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const today = new Date().toISOString().split("T")[0];

  const [multiCityFlights, setMultiCityFlights] = useState([
    { from: "", to: "", date: "" },
  ]);

  const [fromAirport, setFromAirport] = useState({
    code: "DEL",
    city: "New Delhi",
  });
  const [toAirport, setToAirport] = useState({ code: "CCU", city: "Kolkata" });
  const [departureDate, setDepartureDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  });

  const {
    tripType: contextTripType,
    setTripType: setContextTripType,
    nearbyAirportsTo,
    setNearbyAirportsTo,
    nearbyAirportsFrom,
    setNearbyAirportsFrom,
    flexibleDates,
    setFlexibleDates,
    displayText,
    isModalOpen,
    modalPosition,
    handleApply,
    adults,
    travelClass,
    directOnly,
    openDropdown,
    closeDropdown,
  } = useFlightSearch();

  useEffect(() => {
    if (returnDate && departureDate && returnDate < departureDate) {
      setReturnDate(departureDate);
    }
  }, [departureDate]);

  // ── All original logic functions preserved ──
  const validateSearch = () => {
    const newErrors = {};
    if (!fromAirport?.code) newErrors.from = "Please select origin airport";
    if (!toAirport?.code && tripType !== "multi-city")
      newErrors.to = "Please select destination airport";
    if (tripType !== "multi-city" && !departureDate)
      newErrors.departureDate = "Please select departure date";
    if (tripType === "round-trip") {
      if (!returnDate) newErrors.returnDate = "Please select return date";
      else if (new Date(returnDate) < new Date(departureDate))
        newErrors.returnDate = "Return date cannot be before departure date";
    }
    if (tripType === "multi-city") {
      multiCityFlights.forEach((f, idx) => {
        if (!f.from?.code || !f.to?.code || !f.date) {
          newErrors[`multi-${idx}`] =
            `Flight ${idx + 1}: all fields are required`;
        }
      });
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSearch = async () => {
    if (!validateSearch()) return;
    const journeyType =
      tripType === "one-way" ? 1 : tripType === "round-trip" ? 2 : 3;
    let payload = {
      journeyType,
      adults,
      cabinClass: CABIN_CLASS_MAP[travelClass] || "economy",
      directFlight: directOnly,
      nearbyAirportsFrom,
      nearbyAirportsTo,
      flexibleDates,
    };
    if (journeyType !== 3) {
      payload.origin = fromAirport.code;
      payload.destination = toAirport.code;
      payload.departureDate = departureDate;
    }
    if (journeyType === 2) payload.returnDate = returnDate;
    if (journeyType === 3) {
      payload = {
        journeyType: 3,
        adults,
        cabinClass: CABIN_CLASS_MAP[travelClass] || "economy",
        directFlight: directOnly,
        segments: multiCityFlights.map((f) => ({
          origin: f.from.code,
          destination: f.to.code,
          departureDate: f.date,
        })),
      };
    }
    try {
      setLoading(true);
      if (journeyType === 3) await dispatch(searchFlightsMC(payload)).unwrap();
      else await dispatch(searchFlights(payload)).unwrap();
      navigate("/search-flight-results", { state: { searchPayload: payload } });
    } catch (err) {
      ToastWithTimer({
        message:
          typeof err === "string"
            ? err
            : "Flight search failed. Please try again.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const swapLocations = () => {
    const temp = fromAirport;
    setFromAirport(toAirport);
    setToAirport(temp);
  };

  const updateMultiCityFlight = (index, field, value) => {
    setMultiCityFlights((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === "to" && index < updated.length - 1 && value?.code) {
        updated[index + 1].from = value;
      }
      if (field === "date" && index < updated.length - 1 && value) {
        const nextDate = new Date(value);
        nextDate.setDate(nextDate.getDate() + 1);
        if (!updated[index + 1].date)
          updated[index + 1].date = nextDate.toISOString().split("T")[0];
      }
      return updated;
    });
  };

  const addMultiCityFlight = () => {
    setMultiCityFlights((prev) => {
      const lastFlight = prev[prev.length - 1];
      return [...prev, { from: lastFlight?.to || "", to: "", date: "" }];
    });
  };

  const removeMultiCityFlight = (index) => {
    setMultiCityFlights((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      for (let i = 0; i < updated.length - 1; i++) {
        if (updated[i].to && !updated[i + 1].from)
          updated[i + 1].from = updated[i].to;
      }
      return updated;
    });
  };

  const getTripIconConfig = () => {
    switch (tripType) {
      case "one-way":
        return { icon: <MdArrowForward size={15} />, action: swapLocations };
      case "round-trip":
        return { icon: <FaExchangeAlt size={15} />, action: swapLocations };
      case "multi-city":
        return { icon: <MdAltRoute size={15} />, action: addMultiCityFlight };
      default:
        return null;
    }
  };

  const checkboxClass =
    "h-3.5 w-3.5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer";
  const checkboxLabel =
    "ml-1.5 block text-xs text-gray-500 cursor-pointer font-medium";

  return (
    <div className="min-h-screen bg-gray-100">
      {/* ── Sticky Navbar ── */}
      <div className="bg-white shadow-md sticky top-0 z-50">
        <EmployeeHeader />
      </div>

      {/* ── Hero Banner ── */}
      <div
        className="relative w-full overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #13357b 0%, #1952c7 55%, #0891b2 100%)",
          minHeight: "340px",
        }}
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-5 rounded-full -translate-y-1/3 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-72 h-72 bg-white opacity-5 rounded-full translate-y-1/2 pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-4 pt-10 pb-36">
          <div className="text-center mb-8">
            <h1 className="text-white text-3xl md:text-4xl font-extrabold tracking-tight drop-shadow-lg">
              Book Flights at Best Prices
            </h1>
            <p className="text-blue-200 mt-2 text-base font-medium">
              Compare 500+ airlines · Instant confirmation
            </p>
          </div>

          {/* ── Nav Tabs ── */}
          <div className="flex justify-center flex-wrap gap-2">
            {NAV_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => navigate(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200
                  ${
                    activePage === tab.id
                      ? "bg-white text-blue-800 shadow-lg scale-105"
                      : "bg-white/10 text-white hover:bg-white/20"
                  }`}
              >
                <span
                  className={
                    activePage === tab.id ? "text-blue-700" : "text-white"
                  }
                >
                  {tab.icon}
                </span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Floating Search Card ── */}
      <div className="max-w-6xl mx-auto px-4 -mt-28 relative z-10 pb-12">
        <div className="bg-white rounded-2xl shadow-2xl">
          {/* Card header */}
          <div className="px-6 pt-5 pb-3 border-b border-gray-100 flex items-center gap-2">
            <FaPlane className="text-blue-700 text-xl" />
            <span className="text-gray-800 font-bold text-lg">
              Search Flights
            </span>
            <span className="ml-auto text-xs text-gray-400 font-medium">
              Find the best deal
            </span>
          </div>

          <div className="p-5 md:p-6">
            {activePage === "flight" ? (
              <>
                {/* ── Trip Type Tabs ── */}
                <div className="flex flex-wrap gap-2 mb-5">
                  {[
                    { key: "one-way", label: "One Way" },
                    { key: "round-trip", label: "Round Trip" },
                    { key: "multi-city", label: "Multi City" },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setTripType(key)}
                      className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-all border
                        ${
                          tripType === key
                            ? "bg-blue-700 text-white border-blue-700 shadow"
                            : "bg-white text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-700"
                        }`}
                    >
                      {tripType === key && (
                        <span>{getTripIconConfig()?.icon}</span>
                      )}
                      {label}
                    </button>
                  ))}
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSearch();
                  }}
                  className="flex flex-col"
                >
                  {/* ── Multi City ── */}
                  {tripType === "multi-city" ? (
                    <div className="space-y-3 mb-5">
                      {multiCityFlights.map((flight, index) => (
                        <div
                          key={index}
                          className="p-4 border-2 border-gray-100 rounded-xl bg-gray-50"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-blue-700 text-white text-xs font-bold flex items-center justify-center">
                                {index + 1}
                              </div>
                              <span className="text-sm font-semibold text-gray-700">
                                Flight {index + 1}
                              </span>
                            </div>
                            {multiCityFlights.length > 2 && (
                              <button
                                type="button"
                                onClick={() => removeMultiCityFlight(index)}
                                className="text-red-500 hover:text-red-700 text-xs font-semibold border border-red-200 px-2.5 py-1 rounded-full hover:bg-red-50 transition"
                              >
                                Remove
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            {/* From */}
                            <FieldBox label="From" icon={<FaPlaneDeparture />}>
                              <AirportSearchInput
                                value={
                                  flight.from
                                    ? `${flight.from.city} (${flight.from.code})`
                                    : ""
                                }
                                onChange={(airport) =>
                                  updateMultiCityFlight(index, "from", airport)
                                }
                                placeholder="Search city or airport"
                                id={`multi-from-${index}`}
                                error={errors[`multi-${index}`]}
                              />
                              <label className="flex items-center mt-1.5">
                                <input
                                  type="checkbox"
                                  checked={flight.nearbyFrom || false}
                                  onChange={() =>
                                    updateMultiCityFlight(
                                      index,
                                      "nearbyFrom",
                                      !flight.nearbyFrom,
                                    )
                                  }
                                  className={checkboxClass}
                                />
                                <span className={checkboxLabel}>
                                  Nearby airports
                                </span>
                              </label>
                            </FieldBox>

                            {/* To */}
                            <FieldBox label="To" icon={<FaPlaneArrival />}>
                              <AirportSearchInput
                                value={
                                  flight.to
                                    ? `${flight.to.city} (${flight.to.code})`
                                    : ""
                                }
                                onChange={(airport) =>
                                  updateMultiCityFlight(index, "to", airport)
                                }
                                placeholder="Search city or airport"
                                id={`multi-to-${index}`}
                              />
                              <label className="flex items-center mt-1.5">
                                <input
                                  type="checkbox"
                                  checked={flight.nearbyTo || false}
                                  onChange={() =>
                                    updateMultiCityFlight(
                                      index,
                                      "nearbyTo",
                                      !flight.nearbyTo,
                                    )
                                  }
                                  className={checkboxClass}
                                />
                                <span className={checkboxLabel}>
                                  Nearby airports
                                </span>
                              </label>
                            </FieldBox>

                            {/* Date */}
                            <FieldBox label="Date" icon={<FaCalendarAlt />}>
                              <div className="border-2 border-gray-200 rounded-xl px-3 py-2.5 hover:border-blue-400 focus-within:border-blue-600 focus-within:shadow-sm transition">
                                <input
                                  type="date"
                                  value={flight.date}
                                  onChange={(e) =>
                                    updateMultiCityFlight(
                                      index,
                                      "date",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full text-sm font-medium text-gray-800 outline-none bg-transparent cursor-pointer"
                                />
                              </div>
                            </FieldBox>

                            {/* Travelers — only on first */}
                            {index === 0 && (
                              <FieldBox
                                label="Travelers & Class"
                                icon={<FaUser />}
                              >
                                <button
                                  type="button"
                                  onClick={(e) => openDropdown(e)}
                                  className="w-full flex items-center justify-between border-2 border-gray-200 rounded-xl px-3 py-2.5 bg-white hover:border-blue-400 transition text-left"
                                >
                                  <span className="text-sm font-medium text-gray-800 truncate">
                                    {displayText}
                                  </span>
                                  <FaChevronDown className="text-gray-400 text-xs shrink-0 ml-1" />
                                </button>
                              </FieldBox>
                            )}
                          </div>
                        </div>
                      ))}

                      {multiCityFlights.length < 5 && (
                        <button
                          type="button"
                          onClick={addMultiCityFlight}
                          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-blue-500 hover:text-blue-600 transition font-semibold text-sm"
                        >
                          + Add Another Flight
                        </button>
                      )}
                    </div>
                  ) : (
                    /* ── One Way / Round Trip ── */
                    <div
                      className={`grid grid-cols-1 gap-3 mb-5 ${tripType === "round-trip" ? "md:grid-cols-5" : "md:grid-cols-4"}`}
                    >
                      {/* From */}
                      <FieldBox label="From" icon={<FaPlaneDeparture />}>
                        <AirportSearchInput
                          value={
                            fromAirport
                              ? `${fromAirport.city} (${fromAirport.code})`
                              : ""
                          }
                          onChange={setFromAirport}
                          placeholder="Search city or airport"
                          id="from-airport"
                          error={errors.from}
                        />
                        <label className="flex items-center mt-1.5">
                          <input
                            type="checkbox"
                            checked={nearbyAirportsFrom}
                            onChange={() =>
                              setNearbyAirportsFrom(!nearbyAirportsFrom)
                            }
                            className={checkboxClass}
                          />
                          <span className={checkboxLabel}>Nearby airports</span>
                        </label>
                      </FieldBox>

                      {/* Swap button + To */}
                      <div className="relative">
                        {/* Swap icon — positioned between From and To on md */}
                        <div className="hidden md:flex absolute -left-5 top-8 z-10 items-center justify-center">
                          <button
                            type="button"
                            onClick={swapLocations}
                            className="w-9 h-9 rounded-full bg-white border-2 border-blue-200 shadow flex items-center justify-center text-blue-600 hover:bg-blue-50 hover:border-blue-400 transition"
                          >
                            <FaExchangeAlt size={14} />
                          </button>
                        </div>
                        <FieldBox label="To" icon={<FaPlaneArrival />}>
                          <AirportSearchInput
                            value={
                              toAirport
                                ? `${toAirport.city} (${toAirport.code})`
                                : ""
                            }
                            onChange={setToAirport}
                            placeholder="Search city or airport"
                            id="to-airport"
                            error={errors.to}
                          />
                          <label className="flex items-center mt-1.5">
                            <input
                              type="checkbox"
                              checked={nearbyAirportsTo}
                              onChange={() =>
                                setNearbyAirportsTo(!nearbyAirportsTo)
                              }
                              className={checkboxClass}
                            />
                            <span className={checkboxLabel}>
                              Nearby airports
                            </span>
                          </label>
                        </FieldBox>
                      </div>

                      {/* Departure */}
                      <FieldBox label="Departure" icon={<FaCalendarAlt />}>
                        <div
                          className={`border-2 rounded-xl px-3 py-2.5 transition-all hover:border-blue-400 focus-within:border-blue-600 focus-within:shadow-sm ${departureDate ? "border-blue-300" : "border-gray-200"}`}
                        >
                          <input
                            type="date"
                            value={departureDate}
                            min={today}
                            onChange={(e) => setDepartureDate(e.target.value)}
                            className="w-full text-sm font-medium text-gray-800 outline-none bg-transparent cursor-pointer"
                          />
                          {/* {departureDate && (
                            <p className="text-xs text-blue-600 font-semibold mt-0.5">
                              {new Date(departureDate).toLocaleDateString(
                                "en-US",
                                {
                                  weekday: "long",
                                  day: "numeric",
                                  month: "short",
                                },
                              )}
                            </p>
                          )} */}
                        </div>
                        {tripType === "round-trip" && (
                          <label className="flex items-center mt-1.5">
                            <input
                              type="checkbox"
                              checked={flexibleDates}
                              onChange={() => setFlexibleDates(!flexibleDates)}
                              className={checkboxClass}
                            />
                            <span className={checkboxLabel}>
                              Flexible dates ±3 days
                            </span>
                          </label>
                        )}
                        {errors.departureDate && (
                          <p className="text-xs text-red-500 mt-1">
                            {errors.departureDate}
                          </p>
                        )}
                      </FieldBox>

                      {/* Return — round trip only */}
                      {tripType === "round-trip" && (
                        <FieldBox label="Return" icon={<FaExchangeAlt />}>
                          <div
                            className={`border-2 rounded-xl px-3 py-2.5 transition-all hover:border-blue-400 focus-within:border-blue-600 focus-within:shadow-sm ${returnDate ? "border-blue-300" : "border-gray-200"}`}
                          >
                            <input
                              type="date"
                              value={returnDate}
                              min={departureDate}
                              onChange={(e) => setReturnDate(e.target.value)}
                              className="w-full text-sm font-medium text-gray-800 outline-none bg-transparent cursor-pointer"
                            />
                            {/* {returnDate && (
                              <p className="text-xs text-blue-600 font-semibold mt-0.5">
                                {new Date(returnDate).toLocaleDateString(
                                  "en-US",
                                  {
                                    weekday: "long",
                                    day: "numeric",
                                    month: "short",
                                  },
                                )}
                              </p>
                            )} */}
                          </div>
                          {errors.returnDate && (
                            <p className="text-xs text-red-500 mt-1">
                              {errors.returnDate}
                            </p>
                          )}
                        </FieldBox>
                      )}

                      {/* Travelers & Class */}
                      <FieldBox label="Travelers & Class" icon={<FaUser />}>
                        <button
                          type="button"
                          onClick={(e) => openDropdown(e)}
                          className="w-full flex items-center justify-between border-2 border-gray-200 rounded-xl px-3 py-2.5 bg-white hover:border-blue-400 transition text-left"
                        >
                          <span className="text-sm font-medium text-gray-800 truncate">
                            {displayText}
                          </span>
                          <FaChevronDown className="text-gray-400 text-xs shrink-0 ml-1" />
                        </button>
                      </FieldBox>
                    </div>
                  )}

                  {/* ── Additional Options ── */}
                  <div className="flex flex-wrap gap-x-6 gap-y-2 mb-5 pt-3 border-t border-gray-100">
                    {[
                      {
                        id: "directOnly",
                        label: "Direct flights only",
                        checked: directOnly,
                        onChange: () => {},
                      },
                      {
                        id: "flexDates",
                        label: "Flexible dates (±3 days)",
                        checked: flexibleDates,
                        onChange: () => setFlexibleDates(!flexibleDates),
                      },
                      {
                        id: "nearbyBoth",
                        label: "Include nearby airports",
                        checked: nearbyAirportsFrom || nearbyAirportsTo,
                        onChange: () => {},
                      },
                    ].map(({ id, label, checked, onChange }) => (
                      <label
                        key={id}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={onChange}
                          className="w-4 h-4 text-blue-700 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="text-sm text-gray-600 font-medium">
                          {label}
                        </span>
                      </label>
                    ))}
                  </div>

                  {/* ── Search Button ── */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 text-white font-extrabold text-lg py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95 tracking-wide uppercase"
                    style={{
                      background:
                        "linear-gradient(180deg, #2F80B7 0%, #1F8DB7 100%)",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background =
                        "linear-gradient(180deg, #256fa3 0%, #167fa8 100%)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background =
                        "linear-gradient(180deg, #2F80B7 0%, #1F8DB7 100%)")
                    }
                  >
                    <FaSearch className="text-base" />
                    {loading ? "Searching Flights..." : "Search Flights"}
                  </button>
                </form>
              </>
            ) : (
              /* ── Non-flight placeholder ── */
              <div className="text-center py-20">
                <div className="text-6xl mb-4">🏨</div>
                <h2 className="text-3xl font-bold text-gray-800 mb-2">
                  Hotel Booking
                </h2>
                <p className="text-gray-500 text-lg">
                  Hotel search functionality coming soon!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Travelers & Class Modal — untouched ── */}
      {isModalOpen && (
        <TravelersClassModal
          onClose={closeDropdown}
          onApply={handleApply}
          modalPosition={modalPosition}
          initialData={{ adults, travelClass, directOnly }}
        />
      )}
    </div>
  );
}
