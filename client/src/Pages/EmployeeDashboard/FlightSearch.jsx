import React, { useEffect, useRef, useState } from "react";
import SearchHeader from "../../components/search-layout/SearchHeader";
import SearchCard from "../../components/search-layout/SearchCard";
import {
  FaExchangeAlt,
  FaCalendarAlt,
  FaSearch,
  FaPlaneDeparture,
  FaPlaneArrival,
  FaUser,
} from "react-icons/fa";
import {
  MdFlight,
  MdFlightTakeoff,
  MdFlightLand,
  MdArrowForward,
  MdAltRoute,
} from "react-icons/md";
import TravelersClassModal from "../../components/FlightSearchComponents/TravelersClassModal";
import { useNavigate } from "react-router-dom";
import EmployeeHeader from "./Employee-Header";
import { airportDatabase } from "../../data/airportDatabase";
import { useFlightSearch } from "../../context/FlightSearchContext";
import { useDispatch } from "react-redux";
import { searchFlights } from "../../Redux/Actions/flight.thunks";

// Autocomplete Airport Search Component
const AirportSearchInput = ({ value, onChange, placeholder, id }) => {
  const [query, setQuery] = useState(value || "");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedAirport, setSelectedAirport] = useState(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Comprehensive airport database

  useEffect(() => {
    if (value && value !== query) {
      setQuery(value);
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const input = e.target.value;
    setQuery(input);

    if (input.length > 1) {
      const filtered = airportDatabase.filter((airport) => {
        const searchText = input.toLowerCase();
        return (
          airport.city.toLowerCase().includes(searchText) ||
          airport.iata_code.toLowerCase().includes(searchText) ||
          airport.country.toLowerCase().includes(searchText) ||
          airport.name.toLowerCase().includes(searchText)
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
    const displayText = `${airport.city} (${airport.iata_code})`;
    setQuery(displayText);
    setSelectedAirport(airport);
    onChange({ code: airport.iata_code, city: airport.city, ...airport });
    setShowSuggestions(false);
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={query}
        onChange={handleInputChange}
        onFocus={() => query.length > 1 && setShowSuggestions(true)}
        placeholder={placeholder}
        className="w-full p-2 md:p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base"
        autoComplete="off"
      />

      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((airport, index) => (
            <div
              key={`${airport.iata_code}-${index}`}
              onClick={() => handleSelectAirport(airport)}
              className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-semibold text-sm text-gray-800">
                    {airport.city}, {airport.country}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {airport.name}
                  </div>
                </div>
                <div className="ml-2 text-sm font-bold text-blue-600">
                  {airport.iata_code}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const CABIN_CLASS_MAP = {
  Economy: "economy",
  Business: "business",
  First: "first",
  "Premium Economy": "economy",
};

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

  const [multiCityFlights, setMultiCityFlights] = useState([
    { from: "", to: "", date: "" },
  ]);
  // const [travelerData, setTravelerData] = useState({
  //   adults: 1,
  //   children: 0,
  //   childAges: [],
  //   travelClass: "Economy",
  //   directOnly: false,
  // });
  const [fromAirport, setFromAirport] = useState({
    code: "DEL",
    city: "New Delhi",
  });
  const [toAirport, setToAirport] = useState({ code: "BOM", city: "Mumbai" });
  const [departureDate, setDepartureDate] = useState("");

  // Get flight search context
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
    toggleModal,
    isModalOpen,
    modalPosition,
    handleApply,
    adults,
    children,
    childAges,
    travelClass,
    directOnly,
  } = useFlightSearch();

  const validateSearch = () => {
    const newErrors = {};

    if (!fromAirport?.code) {
      newErrors.from = "Please select origin airport";
    }

    if (!toAirport?.code) {
      newErrors.to = "Please select destination airport";
    }

    if (!departureDate) {
      newErrors.departureDate = "Please select departure date";
    }

    if (tripType === "round-trip") {
      if (!returnDate) {
        newErrors.returnDate = "Please select return date";
      } else if (new Date(returnDate) < new Date(departureDate)) {
        newErrors.returnDate = "Return date cannot be before departure date";
      }
    }

    if (tripType === "multi-city") {
      multiCityFlights.forEach((f, idx) => {
        if (!f.from?.code || !f.to?.code || !f.date) {
          newErrors[`multi-${idx}`] = `Flight ${
            idx + 1
          }: all fields are required`;
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSearch = async () => {
    if (!validateSearch()) return;

    const payload = {
      journeyType:
        tripType === "one-way" ? 1 : tripType === "round-trip" ? 2 : 3,

      adults,
      children,
      infants: 0,

      // cabinClass: travelClass.toLowerCase(),
      cabinClass: CABIN_CLASS_MAP[travelClass] || 1,

      directFlight: directOnly,

      origin: fromAirport.code,
      destination: toAirport.code,

      // departureDate: formatDate(departureDate),
      departureDate,
      nearbyAirportsFrom,
      nearbyAirportsTo,
      flexibleDates,
    };

    if (tripType === "round-trip" && returnDate) {
      // payload.returnDate = formatDate(returnDate);
      payload.returnDate = returnDate;
    }

    if (tripType === "multi-city") {
      payload.segments = multiCityFlights.map((f) => ({
        origin: f.from.code,
        destination: f.to.code,
        departureDate: f.date,
        nearbyFrom: Boolean(f.nearbyFrom),
        nearbyTo: Boolean(f.nearbyTo),
      }));
    }

    try {
      setLoading(true);
      await dispatch(searchFlights(payload)).unwrap();
      navigate("/search-flight-results", {
        state: {
          searchPayload: payload,
        },
      });
    } catch (err) {
      console.error("Flight search failed:", err);
      alert("Flight search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const swapLocations = () => {
    const temp = from;
    setFrom(to);
    setTo(temp);
  };

  const addMultiCityFlight = () => {
    setMultiCityFlights((prev) => [...prev, { from: "", to: "", date: "" }]);
  };

  const removeMultiCityFlight = (index) => {
    setMultiCityFlights((prev) => prev.filter((_, i) => i !== index));
  };

  const updateMultiCityFlight = (index, field, value) => {
    setMultiCityFlights((prev) =>
      prev.map((flight, i) =>
        i === index ? { ...flight, [field]: value } : flight
      )
    );
  };

  const getTripIconConfig = () => {
    switch (tripType) {
      case "one-way":
        return {
          icon: <MdArrowForward size={15} />,
          action: swapLocations,
          title: "Swap origin and destination",
        };

      case "round-trip":
        return {
          icon: <FaExchangeAlt size={15} />,
          action: swapLocations,
          title: "Round trip (return journey)",
        };

      case "multi-city":
        return {
          icon: <MdAltRoute size={15} />,
          action: addMultiCityFlight,
          title: "Multi-city route",
        };

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen relative">
      {/* Background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "url(https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1920&q=80)",
          backgroundSize: "cover",
        }}
      >
        <div className="absolute inset-0 bg-white/40 backdrop-blur-sm" />
      </div>
      <EmployeeHeader />
      <div className="relative z-10 container mx-auto px-4 py-8">
        <SearchHeader activePage={activePage} onChangePage={setActivePage} />

        <SearchCard>
          <div className="max-w-6xl mx-auto">
            {activePage === "flight" ? (
              <>
                {/* Trip Type Tabs */}
                <div className="flex flex-wrap gap-4 mb-6 pb-4 border-b-2 border-gray-200">
                  {[
                    { key: "one-way", label: "One Way" },
                    { key: "round-trip", label: "Round Trip" },
                    { key: "multi-city", label: "Multi City" },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setTripType(key)}
                      className={`px-4 py-1.5 rounded-full font-semibold transition-all flex items-center gap-2 ${
                        tripType === key
                          ? "bg-blue-900 text-white shadow-lg"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {tripType === key && getTripIconConfig()?.icon}
                      {label}
                    </button>
                  ))}
                </div>

                {/* Search Form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSearch();
                  }}
                  className="flex-1 flex flex-col"
                >
                  {tripType === "multi-city" ? (
                    // Multi-city Layout
                    <div className="flex-1 mb-4 md:mb-6 space-y-3">
                      {multiCityFlights.map((flight, index) => (
                        <div
                          key={index}
                          className="p-4 border border-gray-200 rounded-lg bg-gray-50"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium text-gray-700">
                              Flight {index + 1}
                            </span>
                            {multiCityFlights.length > 2 && (
                              <button
                                type="button"
                                onClick={() => removeMultiCityFlight(index)}
                                className="text-red-500 hover:text-red-700 text-sm font-medium"
                              >
                                Remove
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4">
                            {/* From */}
                            <div>
                              <label className="flex items-center gap-1 text-xs md:text-sm font-medium text-blue-900 mb-1">
                                <FaPlaneDeparture />
                                From
                              </label>
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
                              />
                              <div className="mt-1 md:mt-2 flex items-center">
                                <input
                                  type="checkbox"
                                  id={`nearbyFrom-${index}`}
                                  checked={flight.nearbyFrom}
                                  onChange={() =>
                                    updateMultiCityFlight(
                                      index,
                                      "nearbyFrom",
                                      !flight.nearbyFrom
                                    )
                                  }
                                  className="h-3 w-3 md:h-4 md:w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                                />
                                <label
                                  htmlFor={`nearbyFrom-${index}`}
                                  className="ml-1 md:ml-2 block text-xs md:text-sm text-gray-700 cursor-pointer"
                                >
                                  Nearby airports
                                </label>
                              </div>
                            </div>

                            {/* To */}
                            <div>
                              <label className="flex items-center gap-1 text-xs md:text-sm font-medium text-blue-900 mb-1">
                                <FaPlaneArrival />
                                To
                              </label>
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
                              <div className="mt-1 md:mt-2 flex items-center">
                                <input
                                  type="checkbox"
                                  id={`nearbyTo-${index}`}
                                  checked={flight.nearbyTo}
                                  onChange={() =>
                                    updateMultiCityFlight(
                                      index,
                                      "nearbyTo",
                                      !flight.nearbyTo
                                    )
                                  }
                                  className="h-3 w-3 md:h-4 md:w-4 cursor-pointer text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <label
                                  htmlFor={`nearbyTo-${index}`}
                                  className="ml-1 md:ml-2 block text-xs cursor-pointer md:text-sm text-gray-700"
                                >
                                  Nearby airports
                                </label>
                              </div>
                            </div>

                            {/* Date */}
                            <div>
                              <label className="flex items-center gap-1 text-xs md:text-sm font-medium text-blue-900 mb-1">
                                Date <FaCalendarAlt />
                              </label>
                              <input
                                type="date"
                                value={flight.date}
                                onChange={(e) =>
                                  updateMultiCityFlight(
                                    index,
                                    "date",
                                    e.target.value
                                  )
                                }
                                className="w-full p-2 md:p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base"
                              />
                            </div>

                            {/* Travelers (only show on first flight) */}
                            {index === 0 && (
                              <div>
                                <label className="flex items-center gap-1 text-xs md:text-sm font-medium text-blue-900 mb-1">
                                  Travelers & Class <FaUser />
                                </label>
                                <div
                                  className="flex items-center justify-between p-2 md:p-3 border border-gray-300 rounded-lg cursor-pointer bg-white text-sm md:text-base"
                                  onClick={(e) => toggleModal(e)}
                                >
                                  <span className="text-gray-700 truncate">
                                    {displayText}
                                  </span>
                                  <svg
                                    className="w-4 h-4 md:w-5 md:h-5 text-gray-500"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="2"
                                      d="M19 9l-7 7-7-7"
                                    ></path>
                                  </svg>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Add Flight Button */}
                      {multiCityFlights.length < 5 && (
                        <button
                          type="button"
                          onClick={addMultiCityFlight}
                          className="w-full py-2 md:py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-500 transition-colors duration-300 text-sm md:text-base font-medium"
                        >
                          + Add Another Flight
                        </button>
                      )}
                    </div>
                  ) : (
                    // One-way and Round-trip Layout
                    <div
                      className={`grid grid-cols-1 ${
                        tripType === "Round-trip"
                          ? "md:grid-cols-5"
                          : "md:grid-cols-4"
                      } gap-3 md:gap-4 mb-4 md:mb-6 flex-1`}
                    >
                      {/* From */}
                      <div
                        className={
                          tripType === "round-trip" ? "md:col-span-1" : ""
                        }
                      >
                        <label className="flex text-xs md:text-sm font-medium text-blue-900 mb-1 gap-1 items-center">
                          <FaPlaneDeparture />
                          From
                        </label>
                        <AirportSearchInput
                          value={
                            fromAirport
                              ? `${fromAirport.city} (${fromAirport.code})`
                              : ""
                          }
                          onChange={setFromAirport}
                          placeholder="Search city or airport"
                          id="from-airport"
                        />
                        <div className="mt-1 md:mt-2 flex items-center">
                          <input
                            type="checkbox"
                            id="nearbyAirportsFrom"
                            checked={nearbyAirportsFrom}
                            onChange={() =>
                              setNearbyAirportsFrom(!nearbyAirportsFrom)
                            }
                            className="h-3 w-3 md:h-4 md:w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                          />
                          <label
                            htmlFor="nearbyAirportsFrom"
                            className="ml-1 md:ml-2 block text-xs md:text-sm text-gray-700 cursor-pointer"
                          >
                            Nearby airports
                          </label>
                        </div>
                      </div>

                      {/* To */}
                      <div
                        className={
                          tripType === "round-trip" ? "md:col-span-1" : ""
                        }
                      >
                        <label className="flex items-center gap-1 text-xs md:text-sm font-medium text-blue-900 mb-1">
                          <FaPlaneArrival />
                          To
                        </label>
                        <AirportSearchInput
                          value={
                            toAirport
                              ? `${toAirport.city} (${toAirport.code})`
                              : ""
                          }
                          onChange={setToAirport}
                          placeholder="Search city or airport"
                          id="to-airport"
                        />
                        <div className="mt-1 md:mt-2 flex items-center">
                          <input
                            type="checkbox"
                            id="nearbyAirportsTo"
                            checked={nearbyAirportsTo}
                            onChange={() =>
                              setNearbyAirportsTo(!nearbyAirportsTo)
                            }
                            className="h-3 w-3 md:h-4 md:w-4 cursor-pointer text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label
                            htmlFor="nearbyAirportsTo"
                            className="ml-1 md:ml-2 block text-xs cursor-pointer md:text-sm text-gray-700"
                          >
                            Nearby airports
                          </label>
                        </div>
                      </div>

                      {/* Departure Date */}
                      <div
                        className={
                          tripType === "round-trip" ? "md:col-span-1" : ""
                        }
                      >
                        <label className="flex items-center gap-1 text-xs md:text-sm font-medium text-blue-900 mb-1">
                          Departure <FaCalendarAlt />
                        </label>
                        <input
                          type="date"
                          value={departureDate}
                          onChange={(e) => setDepartureDate(e.target.value)}
                          className="w-full p-2 md:p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base"
                        />

                        {tripType === "round-trip" && (
                          <div className="mt-1 md:mt-2 flex items-center">
                            <input
                              type="checkbox"
                              id="flexibleDates"
                              checked={flexibleDates}
                              onChange={() => setFlexibleDates(!flexibleDates)}
                              className="h-3 w-3 md:h-4 md:w-4 cursor-pointer text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label
                              htmlFor="flexibleDates"
                              className="ml-1 md:ml-2 block cursor-pointer text-xs md:text-sm text-gray-700"
                            >
                              Flexible dates ±3 days
                            </label>
                          </div>
                        )}
                      </div>

                      {/* Return Date - only for Round-trip */}
                      {tripType === "round-trip" && (
                        <div className="md:col-span-1">
                          <label className="flex items-center gap-1 text-xs md:text-sm font-medium text-blue-900  mb-1">
                            <FaExchangeAlt />
                            Return
                          </label>
                          <input
                            type="date"
                            value={returnDate}
                            onChange={(e) => setReturnDate(e.target.value)}
                            className="w-full p-2 md:p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base"
                          />
                        </div>
                      )}

                      {/* Travelers & Class Selector */}
                      <div
                        className={
                          tripType === "round-trip" ? "md:col-span-1" : ""
                        }
                      >
                        <label className="flex items-center gap-1 text-xs md:text-sm font-medium text-blue-900 mb-1">
                          Travelers & Class <FaUser />
                        </label>
                        <div
                          className="flex items-center justify-between p-2 md:p-3 border border-gray-300 rounded-lg cursor-pointer bg-white text-sm md:text-base"
                          onClick={(e) => toggleModal(e)}
                        >
                          <span className="text-gray-700">{displayText}</span>
                          <svg
                            className="w-4 h-4 md:w-5 md:h-5 text-gray-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M19 9l-7 7-7-7"
                            ></path>
                          </svg>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Search Button */}
                  <div className="mt-auto pt-4">
                    <button
                      onClick={handleSearch}
                      disabled={loading}
                      className={`w-full mt-6 py-3 rounded-lg font-semibold text-white ${
                        loading
                          ? "bg-blue-400"
                          : "bg-blue-600 hover:bg-blue-700"
                      }`}
                    >
                      {loading ? "Searching flights..." : "Search Flights"}
                    </button>
                  </div>
                </form>

                {/* Additional Options */}
                <div className="mt-6 pt-6 border-t-2 border-gray-200">
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-5 h-5 text-blue-800 rounded"
                      />
                      <span className="text-gray-700">Direct flights only</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-5 h-5 text-blue-800 rounded"
                      />
                      <span className="text-gray-700">
                        Flexible dates (±3 days)
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-5 h-5 text-blue-800 rounded"
                      />
                      <span className="text-gray-700">
                        Include nearby airports
                      </span>
                    </label>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">🏨</div>
                <h2 className="text-3xl font-bold text-gray-800 mb-4">
                  Hotel Booking
                </h2>
                <p className="text-xl text-gray-600">
                  Hotel search functionality coming soon!
                </p>
              </div>
            )}
          </div>
        </SearchCard>
      </div>
      {/* Travelers & Class Modal */}
      {isModalOpen && (
        <TravelersClassModal
          onClose={toggleModal}
          onApply={handleApply}
          modalPosition={modalPosition}
          initialData={{
            adults,
            children,
            childAges,
            travelClass,
            directOnly,
          }}
        />
      )}
    </div>
  );
}
