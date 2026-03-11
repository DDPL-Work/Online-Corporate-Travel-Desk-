// components/HotelDetails/RoomCard.jsx
import React, { useState } from "react";
import { MdPhotoLibrary, MdCheckCircle } from "react-icons/md";
import { FaBed, FaBath, FaTv, FaCoffee, FaSnowflake } from "react-icons/fa";

const RoomCard = ({ room, onSelect }) => {
  const [showDetails, setShowDetails] = useState(false);

  const [imgIndex, setImgIndex] = useState(0);

  const images = room.images?.length
    ? room.images
    : ["https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800"];

  const totalImages = images.length;

  const next = () =>
    setImgIndex((prev) => (prev === totalImages - 1 ? 0 : prev + 1));

  const prev = () =>
    setImgIndex((prev) => (prev === 0 ? totalImages - 1 : prev - 1));

  const nights = room?.DayRates?.[0]?.length || 1;
  const perNight = room?.DayRates?.[0]?.[0]?.BasePrice || null;

  const getFeatureIcon = (feature) => {
    const lowerFeature = feature.toLowerCase();
    if (lowerFeature.includes("bed"))
      return <FaBed className="text-gray-500" />;
    if (lowerFeature.includes("bath"))
      return <FaBath className="text-gray-500" />;
    if (lowerFeature.includes("tv") || lowerFeature.includes("television"))
      return <FaTv className="text-gray-500" />;
    if (lowerFeature.includes("coffee"))
      return <FaCoffee className="text-gray-500" />;
    if (lowerFeature.includes("air conditioning"))
      return <FaSnowflake className="text-gray-500" />;
    return <MdCheckCircle className="text-green-500" />;
  };

  console.log(room.images?.length);
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden">
      <div className="flex flex-col md:flex-row gap-4 p-4">
        {/* Room Image */}
        <div className="w-full md:w-48 h-48 shrink-0 relative group">
          <img
            src={images[imgIndex]}
            alt={room.Name?.[0]}
            className="w-full h-full object-cover rounded-lg"
          />

          {totalImages > 1 && (
            <>
              <button
                onClick={prev}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
              >
                ‹
              </button>
              <button
                onClick={next}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
              >
                ›
              </button>
            </>
          )}

          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full">
            {imgIndex + 1} / {totalImages}
          </div>

          <div className="absolute top-2 left-2 bg-white px-2 py-1 rounded text-xs font-semibold text-gray-700">
            {room?.Name?.[0]?.split(",")?.[0] || "Room"}
          </div>
        </div>

        {/* Room Details */}
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">
                  {room.Name?.[0]}
                </h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  <div className="flex flex-wrap gap-2 mt-2">
                    {/* Meal Type */}
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded">
                      {room.MealType?.replaceAll("_", " ")}
                    </span>

                    {/* Refundable */}
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        room.IsRefundable
                          ? "bg-green-50 text-green-700"
                          : "bg-red-50 text-red-600"
                      }`}
                    >
                      {room.IsRefundable ? "Refundable" : "Non Refundable"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="grid grid-cols-2 gap-2 mt-3">
              {room.Inclusion?.split(",")
                ?.slice(0, 4)
                ?.map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 text-sm text-gray-600"
                  >
                    {getFeatureIcon(feature)}
                    <span className="capitalize">{feature}</span>
                  </div>
                ))}
            </div>

            {/* Amenities List */}
            {showDetails && (
              <div className="mt-3 space-y-2">
                {room.amenities?.map((amenity, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 text-sm text-gray-700"
                  >
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
              {showDetails ? "View Less" : "View More"}
            </button>
          </div>
        </div>

        {/* Price Section */}
        <div className="w-full md:w-56 shrink-0 text-right flex flex-col justify-between items-end">
          <div className="mb-2 text-right">
            {perNight && (
              <div className="text-sm text-gray-500">
                ₹{perNight.toLocaleString("en-IN")} per night
              </div>
            )}

            <div className="text-2xl font-bold text-gray-900">
              ₹{room?.TotalFare?.toLocaleString("en-IN")}
            </div>

            <div className="text-xs text-gray-600">
              Incl. ₹{room?.TotalTax?.toLocaleString("en-IN")} taxes
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
