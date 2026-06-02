import React, { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiSave,
  FiPercent,
  FiDollarSign,
  FiPlus,
  FiTrash2,
  FiSettings,
  FiList
} from "react-icons/fi";
import { FaPlane, FaHotel, FaRupeeSign, FaChevronUp, FaChevronDown } from "react-icons/fa";
import { MdBusiness } from "react-icons/md";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { fetchAirlines, fetchCountries, fetchCities, fetchHotels, fetchAirports, saveCorporateMarkup, getAllCorporateMarkups } from "../../Redux/Actions/markup.thunks";
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
  
  const [categoryRulesMap, setCategoryRulesMap] = useState({});
  const [activeDropdown, setActiveDropdown] = useState(null); // { type: 'airline', index: 0 }

  const getDefaultRuleForCategory = (cat) => {
    const base = { value: "", method: "percentage" };
    switch (cat) {
      case "Airline Wise": return { ...base, airline: "", airlineSearchTerm: "" };
      case "Cabin Wise": return { ...base, cabinClass: "" };
      case "Sector Wise": return { ...base, origin: "", originSearchTerm: "", destination: "", destinationSearchTerm: "" };
      case "Country Wise": return { ...base, country: "", countrySearchTerm: "" };
      case "City Wise": return { ...base, city: "", citySearchTerm: "" };
      case "Hotel Wise": return { ...base, hotelCityCode: "", hotelCitySearchTerm: "", hotel: "", hotelSearchTerm: "" };
      case "Star Rating Wise": return { ...base, starRating: "" };
      case "Fare Slab Based": return { fareSlabs: [{ from: "", to: "", value: "", method: "fixed" }] };
      default: return { ...base };
    }
  };

  useEffect(() => {
    if (location.state?.editMode && location.state?.editRule && location.state?.markupDoc) {
      const { editRule, markupDoc } = location.state;
      setActiveTab(markupDoc.productType);
      setSelectedCategories([editRule.category]);
      setActiveCategory(editRule.category);
      
      let initialRule = { ...getDefaultRuleForCategory(editRule.category) };
      
      if (editRule.category !== "Fare Slab Based") {
        initialRule.value = editRule.markupValue;
        initialRule.method = editRule.markupMethod;
      } else {
        initialRule.fareSlabs = editRule.fareSlabs || [];
      }
      
      const c = editRule.criteria || {};
      if (c.airline) { initialRule.airline = c.airline; initialRule.airlineSearchTerm = c.airline; }
      if (c.cabinClass) initialRule.cabinClass = c.cabinClass;
      if (c.origin) { initialRule.origin = c.origin; initialRule.originSearchTerm = c.origin; }
      if (c.destination) { initialRule.destination = c.destination; initialRule.destinationSearchTerm = c.destination; }
      if (c.country) { initialRule.country = c.country; initialRule.countrySearchTerm = c.country; }
      if (c.city) { initialRule.city = c.city; initialRule.citySearchTerm = c.city; }
      if (c.hotelCityCode) { initialRule.hotelCityCode = c.hotelCityCode; initialRule.hotelCitySearchTerm = c.hotelCityCode; }
      if (c.hotel) { initialRule.hotel = c.hotel; initialRule.hotelSearchTerm = c.hotel; }
      if (c.starRating) initialRule.starRating = c.starRating;

      setCategoryRulesMap({
        [editRule.category]: [initialRule]
      });
    }
  }, [location.state]);

  // Get the currently focused rule's active search terms based on activeDropdown
  const activeRule = (activeDropdown && activeCategory) ? categoryRulesMap[activeCategory]?.[activeDropdown.index] : null;

  // Debounced Airline Search
  useEffect(() => {
    if (activeCategory === "Airline Wise" && activeRule?.airlineSearchTerm !== undefined && activeDropdown?.type === 'airline') {
      const delayFn = setTimeout(() => {
        dispatch(fetchAirlines({ search: activeRule.airlineSearchTerm, limit: 100 }));
      }, 500);
      return () => clearTimeout(delayFn);
    }
  }, [activeRule?.airlineSearchTerm, activeCategory, activeDropdown, dispatch]);

  // Debounced Origin Search
  useEffect(() => {
    if (activeCategory === "Sector Wise" && activeRule?.originSearchTerm !== undefined && activeDropdown?.type === 'origin') {
      const delayFn = setTimeout(() => {
        dispatch(fetchAirports({ search: activeRule.originSearchTerm, limit: 100 }));
      }, 500);
      return () => clearTimeout(delayFn);
    }
  }, [activeRule?.originSearchTerm, activeCategory, activeDropdown, dispatch]);

  // Debounced Destination Search
  useEffect(() => {
    if (activeCategory === "Sector Wise" && activeRule?.destinationSearchTerm !== undefined && activeDropdown?.type === 'destination') {
      const delayFn = setTimeout(() => {
        dispatch(fetchAirports({ search: activeRule.destinationSearchTerm, limit: 100 }));
      }, 500);
      return () => clearTimeout(delayFn);
    }
  }, [activeRule?.destinationSearchTerm, activeCategory, activeDropdown, dispatch]);

  // Debounced Country Search
  useEffect(() => {
    if (activeCategory === "Country Wise" && activeRule?.countrySearchTerm !== undefined && activeDropdown?.type === 'country') {
      const delayFn = setTimeout(() => {
        dispatch(fetchCountries({ search: activeRule.countrySearchTerm, limit: 100 }));
      }, 500);
      return () => clearTimeout(delayFn);
    }
  }, [activeRule?.countrySearchTerm, activeCategory, activeDropdown, dispatch]);

  // Debounced City Search
  useEffect(() => {
    if (activeCategory === "City Wise" && activeRule?.citySearchTerm !== undefined && activeDropdown?.type === 'city') {
      const delayFn = setTimeout(() => {
        dispatch(fetchCities({ search: activeRule.citySearchTerm, limit: 100 }));
      }, 500);
      return () => clearTimeout(delayFn);
    }
  }, [activeRule?.citySearchTerm, activeCategory, activeDropdown, dispatch]);

  // Debounced Hotel City Search
  useEffect(() => {
    if (activeCategory === "Hotel Wise" && activeRule?.hotelCitySearchTerm !== undefined && activeDropdown?.type === 'hotelCity') {
      const delayFn = setTimeout(() => {
        dispatch(fetchCities({ search: activeRule.hotelCitySearchTerm, limit: 100 }));
      }, 500);
      return () => clearTimeout(delayFn);
    }
  }, [activeRule?.hotelCitySearchTerm, activeCategory, activeDropdown, dispatch]);

  // Debounced Hotel Search
  useEffect(() => {
    if (activeCategory === "Hotel Wise" && activeRule?.hotelSearchTerm !== undefined && activeDropdown?.type === 'hotel') {
      const delayFn = setTimeout(() => {
        dispatch(fetchHotels({ search: activeRule.hotelSearchTerm, cityCode: activeRule.hotelCityCode, limit: 100 }));
      }, 500);
      return () => clearTimeout(delayFn);
    }
  }, [activeRule?.hotelSearchTerm, activeRule?.hotelCityCode, activeCategory, activeDropdown, dispatch]);

  useEffect(() => {
    // Reset selections when tab changes ONLY if not in edit mode
    if (!location.state?.editMode) {
      setSelectedCategories([]);
      setActiveCategory("");
      setCategoryRulesMap({});
    }
  }, [activeTab, location.state]);

  const toggleCategory = (cat) => {
    setSelectedCategories(prev => {
      const isSelected = prev.includes(cat);
      const next = isSelected ? prev.filter(c => c !== cat) : [...prev, cat];
      
      if (!isSelected) {
        // Newly checked → make it active and initialize default rule if none exists
        setActiveCategory(cat);
        setCategoryRulesMap(prevMap => {
          if (!prevMap[cat] || prevMap[cat].length === 0) {
            return { ...prevMap, [cat]: [getDefaultRuleForCategory(cat)] };
          }
          return prevMap;
        });
      } else if (cat === activeCategory) {
        // Unchecked active → set active to last remaining
        const remaining = next;
        setActiveCategory(remaining.length > 0 ? remaining[remaining.length - 1] : "");
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (selectedCategories.length === 0) {
      toast.error("Please configure at least one rule");
      return;
    }

    const finalRules = [];

    // Loop through all selected categories to collect and validate rules
    for (const cat of selectedCategories) {
      const rulesForCat = categoryRulesMap[cat];
      if (!rulesForCat || rulesForCat.length === 0) continue;

      for (const rule of rulesForCat) {
        if (cat !== "Fare Slab Based") {
          const val = rule.value;
          if (!val) {
            toast.error(`Please enter a markup value for all rows in ${cat}`);
            return;
          }
          if (Number(val) < 0) {
            toast.error(`Markup cannot be negative in ${cat}`);
            return;
          }
        }

        const criteria = {};
        if (cat === "Airline Wise") criteria.airline = rule.airline;
        if (cat === "Cabin Wise") criteria.cabinClass = rule.cabinClass;
        if (cat === "Sector Wise") {
          criteria.origin = rule.origin;
          criteria.destination = rule.destination;
        }
        if (cat === "Country Wise") criteria.country = rule.country;
        if (cat === "City Wise") criteria.city = rule.city;
        if (cat === "Hotel Wise") {
          criteria.hotelCityCode = rule.hotelCityCode;
          criteria.hotel = rule.hotel;
        }
        if (cat === "Star Rating Wise") criteria.starRating = rule.starRating;

        finalRules.push({
          category: cat,
          markupMethod: rule.method || "percentage",
          markupValue: Number(rule.value) || 0,
          criteria,
          fareSlabs: cat === "Fare Slab Based" ? [...(rule.fareSlabs || [])] : []
        });
      }
    }

    if (finalRules.length === 0) {
      toast.error("No valid rules to save. Please fill out the markup values.");
      return;
    }

    let payloadRules = finalRules;
    
    try {
      let existingRulesForProductType = [];
      if (!location.state?.editMode) {
        // Fetch existing rules so we can append
        const markupsAction = await dispatch(getAllCorporateMarkups(corporate._id));
        if (markupsAction.payload && markupsAction.payload.data) {
          const existingDoc = markupsAction.payload.data.find(m => m.productType === activeTab);
          if (existingDoc && existingDoc.rules) {
            existingRulesForProductType = existingDoc.rules;
          }
        }
      }

      if (location.state?.editMode && location.state?.markupDoc) {
        const allOriginalRules = [...location.state.markupDoc.rules];
        allOriginalRules.splice(location.state.editIndex, 1, ...finalRules);
        payloadRules = allOriginalRules;
      }

      // Check for duplicates
      const seenSignatures = new Set();
      let hasDuplicate = false;

      const checkRule = (rule) => {
        const criteriaString = JSON.stringify(rule.criteria || {});
        const ruleSignature = `${rule.category}-${criteriaString}`;
        if (seenSignatures.has(ruleSignature)) {
          return true;
        }
        seenSignatures.add(ruleSignature);
        return false;
      };

      // Populate set with existing rules (only if not in edit mode)
      if (!location.state?.editMode) {
        for (const rule of existingRulesForProductType) {
          checkRule(rule);
        }
      }

      // Check new payloadRules
      for (const rule of finalRules) {
        if (checkRule(rule)) {
          hasDuplicate = true;
          break;
        }
      }

      if (hasDuplicate) {
        toast.error("Duplicate rule detected! A rule for this category and criteria already exists.");
        return;
      }

      // If not in edit mode, append to existing rules
      if (!location.state?.editMode) {
        payloadRules = [...existingRulesForProductType, ...payloadRules];
      }

      const payload = {
        corporateId: corporate._id,
        productType: activeTab, // 'flight' or 'hotel'
        rules: payloadRules,
        isActive: true
      };

      console.log("Sending payload to backend:", payload);
      
      const resultAction = await dispatch(saveCorporateMarkup(payload));
      
      if (resultAction.error) {
        throw new Error(resultAction.payload || "Failed to save markup configuration");
      }
      
      toast.success("Markup configuration saved successfully!");
      if (!location.state?.editMode) {
        // Optionally navigate to list or clear forms
        navigate(`/corporate-markup-list/${corporate._id}`, { state: { corporate } });
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || err || "Failed to save markup configuration");
    }
  };



  const selectedCategory = activeCategory;

    const updateRule = (index, field, value) => {
    setCategoryRulesMap(prev => {
      const rules = [...(prev[activeCategory] || [])];
      rules[index] = { ...rules[index], [field]: value };
      return { ...prev, [activeCategory]: rules };
    });
  };

  const removeRule = (index) => {
    setCategoryRulesMap(prev => {
      const rules = [...(prev[activeCategory] || [])];
      rules.splice(index, 1);
      return { ...prev, [activeCategory]: rules };
    });
  };

  const addRule = () => {
    setCategoryRulesMap(prev => {
      const rules = [...(prev[activeCategory] || [])];
      rules.push(getDefaultRuleForCategory(activeCategory));
      return { ...prev, [activeCategory]: rules };
    });
  };

  const renderDynamicFields = () => {
    const rules = categoryRulesMap[activeCategory] || [];

    if (activeCategory === "Fare Slab Based") {
      const rule = rules[0] || { fareSlabs: [] };
      const fareSlabs = rule.fareSlabs || [];
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
                      updateRule(0, 'fareSlabs', newSlabs);
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
                      updateRule(0, 'fareSlabs', newSlabs);
                    }}
                  />
                </div>
                <div className="w-48 relative">
                  <input
                    type="text"
                    readOnly
                    value={slab.method === "percentage" ? "Percentage (%)" : "Fixed Amount (₹)"}
                    onFocus={() => setActiveDropdown({ type: 'fareSlabMethod', index })}
                    onBlur={() => setTimeout(() => { if (activeDropdown?.type === 'fareSlabMethod' && activeDropdown?.index === index) setActiveDropdown(null); }, 200)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#003399] bg-white cursor-pointer"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                    {activeDropdown?.type === 'fareSlabMethod' && activeDropdown?.index === index ? <FaChevronUp /> : <FaChevronDown />}
                  </div>
                  {activeDropdown?.type === 'fareSlabMethod' && activeDropdown?.index === index && (
                    <ul className="absolute left-0 right-0 top-[100%] mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-[60]">
                      <li
                        className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-sm font-medium border-b border-slate-100 flex items-center gap-2"
                        onClick={() => {
                          const newSlabs = [...fareSlabs];
                          newSlabs[index].method = "percentage";
                          updateRule(0, 'fareSlabs', newSlabs);
                          setActiveDropdown(null);
                        }}
                      >
                        <FiPercent className="text-slate-400" /> Percentage (%)
                      </li>
                      <li
                        className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-sm font-medium flex items-center gap-2"
                        onClick={() => {
                          const newSlabs = [...fareSlabs];
                          newSlabs[index].method = "fixed";
                          updateRule(0, 'fareSlabs', newSlabs);
                          setActiveDropdown(null);
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
                      updateRule(0, 'fareSlabs', newSlabs);
                    }}
                  />
                </div>
                <button
                  onClick={() => {
                    const newSlabs = fareSlabs.filter((_, i) => i !== index);
                    updateRule(0, 'fareSlabs', newSlabs);
                  }}
                  className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                >
                  <FiTrash2 />
                </button>
              </div>
            ))}
            <button
              onClick={() => updateRule(0, 'fareSlabs', [...fareSlabs, { from: "", to: "", value: "", method: "fixed" }])}
              className="flex items-center gap-2 text-sm font-bold text-[#003399] hover:text-[#002266] px-4 py-2 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
            >
              <FiPlus /> Add New Slab
            </button>
          </div>
        </div>
      );
    }

    const getCategoryColSpan = () => {
      if (["Hotel Wise", "Sector Wise", "Seasonal Markup", "Fare Slab Based"].includes(activeCategory)) {
        return "md:col-span-6";
      }
      return "md:col-span-4";
    };

    const methodValueColSpan = getCategoryColSpan() === "md:col-span-6" ? "md:col-span-3" : "md:col-span-4";

    return (
      <div className="space-y-6">
        {rules.map((rule, index) => (
          <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start md:items-end relative bg-slate-50 p-4 rounded-xl border border-slate-200">
            {rules.length > 1 && (
              <button 
                onClick={() => removeRule(index)}
                className="absolute -right-3 -top-3 w-8 h-8 bg-white border border-slate-200 text-rose-500 hover:bg-rose-50 rounded-full flex items-center justify-center shadow-sm z-10"
                title="Remove Rule"
              >
                <FiTrash2 size={14} />
              </button>
            )}

            {/* Category-specific field */}
            <div className={`col-span-1 ${getCategoryColSpan()}`}>
              {(() => {
                switch (activeCategory) {
                  case "Airline Wise":
                    return (
                      <div className="space-y-2 relative">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                          Search & Select Airline
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={rule.airlineSearchTerm || ""}
                            onFocus={() => setActiveDropdown({ type: 'airline', index })}
                            onBlur={() => setTimeout(() => { if(activeDropdown?.type === 'airline' && activeDropdown?.index === index) setActiveDropdown(null); }, 200)}
                            onChange={(e) => {
                              updateRule(index, 'airlineSearchTerm', e.target.value);
                              updateRule(index, 'airline', e.target.value); // Temporarily hold value
                              setActiveDropdown({ type: 'airline', index });
                            }}
                            placeholder="e.g. Indigo or 6E..."
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#003399] bg-white"
                          />
                          {activeDropdown?.type === 'airline' && activeDropdown?.index === index && airlines && airlines.length > 0 && (
                            <ul className="absolute left-0 right-0 top-[100%] mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto z-[60]">
                              {airlines.map((a) => {
                                const displayStr = `${a.iata} - ${a.name}`;
                                return (
                                  <li
                                    key={a._id}
                                    className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-sm font-medium border-b border-slate-100 last:border-0 flex items-center gap-3"
                                    onClick={() => {
                                      updateRule(index, 'airlineSearchTerm', displayStr);
                                      updateRule(index, 'airline', a.iata);
                                      setActiveDropdown(null);
                                    }}
                                  >
                                    <img 
                                      src={airlineLogo(a.iata)} 
                                      alt={a.iata} 
                                      className="w-8 h-8 object-contain rounded bg-slate-50 border border-slate-100" 
                                      onError={(e) => { e.target.src = "https://via.placeholder.com/32?text=NA"; }}
                                    />
                                    <span className="truncate">{displayStr}</span>
                                  </li>
                                );
                              })}
                            </ul>
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
                            value={
                              rule.cabinClass === 2 ? "Economy" :
                              rule.cabinClass === 3 ? "Premium Economy" :
                              rule.cabinClass === 4 ? "Business" :
                              rule.cabinClass === 5 ? "Premium Business" :
                              rule.cabinClass === 6 ? "First Class" : ""
                            }
                            onFocus={() => setActiveDropdown({ type: 'cabin', index })}
                            onBlur={() => setTimeout(() => { if(activeDropdown?.type === 'cabin' && activeDropdown?.index === index) setActiveDropdown(null); }, 200)}
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#003399] bg-white cursor-pointer"
                            placeholder="Select Cabin..."
                          />
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                            {activeDropdown?.type === 'cabin' && activeDropdown?.index === index ? <FaChevronUp /> : <FaChevronDown />}
                          </div>
                          {activeDropdown?.type === 'cabin' && activeDropdown?.index === index && (
                            <ul className="absolute left-0 right-0 top-[100%] mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-[60]">
                              {[
                                { value: 2, label: "Economy" },
                                { value: 3, label: "Premium Economy" },
                                { value: 4, label: "Business" },
                                { value: 5, label: "Premium Business" },
                                { value: 6, label: "First Class" }
                              ].map((c) => (
                                <li
                                  key={c.value}
                                  className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-sm font-medium border-b border-slate-100 last:border-0"
                                  onClick={() => {
                                    updateRule(index, 'cabinClass', c.value);
                                    setActiveDropdown(null);
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
                  case "Sector Wise":
                    return (
                      <div className="grid grid-cols-2 gap-4">
                        {/* Origin */}
                        <div className="space-y-2 relative">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Origin</label>
                          <div className="relative">
                            <input
                              type="text"
                              value={rule.originSearchTerm || ""}
                              onFocus={() => setActiveDropdown({ type: 'origin', index })}
                              onBlur={() => setTimeout(() => { if(activeDropdown?.type === 'origin' && activeDropdown?.index === index) setActiveDropdown(null); }, 200)}
                              onChange={(e) => {
                                updateRule(index, 'originSearchTerm', e.target.value);
                                updateRule(index, 'origin', e.target.value);
                                setActiveDropdown({ type: 'origin', index });
                              }}
                              placeholder="Search airport..."
                              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#003399] bg-white"
                            />
                            {activeDropdown?.type === 'origin' && activeDropdown?.index === index && airports && airports.length > 0 && (
                              <ul className="absolute left-0 right-0 top-[100%] mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto z-[60]">
                                {airports.map((a) => {
                                  const displayStr = `${a.iata_code} - ${a.name} (${a.city})`;
                                  return (
                                    <li
                                      key={a.iata_code}
                                      className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-sm font-medium border-b border-slate-100 last:border-0 flex flex-col"
                                      onClick={() => {
                                        updateRule(index, 'originSearchTerm', displayStr);
                                        updateRule(index, 'origin', a.iata_code);
                                        setActiveDropdown(null);
                                      }}
                                    >
                                      <span className="font-semibold">{a.iata_code} - {a.city}</span>
                                      <span className="text-xs text-slate-500">{a.name}, {a.country}</span>
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                          </div>
                        </div>
                        {/* Destination */}
                        <div className="space-y-2 relative">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Destination</label>
                          <div className="relative">
                            <input
                              type="text"
                              value={rule.destinationSearchTerm || ""}
                              onFocus={() => setActiveDropdown({ type: 'destination', index })}
                              onBlur={() => setTimeout(() => { if(activeDropdown?.type === 'destination' && activeDropdown?.index === index) setActiveDropdown(null); }, 200)}
                              onChange={(e) => {
                                updateRule(index, 'destinationSearchTerm', e.target.value);
                                updateRule(index, 'destination', e.target.value);
                                setActiveDropdown({ type: 'destination', index });
                              }}
                              placeholder="Search airport..."
                              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#003399] bg-white"
                            />
                            {activeDropdown?.type === 'destination' && activeDropdown?.index === index && airports && airports.length > 0 && (
                              <ul className="absolute left-0 right-0 top-[100%] mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto z-[60]">
                                {airports.map((a) => {
                                  const displayStr = `${a.iata_code} - ${a.name} (${a.city})`;
                                  return (
                                    <li
                                      key={a.iata_code}
                                      className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-sm font-medium border-b border-slate-100 last:border-0 flex flex-col"
                                      onClick={() => {
                                        updateRule(index, 'destinationSearchTerm', displayStr);
                                        updateRule(index, 'destination', a.iata_code);
                                        setActiveDropdown(null);
                                      }}
                                    >
                                      <span className="font-semibold">{a.iata_code} - {a.city}</span>
                                      <span className="text-xs text-slate-500">{a.name}, {a.country}</span>
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  case "Country Wise":
                    return (
                      <div className="space-y-2 relative">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Select Country</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={rule.countrySearchTerm || ""}
                            onFocus={() => setActiveDropdown({ type: 'country', index })}
                            onBlur={() => setTimeout(() => { if(activeDropdown?.type === 'country' && activeDropdown?.index === index) setActiveDropdown(null); }, 200)}
                            onChange={(e) => {
                              updateRule(index, 'countrySearchTerm', e.target.value);
                              updateRule(index, 'country', e.target.value);
                              setActiveDropdown({ type: 'country', index });
                            }}
                            placeholder="Search by country name or code..."
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#003399] bg-white"
                          />
                          {activeDropdown?.type === 'country' && activeDropdown?.index === index && countries && countries.length > 0 && (
                            <ul className="absolute left-0 right-0 top-[100%] mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto z-[60]">
                              {countries.map((c) => {
                                const displayStr = `${c.Code} - ${c.Name}`;
                                return (
                                  <li
                                    key={c._id || c.Code}
                                    className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-sm font-medium border-b border-slate-100 last:border-0"
                                    onClick={() => {
                                      updateRule(index, 'countrySearchTerm', displayStr);
                                      updateRule(index, 'country', c.Code);
                                      setActiveDropdown(null);
                                    }}
                                  >
                                    {displayStr}
                                  </li>
                                );
                              })}
                            </ul>
                          )}
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
                            value={rule.citySearchTerm || ""}
                            onFocus={() => setActiveDropdown({ type: 'city', index })}
                            onBlur={() => setTimeout(() => { if(activeDropdown?.type === 'city' && activeDropdown?.index === index) setActiveDropdown(null); }, 200)}
                            onChange={(e) => {
                              updateRule(index, 'citySearchTerm', e.target.value);
                              updateRule(index, 'city', e.target.value);
                              setActiveDropdown({ type: 'city', index });
                            }}
                            placeholder="Search by city name or code..."
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#003399] bg-white"
                          />
                          {activeDropdown?.type === 'city' && activeDropdown?.index === index && cities && cities.length > 0 && (
                            <ul className="absolute left-0 right-0 top-[100%] mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto z-[60]">
                              {cities.map((c) => {
                                const displayStr = `${c.cityName} (${c.cityCode}) - ${c.countryName}`;
                                return (
                                  <li
                                    key={c._id || c.cityCode}
                                    className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-sm font-medium border-b border-slate-100 last:border-0"
                                    onClick={() => {
                                      updateRule(index, 'citySearchTerm', displayStr);
                                      updateRule(index, 'city', c.cityCode);
                                      setActiveDropdown(null);
                                    }}
                                  >
                                    {displayStr}
                                  </li>
                                );
                              })}
                            </ul>
                          )}
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
                              value={rule.hotelCitySearchTerm || ""}
                              onFocus={() => setActiveDropdown({ type: 'hotelCity', index })}
                              onBlur={() => setTimeout(() => { if(activeDropdown?.type === 'hotelCity' && activeDropdown?.index === index) setActiveDropdown(null); }, 200)}
                              onChange={(e) => {
                                updateRule(index, 'hotelCitySearchTerm', e.target.value);
                                setActiveDropdown({ type: 'hotelCity', index });
                              }}
                              placeholder="Search by city name..."
                              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#003399] bg-white"
                            />
                            {activeDropdown?.type === 'hotelCity' && activeDropdown?.index === index && cities && cities.length > 0 && (
                              <ul className="absolute left-0 right-0 top-[100%] mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto z-[60]">
                                {cities.map((c) => {
                                  const displayStr = `${c.cityName} (${c.cityCode})`;
                                  return (
                                    <li
                                      key={`hc-${c._id || c.cityCode}`}
                                      className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-sm font-medium border-b border-slate-100 last:border-0"
                                      onClick={() => {
                                        updateRule(index, 'hotelCitySearchTerm', displayStr);
                                        updateRule(index, 'hotelCityCode', c.cityCode);
                                        setActiveDropdown(null);
                                      }}
                                    >
                                      {displayStr}
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2 relative">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Hotel Name / Code</label>
                          <div className="relative">
                            <input
                              type="text"
                              value={rule.hotelSearchTerm || ""}
                              onFocus={() => setActiveDropdown({ type: 'hotel', index })}
                              onBlur={() => setTimeout(() => { if(activeDropdown?.type === 'hotel' && activeDropdown?.index === index) setActiveDropdown(null); }, 200)}
                              onChange={(e) => {
                                updateRule(index, 'hotelSearchTerm', e.target.value);
                                updateRule(index, 'hotel', e.target.value);
                                setActiveDropdown({ type: 'hotel', index });
                              }}
                              placeholder={rule.hotelCityCode ? "Search by hotel name or code..." : "Select a city first..."}
                              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#003399] bg-white"
                            />
                            {activeDropdown?.type === 'hotel' && activeDropdown?.index === index && hotels && hotels.length > 0 && (
                              <ul className="absolute left-0 right-0 top-[100%] mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto z-[60]">
                                {hotels.map((h) => {
                                  const displayStr = `${h.hotelCode} - ${h.hotelName} (${h.cityName})`;
                                  return (
                                    <li
                                      key={h._id || h.hotelCode}
                                      className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-sm font-medium border-b border-slate-100 last:border-0 flex flex-col"
                                      onClick={() => {
                                        updateRule(index, 'hotelSearchTerm', displayStr);
                                        updateRule(index, 'hotel', h.hotelCode);
                                        setActiveDropdown(null);
                                      }}
                                    >
                                      <span className="font-semibold">{h.hotelName}</span>
                                      <span className="text-xs text-slate-500">{h.hotelCode} • {h.cityName}, {h.countryCode} • {h.starRating} Stars</span>
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                          </div>
                        </div>
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
                            value={rule.starRating ? `${rule.starRating} Star` : ""}
                            onFocus={() => setActiveDropdown({ type: 'starRating', index })}
                            onBlur={() => setTimeout(() => { if(activeDropdown?.type === 'starRating' && activeDropdown?.index === index) setActiveDropdown(null); }, 200)}
                            placeholder="-- Select Star Rating --"
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#003399] bg-white cursor-pointer"
                          />
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                            {activeDropdown?.type === 'starRating' && activeDropdown?.index === index ? <FaChevronUp /> : <FaChevronDown />}
                          </div>
                          {activeDropdown?.type === 'starRating' && activeDropdown?.index === index && (
                            <ul className="absolute left-0 right-0 top-[100%] mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto z-[60]">
                              {[1, 2, 3, 4, 5].map((stars) => (
                                <li
                                  key={`star-${stars}`}
                                  className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-sm font-medium border-b border-slate-100 last:border-0 flex items-center gap-2"
                                  onClick={() => {
                                    updateRule(index, 'starRating', stars);
                                    setActiveDropdown(null);
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
                  case "Domestic Flights":
                  case "International Flights":
                    return (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Flight Type</label>
                        <div className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium bg-slate-50 text-slate-600">
                          {activeCategory}
                        </div>
                      </div>
                    );
                  default:
                    return null;
                }
              })()}
            </div>

            {/* Markup Method */}
            <div className={`col-span-1 ${methodValueColSpan} space-y-2 relative`}>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Markup Method</label>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={(rule.method || 'percentage') === 'percentage' ? 'Percentage (%)' : 'Fixed Amount (₹)'}
                  onFocus={() => setActiveDropdown({ type: 'method', index })}
                  onBlur={() => setTimeout(() => { if(activeDropdown?.type === 'method' && activeDropdown?.index === index) setActiveDropdown(null); }, 200)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#003399] bg-white cursor-pointer"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                  {activeDropdown?.type === 'method' && activeDropdown?.index === index ? <FaChevronUp /> : <FaChevronDown />}
                </div>
                {activeDropdown?.type === 'method' && activeDropdown?.index === index && (
                  <ul className="absolute left-0 right-0 top-[100%] mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-[60]">
                    <li
                      className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-sm font-medium border-b border-slate-100 flex items-center gap-2"
                      onClick={() => {
                        updateRule(index, 'method', 'percentage');
                        setActiveDropdown(null);
                      }}
                    >
                      <FiPercent className="text-slate-400" /> Percentage (%)
                    </li>
                    <li
                      className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-sm font-medium flex items-center gap-2"
                      onClick={() => {
                        updateRule(index, 'method', 'fixed');
                        setActiveDropdown(null);
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
                  placeholder={`Enter ${(rule.method || 'percentage') === 'percentage' ? 'percentage' : 'amount'}...`}
                  value={rule.value || ""}
                  onChange={(e) => updateRule(index, 'value', e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#003399] focus:ring-2 focus:ring-[#003399]/10 bg-white"
                />
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  {(rule.method || 'percentage') === 'percentage' ? <FiPercent size={14} /> : <FaRupeeSign size={14} />}
                </div>
              </div>
            </div>

          </div>
        ))}
        
        {!["Domestic Flights", "International Flights"].includes(activeCategory) && (
          <button
            onClick={addRule}
            className="flex items-center gap-2 text-sm font-bold text-[#003399] hover:text-[#002266] px-4 py-2 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors mt-2"
          >
            <FiPlus /> Add Another {activeCategory} Rule
          </button>
        )}
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
            <button
              onClick={() => navigate(`/corporate-markup-list/${corporate._id}`, { state: { corporate } })}
              className="mt-3 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-[10px] font-bold uppercase tracking-widest text-white flex items-center gap-2 transition-colors"
            >
              <FiList size={14} /> View Configured Markups
            </button>
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
              {selectedCategories.includes("Fare Slab Based") ? "Multiple Slabs" : Object.keys(categoryRulesMap).length > 0 ? `${Object.keys(categoryRulesMap).length} Rules` : "Not Set"}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={() => {
              setCategoryMarkups({});
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
