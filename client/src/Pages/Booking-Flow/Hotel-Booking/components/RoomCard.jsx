// components/HotelDetails/RoomCard.jsx
import React, { useState } from "react";
import {
  MdPhotoLibrary,
  MdCheckCircle,
  MdExpandMore,
  MdExpandLess,
  MdInfoOutline,
} from "react-icons/md";
import {
  FaBed,
  FaBath,
  FaTv,
  FaCoffee,
  FaSnowflake,
  FaWind,
  FaShieldAlt,
  FaCheck,
} from "react-icons/fa";
import { RiRestaurant2Line } from "react-icons/ri";

const RoomCard = ({ room, onSelect }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [imgIndex, setImgIndex] = useState(0);

  const images = room.images?.length
    ? room.images
    : ["https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800"];

  const totalImages = images.length;

  const next = (e) => {
    e.stopPropagation();
    setImgIndex((prev) => (prev === totalImages - 1 ? 0 : prev + 1));
  };

  const prev = (e) => {
    e.stopPropagation();
    setImgIndex((prev) => (prev === 0 ? totalImages - 1 : prev - 1));
  };

  // Pricing derivation from TBO structure
  const price = room.Price || {};
  const totalFare = price.totalFare ?? room.TotalFare ?? 0;
  const tax = price.tax ?? room.TotalTax ?? 0;
  const currency = price.currency ?? room.Currency ?? "INR";
  const nights = room?.DayRates?.[0]?.length || 1;

  // ALWAYS inclusive per night (MMT style)
  const perNight = totalFare / nights;

  const inclusions = (room.Inclusion || "")
    .split(",")
    .map((i) => i.trim())
    .filter(Boolean);

  const getInclusionIcon = (text) => {
    const lower = text.toLowerCase();
    if (
      lower.includes("breakfast") ||
      lower.includes("meal") ||
      lower.includes("dinner")
    )
      return <RiRestaurant2Line className="text-amber-500 text-sm sm:text-base" />;
    if (lower.includes("bed") || lower.includes("occupancy"))
      return <FaBed className="text-blue-500 text-sm sm:text-base" />;
    if (lower.includes("wifi") || lower.includes("internet"))
      return (
        <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-blue-100 flex items-center justify-center text-[8px] sm:text-[9px] text-blue-600 font-bold flex-shrink-0">
          W
        </div>
      );
    if (lower.includes("ac") || lower.includes("conditioning"))
      return <FaSnowflake className="text-cyan-500 text-sm sm:text-base" />;
    if (lower.includes("cancel") || lower.includes("refundable"))
      return <FaShieldAlt className="text-emerald-500 text-sm sm:text-base" />;
    return <FaCheck className="text-slate-400 text-sm sm:text-base" />;
  };

  return (
    <div className="group w-full bg-white rounded-lg sm:rounded-xl lg:rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-md sm:hover:shadow-lg lg:hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 overflow-hidden">
      <div className="flex flex-col lg:flex-row h-full">
        
        {/* IMAGE SECTION - Responsive */}
        <div className="w-full lg:w-50 shrink-0 relative bg-slate-100 overflow-hidden aspect-video sm:aspect-video lg:aspect-square">
          <img
            src={images[imgIndex]}
            alt={room.RoomTypeName || "Room"}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />

          {/* Overlay Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Photo Counter - Mobile Optimized */}
          <div className="absolute bottom-2 sm:bottom-3 left-2 sm:left-3 flex items-center gap-2">
            <span className="bg-black/60 backdrop-blur-sm text-white text-[8px] sm:text-[9px] lg:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded uppercase tracking-wider">
              <span className="inline sm:hidden">{imgIndex + 1}/{totalImages}</span>
              <span className="hidden sm:inline">{imgIndex + 1} / {totalImages} PHOTOS</span>
            </span>
          </div>

          {/* Navigation Arrows - Hidden on mobile, visible on hover on tablet+ */}
          {totalImages > 1 && (
            <div className="absolute top-1/2 -translate-y-1/2 w-full px-2 sm:px-2 flex justify-between opacity-0 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <button
                onClick={prev}
                className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white/90 backdrop-blur shadow-lg flex items-center justify-center text-slate-900 hover:bg-white transition-colors active:scale-95 font-bold text-sm sm:text-lg"
              >
                ‹
              </button>
              <button
                onClick={next}
                className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white/90 backdrop-blur shadow-lg flex items-center justify-center text-slate-900 hover:bg-white transition-colors active:scale-95 font-bold text-sm sm:text-lg"
              >
                ›
              </button>
            </div>
          )}

          {/* Refundable Badge - Responsive Positioning */}
          <div className="absolute top-2 sm:top-3 left-2 sm:left-3 z-10">
            <span
              className={`text-[8px] sm:text-[9px] lg:text-[10px] font-black px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md sm:rounded-lg uppercase tracking-widest shadow-lg inline-block ${
                room.IsRefundable
                  ? "bg-emerald-500 text-white"
                  : "bg-slate-700 text-white"
              }`}
            >
              <span className="inline sm:hidden">
                {room.IsRefundable ? "Free" : "Non-Ref"}
              </span>
              <span className="hidden sm:inline">
                {room.IsRefundable ? "Refundable" : "Non-Refundable"}
              </span>
            </span>
          </div>
        </div>

        {/* INFO SECTION - Responsive */}
        <div className="flex-1 p-3 sm:p-4 lg:p-5 flex flex-col justify-between border-b sm:border-b lg:border-b-0 lg:border-r border-slate-100">
          <div className="space-y-2 sm:space-y-3 lg:space-y-4">
            
            {/* Title Section */}
            <div>
              <h3 className="text-base sm:text-lg lg:text-xl font-black text-[#0a2540] tracking-tight leading-tight">
                {room.RoomTypeName || room.Name?.[0] || "Standard Room"}
              </h3>
            </div>

            {/* Tags - Responsive Layout */}
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              <div className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-slate-50 border border-slate-100 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-bold text-slate-600 whitespace-nowrap">
                <RiRestaurant2Line className="text-blue-500 text-xs sm:text-sm flex-shrink-0" />
                <span className="hidden sm:inline">
                  {room.MealType?.replace(/_/g, " ") || "Room Only"}
                </span>
                <span className="sm:hidden">
                  {room.MealType?.split("_")?.[0]?.slice(0, 2) || "RO"}
                </span>
              </div>

              {room.SmokingPreference !== 0 && (
                <div className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-slate-50 border border-slate-100 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-bold text-slate-600 whitespace-nowrap">
                  <FaWind className="text-slate-400 text-xs sm:text-sm flex-shrink-0" />
                  <span className="hidden sm:inline">
                    {room.SmokingPreference === 1 ? "Smoking" : "Non-Smoking"}
                  </span>
                  <span className="sm:hidden">
                    {room.SmokingPreference === 1 ? "Smk" : "NS"}
                  </span>
                </div>
              )}
            </div>

            {/* Inclusions Grid - Responsive Columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-y-1.5 sm:gap-y-2 gap-x-2 sm:gap-x-3 lg:gap-x-4">
              {inclusions.slice(0, showDetails ? 100 : 3).map((inc, i) => (
                <div key={i} className="flex items-center gap-1.5 sm:gap-2 group/inc min-w-0">
                  <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 rounded bg-slate-50 flex items-center justify-center group-hover/inc:bg-blue-50 transition-colors flex-shrink-0">
                    {getInclusionIcon(inc)}
                  </div>
                  <span className="text-[10px] sm:text-xs lg:text-xs font-medium text-slate-600 capitalize truncate">
                    {inc}
                  </span>
                </div>
              ))}
            </div>

            {/* Show More/Less Button - Responsive Text */}
            {inclusions.length > 3 && (
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-1 text-[9px] sm:text-[10px] lg:text-[11px] font-black text-blue-500 hover:text-blue-600 uppercase tracking-widest transition-colors mt-1 sm:mt-2"
              >
                {showDetails ? (
                  <>
                    <MdExpandLess className="text-sm sm:text-base" />
                    <span className="hidden sm:inline">SHOW LESS</span>
                    <span className="sm:hidden">LESS</span>
                  </>
                ) : (
                  <>
                    <MdExpandMore className="text-sm sm:text-base" />
                    <span className="hidden sm:inline">VIEW {inclusions.length - 3} MORE</span>
                    <span className="sm:hidden">+{inclusions.length - 3}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* BOOKING SECTION - Responsive */}
        <div className="w-full lg:w-64 p-3 sm:p-4 lg:p-5 bg-slate-50/50 flex flex-col sm:flex-row lg:flex-col justify-between items-start sm:items-center lg:items-stretch gap-2 sm:gap-3 lg:gap-0">
          
          {/* Price Information - Responsive */}
          <div className="flex-1 sm:flex-1 lg:flex-none space-y-0.5 sm:space-y-1 lg:space-y-1.5 w-full">
            <div className="text-[8px] sm:text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Price Breakup
            </div>

            <div className="flex items-baseline gap-0.5 sm:gap-1">
              <span className="text-[9px] sm:text-xs font-black text-slate-400">
                {currency}
              </span>
              <span className="text-xl sm:text-2xl lg:text-3xl font-black text-[#0a2540]">
                {totalFare.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center gap-1 text-[8px] sm:text-[9px] text-emerald-600 font-bold bg-emerald-50 px-1.5 sm:px-2 py-0.5 rounded-full w-fit">
              <MdInfoOutline className="text-xs flex-shrink-0" />
              <span className="hidden sm:inline">
                Inclusive of {currency} {tax.toLocaleString()} tax
              </span>
              <span className="sm:hidden">
                +tax {currency} {(tax / 1000).toFixed(0)}k
              </span>
            </div>

            <p className="text-[9px] sm:text-[10px] lg:text-xs text-slate-500 font-medium">
              ≈ {currency} {perNight.toFixed(0).toLocaleString()} / Night
            </p>
          </div>

          {/* CTA Button - Responsive */}
          <div className="w-full sm:w-auto lg:w-full">
            <button
              onClick={onSelect}
              className="w-full px-2 sm:px-4 lg:px-0 bg-[#0a2540] hover:bg-blue-700 active:bg-blue-800 text-white text-[9px] sm:text-xs lg:text-xs font-black py-2 sm:py-2.5 lg:py-3 rounded-lg sm:rounded-xl border border-[#0a2540] transition-all transform active:scale-[0.98] hover:shadow-md sm:hover:shadow-lg whitespace-nowrap"
            >
              <span className="hidden sm:inline">SELECT THIS ROOM</span>
              <span className="sm:hidden">SELECT</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomCard;