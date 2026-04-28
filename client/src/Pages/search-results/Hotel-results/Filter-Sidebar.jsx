import React, { useEffect } from "react";
import { FaSearch, FaMapMarkerAlt } from "react-icons/fa";
import { BsStarFill } from "react-icons/bs";
import { useState } from "react";
import MapModal from "./Map/MapModal";
import { FaMapLocation } from "react-icons/fa6";
import { MdExpandMore, MdExpandLess } from "react-icons/md";
import { IoClose } from "react-icons/io5";

/* ─── Color Tokens ─── */
const ORANGE = "#C9A84C";
const DARK   = "#000D26";
const AZURE  = "#1E293B";

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

  const locations = [...new Set(hotels.map((h) => {
    const parts = h.address?.split(',') || [];
    return parts.length > 1 ? parts[parts.length - 2].trim() : parts[0].trim();
  }))].filter(l => l.length > 3);

  const filteredLocations = locations.filter((loc) =>
    loc.toLowerCase().includes((filters.location || "").toLowerCase()),
  );

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

  const prices = hotels.map((h) => h.price).filter(Boolean);
  const dynamicMinPrice = prices.length ? Math.min(...prices) : 0;
  const dynamicMaxPrice = prices.length ? Math.max(...prices) : 0;

  useEffect(() => {
    setFilters((prev) => ({ ...prev, minPrice: dynamicMinPrice, maxPrice: dynamicMaxPrice }));
  }, [dynamicMinPrice, dynamicMaxPrice]);

  const starCounts = [1, 2, 3, 4, 5].reduce((acc, star) => {
    acc[star] = hotelData.filter((h) => h.rating === star).length;
    return acc;
  }, {});

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

  const amenityCounts = hotels.reduce((acc, hotel) => {
    hotel.inclusions?.forEach((item) => {
      const clean = item.trim();
      acc[clean] = (acc[clean] || 0) + 1;
    });
    return acc;
  }, {});

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const clearAllFilters = () => {
    setSearchText("");
    setFilters({ minPrice: dynamicMinPrice, maxPrice: dynamicMaxPrice, starRating: [], mealType: null, refundable: null, amenities: [], location: "" });
  };

  const activeFilterCount =
    filters.starRating.length +
    (filters.mealType ? 1 : 0) +
    (filters.refundable !== null ? 1 : 0) +
    filters.amenities.length +
    (filters.location ? 1 : 0);

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-4 space-y-2 max-h-[calc(100vh-2rem)] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
        <h2 className="text-lg font-bold" style={{ color: AZURE }}>Filters</h2>
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

      {/* Search Section */}
      <div className="rounded-xl p-4 border" style={{ background: `${ORANGE}08`, borderColor: `${ORANGE}30` }}>
        <div className="mb-3">
          <label className="text-xs font-bold uppercase tracking-wider block mb-2" style={{ color: AZURE }}>
            Location &amp; Hotel
          </label>

          {/* Name Search */}
          <div className="relative mb-3">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: ORANGE }} />
            <input
              type="text"
              placeholder="Search hotel name..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2"
              style={{ borderColor: `${ORANGE}40`, outlineColor: ORANGE }}
              onFocus={e => e.target.style.boxShadow = `0 0 0 2px ${ORANGE}40`}
              onBlur={e => e.target.style.boxShadow = "none"}
            />
          </div>

          {/* Location Search */}
          <div className="relative">
            <div className="relative">
              <FaMapMarkerAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: ORANGE }} />
              <input
                type="text"
                placeholder="Area, landmark or city..."
                value={filters.location}
                onChange={(e) => { setFilters({ ...filters, location: e.target.value }); setOpenLocation(true); }}
                onFocus={() => setOpenLocation(true)}
                className="w-full pl-9 pr-8 py-2.5 border rounded-lg text-sm bg-white focus:outline-none"
                style={{ borderColor: `${ORANGE}40` }}
              />
              {filters.location && (
                <button onClick={() => setFilters({ ...filters, location: "" })} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <IoClose size={14} />
                </button>
              )}
            </div>
            {openLocation && filteredLocations.length > 0 && (
              <div className="absolute z-50 mt-1 w-full bg-white border border-gray-100 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                {filteredLocations.map((loc) => (
                  <div key={loc} onClick={() => { setFilters({ ...filters, location: loc }); setOpenLocation(false); }} className="flex items-center gap-2 px-3 py-2.5 text-sm cursor-pointer text-gray-700" style={{ hover: { background: `${ORANGE}10` } }} onMouseEnter={e => e.currentTarget.style.background = `${ORANGE}10`} onMouseLeave={e => e.currentTarget.style.background = ""}>
                    <FaMapMarkerAlt style={{ color: ORANGE }} size={12} />
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
          className="w-full px-4 py-2.5 text-sm font-semibold rounded-lg transition shadow-md flex items-center justify-center gap-2 mb-2 hover:brightness-110 active:scale-95"
          style={{ background: AZURE, color: "#fff" }}
        >
          <FaMapLocation size={14} />
          View on Map
        </button>

        <MapModal open={showMap} onClose={() => setShowMap(false)} hotels={filteredHotels} />
      </div>

      {/* Price Filter */}
      <FilterSection title="Price Range" expanded={expandedSections.price} onToggle={() => toggleSection("price")}>
        <div className="space-y-4">
          <div className="relative py-4">
            <div className="absolute top-1/2 -translate-y-1/2 w-full h-2 bg-gray-200 rounded-full" />
            <div
              className="absolute top-1/2 -translate-y-1/2 h-2 rounded-full transition-all duration-200"
              style={{
                background: `linear-gradient(to right, ${AZURE}, ${ORANGE})`,
                left: `${((filters.minPrice - dynamicMinPrice) / (dynamicMaxPrice - dynamicMinPrice)) * 100}%`,
                right: `${100 - ((filters.maxPrice - dynamicMinPrice) / (dynamicMaxPrice - dynamicMinPrice)) * 100}%`,
              }}
            />
            <input type="range" min={dynamicMinPrice} max={dynamicMaxPrice} value={filters.minPrice}
              onChange={(e) => { const value = Math.min(Number(e.target.value), filters.maxPrice - 500); setFilters({ ...filters, minPrice: value }); }}
              className="absolute w-full appearance-none bg-transparent z-30 range-thumb" />
            <input type="range" min={dynamicMinPrice} max={dynamicMaxPrice} value={filters.maxPrice}
              onChange={(e) => { const value = Math.max(Number(e.target.value), filters.minPrice + 500); setFilters({ ...filters, maxPrice: value }); }}
              className="absolute w-full appearance-none bg-transparent z-20 range-thumb" />
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs text-gray-500 mb-1">From</p>
                <p className="text-sm font-bold" style={{ color: AZURE }}>₹ {filters.minPrice.toLocaleString()}</p>
              </div>
              <div className="text-gray-300">→</div>
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-1">To</p>
                <p className="text-sm font-bold" style={{ color: ORANGE }}>₹ {filters.maxPrice.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </FilterSection>

      {/* Star Rating */}
      <FilterSection title="Star Rating" expanded={expandedSections.rating} onToggle={() => toggleSection("rating")}>
        <div className="space-y-2.5">
          {[5, 4, 3, 2, 1].map((stars) => (
            <label key={stars} className="flex items-center gap-3 p-2.5 cursor-pointer rounded-lg hover:bg-amber-50 transition-colors">
              <input type="checkbox" checked={filters.starRating.includes(stars)} onChange={() => {
                const updated = filters.starRating.includes(stars) ? filters.starRating.filter((r) => r !== stars) : [...filters.starRating, stars];
                setFilters({ ...filters, starRating: updated });
              }} style={{ accentColor: ORANGE }} />
              <div className="flex gap-1">{Array.from({ length: stars }).map((_, i) => (<BsStarFill key={i} className="text-amber-400 text-xs" />))}</div>
              <span className="text-sm text-gray-700">{stars} Star</span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Meal Basis */}
      <FilterSection title="Meal Basis" expanded={expandedSections.meal} onToggle={() => toggleSection("meal")}>
        <div className="space-y-2.5">
          {Object.keys(mealCounts).map((meal) => (
            <label key={meal} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-amber-50 cursor-pointer transition-colors">
              <span className="text-sm text-gray-700 font-medium">{meal}</span>
              <input type="checkbox" onChange={() => setFilters({ ...filters, mealType: filters.mealType === meal ? null : meal })} checked={filters.mealType === meal} className="w-4 h-4 cursor-pointer rounded" style={{ accentColor: ORANGE }} />
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Cancellation */}
      <FilterSection title="Cancellation" expanded={expandedSections.cancellation} onToggle={() => toggleSection("cancellation")}>
        <div className="space-y-2.5">
          <label className="flex items-center justify-between p-2.5 rounded-lg hover:bg-emerald-50 cursor-pointer transition-colors border border-transparent hover:border-emerald-100">
            <p className="text-sm font-medium text-gray-700">Free Cancellation</p>
            <input type="checkbox" checked={filters.refundable === true} onChange={() => setFilters({ ...filters, refundable: filters.refundable === true ? null : true })} className="w-4 h-4 cursor-pointer rounded" style={{ accentColor: "#10b981" }} />
          </label>
          <label className="flex items-center justify-between p-2.5 rounded-lg hover:bg-red-50 cursor-pointer transition-colors border border-transparent hover:border-red-100">
            <p className="text-sm font-medium text-gray-700">Non-Refundable</p>
            <input type="checkbox" checked={filters.refundable === false} onChange={() => setFilters({ ...filters, refundable: filters.refundable === false ? null : false })} className="w-4 h-4 cursor-pointer rounded" style={{ accentColor: "#ef4444" }} />
          </label>
        </div>
      </FilterSection>


    </div>
  );
};

/* Reusable Filter Section */
const FilterSection = ({ title, children, expanded, onToggle, count }) => {
  const ORANGE = "#C9A84C";
  const AZURE  = "#1E293B";
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 transition-colors">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3.5 bg-gradient-to-r from-gray-50 to-white hover:from-amber-50 hover:to-white transition-colors">
        <h3 className="text-sm font-bold" style={{ color: AZURE }}>{title}</h3>
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
