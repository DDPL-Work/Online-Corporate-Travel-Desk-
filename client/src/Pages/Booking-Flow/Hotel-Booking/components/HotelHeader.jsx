// components/HotelDetails/HotelHeader.jsx
import React from "react";
// <<<<<<< HEAD
// import { FaStar, FaHeart, FaShare } from "react-icons/fa";
// import { MdArrowBack, MdLocationOn } from "react-icons/md";
// import { useNavigate } from "react-router-dom";

// const HotelHeader = ({ name, address, rating, reviewCount }) => {
//   const navigate = useNavigate();
//   return (
//     <div className="bg-blue-100 border-b border-blue-200 sticky top-0 z-50 shadow-sm">
//       <div className="max-w-7xl mx-auto px-4 pt-4">
//         <button
//           onClick={() => navigate(-1)}
//           className="flex items-center gap-2 text-sm font-semibold text-[#0a2540] hover:text-[#0d7fe8] transition"
//         >
//           <MdArrowBack className="text-lg" />
//           Back to Search Results
//         </button>
//       </div>
//       <div className="max-w-7xl mx-auto px-4 py-4">
//         <div className="flex items-start justify-between">
//           <div className="flex-1">
//             <h1 className="text-2xl font-bold text-gray-900 mb-2">{name}</h1>

//             <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
//               <MdLocationOn className="text-blue-800" />
//               <span>{address}</span>
//             </div>

//             <div className="flex items-center gap-4">
//               <div className="flex items-center gap-2">
//                 <div className="flex items-center gap-1">
//                   {[...Array(5)].map((_, i) => (
//                     <FaStar
//                       key={i}
//                       className={
//                         i < Math.floor(rating)
//                           ? "text-orange-500"
//                           : "text-gray-300"
//                       }
//                       size={16}
//                     />
//                   ))}
//                 </div>
//                 <span className="font-semibold text-gray-900">{rating}</span>
//               </div>
//             </div>
//           </div>

//           <div className="flex items-center gap-3">
//             <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
//               <FaShare className="text-gray-600" />
//               <span className="text-sm font-medium">Share</span>
//             </button>

//             <button className="flex items-center gap-2 px-4 py-2 border border-red-500 text-red-500 rounded-lg hover:bg-red-50 transition-colors">
//               <FaHeart />
//               <span className="text-sm font-medium">Add to Favorite</span>
//             </button>
// =======
import { FaStar, FaHeart, FaShareAlt, FaMapMarkerAlt } from "react-icons/fa";
import { MdArrowBack } from "react-icons/md";
import { useNavigate } from "react-router-dom";

const HotelHeader = ({ name, address, rating, cityName, countryName }) => {
  const navigate = useNavigate();

  return (
    <div className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      {/* Top Bar */}
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between border-b border-slate-100">
        <button
          onClick={() => navigate(-1)}
          className="group flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
            <MdArrowBack className="text-lg" />
          </div>
          BACK TO RESULTS
        </button>

        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors text-xs font-bold">
            <FaShareAlt className="text-sm" />
            SHARE
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors text-xs font-bold">
            <FaHeart className="text-sm" />
            SAVE
          </button>
        </div>
      </div>

      {/* Main Header */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <FaStar
                    key={i}
                    className={
                      i < Math.floor(rating)
                        ? "text-orange-400"
                        : "text-slate-200"
                    }
                    size={14}
                  />
                ))}
              </div>
              <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                {rating} STAR HOTEL
              </span>
            </div>

            <h1 className="text-3xl font-black text-[#0a2540] tracking-tight">
              {name}
            </h1>

            <div className="flex items-center gap-2 text-sm text-slate-500">
              <FaMapMarkerAlt className="text-blue-500 shrink-0" />
              <span className="font-medium">
                {address}
                {(cityName || countryName) && (
                  <span className="text-slate-400 font-normal">
                    {" · "}{[cityName, countryName].filter(Boolean).join(", ")}
                  </span>
                )}
              </span>
            </div>
          </div>

          <div className="hidden lg:block shrink-0 px-6 py-4 bg-blue-50/50 rounded-2xl border border-blue-100 text-center">
             <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Price starting from</div>
             <div className="flex items-baseline justify-center gap-1">
                <span className="text-slate-400 text-xs font-bold">INR</span>
                <span className="text-2xl font-black text-[#0a2540]">Live Rates</span>
             </div>
             <div className="text-[10px] text-blue-500 font-bold mt-1">Refreshed by TBO Session</div>
{/* >>>>>>> 6c93c2a6864064eee402edb2e2c40c889dc71d90 */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotelHeader;
