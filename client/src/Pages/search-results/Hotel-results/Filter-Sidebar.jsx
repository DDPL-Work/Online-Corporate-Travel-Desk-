import React, { useEffect } from "react";
import { FaSearch, FaMapMarkerAlt } from "react-icons/fa";
import { BsStarFill } from "react-icons/bs";
import { useState } from "react";
import MapModal from "./Map/MapModal";
import { FaMapLocation } from "react-icons/fa6";
import { MdExpandMore, MdExpandLess } from "react-icons/md";
import { IoClose } from "react-icons/io5";

const FilterSidebar = ({
  hotels = [],
  filteredHotels = [],
  filters,
  setFilters,
  searchText,
  setSearchText,
}) => {
  const [showMap, setShowMap] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    search: true,
    price: true,
    rating: true,
    meal: true,
    cancellation: true,
    amenities: false,
  });

  const [openLocation, setOpenLocation] = useState(false);

  // Derive unique partial locations (cities/areas) from addresses for suggestions
  const locations = [...new Set(hotels.map((h) => {
    const parts = h.address?.split(',') || [];
    return parts.length > 1 ? parts[parts.length - 2].trim() : parts[0].trim();
  }))].filter(l => l.length > 3);

  const filteredLocations = locations.filter((loc) =>
    loc.toLowerCase().includes((filters.location || "").toLowerCase()),
  );

  // ... (rest of the logic stays similar but we use filteredHotels for Map)

  // Extract cheapest room per hotel
  const hotelData = hotels?.map((hotel) => {
    const cheapestRoom = hotel.Rooms?.reduce((prev, curr) =>
      curr.TotalFare < prev.TotalFare ? curr : prev,
    );

    return {
      price: cheapestRoom?.TotalFare || 0,
      rating: hotel.StarRating ? Math.round(hotel.StarRating) : null,
      meal: cheapestRoom?.MealType || "ROOM ONLY",
      amenities: hotel.Amenities || [],
    };
  });

  // Dynamic price range
  const prices = hotels.map((h) => h.price).filter(Boolean);
  const dynamicMinPrice = prices.length ? Math.min(...prices) : 0;
  const dynamicMaxPrice = prices.length ? Math.max(...prices) : 0;

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      minPrice: dynamicMinPrice,
      maxPrice: dynamicMaxPrice,
    }));
  }, [dynamicMinPrice, dynamicMaxPrice]);

  // Dynamic star ratings with count
  const starCounts = [1, 2, 3, 4, 5].reduce((acc, star) => {
    acc[star] = hotelData.filter((h) => h.rating === star).length;
    return acc;
  }, {});

  // Dynamic meal types
  const mealCounts = hotels.reduce((acc, hotel) => {
    if (!hotel.meal) return acc;
    acc[hotel.meal] = (acc[hotel.meal] || 0) + 1;
    return acc;
  }, {});

  const refundableCounts = hotels.reduce(
    (acc, hotel) => {
      if (hotel.refundable) acc.refundable++;
      else acc.nonRefundable++;
      return acc;
    },
    { refundable: 0, nonRefundable: 0 },
  );

  // Dynamic amenities
  const amenityCounts = hotels.reduce((acc, hotel) => {
    hotel.inclusions?.forEach((item) => {
      const clean = item.trim();
      acc[clean] = (acc[clean] || 0) + 1;
    });
    return acc;
  }, {});

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const clearAllFilters = () => {
    setSearchText("");
    setFilters({
      minPrice: dynamicMinPrice,
      maxPrice: dynamicMaxPrice,
      starRating: [],
      mealType: null,
      refundable: null,
      amenities: [],
      location: "",
    });
  };

  const activeFilterCount =
    filters.starRating.length +
    (filters.mealType ? 1 : 0) +
    (filters.refundable !== null ? 1 : 0) +
    filters.amenities.length +
    (filters.location ? 1 : 0);

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-4 space-y-2 max-h-[calc(100vh-2rem)] overflow-y-auto">
      {/* Header with Clear Button */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Filters</h2>
          {activeFilterCount > 0 && (
            <p className="text-xs text-blue-600 font-medium mt-1">
              {activeFilterCount} active
            </p>
          )}
        </div>
        {activeFilterCount > 0 && (
          <button
            onClick={clearAllFilters}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Search Section */}
      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-100">
        <div className="mb-3">
          <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2">
            Location & Hotel
          </label>

          {/* Name Search */}
          <div className="relative mb-3">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 text-xs" />
            <input
              type="text"
              placeholder="Search hotel name..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 border border-blue-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Location Search with Dropdown */}
          <div className="relative">
            <div className="relative">
              <FaMapMarkerAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 text-xs" />
              <input
                type="text"
                placeholder="Area, landmank or city..."
                value={filters.location}
                onChange={(e) => {
                  setFilters({ ...filters, location: e.target.value });
                  setOpenLocation(true);
                }}
                onFocus={() => setOpenLocation(true)}
                className="w-full pl-9 pr-8 py-2.5 border border-blue-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              {filters.location && (
                <button 
                  onClick={() => setFilters({ ...filters, location: "" })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <IoClose size={14} />
                </button>
              )}
            </div>

            {/* Suggestions Dropdown */}
            {openLocation && filteredLocations.length > 0 && (
              <div className="absolute z-50 mt-1 w-full bg-white border border-gray-100 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                {filteredLocations.map((loc) => (
                  <div
                    key={loc}
                    onClick={() => {
                      setFilters({ ...filters, location: loc });
                      setOpenLocation(false);
                    }}
                    className="flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-blue-50 cursor-pointer text-gray-700"
                  >
                    <FaMapMarkerAlt className="text-blue-300" size={12} />
                    {loc}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Map Button */}
        <button
          onClick={() => setShowMap(true)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 text-sm font-semibold rounded-lg transition shadow-md flex items-center justify-center gap-2 mb-2"
        >
          <FaMapLocation size={14} />
          View on Map
        </button>

        <MapModal
          open={showMap}
          onClose={() => setShowMap(false)}
          hotels={filteredHotels}
        />
      </div>

      {/* Price Filter Section */}
      <FilterSection
        title="Price Range"
        expanded={expandedSections.price}
        onToggle={() => toggleSection("price")}
      >
        <div className="space-y-4">
          {/* Slider */}
          <div className="relative py-4">
            {/* Track */}
            <div className="absolute top-1/2 -translate-y-1/2 w-full h-2 bg-gray-200 rounded-full" />

            {/* Active Range */}
            <div
              className="absolute top-1/2 -translate-y-1/2 h-2 rounded-full bg-gradient-to-r from-[#0d47a1] to-[#1565c0] transition-all duration-200"
              style={{
                left: `${
                  ((filters.minPrice - dynamicMinPrice) /
                    (dynamicMaxPrice - dynamicMinPrice)) *
                  100
                }%`,
                right: `${
                  100 -
                  ((filters.maxPrice - dynamicMinPrice) /
                    (dynamicMaxPrice - dynamicMinPrice)) *
                    100
                }%`,
              }}
            />

            {/* Min */}
            <input
              type="range"
              min={dynamicMinPrice}
              max={dynamicMaxPrice}
              value={filters.minPrice}
              onChange={(e) => {
                const value = Math.min(
                  Number(e.target.value),
                  filters.maxPrice - 500,
                );
                setFilters({ ...filters, minPrice: value });
              }}
              className="absolute w-full appearance-none bg-transparent z-30 range-thumb"
            />

            {/* Max */}
            <input
              type="range"
              min={dynamicMinPrice}
              max={dynamicMaxPrice}
              value={filters.maxPrice}
              onChange={(e) => {
                const value = Math.max(
                  Number(e.target.value),
                  filters.minPrice + 500,
                );
                setFilters({ ...filters, maxPrice: value });
              }}
              className="absolute w-full appearance-none bg-transparent z-20 range-thumb"
            />
          </div>

          {/* Price Display */}
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs text-gray-500 mb-1">From</p>
                <p className="text-sm font-bold text-blue-600">
                  ₹ {filters.minPrice.toLocaleString()}
                </p>
              </div>
              <div className="text-gray-300">→</div>
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-1">To</p>
                <p className="text-sm font-bold text-cyan-600">
                  ₹ {filters.maxPrice.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </FilterSection>

      {/* Star Rating Filter */}
      <FilterSection
        title="Star Rating"
        count={Object.values(starCounts).reduce((a, b) => a + b, 0)}
        expanded={expandedSections.rating}
        onToggle={() => toggleSection("rating")}
      >
        <div className="space-y-2.5">
          {[5, 4, 3, 2, 1].map((stars) => (
            <label
              key={stars}
              className="flex items-center gap-3 p-2.5 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={filters.starRating.includes(stars)}
                onChange={() => {
                  const updated = filters.starRating.includes(stars)
                    ? filters.starRating.filter((r) => r !== stars)
                    : [...filters.starRating, stars];

                  setFilters({ ...filters, starRating: updated });
                }}
              />

              {/* Stars */}
              <div className="flex gap-1">
                {Array.from({ length: stars }).map((_, i) => (
                  <BsStarFill key={i} className="text-amber-400 text-xs" />
                ))}
              </div>

              {/* Label */}
              <span className="text-sm text-gray-700">{stars} Star</span>

              {/* Count */}
              {/* <span className="ml-auto text-xs bg-gray-100 px-2 rounded">
      {starCounts[stars]}
    </span> */}
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Meal Basis Filter */}
      <FilterSection
        title="Meal Basis"
        count={Object.values(mealCounts).reduce((a, b) => a + b, 0)}
        expanded={expandedSections.meal}
        onToggle={() => toggleSection("meal")}
      >
        <div className="space-y-2.5">
          {Object.keys(mealCounts).map((meal) => (
            <label
              key={meal}
              className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <span className="text-sm text-gray-700 font-medium">{meal}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  {mealCounts[meal]}
                </span>
                <input
                  type="checkbox"
                  onChange={() =>
                    setFilters({
                      ...filters,
                      mealType: filters.mealType === meal ? null : meal,
                    })
                  }
                  checked={filters.mealType === meal}
                  className="w-4 h-4 text-blue-500 accent-blue-500 cursor-pointer rounded"
                />
              </div>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Cancellation Filter */}
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
              <p className="text-xs text-gray-500">
                {refundableCounts.refundable} hotels
              </p>
            </div>
            <input
              type="checkbox"
              checked={filters.refundable === true}
              onChange={() =>
                setFilters({
                  ...filters,
                  refundable: filters.refundable === true ? null : true,
                })
              }
              className="w-4 h-4 text-emerald-500 accent-emerald-500 cursor-pointer rounded"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 rounded-lg hover:bg-red-50 cursor-pointer transition-colors border border-transparent hover:border-red-100">
            <div>
              <p className="text-sm font-medium text-gray-700">
                Non-Refundable
              </p>
              <p className="text-xs text-gray-500">
                {refundableCounts.nonRefundable} hotels
              </p>
            </div>
            <input
              type="checkbox"
              checked={filters.refundable === false}
              onChange={() =>
                setFilters({
                  ...filters,
                  refundable: filters.refundable === false ? null : false,
                })
              }
              className="w-4 h-4 text-red-500 accent-red-500 cursor-pointer rounded"
            />
          </label>
        </div>
      </FilterSection>

      {/* Amenities Filter */}
      <FilterSection
        title="Amenities"
        count={Object.keys(amenityCounts).length}
        expanded={expandedSections.amenities}
        onToggle={() => toggleSection("amenities")}
      >
        <div className="space-y-2 max-h-56 overflow-y-auto pr-2">
          {Object.keys(amenityCounts)
            .sort((a, b) => amenityCounts[b] - amenityCounts[a])
            .map((amenity) => (
              <label
                key={amenity}
                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors group"
              >
                <span className="text-sm text-gray-700 group-hover:text-gray-900 truncate">
                  {amenity}
                </span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    {amenityCounts[amenity]}
                  </span>
                  <input
                    type="checkbox"
                    checked={filters.amenities.includes(amenity)}
                    onChange={() => {
                      const updated = filters.amenities.includes(amenity)
                        ? filters.amenities.filter((a) => a !== amenity)
                        : [...filters.amenities, amenity];

                      setFilters({ ...filters, amenities: updated });
                    }}
                    className="w-4 h-4 text-blue-500 accent-blue-500 cursor-pointer rounded flex-shrink-0"
                  />
                </div>
              </label>
            ))}
        </div>
      </FilterSection>

      {/* Footer Info */}
      <div className="pt-4 border-t border-gray-100 mt-6">
        <p className="text-xs text-gray-500 text-center">
          Showing {hotels.length} hotels matching your filters
        </p>
      </div>
    </div>
  );
};

// Reusable Filter Section Component
const FilterSection = ({ title, children, expanded, onToggle, count }) => {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 transition-colors">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3.5 bg-gradient-to-r from-gray-50 to-gray-25 hover:from-gray-100 hover:to-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-gray-900">{title}</h3>
          {count && (
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              {count}
            </span>
          )}
        </div>
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
};

export default FilterSidebar;
