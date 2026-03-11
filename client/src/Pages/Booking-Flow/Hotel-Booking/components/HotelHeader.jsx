// components/HotelDetails/HotelHeader.jsx
import React from "react";
import { FaStar, FaHeart, FaShare } from "react-icons/fa";
import { MdArrowBack, MdLocationOn } from "react-icons/md";
import { useNavigate } from "react-router-dom";

const HotelHeader = ({ name, address, rating, reviewCount }) => {
  const navigate = useNavigate();
  return (
    <div className="bg-blue-100 border-b border-blue-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 pt-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm font-semibold text-[#0a2540] hover:text-[#0d7fe8] transition"
        >
          <MdArrowBack className="text-lg" />
          Back to Search Results
        </button>
      </div>
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{name}</h1>

            <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
              <MdLocationOn className="text-blue-800" />
              <span>{address}</span>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <FaStar
                      key={i}
                      className={
                        i < Math.floor(rating)
                          ? "text-orange-500"
                          : "text-gray-300"
                      }
                      size={16}
                    />
                  ))}
                </div>
                <span className="font-semibold text-gray-900">{rating}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <FaShare className="text-gray-600" />
              <span className="text-sm font-medium">Share</span>
            </button>

            <button className="flex items-center gap-2 px-4 py-2 border border-red-500 text-red-500 rounded-lg hover:bg-red-50 transition-colors">
              <FaHeart />
              <span className="text-sm font-medium">Add to Favorite</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotelHeader;
