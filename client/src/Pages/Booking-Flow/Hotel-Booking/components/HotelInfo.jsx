// components/HotelDetails/HotelInfo.jsx
import React, { useState } from 'react';

const HotelInfo = ({ description, checkIn, checkOut }) => {
  const [showMore, setShowMore] = useState(false);

  const truncatedDescription = description.substring(0, 200);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">About the Hotel</h2>
      
      <div className="text-gray-700 leading-relaxed">
        <p>
          {showMore ? description : truncatedDescription}
          {!showMore && description.length > 200 && '...'}
        </p>
        
        {description.length > 200 && (
          <button 
            onClick={() => setShowMore(!showMore)}
            className="text-blue-600 font-medium mt-2 hover:underline inline-flex items-center gap-1"
          >
            {showMore ? 'Read Less' : 'Read More'}
            <svg 
              className={`w-4 h-4 transition-transform ${showMore ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t">
        <div>
          <div className="text-sm text-gray-600 mb-1">Check In</div>
          <div className="font-semibold text-gray-900">{checkIn}</div>
        </div>
        <div>
          <div className="text-sm text-gray-600 mb-1">Check Out</div>
          <div className="font-semibold text-gray-900">{checkOut}</div>
        </div>
      </div>
    </div>
  );
};

export default HotelInfo;