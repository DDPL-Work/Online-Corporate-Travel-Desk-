import React, { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiSave,
  FiPercent,
  FiDollarSign,
  FiPlus,
  FiTrash2,
  FiSettings
} from "react-icons/fi";
import { FaPlane, FaHotel, FaRupeeSign, FaChevronUp, FaChevronDown } from "react-icons/fa";
import { MdBusiness } from "react-icons/md";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { fetchAirlines, fetchCountries, fetchCities, fetchHotels, fetchAirports } from "../../Redux/Actions/markup.thunks";
import { airlineLogo } from "../../utils/formatter";

const C = {
  navy: "#003399",
  offWhite: "#f8fafc",
  white: "#ffffff",
  border: "#e2e8f0",
  muted: "#64748b",
  lightGray: "#f1f5f9",
  gold: "#d97706",
  emerald: "#10b981",
  red: "#ef4444",
  amber: "#f59e0b"
};

const FLIGHT_CATEGORIES = [
  "Airline Wise",
  "Domestic Flights",
  "International Flights",
  "Cabin Wise",
  "Sector Wise"
];

const HOTEL_CATEGORIES = [
  "Country Wise",
  "City Wise",
  "Hotel Wise",
  "Star Rating Wise",
  "Fare Slab Based"
];



export default function CorporateMarkupConfiguration() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const corporate = location.state?.corporate || {
    _id: id,
    corporateName: "Corporate Account",
    corporateCode: "CORP-" + id?.substring(0, 4)?.toUpperCase() || "CORP-001",
    status: "active"
  };

  const dispatch = useDispatch();
  const { airlines, airlinesLoading, countries, countriesLoading, cities, citiesLoading, hotels, hotelsLoading, airports, airportsLoading } = useSelector((state) => state.markup);

  const [activeTab, setActiveTab] = useState("flight"); // 'flight' | 'hotel'
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState("");
  
  const [markupMethod, setMarkupMethod] = useState("percentage"); // 'fixed' | 'percentage'
  const [showMarkupMethodDropdown, setShowMarkupMethodDropdown] = useState(false);
  const [markupValue, setMarkupValue] = useState("");
  
  // Specific Form States
  const [airlineSearchTerm, setAirlineSearchTerm] = useState("");
  const [showAirlineDropdown, setShowAirlineDropdown] = useState(false);
  const [airline, setAirline] = useState("");
  
  const [countrySearchTerm, setCountrySearchTerm] = useState("");
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [country, setCountry] = useState("");

  const [citySearchTerm, setCitySearchTerm] = useState("");
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [city, setCity] = useState("");

  const [hotelSearchTerm, setHotelSearchTerm] = useState("");
  const [showHotelDropdown, setShowHotelDropdown] = useState(false);
  const [hotel, setHotel] = useState("");

  const [hotelCitySearchTerm, setHotelCitySearchTerm] = useState("");
  const [showHotelCityDropdown, setShowHotelCityDropdown] = useState(false);
  const [hotelCityCode, setHotelCityCode] = useState("");

  const [starRating, setStarRating] = useState("");
  const [showStarRatingDropdown, setShowStarRatingDropdown] = useState(false);

  const [cabin, setCabin] = useState("Economy");
  const [showCabinDropdown, setShowCabinDropdown] = useState(false);

  const [originSearchTerm, setOriginSearchTerm] = useState("");
  const [showOriginDropdown, setShowOriginDropdown] = useState(false);
  const [origin, setOrigin] = useState("");

  const [destinationSearchTerm, setDestinationSearchTerm] = useState("");
  const [showDestinationDropdown, setShowDestinationDropdown] = useState(false);
  const [destination, setDestination] = useState("");

  const [fareSlabs, setFareSlabs] = useState([{ from: "", to: "", value: "", method: "fixed" }]);
  const [activeFareSlabDropdown, setActiveFareSlabDropdown] = useState(null);
  
  // Debounced Airline Search
  useEffect(() => {
    if (activeCategory === "Airline Wise") {
      const delayFn = setTimeout(() => {
        dispatch(fetchAirlines({ search: airlineSearchTerm, limit: 100 }));
      }, 500);
      return () => clearTimeout(delayFn);
    }
  }, [airlineSearchTerm, activeCategory, dispatch]);

  // Debounced Origin Search
  useEffect(() => {
    if (activeCategory === "Sector Wise" && showOriginDropdown) {
      const delayFn = setTimeout(() => {
        dispatch(fetchAirports({ search: originSearchTerm, limit: 100 }));
      }, 500);
      return () => clearTimeout(delayFn);
    }
  }, [originSearchTerm, activeCategory, showOriginDropdown, dispatch]);

  // Debounced Destination Search
  useEffect(() => {
    if (activeCategory === "Sector Wise" && showDestinationDropdown) {
      const delayFn = setTimeout(() => {
        dispatch(fetchAirports({ search: destinationSearchTerm, limit: 100 }));
      }, 500);
      return () => clearTimeout(delayFn);
    }
  }, [destinationSearchTerm, activeCategory, showDestinationDropdown, dispatch]);

  // Debounced Country Search
  useEffect(() => {
    if (activeCategory === "Country Wise") {
      const delayFn = setTimeout(() => {
        dispatch(fetchCountries({ search: countrySearchTerm, limit: 100 }));
      }, 500);
      return () => clearTimeout(delayFn);
    }
  }, [countrySearchTerm, activeCategory, dispatch]);

  // Debounced City Search
  useEffect(() => {
    if (activeCategory === "City Wise") {
      const delayFn = setTimeout(() => {
        dispatch(fetchCities({ search: citySearchTerm, limit: 100 }));
      }, 500);
      return () => clearTimeout(delayFn);
    }
  }, [citySearchTerm, activeCategory, dispatch]);

  // Debounced Hotel Search
  useEffect(() => {
    if (activeCategory === "Hotel Wise") {
      const delayFn = setTimeout(() => {
        dispatch(fetchHotels({ search: hotelSearchTerm, cityCode: hotelCityCode, limit: 100 }));
      }, 500);
      return () => clearTimeout(delayFn);
    }
  }, [hotelSearchTerm, hotelCityCode, activeCategory, dispatch]);

  // Debounced Hotel City Search
  useEffect(() => {
    if (activeCategory === "Hotel Wise") {
      const delayFn = setTimeout(() => {
        dispatch(fetchCities({ search: hotelCitySearchTerm, limit: 100 }));
      }, 500);
      return () => clearTimeout(delayFn);
    }
  }, [hotelCitySearchTerm, activeCategory, dispatch]);

  useEffect(() => {
    // Reset selections when tab changes
    setSelectedCategories([]);
    setActiveCategory("");
    setMarkupMethod("percentage");
    setMarkupValue("");
  }, [activeTab]);

  const toggleCategory = (cat) => {
    setSelectedCategories(prev => {
      const isSelected = prev.includes(cat);
      const next = isSelected ? prev.filter(c => c !== cat) : [...prev, cat];
      // If unchecking the active one, set active to last remaining
      if (isSelected && cat === activeCategory) {
        const remaining = next;
        setActiveCategory(remaining.length > 0 ? remaining[remaining.length - 1] : "");
      } else if (!isSelected) {
        // Newly checked → make it active
        setActiveCategory(cat);
      }
      return next;
    });
  };

  const handleSave = () => {
    if (selectedCategories.length === 0) {
      toast.error("Please select at least one category");
      return;
    }
    const hasFareSlab = selectedCategories.includes("Fare Slab Based");
    if (!markupValue && !hasFareSlab) {
      toast.error("Please enter a markup value");
      return;
    }
    if (Number(markupValue) < 0) {
      toast.error("Markup cannot be negative");
      return;
    }
    toast.success("Markup configuration saved successfully!");
  };



  const selectedCategory = activeCategory;

  const renderDynamicFields = () => {
    if (selectedCategory === "Fare Slab Based") {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Define Fare Slabs</label>
            {fareSlabs.map((slab, index) => (
              <div key={index} className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex-1">
                  <input
                    type="number"
                    placeholder="From Fare (₹)"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#003399] bg-white"
                    value={slab.from}
                    onChange={(e) => {
                      const newSlabs = [...fareSlabs];
                      newSlabs[index].from = e.target.value;
                      setFareSlabs(newSlabs);
                    }}
                  />
                </div>
                <div className="flex-1">
                  <input
                    type="number"
                    placeholder="To Fare (₹)"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#003399] bg-white"
                    value={slab.to}
                    onChange={(e) => {
                      const newSlabs = [...fareSlabs];
                      newSlabs[index].to = e.target.value;
                      setFareSlabs(newSlabs);
                    }}
                  />
                </div>
                <div className="w-48 relative">
                  <input
                    type="text"
                    readOnly
                    value={slab.method === "percentage" ? "Percentage (%)" : "Fixed Amount (₹)"}
                    onFocus={() => setActiveFareSlabDropdown(index)}
                    onBlur={() => setTimeout(() => { if (activeFareSlabDropdown === index) setActiveFareSlabDropdown(null); }, 200)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#003399] bg-white cursor-pointer"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                    {activeFareSlabDropdown === index ? <FaChevronUp /> : <FaChevronDown />}
                  </div>
                  {activeFareSlabDropdown === index && (
                    <ul className="absolute left-0 right-0 top-[100%] mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-[60]">
                      <li
                        className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-sm font-medium border-b border-slate-100 flex items-center gap-2"
                        onClick={() => {
                          const newSlabs = [...fareSlabs];
                          newSlabs[index].method = "percentage";
                          setFareSlabs(newSlabs);
                          setActiveFareSlabDropdown(null);
                        }}
                      >
                        <FiPercent className="text-slate-400" /> Percentage (%)
                      </li>
                      <li
                        className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-sm font-medium flex items-center gap-2"
                        onClick={() => {
                          const newSlabs = [...fareSlabs];
                          newSlabs[index].method = "fixed";
                          setFareSlabs(newSlabs);
                          setActiveFareSlabDropdown(null);
                        }}
                      >
                        <FaRupeeSign className="text-slate-400" /> Fixed Amount (₹)
                      </li>
                    </ul>
                  )}
                </div>
                <div className="flex-1">
                  <input
                    type="number"
                    placeholder="Value"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#003399]"
                    value={slab.value}
                    onChange={(e) => {
                      const newSlabs = [...fareSlabs];
                      newSlabs[index].value = e.target.value;
                      setFareSlabs(newSlabs);
                    }}
                  />
                </div>
                <button
                  onClick={() => {
                    const newSlabs = fareSlabs.filter((_, i) => i !== index);
                    setFareSlabs(newSlabs);
                  }}
                  className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                >
                  <FiTrash2 />
                </button>
              </div>
            ))}
            <button
              onClick={() => setFareSlabs([...fareSlabs, { from: "", to: "", value: "", method: "fixed" }])}
              className="flex items-center gap-2 text-sm font-bold text-[#003399] hover:text-[#002266] px-4 py-2 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
            >
              <FiPlus /> Add New Slab
            </button>
          </div>
        </div>
      );
    }

    // Category-specific top field
    const renderCategorySpecificField = () => {
      switch (selectedCategory) {
        case "Airline Wise":
          return (
            <div className="space-y-2 relative">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Search & Select Airline
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={airlineSearchTerm}
                  onFocus={() => setShowAirlineDropdown(true)}
                  onBlur={() => {
                    // Small delay to allow click on dropdown items to register
                    setTimeout(() => setShowAirlineDropdown(false), 200);
                  }}
                  onChange={(e) => {
                    setAirlineSearchTerm(e.target.value);
                    setAirline(e.target.value); // Temporarily hold value while typing
                    setShowAirlineDropdown(true);
                  }}
                  placeholder="e.g. Indigo or 6E..."
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#003399] bg-white"
                />
                
                {/* Custom Dropdown for Airlines */}
                {showAirlineDropdown && airlines && airlines.length > 0 && (
                  <ul className="absolute left-0 right-0 top-[100%] mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto z-[60]">
                    {airlines.map((a) => {
                      const displayStr = `${a.iata} - ${a.name}`;
                      return (
                        <li
                          key={a._id}
                          className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-sm font-medium border-b border-slate-100 last:border-0 flex items-center gap-3"
                          onClick={() => {
                            setAirlineSearchTerm(displayStr);
                            setAirline(displayStr);
                            setShowAirlineDropdown(false);
                          }}
                        >
                          <img 
                            src={airlineLogo(a.iata)} 
                            alt={a.iata} 
                            className="w-8 h-8 object-contain rounded bg-slate-50 border border-slate-100" 
                            onError={(e) => {
                              e.target.src = "https://via.placeholder.com/32?text=NA";
                            }}
                          />
                          <span className="truncate">{displayStr}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {airlinesLoading && (
                  <div className="absolute right-3 top-3 text-xs text-slate-400">Loading...</div>
                )}
              </div>
            </div>
          );
        case "Cabin Wise":
          return (
            <div className="space-y-2 relative">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Select Cabin Class</label>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={cabin === "First" ? "First Class" : cabin}
                  onFocus={() => setShowCabinDropdown(true)}
                  onBlur={() => setTimeout(() => setShowCabinDropdown(false), 200)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#003399] bg-white cursor-pointer"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                  {showCabinDropdown ? <FaChevronUp /> : <FaChevronDown />}
                </div>
                {showCabinDropdown && (
                  <ul className="absolute left-0 right-0 top-[100%] mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-[60]">
                    {[
                      { value: "Economy", label: "Economy" },
                      { value: "Premium Economy", label: "Premium Economy" },
                      { value: "Business", label: "Business" },
                      { value: "First", label: "First Class" }
                    ].map((c) => (
                      <li
                        key={c.value}
                        className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-sm font-medium border-b border-slate-100 last:border-0"
                        onClick={() => {
                          setCabin(c.value);
                          setShowCabinDropdown(false);
                        }}
                      >
                        {c.label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          );
        case "Domestic Flights":
        case "International Flights":
          return (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Flight Type</label>
              <div className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium bg-slate-50 text-slate-600">
                {selectedCategory}
              </div>
            </div>
          );
        case "Sector Wise":
          return (
            <div className="grid grid-cols-2 gap-4">
              {/* Origin */}
              <div className="space-y-2 relative">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Origin</label>
                <div className="relative">
                  <input
                    type="text"
                    value={originSearchTerm}
                    onFocus={() => setShowOriginDropdown(true)}
                    onBlur={() => setTimeout(() => setShowOriginDropdown(false), 200)}
                    onChange={(e) => {
                      setOriginSearchTerm(e.target.value);
                      setOrigin(e.target.value);
                      setShowOriginDropdown(true);
                    }}
                    placeholder="Search by airport name or code..."
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#003399] bg-white"
                  />
                  {showOriginDropdown && airports && airports.length > 0 && (
                    <ul className="absolute left-0 right-0 top-[100%] mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto z-[60]">
                      {airports.map((a) => {
                        const displayStr = `${a.iata_code} - ${a.name} (${a.city})`;
                        return (
                          <li
                            key={a.iata_code}
                            className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-sm font-medium border-b border-slate-100 last:border-0 flex flex-col"
                            onClick={() => {
                              setOriginSearchTerm(displayStr);
                              setOrigin(displayStr);
                              setShowOriginDropdown(false);
                            }}
                          >
                            <span className="font-semibold">{a.iata_code} - {a.city}</span>
                            <span className="text-xs text-slate-500">{a.name}, {a.country}</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {airportsLoading && showOriginDropdown && <div className="absolute right-3 top-3 text-xs text-slate-400">Loading...</div>}
                </div>
              </div>

              {/* Destination */}
              <div className="space-y-2 relative">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Destination</label>
                <div className="relative">
                  <input
                    type="text"
                    value={destinationSearchTerm}
                    onFocus={() => setShowDestinationDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDestinationDropdown(false), 200)}
                    onChange={(e) => {
                      setDestinationSearchTerm(e.target.value);
                      setDestination(e.target.value);
                      setShowDestinationDropdown(true);
                    }}
                    placeholder="Search by airport name or code..."
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#003399] bg-white"
                  />
                  {showDestinationDropdown && airports && airports.length > 0 && (
                    <ul className="absolute left-0 right-0 top-[100%] mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto z-[60]">
                      {airports.map((a) => {
                        const displayStr = `${a.iata_code} - ${a.name} (${a.city})`;
                        return (
                          <li
                            key={a.iata_code}
                            className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-sm font-medium border-b border-slate-100 last:border-0 flex flex-col"
                            onClick={() => {
                              setDestinationSearchTerm(displayStr);
                              setDestination(displayStr);
                              setShowDestinationDropdown(false);
                            }}
                          >
                            <span className="font-semibold">{a.iata_code} - {a.city}</span>
                            <span className="text-xs text-slate-500">{a.name}, {a.country}</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {airportsLoading && showDestinationDropdown && <div className="absolute right-3 top-3 text-xs text-slate-400">Loading...</div>}
                </div>
              </div>
            </div>
          );
        case "Supplier Wise":
          return (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Select Supplier</label>
              <select className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#003399] bg-white">
                <option value="">-- Select Supplier --</option>
                <option value="amadeus">Amadeus</option>
                <option value="sabre">Sabre</option>
                <option value="galileo">Galileo</option>
                <option value="travelport">Travelport</option>
              </select>
            </div>
          );
        case "Passenger Type Wise":
          return (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Passenger Type</label>
              <select className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#003399] bg-white">
                <option value="">-- Select Type --</option>
                <option value="ADT">Adult (ADT)</option>
                <option value="CHD">Child (CHD)</option>
                <option value="INF">Infant (INF)</option>
              </select>
            </div>
          );
        case "Convenience Fee":
          return (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Fee Label</label>
              <input
                type="text"
                placeholder="e.g. Booking Convenience Fee"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#003399] bg-white"
              />
            </div>
          );
        case "Country Wise":
          return (
            <div className="space-y-2 relative">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Select Country</label>
              <div className="relative">
                <input
                  type="text"
                  value={countrySearchTerm}
                  onFocus={() => setShowCountryDropdown(true)}
                  onBlur={() => setTimeout(() => setShowCountryDropdown(false), 200)}
                  onChange={(e) => {
                    setCountrySearchTerm(e.target.value);
                    setCountry(e.target.value);
                    setShowCountryDropdown(true);
                  }}
                  placeholder="Search by country name or code..."
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#003399] bg-white"
                />
                {showCountryDropdown && countries && countries.length > 0 && (
                  <ul className="absolute left-0 right-0 top-[100%] mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto z-[60]">
                    {countries.map((c) => {
                      const displayStr = `${c.Code} - ${c.Name}`;
                      return (
                        <li
                          key={c._id || c.Code}
                          className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-sm font-medium border-b border-slate-100 last:border-0"
                          onClick={() => {
                            setCountrySearchTerm(displayStr);
                            setCountry(displayStr);
                            setShowCountryDropdown(false);
                          }}
                        >
                          {displayStr}
                        </li>
                      );
                    })}
                  </ul>
                )}
                {countriesLoading && <div className="absolute right-3 top-3 text-xs text-slate-400">Loading...</div>}
              </div>
            </div>
          );
        case "City Wise":
          return (
            <div className="space-y-2 relative">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">City Name</label>
              <div className="relative">
                <input
                  type="text"
                  value={citySearchTerm}
                  onFocus={() => setShowCityDropdown(true)}
                  onBlur={() => setTimeout(() => setShowCityDropdown(false), 200)}
                  onChange={(e) => {
                    setCitySearchTerm(e.target.value);
                    setCity(e.target.value);
                    setShowCityDropdown(true);
                  }}
                  placeholder="Search by city name or code..."
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#003399] bg-white"
                />
                {showCityDropdown && cities && cities.length > 0 && (
                  <ul className="absolute left-0 right-0 top-[100%] mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto z-[60]">
                    {cities.map((c) => {
                      const displayStr = `${c.cityName} (${c.cityCode}) - ${c.countryName}`;
                      return (
                        <li
                          key={c._id || c.cityCode}
                          className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-sm font-medium border-b border-slate-100 last:border-0"
                          onClick={() => {
                            setCitySearchTerm(displayStr);
                            setCity(displayStr);
                            setShowCityDropdown(false);
                          }}
                        >
                          {displayStr}
                        </li>
                      );
                    })}
                  </ul>
                )}
                {citiesLoading && <div className="absolute right-3 top-3 text-xs text-slate-400">Loading...</div>}
              </div>
            </div>
          );
        case "Hotel Wise":
          return (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 relative">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Select City</label>
                <div className="relative">
                  <input
                    type="text"
                    value={hotelCitySearchTerm}
                    onFocus={() => setShowHotelCityDropdown(true)}
                    onBlur={() => setTimeout(() => setShowHotelCityDropdown(false), 200)}
                    onChange={(e) => {
                      setHotelCitySearchTerm(e.target.value);
                      setShowHotelCityDropdown(true);
                    }}
                    placeholder="Search by city name..."
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#003399] bg-white"
                  />
                  {showHotelCityDropdown && cities && cities.length > 0 && (
                    <ul className="absolute left-0 right-0 top-[100%] mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto z-[60]">
                      {cities.map((c) => {
                        const displayStr = `${c.cityName} (${c.cityCode})`;
                        return (
                          <li
                            key={`hc-${c._id || c.cityCode}`}
                            className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-sm font-medium border-b border-slate-100 last:border-0"
                            onClick={() => {
                              setHotelCitySearchTerm(displayStr);
                              setHotelCityCode(c.cityCode);
                              setShowHotelCityDropdown(false);
                            }}
                          >
                            {displayStr}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {citiesLoading && <div className="absolute right-3 top-3 text-xs text-slate-400">Loading...</div>}
                </div>
              </div>
              <div className="space-y-2 relative">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Hotel Name / Code</label>
                <div className="relative">
                  <input
                    type="text"
                    value={hotelSearchTerm}
                    onFocus={() => setShowHotelDropdown(true)}
                    onBlur={() => setTimeout(() => setShowHotelDropdown(false), 200)}
                    onChange={(e) => {
                      setHotelSearchTerm(e.target.value);
                      setHotel(e.target.value);
                      setShowHotelDropdown(true);
                    }}
                    placeholder={hotelCityCode ? "Search by hotel name or code..." : "Select a city first..."}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#003399] bg-white"
                  />
                  {showHotelDropdown && hotels && hotels.length > 0 && (
                    <ul className="absolute left-0 right-0 top-[100%] mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto z-[60]">
                      {hotels.map((h) => {
                        const displayStr = `${h.hotelCode} - ${h.hotelName} (${h.cityName})`;
                        return (
                          <li
                            key={h._id || h.hotelCode}
                            className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-sm font-medium border-b border-slate-100 last:border-0 flex flex-col"
                            onClick={() => {
                              setHotelSearchTerm(displayStr);
                              setHotel(displayStr);
                              setShowHotelDropdown(false);
                            }}
                          >
                            <span className="font-semibold">{h.hotelName}</span>
                            <span className="text-xs text-slate-500">{h.hotelCode} • {h.cityName}, {h.countryCode} • {h.starRating} Stars</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {hotelsLoading && <div className="absolute right-3 top-3 text-xs text-slate-400">Loading...</div>}
                </div>
              </div>
            </div>
          );
        case "Room Category Wise":
          return (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Room Category</label>
              <select className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#003399] bg-white">
                <option value="">-- Select Room Category --</option>
                <option value="standard">Standard</option>
                <option value="deluxe">Deluxe</option>
                <option value="suite">Suite</option>
                <option value="executive">Executive</option>
                <option value="presidential">Presidential Suite</option>
              </select>
            </div>
          );
        case "Star Rating Wise":
          return (
            <div className="space-y-2 relative">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Star Rating</label>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={starRating ? `${starRating} Star` : ""}
                  onFocus={() => setShowStarRatingDropdown(true)}
                  onBlur={() => setTimeout(() => setShowStarRatingDropdown(false), 200)}
                  placeholder="-- Select Star Rating --"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#003399] bg-white cursor-pointer"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                  {showStarRatingDropdown ? <FaChevronUp /> : <FaChevronDown />}
                </div>
                {showStarRatingDropdown && (
                  <ul className="absolute left-0 right-0 top-[100%] mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto z-[60]">
                    {[1, 2, 3, 4, 5].map((stars) => (
                      <li
                        key={`star-${stars}`}
                        className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-sm font-medium border-b border-slate-100 last:border-0 flex items-center gap-2"
                        onClick={() => {
                          setStarRating(stars);
                          setShowStarRatingDropdown(false);
                        }}
                      >
                        <span className="text-amber-400">{"★".repeat(stars)}</span>
                        <span className="text-slate-300">{"★".repeat(5 - stars)}</span>
                        <span className="ml-2">{stars} Star</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          );
        case "Seasonal Markup":
          return (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Season From</label>
                <input
                  type="date"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#003399] bg-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Season To</label>
                <input
                  type="date"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#003399] bg-white"
                />
              </div>
            </div>
          );
        default:
          return null;
      }
    };

    const getCategoryColSpan = () => {
      if (["Hotel Wise", "Sector Wise", "Seasonal Markup", "Fare Slab Based"].includes(selectedCategory)) {
        return "md:col-span-6";
      }
      return "md:col-span-4";
    };

    const methodValueColSpan = getCategoryColSpan() === "md:col-span-6" ? "md:col-span-3" : "md:col-span-4";

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start md:items-end">
          
          {/* Category-specific field (changes per tab) */}
          <div className={`col-span-1 ${getCategoryColSpan()}`}>
            {renderCategorySpecificField()}
          </div>

          {/* Markup Method (Now a Custom Dropdown) */}
          <div className={`col-span-1 ${methodValueColSpan} space-y-2 relative`}>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Markup Method</label>
            <div className="relative">
              <input
                type="text"
                readOnly
                value={markupMethod === 'percentage' ? 'Percentage (%)' : 'Fixed Amount (₹)'}
                onFocus={() => setShowMarkupMethodDropdown(true)}
                onBlur={() => setTimeout(() => setShowMarkupMethodDropdown(false), 200)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#003399] bg-white cursor-pointer"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                {showMarkupMethodDropdown ? <FaChevronUp /> : <FaChevronDown />}
              </div>
              {showMarkupMethodDropdown && (
                <ul className="absolute left-0 right-0 top-[100%] mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-[60]">
                  <li
                    className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-sm font-medium border-b border-slate-100 flex items-center gap-2"
                    onClick={() => {
                      setMarkupMethod("percentage");
                      setShowMarkupMethodDropdown(false);
                    }}
                  >
                    <FiPercent className="text-slate-400" /> Percentage (%)
                  </li>
                  <li
                    className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-sm font-medium flex items-center gap-2"
                    onClick={() => {
                      setMarkupMethod("fixed");
                      setShowMarkupMethodDropdown(false);
                    }}
                  >
                    <FaRupeeSign className="text-slate-400" /> Fixed Amount (₹)
                  </li>
                </ul>
              )}
            </div>
          </div>

          {/* Markup Value */}
          <div className={`col-span-1 ${methodValueColSpan} space-y-2`}>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Markup Value</label>
            <div className="relative">
              <input
                type="number"
                placeholder={`Enter ${markupMethod === 'percentage' ? 'percentage' : 'amount'}...`}
                value={markupValue}
                onChange={(e) => setMarkupValue(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#003399] focus:ring-2 focus:ring-[#003399]/10 bg-white"
              />
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                {markupMethod === 'percentage' ? <FiPercent size={14} /> : <FaRupeeSign size={14} />}
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  };



  return (
    <div className="min-h-screen font-sans pb-32 -mt-6 -mx-4 md:-mx-6" style={{ background: C.offWhite }}>
      {/* HEADER SECTION */}
      <div className="w-full bg-gradient-to-br from-[#003399] to-[#000d26] text-white pt-8 pb-20 px-6 md:px-10">
        <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/10 text-white shadow-sm"
              >
                <FiArrowLeft size={20} />
              </button>
            </div>
            
            <div className="h-12 w-px bg-white/10 mx-2 hidden md:block" />

            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl text-white border border-white/10 bg-white/10">
                <FiSettings size={28} />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight leading-none">Corporate Markup Configuration</h1>
                <p className="text-[10px] mt-2 font-bold uppercase tracking-[2px] opacity-60">
                  Configure pricing rules and markup strategies
                </p>
              </div>
            </div>
          </div>
          
          {/* Corporate Info */}
          <div className="flex flex-col md:items-end text-left md:text-right shrink-0">
            <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1">Selected Corporate</p>
            <div className="flex items-center gap-2">
              <MdBusiness size={18} className="text-white/80" />
              <p className="text-lg font-black text-white truncate max-w-[280px]" title={corporate.corporateName}>
                {corporate.corporateName}
              </p>
            </div>
            {corporate.corporateCode && (
              <p className="text-[11px] font-mono mt-0.5 text-white/50">Code: {corporate.corporateCode}</p>
            )}
          </div>
        </div>
      </div>
      
      <div className="w-full px-4 md:px-10 -mt-10 space-y-6">
        {/* TABS */}
        <div className="flex gap-2 p-1.5 bg-white border border-slate-200/60 shadow-xl rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab("flight")}
            className={`px-8 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2.5 transition-all ${
              activeTab === "flight"
                ? "bg-[#000D26] text-white shadow-lg scale-[1.02]"
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
            }`}
          >
            <FaPlane size={14} /> Flight Markup
          </button>
          <button
            onClick={() => setActiveTab("hotel")}
            className={`px-8 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2.5 transition-all ${
              activeTab === "hotel"
                ? "bg-[#000D26] text-white shadow-lg scale-[1.02]"
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
            }`}
          >
            <FaHotel size={14} /> Hotel Markup
          </button>
        </div>
      
        {/* MAIN LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* LEFT PANEL (25%) */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border" style={{ borderColor: C.border }}>
            <div className="px-4 pt-4 pb-3 border-b border-slate-100">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Markup Categories</h3>
              {selectedCategories.length > 0 && (
                <p className="text-[10px] font-bold text-[#003399] mt-1">{selectedCategories.length} selected</p>
              )}
            </div>
            <div className="overflow-y-auto" style={{ height: "340px" }}>
              <div className="p-3 space-y-1">
                {(activeTab === "flight" ? FLIGHT_CATEGORIES : HOTEL_CATEGORIES).map(cat => {
                  const isChecked = selectedCategories.includes(cat);
                  return (
                    <label
                      key={cat}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all select-none ${
                        isChecked
                          ? "bg-[#003399]/8 border border-[#003399]/20"
                          : "hover:bg-slate-50 border border-transparent"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleCategory(cat)}
                        className="hidden"
                      />
                      <span
                        className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border-2 transition-all ${
                          isChecked
                            ? "bg-[#003399] border-[#003399]"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {isChecked && (
                          <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                            <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </span>
                      <span className={`text-sm font-semibold ${
                        isChecked ? "text-[#003399]" : "text-slate-600"
                      }`}>{cat}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            {selectedCategories.length > 0 && (
              <div className="px-4 py-3 border-t border-slate-100">
                <button
                  onClick={() => setSelectedCategories([])}
                  className="text-[10px] font-bold text-slate-400 hover:text-rose-500 uppercase tracking-widest transition-colors"
                >
                  Clear All
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* RIGHT PANEL (75%) */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl shadow-sm border" style={{ borderColor: C.border }}>
            <div className="p-6 md:p-8">
              {selectedCategories.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                    <FiSettings size={28} className="text-slate-300" />
                  </div>
                  <p className="text-sm font-bold text-slate-400">Select one or more categories from the left to configure markup rules</p>
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <h2 className="text-xl font-black text-slate-800 tracking-tight mb-3">
                      Configure Markup
                    </h2>
                    {/* Tab buttons */}
                    <div className="flex flex-wrap gap-2">
                      {selectedCategories.map(cat => (
                        <button
                          key={cat}
                          onClick={() => setActiveCategory(cat)}
                          className={`inline-flex items-center px-4 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                            activeCategory === cat
                              ? "bg-[#003399] text-white border-[#003399] shadow-sm"
                              : "bg-white text-[#003399] border-[#003399]/30 hover:border-[#003399] hover:bg-[#003399]/5"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                    <p className="text-sm font-medium text-slate-500 mt-3">Set the markup rules for {activeTab} bookings under <span className="font-bold text-slate-700">{activeCategory}</span>.</p>
                  </div>
                  {renderDynamicFields()}
                </>
              )}
            </div>
          </div>
        </div>
        </div>
      </div>
      
      {/* STICKY SUMMARY PANEL */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-40 p-4 md:px-10 md:py-5 flex flex-col md:flex-row items-center justify-between gap-4" style={{ borderColor: C.border }}>
        <div className="flex items-center gap-6 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Selected Categories</p>
            <p className="text-sm font-black text-slate-800 flex items-center gap-2 mt-0.5">
              {activeTab === 'flight' ? <FaPlane className="text-[#003399]" /> : <FaHotel className="text-[#003399]" />} 
              {selectedCategories.length === 0 ? "None selected" : selectedCategories.length === 1 ? selectedCategories[0] : `${selectedCategories.length} categories`}
            </p>
          </div>
          <div className="w-px h-8 bg-slate-200 hidden md:block"></div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Markup Value</p>
            <p className="text-sm font-black text-emerald-600 mt-0.5">
              {selectedCategories.includes("Fare Slab Based") ? "Multiple Slabs" : markupValue ? `${markupMethod === 'percentage' ? markupValue + '%' : '₹' + markupValue}` : "Not Set"}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={() => {
              setMarkupValue("");
              setMarkupMethod("percentage");
              setSelectedCategories([]);
            }}
            className="flex-1 md:flex-none px-6 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Reset
          </button>
          <button 
            onClick={handleSave}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-white bg-[#003399] hover:bg-[#002266] shadow-md transition-all active:scale-95"
          >
            <FiSave size={14} /> Save Markup Rule
          </button>
        </div>
      </div>
    </div>
  );
}
