// components/HotelDetails/RoomCard.jsx
import React, { useState } from "react";
import { 
  MdPhotoLibrary, 
  MdCheckCircle, 
  MdExpandMore, 
  MdExpandLess,
  MdInfoOutline
} from "react-icons/md";
import { 
  FaBed, 
  FaBath, 
  FaTv, 
  FaCoffee, 
  FaSnowflake, 
  FaWind,
  FaShieldAlt,
  FaCheck
} from "react-icons/fa";
import { RiRestaurant2Line } from "react-icons/ri";

const RoomCard = ({ room, onSelect }) => {
  const [showDetails, setShowDetails] = useState(false);
// >>>>>>> 6c93c2a6864064eee402edb2e2c40c889dc71d90
  const [imgIndex, setImgIndex] = useState(0);

  const images = room.images?.length
    ? room.images
    : ["https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800"];

  const totalImages = images.length;

// <<<<<<< HEAD
//   const next = () =>
//     setImgIndex((prev) => (prev === totalImages - 1 ? 0 : prev + 1));

//   const prev = () =>
//     setImgIndex((prev) => (prev === 0 ? totalImages - 1 : prev - 1));

//   const nights = room?.DayRates?.[0]?.length || 1;
//   const perNight = room?.DayRates?.[0]?.[0]?.BasePrice || null;

//   const getFeatureIcon = (feature) => {
//     const lowerFeature = feature.toLowerCase();
//     if (lowerFeature.includes("bed"))
//       return <FaBed className="text-gray-500" />;
//     if (lowerFeature.includes("bath"))
//       return <FaBath className="text-gray-500" />;
//     if (lowerFeature.includes("tv") || lowerFeature.includes("television"))
//       return <FaTv className="text-gray-500" />;
//     if (lowerFeature.includes("coffee"))
//       return <FaCoffee className="text-gray-500" />;
//     if (lowerFeature.includes("air conditioning"))
//       return <FaSnowflake className="text-gray-500" />;
//     return <MdCheckCircle className="text-green-500" />;
//   };

//   console.log(room.images?.length);
//   return (
//     <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden">
//       <div className="flex flex-col md:flex-row gap-4 p-4">
//         {/* Room Image */}
//         <div className="w-full md:w-48 h-48 shrink-0 relative group">
//           <img
//             src={images[imgIndex]}
//             alt={room.Name?.[0]}
//             className="w-full h-full object-cover rounded-lg"
//           />

//           {totalImages > 1 && (
//             <>
//               <button
//                 onClick={prev}
//                 className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
//               >
//                 ‹
//               </button>
//               <button
//                 onClick={next}
//                 className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
//               >
//                 ›
//               </button>
//             </>
//           )}

//           <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full">
//             {imgIndex + 1} / {totalImages}
//           </div>

//           <div className="absolute top-2 left-2 bg-white px-2 py-1 rounded text-xs font-semibold text-gray-700">
//             {room?.Name?.[0]?.split(",")?.[0] || "Room"}
//           </div>
//         </div>

//         {/* Room Details */}
//         <div className="flex-1 flex flex-col justify-between">
//           <div>
//             <div className="flex items-start justify-between mb-2">
//               <div>
//                 <h3 className="font-bold text-gray-900 text-lg">
//                   {room.Name?.[0]}
//                 </h3>
//                 <div className="flex flex-wrap gap-2 mt-2">
//                   <div className="flex flex-wrap gap-2 mt-2">
//                     {/* Meal Type */}
//                     <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded">
//                       {room.MealType?.replaceAll("_", " ")}
//                     </span>

//                     {/* Refundable */}
//                     <span
//                       className={`px-2 py-1 text-xs font-medium rounded ${
//                         room.IsRefundable
//                           ? "bg-green-50 text-green-700"
//                           : "bg-red-50 text-red-600"
//                       }`}
//                     >
//                       {room.IsRefundable ? "Refundable" : "Non Refundable"}
//                     </span>
//                   </div>
//                 </div>
//               </div>
//             </div>

//             {/* Features */}
//             <div className="grid grid-cols-2 gap-2 mt-3">
//               {room.Inclusion?.split(",")
//                 ?.slice(0, 4)
//                 ?.map((feature, index) => (
//                   <div
//                     key={index}
//                     className="flex items-center gap-2 text-sm text-gray-600"
//                   >
//                     {getFeatureIcon(feature)}
//                     <span className="capitalize">{feature}</span>
//                   </div>
//                 ))}
//             </div>

//             {/* Amenities List */}
//             {showDetails && (
//               <div className="mt-3 space-y-2">
//                 {room.amenities?.map((amenity, index) => (
//                   <div
//                     key={index}
//                     className="flex items-start gap-2 text-sm text-gray-700"
//                   >
//                     <MdCheckCircle className="text-green-500 mt-0.5 shrink-0" />
//                     <span>{amenity}</span>
//                   </div>
//                 ))}
//               </div>
//             )}

//             <button
//               onClick={() => setShowDetails(!showDetails)}
//               className="text-blue-600 font-medium text-sm mt-3 hover:underline"
//             >
//               {showDetails ? "View Less" : "View More"}
//             </button>
//           </div>
//         </div>

//         {/* Price Section */}
//         <div className="w-full md:w-56 shrink-0 text-right flex flex-col justify-between items-end">
//           <div className="mb-2 text-right">
//             {perNight && (
//               <div className="text-sm text-gray-500">
//                 ₹{perNight.toLocaleString("en-IN")} per night
//               </div>
//             )}

//             <div className="text-2xl font-bold text-gray-900">
//               ₹{room?.TotalFare?.toLocaleString("en-IN")}
//             </div>

//             <div className="text-xs text-gray-600">
//               Incl. ₹{room?.TotalTax?.toLocaleString("en-IN")} taxes
//             </div>
//           </div>

//           <div className="space-y-2 w-full">
//             <button
//               onClick={onSelect}
//               className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors"
//             >
//               Select Room
//             </button>
//             <button className="w-full border border-blue-500 text-blue-600 hover:bg-blue-50 font-semibold py-2.5 rounded-lg transition-colors">
//               Book Now +
//             </button>
//           </div>
//         </div>
// =======
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
  const totalFare = price.TotalFare || room.TotalFare || 0;
  const tax = price.Tax || room.TotalTax || 0;
  const currency = price.CurrencyCode || room.Currency || "INR";
  
  const nights = room?.DayRates?.[0]?.length || 1;
  const perNight = price.RoomPrice ? price.RoomPrice / nights : (totalFare - tax) / nights;

  const inclusions = (room.Inclusion || "").split(",").map(i => i.trim()).filter(Boolean);

  const getInclusionIcon = (text) => {
    const lower = text.toLowerCase();
    if (lower.includes("breakfast") || lower.includes("meal") || lower.includes("dinner")) return <RiRestaurant2Line className="text-amber-500" />;
    if (lower.includes("bed") || lower.includes("occupancy")) return <FaBed className="text-blue-500" />;
    if (lower.includes("wifi") || lower.includes("internet")) return <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center text-[10px] text-blue-600 font-bold">W</div>;
    if (lower.includes("ac") || lower.includes("conditioning")) return <FaSnowflake className="text-cyan-500" />;
    if (lower.includes("cancel") || lower.includes("refundable")) return <FaShieldAlt className="text-emerald-500" />;
    return <FaCheck className="text-slate-400" />;
  };

  return (
    <div className="group bg-white rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 overflow-hidden">
      <div className="flex flex-col lg:flex-row h-full">
        
        {/* Left: Visuals */}
        <div className="w-full lg:w-72 shrink-0 relative bg-slate-100 overflow-hidden">
          <img
            src={images[imgIndex]}
            alt={room.RoomTypeName || "Room"}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 aspect-video lg:aspect-square"
          />
          
          {/* Overlay info */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          <div className="absolute bottom-3 left-3 flex items-center gap-2">
            <span className="bg-black/60 backdrop-blur-sm text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
              {imgIndex + 1} / {totalImages} PHOTOS
            </span>
          </div>

          {totalImages > 1 && (
            <div className="absolute top-1/2 -translate-y-1/2 w-full px-2 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={prev} className="w-8 h-8 rounded-full bg-white/90 backdrop-blur shadow-lg flex items-center justify-center text-slate-900 hover:bg-white transition-colors">‹</button>
              <button onClick={next} className="w-8 h-8 rounded-full bg-white/90 backdrop-blur shadow-lg flex items-center justify-center text-slate-900 hover:bg-white transition-colors">›</button>
            </div>
          )}

          {/* Badge */}
          <div className="absolute top-3 left-3">
             <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-widest shadow-lg ${room.IsRefundable ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-white'}`}>
                {room.IsRefundable ? 'Refundable' : 'Non-Refundable'}
             </span>
          </div>
        </div>

        {/* Center: Info */}
        <div className="flex-1 p-5 flex flex-col justify-between border-r border-slate-100">
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-black text-[#0a2540] tracking-tight leading-tight mb-1">
                {room.RoomTypeName || room.Name?.[0] || "Standard Room"}
              </h3>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">
                Room Index {room.RoomIndex || 1}
              </p>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
               <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold text-slate-600">
                  <RiRestaurant2Line className="text-blue-500" />
                  {room.MealType?.replace(/_/g, " ") || "Room Only"}
               </div>
               {room.SmokingPreference !== 0 && (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold text-slate-600">
                     <FaWind className="text-slate-400" />
                     {room.SmokingPreference === 1 ? 'Smoking' : 'Non-Smoking'}
                  </div>
               )}
            </div>

            {/* Inclusions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2.5 gap-x-4">
              {inclusions.slice(0, showDetails ? 100 : 4).map((inc, i) => (
                <div key={i} className="flex items-center gap-2.5 group/inc">
                   <div className="w-5 h-5 rounded bg-slate-50 flex items-center justify-center group-hover/inc:bg-blue-50 transition-colors">
                      {getInclusionIcon(inc)}
                   </div>
                   <span className="text-xs font-medium text-slate-600 capitalize">{inc}</span>
                </div>
              ))}
            </div>

            {inclusions.length > 4 && (
               <button 
                  onClick={() => setShowDetails(!showDetails)}
                  className="flex items-center gap-1 text-[11px] font-black text-blue-500 hover:text-blue-600 uppercase tracking-widest transition-colors"
                >
                  {showDetails ? <><MdExpandLess className="text-base" /> SHOW LESS</> : <><MdExpandMore className="text-base" /> VIEW {inclusions.length - 4} MORE INCLUSIONS</>}
               </button>
            )}
          </div>
        </div>

        {/* Right: Booking */}
        <div className="w-full lg:w-64 p-5 bg-slate-50/50 flex flex-col justify-between md:items-end">
           <div className="md:text-right space-y-1">
              <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Price Breakup</div>
              <div className="flex items-baseline md:justify-end gap-1.5">
                 <span className="text-xs font-black text-slate-400">{currency}</span>
                 <span className="text-3xl font-black text-[#0a2540]">{totalFare.toLocaleString()}</span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">
                ≈ {currency} {perNight.toFixed(0).toLocaleString()} / Night
              </p>
              <div className="flex items-center md:justify-end gap-1.5 text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full inline-flex">
                 <MdInfoOutline className="text-xs" />
                 Inclusive of {currency} {tax.toLocaleString()} tax
              </div>
           </div>

           <div className="mt-6 w-full space-y-2">
              <button
                onClick={onSelect}
                className="w-full bg-[#0a2540] hover:bg-blue-700 text-white text-xs font-black py-3.5 rounded-xl border border-[#0a2540] transition-all transform active:scale-[0.98]"
              >
                SELECT THIS ROOM
              </button>
              <p className="text-[9px] text-center text-slate-400 font-bold uppercase tracking-widest">
                 Live rate from TBO
              </p>
           </div>
        </div>

{/* >>>>>>> 6c93c2a6864064eee402edb2e2c40c889dc71d90 */}
      </div>
    </div>
  );
};

export default RoomCard;
