// components/HotelDetails/HotelHeader.jsx
import React from "react";
import { FaStar, FaHeart, FaShareAlt, FaMapMarkerAlt } from "react-icons/fa";
import { MdArrowBack } from "react-icons/md";
import { useNavigate } from "react-router-dom";

const HotelHeader = ({ name, address, rating, cityName, countryName }) => {
  const navigate = useNavigate();

  return (
    <div className="bg-white border-b border-slate-200 sticky top-0 shadow-sm">
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
          {/* <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors text-xs font-bold">
            <FaHeart className="text-sm" />
            SAVE
          </button> */}
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
                        ? "text-[#C9A84C]"
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

            <h1 className="text-3xl font-black text-[#0A203E] tracking-tight">
              {name}
            </h1>

            <div className="flex items-center gap-2 text-sm text-slate-500">
              <FaMapMarkerAlt className="text-[#C9A84C] shrink-0" />
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

          {/* <div className="hidden lg:block shrink-0 px-6 py-4 bg-blue-50/50 rounded-2xl border border-blue-100 text-center">
             <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Price starting from</div>
             <div className="flex items-baseline justify-center gap-1">
                <span className="text-slate-400 text-xs font-bold">INR</span>
                <span className="text-2xl font-black text-[#0a2540]">Live Rates</span>
             </div>
             <div className="text-[10px] text-blue-500 font-bold mt-1">Refreshed by TBO Session</div>
          </div> */}
        </div>
      </div>
    </div>
  );
};

export default HotelHeader;
