import React from "react";
import { FaSearch, FaMapMarkerAlt } from "react-icons/fa";
import { BsStarFill } from "react-icons/bs";
import { useState } from "react";
import MapModal from "./Map/MapModal";
import { FaMapLocation } from "react-icons/fa6";

const FilterSidebar = ({
  hotels = [],
  filters,
  setFilters,
  searchText,
  setSearchText,
}) => {
  const [showMap, setShowMap] = useState(false);

  // Extract cheapest room per hotel

  const hotelData = hotels?.map((hotel) => {
    const cheapestRoom = hotel.Rooms?.reduce((prev, curr) =>
      curr.TotalFare < prev.TotalFare ? curr : prev,
    );

    return {
      price: cheapestRoom?.TotalFare || 0,
      rating: hotel.StarRating || 0,
      meal: cheapestRoom?.MealType || "ROOM ONLY",
      amenities: hotel.Amenities || [],
    };
  });

  // Dynamic price range
  const prices = hotels.map((h) => h.price).filter(Boolean);
  const dynamicMinPrice = prices.length ? Math.min(...prices) : 0;
  const dynamicMaxPrice = prices.length ? Math.max(...prices) : 0;

  // Dynamic star ratings with count
  const starCounts = hotelData.reduce((acc, hotel) => {
    const star = hotel.rating;
    if (!star) return acc;
    acc[star] = (acc[star] || 0) + 1;
    return acc;
  }, {});

  // Dynamic meal types
  const mealCounts = hotels.reduce((acc, hotel) => {
    if (!hotel.meal) return acc;
    acc[hotel.meal] = (acc[hotel.meal] || 0) + 1;
    return acc;
  }, {});

  // Dynamic property types
  const propertyCounts = hotels.reduce((acc, hotel) => {
    const type = hotel.PropertyType || "Hotel";
    acc[type] = (acc[type] || 0) + 1;
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

  const handlePriceChange = (type, value) => {
    setFilters({
      ...filters,
      [type]: parseInt(value),
    });
  };

  const toggleStarRating = (stars) => {
    const currentRatings = [...filters.starRating];
    const index = currentRatings.indexOf(stars);

    if (index > -1) {
      currentRatings.splice(index, 1);
    } else {
      currentRatings.push(stars);
    }

    setFilters({
      ...filters,
      starRating: currentRatings,
    });
  };

  const renderStars = (count) => {
    const stars = [];
    for (let i = 0; i < count; i++) {
      stars.push(<BsStarFill key={i} className="text-orange-500" />);
    }
    return stars;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
      {/* Map Search */}
      <div className="mb-6">
        <div className="relative">
          <div className=" mb-6 rounded-lg overflow-hidden">
            {/* Overlay */}
            <button
              onClick={() => setShowMap(true)}
              className="bg-blue-500 hover:bg-blue-600 flex items-center gap-2 cursor-pointer text-white px-3 py-1 text-sm rounded font-normal transition"
            >
              SEARCH ON MAP <FaMapLocation />
            </button>
          </div>

          <MapModal
            open={showMap}
            onClose={() => setShowMap(false)}
            hotels={hotels}
          />
        </div>
      </div>

      {/* Price Filter */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800">Price</h3>
          <button className="text-gray-600">−</button>
        </div>

        <div className="mb-4">
          <input
            type="range"
            min={dynamicMinPrice}
            max={dynamicMaxPrice}
            value={filters.maxPrice}
            onChange={(e) => handlePriceChange("maxPrice", e.target.value)}
            className="w-full h-2 bg-blue-500 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(
    to right,
    #2563eb 0%,
    #2563eb ${
      ((filters.maxPrice - dynamicMinPrice) /
        (dynamicMaxPrice - dynamicMinPrice)) *
      100
    }%,
    #e5e7eb ${
      ((filters.maxPrice - dynamicMinPrice) /
        (dynamicMaxPrice - dynamicMinPrice)) *
      100
    }%,
    #e5e7eb 100%
  )`,
            }}
          />
        </div>

        <div className="flex justify-between text-sm text-blue-700 mb-4">
          <span>₹ {filters.minPrice.toLocaleString()}</span>
          <span>₹ {filters.maxPrice.toLocaleString()}</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-600 mb-1 block">
              Minimum Price
            </label>
            <input
              type="text"
              value={`₹ ${filters.minPrice}`}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600 mb-1 block">
              Maximum Price
            </label>
            <input
              type="text"
              value={`₹ ${filters.maxPrice}`}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            />
          </div>
        </div>
      </div>

      {/* Star Rating Filter */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800">Star Rating</h3>
          <button className="text-gray-600">−</button>
        </div>

        <div className="space-y-3">
          {Object.keys(starCounts)
            .sort((a, b) => b - a)
            .map((stars) => (
              <label
                key={stars}
                className="flex items-center gap-3 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={filters.starRating.includes(stars)}
                  onChange={() => toggleStarRating(stars)}
                  className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
                />
                <div className="flex gap-1">{renderStars(Number(stars))}</div>
                <span className="text-gray-500 text-xs">
                  ({starCounts[stars]})
                </span>
              </label>
            ))}
        </div>
      </div>

      {/* Meal Basis Filter */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800">Meal Basis</h3>
          <button className="text-gray-600">−</button>
        </div>

        <div className="space-y-3">
          {Object.keys(mealCounts).map((meal) => (
            <label
              key={meal}
              className="flex items-center justify-between cursor-pointer"
            >
              <span className="text-gray-700">
                {meal}{" "}
                <span className="text-gray-500">({mealCounts[meal]})</span>
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
                className="w-4 h-4 text-blue-500 border-gray-300 rounded"
              />
            </label>
          ))}
        </div>
      </div>

      {/* Property Type Filter */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800">Property Type</h3>
          <button className="text-gray-600">−</button>
        </div>

        <div className="space-y-3">
          {Object.keys(propertyCounts).map((type) => (
            <label
              key={type}
              className="flex items-center justify-between cursor-pointer"
            >
              <span className="text-gray-700">
                {type}{" "}
                <span className="text-gray-500">({propertyCounts[type]})</span>
              </span>

              <input
                type="checkbox"
                checked={filters.propertyType.includes(type)}
                onChange={() => {
                  const updated = filters.propertyType.includes(type)
                    ? filters.propertyType.filter((t) => t !== type)
                    : [...filters.propertyType, type];

                  setFilters({ ...filters, propertyType: updated });
                }}
                className="w-4 h-4 text-blue-500 border-gray-300 rounded"
              />
            </label>
          ))}
        </div>
      </div>

      <div className="mb-6 pb-6 border-b">
        <h3 className="font-semibold mb-3">Cancellation</h3>

        <label className="flex justify-between cursor-pointer">
          <span>Free Cancellation ({refundableCounts.refundable})</span>
          <input
            type="checkbox"
            checked={filters.refundable === true}
            onChange={() =>
              setFilters({
                ...filters,
                refundable: filters.refundable === true ? null : true,
              })
            }
          />
        </label>

        <label className="flex justify-between cursor-pointer">
          <span>Non-Refundable ({refundableCounts.nonRefundable})</span>
          <input
            type="checkbox"
            checked={filters.refundable === false}
            onChange={() =>
              setFilters({
                ...filters,
                refundable: filters.refundable === false ? null : false,
              })
            }
          />
        </label>
      </div>

      {/* User Rating Filter */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800">User Rating</h3>
          <button className="text-gray-600">−</button>
        </div>

        <div className="space-y-3">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-gray-700">
              Excellent 4.5+ <span className="text-gray-500">(45)</span>
            </span>
            <input
              type="checkbox"
              className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-gray-700">
              Very Good 4+ <span className="text-gray-500">(120)</span>
            </span>
            <input
              type="checkbox"
              className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-gray-700">
              Good 3.5+ <span className="text-gray-500">(180)</span>
            </span>
            <input
              type="checkbox"
              className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-gray-700">
              Pleasant 3+ <span className="text-gray-500">(95)</span>
            </span>
            <input
              type="checkbox"
              className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
            />
          </label>
        </div>
      </div>

      {/* Amenities Filter */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800">Amenities</h3>
          <button className="text-gray-600">−</button>
        </div>

        <div className="space-y-3 max-h-48 overflow-y-auto">
          {Object.keys(amenityCounts).map((amenity) => (
            <label
              key={amenity}
              className="flex items-center justify-between cursor-pointer"
            >
              <span className="text-gray-700 text-sm">
                {amenity}{" "}
                <span className="text-gray-500">
                  ({amenityCounts[amenity]})
                </span>
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
                className="w-4 h-4 text-blue-500 border-gray-300 rounded"
              />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FilterSidebar;
