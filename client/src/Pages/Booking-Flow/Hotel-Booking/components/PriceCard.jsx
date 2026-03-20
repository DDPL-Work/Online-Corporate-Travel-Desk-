// components/HotelDetails/PriceCard.jsx
import React from "react";
import { FaStar } from "react-icons/fa";
import { MdCheckCircle } from "react-icons/md";

const PriceCard = ({
  selectedRoom,
  travellerDetails,
  onOpenTravellerModal,
  onSendForApproval,
}) => {
  const nights = selectedRoom?.DayRates?.[0]?.length || 1;
  const perNight = selectedRoom?.DayRates?.[0]?.[0]?.BasePrice || null;
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
      <div className="p-4">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-sm text-gray-600">Starting From</span>
          <div className="text-right">
            <div className="text-3xl font-bold text-gray-900">
              ₹{selectedRoom?.TotalFare?.toLocaleString("en-IN")}
            </div>

            <div className="text-sm text-gray-600 text-right">
              Incl. ₹{selectedRoom?.TotalTax?.toLocaleString("en-IN")} taxes
            </div>

            {perNight && (
              <div className="text-sm text-gray-500">
                ₹{perNight.toLocaleString("en-IN")} per night
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="p-4 ">
        {!travellerDetails ? (
          <button
            onClick={onOpenTravellerModal}
            className="w-full bg-[#0d7fe8] hover:bg-[#0b6cd0] text-white font-semibold py-3 rounded-lg transition"
          >
            Add Traveller Details
          </button>
        ) : (
          <button
            onClick={onSendForApproval}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition"
          >
            Send for Approval
          </button>
        )}
      </div>

      {/* Check In/Out Timings */}
      <div className="p-4 space-y-3">
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
