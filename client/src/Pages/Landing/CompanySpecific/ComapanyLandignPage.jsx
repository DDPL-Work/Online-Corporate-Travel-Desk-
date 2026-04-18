import React, { useState, useRef, useEffect } from "react";
import {
  FaSearch, FaHotel, FaPlane, FaMapMarkerAlt, FaCalendarAlt,
  FaUserFriends, FaMinus, FaPlus, FaChevronDown, FaGlobe,
  FaExchangeAlt, FaPlaneDeparture, FaPlaneArrival, FaUser,
  FaBriefcase, FaShieldAlt, FaChartLine, FaHeadset,
  FaCheckCircle, FaStar, FaArrowRight,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchCities, fetchCountries, searchHotels } from "../../../Redux/Actions/hotelThunks";
import { searchFlights } from "../../../Redux/Actions/flight.thunks";
import { searchFlightsMC } from "../../../Redux/Actions/flight.thunks.MC";
import TravelersClassModal from "../../../components/FlightSearchComponents/TravelersClassModal";
// import EmployeeHeader from "../";
import { airportDatabase } from "../../../data/airportDatabase";
import { useFlightSearch } from "../../../context/FlightSearchContext";
import { ToastWithTimer } from "../../../utils/ToastConfirm";

/* ─────────────────── CONSTANTS ─────────────────── */
const COMPANY_TYPES = [
  { id: "it",            label: "IT & Tech",       icon: "💻", headline: "Power Your Team's Travel",         sub: "Seamless bookings for sprints, conferences & client visits" },
  { id: "finance",       label: "Finance",          icon: "📊", headline: "Travel Compliance, Simplified",    sub: "Policy-enforced bookings with complete audit trails" },
  { id: "consulting",    label: "Consulting",       icon: "🤝", headline: "Always at Your Client's Side",     sub: "Fast bookings, flexible changes, centralized billing" },
  { id: "manufacturing", label: "Manufacturing",    icon: "🏭", headline: "Connect Every Plant & HQ",         sub: "Multi-site travel with bulk booking & cost controls" },
  { id: "healthcare",    label: "Healthcare",       icon: "🏥", headline: "Travel That Never Misses a Beat",  sub: "Reliable, policy-compliant travel for medical teams" },
  { id: "retail",        label: "Retail & FMCG",   icon: "🛒", headline: "Scale Your Field Team Travel",     sub: "High-volume bookings with real-time spend visibility" },
];

const CABIN_CLASS_MAP = {
  Economy: "economy", Business: "business", "First Class": "first_class",
  "Premium Economy": "premium_economy", "Premium Business": "premium_business",
};

/* ─────────────────── AIRPORT SEARCH INPUT ─────────────────── */
const AirportSearchInput = ({ value, onChange, placeholder, id, error }) => {
  const [query, setQuery] = useState(value || "");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => { if (value && value !== query) setQuery(value); }, [value]);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
          inputRef.current && !inputRef.current.contains(e.target))
        setShowSuggestions(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleInputChange = (e) => {
    const input = e.target.value;
    setQuery(input);
    if (input.length > 1) {
      const s = input.toLowerCase();
      setSuggestions(airportDatabase.filter(a =>
        a.city.toLowerCase().includes(s) || a.iata_code.toLowerCase().includes(s) ||
        a.country.toLowerCase().includes(s) || a.name.toLowerCase().includes(s)
      ).slice(0, 10));
      setShowSuggestions(true);
    } else { setSuggestions([]); setShowSuggestions(false); }
  };

  const handleSelect = (airport) => {
    setQuery(`${airport.city} (${airport.iata_code})`);
    onChange({ code: airport.iata_code, city: airport.city, ...airport });
    setShowSuggestions(false);
  };

  return (
    <div className="relative">
      <div className={`flex items-center gap-2 border-2 rounded-xl px-3 py-2.5 bg-white transition-all
        ${showSuggestions ? "border-blue-600 shadow-sm" : error ? "border-red-400" : "border-gray-200 hover:border-blue-400"}`}>
        <FaMapMarkerAlt className="text-blue-500 shrink-0 text-xs" />
        <input ref={inputRef} id={id} type="text" value={query} onChange={handleInputChange}
          onFocus={() => query.length > 1 && setShowSuggestions(true)}
          placeholder={placeholder} autoComplete="off"
          className="w-full text-sm font-medium text-gray-800 placeholder-gray-400 outline-none bg-transparent" />
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      {showSuggestions && suggestions.length > 0 && (
        <div ref={dropdownRef} className="absolute z-50 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
          <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100 sticky top-0">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Airports</p>
          </div>
          {suggestions.map((airport, i) => (
            <div key={`${airport.iata_code}-${i}`} onClick={() => handleSelect(airport)}
              className="flex items-center justify-between px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-0 group">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <FaPlane className="text-blue-600 text-xs" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 group-hover:text-blue-700">{airport.city}, {airport.country}</p>
                  <p className="text-xs text-gray-400">{airport.name}</p>
                </div>
              </div>
              <span className="ml-2 text-sm font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">{airport.iata_code}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─────────────────── COUNTRY SELECTOR ─────────────────── */
const CountrySelector = ({ value, onChange, countries, label = "Country" }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = countries.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.code?.toLowerCase().includes(search.toLowerCase())
  );
  const selected = countries.find(c => c.code === value);

  return (
    <div className="relative" ref={ref}>
      <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
        <FaGlobe className="text-blue-600" /> {label}
      </label>
      <button type="button" onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between border-2 rounded-xl px-3 py-3 bg-white transition-all hover:border-blue-400 text-left
          ${open ? "border-blue-600 shadow-sm" : value ? "border-blue-300" : "border-gray-200"}`}>
        <div className="flex items-center gap-2 min-w-0">
          {selected ? (
            <><span className="text-lg leading-none">{selected.flag}</span>
            <p className="text-sm font-semibold text-gray-800 truncate">{selected.name}</p></>
          ) : (
            <><FaGlobe className="text-gray-400 shrink-0" /><span className="text-sm text-gray-400 font-medium">Select</span></>
          )}
        </div>
        <FaChevronDown className={`text-gray-400 text-xs shrink-0 ml-1 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 w-64 mt-1 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
          <div className="p-2 border-b border-gray-100 sticky top-0">
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-2.5 py-1.5">
              <FaSearch className="text-gray-400 text-xs" />
              <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search country..."
                className="text-xs font-medium text-gray-700 outline-none bg-transparent w-full placeholder-gray-400" />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto">
            {value && (
              <div onMouseDown={() => { onChange(""); setOpen(false); setSearch(""); }}
                className="flex items-center gap-2 px-4 py-2.5 hover:bg-red-50 cursor-pointer border-b border-gray-100">
                <span className="text-xs text-red-500 font-semibold">✕ Clear selection</span>
              </div>
            )}
            {filtered.map(country => (
              <div key={country.code} onMouseDown={() => { onChange(country.code); setOpen(false); setSearch(""); }}
                className={`flex items-center justify-between px-4 py-3 hover:bg-blue-50 cursor-pointer transition group border-b border-gray-50 last:border-0
                  ${value === country.code ? "bg-blue-50" : ""}`}>
                <p className={`text-sm font-semibold group-hover:text-blue-700 ${value === country.code ? "text-blue-700" : "text-gray-800"}`}>{country.name}</p>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${value === country.code ? "bg-blue-700 text-white" : "bg-gray-100 text-gray-500"}`}>{country.code}</span>
              </div>
            ))}
            {filtered.length === 0 && <p className="text-xs text-gray-400 text-center py-6">No countries found</p>}
          </div>
        </div>
      )}
    </div>
  );
};

/* ─────────────────── COUNTER ─────────────────── */
const Counter = ({ val, setVal, min, max }) => (
  <div className="flex items-center gap-3">
    <button onClick={() => setVal(Math.max(min, val - 1))} disabled={val <= min}
      className="w-8 h-8 rounded-full border-2 border-blue-700 flex items-center justify-center text-blue-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-blue-50 transition">
      <FaMinus size={10} />
    </button>
    <span className="w-5 text-center font-bold text-gray-800 text-base">{val}</span>
    <button onClick={() => setVal(Math.min(max, val + 1))} disabled={val >= max}
      className="w-8 h-8 rounded-full border-2 border-blue-700 flex items-center justify-center text-blue-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-blue-50 transition">
      <FaPlus size={10} />
    </button>
  </div>
);

/* ─────────────────── FIELD BOX ─────────────────── */
const FieldBox = ({ label, icon, children, className = "" }) => (
  <div className={className}>
    <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
      <span className="text-blue-600">{icon}</span>{label}
    </label>
    {children}
  </div>
);

/* ═══════════════════════════════════════════════════════
   MAIN LANDING PAGE
═══════════════════════════════════════════════════════ */
export default function CompanyLandingPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  /* Company selector */
  const [selectedCompany, setSelectedCompany] = useState("it");
  const activeCompany = COMPANY_TYPES.find(c => c.id === selectedCompany);

  /* Active search tab */
  const [activeTab, setActiveTab] = useState("flight");

  /* ══ FLIGHT STATE ══ */
  const [flightLoading, setFlightLoading] = useState(false);
  const [flightErrors, setFlightErrors] = useState({});
  const [tripType, setTripType] = useState("one-way");
  const [returnDate, setReturnDate] = useState("");
  const today = new Date().toISOString().split("T")[0];
  const [multiCityFlights, setMultiCityFlights] = useState([{ from: "", to: "", date: "" }]);
  const [fromAirport, setFromAirport] = useState({ code: "DEL", city: "New Delhi" });
  const [toAirport, setToAirport] = useState({ code: "CCU", city: "Kolkata" });
  const [departureDate, setDepartureDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split("T")[0];
  });

  const {
    nearbyAirportsTo, setNearbyAirportsTo,
    nearbyAirportsFrom, setNearbyAirportsFrom,
    flexibleDates, setFlexibleDates,
    displayText, isModalOpen, modalPosition,
    handleApply, passengers, travelClass, directOnly,
    openDropdown, closeDropdown,
  } = useFlightSearch();

  const { adults = 1, children: flightChildren = 0, infants = 0 } = passengers || {};

  useEffect(() => {
    if (returnDate && departureDate && returnDate < departureDate) setReturnDate(departureDate);
  }, [departureDate]);

  const validateFlight = () => {
    const e = {};
    if (!fromAirport?.code) e.from = "Please select origin airport";
    if (!toAirport?.code && tripType !== "multi-city") e.to = "Please select destination airport";
    if (tripType !== "multi-city" && !departureDate) e.departureDate = "Please select departure date";
    if (tripType === "round-trip") {
      if (!returnDate) e.returnDate = "Please select return date";
      else if (new Date(returnDate) < new Date(departureDate)) e.returnDate = "Return date cannot be before departure date";
    }
    if (tripType === "multi-city") {
      multiCityFlights.forEach((f, i) => {
        if (!f.from?.code || !f.to?.code || !f.date) e[`multi-${i}`] = `Flight ${i + 1}: all fields required`;
      });
    }
    setFlightErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleFlightSearch = async (ev) => {
    ev?.preventDefault();
    if (!validateFlight()) return;
    const journeyType = tripType === "one-way" ? 1 : tripType === "round-trip" ? 2 : 3;
    let payload = {
      journeyType, adults, children: flightChildren, infants,
      cabinClass: CABIN_CLASS_MAP[travelClass] || "economy",
      directFlight: directOnly, nearbyAirportsFrom, nearbyAirportsTo, flexibleDates,
    };
    if (journeyType !== 3) { payload.origin = fromAirport.code; payload.destination = toAirport.code; payload.departureDate = departureDate; }
    if (journeyType === 2) payload.returnDate = returnDate;
    if (journeyType === 3) {
      payload = { journeyType: 3, adults, children: flightChildren, infants,
        cabinClass: CABIN_CLASS_MAP[travelClass] || "economy", directFlight: directOnly,
        segments: multiCityFlights.map(f => ({ origin: f.from.code, destination: f.to.code, departureDate: f.date })) };
    }
    try {
      setFlightLoading(true);
      if (journeyType === 3) await dispatch(searchFlightsMC(payload)).unwrap();
      else await dispatch(searchFlights(payload)).unwrap();
      navigate("/search-flight-results", { state: { searchPayload: payload } });
    } catch (err) {
      ToastWithTimer({ message: typeof err === "string" ? err : "Flight search failed. Please try again.", type: "error" });
    } finally { setFlightLoading(false); }
  };

  const swapLocations = () => { const t = fromAirport; setFromAirport(toAirport); setToAirport(t); };

  const updateMC = (index, field, value) => {
    setMultiCityFlights(prev => {
      const u = [...prev];
      u[index] = { ...u[index], [field]: value };
      if (field === "to" && index < u.length - 1 && value?.code) u[index + 1].from = value;
      if (field === "date" && index < u.length - 1 && value) {
        const nd = new Date(value); nd.setDate(nd.getDate() + 1);
        if (!u[index + 1].date) u[index + 1].date = nd.toISOString().split("T")[0];
      }
      return u;
    });
  };

  const addMC = () => setMultiCityFlights(prev => { const last = prev[prev.length - 1]; return [...prev, { from: last?.to || "", to: "", date: "" }]; });
  const removeMC = (i) => setMultiCityFlights(prev => {
    const u = prev.filter((_, idx) => idx !== i);
    for (let j = 0; j < u.length - 1; j++) if (u[j].to && !u[j + 1].from) u[j + 1].from = u[j].to;
    return u;
  });

  /* ══ HOTEL STATE ══ */
  const [hotelCountry, setHotelCountry] = useState("IN");
  const [guestNationality, setGuestNationality] = useState("IN");
  const [city, setCity] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [rooms, setRooms] = useState(1);
  const [roomConfigs, setRoomConfigs] = useState([{ adults: 1, children: 0, childrenAges: [] }]);
  const [showGuestDropdown, setShowGuestDropdown] = useState(false);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [filteredCities, setFilteredCities] = useState([]);
  const [selectedCityCode, setSelectedCityCode] = useState(null);
  const [isHotelSearching, setIsHotelSearching] = useState(false);
  const guestRef = useRef(null);
  const cityRef = useRef(null);

  const { countries, citiesByCountry } = useSelector(s => s.hotel);
  const currentCities = citiesByCountry?.[hotelCountry] || [];

  const getFlagEmoji = (code) => {
    if (!code) return "";
    return code.toUpperCase().replace(/./g, c => String.fromCodePoint(127397 + c.charCodeAt()));
  };

  const countryArray = countries?.data?.CountryList || countries?.data || countries || [];
  const normalizedCountries = Array.isArray(countryArray)
    ? countryArray.map(c => { const code = c.Code || c.code; return { code, name: c.Name || c.name, flag: getFlagEmoji(code) }; })
    : [];

  const handleHotelCountryChange = (code) => { setHotelCountry(code); setCity(""); setSelectedCityCode(null); setFilteredCities([]); };

  useEffect(() => { dispatch(fetchCountries()); }, [dispatch]);
  useEffect(() => { if (hotelCountry) dispatch(fetchCities(hotelCountry)); }, [hotelCountry, dispatch]);

  useEffect(() => {
    const handler = (e) => {
      if (guestRef.current && !guestRef.current.contains(e.target)) setShowGuestDropdown(false);
      if (cityRef.current && !cityRef.current.contains(e.target)) setShowCitySuggestions(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleCityChange = (val) => {
    setCity(val);
    setFilteredCities(currentCities.filter(c => c.Name?.toLowerCase().includes(val.toLowerCase())));
    setShowCitySuggestions(true);
  };
  const handleCitySelect = (cityObj) => { setCity(cityObj.Name); setSelectedCityCode(cityObj.Code); setShowCitySuggestions(false); };

  useEffect(() => {
    setRoomConfigs(prev => {
      const n = [...prev];
      if (rooms > n.length) for (let i = n.length; i < rooms; i++) n.push({ adults: 1, children: 0, childrenAges: [] });
      else if (rooms < n.length) n.length = rooms;
      return n;
    });
  }, [rooms]);

  const updateRoom = (idx, updater) => setRoomConfigs(prev => prev.map((r, i) => i === idx ? { ...r, ...updater(r) } : r));

  const handleHotelSearch = async () => {
    if (!selectedCityCode || !checkIn || !checkOut) { alert("Please select a valid city and fill all required fields"); return; }
    setIsHotelSearching(true);
    const payload = {
      CheckIn: checkIn, CheckOut: checkOut, CityCode: selectedCityCode,
      GuestNationality: guestNationality, ResponseTime: 23, NoOfRooms: rooms,
      PaxRooms: roomConfigs.map(r => ({ Adults: r.adults, Children: r.children, ChildrenAges: (r.childrenAges || []).slice(0, r.children) })),
      IsDetailedResponse: true, Filters: { Refundable: true, MealType: "All" },
    };
    try {
      const result = await dispatch(searchHotels({ payload, page: 1, limit: 10 })).unwrap();
      if (result?.hotels?.length > 0) navigate("/search-hotel-results"); else alert("No hotels found.");
    } catch (err) { console.error(err); }
    finally { setIsHotelSearching(false); }
  };

  const totalGuests = roomConfigs.reduce((s, r) => s + r.adults + r.children, 0);
  const guestSummary = `${totalGuests} Guest${totalGuests !== 1 ? "s" : ""}, ${rooms} Room${rooms > 1 ? "s" : ""}`;
  const nightCount = checkIn && checkOut ? Math.max(1, Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000)) : null;
  const selectedHotelCountry = normalizedCountries.find(c => c.code === hotelCountry);

  const renderRoomConfig = (room, idx) => {
    const setAdults = (v) => updateRoom(idx, () => ({ adults: Math.max(1, Math.min(8, v)) }));
    const setChildren = (v) => updateRoom(idx, r => {
      const count = Math.max(0, Math.min(4, v));
      return { children: count, childrenAges: Array.from({ length: count }, (_, i) => r.childrenAges?.[i] || 5) };
    });
    const setChildAge = (ci, v) => updateRoom(idx, r => {
      const ages = [...(r.childrenAges || [])]; ages[ci] = Math.min(18, Math.max(1, Number(v) || 1));
      return { childrenAges: ages };
    });
    return (
      <div key={idx} className="border border-gray-100 rounded-xl p-3 bg-white shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-gray-800">Room {idx + 1}</span>
          <span className="text-xs text-gray-500">{room.adults} Adult{room.adults > 1 ? "s" : ""} · {room.children} Child{room.children !== 1 ? "ren" : ""}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg">
            <span className="text-sm font-semibold text-gray-700">Adults</span>
            <Counter val={room.adults} setVal={setAdults} min={1} max={8} />
          </div>
          <div className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg">
            <span className="text-sm font-semibold text-gray-700">Children</span>
            <Counter val={room.children} setVal={setChildren} min={0} max={4} />
          </div>
        </div>
        {room.children > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-xs font-semibold text-gray-600">Child Ages (0–18)</p>
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: room.children }).map((_, ci) => (
                <select key={ci} value={room.childrenAges?.[ci] || 5} onChange={e => setChildAge(ci, e.target.value)}
                  className="border border-gray-300 rounded-lg px-2 py-2 text-sm">
                  {Array.from({ length: 18 }, (_, i) => i + 1).map(age => <option key={age} value={age}>{age} yrs</option>)}
                </select>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const cbClass = "h-3.5 w-3.5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer";
  const cbLabel = "ml-1.5 block text-xs text-gray-500 cursor-pointer font-medium";
  const searchBtnGradient = { background: "linear-gradient(180deg, #1a56db 0%, #1e3a8a 100%)" };

  /* ═══════════════════ RENDER ═══════════════════ */
  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Sticky Nav ── */}
      <div className="bg-white shadow-md sticky top-0 z-50">
        {/* <EmployeeHeader /> */}
      </div>

      {/* ══════════════════════════════════════════
          HERO
      ══════════════════════════════════════════ */}
      <section
        className="relative w-full overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 55%, #1d4ed8 100%)", minHeight: "640px" }}
      >
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-[480px] h-[480px] bg-blue-300 opacity-[0.06] rounded-full -translate-y-1/3 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[360px] h-[360px] bg-cyan-300 opacity-[0.06] rounded-full translate-y-1/2 -translate-x-1/4 pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-4 pt-12 pb-48">

          {/* Industry pill selector */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex flex-wrap justify-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-2xl p-1.5 border border-white/10">
              {COMPANY_TYPES.map(ct => (
                <button key={ct.id} onClick={() => setSelectedCompany(ct.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200
                    ${selectedCompany === ct.id ? "bg-white text-blue-900 shadow-lg" : "text-white/70 hover:text-white hover:bg-white/10"}`}>
                  <span className="text-base leading-none">{ct.icon}</span>
                  <span className="hidden sm:inline">{ct.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Hero text */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 rounded-full px-4 py-1.5 text-blue-200 text-xs font-bold uppercase tracking-widest mb-5">
              <FaBriefcase className="text-xs" />
              Corporate Travel Management Platform
            </div>
            <h1 className="text-white text-4xl md:text-5xl font-black tracking-tight leading-tight mb-3">
              {activeCompany.headline}
            </h1>
            <p className="text-blue-200 text-lg font-medium max-w-xl mx-auto leading-relaxed">
              {activeCompany.sub}
            </p>

            {/* Hero CTA buttons */}
            <div className="flex justify-center gap-4 mt-9 flex-wrap">
              <button onClick={() => setActiveTab("flight")}
                className={`flex items-center gap-3 px-8 py-3.5 rounded-xl font-extrabold text-[15px] tracking-wide transition-all duration-200 shadow-lg
                  ${activeTab === "flight"
                    ? "bg-white text-blue-900 scale-105 shadow-2xl"
                    : "bg-blue-600/30 text-white border border-blue-400/40 hover:bg-blue-600/50"}`}>
                <FaPlane className={activeTab === "flight" ? "text-blue-700" : "text-white"} />
                Search Flights
              </button>
              <button onClick={() => setActiveTab("hotel")}
                className={`flex items-center gap-3 px-8 py-3.5 rounded-xl font-extrabold text-[15px] tracking-wide transition-all duration-200 shadow-lg
                  ${activeTab === "hotel"
                    ? "bg-white text-blue-900 scale-105 shadow-2xl"
                    : "bg-blue-600/30 text-white border border-blue-400/40 hover:bg-blue-600/50"}`}>
                <FaHotel className={activeTab === "hotel" ? "text-blue-700" : "text-white"} />
                Search Hotels
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          FLOATING SEARCH CARD
      ══════════════════════════════════════════ */}
      <div className="max-w-6xl mx-auto px-4 -mt-36 relative z-10 pb-10">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100">

          {/* Tab header */}
          <div className="flex items-stretch border-b border-gray-100">
            <button onClick={() => setActiveTab("flight")}
              className={`flex items-center gap-2.5 px-7 py-4 text-sm font-extrabold transition-all border-b-[3px]
                ${activeTab === "flight" ? "text-blue-700 border-blue-700 bg-blue-50/50" : "text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50"}`}>
              <FaPlane className={activeTab === "flight" ? "text-blue-600" : "text-gray-400"} />
              Flights
            </button>
            <button onClick={() => setActiveTab("hotel")}
              className={`flex items-center gap-2.5 px-7 py-4 text-sm font-extrabold transition-all border-b-[3px]
                ${activeTab === "hotel" ? "text-blue-700 border-blue-700 bg-blue-50/50" : "text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50"}`}>
              <FaHotel className={activeTab === "hotel" ? "text-blue-600" : "text-gray-400"} />
              Hotels
            </button>
            <span className="ml-auto flex items-center px-6 text-xs text-gray-400 font-semibold uppercase tracking-wider">
              ✦ Best Corporate Rates
            </span>
          </div>

          <div className="p-5 md:p-7">

            {/* ════════ FLIGHT FORM ════════ */}
            {activeTab === "flight" && (
              <>
                <div className="flex flex-wrap gap-2 mb-5">
                  {[{ key: "one-way", label: "One Way" }, { key: "round-trip", label: "Round Trip" }, { key: "multi-city", label: "Multi City" }].map(({ key, label }) => (
                    <button key={key} onClick={() => setTripType(key)}
                      className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold transition-all border
                        ${tripType === key ? "bg-blue-700 text-white border-blue-700 shadow" : "bg-white text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-700"}`}>
                      {label}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleFlightSearch} className="flex flex-col">
                  {tripType === "multi-city" ? (
                    <div className="space-y-3 mb-5">
                      {multiCityFlights.map((flight, index) => (
                        <div key={index} className="p-4 border-2 border-gray-100 rounded-xl bg-gray-50">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-blue-700 text-white text-xs font-black flex items-center justify-center">{index + 1}</div>
                              <span className="text-sm font-bold text-gray-700">Flight {index + 1}</span>
                            </div>
                            {multiCityFlights.length > 2 && (
                              <button type="button" onClick={() => removeMC(index)}
                                className="text-red-500 hover:text-red-700 text-xs font-bold border border-red-200 px-2.5 py-1 rounded-full hover:bg-red-50 transition">
                                Remove
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <FieldBox label="From" icon={<FaPlaneDeparture />}>
                              <AirportSearchInput value={flight.from ? `${flight.from.city} (${flight.from.code})` : ""}
                                onChange={a => updateMC(index, "from", a)} placeholder="City or airport"
                                id={`mc-from-${index}`} error={flightErrors[`multi-${index}`]} />
                              <label className="flex items-center mt-1.5">
                                <input type="checkbox" checked={flight.nearbyFrom || false}
                                  onChange={() => updateMC(index, "nearbyFrom", !flight.nearbyFrom)} className={cbClass} />
                                <span className={cbLabel}>Nearby airports</span>
                              </label>
                            </FieldBox>
                            <FieldBox label="To" icon={<FaPlaneArrival />}>
                              <AirportSearchInput value={flight.to ? `${flight.to.city} (${flight.to.code})` : ""}
                                onChange={a => updateMC(index, "to", a)} placeholder="City or airport" id={`mc-to-${index}`} />
                              <label className="flex items-center mt-1.5">
                                <input type="checkbox" checked={flight.nearbyTo || false}
                                  onChange={() => updateMC(index, "nearbyTo", !flight.nearbyTo)} className={cbClass} />
                                <span className={cbLabel}>Nearby airports</span>
                              </label>
                            </FieldBox>
                            <FieldBox label="Date" icon={<FaCalendarAlt />}>
                              <div className="border-2 border-gray-200 rounded-xl px-3 py-2.5 hover:border-blue-400 focus-within:border-blue-600 transition">
                                <input type="date" value={flight.date} onChange={e => updateMC(index, "date", e.target.value)}
                                  className="w-full text-sm font-medium text-gray-800 outline-none bg-transparent cursor-pointer" />
                              </div>
                            </FieldBox>
                            {index === 0 && (
                              <FieldBox label="Travelers & Class" icon={<FaUser />}>
                                <button type="button" onClick={e => openDropdown(e)}
                                  className="w-full flex items-center justify-between border-2 border-gray-200 rounded-xl px-3 py-2.5 bg-white hover:border-blue-400 transition text-left">
                                  <span className="text-sm font-medium text-gray-800 truncate">{displayText}</span>
                                  <FaChevronDown className="text-gray-400 text-xs shrink-0 ml-1" />
                                </button>
                              </FieldBox>
                            )}
                          </div>
                        </div>
                      ))}
                      {multiCityFlights.length < 5 && (
                        <button type="button" onClick={addMC}
                          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-blue-500 hover:text-blue-600 transition font-bold text-sm">
                          + Add Another Flight
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className={`grid grid-cols-1 gap-3 mb-5 ${tripType === "round-trip" ? "md:grid-cols-5" : "md:grid-cols-4"}`}>
                      <FieldBox label="From" icon={<FaPlaneDeparture />}>
                        <AirportSearchInput value={fromAirport ? `${fromAirport.city} (${fromAirport.code})` : ""}
                          onChange={setFromAirport} placeholder="Search city or airport" id="from-airport" error={flightErrors.from} />
                        <label className="flex items-center mt-1.5">
                          <input type="checkbox" checked={nearbyAirportsFrom} onChange={() => setNearbyAirportsFrom(!nearbyAirportsFrom)} className={cbClass} />
                          <span className={cbLabel}>Nearby airports</span>
                        </label>
                      </FieldBox>

                      <div className="relative">
                        <div className="hidden md:flex absolute -left-5 top-8 z-10">
                          <button type="button" onClick={swapLocations}
                            className="w-9 h-9 rounded-full bg-white border-2 border-blue-200 shadow flex items-center justify-center text-blue-600 hover:bg-blue-50 hover:border-blue-400 transition">
                            <FaExchangeAlt size={14} />
                          </button>
                        </div>
                        <FieldBox label="To" icon={<FaPlaneArrival />}>
                          <AirportSearchInput value={toAirport ? `${toAirport.city} (${toAirport.code})` : ""}
                            onChange={setToAirport} placeholder="Search city or airport" id="to-airport" error={flightErrors.to} />
                          <label className="flex items-center mt-1.5">
                            <input type="checkbox" checked={nearbyAirportsTo} onChange={() => setNearbyAirportsTo(!nearbyAirportsTo)} className={cbClass} />
                            <span className={cbLabel}>Nearby airports</span>
                          </label>
                        </FieldBox>
                      </div>

                      <FieldBox label="Departure" icon={<FaCalendarAlt />}>
                        <div className={`border-2 rounded-xl px-3 py-2.5 transition-all hover:border-blue-400 focus-within:border-blue-600 ${departureDate ? "border-blue-300" : "border-gray-200"}`}>
                          <input type="date" value={departureDate} min={today} onChange={e => setDepartureDate(e.target.value)}
                            className="w-full text-sm font-medium text-gray-800 outline-none bg-transparent cursor-pointer" />
                        </div>
                        {tripType === "round-trip" && (
                          <label className="flex items-center mt-1.5">
                            <input type="checkbox" checked={flexibleDates} onChange={() => setFlexibleDates(!flexibleDates)} className={cbClass} />
                            <span className={cbLabel}>Flexible dates ±3 days</span>
                          </label>
                        )}
                        {flightErrors.departureDate && <p className="text-xs text-red-500 mt-1">{flightErrors.departureDate}</p>}
                      </FieldBox>

                      {tripType === "round-trip" && (
                        <FieldBox label="Return" icon={<FaExchangeAlt />}>
                          <div className={`border-2 rounded-xl px-3 py-2.5 transition-all hover:border-blue-400 focus-within:border-blue-600 ${returnDate ? "border-blue-300" : "border-gray-200"}`}>
                            <input type="date" value={returnDate} min={departureDate} onChange={e => setReturnDate(e.target.value)}
                              className="w-full text-sm font-medium text-gray-800 outline-none bg-transparent cursor-pointer" />
                          </div>
                          {flightErrors.returnDate && <p className="text-xs text-red-500 mt-1">{flightErrors.returnDate}</p>}
                        </FieldBox>
                      )}

                      <FieldBox label="Travelers & Class" icon={<FaUser />}>
                        <button type="button" onClick={e => openDropdown(e)}
                          className="w-full flex items-center justify-between border-2 border-gray-200 rounded-xl px-3 py-2.5 bg-white hover:border-blue-400 transition text-left">
                          <span className="text-sm font-medium text-gray-800 truncate">{displayText}</span>
                          <FaChevronDown className="text-gray-400 text-xs shrink-0 ml-1" />
                        </button>
                      </FieldBox>
                    </div>
                  )}

                  {/* Options */}
                  <div className="flex flex-wrap gap-x-6 gap-y-2 mb-5 pt-3 border-t border-gray-100">
                    {[
                      { id: "d1", label: "Direct flights only", checked: directOnly, onChange: () => {} },
                      { id: "d2", label: "Flexible dates (±3 days)", checked: flexibleDates, onChange: () => setFlexibleDates(!flexibleDates) },
                      { id: "d3", label: "Include nearby airports", checked: nearbyAirportsFrom || nearbyAirportsTo, onChange: () => {} },
                    ].map(({ id, label, checked, onChange }) => (
                      <label key={id} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={checked} onChange={onChange}
                          className="w-4 h-4 text-blue-700 rounded border-gray-300 focus:ring-blue-500 cursor-pointer" />
                        <span className="text-sm text-gray-600 font-medium">{label}</span>
                      </label>
                    ))}
                  </div>

                  <button type="submit" disabled={flightLoading}
                    className="w-full flex items-center justify-center gap-3 text-white font-black text-lg py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95 tracking-widest uppercase disabled:opacity-70 disabled:cursor-not-allowed"
                    style={searchBtnGradient}>
                    {flightLoading
                      ? <><svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>Searching...</>
                      : <><FaSearch className="text-base" />Search Flights</>}
                  </button>
                </form>
              </>
            )}

            {/* ════════ HOTEL FORM ════════ */}
            {activeTab === "hotel" && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3 items-start">

                  {/* Country */}
                  <div className="md:col-span-1 lg:col-span-2">
                    <CountrySelector value={hotelCountry} onChange={handleHotelCountryChange} countries={normalizedCountries} />
                  </div>

                  {/* City */}
                  <div className="md:col-span-1 lg:col-span-4 relative" ref={cityRef}>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                      <FaMapMarkerAlt className="text-blue-600" /> City / Hotel / Area
                    </label>
                    <div
                      className={`flex items-center gap-2 border-2 rounded-xl px-3 py-3 bg-white transition-all cursor-text
                        ${showCitySuggestions ? "border-blue-600 shadow-sm" : "border-gray-200 hover:border-blue-400"}`}
                      onClick={() => setShowCitySuggestions(true)}>
                      <FaMapMarkerAlt className="text-blue-500 shrink-0" />
                      <input value={city} onChange={e => handleCityChange(e.target.value)}
                        placeholder={hotelCountry ? `Search in ${selectedHotelCountry?.name}…` : "Where do you want to stay?"}
                        className="w-full text-sm font-medium text-gray-800 placeholder-gray-400 outline-none bg-transparent" />
                    </div>
                    {showCitySuggestions && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden max-h-64 overflow-y-auto">
                        <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 sticky top-0 flex items-center gap-2">
                          {selectedHotelCountry && <span>{selectedHotelCountry.flag}</span>}
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                            {hotelCountry ? `Cities in ${selectedHotelCountry?.name}` : "Popular Destinations"}
                          </p>
                        </div>
                        {(filteredCities.length > 0 ? filteredCities : currentCities).map(c => (
                          <div key={c.Name} onMouseDown={() => handleCitySelect(c)}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50 cursor-pointer transition group">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                              <FaMapMarkerAlt className="text-blue-600 text-xs" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-800 group-hover:text-blue-700">{c.Name}</p>
                              <p className="text-xs text-gray-400">{selectedHotelCountry?.name || "Hotels & Resorts"}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Check-in */}
                  <div className="md:col-span-1 lg:col-span-2">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                      <FaCalendarAlt className="text-blue-600" /> Check-in
                    </label>
                    <div className={`border-2 rounded-xl px-3 py-3 transition-all hover:border-blue-400 focus-within:border-blue-600 ${checkIn ? "border-blue-300" : "border-gray-200"}`}>
                      <input type="date" value={checkIn} min={today}
                        onChange={e => { setCheckIn(e.target.value); if (checkOut && e.target.value >= checkOut) setCheckOut(""); }}
                        className="w-full text-sm font-medium text-gray-800 outline-none bg-transparent cursor-pointer" />
                    </div>
                  </div>

                  {/* Check-out */}
                  <div className="md:col-span-1 lg:col-span-2">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                      <FaCalendarAlt className="text-blue-600" /> Check-out
                    </label>
                    <div className={`border-2 rounded-xl px-3 py-3 transition-all hover:border-blue-400 focus-within:border-blue-600 ${checkOut ? "border-blue-300" : "border-gray-200"}`}>
                      <input type="date" value={checkOut} min={checkIn || today}
                        onChange={e => setCheckOut(e.target.value)}
                        className="w-full text-sm font-medium text-gray-800 outline-none bg-transparent cursor-pointer" />
                    </div>
                    {nightCount && (
                      <div className="mt-1.5 text-center">
                        <span className="inline-block bg-orange-100 text-orange-600 text-xs font-bold px-3 py-0.5 rounded-full">
                          {nightCount} Night{nightCount > 1 ? "s" : ""}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Guests & Rooms */}
                  <div className="md:col-span-2 lg:col-span-2 relative" ref={guestRef}>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                      <FaUserFriends className="text-blue-600" /> Guests & Rooms
                    </label>
                    <button onClick={() => setShowGuestDropdown(!showGuestDropdown)}
                      className={`w-full flex items-center justify-between border-2 rounded-xl px-3 py-3 transition-all hover:border-blue-400 bg-white text-left
                        ${showGuestDropdown ? "border-blue-600 shadow-sm" : "border-gray-200"}`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <FaUserFriends className="text-blue-500 shrink-0" />
                        <span className="text-sm font-medium text-gray-800 truncate">{guestSummary}</span>
                      </div>
                      <FaChevronDown className={`text-gray-400 text-xs shrink-0 ml-1 transition-transform duration-200 ${showGuestDropdown ? "rotate-180" : ""}`} />
                    </button>

                    {showGuestDropdown && (
                      <div className="absolute top-full right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 w-[420px] p-5">
                        <div className="space-y-3 mb-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-gray-800">Guests & Rooms</h4>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">Rooms</span>
                              <Counter val={rooms} setVal={setRooms} min={1} max={6} />
                            </div>
                          </div>
                          <CountrySelector label="Guest Nationality" value={guestNationality} onChange={setGuestNationality} countries={normalizedCountries} />
                        </div>
                        <div className="space-y-3 max-h-80 overflow-y-auto pr-1 border-t pt-3">
                          {roomConfigs.map((room, idx) => renderRoomConfig(room, idx))}
                        </div>
                        <button onClick={() => setShowGuestDropdown(false)}
                          className="w-full mt-4 bg-blue-700 hover:bg-blue-800 text-white text-sm font-bold py-2.5 rounded-xl transition">
                          Apply
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-5">
                  <button onClick={handleHotelSearch} disabled={isHotelSearching}
                    className="w-full flex items-center justify-center gap-3 text-white font-black text-lg py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95 tracking-widest uppercase disabled:opacity-70 disabled:cursor-not-allowed"
                    style={searchBtnGradient}>
                    {isHotelSearching
                      ? <><svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>Searching...</>
                      : <><FaSearch className="text-base" />Search Hotels</>}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Trust badges */}
        <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: "✈️", title: "500+ Airlines", sub: "Domestic & international" },
            { icon: "🏨", title: "10,000+ Hotels", sub: "Across 500+ cities" },
            { icon: "💰", title: "Negotiated Rates", sub: "Exclusive corporate pricing" },
            { icon: "🔒", title: "Policy Enforced", sub: "Auto-block non-compliant" },
          ].map(({ icon, title, sub }) => (
            <div key={title} className="bg-white rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm border border-gray-100 hover:shadow-md transition">
              <span className="text-2xl">{icon}</span>
              <div>
                <p className="text-sm font-extrabold text-gray-800">{title}</p>
                <p className="text-xs text-gray-400">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          FEATURES SECTION
      ══════════════════════════════════════════ */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <span className="inline-block bg-blue-50 text-blue-700 text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full border border-blue-100 mb-4">
            Platform Features
          </span>
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight mb-3">
            Built for Corporate Travel at Scale
          </h2>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto font-medium">
            Everything your finance, operations, and HR teams need — in one unified platform.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: <FaShieldAlt className="text-blue-600 text-xl" />, title: "Policy Enforcement", desc: "Automatically enforce your company travel policy. Out-of-policy bookings are flagged or blocked in real time.", tag: "Compliance", tagBg: "bg-blue-50 text-blue-700" },
            { icon: <FaChartLine className="text-emerald-600 text-xl" />, title: "Spend Visibility", desc: "Real-time dashboards, department-level reports, and full audit trails. Know exactly where your travel budget goes.", tag: "Analytics", tagBg: "bg-emerald-50 text-emerald-700" },
            { icon: <FaBriefcase className="text-violet-600 text-xl" />, title: "Centralized Billing", desc: "One invoice. No expense reimbursements. Consolidate all bookings under a single corporate account.", tag: "Finance", tagBg: "bg-violet-50 text-violet-700" },
            { icon: <FaUserFriends className="text-orange-600 text-xl" />, title: "Multi-Traveler Booking", desc: "Book for colleagues, entire teams, or executive delegations. Manage profiles, preferences, and approvals centrally.", tag: "Teams", tagBg: "bg-orange-50 text-orange-700" },
            { icon: <FaHeadset className="text-cyan-600 text-xl" />, title: "24/7 Support Desk", desc: "Dedicated corporate travel agents available around the clock for changes, cancellations, and emergencies.", tag: "Support", tagBg: "bg-cyan-50 text-cyan-700" },
            { icon: <FaCheckCircle className="text-rose-600 text-xl" />, title: "Approval Workflows", desc: "Configure multi-level approval chains. Managers get notified instantly and can approve with a single click.", tag: "Workflow", tagBg: "bg-rose-50 text-rose-700" },
          ].map(({ icon, title, desc, tag, tagBg }) => (
            <div key={title} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">{icon}</div>
                <span className={`text-xs font-black px-3 py-1 rounded-full ${tagBg}`}>{tag}</span>
              </div>
              <h3 className="text-base font-extrabold text-gray-900 mb-2">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed font-medium">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════
          INDUSTRY SECTION
      ══════════════════════════════════════════ */}
      <section className="bg-white py-16 border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <span className="inline-block bg-slate-100 text-slate-600 text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full border border-slate-200 mb-4">
              Industry Solutions
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight mb-3">Tailored for Your Industry</h2>
            <p className="text-gray-500 text-lg font-medium max-w-xl mx-auto">Every sector has unique travel needs. We've got you covered.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            {COMPANY_TYPES.map(ct => (
              <button key={ct.id} onClick={() => setSelectedCompany(ct.id)}
                className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all duration-200 text-center
                  ${selectedCompany === ct.id ? "border-blue-600 bg-blue-50 shadow-md" : "border-gray-100 bg-white hover:border-blue-200 hover:bg-blue-50/40"}`}>
                <span className="text-3xl">{ct.icon}</span>
                <span className={`text-xs font-black ${selectedCompany === ct.id ? "text-blue-700" : "text-gray-600"}`}>{ct.label}</span>
              </button>
            ))}
          </div>
          <div className="bg-gradient-to-r from-blue-50 to-slate-50 rounded-2xl p-8 border border-blue-100">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <span className="text-5xl">{activeCompany.icon}</span>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-blue-600 mb-1">{activeCompany.label}</p>
                  <h3 className="text-xl font-black text-gray-900">{activeCompany.headline}</h3>
                  <p className="text-sm text-gray-500 font-medium mt-1">{activeCompany.sub}</p>
                </div>
              </div>
              <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="flex items-center gap-2 px-7 py-3 bg-blue-700 text-white font-extrabold rounded-xl hover:bg-blue-800 transition shrink-0 text-sm">
                Book Now <FaArrowRight className="text-xs" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          STATS BAND
      ══════════════════════════════════════════ */}
      <section style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 60%, #1d4ed8 100%)" }} className="py-14">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { stat: "2,500+", label: "Corporate Clients" },
              { stat: "1.2M+", label: "Bookings Processed" },
              { stat: "98.4%", label: "On-Time Support" },
              { stat: "₹340Cr+", label: "Travel Spend Managed" },
            ].map(({ stat, label }) => (
              <div key={label}>
                <p className="text-4xl font-black text-white mb-1">{stat}</p>
                <p className="text-blue-300 text-xs font-black uppercase tracking-widest">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          TESTIMONIALS
      ══════════════════════════════════════════ */}
      <section className="bg-white py-16 border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-gray-900 mb-3">Trusted by Corporate Teams</h2>
            <p className="text-gray-500 text-lg font-medium">What our clients say about managing travel with us.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { quote: "Approvals that used to take a day now happen in minutes. The policy enforcement alone saved us 18% on travel spend.", name: "Priya Sharma", role: "Head of Operations", company: "FinTech Corp" },
              { quote: "Our consultants are on the road constantly. This platform handles everything — booking, changes, billing — without a single phone call.", name: "Rajiv Mehta", role: "Travel Manager", company: "Global Consulting Ltd" },
              { quote: "We have offices in 12 cities. Centralized billing and reporting has completely transformed how we handle travel at scale.", name: "Anita Desai", role: "CFO", company: "Manufacturing Group" },
            ].map(({ quote, name, role, company }) => (
              <div key={name} className="bg-slate-50 rounded-2xl p-6 border border-gray-100">
                <div className="flex gap-0.5 mb-4">
                  {[...Array(5)].map((_, i) => <FaStar key={i} className="text-amber-400 text-sm" />)}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed mb-5 font-medium italic">"{quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-black text-sm shrink-0">
                    {name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-gray-900">{name}</p>
                    <p className="text-xs text-gray-400 font-medium">{role} · {company}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          FOOTER CTA
      ══════════════════════════════════════════ */}
      <section className="py-14" style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)" }}>
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-black text-white mb-3 tracking-tight">
            Ready to Modernize Corporate Travel?
          </h2>
          <p className="text-blue-200 text-lg mb-8 font-medium">
            Join 2,500+ companies managing smarter, faster, and more cost-effective travel.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button onClick={() => { window.scrollTo({ top: 0, behavior: "smooth" }); setActiveTab("flight"); }}
              className="flex items-center gap-2 px-8 py-3.5 bg-white text-blue-900 font-extrabold rounded-xl hover:bg-blue-50 transition text-sm shadow-lg">
              <FaPlane /> Search Flights
            </button>
            <button onClick={() => { window.scrollTo({ top: 0, behavior: "smooth" }); setActiveTab("hotel"); }}
              className="flex items-center gap-2 px-8 py-3.5 bg-blue-600/40 text-white font-extrabold border border-blue-400/40 rounded-xl hover:bg-blue-600/60 transition text-sm">
              <FaHotel /> Search Hotels
            </button>
          </div>
        </div>
      </section>

      {/* Travelers Modal */}
      {isModalOpen && (
        <TravelersClassModal onClose={closeDropdown} onApply={handleApply}
          modalPosition={modalPosition} initialData={{ passengers, travelClass, directOnly }} />
      )}
    </div>
  );
}