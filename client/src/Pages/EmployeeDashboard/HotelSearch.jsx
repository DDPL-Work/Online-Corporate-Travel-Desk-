import React, { useState, useRef, useEffect } from "react";
import {
  FaSearch,
  FaHotel,
  FaPlane,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaUserFriends,
  FaMinus,
  FaPlus,
  FaChevronDown,
  FaTrain,
  FaBus,
  FaUmbrellaBeach,
  FaGlobe,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import EmployeeHeader from "./Employee-Header";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchCities,
  fetchCountries,
  searchHotels,
} from "../../Redux/Actions/hotelThunks";

/* ─── Data ─── */
const POPULAR_BY_COUNTRY = {
  IN: ["Goa", "Delhi", "Mumbai", "Jaipur", "Bengaluru"],
  AE: ["Dubai", "Abu Dhabi"],
  US: ["New York", "Las Vegas", "Miami"],
  GB: ["London", "Edinburgh"],
  default: ["Dubai", "Paris", "Bali", "Singapore", "Tokyo"],
};

const NAV_TABS = [
  { id: "/search-flight", label: "Flights", icon: <FaPlane /> },
  { id: "/search-hotel", label: "Hotels", icon: <FaHotel /> },
];

/* ─── Country Selector ─── */
const CountrySelector = ({ value, onChange, countries }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = countries.filter(
    (c) =>
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.code?.toLowerCase().includes(search.toLowerCase()),
  );

  const selected = countries.find((c) => c.code === value);

  return (
    <div className="relative" ref={ref}>
      <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
        <FaGlobe className="text-blue-600" /> Country
      </label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between border-2 rounded-xl px-3 py-3 bg-white transition-all hover:border-blue-400 text-left
          ${open ? "border-blue-600 shadow-sm" : value ? "border-blue-300" : "border-gray-200"}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {selected ? (
            <>
              <span className="text-lg leading-none">{selected.flag}</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {selected.name}
                </p>
                {/* <p className="text-xs text-blue-600 font-bold">
                  {selected.code}
                </p> */}
              </div>
            </>
          ) : (
            <>
              <FaGlobe className="text-gray-400 shrink-0" />
              <span className="text-sm text-gray-400 font-medium">Select</span>
            </>
          )}
        </div>
        <FaChevronDown
          className={`text-gray-400 text-xs shrink-0 ml-1 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 w-64 mt-1 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
          {/* Search box */}
          <div className="p-2 border-b border-gray-100 bg-white sticky top-0">
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-2.5 py-1.5">
              <FaSearch className="text-gray-400 text-xs" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search country..."
                className="text-xs font-medium text-gray-700 outline-none bg-transparent w-full placeholder-gray-400"
              />
            </div>
          </div>

          <div className="max-h-56 overflow-y-auto">
            {value && (
              <div
                onMouseDown={() => {
                  onChange("");
                  setOpen(false);
                  setSearch("");
                }}
                className="flex items-center gap-2 px-4 py-2.5 hover:bg-red-50 cursor-pointer border-b border-gray-100"
              >
                <span className="text-xs text-red-500 font-semibold">
                  ✕ Clear selection
                </span>
              </div>
            )}
            {filtered.map((country) => (
              <div
                key={country.code}
                onMouseDown={() => {
                  onChange(country.code);
                  setOpen(false);
                  setSearch("");
                }}
                className={`flex items-center justify-between px-4 py-3 hover:bg-blue-50 cursor-pointer transition group border-b border-gray-50 last:border-0
                  ${value === country.code ? "bg-blue-50" : ""}`}
              >
                <div className="flex items-center gap-3">
                  {/* <span className="text-xl">{country.flag}</span> */}
                  <p
                    className={`text-sm font-semibold group-hover:text-blue-700 ${value === country.code ? "text-blue-700" : "text-gray-800"}`}
                  >
                    {country.name}
                  </p>
                </div>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-lg ${value === country.code ? "bg-blue-700 text-white" : "bg-gray-100 text-gray-500"}`}
                >
                  {country.code}
                </span>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-6">
                No countries found
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Main Page ─── */
export default function HotelSearchPage() {
  const navigate = useNavigate();
  const [activePage, setActivePage] = useState("/search-hotel");
  const [country, setCountry] = useState("IN");
  const [city, setCity] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [rooms, setRooms] = useState(1);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [showGuestDropdown, setShowGuestDropdown] = useState(false);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [filteredCities, setFilteredCities] = useState([]);
  const [selectedCityCode, setSelectedCityCode] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const guestRef = useRef(null);
  const cityRef = useRef(null);

  const dispatch = useDispatch();
  const { countries, citiesByCountry, loading } = useSelector(
    (state) => state.hotel,
  );

  const currentCities = citiesByCountry?.[country] || [];

  const getFlagEmoji = (countryCode) => {
    if (!countryCode) return "";
    return countryCode
      .toUpperCase()
      .replace(/./g, (char) =>
        String.fromCodePoint(127397 + char.charCodeAt()),
      );
  };

  useEffect(() => {
    console.log("Redux countries:", countries);
  }, [countries]);

  const countryArray =
    countries?.data?.CountryList || countries?.data || countries || [];

  const normalizedCountries = Array.isArray(countryArray)
    ? countryArray.map((c) => {
        const code = c.Code || c.code;
        return {
          code,
          name: c.Name || c.name,
          flag: getFlagEmoji(code),
        };
      })
    : [];

  const handleCountryChange = (code) => {
    setCountry(code);
    setCity("");
    setSelectedCityCode(null); // 🔥 IMPORTANT
    setFilteredCities([]);
  };

  useEffect(() => {
    dispatch(fetchCountries());
  }, [dispatch]);

  useEffect(() => {
    if (country) {
      dispatch(fetchCities(country));
    }
  }, [country, dispatch]);

  useEffect(() => {
    const handleClick = (e) => {
      if (guestRef.current && !guestRef.current.contains(e.target))
        setShowGuestDropdown(false);
      if (cityRef.current && !cityRef.current.contains(e.target))
        setShowCitySuggestions(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleCityChange = (val) => {
    setCity(val);

    const filtered = currentCities.filter((c) =>
      c.Name?.toLowerCase().includes(val.toLowerCase()),
    );

    setFilteredCities(filtered);
    setShowCitySuggestions(true);
  };

  const handleCitySelect = (cityObj) => {
    setCity(cityObj.Name); // for UI
    setSelectedCityCode(cityObj.Code); // ✅ CORRECT PROPERTY
    setShowCitySuggestions(false);
  };

  const handleSearch = async () => {
    if (!selectedCityCode || !checkIn || !checkOut) {
      alert("Please select a valid city and fill all required fields");
      return;
    }

    setIsSearching(true);
    setNoResults(true);

    const payload = {
      CheckIn: checkIn,
      CheckOut: checkOut,
      CityCode: selectedCityCode, // string is fine
      GuestNationality: country, // 🔥 IMPORTANT
      NoOfRooms: rooms,
      PaxRooms: [
        {
          Adults: adults,
          Children: children,
          ChildrenAges: children > 0 ? Array(children).fill(5) : [],
        },
      ],
      IsDetailedResponse: true,
      Filters: {
        Refundable: false,
        MealType: "All",
      },
    };

    try {
      const result = await dispatch(searchHotels(payload)).unwrap();

      if (result) {
        navigate("/search-hotel-results");
      }
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const guestSummary = `${adults + children} Guest${adults + children > 1 ? "s" : ""}, ${rooms} Room${rooms > 1 ? "s" : ""}`;
  const today = new Date().toISOString().split("T")[0];
  const nightCount =
    checkIn && checkOut
      ? Math.max(
          1,
          Math.round(
            (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24),
          ),
        )
      : null;
  const popularCities =
    POPULAR_BY_COUNTRY[country] || POPULAR_BY_COUNTRY.default;

  const selectedCountry = normalizedCountries.find((c) => c.code === country);

  const Counter = ({ val, setVal, min, max }) => (
    <div className="flex items-center gap-3">
      <button
        onClick={() => setVal(Math.max(min, val - 1))}
        disabled={val <= min}
        className="w-8 h-8 rounded-full border-2 border-blue-700 flex items-center justify-center text-blue-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-blue-50 transition"
      >
        <FaMinus size={10} />
      </button>
      <span className="w-5 text-center font-bold text-gray-800 text-base">
        {val}
      </span>
      <button
        onClick={() => setVal(Math.min(max, val + 1))}
        disabled={val >= max}
        className="w-8 h-8 rounded-full border-2 border-blue-700 flex items-center justify-center text-blue-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-blue-50 transition"
      >
        <FaPlus size={10} />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navbar */}
      <div className="bg-white shadow-md sticky top-0 z-50">
        <EmployeeHeader />
      </div>

      {/* Hero */}
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
              Find & Book Your Perfect Stay
            </h1>
            <p className="text-blue-200 mt-2 text-base font-medium">
              Best prices guaranteed · 10,000+ hotels worldwide
            </p>
          </div>
          <div className="flex justify-center flex-wrap gap-2">
            {NAV_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActivePage(tab.id);
                  if (tab.id.startsWith("/")) navigate(tab.id);
                }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200
                  ${activePage === tab.id ? "bg-white text-blue-800 shadow-lg scale-105" : "bg-white/10 text-white hover:bg-white/20"}`}
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

      {/* Search Card */}
      <div className="max-w-6xl mx-auto px-4 -mt-28 relative z-10 pb-12">
        <div className="bg-white rounded-2xl shadow-2xl">
          {/* Card Header */}
          <div className="px-6 pt-5 pb-3 border-b border-gray-100 flex items-center gap-2 flex-wrap">
            <FaHotel className="text-blue-700 text-xl" />
            <span className="text-gray-800 font-bold text-lg">
              Search Hotels
            </span>
            {selectedCountry && (
              <span className="flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1 rounded-full border border-blue-100">
                {selectedCountry?.code} {selectedCountry.name}
                <span className="bg-blue-700 text-white px-1.5 py-0.5 rounded text-xs">
                  {selectedCountry.code}
                </span>
              </span>
            )}
            <span className="ml-auto text-xs text-gray-400 font-medium">
              Find the best deal
            </span>
          </div>

          <div className="p-5 md:p-6">
            {/* Form Grid — 12 cols: Country(2) + City(4) + CheckIn(2) + CheckOut(2) + Guests(2) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
              {/* ── Country ── */}
              <div className="md:col-span-2">
                <CountrySelector
                  value={country}
                  onChange={handleCountryChange}
                  countries={normalizedCountries}
                />
              </div>

              {/* ── City / Hotel / Area ── */}
              <div className="md:col-span-4 relative" ref={cityRef}>
                <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                  <FaMapMarkerAlt className="text-blue-600" /> City / Hotel /
                  Area
                </label>
                <div
                  className={`flex items-center gap-2 border-2 rounded-xl px-3 py-3 bg-white transition-all cursor-text
                    ${showCitySuggestions ? "border-blue-600 shadow-sm" : "border-gray-200 hover:border-blue-400"}`}
                  onClick={() => setShowCitySuggestions(true)}
                >
                  <FaMapMarkerAlt className="text-blue-500 shrink-0" />
                  <input
                    value={city}
                    onChange={(e) => handleCityChange(e.target.value)}
                    placeholder={
                      country
                        ? `Search in ${selectedCountry?.name}…`
                        : "Where do you want to stay?"
                    }
                    className="w-full text-sm font-medium text-gray-800 placeholder-gray-400 outline-none bg-transparent"
                  />
                </div>

                {showCitySuggestions && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden max-h-64 overflow-y-auto">
                    <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 sticky top-0 flex items-center gap-2">
                      {selectedCountry && <span>{selectedCountry.flag}</span>}
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                        {country
                          ? `Cities in ${selectedCountry?.name}`
                          : "Popular Destinations"}
                      </p>
                    </div>
                    {(filteredCities.length > 0
                      ? filteredCities
                      : currentCities
                    ).map((c) => (
                      <div
                        key={c.Name}
                        onMouseDown={() => handleCitySelect(c)}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50 cursor-pointer transition group"
                      >
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                          <FaMapMarkerAlt className="text-blue-600 text-xs" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800 group-hover:text-blue-700">
                            {c.Name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {selectedCountry?.name || "Hotels & Resorts"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Check-in ── */}
              <div className="md:col-span-2">
                <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                  <FaCalendarAlt className="text-blue-600" /> Check-in
                </label>
                <div
                  className={`border-2 rounded-xl px-3 py-3 transition-all hover:border-blue-400 focus-within:border-blue-600 focus-within:shadow-sm ${checkIn ? "border-blue-300" : "border-gray-200"}`}
                >
                  <input
                    type="date"
                    value={checkIn}
                    min={today}
                    onChange={(e) => {
                      setCheckIn(e.target.value);
                      if (checkOut && e.target.value >= checkOut)
                        setCheckOut("");
                    }}
                    className="w-full text-sm font-medium text-gray-800 outline-none bg-transparent cursor-pointer"
                  />
                  {/* {checkIn && (
                    <p className="text-xs text-blue-600 font-semibold mt-1">
                      {new Date(checkIn).toLocaleDateString("en-US", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  )} */}
                </div>
              </div>

              {/* ── Check-out ── */}
              <div className="md:col-span-2">
                <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                  <FaCalendarAlt className="text-blue-600" /> Check-out
                </label>
                <div
                  className={`border-2 rounded-xl px-3 py-3 transition-all hover:border-blue-400 focus-within:border-blue-600 focus-within:shadow-sm ${checkOut ? "border-blue-300" : "border-gray-200"}`}
                >
                  <input
                    type="date"
                    value={checkOut}
                    min={checkIn || today}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="w-full text-sm font-medium text-gray-800 outline-none bg-transparent cursor-pointer"
                  />
                  {/* {checkOut && (
                    <p className="text-xs text-blue-600 font-semibold mt-1">
                      {new Date(checkOut).toLocaleDateString("en-US", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  )} */}
                </div>
                {nightCount && (
                  <div className="mt-1.5 text-center">
                    <span className="inline-block bg-orange-100 text-orange-600 text-xs font-bold px-3 py-0.5 rounded-full">
                      {nightCount} Night{nightCount > 1 ? "s" : ""}
                    </span>
                  </div>
                )}
              </div>

              {/* ── Guests & Rooms ── */}
              <div className="md:col-span-2 relative" ref={guestRef}>
                <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                  <FaUserFriends className="text-blue-600" /> Guests &amp; Rooms
                </label>
                <button
                  onClick={() => setShowGuestDropdown(!showGuestDropdown)}
                  className={`w-full flex items-center justify-between border-2 rounded-xl px-3 py-3 transition-all hover:border-blue-400 bg-white text-left
                    ${showGuestDropdown ? "border-blue-600 shadow-sm" : "border-gray-200"}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FaUserFriends className="text-blue-500 shrink-0" />
                    <span className="text-sm font-medium text-gray-800 truncate">
                      {guestSummary}
                    </span>
                  </div>
                  <FaChevronDown
                    className={`text-gray-400 text-xs shrink-0 ml-1 transition-transform duration-200 ${showGuestDropdown ? "rotate-180" : ""}`}
                  />
                </button>

                {showGuestDropdown && (
                  <div className="absolute top-full right-0 mt-1 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 w-72 p-5">
                    <h4 className="text-sm font-bold text-gray-700 mb-4">
                      Select Guests &amp; Rooms
                    </h4>
                    {[
                      {
                        label: "Rooms",
                        sub: null,
                        val: rooms,
                        setVal: setRooms,
                        min: 1,
                        max: 9,
                      },
                      {
                        label: "Adults",
                        sub: "12+ years",
                        val: adults,
                        setVal: setAdults,
                        min: 1,
                        max: 30,
                      },
                      {
                        label: "Children",
                        sub: "0–11 years",
                        val: children,
                        setVal: setChildren,
                        min: 0,
                        max: 10,
                      },
                    ].map(({ label, sub, val, setVal, min, max }) => (
                      <div
                        key={label}
                        className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                      >
                        <div>
                          <p className="text-sm font-semibold text-gray-800">
                            {label}
                          </p>
                          {sub && (
                            <p className="text-xs text-gray-400">{sub}</p>
                          )}
                        </div>
                        <Counter
                          val={val}
                          setVal={setVal}
                          min={min}
                          max={max}
                        />
                      </div>
                    ))}
                    <button
                      onClick={() => setShowGuestDropdown(false)}
                      className="mt-4 w-full bg-blue-700 hover:bg-blue-800 text-white text-sm font-bold py-2.5 rounded-xl transition"
                    >
                      Apply
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Popular Pills — updates based on selected country */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-gray-400">
                Popular:
              </span>
              {popularCities.map((c) => (
                <button
                  key={c}
                  onClick={() => setCity(c)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition
                    ${city === c ? "bg-blue-700 text-white border-blue-700" : "bg-white text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-700"}`}
                >
                  <FaMapMarkerAlt className="text-xs" /> {c}
                </button>
              ))}
            </div>

            {/* Search Button */}
            <div className="mt-5">
              <button
                onClick={handleSearch}
                disabled={isSearching}
                className={`w-full flex items-center justify-center gap-3 text-white font-extrabold text-lg py-4 rounded-xl shadow-lg transition-all duration-200 active:scale-95 tracking-wide uppercase
    ${isSearching ? "opacity-70 cursor-not-allowed" : ""}`}
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
                {isSearching ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8z"
                      />
                    </svg>
                    Searching...
                  </>
                ) : (
                  <>
                    <FaSearch className="text-base" />
                    Search Hotels
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: "🏨", title: "10,000+ Hotels", sub: "Across 500+ cities" },
            { icon: "💰", title: "Best Price", sub: "Guaranteed lowest rates" },
            { icon: "✅", title: "Free Cancellation", sub: "On most bookings" },
            { icon: "🔒", title: "Secure Booking", sub: "100% safe payments" },
          ].map(({ icon, title, sub }) => (
            <div
              key={title}
              className="bg-white rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm border border-gray-100 hover:shadow-md transition cursor-default"
            >
              <span className="text-2xl">{icon}</span>
              <div>
                <p className="text-sm font-bold text-gray-800">{title}</p>
                <p className="text-xs text-gray-400">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
