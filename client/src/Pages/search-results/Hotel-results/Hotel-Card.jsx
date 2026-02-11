import React from 'react';
import { BsStarFill, BsStar } from 'react-icons/bs';
import { FaHeart, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const HotelCard = ({ hotel }) => {

  const navigate = useNavigate();
  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        i <= rating ? (
          <BsStarFill key={i} className="text-orange-500 text-sm" />
        ) : (
          <BsStar key={i} className="text-orange-500 text-sm" />
        )
      );
    }
    return stars;
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow mb-4">
      <div className="flex">
        {/* Hotel Image */}
        <div className="w-80 h-64 shrink-0 relative">
          <img
            src={hotel.image}
            alt={hotel.name}
            className="w-full h-full object-cover"
          />
          {/* Image Navigation */}
          <button className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-md">
            <FaChevronLeft className="text-gray-700" />
          </button>
          <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-md">
            <FaChevronRight className="text-gray-700" />
          </button>
          {/* Image Counter */}
          <div className="absolute bottom-3 right-3 bg-black/70 text-white px-3 py-1 rounded text-sm">
            5 / 10
          </div>
          {/* Favorite Heart */}
          <button className="absolute top-3 right-3 bg-white/90 hover:bg-white rounded-full p-2 shadow-md">
            <FaHeart className="text-gray-400 hover:text-red-500" />
          </button>
        </div>

        {/* Hotel Details */}
        <div className="flex-1 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-1">
                  {hotel.name}
                </h3>
                <div className="flex gap-1 mb-2">
                  {renderStars(hotel.rating)}
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  {hotel.address}
                </p>
              </div>
              
              {/* Rating Badge */}
              <div className="text-right">
                <div className="text-4xl font-bold text-orange-500">4.3</div>
                <div className="text-sm text-gray-600">Good</div>
                <div className="text-xs text-gray-500">(5069 Ratings)</div>
              </div>
            </div>

            {/* Hotel Features */}
            <div className="mb-3">
              <div className="inline-block bg-gray-100 px-3 py-1 rounded text-sm text-gray-700 mb-2">
                • Room Only
              </div>
              <div className="inline-block bg-green-50 px-3 py-1 rounded text-sm text-green-600 ml-2">
                • Free Cancellation before 09-02-2026
              </div>
            </div>

            {/* Amenities */}
            <div className="flex gap-4 text-sm text-gray-600">
              <span>Bar/Lounges</span>
              <span>•</span>
              <span>Coffee Shop/Cafe</span>
              <span>•</span>
              <span>Health Club</span>
            </div>
          </div>

          {/* Price Section */}
          <div className="flex items-end justify-between mt-4 pt-4 border-t border-gray-200">
            <div>
              {/* Empty space for alignment */}
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500 mb-1">
                ₹23,177 <span className="text-xs">/night</span>
              </div>
              <div className="text-3xl font-bold text-gray-800 mb-1">
                ₹{hotel.price.toLocaleString()} 
                <span className="text-sm font-normal text-gray-600"> Total</span>
              </div>
              <div className="text-xs text-gray-500 mb-3">(Incl. of all taxes)</div>
              
              <button onClick={() => navigate("/one-hotel-details")} className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-2 rounded font-semibold transition-colors">
                SELECT ROOM
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotelCard;