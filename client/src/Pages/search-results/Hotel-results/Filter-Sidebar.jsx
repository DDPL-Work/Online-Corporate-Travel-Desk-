import React, { useMemo, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { FaSearch, FaMapMarkerAlt } from "react-icons/fa";
import { BsStarFill } from "react-icons/bs";
import { MdExpandLess, MdExpandMore } from "react-icons/md";
import { IoClose } from "react-icons/io5";
import MapModal from "./Map/MapModal";
import axios from "axios";
import { useLocationIntelligence } from "../../../hooks/useLocationIntelligence";

const ORANGE = "#C9A84C";
const DARK = "#000D26";
const AZURE = "#1E293B";

const DEFAULT_FILTERS = {
  minPrice: null,
  maxPrice: null,
  starRating: [],
  mealType: null,
  location: "",
  amenities: [],
  refundable: null,
};

const toSafeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const FilterSidebar = ({
  hotels = [],
  filterMeta,
  filters,
  setFilters,
  searchText,
  setSearchText,
  mapSearchPayload,
  loading,
  pagination,
  selectedLocation,
  setSelectedLocation,
}) => {
  const inputRef = useRef(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const [showMap, setShowMap] = useState(false);
  const [openLocation, setOpenLocation] = useState(false);

  const cityName = mapSearchPayload?.CityName || "";
  
  const { 
    query: locationQuery, 
    setQuery: setLocationQuery, 
    results: nominatimResults, 
    loading: searching,
    clearResults
  } = useLocationIntelligence(cityName);
  const [expandedSections, setExpandedSections] = useState({
    search: true,
    price: true,
    rating: true,
    meal: true,
    cancellation: true,
    amenities: true,
  });

  const currentFilters = {
    ...DEFAULT_FILTERS,
    ...(filters || {}),
    minPrice: filters?.minPrice ?? null,
    maxPrice: filters?.maxPrice ?? null,
    starRating: Array.isArray(filters?.starRating) ? filters.starRating : [],
    mealType:
      typeof filters?.mealType === "string" && filters.mealType.trim()
        ? filters.mealType
        : null,
    location: typeof filters?.location === "string" ? filters.location : "",
    amenities: Array.isArray(filters?.amenities) ? filters.amenities : [],
    refundable:
      typeof filters?.refundable === "boolean" ? filters.refundable : null,
  };
  const dynamicMinPrice = toSafeNumber(filterMeta?.priceRange?.min, 0);
  const dynamicMaxPrice = Math.max(
    toSafeNumber(filterMeta?.priceRange?.max, dynamicMinPrice),
    dynamicMinPrice,
  );
  const sliderMax = Math.max(dynamicMaxPrice, dynamicMinPrice + 500);
  const priceSpread = Math.max(1, sliderMax - dynamicMinPrice);
  const selectedMinPrice = Math.min(
    Math.max(
      currentFilters.minPrice === null
        ? dynamicMinPrice
        : toSafeNumber(currentFilters.minPrice, dynamicMinPrice),
      dynamicMinPrice,
    ),
    sliderMax - 500,
  );
  const selectedMaxPrice = Math.max(
    Math.min(
      currentFilters.maxPrice === null
        ? sliderMax
        : toSafeNumber(currentFilters.maxPrice, sliderMax),
      sliderMax,
    ),
    selectedMinPrice + 500,
  );
  const formatPrice = (value) => toSafeNumber(Math.round(value), 0).toLocaleString();

  // Unused local locations logic removed in favor of professional Intelligence System

  const clearAllFilters = () => {
    setSearchText("");
    setFilters({ ...DEFAULT_FILTERS });
    setSelectedLocation(null);
  };

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const activeFilterCount =
    currentFilters.starRating.length +
    (currentFilters.mealType ? 1 : 0) +
    (currentFilters.refundable !== null ? 1 : 0) +
    currentFilters.amenities.length +
    (currentFilters.location ? 1 : 0) +
    (searchText ? 1 : 0) +
    (selectedMinPrice > dynamicMinPrice ? 1 : 0) +
    (selectedMaxPrice < sliderMax ? 1 : 0) +
    (selectedLocation ? 1 : 0);

  // Fallback local locations from database
  const localLocations = useMemo(
    () =>
      (filterMeta?.locations || [])
        .map((item) => item?.value)
        .filter((value) => typeof value === "string" && value.trim()),
    [filterMeta?.locations],
  );

  const filteredLocalLocations = useMemo(() => {
    const q = (filters.location || "").trim().toLowerCase();
    return q ? localLocations.filter(loc => loc.toLowerCase().includes(q)) : [];
  }, [localLocations, filters.location]);

  const selectPlace = (place) => {
    const locationData = {
      lat: place.lat,
      lng: place.lng,
      name: place.name,
    };
    setSelectedLocation(locationData);
    setFilters({ ...currentFilters, location: place.name });
    clearResults();
    setOpenLocation(false);
  };

  // Update dropdown position on scroll or resize
  useEffect(() => {
    const updatePos = () => {
      if (inputRef.current) {
        const rect = inputRef.current.getBoundingClientRect();
        setDropdownPos({
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
        });
      }
    };

    if (openLocation) {
      updatePos();
      window.addEventListener("scroll", updatePos, true);
      window.addEventListener("resize", updatePos);
    }
    return () => {
      window.removeEventListener("scroll", updatePos, true);
      window.removeEventListener("resize", updatePos);
    };
  }, [openLocation]);

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-4 space-y-2 max-h-[calc(100vh-2rem)] overflow-y-auto">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
        <h2 className="text-lg font-bold" style={{ color: AZURE }}>
          Filters
        </h2>
        {activeFilterCount > 0 && (
          <button
            onClick={clearAllFilters}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors hover:brightness-90"
            style={{ color: DARK, background: `${ORANGE}20` }}
          >
            Clear All
          </button>
        )}
      </div>

      <div
        className="rounded-xl p-4 border"
        style={{ background: `${ORANGE}08`, borderColor: `${ORANGE}30` }}
      >
        <div className="mb-3">
          <label
            className="text-xs font-bold uppercase tracking-wider block mb-2"
            style={{ color: AZURE }}
          >
            Location and Hotel
          </label>

          <div className="relative mb-3">
            <FaSearch
              className="absolute left-3 top-1/2 -translate-y-1/2 text-xs"
              style={{ color: ORANGE }}
            />
            <input
              type="text"
              placeholder="Search hotel name..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2"
              style={{ borderColor: `${ORANGE}40`, outlineColor: ORANGE }}
            />
          </div>

            <div className="relative">
              <FaMapMarkerAlt
                className="absolute left-3 top-1/2 -translate-y-1/2 text-xs z-10"
                style={{ color: ORANGE }}
              />
              <input
                ref={inputRef}
                type="text"
                placeholder={`Search areas in ${cityName || 'city'}...`}
                value={filters.location}
                onChange={(e) => {
                  const value = e.target.value;
                  setFilters({ ...currentFilters, location: value });
                  setLocationQuery(value);
                  setOpenLocation(Boolean(value.trim()));
                  setSelectedLocation(null); // Revert to text search on manual type
                }}
                onFocus={() => setOpenLocation(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.preventDefault();
                }}
                className="w-full pl-9 pr-8 py-2.5 border rounded-xl text-sm bg-white focus:outline-none focus:ring-2"
                style={{
                  borderColor: DARK,
                  outlineColor: ORANGE,
                  borderWidth: "2px",
                }}
              />
              {searching && (
                <div className="absolute right-10 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
              {currentFilters.location && (
                <button
                  onClick={() => {
                    setFilters({ ...currentFilters, location: "" });
                    setSelectedLocation(null);
                    clearResults();
                    setOpenLocation(false);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10 p-1"
                >
                  <IoClose size={14} />
                </button>
              )}
            </div>

            {/* Combined Dropdown for Nominatim and Local Areas using Portal */}
            {(nominatimResults.length > 0 || (openLocation && filteredLocalLocations.length > 0) || (searching && locationQuery.length >= 2)) &&
              createPortal(
                <div
                  className="bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden pointer-events-auto"
                  style={{
                    position: "absolute",
                    top: dropdownPos.top + 4,
                    left: dropdownPos.left,
                    width: dropdownPos.width,
                    zIndex: 99999,
                    maxHeight: "320px",
                    overflowY: "auto",
                  }}
                >
                  {searching && (
                    <div className="px-4 py-3 flex items-center gap-3 bg-slate-50 border-b border-slate-100">
                      <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs text-slate-500 font-medium">Searching for "{locationQuery}"...</span>
                    </div>
                  )}

                  {/* Category: Smart Suggestions (OSM) */}
                  {nominatimResults.map((place) => (
                    <div
                      key={place.id}
                      onClick={() => selectPlace(place)}
                      className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-amber-50 border-b border-slate-50 transition-colors"
                    >
                      <FaMapMarkerAlt className="mt-1 shrink-0" style={{ color: ORANGE }} size={14} />
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-800 line-clamp-1">
                          {place.name}
                        </span>
                        <span className="text-[10px] text-slate-400 line-clamp-1">
                          {place.fullName}
                        </span>
                      </div>
                    </div>
                  ))}

                  {/* Category: Verified Localities (Database) */}
                  {filteredLocalLocations.length > 0 && (
                    <>
                      <div className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 border-y border-slate-100">
                        Available Hotel Localities
                      </div>
                      {filteredLocalLocations.map((location) => (
                        <div
                          key={location}
                          onClick={() => {
                            setFilters({ ...currentFilters, location });
                            setOpenLocation(false);
                            setSelectedLocation(null);
                            clearResults();
                          }}
                          className="flex items-center gap-3 px-4 py-3 text-sm cursor-pointer text-slate-700 hover:bg-amber-50 transition-colors"
                        >
                          <FaMapMarkerAlt
                            style={{ color: ORANGE }}
                            size={12}
                            className="shrink-0"
                          />
                          {location}
                        </div>
                      ))}
                    </>
                  )}

                  {/* No Results Message */}
                  {nominatimResults.length === 0 &&
                    (!openLocation || filteredLocalLocations.length === 0) &&
                    locationQuery.length >= 2 &&
                    !searching && (
                      <div className="px-4 py-6 text-center">
                        <p className="text-sm text-slate-500">No locations found for "{locationQuery}"</p>
                        <p className="text-[10px] text-slate-400 mt-1">Try a different area or landmark</p>
                      </div>
                    )}
                </div>,
                document.body
              )}
          </div>
        {/* End of mb-3 */}

        <button
          onClick={() => setShowMap(true)}
          className="w-full px-4 py-2.5 text-sm font-semibold rounded-lg transition shadow-md flex items-center justify-center gap-2 mb-2 hover:brightness-110 active:scale-95"
          style={{ background: AZURE, color: "#fff" }}
        >
          <FaMapMarkerAlt size={14} />
          View on Map
        </button>

        <MapModal
          open={showMap}
          onClose={() => setShowMap(false)}
          hotels={hotels}
          searchPayload={mapSearchPayload}
          mapLoading={loading?.search || loading?.loadMore}
          mapPagination={pagination}
        />
      </div>

      <FilterSection
        title="Price Range"
        expanded={expandedSections.price}
        onToggle={() => toggleSection("price")}
      >
        <div className="space-y-4">
          <div className="relative py-4">
            <div className="absolute top-1/2 -translate-y-1/2 w-full h-2 bg-gray-200 rounded-full" />
            <div
              className="absolute top-1/2 -translate-y-1/2 h-2 rounded-full transition-all duration-200"
              style={{
                background: `linear-gradient(to right, ${AZURE}, ${ORANGE})`,
                left: `${((selectedMinPrice - dynamicMinPrice) / priceSpread) * 100}%`,
                right: `${100 - ((selectedMaxPrice - dynamicMinPrice) / priceSpread) * 100}%`,
              }}
            />
            <input
              type="range"
              min={dynamicMinPrice}
              max={sliderMax}
              value={selectedMinPrice}
              onChange={(e) => {
                const value = Math.min(
                  Number(e.target.value),
                  selectedMaxPrice - 500,
                );
                setFilters({ ...currentFilters, minPrice: value });
              }}
              className="absolute w-full appearance-none bg-transparent z-30 range-thumb"
            />
            <input
              type="range"
              min={dynamicMinPrice}
              max={sliderMax}
              value={selectedMaxPrice}
              onChange={(e) => {
                const value = Math.max(
                  Number(e.target.value),
                  selectedMinPrice + 500,
                );
                setFilters({ ...currentFilters, maxPrice: value });
              }}
              className="absolute w-full appearance-none bg-transparent z-20 range-thumb"
            />
          </div>

          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs text-gray-500 mb-1">From</p>
                <p className="text-sm font-bold" style={{ color: AZURE }}>
                  Rs {formatPrice(selectedMinPrice)}
                </p>
              </div>
              <div className="text-gray-300">to</div>
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-1">To</p>
                <p className="text-sm font-bold" style={{ color: ORANGE }}>
                  Rs {formatPrice(selectedMaxPrice)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </FilterSection>

      <FilterSection
        title="Star Rating"
        expanded={expandedSections.rating}
        onToggle={() => toggleSection("rating")}
      >
        <div className="space-y-2.5">
          {[5, 4, 3, 2, 1].map((stars) => (
            <label
              key={stars}
              className="flex items-center justify-between gap-3 p-2.5 cursor-pointer rounded-lg hover:bg-amber-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={currentFilters.starRating.includes(stars)}
                  onChange={() => {
                    const updated = currentFilters.starRating.includes(stars)
                      ? currentFilters.starRating.filter((rating) => rating !== stars)
                      : [...currentFilters.starRating, stars];
                    setFilters({ ...currentFilters, starRating: updated });
                  }}
                  style={{ accentColor: ORANGE }}
                />
                <div className="flex gap-1">
                  {Array.from({ length: stars }).map((_, index) => (
                    <BsStarFill
                      key={`${stars}-${index}`}
                      className="text-amber-400 text-xs"
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-700">{stars} Star</span>
              </div>
            </label>
          ))}
        </div>
      </FilterSection>

      <FilterSection
        title="Meal Basis"
        expanded={expandedSections.meal}
        onToggle={() => toggleSection("meal")}
      >
        <div className="space-y-2.5">
          {(filterMeta?.mealTypes || []).map((meal) => (
            <label
              key={meal.value}
              className="flex items-center justify-between p-2.5 rounded-lg hover:bg-amber-50 cursor-pointer transition-colors"
            >
              <span className="text-sm text-gray-700 font-medium">
                {meal.value}
              </span>
              <input
                type="checkbox"
                onChange={() =>
                  setFilters({
                    ...currentFilters,
                    mealType:
                      currentFilters.mealType === meal.value ? null : meal.value,
                  })
                }
                checked={currentFilters.mealType === meal.value}
                className="w-4 h-4 cursor-pointer rounded"
                style={{ accentColor: ORANGE }}
              />
            </label>
          ))}
        </div>
      </FilterSection>

      <FilterSection
        title="Cancellation"
        expanded={expandedSections.cancellation}
        onToggle={() => toggleSection("cancellation")}
      >
        <div className="space-y-2.5">
          <label className="flex items-center justify-between p-2.5 rounded-lg hover:bg-emerald-50 cursor-pointer transition-colors border border-transparent hover:border-emerald-100">
            <div>
              <p className="text-sm font-medium text-gray-700">
                Free Cancellation
              </p>
            </div>
            <input
              type="checkbox"
              checked={currentFilters.refundable === true}
              onChange={() =>
                setFilters({
                  ...currentFilters,
                  refundable: currentFilters.refundable === true ? null : true,
                })
              }
              className="w-4 h-4 cursor-pointer rounded"
              style={{ accentColor: "#10b981" }}
            />
          </label>
          <label className="flex items-center justify-between p-2.5 rounded-lg hover:bg-red-50 cursor-pointer transition-colors border border-transparent hover:border-red-100">
            <div>
              <p className="text-sm font-medium text-gray-700">Non-Refundable</p>
            </div>
            <input
              type="checkbox"
              checked={currentFilters.refundable === false}
              onChange={() =>
                setFilters({
                  ...currentFilters,
                  refundable: currentFilters.refundable === false ? null : false,
                })
              }
              className="w-4 h-4 cursor-pointer rounded"
              style={{ accentColor: "#ef4444" }}
            />
          </label>
        </div>
      </FilterSection>

      {/* <FilterSection
        title="Amenities"
        expanded={expandedSections.amenities}
        onToggle={() => toggleSection("amenities")}
      >
        <div className="space-y-2.5">
          {(filterMeta?.amenities || []).map((amenity) => (
            <label
              key={amenity.value}
              className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
            >
              <div className="pr-3">
                <span className="text-sm text-gray-700 font-medium">
                  {amenity.value}
                </span>
              </div>
              <input
                type="checkbox"
                checked={currentFilters.amenities.includes(amenity.value)}
                onChange={() => {
                  const updated = currentFilters.amenities.includes(amenity.value)
                    ? currentFilters.amenities.filter((item) => item !== amenity.value)
                    : [...currentFilters.amenities, amenity.value];
                  setFilters({ ...currentFilters, amenities: updated });
                }}
                className="w-4 h-4 cursor-pointer rounded"
                style={{ accentColor: ORANGE }}
              />
            </label>
          ))}
        </div>
      </FilterSection> */}
    </div>
  );
};

const FilterSection = ({ title, children, expanded, onToggle }) => (
  <div className="border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 transition-colors">
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-4 py-3.5 bg-gradient-to-r from-gray-50 to-white hover:from-amber-50 hover:to-white transition-colors"
    >
      <h3 className="text-sm font-bold" style={{ color: AZURE }}>
        {title}
      </h3>
      <span className="text-gray-500 transition-transform duration-200">
        {expanded ? <MdExpandLess size={20} /> : <MdExpandMore size={20} />}
      </span>
    </button>
    {expanded && (
      <div className="px-4 py-4 bg-white border-t border-gray-100 animate-in fade-in duration-200">
        {children}
      </div>
    )}
  </div>
);

export default FilterSidebar;
