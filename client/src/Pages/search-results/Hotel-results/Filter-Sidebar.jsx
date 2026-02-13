import React from "react";
import { FaSearch, FaMapMarkerAlt } from "react-icons/fa";
import { BsStarFill } from "react-icons/bs";
import { useState } from "react";
import MapModal from "./Map/MapModal";
import MapPreview from "./Map/MapPreview";

const FilterSidebar = ({ filters, setFilters }) => {
  const [showMap, setShowMap] = useState(false);

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
          <MapPreview onOpen={() => setShowMap(true)} />

          <MapModal open={showMap} onClose={() => setShowMap(false)} />
        </div>
      </div>

      {/* Search by Hotel Name */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search by Hotel name"
            className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <FaSearch className="absolute right-3 top-3 text-gray-400" />
        </div>
      </div>

      {/* Free Cancellation */}
      <div className="mb-6">
        <button className="w-full px-4 py-2 border border-gray-300 rounded flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors">
          <span>📋</span>
          <span>Free Cancellation Available</span>
        </button>
      </div>

      {/* Search by Location */}
      <div className="mb-6">
        <button className="w-full px-4 py-2 border border-gray-300 rounded flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors">
          <FaMapMarkerAlt />
          <span>Search by Location</span>
        </button>
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
            min="1460"
            max="242360"
            value={filters.maxPrice}
            onChange={(e) => handlePriceChange("maxPrice", e.target.value)}
            className="w-full h-2 bg-blue-500 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(
    to right,
    #2563eb 0%,
    #2563eb ${((filters.maxPrice - 1460) / (242360 - 1460)) * 100}%,
    #e5e7eb ${((filters.maxPrice - 1460) / (242360 - 1460)) * 100}%,
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
          {[5, 4, 3, 2, 1].map((stars) => (
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
              <div className="flex gap-1">{renderStars(stars)}</div>
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
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-gray-700">
              ROOM ONLY <span className="text-gray-500">(424)</span>
            </span>
            <input
              type="checkbox"
              className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
            />
          </label>
        </div>
      </div>

      {/* Property Type Filter */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800">Property Type</h3>
          <button className="text-gray-600">−</button>
        </div>

        <div className="space-y-3">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-gray-700">
              Hotel <span className="text-gray-500">(390)</span>
            </span>
            <input
              type="checkbox"
              className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-600"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-gray-700">
              Bed & Breakfast <span className="text-gray-500">(8)</span>
            </span>
            <input
              type="checkbox"
              className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-600"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-gray-700">
              Aparthotel <span className="text-gray-500">(5)</span>
            </span>
            <input
              type="checkbox"
              className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-600"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-gray-700">
              Guesthouse <span className="text-gray-500">(13)</span>
            </span>
            <input
              type="checkbox"
              className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-600"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-gray-700">
              Inn <span className="text-gray-500">(1)</span>
            </span>
            <input
              type="checkbox"
              className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-600"
            />
          </label>
        </div>
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

        <div className="space-y-3">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-gray-700">
              Wi-Fi <span className="text-gray-500">(350)</span>
            </span>
            <input
              type="checkbox"
              className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-gray-700">
              Swimming Pool <span className="text-gray-500">(85)</span>
            </span>
            <input
              type="checkbox"
              className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-gray-700">
              Parking <span className="text-gray-500">(280)</span>
            </span>
            <input
              type="checkbox"
              className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-gray-700">
              Restaurant <span className="text-gray-500">(220)</span>
            </span>
            <input
              type="checkbox"
              className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-gray-700">
              Gym/Fitness Center <span className="text-gray-500">(95)</span>
            </span>
            <input
              type="checkbox"
              className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-gray-700">
              Room Service <span className="text-gray-500">(310)</span>
            </span>
            <input
              type="checkbox"
              className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
            />
          </label>
        </div>
      </div>
    </div>
  );
};

export default FilterSidebar;
