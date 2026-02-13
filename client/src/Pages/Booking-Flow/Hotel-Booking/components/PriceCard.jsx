// components/HotelDetails/PriceCard.jsx
import React from 'react';
import { FaStar } from 'react-icons/fa';
import { MdCheckCircle } from 'react-icons/md';

const PriceCard = ({ selectedRoom }) => {
  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
      {/* Room Type Header */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-semibold text-gray-900">Superior: Double</h3>
            <p className="text-sm text-gray-600 mt-1">Room Only</p>
          </div>
          <button className="text-blue-600 text-sm font-medium hover:underline">
            View Details
          </button>
        </div>
      </div>

      {/* Price Section */}
      <div className="p-4 border-b">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-sm text-gray-600">Starting From</span>
          <div className="text-right">
            <div className="text-3xl font-bold text-gray-900">
              {selectedRoom?.discountedPrice || '₹46,322'}
            </div>
            <div className="text-sm text-gray-500 line-through">
              {selectedRoom?.originalPrice || '₹83,523'}
            </div>
          </div>
        </div>
        <div className="text-sm text-gray-600 text-right">
          {selectedRoom?.taxes || '+ ₹8,337 taxes'}
        </div>
      </div>

      {/* Book Now Button */}
      <div className="p-4">
        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors shadow-md hover:shadow-lg">
          Send For approval
        </button>
      </div>

      {/* Rating */}
      <div className="px-4 pb-4 border-b">
        <div className="flex items-center justify-between bg-orange-50 rounded-lg p-3">
          <div>
            <div className="text-2xl font-bold text-gray-900">4.3</div>
            <div className="text-sm text-gray-600">Good</div>
          </div>
          <button className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            View Reviews
          </button>
        </div>
      </div>

      {/* Check In/Out Timings */}
      <div className="p-4 space-y-3">
        <h4 className="font-semibold text-gray-900">Check In-Check Out Timings</h4>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Check In</span>
            <span className="font-medium text-gray-900">2 PM</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Check Out</span>
            <span className="font-medium text-gray-900">12 PM</span>
          </div>
        </div>

        {/* Features */}
        <div className="pt-3 border-t space-y-2">
          <div className="flex items-start gap-2">
            <MdCheckCircle className="text-green-500 mt-0.5 shrink-0" />
            <span className="text-sm text-gray-700">Free Cancellation</span>
          </div>
          <div className="flex items-start gap-2">
            <MdCheckCircle className="text-green-500 mt-0.5 shrink-0" />
            <span className="text-sm text-gray-700">No prepayment needed</span>
          </div>
          <div className="flex items-start gap-2">
            <MdCheckCircle className="text-green-500 mt-0.5 shrink-0" />
            <span className="text-sm text-gray-700">Pay at hotel</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PriceCard;