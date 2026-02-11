// components/HotelDetails/Amenities.jsx
import React, { useState } from 'react';
import { 
  FaWifi, 
  FaParking, 
  FaSwimmingPool, 
  FaDumbbell,
  FaUtensils,
  FaSpa,
  FaSnowflake,
  FaGlassMartini
} from 'react-icons/fa';
import { MdRestaurant } from 'react-icons/md';

const Amenities = ({ amenities }) => {
  const [showAll, setShowAll] = useState(false);

  const amenityIcons = {
    wifi: FaWifi,
    parking: FaParking,
    pool: FaSwimmingPool,
    gym: FaDumbbell,
    restaurant: MdRestaurant,
    spa: FaSpa,
    ac: FaSnowflake,
    bar: FaGlassMartini
  };

  const displayedAmenities = showAll ? amenities : amenities.slice(0, 8);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Amenities</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {displayedAmenities.map((amenity, index) => {
          const Icon = amenityIcons[amenity.icon] || FaWifi;
          return (
            <div 
              key={index}
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer"
            >
              <Icon className="text-blue-600 text-xl shrink-0" />
              <span className="text-sm font-medium text-gray-700">
                {amenity.label}
              </span>
            </div>
          );
        })}
      </div>

      {amenities.length > 8 && (
        <button 
          onClick={() => setShowAll(!showAll)}
          className="mt-4 text-blue-600 font-medium hover:underline"
        >
          {showAll ? 'Show Less' : `Show More (${amenities.length - 8} more)`}
        </button>
      )}
    </div>
  );
};

export default Amenities;