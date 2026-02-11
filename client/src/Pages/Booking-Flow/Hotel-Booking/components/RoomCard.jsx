// components/HotelDetails/RoomCard.jsx
import React, { useState } from 'react';
import { MdPhotoLibrary, MdCheckCircle } from 'react-icons/md';
import { FaBed, FaBath, FaTv, FaCoffee, FaSnowflake } from 'react-icons/fa';

const RoomCard = ({ room, onSelect }) => {
  const [showDetails, setShowDetails] = useState(false);

  const getFeatureIcon = (feature) => {
    const lowerFeature = feature.toLowerCase();
    if (lowerFeature.includes('bed')) return <FaBed className="text-gray-500" />;
    if (lowerFeature.includes('bath')) return <FaBath className="text-gray-500" />;
    if (lowerFeature.includes('tv') || lowerFeature.includes('television')) return <FaTv className="text-gray-500" />;
    if (lowerFeature.includes('coffee')) return <FaCoffee className="text-gray-500" />;
    if (lowerFeature.includes('air conditioning')) return <FaSnowflake className="text-gray-500" />;
    return <MdCheckCircle className="text-green-500" />;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden">
      <div className="flex flex-col md:flex-row gap-4 p-4">
        {/* Room Image */}
        <div className="w-full md:w-48 h-48 shrink-0 relative group">
          <img 
            src={room.image} 
            alt={room.name}
            className="w-full h-full object-cover rounded-lg"
          />
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all rounded-lg" />
          <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
            <MdPhotoLibrary />
            <span>+5 Photos</span>
          </div>
          <div className="absolute top-2 left-2 bg-white px-2 py-1 rounded text-xs font-semibold text-gray-700">
            {room.name.split(',')[0]}
          </div>
        </div>

        {/* Room Details */}
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">{room.name}</h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded">
                    {room.type}
                  </span>
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                    {room.refundable}
                  </span>
                  <span className="px-2 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded">
                    {room.paxRequired}
                  </span>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="grid grid-cols-2 gap-2 mt-3">
              {room.features.slice(0, 4).map((feature, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                  {getFeatureIcon(feature)}
                  <span className="capitalize">{feature}</span>
                </div>
              ))}
            </div>

            {/* Amenities List */}
            {showDetails && (
              <div className="mt-3 space-y-2">
                {room.amenities.map((amenity, index) => (
                  <div key={index} className="flex items-start gap-2 text-sm text-gray-700">
                    <MdCheckCircle className="text-green-500 mt-0.5 shrink-0" />
                    <span>{amenity}</span>
                  </div>
                ))}
              </div>
            )}

            <button 
              onClick={() => setShowDetails(!showDetails)}
              className="text-blue-600 font-medium text-sm mt-3 hover:underline"
            >
              {showDetails ? 'View Less' : 'View More'}
            </button>
          </div>
        </div>

        {/* Price Section */}
        <div className="w-full md:w-56 shrink-0 text-right flex flex-col justify-between items-end">
          <div className="mb-2">
            <div className="text-sm text-gray-500 line-through mb-1">
              {room.originalPrice}
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {room.discountedPrice}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {room.taxes}
            </div>
            <div className="inline-block bg-green-100 text-green-700 text-xs font-semibold px-2 py-1 rounded mt-2">
              {room.discount}
            </div>
          </div>

          <div className="space-y-2 w-full">
            <button 
              onClick={onSelect}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors"
            >
              Select Room
            </button>
            <button className="w-full border border-blue-500 text-blue-600 hover:bg-blue-50 font-semibold py-2.5 rounded-lg transition-colors">
              Book Now +
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomCard;