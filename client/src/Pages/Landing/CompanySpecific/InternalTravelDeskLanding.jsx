// InternalTravelDeskLanding.jsx — Company-Specific Internal Portal
// Full flight + hotel search logic ported from FlightSearch.jsx & HotelSearch.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  FaExchangeAlt,
  FaCalendarAlt,
  FaPlaneDeparture,
  FaPlaneArrival,
  FaUser,
  FaSearch,
  FaHotel,
  FaPlane,
  FaMapMarkerAlt,
  FaChevronDown,
  FaUserFriends,
  FaMinus,
  FaPlus,
  FaGlobe,
  FaBed,
  FaHistory,
} from "react-icons/fa";
import { BsCalendar4, BsBell } from "react-icons/bs";
import CustomCalendar from "../../../components/CustomCalendar";
import { MdArrowForward, MdAltRoute } from "react-icons/md";
import {
  RiFlightTakeoffLine,
  RiHotelLine,
  RiShieldCheckLine,
  RiTimeLine,
  RiFileTextLine,
  RiPhoneLine,
  RiMailLine,
  RiArrowRightLine,
  RiAlertLine,
  RiMenuLine,
  RiBriefcaseLine,
  RiBarChartLine,
  RiUserLine,
  RiCheckLine,
} from "react-icons/ri";
import { LuPlane } from "react-icons/lu";
import {
  useNavigate,
  useSearchParams,
  useParams,
  useLocation,
} from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import LandingFooter from "../../../layout/LandingFooter";
import { logoutUser } from "../../../Redux/Slice/authSlice";
import LandingHeader from "../../../layout/LandingHeader";
import { airportDatabase } from "../../../data/airportDatabase";
import { useFlightSearch } from "../../../context/FlightSearchContext";
import { searchFlights } from "../../../Redux/Actions/flight.thunks";
import { searchFlightsMC } from "../../../Redux/Actions/flight.thunks.MC";
import {
  getPublicBrandingBySlug,
  getPublicBrandingById,
} from "../../../Redux/Actions/landingPageThunks";
import { ToastWithTimer } from "../../../utils/ToastConfirm";
import {
  fetchCities,
  fetchCountries,
  searchHotels,
} from "../../../Redux/Actions/hotelThunks";
import { CountrySelector } from "../../../components/hotel-search/HotelSearchSubComponents";
import HotelGuestSelection from "../../../components/hotel-search/HotelGuestSelection";
import TravelersClassModal from "../../../components/FlightSearchComponents/TravelersClassModal";

// ─── Brand Colors ──────────────────────────────────────────────────────────────
const C = {
  black: "#000000",
  navy: "#000D26",
  navyDeep: "#04112F",
  navyMid: "#0A243D",
  nearBlack: "#0C0C0C",
  navyDark: "#102238",
  muted: "#65758B",
  gold: "#C9A240",
  border: "#E1E7EF",
  lightGray: "#F5F5F5",
  offWhite: "#F8FAFC",
  white: "#FFFFFF",
};
const GOLD = "#C9A240";
const GOLD_10 = "rgba(201,162,64,0.10)";
const GOLD_20 = "rgba(201,162,64,0.20)";
const GOLD_30 = "rgba(201,162,64,0.30)";
const WHITE_5 = "rgba(255,255,255,0.05)";
const WHITE_10 = "rgba(255,255,255,0.10)";
const WHITE_20 = "rgba(255,255,255,0.20)";
const WHITE_40 = "rgba(255,255,255,0.40)";
const WHITE_60 = "rgba(255,255,255,0.60)";
const HERO_TOP = "#000D26"; // dark navy — top half
const HERO_SPLIT = "#F8FAFC"; // off-white — bottom half (where card sits)
const CARD_BORDER = "rgba(255,255,255,0.10)";
const FIELD_BG = "#FFFFFF";
const FIELD_BORDER = "#E1E7EF";
const FIELD_FOCUS = "#C9A240";
const FIELD_TEXT = "#000D26";
const FIELD_MUTED = "#65758B";
const CABIN_CLASS_MAP = {
  Economy: "economy",
  Business: "business",
  "First Class": "first_class",
  "Premium Economy": "premium_economy",
  "Premium Business": "premium_business",
};

// ─── Field Date Component ──────────────────────────────────────────────────────
const LandingDateField = ({
  value,
  valueEnd,
  range = false,
  min,
  onChange,
  onChangeEnd,
  placeholder = "Select Date",
  displayValue,
  isOpen: controlledOpen,
  onToggle,
  focus = "start",
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = onToggle || setInternalOpen;

  const containerRef = useRef(null);
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        if (controlledOpen !== undefined) {
          if (isOpen) onToggle(false);
        } else {
          setInternalOpen(false);
        }
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, controlledOpen, onToggle]);

  const fmt = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "2-digit",
    });
  };

  const handleCalendarChange = (val) => {
    if (!range) {
      onChange(val);
      setIsOpen(false);
    } else {
      if (typeof val === "string") {
        onChange(val);
      } else {
        if (val.start !== undefined) onChange(val.start);
        if (val.end !== undefined) {
          onChangeEnd(val.end);
          if (val.end) {
            setIsOpen(false);
          }
        }
      }
    }
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <div
        className="flex items-center gap-2 rounded-xl px-3 py-3 transition-all border-2 cursor-pointer"
        style={{
          background: FIELD_BG,
          borderColor: isOpen ? FIELD_FOCUS : FIELD_BORDER,
          boxShadow: isOpen ? `0 0 0 3px ${GOLD_10}` : "none",
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <BsCalendar4 style={{ color: GOLD, fontSize: 13 }} />
        <span
          className="text-sm font-medium"
          style={{
            color: (displayValue !== undefined ? displayValue : value)
              ? FIELD_TEXT
              : FIELD_MUTED,
          }}
        >
          {fmt(displayValue !== undefined ? displayValue : value) ||
            placeholder}
        </span>
      </div>
      {isOpen && (
        <div className="absolute top-full right-0 z-[1000] mt-2 shadow-2xl rounded-xl overflow-hidden">
          <CustomCalendar
            range={range}
            value={range ? { start: value, end: valueEnd } : value}
            minDate={min}
            onChange={handleCalendarChange}
            onClose={() => setIsOpen(false)}
            focus={focus}
          />
        </div>
      )}
    </div>
  );
};

// ─── Shared Atoms ──────────────────────────────────────────────────────────────
const GoldLabel = ({ children }) => (
  <div
    className="inline-block w-full md:w-[380px] mb-3 px-2 py-0.5"
    style={{ background: GOLD }}
  >
    <span
      className="text-[11px] font-bold uppercase tracking-[0.18em]"
      style={{ color: C.black, fontFamily: "'Plus Jakarta Sans',sans-serif" }}
    >
      {children}
    </span>
  </div>
);

const SectionHeading = ({ label, title, sub, dark = false }) => (
  <div className="mb-14">
    <GoldLabel>{label}</GoldLabel>
    <h2
      className="text-[2.4rem] font-normal leading-tight mb-4"
      style={{
        fontFamily: "'DM Serif Display',serif",
        color: dark ? C.white : C.navy,
      }}
    >
      {title}
    </h2>
    {sub && (
      <p
        className="text-base max-w-xl"
        style={{
          color: dark ? WHITE_60 : C.muted,
          fontFamily: "'Plus Jakarta Sans',sans-serif",
        }}
      >
        {sub}
      </p>
    )}
  </div>
);

// ─── Field label wrapper ───────────────────────────────────────────────────────
const FieldBox = ({ label, icon, children, className = "" }) => (
  <div className={className}>
    <label
      className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest mb-1.5"
      style={{
        color: FIELD_MUTED,
        fontFamily: "'Plus Jakarta Sans',sans-serif",
      }}
    >
      <span style={{ color: GOLD }}>{icon}</span>
      {label}
    </label>
    {children}
  </div>
);

// ─── Airport Autocomplete ──────────────────────────────────────────────────────
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
    const handler = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        inputRef.current &&
        !inputRef.current.contains(e.target)
      )
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
      setSuggestions(
        airportDatabase
          .filter(
            (a) =>
              a.city.toLowerCase().includes(s) ||
              a.iata_code.toLowerCase().includes(s) ||
              a.country.toLowerCase().includes(s) ||
              a.name.toLowerCase().includes(s),
          )
          .slice(0, 10),
      );
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelect = (airport) => {
    setQuery(`${airport.city} (${airport.iata_code})`);
    onChange({ code: airport.iata_code, city: airport.city, ...airport });
    setShowSuggestions(false);
  };

  return (
    <div className="relative">
      <div
        className="flex items-center gap-2 rounded-xl px-3 py-3 transition-all border-2 cursor-text"
        style={{
          background: FIELD_BG,
          borderColor: showSuggestions
            ? FIELD_FOCUS
            : error
              ? "#f87171"
              : FIELD_BORDER,
          boxShadow: showSuggestions ? `0 0 0 3px ${GOLD_10}` : "none",
        }}
      >
        <FaMapMarkerAlt style={{ color: GOLD, flexShrink: 0, fontSize: 12 }} />
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => query.length > 1 && setShowSuggestions(true)}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full text-sm font-medium outline-none bg-transparent"
          style={{
            color: FIELD_TEXT,
            fontFamily: "'Plus Jakarta Sans',sans-serif",
          }}
        />
      </div>
      {error && (
        <p className="text-xs mt-1" style={{ color: "#dc2626" }}>
          {error}
        </p>
      )}

      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 rounded-xl shadow-2xl max-h-60 overflow-y-auto bg-white border"
          style={{ borderColor: FIELD_BORDER }}
        >
          <div
            className="px-3 py-2 sticky top-0 border-b bg-gray-50"
            style={{ borderColor: FIELD_BORDER }}
          >
            <p
              className="text-[10px] font-bold uppercase tracking-wider"
              style={{
                color: FIELD_MUTED,
                fontFamily: "'Plus Jakarta Sans',sans-serif",
              }}
            >
              Airports
            </p>
          </div>
          {suggestions.map((airport, i) => (
            <div
              key={`${airport.iata_code}-${i}`}
              onClick={() => handleSelect(airport)}
              className="flex items-center justify-between px-4 py-3 cursor-pointer border-b transition-colors hover:bg-amber-50"
              style={{ borderColor: FIELD_BORDER }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: GOLD_10 }}
                >
                  <FaPlane style={{ color: GOLD, fontSize: 11 }} />
                </div>
                <div>
                  <p
                    className="text-sm font-semibold"
                    style={{
                      color: C.navy,
                      fontFamily: "'Plus Jakarta Sans',sans-serif",
                    }}
                  >
                    {airport.city}, {airport.country}
                  </p>
                  <p
                    className="text-xs"
                    style={{
                      color: FIELD_MUTED,
                      fontFamily: "'Plus Jakarta Sans',sans-serif",
                    }}
                  >
                    {airport.name}
                  </p>
                </div>
              </div>
              <span
                className="ml-2 text-xs font-bold px-2 py-0.5 rounded-lg"
                style={{
                  background: GOLD_10,
                  color: GOLD,
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  border: `1px solid ${GOLD_20}`,
                }}
              >
                {airport.iata_code}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── HERO + FULL SEARCH MODULE ─────────────────────────────────────────────────
const HeroWithSearch = ({
  branding,
  navigate,
  dispatch,
  activeTab,
  setActiveTab,
}) => {
  const { companySlug } = useParams();
  const location = useLocation();
  const { publicBranding } = useSelector((s) => s.landingPage);


  const [flightLoading, setFlightLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [tripType, setTripType] = useState("one-way");
  const [returnDate, setReturnDate] = useState("");
  const today = new Date().toISOString().split("T")[0];
  const [multiCityFlights, setMultiCityFlights] = useState([
    { from: "", to: "", date: "" },
  ]);
  const [fromAirport, setFromAirport] = useState({
    code: "DEL",
    city: "New Delhi",
  });
  const [toAirport, setToAirport] = useState({ code: "BOM", city: "Mumbai" });
  const [departureDate, setDepartureDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  });

  const {
    displayText,
    isModalOpen,
    modalPosition,
    handleApply,
    passengers,
    travelClass,
    openDropdown,
    closeDropdown,
  } = useFlightSearch();
  const {
    adults = 1,
    children: flightChildren = 0,
    infants = 0,
  } = passengers || {};

  // ─── Dropdown Syncing ───
  const [openCalendarId, setOpenCalendarId] = useState(null);

  const handleCalendarToggle = (id, state) => {
    if (state) {
      setOpenCalendarId(id);
      if (isModalOpen) closeDropdown();
      if (showGuestDropdown) setShowGuestDropdown(false);
    } else {
      if (openCalendarId === id) setOpenCalendarId(null);
    }
  };

  const handleOpenTravellers = (e) => {
    setOpenCalendarId(null);
    if (showGuestDropdown) setShowGuestDropdown(false);
    openDropdown(e);
  };

  const handleOpenHotelGuests = () => {
    setOpenCalendarId(null);
    if (isModalOpen) closeDropdown();
    setShowGuestDropdown(!showGuestDropdown);
  };

  useEffect(() => {
    if (returnDate && departureDate && returnDate < departureDate)
      setReturnDate(departureDate);
  }, [departureDate]);

  const validateSearch = () => {
    const e = {};
    if (!fromAirport?.code) e.from = "Please select origin airport";
    if (!toAirport?.code && tripType !== "multi-city")
      e.to = "Please select destination airport";
    if (tripType !== "multi-city" && !departureDate)
      e.departureDate = "Please select departure date";
    if (tripType === "round-trip") {
      if (!returnDate) e.returnDate = "Please select return date";
      else if (new Date(returnDate) < new Date(departureDate))
        e.returnDate = "Return date cannot be before departure date";
    }
    if (tripType === "multi-city") {
      multiCityFlights.forEach((f, idx) => {
        if (!f.from?.code || !f.to?.code || !f.date)
          e[`multi-${idx}`] = `Flight ${idx + 1}: all fields are required`;
      });
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleFlightSearch = async (ev) => {
    ev?.preventDefault();
    if (!validateSearch()) return;
    const journeyType =
      tripType === "one-way" ? 1 : tripType === "round-trip" ? 2 : 3;
    let payload = {
      journeyType,
      adults,
      children: flightChildren,
      infants,
      cabinClass: CABIN_CLASS_MAP[travelClass] || "economy",
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
        children: flightChildren,
        infants,
        cabinClass: CABIN_CLASS_MAP[travelClass] || "economy",
        segments: multiCityFlights.map((f) => ({
          origin: f.from.code,
          destination: f.to.code,
          departureDate: f.date,
        })),
      };
    }
    try {
      setFlightLoading(true);
      if (journeyType === 3) await dispatch(searchFlightsMC(payload)).unwrap();
      else await dispatch(searchFlights(payload)).unwrap();
      navigate("/search-flight-results", {
        state: {
          searchPayload: payload,
          companySlug: companySlug || publicBranding?.companySlug,
        },
      });
    } catch (err) {
      ToastWithTimer({
        message:
          typeof err === "string"
            ? err
            : "Flight search failed. Please try again.",
        type: "error",
      });
    } finally {
      setFlightLoading(false);
    }
  };

  const swapLocations = () => {
    const t = fromAirport;
    setFromAirport(toAirport);
    setToAirport(t);
  };

  const updateMC = (index, field, value) => {
    setMultiCityFlights((prev) => {
      const u = [...prev];
      u[index] = { ...u[index], [field]: value };
      if (field === "to" && index < u.length - 1 && value?.code)
        u[index + 1].from = value;
      if (field === "date" && index < u.length - 1 && value) {
        const nd = new Date(value);
        nd.setDate(nd.getDate() + 1);
        if (!u[index + 1].date)
          u[index + 1].date = nd.toISOString().split("T")[0];
      }
      return u;
    });
  };
  const addMC = () =>
    setMultiCityFlights((prev) => {
      const last = prev[prev.length - 1];
      return [...prev, { from: last?.to || "", to: "", date: "" }];
    });
  const removeMC = (i) =>
    setMultiCityFlights((prev) => {
      const u = prev.filter((_, idx) => idx !== i);
      for (let j = 0; j < u.length - 1; j++)
        if (u[j].to && !u[j + 1].from) u[j + 1].from = u[j].to;
      return u;
    });

  const getTripIconConfig = () => {
    switch (tripType) {
      case "one-way":
        return { icon: <MdArrowForward size={14} />, action: swapLocations };
      case "round-trip":
        return { icon: <FaExchangeAlt size={14} />, action: swapLocations };
      case "multi-city":
        return { icon: <MdAltRoute size={14} />, action: addMC };
      default:
        return null;
    }
  };

  const [hotelLoading, setHotelLoading] = useState(false);
  const [country, setCountry] = useState("IN");
  const [guestNationality, setGuestNationality] = useState("IN");
  const [city, setCity] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [rooms, setRooms] = useState(1);
  const [roomConfigs, setRoomConfigs] = useState([
    { adults: 1, children: 0, childrenAges: [] },
  ]);
  const [showGuestDropdown, setShowGuestDropdown] = useState(false);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [filteredCities, setFilteredCities] = useState([]);
  const [selectedCityCode, setSelectedCityCode] = useState(null);
  const [noResults, setNoResults] = useState(false);

  const guestRef = useRef(null);
  const cityRef = useRef(null);

  const { countries, citiesByCountry } = useSelector((s) => s.hotel);
  const currentCities = citiesByCountry?.[country] || [];

  const getFlagEmoji = (code) => {
    if (!code) return "";
    return code
      .toUpperCase()
      .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt()));
  };

  const countryArray =
    countries?.data?.CountryList || countries?.data || countries || [];
  const normalizedCountries = Array.isArray(countryArray)
    ? countryArray.map((c) => {
        const code = c.Code || c.code;
        return { code, name: c.Name || c.name, flag: getFlagEmoji(code) };
      })
    : [];

  const handleCountryChange = (code) => {
    setOpenCalendarId(null);
    if (isModalOpen) closeDropdown();
    if (showGuestDropdown) setShowGuestDropdown(false);
    setCountry(code);
    setCity("");
    setSelectedCityCode(null);
    setFilteredCities([]);
  };

  useEffect(() => {
    if (activeTab === "hotel") {
      dispatch(fetchCountries());
    }
  }, [activeTab, dispatch]);

  useEffect(() => {
    if (activeTab === "hotel" && country) {
      dispatch(fetchCities(country));
    }
  }, [activeTab, country, dispatch]);

  useEffect(() => {
    const handler = (e) => {
      if (guestRef.current && !guestRef.current.contains(e.target))
        setShowGuestDropdown(false);
      if (cityRef.current && !cityRef.current.contains(e.target))
        setShowCitySuggestions(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleCityChange = (val) => {
    setCity(val);
    if (!val.trim()) {
      setFilteredCities([]);
      setShowCitySuggestions(true);
      return;
    }

    const filtered = currentCities.filter((c) => {
      const name = (c.cityName || c.CityName || c.Name || "").toLowerCase();
      return name.includes(val.toLowerCase());
    });

    setFilteredCities(filtered);
    setShowCitySuggestions(true);
  };

  const handleCitySelect = (cityObj) => {
    const name = cityObj.cityName || cityObj.CityName || cityObj.Name || "";
    const code = cityObj.cityCode || cityObj.CityCode || cityObj.Code || "";
    setCity(name);
    setSelectedCityCode(code);
    setFilteredCities([]);
    setShowCitySuggestions(false);
  };

  useEffect(() => {
    setRoomConfigs((prev) => {
      const n = [...prev];
      if (rooms > n.length)
        for (let i = n.length; i < rooms; i++)
          n.push({ adults: 1, children: 0, childrenAges: [] });
      else if (rooms < n.length) n.length = rooms;
      return n;
    });
  }, [rooms]);

  const handleHotelSearch = async () => {
    if (!selectedCityCode || !checkIn || !checkOut) {
      alert("Please select a valid city and fill all required fields");
      return;
    }
    setHotelLoading(true);
    setNoResults(false);
    const payload = {
      CheckIn: checkIn,
      CheckOut: checkOut,
      CityCode: selectedCityCode,
      CityName: city,
      GuestNationality: guestNationality,
      ResponseTime: 23,
      NoOfRooms: rooms,
      PaxRooms: roomConfigs.map((r) => ({
        Adults: r.adults,
        Children: r.children,
        ChildrenAges: (r.childrenAges || []).slice(0, r.children),
      })),
      IsDetailedResponse: true,
      Filters: { Refundable: true, MealType: "All" },
    };
    try {
      const result = await dispatch(
        searchHotels({ payload, page: 1, limit: 10 }),
      ).unwrap();
      if (result?.hotels?.length > 0) {
        navigate("/search-hotel-results", {
          state: {
            companySlug: companySlug || publicBranding?.companySlug,
          },
        });
      } else setNoResults(true);
    } catch (err) {
      console.error("Hotel search failed:", err);
    } finally {
      setHotelLoading(false);
    }
  };

  const totalGuests = roomConfigs.reduce(
    (s, r) => s + r.adults + r.children,
    0,
  );
  const guestSummary = `${totalGuests} Guest${totalGuests !== 1 ? "s" : ""}, ${rooms} Room${rooms > 1 ? "s" : ""}`;
  const nightCount =
    checkIn && checkOut
      ? Math.max(
          1,
          Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000),
        )
      : null;
  const selectedCountry = normalizedCountries.find((c) => c.code === country);

  const fieldBorder = (active) => ({
    background: FIELD_BG,
    borderColor: active ? FIELD_FOCUS : FIELD_BORDER,
    borderWidth: 2,
    borderStyle: "solid",
    borderRadius: "0.75rem",
    boxShadow: active ? `0 0 0 3px ${GOLD_10}` : "none",
  });
  const fieldInputStyle = {
    color: FIELD_TEXT,
    fontFamily: "'Plus Jakarta Sans',sans-serif",
  };

  const SearchBtn = ({ loading, label, onClick, type = "button" }) => (
    <button
      type={type}
      onClick={onClick}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 font-extrabold text-base py-4 rounded-xl transition-all active:scale-95 tracking-wide uppercase mt-2"
      style={{
        background: loading ? GOLD_20 : C.navy,
        color: loading ? C.navy : C.white,
        fontFamily: "'Plus Jakarta Sans',sans-serif",
        boxShadow: `0 6px 20px -4px rgba(0,13,38,0.3)`,
        letterSpacing: "0.06em",
      }}
    >
      {loading ? (
        <>
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
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
          Searching…
        </>
      ) : (
        <>
          <FaSearch className="text-sm" /> {label}
        </>
      )}
    </button>
  );

  return (
    <section className="relative">
      <div className="absolute inset-0 pointer-events-none flex flex-col">
        <div
          className="flex-none"
          style={{ height: "52%", background: HERO_TOP }}
        />
        <div className="flex-1" style={{ background: HERO_SPLIT }} />
      </div>
      <div
        className="absolute left-0 right-0 pointer-events-none"
        style={{
          top: "calc(52% - 60px)",
          height: 120,
          background: `linear-gradient(to bottom right, ${HERO_TOP} 50%, ${HERO_SPLIT} 50%)`,
        }}
      />
      <div
        className="absolute left-0 right-0 pointer-events-none"
        style={{ top: "52%", height: 3, background: GOLD, opacity: 0.35 }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-10 pt-16 pb-20">
        <div className="text-center mb-10">
          <div
            className="inline-flex items-center gap-2 mb-5 px-4 py-1.5 rounded-full"
            style={{ background: GOLD_10, border: `1px solid ${GOLD_30}` }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: GOLD }}
            />
            <span
              className="text-[11px] font-bold uppercase tracking-[0.18em]"
              style={{
                color: GOLD,
                fontFamily: "'Plus Jakarta Sans',sans-serif",
              }}
            >
              {branding?.corporateName
                ? `${branding.corporateName} Travel Portal`
                : "Internal Booking Portal"}
            </span>
          </div>
          <h1
            className="font-normal leading-[1.08] mb-4"
            style={{
              fontFamily: "'DM Serif Display',serif",
              fontSize: "clamp(2.2rem,4.5vw,3.8rem)",
              color: C.white,
            }}
          >
            {branding?.branding?.landingPageTitle || (
              <>
                Smart Travel,{" "}
                <em style={{ color: GOLD, fontStyle: "italic" }}>
                  Zero Friction.
                </em>
              </>
            )}
          </h1>
          <p
            className="text-[15px] leading-7 max-w-lg mx-auto"
            style={{
              color: "rgba(255,255,255,0.55)",
              fontFamily: "'Plus Jakarta Sans',sans-serif",
            }}
          >
            {branding?.branding?.welcomeMessage ||
              "Book flights and hotels, stay within policy, and get instant approvals — all in one internal desk."}
          </p>
        </div>

        <div className="flex justify-center mb-2 relative z-30">
          <div className="flex p-1.5 rounded-2xl border border-white/20 shadow-2xl">
            {[
              { key: "flight", label: "Flights", Icon: FaPlane },
              { key: "hotel", label: "Hotels", Icon: FaHotel },
            ].map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className="flex items-center gap-2.5 px-8 py-3.5 text-sm font-bold transition-all rounded-xl"
                style={{
                  color: activeTab === key ? C.navy : C.white,
                  background: activeTab === key ? GOLD : "transparent",
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  boxShadow:
                    activeTab === key ? `0 8px 20px -4px ${GOLD_30}` : "none",
                }}
              >
                <Icon
                  size={16}
                  style={{ color: activeTab === key ? C.navyDeep : WHITE_60 }}
                />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div
          className="rounded-3xl relative z-20"
          style={{
            background: C.white,
            boxShadow:
              "0 32px 80px -12px rgba(0,13,38,0.22), 0 8px 24px -4px rgba(0,13,38,0.1)",
            border: `1px solid ${FIELD_BORDER}`,
            marginTop: "-1px",
          }}
        >
          <div className="p-6 md:p-8">
            {activeTab === "flight" && (
              <>
                <div className="flex flex-wrap gap-2 mb-6">
                  {[
                    { key: "one-way", label: "One Way" },
                    { key: "round-trip", label: "Round Trip" },
                    // { key: "multi-city", label: "Multi City" },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setTripType(key)}
                      className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold transition-all border"
                      style={{
                        background: tripType === key ? C.navy : C.white,
                        color: tripType === key ? C.white : FIELD_MUTED,
                        borderColor: tripType === key ? C.navy : FIELD_BORDER,
                        fontFamily: "'Plus Jakarta Sans',sans-serif",
                      }}
                    >
                      {tripType === key && (
                        <span style={{ color: GOLD }}>
                          {getTripIconConfig()?.icon}
                        </span>
                      )}
                      {label}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleFlightSearch} className="flex flex-col">
                  {tripType === "multi-city" ? (
                    <div className="space-y-3 mb-5">
                      {multiCityFlights.map((flight, index) => (
                        <div
                          key={index}
                          className="p-4 rounded-xl"
                          style={{
                            border: `1.5px solid ${FIELD_BORDER}`,
                            background: C.offWhite,
                          }}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center"
                                style={{ background: GOLD, color: C.navy }}
                              >
                                {index + 1}
                              </div>
                              <span
                                className="text-sm font-semibold"
                                style={{
                                  color: C.navy,
                                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                                }}
                              >
                                Flight {index + 1}
                              </span>
                            </div>
                            {multiCityFlights.length > 2 && (
                              <button
                                type="button"
                                onClick={() => removeMC(index)}
                                className="text-xs font-semibold px-2.5 py-1 rounded-full transition"
                                style={{
                                  color: "#dc2626",
                                  border: "1px solid rgba(220,38,38,0.25)",
                                  background: "#fef2f2",
                                }}
                              >
                                Remove
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <FieldBox label="From" icon={<FaPlaneDeparture />}>
                              <AirportSearchInput
                                value={
                                  flight.from
                                    ? `${flight.from.city} (${flight.from.code})`
                                    : ""
                                }
                                onChange={(a) => updateMC(index, "from", a)}
                                placeholder="City or airport"
                                id={`mc-from-${index}`}
                                error={errors[`multi-${index}`]}
                              />
                            </FieldBox>
                            <FieldBox label="To" icon={<FaPlaneArrival />}>
                              <AirportSearchInput
                                value={
                                  flight.to
                                    ? `${flight.to.city} (${flight.to.code})`
                                    : ""
                                }
                                onChange={(a) => updateMC(index, "to", a)}
                                placeholder="City or airport"
                                id={`mc-to-${index}`}
                              />
                            </FieldBox>
                            <FieldBox label="Date" icon={<FaCalendarAlt />}>
                              <LandingDateField
                                value={flight.date}
                                min={
                                  index > 0
                                    ? multiCityFlights[index - 1].date
                                    : today
                                }
                                onChange={(val) => updateMC(index, "date", val)}
                                isOpen={openCalendarId === `mc-${index}`}
                                onToggle={(st) =>
                                  handleCalendarToggle(`mc-${index}`, st)
                                }
                              />
                            </FieldBox>
                            {index === 0 && (
                              <FieldBox
                                label="Travelers & Class"
                                icon={<FaUser />}
                              >
                                <button
                                  type="button"
                                  onClick={handleOpenTravellers}
                                  className="w-full flex items-center justify-between rounded-xl px-3 py-3 transition-all text-left"
                                  style={fieldBorder(false)}
                                >
                                  <span
                                    className="text-sm font-medium truncate"
                                    style={fieldInputStyle}
                                  >
                                    {displayText}
                                  </span>
                                  <FaChevronDown
                                    style={{
                                      color: FIELD_MUTED,
                                      fontSize: 11,
                                      flexShrink: 0,
                                    }}
                                  />
                                </button>
                                {isModalOpen && (
                                  <div className="absolute top-full right-0 z-[1000] mt-1 shadow-2xl animate-fade-in block">
                                    <TravelersClassModal
                                      className="w-full"
                                      onClose={closeDropdown}
                                      onApply={handleApply}
                                      initialData={{ passengers, travelClass }}
                                    />
                                  </div>
                                )}
                              </FieldBox>
                            )}
                          </div>
                        </div>
                      ))}
                      {multiCityFlights.length < 5 && (
                        <button
                          type="button"
                          onClick={addMC}
                          className="w-full py-3 rounded-xl text-sm font-semibold transition"
                          style={{
                            border: `2px dashed ${GOLD_30}`,
                            color: GOLD,
                            background: GOLD_10,
                            fontFamily: "'Plus Jakarta Sans',sans-serif",
                          }}
                        >
                          + Add Another Flight
                        </button>
                      )}
                    </div>
                  ) : (
                    <div
                      className={`grid grid-cols-1 gap-3 mb-5 ${tripType === "round-trip" ? "md:grid-cols-5" : "md:grid-cols-4"}`}
                    >
                      <FieldBox label="From" icon={<FaPlaneDeparture />}>
                        <AirportSearchInput
                          value={
                            fromAirport
                              ? `${fromAirport.city} (${fromAirport.code})`
                              : ""
                          }
                          onChange={setFromAirport}
                          placeholder="City or airport"
                          id="from-airport"
                          error={errors.from}
                        />
                      </FieldBox>

                      {/* Swap + To */}
                      <div className="relative px-3 -pt-0.5">
                        <div className="hidden md:flex absolute -left-5 top-8 z-10">
                          <button
                            type="button"
                            onClick={swapLocations}
                            className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                            style={{
                              background: GOLD,
                              color: C.navy,
                              boxShadow: `0 4px 14px ${GOLD_30}`,
                            }}
                          >
                            <FaExchangeAlt size={13} />
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
                            placeholder="City or airport"
                            id="to-airport"
                            error={errors.to}
                          />
                        </FieldBox>
                      </div>
                      <FieldBox label="Departure" icon={<FaCalendarAlt />}>
                        <LandingDateField
                          value={departureDate}
                          valueEnd={
                            tripType === "round-trip" ? returnDate : null
                          }
                          range={tripType === "round-trip"}
                          min={today}
                          onChange={setDepartureDate}
                          onChangeEnd={setReturnDate}
                          isOpen={openCalendarId === "departure"}
                          onToggle={(st) => handleCalendarToggle("departure", st)}
                        />
                      </FieldBox>
                      {tripType === "round-trip" && (
                        <FieldBox label="Return" icon={<FaExchangeAlt />}>
                          <LandingDateField
                            value={departureDate}
                            valueEnd={returnDate}
                            range={true}
                            min={today}
                            onChange={setDepartureDate}
                            onChangeEnd={setReturnDate}
                            placeholder="Select Return"
                            displayValue={returnDate}
                            isOpen={openCalendarId === "return"}
                            onToggle={(st) => handleCalendarToggle("return", st)}
                            focus="end"
                          />
                        </FieldBox>
                      )}
                      <FieldBox label="Travelers & Class" icon={<FaUser />}>
                        <div className="relative">
                          <button
                            type="button"
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenTravellers(e);
                            }}
                            className="w-full flex items-center justify-between rounded-xl px-3 py-3 transition-all text-left"
                            style={fieldBorder(isModalOpen)}
                          >
                            <span
                              className="text-sm font-medium truncate"
                              style={fieldInputStyle}
                            >
                              {displayText}
                            </span>
                            <FaChevronDown
                              style={{
                                color: FIELD_MUTED,
                                fontSize: 11,
                                flexShrink: 0,
                                transform: isModalOpen
                                  ? "rotate(180deg)"
                                  : "none",
                                transition: "transform 0.2s",
                              }}
                            />
                          </button>
                          {isModalOpen && (
                            <div className="absolute top-full right-0 z-[1000] mt-1 shadow-2xl animate-fade-in block">
                              <TravelersClassModal
                                className="w-full"
                                onClose={closeDropdown}
                                onApply={handleApply}
                                initialData={{ passengers, travelClass }}
                              />
                            </div>
                          )}
                        </div>
                      </FieldBox>
                    </div>
                  )}
                  <SearchBtn
                    type="submit"
                    loading={flightLoading}
                    label="Search Flights"
                  />
                </form>
              </>
            )}

            {activeTab === "hotel" && (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: GOLD_10 }}
                  >
                    <FaHotel style={{ color: GOLD, fontSize: 16 }} />
                  </div>
                  <div>
                    <p
                      className="text-base font-bold"
                      style={{
                        color: C.navy,
                        fontFamily: "'Plus Jakarta Sans',sans-serif",
                      }}
                    >
                      Search Hotels
                    </p>
                    <p
                      className="text-xs"
                      style={{
                        color: FIELD_MUTED,
                        fontFamily: "'Plus Jakarta Sans',sans-serif",
                      }}
                    >
                      Best corporate rates · Policy compliant hotels
                    </p>
                  </div>
                  {selectedCountry && (
                    <span
                      className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ml-auto"
                      style={{
                        background: GOLD_10,
                        color: GOLD,
                        border: `1px solid ${GOLD_20}`,
                        fontFamily: "'Plus Jakarta Sans',sans-serif",
                      }}
                    >
                      {selectedCountry.flag} {selectedCountry.name}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3 items-start mb-5">
                  <div className="md:col-span-1 lg:col-span-2">
                    <CountrySelector
                      value={country}
                      onChange={handleCountryChange}
                      countries={normalizedCountries}
                    />
                  </div>
                  <div
                    className="md:col-span-1 lg:col-span-4 relative"
                    ref={cityRef}
                  >
                    <label
                      className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest mb-1.5"
                      style={{
                        color: FIELD_MUTED,
                        fontFamily: "'Plus Jakarta Sans',sans-serif",
                      }}
                    >
                      <FaMapMarkerAlt style={{ color: GOLD, fontSize: 11 }} />{" "}
                      City / Hotel / Area
                    </label>
                    <div
                      className="flex items-center gap-2 rounded-xl px-3 py-3 transition-all cursor-text border-2"
                      style={{
                        background: FIELD_BG,
                        borderColor: showCitySuggestions
                          ? FIELD_FOCUS
                          : FIELD_BORDER,
                        boxShadow: showCitySuggestions
                          ? `0 0 0 3px ${GOLD_10}`
                          : "none",
                      }}
                      onClick={() => {
                        setOpenCalendarId(null);
                        if (isModalOpen) closeDropdown();
                        if (showGuestDropdown) setShowGuestDropdown(false);
                        setShowCitySuggestions(true);
                      }}
                    >
                      <FaMapMarkerAlt
                        style={{ color: GOLD, flexShrink: 0, fontSize: 12 }}
                      />
                      <input
                        value={city}
                        onChange={(e) => handleCityChange(e.target.value)}
                        placeholder={
                          country
                            ? `Search in ${selectedCountry?.name}…`
                            : "Where do you want to stay?"
                        }
                        className="w-full text-sm font-medium outline-none bg-transparent"
                        style={fieldInputStyle}
                      />
                    </div>
                    {showCitySuggestions && (
                      <div
                        className="absolute top-full left-0 right-0 mt-1 rounded-xl shadow-2xl z-50 overflow-hidden max-h-64 overflow-y-auto bg-white border"
                        style={{ borderColor: FIELD_BORDER }}
                      >
                        <div
                          className="px-4 py-2 sticky top-0 flex items-center gap-2 border-b bg-gray-50"
                          style={{ borderColor: FIELD_BORDER }}
                        >
                          {selectedCountry && (
                            <span>{selectedCountry.flag}</span>
                          )}
                          <p
                            className="text-[10px] font-bold uppercase tracking-wider"
                            style={{
                              color: FIELD_MUTED,
                              fontFamily: "'Plus Jakarta Sans',sans-serif",
                            }}
                          >
                            {country
                              ? `Cities in ${selectedCountry?.name}`
                              : "Popular Destinations"}
                          </p>
                        </div>
                        {(() => {
                          const listToRender = city.trim()
                            ? filteredCities
                            : currentCities;
                          return listToRender.map((c, idx) => (
                            <div
                              key={(c.cityName || c.cityCode || idx) + idx}
                              onMouseDown={() => handleCitySelect(c)}
                              className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-amber-50 border-b last:border-0"
                              style={{ borderColor: FIELD_BORDER }}
                            >
                              <div className="flex items-center gap-3">
                                <FaMapMarkerAlt
                                  style={{ color: FIELD_MUTED, fontSize: 12 }}
                                />
                                <p
                                  className="text-sm font-medium"
                                  style={{ color: C.navy }}
                                >
                                  {c.cityName || c.CityName || c.Name}
                                </p>
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    )}
                  </div>
                  <div className="md:col-span-1 lg:col-span-2">
                    <label
                      className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest mb-1.5"
                      style={{
                        color: FIELD_MUTED,
                        fontFamily: "'Plus Jakarta Sans',sans-serif",
                      }}
                    >
                      <FaCalendarAlt style={{ color: GOLD, fontSize: 11 }} />{" "}
                      Check-in
                    </label>
                    <LandingDateField
                      value={checkIn}
                      valueEnd={checkOut}
                      range={true}
                      min={today}
                      onChange={setCheckIn}
                      onChangeEnd={setCheckOut}
                      placeholder="Check-in"
                      isOpen={openCalendarId === "hotel-checkin"}
                      onToggle={(st) => handleCalendarToggle("hotel-checkin", st)}
                    />
                  </div>

                  {/* Check-out */}
                  <div className="md:col-span-1 lg:col-span-2">
                    <label
                      className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest mb-1.5"
                      style={{
                        color: FIELD_MUTED,
                        fontFamily: "'Plus Jakarta Sans',sans-serif",
                      }}
                    >
                      <FaCalendarAlt style={{ color: GOLD, fontSize: 11 }} />{" "}
                      Check-out
                    </label>
                    <LandingDateField
                      value={checkIn}
                      valueEnd={checkOut}
                      range={true}
                      min={today}
                      onChange={setCheckIn}
                      onChangeEnd={setCheckOut}
                      placeholder="Check-out"
                      displayValue={checkOut}
                      isOpen={openCalendarId === "hotel-checkout"}
                      onToggle={(st) => handleCalendarToggle("hotel-checkout", st)}
                      focus="end"
                    />
                    {nightCount && (
                      <div className="mt-1.5 text-center">
                        <span
                          className="inline-block text-xs font-bold px-3 py-0.5 rounded-full"
                          style={{
                            background: GOLD_10,
                            color: GOLD,
                            fontFamily: "'Plus Jakarta Sans',sans-serif",
                            border: `1px solid ${GOLD_20}`,
                          }}
                        >
                          {nightCount} Night{nightCount > 1 ? "s" : ""}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Guests & Rooms */}
                  <div
                    className="md:col-span-2 lg:col-span-2 relative"
                    ref={guestRef}
                  >
                    <label
                      className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest mb-1.5"
                      style={{
                        color: FIELD_MUTED,
                        fontFamily: "'Plus Jakarta Sans',sans-serif",
                      }}
                    >
                      <FaUserFriends style={{ color: GOLD, fontSize: 11 }} />{" "}
                      Guests &amp; Rooms
                    </label>
                    <button
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenHotelGuests();
                      }}
                      className="w-full flex items-center justify-between rounded-xl px-3 py-3 transition-all text-left border-2"
                      style={fieldBorder(showGuestDropdown)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FaUserFriends
                          style={{ color: GOLD, flexShrink: 0, fontSize: 13 }}
                        />
                        <span
                          className="text-sm font-medium truncate"
                          style={fieldInputStyle}
                        >
                          {guestSummary}
                        </span>
                      </div>
                      <FaChevronDown
                        style={{
                          color: FIELD_MUTED,
                          fontSize: 11,
                          flexShrink: 0,
                          transform: showGuestDropdown
                            ? "rotate(180deg)"
                            : "none",
                          transition: "transform 0.2s",
                        }}
                      />
                    </button>
                    {showGuestDropdown && (
                      <div className="absolute top-full right-0 z-[1000] mt-1 shadow-2xl animate-fade-in block">
                        <HotelGuestSelection
                          rooms={rooms}
                          setRooms={setRooms}
                          guestNationality={guestNationality}
                          setGuestNationality={setGuestNationality}
                          roomConfigs={roomConfigs}
                          setRoomConfigs={setRoomConfigs}
                          normalizedCountries={normalizedCountries}
                          onApply={() => setShowGuestDropdown(false)}
                          CountrySelector={CountrySelector}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* No-results warning */}
                {noResults && (
                  <div
                    className="mb-4 text-center text-sm font-semibold"
                    style={{ color: "#f87171" }}
                  >
                    No hotels found for this search. Please try different dates
                    or city.
                  </div>
                )}

                <SearchBtn
                  loading={hotelLoading}
                  label="Search Hotels"
                  onClick={handleHotelSearch}
                />
              </>
            )}
          </div>
        </div>

        {/* Stats row — sits below card on light bg */}
        <div className="flex flex-wrap justify-center gap-12 mt-12">
          {[
            { v: "100%", l: "Policy compliant" },
            { v: "1-click", l: "Manager approvals" },
            { v: "24/7", l: "Desk support" },
            { v: "GST", l: "Tax compliant invoices" },
          ].map(({ v, l }) => (
            <div key={l} className="flex flex-col items-center gap-1">
              <p
                className="text-2xl font-black"
                style={{
                  color: C.navy,
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                }}
              >
                {v}
              </p>
              <div
                className="w-8 h-0.5 rounded-full"
                style={{ background: GOLD }}
              />
              <p
                className="text-xs font-medium"
                style={{
                  color: FIELD_MUTED,
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                }}
              >
                {l}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ─── Feature Strip ─────────────────────────────────────────────────────────────
const FeatureStrip = () => (
  <div
    className="w-full border-t border-b py-4 px-6"
    style={{ background: "#020617", borderColor: "rgba(255,255,255,0.08)" }}
  >
    <div className="max-w-7xl mx-auto flex flex-wrap justify-center md:justify-between items-center gap-6">
      {[
        { bold: "One click", rest: "to approve any request" },
        { bold: "Policy engine", rest: "auto-validates every booking" },
        { bold: "Full audit trail", rest: "— auto generated always" },
        { bold: "Auto notifications", rest: "— employee informed instantly" },
      ].map(({ bold, rest }) => (
        <div key={bold} className="flex items-center gap-1.5 whitespace-nowrap">
          <span
            className="text-sm font-bold"
            style={{
              color: C.white,
              fontFamily: "'Plus Jakarta Sans',sans-serif",
            }}
          >
            {bold}
          </span>
          <span
            className="text-sm"
            style={{
              color: WHITE_40,
              fontFamily: "'Plus Jakarta Sans',sans-serif",
            }}
          >
            {rest}
          </span>
        </div>
      ))}
    </div>
  </div>
);

// ─── How to Book ───────────────────────────────────────────────────────────────
const HowToBook = () => {
  const STEPS = [
    {
      n: 1,
      title: "Search Flights / Hotels",
      desc: "Use the search module above to find options within your travel policy.",
    },
    {
      n: 2,
      title: "Select Preferred Option",
      desc: "Pick a flight or hotel that fits your schedule and budget.",
    },
    {
      n: 3,
      title: "Policy Auto-Applied",
      desc: "The system automatically validates your booking against company rules.",
    },
    {
      n: 4,
      title: "Submit Booking",
      desc: "Confirm details and submit the request to your manager or travel desk.",
    },
    {
      n: 5,
      title: "Approval Flow",
      desc: "Manager reviews and approves with a single click.",
    },
    {
      n: 6,
      title: "Ticket Confirmation",
      desc: "E-ticket and itinerary are sent directly to your inbox.",
    },
  ];
  return (
    <section className="py-20 px-6" style={{ background: C.white }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-16">
          <div className="lg:w-[400px] shrink-0">
            <SectionHeading
              label="How It Works"
              title={
                <>
                  Request. Approve.{" "}
                  <em style={{ color: GOLD, fontStyle: "italic" }}>Book.</em>
                </>
              }
              sub="Seamlessly connect employees and managers for faster, compliant bookings."
            />
            {/* notification preview card */}
            <div
              className="rounded-xl overflow-hidden shadow-sm"
              style={{ border: `1px solid ${C.border}` }}
            >
              <div
                className="flex items-center gap-2 px-4 py-3 border-b"
                style={{ background: GOLD_10, borderColor: C.border }}
              >
                <RiMailLine style={{ color: GOLD }} />
                <p
                  className="text-sm font-semibold"
                  style={{
                    color: GOLD,
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                  }}
                >
                  Travel Admin — Action Required
                </p>
              </div>
              <div className="p-4 bg-white">
                <p
                  className="text-sm leading-6 mb-4"
                  style={{
                    color: C.muted,
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                  }}
                >
                  <span className="font-bold" style={{ color: C.navy }}>
                    Amit Kumar
                  </span>{" "}
                  has requested travel to{" "}
                  <span className="font-bold" style={{ color: C.navy }}>
                    Delhi on 22 April
                  </span>
                  . Flight: ₹4,200 · Hotel: ₹6,500/n. Total:{" "}
                  <span className="font-bold" style={{ color: C.navy }}>
                    ₹79,800
                  </span>
                  .
                </p>
                <div className="flex gap-2">
                  <button
                    className="flex-1 py-2 rounded-lg text-sm font-semibold"
                    style={{
                      background: GOLD,
                      color: C.navy,
                      fontFamily: "'Plus Jakarta Sans',sans-serif",
                    }}
                  >
                    Approve Request
                  </button>
                  <button
                    className="py-2 px-4 rounded-lg text-sm font-medium border"
                    style={{
                      borderColor: C.border,
                      color: C.muted,
                      fontFamily: "'Plus Jakarta Sans',sans-serif",
                    }}
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-5">
            {STEPS.map(({ n, title, desc }) => (
              <div
                key={n}
                className="flex gap-4 p-5 rounded-xl hover:shadow-sm transition-all"
                style={{
                  border: `1px solid ${C.border}`,
                  background: C.offWhite,
                }}
              >
                <div
                  className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center font-bold text-lg"
                  style={{
                    background: GOLD_10,
                    color: GOLD,
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                  }}
                >
                  {n}
                </div>
                <div>
                  <h4
                    className="font-normal text-base mb-1"
                    style={{
                      fontFamily: "'DM Serif Display',serif",
                      color: C.navy,
                    }}
                  >
                    {title}
                  </h4>
                  <p
                    className="text-sm leading-5"
                    style={{
                      color: C.muted,
                      fontFamily: "'Plus Jakarta Sans',sans-serif",
                    }}
                  >
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

// ─── Travel Policies ───────────────────────────────────────────────────────────
const TravelPolicies = ({ branding }) => {
  const POLICIES = [
    {
      label: "Flights",
      icon: <RiFlightTakeoffLine size={20} />,
      items: [
        { rule: "Allowed Class", value: "Economy (Domestic) · Business (>6h)" },
        { rule: "Advance Booking", value: "Minimum 7 days prior" },
        { rule: "Preferred Airlines", value: "IndiGo, Air India, Air Asia" },
      ],
    },
    {
      label: "Hotels",
      icon: <RiHotelLine size={20} />,
      items: [
        { rule: "Budget Cap", value: "₹6,500 per night" },
        { rule: "Preferred Chains", value: "Taj, Marriott, Accor" },
        { rule: "Occupancy", value: "Single occupancy only" },
      ],
    },
    {
      label: "Expenses",
      icon: <RiBarChartLine size={20} />,
      items: [
        { rule: "Meal Allowance", value: "₹1,200 per day" },
        { rule: "Transport", value: "Uber Corporate only" },
        { rule: "Invoicing", value: "GST-compliant receipts required" },
      ],
    },
    {
      label: "Approval",
      icon: <RiShieldCheckLine size={20} />,
      items: [
        { rule: "Under ₹25,000", value: "Travel Admin only" },
        { rule: "₹25k–₹1L", value: "Manager + Travel Admin" },
        { rule: "Above ₹1L", value: "Finance Head required" },
      ],
    },
  ];
  return (
    <section className="py-20 px-6" style={{ background: C.offWhite }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-6">
          <SectionHeading
            label="Travel Policies"
            title={
              <>
                Company Rules,{" "}
                <em style={{ color: GOLD, fontStyle: "italic" }}>
                  Simplified.
                </em>
              </>
            }
            sub={`Configured by ${branding?.corporateName || "your organisation"} via Travel Admin.`}
          />
          {/* <button
            className="flex items-center gap-2 mb-14 text-sm font-bold whitespace-nowrap hover:opacity-70 transition-opacity"
            style={{
              color: C.navy,
              fontFamily: "'Plus Jakarta Sans',sans-serif",
            }}
          >
            View PDF Policy <RiArrowRightLine size={14} />
          </button> */}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {POLICIES.map(({ label, icon, items }) => (
            <div
              key={label}
              className="rounded-xl overflow-hidden transition-all hover:-translate-y-1 hover:shadow-md"
              style={{ border: `1px solid ${C.border}`, background: C.white }}
            >
              <div
                className="flex items-center gap-3 px-5 py-4 border-b"
                style={{ borderColor: GOLD_20, background: GOLD_10 }}
              >
                <span style={{ color: GOLD }}>{icon}</span>
                <h3
                  className="text-sm font-bold uppercase tracking-widest"
                  style={{
                    color: C.navy,
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                  }}
                >
                  {label}
                </h3>
              </div>
              <div className="divide-y" style={{ borderColor: C.border }}>
                {items.map(({ rule, value }) => (
                  <div key={rule} className="px-5 py-3.5">
                    <p
                      className="text-[10px] font-bold uppercase tracking-widest mb-0.5"
                      style={{
                        color: C.muted,
                        fontFamily: "'Plus Jakarta Sans',sans-serif",
                      }}
                    >
                      {rule}
                    </p>
                    <p
                      className="text-sm font-medium"
                      style={{
                        color: C.navy,
                        fontFamily: "'Plus Jakarta Sans',sans-serif",
                      }}
                    >
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ─── Restrictions ──────────────────────────────────────────────────────────────
const Restrictions = () => {
  const ITEMS = [
    {
      type: "warn",
      title: "Credit Limit",
      badge: "Active",
      msg: "Monthly credit limit reset is pending for your department. All bookings require pre-approval.",
    },
    {
      type: "warn",
      title: "Credit Cycle Limitation",
      badge: "Pending Reset",
      msg: "The current billing cycle closes on 30 April. Avoid non-essential bookings in the final 5 days.",
    },
    {
      type: "danger",
      title: "SSR Restrictions",
      badge: "Restricted",
      msg: "Seat selection, extra baggage, and special meal requests must be pre-approved by Travel Admin.",
    },
    {
      type: "danger",
      title: "Approval-Based Bookings",
      badge: "Mandatory",
      msg: "All bookings above ₹25,000 require dual approval from your reporting manager and the Travel Admin.",
    },
  ];
  return (
    <section className="py-20 px-6" style={{ background: C.navy }}>
      <div className="max-w-7xl mx-auto">
        <SectionHeading
          label="Booking Restrictions"
          title={
            <>
              Know Before{" "}
              <em style={{ color: GOLD, fontStyle: "italic" }}>You Book.</em>
            </>
          }
          sub="Restrictions applicable to your employee profile. Contact Travel Admin for exceptions."
          dark
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {ITEMS.map(({ type, title, badge, msg }) => (
            <div
              key={title}
              className="flex gap-4 p-5 rounded-xl"
              style={{
                background:
                  type === "warn"
                    ? "rgba(201,162,64,0.08)"
                    : "rgba(220,38,38,0.08)",
                border: `1px solid ${type === "warn" ? GOLD_20 : "rgba(220,38,38,0.2)"}`,
              }}
            >
              <RiAlertLine
                size={20}
                style={{
                  color: type === "warn" ? GOLD : "#f87171",
                  marginTop: 2,
                  flexShrink: 0,
                }}
              />
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h4
                    className="text-sm font-bold"
                    style={{
                      color: C.white,
                      fontFamily: "'Plus Jakarta Sans',sans-serif",
                    }}
                  >
                    {title}
                  </h4>
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{
                      background:
                        type === "warn" ? GOLD_20 : "rgba(220,38,38,0.2)",
                      color: type === "warn" ? GOLD : "#f87171",
                      fontFamily: "'Plus Jakarta Sans',sans-serif",
                    }}
                  >
                    {badge}
                  </span>
                </div>
                <p
                  className="text-sm leading-5"
                  style={{
                    color: WHITE_60,
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                  }}
                >
                  {msg}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ─── Support ───────────────────────────────────────────────────────────────────
const SupportSection = ({ branding }) => {
  const support = branding?.branding || {};
  return (
    <section className="py-20 px-6" style={{ background: C.offWhite }}>
      <div className="max-w-7xl mx-auto">
        <SectionHeading
          label="Internal Support"
          title={
            <>
              We're Here,{" "}
              <em style={{ color: GOLD, fontStyle: "italic" }}>Always.</em>
            </>
          }
          sub="Need help with your booking? Our travel desk is available 24/7."
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: <RiPhoneLine size={22} />,
              title: "Emergency Helpline",
              desc: "Missed flights, urgent cancellations, or on-field emergencies.",
              detail: support.supportPhone || "+91 9999 000 000",
              tag: "24 × 7",
              tagColor: "#059669",
            },
            {
              icon: <RiMailLine size={22} />,
              title: "Travel Admin Support",
              desc: "Policy queries, approval escalation, manual ticketing assistance.",
              detail: support.supportEmail || "admin.travel@company.com",
              tag: "Mon–Sat",
              tagColor: GOLD,
            },
            {
              icon: <RiFileTextLine size={22} />,
              title: "Internal Notes & FAQ",
              desc: "Browse the admin-curated knowledge base for common questions.",
              detail: "View Knowledge Base →",
              tag: "Self Service",
              tagColor: C.muted,
            },
          ].map(({ icon, title, desc, detail, tag, tagColor }) => (
            <div
              key={title}
              className="rounded-xl p-6 transition-all hover:shadow-md"
              style={{ border: `1px solid ${C.border}`, background: C.white }}
            >
              <div className="flex items-start justify-between mb-5">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ background: GOLD_10, color: GOLD }}
                >
                  {icon}
                </div>
                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                  style={{
                    background: `${tagColor}15`,
                    color: tagColor,
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                  }}
                >
                  {tag}
                </span>
              </div>
              <h3
                className="text-base font-normal mb-2"
                style={{
                  fontFamily: "'DM Serif Display',serif",
                  color: C.navy,
                }}
              >
                {title}
              </h3>
              <p
                className="text-sm leading-5 mb-4"
                style={{
                  color: C.muted,
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                }}
              >
                {desc}
              </p>
              <p
                className="text-sm font-bold"
                style={{
                  color: GOLD,
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                }}
              >
                {detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default function InternalTravelDeskLanding() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { companySlug } = useParams();
  const { user, isAuthenticated } = useSelector((s) => s.auth);

  const corporateId = searchParams.get("corporateId") || user?.corporateId;
  const { publicBranding, isLoading: pageLoading } = useSelector(
    (s) => s.landingPage,
  );
  const [loading, setLoading] = useState(true);
  const [landingActiveTab, setLandingActiveTab] = useState("flight");

  // We map publicBranding to branding so the rest of the file continues to work unchanged
  const branding = publicBranding;

  const handleLogout = () => {
    dispatch(logoutUser());
    navigate("/login");
  };

  useEffect(() => {
    const fetchBranding = async () => {
      setLoading(true);
      if (companySlug) {
        await dispatch(getPublicBrandingBySlug(companySlug));
      } else if (corporateId) {
        await dispatch(getPublicBrandingById(corporateId));
      }
      setLoading(false);
    };
    fetchBranding();
  }, [companySlug, corporateId, dispatch]);

  if (loading || pageLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: C.navy }}
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-12 h-12 rounded-full border-2 animate-spin"
            style={{ borderColor: GOLD_20, borderTopColor: GOLD }}
          />
          <p
            className="text-sm font-medium"
            style={{
              color: WHITE_40,
              fontFamily: "'Plus Jakarta Sans',sans-serif",
            }}
          >
            Loading your travel desk…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}
    >
      <LandingHeader />
      <HeroWithSearch
        branding={branding}
        navigate={navigate}
        dispatch={dispatch}
        activeTab={landingActiveTab} // ← pass down
        setActiveTab={setLandingActiveTab}
      />
      <FeatureStrip />
      <HowToBook />
      {/* <TravelPolicies branding={branding} /> */}
      {/* <Restrictions /> */}
      <SupportSection branding={branding} />
      <LandingFooter onTabChange={setLandingActiveTab} />

      {/* Floating contact button */}
      <button
        className="fixed bottom-8 right-8 w-14 h-14 rounded-full flex items-center justify-center z-50 shadow-2xl transition-all hover:scale-110 active:scale-95"
        style={{
          background: GOLD,
          color: C.navy,
          boxShadow: `0 8px 24px -4px ${GOLD_30}`,
        }}
      >
        <RiPhoneLine size={22} />
      </button>
    </div>
  );
}
